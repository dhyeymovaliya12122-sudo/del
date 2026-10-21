import { Repository } from 'typeorm';
import { WASocket } from 'baileys';
import { WhatsappMessageEntity } from '../entities/whatsapp-message.entity';
export declare class BaileysMediaPipelineService {
    private readonly messageRepo;
    private readonly logger;
    constructor(messageRepo: Repository<WhatsappMessageEntity>);
    resolveExtension(mimeType?: string, fileName?: string, mediaType?: string): string;
    downloadAndPersistMedia(accountId: string, messageId: string, messageStub: any, socket: WASocket, options: {
        mediaType?: string;
        mimeType?: string;
        fileName?: string;
    }): Promise<string | null>;
    repairMediaUrls(accountId: string, getActiveSocket?: (accountId: string) => WASocket | undefined): Promise<{
        fixed: number;
        redownloaded: number;
        failed: number;
    }>;
}
