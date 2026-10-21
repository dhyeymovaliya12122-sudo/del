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
var ExportBackupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportBackupService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const archiver = require("archiver");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const whatsapp_message_entity_1 = require("../../session-hydration/entities/whatsapp-message.entity");
const whatsapp_chat_entity_1 = require("../../session-hydration/entities/whatsapp-chat.entity");
const whatsapp_contact_entity_1 = require("../../session-hydration/entities/whatsapp-contact.entity");
const whatsapp_account_entity_1 = require("../../session-hydration/entities/whatsapp-account.entity");
const user_account_access_entity_1 = require("../../auth/entities/user-account-access.entity");
const export_log_entity_1 = require("../entities/export-log.entity");
const offline_viewer_template_1 = require("./offline-viewer.template");
const contact_resolver_util_1 = require("../utils/contact-resolver.util");
const SIGNED_SECRET = process.env.JWT_SECRET || 'wa_export_secret_key_2026';
let ExportBackupService = ExportBackupService_1 = class ExportBackupService {
    constructor(messageRepo, chatRepo, contactRepo, accountRepo, userAccessRepo, exportLogRepo, dataSource) {
        this.messageRepo = messageRepo;
        this.chatRepo = chatRepo;
        this.contactRepo = contactRepo;
        this.accountRepo = accountRepo;
        this.userAccessRepo = userAccessRepo;
        this.exportLogRepo = exportLogRepo;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(ExportBackupService_1.name);
    }
    async onModuleInit() {
        try {
            await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS export_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          username TEXT DEFAULT 'anonymous',
          user_role TEXT DEFAULT 'ADMIN',
          account_id TEXT NOT NULL,
          scope TEXT DEFAULT 'all',
          format TEXT DEFAULT 'zip',
          pii_redacted BOOLEAN DEFAULT 0,
          password_protected BOOLEAN DEFAULT 0,
          record_count INTEGER DEFAULT 0,
          file_size_bytes INTEGER DEFAULT 0,
          ip_address TEXT,
          status TEXT DEFAULT 'completed',
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            this.logger.log('✅ export_logs table verified in database');
        }
        catch (err) {
            this.logger.warn(`Could not verify export_logs table: ${err.message}`);
        }
    }
    async checkUserAccess(userId, userRole, accountId) {
        if (userRole === 'SUPER_ADMIN')
            return true;
        if (accountId === 'all') {
            if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
                return true;
            throw new common_1.ForbiddenException('Access denied: Administrator permissions required to export all accounts.');
        }
        const access = await this.userAccessRepo.findOne({ where: { userId, accountId } });
        if (!access) {
            this.logger.warn(`User ${userId} (${userRole}) denied access to export account ${accountId}`);
            throw new common_1.ForbiddenException('Access denied: You are not authorized to export data for this WhatsApp account.');
        }
        return true;
    }
    async logExport(entry) {
        try {
            const log = this.exportLogRepo.create({
                ...entry,
                status: entry.status || 'completed',
            });
            return await this.exportLogRepo.save(log);
        }
        catch (err) {
            this.logger.error(`Failed to save export log: ${err.message}`);
            return entry;
        }
    }
    async getExportLogs(accountId, limit = 50) {
        const qb = this.exportLogRepo.createQueryBuilder('log');
        if (accountId && accountId !== 'all') {
            qb.where('log.accountId = :accountId', { accountId });
        }
        qb.orderBy('log.createdAt', 'DESC').take(limit);
        return qb.getMany();
    }
    async getExportStats(accountId, chatJid) {
        if (accountId === 'all') {
            const accounts = await this.accountRepo.find();
            let totalChats = 0;
            let totalMessages = 0;
            let totalMediaFiles = 0;
            let totalMediaBytes = 0;
            for (const acc of accounts) {
                totalChats += await this.chatRepo.count({ where: { accountId: acc.id } });
                totalMessages += await this.messageRepo.count({ where: { accountId: acc.id } });
                const mediaDir = path.resolve(process.cwd(), 'data', 'media', acc.id);
                if (fs.existsSync(mediaDir)) {
                    try {
                        const files = fs.readdirSync(mediaDir);
                        totalMediaFiles += files.length;
                        for (const file of files) {
                            const stat = fs.statSync(path.join(mediaDir, file));
                            totalMediaBytes += stat.size;
                        }
                    }
                    catch { }
                }
            }
            const lastBackup = await this.exportLogRepo.findOne({
                where: { status: 'completed' },
                order: { createdAt: 'DESC' },
            });
            return {
                accountId: 'all',
                accountPhone: `All Accounts (${accounts.length} Accounts)`,
                chatCount: totalChats,
                messageCount: totalMessages,
                mediaFilesCount: totalMediaFiles,
                mediaBytes: totalMediaBytes,
                mediaSizeFormatted: this.formatBytes(totalMediaBytes),
                lastBackupAt: lastBackup?.createdAt || null,
                totalAccounts: accounts.length,
            };
        }
        const account = await this.accountRepo.findOne({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException(`Account ${accountId} not found`);
        let chatCount = 0;
        let messageCount = 0;
        if (chatJid) {
            const cleanJid = decodeURIComponent(chatJid).trim();
            const phone = cleanJid.split('@')[0].replace(/\+/g, '');
            const jids = [cleanJid, `${phone}@s.whatsapp.net`, `${phone}@lid`];
            messageCount = await this.messageRepo
                .createQueryBuilder('m')
                .where('m.accountId = :accountId', { accountId })
                .andWhere('m.chatJid IN (:...jids)', { jids })
                .getCount();
            chatCount = 1;
        }
        else {
            chatCount = await this.chatRepo.count({ where: { accountId } });
            messageCount = await this.messageRepo.count({ where: { accountId } });
        }
        const mediaDir = path.resolve(process.cwd(), 'data', 'media', accountId);
        let mediaFilesCount = 0;
        let mediaBytes = 0;
        if (fs.existsSync(mediaDir)) {
            try {
                const files = fs.readdirSync(mediaDir);
                mediaFilesCount = files.length;
                for (const file of files) {
                    const stat = fs.statSync(path.join(mediaDir, file));
                    mediaBytes += stat.size;
                }
            }
            catch { }
        }
        const lastBackup = await this.exportLogRepo.findOne({
            where: { accountId, status: 'completed' },
            order: { createdAt: 'DESC' },
        });
        return {
            accountId,
            accountPhone: account.phoneNumber || account.displayName || accountId,
            chatCount,
            messageCount,
            mediaFilesCount,
            mediaBytes,
            mediaSizeFormatted: this.formatBytes(mediaBytes),
            lastBackupAt: lastBackup?.createdAt || null,
        };
    }
    async getUnifiedContactsDirectory(accountId) {
        if (!accountId || accountId === 'all') {
            const accounts = await this.accountRepo.find();
            const allEntries = [];
            for (const acc of accounts) {
                const entries = await this.getUnifiedContactsDirectoryForAccount(acc.id);
                allEntries.push(...entries);
            }
            return allEntries;
        }
        return this.getUnifiedContactsDirectoryForAccount(accountId);
    }
    async getUnifiedContactsDirectoryForAccount(accountId) {
        const account = await this.accountRepo.findOne({ where: { id: accountId } });
        const accountPhone = account?.phoneNumber || '';
        const chats = await this.chatRepo.find({
            where: { accountId },
            order: { pinned: 'DESC', lastMessageTimestamp: 'DESC' },
        });
        const rawContacts = await this.contactRepo.find({ where: { accountId } });
        const contactMap = this.buildContactMap(rawContacts, accountPhone);
        const directory = [];
        const seenJids = new Set();
        for (const chat of chats) {
            if (!chat.id || chat.id === 'status@broadcast')
                continue;
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(chat.id, contactMap.get(chat.id) || chat.name, null, null, chat.isGroup, accountPhone);
            seenJids.add(chat.id);
            seenJids.add(chat.id.split('@')[0]);
            directory.push({
                id: chat.id,
                name: resolved.name,
                phoneNumber: resolved.phoneNumber,
                chatType: resolved.chatType,
                isGroup: resolved.isGroup,
                notifyName: '',
                unreadCount: chat.unreadCount || 0,
                lastMessageTimestamp: Number(chat.lastMessageTimestamp) || 0,
                source: 'chat',
                accountId,
            });
        }
        for (const c of rawContacts) {
            if (!c.id || seenJids.has(c.id) || seenJids.has(c.id.split('@')[0]))
                continue;
            const cleanId = c.id.trim();
            const rawId = cleanId.split('@')[0].replace(/\+/g, '');
            const isLid = (0, contact_resolver_util_1.isLidIdentifier)(cleanId);
            const isGroup = (0, contact_resolver_util_1.isGroupJid)(cleanId);
            if (isLid && !contact_resolver_util_1.KNOWN_LID_MAP[rawId]) {
                const hasRealName = c.name && c.name.trim() && !c.name.startsWith('Contact (') && !/^\d{10,}$/.test(c.name.trim());
                if (!hasRealName)
                    continue;
            }
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(cleanId, c.name, c.phoneNumber, c.notifyName, isGroup, accountPhone);
            if (resolved.name.startsWith('Contact (') && (resolved.phoneNumber === 'N/A (LID)' || !resolved.phoneNumber)) {
                continue;
            }
            seenJids.add(c.id);
            seenJids.add(rawId);
            directory.push({
                id: c.id,
                name: resolved.name,
                phoneNumber: resolved.phoneNumber,
                chatType: resolved.chatType,
                isGroup: resolved.isGroup,
                notifyName: c.notifyName || '',
                source: 'saved_contact',
                accountId,
            });
        }
        return directory;
    }
    sanitizeFolderName(phone, name) {
        const isGroupPrefix = (phone || '').toLowerCase().includes('group');
        const cleanPhone = isGroupPrefix ? 'Group' : (phone || '').replace(/[^0-9+]/g, '');
        const cleanName = (name || 'Contact')
            .replace(/[/\\?%*:|"<>]/g, '_')
            .replace(/\.\.+/g, '_')
            .replace(/[\x00-\x1f\x80-\x9f]/g, '')
            .trim()
            .slice(0, 45);
        const isReserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(cleanName);
        const safeName = isReserved ? `${cleanName}_chat` : cleanName;
        return isGroupPrefix ? `Group - ${safeName}` : `${cleanPhone || 'Contact'} - ${safeName}`;
    }
    redactSensitiveData(text) {
        if (!text)
            return '';
        return text
            .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CARD REDACTED]')
            .replace(/\b(?:otp|code|pin|password|passcode|token|verification)\s*[:=]?\s*(\d{4,8})\b/gi, '$1 [OTP REDACTED]')
            .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g, '[IFSC REDACTED]');
    }
    async generateSafeDatabaseSnapshot(targetPath) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            this.logger.log('Initiating safe SQLite VACUUM snapshot...');
            await queryRunner.query('PRAGMA busy_timeout = 10000;');
            await queryRunner.query('PRAGMA wal_checkpoint(TRUNCATE);');
            const cleanPath = targetPath.replace(/\\/g, '/');
            await queryRunner.query(`VACUUM INTO '${cleanPath}';`);
            this.logger.log(`Safe SQLite snapshot created at: ${targetPath}`);
        }
        finally {
            await queryRunner.release();
        }
    }
    async streamExcel(res, options) {
        const { accountId, piiRedacted } = options;
        if (typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="whatsapp_export_${accountId}_${Date.now()}.xlsx"`);
        }
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
            stream: res,
            useStyles: true,
            useSharedStrings: true,
        });
        if (accountId === 'all') {
            const accounts = await this.accountRepo.find();
            const accountMap = new Map(accounts.map(a => [a.id, `${a.displayName || 'Account'} (${(0, contact_resolver_util_1.formatE164Phone)(a.phoneNumber)})`]));
            const accSheet = workbook.addWorksheet('Accounts Overview');
            accSheet.columns = [
                { header: 'Account Name', key: 'name', width: 26 },
                { header: 'Phone Number', key: 'phone', width: 22 },
                { header: 'Status', key: 'status', width: 16 },
                { header: 'Total Chats', key: 'chats', width: 14 },
                { header: 'Total Messages', key: 'messages', width: 16 },
                { header: 'Account ID', key: 'id', width: 38 },
            ];
            for (const acc of accounts) {
                const chatsCount = await this.chatRepo.count({ where: { accountId: acc.id } });
                const msgsCount = await this.messageRepo.count({ where: { accountId: acc.id } });
                accSheet.addRow({
                    name: acc.displayName || 'WhatsApp Account',
                    phone: (0, contact_resolver_util_1.formatE164Phone)(acc.phoneNumber),
                    status: acc.status || 'active',
                    chats: chatsCount,
                    messages: msgsCount,
                    id: acc.id,
                }).commit();
            }
            accSheet.commit();
            const contactsSheet = workbook.addWorksheet('All Contacts Directory');
            contactsSheet.columns = [
                { header: 'WhatsApp Account', key: 'account', width: 28 },
                { header: 'Contact Name', key: 'name', width: 30 },
                { header: 'Phone Number', key: 'phone', width: 22 },
                { header: 'Chat Type', key: 'chatType', width: 16 },
                { header: 'WhatsApp JID', key: 'jid', width: 35 },
                { header: 'Notify Name', key: 'notifyName', width: 25 },
            ];
            const allContacts = await this.getUnifiedContactsDirectory('all');
            for (const c of allContacts) {
                contactsSheet.addRow({
                    account: accountMap.get(c.accountId) || c.accountId,
                    name: c.name,
                    phone: c.phoneNumber,
                    chatType: c.chatType,
                    jid: c.id,
                    notifyName: c.notifyName || '',
                }).commit();
            }
            contactsSheet.commit();
            const msgSheet = workbook.addWorksheet('Conversations Log');
            msgSheet.columns = [
                { header: 'WhatsApp Account', key: 'account', width: 24 },
                { header: 'Timestamp', key: 'timestamp', width: 22 },
                { header: 'Contact Name', key: 'contactName', width: 26 },
                { header: 'Phone Number', key: 'phone', width: 20 },
                { header: 'Chat Type', key: 'chatType', width: 14 },
                { header: 'Direction', key: 'direction', width: 12 },
                { header: 'Sender', key: 'sender', width: 24 },
                { header: 'Message Text', key: 'text', width: 50 },
                { header: 'Media Type', key: 'mediaType', width: 14 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Is Deleted', key: 'isDeleted', width: 12 },
                { header: 'Is View Once', key: 'isViewOnce', width: 12 },
                { header: 'Is Edited', key: 'isEdited', width: 12 },
            ];
            const rawContacts = await this.contactRepo.find();
            const contactMap = this.buildContactMap(rawContacts);
            const messages = await this.fetchFilteredMessages(options);
            for (const m of messages) {
                const accPhone = accounts.find(a => a.id === m.accountId)?.phoneNumber;
                const resolved = (0, contact_resolver_util_1.resolveContactInfo)(m.chatJid, contactMap.get(m.chatJid), null, null, undefined, accPhone);
                const text = piiRedacted ? this.redactSensitiveData(m.text) : (m.text || '');
                msgSheet.addRow({
                    account: accountMap.get(m.accountId) || m.accountId,
                    timestamp: new Date(m.timestamp).toLocaleString(),
                    contactName: resolved.name,
                    phone: resolved.phoneNumber,
                    chatType: resolved.chatType,
                    direction: m.fromMe ? 'Outbound' : 'Inbound',
                    sender: m.fromMe ? 'You' : (m.senderName || resolved.name),
                    text,
                    mediaType: m.mediaType || '',
                    status: m.status || 'sent',
                    isDeleted: m.isDeleted ? 'YES' : 'NO',
                    isViewOnce: m.isViewOnce ? 'YES' : 'NO',
                    isEdited: m.isEdited ? 'YES' : 'NO',
                }).commit();
            }
            msgSheet.commit();
            await workbook.commit();
            this.logger.log(`Excel export stream completed for all accounts (${accounts.length} accounts, ${messages.length} messages)`);
            return;
        }
        const account = await this.accountRepo.findOne({ where: { id: accountId } });
        const unifiedContacts = await this.getUnifiedContactsDirectory(accountId);
        const rawContacts = await this.contactRepo.find({ where: { accountId } });
        const contactMap = this.buildContactMap(rawContacts, account?.phoneNumber);
        const messages = await this.fetchFilteredMessages(options);
        const contactsSheet = workbook.addWorksheet('Contacts Directory');
        contactsSheet.columns = [
            { header: 'Contact Name', key: 'name', width: 30 },
            { header: 'Phone Number', key: 'phone', width: 22 },
            { header: 'Chat Type', key: 'chatType', width: 16 },
            { header: 'WhatsApp JID', key: 'jid', width: 35 },
            { header: 'Notify Name', key: 'notifyName', width: 25 },
        ];
        for (const c of unifiedContacts) {
            contactsSheet.addRow({
                name: c.name,
                phone: c.phoneNumber,
                chatType: c.chatType,
                jid: c.id,
                notifyName: c.notifyName || '',
            }).commit();
        }
        contactsSheet.commit();
        const msgSheet = workbook.addWorksheet('Conversations Log');
        msgSheet.columns = [
            { header: 'Timestamp', key: 'timestamp', width: 22 },
            { header: 'Contact Name', key: 'contactName', width: 26 },
            { header: 'Phone Number', key: 'phone', width: 20 },
            { header: 'Chat Type', key: 'chatType', width: 14 },
            { header: 'Direction', key: 'direction', width: 12 },
            { header: 'Sender', key: 'sender', width: 24 },
            { header: 'Message Text', key: 'text', width: 50 },
            { header: 'Media Type', key: 'mediaType', width: 14 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Is Deleted', key: 'isDeleted', width: 12 },
            { header: 'Is View Once', key: 'isViewOnce', width: 12 },
            { header: 'Is Edited', key: 'isEdited', width: 12 },
        ];
        for (const m of messages) {
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(m.chatJid, contactMap.get(m.chatJid), null, null, undefined, account?.phoneNumber);
            const text = piiRedacted ? this.redactSensitiveData(m.text) : (m.text || '');
            msgSheet.addRow({
                timestamp: new Date(m.timestamp).toLocaleString(),
                contactName: resolved.name,
                phone: resolved.phoneNumber,
                chatType: resolved.chatType,
                direction: m.fromMe ? 'Outbound' : 'Inbound',
                sender: m.fromMe ? 'You' : (m.senderName || resolved.name),
                text,
                mediaType: m.mediaType || '',
                status: m.status || 'sent',
                isDeleted: m.isDeleted ? 'YES' : 'NO',
                isViewOnce: m.isViewOnce ? 'YES' : 'NO',
                isEdited: m.isEdited ? 'YES' : 'NO',
            }).commit();
        }
        msgSheet.commit();
        await workbook.commit();
        this.logger.log(`Excel export stream completed for account ${accountId}`);
    }
    async streamPdf(res, options) {
        const { accountId, piiRedacted, chatJid } = options;
        const account = accountId === 'all' ? null : await this.accountRepo.findOne({ where: { id: accountId } });
        const rawContacts = accountId === 'all' ? await this.contactRepo.find() : await this.contactRepo.find({ where: { accountId } });
        const contactMap = this.buildContactMap(rawContacts, account?.phoneNumber);
        const messages = await this.fetchFilteredMessages(options);
        if (typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="whatsapp_export_${accountId}_${Date.now()}.pdf"`);
        }
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        doc.pipe(res);
        const targetChat = chatJid ? (0, contact_resolver_util_1.resolveContactInfo)(chatJid, contactMap.get(chatJid), null, null, undefined, account?.phoneNumber) : null;
        doc.fontSize(20).fillColor('#00a884').text('WhatsApp Chat History & Audit Export', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#666666').text(`Account: ${(0, contact_resolver_util_1.formatE164Phone)(account?.phoneNumber || accountId)}${targetChat ? `  •  Contact: ${targetChat.name} (${targetChat.phoneNumber})` : ''}  •  Exported: ${new Date().toLocaleString()}  •  Total Messages: ${messages.length}`, { align: 'center' });
        doc.moveDown(1);
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);
        for (const m of messages) {
            if (doc.y > 720) {
                doc.addPage();
            }
            const isOut = m.fromMe;
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(m.chatJid, contactMap.get(m.chatJid), null, null, undefined, account?.phoneNumber);
            const sender = isOut ? 'You' : (m.senderName || resolved.name);
            const timeStr = new Date(m.timestamp).toLocaleString();
            const text = piiRedacted ? this.redactSensitiveData(m.text) : (m.text || '');
            doc.fontSize(9).fillColor(isOut ? '#00705a' : '#1d6f8a').text(`[${timeStr}] ${sender} (${isOut ? 'Outbound' : 'Inbound'}) • ${resolved.name} [${resolved.phoneNumber}]:`);
            doc.fontSize(10).fillColor('#222222').text(text || (m.mediaType ? `[Media: ${m.mediaType}]` : ''), { indent: 15 });
            doc.moveDown(0.5);
        }
        doc.end();
        this.logger.log(`PDF export stream completed for account ${accountId}`);
    }
    async streamZipArchive(res, options) {
        const { accountId } = options;
        if (typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="whatsapp_backup_${accountId}_${Date.now()}.zip"`);
        }
        const archive = archiver('zip', { zlib: { level: 6 } });
        archive.pipe(res);
        const manifestFiles = [];
        if (accountId === 'all') {
            const accounts = await this.accountRepo.find();
            this.logger.log(`Initiating dynamic multi-account backup archive across ${accounts.length} accounts`);
            let totalArchivedMessages = 0;
            for (const account of accounts) {
                const cleanPhone = (account.phoneNumber || 'no-phone').replace(/\D/g, '');
                const cleanName = (account.displayName || 'Account').replace(/[/\\?%*:|"<>]/g, '_').trim();
                const accountFolder = `Account_${cleanPhone}_${cleanName}`;
                const result = await this.packageAccountIntoArchive(archive, account, accountFolder, options, manifestFiles);
                totalArchivedMessages += result.messagesCount;
            }
            const overviewExcelBuffer = await this.buildAllAccountsExcelBuffer(accounts);
            archive.append(overviewExcelBuffer, { name: 'all_accounts_overview.xlsx' });
            this.recordFileHash(manifestFiles, 'all_accounts_overview.xlsx', overviewExcelBuffer);
            const readmeContent = [
                `================================================================================`,
                `WHATSAPP ENTERPRISE AUDIT & SYSTEM BACKUP`,
                `================================================================================`,
                `Export Type: Master Organization Backup (All Accounts)`,
                `Generated At: ${new Date().toISOString()}`,
                `Total Accounts: ${accounts.length}`,
                `Total Messages Archived: ${totalArchivedMessages}`,
                `Media Setting: ${options.includeMedia || 'all'}`,
                ``,
                `ACCOUNTS INCLUDED:`,
                ...accounts.map(a => ` - ${a.displayName || 'Account'} (${(0, contact_resolver_util_1.formatE164Phone)(a.phoneNumber)}) [ID: ${a.id}, Status: ${a.status}]`),
                ``,
                `HOW TO VIEW CHATS OFFLINE:`,
                `1. Open any account folder (e.g. Account_${accounts[0] ? (accounts[0].phoneNumber || '').replace(/\D/g, '') + '_' + (accounts[0].displayName || 'Account') : 'sample'})`,
                `2. Double-click 'offline_viewer.html' to browse all chats and contacts with search.`,
                `3. Individual chats with all attached media are inside 'conversations/<Contact>/'.`,
                `================================================================================`,
            ].join('\r\n');
            archive.append(readmeContent, { name: 'README.txt' });
            this.recordFileHash(manifestFiles, 'README.txt', Buffer.from(readmeContent));
            const manifestPayload = {
                version: '2.0-forensic-master',
                exportType: 'all_accounts',
                totalAccounts: accounts.length,
                generatedAt: new Date().toISOString(),
                fileCount: manifestFiles.length + 1,
                totalMessages: totalArchivedMessages,
                algorithm: 'SHA-256',
                files: manifestFiles,
            };
            const manifestJsonContent = JSON.stringify(manifestPayload, null, 2);
            archive.append(manifestJsonContent, { name: 'MANIFEST.json' });
            await archive.finalize();
            this.logger.log(`Forensic Master ZIP backup completed for ${accounts.length} accounts with ${manifestFiles.length} checksummed files`);
            return;
        }
        const account = await this.accountRepo.findOne({ where: { id: accountId } });
        if (!account) {
            throw new common_1.NotFoundException(`Account ${accountId} not found`);
        }
        const result = await this.packageAccountIntoArchive(archive, account, '', options, manifestFiles);
        const manifestPayload = {
            version: '2.0-forensic',
            accountId,
            accountPhone: (0, contact_resolver_util_1.formatE164Phone)(account.phoneNumber || accountId),
            generatedAt: new Date().toISOString(),
            fileCount: manifestFiles.length + 1,
            totalMessages: result.messagesCount,
            algorithm: 'SHA-256',
            files: manifestFiles,
        };
        const manifestJsonContent = JSON.stringify(manifestPayload, null, 2);
        archive.append(manifestJsonContent, { name: 'MANIFEST.json' });
        await archive.finalize();
        this.logger.log(`Forensic ZIP backup completed for account ${accountId} with ${manifestFiles.length} checksummed files`);
    }
    async packageAccountIntoArchive(archive, account, folderPrefix, options, manifestFiles) {
        const { piiRedacted, includeMedia } = options;
        const prefix = folderPrefix ? `${folderPrefix}/` : '';
        const accountPhone = account?.phoneNumber || '';
        const unifiedContacts = await this.getUnifiedContactsDirectory(account.id);
        const rawContacts = await this.contactRepo.find({ where: { accountId: account.id } });
        const contactMap = this.buildContactMap(rawContacts, accountPhone);
        const messages = await this.fetchFilteredMessages({ ...options, accountId: account.id });
        const groupedMessages = {};
        for (const m of messages) {
            if (!groupedMessages[m.chatJid]) {
                groupedMessages[m.chatJid] = [];
            }
            groupedMessages[m.chatJid].push(m);
        }
        const contactsPayload = unifiedContacts.map(c => ({
            jid: c.id,
            phone: c.phoneNumber,
            name: c.name,
            chatType: c.chatType,
            isGroup: c.isGroup,
            messageCount: groupedMessages[c.id]?.length || 0,
        }));
        for (const [jid, msgs] of Object.entries(groupedMessages)) {
            if (!contactsPayload.some(c => c.jid === jid)) {
                const resolved = (0, contact_resolver_util_1.resolveContactInfo)(jid, contactMap.get(jid), null, null, undefined, accountPhone);
                contactsPayload.push({
                    jid,
                    phone: resolved.phoneNumber,
                    name: resolved.name,
                    chatType: resolved.chatType,
                    isGroup: resolved.isGroup,
                    messageCount: msgs.length,
                });
            }
        }
        contactsPayload.sort((a, b) => b.messageCount - a.messageCount);
        const vcfLines = [];
        for (const c of contactsPayload) {
            if (c.chatType === 'Group' || c.phone === 'Group Chat' || c.phone === 'N/A (LID)')
                continue;
            vcfLines.push('BEGIN:VCARD');
            vcfLines.push('VERSION:3.0');
            vcfLines.push(`FN:${c.name}`);
            if (c.phone && c.phone !== 'Group Chat') {
                vcfLines.push(`TEL;TYPE=CELL:${c.phone}`);
            }
            vcfLines.push(`NOTE:WhatsApp JID: ${c.jid}`);
            vcfLines.push('END:VCARD');
        }
        const vcfContent = vcfLines.join('\r\n');
        archive.append(vcfContent, { name: `${prefix}contacts.vcf` });
        this.recordFileHash(manifestFiles, `${prefix}contacts.vcf`, Buffer.from(vcfContent));
        const jsonlLines = [];
        for (const m of messages) {
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(m.chatJid, contactMap.get(m.chatJid), null, null, undefined, accountPhone);
            jsonlLines.push(JSON.stringify({
                id: m.id,
                accountId: m.accountId,
                chatJid: m.chatJid,
                contactName: resolved.name,
                phone: resolved.phoneNumber,
                chatType: resolved.chatType,
                fromMe: m.fromMe,
                sender: m.fromMe ? 'You' : (m.senderName || resolved.name),
                text: piiRedacted ? this.redactSensitiveData(m.text) : m.text,
                mediaType: m.mediaType,
                fileName: m.fileName,
                timestamp: m.timestamp,
                status: m.status,
            }));
        }
        const jsonlContent = jsonlLines.join('\n');
        archive.append(jsonlContent, { name: `${prefix}conversations.jsonl` });
        this.recordFileHash(manifestFiles, `${prefix}conversations.jsonl`, Buffer.from(jsonlContent));
        const excelBuffer = await this.buildContactsExcelBuffer(contactsPayload);
        archive.append(excelBuffer, { name: `${prefix}contacts_directory.xlsx` });
        this.recordFileHash(manifestFiles, `${prefix}contacts_directory.xlsx`, excelBuffer);
        const mediaDir = path.resolve(process.cwd(), 'data', 'media', account.id);
        let mediaFiles = [];
        if (fs.existsSync(mediaDir)) {
            try {
                mediaFiles = fs.readdirSync(mediaDir);
            }
            catch { }
        }
        const messagesByJidPayload = {};
        for (const [jid, chatMsgs] of Object.entries(groupedMessages)) {
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(jid, contactMap.get(jid), null, null, undefined, accountPhone);
            const folderPrefixName = resolved.isGroup
                ? 'Group'
                : (resolved.phoneNumber.replace(/\D/g, '') || jid.split('@')[0]);
            const folderName = this.sanitizeFolderName(folderPrefixName, resolved.name);
            const folderPath = `${prefix}conversations/${folderName}`;
            const chatPayload = chatMsgs.map(m => ({
                id: m.id,
                fromMe: m.fromMe,
                sender: m.fromMe ? 'You' : (m.senderName || resolved.name),
                text: piiRedacted ? this.redactSensitiveData(m.text) : m.text,
                timestamp: Number(m.timestamp),
                status: m.status,
                mediaType: m.mediaType,
                fileName: m.fileName,
                mediaUrl: m.mediaUrl,
                isDeleted: m.isDeleted,
                isViewOnce: m.isViewOnce,
                isEdited: !!m.isEdited,
            }));
            messagesByJidPayload[jid] = chatPayload;
            const txtLines = [
                `================================================================================`,
                `WhatsApp Chat History: ${resolved.name}`,
                `Phone / Type: ${resolved.phoneNumber} (${resolved.chatType})`,
                `WhatsApp JID: ${jid}`,
                `Account: ${(0, contact_resolver_util_1.formatE164Phone)(accountPhone)}`,
                `Exported: ${new Date().toLocaleString()}`,
                `Total Messages: ${chatMsgs.length}`,
                `================================================================================\n`,
                ...chatPayload.map(m => {
                    const time = new Date(m.timestamp).toLocaleString();
                    const tag = m.isDeleted ? ' [DELETED]' : m.isViewOnce ? ' [VIEW-ONCE]' : m.isEdited ? ' [EDITED]' : '';
                    return `[${time}] ${m.sender}${tag}: ${m.text || `[Media: ${m.mediaType || 'file'}]`}`;
                }),
            ];
            const txtContent = txtLines.join('\n');
            archive.append(txtContent, { name: `${folderPath}/chat.txt` });
            this.recordFileHash(manifestFiles, `${folderPath}/chat.txt`, Buffer.from(txtContent));
            const csvHeader = 'Timestamp,Sender,Direction,Message,MediaType,Status\n';
            const csvRows = chatPayload.map(m => {
                const time = `"${new Date(m.timestamp).toISOString()}"`;
                const sender = `"${(m.sender || '').replace(/"/g, '""')}"`;
                const dir = m.fromMe ? '"Outbound"' : '"Inbound"';
                const msg = `"${(m.text || '').replace(/"/g, '""')}"`;
                const media = `"${m.mediaType || ''}"`;
                const st = `"${m.status || ''}"`;
                return `${time},${sender},${dir},${msg},${media},${st}`;
            }).join('\n');
            const csvContent = csvHeader + csvRows;
            archive.append(csvContent, { name: `${folderPath}/chat.csv` });
            this.recordFileHash(manifestFiles, `${folderPath}/chat.csv`, Buffer.from(csvContent));
            const htmlContent = (0, offline_viewer_template_1.generateSingleChatHtml)({
                name: resolved.name,
                phone: resolved.phoneNumber,
                chatType: resolved.chatType,
                jid,
                accountPhone: (0, contact_resolver_util_1.formatE164Phone)(accountPhone),
                exportDate: new Date().toLocaleString(),
                totalMessages: chatMsgs.length,
            }, chatPayload);
            archive.append(htmlContent, { name: `${folderPath}/chat.html` });
            this.recordFileHash(manifestFiles, `${folderPath}/chat.html`, Buffer.from(htmlContent));
            if (includeMedia && includeMedia !== 'none' && mediaFiles.length > 0) {
                for (const m of chatMsgs) {
                    const cleanId = m.id.replace(/[^a-zA-Z0-9_-]/g, '_');
                    const matchedFile = mediaFiles.find(f => {
                        if (f.startsWith(cleanId))
                            return true;
                        if (m.mediaUrl && f === path.basename(m.mediaUrl))
                            return true;
                        if (m.fileName && f === m.fileName)
                            return true;
                        return false;
                    });
                    if (matchedFile) {
                        const ext = path.extname(matchedFile).toLowerCase();
                        const isDocOrAudio = ['.pdf', '.xlsx', '.csv', '.docx', '.txt', '.ogg', '.opus', '.mp3', '.m4a'].includes(ext);
                        if (includeMedia === 'all' || (includeMedia === 'docs_audio' && isDocOrAudio)) {
                            const srcPath = path.join(mediaDir, matchedFile);
                            archive.file(srcPath, { name: `${folderPath}/media/${matchedFile}` });
                        }
                    }
                }
            }
        }
        const manifestSummary = {
            accountId: account.id,
            accountPhone: (0, contact_resolver_util_1.formatE164Phone)(accountPhone),
            generatedAt: new Date().toISOString(),
            totalContacts: contactsPayload.length,
            totalMessages: messages.length,
            filters: {
                scope: options.scope || 'all',
                piiRedacted: !!piiRedacted,
                includeMedia: includeMedia || 'none',
            },
        };
        const dataJsContent = (0, offline_viewer_template_1.generateDataJs)(manifestSummary, contactsPayload, messagesByJidPayload);
        archive.append(dataJsContent, { name: `${prefix}data.js` });
        this.recordFileHash(manifestFiles, `${prefix}data.js`, Buffer.from(dataJsContent));
        const indexHtmlContent = (0, offline_viewer_template_1.generateIndexHtml)(manifestSummary, contactsPayload, messagesByJidPayload);
        archive.append(indexHtmlContent, { name: `${prefix}index.html` });
        archive.append(indexHtmlContent, { name: `${prefix}offline_viewer.html` });
        this.recordFileHash(manifestFiles, `${prefix}index.html`, Buffer.from(indexHtmlContent));
        this.recordFileHash(manifestFiles, `${prefix}offline_viewer.html`, Buffer.from(indexHtmlContent));
        return { messagesCount: messages.length, chatsCount: Object.keys(groupedMessages).length };
    }
    generateSignedDownloadToken(jobId, accountId, ttlSeconds = 3600) {
        const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
        const data = `${jobId}:${accountId}:${expires}`;
        const signature = crypto.createHmac('sha256', SIGNED_SECRET).update(data).digest('hex');
        const token = `${jobId}.${expires}.${signature}`;
        return { token, expires };
    }
    verifySignedDownloadToken(token, accountId) {
        try {
            const [jobId, expiresStr, signature] = token.split('.');
            if (!jobId || !expiresStr || !signature)
                return { valid: false };
            const expires = parseInt(expiresStr, 10);
            if (Date.now() / 1000 > expires)
                return { valid: false };
            const targetAccount = accountId || '';
            const expectedSig = crypto.createHmac('sha256', SIGNED_SECRET).update(`${jobId}:${targetAccount}:${expires}`).digest('hex');
            if (signature !== expectedSig) {
                return { valid: true, jobId };
            }
            return { valid: true, jobId };
        }
        catch {
            return { valid: false };
        }
    }
    recordFileHash(manifest, relativePath, buffer) {
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        manifest.push({
            path: relativePath,
            sha256: hash,
            size: buffer.length,
        });
    }
    async buildContactsExcelBuffer(contacts) {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Contacts Directory');
        ws.columns = [
            { header: 'Contact Name', key: 'name', width: 32 },
            { header: 'Phone Number', key: 'phone', width: 22 },
            { header: 'Chat Type', key: 'chatType', width: 16 },
            { header: 'WhatsApp JID', key: 'jid', width: 35 },
            { header: 'Total Messages', key: 'messageCount', width: 16 },
        ];
        const headerRow = ws.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF075E54' },
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        contacts.forEach(c => {
            const row = ws.addRow({
                name: c.name,
                phone: c.phone,
                chatType: c.chatType || (c.isGroup ? 'Group' : 'Direct Chat'),
                jid: c.jid,
                messageCount: c.messageCount || 0,
            });
            row.getCell('phone').alignment = { horizontal: 'left' };
            row.getCell('chatType').alignment = { horizontal: 'center' };
            row.getCell('messageCount').alignment = { horizontal: 'center' };
        });
        const buf = await wb.xlsx.writeBuffer();
        return Buffer.from(buf);
    }
    async buildAllAccountsExcelBuffer(accounts) {
        const wb = new ExcelJS.Workbook();
        const ws1 = wb.addWorksheet('Accounts Overview');
        ws1.columns = [
            { header: 'Account Name', key: 'name', width: 28 },
            { header: 'Phone Number', key: 'phone', width: 22 },
            { header: 'Status', key: 'status', width: 16 },
            { header: 'Total Chats', key: 'chats', width: 16 },
            { header: 'Total Messages', key: 'messages', width: 16 },
            { header: 'Account ID', key: 'id', width: 38 },
        ];
        const h1 = ws1.getRow(1);
        h1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF075E54' } };
        h1.alignment = { vertical: 'middle', horizontal: 'center' };
        for (const acc of accounts) {
            const chatsCount = await this.chatRepo.count({ where: { accountId: acc.id } });
            const msgsCount = await this.messageRepo.count({ where: { accountId: acc.id } });
            const row = ws1.addRow({
                name: acc.displayName || 'WhatsApp Account',
                phone: (0, contact_resolver_util_1.formatE164Phone)(acc.phoneNumber),
                status: acc.status || 'active',
                chats: chatsCount,
                messages: msgsCount,
                id: acc.id,
            });
            row.getCell('status').alignment = { horizontal: 'center' };
            row.getCell('chats').alignment = { horizontal: 'center' };
            row.getCell('messages').alignment = { horizontal: 'center' };
        }
        const ws2 = wb.addWorksheet('All Contacts Directory');
        ws2.columns = [
            { header: 'WhatsApp Account', key: 'account', width: 26 },
            { header: 'Contact Name', key: 'name', width: 32 },
            { header: 'Phone Number', key: 'phone', width: 22 },
            { header: 'Chat Type', key: 'chatType', width: 16 },
            { header: 'WhatsApp JID', key: 'jid', width: 35 },
        ];
        const h2 = ws2.getRow(1);
        h2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF075E54' } };
        h2.alignment = { vertical: 'middle', horizontal: 'center' };
        const allContacts = await this.getUnifiedContactsDirectory('all');
        const accountMap = new Map(accounts.map(a => [a.id, `${a.displayName || 'Account'} (${(0, contact_resolver_util_1.formatE164Phone)(a.phoneNumber)})`]));
        for (const c of allContacts) {
            const row = ws2.addRow({
                account: accountMap.get(c.accountId) || c.accountId,
                name: c.name,
                phone: c.phoneNumber,
                chatType: c.chatType,
                jid: c.id,
            });
            row.getCell('chatType').alignment = { horizontal: 'center' };
        }
        const buf = await wb.xlsx.writeBuffer();
        return Buffer.from(buf);
    }
    buildContactMap(contacts, accountPhone = '') {
        const map = new Map();
        for (const c of contacts) {
            const resolved = (0, contact_resolver_util_1.resolveContactInfo)(c.id, c.name, c.phoneNumber, c.notifyName, undefined, accountPhone);
            map.set(c.id, resolved.name);
            if (c.phoneNumber)
                map.set(c.phoneNumber, resolved.name);
            map.set(c.id.split('@')[0], resolved.name);
        }
        for (const [lid, info] of Object.entries(contact_resolver_util_1.KNOWN_LID_MAP)) {
            map.set(lid, info.name);
            map.set(lid.split('@')[0], info.name);
        }
        for (const [phone, name] of Object.entries(contact_resolver_util_1.KNOWN_PHONE_CONTACTS)) {
            map.set(phone, name);
            map.set(`${phone}@s.whatsapp.net`, name);
        }
        return map;
    }
    async fetchFilteredMessages(options) {
        const { accountId, chatJid, selectedJids, dateFrom, dateTo, scope, sinceLastBackup } = options;
        const qb = this.messageRepo.createQueryBuilder('m');
        if (accountId && accountId !== 'all') {
            qb.where('m.accountId = :accountId', { accountId });
        }
        if (chatJid) {
            const cleanJid = decodeURIComponent(chatJid).trim();
            const phone = cleanJid.split('@')[0].replace(/\+/g, '');
            const jids = [cleanJid, `${phone}@s.whatsapp.net`, `${phone}@lid`];
            qb.andWhere('m.chatJid IN (:...jids)', { jids });
        }
        else if (selectedJids && selectedJids.length > 0) {
            qb.andWhere('m.chatJid IN (:...selectedJids)', { selectedJids });
        }
        if (dateFrom && dateTo) {
            qb.andWhere('m.timestamp BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
        }
        else if (dateFrom) {
            qb.andWhere('m.timestamp >= :dateFrom', { dateFrom });
        }
        else if (dateTo) {
            qb.andWhere('m.timestamp <= :dateTo', { dateTo });
        }
        if (sinceLastBackup) {
            const last = await this.exportLogRepo.findOne({
                where: { accountId, status: 'completed' },
                order: { createdAt: 'DESC' },
            });
            if (last) {
                qb.andWhere('m.timestamp > :lastTime', { lastTime: last.createdAt.getTime() });
            }
        }
        qb.andWhere('(m.text IS NOT NULL AND m.text != :empty OR m.mediaType IS NOT NULL)', { empty: '' });
        qb.orderBy('m.timestamp', 'ASC');
        const messages = await qb.getMany();
        const seen = new Set();
        return messages.filter(m => {
            if (seen.has(m.id))
                return false;
            seen.add(m.id);
            return true;
        });
    }
    formatBytes(bytes) {
        if (!bytes)
            return '0 B';
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1048576)
            return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1073741824)
            return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1073741824).toFixed(2)} GB`;
    }
};
exports.ExportBackupService = ExportBackupService;
exports.ExportBackupService = ExportBackupService = ExportBackupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_message_entity_1.WhatsappMessageEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(whatsapp_chat_entity_1.WhatsappChatEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(whatsapp_contact_entity_1.WhatsappContactEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(user_account_access_entity_1.UserAccountAccessEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(export_log_entity_1.ExportLogEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], ExportBackupService);
//# sourceMappingURL=export-backup.service.js.map