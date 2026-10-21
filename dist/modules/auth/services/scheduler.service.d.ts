import { Repository } from 'typeorm';
import { ScheduledMessageEntity, ScheduleRepeat } from '../entities/scheduled-message.entity';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
export declare class SchedulerService {
    private readonly scheduledRepo;
    private readonly baileysFactory;
    private readonly logger;
    constructor(scheduledRepo: Repository<ScheduledMessageEntity>, baileysFactory: BaileysClientFactory);
    processDueMessages(): Promise<void>;
    createScheduledMessage(data: {
        accountId: string;
        toJid: string;
        messageText?: string;
        scheduledAt: Date;
        repeatType?: ScheduleRepeat;
        caption?: string;
    }): Promise<{
        id: string;
        accountId: string;
        toJid: string;
        messageText: string;
        scheduledAt: Date;
        repeatType: ScheduleRepeat;
        caption: string;
        status: "pending";
    } & ScheduledMessageEntity>;
    getScheduledMessages(accountId: string): Promise<ScheduledMessageEntity[]>;
    cancelScheduledMessage(id: string, accountId: string): Promise<{
        success: boolean;
    }>;
    deleteScheduledMessage(id: string, accountId: string): Promise<{
        success: boolean;
    }>;
}
