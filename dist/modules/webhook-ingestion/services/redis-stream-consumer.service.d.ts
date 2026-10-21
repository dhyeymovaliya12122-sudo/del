import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { RedisStreamPublisherService } from './redis-stream-publisher.service';
import { StreamCheckpointEntity } from '../entities/stream-checkpoint.entity';
import { WebhookIngestionLogEntity } from '../../security-guard/entities/webhook-ingestion-log.entity';
export declare class RedisStreamConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly redis;
    private readonly checkpointRepo;
    private readonly webhookLogRepo;
    private readonly publisherService;
    private readonly config;
    private readonly logger;
    private readonly consumerId;
    private isRunning;
    private streamsSupported;
    private pollLoop;
    constructor(redis: Redis, checkpointRepo: Repository<StreamCheckpointEntity>, webhookLogRepo: Repository<WebhookIngestionLogEntity>, publisherService: RedisStreamPublisherService, config: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private startPollLoop;
    private readAndProcess;
    private processMessage;
    recoverPendingMessages(): Promise<void>;
    private deadLetter;
    private ensureCheckpoint;
    getLag(): Promise<number>;
}
