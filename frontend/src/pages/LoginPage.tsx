import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Shield, HelpCircle, FileText, AlertCircle, X, Crown, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { accountsApi, api } from '../services/api';

export default function LoginPage({ onLogin, onNavigate }: { onLogin: () => void; onNavigate?: (path: string) => void }) {
  const { login } = useAuth();
  const [portalMode, setPortalMode] = useState<'superadmin' | 'admin'>('superadmin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetIdentity, setResetIdentity] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');

  const handleAutofillDemo = () => {
    setUsername('superadmin');
    setPassword('changeme');
    setError('');
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg('');
    setResetErr('');
    try {
      if (resetStep === 1) {
        await api.post('/auth/forgot-password', { identity: resetIdentity });
        setResetMsg('If an account exists, a token was generated.');
        setResetStep(2);
      } else {
        await api.post('/auth/reset-password', { token: resetToken, newPassword: resetNewPass });
        setResetMsg('Password reset successful! You can now log in.');
        setTimeout(() => setShowForgotModal(false), 2000);
      }
    } catch (err: any) {
      setResetErr(err?.response?.data?.message || 'An error occurred.');
    }
  };  const isSuper = portalMode === 'superadmin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();
    if (!cleanUser || !cleanPass) {
      setError('Please enter both username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(cleanUser, cleanPass);
      onLogin();
    } catch (err: any) {
      if (err?.response?.status === 503 || err?.response?.data?.error?.includes?.('reconnecting')) {
        setError('⚠️ Backend service is booting up on port 3000. Retrying in 2 seconds...');
        setTimeout(() => {
          login(cleanUser, cleanPass).then(onLogin).catch(() => {});
        }, 2000);
      } else if (!err?.response && (err?.message?.includes?.('Network Error') || err?.code === 'ECONNREFUSED')) {
        setError('⚠️ Cannot reach backend API on port 3000. Retrying in 2 seconds...');
        setTimeout(() => {
          login(cleanUser, cleanPass).then(onLogin).catch(() => {});
        }, 2000);
      } else {
        setError(err?.response?.data?.message || err?.response?.data?.error || 'Invalid username or password. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* ── Top-Left SaaS Navigation Pill ── */}
      <div style={{ position: 'absolute', top: 20, left: 24, zIndex: 100, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={() => onNavigate ? onNavigate('landing') : (window.location.pathname = '/landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 20,
            padding: '7px 14px',
            color: '#ffffff',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span>← 3D SaaS Landing Page</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate ? onNavigate('pricing') : (window.location.pathname = '/pricing')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          Pricing
        </button>
      </div>

      {/* ── Top-Right Pill Badge ─────────────────────────────────────── */}
      <div style={styles.topRightBadge}>
        <Shield size={14} color="#00ffb2" />
        <span>Secure • Fast • Reliable</span>
      </div>

      {/* ── Main Centered Glass Card ─────────────────────────────────── */}
      <div style={styles.cardContainer}>
        <div style={styles.glassCard}>
          {/* Top Shield Emblem */}
          <div style={styles.shieldEmblem}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L4 6V12C4 17.5 7.5 21.5 12 22C16.5 21.5 20 17.5 20 12V6L12 2Z"
                stroke="#00ffb2"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="rgba(0, 255, 178, 0.18)"
              />
            </svg>
          </div>

          {/* Heading */}
          <div style={styles.headingArea}>
            <h1 style={styles.title}>
              Chat <span style={styles.titleHighlight}>Pro</span>
            </h1>
            <div style={styles.subtitle}>
              Multi-Account &amp; Admin Management System
            </div>
            <p style={styles.description}>
              Manage Multiple Accounts, Control Admins, and Keep Everything Secure
            </p>
          </div>

          {/* ── Role Switcher Tabs (Super Admin vs Admin) ─────────────── */}
          <div style={styles.roleTabsWrap}>
            <button
              type="button"
              onClick={() => {
                setPortalMode('superadmin');
                setError('');
              }}
              style={{
                ...styles.roleTab,
                ...(isSuper ? styles.roleTabActiveSuper : {}),
              }}
            >
              <Crown size={15} color={isSuper ? '#fbbf24' : '#64748b'} />
              <span>Super Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalMode('admin');
                setError('');
              }}
              style={{
                ...styles.roleTab,
                ...(!isSuper ? styles.roleTabActiveAdmin : {}),
              }}
            >
              <Shield size={15} color={!isSuper ? '#00ffb2' : '#64748b'} />
              <span>Admin Login</span>
            </button>
          </div>


          {/* ── Login Form ───────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} style={styles.form} autoComplete="off">
            {/* Username Input */}
            <div style={styles.inputWrap}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={styles.input}
                placeholder={isSuper ? 'Super Admin Username' : 'Admin Username'}
                autoComplete="off"
                autoFocus
              />
            </div>

            {/* Password Input */}
            <div style={styles.inputWrap}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter Password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
                title={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Superadmin Autofill Button */}
            <button
              type="button"
              onClick={handleAutofillDemo}
              style={{
                width: '100%',
                padding: '9px 12px',
                marginBottom: 12,
                borderRadius: 10,
                background: 'rgba(0, 255, 178, 0.08)',
                border: '1px dashed rgba(0, 255, 178, 0.4)',
                color: '#00ffb2',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>⚡ Auto-Fill Superadmin Credentials (superadmin / changeme)</span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? (
                <div style={styles.spinnerWrap}>
                  <div style={styles.spinner} />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div style={styles.submitBtnInner}>
                  <LogIn size={17} strokeWidth={2.4} />
                  <span>Sign In as {isSuper ? 'Super Admin' : 'Admin'} →</span>
                </div>
              )}
            </button>

            {/* 3D Cosmic Alert Showcase Launcher */}
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('alert') : (window.location.pathname = '/alert')}
              style={{
                width: '100%',
                padding: '11px 16px',
                marginTop: 12,
                borderRadius: 12,
                background: 'rgba(255, 107, 53, 0.12)',
                border: '1px solid rgba(255, 107, 53, 0.35)',
                color: '#FF6B35',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <span>🌌 Preview 3D Cosmic Disconnect Alert Studio</span>
            </button>

            {/* Inside-Card Platform Badge */}
            <div style={styles.cardPlatformBadge}>
              <Shield size={13} color="#00ffb2" />
              <span>Multi-Tenant Messaging Platform • v2.0 Universal</span>
            </div>

            {/* Auxiliary Options (Forgot Password, API Docs, Support) */}
            <div style={styles.auxLinksRow}>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={styles.auxLink}
              >
                Forgot Password?
              </button>
              <span style={styles.auxLinkDot}>•</span>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                style={styles.auxLink}
              >
                Support
              </button>
            </div>
          </form>
        </div>
      </div>



      {/* ── Modal: Support ────────────────────────────────────────────── */}
      {showSupportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSupportModal(false)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HelpCircle size={20} color="#00ffb2" />
                <h3 style={styles.modalTitle}>Chat Pro System Support</h3>
              </div>
              <button style={styles.closeBtn} onClick={() => setShowSupportModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.6 }}>
                For account recovery, license allocation, or container gateway assistance:
              </p>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 14, borderRadius: 8, marginTop: 10 }}>
                <div style={{ color: '#e2e8f0', fontSize: 13, marginBottom: 6 }}>
                  📧 Technical Helpdesk: <strong style={{ color: '#00ffb2' }}>support@chat-pro.internal</strong>
                </div>
                <div style={{ color: '#e2e8f0', fontSize: 13 }}>
                  🛡️ Platform Identifier: <strong style={{ color: '#34d399' }}>KR-ENTERPRISE-PRO-V2</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Forgot Password ────────────────────────────────────── */}
      {showForgotModal && (
        <div style={styles.modalOverlay} onClick={() => setShowForgotModal(false)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={20} color="#00ffb2" />
                <h3 style={styles.modalTitle}>Password Recovery</h3>
              </div>
              <button style={styles.closeBtn} onClick={() => setShowForgotModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={styles.modalBody}>
              {resetMsg && <div style={{ color: '#00ffb2', marginBottom: 10, fontSize: 13 }}>{resetMsg}</div>}
              {resetErr && <div style={{ color: '#ef4444', marginBottom: 10, fontSize: 13 }}>{resetErr}</div>}
              
              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {resetStep === 1 ? (
                  <>
                    <p style={{ color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                      Enter your username or email to request a password reset.
                    </p>
                    <input
                      type="text"
                      placeholder="Username or Email"
                      value={resetIdentity}
                      onChange={(e) => setResetIdentity(e.target.value)}
                      style={{ ...styles.input, padding: '10px 14px' }}
                      required
                    />
                    <button type="submit" style={{ ...styles.submitBtn, padding: '10px' }}>Request Reset</button>
                  </>
                ) : (
                  <>
                    <p style={{ color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                      Enter the token generated by the server and your new password.
                    </p>
                    <input
                      type="text"
                      placeholder="Reset Token"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      style={{ ...styles.input, padding: '10px 14px' }}
                      required
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      value={resetNewPass}
                      onChange={(e) => setResetNewPass(e.target.value)}
                      style={{ ...styles.input, padding: '10px 14px' }}
                      required
                    />
                    <button type="submit" style={{ ...styles.submitBtn, padding: '10px' }}>Update Password</button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#020a08',
    backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(3, 18, 14, 0.3) 0%, rgba(2, 9, 7, 0.8) 100%), url(/login-bg.png)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'auto',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: '#e2e8f0',
    boxSizing: 'border-box',
    padding: '24px 16px',
  },
  topRightBadge: {
    position: 'absolute',
    top: 24,
    right: 32,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 16px',
    borderRadius: 9999,
    background: 'rgba(4, 22, 17, 0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(0, 255, 178, 0.35)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    fontSize: 12,
    fontWeight: 500,
    color: '#e2e8f0',
    letterSpacing: '0.4px',
    zIndex: 20,
  },
  cardContainer: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 494,
  },
  glassCard: {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(4, 20, 16, 0.94)',
    backdropFilter: 'blur(36px)',
    WebkitBackdropFilter: 'blur(36px)',
    borderRadius: 28,
    border: '1.5px solid rgba(0, 255, 178, 0.42)',
    boxShadow: '0 0 45px rgba(0, 255, 178, 0.2), 0 25px 65px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    padding: '34px 36px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  shieldEmblem: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'linear-gradient(135deg, rgba(0, 210, 147, 0.28) 0%, rgba(0, 255, 178, 0.16) 100%)',
    border: '1.5px solid rgba(0, 255, 178, 0.7)',
    boxShadow: '0 0 22px rgba(0, 255, 178, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headingArea: {
    textAlign: 'center',
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.5px',
    lineHeight: 1.15,
  },
  titleHighlight: {
    color: '#00ffb2',
    textShadow: '0 0 20px rgba(0, 255, 178, 0.65)',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#cbd5e1',
    letterSpacing: '0.2px',
  },
  description: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.5,
    maxWidth: 350,
    margin: '6px auto 0',
  },
  roleTabsWrap: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(2, 14, 11, 0.85)',
    border: '1px solid rgba(0, 255, 178, 0.22)',
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginBottom: 18,
    boxSizing: 'border-box',
  },
  roleTab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '9px 14px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: '#8696a0',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  roleTabActiveSuper: {
    background: 'rgba(245, 158, 11, 0.16)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    color: '#fbbf24',
    boxShadow: '0 2px 14px rgba(245, 158, 11, 0.25)',
  },
  roleTabActiveAdmin: {
    background: 'rgba(0, 255, 178, 0.16)',
    border: '1px solid rgba(0, 255, 178, 0.45)',
    color: '#00ffb2',
    boxShadow: '0 2px 14px rgba(0, 255, 178, 0.25)',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(2, 14, 11, 0.8)',
    border: '1.5px solid rgba(0, 255, 178, 0.22)',
    borderRadius: 14,
    height: 48,
    padding: '0 16px',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  inputIcon: {
    color: '#64748b',
    flexShrink: 0,
    marginRight: 12,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
  },
  eyeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    opacity: 0.8,
    transition: 'opacity 0.15s ease',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(239, 68, 68, 0.14)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#f87171',
    fontSize: 12.5,
  },
  submitBtn: {
    marginTop: 2,
    width: '100%',
    height: 48,
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(90deg, #00d293 0%, #00ffb2 100%)',
    color: '#021a12',
    fontWeight: 700,
    fontSize: 14.5,
    cursor: 'pointer',
    boxShadow: '0 0 26px rgba(0, 255, 178, 0.4), 0 4px 14px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    letterSpacing: '0.2px',
  },
  spinnerWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#021a12',
    fontSize: 13.5,
    fontWeight: 600,
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2.5px solid rgba(2, 26, 18, 0.25)',
    borderTopColor: '#021a12',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  cardPlatformBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: 500,
  },
  auxLinksRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  auxLink: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: 11.5,
    cursor: 'pointer',
    transition: 'color 0.15s ease',
    padding: '2px 4px',
  },
  auxLinkDot: {
    color: '#334155',
    fontSize: 11,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 8, 6, 0.78)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modalCard: {
    background: 'rgba(8, 28, 22, 0.95)',
    border: '1.5px solid rgba(0, 255, 178, 0.35)',
    borderRadius: 18,
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 255, 178, 0.15)',
    width: '100%',
    maxWidth: 460,
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: '#ffffff',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  modalBody: {
    padding: 20,
  },
  codeSnippet: {
    background: 'rgba(3, 16, 12, 0.9)',
    border: '1px solid rgba(0, 255, 178, 0.18)',
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 10,
  },
};
