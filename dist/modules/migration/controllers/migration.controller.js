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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationController = void 0;
const common_1 = require("@nestjs/common");
const migration_service_1 = require("../services/migration.service");
let MigrationController = class MigrationController {
    constructor(migrationService) {
        this.migrationService = migrationService;
    }
    findAll(accountId) {
        return this.migrationService.findAll(accountId);
    }
    findOne(id) {
        return this.migrationService.findOne(id);
    }
    getProgress(id) {
        return this.migrationService.getProgress(id);
    }
    start(dto) {
        return this.migrationService.start(dto);
    }
    completeStep(id, step, data) {
        return this.migrationService.completeStep(id, step.toUpperCase(), data);
    }
    verifyTraffic(id, messagesSent) {
        return this.migrationService.verifyTraffic(id, messagesSent);
    }
    cutover(id) {
        return this.migrationService.cutover(id);
    }
};
exports.MigrationController = MigrationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MigrationController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MigrationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/progress'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MigrationController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MigrationController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/step/:step'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('step')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MigrationController.prototype, "completeStep", null);
__decorate([
    (0, common_1.Post)(':id/verify-traffic'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('messagesSent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], MigrationController.prototype, "verifyTraffic", null);
__decorate([
    (0, common_1.Post)(':id/cutover'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MigrationController.prototype, "cutover", null);
exports.MigrationController = MigrationController = __decorate([
    (0, common_1.Controller)('migration'),
    __metadata("design:paramtypes", [migration_service_1.MigrationService])
], MigrationController);
//# sourceMappingURL=migration.controller.js.map