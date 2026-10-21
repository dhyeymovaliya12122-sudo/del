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
var RagService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const llm_validator_1 = require("../../../common/guardrails/llm-validator");
const NO_ANSWER = "I don't have that information right now. Let me connect you to our team.";
let RagService = RagService_1 = class RagService {
    constructor(ds) {
        this.ds = ds;
        this.logger = new common_1.Logger(RagService_1.name);
    }
    async answer(question, accountId) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            this.logger.warn('[RAG] OPENAI_API_KEY not set — returning fallback');
            return NO_ANSWER;
        }
        const { default: OpenAI } = await Promise.resolve().then(() => require('openai'));
        const openai = new OpenAI({ apiKey });
        try {
            const hypo = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                max_tokens: 180,
                messages: [{ role: 'user', content: `Write a detailed answer to: "${question}"` }],
            });
            const hypoText = hypo.choices[0].message.content ?? question;
            const embRes = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: hypoText,
                dimensions: 256,
            });
            const vec = JSON.stringify(embRes.data[0].embedding);
            const chunks = await this.ds.query(`
          SELECT content,
                 (1 - (embedding <=> $1::vector)) * 0.7
                 + similarity(content, $3)         * 0.3  AS hybrid_score
          FROM   knowledge_chunks
          WHERE  account_id = $2
            AND  (1 - (embedding <=> $1::vector)) > 0.60
          ORDER  BY hybrid_score DESC
          LIMIT  5
          `, [vec, accountId, question]);
            if (!chunks.length) {
                this.logger.debug(`[RAG] No chunks found for "${question.slice(0, 40)}" in account ${accountId}`);
                return NO_ANSWER;
            }
            const context = chunks
                .slice(0, 3)
                .map(c => c.content)
                .join('\n\n---\n\n');
            const final = await openai.chat.completions.create({
                model: 'gpt-4o',
                max_tokens: 130,
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
            return (0, llm_validator_1.isSafeContent)(answer) ? answer : llm_validator_1.SAFE_FALLBACK_MSG;
        }
        catch (err) {
            this.logger.error(`[RAG] Pipeline failed: ${err.message}`);
            return NO_ANSWER;
        }
    }
};
exports.RagService = RagService;
exports.RagService = RagService = RagService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], RagService);
//# sourceMappingURL=rag.service.js.map