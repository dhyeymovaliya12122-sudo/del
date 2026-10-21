// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/chatbot/services/analytics-emitter.service.ts       [F-13]
//
//  Appends structured events to a per-account Redis Stream.
//  Overhead: < 1ms per event (XADD is O(log N)).
//  Stream is auto-trimmed to last 100k events per account.
//
//  Events: flow_start | node_enter | flow_complete | flow_escalate |
//          flow_abandon | cache_hit | llm_call
//
//  Dashboard queries the stream on a 5-min cron and materialises
//  aggregates into a chatbot_analytics PostgreSQL table.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';

export type AnalyticsEventType =
  | 'flow_start'
  | 'node_enter'
  | 'flow_complete'
  | 'flow_escalate'
  | 'flow_abandon'
  | 'cache_hit'
  | 'llm_call'
  | 'injection_blocked';

export interface AnalyticsEvent {
  type:        AnalyticsEventType;
  accountId:   string;
  flowId?:     string;
  nodeId?:     string;
  nodeType?:   string;
  senderJid?:  string;
  latencyMs?:  number;
  model?:      string;
  cacheHit?:   boolean;
  timestamp?:  number;
}

@Injectable()
export class AnalyticsEmitterService {
  private readonly logger = new Logger(AnalyticsEmitterService.name);
  private readonly STREAM_MAX_LEN = 100_000;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Emit a structured analytics event to the account's Redis Stream.
   * Non-blocking — failure is silently logged, never thrown.
   */
  async emit(event: AnalyticsEvent): Promise<void> {
    try {
      await this.redis.xadd(
        `wa:analytics:${event.accountId}`,
        'MAXLEN', '~', String(this.STREAM_MAX_LEN),
        '*',
        'event', JSON.stringify({ ...event, timestamp: event.timestamp ?? Date.now() }),
      );
    } catch (err: any) {
      // Never let analytics failure affect message delivery
      this.logger.warn(`[Analytics] emit failed: ${err.message}`);
    }
  }

  /**
   * Read the last N events for an account (for dashboard API).
   */
  async getRecent(accountId: string, count = 1000): Promise<AnalyticsEvent[]> {
    const entries = await this.redis.xrevrange(
      `wa:analytics:${accountId}`,
      '+', '-',
      'COUNT', count,
    );
    return entries
      .map(([, fields]) => {
        try {
          return JSON.parse(fields[1]) as AnalyticsEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is AnalyticsEvent => e !== null);
  }
}
