"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    ai: {
        enableLlmIntent: process.env.ENABLE_LLM_INTENT === 'true',
        enableTypingIndicator: process.env.ENABLE_TYPING_INDICATOR === 'true',
        enableShield: process.env.ENABLE_SHIELD === 'true',
        enableMemory: process.env.ENABLE_MEMORY === 'true',
        enableRag: process.env.ENABLE_RAG === 'true',
        enableEscalationAgent: process.env.ENABLE_ESCALATION_AGENT === 'true',
        enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
        enableLangsmith: !!process.env.LANGSMITH_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        langsmithApiKey: process.env.LANGSMITH_API_KEY,
        llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS ?? '500'),
        intentConfidenceMin: parseFloat(process.env.INTENT_CONFIDENCE_MIN ?? '0.78'),
    },
});
//# sourceMappingURL=ai-features.config.js.map