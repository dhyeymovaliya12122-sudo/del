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
exports.WhatsappContactEntity = void 0;
const typeorm_1 = require("typeorm");
let WhatsappContactEntity = class WhatsappContactEntity {
};
exports.WhatsappContactEntity = WhatsappContactEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ length: 100 }),
    __metadata("design:type", String)
], WhatsappContactEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], WhatsappContactEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone_number', length: 50, default: '' }),
    __metadata("design:type", String)
], WhatsappContactEntity.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, default: '' }),
    __metadata("design:type", String)
], WhatsappContactEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'notify_name', length: 150, default: '' }),
    __metadata("design:type", String)
], WhatsappContactEntity.prototype, "notifyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avatar_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], WhatsappContactEntity.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WhatsappContactEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], WhatsappContactEntity.prototype, "updatedAt", void 0);
exports.WhatsappContactEntity = WhatsappContactEntity = __decorate([
    (0, typeorm_1.Entity)('whatsapp_contacts')
], WhatsappContactEntity);
//# sourceMappingURL=whatsapp-contact.entity.js.map