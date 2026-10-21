"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const path = require("path");
exports.default = (0, config_1.registerAs)('database', () => ({
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
//# sourceMappingURL=database.config.js.map