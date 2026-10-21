import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
export type MediaType = 'image' | 'audio' | 'video' | 'document' | 'sticker';
export declare class MediaObjectEntity {
    id: string;
    accountId?: string;
    account?: WhatsappAccountEntity;
    messageId: string;
    mediaType: MediaType;
    originalFilename?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    r2Key: string;
    cdnUrl?: string;
    presignedUrl?: string;
    presignedUrlExpiry?: Date;
    checksumSha256?: string;
    isDeleted: boolean;
    createdAt: Date;
}
