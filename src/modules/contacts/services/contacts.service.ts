import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactGroupEntity } from '../entities/contact-group.entity';
import { ContactGroupMemberEntity } from '../entities/contact-group-member.entity';

export interface CreateGroupDto {
  accountId: string;
  name: string;
  description?: string;
  tags?: string[];
}

export interface ImportMemberDto {
  phoneNumber: string;
  name?: string;
  city?: string;
  language?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectRepository(ContactGroupEntity)
    private readonly groupRepo: Repository<ContactGroupEntity>,
    @InjectRepository(ContactGroupMemberEntity)
    private readonly memberRepo: Repository<ContactGroupMemberEntity>,
  ) {}

  async findAllGroups(accountId?: string): Promise<ContactGroupEntity[]> {
    const where = accountId ? { accountId } : {};
    return this.groupRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findGroup(id: string): Promise<ContactGroupEntity> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Contact group ${id} not found`);
    return group;
  }

  async createGroup(dto: CreateGroupDto): Promise<ContactGroupEntity> {
    const group = this.groupRepo.create({
      ...dto,
      tags: JSON.stringify(dto.tags ?? []),
    });
    const saved = await this.groupRepo.save(group);
    this.logger.log(`[Contacts] Created group "${saved.name}" (${saved.id})`);
    return saved;
  }

  async deleteGroup(id: string): Promise<{ success: boolean }> {
    await this.memberRepo.delete({ groupId: id });
    await this.groupRepo.delete(id);
    return { success: true };
  }

  async getMembers(groupId: string, search?: string): Promise<ContactGroupMemberEntity[]> {
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

  async importMembers(groupId: string, members: ImportMemberDto[]): Promise<{ imported: number; skipped: number }> {
    const existing = await this.memberRepo.find({ where: { groupId } });
    const existingNums = new Set(existing.map(m => m.phoneNumber));

    let imported = 0;
    let skipped = 0;

    const toSave: ContactGroupMemberEntity[] = [];
    for (const m of members) {
      if (existingNums.has(m.phoneNumber)) { skipped++; continue; }
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

    if (toSave.length > 0) await this.memberRepo.save(toSave);

    const total = existing.length + imported;
    await this.groupRepo.update(groupId, { memberCount: total });
    return { imported, skipped };
  }

  async removeMember(groupId: string, phoneNumber: string): Promise<{ success: boolean }> {
    await this.memberRepo.delete({ groupId, phoneNumber });
    const count = await this.memberRepo.count({ where: { groupId } });
    await this.groupRepo.update(groupId, { memberCount: count });
    return { success: true };
  }
}
