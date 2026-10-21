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
var BaileysMediaPipelineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaileysMediaPipelineService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const baileys_1 = require("baileys");
const fs = require("fs");
const path = require("path");
const pino_1 = require("pino");
const whatsapp_message_entity_1 = require("../entities/whatsapp-message.entity");
let BaileysMediaPipelineService = BaileysMediaPipelineService_1 = class BaileysMediaPipelineService {
    constructor(messageRepo) {
        this.messageRepo = messageRepo;
        this.logger = new common_1.Logger(BaileysMediaPipelineService_1.name);
    }
    resolveExtension(mimeType, fileName, mediaType) {
        const mt = (mimeType || '').toLowerCase();
        const fn = (fileName || '').toLowerCase();
        if (mt.includes('jpeg') || mt.includes('jpg'))
            return 'jpg';
        if (mt.includes('png'))
            return 'png';
        if (mt.includes('webp'))
            return 'webp';
        if (mt.includes('mp4'))
            return 'mp4';
        if (mt.includes('ogg') || mt.includes('opus'))
            return 'ogg';
        if (mt.includes('mp3') || mt.includes('mpeg'))
            return 'mp3';
        if (mt.includes('pdf'))
            return 'pdf';
        if (mt.includes('sheet') || mt.includes('excel'))
            return 'xlsx';
        if (mt.includes('word'))
            return 'docx';
        if (mt.includes('heic') || mt.includes('heif'))
            return 'heic';
        if (fn.includes('.'))
            return fn.split('.').pop() || 'bin';
        if (mediaType === 'image')
            return 'jpg';
        if (mediaType === 'video')
            return 'mp4';
        if (mediaType === 'audio')
            return 'ogg';
        return 'bin';
    }
    async downloadAndPersistMedia(accountId, messageId, messageStub, socket, options) {
        try {
            const cleanAccountId = accountId.replace(/[^a-zA-Z0-9_-]/g, '');
            const cleanMsgId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
            const ext = this.resolveExtension(options.mimeType, options.fileName, options.mediaType);
            const filename = `${cleanMsgId}.${ext}`;
            const mediaDir = path.resolve(process.cwd(), 'data', 'media', cleanAccountId);
            await fs.promises.mkdir(mediaDir, { recursive: true });
            const destPath = path.resolve(mediaDir, filename);
            const buffer = await Promise.race([
                (0, baileys_1.downloadMediaMessage)(messageStub, 'buffer', {}, {
                    logger: (0, pino_1.default)({ level: 'silent' }),
                    reuploadRequest: socket.updateMediaMessage?.bind(socket),
                }),
                new Promise(resolve => setTimeout(() => resolve(null), 25000)),
            ]).catch(() => null);
            if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
                await fs.promises.writeFile(destPath, buffer);
                const relativeUrl = `/api/v1/whatsapp/media/${cleanAccountId}/${filename}`;
                return relativeUrl;
            }
            return null;
        }
        catch (err) {
            this.logger.warn(`Media download failed for [${messageId}]: ${err.message}`);
            return null;
        }
    }
    async repairMediaUrls(accountId, getActiveSocket) {
        this.logger.log(`🔧 [MediaRepair] Starting media repair for account [${accountId}]...`);
        const mediaDir = path.resolve(process.cwd(), 'data', 'media', accountId);
        await fs.promises.mkdir(mediaDir, { recursive: true });
        const mediaRoot = path.resolve(process.cwd(), 'data', 'media');
        const allMediaDirs = [];
        try {
            const entries = await fs.promises.readdir(mediaRoot, { withFileTypes: true });
            for (const e of entries) {
                if (e.isDirectory()) {
                    allMediaDirs.push(path.join(mediaRoot, e.name));
                }
            }
        }
        catch { }
        const fileIndex = new Map();
        for (const dir of allMediaDirs) {
            try {
                const files = await fs.promises.readdir(dir);
                for (const f of files) {
                    const stem = path.parse(f).name;
                    if (!fileIndex.has(stem)) {
                        fileIndex.set(stem, path.join(dir, f));
                    }
                }
            }
            catch { }
        }
        let fixed = 0;
        const missingAfterPass1 = [];
        let offset = 0;
        const batchSize = 200;
        while (true) {
            const batch = await this.messageRepo
                .createQueryBuilder('msg')
                .where('msg.accountId = :accountId', { accountId })
                .andWhere('msg.mediaType IS NOT NULL')
                .andWhere('msg.mediaUrl IS NULL')
                .orderBy('msg.timestamp', 'DESC')
                .skip(offset)
                .take(batchSize)
                .getMany();
            if (batch.length === 0)
                break;
            offset += batchSize;
            for (const msg of batch) {
                const cleanId = msg.id.replace(/[^a-zA-Z0-9_-]/g, '_');
                const foundPath = fileIndex.get(cleanId);
                if (foundPath) {
                    const destFilename = path.basename(foundPath);
                    const destPath = path.join(mediaDir, destFilename);
                    if (path.dirname(foundPath) !== mediaDir) {
                        try {
                            await fs.promises.copyFile(foundPath, destPath);
                        }
                        catch { }
                    }
                    const effectivePath = fs.existsSync(destPath) ? destPath : foundPath;
                    const relParts = effectivePath.replace(/\\/g, '/').split('/data/media/');
                    const urlAccountId = relParts[1]?.split('/')[0] || accountId;
                    const urlFilename = relParts[1]?.split('/').slice(1).join('/') || destFilename;
                    const mediaUrl = `/api/v1/whatsapp/media/${urlAccountId}/${urlFilename}`;
                    await this.messageRepo.update({ id: msg.id, accountId }, { mediaUrl }).catch(() => null);
                    fixed++;
                }
                else {
                    missingAfterPass1.push(msg);
                }
            }
        }
        let redownloaded = 0;
        let failed = 0;
        const sock = getActiveSocket ? getActiveSocket(accountId) : undefined;
        if (!sock) {
            this.logger.warn(`🔧 [MediaRepair] No active socket for [${accountId}] — skipping re-download pass`);
            return { fixed, redownloaded, failed: missingAfterPass1.length };
        }
        for (const msg of missingAfterPass1) {
            if (!msg.chatJid) {
                failed++;
                continue;
            }
            try {
                const ext = this.resolveExtension(msg.mimeType, msg.fileName, msg.mediaType);
                const cleanId = msg.id.replace(/[^a-zA-Z0-9_-]/g, '_');
                const filename = `${cleanId}.${ext}`;
                const filePath = path.join(mediaDir, filename);
                const mediaFieldMap = {
                    image: 'imageMessage', video: 'videoMessage',
                    audio: 'audioMessage', document: 'documentMessage', sticker: 'stickerMessage',
                };
                const msgField = mediaFieldMap[msg.mediaType || ''] || 'imageMessage';
                const stub = {
                    key: { remoteJid: msg.chatJid, id: msg.id, fromMe: msg.fromMe },
                    message: {
                        [msgField]: {
                            mimetype: msg.mimeType || 'application/octet-stream',
                            fileName: msg.fileName,
                            fileLength: msg.fileSize,
                        },
                    },
                };
                let msgToDownload = stub;
                if (sock.updateMediaMessage) {
                    const refreshed = await Promise.race([
                        sock.updateMediaMessage(stub),
                        new Promise(resolve => setTimeout(() => resolve(null), 10000)),
                    ]).catch(() => null);
                    if (refreshed)
                        msgToDownload = refreshed;
                }
                const buffer = await Promise.race([
                    (0, baileys_1.downloadMediaMessage)(msgToDownload, 'buffer', {}, {
                        logger: (0, pino_1.default)({ level: 'silent' }),
                        reuploadRequest: sock.updateMediaMessage?.bind(sock),
                    }),
                    new Promise(resolve => setTimeout(() => resolve(null), 20000)),
                ]).catch(() => null);
                if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
                    await fs.promises.writeFile(filePath, buffer);
                    const mediaUrl = `/api/v1/whatsapp/media/${accountId}/${filename}`;
                    await this.messageRepo.update({ id: msg.id, accountId }, { mediaUrl }).catch(() => null);
                    redownloaded++;
                }
                else {
                    failed++;
                }
            }
            catch (err) {
                this.logger.warn(`🔧 [MediaRepair] Re-download failed for [${msg.id}]: ${err.message}`);
                failed++;
            }
        }
        this.logger.log(`🔧 [MediaRepair] Repaired ${fixed + redownloaded} media URLs for account [${accountId}]`);
        return { fixed, redownloaded, failed };
    }
};
exports.BaileysMediaPipelineService = BaileysMediaPipelineService;
exports.BaileysMediaPipelineService = BaileysMediaPipelineService = BaileysMediaPipelineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_message_entity_1.WhatsappMessageEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BaileysMediaPipelineService);
//# sourceMappingURL=baileys-media-pipeline.service.js.map