import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateEntity, TemplateCategory } from '../entities/template.entity';

export interface CreateTemplateDto {
  accountId: string;
  name: string;
  category?: TemplateCategory;
  language?: string;
  body: string;
  header?: string;
  footer?: string;
  buttons?: any[];
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(TemplateEntity)
    private readonly templateRepo: Repository<TemplateEntity>,
  ) {}

  async findAll(accountId?: string): Promise<TemplateEntity[]> {
    const where = accountId ? { accountId } : {};
    return this.templateRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<TemplateEntity> {
    const t = await this.templateRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Template ${id} not found`);
    return t;
  }

  async create(dto: CreateTemplateDto): Promise<TemplateEntity> {
    const template = this.templateRepo.create({
      ...dto,
      buttons: JSON.stringify(dto.buttons ?? []),
      status: 'draft',
    });
    const saved = await this.templateRepo.save(template);
    this.logger.log(`[Templates] Created template "${saved.name}" (${saved.id})`);
    return saved;
  }

  async update(id: string, dto: Partial<CreateTemplateDto>): Promise<TemplateEntity> {
    const existing = await this.findOne(id);
    const updated = {
      ...existing,
      ...dto,
      buttons: dto.buttons ? JSON.stringify(dto.buttons) : existing.buttons,
    };
    await this.templateRepo.save(updated);
    return this.findOne(id);
  }

  async submit(id: string): Promise<TemplateEntity> {
    // In production this would call Meta's Graph API to submit the template
    // For now we simulate the submission flow
    await this.templateRepo.update(id, {
      status: 'pending',
      submittedAt: new Date(),
    });
    this.logger.log(`[Templates] Submitted template ${id} for Meta review (simulated)`);
    return this.findOne(id);
  }

  async approve(id: string, metaTemplateId?: string): Promise<TemplateEntity> {
    await this.templateRepo.update(id, {
      status: 'approved',
      approvedAt: new Date(),
      metaTemplateId,
    });
    return this.findOne(id);
  }

  async reject(id: string, reason: string): Promise<TemplateEntity> {
    await this.templateRepo.update(id, {
      status: 'rejected',
      rejectionReason: reason,
    });
    return this.findOne(id);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await this.templateRepo.delete(id);
    return { success: true };
  }
}
