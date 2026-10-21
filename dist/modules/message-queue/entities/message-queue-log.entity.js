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
exports.MessageQueueLogEntity = void 0;
const typeorm_1 = require("typeorm");
let MessageQueueLogEntity = class MessageQueueLogEntity {
};
exports.MessageQueueLogEntity = MessageQueueLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MessageQueueLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'job_id', length: 100, unique: true }),
    __metadata("design:type", String)
], MessageQueueLogEntity.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], MessageQueueLogEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'queue_name', length: 100 }),
    __metadata("design:type", String)
], MessageQueueLogEntity.prototype, "queueName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'job_type', length: 50 }),
    __metadata("design:type", String)
], MessageQueueLogEntity.prototype, "jobType", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'queued' }),
    __metadata("design:type", String)
], MessageQueueLogEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], MessageQueueLogEntity.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], MessageQueueLogEntity.prototype, "attempt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], MessageQueueLogEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'processed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], MessageQueueLogEntity.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], MessageQueueLogEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], MessageQueueLogEntity.prototype, "updatedAt", void 0);
exports.MessageQueueLogEntity = MessageQueueLogEntity = __decorate([
    (0, typeorm_1.Entity)('message_queue_log')
], MessageQueueLogEntity);
//# sourceMappingURL=message-queue-log.entity.js.map