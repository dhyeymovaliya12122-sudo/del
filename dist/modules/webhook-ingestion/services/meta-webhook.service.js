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
var MetaWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaWebhookService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const whatsapp_message_entity_1 = require("../../session-hydration/entities/whatsapp-message.entity");
const whatsapp_chat_entity_1 = require("../../session-hydration/entities/whatsapp-chat.entity");
const whatsapp_contact_entity_1 = require("../../session-hydration/entities/whatsapp-contact.entity");
const whatsapp_account_entity_1 = require("../../session-hydration/entities/whatsapp-account.entity");
const realtime_event_service_1 = require("../../realtime-gateway/services/realtime-event.service");
let MetaWebhookService = MetaWebhookService_1 = class MetaWebhookService {
    constructor(messageRepo, chatRepo, contactRepo, accountRepo, realtimeService, config) {
        this.messageRepo = messageRepo;
        this.chatRepo = chatRepo;
        this.contactRepo = contactRepo;
        this.accountRepo = accountRepo;
        this.realtimeService = realtimeService;
        this.config = config;
        this.logger = new common_1.Logger(MetaWebhookService_1.name);
    }
    async processPayload(body) {
        if (!body || body.object !== 'whatsapp_business_account')
            return;
        const tenantId = this.config.get('TENANT_ID', 'default-tenant');
        for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
                if (change.field !== 'messages')
                    continue;
                const value = change.value;
                if (!value)
                    continue;
                const phoneNumberId = value.metadata?.phone_number_id ?? '';
                const account = await this.resolveAccount(phoneNumberId);
                if (!account) {
                    this.logger.warn(`No account for Meta phone_number_id: ${phoneNumberId}`);
                    continue;
                }
                const accountId = account.id;
                if (value.messages?.length) {
                    const metaContacts = value.contacts ?? [];
                    for (const msg of value.messages) {
                        await this.processIncomingMessage(tenantId, accountId, msg, metaContacts).catch(err => this.logger.error(`Error processing Meta message ${msg.id}: ${err.message}`));
                    }
                }
                if (value.statuses?.length) {
                    for (const status of value.statuses) {
                        await this.processStatusUpdate(tenantId, accountId, status).catch(err => this.logger.error(`Error processing status update ${status.id}: ${err.message}`));
                    }
                }
            }
        }
    }
    async resolveAccount(phoneNumberId) {
        if (!phoneNumberId)
            return null;
        const digits = phoneNumberId.replace(/\D/g, '');
        const accounts = await this.accountRepo.find({ where: { status: 'active' } });
        const matched = accounts.find(a => {
            const aDigits = (a.phoneNumber ?? '').replace(/\D/g, '');
            return aDigits.endsWith(digits) || digits.endsWith(aDigits);
        });
        return matched ?? accounts[0] ?? null;
    }
    async processIncomingMessage(tenantId, accountId, msg, metaContacts) {
        const msgId = msg.id;
        const senderPhone = msg.from;
        const chatJid = `${senderPhone}@s.whatsapp.net`;
        const timestamp = parseInt(msg.timestamp, 10) * 1000;
        if (msg.type === 'reaction') {
            const reactionEmoji = msg.reaction?.emoji ?? null;
            const referencedId = msg.reaction?.message_id;
            if (referencedId) {
                await this.messageRepo.update({ id: referencedId, accountId }, { reaction: reactionEmoji }).catch(() => null);
                this.broadcast(tenantId, accountId, 'whatsapp:message_reaction', {
                    messageId: referencedId, chatJid, reaction: reactionEmoji,
                });
            }
            return;
        }
        const metaContact = metaContacts.find(c => c.wa_id === senderPhone);
        const senderName = metaContact?.profile?.name ?? '';
        await this.upsertContact(accountId, chatJid, senderPhone, senderName);
        const { text, mediaType, mimeType, fileName } = this.extractContent(msg);
        if (!text && !mediaType) {
            this.logger.debug(`Skipping empty Meta message ${msgId}`);
            return;
        }
        const savedMsg = await this.messageRepo.save({
            id: msgId,
            accountId,
            chatJid,
            senderJid: chatJid,
            senderName: undefined,
            fromMe: false,
            text,
            mediaType,
            mimeType,
            fileName,
            status: 'delivered',
            isDeleted: false,
            isViewOnce: false,
            timestamp,
        }).catch(err => {
            if (err.message?.includes('UNIQUE') || err.message?.includes('SQLITE_CONSTRAINT')) {
                this.logger.debug(`Message ${msgId} already exists (Meta retry), skipping.`);
                return null;
            }
            throw err;
        });
        if (!savedMsg)
            return;
        const snippet = text || (mediaType === 'image' ? '\ud83d\udcf7 Photo' :
            mediaType === 'video' ? '\ud83c\udfa5 Video' :
                mediaType === 'audio' ? '\ud83c\udfa4 Voice message' :
                    mediaType === 'document' ? `\ud83d\udcce ${fileName ?? 'Document'}` :
                        mediaType === 'sticker' ? '\ud83c\udfa8 Sticker' : '');
        const chat = await this.upsertChat(accountId, chatJid, senderName, snippet, timestamp, false);
        this.broadcast(tenantId, accountId, 'whatsapp:message_new', { message: savedMsg, chat });
        this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
        this.broadcast(tenantId, accountId, 'whatsapp:client_notification', {
            id: msgId,
            accountId,
            accountName: accountId,
            clientName: senderName || senderPhone,
            clientPhone: senderPhone,
            messageText: text || `[${mediaType ?? 'media'}]`,
            timestamp,
        });
        this.logger.log(`\ud83d\udce8 Meta msg [${msgId}] from ${senderPhone}: "${(text ?? mediaType ?? '').substring(0, 60)}"`);
    }
    extractContent(msg) {
        switch (msg.type) {
            case 'text': return { text: msg.text?.body ?? '' };
            case 'image': return { text: msg.image?.caption ?? '\ud83d\udcf7 Photo', mediaType: 'image', mimeType: msg.image?.mime_type };
            case 'video': return { text: msg.video?.caption ?? '\ud83c\udfa5 Video', mediaType: 'video', mimeType: msg.video?.mime_type };
            case 'audio': return { text: msg.audio?.voice ? '\ud83c\udfa4 Voice message' : '\ud83c\udfb5 Audio', mediaType: 'audio', mimeType: msg.audio?.mime_type };
            case 'document': return { text: `\ud83d\udcce ${msg.document?.filename ?? msg.document?.caption ?? 'Document'}`, mediaType: 'document', mimeType: msg.document?.mime_type, fileName: msg.document?.filename };
            case 'sticker': return { text: '\ud83c\udfa8 Sticker', mediaType: 'sticker', mimeType: msg.sticker?.mime_type };
            case 'location': return { text: `\ud83d\udccd Location${msg.location?.name ? `: ${msg.location.name}` : ''}` };
            case 'interactive': return { text: msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '\ud83d\udccb Interactive' };
            case 'button': return { text: '\ud83d\udccb Button reply' };
            case 'contacts': return { text: '\ud83d\udc64 Contact shared' };
            default: return { text: '' };
        }
    }
    async upsertContact(accountId, chatJid, phone, name) {
        const existing = await this.contactRepo.findOne({ where: { id: chatJid, accountId } }).catch(() => null);
        if (!existing) {
            await this.contactRepo.save({ id: chatJid, accountId, phoneNumber: phone, name: name || phone, notifyName: name || '' }).catch(() => null);
        }
        else if (name && (!existing.name || existing.name === phone)) {
            existing.name = name;
            if (!existing.notifyName)
                existing.notifyName = name;
            await this.contactRepo.save(existing).catch(() => null);
        }
    }
    async upsertChat(accountId, chatJid, contactName, snippet, timestamp, fromMe) {
        let chat = await this.chatRepo.findOne({ where: { id: chatJid, accountId } }).catch(() => null);
        if (!chat) {
            chat = this.chatRepo.create({
                id: chatJid, accountId,
                name: contactName || chatJid.split('@')[0],
                isGroup: false,
                unreadCount: fromMe ? 0 : 1,
                lastMessageText: snippet,
                lastMessageTimestamp: timestamp,
                lastMessageStatus: fromMe ? 'sent' : 'delivered',
                lastMessageFromMe: fromMe,
            });
        }
        else {
            if (snippet)
                chat.lastMessageText = snippet;
            chat.lastMessageTimestamp = timestamp;
            chat.lastMessageStatus = fromMe ? 'sent' : 'delivered';
            chat.lastMessageFromMe = fromMe;
            if (!fromMe)
                chat.unreadCount = (chat.unreadCount || 0) + 1;
            if (contactName && (!chat.name || chat.name === chatJid.split('@')[0]))
                chat.name = contactName;
        }
        return this.chatRepo.save(chat);
    }
    async processStatusUpdate(tenantId, accountId, status) {
        await this.messageRepo.update({ id: status.id, accountId }, { status: status.status }).catch(() => null);
        this.broadcast(tenantId, accountId, 'whatsapp:message_status', { messageId: status.id, status: status.status });
        this.logger.debug(`\ud83d\udcca Status [${status.status}] for msg [${status.id}]`);
    }
    broadcast(tenantId, accountId, event, payload) {
        try {
            this.realtimeService.emitToAccount(tenantId, accountId, event, payload);
        }
        catch (err) {
            this.logger.warn(`[Broadcast] ${event} failed: ${err.message}`);
        }
    }
};
exports.MetaWebhookService = MetaWebhookService;
exports.MetaWebhookService = MetaWebhookService = MetaWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_message_entity_1.WhatsappMessageEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(whatsapp_chat_entity_1.WhatsappChatEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(whatsapp_contact_entity_1.WhatsappContactEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        realtime_event_service_1.RealtimeEventService,
        config_1.ConfigService])
], MetaWebhookService);
//# sourceMappingURL=meta-webhook.service.js.map