import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SaaSNavbar } from '../../components/common/SaaSNavbar';
import { SaaSFooter } from '../../components/common/SaaSFooter';
import {
  Zap, Shield, Smartphone, ArrowRight, Play, CheckCircle2,
  Activity, Server, Database, Globe, Users, MessageSquare,
  Sparkles, Bot, Layers, BarChart3, Lock, Code, ChevronRight
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';
import { safeCopyToClipboard } from '../../utils/clipboard';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'automation' | 'campaigns' | 'multi-tenant' | 'compliance'>('automation');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    setCopiedCode(true);
    soundEffects.playPopSound();
    await safeCopyToClipboard(
`import { MessagingEngine } from '@nexus/messaging-sdk';

const client = new MessagingEngine({
  tenantId: 'enterprise-production',
  apiKey: process.env.NEXUS_API_KEY,
  autoReconnect: true,
  rateLimitPerSec: 85,
});

await client.connect();
await client.messages.sendBulk({
  template: 'order_status_v2',
  recipients: ['+14155552671', '+447911123456'],
  variables: { discount: '30%' }
});`,
      { allowNewlines: true },
    );
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div style={{ background: '#060810', minHeight: '100vh', color: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <SaaSNavbar currentPath="landing" onNavigate={onNavigate} />

      {/* ── HERO SECTION ── */}
      <section
        style={{
          position: 'relative',
          minHeight: '84vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: 80,
          overflow: 'hidden',
          background: '#070b14',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', width: '100%', position: 'relative', zIndex: 10 }}>
          <div style={{ maxWidth: 680 }}>
            {/* Tech badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 6,
                background: '#0f172a',
                border: '1px solid #1e293b',
                marginBottom: 24,
              }}
            >
              <Shield size={14} color="#10b981" />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#10b981', letterSpacing: '0.5px' }}>
                Multi-Tenant Messaging Engine
              </span>
              <span style={{ color: '#475569' }}>•</span>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Self-Hosted & Cloud</span>
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: 'clamp(36px, 5vw, 60px)',
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: '-1.5px',
                margin: '0 0 20px',
                color: '#FFFFFF',
              }}
            >
              Enterprise Messaging Automation Architecture
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.65,
                color: '#94A3B8',
                margin: '0 0 34px',
                maxWidth: 620,
              }}
            >
              Connect multiple accounts in isolated sandboxes. Dispatch transactional notifications with BullMQ rate limiting, orchestrate visual decision trees, and monitor real-time WebSocket socket health.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 40 }}>
              <button
                onClick={() => onNavigate('app')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '13px 24px',
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: '#070b14',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
              >
                <span>Launch Cloud Console</span>
                <ArrowRight size={17} strokeWidth={2.5} />
              </button>

              <button
                onClick={() => onNavigate('alert')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '13px 22px',
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: '#FF6B35',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#FF6B35'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
              >
                <Zap size={16} color="#FF6B35" />
                <span>Alert Studio</span>
              </button>

              <button
                onClick={() => onNavigate('contact')}
                style={{
                  padding: '13px 20px',
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: '#CBD5E1',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#475569'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
              >
                Book 1-on-1 Demo
              </button>
            </div>

            {/* Quick Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', color: '#64748B', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>No Credit Card Required</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>QR Code Instant Sync</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>99.99% Guaranteed SLA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS STRIP: TECHNICAL ARCHITECTURE SPECS ── */}
      <section
        style={{
          borderTop: '1px solid #1e293b',
          borderBottom: '1px solid #1e293b',
          background: '#0a0f18',
          padding: '32px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 24,
          }}
        >
          {[
            { metric: 'Multi-Device', label: 'Baileys WebSocket Engine', change: 'E2E Signal' },
            { metric: 'Multi-Tenant', label: 'Isolated Process Sandboxes', change: 'Zero Leak' },
            { metric: 'BullMQ', label: 'Redis Rate-Limited Queues', change: 'Pacing V2' },
            { metric: 'Local-First', label: 'IndexedDB & SQLite Caching', change: '0ms UI Latency' },
          ].map((item, idx) => (
            <div key={idx} style={{ padding: '0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                  {item.metric}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: 4 }}>
                  {item.change}
                </span>
              </div>
              <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTERACTIVE DEVELOPER SDK & TERMINAL PREVIEW ── */}
      <section style={{ padding: '90px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#00e5ff', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            <Code size={16} />
            <span>Developer-First Architecture</span>
          </div>
          <h2 style={{ fontSize: 38, fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            Built for High-Throughput Messaging Workflows
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 16, maxWidth: 640, margin: '0 auto' }}>
            Integrate with any tech stack in minutes using typed TypeScript SDKs, REST APIs, or real-time WebSockets.
          </p>
        </div>

        {/* Code Terminal Card */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Terminal Window Header */}
          <div
            style={{
              height: 48,
              background: 'rgba(255, 255, 255, 0.04)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F56' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27C93F' }} />
              <span style={{ fontSize: 12.5, color: '#64748B', marginLeft: 12, fontFamily: 'monospace' }}>
                nexus-messaging-sdk.ts
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: copiedCode ? '#10b981' : '#94A3B8',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {copiedCode ? <CheckCircle2 size={13} color="#10b981" /> : <Layers size={13} />}
              <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Terminal Code Body */}
          <div style={{ padding: 28, fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: 14, lineHeight: 1.7, overflowX: 'auto' }}>
            <span style={{ color: '#A855F7' }}>import</span> {'{ MessagingEngine }'} <span style={{ color: '#A855F7' }}>from</span> <span style={{ color: '#10b981' }}>'@nexus/messaging-sdk'</span>;<br /><br />
            <span style={{ color: '#64748B' }}>// 1. Initialize multi-tenant quantum client</span><br />
            <span style={{ color: '#3B82F6' }}>const</span> client = <span style={{ color: '#3B82F6' }}>new</span> <span style={{ color: '#FCD34D' }}>MessagingEngine</span>({'{'}<br />
            &nbsp;&nbsp;tenantId: <span style={{ color: '#10b981' }}>'enterprise-production'</span>,<br />
            &nbsp;&nbsp;apiKey: process.env.<span style={{ color: '#00E5FF' }}>NEXUS_API_KEY</span>,<br />
            &nbsp;&nbsp;autoReconnect: <span style={{ color: '#FF6B35' }}>true</span>,<br />
            &nbsp;&nbsp;rateLimitPerSec: <span style={{ color: '#FF6B35' }}>85</span>,<br />
            {'}'});<br /><br />
            <span style={{ color: '#64748B' }}>// 2. Connect with automated session recovery & 3D alert telemetry</span><br />
            <span style={{ color: '#A855F7' }}>await</span> client.<span style={{ color: '#00E5FF' }}>connect</span>();<br /><br />
            <span style={{ color: '#64748B' }}>// 3. Dispatch bulk campaign with dynamic variables</span><br />
            <span style={{ color: '#A855F7' }}>await</span> client.messages.<span style={{ color: '#00E5FF' }}>sendBulk</span>({'{'}<br />
            &nbsp;&nbsp;template: <span style={{ color: '#10b981' }}>'order_status_v2'</span>,<br />
            &nbsp;&nbsp;recipients: [<span style={{ color: '#10b981' }}>'+14155552671'</span>, <span style={{ color: '#10b981' }}>'+447911123456'</span>],<br />
            &nbsp;&nbsp;variables: {'{'} discount: <span style={{ color: '#10b981' }}>'30%'</span> {'}'}<br />
            {'}'});
          </div>
        </div>
      </section>

      {/* ── CARD GRID: FEATURE HIGHLIGHTS ── */}
      <section style={{ padding: '40px 32px 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 14px' }}>
            Architected for Modern Enterprise Teams
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 16 }}>
            Every component designed from scratch with rich micro-animations and zero latency.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {[
            {
              icon: <Bot size={22} color="#10b981" />,
              title: 'Visual Chatbot Flow Builder',
              desc: 'Drag-and-drop conversational decision trees with keywords, webhook triggers, and automated fallback logic.',
              tag: 'Flow Automation',
            },
            {
              icon: <Zap size={22} color="#FF6B35" />,
              title: 'Disconnection Alert Studio',
              desc: 'Self-healing socket telemetry with automated reconnection loops, ping heartbeats, and audio chime alerts.',
              tag: 'Socket Telemetry',
            },
            {
              icon: <Smartphone size={22} color="#38bdf8" />,
              title: 'Multi-Tenant Fleet Isolation',
              desc: 'Host multiple separate messaging accounts in dedicated sandboxes with zero session cross-contamination.',
              tag: 'Architecture',
            },
            {
              icon: <BarChart3 size={22} color="#a855f7" />,
              title: 'Real-Time Delivery Analytics',
              desc: 'Live message queues, read receipts, delivery breakdown charts, and carrier latency graphs.',
              tag: 'Telemetry',
            },
            {
              icon: <Shield size={22} color="#10b981" />,
              title: 'Anti-Ban Warmup Engine',
              desc: 'Algorithmic message pacing, human jitter emulation, and proxy rotation keep your numbers healthy.',
              tag: 'Safe Dispatch',
            },
            {
              icon: <Database size={22} color="#f59e0b" />,
              title: 'Zero-Data Loss Backups',
              desc: 'Scheduled snapshots of chats, media attachments, contacts, and bot workflows with 1-click restore.',
              tag: 'Recovery',
            },
          ].map((card, idx) => (
            <div
              key={idx}
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#334155';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e293b';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 6,
                      background: '#1e293b',
                      border: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {card.icon}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#1e293b', border: '1px solid #334155', padding: '3px 8px', borderRadius: 4 }}>
                    {card.tag}
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px', color: '#ffffff' }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#94a3b8', margin: 0 }}>
                  {card.desc}
                </p>
              </div>

              <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 6, color: '#00f0ff', fontSize: 13, fontWeight: 700 }}>
                <span>Explore component</span>
                <ChevronRight size={14} color="#00f0ff" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: '0 32px 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.3)',
          }}
        >
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 900, margin: '0 0 16px', color: '#ffffff' }}>
            Deploy Your Dedicated Messaging Fleet
          </h2>
          <p style={{ fontSize: 16, color: '#94A3B8', maxWidth: 600, margin: '0 auto 34px' }}>
            Run your multi-session automation gateway with self-hosted Docker, Kubernetes Helm charts, or managed enterprise cloud infrastructure.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('app')}
              style={{
                padding: '13px 26px',
                fontSize: 14.5,
                fontWeight: 700,
                color: '#070b14',
                background: '#10b981',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#059669'}
              onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
            >
              Sign In to Management Console →
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              style={{
                padding: '13px 24px',
                fontSize: 14.5,
                fontWeight: 600,
                color: '#ffffff',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#64748b'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
            >
              View Pricing Tiers
            </button>
          </div>
        </div>
      </section>

      <SaaSFooter onNavigate={onNavigate} />
    </div>
  );
};

export default LandingPage;
