import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
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
export declare class BackupSchedulerService implements OnModuleInit {
    private readonly exportBackupService;
    private readonly accountRepo;
    private readonly exportLogRepo;
    private readonly logger;
    private isRunning;
    private lastStatus;
    constructor(exportBackupService: ExportBackupService, accountRepo: Repository<WhatsappAccountEntity>, exportLogRepo: Repository<ExportLogEntity>);
    onModuleInit(): void;
    private getBackupDir;
    private ensureBackupDir;
    private refreshStatusFromDisk;
    handleDailyAutomatedBackup(): Promise<void>;
    runBackupJob(): Promise<AutomatedBackupStatus>;
    private applyRetentionPolicy;
    getStatus(): Promise<AutomatedBackupStatus>;
    private formatBytes;
}
