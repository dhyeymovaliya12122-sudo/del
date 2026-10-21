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
exports.MigrationEntity = void 0;
const typeorm_1 = require("typeorm");
let MigrationEntity = class MigrationEntity {
};
exports.MigrationEntity = MigrationEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MigrationEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'account_id', length: 100 }),
    __metadata("design:type", String)
], MigrationEntity.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_phone_number', length: 30 }),
    __metadata("design:type", String)
], MigrationEntity.prototype, "sourcePhoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_provider', length: 100, nullable: true }),
    __metadata("design:type", String)
], MigrationEntity.prototype, "sourceProvider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], MigrationEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'steps_completed', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MigrationEntity.prototype, "stepsCompleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contacts_imported', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MigrationEntity.prototype, "contactsImported", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'templates_imported', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MigrationEntity.prototype, "templatesImported", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'messages_imported', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MigrationEntity.prototype, "messagesImported", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'test_messages_sent', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MigrationEntity.prototype, "testMessagesSent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'notes', type: 'text', nullable: true }),
    __metadata("design:type", String)
], MigrationEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], MigrationEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], MigrationEntity.prototype, "updatedAt", void 0);
exports.MigrationEntity = MigrationEntity = __decorate([
    (0, typeorm_1.Entity)('account_migrations')
], MigrationEntity);
//# sourceMappingURL=migration.entity.js.map