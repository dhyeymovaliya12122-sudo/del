"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var R2StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.R2StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");
const path = require("path");
let R2StorageService = R2StorageService_1 = class R2StorageService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(R2StorageService_1.name);
        this.s3 = null;
        const accountId = config.get('R2_ACCOUNT_ID', '');
        const accessKeyId = config.get('R2_ACCESS_KEY_ID', '');
        const secretAccessKey = config.get('R2_SECRET_ACCESS_KEY', '');
        this.bucket = config.get('R2_BUCKET_NAME', 'whatsapp-media');
        this.publicUrl = config.get('R2_PUBLIC_URL', '');
        this.presignedExpirySec = config.get('R2_PRESIGNED_URL_EXPIRY_SECONDS', 3600);
        this.localMediaDir = path.resolve(process.cwd(), 'data', 'media');
        if (!accountId ||
            !accessKeyId ||
            !secretAccessKey ||
            accountId === 'disabled' ||
            accessKeyId === 'disabled') {
            this.isConfigured = false;
            this.logger.warn('⚠️  Cloudflare R2 is disabled or not configured. Using local disk fallback (./data/media) for media storage.');
            if (!fs.existsSync(this.localMediaDir)) {
                fs.mkdirSync(this.localMediaDir, { recursive: true });
            }
        }
        else {
            this.isConfigured = true;
            this.s3 = new client_s3_1.S3Client({
                region: 'auto',
                endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                credentials: { accessKeyId, secretAccessKey },
                forcePathStyle: true,
            });
            this.logger.log(`✅ Cloudflare R2 configured → bucket: ${this.bucket}`);
        }
    }
    async streamUpload(r2Key, stream, mimeType, metadata = {}) {
        if (!this.isConfigured || !this.s3) {
            const localFilePath = path.join(this.localMediaDir, r2Key);
            const dir = path.dirname(localFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            if (Buffer.isBuffer(stream)) {
                await fs.promises.writeFile(localFilePath, stream);
            }
            else {
                await new Promise((resolve, reject) => {
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
        const upload = new lib_storage_1.Upload({
            client: this.s3,
            params: {
                Bucket: this.bucket,
                Key: r2Key,
                Body: stream,
                ContentType: mimeType,
                Metadata: metadata,
            },
            queueSize: 4,
            partSize: 5 * 1024 * 1024,
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
    async generatePresignedUrl(r2Key) {
        if (!this.isConfigured || !this.s3) {
            return {
                url: `/api/v1/media/${r2Key}`,
                expiresAt: new Date(Date.now() + this.presignedExpirySec * 1000),
            };
        }
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: r2Key,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, {
            expiresIn: this.presignedExpirySec,
        });
        const expiresAt = new Date(Date.now() + this.presignedExpirySec * 1000);
        return { url, expiresAt };
    }
    async deleteObject(r2Key) {
        if (!this.isConfigured || !this.s3) {
            const localFilePath = path.join(this.localMediaDir, r2Key);
            if (fs.existsSync(localFilePath)) {
                await fs.promises.unlink(localFilePath).catch(() => { });
                this.logger.log(`🗑  Deleted local media: ${r2Key}`);
            }
            return;
        }
        await this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: r2Key }));
        this.logger.log(`🗑  Deleted from R2: ${r2Key}`);
    }
    async objectExists(r2Key) {
        if (!this.isConfigured || !this.s3) {
            const localFilePath = path.join(this.localMediaDir, r2Key);
            return fs.existsSync(localFilePath);
        }
        try {
            await this.s3.send(new client_s3_1.HeadObjectCommand({ Bucket: this.bucket, Key: r2Key }));
            return true;
        }
        catch {
            return false;
        }
    }
    buildR2Key(accountId, messageId, ext) {
        const date = new Date().toISOString().slice(0, 10);
        return `${accountId}/${date}/${messageId}.${ext}`;
    }
};
exports.R2StorageService = R2StorageService;
exports.R2StorageService = R2StorageService = R2StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], R2StorageService);
//# sourceMappingURL=r2-storage.service.js.map