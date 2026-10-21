// ─────────────────────────────────────────────────────────────────────────────
//  config/security.config.ts — HMAC & WAF Security Configuration
// ─────────────────────────────────────────────────────────────────────────────
import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  // HMAC webhook signature
  webhookHmacSecret: process.env.WEBHOOK_HMAC_SECRET ?? '',
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN ?? '',
  webhookSignatureHeader: process.env.WEBHOOK_SIGNATURE_HEADER ?? 'x-hub-signature-256',

  // Session encryption (AES-256-CBC)
  sessionEncryptionKey: process.env.SESSION_ENCRYPTION_KEY ?? '',
  sessionIvLength: parseInt(process.env.SESSION_IV_LENGTH ?? '16', 10),
  sessionAlgorithm: process.env.SESSION_ALGORITHM ?? 'aes-256-cbc',

  // Cloudflare WAF
  cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID ?? '',
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN ?? '',
}));
