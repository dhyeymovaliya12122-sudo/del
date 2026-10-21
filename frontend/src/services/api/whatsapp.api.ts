/**
 * whatsapp.api.ts
 * Enterprise API client for WhatsApp Web messaging, chats, media, QR, and session lifecycle.
 * Commandments: #5 (Error handling), #10 (Scalable API structure).
 */
import { api } from './client';
import { WhatsAppChat, WhatsAppContact, WhatsAppMessage } from './types';
import { soundEffects } from '../../utils/soundEffects';

export const whatsappWebApi = {
  getChats: (
    accountId: string,
    search?: string,
    limit = 500,
    offset = 0,
    startDate?: string,
    endDate?: string,
  ) =>
    api
      .get<WhatsAppChat[]>('/whatsapp/chats', {
        params: { accountId, search, limit, offset, startDate, endDate },
      })
      .then((r) => r.data),

  getMessages: (
    accountId: string,
    chatJid: string,
    limit = 100,
    startDate?: string,
    endDate?: string,
    search?: string,
  ) =>
    api
      .get<WhatsAppMessage[]>(`/whatsapp/chats/${encodeURIComponent(chatJid)}/messages`, {
        params: {
          accountId,
          limit,
          startDate,
          endDate,
          search,
          ghostMode:
            typeof window !== 'undefined' && sessionStorage.getItem('wa_ghost_mode') === 'true'
              ? 'true'
              : undefined,
        },
      })
      .then((r) => r.data),

  getContacts: (accountId: string, search?: string) =>
    api
      .get<WhatsAppContact[]>('/whatsapp/contacts', { params: { accountId, search } })
      .then((r) => r.data),

  sendMessage: (accountId: string, to: string, text: string, quotedMsgId?: string) =>
    api
      .post<WhatsAppMessage>('/whatsapp/messages/send', { accountId, to, text, quotedMsgId })
      .then((r) => {
        soundEffects.playSentSound();
        return r.data;
      }),

  sendVoice: (accountId: string, to: string, base64Data: string, quotedMsgId?: string) =>
    api
      .post<WhatsAppMessage>('/whatsapp/messages/send-voice', {
        accountId,
        to,
        base64Data,
        quotedMsgId,
      })
      .then((r) => {
        soundEffects.playSentSound();
        return r.data;
      }),

  sendReaction: (
    accountId: string,
    to: string,
    messageId: string,
    emoji: string,
    fromMe = true,
  ) =>
    api
      .post<{ success: boolean; messageId: string; reaction: string }>(
        '/whatsapp/messages/react',
        { accountId, to, messageId, emoji, fromMe },
      )
      .then((r) => r.data),

  sendMedia: async (
    accountId: string,
    to: string,
    file: File,
    caption?: string,
  ): Promise<WhatsAppMessage> => {
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('accountId', accountId);
      form.append('to', to);
      if (caption) form.append('caption', caption);

      const res = await api
        .post<WhatsAppMessage>('/whatsapp/messages/send-media', form)
        .then((r) => r.data);
      soundEffects.playSentSound();
      return res;
    } catch (formErr) {
      // Robust Fallback: send base64 if FormData fails
      return new Promise<WhatsAppMessage>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const rawResult = reader.result as string;
            const base64Data = rawResult.includes(',') ? rawResult.split(',')[1] : rawResult;
            const res = await api.post<WhatsAppMessage>('/whatsapp/messages/send-media', {
              accountId,
              to,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              base64Data,
              caption,
            });
            soundEffects.playSentSound();
            resolve(res.data);
          } catch (b64Err) {
            reject(b64Err);
          }
        };
        reader.onerror = () => reject(formErr);
        reader.readAsDataURL(file);
      });
    }
  },

  cleanDemoAccounts: () =>
    api.post<{ success: boolean; message: string }>('/whatsapp/clean-demo').then((r) => r.data),

  startQR: (accountId: string, force?: boolean) =>
    api
      .post<{
        success: boolean;
        message: string;
        alreadyConnected?: boolean;
        qrCodeDataUrl?: string;
      }>('/whatsapp/qr', { accountId, force })
      .then((r) => r.data),

  getQR: (accountId: string) =>
    api
      .get<{ success: boolean; isConnected: boolean; qrCodeDataUrl?: string }>(
        `/whatsapp/qr/${accountId}`,
      )
      .then((r) => r.data),

  sync: (accountId: string) =>
    api
      .post<{ success: boolean; message: string }>('/whatsapp/sync', { accountId })
      .then((r) => r.data),

  reconnect: (accountId: string) =>
    api.post('/whatsapp/reconnect', { accountId }).then((r) => r.data),

  logout: (accountId: string, disconnectedBy?: string) =>
    api.post('/whatsapp/logout', { accountId, disconnectedBy }).then((r) => r.data),

  saveChat: (accountId: string, chat: { id: string; name?: string; isGroup?: boolean }) =>
    api.post<WhatsAppChat>('/whatsapp/chats', { accountId, ...chat }).then((r) => r.data),

  syncChat: (accountId: string, jid: string, count = 25) =>
    api
      .post<{ success: boolean; synced: number }>(
        `/whatsapp/chats/${encodeURIComponent(jid)}/sync`,
        { accountId, count },
      )
      .then((r) => r.data),

  flush: (accountId: string) =>
    api
      .post<{ success: boolean; message: string }>('/whatsapp/flush', { accountId })
      .then((r) => r.data),

  clearChatMessages: (accountId: string, jid: string) =>
    api
      .delete<{ success: boolean; deletedCount: number }>(
        `/whatsapp/chats/${encodeURIComponent(jid)}/messages`,
        { params: { accountId } },
      )
      .then((r) => r.data),

  repairMedia: (accountId: string) =>
    api
      .post<{
        success: boolean;
        message: string;
        totalFixed: number;
        totalRedownloaded: number;
        totalFailed: number;
      }>('/whatsapp/media/repair', { accountId })
      .then((r) => r.data),
};
