/**
 * client.ts
 * Enterprise Axios HTTP client with typed interceptors and error handling.
 * Adheres to Commandments #5 (Proper Error Handling) and #6 (Separate Env Configs).
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../../config/env';

export interface ApiErrorPayload {
  statusCode: number;
  message: string;
  error?: string;
  timestamp?: string;
  path?: string;
}

export class ApiError extends Error {
  statusCode: number;
  errorName?: string;
  timestamp?: string;

  constructor(payload: ApiErrorPayload) {
    super(payload.message || 'API request failed');
    this.name = 'ApiError';
    this.statusCode = payload.statusCode;
    this.errorName = payload.error;
    this.timestamp = payload.timestamp;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: ENV.apiUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor: attach auth bearer token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('wa_token') || localStorage.getItem('wa_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: handle 401 unauth and normalize errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      sessionStorage.removeItem('wa_token');
      localStorage.removeItem('wa_token');
      try {
        const channel = new BroadcastChannel('auth_sync');
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
      } catch {}
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    const payload: ApiErrorPayload = {
      statusCode: error.response?.status || 500,
      message: error.response?.data?.message || error.message || 'Request failed',
      error: error.response?.data?.error,
      timestamp: error.response?.data?.timestamp,
      path: error.response?.data?.path,
    };

    return Promise.reject(new ApiError(payload));
  },
);
