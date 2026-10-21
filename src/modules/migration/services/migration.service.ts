import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MigrationEntity } from '../entities/migration.entity';

export interface StartMigrationDto {
  accountId: string;
  sourcePhoneNumber: string;
  sourceProvider?: string;
}

// Step bit flags
export const MIGRATION_STEPS = {
  CONTACTS: 1,
  TEMPLATES: 2,
  CHAT_HISTORY: 4,
  TEST_TRAFFIC: 8,
  CUTOVER: 16,
};

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectRepository(MigrationEntity)
    private readonly migrationRepo: Repository<MigrationEntity>,
  ) {}

  async findAll(accountId?: string): Promise<MigrationEntity[]> {
    const where = accountId ? { accountId } : {};
    return this.migrationRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<MigrationEntity> {
    const m = await this.migrationRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException(`Migration ${id} not found`);
    return m;
  }

  async start(dto: StartMigrationDto): Promise<MigrationEntity> {
    const migration = this.migrationRepo.create({ ...dto, status: 'pending', stepsCompleted: 0 });
    const saved = await this.migrationRepo.save(migration);
    this.logger.log(`[Migration] Started migration for account ${dto.accountId} from ${dto.sourcePhoneNumber}`);
    return saved;
  }

  async completeStep(id: string, step: keyof typeof MIGRATION_STEPS, data?: Partial<MigrationEntity>): Promise<MigrationEntity> {
    const migration = await this.findOne(id);
    const stepBit = MIGRATION_STEPS[step];
    const newSteps = migration.stepsCompleted | stepBit;

    // Determine new status
    const allSteps = Object.values(MIGRATION_STEPS).reduce((a, b) => a | b, 0);
    const newStatus = newSteps === allSteps ? 'completed' : 'in_progress';

    await this.migrationRepo.update(id, {
      stepsCompleted: newSteps,
      status: newStatus,
      ...data,
    });

    return this.findOne(id);
  }

  async verifyTraffic(id: string, messagesSent: number): Promise<MigrationEntity> {
    await this.migrationRepo.update(id, {
      testMessagesSent: messagesSent,
      status: 'verified',
    });
    return this.completeStep(id, 'TEST_TRAFFIC', { testMessagesSent: messagesSent });
  }

  async cutover(id: string): Promise<MigrationEntity> {
    return this.completeStep(id, 'CUTOVER');
  }

  async getProgress(id: string): Promise<{ steps: Record<string, boolean>; percentComplete: number }> {
    const migration = await this.findOne(id);
    const steps = {
      contacts: !!(migration.stepsCompleted & MIGRATION_STEPS.CONTACTS),
      templates: !!(migration.stepsCompleted & MIGRATION_STEPS.TEMPLATES),
      chatHistory: !!(migration.stepsCompleted & MIGRATION_STEPS.CHAT_HISTORY),
      testTraffic: !!(migration.stepsCompleted & MIGRATION_STEPS.TEST_TRAFFIC),
      cutover: !!(migration.stepsCompleted & MIGRATION_STEPS.CUTOVER),
    };
    const completed = Object.values(steps).filter(Boolean).length;
    return { steps, percentComplete: Math.round((completed / 5) * 100) };
  }
}
