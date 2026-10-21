import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ChatbotFlowEntity } from './entities/chatbot-flow.entity';
import { ConversationMemoryEntity } from './entities/conversation-memory.entity';
import { ChatbotService } from './services/chatbot.service';
import { ChatbotController } from './controllers/chatbot.controller';
import { ChatbotStateMachineService } from './services/chatbot-state-machine.service';
import { InjectionShieldService } from './services/injection-shield.service';
import { MemoryService } from './services/memory.service';
import { SemanticCacheService } from './services/semantic-cache.service';
import { RagService } from './services/rag.service';
import { EscalationAgentService } from './services/escalation-agent.service';
import { AnalyticsEmitterService } from './services/analytics-emitter.service';
import { MemorySummariserWorker } from './workers/memory-summariser.worker';
import { SessionHydrationModule } from '../session-hydration/session-hydration.module';

@Module({
  imports: [
    ConfigModule,                                        // ConfigService for feature flags
    TypeOrmModule.forFeature([
      ChatbotFlowEntity,
      ConversationMemoryEntity,                          // memory.service.ts + memory-summariser.worker.ts
    ]),
    BullModule.registerQueue({ name: 'memory-summariser' }), // async summarisation queue
    forwardRef(() => SessionHydrationModule),
  ],
  controllers: [ChatbotController],
  providers: [
    // Core FSM
    ChatbotService,
    ChatbotStateMachineService,

    // Phase 1 — Foundation
    InjectionShieldService,      // [F-10] prompt-injection shield

    // Phase 2 — Memory & Cache
    MemoryService,               // [F-2] conversational memory
    MemorySummariserWorker,      // [F-2] async BullMQ summarisation worker
    SemanticCacheService,        // [P-1] two-level semantic response cache

    // Phase 3 — Knowledge & Escalation
    RagService,                  // [F-3] pgvector RAG with HyDE
    EscalationAgentService,      // [F-11] autonomous CRM handoff agent

    // Observability
    AnalyticsEmitterService,     // [F-13] Redis Streams analytics pipeline
  ],
  exports: [
    ChatbotService,
    ChatbotStateMachineService,
    SemanticCacheService,        // exported so future modules can invalidate cache
    AnalyticsEmitterService,     // exported for dashboard controllers
  ],
})
export class ChatbotModule {}
