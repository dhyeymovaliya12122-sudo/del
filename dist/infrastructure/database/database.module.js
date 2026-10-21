"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const path = require("path");
const fs = require("fs");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const dbType = (config.get('database.type') ||
                        config.get('DB_TYPE') ||
                        process.env.DB_TYPE ||
                        'sqlite').toLowerCase();
                    if (dbType === 'postgres' || dbType === 'postgresql') {
                        const sslEnabled = config.get('DB_SSL', process.env.DB_SSL || 'false') === 'true';
                        return {
                            type: 'postgres',
                            host: config.get('DB_HOST', process.env.DB_HOST || 'localhost'),
                            port: Number(config.get('DB_PORT', Number(process.env.DB_PORT) || 5432)),
                            username: config.get('DB_USER', process.env.DB_USER || 'whatsapp_user'),
                            password: config.get('DB_PASSWORD', process.env.DB_PASSWORD || 'supersecretpassword'),
                            database: config.get('DB_NAME', process.env.DB_NAME || 'whatsapp_engine'),
                            ssl: sslEnabled ? { rejectUnauthorized: false } : false,
                            autoLoadEntities: true,
                            synchronize: config.get('DB_SYNCHRONIZE', process.env.DB_SYNCHRONIZE || 'false') === 'true',
                            logging: config.get('database.logging', false),
                            entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
                            migrations: [__dirname + '/migrations/*.{ts,js}'],
                            migrationsRun: config.get('DB_SYNCHRONIZE', process.env.DB_SYNCHRONIZE || 'false') !== 'true',
                            migrationsTableName: 'typeorm_migrations',
                            extra: {
                                max: 25,
                                idleTimeoutMillis: 30000,
                                connectionTimeoutMillis: 5000,
                            },
                        };
                    }
                    const dbPath = config.get('database.path') ??
                        path.resolve(process.cwd(), 'data', 'whatsapp.db');
                    const dir = path.dirname(dbPath);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    const sqliteSync = config.get('DB_SYNCHRONIZE', process.env.DB_SYNCHRONIZE || 'true') === 'true';
                    return {
                        type: 'better-sqlite3',
                        database: dbPath,
                        autoLoadEntities: true,
                        synchronize: sqliteSync,
                        logging: config.get('database.logging', false),
                        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
                        migrations: [__dirname + '/migrations/*.{ts,js}'],
                        migrationsRun: !sqliteSync,
                        migrationsTableName: 'typeorm_migrations',
                        enableWAL: true,
                        prepareDatabase: (db) => {
                            db.pragma('journal_mode = WAL');
                            db.pragma('synchronous = NORMAL');
                            db.pragma('temp_store = MEMORY');
                            db.pragma('cache_size = -64000');
                            try {
                                db.exec('ALTER TABLE whatsapp_messages ADD COLUMN is_edited BOOLEAN DEFAULT 0');
                            }
                            catch { }
                        },
                        extra: {
                            fileMustExist: false,
                        },
                        nativeBinding: undefined,
                    };
                },
            }),
        ],
        exports: [typeorm_1.TypeOrmModule],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map