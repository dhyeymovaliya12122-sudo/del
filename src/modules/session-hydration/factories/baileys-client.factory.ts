// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/factories/baileys-client.factory.ts
//  Feature 2: Creates Baileys WhatsApp client instances with:
//    - Real-time Multi-Device synchronization
//    - Accurate Group & Contact identification
//    - Live WebSocket broadcasts matching WhatsApp Web
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  downloadMediaMessage,
  Browsers,
} from 'baileys';
import * as fs from 'fs';
import * as path from 'path';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import { ProxyBindingService, ProxyAgentBundle } from '../../proxy-binding/services/proxy-binding.service';
import { SessionSyncManager } from '../services/session-sync.manager';
import { BaileysMediaPipelineService } from '../services/baileys-media-pipeline.service';
import { BaileysSyncService } from '../services/baileys-sync.service';
import { BehavioralTypingService } from '../services/behavioral-typing.service';
import { AccountWarmupService } from '../services/account-warmup.service';
import { DistributedSocketManagerService } from '../services/distributed-socket-manager.service';
import { RealtimeEventService } from '../../realtime-gateway/services/realtime-event.service';
import { TelemetryService } from '../../telemetry/services/telemetry.service';
import { WhatsappAccountEntity } from '../entities/whatsapp-account.entity';
import { WhatsappChatEntity } from '../entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../entities/whatsapp-contact.entity';
import { WhatsappMessageEntity } from '../entities/whatsapp-message.entity';
import { UserAccountAccessEntity } from '../../auth/entities/user-account-access.entity';
import { AppUserEntity } from '../../auth/entities/app-user.entity';
import pino from 'pino';
import { resolveContactInfo, formatE164Phone, isLidIdentifier, isGroupJid, registerUniversalContact, KNOWN_LID_MAP, KNOWN_PHONE_CONTACTS, isProperName, isEmojiOnly, UNIVERSAL_IDENTITY_REGISTRY } from '../../accounts/utils/contact-resolver.util';

export interface BaileysClientInstance {
  accountId: string;
  socket: WASocket;
  authDir: string;
  createdAt: Date;
}

export function unwrapMessage(msg?: any): any {
  if (!msg) return null;
  let content = msg;
  let depth = 0;
  while (depth < 10) {
    if (content?.ephemeralMessage?.message) {
      content = content.ephemeralMessage.message;
    } else if (content?.viewOnceMessage?.message) {
      content = content.viewOnceMessage.message;
    } else if (content?.viewOnceMessageV2?.message) {
      content = content.viewOnceMessageV2.message;
    } else if (content?.documentWithCaptionMessage?.message) {
      content = content.documentWithCaptionMessage.message;
    } else if (content?.editedMessage?.message?.protocolMessage?.editedMessage) {
      content = content.editedMessage.message.protocolMessage.editedMessage;
    } else if (content?.editedMessage?.message) {
      content = content.editedMessage.message;
    } else if (content?.protocolMessage?.editedMessage) {
      content = content.protocolMessage.editedMessage;
    } else {
      break;
    }
    depth++;
  }
  return content;
}

export function extractProtocolMessage(msg: any): any {
  if (!msg || typeof msg !== 'object') return null;
  if (msg.protocolMessage) return msg.protocolMessage;
  if (msg.message?.protocolMessage) return msg.message.protocolMessage;
  if (msg.editedMessage?.message?.protocolMessage) return msg.editedMessage.message.protocolMessage;
  if (msg.deviceSentMessage?.message?.protocolMessage) return msg.deviceSentMessage.message.protocolMessage;
  if (msg.ephemeralMessage?.message?.protocolMessage) return msg.ephemeralMessage.message.protocolMessage;
  if (msg.viewOnceMessage?.message?.protocolMessage) return msg.viewOnceMessage.message.protocolMessage;
  if (msg.viewOnceMessageV2?.message?.protocolMessage) return msg.viewOnceMessageV2.message.protocolMessage;
  if (msg.documentWithCaptionMessage?.message?.protocolMessage) return msg.documentWithCaptionMessage.message.protocolMessage;
  return null;
}

export function extractDirectEditedContent(msg: any): { targetId?: string; targetChat?: string; content?: any } | null {
  if (!msg || typeof msg !== 'object') return null;
  const target = msg.message || msg;
  const pm = extractProtocolMessage(target);
  if (pm && (pm.type === 14 || pm.type === 'MESSAGE_EDIT' || pm.editedMessage != null)) {
    return {
      targetId: pm.key?.id || msg.key?.id,
      targetChat: pm.key?.remoteJid || msg.key?.remoteJid,
      content: pm.editedMessage,
    };
  }
  const em = target.editedMessage || target.deviceSentMessage?.message?.editedMessage;
  if (em) {
    const innerPm = extractProtocolMessage(em);
    if (innerPm) {
      return {
        targetId: innerPm.key?.id || em.key?.id || msg.key?.id,
        targetChat: innerPm.key?.remoteJid || em.key?.remoteJid || msg.key?.remoteJid,
        content: innerPm.editedMessage,
      };
    }
    const targetId = em.key?.id || em.message?.protocolMessage?.key?.id || msg.key?.id;
    const content = em.message?.protocolMessage?.editedMessage || em.message || em;
    if (targetId && content) {
      return {
        targetId,
        targetChat: em.key?.remoteJid || msg.key?.remoteJid,
        content,
      };
    }
  }
  return null;
}

function extractMessageText(rawMessage?: any): string {
  if (!rawMessage) return '';
  const message = unwrapMessage(rawMessage);
  if (!message) return '';
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption || '📷 Photo';
  if (message.videoMessage?.caption) return message.videoMessage.caption || '🎥 Video';
  if (message.documentMessage?.title || message.documentMessage?.fileName) {
    return message.documentMessage.title || message.documentMessage.fileName || '📎 Document';
  }
  if (message.audioMessage) {
    // ptvMessage is a WhatsApp push-to-talk (voice note)
    return message.audioMessage.ptt ? '🎤 Voice message' : '🎵 Audio message';
  }
  if (message.ptvMessage) return '🎤 Voice message';
  if (message.stickerMessage) return '🎨 Sticker';
  if (message.contactMessage?.displayName) return `👤 Contact: ${message.contactMessage.displayName}`;
  if (message.locationMessage) return '📍 Location';
  if (message.liveLocationMessage) return '📍 Live location';
  if (message.pollCreationMessage?.name) return `📊 Poll: ${message.pollCreationMessage.name}`;
  if (message.pollCreationMessageV3?.name) return `📊 Poll: ${message.pollCreationMessageV3.name}`;
  if (message.interactiveMessage) {
    const body = message.interactiveMessage.body?.text || message.interactiveMessage.header?.text || '';
    return body || '📋 Interactive message';
  }
  if (message.buttonsMessage?.contentText) return message.buttonsMessage.contentText;
  if (message.listMessage?.description) return message.listMessage.description;
  if (message.templateMessage) {
    const hydrated = message.templateMessage.hydratedTemplate;
    return hydrated?.hydratedContentText || hydrated?.hydratedTitleText || '📝 Template message';
  }
  return '';
}

@Injectable()
export class BaileysClientFactory {
  private readonly logger = new Logger(BaileysClientFactory.name);
  private readonly clients = new Map<string, BaileysClientInstance>();
  private readonly clientCreationLocks = new Map<string, Promise<BaileysClientInstance>>();
  private readonly qrLocks = new Map<string, Promise<{ success: boolean; alreadyConnected?: boolean; qrCodeDataUrl?: string }>>();
  private readonly activeQRCodes = new Map<string, string>(); // accountId -> latest qrCodeDataUrl
  private readonly qrResolvers = new Map<string, ((qr: string) => void)[]>();
  private readonly reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly qrRetryCounts = new Map<string, number>();

  constructor(
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo: Repository<WhatsappAccountEntity>,
    @InjectRepository(WhatsappChatEntity)
    private readonly chatRepo: Repository<WhatsappChatEntity>,
    @InjectRepository(WhatsappContactEntity)
    private readonly contactRepo: Repository<WhatsappContactEntity>,
    @InjectRepository(WhatsappMessageEntity)
    private readonly messageRepo: Repository<WhatsappMessageEntity>,
    @InjectRepository(UserAccountAccessEntity)
    private readonly accessRepo: Repository<UserAccountAccessEntity>,
    @InjectRepository(AppUserEntity)
    private readonly userRepo: Repository<AppUserEntity>,
    private readonly proxyBindingService: ProxyBindingService,
    private readonly sessionSyncManager: SessionSyncManager,
    private readonly mediaPipelineService: BaileysMediaPipelineService,
    private readonly syncService: BaileysSyncService,
    private readonly config: ConfigService,
    private readonly realtimeService: RealtimeEventService,
    private readonly eventEmitter: EventEmitter2,
    private readonly behavioralTypingService: BehavioralTypingService,
    private readonly accountWarmupService: AccountWarmupService,
    private readonly socketManager: DistributedSocketManagerService,
    private readonly telemetryService?: TelemetryService,
  ) {}

  /**
   * Automated Contact Sanitization at Ingestion:
   * Discards anonymous @lid group participants lacking real names and phone numbers.
   * Resolves known LIDs and direct phone contacts to clean E.164 numbers.
   */
  private sanitizeIncomingContact(c: any, accountId: string, accountPhone = ''): Partial<WhatsappContactEntity> | null {
    if (!c || !c.id) return null;
    let cleanId = (c.id || '').trim();
    const isLid = isLidIdentifier(cleanId);
    // Rule: Automatically strip + prefixes from raw 14–15 digit LIDs before they hit the database
    if (isLid && cleanId.startsWith('+')) {
      cleanId = cleanId.slice(1);
    }
    const rawId = cleanId.split('@')[0].replace(/\+/g, '');
    const isGroup = isGroupJid(cleanId);

    if (!accountPhone) {
      const client = this.getClient(accountId);
      accountPhone = client?.socket?.user?.id?.split(':')[0]?.split('@')[0] || '';
    }

    const resolved = resolveContactInfo(cleanId, c.name || c.verifiedName, null, c.notify, isGroup, accountPhone);

    const hasRealName = (c.name && isProperName(c.name)) ||
                        (c.notify && isProperName(c.notify)) ||
                        (resolved.name && isProperName(resolved.name));
    const hasRealPhone = resolved.phoneNumber && resolved.phoneNumber.startsWith('+') && !resolved.phoneNumber.includes('N/A') && !isLidIdentifier(resolved.phoneNumber);

    // Rule: If contact has an @lid but lacks a resolved E.164 phone number AND has no saved human name, discard
    if (isLid && !hasRealName && !hasRealPhone) {
      return null; // Discard anonymous group participant dump
    }

    let resolvedPhone = resolved.phoneNumber;
    if (resolvedPhone === 'N/A (LID)' || isLidIdentifier(resolvedPhone)) {
      resolvedPhone = '';
    }

    // Only assign name if it is a genuine, proper human name — NEVER raw ID or generated fallback
    const finalContactName = hasRealName
      ? (isProperName(c.name) ? c.name.trim() : (isProperName(c.notify) ? c.notify.trim() : resolved.name))
      : '';

    return {
      id: cleanId,
      accountId,
      phoneNumber: resolved.isGroup ? 'Group Chat' : (resolvedPhone || (isLid ? '' : (rawId.length >= 7 ? (formatE164Phone(rawId) || `+${rawId}`) : ''))),
      name: finalContactName,
      notifyName: isProperName(c.notify) ? c.notify.trim() : '',
    };
  }


