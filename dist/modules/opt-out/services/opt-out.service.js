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
var OptOutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptOutService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const opt_out_entity_1 = require("../entities/opt-out.entity");
let OptOutService = OptOutService_1 = class OptOutService {
    constructor(optOutRepo) {
        this.optOutRepo = optOutRepo;
        this.logger = new common_1.Logger(OptOutService_1.name);
    }
    async findAll(accountId) {
        const where = accountId ? { accountId } : {};
        return this.optOutRepo.find({ where, order: { createdAt: 'DESC' } });
    }
    async isOptedOut(accountId, phoneNumber) {
        const count = await this.optOutRepo.count({ where: { accountId, phoneNumber } });
        return count > 0;
    }
    async optOut(accountId, phoneNumber, name, reason, source = 'manual') {
        const existing = await this.optOutRepo.findOne({ where: { accountId, phoneNumber } });
        if (existing)
            return existing;
        const record = this.optOutRepo.create({ accountId, phoneNumber, name, reason, source });
        const saved = await this.optOutRepo.save(record);
        this.logger.log(`[OptOut] ${phoneNumber} opted out from account ${accountId}`);
        return saved;
    }
    async optIn(accountId, phoneNumber) {
        await this.optOutRepo.delete({ accountId, phoneNumber });
        this.logger.log(`[OptOut] ${phoneNumber} re-opted in for account ${accountId}`);
        return { success: true };
    }
    async bulkImport(accountId, numbers) {
        let imported = 0;
        for (const item of numbers) {
            const exists = await this.optOutRepo.findOne({ where: { accountId, phoneNumber: item.phoneNumber } });
            if (!exists) {
                await this.optOutRepo.save(this.optOutRepo.create({ accountId, phoneNumber: item.phoneNumber, name: item.name, source: 'import' }));
                imported++;
            }
        }
        return { imported };
    }
    async filterOptedOut(accountId, phoneNumbers) {
        const optedOut = await this.optOutRepo.find({ where: { accountId } });
        const optedOutSet = new Set(optedOut.map(o => o.phoneNumber));
        return phoneNumbers.filter(p => !optedOutSet.has(p));
    }
};
exports.OptOutService = OptOutService;
exports.OptOutService = OptOutService = OptOutService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(opt_out_entity_1.OptOutEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], OptOutService);
//# sourceMappingURL=opt-out.service.js.map