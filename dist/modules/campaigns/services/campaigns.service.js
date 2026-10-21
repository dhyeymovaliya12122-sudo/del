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
var CampaignsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const campaign_entity_1 = require("../entities/campaign.entity");
const campaign_recipient_entity_1 = require("../entities/campaign-recipient.entity");
const whatsapp_contact_entity_1 = require("../../session-hydration/entities/whatsapp-contact.entity");
const outbound_message_queue_service_1 = require("../../message-queue/services/outbound-message-queue.service");
const baileys_client_factory_1 = require("../../session-hydration/factories/baileys-client.factory");
const common_2 = require("@nestjs/common");
let CampaignsService = CampaignsService_1 = class CampaignsService {
    constructor(campaignRepo, recipientRepo, contactRepo, outboundQueue, baileysClientFactory) {
        this.campaignRepo = campaignRepo;
        this.recipientRepo = recipientRepo;
        this.contactRepo = contactRepo;
        this.outboundQueue = outboundQueue;
        this.baileysClientFactory = baileysClientFactory;
        this.logger = new common_1.Logger(CampaignsService_1.name);
    }
    async findAll(accountId) {
        const where = accountId ? { accountId } : {};
        return this.campaignRepo.find({ where, order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const campaign = await this.campaignRepo.findOne({ where: { id } });
        if (!campaign)
            throw new common_1.NotFoundException(`Campaign ${id} not found`);
        return campaign;
    }
    async create(dto) {
        const campaign = this.campaignRepo.create({
            ...dto,
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
            status: 'draft',
        });
        const saved = await this.campaignRepo.save(campaign);
        this.logger.log(`[Campaigns] Created campaign "${saved.name}" (${saved.id})`);
        return saved;
    }
    async addRecipients(campaignId, recipients) {
        const existing = await this.recipientRepo.find({ where: { campaignId } });
        const existingNums = new Set(existing.map(r => r.phoneNumber));
        const toAdd = recipients
            .filter(r => !existingNums.has(r.phoneNumber))
            .map(r => this.recipientRepo.create({ campaignId, ...r }));
        if (toAdd.length > 0) {
            await this.recipientRepo.save(toAdd);
        }
        await this.campaignRepo.update(campaignId, { totalRecipients: existing.length + toAdd.length });
        return { added: toAdd.length };
    }
    async getRecipients(campaignId) {
        const recipients = await this.recipientRepo.find({ where: { campaignId }, order: { createdAt: 'ASC' } });
        const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } }).catch(() => null);
        const leadMatch = campaign?.name || 'Direct Lead';
        return recipients.map(r => {
            let webhookResponse = 'PENDING Ready to Send';
            if (r.status === 'delivered')
                webhookResponse = 'DELIVERED Sent to Gateway';
            else if (r.status === 'read')
                webhookResponse = 'READ Sent to Gateway';
            else if (r.status === 'failed')
                webhookResponse = r.errorMessage ? `FAILED: ${r.errorMessage}` : 'FAILED Gateway Error';
            else if (r.status === 'sent')
                webhookResponse = 'SENT Sent to Gateway';
            else if (r.status === 'pending')
                webhookResponse = 'PENDING Ready to Send';
            const recentReply = r.repliedAt
                ? `Replied at ${new Date(r.repliedAt).toLocaleTimeString()}`
                : 'No reply on record';
            return {
                ...r,
                webhookResponse,
                remarks: '—',
                leadMatch,
                recentReply,
            };
        });
    }
    async updateStatus(id, status) {
        const update = { status };
        if (status === 'running') {
            update.startedAt = new Date();
            await this.campaignRepo.update(id, update);
            this.executeCampaign(id).catch(err => {
                this.logger.error(`Error dispatching campaign ${id}: ${err.message}`);
            });
            return;
        }
        if (status === 'completed')
            update.completedAt = new Date();
        await this.campaignRepo.update(id, update);
    }
    async executeCampaign(campaignId) {
        this.logger.log(`🚀 [Campaign] Dispatching jobs for campaign ${campaignId}`);
        const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
        if (!campaign?.messageBody) {
            this.logger.warn(`[Campaign] ${campaignId} has no message body or not found`);
            return;
        }
        let recipients = await this.recipientRepo.find({
            where: { campaignId, status: 'pending' },
        });
        if (recipients.length === 0) {
            const contacts = await this.contactRepo.find({
                where: { accountId: campaign.accountId },
                take: 50,
            }).catch(() => []);
            if (contacts.length > 0) {
                const newRecipients = contacts.map(c => {
                    const cleanDigits = (c.phoneNumber || c.id.split('@')[0]).replace(/\D/g, '');
                    return this.recipientRepo.create({
                        campaignId,
                        phoneNumber: cleanDigits ? `+${cleanDigits}` : c.id,
                        name: c.name || c.notifyName || 'Customer',
                        status: 'pending',
                    });
                });
                await this.recipientRepo.save(newRecipients);
                recipients = newRecipients;
                await this.campaignRepo.update(campaignId, { totalRecipients: newRecipients.length });
                this.logger.log(`[Campaign] Auto-populated ${newRecipients.length} recipients from synced contacts for "${campaign.name}"`);
            }
        }
        this.logger.log(`[Campaign] Processing ${recipients.length} pending recipients for "${campaign.name}"`);
        if (this.baileysClientFactory) {
            (async () => {
                this.logger.log(`[Campaign] Starting direct Baileys dispatch for ${recipients.length} recipients`);
                for (const r of recipients) {
                    const current = await this.campaignRepo.findOne({ where: { id: campaignId } });
                    if (current?.status !== 'running') {
                        this.logger.log(`[Campaign] ${campaignId} status is "${current?.status}" — stopping dispatch`);
                        return;
                    }
                    const text = (campaign.messageBody ?? '')
                        .replace(/\{\{?name\}\}?/gi, r.name || 'there')
                        .replace(/\{\{?phone\}\}?/gi, r.phoneNumber);
                    try {
                        await this.baileysClientFactory.sendMessage(campaign.accountId, r.phoneNumber, text);
                        await this.recipientRepo.update(r.id, {
                            status: 'sent',
                            sentAt: new Date(),
                            errorMessage: undefined,
                        });
                        this.logger.log(`[Campaign] Sent message to ${r.phoneNumber} (${r.name})`);
                    }
                    catch (err) {
                        this.logger.error(`[Campaign] Failed sending to ${r.phoneNumber}: ${err.message}`);
                        await this.recipientRepo.update(r.id, {
                            status: 'failed',
                            errorMessage: err.message || 'Send error',
                        });
                    }
                    await this.updateStats(campaignId);
                    const delay = Math.floor(Math.random() * 1000 + 1200);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                const remainingPending = await this.recipientRepo.count({
                    where: { campaignId, status: 'pending' },
                });
                if (remainingPending === 0) {
                    await this.campaignRepo.update(campaignId, {
                        status: 'completed',
                        completedAt: new Date(),
                    });
                    this.logger.log(`[Campaign] ✅ Campaign ${campaignId} completed`);
                }
            })().catch(err => {
                this.logger.error(`[Campaign] Error during direct dispatch: ${err.message}`);
            });
            return;
        }
        const CHUNK = 500;
        for (let i = 0; i < recipients.length; i += CHUNK) {
            const chunk = recipients.slice(i, i + CHUNK);
            const current = await this.campaignRepo.findOne({ where: { id: campaignId } });
            if (current?.status !== 'running') {
                this.logger.log(`[Campaign] ${campaignId} status changed to "${current?.status}" — stopping dispatch`);
                return;
            }
            await Promise.all(chunk.map(r => this.outboundQueue.enqueue({
                accountId: campaign.accountId,
                tenantId: campaign.accountId,
                to: r.phoneNumber,
                type: 'text',
                priority: 'bulk',
                payload: {
                    text: (campaign.messageBody ?? '')
                        .replace(/\{\{?name\}\}?/gi, r.name || 'there')
                        .replace(/\{\{?phone\}\}?/gi, r.phoneNumber),
                },
                metadata: { campaignId, recipientId: r.id, phoneNumber: r.phoneNumber },
            }).catch(err => {
                this.logger.warn(`[Campaign] Failed to enqueue ${r.phoneNumber}: ${err.message}`);
            })));
            await new Promise(resolve => setImmediate(resolve));
        }
        this.logger.log(`[Campaign] ✅ ${recipients.length} jobs queued for "${campaign.name}". BullMQ now owns delivery.`);
    }
    async updateStats(campaignId) {
        const recipients = await this.recipientRepo.find({ where: { campaignId } });
        const stats = {
            sentCount: recipients.filter(r => ['sent', 'delivered', 'read', 'replied'].includes(r.status)).length,
            deliveredCount: recipients.filter(r => ['delivered', 'read', 'replied'].includes(r.status)).length,
            readCount: recipients.filter(r => ['read', 'replied'].includes(r.status)).length,
            repliedCount: recipients.filter(r => r.status === 'replied').length,
            failedCount: recipients.filter(r => r.status === 'failed').length,
        };
        await this.campaignRepo.update(campaignId, stats);
    }
    async updateRecipientById(recipientId, status, errorMessage) {
        const update = { status, errorMessage };
        if (status === 'sent')
            update.sentAt = new Date();
        if (status === 'delivered')
            update.deliveredAt = new Date();
        if (status === 'read')
            update.readAt = new Date();
        if (status === 'replied')
            update.repliedAt = new Date();
        await this.recipientRepo.update({ id: recipientId }, update);
    }
    async updateRecipientStatus(campaignId, phoneNumber, status) {
        const update = { status };
        if (status === 'sent')
            update.sentAt = new Date();
        if (status === 'delivered')
            update.deliveredAt = new Date();
        if (status === 'read')
            update.readAt = new Date();
        if (status === 'replied')
            update.repliedAt = new Date();
        await this.recipientRepo.update({ campaignId, phoneNumber }, update);
        await this.updateStats(campaignId);
    }
    async getStats(id) {
        return this.findOne(id);
    }
    async delete(id) {
        await this.recipientRepo.delete({ campaignId: id });
        await this.campaignRepo.delete(id);
        return { success: true };
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = CampaignsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(campaign_entity_1.CampaignEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(campaign_recipient_entity_1.CampaignRecipientEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(whatsapp_contact_entity_1.WhatsappContactEntity)),
    __param(4, (0, common_2.Optional)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        outbound_message_queue_service_1.OutboundMessageQueueService,
        baileys_client_factory_1.BaileysClientFactory])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map