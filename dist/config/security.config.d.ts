declare const _default: (() => {
    webhookHmacSecret: string;
    webhookVerifyToken: string;
    webhookSignatureHeader: string;
    sessionEncryptionKey: string;
    sessionIvLength: number;
    sessionAlgorithm: string;
    cloudflareZoneId: string;
    cloudflareApiToken: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    webhookHmacSecret: string;
    webhookVerifyToken: string;
    webhookSignatureHeader: string;
    sessionEncryptionKey: string;
    sessionIvLength: number;
    sessionAlgorithm: string;
    cloudflareZoneId: string;
    cloudflareApiToken: string;
}>;
export default _default;
