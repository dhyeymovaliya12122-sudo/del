import React, { useState, useEffect, useCallback } from 'react';
import { NetworkDisconnect3DAlert } from '../components/common/NetworkDisconnect3DAlert';
import { soundEffects } from '../utils/soundEffects';
import { Zap, Volume2, VolumeX, RotateCcw, ArrowLeft, Shield, Sliders, CheckCircle2, Sparkles, Layers } from 'lucide-react';

interface AlertDemoPageProps {
  onExit?: () => void;
}

export const AlertDemoPage: React.FC<AlertDemoPageProps> = ({ onExit }) => {
  const [alertVisible, setAlertVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(!soundEffects.getMuted());
  const [reconnectState, setReconnectState] = useState<'idle' | 'seeking' | 'restored'>('idle');
  const [dockMinimized, setDockMinimized] = useState(false);
  const [glitchKey, setGlitchKey] = useState(0);

  // Play initial cosmic disconnect sound on entrance
  useEffect(() => {
    soundEffects.playCosmicDisconnectAlert();
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.setMuted(!next);
    if (next) {
      soundEffects.playPopSound();
    }
  };

  const handleTriggerGlitch = () => {
    soundEffects.playGlitchStatic();
    setGlitchKey(prev => prev + 1);
    // Dispatch offline event or trigger glitch
    const alertEl = document.getElementById('nd3d-card');
    if (alertEl) {
      alertEl.style.animation = 'none';
      void alertEl.offsetWidth; // reflow
      alertEl.style.animation = 'nd3d-glitch-shake 0.5s ease-in-out';
    }
  };

  const handleSimulateRetry = useCallback(() => {
    setReconnectState('seeking');
    soundEffects.playPopSound();

    setTimeout(() => {
      setReconnectState('restored');
      soundEffects.playReconnectedChime();

      setTimeout(() => {
        setReconnectState('idle');
      }, 3500);
    }, 2000);
  }, []);

  const handleExit = () => {
    if (onExit) {
      onExit();
    } else {
      window.location.pathname = '/';
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleExit();
      } else if (e.key === 'g' || e.key === 'G') {
        if (!e.ctrlKey && !e.metaKey) {
          handleTriggerGlitch();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey) {
          handleSimulateRetry();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSimulateRetry]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#101216' }}>
      {/* ── 3D Cosmic Alert Component ── */}
      <NetworkDisconnect3DAlert
        key={glitchKey}
        visible={alertVisible}
        onRetry={handleSimulateRetry}
        onDismiss={handleExit}
        title={reconnectState === 'restored' ? 'SIGNAL RESTORED!' : 'CONNECTION DRIFTING...'}
        description={
          reconnectState === 'seeking'
            ? 'Transmitting quantum pulse to satellite relay... Aligning solar sub-arrays...'
            : reconnectState === 'restored'
            ? 'Orbital uplink restored! High-speed Messaging Engine connection active.'
            : "Your network signal has drifted into the void. The satellite link has been severed and we're attempting to re-establish your connection."
        }
      />

      {/* ── Floating Top Studio Bar ── */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 18px',
          background: 'rgba(22, 24, 34, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 107, 53, 0.45)',
          borderRadius: 40,
          boxShadow: '0 20px 45px rgba(0,0,0,0.65), 0 0 35px rgba(239, 68, 68, 0.28)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: reconnectState === 'restored' ? '#22c55e' : '#EF4444',
              boxShadow: `0 0 12px ${reconnectState === 'restored' ? '#22c55e' : '#EF4444'}`,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#FFF1F2',
              textTransform: 'uppercase',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            3D Cosmic Alert Studio
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />

        {/* Action: Trigger Glitch */}
        <button
          onClick={handleTriggerGlitch}
          className="btn-3d-elastic"
          title="Trigger Chromatic Glitch Shockwave (Press G)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: '#FF6B35',
            background: 'rgba(255, 107, 53, 0.15)',
            border: '1px solid rgba(255, 107, 53, 0.45)',
            borderRadius: 20,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(255, 107, 53, 0.2)',
          }}
        >
          <Zap size={14} color="#FF6B35" />
          <span>Glitch FX</span>
        </button>

        {/* Action: Sound Toggle */}
        <button
          onClick={handleToggleSound}
          className="btn-3d-elastic"
          title={soundEnabled ? 'Mute Audio' : 'Enable Space Sound FX'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: soundEnabled ? '#FFD166' : '#94A3B8',
            background: soundEnabled ? 'rgba(255, 209, 102, 0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${soundEnabled ? 'rgba(255, 209, 102, 0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 20,
            cursor: 'pointer',
          }}
        >
          {soundEnabled ? <Volume2 size={14} color="#FFD166" /> : <VolumeX size={14} />}
          <span>{soundEnabled ? 'Audio ON' : 'Muted'}</span>
        </button>

        {/* Action: Return */}
        <button
          onClick={handleExit}
          className="btn-3d-elastic shine-3d-sheen"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 800,
            color: '#FFFFFF',
            background: 'linear-gradient(135deg, #EF4444 0%, #FF6B35 100%)',
            border: 'none',
            borderRadius: 20,
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(239, 68, 68, 0.45)',
          }}
        >
          <ArrowLeft size={14} />
          <span>Exit Studio</span>
        </button>
      </div>

      {/* ── Bottom Feature Pill ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '8px 20px',
          background: 'rgba(11, 15, 25, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 30,
          fontSize: 11.5,
          color: '#94A3B8',
          fontFamily: "'Inter', system-ui, sans-serif",
          pointerEvents: 'none',
        }}
      >
        <span>✦ WebGL Procedural Shaders</span>
        <span>•</span>
        <span>220 Parallax Stars</span>
        <span>•</span>
        <span>Electric Arc Physics</span>
        <span>•</span>
        <span>Toggle: <strong style={{ color: '#F1F5F9' }}>Ctrl + Shift + D</strong></span>
      </div>
    </div>
  );
};

export default AlertDemoPage;
