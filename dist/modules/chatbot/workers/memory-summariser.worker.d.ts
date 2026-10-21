import { WorkerHost } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ConversationMemoryEntity } from '../entities/conversation-memory.entity';
export declare class MemorySummariserWorker extends WorkerHost {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<ConversationMemoryEntity>);
    process(job: Job): Promise<void>;
}
