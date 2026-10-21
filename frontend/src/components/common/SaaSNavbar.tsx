import React, { useState } from 'react';
import { Shield, Sparkles, Zap, ArrowRight, Menu, X, Globe, Terminal, ChevronRight, Activity } from 'lucide-react';

interface SaaSNavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const SaaSNavbar: React.FC<SaaSNavbarProps> = ({ currentPath, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: 'landing' },
    { label: 'Features', path: 'features' },
    { label: 'Pricing', path: 'pricing' },
    { label: 'Book Demo', path: 'contact' },
    { label: 'Alert Studio', path: 'alert', highlight: true },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: 'rgba(7, 11, 20, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        boxSizing: 'border-box',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Brand Logo ── */}
      <div
        onClick={() => onNavigate('landing')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: '#0f172a',
            border: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.8px', color: '#ffffff' }}>
              NEXUS
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
              CHAT
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '2px 6px',
                borderRadius: 6,
                border: '1px solid rgba(16, 185, 129, 0.3)',
                letterSpacing: '0.5px',
              }}
            >
              PRO v2.5
            </span>
          </div>
          <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 500, letterSpacing: '0.3px' }}>
            Enterprise Cloud Automation Engine
          </span>
        </div>
      </div>

      {/* ── Desktop Navigation Links ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hidden-mobile">
        {navLinks.map(link => {
          const isActive = currentPath === link.path;
          return (
            <button
              key={link.path}
              onClick={() => onNavigate(link.path)}
              style={{
                background: isActive
                  ? 'rgba(255, 255, 255, 0.08)'
                  : link.highlight
                  ? 'rgba(255, 107, 53, 0.12)'
                  : 'transparent',
                border: link.highlight
                  ? '1px solid rgba(255, 107, 53, 0.35)'
                  : isActive
                  ? '1px solid rgba(255, 255, 255, 0.15)'
                  : '1px solid transparent',
                color: link.highlight ? '#FF6B35' : isActive ? '#ffffff' : '#94A3B8',
                fontWeight: isActive || link.highlight ? 700 : 500,
                fontSize: 13.5,
                padding: '7px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = link.highlight ? '#FF6B35' : '#94A3B8';
                  e.currentTarget.style.background = link.highlight ? 'rgba(255, 107, 53, 0.12)' : 'transparent';
                }
              }}
            >
              {link.label}
            </button>
          );
        })}
      </div>

      {/* ── Right Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 10px',
            borderRadius: 6,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: 12,
            color: '#10b981',
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          <span>99.99% Systems Online</span>
        </div>

        {/* Enter App / Sign In Button */}
        <button
          onClick={() => onNavigate('app')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            fontSize: 13.5,
            fontWeight: 700,
            color: '#070b14',
            background: '#10b981',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#059669';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#10b981';
          }}
        >
          <span>Launch Dashboard</span>
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
          }}
          className="show-mobile"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 68,
            left: 0,
            right: 0,
            background: '#070b14',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {navLinks.map(link => (
            <button
              key={link.path}
              onClick={() => {
                onNavigate(link.path);
                setMobileMenuOpen(false);
              }}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: currentPath === link.path ? '#10b981' : '#E2E8F0',
                background: currentPath === link.path ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: 8,
              }}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => {
              onNavigate('app');
              setMobileMenuOpen(false);
            }}
            style={{
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 700,
              color: '#070b14',
              background: '#10b981',
              border: 'none',
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            Launch Dashboard →
          </button>
        </div>
      )}
    </nav>
  );
};
