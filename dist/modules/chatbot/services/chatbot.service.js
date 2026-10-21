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
var ChatbotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chatbot_flow_entity_1 = require("../entities/chatbot-flow.entity");
const safe_regex_util_1 = require("../../../common/utils/safe-regex.util");
let ChatbotService = ChatbotService_1 = class ChatbotService {
    constructor(flowRepo) {
        this.flowRepo = flowRepo;
        this.logger = new common_1.Logger(ChatbotService_1.name);
    }
    async findAll(accountId) {
        const where = accountId ? { accountId } : {};
        return this.flowRepo.find({ where, order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const flow = await this.flowRepo.findOne({ where: { id } });
        if (!flow)
            throw new common_1.NotFoundException(`Chatbot flow ${id} not found`);
        return flow;
    }
    async create(dto) {
        const flow = this.flowRepo.create({
            ...dto,
            nodes: JSON.stringify(dto.nodes ?? []),
            edges: JSON.stringify(dto.edges ?? []),
        });
        const saved = await this.flowRepo.save(flow);
        this.logger.log(`[Chatbot] Created flow "${saved.name}" (${saved.id})`);
        return saved;
    }
    async update(id, dto) {
        const existing = await this.findOne(id);
        const updated = {
            ...existing,
            ...dto,
            nodes: dto.nodes ? JSON.stringify(dto.nodes) : existing.nodes,
            edges: dto.edges ? JSON.stringify(dto.edges) : existing.edges,
        };
        await this.flowRepo.save(updated);
        return this.findOne(id);
    }
    async delete(id) {
        await this.flowRepo.delete(id);
        return { success: true };
    }
    async toggleActive(id) {
        const flow = await this.findOne(id);
        await this.flowRepo.update(id, { isActive: !flow.isActive });
        return { isActive: !flow.isActive };
    }
    async matchFlow(accountId, messageText) {
        const flows = await this.flowRepo.find({ where: { accountId, isActive: true } });
        for (const flow of flows) {
            if (!flow.triggerKeyword)
                continue;
            const text = messageText.trim();
            const keyword = flow.triggerKeyword.trim();
            const matched = flow.isRegex
                ? (0, safe_regex_util_1.safeRegexTest)(keyword, text, 1000, 120)
                : text.toLowerCase().includes(keyword.toLowerCase());
            if (matched)
                return flow;
        }
        return null;
    }
    async testFlow(id, testMessage) {
        const flow = await this.findOne(id);
        const nodes = JSON.parse(flow.nodes || '[]');
        const keyword = flow.triggerKeyword?.trim() ?? '';
        const matched = flow.isRegex
            ? (0, safe_regex_util_1.safeRegexTest)(keyword, testMessage, 1000, 120)
            : testMessage.toLowerCase().includes(keyword.toLowerCase());
        if (!matched)
            return { matched: false };
        const msgNode = nodes.find((n) => n.type === 'message');
        return {
            matched: true,
            response: msgNode?.data?.text ?? 'Auto-reply triggered',
            escalate: flow.escalateToHuman,
        };
    }
};
exports.ChatbotService = ChatbotService;
exports.ChatbotService = ChatbotService = ChatbotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chatbot_flow_entity_1.ChatbotFlowEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ChatbotService);
//# sourceMappingURL=chatbot.service.js.map