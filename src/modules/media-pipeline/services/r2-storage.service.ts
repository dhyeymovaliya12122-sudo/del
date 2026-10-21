// ─────────────────────────────────────────────────────────────────────────────
//  modules/media-pipeline/services/r2-storage.service.ts
//  Phase 2: Cloudflare R2 storage via @aws-sdk/client-s3
//
//  R2 exposes an S3-compatible API. The endpoint is:
//    https://<ACCOUNT_ID>.r2.cloudflarestorage.com
//
//  Features:
//  - putObject (streaming upload — no temp file on disk)
//  - getObject (streaming download)
//  - generatePresignedUrl (time-limited private access)
//  - deleteObject (soft-delete with DB flag, hard-delete here)
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  r2Key: string;
  cdnUrl: string;
  eTag?: string;
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: Date;
}

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly presignedExpirySec: number;
  private readonly isConfigured: boolean;
  private readonly localMediaDir: string;

  constructor(private readonly config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID', '');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID', '');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY', '');

    this.bucket = config.get<string>('R2_BUCKET_NAME', 'whatsapp-media');
    this.publicUrl = config.get<string>('R2_PUBLIC_URL', '');
    this.presignedExpirySec = config.get<number>('R2_PRESIGNED_URL_EXPIRY_SECONDS', 3600);
    this.localMediaDir = path.resolve(process.cwd(), 'data', 'media');

    if (
      !accountId ||
      !accessKeyId ||
      !secretAccessKey ||
      accountId === 'disabled' ||
      accessKeyId === 'disabled'
    ) {
      this.isConfigured = false;
      this.logger.warn(
        '⚠️  Cloudflare R2 is disabled or not configured. Using local disk fallback (./data/media) for media storage.',
      );
      if (!fs.existsSync(this.localMediaDir)) {
        fs.mkdirSync(this.localMediaDir, { recursive: true });
      }
    } else {
      this.isConfigured = true;
      // Cloudflare R2 S3-compatible endpoint
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true, // Required for R2
      });
      this.logger.log(`✅ Cloudflare R2 configured → bucket: ${this.bucket}`);
    }
  }

  /**
   * Stream upload to R2 — zero disk I/O on the NestJS container.
   * If R2 is unconfigured/disabled, saves locally to data/media directory.
   */
  async streamUpload(
    r2Key: string,
    stream: Readable | Buffer,
    mimeType: string,
    metadata: Record<string, string> = {},
  ): Promise<UploadResult> {
    if (!this.isConfigured || !this.s3) {
      const localFilePath = path.join(this.localMediaDir, r2Key);
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (Buffer.isBuffer(stream)) {
        await fs.promises.writeFile(localFilePath, stream);
      } else {
        await new Promise<void>((resolve, reject) => {
          const writeStream = fs.createWriteStream(localFilePath);
          stream.pipe(writeStream);
          writeStream.on('finish', () => resolve());
          writeStream.on('error', reject);
        });
      }

      const cdnUrl = `/api/v1/media/${r2Key}`;
      this.logger.log(`✅ Stored media locally: ${localFilePath}`);
      return {
        r2Key,
        cdnUrl,
        eTag: 'local-file',
      };
    }

    this.logger.debug(`Uploading to R2: ${r2Key}`);

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: r2Key,
        Body: stream,
        ContentType: mimeType,
        Metadata: metadata,
      },
      queueSize: 4, // Parallel chunk uploads
      partSize: 5 * 1024 * 1024, // 5 MB parts
      leavePartsOnError: false,
    });

    const result = await upload.done();

    const cdnUrl = this.publicUrl
      ? `${this.publicUrl.replace(/\/$/, '')}/${r2Key}`
      : '';

    this.logger.log(`✅ Uploaded to R2: ${r2Key} (eTag: ${result.ETag})`);

    return {
      r2Key,
      cdnUrl,
      eTag: result.ETag,
    };
  }

  /**
   * Generate a presigned GET URL for private bucket access.
   * Falls back to local URL if R2 is not configured.
   */
  async generatePresignedUrl(r2Key: string): Promise<PresignedUrlResult> {
    if (!this.isConfigured || !this.s3) {
      return {
        url: `/api/v1/media/${r2Key}`,
        expiresAt: new Date(Date.now() + this.presignedExpirySec * 1000),
      };
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: r2Key,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: this.presignedExpirySec,
    });

    const expiresAt = new Date(Date.now() + this.presignedExpirySec * 1000);

    return { url, expiresAt };
  }

  /** Permanently delete an object from R2 or local disk */
  async deleteObject(r2Key: string): Promise<void> {
    if (!this.isConfigured || !this.s3) {
      const localFilePath = path.join(this.localMediaDir, r2Key);
      if (fs.existsSync(localFilePath)) {
        await fs.promises.unlink(localFilePath).catch(() => {});
        this.logger.log(`🗑  Deleted local media: ${r2Key}`);
      }
      return;
    }

    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: r2Key }),
    );
    this.logger.log(`🗑  Deleted from R2: ${r2Key}`);
  }

  /** Check if an object exists in R2 or local disk */
  async objectExists(r2Key: string): Promise<boolean> {
    if (!this.isConfigured || !this.s3) {
      const localFilePath = path.join(this.localMediaDir, r2Key);
      return fs.existsSync(localFilePath);
    }

    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: r2Key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Build the R2 object key for an incoming media file */
  buildR2Key(accountId: string, messageId: string, ext: string): string {
    const date = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
    return `${accountId}/${date}/${messageId}.${ext}`;
  }
}
