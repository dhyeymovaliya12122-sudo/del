/**
 * env.ts
 * Centralized, typed environment configuration provider.
 * Adheres to Architectural Commandment #6: Separate the environment configs from code.
 */

export interface AppEnvConfig {
  apiUrl: string;
  defaultTenantId: string;
  socketUrl: string;
  isProduction: boolean;
  isDevelopment: boolean;
}

export const ENV: AppEnvConfig = Object.freeze({
  apiUrl: (import.meta.env.VITE_API_URL as string) || '/api/v1',
  defaultTenantId: (import.meta.env.VITE_TENANT_ID as string) || 'default-tenant',
  socketUrl: (import.meta.env.VITE_SOCKET_URL as string) || (typeof window !== 'undefined' ? window.location.origin : ''),
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
});
