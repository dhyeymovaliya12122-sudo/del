import { SessionAuthEntity } from './session-auth.entity';
export type AccountStatus = 'pending' | 'active' | 'banned' | 'disconnected' | 'qr_pending';
export declare class WhatsappAccountEntity {
    id: string;
    phoneNumber: string;
    displayName?: string;
    status: AccountStatus;
    proxyId?: string;
    session?: SessionAuthEntity;
    createdAt: Date;
    updatedAt: Date;
}
