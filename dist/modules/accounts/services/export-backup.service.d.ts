import { OnModuleInit } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Response } from 'express';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
import { WhatsappChatEntity } from '../../session-hydration/entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../../session-hydration/entities/whatsapp-contact.entity';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import { UserAccountAccessEntity } from '../../auth/entities/user-account-access.entity';
import { ExportLogEntity } from '../entities/export-log.entity';
import { UnifiedContactEntry } from '../utils/contact-resolver.util';
export interface ExportOptions {
    accountId: string;
    scope?: 'all' | 'single_chat' | 'custom' | 'unreplied';
    chatJid?: string;
    selectedJids?: string[];
    dateFrom?: number;
    dateTo?: number;
    format?: 'excel' | 'pdf' | 'zip' | 'db_snapshot';
    piiRedacted?: boolean;
    includeMedia?: 'none' | 'docs_audio' | 'all';
    password?: string;
    userId?: string;
    userRole?: string;
    username?: string;
    ipAddress?: string;
    sinceLastBackup?: boolean;
}
export declare class ExportBackupService implements OnModuleInit {
    private readonly messageRepo;
    private readonly chatRepo;
    private readonly contactRepo;
    private readonly accountRepo;
    private readonly userAccessRepo;
    private readonly exportLogRepo;
    private readonly dataSource;
    private readonly logger;
    constructor(messageRepo: Repository<WhatsappMessageEntity>, chatRepo: Repository<WhatsappChatEntity>, contactRepo: Repository<WhatsappContactEntity>, accountRepo: Repository<WhatsappAccountEntity>, userAccessRepo: Repository<UserAccountAccessEntity>, exportLogRepo: Repository<ExportLogEntity>, dataSource: DataSource);
    onModuleInit(): Promise<void>;
    checkUserAccess(userId: string, userRole: string, accountId: string): Promise<boolean>;
    logExport(entry: Partial<ExportLogEntity>): Promise<ExportLogEntity>;
    getExportLogs(accountId?: string, limit?: number): Promise<ExportLogEntity[]>;
    getExportStats(accountId: string, chatJid?: string): Promise<{
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
    getUnifiedContactsDirectory(accountId?: string): Promise<UnifiedContactEntry[]>;
    private getUnifiedContactsDirectoryForAccount;
    sanitizeFolderName(phone: string, name: string): string;
    redactSensitiveData(text: string): string;
    generateSafeDatabaseSnapshot(targetPath: string): Promise<void>;
    streamExcel(res: Response, options: ExportOptions): Promise<void>;
    streamPdf(res: Response, options: ExportOptions): Promise<void>;
    streamZipArchive(res: Response, options: ExportOptions): Promise<void>;
    private packageAccountIntoArchive;
    generateSignedDownloadToken(jobId: string, accountId: string, ttlSeconds?: number): {
        token: string;
        expires: number;
    };
    verifySignedDownloadToken(token: string, accountId?: string): {
        valid: boolean;
        jobId?: string;
    };
    private recordFileHash;
    private buildContactsExcelBuffer;
    private buildAllAccountsExcelBuffer;
    private buildContactMap;
    private fetchFilteredMessages;
    private formatBytes;
}
