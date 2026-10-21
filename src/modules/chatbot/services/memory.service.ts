// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/chatbot/services/memory.service.ts                  [F-2]
//
//  Two-method API for the conversational memory layer:
//    hydrate() — called at session START to inject past facts (~3ms PG read)
//    persist()  — called at session END to fire async BullMQ summarisation job
//
//  Zero latency impact on live conversations — summarisation is fully async.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConversationMemoryEntity } from '../entities/conversation-memory.entity';
import { ChatSessionState } from './chatbot-state-machine.service';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @InjectRepository(ConversationMemoryEntity)
    private readonly repo: Repository<ConversationMemoryEntity>,
    @InjectQueue('memory-summariser')
    private readonly queue: Queue,
  ) {}

  /**
   * Called at session START in startFlow().
   * Single indexed PostgreSQL read — ~3ms.
   * Returns keyFacts to be merged into session.variables.
   */
  async hydrate(accountId: string, senderJid: string): Promise<Record<string, any>> {
    try {
      const mem = await this.repo.findOne({ where: { accountId, senderJid } });
      if (mem?.keyFacts && Object.keys(mem.keyFacts).length > 0) {
        this.logger.debug(`[Memory] Hydrated facts for ${senderJid} (sessions: ${mem.sessionCount})`);
      }
      return mem?.keyFacts ?? {};
    } catch (err: any) {
      // Never block session start due to memory read failure
      this.logger.warn(`[Memory] Hydrate failed for ${senderJid}: ${err.message}`);
      return {};
    }
  }

  /**
   * Called at session END (status COMPLETED | ESCALATED).
   * Dispatches to BullMQ — returns immediately, zero latency to user.
   */
  async persist(
    accountId: string,
    senderJid: string,
    session: ChatSessionState,
  ): Promise<void> {
    try {
      await this.queue.add(
        'summarise',
        {
          accountId,
          senderJid,
          transcript: session.variables,
          endStatus: session.status,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 50,
          removeOnFail: 20,
        },
      );
      this.logger.debug(`[Memory] Queued summarisation for ${senderJid}`);
    } catch (err: any) {
      // Non-critical — session can end without memory persistence
      this.logger.warn(`[Memory] Failed to queue summarisation for ${senderJid}: ${err.message}`);
    }
  }
}
