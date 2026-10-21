/**
 * auth.api.ts
 * Enterprise API client for Authentication and Super Admin operations.
 * Commandments: #5 (Error handling), #10 (Scalable API structure).
 */
import { api } from './client';

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),

  listAdmins: () => api.get<any[]>('/auth/admins').then((r) => r.data),

  getAdmins: () => api.get<any[]>('/auth/admins').then((r) => r.data),

  createAdmin: (data: { username: string; password: string; displayName: string }) =>
    api.post('/auth/admins', data).then((r) => r.data),

  deleteAdmin: (id: string) => api.delete(`/auth/admins/${id}`).then((r) => r.data),

  assignAccount: (userId: string, accountId: string) =>
    api.post(`/auth/admins/${userId}/accounts`, { accountId }).then((r) => r.data),

  removeAccount: (userId: string, accountId: string) =>
    api.delete(`/auth/admins/${userId}/accounts/${accountId}`).then((r) => r.data),

  getAuditLogs: () => api.get<any[]>('/auth/audit-logs').then((r) => r.data),
};
