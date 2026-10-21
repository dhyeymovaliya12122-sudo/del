/**
 * accounts.api.ts
 * Enterprise API client for WhatsApp accounts and linked devices.
 * Commandments: #5 (Error handling), #10 (Scalable API structure).
 */
import { api } from './client';
import { Account, LinkedDevice } from './types';

export const accountsApi = {
  list: (params?: { tenantId?: string; startDate?: string; endDate?: string }) =>
    api.get<Account[]>('/accounts', { params }).then(r => r.data),

  get: (id: string, params?: { tenantId?: string; startDate?: string; endDate?: string }) =>
    api.get<Account>(`/accounts/${id}`, { params }).then(r => r.data),

  create: (data: { displayName?: string; phoneNumber?: string; tenantId?: string }) =>
    api.post<Account>('/accounts', data).then(r => r.data),

  update: (id: string, data: { displayName?: string }) =>
    api.patch<Account>(`/accounts/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/accounts/${id}`).then(r => r.data),
};

export const devicesApi = {
  list: async (accountId: string): Promise<LinkedDevice[]> => {
    const { data } = await api.get(`/accounts/${accountId}/devices`);
    return data;
  },

  pair: async (
    accountId: string,
    payload?: any
  ): Promise<{ pairingId: string; deviceId: string; qrPayload: string; expiresAt: number }> => {
    const { data } = await api.post(`/accounts/${accountId}/devices/pair`, payload || {});
    return data;
  },

  approve: async (accountId: string, pairingId: string): Promise<{ success: boolean; device: LinkedDevice }> => {
    const { data } = await api.post(`/accounts/${accountId}/devices/approve`, { pairingId });
    return data;
  },

  revoke: async (accountId: string, deviceId: string): Promise<{ success: boolean; revokedId: string }> => {
    const { data } = await api.delete(`/accounts/${accountId}/devices/${deviceId}`);
    return data;
  },
};
