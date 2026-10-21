export declare class ChatbotFlowEntity {
    id: string;
    accountId: string;
    name: string;
    triggerKeyword?: string;
    isRegex: boolean;
    isActive: boolean;
    nodes: string;
    edges: string;
    escalateToHuman: boolean;
    escalateMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}
