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
exports.MediaObjectEntity = void 0;
const typeorm_1 = require("typeorm");
const whatsapp_account_entity_1 = require("../../session-hydration/entities/whatsapp-account.entity");
let MediaObjectEntity = class MediaObjectEntity {
};
exports.MediaObjectEntity = MediaObjectEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => whatsapp_account_entity_1.WhatsappAccountEntity, { onDelete: 'CASCADE', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'account_id' }),
    __metadata("design:type", whatsapp_account_entity_1.WhatsappAccountEntity)
], MediaObjectEntity.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'message_id', length: 100 }),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "messageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_type', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'original_filename', length: 255, nullable: true }),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "originalFilename", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', length: 100, nullable: true }),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_size_bytes', type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], MediaObjectEntity.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'r2_key', length: 500, unique: true }),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "r2Key", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cdn_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "cdnUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'presigned_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "presignedUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'presigned_url_expiry', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], MediaObjectEntity.prototype, "presignedUrlExpiry", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'checksum_sha256', length: 64, nullable: true }),
    __metadata("design:type", String)
], MediaObjectEntity.prototype, "checksumSha256", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_deleted', default: false }),
    __metadata("design:type", Boolean)
], MediaObjectEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], MediaObjectEntity.prototype, "createdAt", void 0);
exports.MediaObjectEntity = MediaObjectEntity = __decorate([
    (0, typeorm_1.Entity)('media_objects')
], MediaObjectEntity);
//# sourceMappingURL=media-object.entity.js.map