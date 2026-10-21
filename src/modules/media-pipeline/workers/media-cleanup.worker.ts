// ─────────────────────────────────────────────────────────────────────────────
//  modules/media-pipeline/workers/media-cleanup.worker.ts
//  BullMQ worker: refreshes expiring presigned URLs and hard-deletes
//  soft-deleted media objects from R2.
// ─────────────────────────────────────────────────────────────────────────────
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { MediaObjectEntity } from '../entities/media-object.entity';
import { R2StorageService } from '../services/r2-storage.service';

@Processor('media-processing')
export class MediaCleanupWorker extends WorkerHost {
  private readonly logger = new Logger(MediaCleanupWorker.name);

  constructor(
    @InjectRepository(MediaObjectEntity)
    private readonly mediaRepo: Repository<MediaObjectEntity>,
    private readonly r2StorageService: R2StorageService,
    @InjectQueue('media-processing')
    private readonly mediaQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'refresh-presigned-urls') {
      return this.refreshExpiringUrls();
    }
    if (job.name === 'hard-delete-media') {
      return this.hardDeleteMedia(job.data.mediaObjectId, job.data.r2Key);
    }
  }

  /** Every hour: enqueue URL refresh and hard-delete jobs */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleMaintenanceTasks(): Promise<void> {
    await this.mediaQueue.add('refresh-presigned-urls', {}, {
      jobId: `refresh:${Math.floor(Date.now() / 3600000)}`,
    });
  }

  /** Refresh presigned URLs expiring in the next hour */
  private async refreshExpiringUrls(): Promise<void> {
    const soonExpiring = await this.mediaRepo.find({
      where: {
        isDeleted: false,
        presignedUrlExpiry: LessThan(new Date(Date.now() + 2 * 3600 * 1000)),
      },
      take: 100,
    });

    this.logger.log(`Refreshing ${soonExpiring.length} expiring presigned URLs…`);

    await Promise.allSettled(
      soonExpiring.map(async (media) => {
        const { url, expiresAt } = await this.r2StorageService.generatePresignedUrl(media.r2Key);
        await this.mediaRepo.update(media.id, { presignedUrl: url, presignedUrlExpiry: expiresAt });
      }),
    );
  }

  /** Hard-delete a specific object from R2 */
  private async hardDeleteMedia(mediaObjectId: string, r2Key: string): Promise<void> {
    await this.r2StorageService.deleteObject(r2Key);
    await this.mediaRepo.delete(mediaObjectId);
    this.logger.log(`🗑  Hard-deleted media: ${r2Key}`);
  }
}
