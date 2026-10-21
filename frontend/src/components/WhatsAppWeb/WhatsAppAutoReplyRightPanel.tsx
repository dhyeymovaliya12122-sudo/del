import React from 'react';
import {
  Zap, Lightbulb, MessageSquare, Package, Tag,
  Clock, Bot, ChevronRight, ArrowRight
} from 'lucide-react';

interface WhatsAppAutoReplyRightPanelProps {
  onSelectUseCase: (useCase: 'faq' | 'catalog' | 'pricing' | 'afterhours') => void;
  onOpenBotWorkflow: () => void;
}

export default function WhatsAppAutoReplyRightPanel({
  onSelectUseCase,
  onOpenBotWorkflow,
}: WhatsAppAutoReplyRightPanelProps) {
  const steps = [
    {
      num: 1,
      title: 'Add keywords',
      desc: 'e.g. price, catalog, help',
    },
    {
      num: 2,
      title: 'Set your reply',
      desc: 'Choose a message template',
    },
    {
      num: 3,
      title: 'Save & Activate',
      desc: 'Bot will reply automatically',
    },
  ];

  const useCases = [
    {
      id: 'faq' as const,
      title: 'Answer FAQs',
      desc: 'Common questions',
      icon: <MessageSquare size={17} color="#38bdf8" />,
      iconBg: 'rgba(56, 189, 248, 0.15)',
      iconBorder: 'rgba(56, 189, 248, 0.3)',
    },
    {
      id: 'catalog' as const,
      title: 'Share Catalog',
      desc: 'Product/Service details',
      icon: <Package size={17} color="#c084fc" />,
      iconBg: 'rgba(192, 132, 252, 0.15)',
      iconBorder: 'rgba(192, 132, 252, 0.3)',
    },
    {
      id: 'pricing' as const,
      title: 'Handle Pricing',
      desc: 'Instant price updates',
      icon: <Tag size={17} color="#2dd4bf" />,
      iconBg: 'rgba(45, 212, 191, 0.15)',
      iconBorder: 'rgba(45, 212, 191, 0.3)',
    },
    {
      id: 'afterhours' as const,
      title: 'After-Hours Support',
      desc: 'Keep customers happy',
      icon: <Clock size={17} color="#a78bfa" />,
      iconBg: 'rgba(167, 139, 250, 0.15)',
      iconBorder: 'rgba(167, 139, 250, 0.3)',
    },
  ];

  return (
    <aside style={styles.panel}>
      {/* ── Card 1: How It Works ─────────────────────────────────────── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <Zap size={17} color="#2dd4bf" />
          <span style={styles.cardTitle}>How It Works</span>
        </div>

        <div style={styles.stepsList}>
          {steps.map(step => (
            <div key={step.num} style={styles.stepItem}>
              <div style={styles.stepNumCircle}>
                {step.num}
              </div>
              <div>
                <div style={styles.stepTitle}>{step.title}</div>
                <div style={styles.stepDesc}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card 2: Use Cases ────────────────────────────────────────── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <Lightbulb size={17} color="#2dd4bf" />
          <span style={styles.cardTitle}>Use Cases</span>
        </div>

        <div style={styles.useCasesList}>
          {useCases.map(uc => (
            <button
              key={uc.id}
              style={styles.useCaseItem}
              onClick={() => onSelectUseCase(uc.id)}
              title={`Click to configure ${uc.title} rule`}
            >
              <div
                style={{
                  ...styles.useCaseIconWrap,
                  background: uc.iconBg,
                  border: `1px solid ${uc.iconBorder}`,
                }}
              >
                {uc.icon}
              </div>
              <div style={styles.useCaseInfo}>
                <div style={styles.useCaseTitle}>{uc.title}</div>
                <div style={styles.useCaseDesc}>{uc.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom Banner: Let your business work 24/7 ───────────────── */}
      <div style={styles.workBanner} onClick={onOpenBotWorkflow}>
        <div style={styles.bannerLeft}>
          <div style={styles.botIconWrap}>
            <Bot size={22} color="#2dd4bf" />
          </div>
          <div>
            <div style={styles.bannerSubtitle}>Let your business</div>
            <div style={styles.bannerTitle}>work 24/7</div>
          </div>
        </div>

        <button style={styles.bannerArrowBtn} onClick={onOpenBotWorkflow} title="Launch 24/7 Automation">
          <ArrowRight size={17} color="#ffffff" />
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
    gap: 14,
  },
  card: {
    background: 'rgba(17, 28, 33, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: '16px 18px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.2px',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumCircle: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '1.5px solid rgba(45, 212, 191, 0.5)',
    background: 'rgba(45, 212, 191, 0.1)',
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#f8fafc',
  },
  stepDesc: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
  },
  useCasesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  useCaseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'transparent',
    border: 'none',
    padding: '6px 4px',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s ease',
    outline: 'none',
    width: '100%',
  },
  useCaseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  useCaseInfo: {
    flex: 1,
    minWidth: 0,
  },
  useCaseTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#f8fafc',
  },
  useCaseDesc: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 1,
  },
  workBanner: {
    marginTop: 'auto',
    background: 'linear-gradient(135deg, #0d3835 0%, #1e1b4b 100%)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    borderRadius: 16,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    cursor: 'pointer',
  },
  bannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  botIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 14px rgba(45, 212, 191, 0.3)',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: 500,
  },
  bannerTitle: {
    fontSize: 14.5,
    fontWeight: 700,
    color: '#2dd4bf',
    letterSpacing: '-0.2px',
  },
  bannerArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
};
