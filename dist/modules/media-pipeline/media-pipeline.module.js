"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaPipelineModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const media_object_entity_1 = require("./entities/media-object.entity");
const whatsapp_account_entity_1 = require("../session-hydration/entities/whatsapp-account.entity");
const user_account_access_entity_1 = require("../auth/entities/user-account-access.entity");
const account_isolation_guard_1 = require("../../common/guards/account-isolation.guard");
const r2_storage_service_1 = require("./services/r2-storage.service");
const media_ingestion_service_1 = require("./services/media-ingestion.service");
const media_cleanup_worker_1 = require("./workers/media-cleanup.worker");
const media_pipeline_controller_1 = require("./controllers/media-pipeline.controller");
let MediaPipelineModule = class MediaPipelineModule {
};
exports.MediaPipelineModule = MediaPipelineModule;
exports.MediaPipelineModule = MediaPipelineModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([media_object_entity_1.MediaObjectEntity, whatsapp_account_entity_1.WhatsappAccountEntity, user_account_access_entity_1.UserAccountAccessEntity]),
            bullmq_1.BullModule.registerQueue({
                name: 'media-processing',
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 50,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                },
            }),
        ],
        controllers: [media_pipeline_controller_1.MediaPipelineController],
        providers: [
            r2_storage_service_1.R2StorageService,
            media_ingestion_service_1.MediaIngestionService,
            media_cleanup_worker_1.MediaCleanupWorker,
            account_isolation_guard_1.AccountIsolationGuard,
        ],
        exports: [r2_storage_service_1.R2StorageService, media_ingestion_service_1.MediaIngestionService],
    })
], MediaPipelineModule);
//# sourceMappingURL=media-pipeline.module.js.map