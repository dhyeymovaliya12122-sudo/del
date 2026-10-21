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
var MessageQueueWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageQueueWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const message_queue_log_entity_1 = require("../entities/message-queue-log.entity");
const baileys_client_factory_1 = require("../../session-hydration/factories/baileys-client.factory");
const proxy_circuit_breaker_service_1 = require("../../proxy-circuit-breaker/services/proxy-circuit-breaker.service");
const whatsapp_account_entity_1 = require("../../session-hydration/entities/whatsapp-account.entity");
const trace_context_service_1 = require("../../telemetry/services/trace-context.service");
let MessageQueueWorker = MessageQueueWorker_1 = class MessageQueueWorker extends bullmq_1.WorkerHost {
    constructor(queueLogRepo, accountRepo, baileysClientFactory, circuitBreakerService, config, campaignStatusUpdater, traceContextService) {
        super();
        this.queueLogRepo = queueLogRepo;
        this.accountRepo = accountRepo;
        this.baileysClientFactory = baileysClientFactory;
        this.circuitBreakerService = circuitBreakerService;
        this.config = config;
        this.campaignStatusUpdater = campaignStatusUpdater;
        this.traceContextService = traceContextService;
        this.logger = new common_1.Logger(MessageQueueWorker_1.name);
    }
    async process(job) {
        const { accountId, to, type, payload, tenantId, traceId, spanId } = job.data;
        this.logger.log(`[Worker] Processing job ${job.id}: ${type} → ${to} (account: ${accountId}, attempt: ${job.attemptsMade + 1})`);
        let noiseAckSpanId;
        if (traceId && this.traceContextService) {
            const enqueuedAt = job.data.enqueuedAt || job.timestamp || Date.now();
            const delayMs = Math.max(0, Date.now() - enqueuedAt);
            const queueDelaySpan = this.traceContextService.startChildSpan(traceId, 'queue_delay', spanId, { attemptsMade: job.attemptsMade, delayMs });
            this.traceContextService.endSpan(traceId, queueDelaySpan.spanId, { delayMs });
            const noiseSpan = this.traceContextService.startChildSpan(traceId, 'noise_ack', queueDelaySpan.spanId, { accountId, to, type });
            noiseAckSpanId = noiseSpan.spanId;
        }
        await this.updateJobStatus(job.id, accountId, 'active', job.attemptsMade + 1);
        const clientInstance = this.baileysClientFactory.getClient(accountId);
        if (!clientInstance) {
            if (traceId && noiseAckSpanId && this.traceContextService) {
                this.traceContextService.endSpan(traceId, noiseAckSpanId, { error: 'Client not hydrated' }, 'error');
            }
            throw new Error(`No active Baileys client for account ${accountId}. Session may not be hydrated.`);
        }
        const { socket } = clientInstance;
        try {
            const deliverableJid = await this.baileysClientFactory.resolveDeliverableJid(accountId, to);
            let result;
            switch (type) {
                case 'text':
                    result = await socket.sendMessage(deliverableJid, { text: payload.text ?? '' });
                    break;
                case 'image':
                case 'audio':
                case 'video':
                case 'document':
                    result = await socket.sendMessage(deliverableJid, {
                        [type]: { url: payload.text ?? '' },
                        caption: payload.caption,
                    });
                    break;
                case 'template':
                    result = await socket.sendMessage(deliverableJid, {
                        templateMessage: {
                            hydratedTemplate: {
                                templateId: payload.templateName,
                                hydratedContentText: payload.templateParams?.join('\n'),
                            },
                        },
                    });
                    break;
                default:
                    throw new Error(`Unknown message type: ${type}`);
            }
            const sentMessageId = result?.key?.id;
            this.logger.log(`[Worker] ✅ Sent ${type} to ${to} (msgId: ${sentMessageId}, job: ${job.id})`);
            if (traceId && noiseAckSpanId && this.traceContextService) {
                this.traceContextService.endSpan(traceId, noiseAckSpanId, { messageId: sentMessageId, status: 'carrier_ack' }, 'completed');
            }
            await this.updateJobStatus(job.id, accountId, 'completed', job.attemptsMade + 1);
            return { sentAt: Date.now(), messageId: sentMessageId };
        }
        catch (err) {
            this.logger.error(`[Worker] ❌ Failed to send ${type} to ${to}: ${err.message}`);
            if (traceId && noiseAckSpanId && this.traceContextService) {
                this.traceContextService.endSpan(traceId, noiseAckSpanId, { error: err.message }, 'error');
            }
            const proxyId = await this.getProxyIdForAccount(accountId);
            if (proxyId) {
                await this.circuitBreakerService.recordFailure(proxyId, accountId);
            }
            await this.updateJobStatus(job.id, accountId, 'failed', job.attemptsMade + 1, err.message);
            throw err;
        }
    }
    async onCompleted(job) {
        this.logger.debug(`[Worker] Job ${job.id} completed`);
        const { recipientId, campaignId } = (job.data.metadata ?? {});
        if (recipientId && this.campaignStatusUpdater) {
            await this.campaignStatusUpdater
                .updateRecipientById(recipientId, 'sent')
                .catch(err => this.logger.warn(`[Worker] Failed to update recipient ${recipientId}: ${err.message}`));
        }
    }
    onFailed(job, err) {
        this.logger.warn(`[Worker] Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
    }
    onStalled(jobId) {
        this.logger.error(`[Worker] Job ${jobId} STALLED — possible hung send operation`);
    }
    async updateJobStatus(jobId, accountId, status, attempt, errorMessage) {
        await this.queueLogRepo
            .createQueryBuilder()
            .update()
            .set({
            status,
            attempt,
            errorMessage,
            processedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
        })
            .where('job_id = :jobId', { jobId })
            .execute();
    }
    async getProxyIdForAccount(accountId) {
        try {
            const account = await this.accountRepo.findOne({
                where: { id: accountId },
                select: ['id', 'proxyId'],
            });
            return account?.proxyId ?? null;
        }
        catch (err) {
            this.logger.warn(`Failed to resolve proxy ID for account ${accountId}: ${err.message}`);
            return null;
        }
    }
};
exports.MessageQueueWorker = MessageQueueWorker;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", Promise)
], MessageQueueWorker.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], MessageQueueWorker.prototype, "onFailed", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('stalled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MessageQueueWorker.prototype, "onStalled", null);
exports.MessageQueueWorker = MessageQueueWorker = MessageQueueWorker_1 = __decorate([
    (0, bullmq_1.Processor)('outbound-messages', {
        concurrency: parseInt(process.env.BULLMQ_CONCURRENCY ?? '2', 10),
        stalledInterval: parseInt(process.env.BULLMQ_STALLED_INTERVAL_MS ?? '30000', 10),
    }),
    __param(0, (0, typeorm_1.InjectRepository)(message_queue_log_entity_1.MessageQueueLogEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __param(5, (0, common_1.Optional)()),
    __param(6, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        baileys_client_factory_1.BaileysClientFactory,
        proxy_circuit_breaker_service_1.ProxyCircuitBreakerService,
        config_1.ConfigService, Object, trace_context_service_1.TraceContextService])
], MessageQueueWorker);
//# sourceMappingURL=message-queue.worker.js.map