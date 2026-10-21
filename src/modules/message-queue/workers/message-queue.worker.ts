// ─────────────────────────────────────────────────────────────────────────────
//  modules/message-queue/workers/message-queue.worker.ts
//  Phase 2: BullMQ processor — sends WhatsApp messages via Baileys
//
//  Concurrency: BULLMQ_CONCURRENCY (default: 2) per worker instance
//  Rate limit enforced at queue level (max N msg/sec per account)
//
//  On job failure:
//    - Exponential backoff (attempts × BULLMQ_BACKOFF_DELAY_MS)
//    - If proxy circuit OPENS during send → job moved to FAILED immediately
//    - DB audit log updated for each state transition
// ─────────────────────────────────────────────────────────────────────────────
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MessageQueueLogEntity } from '../entities/message-queue-log.entity';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
import { ProxyCircuitBreakerService } from '../../proxy-circuit-breaker/services/proxy-circuit-breaker.service';
import { OutboundMessageJob } from '../services/outbound-message-queue.service';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import { TraceContextService } from '../../telemetry/services/trace-context.service';

@Processor('outbound-messages', {
  concurrency: parseInt(process.env.BULLMQ_CONCURRENCY ?? '2', 10),
  stalledInterval: parseInt(process.env.BULLMQ_STALLED_INTERVAL_MS ?? '30000', 10),
})
export class MessageQueueWorker extends WorkerHost {
  private readonly logger = new Logger(MessageQueueWorker.name);

  constructor(
    @InjectRepository(MessageQueueLogEntity)
    private readonly queueLogRepo: Repository<MessageQueueLogEntity>,
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo: Repository<WhatsappAccountEntity>,
    private readonly baileysClientFactory: BaileysClientFactory,
    private readonly circuitBreakerService: ProxyCircuitBreakerService,
    private readonly config: ConfigService,
    // Optional: injected lazily to avoid circular dep between MessageQueueModule ↔ CampaignsModule
    // CampaignsModule imports MessageQueueModule, so we use ModuleRef or optional injection here.
    @Optional() private readonly campaignStatusUpdater?: {
      updateRecipientById(id: string, status: string, err?: string): Promise<void>;
    },
    @Optional() private readonly traceContextService?: TraceContextService,
  ) {
    super();
  }

