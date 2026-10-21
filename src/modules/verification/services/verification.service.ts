import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationEntity, VerificationStatus } from '../entities/verification.entity';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(VerificationEntity)
    private readonly verificationRepo: Repository<VerificationEntity>,
  ) {}

  async getOrCreate(accountId: string): Promise<VerificationEntity> {
    let record = await this.verificationRepo.findOne({ where: { accountId } });
    if (!record) {
      record = await this.verificationRepo.save(
        this.verificationRepo.create({ accountId, status: 'not_started' }),
      );
    }
    return record;
  }

  async findAll(): Promise<VerificationEntity[]> {
    return this.verificationRepo.find({ order: { createdAt: 'DESC' } });
  }

  async update(accountId: string, data: any): Promise<VerificationEntity> {
    const record = await this.getOrCreate(accountId);

    // Auto-set status based on fields
    let status: VerificationStatus = record.status;
    if (data.greenTick !== undefined) {
      if (data.greenTick) {
        status = 'verified';
        data.verifiedAt = new Date();
      } else {
        status = 'pending';
        data.verifiedAt = null;
      }
    } else if (data.docsSubmitted) {
      status = 'pending';
    } else if (data.metaBusinessManagerLinked) {
      status = 'applied';
    }

    const payload: Partial<VerificationEntity> = { status };
    if (data.businessName !== undefined) payload.businessName = data.businessName;
    if (data.businessId !== undefined) payload.businessId = data.businessId;
    if (data.greenTick !== undefined) payload.greenTick = Boolean(data.greenTick);
    if (data.phoneVerified !== undefined) payload.phoneVerified = Boolean(data.phoneVerified);
    if (data.docsSubmitted !== undefined) payload.docsSubmitted = Boolean(data.docsSubmitted);
    if (data.metaBusinessManagerLinked !== undefined) payload.metaBusinessManagerLinked = Boolean(data.metaBusinessManagerLinked);
    if (data.verifiedAt !== undefined) payload.verifiedAt = data.verifiedAt;
    if (data.notes !== undefined) payload.notes = data.notes;

    await this.verificationRepo.update(record.id, payload);
    return this.getOrCreate(accountId);
  }

  async getChecklist(accountId: string): Promise<{
    status: VerificationStatus;
    greenTick: boolean;
    steps: { label: string; completed: boolean }[];
    percentComplete: number;
  }> {
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
}
