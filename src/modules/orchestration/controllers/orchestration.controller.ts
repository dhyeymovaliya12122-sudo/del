// ─────────────────────────────────────────────────────────────────────────────
//  modules/orchestration/controllers/orchestration.controller.ts
//  Phase 3: REST API for container lifecycle management
// ─────────────────────────────────────────────────────────────────────────────
import {
  Controller, Post, Delete, Get, Param, Body,
  HttpCode, HttpStatus, Inject, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CONTAINER_ORCHESTRATOR_TOKEN,
  IContainerOrchestrator,
  ContainerProvisionOptions,
} from '../interfaces/container-orchestrator.interface';
import { ContainerInstanceEntity, ContainerStatus } from '../entities/container-instance.entity';
import { ContainerHealLogEntity } from '../entities/container-heal-log.entity';
import { AutoHealWorker } from '../workers/auto-heal.worker';
import { AccountsService } from '../../accounts/services/accounts.service';
import { SessionHydrationService } from '../../session-hydration/services/session-hydration.service';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/app-user.entity';

@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('orchestration')
export class OrchestrationController {
  private readonly logger = new Logger(OrchestrationController.name);

  constructor(
    @Inject(CONTAINER_ORCHESTRATOR_TOKEN)
    private readonly orchestrator: IContainerOrchestrator,
    @InjectRepository(ContainerInstanceEntity)
    private readonly instanceRepo: Repository<ContainerInstanceEntity>,
    @InjectRepository(ContainerHealLogEntity)
    private readonly healLogRepo: Repository<ContainerHealLogEntity>,
    private readonly autoHealWorker: AutoHealWorker,
    private readonly accountsService: AccountsService,
    private readonly sessionHydrationService: SessionHydrationService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /api/v1/orchestration/provision
   * Spawns a dedicated Docker Swarm/Coolify container when configured,
   * or starts an in-process local Baileys session in standalone mode.
   */
  @Post('provision')
  @HttpCode(HttpStatus.CREATED)
  async provision(@Body() body: ContainerProvisionOptions) {
    this.logger.log(`[Provision] Creating account for ${body.phoneNumber}`);

    // 1. Create account in DB (idempotent — returns existing if phone already registered)
    const account = await this.accountsService.create({
      accountId: body.accountId,
      phoneNumber: body.phoneNumber,
      displayName: body.phoneNumber,
      tenantId: body.tenantId,
      proxyId: undefined,
    });

    const orchestratorType = (
      this.config.get<string>('ORCHESTRATOR_TYPE') ||
      process.env.ORCHESTRATOR_TYPE ||
      'none'
    ).toLowerCase();

    const isManagedOrchestrator = orchestratorType === 'swarm' || orchestratorType === 'coolify';

    let remoteServiceId = account.id;
    let remoteStatus: ContainerStatus = 'running';

    if (isManagedOrchestrator) {
      this.logger.log(`[Provision] Delegating container provisioning to ${orchestratorType} orchestrator`);
      const provisioned = await this.orchestrator.provision({
        ...body,
        accountId: account.id,
      });
      remoteServiceId = provisioned.serviceId;
      remoteStatus = provisioned.status === 'failed' ? 'starting' : provisioned.status;
    } else {
      // 3. Local mode: start Baileys in-process session in background
      this.sessionHydrationService.hydrateAccount(account.id).catch((err: any) => {
        this.logger.warn(`[Provision] Background hydration error for ${account.id}: ${err.message}`);
      });
    }

    // 2. Persist container instance row so UI monitors it
    let saved: ContainerInstanceEntity;
    try {
      const existing = await this.instanceRepo.findOne({ where: { accountId: account.id } });
      if (existing) {
        saved = existing;
      } else {
        const newInstance = this.instanceRepo.create({
          serviceId: remoteServiceId,
          accountId: account.id,
          tenantId: body.tenantId ?? 'default-tenant',
          phoneNumber: body.phoneNumber,
          orchestratorType: isManagedOrchestrator ? orchestratorType : 'local',
          status: remoteStatus,
          healthState: isManagedOrchestrator ? 'unknown' : 'healthy',
          proxyUrl: body.proxyUrl,
          region: body.region,
        });
        saved = await this.instanceRepo.save(newInstance);
      }
    } catch (err: any) {
      this.logger.warn(`Could not persist container instance row: ${err.message}`);
      saved = { id: account.id, serviceId: remoteServiceId } as ContainerInstanceEntity;
    }

    this.logger.log(`[Provision] Account ${account.id} (${body.phoneNumber}) provisioned via ${orchestratorType}`);
    return { instanceId: saved.id, serviceId: saved.serviceId, accountId: account.id, status: remoteStatus };
  }

  /**
   * DELETE /api/v1/orchestration/destroy/:serviceId
   * Gracefully destroy a container and remove DB record.
   */
  @Delete('destroy/:serviceId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroy(@Param('serviceId') serviceId: string) {
    try {
      await this.orchestrator.destroy(serviceId);
    } catch {
      // In local mode, orchestrator.destroy is a no-op — ignore
    }
    await this.instanceRepo.delete({ serviceId }).catch(() => null);
    await this.instanceRepo.delete({ id: serviceId }).catch(() => null);
  }

  /**
   * POST /api/v1/orchestration/:serviceId/restart
   * Manually trigger a container restart.
   */
  @Post(':serviceId/restart')
  @HttpCode(HttpStatus.OK)
  async restart(@Param('serviceId') serviceId: string) {
    try {
      await this.orchestrator.restart(serviceId);
    } catch {
      // Local mode: reconnect via Baileys instead
      const instance = await this.instanceRepo.findOne({ where: { serviceId } });
      if (instance?.accountId) {
        this.sessionHydrationService.hydrateAccount(instance.accountId).catch(() => {});
      }
    }
    return { serviceId, status: 'restarting' };
  }

  /**
   * POST /api/v1/orchestration/:serviceId/heal
   * Manually trigger auto-heal for a specific instance.
   */
  @Post(':serviceId/heal')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async manualHeal(@Param('serviceId') serviceId: string) {
    const success = await this.autoHealWorker.manualHeal(serviceId);
    return { serviceId, healed: success };
  }

  /**
   * POST /api/v1/orchestration/:serviceId/scale
   */
  @Post(':serviceId/scale')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async scale(
    @Param('serviceId') serviceId: string,
    @Body() body: { replicas: number },
  ) {
    try {
      await this.orchestrator.scale({ serviceId, replicas: body.replicas });
    } catch {
      // Local mode: scale is a no-op
    }
    await this.instanceRepo.update({ serviceId }, { desiredReplicas: body.replicas });
    return { serviceId, replicas: body.replicas };
  }

  /**
   * GET /api/v1/orchestration/instances
   * List all provisioned container instances.
   */
  @Get('instances')
  async listInstances() {
    return this.instanceRepo.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * GET /api/v1/orchestration/instances/:id/health
   */
  @Get('instances/:serviceId/health')
  async getHealth(@Param('serviceId') serviceId: string) {
    try {
      return await this.orchestrator.getHealth(serviceId);
    } catch {
      // Local mode: return DB record as health info
      const instance = await this.instanceRepo.findOne({ where: { serviceId } });
      if (!instance) return { serviceId, healthState: 'unknown' };
      return instance;
    }
  }

  /**
   * GET /api/v1/orchestration/instances/:id/heal-log
   */
  @Get('instances/:serviceId/heal-log')
  async getHealLog(@Param('serviceId') serviceId: string) {
    const instance = await this.instanceRepo.findOne({ where: { serviceId } });
    if (!instance) return [];
    return this.healLogRepo.find({
      where: { containerInstanceId: instance.id },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
