// ─────────────────────────────────────────────────────────────────────────────
//  modules/orchestration/services/coolify.service.ts
//  Phase 3: Coolify REST API wrapper for managed deployments.
//
//  Coolify API base: COOLIFY_API_URL (e.g. https://coolify.yourdomain.com/api/v1)
//  Auth:             COOLIFY_API_TOKEN (Bearer token from Coolify settings)
//
//  Coolify deployment workflow:
//    1. POST /applications → create application from Docker image
//    2. POST /applications/:id/start → provision
//    3. GET  /applications/:id → health check
//    4. POST /applications/:id/restart → auto-heal
//    5. DELETE /applications/:id → destroy
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IContainerOrchestrator,
  ContainerProvisionOptions,
  ContainerInstance,
  ContainerScaleOptions,
} from '../interfaces/container-orchestrator.interface';

@Injectable()
export class CoolifyService implements IContainerOrchestrator {
  private readonly logger = new Logger(CoolifyService.name);
  private readonly http: AxiosInstance;
  private readonly projectId: string;
  private readonly serverId: string;
  private readonly engineImage: string;

  constructor(private readonly config: ConfigService) {
    const baseURL = config.get<string>('COOLIFY_API_URL', '');
    const token = config.get<string>('COOLIFY_API_TOKEN', '');

    this.projectId = config.get<string>('COOLIFY_PROJECT_ID', '');
    this.serverId = config.get<string>('COOLIFY_SERVER_ID', '');
    this.engineImage = config.get<string>('WA_ENGINE_IMAGE', 'whatsapp-engine:latest');

    this.http = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30_000,
    });

    if (!baseURL || !token) {
      this.logger.warn('⚠️  Coolify API URL or token not configured');
    } else {
      this.logger.log(`✅ Coolify orchestrator initialized → ${baseURL}`);
    }
  }

  // ── Provision: Create + start a Coolify application ─────────────────────
  async provision(opts: ContainerProvisionOptions): Promise<ContainerInstance> {
    this.logger.log(`[Coolify] Provisioning for account ${opts.accountId}`);

    const envVars = {
      ACCOUNT_ID: opts.accountId,
      TENANT_ID: opts.tenantId,
      PHONE_NUMBER: opts.phoneNumber,
      ...(opts.proxyUrl ? { PROXY_URL: opts.proxyUrl } : {}),
      DB_TYPE: this.config.get<string>('DB_TYPE', 'postgres'),
      DB_HOST: this.config.get<string>('DB_HOST', 'postgres'),
      DB_PORT: this.config.get<string>('DB_PORT', '5432'),
      DB_NAME: this.config.get<string>('DB_NAME', 'whatsapp_engine'),
      DB_USER: this.config.get<string>('DB_USER', 'whatsapp_user'),
      DB_PASSWORD: this.config.get<string>('DB_PASSWORD', ''),
      REDIS_HOST: this.config.get<string>('REDIS_HOST', 'redis'),
      REDIS_PORT: this.config.get<string>('REDIS_PORT', '6379'),
      REDIS_PASSWORD: this.config.get<string>('REDIS_PASSWORD', ''),
      REDIS_MOCK: 'false',
      SESSION_ENCRYPTION_KEY: this.config.get<string>('SESSION_ENCRYPTION_KEY', ''),
      JWT_SECRET: this.config.get<string>('JWT_SECRET', ''),
      WEBHOOK_HMAC_SECRET: this.config.get<string>('WEBHOOK_HMAC_SECRET', ''),
      AUTH_TEMP_DIR: '/app/data/sessions',
      R2_ACCOUNT_ID: this.config.get<string>('R2_ACCOUNT_ID', ''),
      R2_ACCESS_KEY_ID: this.config.get<string>('R2_ACCESS_KEY_ID', ''),
      R2_SECRET_ACCESS_KEY: this.config.get<string>('R2_SECRET_ACCESS_KEY', ''),
      R2_BUCKET_NAME: this.config.get<string>('R2_BUCKET_NAME', ''),
      R2_PUBLIC_URL: this.config.get<string>('R2_PUBLIC_URL', ''),
      NODE_ENV: 'production',
      ...opts.envOverrides,
    };

    // Create application
    const createRes = await this.http.post('/applications', {
      project_uuid: this.projectId,
      server_uuid: this.serverId,
      type: 'docker_image',
      name: `wa-engine-${opts.accountId.slice(0, 8)}`,
      docker_registry_image_name: this.engineImage,
      environment_variables: Object.entries(envVars)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n'),
      ports_exposes: '3000',
      labels: [
        `wa.accountId=${opts.accountId}`,
        `wa.tenantId=${opts.tenantId}`,
      ].join(','),
    });

    const appId: string = createRes.data?.uuid;

    // Attach environment variables via Coolify v4 API
    try {
      for (const [key, value] of Object.entries(envVars)) {
        await this.http.post(`/applications/${appId}/envs`, {
          key,
          value: String(value),
          is_preview: false,
          is_build_time: false,
        }).catch(() => null);
      }
    } catch (err: any) {
      this.logger.warn(`[Coolify] Note on env attachment for ${appId}: ${err.message}`);
    }

    // Start application
    await this.http.post(`/applications/${appId}/start`);
    this.logger.log(`[Coolify] ✅ Application ${appId} started`);

    return {
      serviceId: appId,
      accountId: opts.accountId,
      status: 'starting',
      replicas: { desired: 1, running: 0 },
      createdAt: new Date(),
      healthState: 'unknown',
      region: opts.region,
    };
  }

  // ── Destroy ────────────────────────────────────────────────────────────────
  async destroy(serviceId: string): Promise<void> {
    this.logger.log(`[Coolify] Destroying application ${serviceId}`);
    await this.http.delete(`/applications/${serviceId}`, {
      data: { delete_volumes: false },
    });
    this.logger.log(`[Coolify] ✅ Application ${serviceId} deleted`);
  }

  // ── Restart ────────────────────────────────────────────────────────────────
  async restart(serviceId: string): Promise<void> {
    this.logger.log(`[Coolify] Restarting application ${serviceId}`);
    await this.http.post(`/applications/${serviceId}/restart`);
    this.logger.log(`[Coolify] ✅ Application ${serviceId} restarted`);
  }

  // ── Get health ────────────────────────────────────────────────────────────
  async getHealth(serviceId: string): Promise<ContainerInstance> {
    const res = await this.http.get(`/applications/${serviceId}`);
    const app = res.data;

    const status =
      app.status === 'running' ? 'running' :
      app.status === 'stopped' ? 'stopped' :
      app.status === 'error' ? 'failed' : 'starting';

    return {
      serviceId,
      accountId: app.environment_variables?.match(/ACCOUNT_ID=([^\n]+)/)?.[1] ?? 'unknown',
      status,
      replicas: { desired: 1, running: status === 'running' ? 1 : 0 },
      createdAt: new Date(app.created_at),
      healthState: status === 'running' ? 'healthy' : status === 'failed' ? 'unhealthy' : 'unknown',
    };
  }

  // ── List all managed applications ─────────────────────────────────────────
  async listAll(): Promise<ContainerInstance[]> {
    const res = await this.http.get(`/projects/${this.projectId}/applications`);
    const apps = (res.data ?? []).filter((a: any) =>
      a.labels?.includes('wa.accountId'),
    );
    return Promise.all(apps.map((a: any) => this.getHealth(a.uuid)));
  }

  /** No-op for Coolify (single-replica model) */
  async scale(_opts: ContainerScaleOptions): Promise<void> {
    this.logger.warn('[Coolify] Scale operation is not supported — no-op');
  }
}
