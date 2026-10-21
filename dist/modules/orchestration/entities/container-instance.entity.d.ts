export type ContainerStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
export type HealthState = 'healthy' | 'unhealthy' | 'unknown';
export declare class ContainerInstanceEntity {
    id: string;
    serviceId: string;
    accountId: string;
    tenantId: string;
    phoneNumber: string;
    orchestratorType: string;
    status: ContainerStatus;
    healthState: HealthState;
    desiredReplicas: number;
    runningReplicas: number;
    region?: string;
    proxyUrl?: string;
    healCount: number;
    lastHealedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
