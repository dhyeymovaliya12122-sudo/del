"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DataLifecycleEvictionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLifecycleEvictionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const whatsapp_message_entity_1 = require("../../session-hydration/entities/whatsapp-message.entity");
let DataLifecycleEvictionService = DataLifecycleEvictionService_1 = class DataLifecycleEvictionService {
    constructor(messageRepo, dataSource, config) {
        this.messageRepo = messageRepo;
        this.dataSource = dataSource;
        this.config = config;
        this.logger = new common_1.Logger(DataLifecycleEvictionService_1.name);
        this.HARD_TTL_DAYS = 180;
        this.HARD_TTL_MS = 180 * 24 * 60 * 60 * 1000;
        this.BATCH_CHUNK_SIZE = 1000;
        this.BATCH_YIELD_MS = 40;
        this.isEvicting = false;
        this.lastMetrics = null;
        this.highWatermarkMb = Number(this.config.get('EVICTION_HIGH_WATERMARK_MB', '4096'));
        this.lowWatermarkMb = Number(this.config.get('EVICTION_LOW_WATERMARK_MB', '3072'));
    }
    async onModuleInit() {
        this.logger.log(`🛡️ [DataLifecycle] Initialized: 180-Day Hard TTL (${this.HARD_TTL_DAYS}d) | FIFO High Watermark: ${this.highWatermarkMb}MB | Low Watermark: ${this.lowWatermarkMb}MB`);
        await this.configureDatabaseOptimizations();
    }
    async scheduledHardTtlEviction() {
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
            this.logger.log(`✅ [HardTTL] Completed: Purged ${totalPurged} record(s) older than 180 days in ${durationMs}ms.`);
            await this.reclaimStorageSpace();
            return totalPurged;
        }
        catch (err) {
            this.logger.error(`❌ [HardTTL] Error during hard expiration: ${err.message}`, err.stack);
            return totalPurged;
        }
        finally {
            this.isEvicting = false;
        }
    }
    async continuousFifoEvictionCheck() {
        if (this.isEvicting)
            return false;
        try {
            const currentStorageBytes = await this.getCurrentStorageUsageBytes();
            const currentStorageMb = currentStorageBytes / (1024 * 1024);
            if (currentStorageMb < this.highWatermarkMb) {
                return false;
            }
            this.isEvicting = true;
            this.logger.warn(`🚨 [FIFO Eviction Triggered] Storage usage (${currentStorageMb.toFixed(2)}MB) exceeds High Watermark (${this.highWatermarkMb}MB). Starting FIFO purge down to ${this.lowWatermarkMb}MB...`);
            const startTime = Date.now();
            let evictedInRun = 0;
            let storageAfterPurgeMb = currentStorageMb;
            while (storageAfterPurgeMb > this.lowWatermarkMb) {
                const batchPurged = await this.purgeOldestFifoBatch(this.BATCH_CHUNK_SIZE);
                if (batchPurged === 0) {
                    this.logger.warn('[FIFO Eviction] No more purgeable records found in FIFO queue.');
                    break;
                }
                evictedInRun += batchPurged;
                await new Promise((resolve) => setTimeout(resolve, this.BATCH_YIELD_MS));
                const updatedBytes = await this.getCurrentStorageUsageBytes();
                storageAfterPurgeMb = updatedBytes / (1024 * 1024);
            }
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
            this.logger.log(`🎉 [FIFO Eviction Complete] Evicted ${evictedInRun} oldest records. Reclaimed ${reclaimedMb.toFixed(2)}MB. Current storage: ${finalMb.toFixed(2)}MB (Target <= ${this.lowWatermarkMb}MB).`);
            return true;
        }
        catch (err) {
            this.logger.error(`❌ [FIFO Eviction] Error during continuous FIFO eviction: ${err.message}`, err.stack);
            return false;
        }
        finally {
            this.isEvicting = false;
        }
    }
    async purgeRecordsOlderThan(cutoffDate) {
        let totalDeleted = 0;
        while (true) {
            const oldRecords = await this.messageRepo
                .createQueryBuilder('msg')
                .select(['msg.id', 'msg.mediaUrl'])
                .where('msg.createdAt < :cutoffDate', { cutoffDate })
                .orderBy('msg.createdAt', 'ASC')
                .take(this.BATCH_CHUNK_SIZE)
                .getMany();
            if (oldRecords.length === 0)
                break;
            const idsToDelete = oldRecords.map((r) => r.id);
            this.cleanupAssociatedMediaFiles(oldRecords);
            await this.messageRepo
                .createQueryBuilder()
                .delete()
                .from(whatsapp_message_entity_1.WhatsappMessageEntity)
                .whereInIds(idsToDelete)
                .execute();
            totalDeleted += idsToDelete.length;
            await new Promise((resolve) => setTimeout(resolve, this.BATCH_YIELD_MS));
        }
        return totalDeleted;
    }
    async purgeOldestFifoBatch(limit) {
        const oldestChunk = await this.messageRepo
            .createQueryBuilder('msg')
            .select(['msg.id', 'msg.mediaUrl'])
            .orderBy('msg.createdAt', 'ASC')
            .take(limit)
            .getMany();
        if (oldestChunk.length === 0)
            return 0;
        const ids = oldestChunk.map((r) => r.id);
        this.cleanupAssociatedMediaFiles(oldestChunk);
        await this.messageRepo
            .createQueryBuilder()
            .delete()
            .from(whatsapp_message_entity_1.WhatsappMessageEntity)
            .whereInIds(ids)
            .execute();
        return ids.length;
    }
    cleanupAssociatedMediaFiles(records) {
        for (const rec of records) {
            if (!rec.mediaUrl)
                continue;
            try {
                const filename = path.basename(rec.mediaUrl);
                const localPath = path.join(process.cwd(), 'data', 'media', filename);
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
            }
            catch {
            }
        }
    }
    async getCurrentStorageUsageBytes() {
        const dbType = this.dataSource.options.type;
        try {
            if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
                const dbFile = this.dataSource.options.database || './data/whatsapp.db';
                if (fs.existsSync(dbFile)) {
                    const stats = fs.statSync(dbFile);
                    return stats.size;
                }
            }
            else if (dbType === 'postgres') {
                const result = await this.dataSource.query('SELECT pg_database_size(current_database()) AS size');
                return Number(result[0]?.size || 0);
            }
        }
        catch (e) {
            this.logger.warn(`Could not calculate database size: ${e.message}`);
        }
        return 0;
    }
    async reclaimStorageSpace() {
        const dbType = this.dataSource.options.type;
        try {
            if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
                await this.dataSource.query('PRAGMA incremental_vacuum(1000)').catch(() => null);
            }
            else if (dbType === 'postgres') {
            }
        }
        catch {
        }
    }
    async configureDatabaseOptimizations() {
        const dbType = this.dataSource.options.type;
        if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
            try {
                await this.dataSource.query('PRAGMA journal_mode = WAL;');
                await this.dataSource.query('PRAGMA auto_vacuum = INCREMENTAL;');
                await this.dataSource.query('PRAGMA synchronous = NORMAL;');
            }
            catch (err) {
                this.logger.warn(`Could not set SQLite PRAGMA optimizations: ${err.message}`);
            }
        }
    }
    getEvictionStatus() {
        return {
            hardTtlDays: this.HARD_TTL_DAYS,
            highWatermarkMb: this.highWatermarkMb,
            lowWatermarkMb: this.lowWatermarkMb,
            isCurrentlyEvicting: this.isEvicting,
            lastMetrics: this.lastMetrics,
        };
    }
};
exports.DataLifecycleEvictionService = DataLifecycleEvictionService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DataLifecycleEvictionService.prototype, "scheduledHardTtlEviction", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DataLifecycleEvictionService.prototype, "continuousFifoEvictionCheck", null);
exports.DataLifecycleEvictionService = DataLifecycleEvictionService = DataLifecycleEvictionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_message_entity_1.WhatsappMessageEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        config_1.ConfigService])
], DataLifecycleEvictionService);
//# sourceMappingURL=data-lifecycle-eviction.service.js.map