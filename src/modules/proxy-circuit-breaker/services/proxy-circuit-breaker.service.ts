// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-circuit-breaker/services/proxy-circuit-breaker.service.ts
//  Phase 2: Core Circuit Breaker State Machine
//
//  States:
//    CLOSED   → Proxy is healthy; traffic flows normally
//    OPEN     → Proxy failed threshold times; queue is PAUSED immediately
//    HALF_OPEN → Reset timer expired; probe one test request to recover
//
//  Redis key schema:
//    cb:proxy:<proxyId>:state         → 'CLOSED' | 'OPEN' | 'HALF_OPEN'
//    cb:proxy:<proxyId>:failures      → integer counter (INCR / DEL)
//    cb:proxy:<proxyId>:opened_at     → epoch ms timestamp
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProxyCircuitBreakerEntity, CircuitState } from '../entities/proxy-circuit-breaker.entity';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';
import { SmartProxyRotatorService } from './smart-proxy-rotator.service';
import { InjectRepository as InjectRepo } from '@nestjs/typeorm';

@Injectable()
export class ProxyCircuitBreakerService {
  private readonly logger = new Logger(ProxyCircuitBreakerService.name);

  // Redis key builders
  private key = (proxyId: string, suffix: string) =>
    `${this.prefix}${proxyId}:${suffix}`;

  private readonly prefix: string;
  private readonly threshold: number;
  private readonly resetMs: number;
  private readonly halfOpenMax: number;

  constructor(
    @InjectRepository(ProxyCircuitBreakerEntity)
    private readonly cbRepo: Repository<ProxyCircuitBreakerEntity>,
    @InjectRepository(ProxyPoolEntity)
    private readonly proxyRepo: Repository<ProxyPoolEntity>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    @InjectQueue('proxy-health-check')
    private readonly healthQueue: Queue,
    private readonly config: ConfigService,
    private readonly proxyRotator?: SmartProxyRotatorService,
  ) {
    this.prefix = config.get<string>(
      'PROXY_CIRCUIT_BREAKER_REDIS_KEY_PREFIX',
      'cb:proxy:',
    );
    this.threshold = config.get<number>('PROXY_CIRCUIT_BREAKER_THRESHOLD', 3);
    this.resetMs = config.get<number>('PROXY_CIRCUIT_BREAKER_RESET_MS', 60000);
    this.halfOpenMax = config.get<number>('PROXY_CIRCUIT_BREAKER_HALF_OPEN_MAX', 1);
  }

  // ── Get current state from Redis ─────────────────────────────────────────
  async getState(proxyId: string): Promise<CircuitState> {
    const state = await this.redis.get(this.key(proxyId, 'state'));
    return (state as CircuitState) ?? 'CLOSED';
  }

  // ── Record a FAILURE for a proxy ─────────────────────────────────────────
  async recordFailure(proxyId: string, accountId?: string): Promise<void> {
    const stateKey = this.key(proxyId, 'state');
    const failKey = this.key(proxyId, 'failures');

    const currentState = await this.getState(proxyId);

    if (currentState === 'OPEN') {
      this.logger.debug(`[CB] Proxy ${proxyId} already OPEN — skipping duplicate failure`);
      return;
    }

    // Atomically increment failure counter
    const failures = await this.redis.incr(failKey);
    // Set TTL on failure counter = reset window (auto-cleanup)
    await this.redis.pexpire(failKey, this.resetMs * 2);

    this.logger.warn(
      `[CB] Proxy ${proxyId} failure ${failures}/${this.threshold} (state: ${currentState})`,
    );

    if (failures >= this.threshold) {
      await this.openCircuit(proxyId, accountId);
    }
  }

  // ── Record a SUCCESS (probe passed in HALF_OPEN) ──────────────────────────
  async recordSuccess(proxyId: string): Promise<void> {
    const currentState = await this.getState(proxyId);

    if (currentState === 'HALF_OPEN') {
      await this.closeCircuit(proxyId);
    } else if (currentState === 'CLOSED') {
      // Reset failure counter on success
      await this.redis.del(this.key(proxyId, 'failures'));
    }
  }

  // ── OPEN circuit: pause BullMQ queue, mark proxy unhealthy ───────────────
  async openCircuit(proxyId: string, accountId?: string): Promise<void> {
    const stateKey = this.key(proxyId, 'state');
    const openedAtKey = this.key(proxyId, 'opened_at');

    // Set state in Redis
    await this.redis.set(stateKey, 'OPEN', 'PX', this.resetMs);
    await this.redis.set(openedAtKey, Date.now().toString(), 'PX', this.resetMs);

    this.logger.error(
      `[CB] 🔴 Circuit OPENED for proxy ${proxyId}. Queue PAUSED. Reset in ${this.resetMs}ms`,
    );

    // ── CRITICAL: Pause the account's BullMQ message queue immediately
    if (accountId) {
      await this.pauseAccountQueue(accountId, proxyId);
    }

    // Mark proxy unhealthy in DB
    await this.proxyRepo.update(proxyId, { isHealthy: false });

    // Pillar 4: Autonomous Subnet-Isolated Proxy Rotation for affected account
    if (accountId && this.proxyRotator) {
      try {
        const rotatedProxy = await this.proxyRotator.rotateToCleanSubnet(accountId, proxyId);
        this.logger.log(`🟢 [Self-Healing Swarm] Account ${accountId} auto-rotated to clean subnet proxy: ${rotatedProxy.host}:${rotatedProxy.port}`);
      } catch (rotErr: any) {
        this.logger.warn(`⚠️ [Self-Healing Swarm] Failed to auto-rotate proxy for ${accountId}: ${rotErr.message}`);
      }
    }

    // Persist circuit state snapshot to PostgreSQL
    await this.upsertCbState(proxyId, accountId, 'OPEN');

    // Schedule HALF_OPEN transition after reset window
    await this.healthQueue.add(
      'circuit-reset',
      { proxyId, accountId },
      { delay: this.resetMs },
    );
  }

