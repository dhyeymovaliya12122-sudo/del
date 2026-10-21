import { ChatbotService, CreateFlowDto } from '../services/chatbot.service';
export declare class ChatbotController {
    private readonly chatbotService;
    constructor(chatbotService: ChatbotService);
    findAll(accountId?: string): Promise<import("../entities/chatbot-flow.entity").ChatbotFlowEntity[]>;
    findOne(id: string): Promise<import("../entities/chatbot-flow.entity").ChatbotFlowEntity>;
    create(dto: CreateFlowDto): Promise<import("../entities/chatbot-flow.entity").ChatbotFlowEntity>;
    update(id: string, dto: Partial<CreateFlowDto>): Promise<import("../entities/chatbot-flow.entity").ChatbotFlowEntity>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    toggleActive(id: string): Promise<{
        isActive: boolean;
    }>;
    testFlow(id: string, message: string): Promise<{
        matched: boolean;
        response?: string;
        escalate?: boolean;
    }>;
}
