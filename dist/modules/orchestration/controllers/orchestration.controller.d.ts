import { Repository } from 'typeorm';
import { IContainerOrchestrator, ContainerProvisionOptions } from '../interfaces/container-orchestrator.interface';
import { ContainerInstanceEntity } from '../entities/container-instance.entity';
import { ContainerHealLogEntity } from '../entities/container-heal-log.entity';
import { AutoHealWorker } from '../workers/auto-heal.worker';
import { AccountsService } from '../../accounts/services/accounts.service';
import { SessionHydrationService } from '../../session-hydration/services/session-hydration.service';
import { ConfigService } from '@nestjs/config';
export declare class OrchestrationController {
    private readonly orchestrator;
    private readonly instanceRepo;
    private readonly healLogRepo;
    private readonly autoHealWorker;
    private readonly accountsService;
    private readonly sessionHydrationService;
    private readonly config;
    private readonly logger;
    constructor(orchestrator: IContainerOrchestrator, instanceRepo: Repository<ContainerInstanceEntity>, healLogRepo: Repository<ContainerHealLogEntity>, autoHealWorker: AutoHealWorker, accountsService: AccountsService, sessionHydrationService: SessionHydrationService, config: ConfigService);
    provision(body: ContainerProvisionOptions): Promise<{
        instanceId: string;
        serviceId: string;
        accountId: string;
        status: "running" | "starting" | "stopping" | "stopped";
    }>;
    destroy(serviceId: string): Promise<void>;
    restart(serviceId: string): Promise<{
        serviceId: string;
        status: string;
    }>;
    manualHeal(serviceId: string): Promise<{
        serviceId: string;
        healed: boolean;
    }>;
    scale(serviceId: string, body: {
        replicas: number;
    }): Promise<{
        serviceId: string;
        replicas: number;
    }>;
    listInstances(): Promise<ContainerInstanceEntity[]>;
    getHealth(serviceId: string): Promise<ContainerInstanceEntity | import("../interfaces/container-orchestrator.interface").ContainerInstance | {
        serviceId: string;
        healthState: string;
    }>;
    getHealLog(serviceId: string): Promise<ContainerHealLogEntity[]>;
}
