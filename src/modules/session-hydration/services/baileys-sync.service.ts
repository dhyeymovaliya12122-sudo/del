import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WASocket } from 'baileys';
import { WhatsappChatEntity } from '../entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../entities/whatsapp-contact.entity';
import { WhatsappMessageEntity } from '../entities/whatsapp-message.entity';
import { WhatsappAccountEntity } from '../entities/whatsapp-account.entity';
import { resolveContactInfo, isProperName, registerUniversalContact } from '../../accounts/utils/contact-resolver.util';

@Injectable()
export class BaileysSyncService {
  private readonly logger = new Logger(BaileysSyncService.name);

  constructor(
    @InjectRepository(WhatsappChatEntity)
    private readonly chatRepo: Repository<WhatsappChatEntity>,
    @InjectRepository(WhatsappContactEntity)
    private readonly contactRepo: Repository<WhatsappContactEntity>,
    @InjectRepository(WhatsappMessageEntity)
    private readonly messageRepo: Repository<WhatsappMessageEntity>,
    @Optional()
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo?: Repository<WhatsappAccountEntity>,
  ) {}

  /**
   * Sync group metadata and participant list from WhatsApp.
   */
  async syncGroupsAndContacts(
    accountId: string,
    socket: WASocket,
    onUpdated?: () => void,
  ): Promise<void> {
    if (!socket) return;

    try {
      this.logger.log(`[Sync] Fetching participating groups for [${accountId}]...`);
      const groups = await socket.groupFetchAllParticipating();
      const groupEntries = Object.entries(groups);
      this.logger.log(`[Sync] Found ${groupEntries.length} participating groups`);

      const participantContactsMap = new Map<string, Partial<WhatsappContactEntity>>();

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
            lastMessageTimestamp: Number((groupMeta as any).creation || 0) * 1000,
          });
        } else {
          chat.name = name;
          if (subtitle) chat.subtitle = subtitle;
          chat.isGroup = true;
        }
        await this.chatRepo.save(chat);

        // Harvest group participants
        const participants = (groupMeta as any)?.participants || [];
        for (const p of participants) {
          if (!p || !p.id) continue;
          const cleanId = p.id.replace(/:\d+@/, '@');
          if (cleanId.endsWith('@g.us')) continue;
          const resolved = resolveContactInfo(cleanId, p.name, null, p.notify, false);
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
          await this.contactRepo.save(chunk as any[]).catch(() => null);
        }
      }

      if (onUpdated) onUpdated();
    } catch (err: any) {
      this.logger.error(`[Sync] Failed to sync groups: ${err.message}`);
    }
  }

  /**
   * Upsert a chat record (e.g. when initiating chat from contact list).
   */
  async saveChat(
    accountId: string,
    chatData: { id: string; name?: string; isGroup?: boolean },
    onUpdated?: () => void,
  ): Promise<WhatsappChatEntity | null> {
    if (!chatData?.id) return null;
    const cleanId = chatData.id.trim();
    let existing = await this.chatRepo.findOne({ where: { id: cleanId, accountId } });

    const properName = (chatData.name && isProperName(chatData.name)) ? chatData.name.trim() : null;

    if (!existing) {
      const resolved = resolveContactInfo(cleanId, properName, null, null, !!chatData.isGroup);
      existing = this.chatRepo.create({
        id: cleanId,
        accountId,
        name: properName || resolved.name || cleanId.split('@')[0],
        isGroup: !!chatData.isGroup,
        unreadCount: 0,
        lastMessageTimestamp: Date.now(),
      });
    } else if (properName) {
      existing.name = properName;
    }

    if (properName) {
      registerUniversalContact(cleanId, properName);
      // Also update contact in contactRepo if present
      this.contactRepo.findOne({ where: { id: cleanId, accountId } }).then((c) => {
        if (c) {
          c.name = properName;
          this.contactRepo.save(c).catch(() => null);
        }
      }).catch(() => null);
    }

    const saved = await this.chatRepo.save(existing);
    if (onUpdated) onUpdated();
    return saved;
  }

  /**
   * Request historical chat messages on-demand from WhatsApp.
   */
  async syncChatMessages(
    accountId: string,
    chatJid: string,
    socket: WASocket,
    count = 50,
  ): Promise<{ success: boolean; synced: number }> {
    if (!socket) {
      return { success: false, synced: 0 };
    }

    try {
      let cleanJid = decodeURIComponent(chatJid).trim();

      // Normalize 'you_self' or self-chat to account's own phone number JID
      if (cleanJid === 'you_self' || cleanJid.startsWith('you_self')) {
        const activeAcc = this.accountRepo ? await this.accountRepo.findOne({ where: { id: accountId } }) : null;
        if (activeAcc?.phoneNumber) {
          const cleanDigits = activeAcc.phoneNumber.replace(/\D/g, '');
          cleanJid = `${cleanDigits}@s.whatsapp.net`;
        } else if ((socket as any)?.user?.id) {
          const userPhone = ((socket as any).user.id.split(':')[0] || '').split('@')[0].replace(/\D/g, '');
          if (userPhone) cleanJid = `${userPhone}@s.whatsapp.net`;
        }
      }

      if (!cleanJid.includes('@')) {
        cleanJid = `${cleanJid}@s.whatsapp.net`;
      }
      this.logger.log(`📥 Requesting message history for [${cleanJid}] (count: ${count})...`);
      const sock = socket as any;

      const phone = cleanJid.split('@')[0].replace(/\+/g, '');
      const jidVariants = [
        cleanJid,
        `${phone}@s.whatsapp.net`,
        `${phone}@lid`,
      ];

      // Cross-link sister contacts and sister chats by authentic name or LID
      const contact = await this.contactRepo.findOne({
        where: [
          { id: cleanJid, accountId },
          { id: `${phone}@s.whatsapp.net`, accountId },
          { id: `${phone}@lid`, accountId },
        ]
      }).catch(() => null);

      const chat = await this.chatRepo.findOne({ where: { id: cleanJid, accountId } }).catch(() => null);
      const properName = (contact?.name && isProperName(contact.name))
        ? contact.name.trim()
        : (chat?.name && isProperName(chat.name))
          ? chat.name.trim()
          : null;

      if (properName) {
        const sisterContacts = await this.contactRepo.find({ where: { name: properName, accountId } }).catch(() => []);
        for (const sc of sisterContacts) {
          if (sc.id) jidVariants.push(sc.id);
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

      // Query across variants to find the true oldest message
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

        // Request for the primary target JID
        await Promise.race([
          sock.fetchMessageHistory(count, oldestKey, oldestTs),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]).catch((err: any) => {
          this.logger.warn(`fetchMessageHistory notice for [${cleanJid}]: ${err.message}`);
        });

        // Also request history for linked sister variants (e.g. @lid or @s.whatsapp.net)
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
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
            ]).catch(() => null);
          }
        }
      }

      return { success: true, synced: 1 };
    } catch (err: any) {
      this.logger.warn(`syncChatMessages error: ${err.message}`);
      return { success: false, synced: 0 };
    }
  }
}
