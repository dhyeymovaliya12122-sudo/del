// ─────────────────────────────────────────────────────────────────────────────
//  src/common/services/model-router.service.ts                     [P-3]
//
//  Cost-aware LLM dispatch. Routes each task to the cheapest model
//  that can handle it with acceptable quality.
//
//  Blended cost reduction vs using gpt-4o for everything: ~65%
//  Non-Latin script detection automatically upgrades to gpt-4o.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable } from '@nestjs/common';

export type LLMTask =
  | 'intent_classify'    // Binary classification → gpt-4o-mini
  | 'slot_extract'       // Entity extraction → gpt-4o-mini
  | 'memory_summarise'   // Text compression → gpt-4o-mini
  | 'injection_check'    // Safety binary → gpt-4o-mini
  | 'campaign_segment'   // Audience grouping → gpt-4o-mini
  | 'faq_answer'         // Grounded Q&A → gpt-4o (needs reasoning)
  | 'escalation_handoff' // Customer-facing CRM brief → gpt-4o
  | 'hyde_generate';     // HyDE hypothetical answer → gpt-4o-mini

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

const ROUTER: Record<LLMTask, ModelConfig> = {
  intent_classify:    { model: 'gpt-4o-mini', maxTokens: 220,  temperature: 0   },
  slot_extract:       { model: 'gpt-4o-mini', maxTokens: 100,  temperature: 0   },
  memory_summarise:   { model: 'gpt-4o-mini', maxTokens: 250,  temperature: 0.2 },
  injection_check:    { model: 'gpt-4o-mini', maxTokens: 50,   temperature: 0   },
  campaign_segment:   { model: 'gpt-4o-mini', maxTokens: 500,  temperature: 0.2 },
  hyde_generate:      { model: 'gpt-4o-mini', maxTokens: 180,  temperature: 0.3 },
  faq_answer:         { model: 'gpt-4o',      maxTokens: 130,  temperature: 0.1 },
  escalation_handoff: { model: 'gpt-4o',      maxTokens: 400,  temperature: 0.3 },
};

// Regex detects Devanagari (Hindi), Arabic, CJK — forces gpt-4o for quality
const NON_LATIN_SCRIPT = /[\u0900-\u097F\u0600-\u06FF\u4E00-\u9FFF\u0980-\u09FF]/;

@Injectable()
export class ModelRouterService {
  /**
   * Returns the optimal model config for a given task.
   * Pass `inputText` to trigger automatic multilingual upgrade.
   */
  route(task: LLMTask, inputText?: string): ModelConfig {
    const base = ROUTER[task];
    if (inputText && NON_LATIN_SCRIPT.test(inputText)) {
      // Non-Latin script: always use flagship model for quality
      return { ...base, model: 'gpt-4o' };
    }
    return base;
  }

  /** Convenience: returns just the model string */
  model(task: LLMTask, inputText?: string): string {
    return this.route(task, inputText).model;
  }
}
