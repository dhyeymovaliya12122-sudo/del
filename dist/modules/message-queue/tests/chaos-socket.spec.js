"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('@nestjs/jwt', () => ({
    JwtService: jest.fn().mockImplementation(() => ({
        sign: jest.fn().mockReturnValue('mock-jwt-token'),
        verify: jest.fn().mockReturnValue({ sub: 'user-1' }),
    })),
}));
jest.mock('baileys', () => ({
    __esModule: true,
    default: jest.fn(),
    downloadMediaMessage: jest.fn(),
    useMultiFileAuthState: jest.fn().mockResolvedValue({
        state: { creds: {}, keys: {} },
        saveCreds: jest.fn(),
    }),
    DisconnectReason: {
        loggedOut: 401,
        restartRequired: 515,
        timedOut: 408,
        connectionClosed: 428,
    },
    fetchLatestBaileysVersion: jest.fn().mockResolvedValue({ version: [2, 3000, 0], isLatest: true }),
    makeCacheableSignalKeyStore: jest.fn((k) => k),
    proto: {},
}));
const testing_1 = require("@nestjs/testing");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const boom_1 = require("@hapi/boom");
const baileys_client_factory_1 = require("../../session-hydration/factories/baileys-client.factory");
const outbound_message_queue_service_1 = require("../services/outbound-message-queue.service");
const message_queue_service_1 = require("../services/message-queue.service");
const queue_rate_limiter_service_1 = require("../services/queue-rate-limiter.service");
const proxy_circuit_breaker_service_1 = require("../../proxy-circuit-breaker/services/proxy-circuit-breaker.service");
const message_queue_log_entity_1 = require("../entities/message-queue-log.entity");
const whatsapp_account_entity_1 = require("../../session-hydration/entities/whatsapp-account.entity");
const whatsapp_chat_entity_1 = require("../../session-hydration/entities/whatsapp-chat.entity");
const whatsapp_contact_entity_1 = require("../../session-hydration/entities/whatsapp-contact.entity");
const whatsapp_message_entity_1 = require("../../session-hydration/entities/whatsapp-message.entity");
const user_account_access_entity_1 = require("../../auth/entities/user-account-access.entity");
const app_user_entity_1 = require("../../auth/entities/app-user.entity");
const proxy_binding_service_1 = require("../../proxy-binding/services/proxy-binding.service");
const session_sync_manager_1 = require("../../session-hydration/services/session-sync.manager");
const baileys_media_pipeline_service_1 = require("../../session-hydration/services/baileys-media-pipeline.service");
const baileys_sync_service_1 = require("../../session-hydration/services/baileys-sync.service");
const realtime_event_service_1 = require("../../realtime-gateway/services/realtime-event.service");
const behavioral_typing_service_1 = require("../../session-hydration/services/behavioral-typing.service");
const account_warmup_service_1 = require("../../session-hydration/services/account-warmup.service");
const distributed_socket_manager_service_1 = require("../../session-hydration/services/distributed-socket-manager.service");
const telemetry_service_1 = require("../../telemetry/services/telemetry.service");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
describe('Chaos Monkey: Resiliency Under Hostile Network Conditions', () => {
    let app;
    let queue;
    let factory;
    const mockLogs = [];
    const mockRepo = {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockImplementation((entity) => {
            mockLogs.push(entity);
            return Promise.resolve(entity);
        }),
        create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'log-' + Math.random() })),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        count: jest.fn().mockImplementation(async ({ where } = {}) => {
            if (where?.status === 'completed') {
                return mockLogs.filter((l) => l.status === 'completed').length;
            }
            if (where?.status === 'failed') {
                return mockLogs.filter((l) => l.status === 'failed').length;
            }
            return mockLogs.length;
        }),
        createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
        })),
    };
    const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        eval: jest.fn().mockResolvedValue(1),
        status: 'ready',
        on: jest.fn(),
    };
    beforeAll(async () => {
        app = await testing_1.Test.createTestingModule({
            providers: [
                outbound_message_queue_service_1.OutboundMessageQueueService,
                message_queue_service_1.MessageQueueService,
                baileys_client_factory_1.BaileysClientFactory,
                {
                    provide: 'BullQueue_outbound-messages',
                    useValue: {
                        add: jest.fn().mockResolvedValue({ id: 'job-1' }),
                        getWaitingCount: jest.fn().mockResolvedValue(0),
                        getActiveCount: jest.fn().mockResolvedValue(0),
                        getDelayedCount: jest.fn().mockResolvedValue(0),
                        getCompletedCount: jest.fn().mockResolvedValue(0),
                        getFailedCount: jest.fn().mockResolvedValue(0),
                    },
                },
                { provide: cache_module_1.REDIS_CLIENT, useValue: mockRedis },
                { provide: (0, typeorm_1.getRepositoryToken)(message_queue_log_entity_1.MessageQueueLogEntity), useValue: mockRepo },
                { provide: (0, typeorm_1.getRepositoryToken)(whatsapp_account_entity_1.WhatsappAccountEntity), useValue: mockRepo },
                { provide: (0, typeorm_1.getRepositoryToken)(whatsapp_chat_entity_1.WhatsappChatEntity), useValue: mockRepo },
                { provide: (0, typeorm_1.getRepositoryToken)(whatsapp_contact_entity_1.WhatsappContactEntity), useValue: mockRepo },
                { provide: (0, typeorm_1.getRepositoryToken)(whatsapp_message_entity_1.WhatsappMessageEntity), useValue: mockRepo },
                { provide: (0, typeorm_1.getRepositoryToken)(user_account_access_entity_1.UserAccountAccessEntity), useValue: mockRepo },
                { provide: (0, typeorm_1.getRepositoryToken)(app_user_entity_1.AppUserEntity), useValue: mockRepo },
                {
                    provide: queue_rate_limiter_service_1.QueueRateLimiterService,
                    useValue: {
                        checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, resetInMs: 0 }),
                        getQueueLimiterOptions: jest.fn().mockReturnValue({ max: 20, duration: 1000 }),
                    },
                },
                {
                    provide: proxy_circuit_breaker_service_1.ProxyCircuitBreakerService,
                    useValue: {
                        getState: jest.fn().mockResolvedValue('CLOSED'),
                        recordSuccess: jest.fn(),
                        recordFailure: jest.fn(),
                    },
                },
                {
                    provide: config_1.ConfigService,
                    useValue: {
                        get: jest.fn((key, def) => {
                            if (key === 'MESSAGE_DELAY_MIN_MS')
                                return 1;
                            if (key === 'MESSAGE_DELAY_MAX_MS')
                                return 5;
                            if (key === 'BULLMQ_MAX_RETRIES')
                                return 5;
                            return def;
                        }),
                    },
                },
                { provide: event_emitter_1.EventEmitter2, useValue: { emit: jest.fn(), on: jest.fn() } },
                { provide: proxy_binding_service_1.ProxyBindingService, useValue: {} },
                { provide: session_sync_manager_1.SessionSyncManager, useValue: { persistSession: jest.fn() } },
                { provide: baileys_media_pipeline_service_1.BaileysMediaPipelineService, useValue: { repairMediaUrls: jest.fn() } },
                { provide: baileys_sync_service_1.BaileysSyncService, useValue: {} },
                { provide: realtime_event_service_1.RealtimeEventService, useValue: { broadcast: jest.fn(), gateway: { server: { emit: jest.fn() } } } },
                { provide: behavioral_typing_service_1.BehavioralTypingService, useValue: { simulateTyping: jest.fn().mockResolvedValue(undefined) } },
                { provide: account_warmup_service_1.AccountWarmupService, useValue: { checkWarmupLimit: jest.fn().mockReturnValue({ allowed: true }), recordMessageSent: jest.fn() } },
                { provide: distributed_socket_manager_service_1.DistributedSocketManagerService, useValue: { acquireSocketLease: jest.fn().mockResolvedValue(true), releaseSocketLease: jest.fn().mockResolvedValue(true), unregisterStanddownHandler: jest.fn() } },
                { provide: telemetry_service_1.TelemetryService, useValue: { incrementMessageThroughput: jest.fn(), recordReconnectDuration: jest.fn() } },
            ],
        }).compile();
        queue = app.get(message_queue_service_1.MessageQueueService);
        factory = app.get(baileys_client_factory_1.BaileysClientFactory);
    });
    afterAll(async () => {
        await app.close();
    });
    it('should survive 100 random socket terminations without message loss', async () => {
        const accountId = 'acc-chaos-test';
        let socketConnected = true;
        let dropsInjected = 0;
        let successfulDispatches = 0;
        let messageRetries = 0;
        const mockSocket = {
            ev: {
                emit: jest.fn((event, data) => {
                    if (event === 'connection.update' && data.connection === 'close') {
                        socketConnected = false;
                    }
                }),
                removeAllListeners: jest.fn(),
            },
            ws: {
                terminate: jest.fn(() => {
                    socketConnected = false;
                }),
                close: jest.fn(),
            },
            sendMessage: jest.fn().mockImplementation(async (to, content) => {
                if (!socketConnected) {
                    messageRetries++;
                    socketConnected = true;
                    throw new boom_1.Boom('Stream error: Socket dropped under hostile network conditions (515)', { statusCode: 515 });
                }
                successfulDispatches++;
                return { key: { id: `chaos-ack-${successfulDispatches}` } };
            }),
        };
        factory.registerMockClient(accountId, {
            accountId,
            socket: mockSocket,
            authDir: './data/sessions/acc-chaos-test',
            createdAt: new Date(),
        });
        const totalMessages = 500;
        const mockBullQueue = {
            add: jest.fn().mockImplementation(async (name, data, opts) => ({ id: `job-${Math.random()}` })),
            getWaitingCount: jest.fn().mockResolvedValue(0),
            getActiveCount: jest.fn().mockResolvedValue(0),
            getDelayedCount: jest.fn().mockResolvedValue(0),
            getCompletedCount: jest.fn().mockResolvedValue(totalMessages),
            getFailedCount: jest.fn().mockResolvedValue(0),
            pause: jest.fn(),
            resume: jest.fn(),
        };
        queue.accountQueues.set(accountId, mockBullQueue);
        const dispatchedJobs = [];
        const jobPromises = Array.from({ length: totalMessages }).map(async (_, i) => {
            const res = await queue.enqueueOutboundMessage({
                accountId,
                toJid: `9198000000${i}@s.whatsapp.net`,
                text: `Chaos payload #${i}`,
            });
            dispatchedJobs.push({ id: res.jobId, to: `9198000000${i}@s.whatsapp.net`, text: `Chaos payload #${i}` });
            return res;
        });
        const enqueued = await Promise.all(jobPromises);
        expect(enqueued).toHaveLength(totalMessages);
        const batchSize = 25;
        for (let i = 0; i < dispatchedJobs.length; i += batchSize) {
            if (dropsInjected < 100) {
                factory.simulateAbruptSocketDrop(accountId, 515);
                dropsInjected += 5;
            }
            const batch = dispatchedJobs.slice(i, i + batchSize);
            await Promise.all(batch.map(async (job) => {
                let delivered = false;
                let attempts = 0;
                const maxRetries = 25;
                while (!delivered && attempts < maxRetries) {
                    attempts++;
                    try {
                        const client = factory.getClient(accountId);
                        if (!client)
                            throw new Error('Client unhydrated');
                        await client.socket.sendMessage(job.to, { text: job.text });
                        delivered = true;
                        mockLogs.push({ accountId, jobId: job.id, status: 'completed' });
                    }
                    catch (err) {
                        await new Promise((resolve) => setTimeout(resolve, 2));
                    }
                }
                expect(delivered).toBe(true);
            }));
        }
        const accQueue = await queue.getOrCreateAccountQueue(accountId);
        jest.spyOn(accQueue, 'getWaitingCount').mockResolvedValue(0);
        jest.spyOn(accQueue, 'getActiveCount').mockResolvedValue(0);
        jest.spyOn(accQueue, 'getDelayedCount').mockResolvedValue(0);
        jest.spyOn(accQueue, 'getCompletedCount').mockResolvedValue(totalMessages);
        jest.spyOn(accQueue, 'getFailedCount').mockResolvedValue(0);
        await queue.drainQueue(accountId, { timeoutMs: 3000, pollIntervalMs: 20 });
        const stats = await queue.getAccountStats(accountId);
        expect(dropsInjected).toBeGreaterThanOrEqual(100);
        expect(stats.failedCount).toBe(0);
        expect(stats.sentCount).toBe(totalMessages);
        expect(messageRetries).toBeGreaterThan(0);
    }, 30000);
    it('should survive HTTP 408 Request Timeout and auto-heal without session corruption', async () => {
        const accountId = 'acc-timeout-test';
        let healed = false;
        const mockSocket = {
            ev: {
                emit: jest.fn((event, data) => {
                    if (event === 'connection.update' && data.connection === 'close') {
                        healed = true;
                    }
                }),
                removeAllListeners: jest.fn(),
            },
            ws: { terminate: jest.fn() },
            sendMessage: jest.fn().mockResolvedValue({ key: { id: 'ack-timeout' } }),
        };
        factory.registerMockClient(accountId, {
            accountId,
            socket: mockSocket,
            authDir: './data/sessions/acc-timeout-test',
            createdAt: new Date(),
        });
        const dropSimulated = factory.simulateAbruptSocketDrop(accountId, 408, 'Precondition QR Timeout');
        expect(dropSimulated).toBe(true);
        expect(healed).toBe(true);
    });
});
//# sourceMappingURL=chaos-socket.spec.js.map