import { MediaIngestionService } from '../services/media-ingestion.service';
import { R2StorageService } from '../services/r2-storage.service';
import { Repository } from 'typeorm';
import { MediaObjectEntity } from '../entities/media-object.entity';
export declare class MediaPipelineController {
    private readonly mediaIngestionService;
    private readonly r2StorageService;
    private readonly mediaRepo;
    constructor(mediaIngestionService: MediaIngestionService, r2StorageService: R2StorageService, mediaRepo: Repository<MediaObjectEntity>);
    ingestMedia(body: {
        accountId: string;
        messageId: string;
        mediaType: any;
        downloadUrl: string;
        mimeType: string;
    }): Promise<import("../services/media-ingestion.service").MediaIngestionResult>;
    getPresignedUrl(id: string): Promise<{
        presignedUrl: string;
    }>;
    getAccountMedia(accountId: string): Promise<MediaObjectEntity[]>;
    deleteMedia(id: string): Promise<void>;
}
