// ─────────────────────────────────────────────────────────────────────────────
//  modules/orchestration/services/docker-swarm.service.ts
//  Phase 3: Docker Swarm API wrapper for programmatic container provisioning.
//
//  Connects to Docker Engine API over:
//    - Unix socket: /var/run/docker.sock (default, single-node)
//    - TCP:         DOCKER_HOST=tcp://swarm-manager:2376 (multi-node Swarm)
//
//  Each WhatsApp account gets its own Docker Service with:
//    - Network: whatsapp-net (shared with API)
//    - Env: ACCOUNT_ID, PROXY_URL, REDIS_HOST, DB_* (inherited from parent)
//    - Labels: wa.accountId, wa.tenantId (for filtering/routing)
//    - Resource limits: 0.5 CPU, 256MB RAM (configurable)
//    - Restart policy: on-failure (max 3 attempts before marking failed)
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Dockerode from 'dockerode';
import {
  IContainerOrchestrator,
  ContainerProvisionOptions,
  ContainerInstance,
  ContainerScaleOptions,
} from '../interfaces/container-orchestrator.interface';

@Injectable()
export class DockerSwarmService implements IContainerOrchestrator {
  private readonly logger = new Logger(DockerSwarmService.name);
  private readonly docker: Dockerode;
  private readonly engineImage: string;
  private readonly networkName: string;
  private readonly defaultCpu: number;
  private readonly defaultMemMb: number;

