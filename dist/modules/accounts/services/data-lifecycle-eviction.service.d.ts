import { OnModuleInit } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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
export declare class DataLifecycleEvictionService implements OnModuleInit {
    private readonly messageRepo;
    private readonly dataSource;
    private readonly config;
    private readonly logger;
    private readonly HARD_TTL_DAYS;
    private readonly HARD_TTL_MS;
    private readonly BATCH_CHUNK_SIZE;
    private readonly BATCH_YIELD_MS;
    private highWatermarkMb;
    private lowWatermarkMb;
    private isEvicting;
    private lastMetrics;
    constructor(messageRepo: Repository<WhatsappMessageEntity>, dataSource: DataSource, config: ConfigService);
    onModuleInit(): Promise<void>;
    scheduledHardTtlEviction(): Promise<number>;
    continuousFifoEvictionCheck(): Promise<boolean>;
    private purgeRecordsOlderThan;
    private purgeOldestFifoBatch;
    private cleanupAssociatedMediaFiles;
    getCurrentStorageUsageBytes(): Promise<number>;
    private reclaimStorageSpace;
    private configureDatabaseOptimizations;
    getEvictionStatus(): {
        hardTtlDays: number;
        highWatermarkMb: number;
        lowWatermarkMb: number;
        isCurrentlyEvicting: boolean;
        lastMetrics: EvictionMetrics;
    };
}
