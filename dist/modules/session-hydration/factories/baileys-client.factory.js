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
var BaileysClientFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaileysClientFactory = void 0;
exports.unwrapMessage = unwrapMessage;
exports.extractProtocolMessage = extractProtocolMessage;
exports.extractDirectEditedContent = extractDirectEditedContent;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const baileys_1 = require("baileys");
const fs = require("fs");
const path = require("path");
const boom_1 = require("@hapi/boom");
const QRCode = require("qrcode");
const proxy_binding_service_1 = require("../../proxy-binding/services/proxy-binding.service");
const session_sync_manager_1 = require("../services/session-sync.manager");
const baileys_media_pipeline_service_1 = require("../services/baileys-media-pipeline.service");
const baileys_sync_service_1 = require("../services/baileys-sync.service");
const behavioral_typing_service_1 = require("../services/behavioral-typing.service");
const account_warmup_service_1 = require("../services/account-warmup.service");
const distributed_socket_manager_service_1 = require("../services/distributed-socket-manager.service");
const realtime_event_service_1 = require("../../realtime-gateway/services/realtime-event.service");
const telemetry_service_1 = require("../../telemetry/services/telemetry.service");
const whatsapp_account_entity_1 = require("../entities/whatsapp-account.entity");
const whatsapp_chat_entity_1 = require("../entities/whatsapp-chat.entity");
const whatsapp_contact_entity_1 = require("../entities/whatsapp-contact.entity");
const whatsapp_message_entity_1 = require("../entities/whatsapp-message.entity");
const user_account_access_entity_1 = require("../../auth/entities/user-account-access.entity");
const app_user_entity_1 = require("../../auth/entities/app-user.entity");
const pino_1 = require("pino");
const contact_resolver_util_1 = require("../../accounts/utils/contact-resolver.util");
function unwrapMessage(msg) {
    if (!msg)
        return null;
    let content = msg;
    let depth = 0;
    while (depth < 10) {
        if (content?.ephemeralMessage?.message) {
            content = content.ephemeralMessage.message;
        }
        else if (content?.viewOnceMessage?.message) {
            content = content.viewOnceMessage.message;
        }
        else if (content?.viewOnceMessageV2?.message) {
            content = content.viewOnceMessageV2.message;
        }
        else if (content?.documentWithCaptionMessage?.message) {
            content = content.documentWithCaptionMessage.message;
        }
        else if (content?.editedMessage?.message?.protocolMessage?.editedMessage) {
            content = content.editedMessage.message.protocolMessage.editedMessage;
        }
        else if (content?.editedMessage?.message) {
            content = content.editedMessage.message;
        }
        else if (content?.protocolMessage?.editedMessage) {
            content = content.protocolMessage.editedMessage;
        }
        else {
            break;
        }
        depth++;
    }
    return content;
}
function extractProtocolMessage(msg) {
    if (!msg || typeof msg !== 'object')
        return null;
    if (msg.protocolMessage)
        return msg.protocolMessage;
    if (msg.message?.protocolMessage)
        return msg.message.protocolMessage;
    if (msg.editedMessage?.message?.protocolMessage)
        return msg.editedMessage.message.protocolMessage;
    if (msg.deviceSentMessage?.message?.protocolMessage)
        return msg.deviceSentMessage.message.protocolMessage;
    if (msg.ephemeralMessage?.message?.protocolMessage)
        return msg.ephemeralMessage.message.protocolMessage;
    if (msg.viewOnceMessage?.message?.protocolMessage)
        return msg.viewOnceMessage.message.protocolMessage;
    if (msg.viewOnceMessageV2?.message?.protocolMessage)
        return msg.viewOnceMessageV2.message.protocolMessage;
    if (msg.documentWithCaptionMessage?.message?.protocolMessage)
        return msg.documentWithCaptionMessage.message.protocolMessage;
    return null;
}
function extractDirectEditedContent(msg) {
    if (!msg || typeof msg !== 'object')
        return null;
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
function extractMessageText(rawMessage) {
    if (!rawMessage)
        return '';
    const message = unwrapMessage(rawMessage);
    if (!message)
        return '';
    if (message.conversation)
        return message.conversation;
    if (message.extendedTextMessage?.text)
        return message.extendedTextMessage.text;
    if (message.imageMessage?.caption)
        return message.imageMessage.caption || '📷 Photo';
    if (message.videoMessage?.caption)
        return message.videoMessage.caption || '🎥 Video';
    if (message.documentMessage?.title || message.documentMessage?.fileName) {
        return message.documentMessage.title || message.documentMessage.fileName || '📎 Document';
    }
    if (message.audioMessage) {
        return message.audioMessage.ptt ? '🎤 Voice message' : '🎵 Audio message';
    }
    if (message.ptvMessage)
        return '🎤 Voice message';
    if (message.stickerMessage)
        return '🎨 Sticker';
    if (message.contactMessage?.displayName)
        return `👤 Contact: ${message.contactMessage.displayName}`;
    if (message.locationMessage)
        return '📍 Location';
    if (message.liveLocationMessage)
        return '📍 Live location';
    if (message.pollCreationMessage?.name)
        return `📊 Poll: ${message.pollCreationMessage.name}`;
    if (message.pollCreationMessageV3?.name)
        return `📊 Poll: ${message.pollCreationMessageV3.name}`;
    if (message.interactiveMessage) {
        const body = message.interactiveMessage.body?.text || message.interactiveMessage.header?.text || '';
        return body || '📋 Interactive message';
    }
    if (message.buttonsMessage?.contentText)
        return message.buttonsMessage.contentText;
    if (message.listMessage?.description)
        return message.listMessage.description;
    if (message.templateMessage) {
        const hydrated = message.templateMessage.hydratedTemplate;
        return hydrated?.hydratedContentText || hydrated?.hydratedTitleText || '📝 Template message';
    }
    return '';
}
let BaileysClientFactory = BaileysClientFactory_1 = class BaileysClientFactory {
    constructor(accountRepo, chatRepo, contactRepo, messageRepo, accessRepo, userRepo, proxyBindingService, sessionSyncManager, mediaPipelineService, syncService, config, realtimeService, eventEmitter, behavioralTypingService, accountWarmupService, socketManager, telemetryService) {
        this.accountRepo = accountRepo;
        this.chatRepo = chatRepo;
        this.contactRepo = contactRepo;
        this.messageRepo = messageRepo;
        this.accessRepo = accessRepo;
        this.userRepo = userRepo;
        this.proxyBindingService = proxyBindingService;
        this.sessionSyncManager = sessionSyncManager;
        this.mediaPipelineService = mediaPipelineService;
        this.syncService = syncService;
        this.config = config;
        this.realtimeService = realtimeService;
        this.eventEmitter = eventEmitter;
        this.behavioralTypingService = behavioralTypingService;
        this.accountWarmupService = accountWarmupService;
        this.socketManager = socketManager;
        this.telemetryService = telemetryService;
        this.logger = new common_1.Logger(BaileysClientFactory_1.name);
        this.clients = new Map();
        this.clientCreationLocks = new Map();
        this.qrLocks = new Map();
        this.activeQRCodes = new Map();
        this.qrResolvers = new Map();
        this.reconnectTimers = new Map();
        this.qrRetryCounts = new Map();
    }
    sanitizeIncomingContact(c, accountId, accountPhone = '') {
        if (!c || !c.id)
            return null;
        let cleanId = (c.id || '').trim();
        const isLid = (0, contact_resolver_util_1.isLidIdentifier)(cleanId);
        if (isLid && cleanId.startsWith('+')) {
            cleanId = cleanId.slice(1);
        }
        const rawId = cleanId.split('@')[0].replace(/\+/g, '');
        const isGroup = (0, contact_resolver_util_1.isGroupJid)(cleanId);
        if (!accountPhone) {
            const client = this.getClient(accountId);
            accountPhone = client?.socket?.user?.id?.split(':')[0]?.split('@')[0] || '';
        }
        const resolved = (0, contact_resolver_util_1.resolveContactInfo)(cleanId, c.name || c.verifiedName, null, c.notify, isGroup, accountPhone);
        const hasRealName = (c.name && (0, contact_resolver_util_1.isProperName)(c.name)) ||
            (c.notify && (0, contact_resolver_util_1.isProperName)(c.notify)) ||
            (resolved.name && (0, contact_resolver_util_1.isProperName)(resolved.name));
        const hasRealPhone = resolved.phoneNumber && resolved.phoneNumber.startsWith('+') && !resolved.phoneNumber.includes('N/A') && !(0, contact_resolver_util_1.isLidIdentifier)(resolved.phoneNumber);
        if (isLid && !hasRealName && !hasRealPhone) {
            return null;
        }
        let resolvedPhone = resolved.phoneNumber;
        if (resolvedPhone === 'N/A (LID)' || (0, contact_resolver_util_1.isLidIdentifier)(resolvedPhone)) {
            resolvedPhone = '';
        }
        const finalContactName = hasRealName
            ? ((0, contact_resolver_util_1.isProperName)(c.name) ? c.name.trim() : ((0, contact_resolver_util_1.isProperName)(c.notify) ? c.notify.trim() : resolved.name))
            : '';
        return {
            id: cleanId,
            accountId,
            phoneNumber: resolved.isGroup ? 'Group Chat' : (resolvedPhone || (isLid ? '' : (rawId.length >= 7 ? ((0, contact_resolver_util_1.formatE164Phone)(rawId) || `+${rawId}`) : ''))),
            name: finalContactName,
            notifyName: (0, contact_resolver_util_1.isProperName)(c.notify) ? c.notify.trim() : '',
        };
    }
    async unpackArchiveIfNeeded(authDir) {
        try {
            const credsPath = path.join(authDir, 'creds.json');
            if (!fs.existsSync(credsPath))
                return;
            const credsRaw = fs.readFileSync(credsPath, 'utf8');
            if (!credsRaw)
                return;
            const parsed = JSON.parse(credsRaw);
            if (parsed?.__isArchive && parsed.files) {
                this.logger.log(`📦 Found archived session wrapper in creds.json at [${authDir}], unpacking individual auth files...`);
                for (const [filename, content] of Object.entries(parsed.files)) {
                    fs.writeFileSync(path.join(authDir, filename), content, { mode: 0o600 });
                }
                this.logger.log(`✅ Successfully unpacked ${Object.keys(parsed.files).length} session files into [${authDir}]`);
            }
        }
        catch (err) {
            this.logger.warn(`Could not check/unpack session archive in [${authDir}]: ${err.message}`);
        }
    }
    async createClient(accountId, authDir) {
        if (this.clientCreationLocks.has(accountId)) {
            this.logger.log(`createClient already in progress for [${accountId}], awaiting active initialization...`);
            return this.clientCreationLocks.get(accountId);
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
                const leaseAcquired = await this.socketManager.acquireSocketLease(accountId);
                if (!leaseAcquired) {
                    const currentLeader = await this.socketManager.getCurrentLeaseOwner(accountId);
                    this.logger.warn(`⚠️ [Cluster] Socket lease for [${accountId}] held by leader [${currentLeader}]. Node [${this.socketManager.getInstanceId()}] is in standby.`);
                    throw new common_1.BadRequestException(`Account ${accountId} is currently active on replica ${currentLeader}. Active-Active cluster prevented concurrent socket collision.`);
                }
                this.socketManager.registerStanddownHandler(accountId, async () => {
                    this.logger.warn(`🚨 [Cluster] Lost socket lease for [${accountId}]. Standing down local connection.`);
                    await this.destroyClient(accountId);
                });
                await this.unpackArchiveIfNeeded(authDir);
                const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(authDir);
                let agentBundle = null;
                try {
                    agentBundle = await this.proxyBindingService.buildAgentBundle(accountId);
                    this.logger.log(`Creating Baileys client for [${accountId}] via ${agentBundle.protocol.toUpperCase()} proxy`);
                }
                catch (err) {
                    this.logger.warn(`No proxy available for [${accountId}]. Direct connection: ${err.message}`);
                }
                let hasCredsOnDiskInitial = false;
                try {
                    const credsFile = path.join(authDir, 'creds.json');
                    if (fs.existsSync(credsFile)) {
                        const parsed = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
                        if (parsed?.registered === true && parsed?.me?.id) {
                            hasCredsOnDiskInitial = true;
                        }
                    }
                }
                catch { }
                const isRegisteredInitial = !!((state.creds?.registered === true && state.creds?.me?.id) ||
                    hasCredsOnDiskInitial);
                const socket = (0, baileys_1.default)({
                    auth: state,
                    printQRInTerminal: false,
                    browser: baileys_1.Browsers.ubuntu('Chrome'),
                    syncFullHistory: isRegisteredInitial,
                    shouldSyncHistoryMessage: () => true,
                    defaultQueryTimeoutMs: 60000,
                    connectTimeoutMs: 60000,
                    keepAliveIntervalMs: 25000,
                    markOnlineOnConnect: false,
                    ...(agentBundle ? { fetchAgent: agentBundle.httpsAgent } : {}),
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
                    logger: (0, pino_1.default)({ level: this.config.get('BAILEYS_LOG_LEVEL', 'silent') }),
                });
                const tenantId = this.config.get('TENANT_ID', 'default-tenant');
                socket.ev.on('creds.update', async () => {
                    try {
                        await saveCreds();
                        await this.sessionSyncManager.persistSession(accountId);
                    }
                    catch (err) {
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
                            const resolvers = this.qrResolvers.get(accountId) || [];
                            this.qrResolvers.delete(accountId);
                            for (const resolve of resolvers) {
                                try {
                                    resolve(qrCodeDataUrl);
                                }
                                catch { }
                            }
                            this.realtimeService.emitQRCode(tenantId, accountId, qrCodeDataUrl);
                            this.broadcast(tenantId, accountId, 'connection.update', {
                                accountId,
                                status: 'qr',
                                qrCodeDataUrl,
                            });
                        }
                        catch (err) {
                            this.logger.error(`Failed to generate QR code for ${accountId}: ${err.message}`);
                        }
                    }
                    if (connection === 'close') {
                        const reason = lastDisconnect?.error?.output?.statusCode;
                        const isLoggedOut = reason === baileys_1.DisconnectReason.loggedOut || reason === 401 || reason === 403;
                        const isRestartRequired = reason === baileys_1.DisconnectReason.restartRequired || reason === 515;
                        let hasCredsOnDisk = false;
                        try {
                            const credsFile = path.join(authDir, 'creds.json');
                            if (fs.existsSync(credsFile)) {
                                const parsed = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
                                if (parsed?.registered === true && parsed?.me?.id) {
                                    hasCredsOnDisk = true;
                                }
                            }
                        }
                        catch { }
                        const isRegistered = !!((state.creds?.registered === true && state.creds?.me?.id) ||
                            socket?.user?.id ||
                            hasCredsOnDisk);
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
                                clearTimeout(this.reconnectTimers.get(accountId));
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
                                clearTimeout(this.reconnectTimers.get(accountId));
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
                                clearTimeout(this.reconnectTimers.get(accountId));
                                this.reconnectTimers.delete(accountId);
                            }
                            await this.destroyClient(accountId);
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
                            const hasPendingResolvers = (this.qrResolvers.get(accountId)?.length || 0) > 0 || !this.activeQRCodes.has(accountId);
                            const retryCount = this.qrRetryCounts.get(accountId) || 0;
                            if (hasPendingResolvers && retryCount < 5 && (reason === 428 || reason === 503 || reason === 500 || reason === 408)) {
                                this.qrRetryCounts.set(accountId, retryCount + 1);
                                this.logger.log(`⏳ Transient socket closure (reason: ${reason}) while awaiting QR pairing for [${accountId}]. Retrying socket in 800ms (attempt ${retryCount + 1}/5)...`);
                                if (this.reconnectTimers.has(accountId)) {
                                    clearTimeout(this.reconnectTimers.get(accountId));
                                    this.reconnectTimers.delete(accountId);
                                }
                                const timer = setTimeout(() => {
                                    this.reconnectTimers.delete(accountId);
                                    this.createClient(accountId, authDir);
                                }, 800);
                                this.reconnectTimers.set(accountId, timer);
                                return;
                            }
                            this.logger.log(`Connection closed while awaiting QR pairing for [${accountId}] (reason: ${reason}). Waiting for user action or fresh QR...`);
                            this.qrRetryCounts.delete(accountId);
                            if (this.reconnectTimers.has(accountId)) {
                                clearTimeout(this.reconnectTimers.get(accountId));
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
                            return;
                        }
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
                        await this.accountRepo.update(accountId, { status: 'active' }).catch(() => null);
                        if (this.reconnectTimers.has(accountId)) {
                            clearTimeout(this.reconnectTimers.get(accountId));
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
                            clearTimeout(this.reconnectTimers.get(accountId));
                            this.reconnectTimers.delete(accountId);
                        }
                        this.activeQRCodes.delete(accountId);
                        const resolvers = this.qrResolvers.get(accountId) || [];
                        this.qrResolvers.delete(accountId);
                        for (const resolve of resolvers) {
                            try {
                                resolve('');
                            }
                            catch { }
                        }
                        this.logger.log(`✅ WhatsApp connected for account [${accountId}]`);
                        const userPhone = socket.user?.id?.split(':')[0]?.split('@')[0] || '';
                        const userName = socket.user?.name || socket.user?.notify || undefined;
                        if (userPhone) {
                            try {
                                const conflictingAccount = await this.accountRepo.findOne({ where: { phoneNumber: userPhone } });
                                if (conflictingAccount && conflictingAccount.id !== accountId) {
                                    this.logger.warn(`Phone [${userPhone}] was previously associated with account [${conflictingAccount.id}]. Disassociating old account.`);
                                    await this.accountRepo.update(conflictingAccount.id, {
                                        phoneNumber: `unlinked_${Date.now()}_${userPhone.slice(-4)}`,
                                        status: 'disconnected',
                                    });
                                }
                            }
                            catch (collisionErr) {
                                this.logger.warn(`Phone collision check error: ${collisionErr.message}`);
                            }
                        }
                        let currentAccount = null;
                        try {
                            currentAccount = await this.accountRepo.findOne({ where: { id: accountId } });
                        }
                        catch { }
                        const existingDisplayName = currentAccount?.displayName?.trim();
                        const hasCustomName = !!(existingDisplayName &&
                            existingDisplayName !== 'WhatsApp Account' &&
                            existingDisplayName !== 'Default Account' &&
                            !existingDisplayName.startsWith('pending_') &&
                            !existingDisplayName.startsWith('unlinked_'));
                        const effectiveDisplayName = hasCustomName
                            ? existingDisplayName
                            : (userName || existingDisplayName || 'WhatsApp Account');
                        const userLid = socket.user?.lid?.split(':')[0]?.split('@')[0] || '';
                        if (userLid && effectiveDisplayName) {
                            contact_resolver_util_1.KNOWN_LID_MAP[userLid] = { name: effectiveDisplayName, phone: (0, contact_resolver_util_1.formatE164Phone)(userPhone) };
                            contact_resolver_util_1.UNIVERSAL_IDENTITY_REGISTRY.set(userLid, { name: effectiveDisplayName, phone: (0, contact_resolver_util_1.formatE164Phone)(userPhone) });
                        }
                        if (userPhone && effectiveDisplayName) {
                            contact_resolver_util_1.KNOWN_PHONE_CONTACTS[userPhone] = effectiveDisplayName;
                            contact_resolver_util_1.UNIVERSAL_IDENTITY_REGISTRY.set(userPhone, { name: effectiveDisplayName, phone: (0, contact_resolver_util_1.formatE164Phone)(userPhone) });
                        }
                        try {
                            await this.accountRepo.update(accountId, {
                                status: 'active',
                                ...(userPhone ? { phoneNumber: userPhone } : {}),
                                ...(!hasCustomName && userName ? { displayName: userName } : {}),
                            });
                        }
                        catch (updateErr) {
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
                        try {
                            this.eventEmitter.emit('account.connected', {
                                accountId,
                                phoneNumber: userPhone,
                                accountName: effectiveDisplayName,
                            });
                        }
                        catch { }
                        this.broadcast(tenantId, accountId, 'whatsapp:syncing', {
                            accountId,
                            message: 'Fetching all your chats, contacts, and history...',
                        });
                        this.syncGroupsAndContacts(accountId, socket).catch((e) => {
                            this.logger.warn(`Initial group sync error: ${e.message}`);
                        });
                        setTimeout(() => {
                            this.syncAllData(accountId).catch((e) => {
                                this.logger.warn(`Auto syncAllData error: ${e.message}`);
                            });
                        }, 3000);
                    }
                });
                socket.ev.on('messaging-history.set', async ({ chats, contacts, messages }) => {
                    const totalChats = chats?.length || 0;
                    const totalContacts = contacts?.length || 0;
                    const totalMessages = messages?.length || 0;
                    this.logger.log(`📥 History sync for [${accountId}]: ${totalChats} chats, ${totalContacts} contacts, ${totalMessages} messages`);
                    this.broadcast(tenantId, accountId, 'whatsapp:sync_progress', {
                        accountId,
                        stage: 'contacts',
                        total: totalContacts,
                        chatsTotal: totalChats,
                        messagesTotal: totalMessages,
                    });
                    if (contacts?.length) {
                        const sanitizedList = contacts
                            .map(c => this.sanitizeIncomingContact(c, accountId))
                            .filter((c) => c !== null);
                        for (let i = 0; i < sanitizedList.length; i += 100) {
                            const chunk = sanitizedList.slice(i, i + 100);
                            await this.contactRepo.save(chunk).catch(() => null);
                        }
                    }
                    if (chats?.length) {
                        const chatEntities = [];
                        for (const chat of chats) {
                            if (!chat.id || chat.id === 'status@broadcast')
                                continue;
                            const isGroup = chat.id.endsWith('@g.us');
                            const rawId = chat.id.split('@')[0];
                            let chatName = (chat.name && (0, contact_resolver_util_1.isProperName)(chat.name)) ? chat.name : null;
                            if (!chatName) {
                                chatName = (0, contact_resolver_util_1.resolveContactInfo)(chat.id, null, null, null, isGroup).name;
                            }
                            chatEntities.push({
                                id: chat.id,
                                accountId,
                                name: chatName || (0, contact_resolver_util_1.resolveContactInfo)(chat.id, null, null, null, isGroup).name,
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
                    this.syncGroupsAndContacts(accountId, socket).catch(() => null);
                    this.broadcast(tenantId, accountId, 'whatsapp:history_synced', {
                        accountId,
                        chatsCount: totalChats,
                        contactsCount: totalContacts,
                        messagesCount: totalMessages,
                    });
                    this.broadcast(tenantId, accountId, 'whatsapp:ready', {
                        accountId,
                        chatsCount: totalChats,
                        contactsCount: totalContacts,
                        messagesCount: totalMessages,
                    });
                    this.broadcast(tenantId, accountId, 'whatsapp:messages_synced', {
                        accountId,
                        messagesCount: totalMessages,
                    });
                });
                socket.ev.on('contacts.upsert', async (contacts) => {
                    const sanitizedList = [];
                    for (const c of contacts) {
                        if (!c.id)
                            continue;
                        if (c.name && (0, contact_resolver_util_1.isProperName)(c.name)) {
                            (0, contact_resolver_util_1.registerUniversalContact)(c.id, c.name);
                            if (c.lid)
                                (0, contact_resolver_util_1.registerUniversalContact)(c.lid, c.name);
                        }
                        const sanitized = this.sanitizeIncomingContact(c, accountId);
                        if (sanitized)
                            sanitizedList.push(sanitized);
                    }
                    for (let i = 0; i < sanitizedList.length; i += 100) {
                        const chunk = sanitizedList.slice(i, i + 100);
                        await this.contactRepo.save(chunk).catch(() => null);
                    }
                    this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });
                });
                socket.ev.on('contacts.update', async (updates) => {
                    for (const u of updates) {
                        if (!u.id)
                            continue;
                        if (u.name && (0, contact_resolver_util_1.isProperName)(u.name)) {
                            (0, contact_resolver_util_1.registerUniversalContact)(u.id, u.name);
                            if (u.lid)
                                (0, contact_resolver_util_1.registerUniversalContact)(u.lid, u.name);
                        }
                        else if (u.notify && (0, contact_resolver_util_1.isProperName)(u.notify)) {
                            (0, contact_resolver_util_1.registerUniversalContact)(u.id, u.notify);
                            if (u.lid)
                                (0, contact_resolver_util_1.registerUniversalContact)(u.lid, u.notify);
                        }
                        const sanitized = this.sanitizeIncomingContact(u, accountId);
                        if (sanitized) {
                            const existing = await this.contactRepo.findOne({ where: { id: u.id, accountId } });
                            if (existing) {
                                if (sanitized.name)
                                    existing.name = sanitized.name;
                                if (sanitized.notifyName)
                                    existing.notifyName = sanitized.notifyName;
                                if (sanitized.phoneNumber)
                                    existing.phoneNumber = sanitized.phoneNumber;
                                await this.contactRepo.save(existing).catch(() => null);
                            }
                            else {
                                await this.contactRepo.save(sanitized).catch(() => null);
                            }
                        }
                    }
                    this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });
                });
                socket.ev.on('chats.upsert', async (chats) => {
                    for (const chat of chats) {
                        if (!chat.id || chat.id === 'status@broadcast')
                            continue;
                        const isGroup = chat.id.endsWith('@g.us');
                        const existing = await this.chatRepo.findOne({ where: { id: chat.id, accountId } });
                        const candidateRaw = (existing?.name && (0, contact_resolver_util_1.isProperName)(existing.name))
                            ? existing.name
                            : (chat.name && (0, contact_resolver_util_1.isProperName)(chat.name))
                                ? chat.name
                                : null;
                        let chatName = candidateRaw;
                        if (!chatName) {
                            if (isGroup) {
                                const suffix = chat.id.split('@')[0].slice(-4);
                                chatName = suffix ? `Group (${suffix})` : 'Group Chat';
                            }
                            else {
                                const isLid = (0, contact_resolver_util_1.isLidIdentifier)(chat.id);
                                const cleanDigits = chat.id.split('@')[0].replace(/\D/g, '');
                                if (!isLid && cleanDigits.length >= 7) {
                                    chatName = (0, contact_resolver_util_1.formatE164Phone)(cleanDigits) || `+${cleanDigits}`;
                                }
                                else if (isLid) {
                                    const reg = contact_resolver_util_1.KNOWN_LID_MAP[cleanDigits] || contact_resolver_util_1.UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
                                    chatName = reg?.name || reg?.phone || '';
                                }
                                else {
                                    chatName = chat.id.split('@')[0];
                                }
                            }
                        }
                        if (isGroup && (!existing?.name || !(0, contact_resolver_util_1.isProperName)(existing.name))) {
                            socket.groupMetadata(chat.id).then((meta) => {
                                if (meta?.subject && (0, contact_resolver_util_1.isProperName)(meta.subject)) {
                                    this.chatRepo.update({ id: chat.id, accountId }, { name: meta.subject, subtitle: meta.desc || undefined });
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
                socket.ev.on('groups.upsert', async (groups) => {
                    for (const g of groups) {
                        if (!g.id)
                            continue;
                        let existing = await this.chatRepo.findOne({ where: { id: g.id, accountId } });
                        const properSubject = (g.subject && (0, contact_resolver_util_1.isProperName)(g.subject)) ? g.subject : null;
                        const fallbackName = g.id.split('@')[0].slice(-4) ? `Group (${g.id.split('@')[0].slice(-4)})` : 'Group Chat';
                        const name = properSubject || (existing?.name && (0, contact_resolver_util_1.isProperName)(existing.name) ? existing.name : fallbackName);
                        const subtitle = g.desc || undefined;
                        if (existing) {
                            existing.name = name;
                            if (subtitle)
                                existing.subtitle = subtitle;
                            existing.isGroup = true;
                            await this.chatRepo.save(existing).catch(() => null);
                        }
                        else {
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
                        if (!u.id)
                            continue;
                        const existing = await this.chatRepo.findOne({ where: { id: u.id, accountId } });
                        if (existing) {
                            if (u.subject && (0, contact_resolver_util_1.isProperName)(u.subject))
                                existing.name = u.subject;
                            if (u.desc !== undefined)
                                existing.subtitle = u.desc;
                            await this.chatRepo.save(existing).catch(() => null);
                        }
                    }
                    this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
                });
                socket.ev.on('messages.upsert', async ({ messages }) => {
                    for (const msg of messages) {
                        const saved = await this.processMessage(accountId, msg, true).catch((err) => {
                            this.logger.error(`Error processing message: ${err.message}`);
                            return null;
                        });
                        if (saved) {
                            if (!saved.fromMe) {
                                this.eventEmitter.emit('auto-reply.check', { accountId, message: saved });
                                this.eventEmitter.emit('chatbot.incoming', { accountId, message: saved });
                            }
                            else {
                                this.eventEmitter.emit('whatsapp.message.sent', { accountId, chatJid: saved.chatJid });
                            }
                        }
                    }
                });
                socket.ev.on('messages.update', async (updates) => {
                    for (const u of updates) {
                        const keyId = u.key?.id;
                        if (!keyId)
                            continue;
                        const targetChatJid = u.key?.remoteJid || '';
                        const updateMsg = u.update?.message;
                        if (updateMsg) {
                            const directEdit = extractDirectEditedContent(updateMsg);
                            const targetId = directEdit?.targetId || keyId;
                            const editedContent = directEdit?.content || updateMsg.editedMessage?.message || updateMsg;
                            const newText = extractMessageText(editedContent) || extractMessageText(updateMsg);
                            if (newText) {
                                await this.handleEditedMessage(accountId, targetId, targetChatJid, editedContent, typeof u.update?.messageTimestamp === 'number' ? u.update.messageTimestamp * 1000 : Date.now());
                            }
                        }
                        if (u.update?.status !== undefined) {
                            const statusStr = u.update.status === 4 ? 'read' : u.update.status === 3 ? 'delivered' : 'sent';
                            await this.messageRepo.update({ id: keyId, accountId }, { status: statusStr }).catch(() => null);
                            this.broadcast(tenantId, accountId, 'whatsapp:message_status', {
                                messageId: keyId,
                                status: statusStr,
                            });
                        }
                    }
                });
                socket.ev.on('messages.reaction', async (reactions) => {
                    try {
                        for (const item of reactions) {
                            const keyId = item.key?.id;
                            const reactionText = item.reaction?.text || null;
                            if (!keyId)
                                continue;
                            await this.messageRepo.update({ id: keyId, accountId }, { reaction: reactionText }).catch(() => null);
                            this.broadcast(tenantId, accountId, 'whatsapp:message_reaction', {
                                messageId: keyId,
                                chatJid: item.key?.remoteJid,
                                reaction: reactionText,
                            });
                            this.logger.log(`❤️ Reaction [${reactionText || 'removed'}] on message [${keyId}]`);
                        }
                    }
                    catch (err) {
                        this.logger.warn(`Error handling messages.reaction: ${err.message}`);
                    }
                });
                socket.ev.on('messages.delete', async (item) => {
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
                    }
                    catch (err) {
                        this.logger.warn(`Error handling messages.delete: ${err.message}`);
                    }
                });
                const instance = {
                    accountId,
                    socket,
                    authDir,
                    createdAt: new Date(),
                };
                this.clients.set(accountId, instance);
                return instance;
            }
            finally {
                this.clientCreationLocks.delete(accountId);
            }
        })();
        this.clientCreationLocks.set(accountId, creationTask);
        return creationTask;
    }
    async syncGroupsAndContacts(accountId, socketInstance) {
        const socket = socketInstance || this.clients.get(accountId)?.socket;
        if (!socket)
            return;
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
            }
            catch { }
            const participantContactsMap = new Map();
            for (const [groupId, groupMeta] of groupEntries) {
                let chat = await this.chatRepo.findOne({ where: { id: groupId, accountId } });
                const candidateSubject = groupMeta?.subject;
                const name = (candidateSubject && (0, contact_resolver_util_1.isProperName)(candidateSubject))
                    ? candidateSubject
                    : (chat?.name && (0, contact_resolver_util_1.isProperName)(chat.name))
                        ? chat.name
                        : (0, contact_resolver_util_1.resolveContactInfo)(groupId, candidateSubject, null, null, true).name;
                const subtitle = groupMeta?.desc || undefined;
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
                    const normalizedId = p.id.replace(/:\d+@/, '@');
                    const rawDigits = normalizedId.split('@')[0].replace(/\D/g, '');
                    if (accountPhone && rawDigits === accountPhone)
                        continue;
                    const hasRealName = (p.name && (0, contact_resolver_util_1.isProperName)(p.name)) || (p.notify && (0, contact_resolver_util_1.isProperName)(p.notify));
                    if (!hasRealName)
                        continue;
                    const sanitized = this.sanitizeIncomingContact({ id: normalizedId, name: p.name, notify: p.notify }, accountId, accountPhone);
                    if (sanitized && sanitized.id && sanitized.name) {
                        const existingInMap = participantContactsMap.get(sanitized.id);
                        if (!existingInMap || (!existingInMap.name && sanitized.name)) {
                            participantContactsMap.set(sanitized.id, sanitized);
                        }
                    }
                }
            }
            if (participantContactsMap.size > 0) {
                const contactsList = Array.from(participantContactsMap.values());
                this.logger.log(`[Sync] Saving ${contactsList.length} unique contacts discovered from groups for [${accountId}]...`);
                for (let i = 0; i < contactsList.length; i += 100) {
                    const chunk = contactsList.slice(i, i + 100);
                    await this.contactRepo.save(chunk).catch(() => null);
                }
            }
            try {
                if (typeof socket.resyncAppState === 'function') {
                    socket.resyncAppState(['critical_unblock_low', 'critical_block', 'regular_high', 'regular_low', 'regular'], true).catch(() => {
                        socket.resyncAppState(['critical_unblock_low', 'critical_block', 'regular_high', 'regular_low', 'regular'], false).catch((e) => this.logger.warn(`resyncAppState notice: ${e.message}`));
                    });
                }
            }
            catch { }
            const tenantId = this.config.get('TENANT_ID', 'default-tenant');
            this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
            this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });
        }
        catch (err) {
            this.logger.error(`[Sync] Failed to sync groups: ${err.message}`);
        }
    }
    async syncAllData(accountId) {
        let instance = this.getClient(accountId);
        if (!instance) {
            try {
                const hasSession = await this.sessionSyncManager.hasSession(accountId);
                if (hasSession) {
                    const hydration = await this.sessionSyncManager.hydrateSession(accountId);
                    instance = await this.createClient(accountId, hydration.authDir);
                }
            }
            catch (err) {
                this.logger.warn(`Could not hydrate for full sync: ${err.message}`);
            }
        }
        if (instance?.socket) {
            await this.syncGroupsAndContacts(accountId, instance.socket);
        }
        const recentMessages = await this.messageRepo
            .createQueryBuilder('msg')
            .where('msg.accountId = :accountId', { accountId })
            .orderBy('msg.timestamp', 'DESC')
            .take(300)
            .getMany();
        const existingChatsList = await this.chatRepo.find({ where: { accountId } });
        const chatMap = new Map(existingChatsList.map(c => [c.id, c]));
        for (const msg of recentMessages) {
            if (!msg.chatJid || msg.chatJid === 'status@broadcast')
                continue;
            const existingChat = chatMap.get(msg.chatJid);
            const snippet = msg.text || (msg.mediaType === 'image' ? '📷 Photo' :
                msg.mediaType === 'video' ? '🎥 Video' :
                    msg.mediaType === 'audio' ? '🎵 Voice message' :
                        msg.mediaType === 'document' ? '📎 Document' :
                            msg.mediaType === 'sticker' ? '🎨 Sticker' : '');
            if (!existingChat) {
                const isGrp = msg.chatJid.endsWith('@g.us');
                const isLid = (0, contact_resolver_util_1.isLidIdentifier)(msg.chatJid);
                const resolved = (0, contact_resolver_util_1.resolveContactInfo)(msg.chatJid, null, null, null, isGrp);
                const cleanDigits = msg.chatJid.split('@')[0].replace(/\D/g, '');
                let initialChatName = resolved.name;
                if (!isGrp && (!initialChatName || initialChatName === 'Direct Chat' || initialChatName === 'You (Message yourself)' || initialChatName === 'WhatsApp User' || initialChatName.startsWith('User …') || initialChatName.startsWith('Contact') || initialChatName === 'Community Member')) {
                    if (!isLid && cleanDigits.length >= 7) {
                        initialChatName = (0, contact_resolver_util_1.formatE164Phone)(cleanDigits) || `+${cleanDigits}`;
                    }
                    else if (isLid) {
                        const reg = contact_resolver_util_1.KNOWN_LID_MAP[cleanDigits] || contact_resolver_util_1.UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
                        initialChatName = reg?.name || reg?.phone || '';
                    }
                    else {
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
            }
            else {
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
        const allContacts = await this.contactRepo.find({ where: { accountId } });
        const chatsToSave = [];
        for (const contact of allContacts) {
            if (!contact.id || contact.id === 'status@broadcast' || (0, contact_resolver_util_1.isGroupJid)(contact.id))
                continue;
            const hasHumanName = (contact.name && /[a-zA-Z]/.test(contact.name) && !contact.name.startsWith('Contact (')) ||
                (contact.notifyName && /[a-zA-Z]/.test(contact.notifyName) && !contact.notifyName.startsWith('Contact ('));
            if (!hasHumanName)
                continue;
            if (!chatMap.has(contact.id)) {
                const resolved = (0, contact_resolver_util_1.resolveContactInfo)(contact.id, contact.name, contact.phoneNumber, contact.notifyName, false);
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
            }
            else {
                const existingChat = chatMap.get(contact.id);
                if (existingChat &&
                    (!existingChat.name || existingChat.name === existingChat.id || existingChat.name.startsWith('Contact (')) &&
                    contact.name &&
                    !contact.name.startsWith('Contact (')) {
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
        const contactMap = new Map(allContacts.map(c => [c.id, c]));
        const contactsToSave = [];
        for (const [chatId, chat] of chatMap.entries()) {
            if (chat.isGroup || chatId.endsWith('@g.us') || chatId.endsWith('@newsletter') || chatId === 'status@broadcast')
                continue;
            const isLid = (0, contact_resolver_util_1.isLidIdentifier)(chatId);
            const rawDigits = chatId.split('@')[0].replace(/\D/g, '');
            const hasChatName = chat.name && (0, contact_resolver_util_1.isProperName)(chat.name);
            if (isLid && !hasChatName)
                continue;
            if (!contactMap.has(chatId)) {
                const contactName = hasChatName ? chat.name : '';
                const phone = !isLid && rawDigits.length >= 7 ? ((0, contact_resolver_util_1.formatE164Phone)(rawDigits) || `+${rawDigits}`) : '';
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
        this.repairMediaUrls(accountId).then(result => {
            this.logger.log(`🔧 [AutoRepair] Account [${accountId}]: backfilled=${result.fixed}, redownloaded=${result.redownloaded}, failed=${result.failed}`);
            if (result.fixed + result.redownloaded > 0) {
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
    async handleEditedMessage(accountId, targetMsgId, chatJid, newRawContent, editTimestamp) {
        try {
            const unwrapped = unwrapMessage(newRawContent);
            const newText = extractMessageText(unwrapped) || extractMessageText(newRawContent) || '';
            this.logger.log(`✏️ Detected edited message [${targetMsgId}] in chat [${chatJid}]: "${newText}"`);
            const existing = await this.messageRepo.findOne({ where: { id: targetMsgId, accountId } });
            if (existing) {
                existing.text = newText;
                existing.isEdited = true;
                await this.messageRepo.save(existing);
            }
            else {
                const anyExisting = await this.messageRepo.findOne({ where: { id: targetMsgId } });
                if (anyExisting) {
                    anyExisting.text = newText;
                    anyExisting.isEdited = true;
                    await this.messageRepo.save(anyExisting);
                }
                else {
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
            if (chatJid) {
                await this.messageRepo.createQueryBuilder()
                    .delete()
                    .from(whatsapp_message_entity_1.WhatsappMessageEntity)
                    .where('accountId = :accountId AND chatJid = :chatJid AND (text IS NULL OR text = "") AND mediaType IS NULL', {
                    accountId,
                    chatJid,
                })
                    .execute()
                    .catch(err => this.logger.debug(`Failed cleaning phantom messages: ${err.message}`));
            }
            if (chatJid && newText) {
                const rawPrefix = chatJid.split('@')[0];
                await this.chatRepo
                    .createQueryBuilder()
                    .update(whatsapp_chat_entity_1.WhatsappChatEntity)
                    .set({ lastMessageText: newText })
                    .where('accountId = :accountId AND (id = :chatJid OR id LIKE :prefixPattern)', {
                    accountId,
                    chatJid,
                    prefixPattern: `${rawPrefix}@%`,
                })
                    .execute()
                    .catch((err) => this.logger.warn(`Failed updating chat preview for edited message: ${err.message}`));
            }
            const tenantId = this.config.get('TENANT_ID', 'default-tenant');
            this.broadcast(tenantId, accountId, 'whatsapp:message_edited', {
                accountId,
                chatJid,
                messageId: targetMsgId,
                text: newText,
                isEdited: true,
            });
            this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
            this.eventEmitter.emit('whatsapp.message.edited', {
                accountId,
                chatJid,
                messageId: targetMsgId,
                text: newText,
            });
        }
        catch (err) {
            this.logger.error(`Error handling edited message [${targetMsgId}]: ${err.message}`);
        }
    }
    async processMessage(accountId, msg, shouldBroadcast = true) {
        const msgId = msg.key?.id;
        let chatJid = msg.key?.remoteJid;
        if (!msgId || !chatJid || chatJid === 'status@broadcast')
            return;
        const fromMe = !!msg.key?.fromMe;
        const isGroup = chatJid.endsWith('@g.us');
        const senderJid = msg.key?.participant || (fromMe ? accountId : chatJid);
        let senderName = msg.pushName || (fromMe ? 'You' : '');
        if (senderName && (senderName.startsWith('120363') || senderName.includes('@g.us'))) {
            senderName = '';
        }
        if (!fromMe && msg.pushName && (0, contact_resolver_util_1.isProperName)(msg.pushName)) {
            const cleanPush = msg.pushName.trim();
            (0, contact_resolver_util_1.registerUniversalContact)(chatJid, cleanPush);
            if (senderJid && senderJid !== chatJid) {
                (0, contact_resolver_util_1.registerUniversalContact)(senderJid, cleanPush);
            }
            const targetContactId = (senderJid || chatJid).replace(/:\d+@/, '@');
            if (targetContactId && targetContactId !== 'status@broadcast') {
                const rawDigits = targetContactId.split('@')[0].replace(/\D/g, '');
                const isLid = (0, contact_resolver_util_1.isLidIdentifier)(targetContactId);
                this.contactRepo.findOne({ where: { id: targetContactId, accountId } }).then((existing) => {
                    if (existing) {
                        let changed = false;
                        if (!(0, contact_resolver_util_1.isProperName)(existing.name) || existing.name.startsWith('+')) {
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
                    }
                    else {
                        const newContact = this.contactRepo.create({
                            id: targetContactId,
                            accountId,
                            name: cleanPush,
                            notifyName: cleanPush,
                            phoneNumber: !isLid && rawDigits.length >= 7 ? ((0, contact_resolver_util_1.formatE164Phone)(rawDigits) || `+${rawDigits}`) : '',
                        });
                        this.contactRepo.save(newContact).then(() => {
                            const tenantId = this.config.get('TENANT_ID', 'default-tenant');
                            this.broadcast(tenantId, accountId, 'whatsapp:contacts_updated', { accountId });
                        }).catch(() => null);
                    }
                }).catch(() => null);
            }
        }
        const messageContent = unwrapMessage(msg.message);
        const directEdit = extractDirectEditedContent(msg);
        if (directEdit?.targetId && directEdit?.content) {
            await this.handleEditedMessage(accountId, directEdit.targetId, directEdit.targetChat || chatJid, directEdit.content, msg.messageTimestamp ? (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp * 1000 : Date.now()) : Date.now());
            return null;
        }
        const rawProtocolMsg = extractProtocolMessage(msg.message) || messageContent?.protocolMessage;
        if (rawProtocolMsg && (rawProtocolMsg.type === 14 || rawProtocolMsg.type === 'MESSAGE_EDIT' || rawProtocolMsg.editedMessage != null)) {
            const targetId = rawProtocolMsg.key?.id;
            const targetChat = rawProtocolMsg.key?.remoteJid || chatJid;
            if (targetId) {
                await this.handleEditedMessage(accountId, targetId, targetChat, rawProtocolMsg.editedMessage, msg.messageTimestamp ? (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp * 1000 : Date.now()) : Date.now());
                return null;
            }
        }
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
        if (rawProtocolMsg || (msg.message && Object.keys(msg.message).some(k => k === 'protocolMessage' || k === 'appStateSyncKeyShare' || k === 'appStateSyncKey' || k === 'senderKeyDistributionMessage' || k === 'deviceSentMessage' || k === 'keepInChatMessage' || k === 'callLogMesssage'))) {
            const tempText = extractMessageText(messageContent);
            if (!tempText && !messageContent?.imageMessage && !messageContent?.videoMessage && !messageContent?.audioMessage && !messageContent?.documentMessage && !messageContent?.stickerMessage) {
                return null;
            }
        }
        const isViewOnce = !!(msg.message?.viewOnceMessage ||
            msg.message?.viewOnceMessageV2 ||
            messageContent?.imageMessage?.viewOnce ||
            messageContent?.videoMessage?.viewOnce);
        let mediaType = undefined;
        let mimeType = undefined;
        let fileName = undefined;
        let fileSize = undefined;
        let mediaUrl = undefined;
        if (messageContent?.imageMessage) {
            mediaType = 'image';
            mimeType = messageContent.imageMessage.mimetype || 'image/jpeg';
            fileSize = Number(messageContent.imageMessage.fileLength || 0);
        }
        else if (messageContent?.videoMessage) {
            mediaType = 'video';
            mimeType = messageContent.videoMessage.mimetype || 'video/mp4';
            fileSize = Number(messageContent.videoMessage.fileLength || 0);
        }
        else if (messageContent?.audioMessage) {
            mediaType = 'audio';
            mimeType = messageContent.audioMessage.mimetype || 'audio/ogg';
            fileSize = Number(messageContent.audioMessage.fileLength || 0);
        }
        else if (messageContent?.documentMessage) {
            mediaType = 'document';
            mimeType = messageContent.documentMessage.mimetype || 'application/octet-stream';
            fileName = messageContent.documentMessage.fileName || messageContent.documentMessage.title || 'document';
            fileSize = Number(messageContent.documentMessage.fileLength || 0);
        }
        else if (messageContent?.stickerMessage) {
            mediaType = 'sticker';
            mimeType = messageContent.stickerMessage.mimetype || 'image/webp';
            fileSize = Number(messageContent.stickerMessage.fileLength || 0);
        }
        const rawText = extractMessageText(messageContent);
        const text = rawText || (mediaType === 'image' ? '📷 Photo' :
            mediaType === 'video' ? '🎥 Video' :
                mediaType === 'audio' ? '🎵 Audio message' :
                    mediaType === 'sticker' ? '🎨 Sticker' :
                        mediaType === 'document' ? (fileName ? `📎 ${fileName}` : '📎 Document') :
                            '');
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
                if (mimeType?.includes('jpeg') || mimeType?.includes('jpg'))
                    ext = 'jpg';
                else if (mimeType?.includes('png'))
                    ext = 'png';
                else if (mimeType?.includes('webp'))
                    ext = 'webp';
                else if (mimeType?.includes('mp4'))
                    ext = 'mp4';
                else if (mimeType?.includes('ogg') || mimeType?.includes('opus'))
                    ext = 'ogg';
                else if (mimeType?.includes('mp3'))
                    ext = 'mp3';
                else if (mimeType?.includes('m4a') || mimeType?.includes('aac'))
                    ext = 'm4a';
                else if (mimeType?.includes('wav'))
                    ext = 'wav';
                else if (mimeType?.includes('pdf'))
                    ext = 'pdf';
                else if (mimeType?.includes('sheet') || mimeType?.includes('excel'))
                    ext = 'xlsx';
                else if (mimeType?.includes('word'))
                    ext = 'docx';
                else if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint'))
                    ext = 'pptx';
                else if (mimeType?.includes('zip'))
                    ext = 'zip';
                else if (mimeType?.includes('text') || mimeType?.includes('plain'))
                    ext = 'txt';
                else if (fileName && fileName.includes('.'))
                    ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
                const cleanMsgId = msgId.replace(/[^a-zA-Z0-9_-]/g, '_');
                const filename = `${cleanMsgId}.${ext}`;
                const filePath = path.join(mediaDir, filename);
                if (fs.existsSync(filePath)) {
                    mediaUrl = `/api/v1/whatsapp/media/${accountId}/${filename}`;
                }
                else {
                    const socket = this.clients.get(accountId)?.socket;
                    const downloadTarget = {
                        ...msg,
                        message: messageContent || msg.message,
                    };
                    let buffer = null;
                    try {
                        const downloadPromise = (0, baileys_1.downloadMediaMessage)(downloadTarget, 'buffer', {}, {
                            logger: (0, pino_1.default)({ level: 'silent' }),
                            reuploadRequest: socket?.updateMediaMessage,
                        });
                        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), shouldBroadcast ? 30000 : 3000));
                        buffer = (await Promise.race([downloadPromise, timeoutPromise]));
                    }
                    catch {
                        try {
                            const downloadPromise2 = (0, baileys_1.downloadMediaMessage)(msg, 'buffer', {}, {
                                logger: (0, pino_1.default)({ level: 'silent' }),
                                reuploadRequest: socket?.updateMediaMessage,
                            });
                            const timeoutPromise2 = new Promise((resolve) => setTimeout(() => resolve(null), shouldBroadcast ? 30000 : 3000));
                            buffer = (await Promise.race([downloadPromise2, timeoutPromise2]));
                        }
                        catch {
                            buffer = null;
                        }
                    }
                    if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
                        await fs.promises.writeFile(filePath, buffer);
                        mediaUrl = `/api/v1/whatsapp/media/${accountId}/${filename}`;
                        this.logger.log(`Saved ${mediaType} for message [${msgId}]: ${filename} (${buffer.length} bytes)`);
                    }
                }
            }
            catch (err) {
                this.logger.warn(`Media download skipped for [${msgId}]: ${err.message}`);
            }
        }
        const contextInfo = messageContent?.extendedTextMessage?.contextInfo
            || messageContent?.imageMessage?.contextInfo
            || messageContent?.videoMessage?.contextInfo
            || messageContent?.audioMessage?.contextInfo
            || messageContent?.documentMessage?.contextInfo;
        let quotedMsgId = undefined;
        let quotedText = undefined;
        let quotedSender = undefined;
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
        const storeMessagesOnServer = this.config.get('STORE_MESSAGES_ON_SERVER', 'true') === 'true';
        const savedMsg = storeMessagesOnServer
            ? await this.messageRepo.save(msgPayload)
            : msgPayload;
        let snippet = text;
        if (!snippet) {
            if (mediaType === 'image')
                snippet = '📷 Photo';
            else if (mediaType === 'video')
                snippet = '🎥 Video';
            else if (mediaType === 'audio')
                snippet = '🎵 Voice message';
            else if (mediaType === 'document')
                snippet = `📎 ${fileName || 'Document'}`;
            else if (mediaType === 'sticker')
                snippet = '🎨 Sticker';
            else
                snippet = '';
        }
        if (snippet) {
            snippet = snippet.replace(/^(120363\d+|[0-9]{15,}@g\.us):\s*/i, '');
        }
        if (isGroup && !fromMe && senderName && snippet) {
            if (!senderName.startsWith('120363') && senderName !== chatJid && senderName !== chatJid.split('@')[0]) {
                snippet = `${senderName}: ${snippet}`;
            }
        }
        let chat = await this.chatRepo.findOne({ where: { id: chatJid, accountId } });
        if (!chat) {
            let chatName = chatJid.split('@')[0];
            if (isGroup) {
                const suffix = chatJid.split('@')[0].slice(-4);
                chatName = suffix ? `Group (${suffix})` : 'Group Chat';
                const instance = this.getClient(accountId);
                if (instance?.socket) {
                    instance.socket.groupMetadata(chatJid).then((meta) => {
                        if (meta?.subject && (0, contact_resolver_util_1.isProperName)(meta.subject)) {
                            this.chatRepo.update({ id: chatJid, accountId }, { name: meta.subject, subtitle: meta.desc });
                        }
                    }).catch(() => null);
                }
            }
            else {
                const contact = await this.contactRepo.findOne({ where: { id: chatJid, accountId } });
                const fromPushName = (!fromMe && senderName && (0, contact_resolver_util_1.isProperName)(senderName)) ? senderName.trim() : null;
                const candidateName = (contact?.name && (0, contact_resolver_util_1.isProperName)(contact.name))
                    ? contact.name
                    : (contact?.notifyName && (0, contact_resolver_util_1.isProperName)(contact.notifyName))
                        ? contact.notifyName
                        : fromPushName;
                const account = await this.accountRepo.findOne({ where: { id: accountId } });
                const resolved = (0, contact_resolver_util_1.resolveContactInfo)(chatJid, candidateName, contact?.phoneNumber, contact?.notifyName, false, account?.phoneNumber);
                chatName = resolved.name;
                const isLid = (0, contact_resolver_util_1.isLidIdentifier)(chatJid);
                const cleanDigits = chatJid.split('@')[0].replace(/\D/g, '');
                if (!chatName || !(0, contact_resolver_util_1.isProperName)(chatName)) {
                    if (fromPushName) {
                        chatName = fromPushName;
                    }
                    else if (!isLid && cleanDigits.length >= 7) {
                        chatName = (0, contact_resolver_util_1.formatE164Phone)(cleanDigits) || `+${cleanDigits}`;
                    }
                    else if (isLid) {
                        const reg = contact_resolver_util_1.KNOWN_LID_MAP[cleanDigits] || contact_resolver_util_1.UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
                        chatName = reg?.name || reg?.phone || '';
                    }
                    else {
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
        }
        else {
            chat.lastMessageText = snippet || chat.lastMessageText;
            chat.lastMessageTimestamp = timestamp;
            chat.lastMessageStatus = fromMe ? 'sent' : 'delivered';
            chat.lastMessageFromMe = fromMe;
            if (!fromMe) {
                chat.unreadCount = (chat.unreadCount || 0) + 1;
            }
            if (!isGroup && !fromMe) {
                const isLid = (0, contact_resolver_util_1.isLidIdentifier)(chatJid);
                const cleanDigits = chatJid.split('@')[0].replace(/\D/g, '');
                const formattedPhone = (!isLid && cleanDigits.length >= 7) ? ((0, contact_resolver_util_1.formatE164Phone)(cleanDigits) || `+${cleanDigits}`) : '';
                const isCorruptName = !chat.name || !(0, contact_resolver_util_1.isProperName)(chat.name);
                if (senderName && (0, contact_resolver_util_1.isProperName)(senderName)) {
                    const cleanSender = senderName.trim();
                    if (isCorruptName || chat.name === formattedPhone) {
                        chat.name = cleanSender;
                        this.chatRepo.update({ id: chatJid, accountId }, { name: cleanSender }).catch(() => null);
                    }
                    this.contactRepo.findOne({ where: { id: chatJid, accountId } }).then((c) => {
                        if (c) {
                            c.notifyName = cleanSender;
                            if (!c.name || !(0, contact_resolver_util_1.isProperName)(c.name)) {
                                c.name = cleanSender;
                            }
                            this.contactRepo.save(c).catch(() => null);
                        }
                    }).catch(() => null);
                }
                else if (isCorruptName && formattedPhone) {
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
                const isLid = (0, contact_resolver_util_1.isLidIdentifier)(chat.id);
                const cleanDigits = chat.id.split('@')[0].replace(/\D/g, '');
                if (!isLid && cleanDigits.length >= 7) {
                    chat.name = (0, contact_resolver_util_1.formatE164Phone)(cleanDigits) || `+${cleanDigits}`;
                }
                else if (isLid) {
                    const reg = contact_resolver_util_1.KNOWN_LID_MAP[cleanDigits] || contact_resolver_util_1.UNIVERSAL_IDENTITY_REGISTRY.get(cleanDigits);
                    if (reg?.name && (0, contact_resolver_util_1.isProperName)(reg.name)) {
                        chat.name = reg.name;
                    }
                    else if (reg?.phone) {
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
            if (!fromMe) {
                this.emitClientMessageNotification(tenantId, accountId, chatJid, chat, savedMsg, text || snippet, mediaType, timestamp, isGroup).catch((err) => {
                    this.logger.warn(`Failed to emit client incoming message notification: ${err.message}`);
                });
            }
        }
    }
    async sendMessage(accountId, to, text, quotedMsgId) {
        if (!text || !text.trim()) {
            throw new common_1.BadRequestException('Message text cannot be empty.');
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
            }
            catch (hydrateErr) {
                this.logger.warn(`Auto-hydration attempt failed: ${hydrateErr.message}`);
            }
        }
        if (!this.isSocketConnected(accountId) || !instance?.socket?.user?.id) {
            throw new common_1.BadRequestException(`WhatsApp account is not connected. Please scan the QR code to link your WhatsApp account.`);
        }
        const jid = await this.resolveDeliverableJid(accountId, to);
        let quotedOptions = undefined;
        let quotedMessage = undefined;
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
        const warmupCheck = await this.accountWarmupService.canDispatch(accountId);
        if (!warmupCheck.allowed) {
            this.logger.warn(`[Anti-Ban Guard] Blocked dispatch for ${accountId}: ${warmupCheck.reason}`);
            throw new common_1.BadRequestException(warmupCheck.reason);
        }
        const simulateTyping = this.config.get('SIMULATE_HUMAN_TYPING', 'true') === 'true';
        if (simulateTyping) {
            await this.behavioralTypingService.simulateHumanDispatch(instance.socket, jid, text);
        }
        let result;
        try {
            result = await instance.socket.sendMessage(jid, { text: text.trim() }, quotedOptions);
            this.accountWarmupService.recordDispatch(accountId);
            this.telemetryService?.incrementMessageThroughput(accountId, 'sent');
        }
        catch (socketErr) {
            this.telemetryService?.incrementMessageThroughput(accountId, 'failed');
            this.logger.error(`Failed to send message via Baileys socket: ${socketErr.message}`);
            if (socketErr?.message?.includes('Connection Closed') || socketErr?.message?.includes('closed') || socketErr?.message?.includes('not connected')) {
                await this.accountRepo.update(accountId, { status: 'disconnected' }).catch(() => null);
                const tenantId = this.config.get('TENANT_ID', 'default-tenant');
                this.broadcast(tenantId, accountId, 'account:status', { accountId, status: 'DISCONNECTED' });
            }
            throw new common_1.BadRequestException(`WhatsApp delivery error: ${socketErr.message || 'Socket error'}`);
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
        const storeMessagesOnServer = this.config.get('STORE_MESSAGES_ON_SERVER', 'true') === 'true';
        const savedMsg = storeMessagesOnServer
            ? await this.messageRepo.save(msgPayload)
            : msgPayload;
        let chat = await this.chatRepo.findOne({ where: { id: to, accountId } });
        if (!chat) {
            const contact = await this.contactRepo.findOne({ where: { id: to, accountId } });
            const candidateSendName = (contact?.name && (0, contact_resolver_util_1.isProperName)(contact.name)) ? contact.name : (contact?.notifyName && (0, contact_resolver_util_1.isProperName)(contact.notifyName)) ? contact.notifyName : null;
            const resolvedSend = (0, contact_resolver_util_1.resolveContactInfo)(to, candidateSendName, contact?.phoneNumber, null, to.endsWith('@g.us'));
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
        }
        else {
            chat.lastMessageText = text.trim();
            chat.lastMessageTimestamp = timestamp;
            chat.lastMessageStatus = 'sent';
            chat.lastMessageFromMe = true;
        }
        await this.chatRepo.save(chat);
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
    async sendVoiceNote(accountId, to, audioBuffer, quotedMsgId) {
        let instance = this.getClient(accountId);
        if (!this.isSocketConnected(accountId) || !instance?.socket?.user?.id) {
            throw new common_1.BadRequestException('WhatsApp account is not connected. Please scan the QR code to link your WhatsApp account.');
        }
        const jid = await this.resolveDeliverableJid(accountId, to);
        let quotedOptions = undefined;
        let quotedMessage = undefined;
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
        const warmupCheck = await this.accountWarmupService.canDispatch(accountId);
        if (!warmupCheck.allowed) {
            throw new common_1.BadRequestException(warmupCheck.reason);
        }
        await instance.socket.sendPresenceUpdate('recording', jid).catch(() => null);
        await new Promise((r) => setTimeout(r, 1200));
        let result;
        try {
            result = await instance.socket.sendMessage(jid, {
                audio: audioBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
            }, quotedOptions);
            this.accountWarmupService.recordDispatch(accountId);
        }
        catch (socketErr) {
            this.logger.error(`Failed to send voice note via Baileys socket: ${socketErr.message}`);
            if (socketErr?.message?.includes('Connection Closed') || socketErr?.message?.includes('closed') || socketErr?.message?.includes('not connected')) {
                await this.accountRepo.update(accountId, { status: 'disconnected' }).catch(() => null);
                const tenantId = this.config.get('TENANT_ID', 'default-tenant');
                this.broadcast(tenantId, accountId, 'account:status', { accountId, status: 'DISCONNECTED' });
            }
            throw new common_1.BadRequestException(`WhatsApp voice delivery error: ${socketErr.message || 'Socket error'}`);
        }
        finally {
            await instance.socket.sendPresenceUpdate('paused', jid).catch(() => null);
        }
        const msgId = result?.key?.id || Math.random().toString(36).substring(2);
        const timestamp = Date.now();
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
        const storeMessagesOnServer = this.config.get('STORE_MESSAGES_ON_SERVER', 'true') === 'true';
        const savedMsg = storeMessagesOnServer
            ? await this.messageRepo.save(voicePayload)
            : voicePayload;
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
        }
        else {
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
    async sendReaction(accountId, to, messageId, emoji, fromMe = false) {
        let instance = this.getClient(accountId);
        if (!instance || !instance.socket || !instance.socket.user?.id) {
            throw new common_1.BadRequestException('WhatsApp account is not connected.');
        }
        const jid = await this.resolveDeliverableJid(accountId, to);
        const origMsg = await this.messageRepo.findOne({ where: { id: messageId, accountId } });
        const reactionRemoteJid = origMsg?.chatJid || jid;
        try {
            await instance.socket.sendMessage(jid, {
                react: {
                    text: emoji || '',
                    key: {
                        remoteJid: reactionRemoteJid,
                        fromMe,
                        id: messageId,
                    },
                },
            });
        }
        catch (socketErr) {
            this.logger.error(`Failed to send reaction via Baileys socket: ${socketErr.message}`);
            throw new common_1.BadRequestException(`WhatsApp reaction error: ${socketErr.message || 'Socket error'}`);
        }
        await this.messageRepo.update({ id: messageId, accountId }, { reaction: emoji || null }).catch(() => null);
        const tenantId = this.config.get('TENANT_ID', 'default-tenant');
        this.broadcast(tenantId, accountId, 'whatsapp:message_reaction', {
            messageId,
            chatJid: jid,
            reaction: emoji || null,
        });
        return { success: true, messageId, reaction: emoji };
    }
    async sendMediaMessage(accountId, to, fileBuffer, fileName, mimeType, caption) {
        let instance = this.getClient(accountId);
        if (!instance) {
            try {
                const hasSession = await this.sessionSyncManager.hasSession(accountId);
                if (hasSession) {
                    const hydration = await this.sessionSyncManager.hydrateSession(accountId);
                    instance = await this.createClient(accountId, hydration.authDir);
                }
            }
            catch (hydrateErr) {
                this.logger.warn(`Auto-hydration attempt failed: ${hydrateErr.message}`);
            }
        }
        if (!this.isSocketConnected(accountId) || !instance?.socket?.user?.id) {
            throw new common_1.BadRequestException(`WhatsApp account is not connected. Please scan the QR code to link your WhatsApp account before sending media attachments.`);
        }
        const jid = await this.resolveDeliverableJid(accountId, to);
        let mediaType = 'document';
        let messagePayload = {};
        if (mimeType.startsWith('image/')) {
            mediaType = 'image';
            messagePayload = { image: fileBuffer, caption: caption || '' };
        }
        else if (mimeType.startsWith('video/')) {
            mediaType = 'video';
            messagePayload = { video: fileBuffer, caption: caption || '' };
        }
        else if (mimeType.startsWith('audio/')) {
            mediaType = 'audio';
            const isVoice = mimeType.includes('ogg') || mimeType.includes('opus');
            messagePayload = { audio: fileBuffer, mimetype: mimeType || 'audio/mp4', ptt: isVoice };
        }
        else {
            mediaType = 'document';
            messagePayload = { document: fileBuffer, fileName, mimetype: mimeType, caption: caption || '' };
        }
        const warmupCheck = await this.accountWarmupService.canDispatch(accountId);
        if (!warmupCheck.allowed) {
            throw new common_1.BadRequestException(warmupCheck.reason);
        }
        let result;
        try {
            result = await instance.socket.sendMessage(jid, messagePayload);
            this.accountWarmupService.recordDispatch(accountId);
        }
        catch (socketErr) {
            this.logger.error(`Failed to send media via Baileys socket: ${socketErr.message}`);
            if (socketErr?.message?.includes('Connection Closed') || socketErr?.message?.includes('closed') || socketErr?.message?.includes('not connected')) {
                await this.accountRepo.update(accountId, { status: 'disconnected' }).catch(() => null);
                const tenantId = this.config.get('TENANT_ID', 'default-tenant');
                this.broadcast(tenantId, accountId, 'account:status', { accountId, status: 'DISCONNECTED' });
            }
            throw new common_1.BadRequestException(`WhatsApp media delivery error: ${socketErr.message || 'Socket error'}`);
        }
        const msgId = result?.key?.id || Math.random().toString(36).substring(2);
        const timestamp = Date.now();
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
        }
        else {
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
    isSocketConnected(accountId) {
        const instance = this.clients.get(accountId);
        if (!instance || !instance.socket) {
            return false;
        }
        if (!instance.socket.user?.id) {
            return false;
        }
        const ws = instance.socket.ws;
        if (!ws)
            return false;
        if (ws.isClosed === true || ws.isClosing === true)
            return false;
        if (ws.readyState !== undefined && ws.readyState !== 1)
            return false;
        if (ws.socket && ws.socket.readyState !== 1)
            return false;
        return true;
    }
    isSocketPending(accountId) {
        const instance = this.clients.get(accountId);
        return !!(instance?.socket) && !instance.socket.user?.id;
    }
    async resolveDeliverableJid(accountId, to) {
        let jid = to.trim();
        if (!jid.includes('@')) {
            const digits = jid.replace(/[^0-9]/g, '');
            if ((0, contact_resolver_util_1.isLidIdentifier)(digits) || digits.length >= 14) {
                jid = `${digits}@lid`;
            }
            else {
                jid = `${digits}@s.whatsapp.net`;
            }
        }
        if (jid.endsWith('@s.whatsapp.net')) {
            const userPart = jid.split('@')[0].replace(/[^0-9]/g, '');
            if ((0, contact_resolver_util_1.isLidIdentifier)(userPart) || userPart.length >= 14) {
                jid = `${userPart}@lid`;
            }
        }
        if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) {
            return jid;
        }
        if (jid.endsWith('@lid')) {
            const rawLid = jid.split('@')[0].replace(/[^0-9]/g, '');
            const known = contact_resolver_util_1.KNOWN_LID_MAP[jid] || contact_resolver_util_1.KNOWN_LID_MAP[rawLid];
            if (known?.phone) {
                const phone = known.phone.replace(/[^0-9]/g, '');
                if (phone && phone.length >= 10 && phone.length <= 13 && phone !== rawLid) {
                    return `${phone}@s.whatsapp.net`;
                }
            }
            const contact = await this.contactRepo.findOne({ where: { id: jid, accountId } });
            if (contact?.phoneNumber && !contact.phoneNumber.includes('@') && !contact.phoneNumber.includes('LID')) {
                const phone = contact.phoneNumber.replace(/[^0-9]/g, '');
                if (phone && phone.length >= 10 && phone.length <= 13 && phone !== rawLid) {
                    return `${phone}@s.whatsapp.net`;
                }
            }
            const chat = await this.chatRepo.findOne({ where: { id: jid, accountId } });
            if (chat?.name && /^\+?[0-9\s-]{10,13}$/.test(chat.name.trim())) {
                const phone = chat.name.replace(/[^0-9]/g, '');
                if (phone && phone.length >= 10 && phone.length <= 13 && phone !== rawLid) {
                    return `${phone}@s.whatsapp.net`;
                }
            }
            return `${rawLid}@lid`;
        }
        return jid;
    }
    async startQR(accountId, force = false) {
        if (this.qrLocks.has(accountId)) {
            this.logger.log(`startQR already in progress for [${accountId}], returning existing promise.`);
            return this.qrLocks.get(accountId);
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
                if (!force && this.activeQRCodes.has(accountId) && this.clients.has(accountId)) {
                    return {
                        success: true,
                        alreadyConnected: false,
                        qrCodeDataUrl: this.activeQRCodes.get(accountId),
                    };
                }
                this.activeQRCodes.delete(accountId);
                this.qrRetryCounts.delete(accountId);
                await this.destroyClient(accountId);
                await this.sessionSyncManager.invalidateSession(accountId).catch(() => null);
                await this.sessionSyncManager.cleanupEphemeralSession(accountId).catch(() => null);
                const res = await this.sessionSyncManager.createEmptySession(accountId);
                const qrPromise = new Promise((resolve) => {
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
            }
            finally {
                this.qrLocks.delete(accountId);
            }
        })();
        this.qrLocks.set(accountId, task);
        return task;
    }
    getActiveQRCode(accountId) {
        return this.activeQRCodes.get(accountId) || null;
    }
    broadcast(tenantId, accountId, event, payload) {
        try {
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
        }
        catch {
        }
    }
    async emitClientMessageNotification(tenantId, accountId, chatJid, chat, savedMsg, messageSnippet, mediaType, timestamp = Date.now(), isGroup = false) {
        try {
            const account = await this.accountRepo.findOne({ where: { id: accountId } });
            const access = await this.accessRepo.findOne({ where: { accountId } });
            let assignedAdminName = null;
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
            }
            catch { }
        }
        catch (err) {
            this.logger.warn(`Error emitting client notification: ${err.message}`);
        }
    }
    getClient(accountId) {
        return this.clients.get(accountId);
    }
    async destroyClient(accountId) {
        if (this.reconnectTimers.has(accountId)) {
            clearTimeout(this.reconnectTimers.get(accountId));
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
                instance.socket?.ws?.terminate?.();
            }
            catch {
            }
            this.clients.delete(accountId);
            this.logger.log(`Client destroyed for account [${accountId}]`);
            try {
                this.socketManager.unregisterStanddownHandler(accountId);
                await this.socketManager.releaseSocketLease(accountId);
            }
            catch (leaseErr) {
                this.logger.warn(`Failed to release socket lease for [${accountId}]: ${leaseErr.message}`);
            }
        }
    }
    async saveChat(accountId, chatData) {
        const tenantId = this.config.get('TENANT_ID', 'default-tenant');
        return this.syncService.saveChat(accountId, chatData, () => {
            this.broadcast(tenantId, accountId, 'whatsapp:chats_updated', { accountId });
        });
    }
    async syncChatMessages(accountId, chatJid, count = 25) {
        const instance = this.getClient(accountId);
        if (!instance?.socket || !this.isSocketConnected(accountId)) {
            this.logger.warn(`Cannot sync chat messages for [${chatJid}]: socket not connected`);
            return { success: false, synced: 0 };
        }
        return this.syncService.syncChatMessages(accountId, chatJid, instance.socket, count);
    }
    async preLogoutFlush(accountId) {
        this.logger.log(`🔄 [PreLogout] Executing full data flush for account [${accountId}]...`);
        try {
            await this.syncAllData(accountId).catch((err) => {
                this.logger.warn(`Pre-logout syncAllData warning: ${err.message}`);
            });
            await this.sessionSyncManager.persistSession(accountId).catch((err) => {
                this.logger.warn(`Pre-logout persistSession warning: ${err.message}`);
            });
            this.logger.log(`✅ [PreLogout] Data flush complete for account [${accountId}]`);
        }
        catch (err) {
            this.logger.error(`Error during pre-logout flush for [${accountId}]: ${err.message}`);
        }
    }
    async logoutClient(accountId) {
        await this.preLogoutFlush(accountId);
        const instance = this.clients.get(accountId);
        if (instance) {
            try {
                await instance.socket?.logout?.().catch(() => { });
            }
            catch {
            }
            await this.destroyClient(accountId);
            this.logger.log(`Client explicitly logged out for account [${accountId}]`);
        }
    }
    getActiveClients() {
        return Array.from(this.clients.keys());
    }
    async repairMediaUrls(accountId) {
        return this.mediaPipelineService.repairMediaUrls(accountId, (accId) => this.clients.get(accId)?.socket);
    }
    simulateAbruptSocketDrop(accountId, statusCode = 515, reason = 'Stream error (Chaos Monkey)') {
        const instance = this.clients.get(accountId);
        if (!instance?.socket) {
            this.logger.warn(`[ChaosMonkey] Cannot simulate socket drop for [${accountId}]: client not found`);
            return false;
        }
        this.logger.warn(`🐒 [ChaosMonkey] Injected hostile socket drop for [${accountId}] (Code: ${statusCode}, Reason: ${reason})`);
        try {
            const ws = instance.socket.ws;
            if (ws) {
                if (typeof ws.terminate === 'function') {
                    ws.terminate();
                }
                else if (typeof ws.close === 'function') {
                    ws.close(statusCode, reason);
                }
            }
            const error = new boom_1.Boom(reason, { statusCode });
            instance.socket.ev.emit('connection.update', {
                connection: 'close',
                lastDisconnect: {
                    error,
                    date: new Date(),
                },
            });
            return true;
        }
        catch (err) {
            this.logger.error(`[ChaosMonkey] Error during socket drop simulation: ${err.message}`);
            return false;
        }
    }
    registerMockClient(accountId, mockInstance) {
        this.clients.set(accountId, mockInstance);
    }
};
exports.BaileysClientFactory = BaileysClientFactory;
exports.BaileysClientFactory = BaileysClientFactory = BaileysClientFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(whatsapp_chat_entity_1.WhatsappChatEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(whatsapp_contact_entity_1.WhatsappContactEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(whatsapp_message_entity_1.WhatsappMessageEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(user_account_access_entity_1.UserAccountAccessEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(app_user_entity_1.AppUserEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        proxy_binding_service_1.ProxyBindingService,
        session_sync_manager_1.SessionSyncManager,
        baileys_media_pipeline_service_1.BaileysMediaPipelineService,
        baileys_sync_service_1.BaileysSyncService,
        config_1.ConfigService,
        realtime_event_service_1.RealtimeEventService,
        event_emitter_1.EventEmitter2,
        behavioral_typing_service_1.BehavioralTypingService,
        account_warmup_service_1.AccountWarmupService,
        distributed_socket_manager_service_1.DistributedSocketManagerService,
        telemetry_service_1.TelemetryService])
], BaileysClientFactory);
//# sourceMappingURL=baileys-client.factory.js.map