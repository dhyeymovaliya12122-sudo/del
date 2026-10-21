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
var AutoReplyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoReplyService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const auto_reply_rule_entity_1 = require("../entities/auto-reply-rule.entity");
const baileys_client_factory_1 = require("../../session-hydration/factories/baileys-client.factory");
const safe_regex_util_1 = require("../../../common/utils/safe-regex.util");
let AutoReplyService = AutoReplyService_1 = class AutoReplyService {
    constructor(ruleRepo, baileysFactory) {
        this.ruleRepo = ruleRepo;
        this.baileysFactory = baileysFactory;
        this.logger = new common_1.Logger(AutoReplyService_1.name);
        this.recentReplies = new Map();
    }
    async processIncomingMessage({ accountId, message }) {
        if (message.fromMe)
            return;
        if (!message.text || !message.chatJid)
            return;
        const cacheKey = `${accountId}:${message.chatJid}`;
        const lastReply = this.recentReplies.get(cacheKey) || 0;
        const cooldown = 30_000;
        if (Date.now() - lastReply < cooldown)
            return;
        const rules = await this.ruleRepo.find({
            where: { accountId, isActive: true },
            order: { createdAt: 'ASC' },
        });
        for (const rule of rules) {
            if (!this.matchesRule(message.text, rule))
                continue;
            if (!this.isWithinBusinessHours(rule))
                continue;
            const client = this.baileysFactory.getClient(accountId);
            if (!client?.socket)
                continue;
            const replyText = rule.replyMessage
                .replace('{name}', message.senderJid?.split('@')[0] || 'there')
                .replace('{chat}', message.chatJid.split('@')[0]);
            try {
                await client.socket.sendMessage(message.chatJid, { text: replyText });
                this.recentReplies.set(cacheKey, Date.now());
                await this.ruleRepo.update(rule.id, {
                    matchCount: rule.matchCount + 1,
                    replyCount: rule.replyCount + 1,
                });
                this.logger.log(`🤖 Auto-replied to ${message.chatJid} using rule "${rule.name}"`);
                break;
            }
            catch (err) {
                this.logger.error(`Auto-reply failed: ${err.message}`);
            }
        }
    }
    matchesRule(text, rule) {
        const lowerText = text.toLowerCase();
        switch (rule.triggerType) {
            case 'any': return true;
            case 'keyword': return lowerText.includes((rule.triggerValue || '').toLowerCase());
            case 'contains': return lowerText.includes((rule.triggerValue || '').toLowerCase());
            case 'regex':
                return (0, safe_regex_util_1.safeRegexTest)(rule.triggerValue, text, 1000, 120);
            case 'new_contact': return true;
            default: return false;
        }
    }
    isWithinBusinessHours(rule) {
        if (!rule.onlyOutsideHours || !rule.businessHoursStart || !rule.businessHoursEnd)
            return true;
        const now = new Date();
        const [startH, startM] = rule.businessHoursStart.split(':').map(Number);
        const [endH, endM] = rule.businessHoursEnd.split(':').map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;
        const nowMins = now.getHours() * 60 + now.getMinutes();
        return nowMins < startMins || nowMins > endMins;
    }
    async createRule(data) {
        const id = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        return this.ruleRepo.save({ ...data, id, matchCount: 0, replyCount: 0 });
    }
    async getRules(accountId) {
        return this.ruleRepo.find({ where: { accountId }, order: { createdAt: 'ASC' } });
    }
    async updateRule(id, data) {
        await this.ruleRepo.update(id, data);
        return this.ruleRepo.findOne({ where: { id } });
    }
    async deleteRule(id) {
        await this.ruleRepo.delete(id);
        return { success: true };
    }
    async toggleRule(id) {
        const rule = await this.ruleRepo.findOne({ where: { id } });
        if (!rule)
            return;
        await this.ruleRepo.update(id, { isActive: !rule.isActive });
        return { id, isActive: !rule.isActive };
    }
};
exports.AutoReplyService = AutoReplyService;
__decorate([
    (0, event_emitter_1.OnEvent)('auto-reply.check'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AutoReplyService.prototype, "processIncomingMessage", null);
exports.AutoReplyService = AutoReplyService = AutoReplyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(auto_reply_rule_entity_1.AutoReplyRuleEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        baileys_client_factory_1.BaileysClientFactory])
], AutoReplyService);
//# sourceMappingURL=auto-reply.service.js.map