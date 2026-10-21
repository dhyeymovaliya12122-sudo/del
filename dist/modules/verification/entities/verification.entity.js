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
exports.VerificationEntity = void 0;
const typeorm_1 = require("typeorm");
let VerificationEntity = class VerificationEntity {
};
exports.VerificationEntity = VerificationEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VerificationEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], VerificationEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: 'not_started' }),
    __metadata("design:type", String)
], VerificationEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'business_name', length: 200, nullable: true }),
    __metadata("design:type", String)
], VerificationEntity.prototype, "businessName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'business_id', length: 100, nullable: true }),
    __metadata("design:type", String)
], VerificationEntity.prototype, "businessId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'green_tick', default: false }),
    __metadata("design:type", Boolean)
], VerificationEntity.prototype, "greenTick", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone_verified', default: false }),
    __metadata("design:type", Boolean)
], VerificationEntity.prototype, "phoneVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'docs_submitted', default: false }),
    __metadata("design:type", Boolean)
], VerificationEntity.prototype, "docsSubmitted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'meta_business_manager_linked', default: false }),
    __metadata("design:type", Boolean)
], VerificationEntity.prototype, "metaBusinessManagerLinked", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verified_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], VerificationEntity.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'notes', type: 'text', nullable: true }),
    __metadata("design:type", String)
], VerificationEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], VerificationEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], VerificationEntity.prototype, "updatedAt", void 0);
exports.VerificationEntity = VerificationEntity = __decorate([
    (0, typeorm_1.Entity)('account_verifications')
], VerificationEntity);
//# sourceMappingURL=verification.entity.js.map