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
exports.ContainerInstanceEntity = void 0;
const typeorm_1 = require("typeorm");
let ContainerInstanceEntity = class ContainerInstanceEntity {
};
exports.ContainerInstanceEntity = ContainerInstanceEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'service_id', length: 100, unique: true }),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "serviceId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 36 }),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', length: 36 }),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone_number', length: 20 }),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'orchestrator_type', length: 20, default: 'swarm' }),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "orchestratorType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'starting' }),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'health_state', type: 'varchar', length: 20, default: 'unknown' }),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "healthState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'desired_replicas', default: 1 }),
    __metadata("design:type", Number)
], ContainerInstanceEntity.prototype, "desiredReplicas", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'running_replicas', default: 0 }),
    __metadata("design:type", Number)
], ContainerInstanceEntity.prototype, "runningReplicas", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'region', length: 50, nullable: true }),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "region", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'proxy_url', length: 500, nullable: true }),
    __metadata("design:type", String)
], ContainerInstanceEntity.prototype, "proxyUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'heal_count', default: 0 }),
    __metadata("design:type", Number)
], ContainerInstanceEntity.prototype, "healCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_healed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ContainerInstanceEntity.prototype, "lastHealedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ContainerInstanceEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ContainerInstanceEntity.prototype, "updatedAt", void 0);
exports.ContainerInstanceEntity = ContainerInstanceEntity = __decorate([
    (0, typeorm_1.Entity)('container_instances')
], ContainerInstanceEntity);
//# sourceMappingURL=container-instance.entity.js.map