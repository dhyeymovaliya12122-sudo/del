"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
const baileys_client_factory_1 = require("./modules/session-hydration/factories/baileys-client.factory");
const session_hydration_service_1 = require("./modules/session-hydration/services/session-hydration.service");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
let uncaughtExceptionCount = 0;
const UNCAUGHT_EXCEPTION_THRESHOLD = 5;
process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const isBaileysTransient = /timed out|connection closed|stream:error|DisconnectReason|QR refs attempts/i.test(msg);
    if (isBaileysTransient) {
        console.warn(`[Process] Suppressed Baileys transient rejection: ${msg}`);
    }
    else {
        console.error(`[Process] ⚠️ Unhandled rejection (non-Baileys): ${msg}`, reason instanceof Error ? reason.stack : '');
    }
});
process.on('uncaughtException', (err) => {
    uncaughtExceptionCount++;
    console.error(`[Process] 🚨 uncaughtException #${uncaughtExceptionCount}: ${err.message}`, err.stack);
    if (uncaughtExceptionCount >= UNCAUGHT_EXCEPTION_THRESHOLD) {
        console.error(`[Process] 💀 ${UNCAUGHT_EXCEPTION_THRESHOLD} uncaught exceptions reached — forcing process exit for safety.`);
        process.exit(1);
    }
});
async function bootstrap() {
    console.log('🚀 Bootstrapping NestJS WhatsApp Server...');
    const logger = new common_1.Logger('Bootstrap');
    const isProd = process.env.NODE_ENV === 'production';
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: isProd ? ['error', 'warn', 'log'] : ['log', 'error', 'warn', 'debug'],
    });
    const config = app.get(config_1.ConfigService);
    const port = config.get('PORT', 3000);
    const prefix = config.get('API_PREFIX', 'api/v1');
    const frontendUrl = config.get('FRONTEND_URL', 'http://localhost:5173');
    const wsOriginEnv = config.get('WEBSOCKET_ORIGIN', '');
    const wsOrigins = wsOriginEnv
        ? wsOriginEnv.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const defaultConnectSrc = isProd
        ? ["'self'"]
        : ["'self'", 'ws://localhost:3000', 'ws://127.0.0.1:3000', 'ws://localhost:5173', 'ws://127.0.0.1:5173'];
    const frontendWs = frontendUrl
        ? [frontendUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')]
        : [];
    const allConnectSrc = Array.from(new Set([...defaultConnectSrc, ...wsOrigins, ...frontendWs]));
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                connectSrc: allConnectSrc,
                mediaSrc: ["'self'", 'blob:'],
            },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
        frameguard: { action: 'deny' },
    }));
    app.setGlobalPrefix(prefix, { exclude: ['webhook', 'webhook/(.*)', 'metrics', 'health', 'health/(.*)', ''] });
    app.getHttpAdapter().get('/', (req, res) => {
        res.redirect(frontendUrl);
    });
    const { json, urlencoded } = await Promise.resolve().then(() => require('express'));
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ limit: '10mb', extended: true }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.GlobalHttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor());
    const rawOrigins = config.get('CORS_ORIGINS', 'http://localhost:5173');
    const allowedOrigins = rawOrigins
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
        allowedOrigins.push(frontendUrl);
    }
    app.enableCors({
        origin: (origin, cb) => {
            if (!origin ||
                allowedOrigins.includes(origin) ||
                allowedOrigins.includes('*') ||
                (!isProd && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))) {
                cb(null, true);
            }
            else {
                cb(new Error(`CORS blocked: ${origin}`));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
    });
    const gracefulShutdown = async (signal) => {
        logger.log(`\n🛑 Received ${signal} — starting graceful shutdown...`);
        try {
            const baileysFactory = app.get(baileys_client_factory_1.BaileysClientFactory);
            const activeIds = baileysFactory.getActiveClients();
            logger.log(`🔌 Closing ${activeIds.length} active Baileys client(s)...`);
            await Promise.allSettled(activeIds.map(id => baileysFactory.destroyClient(id)));
            logger.log('✅ All Baileys clients closed. Sessions persisted to database.');
        }
        catch (err) {
            logger.warn(`⚠️  Error during Baileys shutdown: ${err.message}`);
        }
        await app.close();
        logger.log('👋 Server shut down cleanly.');
        process.exit(0);
    };
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    await app.listen(port);
    logger.log(`🚀 WhatsApp Core Engine running on port ${port}`);
    logger.log(`📡 API prefix: /${prefix}`);
    logger.log(`🔗 Meta Webhook endpoint: http://localhost:${port}/webhook`);
    logger.log(`🔒 Security guards active: HMAC X-Hub-Signature-256`);
    logger.log(`🌐 Proxy binding layer: ACTIVE`);
    logger.log(`🔑 Session hydration: STATELESS (PostgreSQL → RAM)`);
    logger.log(`💾 Session auth dir: ./data/sessions (persistent, excluded from watcher)`);
    const workerAccountId = config.get('ACCOUNT_ID');
    if (workerAccountId) {
        logger.log(`🤖 Container running in Dedicated Worker Mode for Account: ${workerAccountId}`);
        try {
            const sessionHydration = app.get(session_hydration_service_1.SessionHydrationService);
            sessionHydration.hydrateAccount(workerAccountId).catch((err) => {
                logger.error(`[Worker] Auto-hydration failed for ${workerAccountId}: ${err.message}`);
            });
        }
        catch (err) {
            logger.warn(`[Worker] Could not initiate auto-hydration for ${workerAccountId}: ${err.message}`);
        }
    }
}
bootstrap().catch((err) => {
    console.error('❌ BOOTSTRAP FATAL ERROR:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map