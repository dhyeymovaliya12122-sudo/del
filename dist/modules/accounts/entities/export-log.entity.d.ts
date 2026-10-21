export declare class ExportLogEntity {
    id: string;
    userId?: string;
    username: string;
    userRole: string;
    accountId: string;
    scope: 'all' | 'single_chat' | 'custom' | 'unreplied';
    format: 'excel' | 'pdf' | 'zip' | 'db_snapshot';
    piiRedacted: boolean;
    passwordProtected: boolean;
    recordCount: number;
    fileSizeBytes: number;
    ipAddress?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
    createdAt: Date;
}
