export interface ContainerProvisionOptions {
    accountId: string;
    tenantId: string;
    phoneNumber: string;
    proxyUrl?: string;
    envOverrides?: Record<string, string>;
    region?: string;
    cpuLimit?: string;
    memLimit?: string;
}
export interface ContainerInstance {
    serviceId: string;
    accountId: string;
    status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
    replicas: {
        desired: number;
        running: number;
    };
    createdAt: Date;
    healthState: 'healthy' | 'unhealthy' | 'unknown';
    region?: string;
    logs?: string;
}
export interface ContainerScaleOptions {
    serviceId: string;
    replicas: number;
}
export declare const CONTAINER_ORCHESTRATOR_TOKEN = "IContainerOrchestrator";
export interface IContainerOrchestrator {
    provision(opts: ContainerProvisionOptions): Promise<ContainerInstance>;
    destroy(serviceId: string): Promise<void>;
    restart(serviceId: string): Promise<void>;
    getHealth(serviceId: string): Promise<ContainerInstance>;
    listAll(): Promise<ContainerInstance[]>;
    scale(opts: ContainerScaleOptions): Promise<void>;
}
