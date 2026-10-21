// ─────────────────────────────────────────────────────────────────────────────
//  infrastructure/database/database.module.ts
//  TypeORM SQLite module — local file-based storage, no external DB required.
//  File is stored at ./data/whatsapp.db (created automatically on first run).
//
//  [A-2 FIX] Migrations are now managed by TypeORM migration files in
//  src/infrastructure/database/migrations/ — NOT inside service classes.
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = (
          config.get<string>('database.type') ||
          config.get<string>('DB_TYPE') ||
          process.env.DB_TYPE ||
          'sqlite'
        ).toLowerCase();

        if (dbType === 'postgres' || dbType === 'postgresql') {
          const sslEnabled =
            config.get<string>('DB_SSL', process.env.DB_SSL || 'false') === 'true';

          return {
            type: 'postgres',
            host: config.get<string>('DB_HOST', process.env.DB_HOST || 'localhost'),
            port: Number(config.get<number>('DB_PORT', Number(process.env.DB_PORT) || 5432)),
            username: config.get<string>('DB_USER', process.env.DB_USER || 'whatsapp_user'),
            password: config.get<string>('DB_PASSWORD', process.env.DB_PASSWORD || 'supersecretpassword'),
            database: config.get<string>('DB_NAME', process.env.DB_NAME || 'whatsapp_engine'),
            ssl: sslEnabled ? { rejectUnauthorized: false } : false,
            autoLoadEntities: true,
            synchronize: config.get<string>('DB_SYNCHRONIZE', process.env.DB_SYNCHRONIZE || 'false') === 'true',
            logging: config.get<boolean>('database.logging', false),
            entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
            migrations: [__dirname + '/migrations/*.{ts,js}'],
            migrationsRun: config.get<string>('DB_SYNCHRONIZE', process.env.DB_SYNCHRONIZE || 'false') !== 'true',
            migrationsTableName: 'typeorm_migrations',
            extra: {
              max: 25,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 5000,
            },
          };
        }

        // SQLite local-first fallback
        const dbPath = config.get<string>('database.path') ??
          path.resolve(process.cwd(), 'data', 'whatsapp.db');
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const sqliteSync = config.get<string>('DB_SYNCHRONIZE', process.env.DB_SYNCHRONIZE || 'true') === 'true';

        return {
          type: 'better-sqlite3',
          database: dbPath,
          autoLoadEntities: true,
          synchronize: sqliteSync,
          logging: config.get<boolean>('database.logging', false),
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          // When synchronize is true, skip duplicate migrations execution to prevent schema collision
          migrations: [__dirname + '/migrations/*.{ts,js}'],
          migrationsRun: !sqliteSync,
          migrationsTableName: 'typeorm_migrations', // audit table for migration history
          // ── SQLite performance & concurrency fixes ──────────────────────────
          // [D-3 FIX] Enable Write-Ahead Logging (WAL) to prevent DB locks under high concurrent load
          enableWAL: true,
          prepareDatabase: (db: any) => {
            db.pragma('journal_mode = WAL');
            db.pragma('synchronous = NORMAL');
            db.pragma('temp_store = MEMORY');
            db.pragma('cache_size = -64000'); // 64MB cache
            try {
              db.exec('ALTER TABLE whatsapp_messages ADD COLUMN is_edited BOOLEAN DEFAULT 0');
            } catch {}
          },
          extra: {
            fileMustExist: false,
          },
          nativeBinding: undefined,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

