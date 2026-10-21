"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const chatbot_flow_entity_1 = require("./entities/chatbot-flow.entity");
const conversation_memory_entity_1 = require("./entities/conversation-memory.entity");
const chatbot_service_1 = require("./services/chatbot.service");
const chatbot_controller_1 = require("./controllers/chatbot.controller");
const chatbot_state_machine_service_1 = require("./services/chatbot-state-machine.service");
const injection_shield_service_1 = require("./services/injection-shield.service");
const memory_service_1 = require("./services/memory.service");
const semantic_cache_service_1 = require("./services/semantic-cache.service");
const rag_service_1 = require("./services/rag.service");
const escalation_agent_service_1 = require("./services/escalation-agent.service");
const analytics_emitter_service_1 = require("./services/analytics-emitter.service");
const memory_summariser_worker_1 = require("./workers/memory-summariser.worker");
const session_hydration_module_1 = require("../session-hydration/session-hydration.module");
let ChatbotModule = class ChatbotModule {
};
exports.ChatbotModule = ChatbotModule;
exports.ChatbotModule = ChatbotModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([
                chatbot_flow_entity_1.ChatbotFlowEntity,
                conversation_memory_entity_1.ConversationMemoryEntity,
            ]),
            bullmq_1.BullModule.registerQueue({ name: 'memory-summariser' }),
            (0, common_1.forwardRef)(() => session_hydration_module_1.SessionHydrationModule),
        ],
        controllers: [chatbot_controller_1.ChatbotController],
        providers: [
            chatbot_service_1.ChatbotService,
            chatbot_state_machine_service_1.ChatbotStateMachineService,
            injection_shield_service_1.InjectionShieldService,
            memory_service_1.MemoryService,
            memory_summariser_worker_1.MemorySummariserWorker,
            semantic_cache_service_1.SemanticCacheService,
            rag_service_1.RagService,
            escalation_agent_service_1.EscalationAgentService,
            analytics_emitter_service_1.AnalyticsEmitterService,
        ],
        exports: [
            chatbot_service_1.ChatbotService,
            chatbot_state_machine_service_1.ChatbotStateMachineService,
            semantic_cache_service_1.SemanticCacheService,
            analytics_emitter_service_1.AnalyticsEmitterService,
        ],
    })
], ChatbotModule);
//# sourceMappingURL=chatbot.module.js.map