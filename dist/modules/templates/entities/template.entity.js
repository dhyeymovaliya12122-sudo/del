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
exports.TemplateEntity = void 0;
const typeorm_1 = require("typeorm");
let TemplateEntity = class TemplateEntity {
};
exports.TemplateEntity = TemplateEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TemplateEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: 'marketing' }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10, default: 'en' }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "header", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "footer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '[]' }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "buttons", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'draft' }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'meta_template_id', length: 100, nullable: true }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "metaTemplateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejection_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], TemplateEntity.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'submitted_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TemplateEntity.prototype, "submittedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TemplateEntity.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TemplateEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], TemplateEntity.prototype, "updatedAt", void 0);
exports.TemplateEntity = TemplateEntity = __decorate([
    (0, typeorm_1.Entity)('message_templates')
], TemplateEntity);
//# sourceMappingURL=template.entity.js.map