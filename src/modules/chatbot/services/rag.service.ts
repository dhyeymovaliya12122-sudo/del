// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/chatbot/services/rag.service.ts                     [F-3]
//
//  pgvector RAG pipeline with HyDE + hybrid BM25/vector re-ranking.
//  Used for 'knowledge_base' FSM node type.
//
//  Pipeline (per request):
//    1. HyDE: generate hypothetical answer from gpt-4o-mini
//    2. Embed the hypothetical answer (256-dim, text-embedding-3-small)
//    3. Hybrid search: 70% vector cosine + 30% BM25 trigram (pg_trgm)
//    4. Grounded final answer from gpt-4o with retrieved context
//
//  Prerequisite SQL (run once):
//    CREATE EXTENSION IF NOT EXISTS vector;
//    CREATE EXTENSION IF NOT EXISTS pg_trgm;
//    (see migration in architecture report)
//
//  Requires: ENABLE_RAG=true, OPENAI_API_KEY
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { validateLLM, isSafeContent, SAFE_FALLBACK_MSG } from '../../../common/guardrails/llm-validator';
import { z } from 'zod';

const NO_ANSWER = "I don't have that information right now. Let me connect you to our team.";

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async answer(question: string, accountId: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('[RAG] OPENAI_API_KEY not set — returning fallback');
      return NO_ANSWER;
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    try {
      // ── STEP 1: HyDE — embed a HYPOTHETICAL answer, not the raw question ──
      // Short WhatsApp messages ("price?", "open?") embed poorly.
      // A hypothetical paragraph-length answer has rich semantic signal.
      const hypo = await openai.chat.completions.create({
        model:      'gpt-4o-mini',
        max_tokens: 180,
        messages:   [{ role: 'user', content: `Write a detailed answer to: "${question}"` }],
      });
      const hypoText = hypo.choices[0].message.content ?? question;

      // ── STEP 2: Embed hypothetical answer (256-dim) ───────────────────────
      const embRes = await openai.embeddings.create({
        model:      'text-embedding-3-small',
        input:      hypoText,
        dimensions: 256,
      });
      const vec = JSON.stringify(embRes.data[0].embedding);

      // ── STEP 3: Hybrid search — 70% vector + 30% trigram BM25 ────────────
      const chunks: Array<{ content: string; hybrid_score: number }> =
        await this.ds.query(
          `
          SELECT content,
                 (1 - (embedding <=> $1::vector)) * 0.7
                 + similarity(content, $3)         * 0.3  AS hybrid_score
          FROM   knowledge_chunks
          WHERE  account_id = $2
            AND  (1 - (embedding <=> $1::vector)) > 0.60
          ORDER  BY hybrid_score DESC
          LIMIT  5
          `,
          [vec, accountId, question],
        );

      if (!chunks.length) {
        this.logger.debug(`[RAG] No chunks found for "${question.slice(0, 40)}" in account ${accountId}`);
        return NO_ANSWER;
      }

      // ── STEP 4: Grounded final answer ─────────────────────────────────────
      const context = chunks
        .slice(0, 3)
        .map(c => c.content)
        .join('\n\n---\n\n');

      const final = await openai.chat.completions.create({
        model:       'gpt-4o',
        max_tokens:  130,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `Answer using ONLY the provided context. Be concise (max 2 sentences).
If context is insufficient, respond exactly: "${NO_ANSWER}"
Never invent information not present in the context.`,
          },
          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}`,
          },
        ],
      });

      const answer = final.choices[0].message.content ?? NO_ANSWER;

      // Content safety gate before returning to user
      return isSafeContent(answer) ? answer : SAFE_FALLBACK_MSG;

    } catch (err: any) {
      this.logger.error(`[RAG] Pipeline failed: ${err.message}`);
      return NO_ANSWER;
    }
  }
}
