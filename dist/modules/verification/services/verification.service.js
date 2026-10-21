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
var VerificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const verification_entity_1 = require("../entities/verification.entity");
let VerificationService = VerificationService_1 = class VerificationService {
    constructor(verificationRepo) {
        this.verificationRepo = verificationRepo;
        this.logger = new common_1.Logger(VerificationService_1.name);
    }
    async getOrCreate(accountId) {
        let record = await this.verificationRepo.findOne({ where: { accountId } });
        if (!record) {
            record = await this.verificationRepo.save(this.verificationRepo.create({ accountId, status: 'not_started' }));
        }
        return record;
    }
    async findAll() {
        return this.verificationRepo.find({ order: { createdAt: 'DESC' } });
    }
    async update(accountId, data) {
        const record = await this.getOrCreate(accountId);
        let status = record.status;
        if (data.greenTick !== undefined) {
            if (data.greenTick) {
                status = 'verified';
                data.verifiedAt = new Date();
            }
            else {
                status = 'pending';
                data.verifiedAt = null;
            }
        }
        else if (data.docsSubmitted) {
            status = 'pending';
        }
        else if (data.metaBusinessManagerLinked) {
            status = 'applied';
        }
        const payload = { status };
        if (data.businessName !== undefined)
            payload.businessName = data.businessName;
        if (data.businessId !== undefined)
            payload.businessId = data.businessId;
        if (data.greenTick !== undefined)
            payload.greenTick = Boolean(data.greenTick);
        if (data.phoneVerified !== undefined)
            payload.phoneVerified = Boolean(data.phoneVerified);
        if (data.docsSubmitted !== undefined)
            payload.docsSubmitted = Boolean(data.docsSubmitted);
        if (data.metaBusinessManagerLinked !== undefined)
            payload.metaBusinessManagerLinked = Boolean(data.metaBusinessManagerLinked);
        if (data.verifiedAt !== undefined)
            payload.verifiedAt = data.verifiedAt;
        if (data.notes !== undefined)
            payload.notes = data.notes;
        await this.verificationRepo.update(record.id, payload);
        return this.getOrCreate(accountId);
    }
    async getChecklist(accountId) {
        const record = await this.getOrCreate(accountId);
        const steps = [
            { label: 'Phone number verified', completed: record.phoneVerified },
            { label: 'Meta Business Manager linked', completed: record.metaBusinessManagerLinked },
            { label: 'Business documents submitted', completed: record.docsSubmitted },
            { label: 'Green tick / verification approved', completed: record.greenTick },
        ];
        const completed = steps.filter(s => s.completed).length;
        return {
            status: record.status,
            greenTick: record.greenTick,
            steps,
            percentComplete: Math.round((completed / steps.length) * 100),
        };
    }
};
exports.VerificationService = VerificationService;
exports.VerificationService = VerificationService = VerificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(verification_entity_1.VerificationEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], VerificationService);
//# sourceMappingURL=verification.service.js.map