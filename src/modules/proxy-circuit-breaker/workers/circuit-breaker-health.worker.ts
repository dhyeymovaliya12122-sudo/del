// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-circuit-breaker/workers/circuit-breaker-health.worker.ts
//  Scheduler: enqueues periodic health-probe jobs for every active proxy.
//  Runs on an interval so the circuit breaker always has fresh health data.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';

@Injectable()
export class CircuitBreakerHealthWorker {
  private readonly logger = new Logger(CircuitBreakerHealthWorker.name);

  constructor(
    @InjectRepository(ProxyPoolEntity)
    private readonly proxyRepo: Repository<ProxyPoolEntity>,
    @InjectQueue('proxy-health-check')
    private readonly healthQueue: Queue,
  ) {}

  /**
   * Every 30 seconds: enqueue a health-probe job for every active proxy.
   * Jobs are de-duplicated by jobId to avoid queue pile-up.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async scheduleHealthProbes(): Promise<void> {
    const activeProxies = await this.proxyRepo.find({
      where: { isActive: true },
      select: ['id', 'label', 'assignedAccountId'],
    });

    if (activeProxies.length === 0) return;

    this.logger.debug(`[CB Health] Scheduling ${activeProxies.length} health probe(s)…`);

    await Promise.all(
      activeProxies.map((proxy) =>
        this.healthQueue.add(
          'health-probe',
          { proxyId: proxy.id, accountId: proxy.assignedAccountId },
          {
            jobId: `probe:${proxy.id}:${Math.floor(Date.now() / 30000)}`,  // de-duplicate per 30s window
            priority: 5,
            removeOnComplete: true,
            removeOnFail: false,
          },
        ),
      ),
    );
  }
}
