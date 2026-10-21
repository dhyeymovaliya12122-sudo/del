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
exports.WhatsappAccountEntity = void 0;
const typeorm_1 = require("typeorm");
const session_auth_entity_1 = require("./session-auth.entity");
let WhatsappAccountEntity = class WhatsappAccountEntity {
};
exports.WhatsappAccountEntity = WhatsappAccountEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WhatsappAccountEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone_number', length: 20, unique: true }),
    __metadata("design:type", String)
], WhatsappAccountEntity.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_name', length: 100, nullable: true }),
    __metadata("design:type", String)
], WhatsappAccountEntity.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], WhatsappAccountEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'proxy_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], WhatsappAccountEntity.prototype, "proxyId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => session_auth_entity_1.SessionAuthEntity, (s) => s.account, { eager: false }),
    __metadata("design:type", session_auth_entity_1.SessionAuthEntity)
], WhatsappAccountEntity.prototype, "session", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WhatsappAccountEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], WhatsappAccountEntity.prototype, "updatedAt", void 0);
exports.WhatsappAccountEntity = WhatsappAccountEntity = __decorate([
    (0, typeorm_1.Entity)('whatsapp_accounts')
], WhatsappAccountEntity);
//# sourceMappingURL=whatsapp-account.entity.js.map