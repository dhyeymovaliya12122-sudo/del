/**
 * infrastructure.api.ts
 * Enterprise API client for Orchestration, Message Queue, Circuit Breaker, and Stream Health.
 * Commandments: #5 (Error handling), #10 (Scalable API structure).
 */
import { api } from './client';
import { ContainerInstance, QueueStats, StreamHealth } from './types';

export const orchestrationApi = {
  provision: (body: {
    accountId: string;
    tenantId: string;
    phoneNumber: string;
    proxyUrl?: string;
  }) => api.post('/orchestration/provision', body).then((r) => r.data),

  destroy: (serviceId: string) => api.delete(`/orchestration/destroy/${serviceId}`),

  restart: (serviceId: string) =>
    api.post(`/orchestration/${serviceId}/restart`).then((r) => r.data),

  heal: (serviceId: string) => api.post(`/orchestration/${serviceId}/heal`).then((r) => r.data),

  scale: (serviceId: string, replicas: number) =>
    api.post(`/orchestration/${serviceId}/scale`, { replicas }).then((r) => r.data),

  list: () => api.get<ContainerInstance[]>('/orchestration/instances').then((r) => r.data),

  health: (serviceId: string) =>
    api.get<ContainerInstance>(`/orchestration/instances/${serviceId}/health`).then((r) => r.data),
};

export const queueApi = {
  stats: (accountId: string) =>
    api.get<QueueStats>(`/message-queue/${accountId}/stats`).then((r) => r.data),

  pause: (accountId: string) => api.post(`/message-queue/${accountId}/pause`),

  resume: (accountId: string) => api.post(`/message-queue/${accountId}/resume`),

  send: (body: object) => api.post('/message-queue/send', body).then((r) => r.data),

  rateLimits: () => api.get<Record<string, number>>('/message-queue/rate-limits').then((r) => r.data),
};

export const circuitBreakerApi = {
  all: () => api.get('/proxy-circuit-breaker').then((r) => r.data),

  state: (proxyId: string) =>
    api.get(`/proxy-circuit-breaker/${proxyId}/state`).then((r) => r.data),

  reset: (proxyId: string) =>
    api.post(`/proxy-circuit-breaker/${proxyId}/reset`).then((r) => r.data),
};

export const streamApi = {
  health: () => api.get<StreamHealth>('/webhook/stream/health').then((r) => r.data),
};
