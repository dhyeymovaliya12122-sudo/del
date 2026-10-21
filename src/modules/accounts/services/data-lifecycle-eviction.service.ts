// ─────────────────────────────────────────────────────────────────────────────
//  modules/accounts/services/data-lifecycle-eviction.service.ts
//  Senior Database Architect: Continuous FIFO Eviction & 180-Day Hard TTL Engine
//
//  Enforces two mandatory data governance rules:
//   1. Hard TTL Expiration: Purges records older than 180 days from created_at.
//   2. Continuous FIFO Eviction: If storage exceeds High Watermark before 180 days,
//      immediately executes chunked FIFO eviction (oldest created_at first) until
//      storage drops below Low Watermark.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';

export interface EvictionMetrics {
  lastRunTimestamp: number;
  hardTtlPurgedCount: number;
  fifoEvictedCount: number;
  storageBeforeBytes: number;
  storageAfterBytes: number;
  reclaimedBytes: number;
  executionDurationMs: number;
}

@Injectable()
export class DataLifecycleEvictionService implements OnModuleInit {
  private readonly logger = new Logger(DataLifecycleEvictionService.name);

  // 180 days in milliseconds = 180 * 24 * 60 * 60 * 1000 = 15,552,000,000 ms
  private readonly HARD_TTL_DAYS = 180;
  private readonly HARD_TTL_MS = 180 * 24 * 60 * 60 * 1000;

  // Non-blocking chunk parameters (prevents lock escalation & transaction log spikes)
  private readonly BATCH_CHUNK_SIZE = 1000;
  private readonly BATCH_YIELD_MS = 40;

  // Storage threshold watermarks (in Megabytes)
  private highWatermarkMb: number;
  private lowWatermarkMb: number;

  private isEvicting = false;
  private lastMetrics: EvictionMetrics | null = null;

  constructor(
    @InjectRepository(WhatsappMessageEntity)
    private readonly messageRepo: Repository<WhatsappMessageEntity>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    // Configurable thresholds with safe enterprise defaults (High: 4096MB, Low: 3072MB)
    this.highWatermarkMb = Number(this.config.get('EVICTION_HIGH_WATERMARK_MB', '4096'));
    this.lowWatermarkMb = Number(this.config.get('EVICTION_LOW_WATERMARK_MB', '3072'));
  }

  async onModuleInit() {
    this.logger.log(
      `🛡️ [DataLifecycle] Initialized: 180-Day Hard TTL (${this.HARD_TTL_DAYS}d) | FIFO High Watermark: ${this.highWatermarkMb}MB | Low Watermark: ${this.lowWatermarkMb}MB`,
    );

    // Verify or configure SQLite auto-vacuum / WAL optimizations if on SQLite
    await this.configureDatabaseOptimizations();
  }

