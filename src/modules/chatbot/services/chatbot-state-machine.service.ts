// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/chatbot/services/chatbot-state-machine.service.ts
//  Enterprise Redis-backed Finite State Machine for WhatsApp Chatbot
//  - Session tracking with 15-minute inactivity TTL (wa:session:{acc}:{jid})
//  - Deterministic AST Node traversal (trigger, message, input_capture, condition, wait, escalate)
//  - Staff takeover auto-pause guard (wa:bot:paused:{acc}:{jid})
//
//  AI FEATURE FLAGS (all default OFF — FSM runs unchanged when unset):
//    ENABLE_LLM_INTENT=true      → LLM intent router replaces keyword .includes()
//    ENABLE_TYPING_INDICATOR=true → WhatsApp "composing..." presence before replies
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
import { ChatbotService } from './chatbot.service';
import { ChatbotFlowEntity } from '../entities/chatbot-flow.entity';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
import { InjectionShieldService } from './injection-shield.service';
import { MemoryService } from './memory.service';
import { RagService } from './rag.service';
import { EscalationAgentService } from './escalation-agent.service';
import { AnalyticsEmitterService } from './analytics-emitter.service';
import { safeInterpolate } from '../../../common/utils/safe-regex.util';

export interface ChatSessionState {
  flowId: string;
  currentNodeId: string;
  variables: Record<string, any>;
  enteredAt: number;
  lastActivityAt: number;
  status: 'ACTIVE' | 'WAITING_INPUT' | 'COMPLETED' | 'ESCALATED';
  transcript?: string[];
}

export interface FlowNodeAST {
  id: string;
  type: 'trigger' | 'message' | 'condition' | 'input_capture' | 'wait' | 'escalate' | 'knowledge_base';
  data?: {
    text?: string;
    keyword?: string;
    conditionExpression?: string;
    variableName?: string;
    waitMs?: number;
    escalateMessage?: string;
  };
  position?: { x: number; y: number };
}

export interface FlowEdgeAST {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // 'true' | 'false' | 'default'
}

@Injectable()
export class ChatbotStateMachineService {
  private readonly logger = new Logger(ChatbotStateMachineService.name);
  private readonly SESSION_TTL = 900;      // 15 minutes of inactivity resets flow
  private readonly HUMAN_PAUSE_TTL = 3600; // 1 hour pause when staff takes over

