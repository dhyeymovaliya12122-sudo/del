import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MediaObjectEntity, MediaType } from '../entities/media-object.entity';
import { R2StorageService } from './r2-storage.service';
export interface MediaIngestionInput {
    accountId: string;
    messageId: string;
    mediaType: MediaType;
    downloadUrl: string;
    mimeType: string;
    originalFilename?: string;
    httpsAgent?: any;
}
export interface MediaIngestionResult {
    mediaObjectId: string;
    r2Key: string;
    cdnUrl?: string;
    presignedUrl: string;
    presignedUrlExpiry: Date;
    checksumSha256: string;
}
export declare class MediaIngestionService {
    private readonly mediaRepo;
    private readonly r2StorageService;
    private readonly config;
    private readonly logger;
    private readonly maxFileSizeMb;
    constructor(mediaRepo: Repository<MediaObjectEntity>, r2StorageService: R2StorageService, config: ConfigService);
    ingestMedia(input: MediaIngestionInput): Promise<MediaIngestionResult>;
    refreshPresignedUrl(mediaObjectId: string): Promise<string>;
    private createTeedStream;
}
