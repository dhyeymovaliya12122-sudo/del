import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { ConversationMemoryEntity } from '../entities/conversation-memory.entity';
import { ChatSessionState } from './chatbot-state-machine.service';
export declare class MemoryService {
    private readonly repo;
    private readonly queue;
    private readonly logger;
    constructor(repo: Repository<ConversationMemoryEntity>, queue: Queue);
    hydrate(accountId: string, senderJid: string): Promise<Record<string, any>>;
    persist(accountId: string, senderJid: string, session: ChatSessionState): Promise<void>;
}
