// ─────────────────────────────────────────────────────────────────────────────
//  modules/orchestration/services/noop-orchestrator.service.ts
//  No-op orchestrator for monolithic / non-swarm deployments.
//  Allows app to run smoothly without requiring Docker Swarm or Coolify.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import {
  IContainerOrchestrator,
  ContainerProvisionOptions,
  ContainerInstance,
  ContainerScaleOptions,
} from '../interfaces/container-orchestrator.interface';

@Injectable()
export class NoopOrchestratorService implements IContainerOrchestrator {
  private readonly logger = new Logger(NoopOrchestratorService.name);

  constructor() {
    this.logger.log('ℹ️ Container orchestration is set to NONE (standalone / monolithic mode)');
  }

  async provision(opts: ContainerProvisionOptions): Promise<ContainerInstance> {
    this.logger.log(`[Noop] Container provision simulated for account ${opts.accountId}`);
    return {
      serviceId: `standalone-${opts.accountId.slice(0, 8)}`,
      accountId: opts.accountId,
      status: 'running',
      replicas: { desired: 1, running: 1 },
      createdAt: new Date(),
      healthState: 'healthy',
      region: opts.region || 'local',
      logs: 'Running in single-container embedded mode',
    };
  }

  async destroy(serviceId: string): Promise<void> {
    this.logger.log(`[Noop] Container destroy simulated for service ${serviceId}`);
  }

  async restart(serviceId: string): Promise<void> {
    this.logger.log(`[Noop] Container restart simulated for service ${serviceId}`);
  }

  async getHealth(serviceId: string): Promise<ContainerInstance> {
    return {
      serviceId,
      accountId: 'standalone',
      status: 'running',
      replicas: { desired: 1, running: 1 },
      createdAt: new Date(),
      healthState: 'healthy',
      region: 'local',
      logs: 'Standalone mode active',
    };
  }

  async listAll(): Promise<ContainerInstance[]> {
    return [];
  }

  async scale(opts: ContainerScaleOptions): Promise<void> {
    this.logger.log(`[Noop] Container scale simulated for ${opts.serviceId} to ${opts.replicas}`);
  }
}
