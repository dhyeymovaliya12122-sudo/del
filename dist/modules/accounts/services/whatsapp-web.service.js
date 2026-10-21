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
var WhatsappWebService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappWebService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs = require("fs");
const path = require("path");
const whatsapp_chat_entity_1 = require("../../session-hydration/entities/whatsapp-chat.entity");
const whatsapp_contact_entity_1 = require("../../session-hydration/entities/whatsapp-contact.entity");
const whatsapp_message_entity_1 = require("../../session-hydration/entities/whatsapp-message.entity");
const whatsapp_account_entity_1 = require("../../session-hydration/entities/whatsapp-account.entity");
const baileys_client_factory_1 = require("../../session-hydration/factories/baileys-client.factory");
const session_hydration_service_1 = require("../../session-hydration/services/session-hydration.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const contact_resolver_util_1 = require("../utils/contact-resolver.util");
let WhatsappWebService = WhatsappWebService_1 = class WhatsappWebService {
    constructor(chatRepo, contactRepo, messageRepo, accountRepo, baileysClientFactory, sessionHydrationService, redis, eventEmitter) {
        this.chatRepo = chatRepo;
        this.contactRepo = contactRepo;
        this.messageRepo = messageRepo;
        this.accountRepo = accountRepo;
        this.baileysClientFactory = baileysClientFactory;
        this.sessionHydrationService = sessionHydrationService;
        this.redis = redis;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(WhatsappWebService_1.name);
        this.syncedLidAccounts = new Set();
        this.chatUpdateQueue = [];
        this.isDrainingQueue = false;
        this.chatsCache = new Map();
    }
    async onModuleInit() {
        try {
            const accounts = await this.accountRepo.find();
            for (const acc of accounts) {
                if (acc.phoneNumber && acc.displayName && (0, contact_resolver_util_1.isProperName)(acc.displayName)) {
                    (0, contact_resolver_util_1.registerUniversalContact)(acc.phoneNumber, acc.displayName);
                }
            }
            const contacts = await this.contactRepo.find();
            for (const c of contacts) {
                const properName = (0, contact_resolver_util_1.isProperName)(c.name) ? c.name : (0, contact_resolver_util_1.isProperName)(c.notifyName) ? c.notifyName : null;
                if (properName && c.id) {
                    (0, contact_resolver_util_1.registerUniversalContact)(c.id, properName, c.phoneNumber);
                }
            }
            const chats = await this.chatRepo.find();
            for (const ch of chats) {
                if (ch.id && ch.name && (0, contact_resolver_util_1.isProperName)(ch.name)) {
                    (0, contact_resolver_util_1.registerUniversalContact)(ch.id, ch.name);
                }
            }
            this.logger.log(`🚀 Automated Dynamic Identity Registry bootstrapped with ${contact_resolver_util_1.UNIVERSAL_IDENTITY_REGISTRY.size} identities from database.`);
        }
        catch (err) {
            this.logger.warn(`Identity bootstrap warning: ${err.message}`);
        }
    }
    enqueueChatUpdate(criteria, partial) {
        this.chatUpdateQueue.push({ criteria, partial });
        this.scheduleQueueDrain();
    }
    scheduleQueueDrain() {
        if (this.isDrainingQueue)
            return;
        this.isDrainingQueue = true;
        setImmediate(() => this.drainChatUpdateQueue());
    }
    async drainChatUpdateQueue() {
        try {
            while (this.chatUpdateQueue.length > 0) {
                const batch = this.chatUpdateQueue.splice(0, 50);
                for (const item of batch) {
                    await this.chatRepo.update(item.criteria, item.partial).catch(() => null);
                }
            }
        }
        catch (err) {
            this.logger.debug(`Background write queue error: ${err.message}`);
        }
        finally {
            this.isDrainingQueue = false;
        }
    }
    async invalidateChatsCache(accountId) {
        if (!accountId || accountId === 'all') {
            this.chatsCache.clear();
        }
        else {
            for (const key of this.chatsCache.keys()) {
                if (key.startsWith(accountId) || key.startsWith('all')) {
                    this.chatsCache.delete(key);
                }
            }
        }
        if (this.redis) {
            try {
                const pattern = accountId && accountId !== 'all'
                    ? `wa:cache:chats:${accountId}*`
                    : 'wa:cache:chats:*';
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            }
            catch (err) {
                this.logger.debug(`Redis cache invalidation notice: ${err.message}`);
            }
        }
    }
    async syncLidsInBackground(accountId) {
        if (!accountId || accountId === 'all' || this.syncedLidAccounts.has(accountId))
            return;
        this.syncedLidAccounts.add(accountId);
        try {
            const instance = this.baileysClientFactory.getClient(accountId);
            if (!instance?.socket?.onWhatsApp)
                return;
            const contacts = await this.contactRepo.find({
                where: { accountId },
                select: ['id', 'name', 'notifyName', 'phoneNumber'],
            }).catch(() => []);
            const phoneContacts = contacts.filter(c => c.phoneNumber && /^\+?\d{10,15}$/.test(c.phoneNumber.replace(/\s+/g, '')));
            if (!phoneContacts.length)
                return;
            for (let i = 0; i < phoneContacts.length; i += 40) {
                const batch = phoneContacts.slice(i, i + 40);
                const phones = batch.map(c => c.phoneNumber.replace(/\s+/g, ''));
                try {
                    const results = await instance.socket.onWhatsApp(...phones);
                    if (Array.isArray(results)) {
                        for (const r of results) {
                            if (r.lid) {
                                const cleanLid = r.lid.split('@')[0];
                                const cleanPn = (r.jid || '').split('@')[0].replace(/\+/g, '');
                                const matchedContact = batch.find(c => c.phoneNumber.replace(/\D/g, '') === cleanPn || c.id.includes(cleanPn));
                                const contactName = (matchedContact?.name && matchedContact.name !== 'WhatsApp User' && !matchedContact.name.startsWith('Contact (')) ? matchedContact.name :
                                    (matchedContact?.notifyName && matchedContact.notifyName !== 'WhatsApp User' && !matchedContact.notifyName.startsWith('Contact (')) ? matchedContact.notifyName :
                                        (0, contact_resolver_util_1.formatE164Phone)(cleanPn);
                                if (contactName) {
                                    (0, contact_resolver_util_1.registerUniversalContact)(r.lid, contactName, (0, contact_resolver_util_1.formatE164Phone)(cleanPn));
                                    (0, contact_resolver_util_1.registerUniversalContact)(cleanLid, contactName, (0, contact_resolver_util_1.formatE164Phone)(cleanPn));
                                    this.enqueueChatUpdate({ id: r.lid, accountId }, { name: contactName });
                                    this.enqueueChatUpdate({ id: `${cleanLid}@lid`, accountId }, { name: contactName });
                                }
                            }
                        }
                    }
                }
                catch (e) {
                    this.logger.debug(`LID batch resolution info: ${e.message}`);
                }
            }
        }
        catch (err) {
            this.logger.warn(`Background LID sync error: ${err.message}`);
        }
    }
    async getChats(accountId, search, limit = 500, offset = 0, startDate, endDate) {
        const cacheKey = `${accountId || 'all'}_${search ? search.trim() : ''}_${limit}_${offset}_${startDate || ''}_${endDate || ''}`;
        const now = Date.now();
        const cached = this.chatsCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.data;
        }
        if (this.redis) {
            try {
                const redisData = await this.redis.get(`wa:cache:chats:${cacheKey}`);
                if (redisData) {
                    const parsed = JSON.parse(redisData);
                    this.chatsCache.set(cacheKey, { data: parsed, expiresAt: now + 5000 });
                    return parsed;
                }
            }
            catch { }
        }
        const isUniversal = !accountId || accountId === 'all';
        const qb = this.chatRepo.createQueryBuilder('chat');
        if (!isUniversal) {
            qb.where('chat.accountId = :accountId', { accountId });
        }
        if (search && search.trim()) {
            const condition = '(chat.name LIKE :s OR chat.lastMessageText LIKE :s OR chat.id LIKE :s)';
            if (isUniversal) {
                qb.where(condition, { s: `%${search.trim()}%` });
            }
            else {
                qb.andWhere(condition, { s: `%${search.trim()}%` });
            }
        }
        if (startDate) {
            const startMs = new Date(startDate).getTime();
            const startIso = new Date(startDate).toISOString().replace('T', ' ').slice(0, 19);
            qb.andWhere('(chat.lastMessageTimestamp >= :startMs OR chat.updatedAt >= :startIso)', { startMs, startIso });
        }
        if (endDate) {
            const endMs = new Date(endDate).getTime();
            const endIso = new Date(endDate).toISOString().replace('T', ' ').slice(0, 19);
            qb.andWhere('(chat.lastMessageTimestamp <= :endMs OR chat.updatedAt <= :endIso)', { endMs, endIso });
        }
        qb.select([
            'chat.id',
            'chat.accountId',
            'chat.name',
            'chat.subtitle',
            'chat.isGroup',
            'chat.unreadCount',
            'chat.lastMessageText',
            'chat.lastMessageTimestamp',
            'chat.lastMessageStatus',
            'chat.lastMessageFromMe',
            'chat.pinned',
            'chat.avatarUrl',
        ]);
        qb.orderBy('chat.pinned', 'DESC')
            .addOrderBy('chat.lastMessageTimestamp', 'DESC')
            .take(limit)
            .skip(offset);
        const chats = await qb.getMany();
        const [allAccounts, allContacts] = await Promise.all([
            this.accountRepo.find().catch(() => []),
            this.contactRepo.find({
                select: ['id', 'accountId', 'name', 'notifyName', 'phoneNumber'],
            }).catch(() => []),
        ]);
        const accountMap = new Map(allAccounts.map(a => [a.id, a]));
        const contactMap = new Map();
        const contactPhoneMap = new Map();
        for (const c of allContacts) {
            if (c.id && c.phoneNumber) {
                contactPhoneMap.set(c.id, c.phoneNumber);
            }
            const cleanId = (c.id || '').trim();
            const rawId = cleanId.split('@')[0].replace(/\+/g, '');
            const validName = (0, contact_resolver_util_1.isProperName)(c.name) ? c.name.trim() :
                (0, contact_resolver_util_1.isProperName)(c.notifyName) ? c.notifyName.trim() : null;
            if (validName) {
                (0, contact_resolver_util_1.registerUniversalContact)(rawId, validName, c.phoneNumber);
                (0, contact_resolver_util_1.registerUniversalContact)(cleanId, validName, c.phoneNumber);
                if (!contactMap.has(cleanId) || c.accountId === accountId) {
                    contactMap.set(cleanId, validName);
                    contactMap.set(rawId, validName);
                    if (c.phoneNumber) {
                        contactMap.set(c.phoneNumber.replace(/\D/g, ''), validName);
                    }
                }
            }
            else if (c.phoneNumber && c.phoneNumber !== 'Direct Chat' && !c.phoneNumber.includes('LID')) {
                const ph = (0, contact_resolver_util_1.formatE164Phone)(c.phoneNumber) || c.phoneNumber;
                if (!contactMap.has(cleanId)) {
                    contactMap.set(cleanId, ph);
                    contactMap.set(rawId, ph);
                }
            }
        }
        const missingSnippetChats = chats.filter(c => !c.lastMessageText);
        if (missingSnippetChats.length > 0) {
            const missingJids = missingSnippetChats.map(c => c.id);
            const latestMsgs = await this.messageRepo.createQueryBuilder('msg')
                .where('msg.chatJid IN (:...missingJids)', { missingJids })
                .andWhere(isUniversal ? '1=1' : 'msg.accountId = :accountId', { accountId })
                .orderBy('msg.timestamp', 'DESC')
                .getMany()
                .catch(() => []);
            const msgByChatJid = new Map();
            for (const m of latestMsgs) {
                if (!msgByChatJid.has(m.chatJid)) {
                    msgByChatJid.set(m.chatJid, m);
                }
            }
            for (const chat of missingSnippetChats) {
                let latestMsg = msgByChatJid.get(chat.id);
                if (!latestMsg && chat.name && (0, contact_resolver_util_1.isProperName)(chat.name)) {
                    const sisterChat = chats.find(c => c.name === chat.name && c.lastMessageText && c.id !== chat.id);
                    if (sisterChat) {
                        chat.lastMessageText = sisterChat.lastMessageText;
                        chat.lastMessageTimestamp = Math.max(chat.lastMessageTimestamp || 0, sisterChat.lastMessageTimestamp || 0);
                        chat.lastMessageFromMe = sisterChat.lastMessageFromMe;
                        chat.lastMessageStatus = sisterChat.lastMessageStatus;
                        this.enqueueChatUpdate({ id: chat.id, accountId: chat.accountId }, {
                            lastMessageText: chat.lastMessageText,
                            lastMessageTimestamp: chat.lastMessageTimestamp,
                            lastMessageFromMe: chat.lastMessageFromMe,
                            lastMessageStatus: chat.lastMessageStatus,
                        });
                        continue;
                    }
                }
                if (latestMsg) {
                    const snip = latestMsg.text || (latestMsg.mediaType === 'image' ? '📷 Photo' :
                        latestMsg.mediaType === 'video' ? '🎥 Video' :
                            latestMsg.mediaType === 'audio' ? '🎵 Voice message' :
                                latestMsg.mediaType === 'document' ? '📎 Document' :
                                    latestMsg.mediaType === 'sticker' ? '🎨 Sticker' : '');
                    if (snip) {
                        chat.lastMessageText = snip;
                        if (!chat.lastMessageTimestamp || latestMsg.timestamp > chat.lastMessageTimestamp) {
                            chat.lastMessageTimestamp = latestMsg.timestamp;
                            chat.lastMessageFromMe = latestMsg.fromMe;
                            chat.lastMessageStatus = latestMsg.status || 'sent';
                        }
                        this.enqueueChatUpdate({ id: chat.id, accountId: chat.accountId }, {
                            lastMessageText: snip,
                            lastMessageTimestamp: chat.lastMessageTimestamp,
                            lastMessageFromMe: chat.lastMessageFromMe,
                            lastMessageStatus: chat.lastMessageStatus,
                        });
                    }
                }
            }
        }
        const pushNameCandidateChats = chats.filter(c => !c.isGroup &&
            (!c.name ||
                !(0, contact_resolver_util_1.isProperName)(c.name) ||
                c.name === 'Direct Chat' ||
                c.name === 'You (Message yourself)' ||
                c.name === 'WhatsApp User' ||
                /^\+?[\d\s\-()]{7,}$/.test(c.name.trim()) ||
                c.name === c.id ||
                c.name === c.id.split('@')[0].replace(/\+/g, '')));
        if (pushNameCandidateChats.length > 0) {
            const candidateJids = pushNameCandidateChats.map(c => c.id);
            const incomingMsgs = await this.messageRepo.createQueryBuilder('msg')
                .select(['msg.chatJid', 'msg.senderName', 'msg.timestamp'])
                .where('msg.chatJid IN (:...candidateJids)', { candidateJids })
                .andWhere('msg.fromMe = false')
                .andWhere('msg.senderName IS NOT NULL')
                .andWhere(isUniversal ? '1=1' : 'msg.accountId = :accountId', { accountId })
                .orderBy('msg.timestamp', 'DESC')
                .getMany()
                .catch(() => []);
            const pushNameByChatJid = new Map();
            for (const m of incomingMsgs) {
                if (!pushNameByChatJid.has(m.chatJid) && m.senderName && (0, contact_resolver_util_1.isProperName)(m.senderName)) {
                    pushNameByChatJid.set(m.chatJid, m.senderName.trim());
                }
            }
            for (const chat of pushNameCandidateChats) {
                const pushName = pushNameByChatJid.get(chat.id);
                if (pushName && (0, contact_resolver_util_1.isProperName)(pushName)) {
                    chat.name = pushName;
                    this.enqueueChatUpdate({ id: chat.id, accountId: chat.accountId }, { name: pushName });
                }
            }
        }
        for (const chat of chats) {
            const ownerAccount = accountMap.get(chat.accountId);
            chat.accountName = ownerAccount?.displayName || ownerAccount?.phoneNumber || 'Account';
            chat.accountPhone = ownerAccount?.phoneNumber || '';
            const rawId = chat.id.split('@')[0].replace(/\+/g, '');
            const dynamicName = contactMap.get(chat.id) || contactMap.get(rawId);
            const candidateChatName = (chat.name && (0, contact_resolver_util_1.isProperName)(chat.name)) ? chat.name : null;
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(chat.id, candidateChatName, null, dynamicName, chat.isGroup, ownerAccount?.phoneNumber);
            let finalChatName = resolved.name;
            const cleanDigits = rawId.replace(/\D/g, '');
            const isLid = (0, contact_resolver_util_1.isLidIdentifier)(chat.id);
            if (!chat.isGroup) {
                for (const acc of allAccounts) {
                    const accDigits = (acc.phoneNumber || '').replace(/\D/g, '');
                    const instance = this.baileysClientFactory.getClient(acc.id);
                    const socketLid = instance?.socket?.user?.lid?.split('@')[0]?.replace(/\D/g, '');
                    if ((accDigits && (cleanDigits === accDigits || chat.id.includes(accDigits))) ||
                        (socketLid && socketLid === cleanDigits)) {
                        if (acc.displayName && (0, contact_resolver_util_1.isProperName)(acc.displayName)) {
                            finalChatName = acc.displayName;
                            break;
                        }
                    }
                }
            }
            if (!chat.isGroup && (!finalChatName || !(0, contact_resolver_util_1.isProperName)(finalChatName) || finalChatName === 'Direct Chat' || finalChatName === 'You (Message yourself)' || finalChatName === 'WhatsApp User' || finalChatName.startsWith('User …') || finalChatName.startsWith('Contact') || finalChatName === 'Community Member')) {
                if (!isLid && cleanDigits.length >= 7) {
                    finalChatName = (0, contact_resolver_util_1.formatE164Phone)(cleanDigits) || `+${cleanDigits}`;
                }
                else if (isLid) {
                    const reg = contact_resolver_util_1.KNOWN_LID_MAP[cleanDigits] || contact_resolver_util_1.UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
                    if (reg?.name && (0, contact_resolver_util_1.isProperName)(reg.name)) {
                        finalChatName = reg.name;
                    }
                    else if (candidateChatName && (0, contact_resolver_util_1.isProperName)(candidateChatName)) {
                        finalChatName = candidateChatName;
                    }
                    else if (reg?.phone) {
                        finalChatName = reg.phone;
                    }
                }
            }
            chat.name = finalChatName;
            if (finalChatName && (0, contact_resolver_util_1.isProperName)(finalChatName) && finalChatName !== chat.name) {
                this.enqueueChatUpdate({ id: chat.id, accountId: chat.accountId }, { name: finalChatName });
            }
            else if (finalChatName && finalChatName !== candidateChatName) {
                this.enqueueChatUpdate({ id: chat.id, accountId: chat.accountId }, { name: finalChatName });
            }
            if (chat.lastMessageText) {
                chat.lastMessageText = chat.lastMessageText.replace(/^(120363\d+|[0-9]{15,}@g\.us):\s*/i, '');
            }
            if (chat.isGroup && (!(0, contact_resolver_util_1.isProperName)(chat.name) || chat.name === 'WhatsApp Group' || chat.id === chat.name || chat.name === '..')) {
                setImmediate(() => {
                    const instance = this.baileysClientFactory.getClient(chat.accountId);
                    if (instance?.socket?.groupMetadata) {
                        instance.socket.groupMetadata(chat.id).then((meta) => {
                            if (meta?.subject && (0, contact_resolver_util_1.isProperName)(meta.subject)) {
                                this.enqueueChatUpdate({ id: chat.id, accountId: chat.accountId }, { name: meta.subject, subtitle: meta.desc || undefined });
                            }
                        }).catch(() => null);
                    }
                });
            }
        }
        const dedupedChats = [];
        const seenContactKeys = new Set();
        for (const chat of chats) {
            if (chat.isGroup) {
                dedupedChats.push(chat);
                continue;
            }
            const rawId = chat.id.split('@')[0].replace(/\+/g, '');
            let canonicalContactId = rawId;
            if (contact_resolver_util_1.KNOWN_LID_MAP[rawId]) {
                canonicalContactId = contact_resolver_util_1.KNOWN_LID_MAP[rawId].phone.replace(/\D/g, '');
            }
            else {
                const ph = contactPhoneMap.get(chat.id) || contactPhoneMap.get(rawId);
                if (ph && ph !== 'Direct Chat' && !ph.includes('LID')) {
                    const digits = ph.replace(/\D/g, '');
                    if (digits.length >= 10)
                        canonicalContactId = digits;
                }
            }
            const collisionKey = `${chat.accountId}_${canonicalContactId}`;
            if (seenContactKeys.has(collisionKey)) {
                continue;
            }
            seenContactKeys.add(collisionKey);
            dedupedChats.push(chat);
        }
        setImmediate(() => {
            if (!isUniversal && accountId) {
                this.syncLidsInBackground(accountId).catch(() => null);
            }
        });
        this.chatsCache.set(cacheKey, {
            data: dedupedChats,
            expiresAt: Date.now() + 5000,
        });
        if (this.redis) {
            this.redis.setex(`wa:cache:chats:${cacheKey}`, 30, JSON.stringify(dedupedChats)).catch(() => null);
        }
        return dedupedChats;
    }
    async getMessages(accountId, chatJid, limit = 100, startDate, endDate, search, ghostMode = false) {
        let cleanJid = chatJid;
        try {
            cleanJid = decodeURIComponent(chatJid).trim();
        }
        catch {
            cleanJid = (chatJid || '').trim();
        }
        if (cleanJid === 'you_self' || cleanJid.startsWith('you_self')) {
            const activeAcc = await this.accountRepo.findOne({ where: { id: accountId } }).catch(() => null);
            if (activeAcc?.phoneNumber) {
                const cleanDigits = activeAcc.phoneNumber.replace(/\D/g, '');
                cleanJid = `${cleanDigits}@s.whatsapp.net`;
            }
        }
        const phone = cleanJid.split('@')[0].replace(/\+/g, '');
        if (!cleanJid.includes('@')) {
            cleanJid = `${phone}@s.whatsapp.net`;
        }
        const jidVariants = [
            cleanJid,
            `${phone}@s.whatsapp.net`,
            `${phone}@lid`,
        ];
        const currentContact = await this.contactRepo.findOne({
            where: [
                { id: cleanJid, accountId },
                { id: `${phone}@s.whatsapp.net`, accountId },
                { id: `${phone}@lid`, accountId },
            ]
        }).catch(() => null);
        const currentChat = await this.chatRepo.findOne({ where: { id: cleanJid, accountId } }).catch(() => null);
        const properContactName = (currentContact?.name && (0, contact_resolver_util_1.isProperName)(currentContact.name)) ? currentContact.name.trim() : null;
        const properChatName = (currentChat?.name && (0, contact_resolver_util_1.isProperName)(currentChat.name)) ? currentChat.name.trim() : null;
        const properNames = Array.from(new Set([properContactName, properChatName].filter(Boolean)));
        for (const [lidKey, info] of Object.entries(contact_resolver_util_1.KNOWN_LID_MAP)) {
            const cleanLid = lidKey.split('@')[0];
            const cleanPhoneDigits = info.phone.replace(/\D/g, '');
            if (cleanJid.includes(cleanLid) || phone === cleanLid || (cleanPhoneDigits && phone === cleanPhoneDigits)) {
                jidVariants.push(`${cleanLid}@lid`);
                if (cleanPhoneDigits) {
                    jidVariants.push(`${cleanPhoneDigits}@s.whatsapp.net`);
                }
            }
        }
        const linkedContacts = await this.contactRepo.find({
            where: [
                { id: cleanJid, accountId },
                { id: `${phone}@lid`, accountId },
                { id: `${phone}@s.whatsapp.net`, accountId },
                { phoneNumber: phone, accountId },
                { phoneNumber: `+${phone}`, accountId },
                ...(properNames.map(n => ({ name: n, accountId }))),
            ]
        }).catch(() => []);
        for (const c of linkedContacts) {
            if (c.id)
                jidVariants.push(c.id);
            if (c.phoneNumber) {
                const pDigits = c.phoneNumber.replace(/\D/g, '');
                if (pDigits && pDigits.length >= 10 && pDigits.length <= 13) {
                    jidVariants.push(`${pDigits}@s.whatsapp.net`);
                }
            }
        }
        if (properNames.length > 0) {
            const sisterChats = await this.chatRepo.find({
                where: properNames.map(n => ({ name: n, accountId }))
            }).catch(() => []);
            for (const sc of sisterChats) {
                if (sc.id) {
                    jidVariants.push(sc.id);
                    const scPhone = sc.id.split('@')[0].replace(/\+/g, '');
                    if (scPhone) {
                        jidVariants.push(`${scPhone}@s.whatsapp.net`);
                        jidVariants.push(`${scPhone}@lid`);
                    }
                }
            }
        }
        const uniqueJids = Array.from(new Set(jidVariants));
        const qb = this.messageRepo
            .createQueryBuilder('msg')
            .where('msg.accountId = :accountId', { accountId })
            .andWhere('msg.chatJid IN (:...jids)', { jids: uniqueJids })
            .andWhere('(msg.text IS NOT NULL AND msg.text != :empty OR msg.mediaType IS NOT NULL)', { empty: '' });
        if (search && search.trim()) {
            qb.andWhere('(LOWER(msg.text) LIKE :searchQuery OR LOWER(msg.fileName) LIKE :searchQuery)', {
                searchQuery: `%${search.trim().toLowerCase()}%`,
            });
        }
        if (startDate) {
            const startMs = new Date(startDate).getTime();
            qb.andWhere('msg.timestamp >= :startMs', { startMs });
        }
        if (endDate) {
            const endMs = new Date(endDate).getTime();
            qb.andWhere('msg.timestamp <= :endMs', { endMs });
        }
        const messages = await qb
            .orderBy('msg.timestamp', 'DESC')
            .take(limit)
            .getMany();
        const seen = new Set();
        const deduped = messages.filter(m => {
            if (seen.has(m.id))
                return false;
            seen.add(m.id);
            return true;
        });
        if (deduped.length === 0 && this.baileysClientFactory.isSocketConnected(accountId)) {
            this.baileysClientFactory.syncChatMessages(accountId, cleanJid, 25).catch(() => null);
        }
        const mediaDir = path.resolve(process.cwd(), 'data', 'media', accountId);
        let diskFiles = [];
        if (fs.existsSync(mediaDir)) {
            try {
                diskFiles = fs.readdirSync(mediaDir);
            }
            catch { }
        }
        for (const m of deduped) {
            if (!m.mediaUrl && diskFiles.length > 0) {
                const cleanMsgId = m.id.replace(/[^a-zA-Z0-9_-]/g, '_');
                const match = diskFiles.find(f => f.startsWith(cleanMsgId));
                if (match) {
                    m.mediaUrl = `/api/v1/whatsapp/media/${accountId}/${match}`;
                    if (!m.mediaType) {
                        const ext = path.extname(match).toLowerCase();
                        if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.heic'].includes(ext))
                            m.mediaType = 'image';
                        else if (['.mp4', '.webm', '.mov', '.mkv'].includes(ext))
                            m.mediaType = 'video';
                        else if (['.ogg', '.opus', '.mp3', '.wav', '.m4a'].includes(ext))
                            m.mediaType = 'audio';
                        else
                            m.mediaType = 'document';
                    }
                }
            }
        }
        if (!ghostMode) {
            this.enqueueChatUpdate({ id: cleanJid, accountId }, { unreadCount: 0 });
            this.invalidateChatsCache(accountId);
        }
        return deduped.reverse();
    }
    async clearChatMessages(accountId, chatJid) {
        let cleanJid = chatJid;
        try {
            cleanJid = decodeURIComponent(chatJid).trim();
        }
        catch {
            cleanJid = (chatJid || '').trim();
        }
        const phone = cleanJid.split('@')[0].replace(/\+/g, '');
        const jidVariants = [
            cleanJid,
            `${phone}@s.whatsapp.net`,
            `${phone}@lid`,
        ];
        for (const [lidKey, info] of Object.entries(contact_resolver_util_1.KNOWN_LID_MAP)) {
            const cleanLid = lidKey.split('@')[0];
            const cleanPhoneDigits = info.phone.replace(/\D/g, '');
            if (cleanJid.includes(cleanLid) || phone === cleanLid || (cleanPhoneDigits && phone === cleanPhoneDigits)) {
                jidVariants.push(`${cleanLid}@lid`);
                if (cleanPhoneDigits) {
                    jidVariants.push(`${cleanPhoneDigits}@s.whatsapp.net`);
                }
            }
        }
        const uniqueVariants = Array.from(new Set(jidVariants));
        let deletedCount = 0;
        try {
            const isUniversal = !accountId || accountId === 'all';
            const qb = this.messageRepo.createQueryBuilder()
                .delete()
                .where('chatJid IN (:...uniqueVariants)', { uniqueVariants });
            if (!isUniversal) {
                qb.andWhere('accountId = :accountId', { accountId });
            }
            const res = await qb.execute();
            deletedCount = res.affected || 0;
        }
        catch (e) {
            this.logger.warn(`Failed to delete messages for chat ${chatJid}: ${e?.message}`);
        }
        try {
            const chatUpdateQb = this.chatRepo.createQueryBuilder()
                .update()
                .set({ lastMessageText: '', unreadCount: 0 })
                .where('id IN (:...uniqueVariants)', { uniqueVariants });
            if (accountId && accountId !== 'all') {
                chatUpdateQb.andWhere('accountId = :accountId', { accountId });
            }
            await chatUpdateQb.execute();
        }
        catch (e) {
            this.logger.warn(`Failed to update chat snippet for ${chatJid}: ${e?.message}`);
        }
        this.chatsCache.clear();
        if (this.redis) {
            try {
                const keys = await this.redis.keys(`wa:cache:*`);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            }
            catch { }
        }
        this.logger.log(`[ClearMessages] Deleted ${deletedCount} messages for chat ${chatJid} on account ${accountId}`);
        return { success: true, deletedCount };
    }
    async getContacts(accountId, search) {
        const isUniversal = !accountId || accountId === 'all';
        const qb = this.contactRepo.createQueryBuilder('contact');
        if (!isUniversal) {
            qb.where('contact.accountId = :accountId', { accountId });
        }
        if (search && search.trim()) {
            const condition = '(contact.name LIKE :s OR contact.phoneNumber LIKE :s OR contact.notifyName LIKE :s)';
            if (isUniversal) {
                qb.where(condition, { s: `%${search.trim()}%` });
            }
            else {
                qb.andWhere(condition, { s: `%${search.trim()}%` });
            }
        }
        const baseExclusions = "contact.id NOT LIKE '%@g.us' AND contact.id != 'status@broadcast'";
        if (isUniversal && !search) {
            qb.where(baseExclusions);
        }
        else {
            qb.andWhere(baseExclusions);
        }
        qb.andWhere("(contact.id NOT LIKE '%@lid' OR (contact.name IS NOT NULL AND contact.name != '' AND contact.name NOT LIKE '+%' AND contact.name NOT LIKE 'Contact (%') OR (contact.notifyName IS NOT NULL AND contact.notifyName != '' AND contact.notifyName NOT LIKE '+%'))");
        qb.orderBy(`CASE WHEN contact.name IS NOT NULL AND contact.name != '' AND contact.name NOT LIKE '+%' THEN 0 ELSE 1 END`, 'ASC')
            .addOrderBy('contact.name', 'ASC')
            .addOrderBy('contact.phoneNumber', 'ASC');
        if (!search && !isUniversal) {
            qb.take(500);
        }
        const rawContacts = await qb.getMany();
        const account = !isUniversal ? await this.accountRepo.findOne({ where: { id: accountId } }) : null;
        const resolvedList = [];
        for (const c of rawContacts) {
            const isLid = (0, contact_resolver_util_1.isLidIdentifier)(c.id);
            const cleanDigits = c.id.split('@')[0].replace(/\D/g, '');
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(c.id, c.name, c.phoneNumber, c.notifyName, undefined, account?.phoneNumber);
            let cName = '';
            if ((0, contact_resolver_util_1.isProperName)(c.name)) {
                cName = c.name.trim();
            }
            else if ((0, contact_resolver_util_1.isProperName)(c.notifyName)) {
                cName = c.notifyName.trim();
            }
            else if ((0, contact_resolver_util_1.isProperName)(resolved.name)) {
                cName = resolved.name.trim();
            }
            if (!cName && ((0, contact_resolver_util_1.isEmojiOnly)(c.name) || (0, contact_resolver_util_1.isEmojiOnly)(c.notifyName))) {
                cName = (0, contact_resolver_util_1.isEmojiOnly)(c.name) ? c.name.trim() : c.notifyName.trim();
            }
            if (isLid && !cName) {
                continue;
            }
            const cleanPhone = (!isLid && cleanDigits.length >= 7) ? ((0, contact_resolver_util_1.formatE164Phone)(cleanDigits) || `+${cleanDigits}`) : '';
            if (!cName) {
                if (cleanPhone) {
                    cName = cleanPhone;
                }
                else {
                    continue;
                }
            }
            c.name = cName;
            c.phoneNumber = (resolved.phoneNumber && resolved.phoneNumber !== 'Direct Chat' && !resolved.phoneNumber.includes('LID'))
                ? resolved.phoneNumber
                : cleanPhone;
            resolvedList.push(c);
        }
        try {
            const directChatsQb = this.chatRepo.createQueryBuilder('chat')
                .where('chat.isGroup = :isGrp', { isGrp: false })
                .andWhere("chat.id NOT LIKE '%@g.us'")
                .andWhere("chat.id NOT LIKE '%@newsletter'")
                .andWhere("chat.id != 'status@broadcast'");
            if (!isUniversal) {
                directChatsQb.andWhere('chat.accountId = :accountId', { accountId });
            }
            const directChats = await directChatsQb.getMany().catch(() => []);
            const existingIds = new Set(resolvedList.map(c => c.id));
            for (const chat of directChats) {
                if (existingIds.has(chat.id))
                    continue;
                const isLid = (0, contact_resolver_util_1.isLidIdentifier)(chat.id);
                const cleanDigits = chat.id.split('@')[0].replace(/\D/g, '');
                const hasRealName = chat.name && (0, contact_resolver_util_1.isProperName)(chat.name);
                if (isLid && !hasRealName)
                    continue;
                const ph = !isLid && cleanDigits.length >= 7 ? ((0, contact_resolver_util_1.formatE164Phone)(cleanDigits) || `+${cleanDigits}`) : '';
                const cName = hasRealName ? chat.name : ph;
                if (!cName)
                    continue;
                existingIds.add(chat.id);
                resolvedList.push({
                    id: chat.id,
                    accountId: chat.accountId,
                    name: cName,
                    notifyName: hasRealName ? chat.name : '',
                    phoneNumber: ph,
                });
            }
        }
        catch { }
        if (isUniversal) {
            const seen = new Set();
            const deduped = [];
            for (const c of resolvedList) {
                const key = c.phoneNumber && c.phoneNumber.startsWith('+')
                    ? c.phoneNumber.replace(/\D/g, '')
                    : c.id.split('@')[0].replace(/\+/g, '');
                if (seen.has(key))
                    continue;
                seen.add(key);
                deduped.push(c);
            }
            return deduped;
        }
        return resolvedList;
    }
    async sendMessage(accountId, to, text, quotedMsgId) {
        return this.baileysClientFactory.sendMessage(accountId, to, text, quotedMsgId);
    }
    async sendVoiceNote(accountId, to, audioBuffer, quotedMsgId) {
        return this.baileysClientFactory.sendVoiceNote(accountId, to, audioBuffer, quotedMsgId);
    }
    async sendReaction(accountId, to, messageId, emoji, fromMe = false) {
        return this.baileysClientFactory.sendReaction(accountId, to, messageId, emoji, fromMe);
    }
    async cleanDemoAccounts() {
        this.logger.log('Cleaning up demo/test accounts safely...');
        try {
            const allAccounts = await this.accountRepo.find();
            const testAccounts = allAccounts.filter((acc) => {
                const phone = (acc.phoneNumber || '').toLowerCase();
                const name = (acc.displayName || '').toLowerCase();
                const id = acc.id;
                return (id.startsWith('test-') ||
                    id === 'test-123' ||
                    phone.includes('test') ||
                    phone.includes('scan') ||
                    phone.includes('qr') ||
                    phone.startsWith('pending_') ||
                    name.includes('test') ||
                    name.includes('demo'));
            });
            for (const acc of testAccounts) {
                await this.messageRepo.delete({ accountId: acc.id }).catch(() => null);
                await this.chatRepo.delete({ accountId: acc.id }).catch(() => null);
                await this.contactRepo.delete({ accountId: acc.id }).catch(() => null);
                await this.sessionHydrationService.terminateAccount(acc.id).catch(() => null);
                await this.accountRepo.delete(acc.id).catch(() => null);
            }
            return {
                success: true,
                message: `Cleaned up ${testAccounts.length} demo accounts successfully`,
            };
        }
        catch (err) {
            this.logger.error(`Error in cleanDemoAccounts: ${err.message}`);
            return { success: true, message: 'Cleaned up demo accounts' };
        }
    }
    async streamMedia(accountId, filename, res, customName, download = false) {
        const safeAccountId = accountId.replace(/[^a-zA-Z0-9_-]/g, '');
        if (!safeAccountId) {
            throw new common_1.BadRequestException('Invalid account identifier');
        }
        const safeFilename = path.basename(filename);
        const mediaDir = path.resolve(process.cwd(), 'data', 'media', safeAccountId);
        let filePath = path.resolve(mediaDir, safeFilename);
        if (!filePath.startsWith(mediaDir)) {
            throw new common_1.BadRequestException('Invalid media path traversal attempt');
        }
        let fileExists = false;
        try {
            await fs.promises.access(filePath, fs.constants.R_OK);
            fileExists = true;
        }
        catch {
            const basePrefix = path.parse(safeFilename).name;
            try {
                const files = await fs.promises.readdir(mediaDir);
                const match = files.find(f => f.startsWith(basePrefix) || path.parse(f).name === basePrefix);
                if (match) {
                    const candidatePath = path.resolve(mediaDir, path.basename(match));
                    if (candidatePath.startsWith(mediaDir)) {
                        filePath = candidatePath;
                        fileExists = true;
                    }
                }
            }
            catch { }
        }
        if (!fileExists) {
            throw new common_1.NotFoundException('Media file not found');
        }
        let stat;
        try {
            stat = await fs.promises.stat(filePath);
        }
        catch {
            throw new common_1.NotFoundException('Media file not found');
        }
        const effectiveExt = (customName && path.extname(customName).toLowerCase()) || path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.heic': 'image/heic',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.mkv': 'video/x-matroska',
            '.ogg': 'audio/ogg',
            '.opus': 'audio/ogg',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.pdf': 'application/pdf',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.txt': 'text/plain; charset=utf-8',
            '.csv': 'text/csv; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.xml': 'application/xml; charset=utf-8',
            '.zip': 'application/zip',
            '.rar': 'application/vnd.rar',
            '.7z': 'application/x-7z-compressed',
            '.tar': 'application/x-tar',
            '.gz': 'application/gzip',
        };
        const finalFilename = customName ? path.basename(customName) : safeFilename;
        const isInlineViewable = ['.pdf', '.txt', '.csv', '.json', '.xml', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4', '.webm', '.mov', '.mp3', '.ogg', '.opus', '.wav', '.m4a'].includes(effectiveExt);
        const dispositionType = (download || !isInlineViewable) ? 'attachment' : 'inline';
        res.setHeader('Content-Type', mimeTypes[effectiveExt] || 'application/octet-stream');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
        res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(finalFilename)}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
        fs.createReadStream(filePath).pipe(res);
    }
    async sendMedia(accountId, to, fileBuffer, fileName, mimeType, caption) {
        return this.baileysClientFactory.sendMediaMessage(accountId, to, fileBuffer, fileName, mimeType, caption);
    }
    async startQR(accountId, force) {
        const result = await this.baileysClientFactory.startQR(accountId, force);
        const qrCodeDataUrl = result?.qrCodeDataUrl || this.baileysClientFactory.getActiveQRCode(accountId) || undefined;
        return {
            success: true,
            message: result.alreadyConnected
                ? 'Account is already connected'
                : 'Fresh QR pairing initiated',
            alreadyConnected: result.alreadyConnected,
            qrCodeDataUrl,
        };
    }
    async getQR(accountId) {
        const qr = this.baileysClientFactory.getActiveQRCode(accountId);
        const isConnected = this.baileysClientFactory.isSocketConnected(accountId);
        return {
            success: true,
            isConnected,
            qrCodeDataUrl: qr,
        };
    }
    async saveChat(accountId, chatData) {
        this.invalidateChatsCache(accountId);
        return this.baileysClientFactory.saveChat(accountId, chatData);
    }
    async syncChatMessages(accountId, chatJid, count = 25) {
        let cleanJid = (chatJid || '').trim();
        if (cleanJid === 'you_self' || cleanJid.startsWith('you_self')) {
            const activeAcc = await this.accountRepo.findOne({ where: { id: accountId } }).catch(() => null);
            if (activeAcc?.phoneNumber) {
                const cleanDigits = activeAcc.phoneNumber.replace(/\D/g, '');
                cleanJid = `${cleanDigits}@s.whatsapp.net`;
            }
        }
        return this.baileysClientFactory.syncChatMessages(accountId, cleanJid, count);
    }
    async flushAccount(accountId) {
        await this.baileysClientFactory.preLogoutFlush(accountId);
        return { success: true, message: `Account ${accountId} flushed successfully` };
    }
    async syncAll(accountId) {
        return this.baileysClientFactory.syncAllData(accountId);
    }
    async reconnect(accountId) {
        const account = await this.accountRepo.findOne({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Account not found');
        const existing = this.baileysClientFactory.getClient(accountId);
        if (existing && this.baileysClientFactory.isSocketConnected(accountId)) {
            return { success: true, message: `Account ${accountId} is already connected and active` };
        }
        await this.sessionHydrationService.hydrateAccount(accountId);
        return { success: true, message: `Reconnection initiated for ${accountId}` };
    }
    async logout(accountId, disconnectedBy = 'Super Admin / Web User') {
        await this.baileysClientFactory.preLogoutFlush(accountId);
        await this.sessionHydrationService.terminateAccount(accountId, true);
        await this.accountRepo.update(accountId, { status: 'disconnected' });
        const acc = await this.accountRepo.findOne({ where: { id: accountId } }).catch(() => null);
        this.eventEmitter?.emit('account.disconnected', {
            accountId,
            accountName: acc?.displayName || acc?.phoneNumber || accountId,
            phoneNumber: acc?.phoneNumber,
            disconnectedBy: disconnectedBy || 'Super Admin / Web User',
            reason: 'Manual Disconnect / Stopped from Dashboard',
            disconnectedAt: Date.now(),
        });
        return { success: true, message: `Account ${accountId} logged out` };
    }
    async repairMedia(accountId) {
        const isAll = !accountId || accountId === 'all';
        const accounts = isAll
            ? await this.accountRepo.find()
            : await this.accountRepo.find({ where: { id: accountId } });
        if (!accounts.length) {
            return { success: false, message: 'No accounts found' };
        }
        let totalFixed = 0, totalRedownloaded = 0, totalFailed = 0;
        const results = {};
        for (const acc of accounts) {
            const r = await this.baileysClientFactory.repairMediaUrls(acc.id);
            results[acc.id] = r;
            totalFixed += r.fixed;
            totalRedownloaded += r.redownloaded;
            totalFailed += r.failed;
        }
        return {
            success: true,
            message: `Media repair complete. Backfilled: ${totalFixed}, Re-downloaded: ${totalRedownloaded}, Failed: ${totalFailed}`,
            totalFixed,
            totalRedownloaded,
            totalFailed,
            perAccount: results,
        };
    }
};
exports.WhatsappWebService = WhatsappWebService;
exports.WhatsappWebService = WhatsappWebService = WhatsappWebService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_chat_entity_1.WhatsappChatEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(whatsapp_contact_entity_1.WhatsappContactEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(whatsapp_message_entity_1.WhatsappMessageEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __param(6, (0, common_1.Optional)()),
    __param(6, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __param(7, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        baileys_client_factory_1.BaileysClientFactory,
        session_hydration_service_1.SessionHydrationService,
        ioredis_1.Redis,
        event_emitter_1.EventEmitter2])
], WhatsappWebService);
//# sourceMappingURL=whatsapp-web.service.js.map