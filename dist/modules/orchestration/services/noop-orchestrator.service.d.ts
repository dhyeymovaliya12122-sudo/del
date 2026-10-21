import { IContainerOrchestrator, ContainerProvisionOptions, ContainerInstance, ContainerScaleOptions } from '../interfaces/container-orchestrator.interface';
export declare class NoopOrchestratorService implements IContainerOrchestrator {
    private readonly logger;
    constructor();
    provision(opts: ContainerProvisionOptions): Promise<ContainerInstance>;
    destroy(serviceId: string): Promise<void>;
    restart(serviceId: string): Promise<void>;
    getHealth(serviceId: string): Promise<ContainerInstance>;
    listAll(): Promise<ContainerInstance[]>;
    scale(opts: ContainerScaleOptions): Promise<void>;
}
