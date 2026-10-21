// ─────────────────────────────────────────────────────────────────────────────
//  config/redis.config.ts — Redis / Mock Configuration
//  When REDIS_MOCK=true, an in-memory ioredis-mock is used (no Redis server).
// ─────────────────────────────────────────────────────────────────────────────
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  mock: process.env.REDIS_MOCK !== undefined
    ? process.env.REDIS_MOCK === 'true'
    : process.env.NODE_ENV !== 'production',
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD ?? undefined,
  db: parseInt(process.env.REDIS_DB ?? '0', 10),
  ttlSeconds: parseInt(process.env.REDIS_TTL_SECONDS ?? '3600', 10),
  keyPrefix: 'wa:session:',
}));
