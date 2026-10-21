import { ConfigService } from '@nestjs/config';
import { IContainerOrchestrator, ContainerProvisionOptions, ContainerInstance, ContainerScaleOptions } from '../interfaces/container-orchestrator.interface';
export declare class CoolifyService implements IContainerOrchestrator {
    private readonly config;
    private readonly logger;
    private readonly http;
    private readonly projectId;
    private readonly serverId;
    private readonly engineImage;
    constructor(config: ConfigService);
    provision(opts: ContainerProvisionOptions): Promise<ContainerInstance>;
    destroy(serviceId: string): Promise<void>;
    restart(serviceId: string): Promise<void>;
    getHealth(serviceId: string): Promise<ContainerInstance>;
    listAll(): Promise<ContainerInstance[]>;
    scale(_opts: ContainerScaleOptions): Promise<void>;
}
