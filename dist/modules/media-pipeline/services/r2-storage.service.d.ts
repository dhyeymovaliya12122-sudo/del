import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
export interface UploadResult {
    r2Key: string;
    cdnUrl: string;
    eTag?: string;
}
export interface PresignedUrlResult {
    url: string;
    expiresAt: Date;
}
export declare class R2StorageService {
    private readonly config;
    private readonly logger;
    private readonly s3;
    private readonly bucket;
    private readonly publicUrl;
    private readonly presignedExpirySec;
    private readonly isConfigured;
    private readonly localMediaDir;
    constructor(config: ConfigService);
    streamUpload(r2Key: string, stream: Readable | Buffer, mimeType: string, metadata?: Record<string, string>): Promise<UploadResult>;
    generatePresignedUrl(r2Key: string): Promise<PresignedUrlResult>;
    deleteObject(r2Key: string): Promise<void>;
    objectExists(r2Key: string): Promise<boolean>;
    buildR2Key(accountId: string, messageId: string, ext: string): string;
}
