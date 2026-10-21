// ─────────────────────────────────────────────────────────────────────────────
//  modules/media-pipeline/services/media-ingestion.service.ts
//  Phase 2: Orchestrates the full zero-egress media pipeline
//
//  Flow:
//    1. Receive WhatsApp media download URL (from webhook payload)
//    2. Stream-download via proxy agent (account-specific SOCKS5/HTTP)
//    3. Stream-upload directly to Cloudflare R2 (no temp file)
//    4. Compute SHA-256 checksum on the fly
//    5. Persist CDN URL / presigned URL to PostgreSQL media_objects table
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Readable, PassThrough } from 'stream';
import * as crypto from 'crypto';
import * as mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { MediaObjectEntity, MediaType } from '../entities/media-object.entity';
import { R2StorageService } from './r2-storage.service';

export interface MediaIngestionInput {
  accountId: string;
  messageId: string;
  mediaType: MediaType;
  downloadUrl: string;
  mimeType: string;
  originalFilename?: string;
  httpsAgent?: any;  // Injected SOCKS5/HTTP proxy agent
}

export interface MediaIngestionResult {
  mediaObjectId: string;
  r2Key: string;
  cdnUrl?: string;
  presignedUrl: string;
  presignedUrlExpiry: Date;
  checksumSha256: string;
}

@Injectable()
export class MediaIngestionService {
  private readonly logger = new Logger(MediaIngestionService.name);
  private readonly maxFileSizeMb: number;

  constructor(
    @InjectRepository(MediaObjectEntity)
    private readonly mediaRepo: Repository<MediaObjectEntity>,
    private readonly r2StorageService: R2StorageService,
    private readonly config: ConfigService,
  ) {
    this.maxFileSizeMb = config.get<number>('R2_MAX_FILE_SIZE_MB', 100);
  }

  /**
   * Zero-egress media ingestion:
   * WhatsApp URL → stream through proxy → R2 (no disk touch on NestJS node)
   */
  async ingestMedia(input: MediaIngestionInput): Promise<MediaIngestionResult> {
    const { accountId, messageId, mediaType, downloadUrl, mimeType, originalFilename, httpsAgent } = input;

    const ext = mime.extension(mimeType) || 'bin';
    const r2Key = this.r2StorageService.buildR2Key(accountId, `${messageId}-${uuidv4().slice(0, 8)}`, ext);

    this.logger.log(`📥 Ingesting ${mediaType} for account ${accountId} → R2 key: ${r2Key}`);

    // ── 1. Stream-download from WhatsApp CDN via account proxy ──────────────
    const downloadResponse = await axios.get<Readable>(downloadUrl, {
      responseType: 'stream',
      httpsAgent,
      maxContentLength: this.maxFileSizeMb * 1024 * 1024,
      timeout: 60000,
    });

    // ── 2. Tee the stream: one branch to R2, one to SHA-256 hasher ──────────
    const { uploadStream, checksumPromise, fileSizePromise } =
      this.createTeedStream(downloadResponse.data);

    // ── 3. Stream-upload to R2 concurrently with download ───────────────────
    const [uploadResult, checksum, fileSize] = await Promise.all([
      this.r2StorageService.streamUpload(r2Key, uploadStream, mimeType, {
        'account-id': accountId,
        'message-id': messageId,
        'media-type': mediaType,
      }),
      checksumPromise,
      fileSizePromise,
    ]);

    // ── 4. Generate presigned URL for private access ─────────────────────────
    const { url: presignedUrl, expiresAt: presignedUrlExpiry } =
      await this.r2StorageService.generatePresignedUrl(r2Key);

    // ── 5. Persist reference to PostgreSQL ───────────────────────────────────
    const mediaObject = await this.mediaRepo.save(
      this.mediaRepo.create({
        accountId,
        messageId,
        mediaType,
        originalFilename,
        mimeType,
        fileSizeBytes: fileSize,
        r2Key,
        cdnUrl: uploadResult.cdnUrl || undefined,
        presignedUrl,
        presignedUrlExpiry,
        checksumSha256: checksum,
      }),
    );

    this.logger.log(
      `✅ Media ingested: ${r2Key} (${Math.round(fileSize / 1024)} KB, sha256: ${checksum.slice(0, 12)}…)`,
    );

    return {
      mediaObjectId: mediaObject.id,
      r2Key,
      cdnUrl: uploadResult.cdnUrl || undefined,
      presignedUrl,
      presignedUrlExpiry,
      checksumSha256: checksum,
    };
  }

  /** Refresh presigned URL for a media object */
  async refreshPresignedUrl(mediaObjectId: string): Promise<string> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaObjectId } });
    if (!media) throw new Error(`Media object ${mediaObjectId} not found`);

    const { url, expiresAt } = await this.r2StorageService.generatePresignedUrl(media.r2Key);
    await this.mediaRepo.update(media.id, { presignedUrl: url, presignedUrlExpiry: expiresAt });

    return url;
  }

  /**
   * Create a PassThrough tee: one for R2 upload, one for SHA-256 + size counting.
   * This avoids buffering the entire file in memory.
   */
  private createTeedStream(source: Readable): {
    uploadStream: PassThrough;
    checksumPromise: Promise<string>;
    fileSizePromise: Promise<number>;
  } {
    const uploadStream = new PassThrough();
    const hashStream = new PassThrough();

    source.pipe(uploadStream);
    source.pipe(hashStream);

    const checksumPromise = new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      hashStream.on('data', (chunk) => hash.update(chunk));
      hashStream.on('end', () => resolve(hash.digest('hex')));
      hashStream.on('error', reject);
    });

    const fileSizePromise = new Promise<number>((resolve, reject) => {
      let size = 0;
      const counter = new PassThrough();
      source.pipe(counter);
      counter.on('data', (chunk: Buffer) => { size += chunk.length; });
      counter.on('end', () => resolve(size));
      counter.on('error', reject);
    });

    return { uploadStream, checksumPromise, fileSizePromise };
  }
}
