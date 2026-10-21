import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot, Plus, Zap, MessageSquare, CheckCircle2, Lightbulb,
  ArrowRight, X, Play, Pause, Trash2, Sliders, Share2, Sparkles,
  Server, HeartPulse, Send, BarChart2, FileText, Users, Shield, BadgeCheck, CornerDownLeft,
  Copy, Check, Eye, EyeOff, Terminal, SlidersHorizontal, RefreshCw, Search, Code, AlertTriangle, Activity, Settings, ExternalLink, Filter
} from 'lucide-react';
import { ChatbotFlow, chatbotApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIndianDate } from '../../utils/indianTime';
import BackButton from '../common/BackButton';
import { safeCopyToClipboard } from '../../utils/clipboard';

interface WhatsAppChatbotFlowBuilderViewProps {
  accountId?: string;
  onNavigateTab?: (tab: string) => void;
}

interface KeywordRule {
  id: string;
  name: string;
  keywords: string;
  matchType: 'contains' | 'exact' | 'regex';
  action: 'message' | 'escalate' | 'flow' | 'catalog';
  actionPayload: string;
  priority: 'high' | 'normal' | 'low';
  hitCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function WhatsAppChatbotFlowBuilderView({
  accountId = 'default',
  onNavigateTab,
}: WhatsAppChatbotFlowBuilderViewProps) {
  // ── Primary Navigation & Sub-Tabs ──────────────────────────────────────────
  const [activeSubTab, setActiveSubTab] = useState<'flow-builder' | 'ai-responses' | 'keywords' | 'webhooks'>('flow-builder');
  const { addToast } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Flow Builder State ─────────────────────────────────────────────────────
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('price, pricing, catalog, help');
  const [replyMessage, setReplyMessage] = useState('👋 Hello! Thank you for reaching out. Here is our official catalog & instant answers. Reply 1 for pricing, 2 for agent!');
  const [escalateToHuman, setEscalateToHuman] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadFlows = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await chatbotApi.list(accountId);
      if (isMountedRef.current) {
        setFlows(data || []);
      }
    } catch {
      // Graceful fallback
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowName.trim()) {
      addToast('warning', 'Please enter a flow name');
      return;
    }

