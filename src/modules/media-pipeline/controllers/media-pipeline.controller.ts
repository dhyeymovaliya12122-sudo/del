// ─────────────────────────────────────────────────────────────────────────────
//  modules/media-pipeline/controllers/media-pipeline.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  Controller, Get, Post, Delete, Param, HttpCode, HttpStatus, Body, UseGuards,
} from '@nestjs/common';
import { MediaIngestionService } from '../services/media-ingestion.service';
import { R2StorageService } from '../services/r2-storage.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaObjectEntity } from '../entities/media-object.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AccountIsolationGuard } from '../../../common/guards/account-isolation.guard';

@UseGuards(JwtAuthGuard)
@Controller('media-pipeline')
export class MediaPipelineController {
  constructor(
    private readonly mediaIngestionService: MediaIngestionService,
    private readonly r2StorageService: R2StorageService,
    @InjectRepository(MediaObjectEntity)
    private readonly mediaRepo: Repository<MediaObjectEntity>,
  ) {}

  /** POST /api/v1/media-pipeline/ingest — Trigger media ingestion from WhatsApp URL */
  @Post('ingest')
  @HttpCode(HttpStatus.CREATED)
  async ingestMedia(
    @Body()
    body: {
      accountId: string;
      messageId: string;
      mediaType: any;
      downloadUrl: string;
      mimeType: string;
    },
  ) {
    return this.mediaIngestionService.ingestMedia(body);
  }

  /** GET /api/v1/media-pipeline/:id/presigned-url — Get fresh presigned URL */
  @Get(':id/presigned-url')
  async getPresignedUrl(@Param('id') id: string) {
    const url = await this.mediaIngestionService.refreshPresignedUrl(id);
    return { presignedUrl: url };
  }

  /** GET /api/v1/media-pipeline/account/:accountId — List media for an account */
  @Get('account/:accountId')
  @UseGuards(AccountIsolationGuard)
  async getAccountMedia(@Param('accountId') accountId: string) {
    return this.mediaRepo.find({
      where: { accountId, isDeleted: false },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /** DELETE /api/v1/media-pipeline/:id — Soft-delete media object */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(@Param('id') id: string) {
    await this.mediaRepo.update(id, { isDeleted: true });
  }
}
