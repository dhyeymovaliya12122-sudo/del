import { Repository } from 'typeorm';
import { ChatbotFlowEntity } from '../entities/chatbot-flow.entity';
export interface CreateFlowDto {
    accountId: string;
    name: string;
    triggerKeyword?: string;
    isRegex?: boolean;
    nodes?: any[];
    edges?: any[];
    escalateToHuman?: boolean;
    escalateMessage?: string;
}
export declare class ChatbotService {
    private readonly flowRepo;
    private readonly logger;
    constructor(flowRepo: Repository<ChatbotFlowEntity>);
    findAll(accountId?: string): Promise<ChatbotFlowEntity[]>;
    findOne(id: string): Promise<ChatbotFlowEntity>;
    create(dto: CreateFlowDto): Promise<ChatbotFlowEntity>;
    update(id: string, dto: Partial<CreateFlowDto>): Promise<ChatbotFlowEntity>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    toggleActive(id: string): Promise<{
        isActive: boolean;
    }>;
    matchFlow(accountId: string, messageText: string): Promise<ChatbotFlowEntity | null>;
    testFlow(id: string, testMessage: string): Promise<{
        matched: boolean;
        response?: string;
        escalate?: boolean;
    }>;
}
