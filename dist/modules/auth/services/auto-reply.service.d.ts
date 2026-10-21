import { Repository } from 'typeorm';
import { AutoReplyRuleEntity } from '../entities/auto-reply-rule.entity';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
export declare class AutoReplyService {
    private readonly ruleRepo;
    private readonly baileysFactory;
    private readonly logger;
    private readonly recentReplies;
    constructor(ruleRepo: Repository<AutoReplyRuleEntity>, baileysFactory: BaileysClientFactory);
    processIncomingMessage({ accountId, message }: {
        accountId: string;
        message: Partial<WhatsappMessageEntity>;
    }): Promise<void>;
    private matchesRule;
    private isWithinBusinessHours;
    createRule(data: Partial<AutoReplyRuleEntity>): Promise<{
        id: string;
        matchCount: number;
        replyCount: number;
        accountId?: string;
        name?: string;
        triggerType?: "keyword" | "regex" | "new_contact" | "any" | "contains";
        triggerValue?: string;
        replyMessage?: string;
        isActive?: boolean;
        onlyOutsideHours?: boolean;
        businessHoursStart?: string;
        businessHoursEnd?: string;
        createdAt?: Date;
        updatedAt?: Date;
    } & AutoReplyRuleEntity>;
    getRules(accountId: string): Promise<AutoReplyRuleEntity[]>;
    updateRule(id: string, data: Partial<AutoReplyRuleEntity>): Promise<AutoReplyRuleEntity>;
    deleteRule(id: string): Promise<{
        success: boolean;
    }>;
    toggleRule(id: string): Promise<{
        id: string;
        isActive: boolean;
    }>;
}
