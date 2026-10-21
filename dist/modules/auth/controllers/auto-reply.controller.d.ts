import { JwtService } from '@nestjs/jwt';
import { AutoReplyService } from '../services/auto-reply.service';
import { AutoReplyRuleEntity } from '../entities/auto-reply-rule.entity';
export declare class AutoReplyController {
    private readonly autoReplyService;
    private readonly jwtService;
    constructor(autoReplyService: AutoReplyService, jwtService: JwtService);
    private getUser;
    getRulesRoot(auth: string, accountId: string): Promise<AutoReplyRuleEntity[]>;
    getRules(auth: string, accountId: string): Promise<AutoReplyRuleEntity[]>;
    createRuleRoot(auth: string, body: Partial<AutoReplyRuleEntity>): Promise<{
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
    createRule(auth: string, body: Partial<AutoReplyRuleEntity>): Promise<{
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
    updateRuleById(auth: string, id: string, body: Partial<AutoReplyRuleEntity>): Promise<AutoReplyRuleEntity>;
    toggleRuleById(auth: string, id: string): Promise<{
        id: string;
        isActive: boolean;
    }>;
    updateRule(auth: string, id: string, body: Partial<AutoReplyRuleEntity>): Promise<AutoReplyRuleEntity>;
    toggleRule(auth: string, id: string): Promise<{
        id: string;
        isActive: boolean;
    }>;
    deleteRuleById(auth: string, id: string): Promise<{
        success: boolean;
    }>;
    deleteRule(auth: string, id: string): Promise<{
        success: boolean;
    }>;
}
