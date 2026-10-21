import React from 'react';
import {
  Send, Gift, UserCheck, Bell, Megaphone,
  ChevronRight, Crown
} from 'lucide-react';

interface WhatsAppSmartMessagingPanelProps {
  onSelectPreset: (presetName: string) => void;
  onUpgradePro: () => void;
}

export default function WhatsAppSmartMessagingPanel({
  onSelectPreset,
  onUpgradePro,
}: WhatsAppSmartMessagingPanelProps) {
  const presets = [
    {
      id: 'birthday',
      title: 'Birthday Wishes',
      subtitle: 'Automate celebrations',
      icon: <Gift size={18} color="#c084fc" />,
      iconBg: 'rgba(168, 85, 247, 0.15)',
      iconBorder: 'rgba(168, 85, 247, 0.3)',
    },
    {
      id: 'followup',
      title: 'Client Follow-ups',
      subtitle: 'Never miss a lead',
      icon: <UserCheck size={18} color="#60a5fa" />,
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconBorder: 'rgba(59, 130, 246, 0.3)',
    },
    {
      id: 'reminders',
      title: 'Daily Reminders',
      subtitle: 'Keep everyone updated',
      icon: <Bell size={18} color="#34d399" />,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconBorder: 'rgba(16, 185, 129, 0.3)',
    },
    {
      id: 'marketing',
      title: 'Marketing Broadcasts',
      subtitle: 'Reach multiple contacts',
      icon: <Megaphone size={18} color="#fbbf24" />,
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconBorder: 'rgba(245, 158, 11, 0.3)',
    },
  ];

  return (
    <aside style={styles.panel}>
      {/* ── Top Header Card: Smart Messaging 👑 ──────────────────────── */}
      <div style={styles.smartCard}>
        <div style={styles.airplaneIllustration}>
          <svg width="48" height="48" viewBox="0 0 100 100" fill="none">
            {/* Speed trails */}
            <path d="M15 65 L40 60" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <path d="M22 75 L38 72" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
            <path d="M10 50 L32 48" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            {/* Paper Airplane */}
            <path
              d="M30 68 L85 20 L20 48 L46 58 L72 32 L46 62 L48 76 L60 66 Z"
              fill="url(#planeGrad)"
            />
            {/* Sparkles */}
            <circle cx="88" cy="18" r="2.5" fill="#5eead4" />
            <circle cx="78" cy="12" r="1.5" fill="#5eead4" />
            <defs>
              <linearGradient id="planeGrad" x1="20" y1="20" x2="85" y2="76" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5eead4" />
                <stop offset="1" stopColor="#0d9488" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div style={styles.smartTextWrap}>
          <div style={styles.smartTitleRow}>
            <span style={styles.smartTitle}>Smart Messaging</span>
            <span style={{ fontSize: 14 }}>👑</span>
          </div>
          <div style={styles.smartSubtitle}>Save time. Stay connected.</div>
        </div>
      </div>

      {/* ── 4 Preset Quick Action Cards ──────────────────────────────── */}
      <div style={styles.presetsList}>
        {presets.map(item => (
          <button
            key={item.id}
            style={styles.presetItem}
            onClick={() => onSelectPreset(item.title)}
          >
            <div
              style={{
                ...styles.presetIconWrap,
                background: item.iconBg,
                border: `1px solid ${item.iconBorder}`,
              }}
            >
              {item.icon}
            </div>

            <div style={styles.presetInfo}>
              <div style={styles.presetTitle}>{item.title}</div>
              <div style={styles.presetSubtitle}>{item.subtitle}</div>
            </div>

            <ChevronRight size={16} color="#64748b" style={styles.presetChevron} />
          </button>
        ))}
      </div>

      {/* ── Bottom Banner: Go Pro ────────────────────────────────────── */}
      <div style={styles.goProBanner}>
        <div style={styles.crownWatermark}>👑</div>

        <div style={styles.goProTop}>
          <div style={styles.crownIconBox}>
            <Crown size={16} color="#f59e0b" />
          </div>
          <div style={styles.goProTitle}>Go Pro</div>
        </div>

        <p style={styles.goProDesc}>
          Unlock advanced automation, analytics and more...
        </p>

        <button style={styles.upgradeBtn} onClick={onUpgradePro}>
          <span>Upgrade Now</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 290,
    background: '#0a1317',
    borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 16,
    boxSizing: 'border-box',
    flexShrink: 0,
    height: '100%',
    overflowY: 'auto',
    fontFamily: "'Inter', sans-serif",
    userSelect: 'none',
  },
  smartCard: {
    background: 'rgba(17, 28, 33, 0.8)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 14,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
    marginBottom: 16,
  },
  airplaneIllustration: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 0 10px rgba(45, 212, 191, 0.4))',
  },
  smartTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  smartTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  smartTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.2px',
  },
  smartSubtitle: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
  },
  presetsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
  },
  presetItem: {
    background: 'rgba(17, 27, 33, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  presetIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  presetInfo: {
    flex: 1,
    minWidth: 0,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#f8fafc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  presetSubtitle: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
  },
  presetChevron: {
    flexShrink: 0,
  },
  goProBanner: {
    marginTop: 16,
    background: 'linear-gradient(145deg, #092622 0%, #06191c 100%)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 14,
    padding: '16px 18px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  crownWatermark: {
    position: 'absolute',
    top: -10,
    right: -10,
    fontSize: 70,
    opacity: 0.08,
    pointerEvents: 'none',
  },
  goProTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  crownIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goProTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#f8fafc',
  },
  goProDesc: {
    fontSize: 11.5,
    color: '#94a3b8',
    margin: '0 0 14px 0',
    lineHeight: 1.4,
  },
  upgradeBtn: {
    width: '100%',
    padding: '9px 14px',
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'transform 0.15s ease',
  },
};
