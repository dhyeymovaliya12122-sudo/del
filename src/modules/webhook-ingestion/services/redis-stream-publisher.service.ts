// ─────────────────────────────────────────────────────────────────────────────
//  modules/webhook-ingestion/services/redis-stream-publisher.service.ts
//  Phase 3: Writes incoming Meta/WhatsApp webhooks to a Redis Stream.
//
//  This is called by the webhook controller INSTEAD of writing to DB.
//  The HTTP handler returns 200 immediately — Meta never retries.
//
//  Redis Stream entry fields:
//    tenantId      → UUID of tenant
//    accountId     → WhatsApp account UUID
//    eventType     → messages | statuses | message_template_status_update
//    rawPayload    → full JSON body (stringified)
//    receivedAt    → Unix timestamp ms
//    hmacSignature → original X-Hub-Signature-256 header for replay validation
//    instanceId    → NestJS container hostname (for multi-node tracing)
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
import * as os from 'os';

export interface WebhookStreamEntry {
  tenantId: string;
  accountId: string;
  eventType: string;
  rawPayload: object;
  hmacSignature?: string;
}

export interface PublishResult {
  streamId: string;   // Redis message ID (e.g. "1700000000000-0")
  streamLen: number;  // Current stream length (for monitoring)
}

@Injectable()
export class RedisStreamPublisherService {
  private readonly logger = new Logger(RedisStreamPublisherService.name);

  private readonly streamKey: string;
  private readonly maxStreamLen: number;
  private readonly instanceId: string;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {
    this.streamKey = config.get<string>('REDIS_STREAM_KEY', 'wa:webhooks:incoming');
    // MAXLEN ~ prevents unbounded stream growth (approx trim)
    this.maxStreamLen = config.get<number>('REDIS_STREAM_MAX_LEN', 100000);
    this.instanceId = os.hostname();
  }

  /**
   * Publish a webhook payload to the Redis Stream.
   * Called by the webhook controller — returns immediately after XADD.
   * No DB I/O, no processing. Just buffer.
   */
  async publish(entry: WebhookStreamEntry): Promise<PublishResult> {
    const fields: string[] = [
      'tenantId',      entry.tenantId,
      'accountId',     entry.accountId,
      'eventType',     entry.eventType,
      'rawPayload',    JSON.stringify(entry.rawPayload),
      'receivedAt',    Date.now().toString(),
      'instanceId',    this.instanceId,
    ];

    if (entry.hmacSignature) {
      fields.push('hmacSignature', entry.hmacSignature);
    }

    let streamId: string;
    let streamLen = 0;
    try {
      streamId = await this.redis.xadd(
        this.streamKey,
        'MAXLEN', '~', this.maxStreamLen.toString(),
        '*',
        ...fields,
      ) as string;

      streamLen = await this.redis.xlen(this.streamKey);
    } catch (err: any) {
      if (err.message?.includes('Unsupported command') || err.message?.includes('xadd')) {
        streamId = `mock_stream_${Date.now()}`;
        this.logger.debug(`[Stream] Mock Redis in use. Emulated stream buffer id: ${streamId}`);
        return { streamId, streamLen: 1 };
      }
      throw err;
    }

    this.logger.debug(
      `[Stream] XADD ${this.streamKey} → id:${streamId} (len:${streamLen}, tenant:${entry.tenantId})`,
    );

    if (streamLen > this.maxStreamLen * 0.9) {
      this.logger.warn(
        `[Stream] ⚠️  Stream ${this.streamKey} at ${Math.round(streamLen / this.maxStreamLen * 100)}% capacity`,
      );
    }

    return { streamId, streamLen };
  }

  /**
   * Ensure the consumer group exists (idempotent).
   * Called once on module init by the consumer service.
   */
  async ensureConsumerGroup(groupName: string): Promise<void> {
    try {
      // MKSTREAM creates the stream if it doesn't exist
      await this.redis.xgroup('CREATE', this.streamKey, groupName, '$', 'MKSTREAM');
      this.logger.log(
        `[Stream] Consumer group '${groupName}' created on stream '${this.streamKey}'`,
      );
    } catch (err) {
      // BUSYGROUP = group already exists, safe to ignore
      // Also ignore mock Redis errors (ioredis-mock doesn't support XGROUP)
      if (!err.message?.includes('BUSYGROUP')) {
        this.logger.warn(`[Stream] Consumer group init skipped: ${err.message}`);
        // Don't throw — allow app to continue without stream support
      }
      this.logger.debug(`[Stream] Consumer group '${groupName}' already exists`);
    }
  }

  /** Stream health info (for /health endpoint) */
  async getStreamInfo(): Promise<{ length: number; groups: number }> {
    const length = await this.redis.xlen(this.streamKey);
    const groups = await this.redis.xinfo('GROUPS', this.streamKey).catch(() => []) as any[];
    return { length, groups: groups.length };
  }

  get streamKeyName(): string {
    return this.streamKey;
  }
}