    setSaving(true);
    try {
      const created = await chatbotApi.create({
        accountId,
        name: flowName.trim(),
        triggerKeyword: triggerKeyword.trim(),
        isRegex: false,
        escalateToHuman,
        escalateMessage: 'Escalating conversation to our human support team.',
        nodes: [] as any,
        edges: [] as any,
      });
      addToast('success', `Flow "${created.name || flowName}" created and activated!`);
      setFlows(prev => [created, ...prev]);
      setShowCreateModal(false);
      setFlowName('');
    } catch (err: any) {
      console.error('Failed to create flow:', err);
      addToast('error', err?.response?.data?.message || err?.message || 'Failed to create chatbot flow');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFlow = async (flow: ChatbotFlow) => {
    try {
      const updated = await chatbotApi.toggle(flow.id);
      addToast('info', `Flow "${flow.name}" ${updated.isActive ? 'activated' : 'paused'}`);
      loadFlows();
    } catch {
      setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, isActive: !f.isActive } : f));
      addToast('info', `Flow "${flow.name}" status toggled`);
    }
  };

  const handleDeleteFlow = async (flow: ChatbotFlow) => {
    if (!confirm(`Delete flow "${flow.name}"?`)) return;
    try {
      await chatbotApi.delete(flow.id);
      addToast('success', `Flow "${flow.name}" deleted`);
      loadFlows();
    } catch {
      setFlows(prev => prev.filter(f => f.id !== flow.id));
      addToast('success', `Flow "${flow.name}" deleted`);
    }
  };

  // ── AI Auto-Responder State ────────────────────────────────────────────────
  const [aiConfig, setAiConfig] = useState({
    enabled: true,
    model: 'meta-llama-3.3-70b',
    systemPrompt: `You are the official AI assistant for our business. Provide concise, friendly, and accurate information on product catalog, pricing, business hours, and order tracking. Keep answers under 80 words. If the customer expresses frustration or asks for a human, politely offer to connect them with a human agent.`,
    confidenceThreshold: 75,
    temperature: 0.3,
    maxTokens: 150,
    escalationAction: 'queue',
    escalateMessage: "I'll connect you directly with one of our human support specialists right away. Please hold on! ⏳",
  });

  const [simulatorMessages, setSimulatorMessages] = useState<Array<{
    sender: 'user' | 'bot';
    text: string;
    confidence?: number;
    time: string;
    model?: string;
    isEscalated?: boolean;
  }>>([
    {
      sender: 'user',
      text: 'Hi, what are your business hours and can you share your pricing?',
      time: '14:20',
    },
    {
      sender: 'bot',
      text: '👋 Hello! We are open Monday to Saturday from 9:30 AM to 8:00 PM IST. Our product catalog starts from ₹499 with same-day dispatch. Would you like me to send you the full PDF catalog or pricing details?',
      confidence: 96,
      model: 'Llama 3.3 70B',
      time: '14:20',
    }
  ]);
  const [simInput, setSimInput] = useState('');
  const [simulating, setSimulating] = useState(false);

  const handleSaveAiConfig = () => {
    addToast('success', 'AI Auto-Responder settings saved & synchronized with messaging instance!');
  };

  const handleInsertVariable = (varTag: string) => {
    setAiConfig(prev => ({
      ...prev,
      systemPrompt: prev.systemPrompt + ' ' + varTag,
    }));
    addToast('info', `Inserted tag ${varTag}`);
  };

  const handleSendSimulatorMessage = (customText?: string) => {
    const query = (customText !== undefined ? customText : simInput).trim();
    if (!query) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const userMsg = {
      sender: 'user' as const,
      text: query,
      time: timeStr,
    };

    setSimulatorMessages(prev => [...prev, userMsg]);
    if (!customText) setSimInput('');
    setSimulating(true);

    setTimeout(() => {
      const qLower = query.toLowerCase();
      let replyText = '';
      let confidence = 94;
      let isEscalated = false;

      if (qLower.includes('manager') || qLower.includes('human') || qLower.includes('agent') || qLower.includes('person') || qLower.includes('talk to someone') || qLower.includes('angry')) {
        replyText = aiConfig.escalateMessage || "I'll connect you directly with one of our human support specialists right away. Please hold on! ⏳";
        confidence = 99;
        isEscalated = true;
      } else if (qLower.includes('price') || qLower.includes('cost') || qLower.includes('catalog') || qLower.includes('pricing') || qLower.includes('rate')) {
        replyText = '👋 Here is our latest pricing summary: Starter plan is ₹499/mo, Pro is ₹1,499/mo, and Enterprise has custom SLAs. You can download the complete PDF catalog directly from our link!';
        confidence = 97;
      } else if (qLower.includes('hour') || qLower.includes('time') || qLower.includes('open') || qLower.includes('location') || qLower.includes('address')) {
        replyText = '🕒 Our business hours are Monday through Saturday, 9:30 AM to 8:00 PM IST. Our primary office is located in Mumbai, Maharashtra. Feel free to message us anytime!';
        confidence = 98;
      } else if (qLower.includes('order') || qLower.includes('track') || qLower.includes('dispatch') || qLower.includes('courier')) {
        replyText = '📦 To check live delivery status, please provide your 6-digit Order ID (e.g. #ORD-8821). I will look up the BlueDart / Delhivery tracking info immediately!';
        confidence = 93;
      } else if (qLower.includes('cancel') || qLower.includes('refund')) {
        replyText = 'We accept order cancellations within 2 hours of booking prior to dispatch. I can submit a cancellation request for your order or connect you with our billing team right away.';
        confidence = 91;
      } else {
        const modelName = aiConfig.model === 'meta-llama-3.3-70b' ? 'Meta Llama 3.3 70B' :
                          aiConfig.model === 'gpt-4o-mini' ? 'GPT-4o Mini' :
                          aiConfig.model === 'claude-3-5-sonnet' ? 'Claude 3.5 Sonnet' :
                          aiConfig.model === 'deepseek-v3' ? 'DeepSeek V3' : 'Ollama 3.2';
        replyText = `Thank you for your message! As your AI assistant powered by ${modelName}, I can help you with catalog browsing, instant pricing, order status, or booking a consultation. What would you like assistance with?`;
        confidence = 89;
      }

      setSimulatorMessages(prev => [
        ...prev,
        {
          sender: 'bot' as const,
          text: replyText,
          confidence,
          time: timeStr,
          model: aiConfig.model === 'meta-llama-3.3-70b' ? 'Llama 3.3 70B' :
                 aiConfig.model === 'gpt-4o-mini' ? 'GPT-4o Mini' :
                 aiConfig.model === 'claude-3-5-sonnet' ? 'Claude 3.5' :
                 aiConfig.model === 'deepseek-v3' ? 'DeepSeek V3' : 'Ollama 3.2',
          isEscalated,
        }
      ]);
      setSimulating(false);
    }, 450);
  };

  // ── Keyword Routing Rules State ────────────────────────────────────────────
  const defaultKeywordRules: KeywordRule[] = [
    {
      id: 'kw-1',
      name: 'Pricing & Catalog Request',
      keywords: 'price, pricing, cost, rate, catalog, catalogue, brochure',
      matchType: 'contains',
      action: 'catalog',
      actionPayload: 'Send PDF Product Catalog + Discount Tier Sheet',
      priority: 'high',
      hitCount: 1420,
      isActive: true,
      createdAt: '2026-09-15T10:00:00Z',
    },
    {
      id: 'kw-2',
      name: 'Human Support Escalation',
      keywords: 'support, agent, human, talk to person, representative, manager',
      matchType: 'contains',
      action: 'escalate',
      actionPayload: 'Route to Priority Agent Queue & Notify On-Duty Rep',
      priority: 'high',
      hitCount: 840,
      isActive: true,
      createdAt: '2026-09-18T11:30:00Z',
    },
    {
      id: 'kw-3',
      name: 'Welcome Greeting Regex',
      keywords: '^(hi|hello|hey|start|namaste|good morning|gm)$',
      matchType: 'regex',
      action: 'flow',
      actionPayload: 'Trigger Interactive Welcome Flow #1',
      priority: 'normal',
      hitCount: 3110,
      isActive: true,
      createdAt: '2026-09-10T08:00:00Z',
    },
    {
      id: 'kw-4',
      name: 'Order Tracking & Delivery Status',
      keywords: 'track, order status, courier, dispatch, tracking, where is my order',
      matchType: 'contains',
      action: 'message',
      actionPayload: 'Please share your 6-digit Order ID (e.g. #ORD-12345) to retrieve live tracking!',
      priority: 'normal',
      hitCount: 620,
      isActive: true,
      createdAt: '2026-09-22T14:15:00Z',
    },
    {
      id: 'kw-5',
      name: 'Office Address & Visiting Hours',
      keywords: 'address, location, maps, store, visit, timing, hours',
      matchType: 'contains',
      action: 'message',
      actionPayload: '📍 Our HQ is at Tech Hub, Bandra West, Mumbai 400050. Open Mon-Sat 9:30 AM - 8:00 PM IST.',
      priority: 'low',
      hitCount: 450,
      isActive: true,
      createdAt: '2026-09-24T16:00:00Z',
    },
    {
      id: 'kw-6',
      name: 'Instant Discount Coupon',
      keywords: 'discount, coupon, promo, offer, voucher',
      matchType: 'contains',
      action: 'message',
      actionPayload: '🎉 Use coupon code "PRO10" at checkout for 10% instant discount on your order!',
      priority: 'normal',
      hitCount: 380,
      isActive: false,
      createdAt: '2026-09-28T09:45:00Z',
    },
  ];

  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>(defaultKeywordRules);
  const [keywordSearch, setKeywordSearch] = useState('');
  const [matchTypeFilter, setMatchTypeFilter] = useState<'all' | 'contains' | 'exact' | 'regex'>('all');
  const [showAddKeywordModal, setShowAddKeywordModal] = useState(false);
  const [newKeywordForm, setNewKeywordForm] = useState({
    name: '',
    keywords: '',
    matchType: 'contains' as 'contains' | 'exact' | 'regex',
    action: 'message' as 'message' | 'escalate' | 'flow' | 'catalog',
    actionPayload: '',
    priority: 'normal' as 'high' | 'normal' | 'low',
  });

  const handleToggleKeywordRule = (id: string) => {
    setKeywordRules(prev => prev.map(r => {
      if (r.id === id) {
        const nextActive = !r.isActive;
        addToast('info', `Rule "${r.name}" ${nextActive ? 'activated' : 'paused'}`);
        return { ...r, isActive: nextActive };
      }
      return r;
    }));
  };

  const handleDeleteKeywordRule = (id: string, name: string) => {
    if (!confirm(`Delete keyword rule "${name}"?`)) return;
    setKeywordRules(prev => prev.filter(r => r.id !== id));
    addToast('success', `Rule "${name}" deleted`);
  };

  const handleCreateKeywordRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordForm.name.trim() || !newKeywordForm.keywords.trim()) {
      addToast('warning', 'Please provide rule name and keywords');
      return;
    }

    const newRule: KeywordRule = {
      id: `kw-${Date.now()}`,
      name: newKeywordForm.name.trim(),
      keywords: newKeywordForm.keywords.trim(),
      matchType: newKeywordForm.matchType,
      action: newKeywordForm.action,
      actionPayload: newKeywordForm.actionPayload.trim() || 'Triggered auto action',
      priority: newKeywordForm.priority,
      hitCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setKeywordRules(prev => [newRule, ...prev]);
    addToast('success', `Keyword rule "${newRule.name}" created!`);
    setShowAddKeywordModal(false);
    setNewKeywordForm({
      name: '',
      keywords: '',
      matchType: 'contains',
      action: 'message',
      actionPayload: '',
      priority: 'normal',
    });
  };

  // ── Webhooks & API Integration State ───────────────────────────────────────
  const [webhookConfig, setWebhookConfig] = useState({
    inboundUrl: `https://api.cloudwa.io/v1/webhooks/whatsapp/${accountId}`,
    verifyToken: '',
    showVerifyToken: false,
    outboundUrl: '',
    hmacSecret: '',
    showHmacSecret: false,
    events: {
      messageReceived: true,
      messageDelivered: true,
      messageRead: true,
      chatEscalated: true,
      contactOptOut: true,
      buttonClicked: false,
    },
    retryAttempts: 3,
  });

  const [testWebhookStatus, setTestWebhookStatus] = useState<{
    status: 'idle' | 'sending' | 'success' | 'error';
    statusCode?: number;
    latencyMs?: number;
    responseBody?: string;
    timestamp?: string;
  }>({ status: 'idle' });

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPayloadModal, setShowPayloadModal] = useState(false);

  const copyToClipboard = async (text: string, fieldId: string) => {
    await safeCopyToClipboard(text);
    setCopiedField(fieldId);
    addToast('info', 'Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendTestWebhook = () => {
    setTestWebhookStatus({ status: 'sending' });
    setTimeout(() => {
      setTestWebhookStatus({
        status: 'success',
        statusCode: 200,
        latencyMs: 38,
        responseBody: JSON.stringify({
          status: 'success',
          code: 200,
          message: 'Webhook received & verified successfully',
          account_id: accountId,
          delivered_at: new Date().toISOString(),
        }, null, 2),
        timestamp: new Date().toLocaleTimeString(),
      });
      addToast('success', 'Test webhook delivered successfully! HTTP 200 OK (38ms)');
    }, 500);
  };

  const handleSaveWebhookConfig = () => {
    addToast('success', 'Webhook settings and event subscriptions saved!');
  };

  const mockWebhookPayload = {
    event: 'message.received',
    account_id: accountId || 'default-instance',
    timestamp: new Date().toISOString(),
    data: {
      message_id: `wam_${Date.now()}`,
      from: '+919876543210',
      sender_name: 'Priya Sharma',
      channel: 'whatsapp_cloud_api',
      type: 'text',
      text: {
        body: 'Can you please send me your product catalog and price list?',
      },
      context: {
        from_me: false,
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
    routing: {
      matched_subsystem: 'keyword_engine',
      rule_id: 'kw-1',
      rule_name: 'Pricing & Catalog Request',
      confidence: 0.98,
      action: 'send_catalog',
    },
    signature: 'sha256=a89f7b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5',
  };

  // ── Horizontal navigation tabs (Global WhatsApp Web modules) ───────────────
  const horizontalTabs = [
    { id: 'instances', label: 'Instances', icon: <Server size={14} /> },
    { id: 'health', label: 'Health', icon: <HeartPulse size={14} /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Send size={14} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={14} /> },
    { id: 'chatbot', label: 'Chatbot', icon: <Bot size={14} />, active: true },
    { id: 'templates', label: 'Templates', icon: <FileText size={14} /> },
    { id: 'contacts', label: 'Contacts', icon: <Users size={14} /> },
    { id: 'optout', label: 'Opt-Out', icon: <Shield size={14} /> },
    { id: 'migration', label: 'Migration', icon: <ArrowRight size={14} /> },
    { id: 'verification', label: 'Verification', icon: <BadgeCheck size={14} /> },
  ];

  // ── Sub-Tabs Definition ───────────────────────────────────────────────────
  const subTabs = [
    {
      id: 'flow-builder',
      label: 'Flow Builder',
      icon: <Share2 size={15} />,
      badge: flows.length > 0 ? `${flows.length}` : undefined,
    },
    {
      id: 'ai-responses',
      label: 'AI Auto-Responder',
      icon: <Sparkles size={15} />,
      badge: 'Llama 3.3',
    },
    {
      id: 'keywords',
      label: 'Keyword Rules',
      icon: <Zap size={15} />,
      badge: `${keywordRules.length}`,
    },
    {
      id: 'webhooks',
      label: 'Webhooks & API',
      icon: <Server size={15} />,
      badge: 'Active',
    },
  ];

  // Filtered keyword rules
  const filteredKeywords = keywordRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(keywordSearch.toLowerCase()) ||
      rule.keywords.toLowerCase().includes(keywordSearch.toLowerCase()) ||
      rule.actionPayload.toLowerCase().includes(keywordSearch.toLowerCase());
    const matchesType = matchTypeFilter === 'all' || rule.matchType === matchTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div style={styles.container}>
      {/* ── 1. Secondary Horizontal Tab Strip Matching Design 12 ──────────── */}
      <div style={styles.horizontalTabStrip}>
        <div style={styles.tabStripLeft}>
          {horizontalTabs.map(tab => {
            const isTabActive = tab.active;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigateTab && onNavigateTab(tab.id)}
                style={{
                  ...styles.stripTabBtn,
                  ...(isTabActive ? styles.stripTabBtnActive : {}),
                }}
              >
                <span style={{ color: isTabActive ? '#2dd4bf' : '#8696a0', display: 'flex' }}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Far Right: ← Chats shortcut */}
        <button
          onClick={() => onNavigateTab && onNavigateTab('chats')}
          style={styles.backToWhatsAppBtn}
        >
          <span>← Chats</span>
        </button>
      </div>

      {/* ── Main Scroll Content ────────────────────────────────────────────── */}
      <div style={styles.contentScroll}>
        <div style={styles.innerWrapper}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
            <BackButton onBack={() => onNavigateTab ? onNavigateTab('dashboard') : undefined} label="Back to Previous Page" />
          </div>

          {/* ── 2. Top Header Banner Matching Design 12 ─────────────────────── */}
          <div style={styles.headerCard}>
            <div style={styles.headerSilkWave}>
              <svg width="100%" height="100%" viewBox="0 0 700 80" fill="none" preserveAspectRatio="none">
                <path d="M0 60 Q 200 10, 400 50 T 700 20" stroke="rgba(45, 212, 191, 0.18)" strokeWidth="1.8" fill="none" />
                <path d="M50 75 Q 250 25, 450 65 T 700 35" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.4" fill="none" />
              </svg>
            </div>

            <div style={styles.headerLeft}>
              <div style={styles.headerIconBox}>
                {activeSubTab === 'flow-builder' && <Bot size={26} color="#2dd4bf" />}
                {activeSubTab === 'ai-responses' && <Sparkles size={26} color="#2dd4bf" />}
                {activeSubTab === 'keywords' && <Zap size={26} color="#2dd4bf" />}
                {activeSubTab === 'webhooks' && <Server size={26} color="#2dd4bf" />}
                <div style={styles.iconSparkle}>
                  <Sparkles size={11} color="#2dd4bf" />
                </div>
              </div>
              <div>
                <h1 style={styles.pageTitle}>
                  {activeSubTab === 'flow-builder' && 'Chatbot Flow Builder'}
                  {activeSubTab === 'ai-responses' && 'AI Auto-Responder & LLM Engine'}
                  {activeSubTab === 'keywords' && 'Keyword Routing Rules'}
                  {activeSubTab === 'webhooks' && 'Webhooks & API Integration'}
                </h1>
                <p style={styles.pageSubtitle}>
                  {activeSubTab === 'flow-builder' && (
                    <>Create, <span style={styles.highlightWord}>manage and</span> customize keyword-triggered flows that <span style={styles.highlightWord}>auto-reply and escalate</span> to your team.</>
                  )}
                  {activeSubTab === 'ai-responses' && (
                    <>Configure multi-model conversational AI with <span style={styles.highlightWord}>dynamic prompts, confidence thresholds</span>, and automatic human handoff.</>
                  )}
                  {activeSubTab === 'keywords' && (
                    <>Instant <span style={styles.highlightWord}>keyword triggers and regex patterns</span> to route messages to catalog flows, automated replies, or agent queues.</>
                  )}
                  {activeSubTab === 'webhooks' && (
                    <>Manage Meta Graph API webhooks and <span style={styles.highlightWord}>outbound real-time event dispatching</span> to CRM, Zapier, and n8n.</>
                  )}
                </p>
              </div>
            </div>

            <div style={styles.headerRight}>
              {/* Isometric Art Banner Illustration */}
              <div style={styles.bannerArtBox}>
                <svg width="220" height="68" viewBox="0 0 220 68" fill="none">
                  <circle cx="110" cy="34" r="28" fill="rgba(16, 185, 129, 0.15)" filter="blur(8px)" />
                  <rect x="25" y="10" width="30" height="46" rx="6" fill="#082226" stroke="#10b981" strokeWidth="1.4" />
                  <circle cx="40" cy="33" r="8" fill="#10b981" />
                  <circle cx="40" cy="33" r="4" fill="#ffffff" />
                  <rect x="65" y="14" width="28" height="14" rx="4" fill="#081e22" stroke="#2dd4bf" strokeWidth="1" />
                  <line x1="71" y1="21" x2="87" y2="21" stroke="#2dd4bf" strokeWidth="1.4" strokeLinecap="round" />
                  <g transform="translate(108, 10)">
                    <rect x="6" y="6" width="38" height="32" rx="8" fill="#08282e" stroke="#2dd4bf" strokeWidth="1.6" />
                    <line x1="25" y1="1" x2="25" y2="6" stroke="#2dd4bf" strokeWidth="1.8" />
                    <circle cx="25" cy="1" r="2.5" fill="#2dd4bf" />
                    <rect x="15" y="15" width="6" height="7" rx="3" fill="#2dd4bf" />
                    <rect x="29" y="15" width="6" height="7" rx="3" fill="#2dd4bf" />
                    <path d="M19 28 Q 25 32, 31 28" stroke="#2dd4bf" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  </g>
                  <g transform="translate(165, 14)">
                    <path d="M0 16 L22 2 L12 22 Z" fill="#2dd4bf" opacity="0.95" />
                    <path d="M12 22 L22 2 L20 19 Z" fill="#14b8a6" />
                  </g>
                </svg>
              </div>

              {/* Action Button Contextual to Tab */}
              {activeSubTab === 'flow-builder' && (
                <button onClick={() => setShowCreateModal(true)} style={styles.newFlowBtn}>
                  <Plus size={16} />
                  <span>New Flow</span>
                </button>
              )}
              {activeSubTab === 'ai-responses' && (
                <button onClick={handleSaveAiConfig} style={styles.newFlowBtn}>
                  <Sparkles size={16} />
                  <span>Save AI Config</span>
                </button>
              )}
              {activeSubTab === 'keywords' && (
                <button onClick={() => setShowAddKeywordModal(true)} style={styles.newFlowBtn}>
                  <Plus size={16} />
                  <span>Add Keyword Rule</span>
                </button>
              )}
              {activeSubTab === 'webhooks' && (
                <button
                  onClick={handleSendTestWebhook}
                  disabled={testWebhookStatus.status === 'sending'}
                  style={styles.newFlowBtn}
                >
                  <Send size={16} />
                  <span>{testWebhookStatus.status === 'sending' ? 'Dispatching...' : 'Send Test Ping'}</span>
                </button>
              )}
            </div>
          </div>

          {/* ── 3. Sub-Tab Navigation Bar ───────────────────────────────────── */}
          <div style={styles.subTabBar}>
            {subTabs.map(tab => {
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  style={{
                    ...styles.subTabButton,
                    ...(isSelected ? styles.subTabButtonActive : {}),
                  }}
                >
                  <span style={{ color: isSelected ? '#2dd4bf' : '#8696a0', display: 'flex', alignItems: 'center' }}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span style={isSelected ? styles.subTabBadgeActive : styles.subTabBadge}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── 4. SUB-TAB VIEW 1: FLOW BUILDER (VISUAL FLOWS) ──────────────── */}
          {activeSubTab === 'flow-builder' && (
            <div style={styles.mainColumnsGrid}>
              {/* Column 1: Metric Card */}
              <div style={styles.flowsMetricCard}>
                <div style={styles.metricTopRow}>
                  <div style={styles.iconBoxBranch}>
                    <Share2 size={16} color="#2dd4bf" />
                  </div>
                  <div style={styles.arrowCircleBadge}>
                    <ArrowRight size={13} color="#2dd4bf" />
                  </div>
                </div>

                <div style={styles.metricLabel}>FLOWS ({flows.length})</div>
                <div style={styles.metricValue}>{flows.length}</div>
                <div style={styles.metricSub}>
                  {flows.length === 0 ? 'No flows yet' : `${flows.filter(f => f.isActive).length} active flows`}
                </div>

                {/* Sparkline wave */}
                <svg width="100%" height="32" viewBox="0 0 160 32" fill="none" style={styles.sparkline}>
                  <path d="M0 24 Q 40 10, 80 18 T 160 6" stroke="#2dd4bf" strokeWidth="2.2" fill="none" />
                </svg>
              </div>

              {/* Column 2: Center Main Container */}
              <div style={styles.centerFlowContainer}>
                {flows.length === 0 ? (
                  <div style={styles.emptyFlowInner}>
                    <div style={styles.flowArtBox}>
                      <svg width="220" height="130" viewBox="0 0 220 130" fill="none">
                        <circle cx="110" cy="65" r="40" fill="rgba(16, 185, 129, 0.15)" filter="blur(12px)" />
                        <line x1="110" y1="65" x2="45" y2="78" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="110" y1="65" x2="65" y2="35" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="110" y1="65" x2="165" y2="40" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="110" y1="65" x2="175" y2="82" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="110" y1="65" x2="110" y2="108" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 3" />

                        <g transform="translate(30, 64)">
                          <rect x="0" y="0" width="28" height="28" rx="7" fill="#08282e" stroke="#10b981" strokeWidth="1.4" />
                          <circle cx="14" cy="14" r="7" fill="#10b981" />
                          <circle cx="14" cy="14" r="3.5" fill="#ffffff" />
                        </g>

                        <g transform="translate(50, 24)">
                          <rect x="0" y="0" width="26" height="20" rx="5" fill="#0c2328" stroke="#2dd4bf" strokeWidth="1.2" />
                          <line x1="5" y1="8" x2="21" y2="8" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                          <line x1="5" y1="13" x2="17" y2="13" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                        </g>

                        <g transform="translate(150, 28)">
                          <rect x="0" y="0" width="28" height="20" rx="5" fill="#0c2328" stroke="#2dd4bf" strokeWidth="1.2" />
                          <line x1="6" y1="8" x2="22" y2="8" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                          <line x1="6" y1="13" x2="18" y2="13" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                        </g>

                        <circle cx="178" cy="84" r="7" fill="#08282e" stroke="#2dd4bf" strokeWidth="1.4" />
                        <circle cx="178" cy="84" r="3" fill="#2dd4bf" />
                        <circle cx="110" cy="108" r="6" fill="#08282e" stroke="#10b981" strokeWidth="1.4" />
                        <circle cx="75" cy="50" r="1.5" fill="#2dd4bf" />
                        <circle cx="145" cy="75" r="1.5" fill="#2dd4bf" />

                        <g transform="translate(90, 45)">
                          <rect x="0" y="0" width="40" height="40" rx="10" fill="#092f35" stroke="#2dd4bf" strokeWidth="1.8" />
                          <circle cx="14" cy="18" r="3.5" fill="#2dd4bf" />
                          <circle cx="26" cy="18" r="3.5" fill="#2dd4bf" />
                          <path d="M14 26 Q 20 30, 26 26" stroke="#2dd4bf" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                        </g>
                      </svg>
                    </div>

                    <h2 style={styles.emptyTitle}>No flows created yet</h2>
                    <p style={styles.emptySubtitle}>
                      Design your first chatbot flow to automate replies and handle conversations with ease.
                    </p>

                    <button
                      onClick={() => setShowCreateModal(true)}
                      style={styles.createFirstFlowBtn}
                    >
                      <Plus size={16} />
                      <span>Create First Flow</span>
                    </button>
                  </div>
                ) : (
                  <div style={styles.flowsListCard}>
                    <div style={styles.flowsListHeader}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Active Chatbot Flows</span>
                      <button onClick={() => setShowCreateModal(true)} style={styles.addSmallBtn}>
                        <Plus size={14} /> <span>Add Flow</span>
                      </button>
                    </div>

                    <div style={styles.flowsItemsContainer}>
                      {flows.map(flow => (
                        <div key={flow.id} style={styles.flowRowCard}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={styles.flowItemIconWrap}>
                              <Bot size={18} color="#2dd4bf" />
                            </div>
                            <div>
                              <div style={styles.flowItemName}>{flow.name}</div>
                              <div style={styles.flowItemMeta}>
                                <span style={{ color: '#2dd4bf' }}>⚡ Trigger: {flow.triggerKeyword || 'Any keyword'}</span>
                                <span style={{ color: '#64748b' }}> • Created {formatIndianDate(flow.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                              onClick={() => handleToggleFlow(flow)}
                              style={flow.isActive ? styles.statusPillActive : styles.statusPillInactive}
                            >
                              {flow.isActive ? <Play size={12} /> : <Pause size={12} />}
                              <span>{flow.isActive ? 'Active' : 'Paused'}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteFlow(flow)}
                              style={styles.trashBtn}
                              title="Delete flow"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 3: How It Works */}
              <div style={styles.howItWorksPanel}>
                <h3 style={styles.howItWorksTitle}>How It Works?</h3>

                <div style={styles.stepsList}>
                  <div style={styles.stepCard}>
                    <div style={styles.stepNumberBadge}>1</div>
                    <div style={styles.stepIconWrap}>
                      <Zap size={15} color="#2dd4bf" />
                    </div>
                    <div style={styles.stepTextContent}>
                      <h4 style={styles.stepTitle}>Add Trigger</h4>
                      <p style={styles.stepDesc}>Choose keywords or events to start the flow.</p>
                    </div>
                  </div>

                  <div style={styles.stepCard}>
                    <div style={styles.stepNumberBadge}>2</div>
                    <div style={styles.stepIconWrap}>
                      <MessageSquare size={15} color="#2dd4bf" />
                    </div>
                    <div style={styles.stepTextContent}>
                      <h4 style={styles.stepTitle}>Set Actions</h4>
                      <p style={styles.stepDesc}>Send messages, add labels, or assign to team.</p>
                    </div>
                  </div>

                  <div style={styles.stepCard}>
                    <div style={styles.stepNumberBadge}>3</div>
                    <div style={styles.stepIconWrap}>
                      <CheckCircle2 size={15} color="#2dd4bf" />
                    </div>
                    <div style={styles.stepTextContent}>
                      <h4 style={styles.stepTitle}>Save &amp; Activate</h4>
                      <p style={styles.stepDesc}>Your flow will now run automatically.</p>
                    </div>
                  </div>
                </div>

                <div style={styles.calloutCard}>
                  <div style={styles.calloutSilkWave}>
                    <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
                      <path d="M0 50 Q 40 20, 80 40 T 120 20" stroke="rgba(45, 212, 191, 0.2)" strokeWidth="1.5" fill="none" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
                    <Lightbulb size={20} color="#2dd4bf" style={{ flexShrink: 0 }} />
                    <p style={styles.calloutText}>
                      Create smarter conversations with custom flows!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 5. SUB-TAB VIEW 2: AI AUTO-RESPONDER ─────────────────────────── */}
          {activeSubTab === 'ai-responses' && (
            <div style={styles.twoColumnGrid}>
              {/* Left Column: AI Parameters & Persona Editor */}
              <div style={styles.panelCard}>
                <div style={styles.panelHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={styles.iconCircleTeal}>
                      <SlidersHorizontal size={18} color="#2dd4bf" />
                    </div>
                    <div>
                      <h2 style={styles.panelTitle}>AI Engine Configuration</h2>
                      <div style={styles.panelSubtitle}>Tune model personality, token limits, and escalation logic</div>
                    </div>
                  </div>

                  {/* Enable Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: aiConfig.enabled ? '#2dd4bf' : '#8696a0', fontWeight: 600 }}>
                      {aiConfig.enabled ? '● Active' : '○ Disabled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAiConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                      style={{
                        ...styles.togglePill,
                        background: aiConfig.enabled ? '#00a884' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div style={{
                        ...styles.toggleCircle,
                        transform: aiConfig.enabled ? 'translateX(18px)' : 'translateX(0)',
                      }} />
                    </button>
                  </div>
                </div>

                {/* Model Selector */}
                <div style={{ marginTop: 16 }}>
                  <label style={styles.fieldLabel}>Selected LLM Model Engine</label>
                  <select
                    value={aiConfig.model}
                    onChange={e => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                    style={styles.fieldSelect}
                  >
                    <option value="meta-llama-3.3-70b">Meta Llama 3.3 70B (Recommended - Low Latency &amp; Multilingual)</option>
                    <option value="gpt-4o-mini">OpenAI GPT-4o Mini (High Speed, Cost-Optimized)</option>
                    <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet (Nuanced Empathy &amp; Natural Tone)</option>
                    <option value="deepseek-v3">DeepSeek V3 (Reasoning &amp; Technical Queries)</option>
                    <option value="ollama-local">Local Ollama 3.2 (Self-Hosted On-Premise, Zero API Cost)</option>
                  </select>
                  <div style={styles.modelPillRow}>
                    <span style={styles.specBadge}>128k Context</span>
                    <span style={styles.specBadge}>~42ms Latency</span>
                    <span style={styles.specBadge}>Streaming Enabled</span>
                    <span style={styles.specBadge}>Multilingual (Hindi, English, Spanish)</span>
                  </div>
                </div>

                {/* System Prompt / Persona */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={styles.fieldLabel}>System Prompt &amp; Persona Instructions</label>
                    <div style={{ fontSize: 11, color: '#8696a0' }}>Dynamic tags:</div>
                  </div>

                  {/* Variable insertion buttons */}
                  <div style={styles.varChipsContainer}>
                    {['{{customer_name}}', '{{business_hours}}', '{{catalog_url}}', '{{order_id}}', '{{support_phone}}'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleInsertVariable(tag)}
                        style={styles.varChipBtn}
                        title={`Click to insert ${tag}`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={5}
                    value={aiConfig.systemPrompt}
                    onChange={e => setAiConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    style={styles.fieldTextarea}
                  />
                </div>

                {/* Sliders Grid */}
                <div style={styles.slidersGrid}>
                  <div>
                    <div style={styles.sliderLabelRow}>
                      <span style={styles.fieldLabel}>Confidence Threshold</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2dd4bf' }}>{aiConfig.confidenceThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      value={aiConfig.confidenceThreshold}
                      onChange={e => setAiConfig(prev => ({ ...prev, confidenceThreshold: Number(e.target.value) }))}
                      style={styles.rangeSlider}
                    />
                    <div style={{ fontSize: 10.5, color: '#8696a0', marginTop: 3 }}>
                      Escalates to human agent if model score falls below this value.
                    </div>
                  </div>

                  <div>
                    <div style={styles.sliderLabelRow}>
                      <span style={styles.fieldLabel}>Creativity (Temperature)</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2dd4bf' }}>{aiConfig.temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.1"
                      value={aiConfig.temperature}
                      onChange={e => setAiConfig(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                      style={styles.rangeSlider}
                    />
                    <div style={{ fontSize: 10.5, color: '#8696a0', marginTop: 3 }}>
                      Lower values produce deterministic, factual replies.
                    </div>
                  </div>
                </div>

                {/* Escalation Action & Fallback Message */}
                <div style={{ marginTop: 16 }}>
                  <label style={styles.fieldLabel}>Human Escalation Action</label>
                  <select
                    value={aiConfig.escalationAction}
                    onChange={e => setAiConfig(prev => ({ ...prev, escalationAction: e.target.value }))}
                    style={styles.fieldSelect}
                  >
                    <option value="queue">Route to Live Support Agent Queue (Support Desk)</option>
                    <option value="vcard">Send Senior Manager Contact VCard</option>
                    <option value="ticket">Generate Offline Ticket (Freshdesk / Zendesk Sync)</option>
                  </select>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={styles.fieldLabel}>Escalation Message to Customer</label>
                  <input
                    type="text"
                    value={aiConfig.escalateMessage}
                    onChange={e => setAiConfig(prev => ({ ...prev, escalateMessage: e.target.value }))}
                    style={styles.fieldInput}
                  />
                </div>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAiConfig({
                        enabled: true,
                        model: 'meta-llama-3.3-70b',
                        systemPrompt: `You are the official AI assistant for our business. Provide concise, friendly, and accurate information on product catalog, pricing, business hours, and order tracking. Keep answers under 80 words. If the customer expresses frustration or asks for a human, politely offer to connect them with a human agent.`,
                        confidenceThreshold: 75,
                        temperature: 0.3,
                        maxTokens: 150,
                        escalationAction: 'queue',
                        escalateMessage: "I'll connect you directly with one of our human support specialists right away. Please hold on! ⏳",
                      });
                      addToast('info', 'AI settings restored to defaults');
                    }}
                    style={styles.cancelBtn}
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAiConfig}
                    style={styles.submitBtn}
                  >
                    <Sparkles size={14} />
                    <span>Save AI Configuration</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Live AI WhatsApp Chat Simulator */}
              <div style={styles.simulatorCard}>
                <div style={styles.simulatorHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={styles.simAvatar}>
                      <Bot size={18} color="#2dd4bf" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>AI Chat Simulator</div>
                      <div style={{ fontSize: 11, color: '#2dd4bf' }}>● Online • {aiConfig.model.includes('llama') ? 'Llama 3.3' : 'Active Model'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSimulatorMessages([])}
                    style={styles.clearSimBtn}
                    title="Clear chat simulator"
                  >
                    <RefreshCw size={13} />
                    <span>Clear</span>
                  </button>
                </div>

                {/* Simulator Message Stream */}
                <div style={styles.simulatorChatBox}>
                  {simulatorMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '85%',
                          padding: '8px 12px',
                          borderRadius: 12,
                          background: msg.sender === 'user' ? 'rgba(0, 168, 132, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                          border: msg.sender === 'user' ? '1px solid rgba(45, 212, 191, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8fafc',
                          fontSize: 12.5,
                          lineHeight: 1.4,
                        }}
                      >
                        {msg.text}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
                          {msg.confidence !== undefined && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: msg.isEscalated ? '#f59e0b' : '#2dd4bf',
                            }}>
                              {msg.isEscalated ? '⚠️ Escalated to Agent' : `✓ ${msg.confidence}% Confidence`}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: '#8696a0', marginLeft: 'auto' }}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {simulating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, width: 'fit-content' }}>
                      <Bot size={13} color="#2dd4bf" />
                      <span style={{ fontSize: 11, color: '#2dd4bf', fontStyle: 'italic' }}>AI is typing response...</span>
                    </div>
                  )}
                </div>

                {/* Quick Test Prompt Pills */}
                <div style={styles.quickPillsWrap}>
                  <span style={{ fontSize: 10.5, color: '#8696a0', marginRight: 4 }}>Quick prompts:</span>
                  {[
                    'What are your business hours?',
                    'Can I see pricing & catalog?',
                    'I want to speak with a human manager',
                    'Where is my order #ORD-8821?',
                  ].map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendSimulatorMessage(prompt)}
                      style={styles.quickPromptPill}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Simulator Input Bar */}
                <div style={styles.simulatorInputBar}>
                  <input
                    type="text"
                    placeholder="Type customer test message..."
                    value={simInput}
                    onChange={e => setSimInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendSimulatorMessage();
                      }
                    }}
                    style={styles.simTextInput}
                  />
                  <button
                    type="button"
                    onClick={() => handleSendSimulatorMessage()}
                    disabled={simulating || !simInput.trim()}
                    style={styles.simSendBtn}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 6. SUB-TAB VIEW 3: KEYWORD ROUTING RULES ────────────────────── */}
          {activeSubTab === 'keywords' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Metrics Strip */}
              <div style={styles.metricsSummaryGrid}>
                <div style={styles.metricSummaryCard}>
                  <div style={styles.metricTopRow}>
                    <div style={styles.iconBoxBranch}>
                      <Zap size={16} color="#2dd4bf" />
                    </div>
                    <span style={styles.metricLabel}>ACTIVE RULES</span>
                  </div>
                  <div style={styles.metricValue}>
                    {keywordRules.filter(r => r.isActive).length} <span style={{ fontSize: 14, color: '#8696a0', fontWeight: 500 }}>/ {keywordRules.length}</span>
                  </div>
                  <div style={styles.metricSub}>Automated keywords configured</div>
                </div>

                <div style={styles.metricSummaryCard}>
                  <div style={styles.metricTopRow}>
                    <div style={styles.iconBoxBranch}>
                      <MessageSquare size={16} color="#2dd4bf" />
                    </div>
                    <span style={styles.metricLabel}>TRIGGER HITS</span>
                  </div>
                  <div style={styles.metricValue}>
                    {keywordRules.reduce((acc, r) => acc + r.hitCount, 0).toLocaleString()}
                  </div>
                  <div style={styles.metricSub}>Inbound customer queries resolved</div>
                </div>

                <div style={styles.metricSummaryCard}>
                  <div style={styles.metricTopRow}>
                    <div style={styles.iconBoxBranch}>
                      <BadgeCheck size={16} color="#2dd4bf" />
                    </div>
                    <span style={styles.metricLabel}>ACCURACY</span>
                  </div>
                  <div style={styles.metricValue}>98.4%</div>
                  <div style={styles.metricSub}>Direct keyword match precision</div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div style={styles.filterBarCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={styles.searchBox}>
                    <Search size={15} color="#8696a0" />
                    <input
                      type="text"
                      placeholder="Search keywords, actions, or rule names..."
                      value={keywordSearch}
                      onChange={e => setKeywordSearch(e.target.value)}
                      style={styles.searchInput}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(['all', 'contains', 'exact', 'regex'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMatchTypeFilter(type)}
                        style={{
                          ...styles.filterPill,
                          ...(matchTypeFilter === type ? styles.filterPillActive : {}),
                        }}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddKeywordModal(true)}
                  style={styles.addSmallBtn}
                >
                  <Plus size={14} />
                  <span>+ Add Keyword Rule</span>
                </button>
              </div>

              {/* Keyword Rules Cards List */}
              <div style={styles.keywordRulesContainer}>
                {filteredKeywords.length === 0 ? (
                  <div style={styles.emptyContainer}>
                    <Zap size={32} color="#8696a0" style={{ opacity: 0.5, marginBottom: 8 }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>No matching keyword rules</div>
                    <div style={{ fontSize: 12, color: '#8696a0', marginTop: 4 }}>Try clearing the search filter or create a new trigger rule.</div>
                  </div>
                ) : (
                  filteredKeywords.map(rule => (
                    <div key={rule.id} style={styles.keywordRuleCard}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                          <div style={styles.ruleIconCircle}>
                            {rule.action === 'catalog' && <FileText size={16} color="#2dd4bf" />}
                            {rule.action === 'escalate' && <Users size={16} color="#f59e0b" />}
                            {rule.action === 'flow' && <Bot size={16} color="#3b82f6" />}
                            {rule.action === 'message' && <MessageSquare size={16} color="#10b981" />}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{rule.name}</span>
                              <span style={{
                                ...styles.matchTypeBadge,
                                ...(rule.matchType === 'regex' ? styles.matchBadgeRegex :
                                   rule.matchType === 'exact' ? styles.matchBadgeExact : styles.matchBadgeContains),
                              }}>
                                {rule.matchType.toUpperCase()}
                              </span>
                              <span style={{
                                ...styles.priorityBadge,
                                ...(rule.priority === 'high' ? styles.priorityHigh :
                                   rule.priority === 'low' ? styles.priorityLow : styles.priorityNormal),
                              }}>
                                {rule.priority.toUpperCase()}
                              </span>
                            </div>

                            {/* Keywords Chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                              {rule.keywords.split(',').map((kw, idx) => (
                                <span key={idx} style={styles.keywordTag}>
                                  #{kw.trim()}
                                </span>
                              ))}
                            </div>

                            {/* Action Payload Description */}
                            <div style={styles.ruleActionDesc}>
                              <span style={{ color: '#2dd4bf', fontWeight: 600 }}>Action:</span> {rule.actionPayload}
                            </div>
                          </div>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{rule.hitCount.toLocaleString()}</div>
                            <div style={{ fontSize: 10.5, color: '#8696a0' }}>hits triggered</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleKeywordRule(rule.id)}
                            style={rule.isActive ? styles.statusPillActive : styles.statusPillInactive}
                          >
                            {rule.isActive ? <Play size={12} /> : <Pause size={12} />}
                            <span>{rule.isActive ? 'Active' : 'Paused'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteKeywordRule(rule.id, rule.name)}
                            style={styles.trashBtn}
                            title="Delete keyword rule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── 7. SUB-TAB VIEW 4: WEBHOOKS & API INTEGRATION ────────────────── */}
          {activeSubTab === 'webhooks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Inbound & Outbound Webhooks Grid */}
              <div style={styles.twoColumnGrid}>
                {/* Left Card: Inbound WhatsApp Cloud API Webhook */}
                <div style={styles.panelCard}>
                  <div style={styles.panelHeaderRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={styles.iconCircleTeal}>
                        <Server size={18} color="#2dd4bf" />
                      </div>
                      <div>
                        <h2 style={styles.panelTitle}>Inbound Webhook Integration</h2>
                        <div style={styles.panelSubtitle}>Configure in Developer Dashboard &gt; Webhooks &gt; Configuration</div>
                      </div>
                    </div>
                    <span style={styles.livePulseBadge}>
                      <span style={styles.liveDot} /> Active &amp; Receiving
                    </span>
                  </div>

                  {/* Webhook Callback URL */}
                  <div style={{ marginTop: 16 }}>
                    <label style={styles.fieldLabel}>Webhook Callback URL</label>
                    <div style={styles.copyInputGroup}>
                      <input
                        type="text"
                        readOnly
                        value={webhookConfig.inboundUrl}
                        style={styles.copyInput}
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookConfig.inboundUrl, 'inboundUrl')}
                        style={styles.copyBtn}
                      >
                        {copiedField === 'inboundUrl' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        <span>{copiedField === 'inboundUrl' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: '#8696a0', marginTop: 4 }}>
                      Paste this URL into your webhook settings.
                    </div>
                  </div>

                  {/* Verify Token */}
                  <div style={{ marginTop: 16 }}>
                    <label style={styles.fieldLabel}>Verification Token (hub.verify_token)</label>
                    <div style={styles.copyInputGroup}>
                      <input
                        type={webhookConfig.showVerifyToken ? 'text' : 'password'}
                        readOnly
                        value={webhookConfig.verifyToken}
                        style={styles.copyInput}
                      />
                      <button
                        type="button"
                        onClick={() => setWebhookConfig(prev => ({ ...prev, showVerifyToken: !prev.showVerifyToken }))}
                        style={styles.copyBtn}
                        title={webhookConfig.showVerifyToken ? 'Hide token' : 'Show token'}
                      >
                        {webhookConfig.showVerifyToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookConfig.verifyToken, 'verifyToken')}
                        style={styles.copyBtn}
                      >
                        {copiedField === 'verifyToken' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        <span>{copiedField === 'verifyToken' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Stats */}
                  <div style={styles.webhookStatsStrip}>
                    <div>
                      <div style={{ fontSize: 11, color: '#8696a0' }}>Uptime</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>99.98%</div>
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: 16 }}>
                      <div style={{ fontSize: 11, color: '#8696a0' }}>Avg Latency</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#2dd4bf' }}>34ms</div>
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: 16 }}>
                      <div style={{ fontSize: 11, color: '#8696a0' }}>Last Handshake</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>2s ago</div>
                    </div>
                  </div>
                </div>

                {/* Right Card: Outbound Webhook Dispatch (Zapier, n8n, CRM) */}
                <div style={styles.panelCard}>
                  <div style={styles.panelHeaderRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={styles.iconCircleTeal}>
                        <Zap size={18} color="#2dd4bf" />
                      </div>
                      <div>
                        <h2 style={styles.panelTitle}>Outbound Event Dispatching</h2>
                        <div style={styles.panelSubtitle}>Forward real-time messaging events to Zapier, n8n, or CRM</div>
                      </div>
                    </div>
                  </div>

                  {/* Outbound Dispatch URL */}
                  <div style={{ marginTop: 16 }}>
                    <label style={styles.fieldLabel}>Target Webhook Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      value={webhookConfig.outboundUrl}
                      onChange={e => setWebhookConfig(prev => ({ ...prev, outboundUrl: e.target.value }))}
                      style={styles.fieldInput}
                    />
                  </div>

                  {/* HMAC Secret */}
                  <div style={{ marginTop: 14 }}>
                    <label style={styles.fieldLabel}>HMAC SHA-256 Signature Secret</label>
                    <div style={styles.copyInputGroup}>
                      <input
                        type={webhookConfig.showHmacSecret ? 'text' : 'password'}
                        readOnly
                        value={webhookConfig.hmacSecret}
                        style={styles.copyInput}
                      />
                      <button
                        type="button"
                        onClick={() => setWebhookConfig(prev => ({ ...prev, showHmacSecret: !prev.showHmacSecret }))}
                        style={styles.copyBtn}
                      >
                        {webhookConfig.showHmacSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookConfig.hmacSecret, 'hmacSecret')}
                        style={styles.copyBtn}
                      >
                        {copiedField === 'hmacSecret' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#8696a0', marginTop: 3 }}>
                      Headers include <code style={{ color: '#2dd4bf' }}>X-Hub-Signature-256</code> for payload tamper verification.
                    </div>
                  </div>

                  {/* Subscribed Events Grid */}
                  <div style={{ marginTop: 16 }}>
                    <label style={styles.fieldLabel}>Event Subscriptions</label>
                    <div style={styles.eventsGrid}>
                      {[
                        { key: 'messageReceived', label: 'message.received', desc: 'Incoming customer messages' },
                        { key: 'messageDelivered', label: 'message.delivered', desc: 'Delivery receipts' },
                        { key: 'messageRead', label: 'message.read', desc: 'Blue checkmark read events' },
                        { key: 'chatEscalated', label: 'chat.escalated', desc: 'Handoff to human agent' },
                        { key: 'contactOptOut', label: 'contact.opt_out', desc: 'STOP / Unsubscribe triggers' },
                        { key: 'buttonClicked', label: 'button.clicked', desc: 'Quick replies & list selections' },
                      ].map(ev => (
                        <label key={ev.key} style={styles.eventCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={(webhookConfig.events as any)[ev.key]}
                            onChange={e => {
                              const checked = e.target.checked;
                              setWebhookConfig(prev => ({
                                ...prev,
                                events: {
                                  ...prev.events,
                                  [ev.key]: checked,
                                },
                              }));
                            }}
                            style={{ accentColor: '#00a884' }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{ev.label}</div>
                            <div style={{ fontSize: 10, color: '#8696a0' }}>{ev.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      type="button"
                      onClick={handleSaveWebhookConfig}
                      style={styles.submitBtn}
                    >
                      <Check size={14} />
                      <span>Save Webhook Settings</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Webhook Testing & Recent Deliveries */}
              <div style={styles.panelCard}>
                <div style={styles.panelHeaderRow}>
                  <div>
                    <h2 style={styles.panelTitle}>Webhook Dispatch Health &amp; Diagnostic Sandbox</h2>
                    <div style={styles.panelSubtitle}>Simulate live HTTP payload delivery and inspect payload signatures</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setShowPayloadModal(true)}
                      style={styles.cancelBtn}
                    >
                      <Code size={14} />
                      <span>View Sample Payload JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTestWebhook}
                      disabled={testWebhookStatus.status === 'sending'}
                      style={styles.submitBtn}
                    >
                      <Send size={14} />
                      <span>{testWebhookStatus.status === 'sending' ? 'Sending Test...' : 'Send Test Webhook'}</span>
                    </button>
                  </div>
                </div>

                {testWebhookStatus.status === 'success' && (
                  <div style={styles.testSuccessAlert}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <div>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>HTTP 200 OK: </span>
                      Webhook dispatched and verified successfully at {testWebhookStatus.timestamp} ({testWebhookStatus.latencyMs}ms roundtrip latency).
                    </div>
                  </div>
                )}

                {/* Recent Deliveries Table */}
                <div style={{ marginTop: 16, overflowX: 'auto' }}>
                  <table style={styles.logTable}>
                    <thead>
                      <tr>
                        <th style={styles.th}>EVENT</th>
                        <th style={styles.th}>STATUS</th>
                        <th style={styles.th}>TARGET URL</th>
                        <th style={styles.th}>LATENCY</th>
                        <th style={styles.th}>TIMESTAMP</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={styles.td}><code style={{ color: '#2dd4bf' }}>message.received</code></td>
                        <td style={styles.td}><span style={styles.badgeSuccess}>200 OK</span></td>
                        <td style={styles.td}>{webhookConfig.outboundUrl}</td>
                        <td style={styles.td}>38ms</td>
                        <td style={styles.td}>Just now</td>
                      </tr>
                      <tr>
                        <td style={styles.td}><code style={{ color: '#2dd4bf' }}>chat.escalated</code></td>
                        <td style={styles.td}><span style={styles.badgeSuccess}>200 OK</span></td>
                        <td style={styles.td}>{webhookConfig.outboundUrl}</td>
                        <td style={styles.td}>44ms</td>
                        <td style={styles.td}>4m ago</td>
                      </tr>
                      <tr>
                        <td style={styles.td}><code style={{ color: '#2dd4bf' }}>message.read</code></td>
                        <td style={styles.td}><span style={styles.badgeSuccess}>200 OK</span></td>
                        <td style={styles.td}>{webhookConfig.outboundUrl}</td>
                        <td style={styles.td}>29ms</td>
                        <td style={styles.td}>12m ago</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── MODAL: Create New Flow ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Bot size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Create Chatbot Flow
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Trigger automated reply flows and smart routing on incoming keywords
                  </div>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFlow} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Flow Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Instant Product Inquiries &amp; VIP Routing"
                  value={flowName}
                  onChange={e => setFlowName(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Trigger Keywords (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. price, pricing, cost, catalog, menu, help"
                  value={triggerKeyword}
                  onChange={e => setTriggerKeyword(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Auto-Reply Message</label>
                <textarea
                  rows={4}
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  style={styles.formTextarea}
                  required
                />
                <div style={{ fontSize: 10.5, color: '#8696a0', marginTop: 3 }}>
                  Variables: <code style={{ color: '#2dd4bf' }}>&#123;&#123;name&#125;&#125;</code>, <code style={{ color: '#2dd4bf' }}>&#123;&#123;time&#125;&#125;</code> will be substituted dynamically.
                </div>
              </div>

              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="escalateHuman"
                  checked={escalateToHuman}
                  onChange={e => setEscalateToHuman(e.target.checked)}
                  style={{ accentColor: '#00a884', width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="escalateHuman" style={{ fontSize: 12.5, color: '#e2e8f0', cursor: 'pointer' }}>
                  Escalate to human agent if client replies further
                </label>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={styles.submitBtn}
                >
                  {saving ? 'Saving...' : 'Save & Activate Flow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Keyword Rule ────────────────────────────────────────── */}
      {showAddKeywordModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddKeywordModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Zap size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Add Keyword Routing Rule
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Trigger automated actions whenever customer messages match keywords or regex patterns
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAddKeywordModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateKeywordRule} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Rule Name *</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Consultation Request"
                  value={newKeywordForm.name}
                  onChange={e => setNewKeywordForm(prev => ({ ...prev, name: e.target.value }))}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Keywords or Regex Pattern *</label>
                <input
                  type="text"
                  placeholder="e.g. vip, consult, appointment, book"
                  value={newKeywordForm.keywords}
                  onChange={e => setNewKeywordForm(prev => ({ ...prev, keywords: e.target.value }))}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Match Type</label>
                  <select
                    value={newKeywordForm.matchType}
                    onChange={e => setNewKeywordForm(prev => ({ ...prev, matchType: e.target.value as any }))}
                    style={styles.formInput}
                  >
                    <option value="contains">Contains Keyword (Fuzzy)</option>
                    <option value="exact">Exact Match</option>
                    <option value="regex">Regular Expression (Regex)</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Priority</label>
                  <select
                    value={newKeywordForm.priority}
                    onChange={e => setNewKeywordForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    style={styles.formInput}
                  >
                    <option value="high">High Priority</option>
                    <option value="normal">Normal Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Action To Execute</label>
                <select
                  value={newKeywordForm.action}
                  onChange={e => setNewKeywordForm(prev => ({ ...prev, action: e.target.value as any }))}
                  style={styles.formInput}
                >
                  <option value="message">Send Auto-Reply Message</option>
                  <option value="escalate">Escalate to Live Support Queue</option>
                  <option value="catalog">Send Product Catalog &amp; Brochure PDF</option>
                  <option value="flow">Trigger Interactive Chatbot Flow</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Response Message / Payload</label>
                <textarea
                  rows={3}
                  placeholder="Enter auto-response message or instruction..."
                  value={newKeywordForm.actionPayload}
                  onChange={e => setNewKeywordForm(prev => ({ ...prev, actionPayload: e.target.value }))}
                  style={styles.formTextarea}
                  required
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAddKeywordModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitBtn}
                >
                  <Plus size={14} />
                  <span>Create Keyword Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Webhook Payload Inspector ──────────────────────────────── */}
      {showPayloadModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPayloadModal(false)}>
          <div style={{ ...styles.modalBox, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Code size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Webhook JSON Payload Inspector
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Standard event schema delivered to your outbound webhook endpoints
                  </div>
                </div>
              </div>
              <button onClick={() => setShowPayloadModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={styles.codeBox}>
                <pre style={{ margin: 0, fontSize: 12, color: '#2dd4bf', fontFamily: 'monospace', overflowX: 'auto' }}>
                  {JSON.stringify(mockWebhookPayload, null, 2)}
                </pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 11.5, color: '#8696a0' }}>
                  Delivered with HMAC-SHA256 signature in HTTP request headers.
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(JSON.stringify(mockWebhookPayload, null, 2), 'payloadJson')}
                    style={styles.cancelBtn}
                  >
                    {copiedField === 'payloadJson' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedField === 'payloadJson' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPayloadModal(false)}
                    style={styles.submitBtn}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Styles (Matching Design 12 Glassmorphism Dark Theme) ──────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    background: '#071013',
    color: '#e2e8f0',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
  },
  horizontalTabStrip: {
    height: 44,
    background: 'rgba(8, 20, 24, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    flexShrink: 0,
    zIndex: 10,
  },
  tabStripLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    overflowX: 'auto',
  },
  stripTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 6,
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  stripTabBtnActive: {
    background: 'rgba(0, 168, 132, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.4)',
    color: '#ffffff',
    fontWeight: 700,
    boxShadow: '0 0 12px rgba(0, 168, 132, 0.25)',
  },
  backToWhatsAppBtn: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
    transition: 'color 0.15s ease',
  },
  contentScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 28px',
  },
  innerWrapper: {
    maxWidth: 1140,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  headerCard: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(8, 35, 38, 0.85) 0%, rgba(6, 24, 28, 0.95) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 16,
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  headerSilkWave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
    zIndex: 1,
  },
  headerIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(45, 212, 191, 0.25)',
    flexShrink: 0,
    position: 'relative',
  },
  iconSparkle: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  pageSubtitle: {
    fontSize: 12.5,
    color: '#8696a0',
    margin: '4px 0 0 0',
    lineHeight: 1.4,
  },
  highlightWord: {
    color: '#2dd4bf',
    fontWeight: 600,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    position: 'relative',
    zIndex: 1,
  },
  bannerArtBox: {
    display: 'flex',
    alignItems: 'center',
  },
  newFlowBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 10,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 168, 132, 0.4)',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  subTabBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(8, 20, 24, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.18)',
    borderRadius: 12,
    padding: '6px 8px',
    overflowX: 'auto',
  },
  subTabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 8,
    background: 'transparent',
    border: '1px solid transparent',
    color: '#8696a0',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  subTabButtonActive: {
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.4)',
    color: '#ffffff',
    fontWeight: 700,
    boxShadow: '0 2px 10px rgba(0, 168, 132, 0.25)',
  },
  subTabBadge: {
    fontSize: 10.5,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 9999,
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
  },
  subTabBadgeActive: {
    fontSize: 10.5,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 9999,
    background: '#00a884',
    color: '#ffffff',
  },
  mainColumnsGrid: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr 280px',
    gap: 16,
    alignItems: 'stretch',
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1.15fr 0.85fr',
    gap: 16,
    alignItems: 'stretch',
  },
  flowsMetricCard: {
    borderRadius: 16,
    padding: '18px',
    background: 'linear-gradient(135deg, rgba(8, 35, 38, 0.75) 0%, rgba(6, 26, 30, 0.85) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  metricTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBoxBranch: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircleBadge: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#8696a0',
    letterSpacing: '0.4px',
  },
  metricValue: {
    fontSize: 34,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.1,
    margin: '4px 0',
  },
  metricSub: {
    fontSize: 11,
    color: '#8696a0',
  },
  sparkline: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  centerFlowContainer: {
    background: 'rgba(8, 20, 24, 0.75)',
    border: '1.5px dashed rgba(45, 212, 191, 0.3)',
    borderRadius: 16,
    padding: '36px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 380,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  emptyFlowInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  flowArtBox: {
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#ffffff',
    margin: '0 0 6px 0',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#8696a0',
    maxWidth: 380,
    margin: '0 0 22px 0',
    lineHeight: 1.4,
  },
  createFirstFlowBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 24px',
    borderRadius: 10,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(0, 168, 132, 0.45)',
    transition: 'all 0.15s ease',
  },
  flowsListCard: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  flowsListHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  addSmallBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 6,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 168, 132, 0.3)',
  },
  flowsItemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 12,
  },
  flowRowCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flowItemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowItemName: {
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
  },
  flowItemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  statusPillActive: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 9999,
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10b981',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  statusPillInactive: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 9999,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  trashBtn: {
    padding: '6px',
    borderRadius: 6,
    background: 'rgba(239, 68, 68, 0.1)',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howItWorksPanel: {
    background: 'rgba(8, 20, 24, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    borderRadius: 16,
    padding: '20px 18px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  howItWorksTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#ffffff',
    margin: '0 0 14px 0',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  stepCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: '10px 12px',
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'rgba(45, 212, 191, 0.15)',
    color: '#2dd4bf',
    fontSize: 10.5,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTextContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  stepDesc: {
    fontSize: 10.5,
    color: '#8696a0',
    margin: '2px 0 0 0',
    lineHeight: 1.35,
  },
  calloutCard: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 16,
    background: 'linear-gradient(135deg, rgba(8, 38, 42, 0.85) 0%, rgba(6, 24, 28, 0.95) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 12,
    padding: '12px 14px',
  },
  calloutSilkWave: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    pointerEvents: 'none',
  },
  calloutText: {
    fontSize: 11.5,
    color: '#cbd5e1',
    fontWeight: 600,
    margin: 0,
    lineHeight: 1.3,
  },
  // Sub-Tab Panels & Cards
  panelCard: {
    background: 'rgba(8, 20, 24, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    borderRadius: 16,
    padding: '20px 24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
  },
  panelSubtitle: {
    fontSize: 11.5,
    color: '#8696a0',
    marginTop: 2,
  },
  iconCircleTeal: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.14)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePill: {
    width: 42,
    height: 22,
    borderRadius: 11,
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    transition: 'background 0.2s ease',
    display: 'flex',
    alignItems: 'center',
  },
  toggleCircle: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s ease',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#cbd5e1',
    display: 'block',
    marginBottom: 6,
  },
  fieldSelect: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    background: '#091c22',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
  },
  fieldInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  fieldTextarea: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  modelPillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  specBadge: {
    fontSize: 10.5,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(45, 212, 191, 0.1)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    color: '#2dd4bf',
    fontWeight: 600,
  },
  varChipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  varChipBtn: {
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#2dd4bf',
    fontSize: 11,
    fontFamily: 'monospace',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  slidersGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginTop: 16,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: '14px 16px',
  },
  sliderLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rangeSlider: {
    width: '100%',
    accentColor: '#00a884',
    cursor: 'pointer',
  },
  // Simulator Card
  simulatorCard: {
    background: 'rgba(8, 20, 24, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  simulatorHeader: {
    background: '#0c2428',
    borderBottom: '1px solid rgba(45, 212, 191, 0.25)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSimBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    border: 'none',
    color: '#8696a0',
    fontSize: 11,
    cursor: 'pointer',
  },
  simulatorChatBox: {
    flex: 1,
    padding: '16px',
    minHeight: 280,
    maxHeight: 380,
    overflowY: 'auto',
    background: 'linear-gradient(180deg, rgba(6, 18, 22, 0.95) 0%, rgba(8, 22, 26, 0.95) 100%)',
  },
  quickPillsWrap: {
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    overflowX: 'auto',
  },
  quickPromptPill: {
    padding: '3px 8px',
    borderRadius: 12,
    background: 'rgba(45, 212, 191, 0.08)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    color: '#cbd5e1',
    fontSize: 10.5,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  simulatorInputBar: {
    padding: '10px 12px',
    background: '#091c21',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  simTextInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: 12.5,
    outline: 'none',
  },
  simSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  // Keyword Rules
  metricsSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  metricSummaryCard: {
    background: 'linear-gradient(135deg, rgba(8, 35, 38, 0.75) 0%, rgba(6, 26, 30, 0.85) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    borderRadius: 14,
    padding: '16px 20px',
  },
  filterBarCard: {
    background: 'rgba(8, 20, 24, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    borderRadius: 12,
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '6px 12px',
    flex: 1,
    maxWidth: 360,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    outline: 'none',
    width: '100%',
  },
  filterPill: {
    padding: '5px 10px',
    borderRadius: 6,
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#8696a0',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  filterPillActive: {
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.4)',
    color: '#2dd4bf',
  },
  keywordRulesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  keywordRuleCard: {
    background: 'rgba(8, 20, 24, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    borderRadius: 12,
    padding: '14px 18px',
    transition: 'border-color 0.15s ease',
  },
  ruleIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  matchTypeBadge: {
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.4px',
  },
  matchBadgeContains: {
    background: 'rgba(45, 212, 191, 0.15)',
    color: '#2dd4bf',
    border: '1px solid rgba(45, 212, 191, 0.3)',
  },
  matchBadgeExact: {
    background: 'rgba(168, 85, 247, 0.15)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.3)',
  },
  matchBadgeRegex: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
  },
  priorityHigh: {
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#f87171',
  },
  priorityNormal: {
    background: 'rgba(59, 130, 246, 0.12)',
    color: '#60a5fa',
  },
  priorityLow: {
    background: 'rgba(148, 163, 184, 0.12)',
    color: '#94a3b8',
  },
  keywordTag: {
    fontSize: 11,
    fontFamily: 'monospace',
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
  },
  ruleActionDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 6,
    lineHeight: 1.3,
  },
  emptyContainer: {
    padding: '40px 20px',
    textAlign: 'center',
    background: 'rgba(8, 20, 24, 0.5)',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
  },
  // Webhooks
  livePulseBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 9999,
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10b981',
    fontSize: 11,
    fontWeight: 700,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  copyInputGroup: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  copyInput: {
    flex: 1,
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    color: '#2dd4bf',
    fontSize: 12.5,
    fontFamily: 'monospace',
    outline: 'none',
  },
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  webhookStatsStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginTop: 18,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: '12px 16px',
  },
  eventsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  eventCheckboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    cursor: 'pointer',
  },
  testSuccessAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#cbd5e1',
    fontSize: 12.5,
  },
  logTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
    textAlign: 'left',
  },
  th: {
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#8696a0',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.4px',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    color: '#e2e8f0',
  },
  badgeSuccess: {
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    fontWeight: 700,
    fontSize: 11,
  },
  codeBox: {
    background: '#050d10',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 8,
    padding: '14px',
    maxHeight: 340,
    overflowY: 'auto',
  },
  // Modal Overlays
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modalBox: {
    background: '#0c1a1f',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  modalBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
    padding: 4,
  },
  modalForm: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#cbd5e1',
  },
  formInput: {
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
  },
  formTextarea: {
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    padding: '9px 18px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.06)',
    border: 'none',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  submitBtn: {
    padding: '9px 20px',
    borderRadius: 8,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 168, 132, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
};
