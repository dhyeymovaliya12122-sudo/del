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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MediaIngestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaIngestionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const stream_1 = require("stream");
const crypto = require("crypto");
const mime = require("mime-types");
const uuid_1 = require("uuid");
const axios_1 = require("axios");
const media_object_entity_1 = require("../entities/media-object.entity");
const r2_storage_service_1 = require("./r2-storage.service");
let MediaIngestionService = MediaIngestionService_1 = class MediaIngestionService {
    constructor(mediaRepo, r2StorageService, config) {
        this.mediaRepo = mediaRepo;
        this.r2StorageService = r2StorageService;
        this.config = config;
        this.logger = new common_1.Logger(MediaIngestionService_1.name);
        this.maxFileSizeMb = config.get('R2_MAX_FILE_SIZE_MB', 100);
    }
    async ingestMedia(input) {
        const { accountId, messageId, mediaType, downloadUrl, mimeType, originalFilename, httpsAgent } = input;
        const ext = mime.extension(mimeType) || 'bin';
        const r2Key = this.r2StorageService.buildR2Key(accountId, `${messageId}-${(0, uuid_1.v4)().slice(0, 8)}`, ext);
        this.logger.log(`📥 Ingesting ${mediaType} for account ${accountId} → R2 key: ${r2Key}`);
        const downloadResponse = await axios_1.default.get(downloadUrl, {
            responseType: 'stream',
            httpsAgent,
            maxContentLength: this.maxFileSizeMb * 1024 * 1024,
            timeout: 60000,
        });
        const { uploadStream, checksumPromise, fileSizePromise } = this.createTeedStream(downloadResponse.data);
        const [uploadResult, checksum, fileSize] = await Promise.all([
            this.r2StorageService.streamUpload(r2Key, uploadStream, mimeType, {
                'account-id': accountId,
                'message-id': messageId,
                'media-type': mediaType,
            }),
            checksumPromise,
            fileSizePromise,
        ]);
        const { url: presignedUrl, expiresAt: presignedUrlExpiry } = await this.r2StorageService.generatePresignedUrl(r2Key);
        const mediaObject = await this.mediaRepo.save(this.mediaRepo.create({
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
        }));
        this.logger.log(`✅ Media ingested: ${r2Key} (${Math.round(fileSize / 1024)} KB, sha256: ${checksum.slice(0, 12)}…)`);
        return {
            mediaObjectId: mediaObject.id,
            r2Key,
            cdnUrl: uploadResult.cdnUrl || undefined,
            presignedUrl,
            presignedUrlExpiry,
            checksumSha256: checksum,
        };
    }
    async refreshPresignedUrl(mediaObjectId) {
        const media = await this.mediaRepo.findOne({ where: { id: mediaObjectId } });
        if (!media)
            throw new Error(`Media object ${mediaObjectId} not found`);
        const { url, expiresAt } = await this.r2StorageService.generatePresignedUrl(media.r2Key);
        await this.mediaRepo.update(media.id, { presignedUrl: url, presignedUrlExpiry: expiresAt });
        return url;
    }
    createTeedStream(source) {
        const uploadStream = new stream_1.PassThrough();
        const hashStream = new stream_1.PassThrough();
        source.pipe(uploadStream);
        source.pipe(hashStream);
        const checksumPromise = new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            hashStream.on('data', (chunk) => hash.update(chunk));
            hashStream.on('end', () => resolve(hash.digest('hex')));
            hashStream.on('error', reject);
        });
        const fileSizePromise = new Promise((resolve, reject) => {
            let size = 0;
            const counter = new stream_1.PassThrough();
            source.pipe(counter);
            counter.on('data', (chunk) => { size += chunk.length; });
            counter.on('end', () => resolve(size));
            counter.on('error', reject);
        });
        return { uploadStream, checksumPromise, fileSizePromise };
    }
};
exports.MediaIngestionService = MediaIngestionService;
exports.MediaIngestionService = MediaIngestionService = MediaIngestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(media_object_entity_1.MediaObjectEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        r2_storage_service_1.R2StorageService,
        config_1.ConfigService])
], MediaIngestionService);
//# sourceMappingURL=media-ingestion.service.js.map