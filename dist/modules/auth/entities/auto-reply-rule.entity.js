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
exports.AutoReplyRuleEntity = void 0;
const typeorm_1 = require("typeorm");
let AutoReplyRuleEntity = class AutoReplyRuleEntity {
};
exports.AutoReplyRuleEntity = AutoReplyRuleEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], AutoReplyRuleEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_id' }),
    __metadata("design:type", String)
], AutoReplyRuleEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AutoReplyRuleEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trigger_type' }),
    __metadata("design:type", String)
], AutoReplyRuleEntity.prototype, "triggerType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trigger_value', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AutoReplyRuleEntity.prototype, "triggerValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reply_message', type: 'text' }),
    __metadata("design:type", String)
], AutoReplyRuleEntity.prototype, "replyMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], AutoReplyRuleEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'only_outside_hours', default: false }),
    __metadata("design:type", Boolean)
], AutoReplyRuleEntity.prototype, "onlyOutsideHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'business_hours_start', nullable: true }),
    __metadata("design:type", String)
], AutoReplyRuleEntity.prototype, "businessHoursStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'business_hours_end', nullable: true }),
    __metadata("design:type", String)
], AutoReplyRuleEntity.prototype, "businessHoursEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'match_count', default: 0 }),
    __metadata("design:type", Number)
], AutoReplyRuleEntity.prototype, "matchCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reply_count', default: 0 }),
    __metadata("design:type", Number)
], AutoReplyRuleEntity.prototype, "replyCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AutoReplyRuleEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], AutoReplyRuleEntity.prototype, "updatedAt", void 0);
exports.AutoReplyRuleEntity = AutoReplyRuleEntity = __decorate([
    (0, typeorm_1.Entity)('auto_reply_rules')
], AutoReplyRuleEntity);
//# sourceMappingURL=auto-reply-rule.entity.js.map