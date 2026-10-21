import React from 'react';
import {
  Zap, Plus, ChevronRight, X, Sparkles,
  PlusCircle, MessageSquare
} from 'lucide-react';
import BackButton from '../common/BackButton';

interface WhatsAppAutoReplyViewProps {
  onCreateRule: () => void;
  onCloseView?: () => void;
}

export default function WhatsAppAutoReplyView({
  onCreateRule,
  onCloseView,
}: WhatsAppAutoReplyViewProps) {
  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
        <BackButton onBack={onCloseView} label="Back to Previous Page" />
      </div>

      {/* ── Top Header Card ───────────────────────────────────────────── */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBox}>
            <Zap size={24} color="#2dd4bf" />
          </div>
          <div>
            <div style={styles.titleRow}>
              <h2 style={styles.headerTitle}>Keyword Auto-Reply Engine</h2>
              <span style={styles.smartBotBadge}>24/7 Smart Bot</span>
            </div>
            <p style={styles.headerSubtitle}>
              Respond instantly to customer queries, pricing requests, FAQs, and after-hours messages.
            </p>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button style={styles.newRuleBtn} onClick={onCreateRule} title="Create a new auto-reply rule">
            <Plus size={16} strokeWidth={2.5} />
            <span>New Rule</span>
            <ChevronRight size={15} />
          </button>

          {onCloseView && (
            <button style={styles.closeBtn} onClick={onCloseView} title="Close view">
              <X size={18} color="#94a3b8" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Hero Card: No Auto-Reply Rules Configured ─────────────── */}
      <div style={styles.heroCard}>
        {/* Ambient Wave Graphic in Background */}
        <div style={styles.ambientWave} />

        {/* Center Graphic: Illustrated Chat Card + Magnifier + Floating Keyword Tags */}
        <div style={styles.illustrationWrap}>
          {/* Floating Keyword Pills - Left */}
          <div style={{ ...styles.floatingTag, top: 12, left: -46, borderColor: 'rgba(45, 212, 191, 0.4)', color: '#2dd4bf' }}>
            price
          </div>
          <div style={{ ...styles.floatingTag, top: 48, left: -72, borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}>
            catalog
          </div>
          <div style={{ ...styles.floatingTag, bottom: 16, left: -52, borderColor: 'rgba(45, 212, 191, 0.35)', color: '#5eead4' }}>
            help
          </div>

          {/* Floating Keyword Pills - Right */}
          <div style={{ ...styles.floatingTag, top: 8, right: -48, borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}>
            hello
          </div>
          <div style={{ ...styles.floatingTag, top: 42, right: -56, borderColor: 'rgba(168, 85, 247, 0.4)', color: '#c084fc' }}>
            faq
          </div>
          <div style={{ ...styles.floatingTag, bottom: 12, right: -60, borderColor: 'rgba(99, 102, 241, 0.4)', color: '#818cf8' }}>
            setup
          </div>

          {/* Central Card with search message preview */}
          <div style={styles.centerPhoneCard}>
            <div style={styles.cardHeaderBar}>
              <div style={styles.pricePill}>
                <Zap size={13} color="#2dd4bf" />
                <span>price?</span>
              </div>
            </div>

            {/* Skeleton reply message rows */}
            <div style={styles.skeletonRows}>
              <div style={styles.skeletonLineShort} />
              <div style={styles.skeletonLineLong} />
            </div>
          </div>

          {/* Overlay Magnifying Glass with Lightning Bolt */}
          <div style={styles.magnifierCircle}>
            <Zap size={26} color="#2dd4bf" />
            <div style={styles.magnifierHandle} />
          </div>

          {/* Sparkles */}
          <div style={{ ...styles.sparkleDot, top: 0, left: 24 }} />
          <div style={{ ...styles.sparkleDot, bottom: -6, right: 30, width: 4, height: 4 }} />
        </div>

        {/* Small Lightning Icon above Title */}
        <div style={styles.smallLightning}>
          <Zap size={22} color="#2dd4bf" />
        </div>

        {/* Main Title with highlighted 'configured' */}
        <h3 style={styles.heroTitle}>
          No auto-reply rules <span style={styles.highlightConfigured}>configured</span>
        </h3>

        <p style={styles.heroSubtitle}>
          Create keyword rules to instantly answer messages containing &quot;price&quot;, &quot;catalog&quot;, &quot;help&quot;, or setup after-hours away notices.
        </p>

        {/* Big Action Button */}
        <button style={styles.createFirstBtn} onClick={onCreateRule}>
          <PlusCircle size={18} />
          <span>Create Your First Rule</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    background: '#071013',
    padding: '20px 24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    fontFamily: "'Inter', sans-serif",
  },
  headerCard: {
    background: 'rgba(13, 25, 30, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backdropFilter: 'blur(16px)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1.5px solid rgba(45, 212, 191, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(45, 212, 191, 0.2)',
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    margin: 0,
    fontSize: 21,
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.3px',
  },
  smartBotBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 9px',
    borderRadius: 9999,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    color: '#2dd4bf',
  },
  headerSubtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#8696a0',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  newRuleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
    transition: 'transform 0.15s ease',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'rgba(17, 27, 33, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  heroCard: {
    flex: 1,
    background: 'rgba(11, 22, 27, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientWave: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    height: 220,
    background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.06) 50%, transparent 80%)',
    filter: 'blur(55px)',
    pointerEvents: 'none',
  },
  illustrationWrap: {
    position: 'relative',
    width: 240,
    height: 160,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  centerPhoneCard: {
    width: 170,
    height: 110,
    borderRadius: 16,
    background: 'linear-gradient(145deg, #0b2529 0%, #06171a 100%)',
    border: '1.5px solid rgba(45, 212, 191, 0.35)',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(45, 212, 191, 0.15)',
    padding: '12px 14px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  cardHeaderBar: {
    display: 'flex',
    alignItems: 'center',
  },
  pricePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.4)',
    borderRadius: 9999,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#f8fafc',
  },
  skeletonRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 10,
  },
  skeletonLineShort: {
    width: '45%',
    height: 6,
    borderRadius: 3,
    background: 'rgba(255, 255, 255, 0.15)',
  },
  skeletonLineLong: {
    width: '85%',
    height: 6,
    borderRadius: 3,
    background: 'rgba(255, 255, 255, 0.08)',
  },
  magnifierCircle: {
    position: 'absolute',
    right: 18,
    bottom: 12,
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #0e3d36 0%, #061e1b 100%)',
    border: '3px solid #14b8a6',
    boxShadow: '0 0 25px rgba(20, 184, 166, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  magnifierHandle: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 6,
    height: 18,
    borderRadius: 3,
    background: '#14b8a6',
    transform: 'rotate(-45deg)',
  },
  floatingTag: {
    position: 'absolute',
    padding: '3px 10px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(11, 25, 30, 0.92)',
    border: '1px solid',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    zIndex: 3,
  },
  sparkleDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#5eead4',
    boxShadow: '0 0 8px #5eead4',
    opacity: 0.8,
  },
  smallLightning: {
    marginBottom: 8,
    filter: 'drop-shadow(0 0 8px rgba(45, 212, 191, 0.6))',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#f8fafc',
    margin: '0 0 8px 0',
    letterSpacing: '-0.3px',
  },
  highlightConfigured: {
    color: '#2dd4bf',
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: '#8696a0',
    maxWidth: 540,
    margin: '0 0 28px 0',
    lineHeight: 1.5,
  },
  createFirstBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '13px 26px',
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: '1px solid rgba(52, 211, 153, 0.45)',
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 6px 24px rgba(16, 185, 129, 0.4)',
    transition: 'transform 0.15s ease',
  },
};
