import React from 'react';
import { Zap, Shield, CheckCircle, Lock, Server, Heart } from 'lucide-react';

export const SaaSFooter: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return (
    <footer
      style={{
        background: '#04070e',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '60px 40px 30px',
        color: '#94A3B8',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 40,
          marginBottom: 50,
        }}
      >
        {/* Col 1: Brand Info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#0f172a',
                border: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={18} color="#ffffff" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
              NEXUS CHAT PRO
            </span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: '#64748B', marginBottom: 20 }}>
            The enterprise-grade messaging automation cloud. High-throughput message dispatch, multi-tenant container isolation, AI auto-replies, and bank-grade end-to-end security.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#10b981' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span>Operational SLA: 99.99%</span>
          </div>
        </div>

        {/* Col 2: Navigation */}
        <div>
          <h4 style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 18 }}>
            Platform Pages
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li>
              <button
                onClick={() => onNavigate('landing')}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >
                3D Landing Experience
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('features')}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >
                Features & Interactive Data Widgets
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('pricing')}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >
                Pricing Plans & Calculator
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('contact')}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >
                Schedule Enterprise Demo
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('alert')}
                style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#FFA07A'}
                onMouseLeave={e => e.currentTarget.style.color = '#FF6B35'}
              >
                Disconnection Alert Studio
              </button>
            </li>
          </ul>
        </div>

        {/* Col 3: Enterprise Features */}
        <div>
          <h4 style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 18 }}>
            Core Capabilities
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#64748B' }}>
            <li>✦ Multi-Tenant Isolated Sessions</li>
            <li>✦ Baileys WebSocket Socket Engine</li>
            <li>✦ Visual Chatbot Flow Automation</li>
            <li>✦ Live Anti-Ban Warmup Algorithms</li>
            <li>✦ Dynamic CSV & Template Campaigns</li>
            <li>✦ Instant 1-Minute Disconnection Alerts</li>
          </ul>
        </div>

        {/* Col 4: Trust & Compliance */}
        <div>
          <h4 style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 18 }}>
            Trust & Compliance
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94A3B8' }}>
              <Shield size={16} color="#10b981" />
              <span>SOC2 Type II Certified Cloud</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94A3B8' }}>
              <Lock size={16} color="#00e5ff" />
              <span>Signal Protocol E2E Encryption</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94A3B8' }}>
              <Server size={16} color="#a855f7" />
              <span>Automated Daily Zero-Data Backups</span>
            </div>
            <button
              onClick={() => onNavigate('app')}
              style={{
                marginTop: 10,
                padding: '10px 16px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In to Management Portal →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          paddingTop: 24,
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#475569',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          © 2026 Nexus Chat Cloud Inc. All rights reserved. Enterprise Creative Coding Architecture.
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <button
            onClick={() => onNavigate('privacy')}
            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 12, cursor: 'pointer', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#cbd5e1'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => onNavigate('terms')}
            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 12, cursor: 'pointer', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#cbd5e1'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
          >
            Terms of Service
          </button>
          <span>Security Architecture</span>
          <span>Status Page</span>
        </div>
      </div>
    </footer>
  );
};
