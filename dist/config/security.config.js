"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('security', () => ({
    webhookHmacSecret: process.env.WEBHOOK_HMAC_SECRET ?? '',
    webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN ?? '',
    webhookSignatureHeader: process.env.WEBHOOK_SIGNATURE_HEADER ?? 'x-hub-signature-256',
    sessionEncryptionKey: process.env.SESSION_ENCRYPTION_KEY ?? '',
    sessionIvLength: parseInt(process.env.SESSION_IV_LENGTH ?? '16', 10),
    sessionAlgorithm: process.env.SESSION_ALGORITHM ?? 'aes-256-cbc',
    cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID ?? '',
    cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN ?? '',
}));
//# sourceMappingURL=security.config.js.map