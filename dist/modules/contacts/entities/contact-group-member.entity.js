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
exports.ContactGroupMemberEntity = void 0;
const typeorm_1 = require("typeorm");
let ContactGroupMemberEntity = class ContactGroupMemberEntity {
};
exports.ContactGroupMemberEntity = ContactGroupMemberEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ContactGroupMemberEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'group_id', length: 100 }),
    __metadata("design:type", String)
], ContactGroupMemberEntity.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'phone_number', length: 30 }),
    __metadata("design:type", String)
], ContactGroupMemberEntity.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, nullable: true }),
    __metadata("design:type", String)
], ContactGroupMemberEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], ContactGroupMemberEntity.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], ContactGroupMemberEntity.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_fields', type: 'text', default: '{}' }),
    __metadata("design:type", String)
], ContactGroupMemberEntity.prototype, "customFields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '[]' }),
    __metadata("design:type", String)
], ContactGroupMemberEntity.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opted_out', default: false }),
    __metadata("design:type", Boolean)
], ContactGroupMemberEntity.prototype, "optedOut", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opted_out_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ContactGroupMemberEntity.prototype, "optedOutAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ContactGroupMemberEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ContactGroupMemberEntity.prototype, "updatedAt", void 0);
exports.ContactGroupMemberEntity = ContactGroupMemberEntity = __decorate([
    (0, typeorm_1.Entity)('contact_group_members')
], ContactGroupMemberEntity);
//# sourceMappingURL=contact-group-member.entity.js.map