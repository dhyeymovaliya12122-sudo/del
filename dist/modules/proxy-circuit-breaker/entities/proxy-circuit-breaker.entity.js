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
exports.ProxyCircuitBreakerEntity = void 0;
const typeorm_1 = require("typeorm");
const proxy_pool_entity_1 = require("../../proxy-binding/entities/proxy-pool.entity");
let ProxyCircuitBreakerEntity = class ProxyCircuitBreakerEntity {
};
exports.ProxyCircuitBreakerEntity = ProxyCircuitBreakerEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProxyCircuitBreakerEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'proxy_id' }),
    __metadata("design:type", String)
], ProxyCircuitBreakerEntity.prototype, "proxyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => proxy_pool_entity_1.ProxyPoolEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'proxy_id' }),
    __metadata("design:type", proxy_pool_entity_1.ProxyPoolEntity)
], ProxyCircuitBreakerEntity.prototype, "proxy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ProxyCircuitBreakerEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], ProxyCircuitBreakerEntity.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failure_count', default: 0 }),
    __metadata("design:type", Number)
], ProxyCircuitBreakerEntity.prototype, "failureCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_failure_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ProxyCircuitBreakerEntity.prototype, "lastFailureAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opened_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ProxyCircuitBreakerEntity.prototype, "openedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reset_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ProxyCircuitBreakerEntity.prototype, "resetAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ProxyCircuitBreakerEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ProxyCircuitBreakerEntity.prototype, "updatedAt", void 0);
exports.ProxyCircuitBreakerEntity = ProxyCircuitBreakerEntity = __decorate([
    (0, typeorm_1.Entity)('proxy_circuit_breaker_state'),
    (0, typeorm_1.Unique)(['proxyId'])
], ProxyCircuitBreakerEntity);
//# sourceMappingURL=proxy-circuit-breaker.entity.js.map