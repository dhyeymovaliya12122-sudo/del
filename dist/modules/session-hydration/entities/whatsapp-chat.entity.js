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
exports.WhatsappChatEntity = void 0;
const typeorm_1 = require("typeorm");
let WhatsappChatEntity = class WhatsappChatEntity {
};
exports.WhatsappChatEntity = WhatsappChatEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ length: 100 }),
    __metadata("design:type", String)
], WhatsappChatEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], WhatsappChatEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, default: '' }),
    __metadata("design:type", String)
], WhatsappChatEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], WhatsappChatEntity.prototype, "subtitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_group', default: false }),
    __metadata("design:type", Boolean)
], WhatsappChatEntity.prototype, "isGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unread_count', default: 0 }),
    __metadata("design:type", Number)
], WhatsappChatEntity.prototype, "unreadCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_message_text', type: 'text', default: '' }),
    __metadata("design:type", String)
], WhatsappChatEntity.prototype, "lastMessageText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_message_timestamp', type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], WhatsappChatEntity.prototype, "lastMessageTimestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_message_status', length: 20, default: 'sent' }),
    __metadata("design:type", String)
], WhatsappChatEntity.prototype, "lastMessageStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_message_from_me', default: false }),
    __metadata("design:type", Boolean)
], WhatsappChatEntity.prototype, "lastMessageFromMe", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], WhatsappChatEntity.prototype, "pinned", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avatar_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], WhatsappChatEntity.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WhatsappChatEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], WhatsappChatEntity.prototype, "updatedAt", void 0);
exports.WhatsappChatEntity = WhatsappChatEntity = __decorate([
    (0, typeorm_1.Entity)('whatsapp_chats'),
    (0, typeorm_1.Index)(['accountId', 'lastMessageTimestamp'])
], WhatsappChatEntity);
//# sourceMappingURL=whatsapp-chat.entity.js.map