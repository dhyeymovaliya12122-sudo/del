/**
 * campaigns.api.ts
 * Enterprise API client for Bulk Campaigns, Contact Groups, Templates, and Compliance Opt-Outs.
 * Commandments: #5 (Error handling), #10 (Scalable API structure).
 */
import { api } from './client';
import {
  Campaign,
  CampaignRecipient,
  ContactGroup,
  ContactGroupMember,
  MessageTemplate,
  OptOut,
} from './types';

export const campaignsApi = {
  list: (accountId?: string) =>
    api.get<Campaign[]>('/campaigns', { params: { accountId } }).then((r) => r.data),

  get: (id: string) => api.get<Campaign>(`/campaigns/${id}`).then((r) => r.data),

  create: (data: Partial<Campaign>) =>
    api.post<Campaign>('/campaigns', data).then((r) => r.data),

  addRecipients: (id: string, recipients: { phoneNumber: string; name?: string }[]) =>
    api.post(`/campaigns/${id}/recipients`, { recipients }).then((r) => r.data),

  getRecipients: (id: string) =>
    api.get<CampaignRecipient[]>(`/campaigns/${id}/recipients`).then((r) => r.data),

  getStats: (id: string) =>
    api.get<Campaign>(`/campaigns/${id}/stats`).then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    api.post(`/campaigns/${id}/status`, { status }).then((r) => r.data),

  sendNow: (id: string) =>
    api.post(`/campaigns/${id}/send`).then((r) => r.data),

  delete: (id: string) => api.delete(`/campaigns/${id}`).then((r) => r.data),
};

export const contactGroupsApi = {
  list: (accountId?: string) =>
    api.get<ContactGroup[]>('/contacts/groups', { params: { accountId } }).then((r) => r.data),

  get: (id: string) => api.get<ContactGroup>(`/contacts/groups/${id}`).then((r) => r.data),

  create: (data: { accountId: string; name: string; description?: string; tags?: string[] }) =>
    api.post<ContactGroup>('/contacts/groups', data).then((r) => r.data),

  delete: (id: string) => api.delete(`/contacts/groups/${id}`).then((r) => r.data),

  getMembers: (id: string, search?: string) =>
    api
      .get<ContactGroupMember[]>(`/contacts/groups/${id}/members`, { params: { search } })
      .then((r) => r.data),

  importMembers: (id: string, members: Partial<ContactGroupMember>[]) =>
    api.post(`/contacts/groups/${id}/import`, { members }).then((r) => r.data),

  removeMember: (id: string, phone: string) =>
    api.delete(`/contacts/groups/${id}/members/${phone}`).then((r) => r.data),
};

export const templatesApi = {
  list: (accountId?: string) =>
    api.get<MessageTemplate[]>('/templates', { params: { accountId } }).then((r) => r.data),

  get: (id: string) => api.get<MessageTemplate>(`/templates/${id}`).then((r) => r.data),

  create: (data: Partial<MessageTemplate>) =>
    api.post<MessageTemplate>('/templates', data).then((r) => r.data),

  update: (id: string, data: Partial<MessageTemplate>) =>
    api.put<MessageTemplate>(`/templates/${id}`, data).then((r) => r.data),

  submit: (id: string) =>
    api.post<MessageTemplate>(`/templates/${id}/submit`).then((r) => r.data),

  approve: (id: string, metaTemplateId?: string) =>
    api.post(`/templates/${id}/approve`, { metaTemplateId }).then((r) => r.data),

  reject: (id: string, reason: string) =>
    api.post(`/templates/${id}/reject`, { reason }).then((r) => r.data),

  delete: (id: string) => api.delete(`/templates/${id}`).then((r) => r.data),
};

export const optOutApi = {
  list: (accountId?: string) =>
    api.get<OptOut[]>('/opt-out', { params: { accountId } }).then((r) => r.data),

  add: (accountId: string, phoneNumber: string, name?: string, reason?: string) =>
    api.post<OptOut>('/opt-out', { accountId, phoneNumber, name, reason }).then((r) => r.data),

  remove: (accountId: string, phoneNumber: string) =>
    api.delete(`/opt-out/${accountId}/${phoneNumber}`).then((r) => r.data),

  bulkImport: (accountId: string, numbers: { phoneNumber: string; name?: string }[]) =>
    api.post('/opt-out/bulk-import', { accountId, numbers }).then((r) => r.data),
};
