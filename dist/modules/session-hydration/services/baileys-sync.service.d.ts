import { Repository } from 'typeorm';
import { WASocket } from 'baileys';
import { WhatsappChatEntity } from '../entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../entities/whatsapp-contact.entity';
import { WhatsappMessageEntity } from '../entities/whatsapp-message.entity';
import { WhatsappAccountEntity } from '../entities/whatsapp-account.entity';
export declare class BaileysSyncService {
    private readonly chatRepo;
    private readonly contactRepo;
    private readonly messageRepo;
    private readonly accountRepo?;
    private readonly logger;
    constructor(chatRepo: Repository<WhatsappChatEntity>, contactRepo: Repository<WhatsappContactEntity>, messageRepo: Repository<WhatsappMessageEntity>, accountRepo?: Repository<WhatsappAccountEntity>);
    syncGroupsAndContacts(accountId: string, socket: WASocket, onUpdated?: () => void): Promise<void>;
    saveChat(accountId: string, chatData: {
        id: string;
        name?: string;
        isGroup?: boolean;
    }, onUpdated?: () => void): Promise<WhatsappChatEntity | null>;
    syncChatMessages(accountId: string, chatJid: string, socket: WASocket, count?: number): Promise<{
        success: boolean;
        synced: number;
    }>;
}