  private async unpackArchiveIfNeeded(authDir: string): Promise<void> {
    try {
      const credsPath = path.join(authDir, 'creds.json');
      if (!fs.existsSync(credsPath)) return;
      const credsRaw = fs.readFileSync(credsPath, 'utf8');
      if (!credsRaw) return;

      const parsed = JSON.parse(credsRaw);
      if (parsed?.__isArchive && parsed.files) {
        this.logger.log(`📦 Found archived session wrapper in creds.json at [${authDir}], unpacking individual auth files...`);
        for (const [filename, content] of Object.entries(parsed.files)) {
          fs.writeFileSync(path.join(authDir, filename), content as string, { mode: 0o600 });
        }
        this.logger.log(`✅ Successfully unpacked ${Object.keys(parsed.files).length} session files into [${authDir}]`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not check/unpack session archive in [${authDir}]: ${err.message}`);
    }
  }

  async createClient(accountId: string, authDir: string): Promise<BaileysClientInstance> {
    if (this.clientCreationLocks.has(accountId)) {
      this.logger.log(`createClient already in progress for [${accountId}], awaiting active initialization...`);
      return this.clientCreationLocks.get(accountId)!;
    }

    const creationTask = (async () => {
      try {
        if (this.clients.has(accountId)) {
          const existing = this.clients.get(accountId);
          if (existing && this.isSocketConnected(accountId)) {
            this.logger.log(`Client for account [${accountId}] is already connected and active. Skipping redundant client creation.`);
            return existing;
          }
          await this.destroyClient(accountId);
        }

        // ── Pillar 2: Active-Active Distributed Socket Cluster Lease ──
        const leaseAcquired = await this.socketManager.acquireSocketLease(accountId);
        if (!leaseAcquired) {
          const currentLeader = await this.socketManager.getCurrentLeaseOwner(accountId);
          this.logger.warn(`⚠️ [Cluster] Socket lease for [${accountId}] held by leader [${currentLeader}]. Node [${this.socketManager.getInstanceId()}] is in standby.`);
          throw new BadRequestException(
            `Account ${accountId} is currently active on replica ${currentLeader}. Active-Active cluster prevented concurrent socket collision.`
          );
        }

        // Register emergency stand-down callback if this node ever loses heartbeat lease
        this.socketManager.registerStanddownHandler(accountId, async () => {
          this.logger.warn(`🚨 [Cluster] Lost socket lease for [${accountId}]. Standing down local connection.`);
          await this.destroyClient(accountId);
        });

        await this.unpackArchiveIfNeeded(authDir);

        const { state, saveCreds } = await useMultiFileAuthState(authDir);

        let agentBundle: ProxyAgentBundle | null = null;
        try {
          agentBundle = await this.proxyBindingService.buildAgentBundle(accountId);
          this.logger.log(`Creating Baileys client for [${accountId}] via ${agentBundle.protocol.toUpperCase()} proxy`);
        } catch (err: any) {
          this.logger.warn(`No proxy available for [${accountId}]. Direct connection: ${err.message}`);
        }

        // Determine if account is already registered with existing verified credentials on disk
        let hasCredsOnDiskInitial = false;
        try {
          const credsFile = path.join(authDir, 'creds.json');
          if (fs.existsSync(credsFile)) {
            const parsed = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
            if (parsed?.registered === true && parsed?.me?.id) {
              hasCredsOnDiskInitial = true;
            }
          }
        } catch {}

        const isRegisteredInitial = !!(
          (state.creds?.registered === true && state.creds?.me?.id) ||
          hasCredsOnDiskInitial
        );

        const socket = makeWASocket({
          auth: state,
          printQRInTerminal: false,
          browser: Browsers.ubuntu('Chrome'),
          syncFullHistory: isRegisteredInitial,
          shouldSyncHistoryMessage: () => true,
          defaultQueryTimeoutMs: 60000,
          connectTimeoutMs: 60000,
          keepAliveIntervalMs: 25000,
          markOnlineOnConnect: false,
          ...(agentBundle ? { fetchAgent: agentBundle.httpsAgent as any } : {}),
          getMessage: async (key) => {
            if (key?.id) {
              const msg = await this.messageRepo.findOne({ where: { id: key.id } });
              if (msg && msg.text) {
                return {
                  conversation: msg.text,
                };
              }
            }
            return undefined;
          },
          logger: pino({ level: this.config.get('BAILEYS_LOG_LEVEL', 'silent') }),
        });

    const tenantId = this.config.get('TENANT_ID', 'default-tenant');

    socket.ev.on('creds.update', async () => {
      try {
        await saveCreds();
        await this.sessionSyncManager.persistSession(accountId);
      } catch (err: any) {
        this.logger.error(`Failed to persist session for ${accountId}: ${err.message}`);
      }
    });

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.logger.log(`📱 QR code generated for account [${accountId}]`);
        this.qrRetryCounts.delete(accountId);
        try {
          const qrCodeDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 320,
          });
          this.activeQRCodes.set(accountId, qrCodeDataUrl);

          // Resolve any pending startQR callers waiting for this QR
          const resolvers = this.qrResolvers.get(accountId) || [];
          this.qrResolvers.delete(accountId);
          for (const resolve of resolvers) {
            try { resolve(qrCodeDataUrl); } catch {}
          }

          this.realtimeService.emitQRCode(tenantId, accountId, qrCodeDataUrl);
          this.broadcast(tenantId, accountId, 'connection.update', {
            accountId,
            status: 'qr',
            qrCodeDataUrl,
          });
        } catch (err: any) {
          this.logger.error(`Failed to generate QR code for ${accountId}: ${err.message}`);
        }
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const isLoggedOut = reason === DisconnectReason.loggedOut || reason === 401 || reason === 403;
        const isRestartRequired = reason === DisconnectReason.restartRequired || reason === 515;

        // Check registration across all companion and stored credential indicators
        let hasCredsOnDisk = false;
        try {
          const credsFile = path.join(authDir, 'creds.json');
          if (fs.existsSync(credsFile)) {
            const parsed = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
            if (parsed?.registered === true && parsed?.me?.id) {
              hasCredsOnDisk = true;
            }
          }
        } catch {}

        const isRegistered = !!(
          (state.creds?.registered === true && state.creds?.me?.id) ||
          (socket as any)?.user?.id ||
          hasCredsOnDisk
        );

        // 408 is only a QR timeout if the device has never been paired
        const isQRTimeout = reason === 408 && !isRegistered;
        const shouldReconnect = isRestartRequired || (isRegistered && !isLoggedOut);

        this.logger.warn(`Connection closed for [${accountId}]. Reason: ${reason}. Registered: ${isRegistered}. Reconnect: ${shouldReconnect}`);

        if (isRestartRequired) {
          this.logger.log(`🔄 Restart required (515) for [${accountId}]: WhatsApp pairing in progress. Reconnecting immediately...`);
          await this.accountRepo.update(accountId, { status: 'active' }).catch(() => null);
          this.broadcast(tenantId, accountId, 'connection.update', {
            accountId,
            status: 'connecting',
            message: 'Pairing WhatsApp... Finishing setup...',
          });
          if (this.reconnectTimers.has(accountId)) {
            clearTimeout(this.reconnectTimers.get(accountId)!);
            this.reconnectTimers.delete(accountId);
          }
          const timer = setTimeout(() => {
            this.reconnectTimers.delete(accountId);
            this.createClient(accountId, authDir);
          }, 300);
          this.reconnectTimers.set(accountId, timer);
          return;
        }

        if (isQRTimeout) {
          this.logger.log(`⏳ QR timeout (408) for unregistered account [${accountId}]. Reconnecting to generate fresh QR...`);
          this.broadcast(tenantId, accountId, 'connection.update', {
            accountId,
            status: 'disconnected',
            reason: 408,
          });
          if (this.reconnectTimers.has(accountId)) {
            clearTimeout(this.reconnectTimers.get(accountId)!);
            this.reconnectTimers.delete(accountId);
          }
          const timer = setTimeout(() => {
            this.reconnectTimers.delete(accountId);
            this.createClient(accountId, authDir);
          }, 800);
          this.reconnectTimers.set(accountId, timer);
          return;
        }

        if (isLoggedOut) {
          this.logger.warn(`Device logged out or unlinked for account [${accountId}]. Purging client and clearing session auth.`);
          if (this.reconnectTimers.has(accountId)) {
            clearTimeout(this.reconnectTimers.get(accountId)!);
            this.reconnectTimers.delete(accountId);
          }
          await this.destroyClient(accountId);
          // Mark session inactive in DB so this account is NOT auto-reconnected on next boot
          await this.sessionSyncManager.invalidateSession(accountId).catch(() => null);
          await this.sessionSyncManager.cleanupEphemeralSession(accountId).catch(() => null);
          await this.accountRepo.update(accountId, { status: 'disconnected' }).catch(() => null);
          this.broadcast(tenantId, accountId, 'connection.update', {
            accountId,
            status: 'disconnected',
            reason,
          });
          this.broadcast(tenantId, accountId, 'account:status', {
            accountId,
            status: 'DISCONNECTED',
          });
          const acc = await this.accountRepo.findOne({ where: { id: accountId } }).catch(() => null);
          this.eventEmitter.emit('account.disconnected', {
            accountId,
            accountName: acc?.displayName || acc?.phoneNumber || accountId,
            phoneNumber: acc?.phoneNumber,
            disconnectedBy: 'WhatsApp Session Expired / Logged out from Mobile',
            reason: typeof reason === 'string' ? reason : 'Session Disconnected',
            disconnectedAt: Date.now(),
          });
          return;
        }

        if (!isRegistered) {
          // If NOT registered, check if this is a transient drop during QR generation (428 connectionClosed, 503, 500, 408)
          const hasPendingResolvers = (this.qrResolvers.get(accountId)?.length || 0) > 0 || !this.activeQRCodes.has(accountId);
          const retryCount = this.qrRetryCounts.get(accountId) || 0;

          if (hasPendingResolvers && retryCount < 5 && (reason === 428 || reason === 503 || reason === 500 || reason === 408)) {
            this.qrRetryCounts.set(accountId, retryCount + 1);
            this.logger.log(`⏳ Transient socket closure (reason: ${reason}) while awaiting QR pairing for [${accountId}]. Retrying socket in 800ms (attempt ${retryCount + 1}/5)...`);
            if (this.reconnectTimers.has(accountId)) {
              clearTimeout(this.reconnectTimers.get(accountId)!);
              this.reconnectTimers.delete(accountId);
            }
            const timer = setTimeout(() => {
              this.reconnectTimers.delete(accountId);
              this.createClient(accountId, authDir);
            }, 800);
            this.reconnectTimers.set(accountId, timer);
            return;
          }

          // If NOT registered and either retries exhausted or not actively waiting for QR:
          this.logger.log(`Connection closed while awaiting QR pairing for [${accountId}] (reason: ${reason}). Waiting for user action or fresh QR...`);
          this.qrRetryCounts.delete(accountId);
          if (this.reconnectTimers.has(accountId)) {
            clearTimeout(this.reconnectTimers.get(accountId)!);
            this.reconnectTimers.delete(accountId);
          }
          await this.destroyClient(accountId);
          await this.accountRepo.update(accountId, { status: 'disconnected' }).catch(() => null);
          this.broadcast(tenantId, accountId, 'connection.update', {
            accountId,
            status: 'disconnected',
            reason,
            isPairing: true,
          });
          // Do NOT broadcast account:status: DISCONNECTED to tenant for unregistered pairing session to prevent false disconnection alerts
          return;
        }

        // ── Linked Companion Device Auto-Reconnect (handles 428, 408, 500, etc.) ──
        this.logger.log(`🔄 Transient connection drop for registered account [${accountId}] (reason: ${reason}). Auto-reconnecting in 2s...`);
        this.broadcast(tenantId, accountId, 'connection.update', {
          accountId,
          status: 'connecting',
          reason,
        });
        this.broadcast(tenantId, accountId, 'account:status', {
          accountId,
          status: 'RECONNECTING',
        });

        // Retain 'active' status in DB so background hydration and pollers do not mark it dead
        await this.accountRepo.update(accountId, { status: 'active' }).catch(() => null);

        if (this.reconnectTimers.has(accountId)) {
          clearTimeout(this.reconnectTimers.get(accountId)!);
          this.reconnectTimers.delete(accountId);
        }
        const timer = setTimeout(() => {
          this.reconnectTimers.delete(accountId);
          this.createClient(accountId, authDir);
        }, 2000);
        this.reconnectTimers.set(accountId, timer);
      }

      if (connection === 'open') {
        this.qrRetryCounts.delete(accountId);
        if (this.reconnectTimers.has(accountId)) {
          clearTimeout(this.reconnectTimers.get(accountId)!);
          this.reconnectTimers.delete(accountId);
        }
        this.activeQRCodes.delete(accountId);
        const resolvers = this.qrResolvers.get(accountId) || [];
        this.qrResolvers.delete(accountId);
        for (const resolve of resolvers) {
          try { resolve(''); } catch {}
        }

        this.logger.log(`✅ WhatsApp connected for account [${accountId}]`);
        const userPhone = socket.user?.id?.split(':')[0]?.split('@')[0] || '';
        const userName = socket.user?.name || socket.user?.notify || undefined;

        if (userPhone) {
          try {
            // Check if another account in database already has this phone number
            const conflictingAccount = await this.accountRepo.findOne({ where: { phoneNumber: userPhone } });
            if (conflictingAccount && conflictingAccount.id !== accountId) {
              this.logger.warn(`Phone [${userPhone}] was previously associated with account [${conflictingAccount.id}]. Disassociating old account.`);
              await this.accountRepo.update(conflictingAccount.id, {
                phoneNumber: `unlinked_${Date.now()}_${userPhone.slice(-4)}`,
                status: 'disconnected',
              });
            }
          } catch (collisionErr: any) {
            this.logger.warn(`Phone collision check error: ${collisionErr.message}`);
          }
        }

        // Protect user-assigned custom account names from being overwritten by WhatsApp pushname
        let currentAccount: WhatsappAccountEntity | null = null;
        try {
          currentAccount = await this.accountRepo.findOne({ where: { id: accountId } });
        } catch {}

        const existingDisplayName = currentAccount?.displayName?.trim();
        const hasCustomName = !!(
          existingDisplayName &&
          existingDisplayName !== 'WhatsApp Account' &&
          existingDisplayName !== 'Default Account' &&
          !existingDisplayName.startsWith('pending_') &&
          !existingDisplayName.startsWith('unlinked_')
        );

        const effectiveDisplayName = hasCustomName
          ? existingDisplayName
          : (userName || existingDisplayName || 'WhatsApp Account');

        // Dynamically register connected account owner's LID & phone for cross-account and LID resolution
        const userLid = (socket.user as any)?.lid?.split(':')[0]?.split('@')[0] || '';
        if (userLid && effectiveDisplayName) {
          KNOWN_LID_MAP[userLid] = { name: effectiveDisplayName, phone: formatE164Phone(userPhone) };
          UNIVERSAL_IDENTITY_REGISTRY.set(userLid, { name: effectiveDisplayName, phone: formatE164Phone(userPhone) });
        }
        if (userPhone && effectiveDisplayName) {
          KNOWN_PHONE_CONTACTS[userPhone] = effectiveDisplayName;
          UNIVERSAL_IDENTITY_REGISTRY.set(userPhone, { name: effectiveDisplayName, phone: formatE164Phone(userPhone) });
        }

        try {
          await this.accountRepo.update(accountId, {
            status: 'active',
            ...(userPhone ? { phoneNumber: userPhone } : {}),
            ...(!hasCustomName && userName ? { displayName: userName } : {}),
          });
        } catch (updateErr: any) {
          this.logger.error(`Failed to update account [${accountId}] on open: ${updateErr.message}`);
        }

        this.broadcast(tenantId, accountId, 'connection.update', {
          accountId,
          status: 'connected',
          phoneNumber: userPhone,
          displayName: effectiveDisplayName,
        });
        this.broadcast(tenantId, accountId, 'account:status', {
          accountId,
          status: 'CONNECTED',
          phoneNumber: userPhone,
          displayName: effectiveDisplayName,
        });

        // Notify DisconnectionMonitorService and event subscribers that account has reconnected
        try {
          this.eventEmitter.emit('account.connected', {
            accountId,
            phoneNumber: userPhone,
            accountName: effectiveDisplayName,
          });
        } catch {}

        // Broadcast syncing status so frontend can show a loading indicator
        this.broadcast(tenantId, accountId, 'whatsapp:syncing', {
          accountId,
          message: 'Fetching all your chats, contacts, and history...',
        });

        // Sync groups/contacts AND trigger full data sync
        this.syncGroupsAndContacts(accountId, socket).catch((e) => {
          this.logger.warn(`Initial group sync error: ${e.message}`);
        });

        // Trigger full syncAllData after a short delay to let Baileys settle
        setTimeout(() => {
          this.syncAllData(accountId).catch((e) => {
            this.logger.warn(`Auto syncAllData error: ${e.message}`);
          });
        }, 3000);
      }
    });

    // ── Initial History Sync (fires automatically from Baileys when syncFullHistory=true)
    socket.ev.on('messaging-history.set', async ({ chats, contacts, messages }) => {
      const totalChats = chats?.length || 0;
      const totalContacts = contacts?.length || 0;
      const totalMessages = messages?.length || 0;
      this.logger.log(
        `📥 History sync for [${accountId}]: ${totalChats} chats, ${totalContacts} contacts, ${totalMessages} messages`,
      );

      // Broadcast progress to frontend
      this.broadcast(tenantId, accountId, 'whatsapp:sync_progress', {
        accountId,
        stage: 'contacts',
        total: totalContacts,
        chatsTotal: totalChats,
        messagesTotal: totalMessages,
      });

      // ── Batch-save contacts (Automated Sanitization at Ingestion)
      if (contacts?.length) {
        const sanitizedList = contacts
          .map(c => this.sanitizeIncomingContact(c, accountId))
          .filter((c): c is Partial<WhatsappContactEntity> => c !== null);

        for (let i = 0; i < sanitizedList.length; i += 100) {
          const chunk = sanitizedList.slice(i, i + 100);
          await this.contactRepo.save(chunk as any[]).catch(() => null);
        }
      }

      // ── Batch-save chats
      if (chats?.length) {
        const chatEntities: any[] = [];
        for (const chat of chats) {
          if (!chat.id || chat.id === 'status@broadcast') continue;
          const isGroup = chat.id.endsWith('@g.us');
          const rawId = chat.id.split('@')[0];
          let chatName = (chat.name && isProperName(chat.name)) ? chat.name : null;
          if (!chatName) {
            chatName = resolveContactInfo(chat.id, null, null, null, isGroup).name;
          }
          chatEntities.push({
            id: chat.id,
            accountId,
            name: chatName || resolveContactInfo(chat.id, null, null, null, isGroup).name,
            isGroup,
            unreadCount: chat.unreadCount || 0,
            lastMessageTimestamp: Number(chat.conversationTimestamp || 0) * 1000,
            pinned: !!chat.pinned,
          });
        }
        for (let i = 0; i < chatEntities.length; i += 100) {
          const chunk = chatEntities.slice(i, i + 100);
          await this.chatRepo.save(chunk).catch(() => null);
        }
      }

      // ── Process messages in batches
      if (messages?.length) {
        this.broadcast(tenantId, accountId, 'whatsapp:sync_progress', {
          accountId,
          stage: 'messages',
          total: totalMessages,
        });
        for (const msg of messages) {
          await this.processMessage(accountId, msg, false).catch(() => null);
        }
      }

      // Also trigger group metadata sync for proper group names
      this.syncGroupsAndContacts(accountId, socket).catch(() => null);

      // Broadcast that all data is ready
      this.broadcast(tenantId, accountId, 'whatsapp:history_synced', {
        accountId,
        chatsCount: totalChats,
        contactsCount: totalContacts,
        messagesCount: totalMessages,
      });

      // Broadcast 'ready' so the frontend can refresh the chat list
      this.broadcast(tenantId, accountId, 'whatsapp:ready', {
        accountId,
        chatsCount: totalChats,
        contactsCount: totalContacts,
        messagesCount: totalMessages,
      });

      // Broadcast messages synced event for active chat automatic backfill
      this.broadcast(tenantId, accountId, 'whatsapp:messages_synced', {
        accountId,
        messagesCount: totalMessages,
      });
    });

    // ── Live Contacts Updates (Automated Sanitization at Ingestion)
    socket.ev.on('contacts.upsert', async (contacts) => {
      const sanitizedList: Partial<WhatsappContactEntity>[] = [];
      for (const c of contacts) {
        if (!c.id) continue;
        if (c.name && isProperName(c.name)) {
          registerUniversalContact(c.id, c.name);
          if ((c as any).lid) registerUniversalContact((c as any).lid, c.name);
        }
        const sanitized = this.sanitizeIncomingContact(c, accountId);
        if (sanitized) sanitizedList.push(sanitized as any);
      }
      for (let i = 0; i < sanitizedList.length; i += 100) {
        const chunk = sanitizedList.slice(i, i + 100);
        await this.contactRepo.save(chunk as any[]).catch(() => null);
      }
      this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });
    });

    socket.ev.on('contacts.update', async (updates) => {
      for (const u of updates) {
        if (!u.id) continue;
        if (u.name && isProperName(u.name)) {
          registerUniversalContact(u.id, u.name);
          if ((u as any).lid) registerUniversalContact((u as any).lid, u.name);
        } else if (u.notify && isProperName(u.notify)) {
          registerUniversalContact(u.id, u.notify);
          if ((u as any).lid) registerUniversalContact((u as any).lid, u.notify);
        }
        const sanitized = this.sanitizeIncomingContact(u, accountId);
        if (sanitized) {
          const existing = await this.contactRepo.findOne({ where: { id: u.id, accountId } });
          if (existing) {
            if (sanitized.name) existing.name = sanitized.name;
            if (sanitized.notifyName) existing.notifyName = sanitized.notifyName;
            if (sanitized.phoneNumber) existing.phoneNumber = sanitized.phoneNumber;
            await this.contactRepo.save(existing).catch(() => null);
          } else {
            await this.contactRepo.save(sanitized as any).catch(() => null);
          }
        }
      }
      this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });
    });

    // ── Live Chats Updates
    socket.ev.on('chats.upsert', async (chats) => {
      for (const chat of chats) {
        if (!chat.id || chat.id === 'status@broadcast') continue;
        const isGroup = chat.id.endsWith('@g.us');
        const existing = await this.chatRepo.findOne({ where: { id: chat.id, accountId } });
        const candidateRaw = (existing?.name && isProperName(existing.name))
          ? existing.name
          : (chat.name && isProperName(chat.name))
            ? chat.name
            : null;

        let chatName = candidateRaw;
        if (!chatName) {
          if (isGroup) {
            const suffix = chat.id.split('@')[0].slice(-4);
            chatName = suffix ? `Group (${suffix})` : 'Group Chat';
          } else {
            const isLid = isLidIdentifier(chat.id);
            const cleanDigits = chat.id.split('@')[0].replace(/\D/g, '');
            if (!isLid && cleanDigits.length >= 7) {
              chatName = formatE164Phone(cleanDigits) || `+${cleanDigits}`;
            } else if (isLid) {
              const reg = KNOWN_LID_MAP[cleanDigits] || UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
              chatName = reg?.name || reg?.phone || '';
            } else {
              chatName = chat.id.split('@')[0];
            }
          }
        }

        if (isGroup && (!existing?.name || !isProperName(existing.name))) {
          socket.groupMetadata(chat.id).then((meta) => {
            if (meta?.subject && isProperName(meta.subject)) {
              this.chatRepo.update(
                { id: chat.id, accountId },
                { name: meta.subject, subtitle: meta.desc || undefined },
              );
              this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
            }
          }).catch(() => null);
        }

        await this.chatRepo.save({
          id: chat.id,
          accountId,
          name: chatName,
          isGroup,
          unreadCount: chat.unreadCount ?? existing?.unreadCount ?? 0,
          lastMessageTimestamp: Number(chat.conversationTimestamp || 0) * 1000 || existing?.lastMessageTimestamp || Date.now(),
          pinned: chat.pinned !== undefined ? !!chat.pinned : (existing?.pinned ?? false),
        }).catch(() => null);
      }
      this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
    });

    // ── Live Groups Updates (Dynamic discovery of group titles and descriptions)
    socket.ev.on('groups.upsert', async (groups) => {
      for (const g of groups) {
        if (!g.id) continue;
        let existing = await this.chatRepo.findOne({ where: { id: g.id, accountId } });
        const properSubject = (g.subject && isProperName(g.subject)) ? g.subject : null;
        const fallbackName = g.id.split('@')[0].slice(-4) ? `Group (${g.id.split('@')[0].slice(-4)})` : 'Group Chat';
        const name = properSubject || (existing?.name && isProperName(existing.name) ? existing.name : fallbackName);
        const subtitle = g.desc || undefined;

        if (existing) {
          existing.name = name;
          if (subtitle) existing.subtitle = subtitle;
          existing.isGroup = true;
          await this.chatRepo.save(existing).catch(() => null);
        } else {
          await this.chatRepo.save({
            id: g.id,
            accountId,
            name,
            subtitle,
            isGroup: true,
            unreadCount: 0,
            lastMessageTimestamp: Date.now(),
          }).catch(() => null);
        }
      }
      this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
    });

    socket.ev.on('groups.update', async (updates) => {
      for (const u of updates) {
        if (!u.id) continue;
        const existing = await this.chatRepo.findOne({ where: { id: u.id, accountId } });
        if (existing) {
          if (u.subject && isProperName(u.subject)) existing.name = u.subject;
          if (u.desc !== undefined) existing.subtitle = u.desc;
          await this.chatRepo.save(existing).catch(() => null);
        }
      }
      this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
    });

    // ── Live Messages
    socket.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        const saved = await this.processMessage(accountId, msg, true).catch((err) => {
          this.logger.error(`Error processing message: ${err.message}`);
          return null;
        });
        if (saved) {
          if (!saved.fromMe) {
            // Fire auto-reply check and chatbot state machine
            this.eventEmitter.emit('auto-reply.check', { accountId, message: saved });
            this.eventEmitter.emit('chatbot.incoming', { accountId, message: saved });
          } else {
            // Staff message from dashboard or phone -> pause chatbot so bot doesn't interfere
            this.eventEmitter.emit('whatsapp.message.sent', { accountId, chatJid: saved.chatJid });
          }
        }
      }
    });

    socket.ev.on('messages.update', async (updates) => {
      for (const u of updates) {
        const keyId = u.key?.id;
        if (!keyId) continue;
        const targetChatJid = u.key?.remoteJid || '';

        // Check if this update contains an edited message
        const updateMsg = u.update?.message;
        if (updateMsg) {
          const directEdit = extractDirectEditedContent(updateMsg);
          const targetId = directEdit?.targetId || keyId;
          const editedContent = directEdit?.content || updateMsg.editedMessage?.message || updateMsg;
          const newText = extractMessageText(editedContent) || extractMessageText(updateMsg);
          if (newText) {
            await this.handleEditedMessage(
              accountId,
              targetId,
              targetChatJid,
              editedContent,
              typeof u.update?.messageTimestamp === 'number' ? u.update.messageTimestamp * 1000 : Date.now(),
            );
          }
        }

        // Only update delivery/read status if status was actually passed in this update
        if (u.update?.status !== undefined) {
          const statusStr = u.update.status === 4 ? 'read' : u.update.status === 3 ? 'delivered' : 'sent';
          await this.messageRepo.update({ id: keyId, accountId }, { status: statusStr }).catch(() => null);
          this.broadcast(tenantId, accountId, 'whatsapp:message_status', {
            messageId: keyId,
            status: statusStr,
          });
          this.broadcast(tenantId, accountId, 'whatsapp:analytics_update', { type: 'message', accountId });
        }
      }
    });

    // ── Live WhatsApp Calls
    socket.ev.on('call', async (callEvents: any[]) => {
      for (const call of callEvents) {
        try {
          const callerJid = call.from || call.chatId || '';
          const status = call.status === 'offer' ? 'connected' : call.status === 'timeout' ? 'missed' : call.status === 'reject' ? 'rejected' : 'connected';
          const newCall = {
            id: call.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            accountId,
            callerJid,
            callerName: call.from ? (call.from.split('@')[0]) : 'Client',
            direction: call.fromMe ? 'outgoing' : 'incoming',
            status: status as any,
            duration: typeof call.duration === 'number' ? call.duration : 0,
            isVideo: !!call.isVideo,
            isGroup: !!call.isGroup,
            timestamp: typeof call.date === 'number' ? call.date : Date.now(),
          };
          await this.messageRepo.query(`
            INSERT INTO whatsapp_calls (id, account_id, caller_jid, caller_name, direction, status, duration, is_video, is_group, timestamp, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(? / 1000, 'unixepoch'))
          `, [newCall.id, accountId, callerJid, newCall.callerName, newCall.direction, newCall.status, newCall.duration, newCall.isVideo ? 1 : 0, newCall.isGroup ? 1 : 0, newCall.timestamp, newCall.timestamp]).catch(() => null);

          this.broadcast(tenantId, accountId, 'whatsapp:call_new', newCall);
          this.broadcast(tenantId, accountId, 'whatsapp:analytics_update', { type: 'call', accountId });
        } catch (err: any) {
          this.logger.debug(`Error processing call event: ${err.message}`);
        }
      }
    });

    // ── Live Emoji Reactions
    socket.ev.on('messages.reaction', async (reactions: any[]) => {
      try {
        for (const item of reactions) {
          const keyId = item.key?.id;
          const reactionText = item.reaction?.text || null;
          if (!keyId) continue;

          await this.messageRepo.update({ id: keyId, accountId }, { reaction: reactionText }).catch(() => null);
          this.broadcast(tenantId, accountId, 'whatsapp:message_reaction', {
            messageId: keyId,
            chatJid: item.key?.remoteJid,
            reaction: reactionText,
          });
          this.logger.log(`❤️ Reaction [${reactionText || 'removed'}] on message [${keyId}]`);
        }
      } catch (err: any) {
        this.logger.warn(`Error handling messages.reaction: ${err.message}`);
      }
    });

    // ── Deleted Messages Recovery (Preserve deleted messages in DB)
    socket.ev.on('messages.delete', async (item: any) => {
      try {
        if (item && Array.isArray(item.keys)) {
          for (const k of item.keys) {
            if (k?.id) {
              await this.messageRepo.update({ id: k.id, accountId }, { isDeleted: true }).catch(() => null);
              this.broadcast(tenantId, accountId, 'whatsapp:message_deleted', {
                messageId: k.id,
                chatJid: k.remoteJid,
              });
              this.logger.log(`🗑️ Recovered & preserved deleted message [${k.id}]`);
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Error handling messages.delete: ${err.message}`);
      }
    });

