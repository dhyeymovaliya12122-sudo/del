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
exports.ProxyPoolEntity = void 0;
const typeorm_1 = require("typeorm");
let ProxyPoolEntity = class ProxyPoolEntity {
    toUrl() {
        const auth = this.username
            ? `${this.username}:${this.password ?? ''}@`
            : '';
        return `${this.protocol}://${auth}${this.host}:${this.port}`;
    }
};
exports.ProxyPoolEntity = ProxyPoolEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProxyPoolEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], ProxyPoolEntity.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], ProxyPoolEntity.prototype, "protocol", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], ProxyPoolEntity.prototype, "host", void 0);
__decorate([
    (0, typeorm_1.Column)('integer'),
    __metadata("design:type", Number)
], ProxyPoolEntity.prototype, "port", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], ProxyPoolEntity.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], ProxyPoolEntity.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], ProxyPoolEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_healthy', default: true }),
    __metadata("design:type", Boolean)
], ProxyPoolEntity.prototype, "isHealthy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_health_check', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ProxyPoolEntity.prototype, "lastHealthCheck", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'assigned_account_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ProxyPoolEntity.prototype, "assignedAccountId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ProxyPoolEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ProxyPoolEntity.prototype, "updatedAt", void 0);
exports.ProxyPoolEntity = ProxyPoolEntity = __decorate([
    (0, typeorm_1.Entity)('proxy_pool')
], ProxyPoolEntity);
//# sourceMappingURL=proxy-pool.entity.js.map