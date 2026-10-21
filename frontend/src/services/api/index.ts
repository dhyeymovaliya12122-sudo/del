/**
 * index.ts
 * Enterprise API Layer facade.
 * Exports modular clients, socket utilities, and domain types.
 * Adheres to Commandment #10: Scalable API structure.
 */

// Core HTTP client and errors
export { api, ApiError } from './client';
export type { ApiErrorPayload } from './client';

// Real-time socket
export { getSocket, disconnectSocket } from './socket';

// Domain models & types
export * from './types';

// Domain API clients
export { accountsApi, devicesApi } from './accounts.api';
export { whatsappWebApi } from './whatsapp.api';
export { campaignsApi, contactGroupsApi, templatesApi, optOutApi } from './campaigns.api';
export { chatbotApi, schedulerApi, autoReplyApi } from './chatbot.api';
export { authApi } from './auth.api';
export { exportBackupApi } from './export.api';
export { verificationApi, migrationApi } from './verification.api';
export { orchestrationApi, queueApi, circuitBreakerApi, streamApi } from './infrastructure.api';
