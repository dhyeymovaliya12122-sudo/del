import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MessageQueueLogEntity } from '../entities/message-queue-log.entity';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
import { ProxyCircuitBreakerService } from '../../proxy-circuit-breaker/services/proxy-circuit-breaker.service';
import { OutboundMessageJob } from '../services/outbound-message-queue.service';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import { TraceContextService } from '../../telemetry/services/trace-context.service';
export declare class MessageQueueWorker extends WorkerHost {
    private readonly queueLogRepo;
    private readonly accountRepo;
    private readonly baileysClientFactory;
    private readonly circuitBreakerService;
    private readonly config;
    private readonly campaignStatusUpdater?;
    private readonly traceContextService?;
    private readonly logger;
    constructor(queueLogRepo: Repository<MessageQueueLogEntity>, accountRepo: Repository<WhatsappAccountEntity>, baileysClientFactory: BaileysClientFactory, circuitBreakerService: ProxyCircuitBreakerService, config: ConfigService, campaignStatusUpdater?: {
        updateRecipientById(id: string, status: string, err?: string): Promise<void>;
    }, traceContextService?: TraceContextService);
    process(job: Job<OutboundMessageJob>): Promise<{
        sentAt: number;
        messageId?: string;
    }>;
    onCompleted(job: Job<OutboundMessageJob>): Promise<void>;
    onFailed(job: Job, err: Error): void;
    onStalled(jobId: string): void;
    private updateJobStatus;
    private getProxyIdForAccount;
}
