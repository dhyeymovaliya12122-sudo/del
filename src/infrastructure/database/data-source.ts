// ─────────────────────────────────────────────────────────────────────────────
//  infrastructure/database/data-source.ts
//  TypeORM DataSource for CLI migration commands.
//  Usage: npm run migration:generate / migration:run / migration:revert
// ─────────────────────────────────────────────────────────────────────────────
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'whatsapp_user',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'whatsapp_engine',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
