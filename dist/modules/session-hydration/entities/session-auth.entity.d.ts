import { WhatsappAccountEntity } from './whatsapp-account.entity';
export declare class SessionAuthEntity {
    id: string;
    accountId: string;
    account: WhatsappAccountEntity;
    encryptedCreds: string;
    encryptedKeys?: string;
    iv: string;
    version: number;
    checksum: string;
    isActive: boolean;
    expiresAt?: Date;
    hydratedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
