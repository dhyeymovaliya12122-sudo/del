// ─────────────────────────────────────────────────────────────────────────────
//  modules/orchestration/workers/auto-heal.worker.ts
//  Phase 3 — Part C: Auto-Healing Cron Worker
//
//  Runs every 60 seconds:
//    1. Loads all RUNNING container instances from DB
//    2. Queries orchestrator for live health
//    3. Detects stalled/unhealthy containers:
//       - Docker task state = failed | rejected
//       - running_replicas = 0 but desired_replicas > 0
//       - No heartbeat in DB for > HEAL_STALL_THRESHOLD_MS
//    4. Issues restart via orchestrator API
//    5. Emits Socket.io event to tenant dashboard
//    6. Writes ContainerHealLog audit entry
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
import { ConfigService } from '@nestjs/config';
import { ContainerInstanceEntity } from '../entities/container-instance.entity';
import { ContainerHealLogEntity } from '../entities/container-heal-log.entity';
import {
  CONTAINER_ORCHESTRATOR_TOKEN,
  IContainerOrchestrator,
} from '../interfaces/container-orchestrator.interface';
import { RealtimeEventService } from '../../realtime-gateway/services/realtime-event.service';

@Injectable()
export class AutoHealWorker {
  private readonly logger = new Logger(AutoHealWorker.name);
  private readonly stallThresholdMs: number;
  private isHealing = false;  // Prevent concurrent heal runs

  constructor(
    @InjectRepository(ContainerInstanceEntity)
    private readonly instanceRepo: Repository<ContainerInstanceEntity>,
    @InjectRepository(ContainerHealLogEntity)
    private readonly healLogRepo: Repository<ContainerHealLogEntity>,
    @Inject(CONTAINER_ORCHESTRATOR_TOKEN)
    private readonly orchestrator: IContainerOrchestrator,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly realtimeService: RealtimeEventService,
    private readonly config: ConfigService,
  ) {
    this.stallThresholdMs = config.get<number>('HEAL_STALL_THRESHOLD_MS', 90_000);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async runAutoHeal(): Promise<void> {
    const orchestratorType = (
      this.config.get<string>('ORCHESTRATOR_TYPE') ||
      process.env.ORCHESTRATOR_TYPE ||
      'none'
    ).toLowerCase();

    // In standalone / local mode, in-process Baileys handles its own reconnects
    if (orchestratorType === 'none' || orchestratorType === 'local') {
      return;
    }

    if (this.isHealing) {
      this.logger.debug('[AutoHeal] Previous heal cycle still running — skipping');
      return;
    }

    this.isHealing = true;
    this.logger.debug('[AutoHeal] 🔍 Starting health scan…');

    try {
      // Load all instances that should be running
      const instances = await this.instanceRepo.find({
        where: { status: In(['starting', 'running']) },
      });

      if (instances.length === 0) {
        this.logger.debug('[AutoHeal] No active instances to monitor');
        return;
      }

      this.logger.debug(`[AutoHeal] Checking ${instances.length} instance(s)…`);

      const healPromises = instances.map((instance) =>
        this.checkAndHealInstance(instance),
      );

      const results = await Promise.allSettled(healPromises);
      const healed = results.filter(
        (r) => r.status === 'fulfilled' && (r as any).value === true,
      ).length;

      if (healed > 0) {
        this.logger.warn(`[AutoHeal] 🩹 Healed ${healed}/${instances.length} instance(s)`);
      } else {
        this.logger.debug(`[AutoHeal] ✅ All ${instances.length} instance(s) healthy`);
      }
    } catch (err) {
      this.logger.error(`[AutoHeal] Scan error: ${err.message}`);
    } finally {
      this.isHealing = false;
    }
  }

  // ── Check a single instance and heal if needed ───────────────────────────
  private async checkAndHealInstance(instance: ContainerInstanceEntity): Promise<boolean> {
    let liveHealth;

    try {
      liveHealth = await this.orchestrator.getHealth(instance.serviceId);
    } catch (err) {
      this.logger.warn(
        `[AutoHeal] Could not fetch health for ${instance.serviceId}: ${err.message}`,
      );
      // If we can't even query the container, treat it as unhealthy
      liveHealth = {
        ...instance,
        status: 'failed' as const,
        healthState: 'unhealthy' as const,
        replicas: { desired: 1, running: 0 },
      };
    }

    // Update DB with latest health
    await this.instanceRepo.update(instance.id, {
      status: liveHealth.status,
      healthState: liveHealth.healthState,
      runningReplicas: liveHealth.replicas.running,
    });

    // ── Heal conditions ───────────────────────────────────────────────────
    const needsHeal =
      liveHealth.healthState === 'unhealthy' ||
      liveHealth.status === 'failed' ||
      (liveHealth.replicas.desired > 0 && liveHealth.replicas.running === 0);

    if (!needsHeal) return false;

    const healReason = liveHealth.status === 'failed'
      ? 'task_failed'
      : liveHealth.replicas.running === 0
        ? 'no_running_replicas'
        : 'unhealthy_state';

    this.logger.warn(
      `[AutoHeal] 🚨 Instance ${instance.serviceId} needs healing (reason: ${healReason})`,
    );

    return this.healInstance(instance, healReason, liveHealth.status);
  }

  // ── Heal: restart the container ──────────────────────────────────────────
  private async healInstance(
    instance: ContainerInstanceEntity,
    reason: string,
    previousState: string,
  ): Promise<boolean> {
    let success = false;
    let errorMessage: string | undefined;
    let actionTaken = 'force_restart';

    try {
      await this.orchestrator.restart(instance.serviceId);

      // Update instance record
      await this.instanceRepo.update(instance.id, {
        status: 'starting',
        healthState: 'unknown',
        healCount: instance.healCount + 1,
        lastHealedAt: new Date(),
      });

      success = true;
      this.logger.log(
        `[AutoHeal] ✅ Healed instance ${instance.serviceId} (account: ${instance.accountId})`,
      );

      // Notify tenant dashboard via Socket.io
      this.realtimeService.emitCircuitBreakerAlert(
        instance.tenantId,
        instance.accountId,
        instance.serviceId,
        `AUTO_HEALED:${reason}`,
      );
    } catch (err) {
      errorMessage = err.message;
      actionTaken = 'force_restart_failed';
      this.logger.error(
        `[AutoHeal] ❌ Failed to heal ${instance.serviceId}: ${err.message}`,
      );

      await this.instanceRepo.update(instance.id, { status: 'failed' });
    }

    // Write heal audit log
    await this.healLogRepo.save(
      this.healLogRepo.create({
        containerInstanceId: instance.id,
        accountId: instance.accountId,
        healReason: reason,
        previousState,
        actionTaken,
        success,
        errorMessage,
      }),
    );

    return success;
  }

  /** Manually trigger heal for a specific instance (called by controller) */
  async manualHeal(serviceId: string): Promise<boolean> {
    const instance = await this.instanceRepo.findOne({ where: { serviceId } });
    if (!instance) throw new Error(`Container instance ${serviceId} not found`);
    return this.healInstance(instance, 'manual_trigger', instance.status);
  }
}
