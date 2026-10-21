import { ConfigService } from '@nestjs/config';
import { IContainerOrchestrator, ContainerProvisionOptions, ContainerInstance, ContainerScaleOptions } from '../interfaces/container-orchestrator.interface';
export declare class DockerSwarmService implements IContainerOrchestrator {
    private readonly config;
    private readonly logger;
    private readonly docker;
    private readonly engineImage;
    private readonly networkName;
    private readonly defaultCpu;
    private readonly defaultMemMb;
    constructor(config: ConfigService);
    private ensureNetwork;
    provision(opts: ContainerProvisionOptions): Promise<ContainerInstance>;
    destroy(serviceId: string): Promise<void>;
    restart(serviceId: string): Promise<void>;
    getHealth(serviceId: string): Promise<ContainerInstance>;
    listAll(): Promise<ContainerInstance[]>;
    scale(opts: ContainerScaleOptions): Promise<void>;
    private parseCpu;
    private parseMemory;
}
