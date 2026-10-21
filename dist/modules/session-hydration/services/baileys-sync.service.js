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
var BaileysSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaileysSyncService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const whatsapp_chat_entity_1 = require("../entities/whatsapp-chat.entity");
const whatsapp_contact_entity_1 = require("../entities/whatsapp-contact.entity");
const whatsapp_message_entity_1 = require("../entities/whatsapp-message.entity");
const whatsapp_account_entity_1 = require("../entities/whatsapp-account.entity");
const contact_resolver_util_1 = require("../../accounts/utils/contact-resolver.util");
let BaileysSyncService = BaileysSyncService_1 = class BaileysSyncService {
    constructor(chatRepo, contactRepo, messageRepo, accountRepo) {
        this.chatRepo = chatRepo;
        this.contactRepo = contactRepo;
        this.messageRepo = messageRepo;
        this.accountRepo = accountRepo;
        this.logger = new common_1.Logger(BaileysSyncService_1.name);
    }
    async syncGroupsAndContacts(accountId, socket, onUpdated) {
        if (!socket)
            return;
        try {
            this.logger.log(`[Sync] Fetching participating groups for [${accountId}]...`);
            const groups = await socket.groupFetchAllParticipating();
            const groupEntries = Object.entries(groups);
            this.logger.log(`[Sync] Found ${groupEntries.length} participating groups`);
            const participantContactsMap = new Map();
            for (const [groupId, groupMeta] of groupEntries) {
                let chat = await this.chatRepo.findOne({ where: { id: groupId, accountId } });
                const name = groupMeta.subject || 'WhatsApp Group';
                const subtitle = groupMeta.desc || undefined;
                if (!chat) {
                    chat = this.chatRepo.create({
                        id: groupId,
                        accountId,
                        name,
                        subtitle,
                        isGroup: true,
                        unreadCount: 0,
                        lastMessageText: '',
                        lastMessageTimestamp: Number(groupMeta.creation || 0) * 1000,
                    });
                }
                else {
                    chat.name = name;
                    if (subtitle)
                        chat.subtitle = subtitle;
                    chat.isGroup = true;
                }
                await this.chatRepo.save(chat);
                const participants = groupMeta?.participants || [];
                for (const p of participants) {
                    if (!p || !p.id)
                        continue;
                    const cleanId = p.id.replace(/:\d+@/, '@');
                    if (cleanId.endsWith('@g.us'))
                        continue;
                    const resolved = (0, contact_resolver_util_1.resolveContactInfo)(cleanId, p.name, null, p.notify, false);
                    if (resolved) {
                        participantContactsMap.set(cleanId, {
                            id: cleanId,
                            accountId,
                            name: resolved.name,
                            phoneNumber: resolved.phoneNumber,
                            notifyName: p.notify || '',
                        });
                    }
                }
            }
            if (participantContactsMap.size > 0) {
                const contactsList = Array.from(participantContactsMap.values());
                for (let i = 0; i < contactsList.length; i += 100) {
                    const chunk = contactsList.slice(i, i + 100);
                    await this.contactRepo.save(chunk).catch(() => null);
                }
            }
            if (onUpdated)
                onUpdated();
        }
        catch (err) {
            this.logger.error(`[Sync] Failed to sync groups: ${err.message}`);
        }
    }
    async saveChat(accountId, chatData, onUpdated) {
        if (!chatData?.id)
            return null;
        const cleanId = chatData.id.trim();
        let existing = await this.chatRepo.findOne({ where: { id: cleanId, accountId } });
        const properName = (chatData.name && (0, contact_resolver_util_1.isProperName)(chatData.name)) ? chatData.name.trim() : null;
        if (!existing) {
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(cleanId, properName, null, null, !!chatData.isGroup);
            existing = this.chatRepo.create({
                id: cleanId,
                accountId,
                name: properName || resolved.name || cleanId.split('@')[0],
                isGroup: !!chatData.isGroup,
                unreadCount: 0,
                lastMessageTimestamp: Date.now(),
            });
        }
        else if (properName) {
            existing.name = properName;
        }
        if (properName) {
            (0, contact_resolver_util_1.registerUniversalContact)(cleanId, properName);
            this.contactRepo.findOne({ where: { id: cleanId, accountId } }).then((c) => {
                if (c) {
                    c.name = properName;
                    this.contactRepo.save(c).catch(() => null);
                }
            }).catch(() => null);
        }
        const saved = await this.chatRepo.save(existing);
        if (onUpdated)
            onUpdated();
        return saved;
    }
    async syncChatMessages(accountId, chatJid, socket, count = 50) {
        if (!socket) {
            return { success: false, synced: 0 };
        }
        try {
            let cleanJid = decodeURIComponent(chatJid).trim();
            if (cleanJid === 'you_self' || cleanJid.startsWith('you_self')) {
                const activeAcc = this.accountRepo ? await this.accountRepo.findOne({ where: { id: accountId } }) : null;
                if (activeAcc?.phoneNumber) {
                    const cleanDigits = activeAcc.phoneNumber.replace(/\D/g, '');
                    cleanJid = `${cleanDigits}@s.whatsapp.net`;
                }
                else if (socket?.user?.id) {
                    const userPhone = (socket.user.id.split(':')[0] || '').split('@')[0].replace(/\D/g, '');
                    if (userPhone)
                        cleanJid = `${userPhone}@s.whatsapp.net`;
                }
            }
            if (!cleanJid.includes('@')) {
                cleanJid = `${cleanJid}@s.whatsapp.net`;
            }
            this.logger.log(`📥 Requesting message history for [${cleanJid}] (count: ${count})...`);
            const sock = socket;
            const phone = cleanJid.split('@')[0].replace(/\+/g, '');
            const jidVariants = [
                cleanJid,
                `${phone}@s.whatsapp.net`,
                `${phone}@lid`,
            ];
            const contact = await this.contactRepo.findOne({
                where: [
                    { id: cleanJid, accountId },
                    { id: `${phone}@s.whatsapp.net`, accountId },
                    { id: `${phone}@lid`, accountId },
                ]
            }).catch(() => null);
            const chat = await this.chatRepo.findOne({ where: { id: cleanJid, accountId } }).catch(() => null);
            const properName = (contact?.name && (0, contact_resolver_util_1.isProperName)(contact.name))
                ? contact.name.trim()
                : (chat?.name && (0, contact_resolver_util_1.isProperName)(chat.name))
                    ? chat.name.trim()
                    : null;
            if (properName) {
                const sisterContacts = await this.contactRepo.find({ where: { name: properName, accountId } }).catch(() => []);
                for (const sc of sisterContacts) {
                    if (sc.id)
                        jidVariants.push(sc.id);
                    if (sc.phoneNumber) {
                        const scp = sc.phoneNumber.replace(/\D/g, '');
                        if (scp) {
                            jidVariants.push(`${scp}@s.whatsapp.net`);
                            jidVariants.push(`${scp}@lid`);
                        }
                    }
                }
                const sisterChats = await this.chatRepo.find({ where: { name: properName, accountId } }).catch(() => []);
                for (const sc of sisterChats) {
                    if (sc.id) {
                        jidVariants.push(sc.id);
                        const scp = sc.id.split('@')[0].replace(/\+/g, '');
                        if (scp) {
                            jidVariants.push(`${scp}@s.whatsapp.net`);
                            jidVariants.push(`${scp}@lid`);
                        }
                    }
                }
            }
            const uniqueVariants = Array.from(new Set(jidVariants));
            const oldestMsg = await this.messageRepo
                .createQueryBuilder('msg')
                .where('msg.accountId = :accountId', { accountId })
                .andWhere('msg.chatJid IN (:...jids)', { jids: uniqueVariants })
                .orderBy('msg.timestamp', 'ASC')
                .getOne();
            if (typeof sock.fetchMessageHistory === 'function') {
                const oldestKey = oldestMsg
                    ? { remoteJid: oldestMsg.chatJid || cleanJid, fromMe: oldestMsg.fromMe, id: oldestMsg.id }
                    : { remoteJid: cleanJid, fromMe: false, id: '' };
                const oldestTs = oldestMsg?.timestamp
                    ? Number(oldestMsg.timestamp)
                    : (chat?.lastMessageTimestamp ? Number(chat.lastMessageTimestamp) : Date.now());
                await Promise.race([
                    sock.fetchMessageHistory(count, oldestKey, oldestTs),
                    new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
                ]).catch((err) => {
                    this.logger.warn(`fetchMessageHistory notice for [${cleanJid}]: ${err.message}`);
                });
                for (const variant of uniqueVariants) {
                    if (variant !== cleanJid && variant !== oldestKey.remoteJid && (variant.endsWith('@lid') || variant.endsWith('@s.whatsapp.net'))) {
                        const variantOldest = await this.messageRepo.findOne({
                            where: { chatJid: variant, accountId },
                            order: { timestamp: 'ASC' }
                        }).catch(() => null);
                        const vKey = variantOldest
                            ? { remoteJid: variant, fromMe: variantOldest.fromMe, id: variantOldest.id }
                            : { remoteJid: variant, fromMe: false, id: '' };
                        const vTs = variantOldest?.timestamp ? Number(variantOldest.timestamp) : oldestTs;
                        await Promise.race([
                            sock.fetchMessageHistory(count, vKey, vTs),
                            new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
                        ]).catch(() => null);
                    }
                }
            }
            return { success: true, synced: 1 };
        }
        catch (err) {
            this.logger.warn(`syncChatMessages error: ${err.message}`);
            return { success: false, synced: 0 };
        }
    }
};
exports.BaileysSyncService = BaileysSyncService;
exports.BaileysSyncService = BaileysSyncService = BaileysSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_chat_entity_1.WhatsappChatEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(whatsapp_contact_entity_1.WhatsappContactEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(whatsapp_message_entity_1.WhatsappMessageEntity)),
    __param(3, (0, common_1.Optional)()),
    __param(3, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BaileysSyncService);
//# sourceMappingURL=baileys-sync.service.js.map