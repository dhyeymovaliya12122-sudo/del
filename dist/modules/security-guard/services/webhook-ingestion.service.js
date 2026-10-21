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
var WebhookIngestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookIngestionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const webhook_ingestion_log_entity_1 = require("../entities/webhook-ingestion-log.entity");
let WebhookIngestionService = WebhookIngestionService_1 = class WebhookIngestionService {
    constructor(logRepo) {
        this.logRepo = logRepo;
        this.logger = new common_1.Logger(WebhookIngestionService_1.name);
    }
    async processWebhook(payload, sourceIp) {
        for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
                const eventType = change.field;
                const accountId = change.value?.metadata?.phone_number_id;
                await this.logRepo.save(this.logRepo.create({
                    accountId,
                    eventType,
                    payload: change.value,
                    hmacValid: true,
                    sourceIp,
                }));
                if (change.value?.messages?.length) {
                    this.logger.log(`📨 Incoming message for account ${accountId}`);
                }
                if (change.value?.statuses?.length) {
                    this.logger.debug(`📊 Status update for account ${accountId}`);
                }
            }
        }
    }
    async logRejectedWebhook(payload, sourceIp, eventType = 'REJECTED_INVALID_HMAC') {
        await this.logRepo.save(this.logRepo.create({
            eventType,
            payload,
            hmacValid: false,
            sourceIp,
        }));
    }
};
exports.WebhookIngestionService = WebhookIngestionService;
exports.WebhookIngestionService = WebhookIngestionService = WebhookIngestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(webhook_ingestion_log_entity_1.WebhookIngestionLogEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WebhookIngestionService);
//# sourceMappingURL=webhook-ingestion.service.js.map