import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OptOutEntity } from '../entities/opt-out.entity';

@Injectable()
export class OptOutService {
  private readonly logger = new Logger(OptOutService.name);

  constructor(
    @InjectRepository(OptOutEntity)
    private readonly optOutRepo: Repository<OptOutEntity>,
  ) {}

  async findAll(accountId?: string): Promise<OptOutEntity[]> {
    const where = accountId ? { accountId } : {};
    return this.optOutRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async isOptedOut(accountId: string, phoneNumber: string): Promise<boolean> {
    const count = await this.optOutRepo.count({ where: { accountId, phoneNumber } });
    return count > 0;
  }

  async optOut(accountId: string, phoneNumber: string, name?: string, reason?: string, source = 'manual'): Promise<OptOutEntity> {
    const existing = await this.optOutRepo.findOne({ where: { accountId, phoneNumber } });
    if (existing) return existing;

    const record = this.optOutRepo.create({ accountId, phoneNumber, name, reason, source });
    const saved = await this.optOutRepo.save(record);
    this.logger.log(`[OptOut] ${phoneNumber} opted out from account ${accountId}`);
    return saved;
  }

  async optIn(accountId: string, phoneNumber: string): Promise<{ success: boolean }> {
    await this.optOutRepo.delete({ accountId, phoneNumber });
    this.logger.log(`[OptOut] ${phoneNumber} re-opted in for account ${accountId}`);
    return { success: true };
  }

  async bulkImport(accountId: string, numbers: { phoneNumber: string; name?: string }[]): Promise<{ imported: number }> {
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

  /** Filter a list of phone numbers, removing opted-out ones */
  async filterOptedOut(accountId: string, phoneNumbers: string[]): Promise<string[]> {
    const optedOut = await this.optOutRepo.find({ where: { accountId } });
    const optedOutSet = new Set(optedOut.map(o => o.phoneNumber));
    return phoneNumbers.filter(p => !optedOutSet.has(p));
  }
}
