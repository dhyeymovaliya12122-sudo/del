// ─────────────────────────────────────────────────────────────────────────────
//  config/r2.config.ts — Cloudflare R2 Configuration
// ─────────────────────────────────────────────────────────────────────────────
import { registerAs } from '@nestjs/config';

export default registerAs('r2', () => ({
  accountId: process.env.R2_ACCOUNT_ID ?? '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  bucketName: process.env.R2_BUCKET_NAME ?? 'whatsapp-media',
  publicUrl: process.env.R2_PUBLIC_URL ?? '',
  presignedUrlExpirySec: parseInt(process.env.R2_PRESIGNED_URL_EXPIRY_SECONDS ?? '3600', 10),
  maxFileSizeMb: parseInt(process.env.R2_MAX_FILE_SIZE_MB ?? '100', 10),
}));
