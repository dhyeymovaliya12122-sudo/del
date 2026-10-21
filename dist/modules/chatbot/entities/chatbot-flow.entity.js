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
exports.ChatbotFlowEntity = void 0;
const typeorm_1 = require("typeorm");
let ChatbotFlowEntity = class ChatbotFlowEntity {
};
exports.ChatbotFlowEntity = ChatbotFlowEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChatbotFlowEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], ChatbotFlowEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], ChatbotFlowEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trigger_keyword', length: 200, nullable: true }),
    __metadata("design:type", String)
], ChatbotFlowEntity.prototype, "triggerKeyword", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_regex', default: false }),
    __metadata("design:type", Boolean)
], ChatbotFlowEntity.prototype, "isRegex", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], ChatbotFlowEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '[]' }),
    __metadata("design:type", String)
], ChatbotFlowEntity.prototype, "nodes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '[]' }),
    __metadata("design:type", String)
], ChatbotFlowEntity.prototype, "edges", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'escalate_to_human', default: false }),
    __metadata("design:type", Boolean)
], ChatbotFlowEntity.prototype, "escalateToHuman", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'escalate_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], ChatbotFlowEntity.prototype, "escalateMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ChatbotFlowEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ChatbotFlowEntity.prototype, "updatedAt", void 0);
exports.ChatbotFlowEntity = ChatbotFlowEntity = __decorate([
    (0, typeorm_1.Entity)('chatbot_flows')
], ChatbotFlowEntity);
//# sourceMappingURL=chatbot-flow.entity.js.map