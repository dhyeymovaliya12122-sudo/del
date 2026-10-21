// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/chatbot/workers/memory-summariser.worker.ts         [F-2]
//
//  BullMQ worker that compresses session transcripts into structured facts
//  and upserts them into the conversation_memory table.
//
//  Runs asynchronously — never in the critical path of a live conversation.
//  Uses gpt-4o-mini (cheap compression task, ~$0.00003/job).
// ─────────────────────────────────────────────────────────────────────────────
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ConversationMemoryEntity } from '../entities/conversation-memory.entity';
import { validateLLM } from '../../../common/guardrails/llm-validator';
import { z } from 'zod';

const MemoryFactsSchema = z.object({
  summary:      z.string().max(500),
  name:         z.string().nullable().optional(),
  city:         z.string().nullable().optional(),
  language:     z.string().default('en'),
  lastIntent:   z.string().nullable().optional(),
  sentiment:    z.union([z.literal('positive'), z.literal('neutral'), z.literal('negative')]).default('neutral'),
  customFields: z.record(z.string(), z.string()).default({}),
});

const FACTS_FALLBACK = {
  summary: '',
  name: null,
  city: null,
  language: 'en',
  lastIntent: null,
  sentiment: 'neutral' as const,
  customFields: {},
};

@Processor('memory-summariser', { concurrency: 5 })
export class MemorySummariserWorker extends WorkerHost {
  private readonly logger = new Logger(MemorySummariserWorker.name);

  constructor(
    @InjectRepository(ConversationMemoryEntity)
    private readonly repo: Repository<ConversationMemoryEntity>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { accountId, senderJid, transcript } = job.data;

    this.logger.debug(`[MemoryWorker] Summarising session for ${senderJid}`);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('[MemoryWorker] OPENAI_API_KEY not set — skipping summarisation');
      return;
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      const response = await openai.chat.completions.create({
        model:           'gpt-4o-mini',
        max_tokens:      280,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Extract key facts from this WhatsApp conversation session.
Return ONLY valid JSON matching exactly:
{
  "summary": "1-2 sentences describing the conversation",
  "name": "customer name or null",
  "city": "city mentioned or null",
  "language": "2-letter ISO code (en/hi/ar/id/pt/es)",
  "lastIntent": "what they were trying to do",
  "sentiment": "positive | neutral | negative",
  "customFields": { "key": "value for any other important facts" }
}`,
          },
          {
            role: 'user',
            content: `Session transcript (variables captured): ${JSON.stringify(transcript).slice(0, 2000)}`,
          },
        ],
      });

      const facts = validateLLM(
        MemoryFactsSchema,
        response.choices[0].message.content,
        FACTS_FALLBACK,
        'memory-summariser',
      );

      if (!facts.summary) {
        this.logger.debug(`[MemoryWorker] Empty summary for ${senderJid} — skipping upsert`);
        return;
      }

      // Dialect-safe upsert across SQLite and PostgreSQL
      const existing = await this.repo.findOne({ where: { accountId, senderJid } });
      if (existing) {
        await this.repo.update(
          { accountId, senderJid },
          {
            summary: facts.summary,
            keyFacts: facts as any,
            sessionCount: (existing.sessionCount || 0) + 1,
            updatedAt: new Date(),
          },
        );
      } else {
        await this.repo.save(
          this.repo.create({
            accountId,
            senderJid,
            summary: facts.summary,
            keyFacts: facts as any,
            sessionCount: 1,
          }),
        );
      }

      this.logger.log(`[MemoryWorker] ✅ Memory updated for ${senderJid} (sentiment: ${facts.sentiment})`);
    } catch (err: any) {
      this.logger.error(`[MemoryWorker] Failed for ${senderJid}: ${err.message}`);
      throw err; // Re-throw → BullMQ exponential backoff retry
    }
  }
}
