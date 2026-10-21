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
var MediaCleanupWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaCleanupWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_2 = require("@nestjs/bullmq");
const bullmq_3 = require("bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const media_object_entity_1 = require("../entities/media-object.entity");
const r2_storage_service_1 = require("../services/r2-storage.service");
let MediaCleanupWorker = MediaCleanupWorker_1 = class MediaCleanupWorker extends bullmq_1.WorkerHost {
    constructor(mediaRepo, r2StorageService, mediaQueue) {
        super();
        this.mediaRepo = mediaRepo;
        this.r2StorageService = r2StorageService;
        this.mediaQueue = mediaQueue;
        this.logger = new common_1.Logger(MediaCleanupWorker_1.name);
    }
    async process(job) {
        if (job.name === 'refresh-presigned-urls') {
            return this.refreshExpiringUrls();
        }
        if (job.name === 'hard-delete-media') {
            return this.hardDeleteMedia(job.data.mediaObjectId, job.data.r2Key);
        }
    }
    async scheduleMaintenanceTasks() {
        await this.mediaQueue.add('refresh-presigned-urls', {}, {
            jobId: `refresh:${Math.floor(Date.now() / 3600000)}`,
        });
    }
    async refreshExpiringUrls() {
        const soonExpiring = await this.mediaRepo.find({
            where: {
                isDeleted: false,
                presignedUrlExpiry: (0, typeorm_2.LessThan)(new Date(Date.now() + 2 * 3600 * 1000)),
            },
            take: 100,
        });
        this.logger.log(`Refreshing ${soonExpiring.length} expiring presigned URLs…`);
        await Promise.allSettled(soonExpiring.map(async (media) => {
            const { url, expiresAt } = await this.r2StorageService.generatePresignedUrl(media.r2Key);
            await this.mediaRepo.update(media.id, { presignedUrl: url, presignedUrlExpiry: expiresAt });
        }));
    }
    async hardDeleteMedia(mediaObjectId, r2Key) {
        await this.r2StorageService.deleteObject(r2Key);
        await this.mediaRepo.delete(mediaObjectId);
        this.logger.log(`🗑  Hard-deleted media: ${r2Key}`);
    }
};
exports.MediaCleanupWorker = MediaCleanupWorker;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediaCleanupWorker.prototype, "scheduleMaintenanceTasks", null);
exports.MediaCleanupWorker = MediaCleanupWorker = MediaCleanupWorker_1 = __decorate([
    (0, bullmq_1.Processor)('media-processing'),
    __param(0, (0, typeorm_1.InjectRepository)(media_object_entity_1.MediaObjectEntity)),
    __param(2, (0, bullmq_2.InjectQueue)('media-processing')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        r2_storage_service_1.R2StorageService,
        bullmq_3.Queue])
], MediaCleanupWorker);
//# sourceMappingURL=media-cleanup.worker.js.map