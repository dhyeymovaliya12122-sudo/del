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
exports.ContainerHealLogEntity = void 0;
const typeorm_1 = require("typeorm");
const container_instance_entity_1 = require("./container-instance.entity");
let ContainerHealLogEntity = class ContainerHealLogEntity {
};
exports.ContainerHealLogEntity = ContainerHealLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ContainerHealLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'container_instance_id', type: 'uuid' }),
    __metadata("design:type", String)
], ContainerHealLogEntity.prototype, "containerInstanceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => container_instance_entity_1.ContainerInstanceEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'container_instance_id' }),
    __metadata("design:type", container_instance_entity_1.ContainerInstanceEntity)
], ContainerHealLogEntity.prototype, "containerInstance", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_id', length: 36 }),
    __metadata("design:type", String)
], ContainerHealLogEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'heal_reason', length: 200 }),
    __metadata("design:type", String)
], ContainerHealLogEntity.prototype, "healReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'previous_state', length: 20 }),
    __metadata("design:type", String)
], ContainerHealLogEntity.prototype, "previousState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'action_taken', length: 100 }),
    __metadata("design:type", String)
], ContainerHealLogEntity.prototype, "actionTaken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'success', default: false }),
    __metadata("design:type", Boolean)
], ContainerHealLogEntity.prototype, "success", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], ContainerHealLogEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ContainerHealLogEntity.prototype, "createdAt", void 0);
exports.ContainerHealLogEntity = ContainerHealLogEntity = __decorate([
    (0, typeorm_1.Entity)('container_heal_log')
], ContainerHealLogEntity);
//# sourceMappingURL=container-heal-log.entity.js.map