// ─────────────────────────────────────────────────────────────────────────────
//  modules/orchestration/interfaces/container-orchestrator.interface.ts
//  Shared interface for Docker Swarm AND Coolify implementations.
//  Switch via ORCHESTRATOR_TYPE env var: 'swarm' | 'coolify'
// ─────────────────────────────────────────────────────────────────────────────
export interface ContainerProvisionOptions {
  accountId: string;
  tenantId: string;
  phoneNumber: string;
  proxyUrl?: string;
  envOverrides?: Record<string, string>;
  region?: string;
  cpuLimit?: string;   // e.g. '0.5'
  memLimit?: string;   // e.g. '256m'
}

export interface ContainerInstance {
  serviceId: string;          // Docker service ID or Coolify deployment ID
  accountId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
  replicas: { desired: number; running: number };
  createdAt: Date;
  healthState: 'healthy' | 'unhealthy' | 'unknown';
  region?: string;
  logs?: string;
}

export interface ContainerScaleOptions {
  serviceId: string;
  replicas: number;
}

export const CONTAINER_ORCHESTRATOR_TOKEN = 'IContainerOrchestrator';

export interface IContainerOrchestrator {
  /** Provision a new WhatsApp engine container for an account */
  provision(opts: ContainerProvisionOptions): Promise<ContainerInstance>;

  /** Gracefully stop and remove a container */
  destroy(serviceId: string): Promise<void>;

  /** Force-restart a container (auto-heal) */
  restart(serviceId: string): Promise<void>;

  /** Get current container health and replica status */
  getHealth(serviceId: string): Promise<ContainerInstance>;

  /** List all provisioned container instances */
  listAll(): Promise<ContainerInstance[]>;

  /** Scale replicas (Docker Swarm only; no-op for Coolify) */
  scale(opts: ContainerScaleOptions): Promise<void>;
}
