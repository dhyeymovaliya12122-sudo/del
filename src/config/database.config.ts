// ─────────────────────────────────────────────────────────────────────────────
//  config/database.config.ts — SQLite (local-first, no external DB needed)
//  Switched from PostgreSQL to SQLite for zero-dependency local development.
// ─────────────────────────────────────────────────────────────────────────────
import { registerAs } from '@nestjs/config';
import * as path from 'path';

export default registerAs('database', () => ({
  type: process.env.DB_TYPE ?? (process.env.NODE_ENV === 'production' ? 'postgres' : 'sqlite'),
  path: process.env.DB_PATH ?? path.resolve(process.cwd(), 'data', 'whatsapp.db'),
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'whatsapp_user',
  password: process.env.DB_PASSWORD ?? 'supersecretpassword',
  database: process.env.DB_NAME ?? 'whatsapp_engine',
  ssl: process.env.DB_SSL === 'true',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.NODE_ENV === 'development',
}));