  // ── HALF_OPEN circuit: allow ONE probe request ────────────────────────────
  async halfOpenCircuit(proxyId: string, accountId?: string): Promise<void> {
    const stateKey = this.key(proxyId, 'state');
    await this.redis.set(stateKey, 'HALF_OPEN', 'EX', 60); // 60s probe window

    this.logger.warn(`[CB] 🟡 Circuit HALF_OPEN for proxy ${proxyId}. Probing…`);
    await this.upsertCbState(proxyId, accountId, 'HALF_OPEN');
  }

  // ── CLOSE circuit: resume BullMQ queue ───────────────────────────────────
  async closeCircuit(proxyId: string, accountId?: string): Promise<void> {
    const stateKey = this.key(proxyId, 'state');
    const failKey = this.key(proxyId, 'failures');

    await this.redis.del(stateKey, failKey);

    this.logger.log(`[CB] 🟢 Circuit CLOSED for proxy ${proxyId}. Queue RESUMED.`);

    // Mark proxy healthy in DB
    await this.proxyRepo.update(proxyId, { isHealthy: true });

    // Resume the account's BullMQ message queue
    if (accountId) {
      await this.resumeAccountQueue(accountId);
    }

    await this.upsertCbState(proxyId, accountId, 'CLOSED');
  }

  // ── Pause account's outbound message queue ────────────────────────────────
  private async pauseAccountQueue(accountId: string, proxyId: string): Promise<void> {
    try {
      // The queue name follows the pattern: wa:outbound:<accountId>
      const queueName = `wa:outbound:${accountId}`;
      const queueKey = `bull:${queueName}`;

      // Use BullMQ internal pause mechanism via Redis
      await this.redis.set(`${queueKey}:paused`, '1');

      // Publish pause event via Pub/Sub for multi-node awareness
      await this.redis.publish(
        'wa:queue:control',
        JSON.stringify({ action: 'pause', accountId, queueName, reason: `proxy_cb_open:${proxyId}` }),
      );

      this.logger.warn(`[CB] ⏸  Queue PAUSED: ${queueName} (proxy ${proxyId} OPEN)`);
    } catch (err) {
      this.logger.error(`[CB] Failed to pause queue for account ${accountId}: ${err.message}`);
    }
  }

  // ── Resume account's outbound message queue ───────────────────────────────
  private async resumeAccountQueue(accountId: string): Promise<void> {
    try {
      const queueName = `wa:outbound:${accountId}`;
      const queueKey = `bull:${queueName}`;

      await this.redis.del(`${queueKey}:paused`);

      // Publish resume event
      await this.redis.publish(
        'wa:queue:control',
        JSON.stringify({ action: 'resume', accountId, queueName }),
      );

      this.logger.log(`[CB] ▶️  Queue RESUMED: ${queueName}`);
    } catch (err) {
      this.logger.error(`[CB] Failed to resume queue for account ${accountId}: ${err.message}`);
    }
  }

  // ── Upsert circuit state snapshot to PostgreSQL ───────────────────────────
  private async upsertCbState(
    proxyId: string,
    accountId: string | undefined,
    state: CircuitState,
  ): Promise<void> {
    const existing = await this.cbRepo.findOne({ where: { proxyId } });
    if (existing) {
      await this.cbRepo.update(existing.id, {
        state,
        accountId,
        ...(state === 'OPEN' ? { openedAt: new Date(), lastFailureAt: new Date() } : {}),
        ...(state === 'CLOSED' ? { resetAt: new Date(), failureCount: 0 } : {}),
      });
    } else {
      await this.cbRepo.save(
        this.cbRepo.create({
          proxyId,
          accountId,
          state,
          failureCount: state === 'OPEN' ? this.threshold : 0,
          openedAt: state === 'OPEN' ? new Date() : undefined,
        }),
      );
    }
  }

  /** Get full circuit breaker status for all proxies */
  async getAllCircuitStates(): Promise<Array<{ proxyId: string; state: CircuitState; failures: number }>> {
    const records = await this.cbRepo.find();
    return Promise.all(
      records.map(async (r) => ({
        proxyId: r.proxyId,
        state: await this.getState(r.proxyId),
        failures: parseInt(
          (await this.redis.get(this.key(r.proxyId, 'failures'))) ?? '0',
          10,
        ),
      })),
    );
  }
}
