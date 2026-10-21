import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { MediaObjectEntity } from '../entities/media-object.entity';
import { R2StorageService } from '../services/r2-storage.service';
export declare class MediaCleanupWorker extends WorkerHost {
    private readonly mediaRepo;
    private readonly r2StorageService;
    private readonly mediaQueue;
    private readonly logger;
    constructor(mediaRepo: Repository<MediaObjectEntity>, r2StorageService: R2StorageService, mediaQueue: Queue);
    process(job: Job): Promise<void>;
    scheduleMaintenanceTasks(): Promise<void>;
    private refreshExpiringUrls;
    private hardDeleteMedia;
}
