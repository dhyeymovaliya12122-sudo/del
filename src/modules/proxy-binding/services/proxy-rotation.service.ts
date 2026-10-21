// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-binding/services/proxy-rotation.service.ts
//  Swaps unhealthy proxy with a new healthy one for a given account.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ProxyPoolEntity } from '../entities/proxy-pool.entity';

@Injectable()
export class ProxyRotationService {
  private readonly logger = new Logger(ProxyRotationService.name);

  constructor(
    @InjectRepository(ProxyPoolEntity)
    private readonly proxyRepo: Repository<ProxyPoolEntity>,
  ) {}

  /**
   * Rotates the proxy for a given account.
   * Unlinks the current proxy and binds the next available healthy one.
   */
  async rotateForAccount(accountId: string): Promise<ProxyPoolEntity> {
    // Release current binding
    const current = await this.proxyRepo.findOne({
      where: { assignedAccountId: accountId },
    });

    if (current) {
      current.assignedAccountId = undefined;
      await this.proxyRepo.save(current);
      this.logger.log(`Releasing proxy [${current.label}] from account ${accountId}`);
    }

    // Find next available proxy (exclude the failed one)
    const next = await this.proxyRepo.findOne({
      where: {
        isActive: true,
        isHealthy: true,
        assignedAccountId: undefined,
        ...(current ? { id: Not(current.id) } : {}),
      },
      order: { lastHealthCheck: 'DESC' },
    });

    if (!next) {
      throw new NotFoundException(
        `No healthy replacement proxy available for account ${accountId}`,
      );
    }

    next.assignedAccountId = accountId;
    await this.proxyRepo.save(next);

    this.logger.log(`Rotated proxy → [${next.label}] for account ${accountId}`);
    return next;
  }
}
