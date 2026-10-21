import { Response } from 'express';
import { ExportBackupService, ExportOptions } from '../services/export-backup.service';
import { BackupSchedulerService } from '../services/backup-scheduler.service';
interface ExportJobState {
    id: string;
    accountId: string;
    format: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    filePath?: string;
    fileSizeBytes?: number;
    error?: string;
    createdAt: number;
    downloadToken?: string;
}
export declare class ExportBackupController {
    private readonly exportService;
    private readonly backupSchedulerService;
    constructor(exportService: ExportBackupService, backupSchedulerService: BackupSchedulerService);
    getAutomatedBackupStatus(): Promise<import("../services/backup-scheduler.service").AutomatedBackupStatus>;
    triggerAutomatedBackup(): Promise<import("../services/backup-scheduler.service").AutomatedBackupStatus>;
    getStats(accountId: string, chatJid?: string): Promise<{
        accountId: string;
        accountPhone: string;
        chatCount: number;
        messageCount: number;
        mediaFilesCount: number;
        mediaBytes: number;
        mediaSizeFormatted: string;
        lastBackupAt: Date;
        totalAccounts: number;
    } | {
        accountId: string;
        accountPhone: string;
        chatCount: number;
        messageCount: number;
        mediaFilesCount: number;
        mediaBytes: number;
        mediaSizeFormatted: string;
        lastBackupAt: Date;
        totalAccounts?: undefined;
    }>;
    exportSync(body: ExportOptions, req: any, res: Response): Promise<void>;
    queueExport(body: ExportOptions, req: any): Promise<{
        success: boolean;
        jobId: string;
        status: string;
        message: string;
    }>;
    getJobStatus(jobId: string): Promise<ExportJobState | {
        status: string;
    }>;
    downloadCompletedJob(jobId: string, token: string, res: Response): Promise<Response<any, Record<string, any>>>;
    downloadDatabaseSnapshot(req: any, res: Response): Promise<void>;
    getLogs(accountId?: string, limit?: string): Promise<import("../entities/export-log.entity").ExportLogEntity[]>;
    private runBackgroundJob;
}
export {};
