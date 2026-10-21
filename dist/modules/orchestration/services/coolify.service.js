"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CoolifyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoolifyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let CoolifyService = CoolifyService_1 = class CoolifyService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(CoolifyService_1.name);
        const baseURL = config.get('COOLIFY_API_URL', '');
        const token = config.get('COOLIFY_API_TOKEN', '');
        this.projectId = config.get('COOLIFY_PROJECT_ID', '');
        this.serverId = config.get('COOLIFY_SERVER_ID', '');
        this.engineImage = config.get('WA_ENGINE_IMAGE', 'whatsapp-engine:latest');
        this.http = axios_1.default.create({
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
        }
        else {
            this.logger.log(`✅ Coolify orchestrator initialized → ${baseURL}`);
        }
    }
    async provision(opts) {
        this.logger.log(`[Coolify] Provisioning for account ${opts.accountId}`);
        const envVars = {
            ACCOUNT_ID: opts.accountId,
            TENANT_ID: opts.tenantId,
            PHONE_NUMBER: opts.phoneNumber,
            ...(opts.proxyUrl ? { PROXY_URL: opts.proxyUrl } : {}),
            DB_TYPE: this.config.get('DB_TYPE', 'postgres'),
            DB_HOST: this.config.get('DB_HOST', 'postgres'),
            DB_PORT: this.config.get('DB_PORT', '5432'),
            DB_NAME: this.config.get('DB_NAME', 'whatsapp_engine'),
            DB_USER: this.config.get('DB_USER', 'whatsapp_user'),
            DB_PASSWORD: this.config.get('DB_PASSWORD', ''),
            REDIS_HOST: this.config.get('REDIS_HOST', 'redis'),
            REDIS_PORT: this.config.get('REDIS_PORT', '6379'),
            REDIS_PASSWORD: this.config.get('REDIS_PASSWORD', ''),
            REDIS_MOCK: 'false',
            SESSION_ENCRYPTION_KEY: this.config.get('SESSION_ENCRYPTION_KEY', ''),
            JWT_SECRET: this.config.get('JWT_SECRET', ''),
            WEBHOOK_HMAC_SECRET: this.config.get('WEBHOOK_HMAC_SECRET', ''),
            AUTH_TEMP_DIR: '/app/data/sessions',
            R2_ACCOUNT_ID: this.config.get('R2_ACCOUNT_ID', ''),
            R2_ACCESS_KEY_ID: this.config.get('R2_ACCESS_KEY_ID', ''),
            R2_SECRET_ACCESS_KEY: this.config.get('R2_SECRET_ACCESS_KEY', ''),
            R2_BUCKET_NAME: this.config.get('R2_BUCKET_NAME', ''),
            R2_PUBLIC_URL: this.config.get('R2_PUBLIC_URL', ''),
            NODE_ENV: 'production',
            ...opts.envOverrides,
        };
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
        const appId = createRes.data?.uuid;
        try {
            for (const [key, value] of Object.entries(envVars)) {
                await this.http.post(`/applications/${appId}/envs`, {
                    key,
                    value: String(value),
                    is_preview: false,
                    is_build_time: false,
                }).catch(() => null);
            }
        }
        catch (err) {
            this.logger.warn(`[Coolify] Note on env attachment for ${appId}: ${err.message}`);
        }
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
    async destroy(serviceId) {
        this.logger.log(`[Coolify] Destroying application ${serviceId}`);
        await this.http.delete(`/applications/${serviceId}`, {
            data: { delete_volumes: false },
        });
        this.logger.log(`[Coolify] ✅ Application ${serviceId} deleted`);
    }
    async restart(serviceId) {
        this.logger.log(`[Coolify] Restarting application ${serviceId}`);
        await this.http.post(`/applications/${serviceId}/restart`);
        this.logger.log(`[Coolify] ✅ Application ${serviceId} restarted`);
    }
    async getHealth(serviceId) {
        const res = await this.http.get(`/applications/${serviceId}`);
        const app = res.data;
        const status = app.status === 'running' ? 'running' :
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
    async listAll() {
        const res = await this.http.get(`/projects/${this.projectId}/applications`);
        const apps = (res.data ?? []).filter((a) => a.labels?.includes('wa.accountId'));
        return Promise.all(apps.map((a) => this.getHealth(a.uuid)));
    }
    async scale(_opts) {
        this.logger.warn('[Coolify] Scale operation is not supported — no-op');
    }
};
exports.CoolifyService = CoolifyService;
exports.CoolifyService = CoolifyService = CoolifyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CoolifyService);
//# sourceMappingURL=coolify.service.js.map