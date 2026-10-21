import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { downloadMediaMessage, WASocket } from 'baileys';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import { WhatsappMessageEntity } from '../entities/whatsapp-message.entity';

@Injectable()
export class BaileysMediaPipelineService {
  private readonly logger = new Logger(BaileysMediaPipelineService.name);

  constructor(
    @InjectRepository(WhatsappMessageEntity)
    private readonly messageRepo: Repository<WhatsappMessageEntity>,
  ) {}

  /**
   * Resolves the media extension from MIME type, file name, or media category.
   */
  resolveExtension(mimeType?: string, fileName?: string, mediaType?: string): string {
    const mt = (mimeType || '').toLowerCase();
    const fn = (fileName || '').toLowerCase();

    if (mt.includes('jpeg') || mt.includes('jpg')) return 'jpg';
    if (mt.includes('png')) return 'png';
    if (mt.includes('webp')) return 'webp';
    if (mt.includes('mp4')) return 'mp4';
    if (mt.includes('ogg') || mt.includes('opus')) return 'ogg';
    if (mt.includes('mp3') || mt.includes('mpeg')) return 'mp3';
    if (mt.includes('pdf')) return 'pdf';
    if (mt.includes('sheet') || mt.includes('excel')) return 'xlsx';
    if (mt.includes('word')) return 'docx';
    if (mt.includes('heic') || mt.includes('heif')) return 'heic';
    if (fn.includes('.')) return fn.split('.').pop() || 'bin';
    if (mediaType === 'image') return 'jpg';
    if (mediaType === 'video') return 'mp4';
    if (mediaType === 'audio') return 'ogg';
    return 'bin';
  }

  /**
   * Downloads a media buffer from a Baileys message and writes it to disk.
   */
  async downloadAndPersistMedia(
    accountId: string,
    messageId: string,
    messageStub: any,
    socket: WASocket,
    options: {
      mediaType?: string;
      mimeType?: string;
      fileName?: string;
    },
  ): Promise<string | null> {
    try {
      const cleanAccountId = accountId.replace(/[^a-zA-Z0-9_-]/g, '');
      const cleanMsgId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = this.resolveExtension(options.mimeType, options.fileName, options.mediaType);
      const filename = `${cleanMsgId}.${ext}`;

      const mediaDir = path.resolve(process.cwd(), 'data', 'media', cleanAccountId);
      await fs.promises.mkdir(mediaDir, { recursive: true });

      const destPath = path.resolve(mediaDir, filename);

      const buffer = await Promise.race([
        downloadMediaMessage(messageStub, 'buffer', {}, {
          logger: pino({ level: 'silent' }) as any,
          reuploadRequest: (socket as any).updateMediaMessage?.bind(socket),
        }),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 25000)),
      ]).catch(() => null);

      if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
        await fs.promises.writeFile(destPath, buffer);
        const relativeUrl = `/api/v1/whatsapp/media/${cleanAccountId}/${filename}`;
        return relativeUrl;
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`Media download failed for [${messageId}]: ${err.message}`);
      return null;
    }
  }

  /**
   * Scans disk and database to repair missing media URLs and re-downloads missing media.
   */
  async repairMediaUrls(
    accountId: string,
    getActiveSocket?: (accountId: string) => WASocket | undefined,
  ): Promise<{ fixed: number; redownloaded: number; failed: number }> {
    this.logger.log(`🔧 [MediaRepair] Starting media repair for account [${accountId}]...`);

    const mediaDir = path.resolve(process.cwd(), 'data', 'media', accountId);
    await fs.promises.mkdir(mediaDir, { recursive: true });

    const mediaRoot = path.resolve(process.cwd(), 'data', 'media');
    const allMediaDirs: string[] = [];
    try {
      const entries = await fs.promises.readdir(mediaRoot, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) {
          allMediaDirs.push(path.join(mediaRoot, e.name));
        }
      }
    } catch { /* ignore */ }

    const fileIndex = new Map<string, string>();
    for (const dir of allMediaDirs) {
      try {
        const files = await fs.promises.readdir(dir);
        for (const f of files) {
          const stem = path.parse(f).name;
          if (!fileIndex.has(stem)) {
            fileIndex.set(stem, path.join(dir, f));
          }
        }
      } catch { /* ignore */ }
    }

    let fixed = 0;
    const missingAfterPass1: WhatsappMessageEntity[] = [];

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

      if (batch.length === 0) break;
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
            } catch { /* ignore */ }
          }

          const effectivePath = fs.existsSync(destPath) ? destPath : foundPath;
          const relParts = effectivePath.replace(/\\/g, '/').split('/data/media/');
          const urlAccountId = relParts[1]?.split('/')[0] || accountId;
          const urlFilename = relParts[1]?.split('/').slice(1).join('/') || destFilename;
          const mediaUrl = `/api/v1/whatsapp/media/${urlAccountId}/${urlFilename}`;

          await this.messageRepo.update({ id: msg.id, accountId }, { mediaUrl }).catch(() => null);
          fixed++;
        } else {
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
      if (!msg.chatJid) { failed++; continue; }
      try {
        const ext = this.resolveExtension(msg.mimeType, msg.fileName, msg.mediaType);
        const cleanId = msg.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${cleanId}.${ext}`;
        const filePath = path.join(mediaDir, filename);

        const mediaFieldMap: Record<string, string> = {
          image: 'imageMessage', video: 'videoMessage',
          audio: 'audioMessage', document: 'documentMessage', sticker: 'stickerMessage',
        };
        const msgField = mediaFieldMap[msg.mediaType || ''] || 'imageMessage';
        const stub: any = {
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
        if ((sock as any).updateMediaMessage) {
          const refreshed = await Promise.race([
            (sock as any).updateMediaMessage(stub),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 10000)),
          ]).catch(() => null);
          if (refreshed) msgToDownload = refreshed;
        }

        const buffer = await Promise.race([
          downloadMediaMessage(msgToDownload, 'buffer', {}, {
            logger: pino({ level: 'silent' }) as any,
            reuploadRequest: (sock as any).updateMediaMessage?.bind(sock),
          }),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 20000)),
        ]).catch(() => null);

        if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
          await fs.promises.writeFile(filePath, buffer);
          const mediaUrl = `/api/v1/whatsapp/media/${accountId}/${filename}`;
          await this.messageRepo.update({ id: msg.id, accountId }, { mediaUrl }).catch(() => null);
          redownloaded++;
        } else {
          failed++;
        }
      } catch (err: any) {
        this.logger.warn(`🔧 [MediaRepair] Re-download failed for [${msg.id}]: ${err.message}`);
        failed++;
      }
    }

    this.logger.log(`🔧 [MediaRepair] Repaired ${fixed + redownloaded} media URLs for account [${accountId}]`);
    return { fixed, redownloaded, failed };
  }
}
