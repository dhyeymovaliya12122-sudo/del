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
exports.SessionAuthEntity = void 0;
const typeorm_1 = require("typeorm");
const whatsapp_account_entity_1 = require("./whatsapp-account.entity");
let SessionAuthEntity = class SessionAuthEntity {
};
exports.SessionAuthEntity = SessionAuthEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SessionAuthEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_id' }),
    __metadata("design:type", String)
], SessionAuthEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => whatsapp_account_entity_1.WhatsappAccountEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'account_id' }),
    __metadata("design:type", whatsapp_account_entity_1.WhatsappAccountEntity)
], SessionAuthEntity.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'encrypted_creds', type: 'text' }),
    __metadata("design:type", String)
], SessionAuthEntity.prototype, "encryptedCreds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'encrypted_keys', type: 'text', nullable: true }),
    __metadata("design:type", String)
], SessionAuthEntity.prototype, "encryptedKeys", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'iv', length: 64 }),
    __metadata("design:type", String)
], SessionAuthEntity.prototype, "iv", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'version', default: 1 }),
    __metadata("design:type", Number)
], SessionAuthEntity.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'checksum', length: 64 }),
    __metadata("design:type", String)
], SessionAuthEntity.prototype, "checksum", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], SessionAuthEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], SessionAuthEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hydrated_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], SessionAuthEntity.prototype, "hydratedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], SessionAuthEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], SessionAuthEntity.prototype, "updatedAt", void 0);
exports.SessionAuthEntity = SessionAuthEntity = __decorate([
    (0, typeorm_1.Entity)('session_auth_store')
], SessionAuthEntity);
//# sourceMappingURL=session-auth.entity.js.map