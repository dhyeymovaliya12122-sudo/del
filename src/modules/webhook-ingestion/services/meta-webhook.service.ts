// ─────────────────────────────────────────────────────────────────────────────
//  modules/webhook-ingestion/services/meta-webhook.service.ts
//  Meta WhatsApp Cloud API Webhook Ingestion Service
//
//  Processes official Meta WhatsApp Cloud API webhook payloads:
//   - Incoming text, image, audio, video, document, sticker messages
//   - Delivery status updates (sent, delivered, read, failed)
//
//  Flow:
//   1. POST /webhook → immediately return 200 "EVENT_RECEIVED"
//   2. Process payload: upsert contact → upsert chat → save message → broadcast
//   3. WebSocket: whatsapp:message_new, whatsapp:message_status, whatsapp:chats_updated
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
import { WhatsappChatEntity } from '../../session-hydration/entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../../session-hydration/entities/whatsapp-contact.entity';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import { RealtimeEventService } from '../../realtime-gateway/services/realtime-event.service';


export interface MetaWebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string; voice?: boolean };
  document?: { id: string; mime_type: string; sha256: string; filename?: string; caption?: string };
  sticker?: { id: string; mime_type: string; sha256: string; animated: boolean };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  reaction?: { message_id: string; emoji: string };
  interactive?: { type: string; button_reply?: { title: string }; list_reply?: { title: string } };
  context?: { from: string; id: string };
}

export interface MetaWebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

export interface MetaWebhookContact {
  profile: { name: string };
  wa_id: string;
}

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    @InjectRepository(WhatsappMessageEntity)
    private readonly messageRepo: Repository<WhatsappMessageEntity>,
    @InjectRepository(WhatsappChatEntity)
    private readonly chatRepo: Repository<WhatsappChatEntity>,
    @InjectRepository(WhatsappContactEntity)
    private readonly contactRepo: Repository<WhatsappContactEntity>,
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo: Repository<WhatsappAccountEntity>,
    private readonly realtimeService: RealtimeEventService,
    private readonly config: ConfigService,
  ) {}

  async processPayload(body: any): Promise<void> {
    if (!body || body.object !== 'whatsapp_business_account') return;
    const tenantId = this.config.get('TENANT_ID', 'default-tenant');

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        if (!value) continue;

        const phoneNumberId: string = value.metadata?.phone_number_id ?? '';
        const account = await this.resolveAccount(phoneNumberId);
        if (!account) {
          this.logger.warn(`No account for Meta phone_number_id: ${phoneNumberId}`);
          continue;
        }
        const accountId = account.id;

        if (value.messages?.length) {
          const metaContacts: MetaWebhookContact[] = value.contacts ?? [];
          for (const msg of value.messages as MetaWebhookMessage[]) {
            await this.processIncomingMessage(tenantId, accountId, msg, metaContacts).catch(err =>
              this.logger.error(`Error processing Meta message ${msg.id}: ${err.message}`)
            );
          }
        }

        if (value.statuses?.length) {
          for (const status of value.statuses as MetaWebhookStatus[]) {
            await this.processStatusUpdate(tenantId, accountId, status).catch(err =>
              this.logger.error(`Error processing status update ${status.id}: ${err.message}`)
            );
          }
        }
      }
    }
  }

  private async resolveAccount(phoneNumberId: string): Promise<WhatsappAccountEntity | null> {
    if (!phoneNumberId) return null;
    const digits = phoneNumberId.replace(/\D/g, '');
    const accounts = await this.accountRepo.find({ where: { status: 'active' } });
    const matched = accounts.find(a => {
      const aDigits = (a.phoneNumber ?? '').replace(/\D/g, '');
      return aDigits.endsWith(digits) || digits.endsWith(aDigits);
    });
    return matched ?? accounts[0] ?? null;
  }

  private async processIncomingMessage(
    tenantId: string,
    accountId: string,
    msg: MetaWebhookMessage,
    metaContacts: MetaWebhookContact[],
  ): Promise<void> {
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

    if (!savedMsg) return;

    const snippet = text || (
      mediaType === 'image' ? '\ud83d\udcf7 Photo' :
      mediaType === 'video' ? '\ud83c\udfa5 Video' :
      mediaType === 'audio' ? '\ud83c\udfa4 Voice message' :
      mediaType === 'document' ? `\ud83d\udcce ${fileName ?? 'Document'}` :
      mediaType === 'sticker' ? '\ud83c\udfa8 Sticker' : ''
    );

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

  private extractContent(msg: MetaWebhookMessage): { text: string; mediaType?: string; mimeType?: string; fileName?: string } {
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

  private async upsertContact(accountId: string, chatJid: string, phone: string, name: string): Promise<void> {
    const existing = await this.contactRepo.findOne({ where: { id: chatJid, accountId } }).catch(() => null);
    if (!existing) {
      await this.contactRepo.save({ id: chatJid, accountId, phoneNumber: phone, name: name || phone, notifyName: name || '' }).catch(() => null);
    } else if (name && (!existing.name || existing.name === phone)) {
      existing.name = name;
      if (!existing.notifyName) existing.notifyName = name;
      await this.contactRepo.save(existing).catch(() => null);
    }
  }

  private async upsertChat(accountId: string, chatJid: string, contactName: string, snippet: string, timestamp: number, fromMe: boolean): Promise<WhatsappChatEntity> {
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
    } else {
      if (snippet) chat.lastMessageText = snippet;
      chat.lastMessageTimestamp = timestamp;
      chat.lastMessageStatus = fromMe ? 'sent' : 'delivered';
      chat.lastMessageFromMe = fromMe;
      if (!fromMe) chat.unreadCount = (chat.unreadCount || 0) + 1;
      if (contactName && (!chat.name || chat.name === chatJid.split('@')[0])) chat.name = contactName;
    }
    return this.chatRepo.save(chat);
  }

  private async processStatusUpdate(tenantId: string, accountId: string, status: MetaWebhookStatus): Promise<void> {
    await this.messageRepo.update({ id: status.id, accountId }, { status: status.status }).catch(() => null);
    this.broadcast(tenantId, accountId, 'whatsapp:message_status', { messageId: status.id, status: status.status });
    this.logger.debug(`\ud83d\udcca Status [${status.status}] for msg [${status.id}]`);
  }

  private broadcast(tenantId: string, accountId: string, event: string, payload: any): void {
    try { this.realtimeService.emitToAccount(tenantId, accountId, event, payload); }
    catch (err: any) { this.logger.warn(`[Broadcast] ${event} failed: ${err.message}`); }
  }
}
