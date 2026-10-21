import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Smartphone, UserX, Copy, Check, Radio, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import { getSocket, api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { soundEffects } from '../../utils/soundEffects';
import { NetworkDisconnect3DAlert, DisconnectedAccountDetail } from './NetworkDisconnect3DAlert';
import { useAccountStore } from '../../stores';
import { safeCopyToClipboard } from '../../utils/clipboard';

export interface DisconnectedItem {
  id: string;
  personName: string;
  accountName?: string;
  phoneNumber?: string;
  type: 'user' | 'account';
  message?: string;
  disconnectedAt: number;
  disconnectedBy?: string;
  reason?: string;
  isExiting?: boolean;
  exitReason?: 'reconnect' | 'remove';
}

export const DisconnectionAlertCenter: React.FC = () => {
  const { addToast } = useToast();
  const [alerts, setAlerts] = useState<DisconnectedItem[]>([]);
  const [isNetworkOffline, setIsNetworkOffline] = useState(!navigator.onLine);
  const [selected3DAlert, setSelected3DAlert] = useState<DisconnectedItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Keep a ref of alerts for use in async / store callbacks without stale closure
  const alertsRef = useRef<DisconnectedItem[]>([]);
  alertsRef.current = alerts;

  // ── Live ticker: re-renders every 1s so elapsed times update live ──
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Format exact timestamp & relative time ──
  const formatExactTime = (ts: number): string => {
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return new Date().toLocaleTimeString();
    }
  };

  const formatElapsedTime = (ts: number): string => {
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    if (m < 60) return `${m}m ${s}s ago`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ago`;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // AUTOMATIC CLOSING LOGIC (STRICT ENFORCEMENT)
  // Reconnect or Remove → Automatically close & remove alert from dashboard
  // ════════════════════════════════════════════════════════════════════════════
  const triggerAutoClose = useCallback((accountId: string, reason: 'reconnect' | 'remove') => {
    const currentAlerts = alertsRef.current;
    const target = currentAlerts.find(a => a.id === accountId);
    if (!target || target.isExiting) return;

    // 1. Mark alert as exiting for smooth collapse micro-animation
    setAlerts(prev =>
      prev.map(a => (a.id === accountId ? { ...a, isExiting: true, exitReason: reason } : a))
    );

    // 2. If the 3D cinematic modal was open for this account, auto-close it immediately!
    setSelected3DAlert(prev => (prev?.id === accountId ? null : prev));

    // 3. Audio & Toast feedback
    const displayName = target.accountName || target.personName || 'Account';
    if (reason === 'reconnect') {
      soundEffects.playReconnectedChime();
      addToast('success', `${displayName} reconnected: alert automatically closed`);
    } else {
      soundEffects.playPopSound();
      addToast('info', `${displayName} removed from system: alert cleared`);
    }

    // 4. Remove entirely from state after smooth transition
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== accountId));
    }, 400);
  }, [addToast]);

  // ════════════════════════════════════════════════════════════════════════════
  // DASHBOARD ALERT GENERATION (STRICT ENFORCEMENT)
  // When any account disconnects, immediately generate live alert on dashboard
  // with: Name, Number, Disconnected Time
  // ════════════════════════════════════════════════════════════════════════════
  const registerDisconnection = useCallback((item: Partial<DisconnectedItem> & { id: string }) => {
    if (!item.id) return;

    // Look up existing account metadata from store if phone or name is missing
    const storeAccounts = useAccountStore.getState().accounts;
    const matchedAccount = storeAccounts.find(a => a.id === item.id);

    const effectiveName =
      item.accountName ||
      item.personName ||
      matchedAccount?.displayName ||
      `Account (${item.id.slice(0, 8)})`;

    const effectiveNumber =
      item.phoneNumber ||
      matchedAccount?.phoneNumber ||
      (matchedAccount as any)?.number ||
      item.id;

    const effectiveTime = item.disconnectedAt || Date.now();

    const newAlert: DisconnectedItem = {
      id: item.id,
      personName: effectiveName,
      accountName: effectiveName,
      phoneNumber: effectiveNumber,
      type: item.type || 'account',
      message: item.message || `${effectiveName} disconnected`,
      disconnectedAt: effectiveTime,
      disconnectedBy: item.disconnectedBy || 'Session Disconnected',
      reason: item.reason || 'Network / Session Terminated',
      isExiting: false,
    };

    setAlerts(prev => {
      // Check if already in list
      const existing = prev.find(a => a.id === item.id);
      if (existing) {
        // Update details and cancel exiting if re-triggered
        return prev.map(a => (a.id === item.id ? { ...a, ...newAlert, isExiting: false } : a));
      }
      return [newAlert, ...prev];
    });

    // Play cosmic alert sound effect
    soundEffects.playCosmicDisconnectAlert();
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // 1. Browser-level network offline detection
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const goOffline = () => {
      setIsNetworkOffline(true);
      soundEffects.playCosmicDisconnectAlert();
    };
    const goOnline = () => {
      setIsNetworkOffline(false);
      addToast('success', '🟢 Network connection restored');
    };

    // Dev shortcut: Ctrl+Shift+D to toggle test 3D Alert
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (alertsRef.current.length > 0) {
          setSelected3DAlert(prev => (prev ? null : alertsRef.current[0]));
        } else {
          setIsNetworkOffline(prev => {
            const next = !prev;
            if (next) soundEffects.playCosmicDisconnectAlert();
            return next;
          });
        }
      }
    };

    const handleOpen3DAlert = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setSelected3DAlert({
          id: customEvent.detail.id || 'custom',
          personName: customEvent.detail.name || 'Account',
          accountName: customEvent.detail.name || 'Account',
          phoneNumber: customEvent.detail.number || customEvent.detail.phoneNumber || '',
          type: 'account',
          disconnectedAt: customEvent.detail.disconnectedAt || Date.now(),
        });
      } else if (alertsRef.current.length > 0) {
        setSelected3DAlert(alertsRef.current[0]);
      } else {
        setIsNetworkOffline(true);
      }
      soundEffects.playCosmicDisconnectAlert();
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-3d-alert', handleOpen3DAlert);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-3d-alert', handleOpen3DAlert);
    };
  }, [addToast]);

  // ════════════════════════════════════════════════════════════════════════════
  // 2. Initial load: Fetch currently active disconnections from backend
  // ════════════════════════════════════════════════════════════════════════════
  const fetchActiveDisconnections = useCallback(() => {
    api.get<DisconnectedItem[]>('/auth/disconnections')
      .then(res => {
        if (Array.isArray(res.data)) {
          // If any alert was in alerts list but is NOT in active list from backend,
          // check if it reconnected or was removed
          const backendIds = new Set(res.data.map(d => d.id));
          alertsRef.current.forEach(current => {
            if (!backendIds.has(current.id) && !current.isExiting) {
              triggerAutoClose(current.id, 'reconnect');
            }
          });

          // Register all active disconnections from backend
          res.data.forEach(d => {
            registerDisconnection(d);
          });
        }
      })
      .catch(() => null);
  }, [registerDisconnection, triggerAutoClose]);

  useEffect(() => {
    fetchActiveDisconnections();

    // Background poller: periodically check active disconnections as a fallback (every 45s)
    const poller = setInterval(fetchActiveDisconnections, 45000);
    return () => clearInterval(poller);
  }, [fetchActiveDisconnections]);

  // ════════════════════════════════════════════════════════════════════════════
  // 3. Real-Time WebSocket Event Listeners
  // Continuously monitors Reconnect, Remove, and Disconnect events
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const socket = getSocket('default-tenant');
    if (!socket) return;

    // Disconnection Broadcasts
    const handleDisconnectionAlert = (data: DisconnectedItem) => {
      registerDisconnection(data);
    };

    // Reconnection / Resolution Broadcasts
    const handleReconnectionAlert = (data: { id: string; action?: string; removed?: boolean }) => {
      if (data?.id) {
        const isRemoval = data.action === 'remove' || !!data.removed;
        triggerAutoClose(data.id, isRemoval ? 'remove' : 'reconnect');
      }
    };

    // Account Status Broadcasts
    const handleAccountStatus = (data: { accountId: string; status: string; phoneNumber?: string; displayName?: string; isPairing?: boolean }) => {
      if (!data?.accountId) return;
      if (data.status === 'CONNECTED') {
        triggerAutoClose(data.accountId, 'reconnect');
      } else if (data.status === 'DISCONNECTED' && !data.isPairing) {
        registerDisconnection({
          id: data.accountId,
          accountName: data.displayName,
          phoneNumber: data.phoneNumber,
          type: 'account',
          disconnectedAt: Date.now(),
        });
      }
    };

    // Baileys Connection Update Broadcasts
    const handleConnectionUpdate = (data: { accountId?: string; status: string; phoneNumber?: string; displayName?: string; isPairing?: boolean }) => {
      if (!data?.accountId) return;
      if (data.status === 'connected') {
        triggerAutoClose(data.accountId, 'reconnect');
      } else if (data.status === 'disconnected' && !data.isPairing) {
        registerDisconnection({
          id: data.accountId,
          accountName: data.displayName,
          phoneNumber: data.phoneNumber,
          type: 'account',
          disconnectedAt: Date.now(),
        });
      }
    };

    // Account Removal Broadcasts
    const handleAccountRemoved = (data: { accountId: string }) => {
      if (data?.accountId) {
        triggerAutoClose(data.accountId, 'remove');
      }
    };

    socket.on('admin:disconnection_alert', handleDisconnectionAlert);
    socket.on('admin:reconnection_alert', handleReconnectionAlert);
    socket.on('account:status', handleAccountStatus);
    socket.on('connection.update', handleConnectionUpdate);
    socket.on('account:removed', handleAccountRemoved);
    socket.on('account:deleted', handleAccountRemoved);

    return () => {
      socket.off('admin:disconnection_alert', handleDisconnectionAlert);
      socket.off('admin:reconnection_alert', handleReconnectionAlert);
      socket.off('account:status', handleAccountStatus);
      socket.off('connection.update', handleConnectionUpdate);
      socket.off('account:removed', handleAccountRemoved);
      socket.off('account:deleted', handleAccountRemoved);
    };
  }, [registerDisconnection, triggerAutoClose]);

  // ════════════════════════════════════════════════════════════════════════════
  // 4. Continuous Store Monitoring (Zustand useAccountStore)
  // Auto-closes alert if account reconnects or is deleted from store
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const unsubscribe = useAccountStore.subscribe(state => {
      const activeAlerts = alertsRef.current;
      if (activeAlerts.length === 0) return;

      const storeAccounts = state.accounts;
      if (!Array.isArray(storeAccounts)) return;

      activeAlerts.forEach(alert => {
        if (alert.isExiting) return;

        const found = storeAccounts.find(a => a.id === alert.id);
        if (found) {
          // If account is now CONNECTED in store, auto-close!
          if (found.status === 'CONNECTED') {
            triggerAutoClose(alert.id, 'reconnect');
          }
        } else if (storeAccounts.length > 0 && alert.type === 'account') {
          // Account was removed entirely from the system!
          triggerAutoClose(alert.id, 'remove');
        }
      });
    });

    return () => unsubscribe();
  }, [triggerAutoClose]);

  // Copy account number helper
  const handleCopy = async (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
      addToast('info', 'Account number copied to clipboard');
    }
  };

  const handleNetworkRetry = useCallback(() => {
    fetch('/api/health', { method: 'HEAD', cache: 'no-cache' })
      .then(() => {
        setIsNetworkOffline(false);
        addToast('success', 'Network connection restored');
      })
      .catch(() => {
        addToast('warning', 'Still offline: retrying...');
      });
  }, [addToast]);

  const activeAlerts = alerts.filter(a => !a.isExiting);
  const hasAlerts = activeAlerts.length > 0;

  // Render 3D detail payload if modal is open for an account
  const modal3DDetails: DisconnectedAccountDetail | null = selected3DAlert
    ? {
        id: selected3DAlert.id,
        name: selected3DAlert.accountName || selected3DAlert.personName,
        number: selected3DAlert.phoneNumber || selected3DAlert.id,
        disconnectedTime: formatExactTime(selected3DAlert.disconnectedAt),
        rawTimestamp: selected3DAlert.disconnectedAt,
        reason: selected3DAlert.reason || selected3DAlert.disconnectedBy,
      }
    : null;

  return (
    <>
      {/* ── CSS Keyframe Animations for 3D Holographic Alert & Transitions ── */}
      <style>{`
        @keyframes alert3DEntrance {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.92) perspective(600px) rotateX(12deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) perspective(600px) rotateX(0deg);
          }
        }
        @keyframes alert3DExit {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(0.88);
            filter: blur(8px);
          }
        }
        @keyframes radarBeaconPulse {
          0% {
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            transform: scale(1.15);
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        @keyframes glowBorderBlink {
          0%, 100% {
            border-color: rgba(239, 68, 68, 0.5);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(239, 68, 68, 0.25);
          }
          50% {
            border-color: rgba(255, 107, 53, 0.9);
            box-shadow: 0 12px 45px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 107, 53, 0.45);
          }
        }
        @keyframes scanlineSweep {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
      `}</style>

      {/* ── Cinematic 3D Disconnection Alert Overlay ── */}
      {/* Shown for network disconnection OR when inspecting an account via 3D */}
      <NetworkDisconnect3DAlert
        visible={isNetworkOffline || !!selected3DAlert}
        onRetry={handleNetworkRetry}
        onDismiss={() => {
          setIsNetworkOffline(false);
          setSelected3DAlert(null);
        }}
        title={selected3DAlert ? 'ACCOUNT DISCONNECTED' : 'CONNECTION DRIFTING...'}
        description={
          selected3DAlert
            ? `The live connection for this account was severed. System is continuously monitoring for auto-reconnection or removal.`
            : "Your network signal has been lost in the void. We're attempting to re-establish your connection."
        }
        accountDetails={modal3DDetails}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          LIVE DASHBOARD DISCONNECTION ALERT STACK
          Strictly displays:
            - Name: The name of the disconnected account
            - Number: The unique account number
            - Disconnected Time: The exact timestamp when disconnection happened
          Automatically disappears on Reconnect or Remove.
         ════════════════════════════════════════════════════════════════════════ */}
      {hasAlerts && (
        <div
          id="dashboard-disconnection-alert-center"
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: '100%',
            maxWidth: 420,
            pointerEvents: 'none',
          }}
        >
          {alerts.map(alert => {
            const isExiting = alert.isExiting;
            const exitReason = alert.exitReason;
            const accountName = alert.accountName || alert.personName;
            const accountNumber = alert.phoneNumber || alert.id;
            const disconnectedTimeStr = formatExactTime(alert.disconnectedAt);
            const elapsedTimeStr = formatElapsedTime(alert.disconnectedAt);

            return (
              <div
                key={alert.id}
                style={{
                  pointerEvents: 'auto',
                  position: 'relative',
                  background: 'linear-gradient(145deg, rgba(14, 18, 28, 0.96) 0%, rgba(9, 12, 20, 0.98) 100%)',
                  backdropFilter: 'blur(20px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                  border: isExiting
                    ? exitReason === 'reconnect'
                      ? '1.5px solid #22c55e'
                      : '1.5px solid #94a3b8'
                    : '1.5px solid rgba(239, 68, 68, 0.65)',
                  borderRadius: 18,
                  padding: '18px 20px',
                  boxShadow: isExiting
                    ? '0 10px 40px rgba(0, 0, 0, 0.8)'
                    : '0 14px 45px rgba(0, 0, 0, 0.75), 0 0 25px rgba(239, 68, 68, 0.25)',
                  animation: isExiting
                    ? 'alert3DExit 0.38s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                    : 'alert3DEntrance 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), glowBorderBlink 3.5s ease-in-out infinite',
                  overflow: 'hidden',
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                }}
              >
                {/* Holographic animated scanline */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, rgba(255, 107, 53, 0.8), transparent)',
                    animation: 'scanlineSweep 3s linear infinite',
                    pointerEvents: 'none',
                    opacity: 0.6,
                  }}
                />

                {/* ─── Header: 3D Alert Indicator + Auto-Closing Telemetry Pill ─── */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                    paddingBottom: 10,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div
                      style={{
                        position: 'relative',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#ef4444',
                          animation: 'radarBeaconPulse 1.8s infinite',
                        }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          color: '#f87171',
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>3D Disconnection Alert</span>
                      </div>
                    </div>
                  </div>

                  {/* Live relative ticker */}
                  <div
                    style={{
                      fontSize: 10.5,
                      color: '#fca5a5',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ⏱️ {elapsedTimeStr}
                  </div>
                </div>

                {/* ════════════════════════════════════════════════════════════
                    THE 3 REQUIRED DETAILS
                    1. Name: The name of the disconnected account
                    2. Number: The unique account number
                    3. Disconnected Time: The exact timestamp
                   ════════════════════════════════════════════════════════════ */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {/* Detail 1: NAME */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        minWidth: 50,
                      }}
                    >
                      Name:
                    </span>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: '#f1f5f9',
                        textAlign: 'right',
                        wordBreak: 'break-word',
                        flex: 1,
                      }}
                    >
                      {accountName}
                    </span>
                  </div>

                  {/* Detail 2: NUMBER */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        minWidth: 50,
                      }}
                    >
                      Number:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#38bdf8',
                          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                          background: 'rgba(56, 189, 248, 0.1)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {accountNumber}
                      </span>
                      <button
                        onClick={e => handleCopy(alert.id, accountNumber, e)}
                        title="Copy account number"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: copiedId === alert.id ? '#22c55e' : '#94a3b8',
                          cursor: 'pointer',
                          padding: 3,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {copiedId === alert.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Detail 3: DISCONNECTED TIME */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        minWidth: 120,
                        flexShrink: 0,
                      }}
                    >
                      Disconnected Time:
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fca5a5',
                        fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                        textAlign: 'right',
                        wordBreak: 'break-word',
                      }}
                    >
                      {disconnectedTimeStr}
                    </span>
                  </div>
                </div>

                {/* ─── Footer: Automatic Lifecycle Indicator & 3D Cosmic View ─── */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 12,
                    paddingTop: 10,
                    gap: 8,
                  }}
                >
                  {/* Status Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Radio size={12} color="#f97316" style={{ animation: 'radarBeaconPulse 1.5s infinite' }} />
                    <span
                      style={{
                        fontSize: 10.5,
                        color: '#cbd5e1',
                        fontWeight: 600,
                        letterSpacing: '0.2px',
                      }}
                    >
                      Auto-closes on reconnect or remove
                    </span>
                  </div>

                  {/* Launch 3D Cosmic Alert Canvas */}
                  <button
                    onClick={() => {
                      setSelected3DAlert(alert);
                      soundEffects.playCosmicDisconnectAlert();
                    }}
                    title="Launch 3D WebGL Cosmic Disconnection Scene"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.25), rgba(239, 68, 68, 0.2))',
                      border: '1px solid rgba(255, 107, 53, 0.45)',
                      borderRadius: 8,
                      padding: '5px 10px',
                      color: '#ffedd5',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.4), rgba(239, 68, 68, 0.35))';
                      e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.8)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.25), rgba(239, 68, 68, 0.2))';
                      e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.45)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <Sparkles size={11} color="#ffaa40" />
                    <span>3D View</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
