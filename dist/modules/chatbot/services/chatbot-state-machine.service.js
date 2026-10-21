"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatbotStateMachineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotStateMachineService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const chatbot_service_1 = require("./chatbot.service");
const baileys_client_factory_1 = require("../../session-hydration/factories/baileys-client.factory");
const injection_shield_service_1 = require("./injection-shield.service");
const memory_service_1 = require("./memory.service");
const rag_service_1 = require("./rag.service");
const escalation_agent_service_1 = require("./escalation-agent.service");
const analytics_emitter_service_1 = require("./analytics-emitter.service");
const safe_regex_util_1 = require("../../../common/utils/safe-regex.util");
let ChatbotStateMachineService = ChatbotStateMachineService_1 = class ChatbotStateMachineService {
    constructor(redis, chatbotService, baileysFactory, config, injectionShield, memoryService, ragService, escalationAgent, analyticsEmitter) {
        this.redis = redis;
        this.chatbotService = chatbotService;
        this.baileysFactory = baileysFactory;
        this.config = config;
        this.injectionShield = injectionShield;
        this.memoryService = memoryService;
        this.ragService = ragService;
        this.escalationAgent = escalationAgent;
        this.analyticsEmitter = analyticsEmitter;
        this.logger = new common_1.Logger(ChatbotStateMachineService_1.name);
        this.SESSION_TTL = 900;
        this.HUMAN_PAUSE_TTL = 3600;
        this.llmIntentEnabled = this.config.get('ENABLE_LLM_INTENT', 'false') === 'true';
        this.typingIndicatorEnabled = this.config.get('ENABLE_TYPING_INDICATOR', 'false') === 'true';
        this.shieldEnabled = this.config.get('ENABLE_SHIELD', 'false') === 'true';
        this.memoryEnabled = this.config.get('ENABLE_MEMORY', 'false') === 'true';
        this.ragEnabled = this.config.get('ENABLE_RAG', 'false') === 'true';
        this.escalationAgentEnabled = this.config.get('ENABLE_ESCALATION_AGENT', 'false') === 'true';
        this.analyticsEnabled = this.config.get('ENABLE_ANALYTICS', 'false') === 'true';
        this.llmTimeoutMs = this.config.get('LLM_TIMEOUT_MS', 500);
        if (this.llmIntentEnabled) {
            this.logger.log('[Chatbot] 🤖 LLM Intent Router ENABLED (ENABLE_LLM_INTENT=true)');
        }
        if (this.typingIndicatorEnabled) {
            this.logger.log('[Chatbot] ⌨️  Typing Indicator ENABLED (ENABLE_TYPING_INDICATOR=true)');
        }
        if (this.shieldEnabled) {
            this.logger.log('[Chatbot] 🛡️  Prompt-Injection Shield ENABLED (ENABLE_SHIELD=true)');
        }
        if (this.memoryEnabled) {
            this.logger.log('[Chatbot] 🧠 Conversational Memory ENABLED (ENABLE_MEMORY=true)');
        }
        if (this.ragEnabled) {
            this.logger.log('[Chatbot] 📚 RAG Knowledge Base ENABLED (ENABLE_RAG=true)');
        }
        if (this.escalationAgentEnabled) {
            this.logger.log('[Chatbot] 📋 Escalation Agent ENABLED (ENABLE_ESCALATION_AGENT=true)');
        }
        if (this.analyticsEnabled) {
            this.logger.log('[Chatbot] 📊 Real-Time Analytics Pipeline ENABLED (ENABLE_ANALYTICS=true)');
        }
        if (!this.llmIntentEnabled && !this.typingIndicatorEnabled) {
            this.logger.log('[Chatbot] ✅ Running in deterministic FSM mode (all AI flags OFF)');
        }
    }
    sessionKey(accountId, senderJid) {
        return `wa:session:${accountId}:${senderJid}`;
    }
    pauseKey(accountId, chatJid) {
        return `wa:bot:paused:${accountId}:${chatJid}`;
    }
    async pauseChatbot(accountId, chatJid, durationSec = this.HUMAN_PAUSE_TTL) {
        const key = this.pauseKey(accountId, chatJid);
        await this.redis.set(key, '1', 'EX', durationSec);
        this.logger.log(`[Chatbot] Paused bot for ${chatJid} (${accountId}) for ${durationSec}s`);
    }
    async resumeChatbot(accountId, chatJid) {
        await this.redis.del(this.pauseKey(accountId, chatJid));
        this.logger.log(`[Chatbot] Resumed bot for ${chatJid} (${accountId})`);
    }
    async isChatbotPaused(accountId, chatJid) {
        const res = await this.redis.get(this.pauseKey(accountId, chatJid));
        return res === '1';
    }
    async getSession(accountId, senderJid) {
        const raw = await this.redis.get(this.sessionKey(accountId, senderJid));
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    async saveSession(accountId, senderJid, session) {
        const key = this.sessionKey(accountId, senderJid);
        await this.redis.set(key, JSON.stringify(session), 'EX', this.SESSION_TTL);
    }
    async clearSession(accountId, senderJid) {
        await this.redis.del(this.sessionKey(accountId, senderJid));
    }
    async handleStaffMessageSent({ accountId, chatJid }) {
        if (!accountId || !chatJid)
            return;
        await this.pauseChatbot(accountId, chatJid, this.HUMAN_PAUSE_TTL);
    }
    async handleIncomingMessage({ accountId, message, }) {
        if (!message || message.fromMe)
            return;
        const chatJid = message.chatJid;
        const senderJid = message.senderJid || chatJid;
        const text = message.text?.trim();
        if (!chatJid || !text)
            return;
        const isPaused = await this.isChatbotPaused(accountId, chatJid);
        if (isPaused) {
            this.logger.debug(`[Chatbot] Skipped ${chatJid}: human takeover active`);
            return;
        }
        if (this.shieldEnabled) {
            const shield = this.injectionShield.sanitize(text);
            if (!shield.safe) {
                this.logger.warn(`[Chatbot] 🛡️ Injection attempt blocked from ${senderJid}: ${shield.reason}`);
                if (this.analyticsEnabled) {
                    await this.analyticsEmitter.emit({
                        type: 'injection_blocked',
                        accountId,
                        senderJid,
                        timestamp: Date.now(),
                    }).catch(() => null);
                }
                return;
            }
        }
        try {
            let session = await this.getSession(accountId, senderJid);
            if (session && session.status === 'ACTIVE') {
                await this.progressFlow(accountId, chatJid, senderJid, text, session);
            }
            else {
                const flow = await this.resolveFlow(accountId, text);
                if (flow) {
                    await this.startFlow(accountId, chatJid, senderJid, flow);
                }
            }
        }
        catch (err) {
            this.logger.error(`[Chatbot] Error processing message from ${chatJid}: ${err.message}`, err.stack);
        }
    }
    async resolveFlow(accountId, text) {
        if (!this.llmIntentEnabled) {
            return this.chatbotService.matchFlow(accountId, text);
        }
        const apiKey = this.config.get('OPENAI_API_KEY', '');
        if (!apiKey) {
            this.logger.warn('[Chatbot] ENABLE_LLM_INTENT=true but OPENAI_API_KEY is not set — falling back to FSM');
            return this.chatbotService.matchFlow(accountId, text);
        }
        try {
            const { default: OpenAI } = await Promise.resolve().then(() => require('openai')).catch(() => ({ default: null }));
            if (!OpenAI) {
                this.logger.warn('[Chatbot] openai package not installed — run: npm install openai');
                return this.chatbotService.matchFlow(accountId, text);
            }
            const openai = new OpenAI({ apiKey });
            const flows = await this.chatbotService.findAll(accountId);
            const flowIndex = flows
                .filter(f => f.isActive)
                .map(f => ({ id: f.id, name: f.name, hint: f.triggerKeyword ?? '' }));
            const cacheKey = `wa:intent:${accountId}:${require('crypto')
                .createHash('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 20)}`;
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                const { flowId, confidence } = JSON.parse(cached);
                if (confidence > 0.78 && flowId) {
                    this.logger.debug(`[Chatbot] LLM intent cache hit → flowId ${flowId}`);
                    return this.chatbotService.findOne(flowId).catch(() => null);
                }
            }
            const llmPromise = openai.chat.completions.create({
                model: 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                temperature: 0,
                max_tokens: 180,
                messages: [{
                        role: 'system',
                        content: `Intent classifier. Return JSON ONLY:
{ "flowId": string|null, "confidence": 0-1, "slots": {} }
Match user message to best flow. If no match: { "flowId": null, "confidence": 0, "slots": {} }
Flows: ${JSON.stringify(flowIndex)}`,
                    }, {
                        role: 'user',
                        content: text,
                    }],
            });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('LLM_TIMEOUT')), this.llmTimeoutMs));
            const raw = await Promise.race([llmPromise, timeoutPromise]);
            const result = JSON.parse(raw.choices[0].message.content ?? '{}');
            this.logger.debug(`[Chatbot] LLM intent: flowId=${result.flowId}, confidence=${result.confidence}`);
            if (result.confidence > 0.8 && result.flowId) {
                await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
            }
            if (result.confidence > 0.78 && result.flowId) {
                return this.chatbotService.findOne(result.flowId).catch(() => null);
            }
            return this.chatbotService.matchFlow(accountId, text);
        }
        catch (err) {
            const reason = err.message === 'LLM_TIMEOUT' ? 'timeout' : err.message;
            this.logger.warn(`[Chatbot] LLM intent failed (${reason}) — falling back to FSM keyword match`);
            return this.chatbotService.matchFlow(accountId, text);
        }
    }
    async startFlow(accountId, chatJid, senderJid, flow) {
        const nodes = JSON.parse(flow.nodes || '[]');
        const edges = JSON.parse(flow.edges || '[]');
        if (nodes.length === 0)
            return;
        let startNode = nodes.find(n => n.type === 'trigger') || nodes[0];
        if (startNode.type === 'trigger') {
            const edge = edges.find(e => e.source === startNode.id);
            if (edge) {
                const nextNode = nodes.find(n => n.id === edge.target);
                if (nextNode)
                    startNode = nextNode;
            }
        }
        const session = {
            flowId: flow.id,
            currentNodeId: startNode.id,
            variables: {},
            enteredAt: Date.now(),
            lastActivityAt: Date.now(),
            status: 'ACTIVE',
            transcript: [],
        };
        if (this.memoryEnabled) {
            try {
                const memoryFacts = await this.memoryService.hydrate(accountId, senderJid);
                if (memoryFacts && typeof memoryFacts === 'object') {
                    Object.assign(session.variables, memoryFacts);
                }
            }
            catch (err) {
                this.logger.warn(`[Chatbot] Memory hydration error for ${senderJid}: ${err.message}`);
            }
        }
        if (this.analyticsEnabled) {
            await this.analyticsEmitter.emit({
                type: 'flow_start',
                accountId,
                flowId: flow.id,
                senderJid,
                timestamp: Date.now(),
            }).catch(() => null);
        }
        this.logger.log(`[Chatbot] Started flow "${flow.name}" for ${chatJid} at node ${startNode.id}`);
        await this.executeNode(accountId, chatJid, senderJid, startNode, nodes, edges, session);
    }
    async progressFlow(accountId, chatJid, senderJid, userText, session) {
        const flow = await this.chatbotService.findOne(session.flowId);
        if (!flow || !flow.isActive) {
            await this.clearSession(accountId, senderJid);
            return;
        }
        const nodes = JSON.parse(flow.nodes || '[]');
        const edges = JSON.parse(flow.edges || '[]');
        const currentNode = nodes.find(n => n.id === session.currentNodeId);
        if (!currentNode) {
            await this.clearSession(accountId, senderJid);
            return;
        }
        session.transcript = session.transcript || [];
        session.transcript.push(`User: ${userText}`);
        session.variables.__lastUserText = userText;
        if (currentNode.type === 'input_capture' && currentNode.data?.variableName) {
            session.variables[currentNode.data.variableName] = userText;
        }
        const outgoingEdges = edges.filter(e => e.source === currentNode.id);
        if (outgoingEdges.length === 0) {
            session.status = 'COMPLETED';
            if (this.memoryEnabled) {
                await this.memoryService.persist(accountId, senderJid, session).catch(() => null);
            }
            if (this.analyticsEnabled) {
                await this.analyticsEmitter.emit({
                    type: 'flow_complete',
                    accountId,
                    flowId: session.flowId,
                    senderJid,
                    timestamp: Date.now(),
                }).catch(() => null);
            }
            await this.clearSession(accountId, senderJid);
            this.logger.log(`[Chatbot] Flow completed for ${chatJid}`);
            return;
        }
        let nextNodeId = null;
        if (currentNode.type === 'condition') {
            const cond = (currentNode.data?.conditionExpression || '').toLowerCase().trim();
            const match = userText.toLowerCase().includes(cond) || (session.variables[cond] !== undefined);
            const chosenEdge = outgoingEdges.find(e => e.sourceHandle === (match ? 'true' : 'false')) || outgoingEdges[0];
            nextNodeId = chosenEdge?.target || null;
        }
        else {
            nextNodeId = outgoingEdges[0].target;
        }
        if (!nextNodeId) {
            session.status = 'COMPLETED';
            if (this.memoryEnabled) {
                await this.memoryService.persist(accountId, senderJid, session).catch(() => null);
            }
            if (this.analyticsEnabled) {
                await this.analyticsEmitter.emit({
                    type: 'flow_complete',
                    accountId,
                    flowId: session.flowId,
                    senderJid,
                    timestamp: Date.now(),
                }).catch(() => null);
            }
            await this.clearSession(accountId, senderJid);
            return;
        }
        const nextNode = nodes.find(n => n.id === nextNodeId);
        if (!nextNode) {
            await this.clearSession(accountId, senderJid);
            return;
        }
        session.currentNodeId = nextNode.id;
        session.lastActivityAt = Date.now();
        await this.executeNode(accountId, chatJid, senderJid, nextNode, nodes, edges, session);
    }
    async executeNode(accountId, chatJid, senderJid, node, nodes, edges, session) {
        const client = this.baileysFactory.getClient(accountId);
        if (!client?.socket) {
            this.logger.warn(`[Chatbot] Account ${accountId} not connected to execute node`);
            return;
        }
        if (this.analyticsEnabled) {
            await this.analyticsEmitter.emit({
                type: 'node_enter',
                accountId,
                flowId: session.flowId,
                nodeId: node.id,
                nodeType: node.type,
                senderJid,
                timestamp: Date.now(),
            }).catch(() => null);
        }
        switch (node.type) {
            case 'message': {
                const template = node.data?.text || 'Hello! How can we assist you today?';
                const replyText = this.interpolateVariables(template, session.variables, senderJid);
                if (this.typingIndicatorEnabled) {
                    try {
                        await client.socket.sendPresenceUpdate('composing', chatJid);
                        await new Promise(r => setTimeout(r, 600));
                        await client.socket.sendMessage(chatJid, { text: replyText });
                    }
                    finally {
                        await client.socket.sendPresenceUpdate('paused', chatJid).catch(() => null);
                    }
                }
                else {
                    await client.socket.sendMessage(chatJid, { text: replyText });
                }
                session.transcript = session.transcript || [];
                session.transcript.push(`Bot: ${replyText}`);
                this.logger.log(`[Chatbot] Sent message node to ${chatJid}: "${replyText.slice(0, 40)}..."`);
                const nextEdge = edges.find(e => e.source === node.id);
                if (nextEdge) {
                    const nextNode = nodes.find(n => n.id === nextEdge.target);
                    if (nextNode && nextNode.type !== 'input_capture') {
                        session.currentNodeId = nextNode.id;
                        await this.executeNode(accountId, chatJid, senderJid, nextNode, nodes, edges, session);
                        return;
                    }
                }
                await this.saveSession(accountId, senderJid, session);
                break;
            }
            case 'knowledge_base': {
                let answerText = node.data?.text || 'Searching knowledge base...';
                if (this.ragEnabled) {
                    try {
                        const query = session.variables.__lastUserText || node.data?.text || '';
                        answerText = await this.ragService.answer(query, accountId);
                    }
                    catch (err) {
                        this.logger.warn(`[Chatbot] RAG answer failed: ${err.message}`);
                    }
                }
                if (this.typingIndicatorEnabled) {
                    try {
                        await client.socket.sendPresenceUpdate('composing', chatJid);
                        await new Promise(r => setTimeout(r, 600));
                        await client.socket.sendMessage(chatJid, { text: answerText });
                    }
                    finally {
                        await client.socket.sendPresenceUpdate('paused', chatJid).catch(() => null);
                    }
                }
                else {
                    await client.socket.sendMessage(chatJid, { text: answerText });
                }
                session.transcript = session.transcript || [];
                session.transcript.push(`Bot (KB): ${answerText}`);
                this.logger.log(`[Chatbot] Sent KB response to ${chatJid}: "${answerText.slice(0, 40)}..."`);
                const nextEdge = edges.find(e => e.source === node.id);
                if (nextEdge) {
                    const nextNode = nodes.find(n => n.id === nextEdge.target);
                    if (nextNode && nextNode.type !== 'input_capture') {
                        session.currentNodeId = nextNode.id;
                        await this.executeNode(accountId, chatJid, senderJid, nextNode, nodes, edges, session);
                        return;
                    }
                }
                await this.saveSession(accountId, senderJid, session);
                break;
            }
            case 'wait': {
                const delay = Math.min(Math.max(node.data?.waitMs || 1000, 500), 10000);
                await new Promise(r => setTimeout(r, delay));
                const nextEdge = edges.find(e => e.source === node.id);
                if (nextEdge) {
                    const nextNode = nodes.find(n => n.id === nextEdge.target);
                    if (nextNode) {
                        session.currentNodeId = nextNode.id;
                        await this.executeNode(accountId, chatJid, senderJid, nextNode, nodes, edges, session);
                        return;
                    }
                }
                await this.saveSession(accountId, senderJid, session);
                break;
            }
            case 'escalate': {
                const escalateMsg = node.data?.escalateMessage || 'Connecting you to our team. A human agent will reply shortly!';
                await client.socket.sendMessage(chatJid, { text: escalateMsg });
                await this.pauseChatbot(accountId, chatJid, 86400);
                session.status = 'ESCALATED';
                const transcriptStr = (session.transcript || []).join('\n') || 'Customer reached escalation node.';
                if (this.escalationAgentEnabled) {
                    this.escalationAgent
                        .generateHandoff(chatJid, session.variables, session.variables, node.id)
                        .then(brief => {
                        this.logger.log(`[Chatbot] 📋 Escalation brief generated for ${chatJid} (priority: ${brief.priority}): ${brief.customerBrief}`);
                    })
                        .catch(err => this.logger.warn(`[Chatbot] Escalation brief failed: ${err.message}`));
                }
                if (this.memoryEnabled) {
                    await this.memoryService.persist(accountId, senderJid, session).catch(() => null);
                }
                if (this.analyticsEnabled) {
                    await this.analyticsEmitter.emit({
                        type: 'flow_escalate',
                        accountId,
                        flowId: session.flowId,
                        senderJid,
                        timestamp: Date.now(),
                    }).catch(() => null);
                }
                await this.clearSession(accountId, senderJid);
                this.logger.log(`[Chatbot] Escalated ${chatJid} to human support`);
                break;
            }
            case 'input_capture':
            default: {
                session.status = 'WAITING_INPUT';
                await this.saveSession(accountId, senderJid, session);
                break;
            }
        }
    }
    interpolateVariables(text, variables, senderJid) {
        const phone = senderJid ? senderJid.split('@')[0] : '';
        const allVars = {
            phone,
            name: variables?.name || phone,
            ...(variables || {}),
        };
        return (0, safe_regex_util_1.safeInterpolate)(text, allVars);
    }
};
exports.ChatbotStateMachineService = ChatbotStateMachineService;
__decorate([
    (0, event_emitter_1.OnEvent)('whatsapp.message.sent'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatbotStateMachineService.prototype, "handleStaffMessageSent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chatbot.incoming'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatbotStateMachineService.prototype, "handleIncomingMessage", null);
exports.ChatbotStateMachineService = ChatbotStateMachineService = ChatbotStateMachineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => baileys_client_factory_1.BaileysClientFactory))),
    __metadata("design:paramtypes", [Function, chatbot_service_1.ChatbotService,
        baileys_client_factory_1.BaileysClientFactory,
        config_1.ConfigService,
        injection_shield_service_1.InjectionShieldService,
        memory_service_1.MemoryService,
        rag_service_1.RagService,
        escalation_agent_service_1.EscalationAgentService,
        analytics_emitter_service_1.AnalyticsEmitterService])
], ChatbotStateMachineService);
//# sourceMappingURL=chatbot-state-machine.service.js.map