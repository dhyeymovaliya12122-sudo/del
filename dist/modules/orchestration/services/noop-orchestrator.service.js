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
var NoopOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
let NoopOrchestratorService = NoopOrchestratorService_1 = class NoopOrchestratorService {
    constructor() {
        this.logger = new common_1.Logger(NoopOrchestratorService_1.name);
        this.logger.log('ℹ️ Container orchestration is set to NONE (standalone / monolithic mode)');
    }
    async provision(opts) {
        this.logger.log(`[Noop] Container provision simulated for account ${opts.accountId}`);
        return {
            serviceId: `standalone-${opts.accountId.slice(0, 8)}`,
            accountId: opts.accountId,
            status: 'running',
            replicas: { desired: 1, running: 1 },
            createdAt: new Date(),
            healthState: 'healthy',
            region: opts.region || 'local',
            logs: 'Running in single-container embedded mode',
        };
    }
    async destroy(serviceId) {
        this.logger.log(`[Noop] Container destroy simulated for service ${serviceId}`);
    }
    async restart(serviceId) {
        this.logger.log(`[Noop] Container restart simulated for service ${serviceId}`);
    }
    async getHealth(serviceId) {
        return {
            serviceId,
            accountId: 'standalone',
            status: 'running',
            replicas: { desired: 1, running: 1 },
            createdAt: new Date(),
            healthState: 'healthy',
            region: 'local',
            logs: 'Standalone mode active',
        };
    }
    async listAll() {
        return [];
    }
    async scale(opts) {
        this.logger.log(`[Noop] Container scale simulated for ${opts.serviceId} to ${opts.replicas}`);
    }
};
exports.NoopOrchestratorService = NoopOrchestratorService;
exports.NoopOrchestratorService = NoopOrchestratorService = NoopOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], NoopOrchestratorService);
//# sourceMappingURL=noop-orchestrator.service.js.map