  /**
   * 1. Hard TTL Expiration: Executes daily at 03:30 AM (off-peak).
   * Automatically deletes any record whose created_at is older than exactly 180 days.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledHardTtlEviction(): Promise<number> {
    if (this.isEvicting) {
      this.logger.warn('[DataLifecycle] Eviction already running, skipping scheduled hard TTL cycle.');
      return 0;
    }

    this.isEvicting = true;
    const startTime = Date.now();
    let totalPurged = 0;

    try {
      const cutoffDate = new Date(Date.now() - this.HARD_TTL_MS);
      this.logger.log(`⏳ [HardTTL] Starting 180-day hard expiration scan (Cutoff: ${cutoffDate.toISOString()})...`);

      totalPurged = await this.purgeRecordsOlderThan(cutoffDate);

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `✅ [HardTTL] Completed: Purged ${totalPurged} record(s) older than 180 days in ${durationMs}ms.`,
      );

      // Reclaim physical OS disk space
      await this.reclaimStorageSpace();

      return totalPurged;
    } catch (err: any) {
      this.logger.error(`❌ [HardTTL] Error during hard expiration: ${err.message}`, err.stack);
      return totalPurged;
    } finally {
      this.isEvicting = false;
    }
  }

  /**
   * 2. Continuous FIFO Eviction Loop: Executes every 5 minutes.
   * Checks current database storage/memory capacity. If current usage exceeds High Watermark,
   * identifies oldest records by insertion time ('First-In') and sequentially purges them
   * ('First-Out') in non-blocking batches until storage drops below Low Watermark.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async continuousFifoEvictionCheck(): Promise<boolean> {
    if (this.isEvicting) return false;

    try {
      const currentStorageBytes = await this.getCurrentStorageUsageBytes();
      const currentStorageMb = currentStorageBytes / (1024 * 1024);

      if (currentStorageMb < this.highWatermarkMb) {
        // Storage is healthy, within safe operational envelope
        return false;
      }

      this.isEvicting = true;
      this.logger.warn(
        `🚨 [FIFO Eviction Triggered] Storage usage (${currentStorageMb.toFixed(2)}MB) exceeds High Watermark (${this.highWatermarkMb}MB). Starting FIFO purge down to ${this.lowWatermarkMb}MB...`,
      );

      const startTime = Date.now();
      let evictedInRun = 0;
      let storageAfterPurgeMb = currentStorageMb;

      // Continuous loop: sequentially purge oldest records until below Low Watermark
      while (storageAfterPurgeMb > this.lowWatermarkMb) {
        const batchPurged = await this.purgeOldestFifoBatch(this.BATCH_CHUNK_SIZE);
        if (batchPurged === 0) {
          this.logger.warn('[FIFO Eviction] No more purgeable records found in FIFO queue.');
          break;
        }

        evictedInRun += batchPurged;

        // Yield CPU/event loop and lock to permit concurrent WhatsApp traffic
        await new Promise((resolve) => setTimeout(resolve, this.BATCH_YIELD_MS));

        const updatedBytes = await this.getCurrentStorageUsageBytes();
        storageAfterPurgeMb = updatedBytes / (1024 * 1024);
      }

      // Reclaim storage pages
      await this.reclaimStorageSpace();

      const finalBytes = await this.getCurrentStorageUsageBytes();
      const finalMb = finalBytes / (1024 * 1024);
      const reclaimedMb = (currentStorageBytes - finalBytes) / (1024 * 1024);

      this.lastMetrics = {
        lastRunTimestamp: Date.now(),
        hardTtlPurgedCount: 0,
        fifoEvictedCount: evictedInRun,
        storageBeforeBytes: currentStorageBytes,
        storageAfterBytes: finalBytes,
        reclaimedBytes: currentStorageBytes - finalBytes,
        executionDurationMs: Date.now() - startTime,
      };

      this.logger.log(
        `🎉 [FIFO Eviction Complete] Evicted ${evictedInRun} oldest records. Reclaimed ${reclaimedMb.toFixed(2)}MB. Current storage: ${finalMb.toFixed(2)}MB (Target <= ${this.lowWatermarkMb}MB).`,
      );

      return true;
    } catch (err: any) {
      this.logger.error(`❌ [FIFO Eviction] Error during continuous FIFO eviction: ${err.message}`, err.stack);
      return false;
    } finally {
      this.isEvicting = false;
    }
  }

  /**
   * Chunked, non-blocking purge of records strictly older than cutoffDate.
   * Utilizes composite index (created_at ASC, id ASC) for optimal cursor scan.
   */
  private async purgeRecordsOlderThan(cutoffDate: Date): Promise<number> {
    let totalDeleted = 0;

    while (true) {
      // Find a chunk of oldest message IDs matching TTL constraint
      const oldRecords = await this.messageRepo
        .createQueryBuilder('msg')
        .select(['msg.id', 'msg.mediaUrl'])
        .where('msg.createdAt < :cutoffDate', { cutoffDate })
        .orderBy('msg.createdAt', 'ASC')
        .take(this.BATCH_CHUNK_SIZE)
        .getMany();

      if (oldRecords.length === 0) break;

      const idsToDelete = oldRecords.map((r) => r.id);

      // Clean up orphaned local media files associated with evicted messages
      this.cleanupAssociatedMediaFiles(oldRecords);

      // Delete the chunk
      await this.messageRepo
        .createQueryBuilder()
        .delete()
        .from(WhatsappMessageEntity)
        .whereInIds(idsToDelete)
        .execute();

      totalDeleted += idsToDelete.length;

      // Yield event-loop tick & lock to avoid blocking real-time incoming WhatsApp messages
      await new Promise((resolve) => setTimeout(resolve, this.BATCH_YIELD_MS));
    }

    return totalDeleted;
  }

