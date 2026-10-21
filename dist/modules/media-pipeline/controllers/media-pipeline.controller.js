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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaPipelineController = void 0;
const common_1 = require("@nestjs/common");
const media_ingestion_service_1 = require("../services/media-ingestion.service");
const r2_storage_service_1 = require("../services/r2-storage.service");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const media_object_entity_1 = require("../entities/media-object.entity");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const account_isolation_guard_1 = require("../../../common/guards/account-isolation.guard");
let MediaPipelineController = class MediaPipelineController {
    constructor(mediaIngestionService, r2StorageService, mediaRepo) {
        this.mediaIngestionService = mediaIngestionService;
        this.r2StorageService = r2StorageService;
        this.mediaRepo = mediaRepo;
    }
    async ingestMedia(body) {
        return this.mediaIngestionService.ingestMedia(body);
    }
    async getPresignedUrl(id) {
        const url = await this.mediaIngestionService.refreshPresignedUrl(id);
        return { presignedUrl: url };
    }
    async getAccountMedia(accountId) {
        return this.mediaRepo.find({
            where: { accountId, isDeleted: false },
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }
    async deleteMedia(id) {
        await this.mediaRepo.update(id, { isDeleted: true });
    }
};
exports.MediaPipelineController = MediaPipelineController;
__decorate([
    (0, common_1.Post)('ingest'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaPipelineController.prototype, "ingestMedia", null);
__decorate([
    (0, common_1.Get)(':id/presigned-url'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaPipelineController.prototype, "getPresignedUrl", null);
__decorate([
    (0, common_1.Get)('account/:accountId'),
    (0, common_1.UseGuards)(account_isolation_guard_1.AccountIsolationGuard),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaPipelineController.prototype, "getAccountMedia", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaPipelineController.prototype, "deleteMedia", null);
exports.MediaPipelineController = MediaPipelineController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('media-pipeline'),
    __param(2, (0, typeorm_1.InjectRepository)(media_object_entity_1.MediaObjectEntity)),
    __metadata("design:paramtypes", [media_ingestion_service_1.MediaIngestionService,
        r2_storage_service_1.R2StorageService,
        typeorm_2.Repository])
], MediaPipelineController);
//# sourceMappingURL=media-pipeline.controller.js.map