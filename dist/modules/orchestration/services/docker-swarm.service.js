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
var DockerSwarmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerSwarmService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Dockerode = require("dockerode");
let DockerSwarmService = DockerSwarmService_1 = class DockerSwarmService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(DockerSwarmService_1.name);
        const defaultSocket = process.platform === 'win32'
            ? '//./pipe/docker_engine'
            : '/var/run/docker.sock';
        const socketPath = config.get('DOCKER_SOCKET_PATH', defaultSocket);
        const dockerHost = config.get('DOCKER_HOST');
        if (dockerHost) {
            const normalized = dockerHost.startsWith('tcp://')
                ? dockerHost.replace(/^tcp:\/\//, 'http://')
                : dockerHost;
            const url = new URL(normalized);
            this.docker = new Dockerode({
                host: url.hostname,
                port: parseInt(url.port || '2376', 10),
            });
        }
        else {
            this.docker = new Dockerode({ socketPath });
        }
        this.engineImage = config.get('WA_ENGINE_IMAGE', 'whatsapp-engine:latest');
        this.networkName = config.get('DOCKER_NETWORK', 'whatsapp-net');
        this.defaultCpu = config.get('CONTAINER_CPU_LIMIT', 500_000_000);
        this.defaultMemMb = config.get('CONTAINER_MEM_LIMIT_MB', 256);
        this.logger.log(`Docker Swarm orchestrator initialized → image:${this.engineImage} network:${this.networkName}`);
    }
    async ensureNetwork() {
        try {
            const networks = (await this.docker.listNetworks({
                filters: { name: [this.networkName] },
            }));
            if (!networks || networks.length === 0) {
                this.logger.log(`[Swarm] Creating attachable overlay network '${this.networkName}'`);
                await this.docker.createNetwork({
                    Name: this.networkName,
                    Driver: 'overlay',
                    Attachable: true,
                    CheckDuplicate: true,
                });
            }
        }
        catch (err) {
            this.logger.warn(`[Swarm] Network verification note: ${err.message}`);
        }
    }
    async provision(opts) {
        const serviceName = `wa-engine-${opts.accountId.slice(0, 8)}`;
        this.logger.log(`[Swarm] Provisioning service '${serviceName}' for account ${opts.accountId}`);
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
                        Delay: 5_000_000_000,
                    },
                    Networks: [{ Target: this.networkName }],
                    LogDriver: {
                        Name: 'json-file',
                        Options: { 'max-size': '10m', 'max-file': '3' },
                    },
                },
                Mode: { Replicated: { Replicas: 1 } },
                UpdateConfig: { Parallelism: 1, Delay: 10_000_000_000 },
            });
            const inspected = await service.inspect();
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
        }
        catch (err) {
            if (err.message && err.message.toLowerCase().includes('not a swarm manager')) {
                this.logger.error('❌ Docker Swarm is NOT initialized on this host! Run "docker swarm init" or set ORCHESTRATOR_TYPE=none in .env');
                throw new Error('Docker Swarm is not initialized on this server. Run "docker swarm init" or set ORCHESTRATOR_TYPE=none for standalone mode.');
            }
            throw err;
        }
    }
    async destroy(serviceId) {
        this.logger.log(`[Swarm] Destroying service ${serviceId}`);
        try {
            const service = this.docker.getService(serviceId);
            await service.remove();
            this.logger.log(`[Swarm] ✅ Service ${serviceId} removed`);
        }
        catch (err) {
            if (err.statusCode === 404) {
                this.logger.warn(`[Swarm] Service ${serviceId} already removed (404)`);
                return;
            }
            throw err;
        }
    }
    async restart(serviceId) {
        this.logger.log(`[Swarm] Force-restarting service ${serviceId}`);
        try {
            const service = this.docker.getService(serviceId);
            const current = (await service.inspect());
            await service.update({
                ...current.Spec,
                version: current.Version.Index,
                TaskTemplate: {
                    ...current.Spec.TaskTemplate,
                    ForceUpdate: (current.Spec.TaskTemplate.ForceUpdate ?? 0) + 1,
                },
            });
            this.logger.log(`[Swarm] ✅ Service ${serviceId} force-updated`);
        }
        catch (err) {
            if (err.statusCode === 404) {
                this.logger.warn(`[Swarm] Cannot restart service ${serviceId} — not found (404)`);
                return;
            }
            throw err;
        }
    }
    async getHealth(serviceId) {
        try {
            const service = this.docker.getService(serviceId);
            const [spec, tasks] = await Promise.all([
                service.inspect(),
                this.docker.listTasks({ filters: { service: [serviceId] } }),
            ]);
            const runningTasks = (tasks || []).filter((t) => t.Status?.State === 'running');
            const latestTask = (tasks || []).sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime())[0];
            const taskState = latestTask?.Status?.State;
            const healthState = taskState === 'running'
                ? 'healthy'
                : taskState === 'failed' || taskState === 'rejected'
                    ? 'unhealthy'
                    : 'unknown';
            return {
                serviceId,
                accountId: spec.Spec?.Labels?.['wa.accountId'] ?? 'unknown',
                status: taskState === 'running'
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
        }
        catch (err) {
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
    async listAll() {
        try {
            const services = (await this.docker.listServices({
                filters: { label: ['wa.managed=true'] },
            }));
            return Promise.all(services.map((s) => this.getHealth(s.ID)));
        }
        catch (err) {
            this.logger.warn(`[Swarm] Could not list services: ${err.message}`);
            return [];
        }
    }
    async scale(opts) {
        try {
            const service = this.docker.getService(opts.serviceId);
            const current = (await service.inspect());
            await service.update({
                ...current.Spec,
                version: current.Version.Index,
                Mode: { Replicated: { Replicas: opts.replicas } },
            });
            this.logger.log(`[Swarm] Scaled ${opts.serviceId} → ${opts.replicas} replica(s)`);
        }
        catch (err) {
            if (err.statusCode === 404) {
                this.logger.warn(`[Swarm] Cannot scale service ${opts.serviceId} — not found (404)`);
                return;
            }
            throw err;
        }
    }
    parseCpu(cpu) {
        const trimmed = cpu.trim().toLowerCase();
        if (trimmed.endsWith('m')) {
            const millicores = parseFloat(trimmed);
            return Math.round(millicores * 1e6);
        }
        return Math.round(parseFloat(trimmed) * 1e9);
    }
    parseMemory(mem) {
        const trimmed = mem.trim().toLowerCase();
        const num = parseFloat(trimmed);
        if (isNaN(num))
            return this.defaultMemMb * 1024 * 1024;
        if (trimmed.endsWith('g') || trimmed.endsWith('gb') || trimmed.endsWith('gib')) {
            return Math.round(num * 1024 * 1024 * 1024);
        }
        if (trimmed.endsWith('k') || trimmed.endsWith('kb') || trimmed.endsWith('kib')) {
            return Math.round(num * 1024);
        }
        return Math.round(num * 1024 * 1024);
    }
};
exports.DockerSwarmService = DockerSwarmService;
exports.DockerSwarmService = DockerSwarmService = DockerSwarmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DockerSwarmService);
//# sourceMappingURL=docker-swarm.service.js.map