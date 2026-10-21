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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookIngestionLogEntity = void 0;
const typeorm_1 = require("typeorm");
let WebhookIngestionLogEntity = class WebhookIngestionLogEntity {
};
exports.WebhookIngestionLogEntity = WebhookIngestionLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WebhookIngestionLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], WebhookIngestionLogEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'event_type', length: 100 }),
    __metadata("design:type", String)
], WebhookIngestionLogEntity.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], WebhookIngestionLogEntity.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hmac_valid' }),
    __metadata("design:type", Boolean)
], WebhookIngestionLogEntity.prototype, "hmacValid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_ip', length: 45, nullable: true }),
    __metadata("design:type", String)
], WebhookIngestionLogEntity.prototype, "sourceIp", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'processed_at' }),
    __metadata("design:type", Date)
], WebhookIngestionLogEntity.prototype, "processedAt", void 0);
exports.WebhookIngestionLogEntity = WebhookIngestionLogEntity = __decorate([
    (0, typeorm_1.Entity)('webhook_ingestion_log')
], WebhookIngestionLogEntity);
//# sourceMappingURL=webhook-ingestion-log.entity.js.map