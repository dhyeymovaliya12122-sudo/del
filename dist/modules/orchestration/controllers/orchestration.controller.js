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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrchestrationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestrationController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const container_orchestrator_interface_1 = require("../interfaces/container-orchestrator.interface");
const container_instance_entity_1 = require("../entities/container-instance.entity");
const container_heal_log_entity_1 = require("../entities/container-heal-log.entity");
const auto_heal_worker_1 = require("../workers/auto-heal.worker");
const accounts_service_1 = require("../../accounts/services/accounts.service");
const session_hydration_service_1 = require("../../session-hydration/services/session-hydration.service");
const config_1 = require("@nestjs/config");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const app_user_entity_1 = require("../../auth/entities/app-user.entity");
let OrchestrationController = OrchestrationController_1 = class OrchestrationController {
    constructor(orchestrator, instanceRepo, healLogRepo, autoHealWorker, accountsService, sessionHydrationService, config) {
        this.orchestrator = orchestrator;
        this.instanceRepo = instanceRepo;
        this.healLogRepo = healLogRepo;
        this.autoHealWorker = autoHealWorker;
        this.accountsService = accountsService;
        this.sessionHydrationService = sessionHydrationService;
        this.config = config;
        this.logger = new common_1.Logger(OrchestrationController_1.name);
    }
    async provision(body) {
        this.logger.log(`[Provision] Creating account for ${body.phoneNumber}`);
        const account = await this.accountsService.create({
            accountId: body.accountId,
            phoneNumber: body.phoneNumber,
            displayName: body.phoneNumber,
            tenantId: body.tenantId,
            proxyId: undefined,
        });
        const orchestratorType = (this.config.get('ORCHESTRATOR_TYPE') ||
            process.env.ORCHESTRATOR_TYPE ||
            'none').toLowerCase();
        const isManagedOrchestrator = orchestratorType === 'swarm' || orchestratorType === 'coolify';
        let remoteServiceId = account.id;
        let remoteStatus = 'running';
        if (isManagedOrchestrator) {
            this.logger.log(`[Provision] Delegating container provisioning to ${orchestratorType} orchestrator`);
            const provisioned = await this.orchestrator.provision({
                ...body,
                accountId: account.id,
            });
            remoteServiceId = provisioned.serviceId;
            remoteStatus = provisioned.status === 'failed' ? 'starting' : provisioned.status;
        }
        else {
            this.sessionHydrationService.hydrateAccount(account.id).catch((err) => {
                this.logger.warn(`[Provision] Background hydration error for ${account.id}: ${err.message}`);
            });
        }
        let saved;
        try {
            const existing = await this.instanceRepo.findOne({ where: { accountId: account.id } });
            if (existing) {
                saved = existing;
            }
            else {
                const newInstance = this.instanceRepo.create({
                    serviceId: remoteServiceId,
                    accountId: account.id,
                    tenantId: body.tenantId ?? 'default-tenant',
                    phoneNumber: body.phoneNumber,
                    orchestratorType: isManagedOrchestrator ? orchestratorType : 'local',
                    status: remoteStatus,
                    healthState: isManagedOrchestrator ? 'unknown' : 'healthy',
                    proxyUrl: body.proxyUrl,
                    region: body.region,
                });
                saved = await this.instanceRepo.save(newInstance);
            }
        }
        catch (err) {
            this.logger.warn(`Could not persist container instance row: ${err.message}`);
            saved = { id: account.id, serviceId: remoteServiceId };
        }
        this.logger.log(`[Provision] Account ${account.id} (${body.phoneNumber}) provisioned via ${orchestratorType}`);
        return { instanceId: saved.id, serviceId: saved.serviceId, accountId: account.id, status: remoteStatus };
    }
    async destroy(serviceId) {
        try {
            await this.orchestrator.destroy(serviceId);
        }
        catch {
        }
        await this.instanceRepo.delete({ serviceId }).catch(() => null);
        await this.instanceRepo.delete({ id: serviceId }).catch(() => null);
    }
    async restart(serviceId) {
        try {
            await this.orchestrator.restart(serviceId);
        }
        catch {
            const instance = await this.instanceRepo.findOne({ where: { serviceId } });
            if (instance?.accountId) {
                this.sessionHydrationService.hydrateAccount(instance.accountId).catch(() => { });
            }
        }
        return { serviceId, status: 'restarting' };
    }
    async manualHeal(serviceId) {
        const success = await this.autoHealWorker.manualHeal(serviceId);
        return { serviceId, healed: success };
    }
    async scale(serviceId, body) {
        try {
            await this.orchestrator.scale({ serviceId, replicas: body.replicas });
        }
        catch {
        }
        await this.instanceRepo.update({ serviceId }, { desiredReplicas: body.replicas });
        return { serviceId, replicas: body.replicas };
    }
    async listInstances() {
        return this.instanceRepo.find({ order: { createdAt: 'DESC' } });
    }
    async getHealth(serviceId) {
        try {
            return await this.orchestrator.getHealth(serviceId);
        }
        catch {
            const instance = await this.instanceRepo.findOne({ where: { serviceId } });
            if (!instance)
                return { serviceId, healthState: 'unknown' };
            return instance;
        }
    }
    async getHealLog(serviceId) {
        const instance = await this.instanceRepo.findOne({ where: { serviceId } });
        if (!instance)
            return [];
        return this.healLogRepo.find({
            where: { containerInstanceId: instance.id },
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }
};
exports.OrchestrationController = OrchestrationController;
__decorate([
    (0, common_1.Post)('provision'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrchestrationController.prototype, "provision", null);
__decorate([
    (0, common_1.Delete)('destroy/:serviceId'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrchestrationController.prototype, "destroy", null);
__decorate([
    (0, common_1.Post)(':serviceId/restart'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrchestrationController.prototype, "restart", null);
__decorate([
    (0, common_1.Post)(':serviceId/heal'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrchestrationController.prototype, "manualHeal", null);
__decorate([
    (0, common_1.Post)(':serviceId/scale'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('serviceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrchestrationController.prototype, "scale", null);
__decorate([
    (0, common_1.Get)('instances'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrchestrationController.prototype, "listInstances", null);
__decorate([
    (0, common_1.Get)('instances/:serviceId/health'),
    __param(0, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrchestrationController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('instances/:serviceId/heal-log'),
    __param(0, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrchestrationController.prototype, "getHealLog", null);
exports.OrchestrationController = OrchestrationController = OrchestrationController_1 = __decorate([
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.Controller)('orchestration'),
    __param(0, (0, common_1.Inject)(container_orchestrator_interface_1.CONTAINER_ORCHESTRATOR_TOKEN)),
    __param(1, (0, typeorm_1.InjectRepository)(container_instance_entity_1.ContainerInstanceEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(container_heal_log_entity_1.ContainerHealLogEntity)),
    __metadata("design:paramtypes", [Object, typeorm_2.Repository,
        typeorm_2.Repository,
        auto_heal_worker_1.AutoHealWorker,
        accounts_service_1.AccountsService,
        session_hydration_service_1.SessionHydrationService,
        config_1.ConfigService])
], OrchestrationController);
//# sourceMappingURL=orchestration.controller.js.map