    const instance: BaileysClientInstance = {
      accountId,
      socket,
      authDir,
      createdAt: new Date(),
    };

        this.clients.set(accountId, instance);
        return instance;
      } finally {
        this.clientCreationLocks.delete(accountId);
      }
    })();

    this.clientCreationLocks.set(accountId, creationTask);
    return creationTask;
  }

  // ── Sync Groups Metadata and Extract Contacts ─────────────────────────────
  async syncGroupsAndContacts(accountId: string, socketInstance?: WASocket) {
    const socket = socketInstance || this.clients.get(accountId)?.socket;
    if (!socket) return;

    try {
      this.logger.log(`[Sync] Fetching all participating groups for [${accountId}]...`);
      const groups = await socket.groupFetchAllParticipating();
      const groupEntries = Object.entries(groups);
      this.logger.log(`[Sync] Found ${groupEntries.length} participating groups`);

      let accountPhone = '';
      try {
        const client = this.getClient(accountId);
        accountPhone = client?.socket?.user?.id?.split(':')[0]?.split('@')[0] || '';
        if (!accountPhone) {
          const acc = await this.accountRepo.findOne({ where: { id: accountId } });
          accountPhone = acc?.phoneNumber || '';
        }
      } catch {}

      const participantContactsMap = new Map<string, Partial<WhatsappContactEntity>>();

      for (const [groupId, groupMeta] of groupEntries) {
        let chat = await this.chatRepo.findOne({ where: { id: groupId, accountId } });
        const candidateSubject = (groupMeta as any)?.subject;
        const name = (candidateSubject && isProperName(candidateSubject))
          ? candidateSubject
          : (chat?.name && isProperName(chat.name))
            ? chat.name
            : resolveContactInfo(groupId, candidateSubject, null, null, true).name;
        const subtitle = (groupMeta as any)?.desc || undefined;

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

        // ── Harvest group participants as contacts only if they have real names ──
        const participants = (groupMeta as any)?.participants || [];
        for (const p of participants) {
          if (!p || !p.id) continue;
          const normalizedId = p.id.replace(/:\d+@/, '@');
          const rawDigits = normalizedId.split('@')[0].replace(/\D/g, '');
          if (accountPhone && rawDigits === accountPhone) continue; // Skip self

          // Only process participants that have a genuine human name or pushName
          // Never harvest anonymous group participants who have neither a name nor a direct 1-to-1 conversation
          const hasRealName = (p.name && isProperName(p.name)) || (p.notify && isProperName(p.notify));
          if (!hasRealName) continue;

          const sanitized = this.sanitizeIncomingContact(
            { id: normalizedId, name: p.name, notify: p.notify },
            accountId,
            accountPhone,
          );
          if (sanitized && sanitized.id && sanitized.name) {
            // Keep better name if already known
            const existingInMap = participantContactsMap.get(sanitized.id);
            if (!existingInMap || (!existingInMap.name && sanitized.name)) {
              participantContactsMap.set(sanitized.id, sanitized);
            }
          }
        }
      }

      // Batch save extracted group contacts into whatsapp_contacts
      if (participantContactsMap.size > 0) {
        const contactsList = Array.from(participantContactsMap.values());
        this.logger.log(`[Sync] Saving ${contactsList.length} unique contacts discovered from groups for [${accountId}]...`);
        for (let i = 0; i < contactsList.length; i += 100) {
          const chunk = contactsList.slice(i, i + 100);
          await this.contactRepo.save(chunk as any[]).catch(() => null);
        }
      }

      // Trigger on-demand App State resync from WhatsApp (fetches address book contactAction patches)
      try {
        if (typeof (socket as any).resyncAppState === 'function') {
          (socket as any).resyncAppState(
            ['critical_unblock_low', 'critical_block', 'regular_high', 'regular_low', 'regular'],
            true,
          ).catch(() => {
            (socket as any).resyncAppState(
              ['critical_unblock_low', 'critical_block', 'regular_high', 'regular_low', 'regular'],
              false,
            ).catch((e: any) => this.logger.warn(`resyncAppState notice: ${e.message}`));
          });
        }
      } catch {}

      const tenantId = this.config.get('TENANT_ID', 'default-tenant');
      this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
      this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });
    } catch (err: any) {
      this.logger.error(`[Sync] Failed to sync groups: ${err.message}`);
    }
  }

  // ── Sync All WhatsApp Data (Groups, Contacts, Historical Chats) ───────────
  async syncAllData(accountId: string) {
    let instance = this.getClient(accountId);
    if (!instance) {
      try {
        const hasSession = await this.sessionSyncManager.hasSession(accountId);
        if (hasSession) {
          const hydration = await this.sessionSyncManager.hydrateSession(accountId);
          instance = await this.createClient(accountId, hydration.authDir);
        }
      } catch (err: any) {
        this.logger.warn(`Could not hydrate for full sync: ${err.message}`);
      }
    }

    if (instance?.socket) {
      await this.syncGroupsAndContacts(accountId, instance.socket);
    }

    // Synthesize chats for all contacts that have messages or are in groups
    const recentMessages = await this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.accountId = :accountId', { accountId })
      .orderBy('msg.timestamp', 'DESC')
      .take(300)
      .getMany();

    const existingChatsList = await this.chatRepo.find({ where: { accountId } });
    const chatMap = new Map<string, WhatsappChatEntity>(existingChatsList.map(c => [c.id, c]));

    for (const msg of recentMessages) {
      if (!msg.chatJid || msg.chatJid === 'status@broadcast') continue;
      const existingChat = chatMap.get(msg.chatJid);

      const snippet = msg.text || (
        msg.mediaType === 'image' ? '📷 Photo' :
        msg.mediaType === 'video' ? '🎥 Video' :
        msg.mediaType === 'audio' ? '🎵 Voice message' :
        msg.mediaType === 'document' ? '📎 Document' :
        msg.mediaType === 'sticker' ? '🎨 Sticker' : ''
      );

      if (!existingChat) {
        const isGrp = msg.chatJid.endsWith('@g.us');
        const isLid = isLidIdentifier(msg.chatJid);
        const resolved = resolveContactInfo(msg.chatJid, null, null, null, isGrp);
        const cleanDigits = msg.chatJid.split('@')[0].replace(/\D/g, '');
        let initialChatName = resolved.name;
        if (!isGrp && (!initialChatName || initialChatName === 'Direct Chat' || initialChatName === 'You (Message yourself)' || initialChatName === 'WhatsApp User' || initialChatName.startsWith('User …') || initialChatName.startsWith('Contact') || initialChatName === 'Community Member')) {
          if (!isLid && cleanDigits.length >= 7) {
            initialChatName = formatE164Phone(cleanDigits) || `+${cleanDigits}`;
          } else if (isLid) {
            const reg = KNOWN_LID_MAP[cleanDigits] || UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
            initialChatName = reg?.name || reg?.phone || '';
          } else {
            initialChatName = msg.chatJid.split('@')[0];
          }
        }
        const newChat = this.chatRepo.create({
          id: msg.chatJid,
          accountId,
          name: initialChatName,
          isGroup: isGrp,
          unreadCount: 0,
          lastMessageText: snippet,
          lastMessageTimestamp: msg.timestamp || Date.now(),
          lastMessageStatus: msg.status || 'sent',
          lastMessageFromMe: msg.fromMe,
        });
        chatMap.set(msg.chatJid, newChat);
        await this.chatRepo.save(newChat).catch(() => null);
      } else {
        // Refresh existing chat's last-message fields if this message is newer
        const msgTs = msg.timestamp || 0;
        if (msgTs >= (existingChat.lastMessageTimestamp || 0) && snippet) {
          existingChat.lastMessageText = snippet;
          existingChat.lastMessageTimestamp = msgTs;
          existingChat.lastMessageStatus = msg.status || existingChat.lastMessageStatus;
          existingChat.lastMessageFromMe = msg.fromMe;
          await this.chatRepo.save(existingChat).catch(() => null);
        }
      }
    }

    // ── Synthesize chats for all stored contacts so they appear in chat list & search ──
    const allContacts = await this.contactRepo.find({ where: { accountId } });
    const chatsToSave: WhatsappChatEntity[] = [];
    for (const contact of allContacts) {
      if (!contact.id || contact.id === 'status@broadcast' || isGroupJid(contact.id)) continue;

      // Only synthesize chats for contacts that have authentic human names, NOT raw LIDs or anonymous numbers
      const hasHumanName = (contact.name && /[a-zA-Z]/.test(contact.name) && !contact.name.startsWith('Contact (')) ||
                           (contact.notifyName && /[a-zA-Z]/.test(contact.notifyName) && !contact.notifyName.startsWith('Contact ('));
      if (!hasHumanName) continue;

      if (!chatMap.has(contact.id)) {
        const resolved = resolveContactInfo(
          contact.id,
          contact.name,
          contact.phoneNumber,
          contact.notifyName,
          false,
        );
        const contactChat = this.chatRepo.create({
          id: contact.id,
          accountId,
          name: resolved.name || contact.name || contact.phoneNumber || contact.id.split('@')[0],
          isGroup: false,
          unreadCount: 0,
          lastMessageText: '',
          lastMessageTimestamp: 0,
          lastMessageStatus: undefined,
          lastMessageFromMe: false,
          pinned: false,
        });
        chatMap.set(contact.id, contactChat);
        chatsToSave.push(contactChat);
      } else {
        const existingChat = chatMap.get(contact.id);
        if (
          existingChat &&
          (!existingChat.name || existingChat.name === existingChat.id || existingChat.name.startsWith('Contact (')) &&
          contact.name &&
          !contact.name.startsWith('Contact (')
        ) {
          existingChat.name = contact.name;
          chatsToSave.push(existingChat);
        }
      }
    }

    if (chatsToSave.length > 0) {
      for (let i = 0; i < chatsToSave.length; i += 100) {
        const chunk = chatsToSave.slice(i, i + 100);
        await this.chatRepo.save(chunk).catch(() => null);
      }
      this.logger.log(`[Sync] Synthesized ${chatsToSave.length} contact chats into whatsapp_chats for [${accountId}]`);
    }

    // ── Synthesize contacts from all direct 1-to-1 chats into whatsapp_contacts ──
    const contactMap = new Map<string, WhatsappContactEntity>(allContacts.map(c => [c.id, c]));
    const contactsToSave: WhatsappContactEntity[] = [];
    for (const [chatId, chat] of chatMap.entries()) {
      if (chat.isGroup || chatId.endsWith('@g.us') || chatId.endsWith('@newsletter') || chatId === 'status@broadcast') continue;
      const isLid = isLidIdentifier(chatId);
      const rawDigits = chatId.split('@')[0].replace(/\D/g, '');
      const hasChatName = chat.name && isProperName(chat.name);
      if (isLid && !hasChatName) continue; // Skip anonymous LIDs

      if (!contactMap.has(chatId)) {
        const contactName = hasChatName ? chat.name : '';
        const phone = !isLid && rawDigits.length >= 7 ? (formatE164Phone(rawDigits) || `+${rawDigits}`) : '';
        const newContact = this.contactRepo.create({
          id: chatId,
          accountId,
          name: contactName,
          notifyName: contactName,
          phoneNumber: phone,
        });
        contactMap.set(chatId, newContact);
        contactsToSave.push(newContact);
      }
    }
    if (contactsToSave.length > 0) {
      await this.contactRepo.save(contactsToSave).catch(() => null);
      this.logger.log(`[Sync] Synthesized ${contactsToSave.length} contacts from direct chats for [${accountId}]`);
    }

    const tenantId = this.config.get('TENANT_ID', 'default-tenant');
    this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
    this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });

    // ── Auto-repair media URLs in the background so every account (new or old)
    //    gets its media backfilled automatically without blocking the sync response.
    this.repairMediaUrls(accountId).then(result => {
      this.logger.log(
        `🔧 [AutoRepair] Account [${accountId}]: backfilled=${result.fixed}, redownloaded=${result.redownloaded}, failed=${result.failed}`,
      );
      if (result.fixed + result.redownloaded > 0) {
        // Notify frontend that messages were updated so it re-fetches open chat
        this.broadcast(tenantId, accountId, 'whatsapp:media_repaired', {
          accountId,
          fixed: result.fixed,
          redownloaded: result.redownloaded,
        });
      }
    }).catch(err => {
      this.logger.warn(`🔧 [AutoRepair] Background repair error for [${accountId}]: ${err.message}`);
    });

    return {
      success: true,
      message: 'All WhatsApp chats and contacts synced successfully',
    };
  }

  // ── Handle real-time WhatsApp message edits ────────────────────────────────
  private async handleEditedMessage(
    accountId: string,
    targetMsgId: string,
    chatJid: string,
    newRawContent: any,
    editTimestamp?: number,
  ) {
    try {
      const unwrapped = unwrapMessage(newRawContent);
      const newText = extractMessageText(unwrapped) || extractMessageText(newRawContent) || '';

      this.logger.log(`✏️ Detected edited message [${targetMsgId}] in chat [${chatJid}]: "${newText}"`);

      // 1. Update message in SQLite
      const existing = await this.messageRepo.findOne({ where: { id: targetMsgId, accountId } });
      if (existing) {
        existing.text = newText;
        existing.isEdited = true;
        await this.messageRepo.save(existing);
      } else {
        const anyExisting = await this.messageRepo.findOne({ where: { id: targetMsgId } });
        if (anyExisting) {
          anyExisting.text = newText;
          anyExisting.isEdited = true;
          await this.messageRepo.save(anyExisting);
        } else {
          await this.messageRepo.save({
            id: targetMsgId,
            accountId,
            chatJid: chatJid || '',
            text: newText,
            isEdited: true,
            status: 'delivered',
            timestamp: editTimestamp || Date.now(),
          }).catch(err => this.logger.debug(`Failed saving fallback edit message: ${err.message}`));
        }
      }

      // 2. Clean up any empty phantom messages that might have been saved
      if (chatJid) {
        await this.messageRepo.createQueryBuilder()
          .delete()
          .from(WhatsappMessageEntity)
          .where('accountId = :accountId AND chatJid = :chatJid AND (text IS NULL OR text = "") AND mediaType IS NULL', {
            accountId,
            chatJid,
          })
          .execute()
          .catch(err => this.logger.debug(`Failed cleaning phantom messages: ${err.message}`));
      }

      // 3. Update chat lastMessageText targeted for chatJid and matching prefix
      if (chatJid && newText) {
        const rawPrefix = chatJid.split('@')[0];
        await this.chatRepo
          .createQueryBuilder()
          .update(WhatsappChatEntity)
          .set({ lastMessageText: newText })
          .where('accountId = :accountId AND (id = :chatJid OR id LIKE :prefixPattern)', {
            accountId,
            chatJid,
            prefixPattern: `${rawPrefix}@%`,
          })
          .execute()
          .catch((err) => this.logger.warn(`Failed updating chat preview for edited message: ${err.message}`));
      }

      // 4. Broadcast to frontend via WebSockets
      const tenantId = this.config.get('TENANT_ID', 'default-tenant');
      this.broadcast(tenantId, accountId, 'whatsapp:message_edited', {
        accountId,
        chatJid,
        messageId: targetMsgId,
        text: newText,
        isEdited: true,
      });

      // Also broadcast chats_updated so chat list updates preview
      this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });

      // 5. Emit internal event
      this.eventEmitter.emit('whatsapp.message.edited', {
        accountId,
        chatJid,
        messageId: targetMsgId,
        text: newText,
      });
    } catch (err: any) {
      this.logger.error(`Error handling edited message [${targetMsgId}]: ${err.message}`);
    }
  }

  // ── Process and persist an individual message ──────────────────────────────
  private async processMessage(accountId: string, msg: any, shouldBroadcast = true) {
    const msgId = msg.key?.id;
    let chatJid = msg.key?.remoteJid;
    if (!msgId || !chatJid || chatJid === 'status@broadcast') return;

    const fromMe = !!msg.key?.fromMe;
    const isGroup = chatJid.endsWith('@g.us');
    const senderJid = msg.key?.participant || (fromMe ? accountId : chatJid);
    let senderName = msg.pushName || (fromMe ? 'You' : '');

    // Never allow raw group JID or group ID prefix to be used as sender name
    if (senderName && (senderName.startsWith('120363') || senderName.includes('@g.us'))) {
      senderName = '';
    }

    // Automatically register incoming pushName into universal identity registry & live contacts
    if (!fromMe && msg.pushName && isProperName(msg.pushName)) {
      const cleanPush = msg.pushName.trim();
      registerUniversalContact(chatJid, cleanPush);
      if (senderJid && senderJid !== chatJid) {
        registerUniversalContact(senderJid, cleanPush);
      }

      // Live update sender contact in DB so user always sees the authentic name
      const targetContactId = (senderJid || chatJid).replace(/:\d+@/, '@');
      if (targetContactId && targetContactId !== 'status@broadcast') {
        const rawDigits = targetContactId.split('@')[0].replace(/\D/g, '');
        const isLid = isLidIdentifier(targetContactId);
        this.contactRepo.findOne({ where: { id: targetContactId, accountId } }).then((existing) => {
          if (existing) {
            let changed = false;
            if (!isProperName(existing.name) || existing.name.startsWith('+')) {
              existing.name = cleanPush;
              changed = true;
            }
            if (existing.notifyName !== cleanPush) {
              existing.notifyName = cleanPush;
              changed = true;
            }
            if (changed) {
              this.contactRepo.save(existing).catch(() => null);
              const tenantId = this.config.get('TENANT_ID', 'default-tenant');
              this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });
            }
          } else {
            const newContact = this.contactRepo.create({
              id: targetContactId,
              accountId,
              name: cleanPush,
              notifyName: cleanPush,
              phoneNumber: !isLid && rawDigits.length >= 7 ? (formatE164Phone(rawDigits) || `+${rawDigits}`) : '',
            });
            this.contactRepo.save(newContact).then(() => {
              const tenantId = this.config.get('TENANT_ID', 'default-tenant');
              this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });
            }).catch(() => null);
          }
        }).catch(() => null);
      }
    }

    // Unwrap ephemeral, viewOnce, documentWithCaption, and edited messages
    const messageContent = unwrapMessage(msg.message);

    // ── Check if this incoming message is an EDITED message or REVOKED/DELETED message
    const directEdit = extractDirectEditedContent(msg);
    if (directEdit?.targetId && directEdit?.content) {
      await this.handleEditedMessage(
        accountId,
        directEdit.targetId,
        directEdit.targetChat || chatJid,
        directEdit.content,
        msg.messageTimestamp ? (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp * 1000 : Date.now()) : Date.now(),
      );
      return null;
    }

    const rawProtocolMsg = extractProtocolMessage(msg.message) || messageContent?.protocolMessage;

    // 1. Fallback edit check: ProtocolMessage type 14 / MESSAGE_EDIT
    if (rawProtocolMsg && (rawProtocolMsg.type === 14 || rawProtocolMsg.type === 'MESSAGE_EDIT' || rawProtocolMsg.editedMessage != null)) {
      const targetId = rawProtocolMsg.key?.id;
      const targetChat = rawProtocolMsg.key?.remoteJid || chatJid;
      if (targetId) {
        await this.handleEditedMessage(
          accountId,
          targetId,
          targetChat,
          rawProtocolMsg.editedMessage,
          msg.messageTimestamp ? (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp * 1000 : Date.now()) : Date.now(),
        );
        return null;
      }
    }

    // 2. Deleted Message Recovery: check if sender revoked/deleted a past message (type 0)
    if (rawProtocolMsg && rawProtocolMsg.type === 0 && rawProtocolMsg.key?.id) {
      const revokedId = rawProtocolMsg.key.id;
      await this.messageRepo.update({ id: revokedId, accountId }, { isDeleted: true }).catch(() => null);
      const tenantId = this.config.get('TENANT_ID', 'default-tenant');
      this.broadcast(tenantId, accountId, 'whatsapp:message_deleted', {
        messageId: revokedId,
        chatJid,
      });
      this.logger.log(`🗑️ Preserved deleted message [${revokedId}] in chat [${chatJid}]`);
      return null;
    }

    // ── Skip pure app-state / key-share protocol messages (no user content)
    if (rawProtocolMsg || (msg.message && Object.keys(msg.message).some(k => k === 'protocolMessage' || k === 'appStateSyncKeyShare' || k === 'appStateSyncKey' || k === 'senderKeyDistributionMessage' || k === 'deviceSentMessage' || k === 'keepInChatMessage' || k === 'callLogMesssage'))) {
      const tempText = extractMessageText(messageContent);
      if (!tempText && !messageContent?.imageMessage && !messageContent?.videoMessage && !messageContent?.audioMessage && !messageContent?.documentMessage && !messageContent?.stickerMessage) {
        return null;
      }
    }

    // ── View-Once Bypass: detect view-once media so it is permanently preserved
    const isViewOnce = !!(
      msg.message?.viewOnceMessage ||
      msg.message?.viewOnceMessageV2 ||
      messageContent?.imageMessage?.viewOnce ||
      messageContent?.videoMessage?.viewOnce
    );

    let mediaType: string | undefined = undefined;
    let mimeType: string | undefined = undefined;
    let fileName: string | undefined = undefined;
    let fileSize: number | undefined = undefined;
    let mediaUrl: string | undefined = undefined;

    if (messageContent?.imageMessage) {
      mediaType = 'image';
      mimeType = messageContent.imageMessage.mimetype || 'image/jpeg';
      fileSize = Number(messageContent.imageMessage.fileLength || 0);
    } else if (messageContent?.videoMessage) {
      mediaType = 'video';
      mimeType = messageContent.videoMessage.mimetype || 'video/mp4';
      fileSize = Number(messageContent.videoMessage.fileLength || 0);
    } else if (messageContent?.audioMessage) {
      mediaType = 'audio';
      mimeType = messageContent.audioMessage.mimetype || 'audio/ogg';
      fileSize = Number(messageContent.audioMessage.fileLength || 0);
    } else if (messageContent?.documentMessage) {
      mediaType = 'document';
      mimeType = messageContent.documentMessage.mimetype || 'application/octet-stream';
      fileName = messageContent.documentMessage.fileName || messageContent.documentMessage.title || 'document';
      fileSize = Number(messageContent.documentMessage.fileLength || 0);
    } else if (messageContent?.stickerMessage) {
      mediaType = 'sticker';
      mimeType = messageContent.stickerMessage.mimetype || 'image/webp';
      fileSize = Number(messageContent.stickerMessage.fileLength || 0);
    }

    const rawText = extractMessageText(messageContent);
    const text = rawText || (
      mediaType === 'image' ? '📷 Photo' :
      mediaType === 'video' ? '🎥 Video' :
      mediaType === 'audio' ? '🎵 Audio message' :
      mediaType === 'sticker' ? '🎨 Sticker' :
      mediaType === 'document' ? (fileName ? `📎 ${fileName}` : '📎 Document') :
      ''
    );
    const timestamp = typeof msg.messageTimestamp === 'number'
      ? msg.messageTimestamp * 1000
      : (msg.messageTimestamp?.low ? msg.messageTimestamp.low * 1000 : Date.now());

    if (mediaType) {
      try {
        const mediaDir = path.resolve(process.cwd(), 'data', 'media', accountId);
        if (!fs.existsSync(mediaDir)) {
          fs.mkdirSync(mediaDir, { recursive: true });
        }

        let ext = 'bin';
        if (mimeType?.includes('jpeg') || mimeType?.includes('jpg')) ext = 'jpg';
        else if (mimeType?.includes('png')) ext = 'png';
        else if (mimeType?.includes('webp')) ext = 'webp';
        else if (mimeType?.includes('mp4')) ext = 'mp4';
        else if (mimeType?.includes('ogg') || mimeType?.includes('opus')) ext = 'ogg';
        else if (mimeType?.includes('mp3')) ext = 'mp3';
        else if (mimeType?.includes('m4a') || mimeType?.includes('aac')) ext = 'm4a';
        else if (mimeType?.includes('wav')) ext = 'wav';
        else if (mimeType?.includes('pdf')) ext = 'pdf';
        else if (mimeType?.includes('sheet') || mimeType?.includes('excel')) ext = 'xlsx';
        else if (mimeType?.includes('word')) ext = 'docx';
        else if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) ext = 'pptx';
        else if (mimeType?.includes('zip')) ext = 'zip';
        else if (mimeType?.includes('text') || mimeType?.includes('plain')) ext = 'txt';
        else if (fileName && fileName.includes('.')) ext = fileName.split('.').pop()?.toLowerCase() || 'bin';

        const cleanMsgId = msgId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${cleanMsgId}.${ext}`;
        const filePath = path.join(mediaDir, filename);

        if (fs.existsSync(filePath)) {
          mediaUrl = `/api/v1/whatsapp/media/${accountId}/${filename}`;
        } else {
          const socket = this.clients.get(accountId)?.socket;
          const downloadTarget = {
            ...msg,
            message: messageContent || msg.message,
          };
          let buffer: Buffer | null = null;
          try {
            const downloadPromise = downloadMediaMessage(
              downloadTarget as any,
              'buffer',
              {},
              {
                logger: pino({ level: 'silent' }) as any,
                reuploadRequest: (socket as any)?.updateMediaMessage,
              },
            );
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), shouldBroadcast ? 30000 : 3000));
            buffer = (await Promise.race([downloadPromise, timeoutPromise])) as Buffer | null;
          } catch {
            // Fallback: try raw msg if downloadTarget failed
            try {
              const downloadPromise2 = downloadMediaMessage(
                msg,
                'buffer',
                {},
                {
                  logger: pino({ level: 'silent' }) as any,
                  reuploadRequest: (socket as any)?.updateMediaMessage,
                },
              );
              const timeoutPromise2 = new Promise<null>((resolve) => setTimeout(() => resolve(null), shouldBroadcast ? 30000 : 3000));
              buffer = (await Promise.race([downloadPromise2, timeoutPromise2])) as Buffer | null;
            } catch {
              buffer = null;
            }
          }

          if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
            await fs.promises.writeFile(filePath, buffer);
            mediaUrl = `/api/v1/whatsapp/media/${accountId}/${filename}`;
            this.logger.log(`Saved ${mediaType} for message [${msgId}]: ${filename} (${buffer.length} bytes)`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Media download skipped for [${msgId}]: ${err.message}`);
      }
    }

    // ── Context Quote Info (Reply to message)
    const contextInfo = messageContent?.extendedTextMessage?.contextInfo
      || messageContent?.imageMessage?.contextInfo
      || messageContent?.videoMessage?.contextInfo
      || messageContent?.audioMessage?.contextInfo
      || messageContent?.documentMessage?.contextInfo;

    let quotedMsgId: string | undefined = undefined;
    let quotedText: string | undefined = undefined;
    let quotedSender: string | undefined = undefined;

    if (contextInfo?.stanzaId) {
      quotedMsgId = contextInfo.stanzaId;
      quotedSender = contextInfo.participant || contextInfo.remoteJid;
      quotedText = contextInfo.quotedMessage?.conversation
        || contextInfo.quotedMessage?.extendedTextMessage?.text
        || (contextInfo.quotedMessage?.imageMessage ? '📷 Photo' : '')
        || (contextInfo.quotedMessage?.videoMessage ? '🎥 Video' : '')
        || (contextInfo.quotedMessage?.audioMessage ? '🎵 Voice message' : '')
        || (contextInfo.quotedMessage?.documentMessage ? '📎 Document' : '');
    }

    // Never persist empty messages that have no text and no media
    if (!text && !mediaType) {
      return null;
    }

    const msgPayload = {
      id: msgId,
      accountId,
      chatJid,
      senderJid,
      senderName: isGroup && !fromMe ? senderName : undefined,
      fromMe,
      text,
      mediaType,
      mediaUrl,
      fileName,
      mimeType,
      fileSize,
      status: fromMe ? 'sent' : 'delivered',
      isDeleted: false,
      isViewOnce: !!isViewOnce,
      isEdited: false,
      quotedMsgId,
      quotedText,
      quotedSender,
      timestamp,
    };

    const storeMessagesOnServer = this.config.get<string>('STORE_MESSAGES_ON_SERVER', 'true') === 'true';
    const savedMsg = storeMessagesOnServer
      ? await this.messageRepo.save(msgPayload)
      : (msgPayload as any);

    // Determine the snippet for the chat list item and strip any raw group JID prefix
    let snippet = text;
    if (!snippet) {
      if (mediaType === 'image') snippet = '📷 Photo';
      else if (mediaType === 'video') snippet = '🎥 Video';
      else if (mediaType === 'audio') snippet = '🎵 Voice message';
      else if (mediaType === 'document') snippet = `📎 ${fileName || 'Document'}`;
      else if (mediaType === 'sticker') snippet = '🎨 Sticker';
      else snippet = '';
    }
    if (snippet) {
      snippet = snippet.replace(/^(120363\d+|[0-9]{15,}@g\.us):\s*/i, '');
    }
    if (isGroup && !fromMe && senderName && snippet) {
      if (!senderName.startsWith('120363') && senderName !== chatJid && senderName !== chatJid.split('@')[0]) {
        snippet = `${senderName}: ${snippet}`;
      }
    }

    // Upsert chat to keep chat list updated
    let chat = await this.chatRepo.findOne({ where: { id: chatJid, accountId } });
    if (!chat) {
      let chatName = chatJid.split('@')[0];
      if (isGroup) {
        const suffix = chatJid.split('@')[0].slice(-4);
        chatName = suffix ? `Group (${suffix})` : 'Group Chat';
        const instance = this.getClient(accountId);
        if (instance?.socket) {
          instance.socket.groupMetadata(chatJid).then((meta) => {
            if (meta?.subject && isProperName(meta.subject)) {
              this.chatRepo.update(
                { id: chatJid, accountId },
                { name: meta.subject, subtitle: meta.desc },
              );
            }
          }).catch(() => null);
        }
      } else {
        const contact = await this.contactRepo.findOne({ where: { id: chatJid, accountId } });
        const fromPushName = (!fromMe && senderName && isProperName(senderName)) ? senderName.trim() : null;
        const candidateName = (contact?.name && isProperName(contact.name))
          ? contact.name
          : (contact?.notifyName && isProperName(contact.notifyName))
            ? contact.notifyName
            : fromPushName;
        const account = await this.accountRepo.findOne({ where: { id: accountId } });
        const resolved = resolveContactInfo(chatJid, candidateName, contact?.phoneNumber, contact?.notifyName, false, account?.phoneNumber);
        chatName = resolved.name;

        // Auto-heal: Ensure 1-to-1 unknown contacts show formatted phone or pushName, NEVER "Direct Chat" or "You (Message yourself)"
        const isLid = isLidIdentifier(chatJid);
        const cleanDigits = chatJid.split('@')[0].replace(/\D/g, '');
        if (!chatName || !isProperName(chatName)) {
          if (fromPushName) {
            chatName = fromPushName;
          } else if (!isLid && cleanDigits.length >= 7) {
            chatName = formatE164Phone(cleanDigits) || `+${cleanDigits}`;
          } else if (isLid) {
            const reg = KNOWN_LID_MAP[cleanDigits] || UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
            chatName = reg?.name || reg?.phone || '';
          } else {
            chatName = chatJid.split('@')[0];
          }
        }
      }

      chat = this.chatRepo.create({
        id: chatJid,
        accountId,
        name: chatName,
        isGroup,
        unreadCount: fromMe ? 0 : 1,
        lastMessageText: snippet,
        lastMessageTimestamp: timestamp,
        lastMessageStatus: fromMe ? 'sent' : 'delivered',
        lastMessageFromMe: fromMe,
      });
    } else {
      chat.lastMessageText = snippet || chat.lastMessageText;
      chat.lastMessageTimestamp = timestamp;
      chat.lastMessageStatus = fromMe ? 'sent' : 'delivered';
      chat.lastMessageFromMe = fromMe;
      if (!fromMe) {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
      }

      // Update 1-to-1 chat name:
      // A) If senderName is available and proper, use it to update placeholder names.
      // B) If senderName is NOT available and chat currently has an improper name,
      //    heal it immediately with the contact's phone number!
      if (!isGroup && !fromMe) {
        const isLid = isLidIdentifier(chatJid);
        const cleanDigits = chatJid.split('@')[0].replace(/\D/g, '');
        const formattedPhone = (!isLid && cleanDigits.length >= 7) ? (formatE164Phone(cleanDigits) || `+${cleanDigits}`) : '';
        const isCorruptName = !chat.name || !isProperName(chat.name);

        if (senderName && isProperName(senderName)) {
          const cleanSender = senderName.trim();
          if (isCorruptName || chat.name === formattedPhone) {
            chat.name = cleanSender;
            this.chatRepo.update({ id: chatJid, accountId }, { name: cleanSender }).catch(() => null);
          }
          this.contactRepo.findOne({ where: { id: chatJid, accountId } }).then((c) => {
            if (c) {
              c.notifyName = cleanSender;
              if (!c.name || !isProperName(c.name)) {
                c.name = cleanSender;
              }
              this.contactRepo.save(c).catch(() => null);
            }
          }).catch(() => null);
        } else if (isCorruptName && formattedPhone) {
          // If no proper pushName, heal with genuine formatted phone number so "Direct Chat" never persists!
          chat.name = formattedPhone;
          this.chatRepo.update({ id: chatJid, accountId }, { name: formattedPhone }).catch(() => null);
        }
      }
    }
    if (storeMessagesOnServer) {
      await this.chatRepo.save(chat);
    }

    if (shouldBroadcast) {
      if (!chat.isGroup && (!chat.name || chat.name === 'Direct Chat' || chat.name === 'You (Message yourself)' || chat.name === 'WhatsApp User' || chat.name.startsWith('User …') || chat.name.startsWith('Contact') || chat.name === 'Community Member')) {
        const isLid = isLidIdentifier(chat.id);
        const cleanDigits = chat.id.split('@')[0].replace(/\D/g, '');
        if (!isLid && cleanDigits.length >= 7) {
          chat.name = formatE164Phone(cleanDigits) || `+${cleanDigits}`;
        } else if (isLid) {
          const reg = KNOWN_LID_MAP[cleanDigits] || UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
          if (reg?.name && isProperName(reg.name)) {
            chat.name = reg.name;
          } else if (reg?.phone) {
            chat.name = reg.phone;
          }
        }
      }
      const tenantId = this.config.get('TENANT_ID', 'default-tenant');
      this.broadcast(tenantId, accountId, 'whatsapp:message_new', {
        message: savedMsg,
        chat,
      });
      this.broadcast(tenantId, accountId, 'message:incoming', {
        messageId: msgId,
        from: senderJid,
        to: chatJid,
        body: text,
        mediaType,
        timestamp,
      });

      // ── Client Incoming Message Notification System ──
      if (!fromMe) {
        this.emitClientMessageNotification(tenantId, accountId, chatJid, chat, savedMsg, text || snippet, mediaType, timestamp, isGroup).catch((err) => {
          this.logger.warn(`Failed to emit client incoming message notification: ${err.message}`);
        });
      }
    }
  }

  // ── Direct Send Message via Baileys ───────────────────────────────────────
  async sendMessage(accountId: string, to: string, text: string, quotedMsgId?: string) {
    if (!text || !text.trim()) {
      throw new BadRequestException('Message text cannot be empty.');
    }

    let instance = this.getClient(accountId);
    if (!instance) {
      try {
        const hasSession = await this.sessionSyncManager.hasSession(accountId);
        if (hasSession) {
          this.logger.log(`Account [${accountId}] has session. Auto-hydrating client...`);
          const hydration = await this.sessionSyncManager.hydrateSession(accountId);
          instance = await this.createClient(accountId, hydration.authDir);
        }
      } catch (hydrateErr: any) {
        this.logger.warn(`Auto-hydration attempt failed: ${hydrateErr.message}`);
      }
    }

    if (!this.isSocketConnected(accountId) || !instance?.socket?.user?.id) {
      throw new BadRequestException(
        `WhatsApp account is not connected. Please scan the QR code to link your WhatsApp account.`,
      );
    }

    const jid = await this.resolveDeliverableJid(accountId, to);

    let quotedOptions: any = undefined;
    let quotedMessage: any = undefined;
    if (quotedMsgId) {
      quotedMessage = await this.messageRepo.findOne({ where: { id: quotedMsgId, accountId } });
      if (quotedMessage) {
        quotedOptions = {
          quoted: {
            key: {
              remoteJid: quotedMessage.chatJid,
              fromMe: quotedMessage.fromMe,
              id: quotedMessage.id,
              participant: quotedMessage.senderJid || undefined,
            },
            message: {
              conversation: quotedMessage.text || 'Message',
            },
          },
        };
      }
    }

    // ── Pillar 1: Anti-Ban Account Warm-Up Quota Verification ──────────
    const warmupCheck = await this.accountWarmupService.canDispatch(accountId);
    if (!warmupCheck.allowed) {
      this.logger.warn(`[Anti-Ban Guard] Blocked dispatch for ${accountId}: ${warmupCheck.reason}`);
      throw new BadRequestException(warmupCheck.reason);
    }

    // ── Pillar 1: AI-Powered Gaussian Typing Cadence Simulation ────────
    const simulateTyping = this.config.get<string>('SIMULATE_HUMAN_TYPING', 'true') === 'true';
    if (simulateTyping) {
      await this.behavioralTypingService.simulateHumanDispatch(instance.socket, jid, text);
    }

    let result: any;
    try {
      result = await instance.socket.sendMessage(jid, { text: text.trim() }, quotedOptions);
      this.accountWarmupService.recordDispatch(accountId);
      this.telemetryService?.incrementMessageThroughput(accountId, 'sent');
    } catch (socketErr: any) {
      this.telemetryService?.incrementMessageThroughput(accountId, 'failed');
      this.logger.error(`Failed to send message via Baileys socket: ${socketErr.message}`);
      if (socketErr?.message?.includes('Connection Closed') || socketErr?.message?.includes('closed') || socketErr?.message?.includes('not connected')) {
        await this.accountRepo.update(accountId, { status: 'disconnected' }).catch(() => null);
        const tenantId = this.config.get('TENANT_ID', 'default-tenant');
        this.broadcast(tenantId, accountId, 'account:status', { accountId, status: 'DISCONNECTED' });
      }
      throw new BadRequestException(`WhatsApp delivery error: ${socketErr.message || 'Socket error'}`);
    }

    const msgId = result?.key?.id || Math.random().toString(36).substring(2);
    const timestamp = Date.now();

    const msgPayload = {
      id: msgId,
      accountId,
      chatJid: to,
      senderJid: instance.socket.user?.id || accountId,
      fromMe: true,
      text: text.trim(),
      status: 'sent',
      quotedMsgId: quotedMessage ? quotedMessage.id : undefined,
      quotedText: quotedMessage ? quotedMessage.text : undefined,
      quotedSender: quotedMessage ? (quotedMessage.senderName || quotedMessage.senderJid) : undefined,
      timestamp,
    };

    const storeMessagesOnServer = this.config.get<string>('STORE_MESSAGES_ON_SERVER', 'true') === 'true';
    const savedMsg = storeMessagesOnServer
      ? await this.messageRepo.save(msgPayload)
      : (msgPayload as any);

    let chat = await this.chatRepo.findOne({ where: { id: to, accountId } });
    if (!chat) {
      const contact = await this.contactRepo.findOne({ where: { id: to, accountId } });
      const candidateSendName = (contact?.name && isProperName(contact.name)) ? contact.name : (contact?.notifyName && isProperName(contact.notifyName)) ? contact.notifyName : null;
      const resolvedSend = resolveContactInfo(to, candidateSendName, contact?.phoneNumber, null, to.endsWith('@g.us'));
      chat = this.chatRepo.create({
        id: to,
        accountId,
        name: resolvedSend.name || to.split('@')[0],
        isGroup: to.endsWith('@g.us'),
        unreadCount: 0,
        lastMessageText: text.trim(),
        lastMessageTimestamp: timestamp,
        lastMessageStatus: 'sent',
        lastMessageFromMe: true,
      });
    } else {
      chat.lastMessageText = text.trim();
      chat.lastMessageTimestamp = timestamp;
      chat.lastMessageStatus = 'sent';
      chat.lastMessageFromMe = true;
    }
    await this.chatRepo.save(chat);

    // Keep secondary JID chat entity in sync if different (e.g. deliverable was @s.whatsapp.net while chat was @lid)
    if (jid !== to) {
      const secondaryChat = await this.chatRepo.findOne({ where: { id: jid, accountId } });
      if (secondaryChat) {
        secondaryChat.lastMessageText = text.trim();
        secondaryChat.lastMessageTimestamp = timestamp;
        secondaryChat.lastMessageStatus = 'sent';
        secondaryChat.lastMessageFromMe = true;
        await this.chatRepo.save(secondaryChat);
      }
    }

    const tenantId = this.config.get('TENANT_ID', 'default-tenant');
    this.broadcast(tenantId, accountId, 'whatsapp:message_new', {
      message: savedMsg,
      chat,
    });

    return savedMsg;
  }

  // ── Send Voice Note via Baileys (Push-To-Talk) ────────────────────────────
  async sendVoiceNote(accountId: string, to: string, audioBuffer: Buffer, quotedMsgId?: string) {
    let instance = this.getClient(accountId);
    if (!this.isSocketConnected(accountId) || !instance?.socket?.user?.id) {
      throw new BadRequestException('WhatsApp account is not connected. Please scan the QR code to link your WhatsApp account.');
    }

    const jid = await this.resolveDeliverableJid(accountId, to);

    let quotedOptions: any = undefined;
    let quotedMessage: any = undefined;
    if (quotedMsgId) {
      quotedMessage = await this.messageRepo.findOne({ where: { id: quotedMsgId, accountId } });
      if (quotedMessage) {
        quotedOptions = {
          quoted: {
            key: {
              remoteJid: quotedMessage.chatJid,
              fromMe: quotedMessage.fromMe,
              id: quotedMessage.id,
              participant: quotedMessage.senderJid || undefined,
            },
            message: {
              conversation: quotedMessage.text || 'Voice message',
            },
          },
        };
      }
    }

    // ── Pillar 1: Anti-Ban Account Warm-Up & Voice Recording Presence ─
    const warmupCheck = await this.accountWarmupService.canDispatch(accountId);
    if (!warmupCheck.allowed) {
      throw new BadRequestException(warmupCheck.reason);
    }

    // Emulate human holding microphone button
    await instance.socket.sendPresenceUpdate('recording', jid).catch(() => null);
    await new Promise((r) => setTimeout(r, 1200));

    let result: any;
    try {
      result = await instance.socket.sendMessage(
        jid,
        {
          audio: audioBuffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
        },
        quotedOptions,
      );
      this.accountWarmupService.recordDispatch(accountId);
    } catch (socketErr: any) {
      this.logger.error(`Failed to send voice note via Baileys socket: ${socketErr.message}`);
      if (socketErr?.message?.includes('Connection Closed') || socketErr?.message?.includes('closed') || socketErr?.message?.includes('not connected')) {
        await this.accountRepo.update(accountId, { status: 'disconnected' }).catch(() => null);
        const tenantId = this.config.get('TENANT_ID', 'default-tenant');
        this.broadcast(tenantId, accountId, 'account:status', { accountId, status: 'DISCONNECTED' });
      }
      throw new BadRequestException(`WhatsApp voice delivery error: ${socketErr.message || 'Socket error'}`);
    } finally {
      await instance.socket.sendPresenceUpdate('paused', jid).catch(() => null);
    }

    const msgId = result?.key?.id || Math.random().toString(36).substring(2);
    const timestamp = Date.now();

    // Save local copy
    const mediaDir = path.resolve(process.cwd(), 'data', 'media', accountId);
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    const cleanMsgId = msgId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localFilename = `${cleanMsgId}.ogg`;
    await fs.promises.writeFile(path.join(mediaDir, localFilename), audioBuffer);
    const mediaUrl = `/api/v1/whatsapp/media/${accountId}/${localFilename}`;

    const voicePayload = {
      id: msgId,
      accountId,
      chatJid: to,
      senderJid: instance.socket.user?.id || accountId,
      fromMe: true,
      text: '🎵 Voice message',
      mediaType: 'audio',
      mediaUrl,
      fileName: 'voice-note.ogg',
      mimeType: 'audio/ogg; codecs=opus',
      fileSize: audioBuffer.length,
      status: 'sent',
      quotedMsgId: quotedMessage ? quotedMessage.id : undefined,
      quotedText: quotedMessage ? quotedMessage.text : undefined,
      quotedSender: quotedMessage ? (quotedMessage.senderName || quotedMessage.senderJid) : undefined,
      timestamp,
    };

    const storeMessagesOnServer = this.config.get<string>('STORE_MESSAGES_ON_SERVER', 'true') === 'true';
    const savedMsg = storeMessagesOnServer
      ? await this.messageRepo.save(voicePayload)
      : (voicePayload as any);

    let chat = await this.chatRepo.findOne({ where: { id: to, accountId } });
    if (!chat) {
      const contact = await this.contactRepo.findOne({ where: { id: to, accountId } });
      chat = this.chatRepo.create({
        id: to,
        accountId,
        name: contact?.name || contact?.notifyName || to.split('@')[0],
        isGroup: to.endsWith('@g.us'),
        unreadCount: 0,
        lastMessageText: '🎵 Voice message',
        lastMessageTimestamp: timestamp,
        lastMessageStatus: 'sent',
        lastMessageFromMe: true,
      });
    } else {
      chat.lastMessageText = '🎵 Voice message';
      chat.lastMessageTimestamp = timestamp;
      chat.lastMessageStatus = 'sent';
      chat.lastMessageFromMe = true;
    }
    await this.chatRepo.save(chat);

    if (jid !== to) {
      const secondaryChat = await this.chatRepo.findOne({ where: { id: jid, accountId } });
      if (secondaryChat) {
        secondaryChat.lastMessageText = '🎵 Voice message';
        secondaryChat.lastMessageTimestamp = timestamp;
        secondaryChat.lastMessageStatus = 'sent';
        secondaryChat.lastMessageFromMe = true;
        await this.chatRepo.save(secondaryChat);
      }
    }

    const tenantId = this.config.get('TENANT_ID', 'default-tenant');
    this.broadcast(tenantId, accountId, 'whatsapp:message_new', {
      message: savedMsg,
      chat,
    });

    return savedMsg;
  }

  // ── Send Reaction via Baileys ─────────────────────────────────────────────
  async sendReaction(accountId: string, to: string, messageId: string, emoji: string, fromMe = false) {
    let instance = this.getClient(accountId);
    if (!instance || !instance.socket || !instance.socket.user?.id) {
      throw new BadRequestException('WhatsApp account is not connected.');
    }

    const jid = await this.resolveDeliverableJid(accountId, to);
    const origMsg = await this.messageRepo.findOne({ where: { id: messageId, accountId } });
    const reactionRemoteJid = origMsg?.chatJid || jid;

    try {
      await instance.socket.sendMessage(jid, {
        react: {
          text: emoji || '', // empty string removes reaction
          key: {
            remoteJid: reactionRemoteJid,
            fromMe,
            id: messageId,
          },
        },
      });
    } catch (socketErr: any) {
      this.logger.error(`Failed to send reaction via Baileys socket: ${socketErr.message}`);
      throw new BadRequestException(`WhatsApp reaction error: ${socketErr.message || 'Socket error'}`);
    }

    // Update DB
    await this.messageRepo.update({ id: messageId, accountId }, { reaction: emoji || null }).catch(() => null);

    const tenantId = this.config.get('TENANT_ID', 'default-tenant');
    this.broadcast(tenantId, accountId, 'whatsapp:message_reaction', {
      messageId,
      chatJid: jid,
      reaction: emoji || null,
    });

    return { success: true, messageId, reaction: emoji };
  }


  // ── Send Media Message via Baileys (Images, Videos, Audio, Documents) ─────
  async sendMediaMessage(
    accountId: string,
    to: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    caption?: string,
  ) {
    let instance = this.getClient(accountId);
    if (!instance) {
      try {
        const hasSession = await this.sessionSyncManager.hasSession(accountId);
        if (hasSession) {
          const hydration = await this.sessionSyncManager.hydrateSession(accountId);
          instance = await this.createClient(accountId, hydration.authDir);
        }
      } catch (hydrateErr: any) {
        this.logger.warn(`Auto-hydration attempt failed: ${hydrateErr.message}`);
      }
    }

    if (!this.isSocketConnected(accountId) || !instance?.socket?.user?.id) {
      throw new BadRequestException(
        `WhatsApp account is not connected. Please scan the QR code to link your WhatsApp account before sending media attachments.`,
      );
    }

    const jid = await this.resolveDeliverableJid(accountId, to);

    let mediaType = 'document';
    let messagePayload: any = {};

    if (mimeType.startsWith('image/')) {
      mediaType = 'image';
      messagePayload = { image: fileBuffer, caption: caption || '' };
    } else if (mimeType.startsWith('video/')) {
      mediaType = 'video';
      messagePayload = { video: fileBuffer, caption: caption || '' };
    } else if (mimeType.startsWith('audio/')) {
      mediaType = 'audio';
      const isVoice = mimeType.includes('ogg') || mimeType.includes('opus');
      messagePayload = { audio: fileBuffer, mimetype: mimeType || 'audio/mp4', ptt: isVoice };
    } else {
      mediaType = 'document';
      messagePayload = { document: fileBuffer, fileName, mimetype: mimeType, caption: caption || '' };
    }

    // ── Pillar 1: Anti-Ban Account Warm-Up Quota Verification ──────────
    const warmupCheck = await this.accountWarmupService.canDispatch(accountId);
    if (!warmupCheck.allowed) {
      throw new BadRequestException(warmupCheck.reason);
    }

    let result: any;
    try {
      result = await instance.socket.sendMessage(jid, messagePayload);
      this.accountWarmupService.recordDispatch(accountId);
    } catch (socketErr: any) {
      this.logger.error(`Failed to send media via Baileys socket: ${socketErr.message}`);
      if (socketErr?.message?.includes('Connection Closed') || socketErr?.message?.includes('closed') || socketErr?.message?.includes('not connected')) {
        await this.accountRepo.update(accountId, { status: 'disconnected' }).catch(() => null);
        const tenantId = this.config.get('TENANT_ID', 'default-tenant');
        this.broadcast(tenantId, accountId, 'account:status', { accountId, status: 'DISCONNECTED' });
      }
      throw new BadRequestException(`WhatsApp media delivery error: ${socketErr.message || 'Socket error'}`);
    }
    const msgId = result?.key?.id || Math.random().toString(36).substring(2);
    const timestamp = Date.now();

    // Save local copy
    const mediaDir = path.resolve(process.cwd(), 'data', 'media', accountId);
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    const ext = path.extname(fileName) || (mediaType === 'image' ? '.jpg' : mediaType === 'video' ? '.mp4' : '.bin');
    const cleanMsgId = msgId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localFilename = `${cleanMsgId}${ext}`;
    await fs.promises.writeFile(path.join(mediaDir, localFilename), fileBuffer);
    const mediaUrl = `/api/v1/whatsapp/media/${accountId}/${localFilename}`;

    const savedMsg = await this.messageRepo.save({
      id: msgId,
      accountId,
      chatJid: to,
      senderJid: instance.socket.user?.id || accountId,
      fromMe: true,
      text: caption || fileName || '',
      mediaType,
      mediaUrl,
      fileName,
      mimeType,
      fileSize: fileBuffer.length,
      status: 'sent',
      timestamp,
    });

    let chat = await this.chatRepo.findOne({ where: { id: to, accountId } });
    const snippet = caption || `📎 ${fileName || mediaType}`;
    if (!chat) {
      const contact = await this.contactRepo.findOne({ where: { id: to, accountId } });
      chat = this.chatRepo.create({
        id: to,
        accountId,
        name: contact?.name || contact?.notifyName || to.split('@')[0],
        isGroup: to.endsWith('@g.us'),
        unreadCount: 0,
        lastMessageText: snippet,
        lastMessageTimestamp: timestamp,
        lastMessageStatus: 'sent',
        lastMessageFromMe: true,
      });
    } else {
      chat.lastMessageText = snippet;
      chat.lastMessageTimestamp = timestamp;
      chat.lastMessageStatus = 'sent';
      chat.lastMessageFromMe = true;
    }
    await this.chatRepo.save(chat);

    if (jid !== to) {
      const secondaryChat = await this.chatRepo.findOne({ where: { id: jid, accountId } });
      if (secondaryChat) {
        secondaryChat.lastMessageText = snippet;
        secondaryChat.lastMessageTimestamp = timestamp;
        secondaryChat.lastMessageStatus = 'sent';
        secondaryChat.lastMessageFromMe = true;
        await this.chatRepo.save(secondaryChat);
      }
    }

    const tenantId = this.config.get('TENANT_ID', 'default-tenant');
    this.broadcast(tenantId, accountId, 'whatsapp:message_new', {
      message: savedMsg,
      chat,
    });

    return savedMsg;
  }

  // ── True Socket Connection State Check ────────────────────────────────────
  isSocketConnected(accountId: string): boolean {
    const instance = this.clients.get(accountId);
    if (!instance || !instance.socket) {
      return false;
    }
    // Check if Baileys user identity is active
    if (!instance.socket.user?.id) {
      return false;
    }
    const ws = (instance.socket as any).ws;
    if (!ws) return false;
    if (ws.isClosed === true || ws.isClosing === true) return false;
    if (ws.readyState !== undefined && ws.readyState !== 1) return false;
    if (ws.socket && ws.socket.readyState !== 1) return false;
    return true;
  }

  /**
   * Returns true if a socket instance exists in the map but hasn't yet
   * completed authentication (connection.update 'open' not yet received).
   * Used to show RECONNECTING instead of DISCONNECTED during the boot window.
   */
  isSocketPending(accountId: string): boolean {
    const instance = this.clients.get(accountId);
    return !!(instance?.socket) && !instance.socket.user?.id;
  }

  // ── Universal Deliverable JID Resolver (resolves @lid, raw phones, groups) ─
  async resolveDeliverableJid(accountId: string, to: string): Promise<string> {
    let jid = to.trim();

    // If no domain was provided, format digits as standard WhatsApp user JID or LID
    if (!jid.includes('@')) {
      const digits = jid.replace(/[^0-9]/g, '');
      if (isLidIdentifier(digits) || digits.length >= 14) {
        jid = `${digits}@lid`;
      } else {
        jid = `${digits}@s.whatsapp.net`;
      }
    }

    // Detect corrupted JIDs where 14+ digit LID was mistakenly suffixed with @s.whatsapp.net
    if (jid.endsWith('@s.whatsapp.net')) {
      const userPart = jid.split('@')[0].replace(/[^0-9]/g, '');
      if (isLidIdentifier(userPart) || userPart.length >= 14) {
        jid = `${userPart}@lid`;
      }
    }

    // Groups, broadcast, newsletters pass through as-is
    if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) {
      return jid;
    }

    // If it's an LID, resolve to verified real E.164 phone number, or deliver natively to @lid
    if (jid.endsWith('@lid')) {
      const rawLid = jid.split('@')[0].replace(/[^0-9]/g, '');

      // 1. Check known LID dictionary for verified phone
      const known = KNOWN_LID_MAP[jid] || KNOWN_LID_MAP[rawLid];
      if (known?.phone) {
        const phone = known.phone.replace(/[^0-9]/g, '');
        if (phone && phone.length >= 10 && phone.length <= 13 && phone !== rawLid) {
          return `${phone}@s.whatsapp.net`;
        }
      }

      // 2. Check contact database record for this LID
      const contact = await this.contactRepo.findOne({ where: { id: jid, accountId } });
      if (contact?.phoneNumber && !contact.phoneNumber.includes('@') && !contact.phoneNumber.includes('LID')) {
        const phone = contact.phoneNumber.replace(/[^0-9]/g, '');
        if (phone && phone.length >= 10 && phone.length <= 13 && phone !== rawLid) {
          return `${phone}@s.whatsapp.net`;
        }
      }


      // 4. Check chat database record
      const chat = await this.chatRepo.findOne({ where: { id: jid, accountId } });
      if (chat?.name && /^\+?[0-9\s-]{10,13}$/.test(chat.name.trim())) {
        const phone = chat.name.replace(/[^0-9]/g, '');
        if (phone && phone.length >= 10 && phone.length <= 13 && phone !== rawLid) {
          return `${phone}@s.whatsapp.net`;
        }
      }

      // 5. Fallback for LID: Native LID delivery via Baileys Signal session!
      // NEVER convert raw 14+ digit LID to @s.whatsapp.net because WhatsApp servers will drop it!
      return `${rawLid}@lid`;
    }

    return jid;
  }

  // ── Start Fresh QR Flow (Protected by In-Memory Mutex Lock) ───────────────
  async startQR(accountId: string, force = false): Promise<{ success: boolean; alreadyConnected?: boolean }> {
    if (this.qrLocks.has(accountId)) {
      this.logger.log(`startQR already in progress for [${accountId}], returning existing promise.`);
      return this.qrLocks.get(accountId)!;
    }

    const task = (async () => {
      try {
        this.logger.log(`Requested QR pairing flow for [${accountId}] (force: ${force})`);

        const isConnected = this.isSocketConnected(accountId);
        if (isConnected && !force) {
          const existing = this.clients.get(accountId);
          const tenantId = this.config.get('TENANT_ID', 'default-tenant');
          const userPhone = existing?.socket?.user?.id?.split(':')[0]?.split('@')[0] || '';
          this.broadcast(tenantId, accountId, 'connection.update', {
            accountId,
            status: 'connected',
            phoneNumber: userPhone,
          });
          return { success: true, alreadyConnected: true };
        }

        // If not force and we already have an active QR code:
        if (!force && this.activeQRCodes.has(accountId) && this.clients.has(accountId)) {
          return {
            success: true,
            alreadyConnected: false,
            qrCodeDataUrl: this.activeQRCodes.get(accountId),
          };
        }

        // Truly disconnected or force requested — safe to wipe and restart fresh QR
        this.activeQRCodes.delete(accountId);
        this.qrRetryCounts.delete(accountId);
        await this.destroyClient(accountId);
        await this.sessionSyncManager.invalidateSession(accountId).catch(() => null);
        await this.sessionSyncManager.cleanupEphemeralSession(accountId).catch(() => null);
        const res = await this.sessionSyncManager.createEmptySession(accountId);

        // Prepare promise to capture the newly generated QR code from Baileys
        const qrPromise = new Promise<string>((resolve) => {
          const existingResolvers = this.qrResolvers.get(accountId) || [];
          existingResolvers.push(resolve);
          this.qrResolvers.set(accountId, existingResolvers);

          setTimeout(() => {
            const list = this.qrResolvers.get(accountId) || [];
            this.qrResolvers.set(accountId, list.filter(r => r !== resolve));
            resolve(this.activeQRCodes.get(accountId) || '');
          }, 15000);
        });

        await this.createClient(accountId, res.authDir);

        const qrCodeDataUrl = await qrPromise;
        return {
          success: true,
          alreadyConnected: false,
          qrCodeDataUrl: qrCodeDataUrl || this.activeQRCodes.get(accountId) || undefined,
        };
      } finally {
        this.qrLocks.delete(accountId);
      }
    })();

    this.qrLocks.set(accountId, task);
    return task;
  }

  getActiveQRCode(accountId: string): string | null {
    return this.activeQRCodes.get(accountId) || null;
  }

  // ── Broadcast with strict account isolation ───────────────────────
  broadcast(tenantId: string, accountId: string, event: string, payload: any) {
    try {
      // Always emit chat, message, and contact data strictly to the specific account room
      this.realtimeService.gateway.emitToAccount(tenantId, accountId, event, payload);

      const tenantWideEvents = [
        'whatsapp:connection_status',
        'whatsapp:qr_code',
        'account:status',
        'whatsapp:account_disconnected',
        'connection.update',
        'account:removed',
        'account:deleted',
      ];
      if (tenantWideEvents.includes(event)) {
        this.realtimeService.gateway.emitToTenant(tenantId, event, payload);
      }
    } catch {
      // Ignore emit errors during shutdown
    }
  }

  // ── Emit Real-Time Incoming Client Message Notification ───────────────────
  private async emitClientMessageNotification(
    tenantId: string,
    accountId: string,
    chatJid: string,
    chat: WhatsappChatEntity,
    savedMsg: any,
    messageSnippet: string,
    mediaType?: string,
    timestamp = Date.now(),
    isGroup = false,
  ) {
    try {
      const account = await this.accountRepo.findOne({ where: { id: accountId } });
      const access = await this.accessRepo.findOne({ where: { accountId } });
      let assignedAdminName: string | null = null;
      if (access?.userId) {
        const admin = await this.userRepo.findOne({ where: { id: access.userId } });
        assignedAdminName = admin?.displayName || admin?.username || null;
      }

      const cleanClientPhone = chatJid.includes('@') ? chatJid.split('@')[0] : chatJid;
      const clientName = chat.name || cleanClientPhone;

      const payload = {
        id: `notif_${Date.now()}_${savedMsg?.id || Math.random().toString(36).slice(2)}`,
        accountId,
        accountName: account?.displayName || account?.phoneNumber || 'WhatsApp Account',
        accountPhone: account?.phoneNumber || accountId,
        assignedAdminUserId: access?.userId || null,
        assignedAdminName,
        clientJid: chatJid,
        clientName,
        clientPhone: cleanClientPhone,
        messageText: messageSnippet,
        mediaType,
        timestamp,
        isGroup,
        groupName: isGroup ? chat.name : undefined,
      };

      this.logger.log(`🔔 [Incoming Client Message] Client [${clientName} (${cleanClientPhone})] -> Account [${payload.accountName} (${payload.accountPhone})]: "${messageSnippet.slice(0, 45)}" (Allocated Admin: ${assignedAdminName || 'Unassigned'})`);

      this.broadcast(tenantId, accountId, 'whatsapp:client_notification', payload);
      try {
        this.realtimeService.gateway.server?.emit('whatsapp:client_notification', payload);
      } catch {}
    } catch (err: any) {
      this.logger.warn(`Error emitting client notification: ${err.message}`);
    }
  }

  getClient(accountId: string): BaileysClientInstance | undefined {
    return this.clients.get(accountId);
  }

  async destroyClient(accountId: string): Promise<void> {
    if (this.reconnectTimers.has(accountId)) {
      clearTimeout(this.reconnectTimers.get(accountId)!);
      this.reconnectTimers.delete(accountId);
    }
    const instance = this.clients.get(accountId);
    if (instance) {
      try {
        instance.socket?.ev?.removeAllListeners('connection.update');
        instance.socket?.ev?.removeAllListeners('messages.upsert');
        instance.socket?.ev?.removeAllListeners('messages.update');
        instance.socket?.ev?.removeAllListeners('creds.update');
        instance.socket?.end?.(undefined);
        (instance.socket?.ws as any)?.terminate?.();
      } catch {
        // Ignore termination errors
      }
      this.clients.delete(accountId);
      this.logger.log(`Client destroyed for account [${accountId}]`);

      // ── Pillar 2: Release Distributed Socket Lease ──
      try {
        this.socketManager.unregisterStanddownHandler(accountId);
        await this.socketManager.releaseSocketLease(accountId);
      } catch (leaseErr: any) {
        this.logger.warn(`Failed to release socket lease for [${accountId}]: ${leaseErr.message}`);
      }
    }
  }

  // ── Persist New Chat (Delegated to BaileysSyncService) ──────────────────
  async saveChat(accountId: string, chatData: { id: string; name?: string; isGroup?: boolean }) {
    const tenantId = this.config.get('TENANT_ID', 'default-tenant');
    return this.syncService.saveChat(accountId, chatData, () => {
      this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
    });
  }

  // ── On-Demand Message History Sync (Delegated to BaileysSyncService) ─────
  async syncChatMessages(accountId: string, chatJid: string, count = 25): Promise<{ success: boolean; synced: number }> {
    const instance = this.getClient(accountId);
    if (!instance?.socket || !this.isSocketConnected(accountId)) {
      this.logger.warn(`Cannot sync chat messages for [${chatJid}]: socket not connected`);
      return { success: false, synced: 0 };
    }
    return this.syncService.syncChatMessages(accountId, chatJid, instance.socket, count);
  }

  // ── Pre-Logout Data Preservation Flush ───────────────────────────────────
  async preLogoutFlush(accountId: string): Promise<void> {
    this.logger.log(`🔄 [PreLogout] Executing full data flush for account [${accountId}]...`);
    try {
      // 1. Sync all contacts and chats into database
      await this.syncAllData(accountId).catch((err) => {
        this.logger.warn(`Pre-logout syncAllData warning: ${err.message}`);
      });

      // 2. Persist latest Baileys credentials and session files to SQLite
      await this.sessionSyncManager.persistSession(accountId).catch((err) => {
        this.logger.warn(`Pre-logout persistSession warning: ${err.message}`);
      });

      this.logger.log(`✅ [PreLogout] Data flush complete for account [${accountId}]`);
    } catch (err: any) {
      this.logger.error(`Error during pre-logout flush for [${accountId}]: ${err.message}`);
    }
  }

  async logoutClient(accountId: string): Promise<void> {
    await this.preLogoutFlush(accountId);
    const instance = this.clients.get(accountId);
    if (instance) {
      try {
        await instance.socket?.logout?.().catch(() => {});
      } catch {
        // Ignore logout errors
      }
      await this.destroyClient(accountId);
      this.logger.log(`Client explicitly logged out for account [${accountId}]`);
    }
  }

  getActiveClients(): string[] {
    return Array.from(this.clients.keys());
  }

  // ── Media URL Repair: Backfill DB + Re-download missing media ─────────────
  /**
   * Pass 1: For every message that has media_type but NO media_url,
   *   scan the account's media dir for a file whose name starts with the cleaned
   *   message ID. If found, write the URL back to the DB immediately.
   * Pass 2: For messages still missing a URL after pass 1,
   *   attempt a fresh downloadMediaMessage() from WhatsApp.
   * Works for every account automatically — existing and future.
  /**
   * Repair missing mediaUrl entries (Delegated to BaileysMediaPipelineService).
   */
  async repairMediaUrls(accountId: string): Promise<{ fixed: number; redownloaded: number; failed: number }> {
    return this.mediaPipelineService.repairMediaUrls(
      accountId,
      (accId) => this.clients.get(accId)?.socket,
    );
  }

  /**
   * PILLAR 6: 🧪 Chaos Monkey Abrupt Socket Drop Simulator
   * Simulates abrupt socket connection disruption (e.g. 515 restart required, 428 Precondition, or TCP RST)
   * under hostile network conditions to verify zero message loss and automatic recovery.
   */
  simulateAbruptSocketDrop(accountId: string, statusCode = 515, reason = 'Stream error (Chaos Monkey)'): boolean {
    const instance = this.clients.get(accountId);
    if (!instance?.socket) {
      this.logger.warn(`[ChaosMonkey] Cannot simulate socket drop for [${accountId}]: client not found`);
      return false;
    }

    this.logger.warn(`🐒 [ChaosMonkey] Injected hostile socket drop for [${accountId}] (Code: ${statusCode}, Reason: ${reason})`);

    try {
      // 1. Terminate underlying WebSocket if active
      const ws = (instance.socket as any).ws;
      if (ws) {
        if (typeof ws.terminate === 'function') {
          ws.terminate();
        } else if (typeof ws.close === 'function') {
          ws.close(statusCode, reason);
        }
      }

      // 2. Emit connection.update with disconnection state to trigger reconnection pipeline
      const error = new Boom(reason, { statusCode });
      instance.socket.ev.emit('connection.update', {
        connection: 'close',
        lastDisconnect: {
          error,
          date: new Date(),
        },
      });

      return true;
    } catch (err: any) {
      this.logger.error(`[ChaosMonkey] Error during socket drop simulation: ${err.message}`);
      return false;
    }
  }

  /**
   * Helper to register a mock/synthetic client instance for testing harnesses
   */
  registerMockClient(accountId: string, mockInstance: Partial<BaileysClientInstance>): void {
    this.clients.set(accountId, mockInstance as BaileysClientInstance);
  }
}

