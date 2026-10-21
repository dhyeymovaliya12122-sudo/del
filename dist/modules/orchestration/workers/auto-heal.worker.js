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
var AutoHealWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoHealWorker = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ioredis_1 = require("ioredis");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const config_1 = require("@nestjs/config");
const container_instance_entity_1 = require("../entities/container-instance.entity");
const container_heal_log_entity_1 = require("../entities/container-heal-log.entity");
const container_orchestrator_interface_1 = require("../interfaces/container-orchestrator.interface");
const realtime_event_service_1 = require("../../realtime-gateway/services/realtime-event.service");
let AutoHealWorker = AutoHealWorker_1 = class AutoHealWorker {
    constructor(instanceRepo, healLogRepo, orchestrator, redis, realtimeService, config) {
        this.instanceRepo = instanceRepo;
        this.healLogRepo = healLogRepo;
        this.orchestrator = orchestrator;
        this.redis = redis;
        this.realtimeService = realtimeService;
        this.config = config;
        this.logger = new common_1.Logger(AutoHealWorker_1.name);
        this.isHealing = false;
        this.stallThresholdMs = config.get('HEAL_STALL_THRESHOLD_MS', 90_000);
    }
    async runAutoHeal() {
        const orchestratorType = (this.config.get('ORCHESTRATOR_TYPE') ||
            process.env.ORCHESTRATOR_TYPE ||
            'none').toLowerCase();
        if (orchestratorType === 'none' || orchestratorType === 'local') {
            return;
        }
        if (this.isHealing) {
            this.logger.debug('[AutoHeal] Previous heal cycle still running — skipping');
            return;
        }
        this.isHealing = true;
        this.logger.debug('[AutoHeal] 🔍 Starting health scan…');
        try {
            const instances = await this.instanceRepo.find({
                where: { status: (0, typeorm_2.In)(['starting', 'running']) },
            });
            if (instances.length === 0) {
                this.logger.debug('[AutoHeal] No active instances to monitor');
                return;
            }
            this.logger.debug(`[AutoHeal] Checking ${instances.length} instance(s)…`);
            const healPromises = instances.map((instance) => this.checkAndHealInstance(instance));
            const results = await Promise.allSettled(healPromises);
            const healed = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
            if (healed > 0) {
                this.logger.warn(`[AutoHeal] 🩹 Healed ${healed}/${instances.length} instance(s)`);
            }
            else {
                this.logger.debug(`[AutoHeal] ✅ All ${instances.length} instance(s) healthy`);
            }
        }
        catch (err) {
            this.logger.error(`[AutoHeal] Scan error: ${err.message}`);
        }
        finally {
            this.isHealing = false;
        }
    }
    async checkAndHealInstance(instance) {
        let liveHealth;
        try {
            liveHealth = await this.orchestrator.getHealth(instance.serviceId);
        }
        catch (err) {
            this.logger.warn(`[AutoHeal] Could not fetch health for ${instance.serviceId}: ${err.message}`);
            liveHealth = {
                ...instance,
                status: 'failed',
                healthState: 'unhealthy',
                replicas: { desired: 1, running: 0 },
            };
        }
        await this.instanceRepo.update(instance.id, {
            status: liveHealth.status,
            healthState: liveHealth.healthState,
            runningReplicas: liveHealth.replicas.running,
        });
        const needsHeal = liveHealth.healthState === 'unhealthy' ||
            liveHealth.status === 'failed' ||
            (liveHealth.replicas.desired > 0 && liveHealth.replicas.running === 0);
        if (!needsHeal)
            return false;
        const healReason = liveHealth.status === 'failed'
            ? 'task_failed'
            : liveHealth.replicas.running === 0
                ? 'no_running_replicas'
                : 'unhealthy_state';
        this.logger.warn(`[AutoHeal] 🚨 Instance ${instance.serviceId} needs healing (reason: ${healReason})`);
        return this.healInstance(instance, healReason, liveHealth.status);
    }
    async healInstance(instance, reason, previousState) {
        let success = false;
        let errorMessage;
        let actionTaken = 'force_restart';
        try {
            await this.orchestrator.restart(instance.serviceId);
            await this.instanceRepo.update(instance.id, {
                status: 'starting',
                healthState: 'unknown',
                healCount: instance.healCount + 1,
                lastHealedAt: new Date(),
            });
            success = true;
            this.logger.log(`[AutoHeal] ✅ Healed instance ${instance.serviceId} (account: ${instance.accountId})`);
            this.realtimeService.emitCircuitBreakerAlert(instance.tenantId, instance.accountId, instance.serviceId, `AUTO_HEALED:${reason}`);
        }
        catch (err) {
            errorMessage = err.message;
            actionTaken = 'force_restart_failed';
            this.logger.error(`[AutoHeal] ❌ Failed to heal ${instance.serviceId}: ${err.message}`);
            await this.instanceRepo.update(instance.id, { status: 'failed' });
        }
        await this.healLogRepo.save(this.healLogRepo.create({
            containerInstanceId: instance.id,
            accountId: instance.accountId,
            healReason: reason,
            previousState,
            actionTaken,
            success,
            errorMessage,
        }));
        return success;
    }
    async manualHeal(serviceId) {
        const instance = await this.instanceRepo.findOne({ where: { serviceId } });
        if (!instance)
            throw new Error(`Container instance ${serviceId} not found`);
        return this.healInstance(instance, 'manual_trigger', instance.status);
    }
};
exports.AutoHealWorker = AutoHealWorker;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutoHealWorker.prototype, "runAutoHeal", null);
exports.AutoHealWorker = AutoHealWorker = AutoHealWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(container_instance_entity_1.ContainerInstanceEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(container_heal_log_entity_1.ContainerHealLogEntity)),
    __param(2, (0, common_1.Inject)(container_orchestrator_interface_1.CONTAINER_ORCHESTRATOR_TOKEN)),
    __param(3, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, Object, ioredis_1.Redis,
        realtime_event_service_1.RealtimeEventService,
        config_1.ConfigService])
], AutoHealWorker);
//# sourceMappingURL=auto-heal.worker.js.map