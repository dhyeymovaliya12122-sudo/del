export interface ResolvedContactInfo {
    jid: string;
    name: string;
    phoneNumber: string;
    displayPhone: string;
    isGroup: boolean;
    chatType: 'Group' | 'Direct Chat' | 'Self';
}
export declare const KNOWN_LID_MAP: Record<string, {
    name: string;
    phone: string;
}>;
export declare const KNOWN_PHONE_CONTACTS: Record<string, string>;
export declare function isLidIdentifier(id: string | undefined | null): boolean;
export declare function cleanSenderJid(jid: string | undefined | null): string;
export declare function formatE164Phone(rawPhone: string | undefined | null): string;
export declare const formatE164: typeof formatE164Phone;
export declare function isGroupJid(jid: string | undefined | null): boolean;
export interface UnifiedContactEntry {
    id: string;
    name: string;
    phoneNumber: string;
    chatType: 'Group' | 'Direct Chat' | 'Self';
    isGroup: boolean;
    notifyName: string;
    unreadCount?: number;
    lastMessageTimestamp?: number;
    source: 'chat' | 'saved_contact';
    accountId: string;
}
export declare function buildUnifiedContactsDirectory(chats: Array<{
    id: string;
    name?: string;
    isGroup?: boolean;
    unreadCount?: number;
    lastMessageTimestamp?: number | string;
    accountId?: string;
}>, contacts: Array<{
    id: string;
    name?: string;
    phoneNumber?: string;
    notifyName?: string;
    accountId?: string;
}>, accountPhone?: string, defaultAccountId?: string): UnifiedContactEntry[];
export declare const UNIVERSAL_IDENTITY_REGISTRY: Map<string, {
    name: string;
    phone?: string;
}>;
export declare function isProperName(n?: string | null): boolean;
export declare function isEmojiOnly(n?: string | null): boolean;
export declare function registerUniversalContact(idOrPhone: string, name: string, phone?: string): void;
export declare function resolveContactInfo(jid: string, providedName?: string | null, providedPhone?: string | null, notifyName?: string | null, isGroupFlag?: boolean, activeAccountPhone?: string): ResolvedContactInfo;
