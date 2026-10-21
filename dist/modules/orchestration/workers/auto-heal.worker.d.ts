import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { ContainerInstanceEntity } from '../entities/container-instance.entity';
import { ContainerHealLogEntity } from '../entities/container-heal-log.entity';
import { IContainerOrchestrator } from '../interfaces/container-orchestrator.interface';
import { RealtimeEventService } from '../../realtime-gateway/services/realtime-event.service';
export declare class AutoHealWorker {
    private readonly instanceRepo;
    private readonly healLogRepo;
    private readonly orchestrator;
    private readonly redis;
    private readonly realtimeService;
    private readonly config;
    private readonly logger;
    private readonly stallThresholdMs;
    private isHealing;
    constructor(instanceRepo: Repository<ContainerInstanceEntity>, healLogRepo: Repository<ContainerHealLogEntity>, orchestrator: IContainerOrchestrator, redis: Redis, realtimeService: RealtimeEventService, config: ConfigService);
    runAutoHeal(): Promise<void>;
    private checkAndHealInstance;
    private healInstance;
    manualHeal(serviceId: string): Promise<boolean>;
}
