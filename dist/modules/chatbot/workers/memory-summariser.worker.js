"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MemorySummariserWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySummariserWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const conversation_memory_entity_1 = require("../entities/conversation-memory.entity");
const llm_validator_1 = require("../../../common/guardrails/llm-validator");
const zod_1 = require("zod");
const MemoryFactsSchema = zod_1.z.object({
    summary: zod_1.z.string().max(500),
    name: zod_1.z.string().nullable().optional(),
    city: zod_1.z.string().nullable().optional(),
    language: zod_1.z.string().default('en'),
    lastIntent: zod_1.z.string().nullable().optional(),
    sentiment: zod_1.z.union([zod_1.z.literal('positive'), zod_1.z.literal('neutral'), zod_1.z.literal('negative')]).default('neutral'),
    customFields: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
});
const FACTS_FALLBACK = {
    summary: '',
    name: null,
    city: null,
    language: 'en',
    lastIntent: null,
    sentiment: 'neutral',
    customFields: {},
};
let MemorySummariserWorker = MemorySummariserWorker_1 = class MemorySummariserWorker extends bullmq_1.WorkerHost {
    constructor(repo) {
        super();
        this.repo = repo;
        this.logger = new common_1.Logger(MemorySummariserWorker_1.name);
    }
    async process(job) {
        const { accountId, senderJid, transcript } = job.data;
        this.logger.debug(`[MemoryWorker] Summarising session for ${senderJid}`);
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            this.logger.warn('[MemoryWorker] OPENAI_API_KEY not set — skipping summarisation');
            return;
        }
        try {
            const { default: OpenAI } = await Promise.resolve().then(() => require('openai'));
            const openai = new OpenAI({ apiKey });
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                max_tokens: 280,
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
            const facts = (0, llm_validator_1.validateLLM)(MemoryFactsSchema, response.choices[0].message.content, FACTS_FALLBACK, 'memory-summariser');
            if (!facts.summary) {
                this.logger.debug(`[MemoryWorker] Empty summary for ${senderJid} — skipping upsert`);
                return;
            }
            const existing = await this.repo.findOne({ where: { accountId, senderJid } });
            if (existing) {
                await this.repo.update({ accountId, senderJid }, {
                    summary: facts.summary,
                    keyFacts: facts,
                    sessionCount: (existing.sessionCount || 0) + 1,
                    updatedAt: new Date(),
                });
            }
            else {
                await this.repo.save(this.repo.create({
                    accountId,
                    senderJid,
                    summary: facts.summary,
                    keyFacts: facts,
                    sessionCount: 1,
                }));
            }
            this.logger.log(`[MemoryWorker] ✅ Memory updated for ${senderJid} (sentiment: ${facts.sentiment})`);
        }
        catch (err) {
            this.logger.error(`[MemoryWorker] Failed for ${senderJid}: ${err.message}`);
            throw err;
        }
    }
};
exports.MemorySummariserWorker = MemorySummariserWorker;
exports.MemorySummariserWorker = MemorySummariserWorker = MemorySummariserWorker_1 = __decorate([
    (0, bullmq_1.Processor)('memory-summariser', { concurrency: 5 }),
    __param(0, (0, typeorm_1.InjectRepository)(conversation_memory_entity_1.ConversationMemoryEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MemorySummariserWorker);
//# sourceMappingURL=memory-summariser.worker.js.map