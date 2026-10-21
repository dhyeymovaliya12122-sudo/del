/**
 * verification.api.ts
 * Enterprise API client for WhatsApp Official Business Verification and Account Migration.
 * Commandments: #5 (Error handling), #10 (Scalable API structure).
 */
import { api } from './client';
import { Migration, Verification } from './types';

export const verificationApi = {
  getAll: () => api.get<Verification[]>('/verification').then((r) => r.data),

  get: (accountId: string) =>
    api.get<Verification>(`/verification/${accountId}`).then((r) => r.data),

  getChecklist: (accountId: string) =>
    api.get(`/verification/${accountId}/checklist`).then((r) => r.data),

  update: (accountId: string, data: Partial<Verification>) =>
    api.post<Verification>(`/verification/${accountId}`, data).then((r) => r.data),
};

export const migrationApi = {
  list: (accountId?: string) =>
    api.get<Migration[]>('/migration', { params: { accountId } }).then((r) => r.data),

  get: (id: string) => api.get<Migration>(`/migration/${id}`).then((r) => r.data),

  start: (data: { accountId: string; sourcePhoneNumber: string; sourceProvider?: string }) =>
    api.post<Migration>('/migration/start', data).then((r) => r.data),

  getProgress: (id: string) => api.get(`/migration/${id}/progress`).then((r) => r.data),

  completeStep: (id: string, step: string, data?: any) =>
    api.post(`/migration/${id}/step/${step}`, data).then((r) => r.data),

  verifyTraffic: (id: string, messagesSent: number) =>
    api.post(`/migration/${id}/verify-traffic`, { messagesSent }).then((r) => r.data),

  cutover: (id: string) => api.post(`/migration/${id}/cutover`).then((r) => r.data),
};
