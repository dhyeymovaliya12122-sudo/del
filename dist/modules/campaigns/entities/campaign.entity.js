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
exports.CampaignEntity = void 0;
const typeorm_1 = require("typeorm");
let CampaignEntity = class CampaignEntity {
};
exports.CampaignEntity = CampaignEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CampaignEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'template_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "templateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_group_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "contactGroupId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'draft' }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'message_body', type: 'text', nullable: true }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "messageBody", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "mediaUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_type', length: 50, nullable: true }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scheduled_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], CampaignEntity.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], CampaignEntity.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], CampaignEntity.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_recipients', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CampaignEntity.prototype, "totalRecipients", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CampaignEntity.prototype, "sentCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivered_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CampaignEntity.prototype, "deliveredCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'read_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CampaignEntity.prototype, "readCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'replied_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CampaignEntity.prototype, "repliedCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CampaignEntity.prototype, "failedCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'clicked_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CampaignEntity.prototype, "clickedCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CampaignEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CampaignEntity.prototype, "updatedAt", void 0);
exports.CampaignEntity = CampaignEntity = __decorate([
    (0, typeorm_1.Entity)('campaigns')
], CampaignEntity);
//# sourceMappingURL=campaign.entity.js.map