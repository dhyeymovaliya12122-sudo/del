// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/chatbot/services/escalation-agent.service.ts        [F-11]
//
//  Autonomous escalation briefing agent.
//  Replaces the static escalation node with an LLM-generated structured
//  handoff summary for human agents arriving in the dashboard.
//
//  Runs in parallel with the user-facing escalation message — zero added
//  latency to the customer. Failure is non-fatal (falls back to basic escalate).
//
//  Requires: OPENAI_API_KEY
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { validateLLM } from '../../../common/guardrails/llm-validator';
import { z } from 'zod';

const HandoffSchema = z.object({
  customerBrief:     z.string().max(500),
  suggestedResponse: z.string().max(300),
  priority: z.union([
    z.literal('LOW'), z.literal('MEDIUM'), z.literal('HIGH'), z.literal('URGENT'),
  ]),
  keyFacts: z.array(z.string()).max(5).default([]),
});

export type HandoffBrief = z.infer<typeof HandoffSchema>;

const FALLBACK_HANDOFF: HandoffBrief = {
  customerBrief:     'Customer requested human assistance.',
  suggestedResponse: 'Hello! How can I assist you today?',
  priority:          'MEDIUM',
  keyFacts:          [],
};

@Injectable()
export class EscalationAgentService {
  private readonly logger = new Logger(EscalationAgentService.name);

  async generateHandoff(
    chatJid: string,
    sessionVariables: Record<string, any>,
    memory: Record<string, any>,
    currentNodeId: string,
  ): Promise<HandoffBrief> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return FALLBACK_HANDOFF;

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      const response = await openai.chat.completions.create({
        model:           'gpt-4o',   // High-stakes, customer-facing — use flagship
        max_tokens:      400,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a CRM handoff generator. Produce a structured briefing for a human support agent.
Return ONLY valid JSON:
{
  "customerBrief": "Name, context, what they need, their sentiment (max 3 sentences)",
  "suggestedResponse": "A warm, contextual first message the agent should send",
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "keyFacts": ["fact1", "fact2", "fact3"]
}
Priority guide: URGENT if angry/complaint, HIGH if payment/order issue, MEDIUM for general, LOW for info only.`,
          },
          {
            role: 'user',
            content: `Session data: ${JSON.stringify(sessionVariables).slice(0, 1000)}
Memory (past interactions): ${JSON.stringify(memory).slice(0, 500)}
Flow ended at node: ${currentNodeId}`,
          },
        ],
      });

      return validateLLM(
        HandoffSchema,
        response.choices[0].message.content,
        FALLBACK_HANDOFF,
        'escalation-agent',
      );
    } catch (err: any) {
      this.logger.warn(`[EscalationAgent] Handoff generation failed: ${err.message}`);
      return FALLBACK_HANDOFF;
    }
  }
}
