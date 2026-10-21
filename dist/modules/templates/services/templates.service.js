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
var TemplatesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const template_entity_1 = require("../entities/template.entity");
let TemplatesService = TemplatesService_1 = class TemplatesService {
    constructor(templateRepo) {
        this.templateRepo = templateRepo;
        this.logger = new common_1.Logger(TemplatesService_1.name);
    }
    async findAll(accountId) {
        const where = accountId ? { accountId } : {};
        return this.templateRepo.find({ where, order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const t = await this.templateRepo.findOne({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException(`Template ${id} not found`);
        return t;
    }
    async create(dto) {
        const template = this.templateRepo.create({
            ...dto,
            buttons: JSON.stringify(dto.buttons ?? []),
            status: 'draft',
        });
        const saved = await this.templateRepo.save(template);
        this.logger.log(`[Templates] Created template "${saved.name}" (${saved.id})`);
        return saved;
    }
    async update(id, dto) {
        const existing = await this.findOne(id);
        const updated = {
            ...existing,
            ...dto,
            buttons: dto.buttons ? JSON.stringify(dto.buttons) : existing.buttons,
        };
        await this.templateRepo.save(updated);
        return this.findOne(id);
    }
    async submit(id) {
        await this.templateRepo.update(id, {
            status: 'pending',
            submittedAt: new Date(),
        });
        this.logger.log(`[Templates] Submitted template ${id} for Meta review (simulated)`);
        return this.findOne(id);
    }
    async approve(id, metaTemplateId) {
        await this.templateRepo.update(id, {
            status: 'approved',
            approvedAt: new Date(),
            metaTemplateId,
        });
        return this.findOne(id);
    }
    async reject(id, reason) {
        await this.templateRepo.update(id, {
            status: 'rejected',
            rejectionReason: reason,
        });
        return this.findOne(id);
    }
    async delete(id) {
        await this.templateRepo.delete(id);
        return { success: true };
    }
};
exports.TemplatesService = TemplatesService;
exports.TemplatesService = TemplatesService = TemplatesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(template_entity_1.TemplateEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TemplatesService);
//# sourceMappingURL=templates.service.js.map