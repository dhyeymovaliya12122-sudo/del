// ─────────────────────────────────────────────────────────────────────────────
//  modules/orchestration/orchestration.module.ts
//  Phase 3 — Dynamic Orchestration Engine
//
//  Selects Docker Swarm or Coolify implementation via ORCHESTRATOR_TYPE env var.
//  Both implement IContainerOrchestrator → zero code change to switch.
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContainerInstanceEntity } from './entities/container-instance.entity';
import { ContainerHealLogEntity } from './entities/container-heal-log.entity';
import { DockerSwarmService } from './services/docker-swarm.service';
import { CoolifyService } from './services/coolify.service';
import { NoopOrchestratorService } from './services/noop-orchestrator.service';
import { AutoHealWorker } from './workers/auto-heal.worker';
import { OrchestrationController } from './controllers/orchestration.controller';
import { RealtimeGatewayModule } from '../realtime-gateway/realtime-gateway.module';
import { AccountsModule } from '../accounts/accounts.module';
import { SessionHydrationModule } from '../session-hydration/session-hydration.module';
import {
  CONTAINER_ORCHESTRATOR_TOKEN,
  IContainerOrchestrator,
} from './interfaces/container-orchestrator.interface';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ContainerInstanceEntity, ContainerHealLogEntity]),
    RealtimeGatewayModule,
    AccountsModule,
    SessionHydrationModule,
  ],
  controllers: [OrchestrationController],
  providers: [
    DockerSwarmService,
    CoolifyService,
    NoopOrchestratorService,
    // Dynamic provider: selects orchestrator implementation at startup
    {
      provide: CONTAINER_ORCHESTRATOR_TOKEN,
      inject: [ConfigService, DockerSwarmService, CoolifyService, NoopOrchestratorService],
      useFactory: (
        config: ConfigService,
        swarm: DockerSwarmService,
        coolify: CoolifyService,
        noop: NoopOrchestratorService,
      ): IContainerOrchestrator => {
        const type = (config.get<string>('ORCHESTRATOR_TYPE') || process.env.ORCHESTRATOR_TYPE || 'none').toLowerCase();
        if (type === 'coolify') {
          return coolify;
        }
        if (type === 'swarm') {
          return swarm;
        }
        return noop;
      },
    },
    AutoHealWorker,
  ],
  exports: [CONTAINER_ORCHESTRATOR_TOKEN, AutoHealWorker],
})
export class OrchestrationModule {}
