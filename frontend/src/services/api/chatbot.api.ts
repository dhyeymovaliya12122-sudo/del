/**
 * chatbot.api.ts
 * Enterprise API client for Chatbot Flows, Auto-Reply Rules, and Message Schedulers.
 * Commandments: #5 (Error handling), #10 (Scalable API structure).
 */
import { api } from './client';
import { AutoReplyRule, ChatbotFlow, ScheduledMessage } from './types';

export const chatbotApi = {
  list: (accountId?: string) =>
    api.get<ChatbotFlow[]>('/chatbot/flows', { params: { accountId } }).then((r) => r.data),

  get: (id: string) => api.get<ChatbotFlow>(`/chatbot/flows/${id}`).then((r) => r.data),

  create: (data: Partial<ChatbotFlow>) =>
    api.post<ChatbotFlow>('/chatbot/flows', data).then((r) => r.data),

  update: (id: string, data: Partial<ChatbotFlow>) =>
    api.put<ChatbotFlow>(`/chatbot/flows/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/chatbot/flows/${id}`).then((r) => r.data),

  toggle: (id: string) =>
    api.post<{ isActive: boolean }>(`/chatbot/flows/${id}/toggle`).then((r) => r.data),

  test: (id: string, message: string) =>
    api
      .post<{ matched: boolean; response?: string; escalate?: boolean }>(
        `/chatbot/flows/${id}/test`,
        { message },
      )
      .then((r) => r.data),
};

export const schedulerApi = {
  list: (accountId: string) =>
    api.get<ScheduledMessage[]>(`/scheduler?accountId=${accountId}`).then((r) => r.data),

  create: (data: {
    accountId: string;
    toJid: string;
    messageText: string;
    scheduledAt: string;
    repeatType?: string;
  }) => api.post<ScheduledMessage>('/scheduler', data).then((r) => r.data),

  cancel: (id: string) => api.delete(`/scheduler/${id}`).then((r) => r.data),
};

export const autoReplyApi = {
  list: (accountId: string) =>
    api.get<AutoReplyRule[]>(`/auto-reply?accountId=${accountId}`).then((r) => r.data),

  create: (data: Partial<AutoReplyRule>) =>
    api.post<AutoReplyRule>('/auto-reply', data).then((r) => r.data),

  update: (id: string, data: Partial<AutoReplyRule>) =>
    api.patch<AutoReplyRule>(`/auto-reply/${id}`, data).then((r) => r.data),

  toggle: (id: string) =>
    api.patch<AutoReplyRule>(`/auto-reply/${id}/toggle`, {}).then((r) => r.data),

  delete: (id: string) => api.delete(`/auto-reply/${id}`).then((r) => r.data),
};
