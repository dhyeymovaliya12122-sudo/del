import React from 'react';
import {
  Crown, CheckCircle2, Shield, Zap, Sparkles,
  Bot, Clock, Users, X, ChevronRight
} from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess?: () => void;
}

export default function ProUpgradeModal({
  isOpen,
  onClose,
  onUpgradeSuccess,
}: ProUpgradeModalProps) {
  if (!isOpen) return null;

  const features = [
    {
      icon: <Users size={18} color="#2dd4bf" />,
      title: 'Unlimited Multi-Account Hub',
      desc: 'Connect up to 60+ simultaneous phone numbers with zero session drops.',
    },
    {
      icon: <Clock size={18} color="#60a5fa" />,
      title: 'Smart Message Scheduler',
      desc: 'Automate one-time and recurring message sequences to contacts and groups.',
    },
    {
      icon: <Bot size={18} color="#a855f7" />,
      title: '24/7 AI Auto-Reply Engine',
      desc: 'Context-aware responses powered by advanced AI and keyword triggers.',
    },
    {
      icon: <Shield size={18} color="#34d399" />,
      title: 'Stealth Ghost Mode & Anti-Ban',
      desc: 'Read messages without triggering blue ticks and protect your numbers.',
    },
    {
      icon: <Zap size={18} color="#f59e0b" />,
      title: 'Bulk Campaigns & Turbo Dispatch',
      desc: 'Send personalized broadcasts with anti-spam random delay algorithms.',
    },
    {
      icon: <Sparkles size={18} color="#f43f5e" />,
      title: 'Priority Cloud Webhooks & API',
      desc: 'Seamlessly integrate into your CRM, ERP, and internal notification stacks.',
    },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Ambient Glow */}
        <div style={styles.ambientGlow} />

        {/* Close Button */}
        <button style={styles.closeBtn} onClick={onClose} title="Close">
          <X size={18} />
        </button>

        {/* Header with Crown */}
        <div style={styles.header}>
          <div style={styles.crownBox}>
            <Crown size={28} color="#f59e0b" />
          </div>
          <h2 style={styles.title}>
            Upgrade to <span style={styles.proGradient}>Chat Pro</span>
          </h2>
          <p style={styles.subtitle}>
            Unlock advanced messaging automation, multi-account scaling, and anti-ban safeguards.
          </p>
        </div>

        {/* Features Grid */}
        <div style={styles.featuresGrid}>
          {features.map((feat, idx) => (
            <div key={idx} style={styles.featureItem}>
              <div style={styles.featureIconWrap}>
                {feat.icon}
              </div>
              <div>
                <div style={styles.featureTitle}>{feat.title}</div>
                <div style={styles.featureDesc}>{feat.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Plan Card */}
        <div style={styles.planCard}>
          <div style={styles.planInfo}>
            <div style={styles.badge}>PRO LIFETIME LICENSE</div>
            <div style={styles.planPrice}>
              <span style={styles.priceNum}>$49</span>
              <span style={styles.priceTerm}>/ month or included in Enterprise</span>
            </div>
            <div style={styles.guarantee}>
              <CheckCircle2 size={14} color="#10b981" />
              <span>Instant activation &bull; 30-day satisfaction guarantee</span>
            </div>
          </div>

          <button
            style={styles.activateBtn}
            onClick={() => {
              if (onUpgradeSuccess) onUpgradeSuccess();
              onClose();
            }}
          >
            <span>Activate Pro Now</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(3, 7, 9, 0.82)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: 20,
    fontFamily: "'Inter', sans-serif",
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: 620,
    background: 'linear-gradient(170deg, #0f2324 0%, #081417 100%)',
    border: '1.5px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 20,
    padding: '32px 30px',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.15)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
    filter: 'blur(40px)',
    pointerEvents: 'none',
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    cursor: 'pointer',
    zIndex: 10,
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 24,
  },
  crownBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1.5px solid rgba(245, 158, 11, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    boxShadow: '0 0 25px rgba(245, 158, 11, 0.3)',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.3px',
  },
  proGradient: {
    background: 'linear-gradient(135deg, #34d399, #2dd4bf)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: 13,
    color: '#94a3b8',
    maxWidth: 440,
    lineHeight: 1.45,
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    background: 'rgba(13, 27, 32, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  featureIconWrap: {
    padding: 6,
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    flexShrink: 0,
    display: 'flex',
  },
  featureTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#f8fafc',
  },
  featureDesc: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
    lineHeight: 1.35,
  },
  planCard: {
    background: 'rgba(17, 34, 38, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 14,
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  planInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.8px',
    color: '#2dd4bf',
  },
  planPrice: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  priceNum: {
    fontSize: 24,
    fontWeight: 800,
    color: '#f8fafc',
  },
  priceTerm: {
    fontSize: 12,
    color: '#94a3b8',
  },
  guarantee: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    color: '#6ee7b7',
  },
  activateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 22px',
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: '1px solid rgba(52, 211, 153, 0.45)',
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
    whiteSpace: 'nowrap',
  },
};