  /**
   * Purges the single oldest FIFO chunk (First-In, First-Out).
   * Identifies the absolute oldest messages in the database and drops them.
   */
  private async purgeOldestFifoBatch(limit: number): Promise<number> {
    const oldestChunk = await this.messageRepo
      .createQueryBuilder('msg')
      .select(['msg.id', 'msg.mediaUrl'])
      .orderBy('msg.createdAt', 'ASC')
      .take(limit)
      .getMany();

    if (oldestChunk.length === 0) return 0;

    const ids = oldestChunk.map((r) => r.id);

    // Clean media
    this.cleanupAssociatedMediaFiles(oldestChunk);

    await this.messageRepo
      .createQueryBuilder()
      .delete()
      .from(WhatsappMessageEntity)
      .whereInIds(ids)
      .execute();

    return ids.length;
  }

  /**
   * Removes media files on disk corresponding to evicted message records.
   */
  private cleanupAssociatedMediaFiles(records: { id: string; mediaUrl?: string }[]) {
    for (const rec of records) {
      if (!rec.mediaUrl) continue;
      try {
        const filename = path.basename(rec.mediaUrl);
        const localPath = path.join(process.cwd(), 'data', 'media', filename);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch {
        // Non-blocking disk media cleanup
      }
    }
  }

  /**
   * Measures current database physical storage usage.
   * Supports both SQLite (page count * page size) and PostgreSQL (pg_database_size).
   */
  async getCurrentStorageUsageBytes(): Promise<number> {
    const dbType = this.dataSource.options.type;

    try {
      if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
        const dbFile = (this.dataSource.options as any).database || './data/whatsapp.db';
        if (fs.existsSync(dbFile)) {
          const stats = fs.statSync(dbFile);
          return stats.size;
        }
      } else if (dbType === 'postgres') {
        const result = await this.dataSource.query('SELECT pg_database_size(current_database()) AS size');
        return Number(result[0]?.size || 0);
      }
    } catch (e: any) {
      this.logger.warn(`Could not calculate database size: ${e.message}`);
    }

    return 0;
  }

  /**
   * Reclaims physical file space from deleted pages.
   */
  private async reclaimStorageSpace(): Promise<void> {
    const dbType = this.dataSource.options.type;
    try {
      if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
        // Incremental vacuum to release up to 1000 freed pages without locking entire DB
        await this.dataSource.query('PRAGMA incremental_vacuum(1000)').catch(() => null);
      } else if (dbType === 'postgres') {
        // Note: VACUUM cannot run inside transaction block; run non-blocking vacuum on message table
        // PostgreSQL autovacuum will automatically reclaim deleted tuple slots.
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Configures engine-level PRAGMAs for optimal continuous eviction throughput.
   */
  private async configureDatabaseOptimizations(): Promise<void> {
    const dbType = this.dataSource.options.type;
    if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
      try {
        // Ensure WAL mode and incremental vacuuming are enabled
        await this.dataSource.query('PRAGMA journal_mode = WAL;');
        await this.dataSource.query('PRAGMA auto_vacuum = INCREMENTAL;');
        await this.dataSource.query('PRAGMA synchronous = NORMAL;');
      } catch (err: any) {
        this.logger.warn(`Could not set SQLite PRAGMA optimizations: ${err.message}`);
      }
    }
  }

  /**
   * Expose live health and metrics for the Admin Dashboard or Prometheus.
   */
  getEvictionStatus() {
    return {
      hardTtlDays: this.HARD_TTL_DAYS,
      highWatermarkMb: this.highWatermarkMb,
      lowWatermarkMb: this.lowWatermarkMb,
      isCurrentlyEvicting: this.isEvicting,
      lastMetrics: this.lastMetrics,
    };
  }
}
