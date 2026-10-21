// ─────────────────────────────────────────────────────────────────────────────
//  main.ts — Application Bootstrap
//  Boots NestJS with Helmet, CORS, validation pipes, and Swagger docs.
//  Session hydration fires on startup via lifecycle hooks.
// ─────────────────────────────────────────────────────────────────────────────
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { BaileysClientFactory } from './modules/session-hydration/factories/baileys-client.factory';
import { SessionHydrationService } from './modules/session-hydration/services/session-hydration.service';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Suppress transient Baileys socket reconnect/timeout rejections so Node process never crashes
process.on('unhandledRejection', (reason: any) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.warn(`[Process] Suppressed unhandledRejection (Baileys async timeout/reconnect): ${msg}`);
});

process.on('uncaughtException', (err: Error) => {
  console.warn(`[Process] Suppressed uncaughtException: ${err.message}`);
});

async function bootstrap() {
  console.log('🚀 Bootstrapping NestJS WhatsApp Server...');
  const logger = new Logger('Bootstrap');

  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProd ? ['error', 'warn', 'log'] : ['log', 'error', 'warn', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const prefix = config.get<string>('API_PREFIX', 'api/v1');
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  const wsOriginEnv = config.get<string>('WEBSOCKET_ORIGIN', '');
  const wsOrigins = wsOriginEnv
    ? wsOriginEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const defaultConnectSrc = isProd
    ? ["'self'"]
    : ["'self'", 'ws://localhost:3000', 'ws://127.0.0.1:3000', 'ws://localhost:5173', 'ws://127.0.0.1:5173'];

  // Add frontend WebSocket counterpart if FRONTEND_URL is set
  const frontendWs = frontendUrl
    ? [frontendUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')]
    : [];

  const allConnectSrc = Array.from(
    new Set([...defaultConnectSrc, ...wsOrigins, ...frontendWs]),
  );

  // ── Security headers via Helmet (configured for cross-origin media & doc streaming) ──
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],  // needed for React inline styles
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: allConnectSrc,
          mediaSrc: ["'self'", 'blob:'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' },
    }),
  );

  // ── Global prefix ────────────────────────────────────────────────────────
  // Exclude /webhook, /metrics, and /health so Prometheus scrapers & health probes can hit directly
  app.setGlobalPrefix(prefix, { exclude: ['webhook', 'webhook/(.*)', 'metrics', 'health', 'health/(.*)', ''] });

  // Redirect root GET requests to frontend dashboard or API overview
  app.getHttpAdapter().get('/', (req: any, res: any) => {
    res.redirect(frontendUrl);
  });

  // ── Body parser limit for media (images, videos, documents up to 50MB) ───
  const { json, urlencoded } = await import('express');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // ── DTO validation pipeline ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Global Exception Filter & Logging Interceptor ────────────────────────
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── CORS ─────────────────────────────────────────────────────────────────
  const rawOrigins = config.get<string>('CORS_ORIGINS', 'http://localhost:5173');
  const allowedOrigins = rawOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }

  app.enableCors({
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        (!isProd && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
      ) {
        cb(null, true);
      } else {
        cb(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Graceful shutdown: close all Baileys sockets before process exits ────
  // This ensures session credentials are fully persisted to the DB before
  // the process dies, so the next boot can reconnect without a new QR scan.
  const gracefulShutdown = async (signal: string) => {
    logger.log(`\n🛑 Received ${signal} — starting graceful shutdown...`);
    try {
      const baileysFactory = app.get(BaileysClientFactory);
      const activeIds = baileysFactory.getActiveClients();
      logger.log(`🔌 Closing ${activeIds.length} active Baileys client(s)...`);
      await Promise.allSettled(
        activeIds.map(id => baileysFactory.destroyClient(id))
      );
      logger.log('✅ All Baileys clients closed. Sessions persisted to database.');
    } catch (err: any) {
      logger.warn(`⚠️  Error during Baileys shutdown: ${err.message}`);
    }
    await app.close();
    logger.log('👋 Server shut down cleanly.');
    process.exit(0);
  };

  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  await app.listen(port);
  logger.log(`🚀 WhatsApp Core Engine running on port ${port}`);
  logger.log(`📡 API prefix: /${prefix}`);
  logger.log(`🔗 Meta Webhook endpoint: http://localhost:${port}/webhook`);
  logger.log(`🔒 Security guards active: HMAC X-Hub-Signature-256`);
  logger.log(`🌐 Proxy binding layer: ACTIVE`);
  logger.log(`🔑 Session hydration: STATELESS (PostgreSQL → RAM)`);
  logger.log(`💾 Session auth dir: ./data/sessions (persistent, excluded from watcher)`);

  // ── Dedicated Worker Mode Auto-Hydration ──────────────────────────────────
  // If this container was provisioned by Docker Swarm or Coolify for a specific account,
  // automatically hydrate and maintain its live Baileys connection.
  const workerAccountId = config.get<string>('ACCOUNT_ID');
  if (workerAccountId) {
    logger.log(`🤖 Container running in Dedicated Worker Mode for Account: ${workerAccountId}`);
    try {
      const sessionHydration = app.get(SessionHydrationService);
      sessionHydration.hydrateAccount(workerAccountId).catch((err: any) => {
        logger.error(`[Worker] Auto-hydration failed for ${workerAccountId}: ${err.message}`);
      });
    } catch (err: any) {
      logger.warn(`[Worker] Could not initiate auto-hydration for ${workerAccountId}: ${err.message}`);
    }
  }
}

bootstrap().catch((err) => {
  console.error('❌ BOOTSTRAP FATAL ERROR:', err);
  process.exit(1);
});

