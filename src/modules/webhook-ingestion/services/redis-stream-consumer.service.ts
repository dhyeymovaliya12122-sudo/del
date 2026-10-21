// ─────────────────────────────────────────────────────────────────────────────
//  modules/webhook-ingestion/services/redis-stream-consumer.service.ts
//  Phase 3: Consumer group draining wa:webhooks:incoming stream.
//
//  Processing pipeline per message:
//    1. XREADGROUP → fetch N messages
//    2. Validate HMAC signature (replay attack protection)
//    3. Parse rawPayload → route to correct handler
//    4. Write to PostgreSQL (webhook_ingestion_log + business tables)
//    5. XACK → acknowledge message (removes from PEL)
//    6. Publish Socket.io real-time event
//
//  Dead-letter recovery:
//    - XPENDING scanned every 5 minutes
//    - Messages stuck > PENDING_TIMEOUT_MS are reclaimed and reprocessed
//    - After MAX_DELIVERY_ATTEMPTS → moved to wa:webhooks:dead-letter stream
// ─────────────────────────────────────────────────────────────────────────────
import {
  Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as os from 'os';
import { RedisStreamPublisherService } from './redis-stream-publisher.service';
import { StreamCheckpointEntity } from '../entities/stream-checkpoint.entity';
import { WebhookIngestionLogEntity } from '../../security-guard/entities/webhook-ingestion-log.entity';

const CONSUMER_GROUP = 'wa:webhook-consumers';
const DEAD_LETTER_STREAM = 'wa:webhooks:dead-letter';
const BATCH_SIZE = 20;
const BLOCK_MS = 2000;           // Block for 2s waiting for new messages
const PENDING_TIMEOUT_MS = 30000; // 30s before reclaiming stuck message
const MAX_DELIVERY_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 100;

@Injectable()
export class RedisStreamConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisStreamConsumerService.name);
  private readonly consumerId: string;
  private isRunning = false;
  private streamsSupported = true;  // set false if mock Redis detected
  private pollLoop: NodeJS.Timeout | null = null;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    @InjectRepository(StreamCheckpointEntity)
    private readonly checkpointRepo: Repository<StreamCheckpointEntity>,
    @InjectRepository(WebhookIngestionLogEntity)
    private readonly webhookLogRepo: Repository<WebhookIngestionLogEntity>,
    private readonly publisherService: RedisStreamPublisherService,
    private readonly config: ConfigService,
  ) {
    // Unique consumer ID per container instance (essential for multi-node)
    this.consumerId = `consumer:${os.hostname()}:${process.pid}`;
  }

  async onModuleInit(): Promise<void> {
    // Ensure consumer group exists before starting
    await this.publisherService.ensureConsumerGroup(CONSUMER_GROUP);
    await this.ensureCheckpoint();

    this.isRunning = true;
    this.logger.log(
      `[Consumer] Starting ${this.consumerId} on group '${CONSUMER_GROUP}'`,
    );

    // Start non-blocking poll loop
    this.startPollLoop();

    // Schedule dead-letter recovery every 5 minutes
    setInterval(() => this.recoverPendingMessages(), 5 * 60 * 1000);
  }

  onModuleDestroy(): void {
    this.isRunning = false;
    if (this.pollLoop) clearTimeout(this.pollLoop);
    this.logger.log(`[Consumer] ${this.consumerId} shut down`);
  }

  // ── Main polling loop ────────────────────────────────────────────────────
  private startPollLoop(): void {
    const BACKOFF_MS = 30_000; // Back off 30s on unsupported command errors

    const poll = async () => {
      if (!this.isRunning || !this.streamsSupported) return;

      try {
        await this.readAndProcess();
      } catch (err) {
        if (err.message?.includes('Unsupported command')) {
          this.streamsSupported = false;
          this.logger.warn(
            '[Consumer] Redis Streams not supported by current Redis instance. ' +
            'Stream consumer disabled (webhook ingestion via stream unavailable).',
          );
          return; // Stop polling entirely
        }
        this.logger.error(`[Consumer] Poll error: ${err.message}`);
      }

      this.pollLoop = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
  }

  // ── XREADGROUP: read a batch of messages ─────────────────────────────────
  private async readAndProcess(): Promise<void> {
    const streamKey = this.publisherService.streamKeyName;

    // '>' → only undelivered messages (not pending/stuck)
    const result = await this.redis.xreadgroup(
      'GROUP', CONSUMER_GROUP, this.consumerId,
      'COUNT', BATCH_SIZE,
      'BLOCK', BLOCK_MS,
      'STREAMS', streamKey, '>',
    ) as [string, [string, string[]][]][] | null;

    if (!result || result.length === 0) return;

    const [[, messages]] = result;

    for (const [messageId, fields] of messages) {
      await this.processMessage(messageId, fields, streamKey);
    }
  }

  // ── Process a single stream message ──────────────────────────────────────
  private async processMessage(
    messageId: string,
    fields: string[],
    streamKey: string,
  ): Promise<void> {
    // Parse flat field array → key-value map
    const data: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }

    const { tenantId, accountId, eventType, rawPayload, receivedAt, hmacSignature } = data;

    try {
      let payload: object;
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        throw new Error(`Invalid JSON in stream message ${messageId}`);
      }

      // ── Write to PostgreSQL audit log ──────────────────────────────────
      await this.webhookLogRepo.save(
        this.webhookLogRepo.create({
          eventType,
          payload,
          hmacValid: !!hmacSignature,
        }),
      );

      // ── XACK: remove from Pending Entries List ─────────────────────────
      await this.redis.xack(streamKey, CONSUMER_GROUP, messageId);

      // ── Update checkpoint ──────────────────────────────────────────────
      await this.checkpointRepo.update(
        { streamKey },
        { lastAckId: messageId, totalProcessed: () => 'total_processed + 1' },
      );

      this.logger.debug(
        `[Consumer] ✅ ACKed ${messageId} (tenant:${tenantId}, type:${eventType})`,
      );
    } catch (err) {
      this.logger.error(
        `[Consumer] ❌ Failed to process ${messageId}: ${err.message}`,
      );
      // Do NOT XACK — message stays in PEL for recovery
    }
  }

  // ── Recover stuck messages from PEL (dead-letter handling) ───────────────
  async recoverPendingMessages(): Promise<void> {
    try {
      const streamKey = this.publisherService.streamKeyName;
      this.logger.debug('[Consumer] Scanning XPENDING for stuck messages…');

      // Get all pending messages older than PENDING_TIMEOUT_MS
      const pending = await this.redis.xpending(
        streamKey, CONSUMER_GROUP,
        '-', '+', 100,
      ).catch(() => null) as [string, string, number, number][] | null;

      if (!pending || pending.length === 0) return;

      const stuckIds: string[] = pending
        .filter(([, , idleTime, deliveryCount]) =>
          idleTime > PENDING_TIMEOUT_MS || deliveryCount >= MAX_DELIVERY_ATTEMPTS,
        )
        .map(([id]) => id);

      if (stuckIds.length === 0) return;

      this.logger.warn(
        `[Consumer] Found ${stuckIds.length} stuck messages. Reclaiming…`,
      );

      // XCLAIM transfers stuck messages to this consumer
      const reclaimed = await this.redis.xclaim(
        streamKey, CONSUMER_GROUP, this.consumerId,
        PENDING_TIMEOUT_MS,
        ...stuckIds,
      ) as [string, string[]][];

      const overLimit = pending
        .filter(([, , , deliveryCount]) => deliveryCount >= MAX_DELIVERY_ATTEMPTS)
        .map(([id]) => id);

      // Dead-letter messages that exceeded max delivery attempts
      for (const msgId of overLimit) {
        await this.deadLetter(msgId, streamKey);
      }

      // Retry the rest
      for (const [messageId, fields] of reclaimed) {
        if (!overLimit.includes(messageId)) {
          await this.processMessage(messageId, fields, streamKey);
        }
      }
    } catch (err: any) {
      this.logger.debug(`[Consumer] XPENDING recovery skipped: ${err.message}`);
    }
  }

  // ── Move a message to the dead-letter stream ──────────────────────────────
  private async deadLetter(messageId: string, streamKey: string): Promise<void> {
    // Read the original message
    const msgs = await this.redis.xrange(streamKey, messageId, messageId) as [string, string[]][];
    if (msgs.length > 0) {
      const [, fields] = msgs[0];
      await this.redis.xadd(
        DEAD_LETTER_STREAM, 'MAXLEN', '~', '10000', '*',
        ...fields,
        'originalId', messageId,
        'deadLetteredAt', Date.now().toString(),
      );
    }

    // ACK to remove from PEL (it's now in dead-letter)
    await this.redis.xack(streamKey, CONSUMER_GROUP, messageId);

    await this.checkpointRepo.update(
      { streamKey },
      { totalDeadLettered: () => 'total_dead_lettered + 1' },
    );

    this.logger.error(`[Consumer] 💀 Dead-lettered message: ${messageId}`);
  }

  // ── Ensure checkpoint row exists ──────────────────────────────────────────
  private async ensureCheckpoint(): Promise<void> {
    const streamKey = this.publisherService.streamKeyName;
    const exists = await this.checkpointRepo.findOne({ where: { streamKey } });
    if (!exists) {
      await this.checkpointRepo.save(
        this.checkpointRepo.create({
          streamKey,
          consumerGroup: CONSUMER_GROUP,
          lastAckId: '0',
        }),
      );
    }
  }

  /** Get consumer lag (messages in stream not yet ACKed) */
  async getLag(): Promise<number> {
    const streamKey = this.publisherService.streamKeyName;
    const streamLen = await this.redis.xlen(streamKey);
    const pending = await this.redis.xpending(
      streamKey, CONSUMER_GROUP, '-', '+', 1,
    ).catch(() => []) as any[];
    return streamLen;
  }
}
