declare const _default: (() => {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
    presignedUrlExpirySec: number;
    maxFileSizeMb: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
    presignedUrlExpirySec: number;
    maxFileSizeMb: number;
}>;
export default _default;
