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
exports.WhatsappMessageEntity = void 0;
const typeorm_1 = require("typeorm");
let WhatsappMessageEntity = class WhatsappMessageEntity {
};
exports.WhatsappMessageEntity = WhatsappMessageEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ length: 100 }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'chat_jid', length: 100 }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "chatJid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_jid', length: 100, default: '' }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "senderJid", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_name', length: 150, nullable: true }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "senderName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'from_me', default: false }),
    __metadata("design:type", Boolean)
], WhatsappMessageEntity.prototype, "fromMe", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '' }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_type', length: 50, nullable: true }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "mediaUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_name', length: 255, nullable: true }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', length: 100, nullable: true }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_size', type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], WhatsappMessageEntity.prototype, "fileSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'sent' }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', default: false }),
    __metadata("design:type", Boolean)
], WhatsappMessageEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_view_once', default: false }),
    __metadata("design:type", Boolean)
], WhatsappMessageEntity.prototype, "isViewOnce", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_edited', default: false }),
    __metadata("design:type", Boolean)
], WhatsappMessageEntity.prototype, "isEdited", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reaction', length: 50, nullable: true }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "reaction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_starred', default: false }),
    __metadata("design:type", Boolean)
], WhatsappMessageEntity.prototype, "isStarred", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quoted_msg_id', length: 100, nullable: true }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "quotedMsgId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quoted_text', type: 'text', nullable: true }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "quotedText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quoted_sender', length: 150, nullable: true }),
    __metadata("design:type", String)
], WhatsappMessageEntity.prototype, "quotedSender", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], WhatsappMessageEntity.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WhatsappMessageEntity.prototype, "createdAt", void 0);
exports.WhatsappMessageEntity = WhatsappMessageEntity = __decorate([
    (0, typeorm_1.Entity)('whatsapp_messages'),
    (0, typeorm_1.Index)(['accountId', 'chatJid']),
    (0, typeorm_1.Index)(['accountId', 'timestamp']),
    (0, typeorm_1.Index)(['chatJid', 'timestamp']),
    (0, typeorm_1.Index)(['accountId', 'chatJid', 'timestamp']),
    (0, typeorm_1.Index)(['createdAt', 'id'])
], WhatsappMessageEntity);
//# sourceMappingURL=whatsapp-message.entity.js.map