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
exports.ExportLogEntity = void 0;
const typeorm_1 = require("typeorm");
let ExportLogEntity = class ExportLogEntity {
};
exports.ExportLogEntity = ExportLogEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'user_id', length: 100, nullable: true }),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'username', length: 150, default: 'anonymous' }),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_role', length: 50, default: 'ADMIN' }),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "userRole", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: 'all' }),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30, default: 'zip' }),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "format", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pii_redacted', default: false }),
    __metadata("design:type", Boolean)
], ExportLogEntity.prototype, "piiRedacted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_protected', default: false }),
    __metadata("design:type", Boolean)
], ExportLogEntity.prototype, "passwordProtected", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'record_count', default: 0 }),
    __metadata("design:type", Number)
], ExportLogEntity.prototype, "recordCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_size_bytes', type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], ExportLogEntity.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', length: 60, nullable: true }),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30, default: 'completed' }),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], ExportLogEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ExportLogEntity.prototype, "createdAt", void 0);
exports.ExportLogEntity = ExportLogEntity = __decorate([
    (0, typeorm_1.Entity)('export_logs')
], ExportLogEntity);
//# sourceMappingURL=export-log.entity.js.map