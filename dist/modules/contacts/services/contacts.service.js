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
var ContactsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const contact_group_entity_1 = require("../entities/contact-group.entity");
const contact_group_member_entity_1 = require("../entities/contact-group-member.entity");
let ContactsService = ContactsService_1 = class ContactsService {
    constructor(groupRepo, memberRepo) {
        this.groupRepo = groupRepo;
        this.memberRepo = memberRepo;
        this.logger = new common_1.Logger(ContactsService_1.name);
    }
    async findAllGroups(accountId) {
        const where = accountId ? { accountId } : {};
        return this.groupRepo.find({ where, order: { createdAt: 'DESC' } });
    }
    async findGroup(id) {
        const group = await this.groupRepo.findOne({ where: { id } });
        if (!group)
            throw new common_1.NotFoundException(`Contact group ${id} not found`);
        return group;
    }
    async createGroup(dto) {
        const group = this.groupRepo.create({
            ...dto,
            tags: JSON.stringify(dto.tags ?? []),
        });
        const saved = await this.groupRepo.save(group);
        this.logger.log(`[Contacts] Created group "${saved.name}" (${saved.id})`);
        return saved;
    }
    async deleteGroup(id) {
        await this.memberRepo.delete({ groupId: id });
        await this.groupRepo.delete(id);
        return { success: true };
    }
    async getMembers(groupId, search) {
        const qb = this.memberRepo
            .createQueryBuilder('m')
            .where('m.groupId = :groupId', { groupId });
        if (search?.trim()) {
            qb.andWhere('(m.name LIKE :s OR m.phoneNumber LIKE :s OR m.city LIKE :s)', {
                s: `%${search.trim()}%`,
            });
        }
        return qb.orderBy('m.name', 'ASC').getMany();
    }
    async importMembers(groupId, members) {
        const existing = await this.memberRepo.find({ where: { groupId } });
        const existingNums = new Set(existing.map(m => m.phoneNumber));
        let imported = 0;
        let skipped = 0;
        const toSave = [];
        for (const m of members) {
            if (existingNums.has(m.phoneNumber)) {
                skipped++;
                continue;
            }
            toSave.push(this.memberRepo.create({
                groupId,
                phoneNumber: m.phoneNumber,
                name: m.name,
                city: m.city,
                language: m.language,
                tags: JSON.stringify(m.tags ?? []),
                customFields: JSON.stringify(m.customFields ?? {}),
            }));
            imported++;
        }
        if (toSave.length > 0)
            await this.memberRepo.save(toSave);
        const total = existing.length + imported;
        await this.groupRepo.update(groupId, { memberCount: total });
        return { imported, skipped };
    }
    async removeMember(groupId, phoneNumber) {
        await this.memberRepo.delete({ groupId, phoneNumber });
        const count = await this.memberRepo.count({ where: { groupId } });
        await this.groupRepo.update(groupId, { memberCount: count });
        return { success: true };
    }
};
exports.ContactsService = ContactsService;
exports.ContactsService = ContactsService = ContactsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(contact_group_entity_1.ContactGroupEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(contact_group_member_entity_1.ContactGroupMemberEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ContactsService);
//# sourceMappingURL=contacts.service.js.map