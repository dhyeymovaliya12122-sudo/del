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
exports.StreamCheckpointEntity = void 0;
const typeorm_1 = require("typeorm");
let StreamCheckpointEntity = class StreamCheckpointEntity {
};
exports.StreamCheckpointEntity = StreamCheckpointEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StreamCheckpointEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stream_key', length: 200, unique: true }),
    __metadata("design:type", String)
], StreamCheckpointEntity.prototype, "streamKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consumer_group', length: 100 }),
    __metadata("design:type", String)
], StreamCheckpointEntity.prototype, "consumerGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_ack_id', length: 50, default: '0' }),
    __metadata("design:type", String)
], StreamCheckpointEntity.prototype, "lastAckId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_processed', type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], StreamCheckpointEntity.prototype, "totalProcessed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_dead_lettered', type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], StreamCheckpointEntity.prototype, "totalDeadLettered", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], StreamCheckpointEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], StreamCheckpointEntity.prototype, "updatedAt", void 0);
exports.StreamCheckpointEntity = StreamCheckpointEntity = __decorate([
    (0, typeorm_1.Entity)('webhook_stream_checkpoint')
], StreamCheckpointEntity);
//# sourceMappingURL=stream-checkpoint.entity.js.map