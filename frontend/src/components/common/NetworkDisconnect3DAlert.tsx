import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, X, ShieldAlert, Clock, Phone, AlertTriangle } from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

export interface DisconnectedAccountDetail {
  id?: string;
  name: string;
  number: string;
  disconnectedTime: string;
  rawTimestamp?: number;
  reason?: string;
}

interface Props {
  visible: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  title?: string;
  description?: string;
  accountDetails?: DisconnectedAccountDetail | null;
}

export const NetworkDisconnect3DAlert: React.FC<Props> = ({
  visible,
  onRetry,
  onDismiss,
  title = 'CONNECTION DISCONNECTED',
  description = 'Your companion socket has disconnected. We are attempting to re-establish the connection.',
  accountDetails,
}) => {
  const [retrying, setRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    setAttempts(a => a + 1);
    soundEffects.playPopSound();
    try {
      if (onRetry) await onRetry();
    } finally {
      setTimeout(() => setRetrying(false), 2000);
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <div
      id="network-disconnect-alert"
      role="alertdialog"
      aria-modal="true"
      aria-label="Network disconnected"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(6, 9, 17, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 500,
          background: '#0d131f',
          border: '1px solid rgba(255, 107, 53, 0.35)',
          borderRadius: 20,
          padding: '36px 32px 32px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(255, 107, 53, 0.15)',
        }}
      >
        {/* Close Button */}
        {onDismiss && (
          <button
            onClick={() => {
              soundEffects.playPopSound();
              onDismiss();
            }}
            style={{
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
              color: '#94A3B8',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            title="Dismiss alert"
          >
            <X size={16} />
          </button>
        )}

        {/* Status Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'rgba(255, 107, 53, 0.15)',
              border: '1px solid rgba(255, 107, 53, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF6B35',
              flexShrink: 0,
            }}
          >
            <WifiOff size={26} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#FF6B35', textTransform: 'uppercase' }}>
              Connection Lost
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>
              {title}
            </h2>
          </div>
        </div>

        {/* Description */}
        <p style={{ margin: '0 0 20px', fontSize: 13.5, lineHeight: 1.55, color: '#94A3B8' }}>
          {description}
        </p>

        {/* Account Details Badge if available */}
        {accountDetails && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 20,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#F1F5F9' }}>
              <Phone size={13} style={{ color: '#25D366' }} />
              <span style={{ fontWeight: 600 }}>{accountDetails.name || 'Account'}</span>
            </div>
            <div style={{ textAlign: 'right', color: '#94A3B8' }}>
              +{accountDetails.number.replace(/\D/g, '')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#94A3B8' }}>
              <Clock size={13} />
              <span>Duration: {fmtTime(elapsed)}</span>
            </div>
            <div style={{ textAlign: 'right', color: '#FF6B35', fontWeight: 600 }}>
              Attempts: {attempts}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={handleRetry}
            disabled={retrying}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 10,
              background: '#FF6B35',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 13.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: retrying ? 'not-allowed' : 'pointer',
              opacity: retrying ? 0.75 : 1,
              transition: 'background 0.2s',
            }}
          >
            <RefreshCw size={15} className={retrying ? 'wa-spinning' : ''} />
            <span>{retrying ? 'Reconnecting...' : 'Reconnect Now'}</span>
          </button>

          {onDismiss && (
            <button
              onClick={() => {
                soundEffects.playPopSound();
                onDismiss();
              }}
              style={{
                padding: '12px 20px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#CBD5E1',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkDisconnect3DAlert;
