import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { ExportBackupService } from './export-backup.service';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import { ExportLogEntity } from '../entities/export-log.entity';

export interface AutomatedBackupStatus {
  enabled: boolean;
  schedule: string;
  retentionDays: number;
  lastBackupAt: string | null;
  lastFileName: string | null;
  lastFileSizeBytes: number | null;
  lastFileSizeFormatted: string | null;
  totalAccounts: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
}

@Injectable()
export class BackupSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BackupSchedulerService.name);
  private isRunning = false;
  private lastStatus: AutomatedBackupStatus = {
    enabled: true,
    schedule: 'Daily at 02:00 AM',
    retentionDays: 30,
    lastBackupAt: null,
    lastFileName: null,
    lastFileSizeBytes: null,
    lastFileSizeFormatted: null,
    totalAccounts: 0,
    status: 'idle',
  };

  constructor(
    private readonly exportBackupService: ExportBackupService,
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo: Repository<WhatsappAccountEntity>,
    @InjectRepository(ExportLogEntity)
    private readonly exportLogRepo: Repository<ExportLogEntity>,
  ) { }

  onModuleInit() {
    this.ensureBackupDir();
    this.refreshStatusFromDisk();
    this.logger.log('🕒 Automated Zero-Touch Backup Scheduler initialized (Daily 02:00 AM, 30-day retention)');
  }

  private getBackupDir(): string {
    return path.resolve(process.cwd(), 'data', 'backups', 'automated');
  }

  private ensureBackupDir(): void {
    const dir = this.getBackupDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Refreshes the last backup metadata by inspecting the automated backups directory on disk.
   */
  private refreshStatusFromDisk(): void {
    try {
      const dir = this.getBackupDir();
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.zip'))
        .map(f => {
          const fullPath = path.join(dir, f);
          const stat = fs.statSync(fullPath);
          return { name: f, size: stat.size, mtime: stat.mtime };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (files.length > 0) {
        const latest = files[0];
        this.lastStatus.lastBackupAt = latest.mtime.toISOString();
        this.lastStatus.lastFileName = latest.name;
        this.lastStatus.lastFileSizeBytes = latest.size;
        this.lastStatus.lastFileSizeFormatted = this.formatBytes(latest.size);
        this.lastStatus.status = 'completed';
      }
    } catch (err: any) {
      this.logger.warn(`Failed to inspect backup directory: ${err.message}`);
    }
  }

  /**
   * Zero-Touch Automated Backup Cron Job:
   * Runs every day at 02:00 AM server time.
   * Packages all active accounts, all messages, and all media into a master ZIP.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyAutomatedBackup(): Promise<void> {
    this.logger.log('🕒 Executing daily automated zero-touch system backup...');
    await this.runBackupJob();
  }

  /**
   * Run the master backup across all accounts and enforce retention.
   */
  async runBackupJob(): Promise<AutomatedBackupStatus> {
    if (this.isRunning) {
      this.logger.warn('Automated backup job is already in progress, skipping duplicate invocation.');
      return this.lastStatus;
    }

    this.isRunning = true;
    this.lastStatus.status = 'running';
    this.ensureBackupDir();

    try {
      const accounts = await this.accountRepo.find();
      this.lastStatus.totalAccounts = accounts.length;

      if (accounts.length === 0) {
        this.logger.log('No WhatsApp accounts registered. Skipping automated backup.');
        this.isRunning = false;
        this.lastStatus.status = 'idle';
        return this.lastStatus;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${dateStr}_All_Accounts_Master_Backup.zip`;
      const filePath = path.join(this.getBackupDir(), filename);

      const fileStream = fs.createWriteStream(filePath);

      await new Promise<void>((resolve, reject) => {
        fileStream.on('error', reject);
        fileStream.on('close', () => resolve());

        this.exportBackupService.streamZipArchive(fileStream as any, {
          accountId: 'all',
          includeMedia: 'all',
          scope: 'all',
        }).catch(reject);
      });

      const stat = fs.statSync(filePath);
      this.lastStatus.lastBackupAt = new Date().toISOString();
      this.lastStatus.lastFileName = filename;
      this.lastStatus.lastFileSizeBytes = stat.size;
      this.lastStatus.lastFileSizeFormatted = this.formatBytes(stat.size);
      this.lastStatus.status = 'completed';
      delete this.lastStatus.error;

      this.logger.log(`✅ Daily automated master backup completed: ${filename} (${this.lastStatus.lastFileSizeFormatted})`);

      // Log compliance audit entry
      await this.exportBackupService.logExport({
        userId: 'system-scheduler',
        username: 'Automated Cron Scheduler',
        userRole: 'SYSTEM',
        accountId: 'all',
        scope: 'all',
        format: 'zip',
        fileSizeBytes: stat.size,
        status: 'completed',
      });

      // Enforce 30-day retention
      this.applyRetentionPolicy(30);

      return this.lastStatus;
    } catch (err: any) {
      this.logger.error(`❌ Automated backup job failed: ${err.message}`, err.stack);
      this.lastStatus.status = 'failed';
      this.lastStatus.error = err.message;
      return this.lastStatus;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Delete automated backups older than retentionDays.
   */
  private applyRetentionPolicy(retentionDays: number): void {
    try {
      const dir = this.getBackupDir();
      if (!fs.existsSync(dir)) return;

      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(dir);

      let purgedCount = 0;
      for (const file of files) {
        if (!file.endsWith('.zip')) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.mtime.getTime() < cutoff) {
          fs.unlinkSync(fullPath);
          purgedCount++;
        }
      }

      if (purgedCount > 0) {
        this.logger.log(`🧹 Retention policy purged ${purgedCount} automated backup(s) older than ${retentionDays} days.`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to apply backup retention policy: ${err.message}`);
    }
  }

  /**
   * Get current status for UI indicator badge.
   */
  async getStatus(): Promise<AutomatedBackupStatus> {
    const accountsCount = await this.accountRepo.count();
    this.lastStatus.totalAccounts = accountsCount;
    this.refreshStatusFromDisk();
    return this.lastStatus;
  }

  private formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  }
}
