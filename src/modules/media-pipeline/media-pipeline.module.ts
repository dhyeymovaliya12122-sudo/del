// ─────────────────────────────────────────────────────────────────────────────
//  modules/media-pipeline/media-pipeline.module.ts
//  Phase 2 — Feature: Zero-Egress Object Storage (Cloudflare R2)
//
//  Inbound media from WhatsApp is streamed directly to R2 via the S3 SDK.
//  No data transits through the NestJS container's filesystem.
//  CDN links and presigned URLs are persisted to PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MediaObjectEntity } from './entities/media-object.entity';
import { WhatsappAccountEntity } from '../session-hydration/entities/whatsapp-account.entity';
import { UserAccountAccessEntity } from '../auth/entities/user-account-access.entity';
import { AccountIsolationGuard } from '../../common/guards/account-isolation.guard';
import { R2StorageService } from './services/r2-storage.service';
import { MediaIngestionService } from './services/media-ingestion.service';
import { MediaCleanupWorker } from './workers/media-cleanup.worker';
import { MediaPipelineController } from './controllers/media-pipeline.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaObjectEntity, WhatsappAccountEntity, UserAccountAccessEntity]),
    BullModule.registerQueue({
      name: 'media-processing',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
  ],
  controllers: [MediaPipelineController],
  providers: [
    R2StorageService,        // Wraps @aws-sdk S3Client configured for R2 endpoint
    MediaIngestionService,   // Streams WhatsApp media → R2, saves CDN ref to DB
    MediaCleanupWorker,      // BullMQ worker: periodic presigned URL refresh + soft-delete
    AccountIsolationGuard,
  ],
  exports: [R2StorageService, MediaIngestionService],
})
export class MediaPipelineModule {}
