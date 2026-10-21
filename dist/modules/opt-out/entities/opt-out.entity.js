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
exports.OptOutEntity = void 0;
const typeorm_1 = require("typeorm");
let OptOutEntity = class OptOutEntity {
};
exports.OptOutEntity = OptOutEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OptOutEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], OptOutEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'phone_number', length: 30 }),
    __metadata("design:type", String)
], OptOutEntity.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, nullable: true }),
    __metadata("design:type", String)
], OptOutEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opt_out_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], OptOutEntity.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opt_out_source', length: 50, default: 'manual' }),
    __metadata("design:type", String)
], OptOutEntity.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], OptOutEntity.prototype, "createdAt", void 0);
exports.OptOutEntity = OptOutEntity = __decorate([
    (0, typeorm_1.Entity)('opt_outs')
], OptOutEntity);
//# sourceMappingURL=opt-out.entity.js.map