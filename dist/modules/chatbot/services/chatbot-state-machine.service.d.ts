import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { ChatbotService } from './chatbot.service';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
import { InjectionShieldService } from './injection-shield.service';
import { MemoryService } from './memory.service';
import { RagService } from './rag.service';
import { EscalationAgentService } from './escalation-agent.service';
import { AnalyticsEmitterService } from './analytics-emitter.service';
export interface ChatSessionState {
    flowId: string;
    currentNodeId: string;
    variables: Record<string, any>;
    enteredAt: number;
    lastActivityAt: number;
    status: 'ACTIVE' | 'WAITING_INPUT' | 'COMPLETED' | 'ESCALATED';
    transcript?: string[];
}
export interface FlowNodeAST {
    id: string;
    type: 'trigger' | 'message' | 'condition' | 'input_capture' | 'wait' | 'escalate' | 'knowledge_base';
    data?: {
        text?: string;
        keyword?: string;
        conditionExpression?: string;
        variableName?: string;
        waitMs?: number;
        escalateMessage?: string;
    };
    position?: {
        x: number;
        y: number;
    };
}
export interface FlowEdgeAST {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
}
export declare class ChatbotStateMachineService {
    private readonly redis;
    private readonly chatbotService;
    private readonly baileysFactory;
    private readonly config;
    private readonly injectionShield;
    private readonly memoryService;
    private readonly ragService;
    private readonly escalationAgent;
    private readonly analyticsEmitter;
    private readonly logger;
    private readonly SESSION_TTL;
    private readonly HUMAN_PAUSE_TTL;
    private readonly llmIntentEnabled;
    private readonly typingIndicatorEnabled;
    private readonly shieldEnabled;
    private readonly memoryEnabled;
    private readonly ragEnabled;
    private readonly escalationAgentEnabled;
    private readonly analyticsEnabled;
    private readonly llmTimeoutMs;
    constructor(redis: Redis, chatbotService: ChatbotService, baileysFactory: BaileysClientFactory, config: ConfigService, injectionShield: InjectionShieldService, memoryService: MemoryService, ragService: RagService, escalationAgent: EscalationAgentService, analyticsEmitter: AnalyticsEmitterService);
    private sessionKey;
    private pauseKey;
    pauseChatbot(accountId: string, chatJid: string, durationSec?: number): Promise<void>;
    resumeChatbot(accountId: string, chatJid: string): Promise<void>;
    isChatbotPaused(accountId: string, chatJid: string): Promise<boolean>;
    getSession(accountId: string, senderJid: string): Promise<ChatSessionState | null>;
    saveSession(accountId: string, senderJid: string, session: ChatSessionState): Promise<void>;
    clearSession(accountId: string, senderJid: string): Promise<void>;
    handleStaffMessageSent({ accountId, chatJid }: {
        accountId: string;
        chatJid: string;
    }): Promise<void>;
    handleIncomingMessage({ accountId, message, }: {
        accountId: string;
        message: Partial<WhatsappMessageEntity>;
    }): Promise<void>;
    private resolveFlow;
    private startFlow;
    private progressFlow;
    private executeNode;
    private interpolateVariables;
}
