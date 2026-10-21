"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EscalationAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationAgentService = void 0;
const common_1 = require("@nestjs/common");
const llm_validator_1 = require("../../../common/guardrails/llm-validator");
const zod_1 = require("zod");
const HandoffSchema = zod_1.z.object({
    customerBrief: zod_1.z.string().max(500),
    suggestedResponse: zod_1.z.string().max(300),
    priority: zod_1.z.union([
        zod_1.z.literal('LOW'), zod_1.z.literal('MEDIUM'), zod_1.z.literal('HIGH'), zod_1.z.literal('URGENT'),
    ]),
    keyFacts: zod_1.z.array(zod_1.z.string()).max(5).default([]),
});
const FALLBACK_HANDOFF = {
    customerBrief: 'Customer requested human assistance.',
    suggestedResponse: 'Hello! How can I assist you today?',
    priority: 'MEDIUM',
    keyFacts: [],
};
let EscalationAgentService = EscalationAgentService_1 = class EscalationAgentService {
    constructor() {
        this.logger = new common_1.Logger(EscalationAgentService_1.name);
    }
    async generateHandoff(chatJid, sessionVariables, memory, currentNodeId) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey)
            return FALLBACK_HANDOFF;
        try {
            const { default: OpenAI } = await Promise.resolve().then(() => require('openai'));
            const openai = new OpenAI({ apiKey });
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                max_tokens: 400,
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
            return (0, llm_validator_1.validateLLM)(HandoffSchema, response.choices[0].message.content, FALLBACK_HANDOFF, 'escalation-agent');
        }
        catch (err) {
            this.logger.warn(`[EscalationAgent] Handoff generation failed: ${err.message}`);
            return FALLBACK_HANDOFF;
        }
    }
};
exports.EscalationAgentService = EscalationAgentService;
exports.EscalationAgentService = EscalationAgentService = EscalationAgentService_1 = __decorate([
    (0, common_1.Injectable)()
], EscalationAgentService);
//# sourceMappingURL=escalation-agent.service.js.map