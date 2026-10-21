export type LLMTask = 'intent_classify' | 'slot_extract' | 'memory_summarise' | 'injection_check' | 'campaign_segment' | 'faq_answer' | 'escalation_handoff' | 'hyde_generate';
export interface ModelConfig {
    model: string;
    maxTokens: number;
    temperature: number;
}
export declare class ModelRouterService {
    route(task: LLMTask, inputText?: string): ModelConfig;
    model(task: LLMTask, inputText?: string): string;
}
