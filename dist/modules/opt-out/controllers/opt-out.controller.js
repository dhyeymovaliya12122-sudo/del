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
exports.OptOutController = void 0;
const common_1 = require("@nestjs/common");
const opt_out_service_1 = require("../services/opt-out.service");
let OptOutController = class OptOutController {
    constructor(optOutService) {
        this.optOutService = optOutService;
    }
    findAll(accountId) {
        return this.optOutService.findAll(accountId);
    }
    optOut(accountId, phoneNumber, name, reason) {
        return this.optOutService.optOut(accountId, phoneNumber, name, reason);
    }
    optIn(accountId, phoneNumber) {
        return this.optOutService.optIn(accountId, phoneNumber);
    }
    bulkImport(accountId, numbers) {
        return this.optOutService.bulkImport(accountId, numbers);
    }
    checkOptOut(accountId, phoneNumber) {
        return this.optOutService.isOptedOut(accountId, phoneNumber);
    }
};
exports.OptOutController = OptOutController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OptOutController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)('accountId')),
    __param(1, (0, common_1.Body)('phoneNumber')),
    __param(2, (0, common_1.Body)('name')),
    __param(3, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], OptOutController.prototype, "optOut", null);
__decorate([
    (0, common_1.Delete)(':accountId/:phoneNumber'),
    __param(0, (0, common_1.Param)('accountId')),
    __param(1, (0, common_1.Param)('phoneNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OptOutController.prototype, "optIn", null);
__decorate([
    (0, common_1.Post)('bulk-import'),
    __param(0, (0, common_1.Body)('accountId')),
    __param(1, (0, common_1.Body)('numbers')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", void 0)
], OptOutController.prototype, "bulkImport", null);
__decorate([
    (0, common_1.Post)('check'),
    __param(0, (0, common_1.Body)('accountId')),
    __param(1, (0, common_1.Body)('phoneNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OptOutController.prototype, "checkOptOut", null);
exports.OptOutController = OptOutController = __decorate([
    (0, common_1.Controller)('opt-out'),
    __metadata("design:paramtypes", [opt_out_service_1.OptOutService])
], OptOutController);
//# sourceMappingURL=opt-out.controller.js.map