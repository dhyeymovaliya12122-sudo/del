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
var MemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const conversation_memory_entity_1 = require("../entities/conversation-memory.entity");
let MemoryService = MemoryService_1 = class MemoryService {
    constructor(repo, queue) {
        this.repo = repo;
        this.queue = queue;
        this.logger = new common_1.Logger(MemoryService_1.name);
    }
    async hydrate(accountId, senderJid) {
        try {
            const mem = await this.repo.findOne({ where: { accountId, senderJid } });
            if (mem?.keyFacts && Object.keys(mem.keyFacts).length > 0) {
                this.logger.debug(`[Memory] Hydrated facts for ${senderJid} (sessions: ${mem.sessionCount})`);
            }
            return mem?.keyFacts ?? {};
        }
        catch (err) {
            this.logger.warn(`[Memory] Hydrate failed for ${senderJid}: ${err.message}`);
            return {};
        }
    }
    async persist(accountId, senderJid, session) {
        try {
            await this.queue.add('summarise', {
                accountId,
                senderJid,
                transcript: session.variables,
                endStatus: session.status,
            }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: 50,
                removeOnFail: 20,
            });
            this.logger.debug(`[Memory] Queued summarisation for ${senderJid}`);
        }
        catch (err) {
            this.logger.warn(`[Memory] Failed to queue summarisation for ${senderJid}: ${err.message}`);
        }
    }
};
exports.MemoryService = MemoryService;
exports.MemoryService = MemoryService = MemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(conversation_memory_entity_1.ConversationMemoryEntity)),
    __param(1, (0, bullmq_1.InjectQueue)('memory-summariser')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        bullmq_2.Queue])
], MemoryService);
//# sourceMappingURL=memory.service.js.map