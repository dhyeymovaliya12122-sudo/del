export declare function escapeHtml(str: string): string;
export declare function generateDataJs(manifest: any, contacts: any[], messagesMap: Record<string, any[]>): string;
export declare function generateSingleChatHtml(chatInfo: {
    name: string;
    phone: string;
    jid: string;
    chatType?: string;
    accountPhone: string;
    exportDate: string;
    totalMessages: number;
}, messages: any[]): string;
export declare function generateIndexHtml(manifest: any, contacts?: any[], messagesMap?: Record<string, any[]>): string;
