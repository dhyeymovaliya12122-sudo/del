import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Copy, Check,
  QrCode, RefreshCw, Terminal, Layers, ArrowLeft, Shield, Server,
  Database, Smartphone, CheckCircle2, Zap, Code, BookOpen, ExternalLink,
  ChevronDown
} from 'lucide-react';
import { whatsappWebApi } from '../../services/api';
import { useAccountStore } from '../../stores';
import { safeCopyToClipboard } from '../../utils/clipboard';

interface WhatsAppQRScanDataFlowViewProps {
  accountId?: string;
  onBack?: () => void;
}

export default function WhatsAppQRScanDataFlowView({
  accountId: propAccountId,
  onBack,
}: WhatsAppQRScanDataFlowViewProps) {
  const { accounts, activeAccount } = useAccountStore();
  const targetAccountId = propAccountId || activeAccount?.id || (accounts[0]?.id ?? 'ba7a9a17-07d0-44f6-9f38-324b5a779e8f');

  const [activeTab, setActiveTab] = useState<'sequence' | 'architecture' | 'all_steps'>('sequence');
  const [activeStep, setActiveStep] = useState<number>(6); // Default to Step 6 as in user's image
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [mode, setMode] = useState<'whatsapp' | 'generic'>('whatsapp');
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveChats, setLiveChats] = useState<any[] | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-play timer for sequence view
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

  // Exact 6 Steps from specification
  const steps = [
    {
      step: 1,
      title: 'Scan and Decode',
      lane: 'Client (Scanner)',
      activeLanes: ['client'],
      description: "The user's camera scans the QR code. The optical decoding engine extracts the target account identifier and session pairing token.",
      code: mode === 'whatsapp' ? `{
  "action": "DECODE_QR",
  "target_entity": "ACCOUNT_CHAT_HISTORY",
  "account_id": "${targetAccountId}",
  "pairing_token": "WA_PAIR_98765_SECURE_TOKEN",
  "raw_text": "https://whatsapp.enterprise.io/auth/pair?accountId=${targetAccountId}&scope=history:read",
  "timestamp": 1759320290000
}` : `{
  "action": "DECODE_QR",
  "asset_id": "98765",
  "raw_text": "https://assets.io/scan?asset_id=98765"
}`
    },
    {
      step: 2,
      title: 'Construct API Request',
      lane: 'Client → API Gateway',
      activeLanes: ['client', 'gateway'],
      description: "The client app constructs an HTTP GET request to fetch the history. It attaches the user's secure authentication token (like a JWT) in the headers to prove identity.",
      code: mode === 'whatsapp' ? `GET /api/v1/whatsapp/chats?accountId=${targetAccountId}&limit=50&offset=0 HTTP/1.1
Host: api.enterprise-whatsapp.io
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
X-Tenant-ID: default-tenant
User-Agent: WhatsAppEngine-Client/2.4.0 (Web/Mobile)` : `GET /history/98765 HTTP/1.1
Host: api.enterprise.io
Authorization: Bearer eyJhbGciOiJIUzI1Ni...`
    },
    {
      step: 3,
      title: 'Auth Validation & Routing',
      lane: 'API Gateway → Backend Controller',
      activeLanes: ['gateway', 'backend'],
      description: "The request hits the API Gateway. The server checks the Authorization header. If the token is valid and the user has permission to view this specific asset, the request is routed to the Data Controller.",
      code: mode === 'whatsapp' ? `{
  "authenticated_user": "usr_7721",
  "user_role": "SUPER_ADMIN",
  "tenant_id": "default-tenant",
  "target_account": "${targetAccountId}",
  "guard_pipeline": [
    "JwtAuthGuard: PASSED (Signature valid, not expired)",
    "AccountIsolationGuard: PASSED (User has access to account)",
    "ThrottlerGuard: PASSED (Remaining: 994/1000 req/min)"
  ],
  "upstream_route": "WhatsappWebController.getChats()"
}` : `{
  "authenticated_user": "usr_7721",
  "scope": ["history:read"],
  "forwarded_for": "192.168.1.45"
}`
    },
    {
      step: 4,
      title: 'Database Query',
      lane: 'Backend Controller → Database',
      activeLanes: ['backend', 'database'],
      description: "The backend server queries the database for all historical records matching asset_id. It retrieves timestamps, previous states, and user interaction logs.",
      code: mode === 'whatsapp' ? `SELECT 
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
WHERE chat.account_id = '${targetAccountId}'
ORDER BY chat.pinned DESC, chat.last_message_timestamp DESC
LIMIT 50 OFFSET 0;` : `SELECT id, event_type, location, timestamp
FROM asset_history
WHERE asset_id = '98765'
ORDER BY timestamp DESC;`
    },
    {
      step: 5,
      title: 'Recordset Return',
      lane: 'Database → Backend Controller',
      activeLanes: ['backend', 'database'],
      description: "The database storage engine returns raw rows from its buffer pool cache in ~4.8ms.",
      code: mode === 'whatsapp' ? `[
  {
    "id": "12036304@g.us",
    "account_id": "${targetAccountId}",
    "name": "Operations HQ",
    "subtitle": "Dhyey: Server deployment complete",
    "is_group": true,
    "unread_count": 2,
    "last_message_text": "Server deployment verified on port 3000.",
    "last_message_timestamp": 1759320290000,
    "pinned": true
  },
  {
    "id": "14155552671@s.whatsapp.net",
    "account_id": "${targetAccountId}",
    "name": "Sarah Connor",
    "subtitle": "Can you send the contract document?",
    "is_group": false,
    "unread_count": 0,
    "last_message_text": "Can you send the contract document?",
    "last_message_timestamp": 1759318120000,
    "pinned": false
  }
]` : `[
  { "id": "evt_101", "event": "INSPECTION_PASSED", "ts": 1711915000 },
  { "id": "evt_098", "event": "MAINTENANCE_LOGGED", "ts": 1709280000 }
]`
    },
    {
      step: 6,
      title: 'JSON Response & Data Rendering',
      lane: 'Backend → Client',
      activeLanes: ['backend', 'client'],
      description: "The server formats the historical data into a lightweight JSON payload and sends it back to the client app with an HTTP 200 OK status. The client app parses the JSON response and dynamically builds the user interface, displaying the timeline of history data to the user.",
      code: mode === 'whatsapp' ? `// 1. Client fetches all account chat history
const response = await fetch('/api/v1/whatsapp/chats?accountId=' + accountId, {
  headers: { Authorization: \`Bearer \${jwtToken}\` }
});
const chatHistory = await response.json();

// 2. Hydrate Global State Store
useChatStore.getState().setChats(chatHistory);

// 3. Resolve Real Contact Names & Format Timestamps
const resolvedChats = chatHistory.map(chat => ({
  ...chat,
  displayName: resolveChatDisplayName(chat.id, chat.name),
  formattedTime: formatDistanceToNow(chat.lastMessageTimestamp)
}));

// 4. Render Virtualized Timeline
renderChatTimeline(resolvedChats);` : `HTTP/1.1 200 OK
Content-Type: application/json

{
  "asset_id": "98765",
  "history_count": 2,
  "events": [
    { "type": "Inspection", "date": "2024-03-31", "status": "Passed" },
    { "type": "Maintenance", "date": "2024-03-01", "status": "Completed" }
  ]
}`
    },
  ];

  const currentStep = steps[activeStep - 1];

  const handleCopy = async (text: string, stepIndex?: number) => {
    await safeCopyToClipboard(text, { allowNewlines: true });
    if (stepIndex !== undefined) {
      setCopiedStep(stepIndex);
      setTimeout(() => setCopiedStep(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLiveQuery = async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const data = await whatsappWebApi.getChats(targetAccountId, undefined, 20);
      setLiveChats(Array.isArray(data) ? data : []);
      setActiveStep(6);
    } catch (err: any) {
      setLiveError(err?.message || 'Failed to fetch chats from backend');
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '24px 32px 56px 32px',
        background: '#090d14',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Top Navigation Bar */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: 0,
                  marginBottom: 8,
                }}
              >
                <ArrowLeft size={14} /> Back to Chats
              </button>
            )}
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 4px 0',
                letterSpacing: '-0.3px',
              }}
            >
              QR Scan Data Flow
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: '#94a3b8',
                margin: 0,
              }}
            >
              Interactive API request lifecycle from scan to record retrieval
            </p>
          </div>

          {/* Quick Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Mode switch */}
            <div
              style={{
                display: 'flex',
                background: '#131a26',
                borderRadius: 8,
                padding: 3,
                border: '1px solid #1e2633',
              }}
            >
              <button
                onClick={() => setMode('whatsapp')}
                style={{
                  background: mode === 'whatsapp' ? '#2563eb' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: mode === 'whatsapp' ? '#ffffff' : '#94a3b8',
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Live Chat History
              </button>
              <button
                onClick={() => setMode('generic')}
                style={{
                  background: mode === 'generic' ? '#2563eb' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: mode === 'generic' ? '#ffffff' : '#94a3b8',
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Asset Spec (98765)
              </button>
            </div>

            {/* Test live DB query */}
            <button
              onClick={handleLiveQuery}
              disabled={liveLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34d399',
                fontSize: 12,
                fontWeight: 600,
                cursor: liveLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={13} className={liveLoading ? 'animate-spin' : ''} />
              {liveLoading ? 'Querying...' : 'Test Live DB Query'}
            </button>
          </div>
        </div>

        {/* View Tabs: Sequence Flow | 3-Tier Architecture | All 6 Steps */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
            borderBottom: '1px solid #1e2633',
            paddingBottom: 10,
          }}
        >
          <button
            onClick={() => setActiveTab('sequence')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              background: activeTab === 'sequence' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              border: activeTab === 'sequence' ? '1px solid #3b82f6' : '1px solid transparent',
              color: activeTab === 'sequence' ? '#60a5fa' : '#94a3b8',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Play size={13} /> Sequence Diagram (Interactive)
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              background: activeTab === 'architecture' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              border: activeTab === 'architecture' ? '1px solid #3b82f6' : '1px solid transparent',
              color: activeTab === 'architecture' ? '#60a5fa' : '#94a3b8',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Layers size={13} /> 3-Tier Layer Breakdown
          </button>

          <button
            onClick={() => setActiveTab('all_steps')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              background: activeTab === 'all_steps' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              border: activeTab === 'all_steps' ? '1px solid #3b82f6' : '1px solid transparent',
              color: activeTab === 'all_steps' ? '#60a5fa' : '#94a3b8',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <BookOpen size={13} /> All 6 Steps Full View
          </button>
        </div>

        {/* Live Query Feedback Banner */}
        {liveChats !== null && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginBottom: 18,
              fontSize: 13,
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong>Live Database Query Complete:</strong> Retrieved <strong>{liveChats.length}</strong> active chat conversation(s) for account <code>{targetAccountId}</code>.
            </div>
            <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
              200 OK
            </span>
          </div>
        )}

        {/* ── TAB 1: SEQUENCE DIAGRAM (EXACT REPLICA OF USER SCREENSHOTS) ── */}
        {activeTab === 'sequence' && (
          <>
            {/* CARD 1: SEQUENCE DIAGRAM CANVAS */}
            <div
              style={{
                background: '#0d1117',
                borderRadius: 16,
                border: '1px solid #1e2633',
                padding: '24px 28px 24px 28px',
                marginBottom: 20,
                position: 'relative',
              }}
            >
              {/* Top 4 Lifeline Pill Headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 20,
                  marginBottom: 20,
                }}
              >
                {[
                  { id: 'client', label: 'Client (Scanner)' },
                  { id: 'gateway', label: 'API Gateway' },
                  { id: 'backend', label: 'Backend Controller' },
                  { id: 'database', label: 'Database' },
                ].map((lane) => {
                  const isActive =
                    (activeStep === 1 && lane.id === 'client') ||
                    (activeStep === 2 && (lane.id === 'client' || lane.id === 'gateway')) ||
                    (activeStep === 3 && (lane.id === 'gateway' || lane.id === 'backend')) ||
                    (activeStep === 4 && (lane.id === 'backend' || lane.id === 'database')) ||
                    (activeStep === 5 && (lane.id === 'database' || lane.id === 'backend')) ||
                    (activeStep === 6 && (lane.id === 'backend' || lane.id === 'client'));

                  const isPrimarySelected =
                    (activeStep === 1 && lane.id === 'client') ||
                    (activeStep === 2 && lane.id === 'client') ||
                    (activeStep === 3 && lane.id === 'gateway') ||
                    (activeStep === 4 && lane.id === 'backend') ||
                    (activeStep === 5 && lane.id === 'database') ||
                    (activeStep === 6 && lane.id === 'backend');

                  return (
                    <div
                      key={lane.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 14px',
                        borderRadius: 9999,
                        background: isPrimarySelected
                          ? 'rgba(37, 99, 235, 0.18)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isPrimarySelected
                          ? '1.5px solid #3b82f6'
                          : isActive
                            ? '1px solid rgba(59, 130, 246, 0.45)'
                            : '1px solid #222a38',
                        color: isPrimarySelected ? '#ffffff' : isActive ? '#93c5fd' : '#cbd5e1',
                        fontSize: 13,
                        fontWeight: isPrimarySelected ? 700 : 500,
                        boxShadow: isPrimarySelected ? '0 0 16px rgba(59, 130, 246, 0.4)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {lane.label}
                    </div>
                  );
                })}
              </div>

              {/* Sequence Diagram Body */}
              <div style={{ position: 'relative', height: 280, width: '100%' }}>
                {/* 4 Vertical Dashed Lifelines */}
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
                          width: 1,
                          height: '100%',
                          borderLeft: '1px dashed rgba(255, 255, 255, 0.18)',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Vertical Blue Activation Bar on Backend Controller (spans down to Step 6) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 105,
                    left: '62.5%',
                    transform: 'translateX(-50%)',
                    width: 6,
                    height: 120,
                    background: '#3b82f6',
                    borderRadius: 4,
                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.7)',
                    zIndex: 2,
                    opacity: activeStep >= 3 ? 1 : 0.2,
                    transition: 'opacity 0.2s',
                  }}
                />

                {/* STEP 1: Loop Decode QR Code */}
                <div
                  onClick={() => setActiveStep(1)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: '12.5%',
                    cursor: 'pointer',
                    zIndex: 3,
                    opacity: activeStep === 1 ? 1 : 0.35,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: activeStep === 1 ? '#3b82f6' : '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
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
                        borderRadius: 9999,
                        background: activeStep === 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: activeStep === 1 ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: activeStep === 1 ? '#93c5fd' : '#94a3b8',
                      }}
                    >
                      Decode QR Code
                    </div>
                  </div>
                </div>

                {/* STEP 2: GET /history/98765 -> */}
                <div
                  onClick={() => setActiveStep(2)}
                  style={{
                    position: 'absolute',
                    top: 55,
                    left: '12.5%',
                    width: '25%',
                    cursor: 'pointer',
                    zIndex: 3,
                    opacity: activeStep === 2 ? 1 : 0.35,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: activeStep === 2 ? '#3b82f6' : '#1e293b',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      2
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: activeStep === 2 ? '#93c5fd' : '#94a3b8',
                      }}
                    >
                      GET /history/98765→
                    </span>
                  </div>
                  <div
                    style={{
                      height: 1.5,
                      background: activeStep === 2 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 2 ? '0 0 8px #3b82f6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: -3.5,
                        width: 0,
                        height: 0,
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderLeft: `6px solid ${activeStep === 2 ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>

                {/* STEP 3: Validate & Route -> */}
                <div
                  onClick={() => setActiveStep(3)}
                  style={{
                    position: 'absolute',
                    top: 100,
                    left: '37.5%',
                    width: '25%',
                    cursor: 'pointer',
                    zIndex: 3,
                    opacity: activeStep === 3 ? 1 : 0.35,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: activeStep === 3 ? '#3b82f6' : '#1e293b',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      3
                    </div>
                    <div
                      style={{
                        padding: '2px 8px',
                        borderRadius: 9999,
                        background: activeStep === 3 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: activeStep === 3 ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: activeStep === 3 ? '#93c5fd' : '#94a3b8',
                      }}
                    >
                      Validate & Route →
                    </div>
                  </div>
                  <div
                    style={{
                      height: 1.5,
                      background: activeStep === 3 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 3 ? '0 0 8px #3b82f6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: -3.5,
                        width: 0,
                        height: 0,
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderLeft: `6px solid ${activeStep === 3 ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>

                {/* STEP 4: SELECT * FROM history -> */}
                <div
                  onClick={() => setActiveStep(4)}
                  style={{
                    position: 'absolute',
                    top: 145,
                    left: '62.5%',
                    width: '25%',
                    cursor: 'pointer',
                    zIndex: 3,
                    opacity: activeStep === 4 ? 1 : 0.35,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: activeStep === 4 ? '#3b82f6' : '#1e293b',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      4
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontFamily: 'monospace',
                        color: activeStep === 4 ? '#93c5fd' : '#94a3b8',
                      }}
                    >
                      SELECT * FROM history→
                    </span>
                  </div>
                  <div
                    style={{
                      height: 1.5,
                      background: activeStep === 4 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 4 ? '0 0 8px #3b82f6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: -3.5,
                        width: 0,
                        height: 0,
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderLeft: `6px solid ${activeStep === 4 ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>

                {/* STEP 5: < Raw History Rows */}
                <div
                  onClick={() => setActiveStep(5)}
                  style={{
                    position: 'absolute',
                    top: 185,
                    left: '62.5%',
                    width: '25%',
                    cursor: 'pointer',
                    zIndex: 3,
                    opacity: activeStep === 5 ? 1 : 0.35,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontFamily: 'monospace',
                        color: activeStep === 5 ? '#93c5fd' : '#94a3b8',
                      }}
                    >
                      &lt; Raw History Rows
                    </span>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: activeStep === 5 ? '#3b82f6' : '#1e293b',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      5
                    </div>
                  </div>
                  <div
                    style={{
                      height: 1.5,
                      borderTop: '1.5px dashed',
                      borderColor: activeStep === 5 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 5 ? '0 0 8px #3b82f6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: -3.5,
                        width: 0,
                        height: 0,
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderRight: `6px solid ${activeStep === 5 ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>

                {/* STEP 6: < 200 OK (JSON) with Circle 6 on Activation Bar */}
                <div
                  onClick={() => setActiveStep(6)}
                  style={{
                    position: 'absolute',
                    top: 220,
                    left: '12.5%',
                    width: '50%',
                    cursor: 'pointer',
                    zIndex: 3,
                    opacity: activeStep === 6 ? 1 : 0.35,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: -9,
                      top: -2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 10px #3b82f6',
                      zIndex: 4,
                    }}
                  >
                    6
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 3,
                    }}
                  >
                    <div
                      style={{
                        padding: '3px 14px',
                        borderRadius: 9999,
                        background: activeStep === 6 ? 'rgba(37, 99, 235, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: activeStep === 6 ? '1.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: activeStep === 6 ? '#ffffff' : '#94a3b8',
                        boxShadow: activeStep === 6 ? '0 0 12px rgba(59, 130, 246, 0.5)' : 'none',
                        letterSpacing: '0.2px',
                      }}
                    >
                      200 OK (JSON)
                    </div>
                  </div>

                  <div
                    style={{
                      height: 1.5,
                      borderTop: '1.5px dashed',
                      borderColor: activeStep === 6 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      boxShadow: activeStep === 6 ? '0 0 8px #3b82f6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: -3.5,
                        width: 0,
                        height: 0,
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderRight: `6px solid ${activeStep === 6 ? '#3b82f6' : 'rgba(255, 255, 255, 0.4)'}`,
                      }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* CARD 2: STEP DETAIL INSPECTOR */}
            <div
              style={{
                background: '#0d1117',
                borderRadius: 16,
                border: '1px solid #1e2633',
                padding: '24px 28px',
              }}
            >
              {/* Header Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 9999,
                      background: '#1d4ed8',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Step {currentStep.step} of 6
                  </span>
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#ffffff',
                      margin: 0,
                    }}
                  >
                    {currentStep.title}
                  </h2>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontStyle: 'italic',
                    color: '#94a3b8',
                    fontWeight: 500,
                  }}
                >
                  {currentStep.lane}
                </div>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 13.5,
                  color: '#cbd5e1',
                  margin: '0 0 16px 0',
                  lineHeight: 1.5,
                }}
              >
                {currentStep.description}
              </p>

              {/* Code Container */}
              <div
                style={{
                  background: '#070a0e',
                  borderRadius: 10,
                  border: '1px solid #1e2633',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <button
                  onClick={() => handleCopy(currentStep.code)}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    color: copied ? '#34d399' : '#94a3b8',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    zIndex: 2,
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>

                <pre
                  style={{
                    margin: 0,
                    padding: '16px 18px',
                    fontSize: 13,
                    fontFamily: 'Consolas, "Fira Code", "Courier New", monospace',
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                  }}
                >
                  <code>{currentStep.code}</code>
                </pre>
              </div>

              {/* Step Selector & Player Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {/* Step Pills 1-6 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setIsPlaying(false);
                        setActiveStep(num);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: activeStep === num ? '#2563eb' : 'rgba(255, 255, 255, 0.04)',
                        border: activeStep === num ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: activeStep === num ? '#ffffff' : '#94a3b8',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Play/Pause & Prev/Next */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveStep((prev) => (prev > 1 ? prev - 1 : 6));
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: isPlaying ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      border: isPlaying ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(59, 130, 246, 0.35)',
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
                      setIsPlaying(false);
                      setActiveStep((prev) => (prev < 6 ? prev + 1 : 1));
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#2563eb',
                      border: '1px solid #3b82f6',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TAB 2: 3-TIER SYSTEM ARCHITECTURE BREAKDOWN ── */}
        {activeTab === 'architecture' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Interactive Architecture Tier Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {/* Layer 1: Client Application */}
              <div
                style={{
                  background: '#0d1117',
                  border: '1px solid #1e2633',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smartphone size={20} color="#60a5fa" />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Tier 1</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#ffffff' }}>Client Application</h3>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Role:</strong> Uses device camera hardware to decode the optical QR matrix into an account token and pairing URI.
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Security:</strong> Attaches user's secure <code>JWT Bearer Token</code> in HTTP headers to prove identity.
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Rendering:</strong> Receives normalized JSON, updates <code>useChatStore</code>, resolves display names, and renders virtualized timeline.
                </div>
              </div>

              {/* Layer 2: Backend API & Gateway */}
              <div
                style={{
                  background: '#0d1117',
                  border: '1px solid #1e2633',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Server size={20} color="#34d399" />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>Tier 2</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#ffffff' }}>Backend API & Gateway</h3>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Role:</strong> Validates user permissions, enforces tenant isolation, and coordinates database requests.
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Security Gateways:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    <li><code>JwtAuthGuard</code>: Signature verification</li>
                    <li><code>AccountIsolationGuard</code>: Tenant/Account RBAC</li>
                  </ul>
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Controller:</strong> <code>MessageWebController</code> checks L1 memory and L2 Redis cache before database query.
                </div>
              </div>

              {/* Layer 3: Database & Persistent Storage */}
              <div
                style={{
                  background: '#0d1117',
                  border: '1px solid #1e2633',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={20} color="#c084fc" />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>Tier 3</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#ffffff' }}>Database & Storage</h3>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Role:</strong> Holds the persistent records (<code>chats</code>) and historical messages (<code>messages</code>).
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Optimizations:</strong> Compound B-Tree indexing (<code>idx_messages_fifo_ttl</code>), WAL journal mode, and lean projections.
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f8fafc' }}>Buffer Pool:</strong> Returns active chat threads in sub-5ms latency from memory pages.
                </div>
              </div>
            </div>

            {/* Architecture Flow Diagram Box */}
            <div
              style={{
                background: '#0d1117',
                borderRadius: 14,
                border: '1px solid #1e2633',
                padding: 24,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px 0', color: '#ffffff' }}>
                Pipeline Data Flow Overview
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                <div style={{ background: '#070a0e', padding: 14, borderRadius: 10, border: '1px solid #1e2633' }}>
                  <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700 }}>1. INGESTION</div>
                  <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 600, marginTop: 4 }}>Optical Decode</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Extracts <code>accountId</code> and pairing token in WASM space.</div>
                </div>

                <div style={{ background: '#070a0e', padding: 14, borderRadius: 10, border: '1px solid #1e2633' }}>
                  <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>2. TRANSPORT</div>
                  <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 600, marginTop: 4 }}>HTTPS GET Request</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Bearer token injected into HTTP headers to API Gateway.</div>
                </div>

                <div style={{ background: '#070a0e', padding: 14, borderRadius: 10, border: '1px solid #1e2633' }}>
                  <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>3. GUARD CHECK</div>
                  <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 600, marginTop: 4 }}>JWT & Account Isolation</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Asserts caller has permission to view this specific account's history.</div>
                </div>

                <div style={{ background: '#070a0e', padding: 14, borderRadius: 10, border: '1px solid #1e2633' }}>
                  <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 700 }}>4. RETRIEVAL</div>
                  <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 600, marginTop: 4 }}>Indexed Query Scan</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Queries <code>chats</code> ordered by <code>last_message_timestamp DESC</code>.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: ALL 6 STEPS COMPREHENSIVE WALKTHROUGH ── */}
        {activeTab === 'all_steps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {steps.map((st) => (
              <div
                key={st.step}
                style={{
                  background: '#0d1117',
                  border: '1px solid #1e2633',
                  borderRadius: 14,
                  padding: '20px 24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 9999,
                        background: '#1d4ed8',
                        color: '#ffffff',
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      Step {st.step} of 6
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                      {st.title}
                    </h3>
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    {st.lane}
                  </span>
                </div>

                <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                  {st.description}
                </p>

                <div
                  style={{
                    background: '#070a0e',
                    borderRadius: 8,
                    border: '1px solid #1e2633',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => handleCopy(st.code, st.step)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      color: copiedStep === st.step ? '#34d399' : '#94a3b8',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {copiedStep === st.step ? <Check size={11} /> : <Copy size={11} />}
                    {copiedStep === st.step ? 'Copied' : 'Copy'}
                  </button>

                  <pre
                    style={{
                      margin: 0,
                      padding: '14px 16px',
                      fontSize: 12.5,
                      fontFamily: 'Consolas, monospace',
                      color: '#e2e8f0',
                      lineHeight: 1.5,
                      overflowX: 'auto',
                    }}
                  >
                    <code>{st.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
