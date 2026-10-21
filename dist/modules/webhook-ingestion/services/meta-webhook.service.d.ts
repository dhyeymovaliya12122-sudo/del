import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
import { WhatsappChatEntity } from '../../session-hydration/entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../../session-hydration/entities/whatsapp-contact.entity';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import { RealtimeEventService } from '../../realtime-gateway/services/realtime-event.service';
export interface MetaWebhookMessage {
    id: string;
    from: string;
    timestamp: string;
    type: string;
    text?: {
        body: string;
    };
    image?: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    video?: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    audio?: {
        id: string;
        mime_type: string;
        sha256: string;
        voice?: boolean;
    };
    document?: {
        id: string;
        mime_type: string;
        sha256: string;
        filename?: string;
        caption?: string;
    };
    sticker?: {
        id: string;
        mime_type: string;
        sha256: string;
        animated: boolean;
    };
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    };
    reaction?: {
        message_id: string;
        emoji: string;
    };
    interactive?: {
        type: string;
        button_reply?: {
            title: string;
        };
        list_reply?: {
            title: string;
        };
    };
    context?: {
        from: string;
        id: string;
    };
}
export interface MetaWebhookStatus {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
}
export interface MetaWebhookContact {
    profile: {
        name: string;
    };
    wa_id: string;
}
export declare class MetaWebhookService {
    private readonly messageRepo;
    private readonly chatRepo;
    private readonly contactRepo;
    private readonly accountRepo;
    private readonly realtimeService;
    private readonly config;
    private readonly logger;
    constructor(messageRepo: Repository<WhatsappMessageEntity>, chatRepo: Repository<WhatsappChatEntity>, contactRepo: Repository<WhatsappContactEntity>, accountRepo: Repository<WhatsappAccountEntity>, realtimeService: RealtimeEventService, config: ConfigService);
    processPayload(body: any): Promise<void>;
    private resolveAccount;
    private processIncomingMessage;
    private extractContent;
    private upsertContact;
    private upsertChat;
    private processStatusUpdate;
    private broadcast;
}
