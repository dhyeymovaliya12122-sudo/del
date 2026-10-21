import React, { useState, useMemo } from 'react';
import { SaaSNavbar } from '../../components/common/SaaSNavbar';
import { SaaSFooter } from '../../components/common/SaaSFooter';
import {
  Activity, Sliders, Server, Zap, Shield, Smartphone, Bot,
  BarChart3, RefreshCw, CheckCircle2, Play, Pause, Layers,
  Terminal, ArrowRight, Sparkles, Filter, Database, Lock
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

interface FeaturesPageProps {
  onNavigate: (path: string) => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onNavigate }) => {
  // Widget 1: Throughput Simulation state
  const [targetThroughput, setTargetThroughput] = useState(2500); // msg/sec
  const [isPlayingThroughput, setIsPlayingThroughput] = useState(true);

  // Widget 2: Fleet Status state
  const [instances, setInstances] = useState([
    { id: 'inst-01', name: 'US-East Production Gateway', phone: '+1 (415) 555-0192', status: 'online', ping: 38, load: 74 },
    { id: 'inst-02', name: 'EU-Central Support Node', phone: '+49 30 1234567', status: 'online', ping: 52, load: 61 },
    { id: 'inst-03', name: 'APAC Transactional Alerts', phone: '+65 6789 0123', status: 'online', ping: 78, load: 88 },
    { id: 'inst-04', name: 'VIP Concierge Fleet', phone: '+44 20 7946 0912', status: 'online', ping: 44, load: 39 },
  ]);

  // Widget 3: Filter Category state
  const [activeCategory, setActiveCategory] = useState<'all' | 'automation' | 'infrastructure' | 'security' | 'analytics'>('all');

  const handleToggleThroughput = () => {
    setIsPlayingThroughput(!isPlayingThroughput);
    soundEffects.playPopSound();
  };

  const handleRestartInstance = (id: string) => {
    soundEffects.playPopSound();
    setInstances(prev => prev.map(inst => {
      if (inst.id === id) {
        return { ...inst, status: 'reconnecting', load: 15 };
      }
      return inst;
    }));

    setTimeout(() => {
      setInstances(prev => prev.map(inst => {
        if (inst.id === id) {
          return { ...inst, status: 'online', load: 45, ping: Math.floor(Math.random() * 20 + 35) };
        }
        return inst;
      }));
      soundEffects.playReconnectedChime();
    }, 1800);
  };

  // Feature cards data
  const featureCards = [
    {
      id: 'flow-builder',
      category: 'automation',
      title: 'Visual Chatbot Flow Builder',
      desc: 'Create branching conversational workflows with keyword routing, button menus, media attachments, and custom webhooks.',
      icon: <Bot size={22} color="#10b981" />,
      stats: '15+ Trigger Types',
    },
    {
      id: '3d-alert',
      category: 'infrastructure',
      title: '3D Disconnection Alert Center',
      desc: 'Self-monitoring Baileys WebSocket engine detects broken sessions in real-time, launching a 3D cosmic WebGL alert.',
      icon: <Zap size={22} color="#FF6B35" />,
      stats: '< 1s Detection',
    },
    {
      id: 'multi-fleet',
      category: 'infrastructure',
      title: 'Multi-Tenant Fleet Isolation',
      desc: 'Run 100+ isolated messaging accounts in individual sandbox workers. Complete memory and session safety.',
      icon: <Server size={22} color="#00e5ff" />,
      stats: 'Zero Cross-Talk',
    },
    {
      id: 'anti-ban',
      category: 'security',
      title: 'Smart Anti-Ban AI Warmup',
      desc: 'Automatic human-like typing delays, random interval jitter, and dynamic throughput ramping to protect phone reputational score.',
      icon: <Shield size={22} color="#10b981" />,
      stats: '99.8% Healthy Score',
    },
    {
      id: 'delivery-analytics',
      category: 'analytics',
      title: 'Granular Delivery Telemetry',
      desc: 'Track SENT, DELIVERED, and READ statuses in real-time. Export rich CSV reports with message engagement ratios.',
      icon: <BarChart3 size={22} color="#a855f7" />,
      stats: 'Live Stream Telemetry',
    },
    {
      id: 'auto-backups',
      category: 'security',
      title: 'Automated Encryption Backups',
      desc: 'Encrypted cloud backups of sessions, flow trees, template databases, and user directory with 1-click snapshot restore.',
      icon: <Database size={22} color="#f59e0b" />,
      stats: 'AES-256 GCM',
    },
  ];

  const filteredCards = useMemo(() => {
    if (activeCategory === 'all') return featureCards;
    return featureCards.filter(c => c.category === activeCategory);
  }, [activeCategory]);

  return (
    <div style={{ background: '#070b14', minHeight: '100vh', color: '#F1F5F9', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <SaaSNavbar currentPath="features" onNavigate={onNavigate} />

      {/* Header */}
      <section style={{ paddingTop: 130, paddingBottom: 60, textAlign: 'center', maxWidth: 900, margin: '0 auto', paddingLeft: 24, paddingRight: 24 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 6,
            background: 'rgba(0, 229, 255, 0.1)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            marginBottom: 20,
          }}
        >
          <Sparkles size={14} color="#00e5ff" />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#00e5ff', letterSpacing: '0.5px' }}>
            Production-Grade Capabilities
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 18px', lineHeight: 1.15 }}>
          Interactive Data Widgets &{' '}
          <span style={{ color: '#38bdf8' }}>
            High-Scale Architecture
          </span>
        </h1>
        <p style={{ fontSize: 17, color: '#94A3B8', lineHeight: 1.6, margin: '0 auto' }}>
          Explore live simulated performance metrics, fleet orchestration maps, and modular enterprise tools built specifically for messaging automation.
        </p>
      </section>

      {/* ── INTERACTIVE DATA WIDGET 1: THROUGHPUT SIMULATOR ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 32px' }}>
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: 32,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Activity size={22} color="#00e5ff" />
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  Live Message Dispatch Throughput Engine
                </h3>
              </div>
              <p style={{ fontSize: 13.5, color: '#94A3B8', margin: 0 }}>
                Simulate gateway rate-limiting, delivery queuing, and latency under high concurrency.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleToggleThroughput}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: isPlayingThroughput ? 'rgba(255, 107, 53, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: isPlayingThroughput ? '1px solid rgba(255, 107, 53, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                  color: isPlayingThroughput ? '#FF6B35' : '#10b981',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isPlayingThroughput ? <Pause size={15} /> : <Play size={15} />}
                <span>{isPlayingThroughput ? 'Pause Simulation' : 'Resume Flow'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Slider */}
          <div style={{ marginBottom: 30, background: 'rgba(255, 255, 255, 0.03)', padding: '20px 24px', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13.5 }}>
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>Concurrency Demand Scale:</span>
              <span style={{ color: '#00e5ff', fontWeight: 800, fontFamily: 'monospace' }}>
                {targetThroughput.toLocaleString()} Messages / Minute
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="15000"
              step="100"
              value={targetThroughput}
              onChange={e => setTargetThroughput(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#00e5ff',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#64748B' }}>
              <span>200 msg/min (Basic)</span>
              <span>5,000 msg/min (Standard Enterprise)</span>
              <span>15,000 msg/min (Quantum Hyper-Burst)</span>
            </div>
          </div>

          {/* Live Dynamic Metric Bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 18, borderRadius: 14 }}>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Delivered Real-Time</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                {Math.round(targetThroughput * 0.982).toLocaleString()} msg
              </div>
              <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ width: '98.2%', height: '100%', background: '#10b981' }} />
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 18, borderRadius: 14 }}>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Dispatched Latency</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#00e5ff', fontFamily: 'monospace' }}>
                {Math.round(42 + (targetThroughput / 500))} ms
              </div>
              <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ width: '65%', height: '100%', background: '#00e5ff' }} />
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 18, borderRadius: 14 }}>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Worker Thread Memory</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#a855f7', fontFamily: 'monospace' }}>
                {Math.round(180 + (targetThroughput / 120))} MB
              </div>
              <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ width: '40%', height: '100%', background: '#a855f7' }} />
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 18, borderRadius: 14 }}>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Anti-Ban Pacing Safety</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                100% Safe
              </div>
              <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#10b981' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE DATA WIDGET 2: MULTI-INSTANCE FLEET MAP ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 32px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Server size={22} color="#10b981" />
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              Live Fleet Isolation Map
            </h3>
          </div>
          <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>
            Click "Reboot Node" on any live instance to test socket self-healing & telemetry ping.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
          {instances.map(inst => (
            <div
              key={inst.id}
              className="card-3d-lift"
              style={{
                background: 'rgba(15, 23, 42, 0.78)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: inst.status === 'online' ? '#10b981' : '#FF6B35',
                      boxShadow: `0 0 10px ${inst.status === 'online' ? '#10b981' : '#FF6B35'}`,
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: inst.status === 'online' ? '#10b981' : '#FF6B35', textTransform: 'uppercase' }}>
                    {inst.status === 'online' ? 'Active Linked' : 'Re-syncing...'}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{inst.ping}ms</span>
              </div>

              <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', color: '#ffffff' }}>
                {inst.name}
              </h4>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 18px', fontFamily: 'monospace' }}>
                {inst.phone}
              </p>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#94A3B8', marginBottom: 6 }}>
                  <span>Worker Load</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>{inst.load}%</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${inst.load}%`, height: '100%', background: inst.load > 80 ? '#FF6B35' : '#10b981' }} />
                </div>
              </div>

              <button
                onClick={() => handleRestartInstance(inst.id)}
                disabled={inst.status === 'reconnecting'}
                className="btn-3d-elastic"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '9px 14px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: inst.status === 'reconnecting' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <RefreshCw size={13} className={inst.status === 'reconnecting' ? 'animate-spin' : ''} />
                <span>{inst.status === 'reconnecting' ? 'Restoring Link...' : 'Reboot Node Session'}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── CARD GRID WITH FILTER TABS ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 100px', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px' }}>
              Full System Capabilities
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 14, margin: 0 }}>
              Select a category to inspect tailored platform components.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'automation', label: 'Automation & Routing' },
              { id: 'infrastructure', label: 'Infrastructure & Alerting' },
              { id: 'security', label: 'Security & Compliance' },
              { id: 'analytics', label: 'Analytics' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as any);
                  soundEffects.playPopSound();
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeCategory === cat.id ? '#00e5ff' : 'rgba(255, 255, 255, 0.05)',
                  color: activeCategory === cat.id ? '#070b14' : '#94A3B8',
                  border: activeCategory === cat.id ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {filteredCards.map(c => (
            <div
              key={c.id}
              className="card-3d-lift"
              style={{
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 18,
                padding: 28,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {c.icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: 14 }}>
                  {c.stats}
                </span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px', color: '#ffffff' }}>
                {c.title}
              </h3>
              <p style={{ fontSize: 13.5, color: '#94A3B8', lineHeight: 1.65, margin: 0 }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <SaaSFooter onNavigate={onNavigate} />
    </div>
  );
};

export default FeaturesPage;