  constructor(private readonly config: ConfigService) {
    const defaultSocket =
      process.platform === 'win32'
        ? '//./pipe/docker_engine'
        : '/var/run/docker.sock';
    const socketPath = config.get<string>('DOCKER_SOCKET_PATH', defaultSocket);
    const dockerHost = config.get<string>('DOCKER_HOST');

    // Connect via TCP if DOCKER_HOST is set, otherwise socket / named pipe
    if (dockerHost) {
      const normalized = dockerHost.startsWith('tcp://')
        ? dockerHost.replace(/^tcp:\/\//, 'http://')
        : dockerHost;
      const url = new URL(normalized);
      this.docker = new Dockerode({
        host: url.hostname,
        port: parseInt(url.port || '2376', 10),
      });
    } else {
      this.docker = new Dockerode({ socketPath });
    }

    this.engineImage = config.get<string>('WA_ENGINE_IMAGE', 'whatsapp-engine:latest');
    this.networkName = config.get<string>('DOCKER_NETWORK', 'whatsapp-net');
    this.defaultCpu = config.get<number>('CONTAINER_CPU_LIMIT', 500_000_000); // 0.5 CPU in nano-CPUs
    this.defaultMemMb = config.get<number>('CONTAINER_MEM_LIMIT_MB', 256);

    this.logger.log(
      `Docker Swarm orchestrator initialized → image:${this.engineImage} network:${this.networkName}`,
    );
  }

  // ── Ensure overlay network exists for Swarm services ─────────────────────
  private async ensureNetwork(): Promise<void> {
    try {
      const networks = (await this.docker.listNetworks({
        filters: { name: [this.networkName] },
      })) as any[];
      if (!networks || networks.length === 0) {
        this.logger.log(`[Swarm] Creating attachable overlay network '${this.networkName}'`);
        await this.docker.createNetwork({
          Name: this.networkName,
          Driver: 'overlay',
          Attachable: true,
          CheckDuplicate: true,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Swarm] Network verification note: ${err.message}`);
    }
  }

  // ── Provision: create a new Docker Swarm service ─────────────────────────
  async provision(opts: ContainerProvisionOptions): Promise<ContainerInstance> {
    const serviceName = `wa-engine-${opts.accountId.slice(0, 8)}`;
    this.logger.log(
      `[Swarm] Provisioning service '${serviceName}' for account ${opts.accountId}`,
    );

    await this.ensureNetwork();

    const env = [
      `ACCOUNT_ID=${opts.accountId}`,
      `TENANT_ID=${opts.tenantId}`,
      `PHONE_NUMBER=${opts.phoneNumber}`,
      ...(opts.proxyUrl ? [`PROXY_URL=${opts.proxyUrl}`] : []),
      `DB_TYPE=${this.config.get('DB_TYPE', 'postgres')}`,
      `DB_HOST=${this.config.get('DB_HOST', 'postgres')}`,
      `DB_PORT=${this.config.get('DB_PORT', '5432')}`,
      `DB_NAME=${this.config.get('DB_NAME', 'whatsapp_engine')}`,
      `DB_USER=${this.config.get('DB_USER', 'whatsapp_user')}`,
      `DB_PASSWORD=${this.config.get('DB_PASSWORD', '')}`,
      `REDIS_HOST=${this.config.get('REDIS_HOST', 'redis')}`,
      `REDIS_PORT=${this.config.get('REDIS_PORT', '6379')}`,
      `REDIS_PASSWORD=${this.config.get('REDIS_PASSWORD', '')}`,
      `REDIS_MOCK=false`,
      `SESSION_ENCRYPTION_KEY=${this.config.get('SESSION_ENCRYPTION_KEY', '')}`,
      `JWT_SECRET=${this.config.get('JWT_SECRET', '')}`,
      `WEBHOOK_HMAC_SECRET=${this.config.get('WEBHOOK_HMAC_SECRET', '')}`,
      `AUTH_TEMP_DIR=/app/data/sessions`,
      `R2_ACCOUNT_ID=${this.config.get('R2_ACCOUNT_ID', '')}`,
      `R2_ACCESS_KEY_ID=${this.config.get('R2_ACCESS_KEY_ID', '')}`,
      `R2_SECRET_ACCESS_KEY=${this.config.get('R2_SECRET_ACCESS_KEY', '')}`,
      `R2_BUCKET_NAME=${this.config.get('R2_BUCKET_NAME', '')}`,
      `R2_PUBLIC_URL=${this.config.get('R2_PUBLIC_URL', '')}`,
      `NODE_ENV=production`,
      ...Object.entries(opts.envOverrides ?? {}).map(([k, v]) => `${k}=${v}`),
    ];

    try {
      const service = await this.docker.createService({
        Name: serviceName,
        Labels: {
          'wa.accountId': opts.accountId,
          'wa.tenantId': opts.tenantId,
          'wa.phoneNumber': opts.phoneNumber,
          'wa.managed': 'true',
        },
        TaskTemplate: {
          ContainerSpec: {
            Image: this.engineImage,
            Env: env,
            Labels: { 'wa.accountId': opts.accountId },
          },
          Resources: {
            Limits: {
              NanoCPUs: opts.cpuLimit
                ? this.parseCpu(opts.cpuLimit)
                : this.defaultCpu,
              MemoryBytes: opts.memLimit
                ? this.parseMemory(opts.memLimit)
                : this.defaultMemMb * 1024 * 1024,
            },
          },
          RestartPolicy: {
            Condition: 'on-failure',
            MaxAttempts: 3,
            Delay: 5_000_000_000, // 5s in nanoseconds
          },
          Networks: [{ Target: this.networkName }],
          LogDriver: {
            Name: 'json-file',
            Options: { 'max-size': '10m', 'max-file': '3' },
          },
        },
        Mode: { Replicated: { Replicas: 1 } },
        UpdateConfig: { Parallelism: 1, Delay: 10_000_000_000 },
      } as any);

      const inspected = await (service as any).inspect();
      this.logger.log(`[Swarm] ✅ Service created: ${inspected.ID} (${serviceName})`);

      return {
        serviceId: inspected.ID,
        accountId: opts.accountId,
        status: 'starting',
        replicas: { desired: 1, running: 0 },
        createdAt: new Date(),
        healthState: 'unknown',
        region: opts.region,
      };
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('not a swarm manager')) {
        this.logger.error(
          '❌ Docker Swarm is NOT initialized on this host! Run "docker swarm init" or set ORCHESTRATOR_TYPE=none in .env',
        );
        throw new Error(
          'Docker Swarm is not initialized on this server. Run "docker swarm init" or set ORCHESTRATOR_TYPE=none for standalone mode.',
        );
      }
      throw err;
    }
  }

  // ── Destroy: remove a Docker Swarm service ────────────────────────────────
  async destroy(serviceId: string): Promise<void> {
    this.logger.log(`[Swarm] Destroying service ${serviceId}`);
    try {
      const service = this.docker.getService(serviceId);
      await service.remove();
      this.logger.log(`[Swarm] ✅ Service ${serviceId} removed`);
    } catch (err: any) {
      if (err.statusCode === 404) {
        this.logger.warn(`[Swarm] Service ${serviceId} already removed (404)`);
        return;
      }
      throw err;
    }
  }

  // ── Restart: force-update service (triggers rolling restart) ─────────────
  async restart(serviceId: string): Promise<void> {
    this.logger.log(`[Swarm] Force-restarting service ${serviceId}`);
    try {
      const service = this.docker.getService(serviceId);
      const current = (await service.inspect()) as any;

      // Increment spec version to force task restart
      await service.update({
        ...current.Spec,
        version: current.Version.Index,
        TaskTemplate: {
          ...current.Spec.TaskTemplate,
          ForceUpdate: (current.Spec.TaskTemplate.ForceUpdate ?? 0) + 1,
        },
      });

      this.logger.log(`[Swarm] ✅ Service ${serviceId} force-updated`);
    } catch (err: any) {
      if (err.statusCode === 404) {
        this.logger.warn(`[Swarm] Cannot restart service ${serviceId} — not found (404)`);
        return;
      }
      throw err;
    }
  }

  // ── Get health: inspect service tasks ────────────────────────────────────
  async getHealth(serviceId: string): Promise<ContainerInstance> {
    try {
      const service = this.docker.getService(serviceId);
      const [spec, tasks] = await Promise.all([
        service.inspect() as Promise<any>,
        this.docker.listTasks({ filters: { service: [serviceId] } }) as Promise<any[]>,
      ]);

      const runningTasks = (tasks || []).filter((t) => t.Status?.State === 'running');
      const latestTask = (tasks || []).sort(
        (a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime(),
      )[0];

      const taskState = latestTask?.Status?.State;
      const healthState =
        taskState === 'running'
          ? 'healthy'
          : taskState === 'failed' || taskState === 'rejected'
          ? 'unhealthy'
          : 'unknown';

      return {
        serviceId,
        accountId: spec.Spec?.Labels?.['wa.accountId'] ?? 'unknown',
        status:
          taskState === 'running'
            ? 'running'
            : taskState === 'failed'
            ? 'failed'
            : 'starting',
        replicas: {
          desired: spec.Spec?.Mode?.Replicated?.Replicas ?? 1,
          running: runningTasks.length,
        },
        createdAt: new Date(spec.CreatedAt),
        healthState,
      };
    } catch (err: any) {
      this.logger.warn(`[Swarm] Health check failed for ${serviceId}: ${err.message}`);
      return {
        serviceId,
        accountId: 'unknown',
        status: 'stopped',
        replicas: { desired: 1, running: 0 },
        createdAt: new Date(),
        healthState: 'unhealthy',
      };
    }
  }

  // ── List all managed services ─────────────────────────────────────────────
  async listAll(): Promise<ContainerInstance[]> {
    try {
      const services = (await this.docker.listServices({
        filters: { label: ['wa.managed=true'] },
      })) as any[];

      return Promise.all(services.map((s) => this.getHealth(s.ID)));
    } catch (err: any) {
      this.logger.warn(`[Swarm] Could not list services: ${err.message}`);
      return [];
    }
  }

  // ── Scale replicas ────────────────────────────────────────────────────────
  async scale(opts: ContainerScaleOptions): Promise<void> {
    try {
      const service = this.docker.getService(opts.serviceId);
      const current = (await service.inspect()) as any;

      await service.update({
        ...current.Spec,
        version: current.Version.Index,
        Mode: { Replicated: { Replicas: opts.replicas } },
      });

      this.logger.log(`[Swarm] Scaled ${opts.serviceId} → ${opts.replicas} replica(s)`);
    } catch (err: any) {
      if (err.statusCode === 404) {
        this.logger.warn(`[Swarm] Cannot scale service ${opts.serviceId} — not found (404)`);
        return;
      }
      throw err;
    }
  }

  private parseCpu(cpu: string): number {
    const trimmed = cpu.trim().toLowerCase();
    if (trimmed.endsWith('m')) {
      const millicores = parseFloat(trimmed);
      return Math.round(millicores * 1e6);
    }
    return Math.round(parseFloat(trimmed) * 1e9);
  }

  private parseMemory(mem: string): number {
    const trimmed = mem.trim().toLowerCase();
    const num = parseFloat(trimmed);
    if (isNaN(num)) return this.defaultMemMb * 1024 * 1024;
    if (trimmed.endsWith('g') || trimmed.endsWith('gb') || trimmed.endsWith('gib')) {
      return Math.round(num * 1024 * 1024 * 1024);
    }
    if (trimmed.endsWith('k') || trimmed.endsWith('kb') || trimmed.endsWith('kib')) {
      return Math.round(num * 1024);
    }
    return Math.round(num * 1024 * 1024);
  }
}