  async process(job: Job<OutboundMessageJob>): Promise<{ sentAt: number; messageId?: string }> {
    const { accountId, to, type, payload, tenantId, traceId, spanId } = job.data;

    this.logger.log(
      `[Worker] Processing job ${job.id}: ${type} → ${to} (account: ${accountId}, attempt: ${job.attemptsMade + 1})`,
    );

    // ── OpenTelemetry Lifecycle: queue_delay & noise_ack ─────────────────
    let noiseAckSpanId: string | undefined;
    if (traceId && this.traceContextService) {
      const enqueuedAt = (job.data as any).enqueuedAt || job.timestamp || Date.now();
      const delayMs = Math.max(0, Date.now() - enqueuedAt);

      const queueDelaySpan = this.traceContextService.startChildSpan(
        traceId,
        'queue_delay',
        spanId,
        { attemptsMade: job.attemptsMade, delayMs },
      );
      this.traceContextService.endSpan(traceId, queueDelaySpan.spanId, { delayMs });

      const noiseSpan = this.traceContextService.startChildSpan(
        traceId,
        'noise_ack',
        queueDelaySpan.spanId,
        { accountId, to, type },
      );
      noiseAckSpanId = noiseSpan.spanId;
    }

    // ── Update audit log to ACTIVE ────────────────────────────────────────
    await this.updateJobStatus(job.id!, accountId, 'active', job.attemptsMade + 1);

    // ── Get Baileys client for this account ───────────────────────────────
    const clientInstance = this.baileysClientFactory.getClient(accountId);
    if (!clientInstance) {
      if (traceId && noiseAckSpanId && this.traceContextService) {
        this.traceContextService.endSpan(traceId, noiseAckSpanId, { error: 'Client not hydrated' }, 'error');
      }
      throw new Error(
        `No active Baileys client for account ${accountId}. Session may not be hydrated.`,
      );
    }

    const { socket } = clientInstance;

    try {
      const deliverableJid = await this.baileysClientFactory.resolveDeliverableJid(accountId, to);
      let result: { key: { id?: string } };

      switch (type) {
        case 'text':
          result = await socket.sendMessage(deliverableJid, { text: payload.text ?? '' });
          break;

        case 'image':
        case 'audio':
        case 'video':
        case 'document':
          // Media is already in R2; we send the presigned URL reference
          result = await socket.sendMessage(deliverableJid, {
            [type]: { url: payload.text ?? '' },
            caption: payload.caption,
          } as any);
          break;

        case 'template':
          // WhatsApp template message (HSM)
          result = await socket.sendMessage(deliverableJid, {
            templateMessage: {
              hydratedTemplate: {
                templateId: payload.templateName,
                hydratedContentText: payload.templateParams?.join('\n'),
              },
            },
          } as any);
          break;

        default:
          throw new Error(`Unknown message type: ${type}`);
      }

      const sentMessageId = result?.key?.id;
      this.logger.log(
        `[Worker] ✅ Sent ${type} to ${to} (msgId: ${sentMessageId}, job: ${job.id})`,
      );

      if (traceId && noiseAckSpanId && this.traceContextService) {
        this.traceContextService.endSpan(
          traceId,
          noiseAckSpanId,
          { messageId: sentMessageId, status: 'carrier_ack' },
          'completed',
        );
      }

      await this.updateJobStatus(job.id!, accountId, 'completed', job.attemptsMade + 1);
      return { sentAt: Date.now(), messageId: sentMessageId };
    } catch (err: any) {
      this.logger.error(
        `[Worker] ❌ Failed to send ${type} to ${to}: ${err.message}`,
      );

      if (traceId && noiseAckSpanId && this.traceContextService) {
        this.traceContextService.endSpan(
          traceId,
          noiseAckSpanId,
          { error: err.message },
          'error',
        );
      }

      // Record failure on the proxy's circuit breaker
      const proxyId = await this.getProxyIdForAccount(accountId);
      if (proxyId) {
        await this.circuitBreakerService.recordFailure(proxyId, accountId);
      }

      await this.updateJobStatus(job.id!, accountId, 'failed', job.attemptsMade + 1, err.message);
      throw err;  // Re-throw for BullMQ retry mechanism
    }
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<OutboundMessageJob>) {
    this.logger.debug(`[Worker] Job ${job.id} completed`);

    // Update campaign recipient status when this job was dispatched by CampaignsService
    const { recipientId, campaignId } = (job.data.metadata ?? {}) as Record<string, string>;
    if (recipientId && this.campaignStatusUpdater) {
      await this.campaignStatusUpdater
        .updateRecipientById(recipientId, 'sent')
        .catch(err => this.logger.warn(`[Worker] Failed to update recipient ${recipientId}: ${err.message}`));
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.warn(`[Worker] Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.error(`[Worker] Job ${jobId} STALLED — possible hung send operation`);
  }

  private async updateJobStatus(
    jobId: string,
    accountId: string,
    status: MessageQueueLogEntity['status'],
    attempt: number,
    errorMessage?: string,
  ): Promise<void> {
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

  private async getProxyIdForAccount(accountId: string): Promise<string | null> {
    try {
      const account = await this.accountRepo.findOne({
        where: { id: accountId },
        select: ['id', 'proxyId'],
      });
      return account?.proxyId ?? null;
    } catch (err: any) {
      this.logger.warn(`Failed to resolve proxy ID for account ${accountId}: ${err.message}`);
      return null;
    }
  }
}