  // ── AI Feature Flags — read once at startup, never change at runtime ────────
  // All are false by default. Existing FSM behaviour is completely unchanged
  // until you explicitly set these to true in your .env file.
  private readonly llmIntentEnabled:       boolean;
  private readonly typingIndicatorEnabled: boolean;
  private readonly shieldEnabled:          boolean;
  private readonly memoryEnabled:          boolean;
  private readonly ragEnabled:             boolean;
  private readonly escalationAgentEnabled: boolean;
  private readonly analyticsEnabled:       boolean;
  private readonly llmTimeoutMs:           number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly chatbotService: ChatbotService,
    @Inject(forwardRef(() => BaileysClientFactory))
    private readonly baileysFactory: BaileysClientFactory,
    private readonly config: ConfigService,
    private readonly injectionShield: InjectionShieldService,
    private readonly memoryService: MemoryService,
    private readonly ragService: RagService,
    private readonly escalationAgent: EscalationAgentService,
    private readonly analyticsEmitter: AnalyticsEmitterService,
  ) {
    this.llmIntentEnabled       = this.config.get<string>('ENABLE_LLM_INTENT',       'false') === 'true';
    this.typingIndicatorEnabled = this.config.get<string>('ENABLE_TYPING_INDICATOR', 'false') === 'true';
    this.shieldEnabled          = this.config.get<string>('ENABLE_SHIELD',          'false') === 'true';
    this.memoryEnabled          = this.config.get<string>('ENABLE_MEMORY',          'false') === 'true';
    this.ragEnabled             = this.config.get<string>('ENABLE_RAG',             'false') === 'true';
    this.escalationAgentEnabled = this.config.get<string>('ENABLE_ESCALATION_AGENT', 'false') === 'true';
    this.analyticsEnabled       = this.config.get<string>('ENABLE_ANALYTICS',       'false') === 'true';
    this.llmTimeoutMs           = this.config.get<number>('LLM_TIMEOUT_MS',           500);

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

  private sessionKey(accountId: string, senderJid: string): string {
    return `wa:session:${accountId}:${senderJid}`;
  }

  private pauseKey(accountId: string, chatJid: string): string {
    return `wa:bot:paused:${accountId}:${chatJid}`;
  }

  /**
   * Pause chatbot for a specific chat (e.g. human staff reply or manual takeover)
   */
  async pauseChatbot(accountId: string, chatJid: string, durationSec = this.HUMAN_PAUSE_TTL): Promise<void> {
    const key = this.pauseKey(accountId, chatJid);
    await this.redis.set(key, '1', 'EX', durationSec);
    this.logger.log(`[Chatbot] Paused bot for ${chatJid} (${accountId}) for ${durationSec}s`);
  }

  /**
   * Resume chatbot for a specific chat
   */
  async resumeChatbot(accountId: string, chatJid: string): Promise<void> {
    await this.redis.del(this.pauseKey(accountId, chatJid));
    this.logger.log(`[Chatbot] Resumed bot for ${chatJid} (${accountId})`);
  }

  /**
   * Check if chatbot is paused for this chat
   */
  async isChatbotPaused(accountId: string, chatJid: string): Promise<boolean> {
    const res = await this.redis.get(this.pauseKey(accountId, chatJid));
    return res === '1';
  }

  /**
   * Get active session from Redis
   */
  async getSession(accountId: string, senderJid: string): Promise<ChatSessionState | null> {
    const raw = await this.redis.get(this.sessionKey(accountId, senderJid));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Save or update session in Redis with 15m TTL
   */
  async saveSession(accountId: string, senderJid: string, session: ChatSessionState): Promise<void> {
    const key = this.sessionKey(accountId, senderJid);
    await this.redis.set(key, JSON.stringify(session), 'EX', this.SESSION_TTL);
  }

  /**
   * Clear session
   */
  async clearSession(accountId: string, senderJid: string): Promise<void> {
    await this.redis.del(this.sessionKey(accountId, senderJid));
  }

  /**
   * Event listener for messages sent by staff from Web UI or phone
   * Auto-pauses chatbot so bot doesn't interfere with human operator
   */
  @OnEvent('whatsapp.message.sent')
  async handleStaffMessageSent({ accountId, chatJid }: { accountId: string; chatJid: string }) {
    if (!accountId || !chatJid) return;
    await this.pauseChatbot(accountId, chatJid, this.HUMAN_PAUSE_TTL);
  }

  /**
   * Event listener for incoming messages from WhatsApp Baileys socket
   */
  @OnEvent('chatbot.incoming')
  async handleIncomingMessage({
    accountId,
    message,
  }: {
    accountId: string;
    message: Partial<WhatsappMessageEntity>;
  }) {
    if (!message || message.fromMe) return;
    const chatJid = message.chatJid;
    const senderJid = message.senderJid || chatJid;
    const text = message.text?.trim();

    if (!chatJid || !text) return;

    // 1. Check if human takeover is active
    const isPaused = await this.isChatbotPaused(accountId, chatJid);
    if (isPaused) {
      this.logger.debug(`[Chatbot] Skipped ${chatJid}: human takeover active`);
      return;
    }

    // ── Prompt-Injection Shield Gate [F-10] ─────────────────────────────────
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
      // 2. Check for active session in Redis
      let session = await this.getSession(accountId, senderJid);

      if (session && session.status === 'ACTIVE') {
        // Continue existing flow (LLM flag has no effect here — session already running)
        await this.progressFlow(accountId, chatJid, senderJid, text, session);
      } else {
        // ── Flow Trigger: LLM Intent Router vs Deterministic FSM ──────────────
        // ENABLE_LLM_INTENT=false (default): existing keyword .includes() runs unchanged.
        // ENABLE_LLM_INTENT=true:            gpt-4o-mini classifies intent; falls back
        //                                   to keyword FSM on timeout / low confidence.
        const flow = await this.resolveFlow(accountId, text);
        if (flow) {
          await this.startFlow(accountId, chatJid, senderJid, flow);
        }
      }
    } catch (err: any) {
      this.logger.error(`[Chatbot] Error processing message from ${chatJid}: ${err.message}`, err.stack);
    }
  }

  /**
   * resolveFlow — single entry point for flow matching.
   * When ENABLE_LLM_INTENT=false  → calls existing matchFlow() unchanged.
   * When ENABLE_LLM_INTENT=true   → calls LLM classifier with 500ms hard timeout;
   *                                  falls back to matchFlow() on timeout/failure.
   */
  private async resolveFlow(accountId: string, text: string): Promise<ChatbotFlowEntity | null> {
    // ── DEFAULT PATH (flag off) — zero change to existing behaviour ───────────
    if (!this.llmIntentEnabled) {
      return this.chatbotService.matchFlow(accountId, text);
    }

    // ── LLM PATH (flag on) ────────────────────────────────────────────────────
    // Guard: only attempt if OPENAI_API_KEY is configured
    const apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    if (!apiKey) {
      this.logger.warn('[Chatbot] ENABLE_LLM_INTENT=true but OPENAI_API_KEY is not set — falling back to FSM');
      return this.chatbotService.matchFlow(accountId, text);
    }

    try {
      // Lazy-import OpenAI so the class loads fine even when the package isn't installed
      const { default: OpenAI } = await import('openai').catch(() => ({ default: null })) as any;
      if (!OpenAI) {
        this.logger.warn('[Chatbot] openai package not installed — run: npm install openai');
        return this.chatbotService.matchFlow(accountId, text);
      }

      const openai   = new OpenAI({ apiKey });
      const flows    = await this.chatbotService.findAll(accountId);
      const flowIndex = flows
        .filter(f => f.isActive)
        .map(f => ({ id: f.id, name: f.name, hint: f.triggerKeyword ?? '' }));

      // ── Redis L1 cache — exact message hash (sub-millisecond) ────────────────
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

      // ── LLM call with hard timeout (falls back to FSM on expiry) ─────────────
      const llmPromise = openai.chat.completions.create({
        model:           'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature:     0,
        max_tokens:      180,
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

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('LLM_TIMEOUT')), this.llmTimeoutMs),
      );

      const raw    = await Promise.race([llmPromise, timeoutPromise]) as Awaited<typeof llmPromise>;
      const result = JSON.parse(raw.choices[0].message.content ?? '{}');

      this.logger.debug(
        `[Chatbot] LLM intent: flowId=${result.flowId}, confidence=${result.confidence}`,
      );

      // Cache high-confidence hits for 1 hour
      if (result.confidence > 0.8 && result.flowId) {
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
      }

      // Use LLM result if confident; otherwise fall back to keyword FSM
      if (result.confidence > 0.78 && result.flowId) {
        return this.chatbotService.findOne(result.flowId).catch(() => null);
      }

      // Low confidence — let the deterministic FSM decide
      return this.chatbotService.matchFlow(accountId, text);

    } catch (err: any) {
      // LLM timeout, API error, or JSON parse failure — FSM always wins
      const reason = err.message === 'LLM_TIMEOUT' ? 'timeout' : err.message;
      this.logger.warn(`[Chatbot] LLM intent failed (${reason}) — falling back to FSM keyword match`);
      return this.chatbotService.matchFlow(accountId, text);
    }
  }

  /**
   * Start a new flow from its entry point
   */
  private async startFlow(
    accountId: string,
    chatJid: string,
    senderJid: string,
    flow: ChatbotFlowEntity,
  ) {
    const nodes: FlowNodeAST[] = JSON.parse(flow.nodes || '[]');
    const edges: FlowEdgeAST[] = JSON.parse(flow.edges || '[]');

    if (nodes.length === 0) return;

    // Find root node (trigger or first message)
    let startNode = nodes.find(n => n.type === 'trigger') || nodes[0];

    // If trigger node, find its first target edge
    if (startNode.type === 'trigger') {
      const edge = edges.find(e => e.source === startNode.id);
      if (edge) {
        const nextNode = nodes.find(n => n.id === edge.target);
        if (nextNode) startNode = nextNode;
      }
    }

    const session: ChatSessionState = {
      flowId: flow.id,
      currentNodeId: startNode.id,
      variables: {},
      enteredAt: Date.now(),
      lastActivityAt: Date.now(),
      status: 'ACTIVE',
      transcript: [],
    };

    // ── Hydrate past conversation memory if enabled [F-2] ───────────────────
    if (this.memoryEnabled) {
      try {
        const memoryFacts = await this.memoryService.hydrate(accountId, senderJid);
        if (memoryFacts && typeof memoryFacts === 'object') {
          Object.assign(session.variables, memoryFacts);
        }
      } catch (err: any) {
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

  /**
   * Progress an existing conversational flow
   */
  private async progressFlow(
    accountId: string,
    chatJid: string,
    senderJid: string,
    userText: string,
    session: ChatSessionState,
  ) {
    const flow = await this.chatbotService.findOne(session.flowId);
    if (!flow || !flow.isActive) {
      await this.clearSession(accountId, senderJid);
      return;
    }

    const nodes: FlowNodeAST[] = JSON.parse(flow.nodes || '[]');
    const edges: FlowEdgeAST[] = JSON.parse(flow.edges || '[]');

    const currentNode = nodes.find(n => n.id === session.currentNodeId);
    if (!currentNode) {
      await this.clearSession(accountId, senderJid);
      return;
    }

    // Record user interaction in transcript
    session.transcript = session.transcript || [];
    session.transcript.push(`User: ${userText}`);
    session.variables.__lastUserText = userText;

    // If current node expected input capture, store it into session variables
    if (currentNode.type === 'input_capture' && currentNode.data?.variableName) {
      session.variables[currentNode.data.variableName] = userText;
    }

    // Find outgoing edges
    const outgoingEdges = edges.filter(e => e.source === currentNode.id);
    if (outgoingEdges.length === 0) {
      // Flow reached its end
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

    // Determine next node
    let nextNodeId: string | null = null;

    if (currentNode.type === 'condition') {
      // Evaluate condition expression
      const cond = (currentNode.data?.conditionExpression || '').toLowerCase().trim();
      const match = userText.toLowerCase().includes(cond) || (session.variables[cond] !== undefined);
      const chosenEdge = outgoingEdges.find(e => e.sourceHandle === (match ? 'true' : 'false')) || outgoingEdges[0];
      nextNodeId = chosenEdge?.target || null;
    } else {
      // Direct transition
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

  /**
   * Execute an AST Node action
   */
  private async executeNode(
    accountId: string,
    chatJid: string,
    senderJid: string,
    node: FlowNodeAST,
    nodes: FlowNodeAST[],
    edges: FlowEdgeAST[],
    session: ChatSessionState,
  ) {
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

        // ── ENABLE_TYPING_INDICATOR gate ────────────────────────────────────────
        // false (default): message sends instantly, exactly as before.
        // true:            WhatsApp "composing..." appears first (~200ms perceived gap),
        //                  then message sends. The try/finally ensures the indicator
        //                  is always cleared — even if sendMessage throws.
        if (this.typingIndicatorEnabled) {
          try {
            await client.socket.sendPresenceUpdate('composing', chatJid);
            // Brief natural pause so the indicator is visible before message arrives
            await new Promise(r => setTimeout(r, 600));
            await client.socket.sendMessage(chatJid, { text: replyText });
          } finally {
            // Always clear — a stuck "composing" indicator is worse than no indicator
            await client.socket.sendPresenceUpdate('paused', chatJid).catch(() => null);
          }
        } else {
          // DEFAULT — unchanged original behaviour
          await client.socket.sendMessage(chatJid, { text: replyText });
        }

        session.transcript = session.transcript || [];
        session.transcript.push(`Bot: ${replyText}`);
        this.logger.log(`[Chatbot] Sent message node to ${chatJid}: "${replyText.slice(0, 40)}..."`);

        // Check if there is an automatic transition edge (e.g. chained message or condition)
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
          } catch (err: any) {
            this.logger.warn(`[Chatbot] RAG answer failed: ${err.message}`);
          }
        }

        if (this.typingIndicatorEnabled) {
          try {
            await client.socket.sendPresenceUpdate('composing', chatJid);
            await new Promise(r => setTimeout(r, 600));
            await client.socket.sendMessage(chatJid, { text: answerText });
          } finally {
            await client.socket.sendPresenceUpdate('paused', chatJid).catch(() => null);
          }
        } else {
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
        // Pause chatbot for this chat so staff can chat freely
        await this.pauseChatbot(accountId, chatJid, 86400); // 24 hours
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
        // Waiting for customer response
        session.status = 'WAITING_INPUT';
        await this.saveSession(accountId, senderJid, session);
        break;
      }
    }
  }

  private interpolateVariables(text: string, variables: Record<string, any>, senderJid: string): string {
    const phone = senderJid ? senderJid.split('@')[0] : '';
    const allVars = {
      phone,
      name: variables?.name || phone,
      ...(variables || {}),
    };
    return safeInterpolate(text, allVars);
  }
}
