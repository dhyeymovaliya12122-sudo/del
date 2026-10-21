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
var SemanticCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticCacheService = void 0;
const common_1 = require("@nestjs/common");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const crypto_1 = require("crypto");
let SemanticCacheService = SemanticCacheService_1 = class SemanticCacheService {
    constructor(redis) {
        this.redis = redis;
        this.logger = new common_1.Logger(SemanticCacheService_1.name);
        this.SIM_THRESHOLD = 0.92;
        this.TTL_SEC = 86_400;
        this.MAX_SCAN = 300;
    }
    async get(question, accountId) {
        const sha = this.sha(question);
        const l1Key = `sc:exact:${accountId}:${sha}`;
        const l1 = await this.redis.get(l1Key);
        if (l1) {
            this.logger.debug(`[SemanticCache] L1 hit for "${question.slice(0, 30)}"`);
            return l1;
        }
        const qVec = await this.embed(question);
        if (!qVec)
            return null;
        const keys = await this.redis.keys(`sc:vec:${accountId}:*`);
        for (const key of keys.slice(0, this.MAX_SCAN)) {
            const raw = await this.redis.get(key);
            if (!raw)
                continue;
            try {
                const { embedding, answer } = JSON.parse(raw);
                if (this.cosine(qVec, embedding) >= this.SIM_THRESHOLD) {
                    this.logger.debug(`[SemanticCache] L2 hit for "${question.slice(0, 30)}"`);
                    await this.redis.set(l1Key, answer, 'EX', this.TTL_SEC);
                    return answer;
                }
            }
            catch {
            }
        }
        return null;
    }
    async set(question, answer, accountId) {
        const sha = this.sha(question);
        const embedding = await this.embed(question);
        if (!embedding)
            return;
        await Promise.all([
            this.redis.set(`sc:vec:${accountId}:${sha}`, JSON.stringify({ embedding, answer }), 'EX', this.TTL_SEC),
            this.redis.set(`sc:exact:${accountId}:${sha}`, answer, 'EX', this.TTL_SEC),
        ]);
    }
    async invalidate(accountId) {
        const keys = await this.redis.keys(`sc:*:${accountId}:*`);
        if (keys.length > 0) {
            await this.redis.del(...keys);
            this.logger.log(`[SemanticCache] Invalidated ${keys.length} entries for ${accountId}`);
        }
    }
    async embed(text) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey)
            return null;
        try {
            const { default: OpenAI } = await Promise.resolve().then(() => require('openai'));
            const openai = new OpenAI({ apiKey });
            const res = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
                dimensions: 256,
            });
            return res.data[0].embedding;
        }
        catch (err) {
            this.logger.warn(`[SemanticCache] Embedding failed: ${err.message}`);
            return null;
        }
    }
    cosine(a, b) {
        if (a.length !== b.length)
            return 0;
        const dot = a.reduce((s, v, i) => s + v * b[i], 0);
        const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
        const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
        return magA && magB ? dot / (magA * magB) : 0;
    }
    sha(text) {
        return (0, crypto_1.createHash)('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 20);
    }
};
exports.SemanticCacheService = SemanticCacheService;
exports.SemanticCacheService = SemanticCacheService = SemanticCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [Function])
], SemanticCacheService);
//# sourceMappingURL=semantic-cache.service.js.map