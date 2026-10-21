import { Injectable, Logger, NotFoundException, BadRequestException, Inject, Optional, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';
import { WhatsappChatEntity } from '../../session-hydration/entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../../session-hydration/entities/whatsapp-contact.entity';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
import { SessionHydrationService } from '../../session-hydration/services/session-hydration.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { resolveContactInfo, formatE164Phone, isGroupJid, isLidIdentifier, registerUniversalContact, KNOWN_LID_MAP, KNOWN_PHONE_CONTACTS, isProperName, isEmojiOnly, UNIVERSAL_IDENTITY_REGISTRY } from '../utils/contact-resolver.util';

@Injectable()
export class WhatsappWebService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappWebService.name);

  constructor(
    @InjectRepository(WhatsappChatEntity)
    private readonly chatRepo: Repository<WhatsappChatEntity>,
    @InjectRepository(WhatsappContactEntity)
    private readonly contactRepo: Repository<WhatsappContactEntity>,
    @InjectRepository(WhatsappMessageEntity)
    private readonly messageRepo: Repository<WhatsappMessageEntity>,
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo: Repository<WhatsappAccountEntity>,
    private readonly baileysClientFactory: BaileysClientFactory,
    private readonly sessionHydrationService: SessionHydrationService,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  async onModuleInit() {
    try {
      // 1. Automatically bootstrap all account identities
      const accounts = await this.accountRepo.find();
      for (const acc of accounts) {
        if (acc.phoneNumber && acc.displayName && isProperName(acc.displayName)) {
          registerUniversalContact(acc.phoneNumber, acc.displayName);
        }
      }

      // 2. Automatically bootstrap all contacts with proper names from database
      const contacts = await this.contactRepo.find();
      for (const c of contacts) {
        const properName = isProperName(c.name) ? c.name : isProperName(c.notifyName) ? c.notifyName : null;
        if (properName && c.id) {
          registerUniversalContact(c.id, properName, c.phoneNumber);
        }
      }

      // 3. Automatically bootstrap all chats with proper names from database
      const chats = await this.chatRepo.find();
      for (const ch of chats) {
        if (ch.id && ch.name && isProperName(ch.name)) {
          registerUniversalContact(ch.id, ch.name);
        }
      }
      this.logger.log(`🚀 Automated Dynamic Identity Registry bootstrapped with ${UNIVERSAL_IDENTITY_REGISTRY.size} identities from database.`);
    } catch (err: any) {
      this.logger.warn(`Identity bootstrap warning: ${err.message}`);
    }
  }

  private syncedLidAccounts = new Set<string>();

  // ── Enterprise Performance: Non-Blocking Background DB Write Queue ────────
  private chatUpdateQueue: Array<{ criteria: { id: string; accountId: string }; partial: Partial<WhatsappChatEntity> }> = [];
  private isDrainingQueue = false;

  private enqueueChatUpdate(criteria: { id: string; accountId: string }, partial: Partial<WhatsappChatEntity>) {
    this.chatUpdateQueue.push({ criteria, partial });
    this.scheduleQueueDrain();
  }

  private scheduleQueueDrain() {
    if (this.isDrainingQueue) return;
    this.isDrainingQueue = true;
    setImmediate(() => this.drainChatUpdateQueue());
  }

  private async drainChatUpdateQueue() {
    try {
      while (this.chatUpdateQueue.length > 0) {
        const batch = this.chatUpdateQueue.splice(0, 50);
        for (const item of batch) {
          await this.chatRepo.update(item.criteria, item.partial).catch(() => null);
        }
      }
    } catch (err: any) {
      this.logger.debug(`Background write queue error: ${err.message}`);
    } finally {
      this.isDrainingQueue = false;
    }
  }

  // ── Enterprise Performance: Multi-Tier L1 Memory + L2 Redis Response Cache ─
  private chatsCache = new Map<string, { data: any[]; expiresAt: number }>();

  public async invalidateChatsCache(accountId?: string) {
    if (!accountId || accountId === 'all') {
      this.chatsCache.clear();
    } else {
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
      } catch (err: any) {
        this.logger.debug(`Redis cache invalidation notice: ${err.message}`);
      }
    }
  }

  private async syncLidsInBackground(accountId: string) {
    if (!accountId || accountId === 'all' || this.syncedLidAccounts.has(accountId)) return;
    this.syncedLidAccounts.add(accountId);

    try {
      const instance = this.baileysClientFactory.getClient(accountId);
      if (!instance?.socket?.onWhatsApp) return;

      const contacts = await this.contactRepo.find({
        where: { accountId },
        select: ['id', 'name', 'notifyName', 'phoneNumber'],
      }).catch(() => []);

      const phoneContacts = contacts.filter(c => c.phoneNumber && /^\+?\d{10,15}$/.test(c.phoneNumber.replace(/\s+/g, '')));
      if (!phoneContacts.length) return;

      for (let i = 0; i < phoneContacts.length; i += 40) {
        const batch = phoneContacts.slice(i, i + 40);
        const phones = batch.map(c => c.phoneNumber.replace(/\s+/g, ''));
        try {
          const results = await instance.socket.onWhatsApp(...phones);
          if (Array.isArray(results)) {
            for (const r of results) {
              if (r.lid) {
                const cleanLid = (r.lid as string).split('@')[0];
                const cleanPn = (r.jid || '').split('@')[0].replace(/\+/g, '');
                const matchedContact = batch.find(c => c.phoneNumber.replace(/\D/g, '') === cleanPn || c.id.includes(cleanPn));
                const contactName = (matchedContact?.name && matchedContact.name !== 'WhatsApp User' && !matchedContact.name.startsWith('Contact (')) ? matchedContact.name :
                                    (matchedContact?.notifyName && matchedContact.notifyName !== 'WhatsApp User' && !matchedContact.notifyName.startsWith('Contact (')) ? matchedContact.notifyName :
                                    formatE164Phone(cleanPn);

                if (contactName) {
                  registerUniversalContact(r.lid as string, contactName, formatE164Phone(cleanPn));
                  registerUniversalContact(cleanLid, contactName, formatE164Phone(cleanPn));

                  // Auto-heal any chat matching this LID via non-blocking write queue
                  this.enqueueChatUpdate({ id: r.lid as string, accountId }, { name: contactName });
                  this.enqueueChatUpdate({ id: `${cleanLid}@lid`, accountId }, { name: contactName });
                }
              }
            }
          }
        } catch (e: any) {
          this.logger.debug(`LID batch resolution info: ${e.message}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Background LID sync error: ${err.message}`);
    }
  }

  async getChats(accountId: string, search?: string, limit = 500, offset = 0, startDate?: string, endDate?: string) {
    // 1. Fast path: check L1 in-memory TTL response cache (< 1ms latency)
    const cacheKey = `${accountId || 'all'}_${search ? search.trim() : ''}_${limit}_${offset}_${startDate || ''}_${endDate || ''}`;
    const now = Date.now();
    const cached = this.chatsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // 2. Check L2 Redis cache
    if (this.redis) {
      try {
        const redisData = await this.redis.get(`wa:cache:chats:${cacheKey}`);
        if (redisData) {
          const parsed = JSON.parse(redisData);
          this.chatsCache.set(cacheKey, { data: parsed, expiresAt: now + 5000 });
          return parsed;
        }
      } catch { /* fallback to DB */ }
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
      } else {
        qb.andWhere(condition, { s: `%${search.trim()}%` });
      }
    }

    // Filter by specific time duration / date range
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

    // Lean Projection: Fetch only the fields needed for chat list display
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

    // 2. Fetch account and contact metadata in parallel O(1) hash maps (Global cross-account address book)
    const [allAccounts, allContacts] = await Promise.all([
      this.accountRepo.find().catch(() => [] as WhatsappAccountEntity[]),
      this.contactRepo.find({
        select: ['id', 'accountId', 'name', 'notifyName', 'phoneNumber'],
      }).catch(() => [] as WhatsappContactEntity[]),
    ]);

    const accountMap = new Map(allAccounts.map(a => [a.id, a]));
    const contactMap = new Map<string, string>();
    const contactPhoneMap = new Map<string, string>();

    // Pass 1: populate cross-account directory with priority to active account
    for (const c of allContacts) {
      if (c.id && c.phoneNumber) {
        contactPhoneMap.set(c.id, c.phoneNumber);
      }
      const cleanId = (c.id || '').trim();
      const rawId = cleanId.split('@')[0].replace(/\+/g, '');
      const validName = isProperName(c.name) ? c.name!.trim() :
                        isProperName(c.notifyName) ? c.notifyName!.trim() : null;

      if (validName) {
        registerUniversalContact(rawId, validName, c.phoneNumber);
        registerUniversalContact(cleanId, validName, c.phoneNumber);
        // Active account's contacts override other accounts
        if (!contactMap.has(cleanId) || c.accountId === accountId) {
          contactMap.set(cleanId, validName);
          contactMap.set(rawId, validName);
          if (c.phoneNumber) {
            contactMap.set(c.phoneNumber.replace(/\D/g, ''), validName);
          }
        }
      } else if (c.phoneNumber && c.phoneNumber !== 'Direct Chat' && !c.phoneNumber.includes('LID')) {
        const ph = formatE164Phone(c.phoneNumber) || c.phoneNumber;
        if (!contactMap.has(cleanId)) {
          contactMap.set(cleanId, ph);
          contactMap.set(rawId, ph);
        }
      }
    }

    // 3. Batch resolve missing snippets in ONE single query (eliminates N+1 loop)
    const missingSnippetChats = chats.filter(c => !c.lastMessageText);
    if (missingSnippetChats.length > 0) {
      const missingJids = missingSnippetChats.map(c => c.id);
      const latestMsgs = await this.messageRepo.createQueryBuilder('msg')
        .where('msg.chatJid IN (:...missingJids)', { missingJids })
        .andWhere(isUniversal ? '1=1' : 'msg.accountId = :accountId', { accountId })
        .orderBy('msg.timestamp', 'DESC')
        .getMany()
        .catch(() => [] as WhatsappMessageEntity[]);

      const msgByChatJid = new Map<string, WhatsappMessageEntity>();
      for (const m of latestMsgs) {
        if (!msgByChatJid.has(m.chatJid)) {
          msgByChatJid.set(m.chatJid, m);
        }
      }

      for (const chat of missingSnippetChats) {
        let latestMsg = msgByChatJid.get(chat.id);
        // If not found directly by JID, check sister chats by proper name to inherit authentic snippet
        if (!latestMsg && chat.name && isProperName(chat.name)) {
          const sisterChat = chats.find(c => c.name === chat.name && c.lastMessageText && c.id !== chat.id);
          if (sisterChat) {
            chat.lastMessageText = sisterChat.lastMessageText;
            chat.lastMessageTimestamp = Math.max(chat.lastMessageTimestamp || 0, sisterChat.lastMessageTimestamp || 0);
            chat.lastMessageFromMe = sisterChat.lastMessageFromMe;
            chat.lastMessageStatus = sisterChat.lastMessageStatus;
            this.enqueueChatUpdate(
              { id: chat.id, accountId: chat.accountId },
              {
                lastMessageText: chat.lastMessageText,
                lastMessageTimestamp: chat.lastMessageTimestamp,
                lastMessageFromMe: chat.lastMessageFromMe,
                lastMessageStatus: chat.lastMessageStatus,
              }
            );
            continue;
          }
        }

        if (latestMsg) {
          const snip = latestMsg.text || (
            latestMsg.mediaType === 'image' ? '📷 Photo' :
            latestMsg.mediaType === 'video' ? '🎥 Video' :
            latestMsg.mediaType === 'audio' ? '🎵 Voice message' :
            latestMsg.mediaType === 'document' ? '📎 Document' :
            latestMsg.mediaType === 'sticker' ? '🎨 Sticker' : ''
          );
          if (snip) {
            chat.lastMessageText = snip;
            if (!chat.lastMessageTimestamp || latestMsg.timestamp > chat.lastMessageTimestamp) {
              chat.lastMessageTimestamp = latestMsg.timestamp;
              chat.lastMessageFromMe = latestMsg.fromMe;
              chat.lastMessageStatus = latestMsg.status || 'sent';
            }
            this.enqueueChatUpdate(
              { id: chat.id, accountId: chat.accountId },
              {
                lastMessageText: snip,
                lastMessageTimestamp: chat.lastMessageTimestamp,
                lastMessageFromMe: chat.lastMessageFromMe,
                lastMessageStatus: chat.lastMessageStatus,
              }
            );
          }
        }
      }
    }

    // 4. Batch resolve pushNames for non-group chats with raw phone numbers or placeholder names in ONE single query
    const pushNameCandidateChats = chats.filter(c =>
      !c.isGroup &&
      (!c.name ||
       !isProperName(c.name) ||
       c.name === 'Direct Chat' ||
       c.name === 'You (Message yourself)' ||
       c.name === 'WhatsApp User' ||
       /^\+?[\d\s\-()]{7,}$/.test(c.name.trim()) ||
       c.name === c.id ||
       c.name === c.id.split('@')[0].replace(/\+/g, ''))
    );
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
        .catch(() => [] as WhatsappMessageEntity[]);

      const pushNameByChatJid = new Map<string, string>();
      for (const m of incomingMsgs) {
        if (!pushNameByChatJid.has(m.chatJid) && m.senderName && isProperName(m.senderName)) {
          pushNameByChatJid.set(m.chatJid, m.senderName.trim());
        }
      }

      for (const chat of pushNameCandidateChats) {
        const pushName = pushNameByChatJid.get(chat.id);
        if (pushName && isProperName(pushName)) {
          chat.name = pushName;
          this.enqueueChatUpdate(
            { id: chat.id, accountId: chat.accountId },
            { name: pushName }
          );
        }
      }
    }

    // 5. In-memory name resolution & sanitization loop (0 DB queries inside loop)
    for (const chat of chats) {
      const ownerAccount = accountMap.get(chat.accountId);
      (chat as any).accountName = ownerAccount?.displayName || ownerAccount?.phoneNumber || 'Account';
      (chat as any).accountPhone = ownerAccount?.phoneNumber || '';

      const rawId = chat.id.split('@')[0].replace(/\+/g, '');
      const dynamicName = contactMap.get(chat.id) || contactMap.get(rawId);

      const candidateChatName = (chat.name && isProperName(chat.name)) ? chat.name : null;

      const resolved = resolveContactInfo(
        chat.id,
        candidateChatName,
        null,
        dynamicName,
        chat.isGroup,
        ownerAccount?.phoneNumber
      );

      let finalChatName = resolved.name;
      const cleanDigits = rawId.replace(/\D/g, '');

      const isLid = isLidIdentifier(chat.id);

      // Check dynamically if this chat corresponds to any connected account owner
      if (!chat.isGroup) {
        for (const acc of allAccounts) {
          const accDigits = (acc.phoneNumber || '').replace(/\D/g, '');
          const instance = this.baileysClientFactory.getClient(acc.id);
          const socketLid = (instance?.socket?.user as any)?.lid?.split('@')[0]?.replace(/\D/g, '');
          if (
            (accDigits && (cleanDigits === accDigits || chat.id.includes(accDigits))) ||
            (socketLid && socketLid === cleanDigits)
          ) {
            if (acc.displayName && isProperName(acc.displayName)) {
              finalChatName = acc.displayName;
              break;
            }
          }
        }
      }

      if (!chat.isGroup && (!finalChatName || !isProperName(finalChatName) || finalChatName === 'Direct Chat' || finalChatName === 'You (Message yourself)' || finalChatName === 'WhatsApp User' || finalChatName.startsWith('User …') || finalChatName.startsWith('Contact') || finalChatName === 'Community Member')) {
        if (!isLid && cleanDigits.length >= 7) {
          finalChatName = formatE164Phone(cleanDigits) || `+${cleanDigits}`;
        } else if (isLid) {
          const reg = KNOWN_LID_MAP[cleanDigits] || UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
          if (reg?.name && isProperName(reg.name)) {
            finalChatName = reg.name;
          } else if (candidateChatName && isProperName(candidateChatName)) {
            finalChatName = candidateChatName;
          } else if (reg?.phone) {
            finalChatName = reg.phone;
          }
        }
      }
      chat.name = finalChatName;

      // Auto-heal DB via non-blocking write queue
      if (finalChatName && isProperName(finalChatName) && finalChatName !== chat.name) {
        this.enqueueChatUpdate(
          { id: chat.id, accountId: chat.accountId },
          { name: finalChatName }
        );
      } else if (finalChatName && finalChatName !== candidateChatName) {
        this.enqueueChatUpdate(
          { id: chat.id, accountId: chat.accountId },
          { name: finalChatName }
        );
      }

      // Clean message snippet (strip raw group JIDs like 120363407791015930:)
      if (chat.lastMessageText) {
        chat.lastMessageText = chat.lastMessageText.replace(/^(120363\d+|[0-9]{15,}@g\.us):\s*/i, '');
      }

      // Dynamic auto-healing for groups: offloaded to non-blocking microtask
      if (chat.isGroup && (!isProperName(chat.name) || chat.name === 'WhatsApp Group' || chat.id === chat.name || chat.name === '..')) {
        setImmediate(() => {
          const instance = this.baileysClientFactory.getClient(chat.accountId);
          if (instance?.socket?.groupMetadata) {
            instance.socket.groupMetadata(chat.id).then((meta) => {
              if (meta?.subject && isProperName(meta.subject)) {
                this.enqueueChatUpdate(
                  { id: chat.id, accountId: chat.accountId },
                  { name: meta.subject, subtitle: meta.desc || undefined },
                );
              }
            }).catch(() => null);
          }
        });
      }
    }

    // 6. Option B: Deduplicate only within the SAME account
    const dedupedChats: typeof chats = [];
    const seenContactKeys = new Set<string>();

    for (const chat of chats) {
      if (chat.isGroup) {
        dedupedChats.push(chat);
        continue;
      }

      const rawId = chat.id.split('@')[0].replace(/\+/g, '');
      let canonicalContactId = rawId;
      if (KNOWN_LID_MAP[rawId]) {
        canonicalContactId = KNOWN_LID_MAP[rawId].phone.replace(/\D/g, '');
      } else {
        const ph = contactPhoneMap.get(chat.id) || contactPhoneMap.get(rawId);
        if (ph && ph !== 'Direct Chat' && !ph.includes('LID')) {
          const digits = ph.replace(/\D/g, '');
          if (digits.length >= 10) canonicalContactId = digits;
        }
      }

      const collisionKey = `${chat.accountId}_${canonicalContactId}`;

      if (seenContactKeys.has(collisionKey)) {
        continue;
      }
      seenContactKeys.add(collisionKey);
      dedupedChats.push(chat);
    }

    // 7. Non-blocking trigger of background LID discovery (does not delay response)
    setImmediate(() => {
      if (!isUniversal && accountId) {
        this.syncLidsInBackground(accountId).catch(() => null);
      }
    });

    // 8. Cache response: L1 Memory (5s TTL) + L2 Redis (30s TTL)
    this.chatsCache.set(cacheKey, {
      data: dedupedChats,
      expiresAt: Date.now() + 5000,
    });

    if (this.redis) {
      this.redis.setex(`wa:cache:chats:${cacheKey}`, 30, JSON.stringify(dedupedChats)).catch(() => null);
    }

    return dedupedChats;
  }

  async getMessages(
    accountId: string,
    chatJid: string,
    limit = 100,
    startDate?: string,
    endDate?: string,
    search?: string,
    ghostMode = false,
  ) {
    let cleanJid = chatJid;
    try {
      cleanJid = decodeURIComponent(chatJid).trim();
    } catch {
      cleanJid = (chatJid || '').trim();
    }

    // Normalize 'you_self' or self-chat to active account's own phone number JID
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

    // Build the exact set of JID variants for this contact.
    // WhatsApp uses @lid (Linked ID) and @s.whatsapp.net for the same person —
    // we must fetch from BOTH variants but deduplicate by message ID so we don't
    // show the same message twice.
    const jidVariants = [
      cleanJid,
      `${phone}@s.whatsapp.net`,
      `${phone}@lid`,
    ];

    // Find current contact and chat to discover authentic name
    const currentContact = await this.contactRepo.findOne({
      where: [
        { id: cleanJid, accountId },
        { id: `${phone}@s.whatsapp.net`, accountId },
        { id: `${phone}@lid`, accountId },
      ]
    }).catch(() => null);

    const currentChat = await this.chatRepo.findOne({ where: { id: cleanJid, accountId } }).catch(() => null);
    const properContactName = (currentContact?.name && isProperName(currentContact.name)) ? currentContact.name.trim() : null;
    const properChatName = (currentChat?.name && isProperName(currentChat.name)) ? currentChat.name.trim() : null;
    const properNames = Array.from(new Set([properContactName, properChatName].filter(Boolean))) as string[];

    // Cross-link known LIDs <-> phone numbers bidirectionally from KNOWN_LID_MAP
    for (const [lidKey, info] of Object.entries(KNOWN_LID_MAP)) {
      const cleanLid = lidKey.split('@')[0];
      const cleanPhoneDigits = info.phone.replace(/\D/g, '');
      if (cleanJid.includes(cleanLid) || phone === cleanLid || (cleanPhoneDigits && phone === cleanPhoneDigits)) {
        jidVariants.push(`${cleanLid}@lid`);
        if (cleanPhoneDigits) {
          jidVariants.push(`${cleanPhoneDigits}@s.whatsapp.net`);
        }
      }
    }

    // Also check contacts table for matching phone, LID, or authentic name
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
      if (c.id) jidVariants.push(c.id);
      if (c.phoneNumber) {
        const pDigits = c.phoneNumber.replace(/\D/g, '');
        if (pDigits && pDigits.length >= 10 && pDigits.length <= 13) {
          jidVariants.push(`${pDigits}@s.whatsapp.net`);
        }
      }
    }

    // Also look up sister chats in whatsapp_chats with the same authentic name (e.g. Vinod @lid vs @s.whatsapp.net)
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
      // Only return messages that have actual displayable content
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

    // Deduplicate by message ID in case both JID variants have the same message saved
    const seen = new Set<string>();
    const deduped = messages.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    // If no messages exist in local DB and socket is active, trigger background on-demand message history sync
    if (deduped.length === 0 && this.baileysClientFactory.isSocketConnected(accountId)) {
      this.baileysClientFactory.syncChatMessages(accountId, cleanJid, 25).catch(() => null);
    }

    // Auto-resolve mediaUrl for any message if file exists on disk
    const mediaDir = path.resolve(process.cwd(), 'data', 'media', accountId);
    let diskFiles: string[] = [];
    if (fs.existsSync(mediaDir)) {
      try {
        diskFiles = fs.readdirSync(mediaDir);
      } catch {}
    }

    for (const m of deduped) {
      if (!m.mediaUrl && diskFiles.length > 0) {
        const cleanMsgId = m.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const match = diskFiles.find(f => f.startsWith(cleanMsgId));
        if (match) {
          m.mediaUrl = `/api/v1/whatsapp/media/${accountId}/${match}`;
          if (!m.mediaType) {
            const ext = path.extname(match).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.heic'].includes(ext)) m.mediaType = 'image';
            else if (['.mp4', '.webm', '.mov', '.mkv'].includes(ext)) m.mediaType = 'video';
            else if (['.ogg', '.opus', '.mp3', '.wav', '.m4a'].includes(ext)) m.mediaType = 'audio';
            else m.mediaType = 'document';
          }
        }
      }
    }

    // Reset unread count for this chat asynchronously and invalidate cache (suppressed in Ghost Mode)
    if (!ghostMode) {
      this.enqueueChatUpdate({ id: cleanJid, accountId }, { unreadCount: 0 });
      this.invalidateChatsCache(accountId);
    }

    // Return in chronological order (oldest to newest) for timeline display
    return deduped.reverse();
  }

  async clearChatMessages(accountId: string, chatJid: string) {
    let cleanJid = chatJid;
    try {
      cleanJid = decodeURIComponent(chatJid).trim();
    } catch {
      cleanJid = (chatJid || '').trim();
    }
    const phone = cleanJid.split('@')[0].replace(/\+/g, '');
    const jidVariants = [
      cleanJid,
      `${phone}@s.whatsapp.net`,
      `${phone}@lid`,
    ];
    for (const [lidKey, info] of Object.entries(KNOWN_LID_MAP)) {
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

    // 1. Delete messages from SQLite repository
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
    } catch (e: any) {
      this.logger.warn(`Failed to delete messages for chat ${chatJid}: ${e?.message}`);
    }

    // 2. Reset last message snippet and unread counter on the chat
    try {
      const chatUpdateQb = this.chatRepo.createQueryBuilder()
        .update()
        .set({ lastMessageText: '', unreadCount: 0 })
        .where('id IN (:...uniqueVariants)', { uniqueVariants });
      if (accountId && accountId !== 'all') {
        chatUpdateQb.andWhere('accountId = :accountId', { accountId });
      }
      await chatUpdateQb.execute();
    } catch (e: any) {
      this.logger.warn(`Failed to update chat snippet for ${chatJid}: ${e?.message}`);
    }

    // 3. Clear memory and Redis caches
    this.chatsCache.clear();
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`wa:cache:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch {}
    }

    this.logger.log(`[ClearMessages] Deleted ${deletedCount} messages for chat ${chatJid} on account ${accountId}`);
    return { success: true, deletedCount };
  }

  async getContacts(accountId: string, search?: string) {
    const isUniversal = !accountId || accountId === 'all';
    const qb = this.contactRepo.createQueryBuilder('contact');

    if (!isUniversal) {
      qb.where('contact.accountId = :accountId', { accountId });
    }

    if (search && search.trim()) {
      const condition = '(contact.name LIKE :s OR contact.phoneNumber LIKE :s OR contact.notifyName LIKE :s)';
      if (isUniversal) {
        qb.where(condition, { s: `%${search.trim()}%` });
      } else {
        qb.andWhere(condition, { s: `%${search.trim()}%` });
      }
    }

    // Exclude group chats and broadcast channels from contacts list
    const baseExclusions = "contact.id NOT LIKE '%@g.us' AND contact.id != 'status@broadcast'";
    if (isUniversal && !search) {
      qb.where(baseExclusions);
    } else {
      qb.andWhere(baseExclusions);
    }

    // Exclude anonymous unmapped LIDs lacking an authentic name
    qb.andWhere(
      "(contact.id NOT LIKE '%@lid' OR (contact.name IS NOT NULL AND contact.name != '' AND contact.name NOT LIKE '+%' AND contact.name NOT LIKE 'Contact (%') OR (contact.notifyName IS NOT NULL AND contact.notifyName != '' AND contact.notifyName NOT LIKE '+%'))",
    );

    qb.orderBy(`CASE WHEN contact.name IS NOT NULL AND contact.name != '' AND contact.name NOT LIKE '+%' THEN 0 ELSE 1 END`, 'ASC')
      .addOrderBy('contact.name', 'ASC')
      .addOrderBy('contact.phoneNumber', 'ASC');

    if (!search && !isUniversal) {
      qb.take(500);
    }
    const rawContacts = await qb.getMany();
    const account = !isUniversal ? await this.accountRepo.findOne({ where: { id: accountId } }) : null;

    const resolvedList: typeof rawContacts = [];
    for (const c of rawContacts) {
      const isLid = isLidIdentifier(c.id);
      const cleanDigits = c.id.split('@')[0].replace(/\D/g, '');
      const resolved = resolveContactInfo(c.id, c.name, c.phoneNumber, c.notifyName, undefined, account?.phoneNumber);

      // Determine genuine human name
      let cName = '';
      if (isProperName(c.name)) {
        cName = c.name!.trim();
      } else if (isProperName(c.notifyName)) {
        cName = c.notifyName!.trim();
      } else if (isProperName(resolved.name)) {
        cName = resolved.name.trim();
      }

      // Check emoji-only names
      if (!cName && (isEmojiOnly(c.name) || isEmojiOnly(c.notifyName))) {
        cName = isEmojiOnly(c.name) ? c.name!.trim() : c.notifyName!.trim();
      }

      // If contact is an LID and has NO authentic name, DISCARD it
      if (isLid && !cName) {
        continue;
      }

      // If genuine phone contact without name, use formatted phone number
      const cleanPhone = (!isLid && cleanDigits.length >= 7) ? (formatE164Phone(cleanDigits) || `+${cleanDigits}`) : '';
      if (!cName) {
        if (cleanPhone) {
          cName = cleanPhone;
        } else {
          continue;
        }
      }

      c.name = cName;
      c.phoneNumber = (resolved.phoneNumber && resolved.phoneNumber !== 'Direct Chat' && !resolved.phoneNumber.includes('LID'))
        ? resolved.phoneNumber
        : cleanPhone;

      resolvedList.push(c);
    }

    // Also include direct 1-to-1 chats so direct conversation contacts are always available
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
        if (existingIds.has(chat.id)) continue;
        const isLid = isLidIdentifier(chat.id);
        const cleanDigits = chat.id.split('@')[0].replace(/\D/g, '');
        const hasRealName = chat.name && isProperName(chat.name);
        if (isLid && !hasRealName) continue;

        const ph = !isLid && cleanDigits.length >= 7 ? (formatE164Phone(cleanDigits) || `+${cleanDigits}`) : '';
        const cName = hasRealName ? chat.name : ph;
        if (!cName) continue;

        existingIds.add(chat.id);
        resolvedList.push({
          id: chat.id,
          accountId: chat.accountId,
          name: cName,
          notifyName: hasRealName ? chat.name : '',
          phoneNumber: ph,
        } as any);
      }
    } catch {}

    if (isUniversal) {
      // Deduplicate contacts across accounts by phone number or raw ID
      const seen = new Set<string>();
      const deduped: typeof rawContacts = [];
      for (const c of resolvedList) {
        const key = c.phoneNumber && c.phoneNumber.startsWith('+')
          ? c.phoneNumber.replace(/\D/g, '')
          : c.id.split('@')[0].replace(/\+/g, '');
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(c);
      }
      return deduped;
    }

    return resolvedList;
  }

  async sendMessage(accountId: string, to: string, text: string, quotedMsgId?: string) {
    return this.baileysClientFactory.sendMessage(accountId, to, text, quotedMsgId);
  }

  async sendVoiceNote(accountId: string, to: string, audioBuffer: Buffer, quotedMsgId?: string) {
    return this.baileysClientFactory.sendVoiceNote(accountId, to, audioBuffer, quotedMsgId);
  }

  async sendReaction(accountId: string, to: string, messageId: string, emoji: string, fromMe = false) {
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
        return (
          id.startsWith('test-') ||
          id === 'test-123' ||
          phone.includes('test') ||
          phone.includes('scan') ||
          phone.includes('qr') ||
          phone.startsWith('pending_') ||
          name.includes('test') ||
          name.includes('demo')
        );
      });

      for (const acc of testAccounts) {
        // Cascade delete all associated tables safely
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
    } catch (err: any) {
      this.logger.error(`Error in cleanDemoAccounts: ${err.message}`);
      return { success: true, message: 'Cleaned up demo accounts' };
    }
  }

  async streamMedia(
    accountId: string,
    filename: string,
    res: any,
    customName?: string,
    download = false,
  ) {
    const safeAccountId = accountId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeAccountId) {
      throw new BadRequestException('Invalid account identifier');
    }
    const safeFilename = path.basename(filename);
    const mediaDir = path.resolve(process.cwd(), 'data', 'media', safeAccountId);
    let filePath = path.resolve(mediaDir, safeFilename);

    if (!filePath.startsWith(mediaDir)) {
      throw new BadRequestException('Invalid media path traversal attempt');
    }

    let fileExists = false;
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      fileExists = true;
    } catch {
      // Fallback: check if file exists with matching prefix (e.g. without extension or different ext)
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
      } catch {}
    }

    if (!fileExists) {
      throw new NotFoundException('Media file not found');
    }

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      throw new NotFoundException('Media file not found');
    }

    const effectiveExt = (customName && path.extname(customName).toLowerCase()) || path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
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
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${encodeURIComponent(finalFilename)}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`,
    );

    fs.createReadStream(filePath).pipe(res);
  }

  async sendMedia(
    accountId: string,
    to: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    caption?: string,
  ) {
    return this.baileysClientFactory.sendMediaMessage(
      accountId,
      to,
      fileBuffer,
      fileName,
      mimeType,
      caption,
    );
  }

  async startQR(accountId: string, force?: boolean) {
    const result = await this.baileysClientFactory.startQR(accountId, force);
    const qrCodeDataUrl = (result as any)?.qrCodeDataUrl || this.baileysClientFactory.getActiveQRCode(accountId) || undefined;
    return {
      success: true,
      message: result.alreadyConnected
        ? 'Account is already connected'
        : 'Fresh QR pairing initiated',
      alreadyConnected: result.alreadyConnected,
      qrCodeDataUrl,
    };
  }

  async getQR(accountId: string) {
    const qr = this.baileysClientFactory.getActiveQRCode(accountId);
    const isConnected = this.baileysClientFactory.isSocketConnected(accountId);
    return {
      success: true,
      isConnected,
      qrCodeDataUrl: qr,
    };
  }

  async saveChat(accountId: string, chatData: { id: string; name?: string; isGroup?: boolean }) {
    this.invalidateChatsCache(accountId);
    return this.baileysClientFactory.saveChat(accountId, chatData);
  }

  async syncChatMessages(accountId: string, chatJid: string, count = 25) {
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

  async flushAccount(accountId: string) {
    await this.baileysClientFactory.preLogoutFlush(accountId);
    return { success: true, message: `Account ${accountId} flushed successfully` };
  }

  async syncAll(accountId: string) {
    return this.baileysClientFactory.syncAllData(accountId);
  }

  async reconnect(accountId: string) {
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');
    const existing = this.baileysClientFactory.getClient(accountId);
    if (existing && this.baileysClientFactory.isSocketConnected(accountId)) {
      return { success: true, message: `Account ${accountId} is already connected and active` };
    }
    await this.sessionHydrationService.hydrateAccount(accountId);
    return { success: true, message: `Reconnection initiated for ${accountId}` };
  }

  async logout(accountId: string, disconnectedBy: string = 'Super Admin / Web User') {
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

  /** Repair missing mediaUrl entries for an account (or all accounts). */
  async repairMedia(accountId: string) {
    const isAll = !accountId || accountId === 'all';
    const accounts = isAll
      ? await this.accountRepo.find()
      : await this.accountRepo.find({ where: { id: accountId } });

    if (!accounts.length) {
      return { success: false, message: 'No accounts found' };
    }

    let totalFixed = 0, totalRedownloaded = 0, totalFailed = 0;
    const results: Record<string, any> = {};

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
}
