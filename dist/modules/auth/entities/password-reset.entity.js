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
exports.PasswordResetEntity = void 0;
const typeorm_1 = require("typeorm");
let PasswordResetEntity = class PasswordResetEntity {
};
exports.PasswordResetEntity = PasswordResetEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'user_id' }),
    __metadata("design:type", String)
], PasswordResetEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'token_hash' }),
    __metadata("design:type", String)
], PasswordResetEntity.prototype, "tokenHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'datetime' }),
    __metadata("design:type", Date)
], PasswordResetEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PasswordResetEntity.prototype, "createdAt", void 0);
exports.PasswordResetEntity = PasswordResetEntity = __decorate([
    (0, typeorm_1.Entity)('password_resets')
], PasswordResetEntity);
//# sourceMappingURL=password-reset.entity.js.map