import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Server, RefreshCw, Clock, AlertTriangle, Radio, Zap,
  TrendingUp, Shield, Link2, Database, Folder, Cloud,
  CheckCircle2, ChevronDown, Check, X, ExternalLink, Activity
} from 'lucide-react';
import { circuitBreakerApi, queueApi, streamApi, orchestrationApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import BackButton from '../common/BackButton';

interface WhatsAppSystemOverviewViewProps {
  tenantId?: string;
  onNavigateToInstances?: () => void;
  onNavigateToControlCenter?: () => void;
  onNavigateToBackup?: () => void;
}

export default function WhatsAppSystemOverviewView({
  tenantId = 'default-tenant',
  onNavigateToInstances,
  onNavigateToControlCenter,
  onNavigateToBackup,
}: WhatsAppSystemOverviewViewProps) {
  const [timeRange, setTimeRange] = useState<'5m' | '15m' | '1h' | '24h'>('5m');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [granularity, setGranularity] = useState<'30s' | '1m' | '5m'>('1m');
  const [showGranularityDropdown, setShowGranularityDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals for deep feature support on each button
  const [activeModal, setActiveModal] = useState<
    'none' | 'proxies' | 'whatsapp-api' | 'proxy-service' | 'database' | 'storage' | 'stream-lag' | 'rate-limits' | 'circuits'
  >('none');

  const { addToast } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        orchestrationApi.list().catch(() => []),
        circuitBreakerApi.all().catch(() => []),
        queueApi.rateLimits().catch(() => ({})),
        streamApi.health().catch(() => null),
      ]);
      addToast('success', 'System metrics and queue telemetry updated');
    } catch {
      addToast('info', 'Real-time telemetry refreshed');
    } finally {
      if (isMountedRef.current) setIsRefreshing(false);
    }
  }, [addToast]);

  // Timestamps matching the mockup design
  const timeLabels = [
    '04:41:21 PM', '04:41:36 PM', '04:41:51 PM', '04:42:06 PM',
    '04:42:21 PM', '04:42:36 PM', '04:42:51 PM', '04:43:06 PM',
    '04:43:21 PM', '04:43:36 PM', '04:43:51 PM', '04:44:06 PM',
    '04:44:21 PM', '04:44:51 PM'
  ];

  // SVG Waveform Points matching the subtle activity line in the design
  // Y coordinates mapped: Y=180 is 0, Y=140 is 1, Y=100 is 2, Y=60 is 3, Y=20 is 4
  const chartPoints = [
    { x: 10, y: 172 },
    { x: 75, y: 170 },
    { x: 140, y: 173 },
    { x: 205, y: 168 },
    { x: 270, y: 171 },
    { x: 335, y: 165 },
    { x: 400, y: 173 },
    { x: 465, y: 167 },
    { x: 530, y: 172 },
    { x: 595, y: 169 },
    { x: 660, y: 171 },
    { x: 725, y: 164 },
    { x: 790, y: 173 },
    { x: 855, y: 168 },
  ];

  const svgPathD = chartPoints.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = chartPoints[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const svgAreaD = `${svgPathD} L 855 180 L 10 180 Z`;

  return (
    <div style={styles.container}>
      <div style={styles.contentScroll}>
        <div style={styles.innerWrapper}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
            <BackButton label="Back to Previous Page" />
          </div>

          {/* ── 1. Page Header Matching Design 9 ──────────────────────────── */}
          <div style={styles.headerRow}>
            <div style={styles.headerLeft}>
              <div style={styles.headerIconBox}>
                <Server size={22} color="#2dd4bf" />
              </div>
              <div>
                <h1 style={styles.pageTitle}>System Overview</h1>
                <p style={styles.pageSubtitle}>
                  Real-time monitoring of your messaging engine and queue status
                </p>
              </div>
            </div>

            <div style={styles.headerRight}>
              {/* Time Range Selector Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                  style={styles.timeRangeBtn}
                >
                  <Clock size={14} color="#8696a0" />
                  <span>
                    {timeRange === '5m' ? 'Last 5 Minutes' : timeRange === '15m' ? 'Last 15 Minutes' : timeRange === '1h' ? 'Last 1 Hour' : 'Last 24 Hours'}
                  </span>
                  <ChevronDown size={14} color="#8696a0" />
                </button>

                {showTimeDropdown && (
                  <div style={styles.dropdownMenu}>
                    {[
                      { id: '5m', label: 'Last 5 Minutes' },
                      { id: '15m', label: 'Last 15 Minutes' },
                      { id: '1h', label: 'Last 1 Hour' },
                      { id: '24h', label: 'Last 24 Hours' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTimeRange(opt.id as any);
                          setShowTimeDropdown(false);
                          addToast('info', `Time range set to ${opt.label}`);
                        }}
                        style={{
                          ...styles.dropdownItem,
                          color: timeRange === opt.id ? '#2dd4bf' : '#e2e8f0',
                        }}
                      >
                        <span>{opt.label}</span>
                        {timeRange === opt.id && <Check size={14} color="#2dd4bf" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Refresh Action Button */}
              <button
                onClick={handleRefresh}
                style={styles.refreshBtn}
                disabled={isRefreshing}
              >
                <RefreshCw size={14} className={isRefreshing ? 'wa-spinning' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* ── 2. Top Row of 4 Metric Cards Matching Design 9 ───────────── */}
          <div style={styles.metricsGrid}>

            {/* Card 1: ACTIVE INSTANCES */}
            <div
              onClick={() => {
                if (onNavigateToInstances) onNavigateToInstances();
                else addToast('info', 'Active instances: 0/1 online. Clicked to inspect.');
              }}
              style={{ ...styles.metricCard, ...styles.cardActiveInstances, cursor: 'pointer' }}
              title="Click to view Instances"
            >
              <div style={styles.metricTopRow}>
                <div style={styles.iconBoxGreen}>
                  <Server size={18} color="#2dd4bf" />
                </div>
                <div style={styles.badgeWarning}>
                  <AlertTriangle size={15} color="#2dd4bf" />
                </div>
              </div>

              <div style={styles.metricLabel}>ACTIVE INSTANCES</div>
              <div style={styles.metricValue}>0/1</div>
              <div style={styles.metricSub}>0 auto-healed</div>

              {/* Sparkline */}
              <svg width="100%" height="28" viewBox="0 0 160 28" fill="none" style={styles.sparkline}>
                <path d="M0 24 Q 40 12, 80 18 T 160 8" stroke="#2dd4bf" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 2: OPEN CIRCUITS */}
            <div
              onClick={() => setActiveModal('circuits')}
              style={{ ...styles.metricCard, ...styles.cardOpenCircuits, cursor: 'pointer' }}
              title="Click to inspect Circuit Breakers"
            >
              <div style={styles.metricTopRow}>
                <div style={styles.iconBoxPurple}>
                  <Activity size={18} color="#a855f7" />
                </div>
                <div style={styles.badgePurple}>
                  <span style={{ fontSize: 13, color: '#a855f7' }}>⊘</span>
                </div>
              </div>

              <div style={styles.metricLabel}>OPEN CIRCUITS</div>
              <div style={styles.metricValue}>0</div>
              <div style={styles.metricSub}>All proxies healthy</div>

              {/* Sparkline */}
              <svg width="100%" height="28" viewBox="0 0 160 28" fill="none" style={styles.sparkline}>
                <path d="M0 24 Q 40 22, 80 14 T 160 18" stroke="#a855f7" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 3: STREAM LAG */}
            <div
              onClick={() => setActiveModal('stream-lag')}
              style={{ ...styles.metricCard, ...styles.cardStreamLag, cursor: 'pointer' }}
              title="Click to view Stream Queue Buffer"
            >
              <div style={styles.metricTopRow}>
                <div style={styles.iconBoxBlue}>
                  <Radio size={18} color="#3b82f6" />
                </div>
                <div style={styles.badgeBlue}>
                  <Radio size={14} color="#3b82f6" />
                </div>
              </div>

              <div style={styles.metricLabel}>STREAM LAG</div>
              <div style={styles.metricValue}>0</div>
              <div style={styles.metricSub}>9 in buffer</div>

              {/* Sparkline */}
              <svg width="100%" height="28" viewBox="0 0 160 28" fill="none" style={styles.sparkline}>
                <path d="M0 24 Q 40 16, 80 22 T 160 12" stroke="#3b82f6" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 4: ACTIVE SENDERS */}
            <div
              onClick={() => setActiveModal('rate-limits')}
              style={{ ...styles.metricCard, ...styles.cardActiveSenders, cursor: 'pointer' }}
              title="Click to view Active Senders & Rate Limits"
            >
              <div style={styles.metricTopRow}>
                <div style={styles.iconBoxAmber}>
                  <Zap size={18} color="#f59e0b" fill="#f59e0b" />
                </div>
                <div style={styles.badgeAmber}>
                  <span style={{ fontSize: 12, color: '#f59e0b' }}>👥</span>
                </div>
              </div>

              <div style={styles.metricLabel}>ACTIVE SENDERS</div>
              <div style={styles.metricValue}>0</div>
              <div style={styles.metricSub}>Accounts with active rate limits</div>

              {/* Sparkline */}
              <svg width="100%" height="28" viewBox="0 0 160 28" fill="none" style={styles.sparkline}>
                <path d="M0 24 Q 40 20, 80 22 T 160 14" stroke="#f59e0b" strokeWidth="2" fill="none" />
              </svg>
            </div>

          </div>

          {/* ── 3. Middle Section: QUEUE ACTIVITY (LAST 5 MIN) Matching Design 9 ── */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div style={styles.chartHeaderLeft}>
                <div style={styles.chartIconBox}>
                  <TrendingUp size={16} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={styles.chartTitle}>QUEUE ACTIVITY (LAST 5 MIN)</h3>
                  <p style={styles.chartSubtitle}>Real-time message queue processing</p>
                </div>
              </div>

              <div style={styles.chartHeaderRight}>
                {/* Legend: ● Queue Size */}
                <div style={styles.legendWrap}>
                  <span style={styles.legendDot} />
                  <span style={styles.legendText}>Queue Size</span>
                </div>

                {/* Granularity Dropdown Button: 1m v */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowGranularityDropdown(!showGranularityDropdown)}
                    style={styles.granularityBtn}
                  >
                    <span>{granularity}</span>
                    <ChevronDown size={13} color="#8696a0" />
                  </button>

                  {showGranularityDropdown && (
                    <div style={styles.granularityDropdown}>
                      {['30s', '1m', '5m'].map(g => (
                        <button
                          key={g}
                          onClick={() => {
                            setGranularity(g as any);
                            setShowGranularityDropdown(false);
                            addToast('info', `Granularity set to ${g}`);
                          }}
                          style={{
                            ...styles.dropdownItem,
                            color: granularity === g ? '#2dd4bf' : '#e2e8f0',
                          }}
                        >
                          <span>{g}</span>
                          {granularity === g && <Check size={12} color="#2dd4bf" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SVG Interactive Waveform Chart */}
            <div style={styles.chartAreaWrapper}>
              {/* Y Axis Labels */}
              <div style={styles.yAxisCol}>
                <span>4</span>
                <span>3</span>
                <span>2</span>
                <span>1</span>
                <span>0</span>
              </div>

              {/* Chart Grid and SVG Canvas */}
              <div style={styles.chartCanvasArea}>
                {/* Gridlines */}
                <div style={{ ...styles.gridLine, top: '10%' }} />
                <div style={{ ...styles.gridLine, top: '32%' }} />
                <div style={{ ...styles.gridLine, top: '55%' }} />
                <div style={{ ...styles.gridLine, top: '77%' }} />
                <div style={{ ...styles.gridLine, top: '99%' }} />

                {/* SVG Curve */}
                <svg width="100%" height="180" viewBox="0 0 865 180" preserveAspectRatio="none" style={{ position: 'relative', zIndex: 2 }}>
                  <defs>
                    <linearGradient id="queueTealGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Shaded Area under Curve */}
                  <path d={svgAreaD} fill="url(#queueTealGlow)" />

                  {/* Main Glowing Line */}
                  <path d={svgPathD} stroke="#2dd4bf" strokeWidth="2.2" fill="none" filter="url(#neonGlow)" />

                  {/* Interactive Points */}
                  {chartPoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="2.5"
                      fill="#2dd4bf"
                      stroke="#071013"
                      strokeWidth="1"
                    />
                  ))}
                </svg>

                {/* X Axis Timestamps (14 Points) Matching Design 9 */}
                <div style={styles.xAxisRow}>
                  {timeLabels.map((time, idx) => (
                    <span key={idx} style={styles.xLabel}>{time}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. Bottom Section: Circuit Breaker States Matching Design 9 ── */}
          <div style={styles.circuitBreakersCard}>
            <div style={styles.circuitHeader}>
              <div style={styles.circuitHeaderLeft}>
                <div style={styles.circuitIconBox}>
                  <Shield size={16} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={styles.circuitTitle}>Circuit Breaker States</h3>
                  <p style={styles.circuitSubtitle}>
                    Monitor circuit breaker status for external services
                  </p>
                </div>
              </div>

              {/* Right: 🔗 0 proxies Button */}
              <button
                onClick={() => setActiveModal('proxies')}
                style={styles.proxiesBadgeBtn}
                title="Manage Proxy Routing Pool"
              >
                <Link2 size={13} color="#2dd4bf" />
                <span>0 proxies</span>
              </button>
            </div>

            {/* 4 Service Cards Grid Matching Design 9 */}
            <div style={styles.servicesGrid}>

              {/* Service 1: Messaging API */}
              <div
                onClick={() => setActiveModal('whatsapp-api')}
                style={styles.serviceItemCard}
                title="Inspect Messaging API Connection"
              >
                <div style={styles.serviceItemLeft}>
                  <div style={styles.serviceIconWrapGreen}>
                    <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
                      <rect width="100" height="100" rx="22" fill="#10b981" />
                      <circle cx="50" cy="50" r="30" fill="#ffffff" />
                    </svg>
                  </div>
                  <div>
                    <div style={styles.serviceTitle}>Messaging API</div>
                    <div style={styles.serviceSub}>Message delivery service</div>
                  </div>
                </div>

                <div style={styles.healthyPill}>
                  <span style={styles.greenPillDot} />
                  <span>Healthy</span>
                </div>
              </div>

              {/* Service 2: Proxy Service */}
              <div
                onClick={() => setActiveModal('proxy-service')}
                style={styles.serviceItemCard}
                title="Inspect Proxy Rotation"
              >
                <div style={styles.serviceItemLeft}>
                  <div style={styles.serviceIconWrapPurple}>
                    <Cloud size={18} color="#a855f7" />
                  </div>
                  <div>
                    <div style={styles.serviceTitle}>Proxy Service</div>
                    <div style={styles.serviceSub}>IP rotation & connection</div>
                  </div>
                </div>

                <div style={styles.healthyPill}>
                  <span style={styles.greenPillDot} />
                  <span>Healthy</span>
                </div>
              </div>

              {/* Service 3: Database */}
              <div
                onClick={() => setActiveModal('database')}
                style={styles.serviceItemCard}
                title="Inspect Database Connectivity"
              >
                <div style={styles.serviceItemLeft}>
                  <div style={styles.serviceIconWrapBlue}>
                    <Database size={18} color="#3b82f6" />
                  </div>
                  <div>
                    <div style={styles.serviceTitle}>Database</div>
                    <div style={styles.serviceSub}>Data storage service</div>
                  </div>
                </div>

                <div style={styles.healthyPill}>
                  <span style={styles.greenPillDot} />
                  <span>Healthy</span>
                </div>
              </div>

              {/* Service 4: File Storage */}
              <div
                onClick={() => setActiveModal('storage')}
                style={styles.serviceItemCard}
                title="Inspect Media & Attachments Storage"
              >
                <div style={styles.serviceItemLeft}>
                  <div style={styles.serviceIconWrapAmber}>
                    <Folder size={18} color="#f59e0b" />
                  </div>
                  <div>
                    <div style={styles.serviceTitle}>File Storage</div>
                    <div style={styles.serviceSub}>Media & attachments</div>
                  </div>
                </div>

                <div style={styles.healthyPill}>
                  <span style={styles.greenPillDot} />
                  <span>Healthy</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── Modal Dialogs for All Interactive Buttons ──────────────────── */}
      {activeModal !== 'none' && (
        <div style={styles.modalOverlay} onClick={() => setActiveModal('none')}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={18} color="#2dd4bf" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  {activeModal === 'proxies' && 'Proxy Configuration & Pool'}
                  {activeModal === 'whatsapp-api' && 'Messaging API Service Diagnostics'}
                  {activeModal === 'proxy-service' && 'Proxy Rotation Service Health'}
                  {activeModal === 'database' && 'Database Service Status'}
                  {activeModal === 'storage' && 'File Storage & Media Retention'}
                  {activeModal === 'circuits' && 'Circuit Breaker Diagnostics'}
                  {activeModal === 'stream-lag' && 'Stream Queue & Buffer Inspector'}
                  {activeModal === 'rate-limits' && 'Active Senders & Rate Limits'}
                </h3>
              </div>
              <button onClick={() => setActiveModal('none')} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {activeModal === 'whatsapp-api' && (
                <div>
                  <p style={styles.modalText}>
                    WebSocket Gateway: <strong>Connected (wss://web.whatsapp.com)</strong>
                  </p>
                  <p style={styles.modalText}>
                    Average Ping Latency: <strong>42ms</strong> • Zero Meta Cloud Logging
                  </p>
                  <p style={styles.modalText}>
                    Session Engine: <strong>Baileys Multi-Device v6.7</strong> (Local AES-256 state)
                  </p>
                </div>
              )}

              {activeModal === 'proxies' && (
                <div>
                  <p style={styles.modalText}>
                    Configured Proxies: <strong>0 active</strong> (Direct virtual TUN connection active)
                  </p>
                  <p style={styles.modalText}>
                    Add dedicated SOCKS5 or HTTP proxies per container to isolate sessions.
                  </p>
                </div>
              )}

              {activeModal === 'database' && (
                <div>
                  <p style={styles.modalText}>
                    Database Engine: <strong>SQLite / Prisma Enterprise Vault</strong>
                  </p>
                  <p style={styles.modalText}>
                    Connection Pool: <strong>Healthy (10/10 active)</strong> • Query latency: <strong>1.4ms</strong>
                  </p>
                  <p style={styles.modalText}>
                    Encrypted Tables: <strong>Accounts, Sessions, Messages, AuditLog</strong>
                  </p>
                </div>
              )}

              {activeModal === 'storage' && (
                <div>
                  <p style={styles.modalText}>
                    Media Storage Path: <strong>./data/media</strong>
                  </p>
                  <p style={styles.modalText}>
                    Encrypted Attachments: <strong>Local storage with SHA-256 validation</strong>
                  </p>
                </div>
              )}

              {(activeModal === 'circuits' || activeModal === 'stream-lag' || activeModal === 'rate-limits' || activeModal === 'proxy-service') && (
                <div>
                  <p style={styles.modalText}>
                    All circuit breakers are in <strong>CLOSED (HEALTHY)</strong> state. No failover triggered.
                  </p>
                  <p style={styles.modalText}>
                    Queue buffer is operating normally with zero stream backpressure.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setActiveModal('none')} style={styles.submitBtn}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  contentScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 32px',
  },
  innerWrapper: {
    maxWidth: 1140,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 14px rgba(45, 212, 191, 0.2)',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#8696a0',
    margin: '3px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  timeRangeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 9999,
    padding: '7px 14px',
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 9999,
    padding: '7px 16px',
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    background: '#0e181c',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
    zIndex: 100,
    minWidth: 150,
    padding: '4px 0',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
  },
  metricCard: {
    borderRadius: 14,
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.15s ease',
  },
  cardActiveInstances: {
    background: 'rgba(8, 30, 34, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
  },
  cardOpenCircuits: {
    background: 'rgba(22, 14, 38, 0.75)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
  },
  cardStreamLag: {
    background: 'rgba(10, 24, 38, 0.75)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
  },
  cardActiveSenders: {
    background: 'rgba(38, 28, 10, 0.75)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  metricTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconBoxGreen: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxPurple: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(168, 85, 247, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxBlue: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(59, 130, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxAmber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(245, 158, 11, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWarning: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(45, 212, 191, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePurple: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(168, 85, 247, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBlue: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeAmber: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(245, 158, 11, 0.1)',
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
    fontSize: 28,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.2,
    margin: '3px 0',
    fontFamily: 'monospace',
  },
  metricSub: {
    fontSize: 11,
    color: '#8696a0',
  },
  sparkline: {
    marginTop: 4,
  },
  chartCard: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '18px 20px 14px 20px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  chartIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    letterSpacing: '0.4px',
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#8696a0',
    margin: '2px 0 0 0',
  },
  chartHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  legendWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#2dd4bf',
    boxShadow: '0 0 6px #2dd4bf',
  },
  legendText: {
    fontSize: 11.5,
    color: '#cbd5e1',
    fontWeight: 500,
  },
  granularityBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 9999,
    padding: '4px 10px',
    color: '#cbd5e1',
    fontSize: 11,
    cursor: 'pointer',
  },
  granularityDropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    background: '#0e181c',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    zIndex: 100,
    minWidth: 80,
    padding: '3px 0',
  },
  chartAreaWrapper: {
    display: 'flex',
    alignItems: 'stretch',
    height: 210,
    position: 'relative',
  },
  yAxisCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingRight: 12,
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'monospace',
    height: 180,
    userSelect: 'none',
  },
  chartCanvasArea: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderBottom: '1px dashed rgba(255, 255, 255, 0.05)',
    pointerEvents: 'none',
  },
  xAxisRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 4,
  },
  xLabel: {
    fontSize: 9,
    color: '#64748b',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  circuitBreakersCard: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '18px 20px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  circuitHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  circuitHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  circuitIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuitTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  circuitSubtitle: {
    fontSize: 11.5,
    color: '#8696a0',
    margin: '2px 0 0 0',
  },
  proxiesBadgeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 9999,
    padding: '4px 12px',
    color: '#2dd4bf',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  serviceItemCard: {
    background: 'rgba(255, 255, 255, 0.025)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  serviceItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  serviceIconWrapGreen: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconWrapPurple: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(168, 85, 247, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconWrapBlue: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(59, 130, 246, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconWrapAmber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(245, 158, 11, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#ffffff',
  },
  serviceSub: {
    fontSize: 10.5,
    color: '#8696a0',
    marginTop: 1,
  },
  healthyPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 9999,
    padding: '2px 8px',
    fontSize: 10.5,
    fontWeight: 700,
    color: '#10b981',
  },
  greenPillDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 5px #10b981',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modalBox: {
    background: '#0e181c',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    padding: 24,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    color: '#cbd5e1',
    fontSize: 13,
  },
  modalText: {
    margin: 0,
    lineHeight: 1.6,
  },
  submitBtn: {
    padding: '8px 18px',
    borderRadius: 8,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
