// ─────────────────────────────────────────────────────────────────────────────
//  src/config/ai-features.config.ts                                [D-1]
//
//  Central feature-flag registry for all AI capabilities.
//  Load via ConfigModule.forRoot({ load: [aiFeatures] }) in AppModule.
//
//  All flags default OFF — the deterministic FSM runs unchanged until
//  each flag is explicitly enabled in .env.
// ─────────────────────────────────────────────────────────────────────────────
export default () => ({
  ai: {
    // ── Core intelligence ────────────────────────────────────────────────
    /** LLM intent router replaces keyword .includes() in matchFlow() */
    enableLlmIntent:       process.env.ENABLE_LLM_INTENT        === 'true',
    /** WhatsApp "composing..." presence before any bot reply */
    enableTypingIndicator: process.env.ENABLE_TYPING_INDICATOR   === 'true',
    /** Prompt-injection pattern shield before LLM calls */
    enableShield:          process.env.ENABLE_SHIELD             === 'true',

    // ── Memory & personalisation ─────────────────────────────────────────
    /** Three-tier conversational memory (episodic PostgreSQL persistence) */
    enableMemory:          process.env.ENABLE_MEMORY             === 'true',

    // ── Knowledge base ───────────────────────────────────────────────────
    /** pgvector RAG pipeline for knowledge_base FSM nodes */
    enableRag:             process.env.ENABLE_RAG                === 'true',

    // ── Escalation ───────────────────────────────────────────────────────
    /** AI-generated CRM handoff brief on escalate node */
    enableEscalationAgent: process.env.ENABLE_ESCALATION_AGENT   === 'true',

    // ── Observability ────────────────────────────────────────────────────
    /** Redis Streams analytics pipeline */
    enableAnalytics:       process.env.ENABLE_ANALYTICS          === 'true',
    /** LangSmith distributed tracing (auto-enabled when API key is present) */
    enableLangsmith:       !!process.env.LANGSMITH_API_KEY,

    // ── Credentials ─────────────────────────────────────────────────────
    openaiApiKey:          process.env.OPENAI_API_KEY,
    langsmithApiKey:       process.env.LANGSMITH_API_KEY,

    // ── Tuning ──────────────────────────────────────────────────────────
    /** Hard timeout for LLM calls before falling back to FSM (ms) */
    llmTimeoutMs:          parseInt(process.env.LLM_TIMEOUT_MS   ?? '500'),
    /** Confidence threshold for LLM intent → FSM fallback below this */
    intentConfidenceMin:   parseFloat(process.env.INTENT_CONFIDENCE_MIN ?? '0.78'),
  },
});
