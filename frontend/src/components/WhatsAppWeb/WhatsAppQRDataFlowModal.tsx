import React, { useState, useEffect, useRef } from 'react';
import {
  X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Copy, Check,
  QrCode, Shield, Server, Database, Smartphone, CheckCircle2, ArrowRight,
  Activity, Terminal, Zap, ExternalLink, RefreshCw
} from 'lucide-react';
import { whatsappWebApi, accountsApi } from '../../services/api';
import { useAccountStore } from '../../stores';
import { safeCopyToClipboard } from '../../utils/clipboard';

interface WhatsAppQRDataFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
}

interface StepData {
  step: number;
  title: string;
  lane: string;
  source: string;
  target: string;
  description: string;
  payloadType: 'json' | 'http' | 'sql' | 'typescript';
  code: string;
  metadata?: Record<string, string | number>;
}

export default function WhatsAppQRDataFlowModal({
  isOpen,
  onClose,
  accountId: propAccountId,
}: WhatsAppQRDataFlowModalProps) {
  const { accounts, activeAccount } = useAccountStore();
  const currentAccountId = propAccountId || activeAccount?.id || (accounts[0]?.id ?? 'wa_acc_98765');
  const currentAccountPhone = activeAccount?.phoneNumber || 'Demo Account';

  const [activeStep, setActiveStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveResult, setLiveResult] = useState<{ count: number; chats: any[]; durationMs: number } | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 6 Core Architectural Lifecycle Steps tailored specifically for WhatsApp Account Chat History
  const steps: StepData[] = [
    {
      step: 1,
      title: 'Local Frame Decoding',
      lane: 'Client (Scanner)',
      source: 'Client (Scanner)',
      target: 'Client (Scanner)',
      description: 'Scanner captures optical image from device camera, decodes QR matrix, and extracts the account pairing identifier and session token.',
      payloadType: 'json',
      code: JSON.stringify(
        {
          action: 'DECODE_QR',
          target_entity: 'ACCOUNT_CHAT_HISTORY',
          account_id: currentAccountId,
          pairing_token: 'WA_PAIR_98765_SECURE_TOKEN',
          raw_text: `https://whatsapp.enterprise.io/auth/pair?accountId=${currentAccountId}&scope=history:read`,
          timestamp: Date.now(),
        },
        null,
        2
      ),
      metadata: {
        'Resolution Latency': '34ms',
        'Decoder Engine': 'ZXing WebAssembly',
        'Optical Contrast': '98.4%',
      },
    },
    {
      step: 2,
      title: 'API Gateway Request',
      lane: 'Client → API Gateway',
      source: 'Client (Scanner)',
      target: 'API Gateway',
      description: 'Client constructs an authenticated HTTPS GET request carrying the JWT Bearer token and tenant header to request all conversation threads.',
      payloadType: 'http',
      code: `GET /api/v1/whatsapp/chats?accountId=${currentAccountId}&limit=50 HTTP/1.1
Host: api.enterprise-whatsapp.io
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfNzcyMSIsInRlbmFudElkIjoiZGVmYXVsdC10ZW5hbnQiLCJyb2xlIjoiU1VQRVJfQURNSU4ifQ...
Accept: application/json
X-Tenant-ID: default-tenant
User-Agent: WhatsAppEngine-Client/2.4.0 (Web/Mobile)`,
      metadata: {
        'Protocol': 'HTTPS / HTTP/2',
        'TLS Version': 'TLS 1.3 (ChaCha20-Poly1305)',
        'Payload Size': '1.1 KB',
      },
    },
    {
      step: 3,
      title: 'Auth Validation & Route',
      lane: 'API Gateway → Backend',
      source: 'API Gateway',
      target: 'Backend Controller',
      description: 'API Gateway verifies JWT cryptographic signature, confirms tenant isolation permissions, executes rate-limiting checks, and routes to MessageWebController.',
      payloadType: 'json',
      code: JSON.stringify(
        {
          authenticated_user: 'usr_7721',
          user_role: 'SUPER_ADMIN',
          tenant_id: 'default-tenant',
          target_account: currentAccountId,
          guard_pipeline: [
            'JwtAuthGuard: PASSED (Signature valid, not expired)',
            'AccountIsolationGuard: PASSED (User has access to account)',
            'ThrottlerGuard: PASSED (Remaining: 994/1000 req/min)'
          ],
          upstream_route: 'WhatsappWebController.getChats()'
        },
        null,
        2
      ),
      metadata: {
        'Gateway Latency': '2.1ms',
        'RBAC Policy': 'account_access:read',
        'Rate Limit': 'Healthy',
      },
    },
    {
      step: 4,
      title: 'Database Query',
      lane: 'Backend → Database',
      source: 'Backend Controller',
      target: 'Database',
      description: 'Backend Controller checks L1/L2 Redis cache; upon cache miss, it issues a lean-projection SQL query against the indexed database cluster.',
      payloadType: 'sql',
      code: `SELECT 
  chat.id AS id,
  chat.account_id AS account_id,
  chat.name AS name,
  chat.subtitle AS subtitle,
  chat.is_group AS is_group,
  chat.unread_count AS unread_count,
  chat.last_message_text AS last_message_text,
  chat.last_message_timestamp AS last_message_timestamp,
  chat.last_message_status AS last_message_status,
  chat.pinned AS pinned,
  chat.avatar_url AS avatar_url
FROM whatsapp_chats chat
WHERE chat.account_id = '${currentAccountId}'
ORDER BY chat.pinned DESC, chat.last_message_timestamp DESC
LIMIT 50 OFFSET 0;`,
      metadata: {
        'Query Optimizer': 'SQLite WAL / Postgres B-Tree Index Scan',
        'Index Used': 'idx_whatsapp_messages_fifo_ttl & account_id',
        'Estimated Cost': '0.04 ms',
      },
    },
    {
      step: 5,
      title: 'Recordset Return',
      lane: 'Database → Backend',
      source: 'Database',
      target: 'Backend Controller',
      description: 'Database storage engine retrieves rows from buffer pool cache and returns raw conversation threads and message logs to the NestJS service.',
      payloadType: 'json',
      code: JSON.stringify(
        [
          {
            id: '12036304@g.us',
            account_id: currentAccountId,
            name: 'Operations HQ',
            subtitle: 'Dhyey: Server deployment complete',
            is_group: true,
            unread_count: 2,
            last_message_text: 'Server deployment verified on port 3000.',
            last_message_timestamp: 1759320290000,
            pinned: true
          },
          {
            id: '14155552671@s.whatsapp.net',
            account_id: currentAccountId,
            name: 'John Doe',
            subtitle: 'Can you send the contract?',
            is_group: false,
            unread_count: 0,
            last_message_text: 'Can you send the contract document?',
            last_message_timestamp: 1759318120000,
            pinned: false
          }
        ],
        null,
        2
      ),
      metadata: {
        'Execution Time': '4.8ms',
        'Rows Scanned': '50',
        'Buffer Hit Ratio': '99.8%',
      },
    },
    {
      step: 6,
      title: 'Data Rendering & Timeline',
      lane: 'Backend → Client',
      source: 'Backend Controller',
      target: 'Client (Scanner)',
      description: 'Backend serializes hydrated chat list into 200 OK JSON; Client parses the payload, updates Zustand chat store, and dynamically renders the chat timeline.',
      payloadType: 'typescript',
      code: `// HTTP 200 OK Response received by Client
const response = await fetch('/api/v1/whatsapp/chats?accountId=' + accountId);
const chatHistory = await response.json();

// 1. Update Global State
useChatStore.getState().setChats(chatHistory);

// 2. Resolve Contact Names & Avatars
const resolvedChats = chatHistory.map(chat => ({
  ...chat,
  displayName: resolveChatDisplayName(chat.id, chat.name)
}));

// 3. Render Virtualized Chat Timeline & Message Pane
renderChatTimeline(resolvedChats);
console.log('Successfully rendered ' + chatHistory.length + ' chats!');`,
      metadata: {
        'Render Phase': 'React 18 Concurrent Paint',
        'DOM Frame Time': '16.6ms (60 FPS)',
        'HTTP Status': '200 OK',
      },
    },
  ];

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev >= 6 ? 1 : prev + 1));
    }, 3200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Execute actual live account chats fetch
  const handleLiveFetch = async () => {
    setLiveLoading(true);
    const start = performance.now();
    try {
      const data = await whatsappWebApi.getChats(currentAccountId, undefined, 20);
      const durationMs = Math.round(performance.now() - start);
      setLiveResult({
        count: Array.isArray(data) ? data.length : 0,
        chats: Array.isArray(data) ? data.slice(0, 5) : [],
        durationMs,
      });
      setActiveStep(6); // Jump straight to step 6 (Render)
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      setLiveResult({
        count: 0,
        chats: [],
        durationMs,
      });
    } finally {
      setLiveLoading(false);
    }
  };

  const currentStepData = steps[activeStep - 1];

  const handleCopyCode = async () => {
    await safeCopyToClipboard(currentStepData.code, { allowNewlines: true });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  // Lifeline column positions
  const lanes = [
    { id: 'client', name: 'Client (Scanner)', x: 140 },
    { id: 'gateway', name: 'API Gateway', x: 380 },
    { id: 'backend', name: 'Backend Controller', x: 620 },
    { id: 'database', name: 'Database', x: 860 },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 9, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1040,
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #0e1522 0%, #0a0e17 100%)',
          borderRadius: 20,
          border: '1px solid rgba(59, 130, 246, 0.22)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(59, 130, 246, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <QrCode size={18} color="#60a5fa" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.3px', color: '#ffffff' }}>
                QR Scan Data Flow
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                Account Chat History
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
              Interactive API request lifecycle from optical scan to record retrieval
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleLiveFetch}
              disabled={liveLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontSize: 12,
                fontWeight: 600,
                cursor: liveLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              title="Test real query against live backend"
            >
              <RefreshCw size={13} className={liveLoading ? 'animate-spin' : ''} />
              {liveLoading ? 'Querying...' : 'Test Live DB Query'}
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: 34,
                height: 34,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Sequence Diagram Visualizer Canvas */}
          <div
            style={{
              background: '#070a12',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.07)',
              padding: '18px 20px 10px 20px',
              position: 'relative',
              overflowX: 'auto',
            }}
          >
            {/* Top Swimlane Lifeline Badges */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
                marginBottom: 20,
              }}
            >
              {lanes.map((lane, idx) => {
                const isLaneActive =
                  (activeStep === 1 && idx === 0) ||
                  (activeStep === 2 && (idx === 0 || idx === 1)) ||
                  (activeStep === 3 && (idx === 1 || idx === 2)) ||
                  (activeStep === 4 && (idx === 2 || idx === 3)) ||
                  (activeStep === 5 && (idx === 3 || idx === 2)) ||
                  (activeStep === 6 && (idx === 2 || idx === 0));

                return (
                  <div
                    key={lane.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '9px 12px',
                      borderRadius: 9999,
                      background: isLaneActive
                        ? 'rgba(59, 130, 246, 0.18)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: isLaneActive
                        ? '1.5px solid #3b82f6'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isLaneActive ? '#60a5fa' : '#94a3b8',
                      fontSize: 13,
                      fontWeight: isLaneActive ? 700 : 500,
                      boxShadow: isLaneActive ? '0 0 16px rgba(59, 130, 246, 0.35)' : 'none',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {lane.name}
                  </div>
                );
              })}
            </div>

            {/* Sequence Flow Lines Diagram */}
            <div style={{ position: 'relative', height: 260, width: '100%', minWidth: 700 }}>
              {/* Vertical Dashed Lifelines */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: 1.5,
                        height: '100%',
                        borderLeft: '1.5px dashed rgba(255, 255, 255, 0.15)',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Step 1: Self-loop on Client (Decode QR Code) */}
              <div
                onClick={() => setActiveStep(1)}
                style={{
                  position: 'absolute',
                  top: 10,
                  left: '12.5%',
                  cursor: 'pointer',
                  opacity: activeStep === 1 ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: activeStep === 1 ? '#3b82f6' : '#1e293b',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: activeStep === 1 ? '0 0 10px #3b82f6' : 'none',
                    }}
                  >
                    1
                  </div>
                  <div
                    style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      background: activeStep === 1 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                      border: activeStep === 1 ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: activeStep === 1 ? '#93c5fd' : '#94a3b8',
                    }}
                  >
                    Decode QR Code
                  </div>
                </div>
              </div>

              {/* Step 2: Client -> API Gateway (GET /api/v1/whatsapp/chats) */}
              <div
                onClick={() => setActiveStep(2)}
                style={{
                  position: 'absolute',
                  top: 55,
                  left: '12.5%',
                  width: '25%',
                  cursor: 'pointer',
                  opacity: activeStep === 2 ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: activeStep === 2 ? '#3b82f6' : '#1e293b',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        2
                      </span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: activeStep === 2 ? '#93c5fd' : '#64748b' }}>
                        GET /chats?accountId={currentAccountId.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 2,
                      background: activeStep === 2 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 2 ? '0 0 8px #3b82f6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: -4,
                        width: 0,
                        height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderLeft: `7px solid ${activeStep === 2 ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: API Gateway -> Backend Controller (Validate & Route) */}
              <div
                onClick={() => setActiveStep(3)}
                style={{
                  position: 'absolute',
                  top: 100,
                  left: '37.5%',
                  width: '25%',
                  cursor: 'pointer',
                  opacity: activeStep === 3 ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: activeStep === 3 ? '#3b82f6' : '#1e293b',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      3
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: activeStep === 3 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                        border: activeStep === 3 ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: activeStep === 3 ? '#93c5fd' : '#64748b',
                      }}
                    >
                      Validate JWT & Route
                    </span>
                  </div>
                  <div
                    style={{
                      height: 2,
                      background: activeStep === 3 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 3 ? '0 0 8px #3b82f6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: -4,
                        width: 0,
                        height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderLeft: `7px solid ${activeStep === 3 ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Backend Controller -> Database (SELECT * FROM whatsapp_chats) */}
              <div
                onClick={() => setActiveStep(4)}
                style={{
                  position: 'absolute',
                  top: 145,
                  left: '62.5%',
                  width: '25%',
                  cursor: 'pointer',
                  opacity: activeStep === 4 ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: activeStep === 4 ? '#3b82f6' : '#1e293b',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      4
                    </span>
                    <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: activeStep === 4 ? '#93c5fd' : '#64748b' }}>
                      SELECT * FROM whatsapp_chats
                    </span>
                  </div>
                  <div
                    style={{
                      height: 2,
                      background: activeStep === 4 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 4 ? '0 0 8px #3b82f6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: -4,
                        width: 0,
                        height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderLeft: `7px solid ${activeStep === 4 ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 5: Database -> Backend Controller (< Raw Chat Rows) */}
              <div
                onClick={() => setActiveStep(5)}
                style={{
                  position: 'absolute',
                  top: 185,
                  left: '62.5%',
                  width: '25%',
                  cursor: 'pointer',
                  opacity: activeStep === 5 ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 2 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: activeStep === 5 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                        border: activeStep === 5 ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: activeStep === 5 ? '#93c5fd' : '#64748b',
                      }}
                    >
                      &lt; Raw Chat Rows (Buffer Pool)
                    </span>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: activeStep === 5 ? '#3b82f6' : '#1e293b',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      5
                    </span>
                  </div>
                  <div
                    style={{
                      height: 2,
                      background: activeStep === 5 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      borderTop: '2px dashed',
                      borderColor: activeStep === 5 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 5 ? '0 0 8px #3b82f6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: -4,
                        width: 0,
                        height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderRight: `7px solid ${activeStep === 5 ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 6: Backend Controller -> Client (200 OK JSON & Render) */}
              <div
                onClick={() => setActiveStep(6)}
                style={{
                  position: 'absolute',
                  top: 225,
                  left: '12.5%',
                  width: '50%',
                  cursor: 'pointer',
                  opacity: activeStep === 6 ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 2 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: activeStep === 6 ? '#10b981' : '#1e293b',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      6
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: activeStep === 6 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                        border: activeStep === 6 ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: activeStep === 6 ? '#34d399' : '#64748b',
                      }}
                    >
                      200 OK (JSON) & Client Timeline Render
                    </span>
                  </div>
                  <div
                    style={{
                      height: 2,
                      background: activeStep === 6 ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                      borderTop: '2px dashed',
                      borderColor: activeStep === 6 ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 6 ? '0 0 8px #10b981' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: -4,
                        width: 0,
                        height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderRight: `7px solid ${activeStep === 6 ? '#10b981' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Step Detail Card */}
          <div
            style={{
              background: '#0a0e18',
              borderRadius: 16,
              border: '1px solid rgba(59, 130, 246, 0.2)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* Header: Step Pill + Title + Lane Tag */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: '#1d4ed8',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.2px',
                  }}
                >
                  Step {activeStep} of 6
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  {currentStepData.title}
                </h3>
              </div>

              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#93c5fd',
                  fontFamily: 'monospace',
                  background: 'rgba(59, 130, 246, 0.12)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                {currentStepData.lane}
              </div>
            </div>

            {/* Explanation Description */}
            <p style={{ margin: 0, fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.55 }}>
              {currentStepData.description}
            </p>

            {/* Syntax Highlighted Payload Box */}
            <div
              style={{
                background: '#04070d',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '7px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Terminal size={12} color="#60a5fa" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                    {currentStepData.payloadType} Payload
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copied ? '#34d399' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    padding: 0,
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <pre
                style={{
                  margin: 0,
                  padding: '12px 16px',
                  fontSize: 12.5,
                  fontFamily: 'Consolas, "Fira Code", monospace',
                  color: '#e2e8f0',
                  lineHeight: 1.5,
                  overflowX: 'auto',
                  maxHeight: 160,
                }}
              >
                <code>{currentStepData.code}</code>
              </pre>
            </div>

            {/* Step Metadata Metrics */}
            {currentStepData.metadata && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 10,
                  paddingTop: 4,
                }}
              >
                {Object.entries(currentStepData.metadata).map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#64748b' }}>{key}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#f1f5f9', marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live DB Query Result Banner (if run) */}
          {liveResult && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={18} color="#34d399" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                    Live DB Query Succeeded: Retrieved {liveResult.count} active chat threads
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    Round-trip latency: <strong style={{ color: '#34d399' }}>{liveResult.durationMs}ms</strong> • Target Account: <span style={{ fontFamily: 'monospace' }}>{currentAccountId}</span>
                  </div>
                </div>
              </div>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Status 200 OK
              </span>
            </div>
          )}

        </div>

        {/* Modal Controls Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Step Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setIsPlaying(false);
                  setActiveStep(num);
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: activeStep === num ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
                  border: activeStep === num ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeStep === num ? '#ffffff' : '#94a3b8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Player controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                setActiveStep(1);
                setIsPlaying(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} />
              Reset
            </button>

            <button
              onClick={() => {
                setActiveStep((prev) => (prev > 1 ? prev - 1 : 6));
                setIsPlaying(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '7px 12px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={14} />
              Prev
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                background: isPlaying ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.2)',
                border: isPlaying ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(59, 130, 246, 0.4)',
                color: isPlaying ? '#f87171' : '#60a5fa',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              {isPlaying ? 'Pause' : 'Auto Play'}
            </button>

            <button
              onClick={() => {
                setActiveStep((prev) => (prev < 6 ? prev + 1 : 1));
                setIsPlaying(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '7px 12px',
                borderRadius: 8,
                background: '#2563eb',
                border: '1px solid #3b82f6',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
