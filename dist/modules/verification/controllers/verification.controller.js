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
exports.VerificationController = void 0;
const common_1 = require("@nestjs/common");
const verification_service_1 = require("../services/verification.service");
let VerificationController = class VerificationController {
    constructor(verificationService) {
        this.verificationService = verificationService;
    }
    findAll() {
        return this.verificationService.findAll();
    }
    get(accountId) {
        return this.verificationService.getOrCreate(accountId);
    }
    getChecklist(accountId) {
        return this.verificationService.getChecklist(accountId);
    }
    update(accountId, data) {
        return this.verificationService.update(accountId, data);
    }
};
exports.VerificationController = VerificationController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VerificationController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':accountId'),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VerificationController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':accountId/checklist'),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VerificationController.prototype, "getChecklist", null);
__decorate([
    (0, common_1.Post)(':accountId'),
    __param(0, (0, common_1.Param)('accountId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], VerificationController.prototype, "update", null);
exports.VerificationController = VerificationController = __decorate([
    (0, common_1.Controller)('verification'),
    __metadata("design:paramtypes", [verification_service_1.VerificationService])
], VerificationController);
//# sourceMappingURL=verification.controller.js.map