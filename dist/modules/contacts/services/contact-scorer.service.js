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
var ContactScorerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactScorerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const conversation_memory_entity_1 = require("../../chatbot/entities/conversation-memory.entity");
const campaign_recipient_entity_1 = require("../../campaigns/entities/campaign-recipient.entity");
const contact_group_member_entity_1 = require("../entities/contact-group-member.entity");
let ContactScorerService = ContactScorerService_1 = class ContactScorerService {
    constructor(memRepo, recRepo, memberRepo) {
        this.memRepo = memRepo;
        this.recRepo = recRepo;
        this.memberRepo = memberRepo;
        this.logger = new common_1.Logger(ContactScorerService_1.name);
    }
    async scoreContact(accountId, senderJid) {
        const rawPhone = senderJid.split('@')[0];
        const [memory, deliveries] = await Promise.all([
            this.memRepo.findOne({ where: { accountId, senderJid } }).catch(() => null),
            this.recRepo.find({ where: { phoneNumber: rawPhone } }).catch(() => []),
        ]);
        let score = 0;
        if (memory?.updatedAt) {
            const daysSince = (Date.now() - new Date(memory.updatedAt).getTime()) / 86_400_000;
            score += Math.max(0, 30 - daysSince * 4);
        }
        score += Math.min((memory?.sessionCount ?? 0) * 5, 25);
        const sentiment = memory?.keyFacts?.sentiment;
        if (sentiment === 'positive')
            score += 20;
        else if (sentiment === 'neutral')
            score += 10;
        if (deliveries.length > 0) {
            const reads = deliveries.filter(d => ['read', 'replied'].includes(d.status)).length;
            score += (reads / deliveries.length) * 25;
        }
        const finalScore = Math.min(Math.max(Math.round(score), 0), 100);
        this.logger.debug(`[ContactScorer] Scored ${senderJid}: ${finalScore}/100`);
        return finalScore;
    }
    async scoreGroup(accountId, groupId) {
        const members = await this.memberRepo.find({ where: { groupId } });
        let updated = 0;
        for (const member of members) {
            const jid = `${member.phoneNumber}@s.whatsapp.net`;
            const score = await this.scoreContact(accountId, jid);
            await this.updateContactScore(member.id, score);
            updated++;
        }
        this.logger.log(`[ContactScorer] Scored ${updated} contacts in group ${groupId}`);
        return { updated };
    }
    async updateContactScore(memberId, score) {
        const member = await this.memberRepo.findOne({ where: { id: memberId } });
        if (!member)
            return;
        let fields = {};
        try {
            fields = JSON.parse(member.customFields || '{}');
        }
        catch {
            fields = {};
        }
        fields.engagementScore = score;
        fields.scoredAt = new Date().toISOString();
        await this.memberRepo.update(memberId, {
            customFields: JSON.stringify(fields),
        });
    }
};
exports.ContactScorerService = ContactScorerService;
exports.ContactScorerService = ContactScorerService = ContactScorerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(conversation_memory_entity_1.ConversationMemoryEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(campaign_recipient_entity_1.CampaignRecipientEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(contact_group_member_entity_1.ContactGroupMemberEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ContactScorerService);
//# sourceMappingURL=contact-scorer.service.js.map