// ─────────────────────────────────────────────────────────────────────────────
//  config/proxy.config.ts — Proxy Binding Layer Configuration
//  Supports SOCKS5 and HTTP(S) proxy protocols per-account.
// ─────────────────────────────────────────────────────────────────────────────
import { registerAs } from '@nestjs/config';

export default registerAs('proxy', () => ({
  defaultProtocol: (process.env.PROXY_DEFAULT_PROTOCOL ?? 'socks5') as 'socks5' | 'http' | 'https',
  rotationEnabled: process.env.PROXY_ROTATION_ENABLED === 'true',
  healthCheckIntervalMs: parseInt(process.env.PROXY_HEALTH_CHECK_INTERVAL_MS ?? '30000', 10),
  maxRetries: parseInt(process.env.PROXY_MAX_RETRIES ?? '3', 10),
  timeoutMs: parseInt(process.env.PROXY_TIMEOUT_MS ?? '10000', 10),
}));
