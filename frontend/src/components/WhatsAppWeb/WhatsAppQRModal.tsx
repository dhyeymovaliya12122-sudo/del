import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Loader2, CheckCircle2, QrCode, Smartphone, RefreshCw,
  User, Copy, Check, Shield, Laptop, Monitor, Link2, Zap, ArrowRight,
} from 'lucide-react';
import { getSocket, accountsApi, whatsappWebApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useUIStore } from '../../stores';
import { safeCopyToClipboard } from '../../utils/clipboard';

interface WhatsAppQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  accountId: string;
  isConnected: boolean;
  phoneNumber?: string;
  onSuccess: () => void;
}

const QR_TIMEOUT_MS = 30000; // 30 seconds to wait for QR before showing timeout error

export default function WhatsAppQRModal({
  isOpen,
  onClose,
  tenantId,
  accountId,
  isConnected,
  phoneNumber,
  onSuccess,
}: WhatsAppQRModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [connected, setConnected] = useState(isConnected);
  const [loading, setLoading] = useState(false);
  const [showNewQR, setShowNewQR] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const displayPhone = phoneNumber ? (phoneNumber.startsWith('pending_') || phoneNumber.startsWith('unlinked_') ? 'Pending QR Scan' : phoneNumber) : 'Pending QR Scan';

  const handleCopyPhone = async () => {
    await safeCopyToClipboard(displayPhone);
    setCopied(true);
    addToast('success', `Copied active account ${displayPhone} to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  // Track whether we are actively waiting for a QR — suppresses transient disconnect noise
  const waitingForQR = useRef(false);
  const qrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearQRTimeout = () => {
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
  };

  // Re-sync connected state whenever the prop changes (but only when not actively scanning)
  useEffect(() => {
    if (!waitingForQR.current) {
      setConnected(isConnected);
    }
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearQRTimeout();
  }, []);

  // On open: check live API status, then decide whether to auto-start QR
  useEffect(() => {
    if (!isOpen) {
      setQrCodeUrl('');
      setShowNewQR(false);
      setLoading(false);
      setError('');
      waitingForQR.current = false;
      clearQRTimeout();
      return;
    }

    // Ensure socket is subscribed to this account's room immediately
    getSocket(tenantId, accountId);

    // Fetch fresh account status from REST to avoid stale prop
    accountsApi.list().then(accounts => {
      const acc = accounts.find(a => a.id === accountId);
      const isUnlinked = acc?.phoneNumber?.startsWith('unlinked_') || acc?.phoneNumber?.startsWith('pending_');
      const isAccConnected = acc?.status === 'CONNECTED' && !isUnlinked;
      setConnected(isAccConnected);

      if (!isAccConnected) {
        // First check if a live QR is already available
        whatsappWebApi.getQR(accountId).then(res => {
          if (res?.qrCodeDataUrl) {
            setQrCodeUrl(res.qrCodeDataUrl);
            setLoading(false);
            setShowNewQR(true);
          } else {
            startQRFlow(false);
          }
        }).catch(() => {
          startQRFlow(false);
        });
      }
      // If connected, just show the "already connected" view — no QR needed
    }).catch(() => {
      const forceQR = phoneNumber?.startsWith('unlinked_') || phoneNumber?.startsWith('pending_') || !isConnected;
      setConnected(!forceQR);
      if (forceQR) {
        startQRFlow(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accountId, tenantId]);

  // Core QR start function
  const startQRFlow = useCallback(async (force: boolean) => {
    setLoading(true);
    setQrCodeUrl('');
    setError('');
    setShowNewQR(true);
    waitingForQR.current = true;
    clearQRTimeout();

    // Set timeout — if no QR arrives in 30s, show an informative message
    qrTimeoutRef.current = setTimeout(() => {
      if (waitingForQR.current && !qrCodeUrl) {
        waitingForQR.current = false;
        setLoading(false);
        setError('QR code timed out. Your account may already be connected on another session, or the server is taking too long to respond. Try clicking "Refresh QR".');
      }
    }, QR_TIMEOUT_MS);

    try {
      const res = await whatsappWebApi.startQR(accountId, force);
      if (res.alreadyConnected) {
        clearQRTimeout();
        waitingForQR.current = false;
        setConnected(true);
        setShowNewQR(false);
        setLoading(false);
        setQrCodeUrl('');
        if (force) addToast('info', 'Account is already connected.');
      } else if (res.qrCodeDataUrl) {
        clearQRTimeout();
        waitingForQR.current = false;
        setQrCodeUrl(res.qrCodeDataUrl);
        setLoading(false);
        setError('');
        setShowNewQR(true);
      }
      // else: QR will arrive via socket — keep spinner until then
    } catch (e: any) {
      clearQRTimeout();
      waitingForQR.current = false;
      const errMsg = e?.response?.data?.message || 'Failed to start QR flow. Please try again.';
      setError(errMsg);
      setLoading(false);
      addToast('error', errMsg);
    }
  }, [accountId, addToast, qrCodeUrl]);

  // Socket listener — always active while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const socket = getSocket(tenantId, accountId);

    const handleQR = (data: { accountId: string; qrCodeDataUrl: string }) => {
      if (data.accountId === accountId || !data.accountId) {
        clearQRTimeout();
        waitingForQR.current = false;
        setQrCodeUrl(data.qrCodeDataUrl);
        setLoading(false);
        setError('');
        setShowNewQR(true);
      }
    };

    const handleConnection = (data: {
      accountId?: string;
      status: string;
      qrCodeDataUrl?: string;
      reason?: number;
      message?: string;
    }) => {
      if (data.status === 'connected') {
        clearQRTimeout();
        waitingForQR.current = false;
        setConnected(true);
        setShowNewQR(false);
        setQrCodeUrl('');
        setLoading(false);
        setError('');
        addToast('success', 'Device connected successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else if (data.status === 'qr' && data.qrCodeDataUrl) {
        // QR arrived via connection.update (backup path)
        clearQRTimeout();
        waitingForQR.current = false;
        setQrCodeUrl(data.qrCodeDataUrl);
        setLoading(false);
        setError('');
        setShowNewQR(true);
      } else if (data.status === 'disconnected') {
        // Only react to disconnect events if we are NOT actively waiting for QR
        // (transient reconnect cycles should not reset the QR display)
        if (!waitingForQR.current) {
          const isQRTimeout = data.reason === 408;
          if (isQRTimeout) {
            // QR expired — start fresh QR automatically
            startQRFlow(false);
          } else {
            setConnected(false);
          }
        }
      } else if (data.status === 'connecting') {
        // Ignore connecting status — don't disrupt active QR display
      }
    };

    socket.on('whatsapp.qr', handleQR);
    socket.on('connection.update', handleConnection);

    return () => {
      socket.off('whatsapp.qr', handleQR);
      socket.off('connection.update', handleConnection);
    };
  }, [isOpen, accountId, tenantId, onSuccess, onClose, addToast, startQRFlow]);

  // Fast polling fallback: query getQR every 1.5s while waiting for QR or connection
  useEffect(() => {
    if (!isOpen || connected || qrCodeUrl) return;

    const interval = setInterval(() => {
      whatsappWebApi.getQR(accountId).then(res => {
        if (res?.qrCodeDataUrl) {
          clearQRTimeout();
          waitingForQR.current = false;
          setQrCodeUrl(res.qrCodeDataUrl);
          setLoading(false);
          setError('');
          setShowNewQR(true);
        } else if (res?.isConnected) {
          clearQRTimeout();
          waitingForQR.current = false;
          setConnected(true);
          setLoading(false);
        }
      }).catch(() => null);
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen, connected, qrCodeUrl, accountId]);

  // Force re-pair button handler
  const handleRequestNewQR = () => {
    startQRFlow(true);
  };

  const handleCancelNewQR = () => {
    clearQRTimeout();
    waitingForQR.current = false;
    setShowNewQR(false);
    setQrCodeUrl('');
    setLoading(false);
    setError('');
  };

  if (!isOpen) return null;

  // ── CONNECTED STATE MATCHING DESIGN 18 (WHATSAPP LINKED DEVICES) ─────────
  if (connected && !showNewQR) {
    return (
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: 16,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 780,
            background: 'linear-gradient(135deg, rgba(8, 26, 30, 0.98) 0%, rgba(6, 18, 22, 0.99) 100%)',
            border: '1px solid rgba(45, 212, 191, 0.35)',
            borderRadius: 18,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(16, 185, 129, 0.15)',
            overflow: 'hidden',
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid rgba(45, 212, 191, 0.15)',
              background: 'rgba(9, 24, 28, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#00a884',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(0, 168, 132, 0.4)',
                }}
              >
                <Smartphone size={15} color="#ffffff" />
              </div>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Linked Devices
              </h3>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
              }}
            >
              <X size={18} color="#8696a0" />
            </button>
          </div>

          {/* Modal Body: 2 Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.25fr 1fr',
              gap: 20,
              alignItems: 'center',
              padding: '28px 32px',
            }}
          >
            {/* Left Column */}
            <div>
              {/* Concentric Ripples Checkmark */}
              <div
                style={{
                  position: 'relative',
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  border: '1px solid rgba(45, 212, 191, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #10b981 0%, #059669 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.7)',
                    }}
                  >
                    <Check size={24} color="#ffffff" strokeWidth={3.5} />
                  </div>
                </div>
              </div>

              {/* Big Heading */}
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.3px',
                  margin: '0 0 14px 0',
                }}
              >
                Device is <span style={{ color: '#10b981' }}>Connected!</span>
              </h2>

              {/* Active Account Pill Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 14px',
                  borderRadius: 9999,
                  background: 'rgba(45, 212, 191, 0.08)',
                  border: '1px solid rgba(45, 212, 191, 0.25)',
                  marginBottom: 14,
                  width: 'fit-content',
                }}
              >
                <User size={13} color="#2dd4bf" />
                <span style={{ fontSize: 12, color: '#8696a0' }}>Active account:</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#2dd4bf',
                    fontFamily: 'monospace',
                  }}
                >
                  {displayPhone}
                </span>
                <button
                  onClick={handleCopyPhone}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Copy phone number"
                >
                  {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} color="#2dd4bf" />}
                </button>
              </div>

              {/* Explanation Subtext */}
              <p style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 4px 0' }}>
                Your chats, groups and contacts are syncing in real time.
              </p>
              <p style={{ fontSize: 12, color: '#8696a0', margin: '0 0 24px 0' }}>
                You do not need to scan a QR code.
              </p>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={onClose}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 24px',
                    borderRadius: 9999,
                    background: 'linear-gradient(135deg, #10b981 0%, #00a884 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 168, 132, 0.45)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Close</span>
                </button>

                <button
                  onClick={handleRequestNewQR}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 18px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Smartphone size={14} color="#2dd4bf" />
                  <span>Link New Phone / Re-scan QR</span>
                </button>

                <button
                  onClick={() => useUIStore.getState().setShowQRDataFlowModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 18px',
                    borderRadius: 10,
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    color: '#60a5fa',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="View interactive QR scanning data flow & API request lifecycle"
                >
                  <Zap size={14} color="#60a5fa" />
                  <span>QR Data Flow Architecture</span>
                </button>
              </div>
            </div>

            {/* Right Column: 3D Isometric Smartphone with Orbital Devices */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="290" height="230" viewBox="0 0 290 230" fill="none">
                {/* Glowing background aura */}
                <ellipse cx="145" cy="115" rx="90" ry="45" fill="rgba(16, 185, 129, 0.22)" filter="blur(22px)" />

                {/* Outer Orbit Ellipse */}
                <ellipse
                  cx="145"
                  cy="115"
                  rx="120"
                  ry="70"
                  stroke="rgba(45, 212, 191, 0.35)"
                  strokeWidth="1.6"
                  strokeDasharray="5 5"
                  fill="none"
                  transform="rotate(-15 145 115)"
                />

                {/* Inner Orbit Ellipse */}
                <ellipse
                  cx="145"
                  cy="115"
                  rx="95"
                  ry="50"
                  stroke="rgba(16, 185, 129, 0.45)"
                  strokeWidth="1.8"
                  fill="none"
                  transform="rotate(-15 145 115)"
                />

                {/* Satellite Node 1: Top-Left (Laptop) */}
                <g transform="translate(42, 45)">
                  <circle cx="16" cy="16" r="16" fill="#07262c" stroke="#2dd4bf" strokeWidth="1.6" />
                  <path d="M10 11 H22 V19 H10 Z M8 20 H24 V21 H8 Z" fill="#2dd4bf" />
                </g>

                {/* Satellite Node 2: Far-Right (Smartphone) */}
                <g transform="translate(230, 95)">
                  <circle cx="16" cy="16" r="16" fill="#07262c" stroke="#2dd4bf" strokeWidth="1.6" />
                  <rect x="11" y="9" width="10" height="15" rx="2" fill="none" stroke="#2dd4bf" strokeWidth="1.5" />
                  <line x1="14" y1="21" x2="18" y2="21" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* Satellite Node 3: Bottom-Left (Desktop Monitor) */}
                <g transform="translate(50, 160)">
                  <circle cx="16" cy="16" r="16" fill="#07262c" stroke="#2dd4bf" strokeWidth="1.6" />
                  <rect x="9" y="10" width="14" height="10" rx="1.5" fill="none" stroke="#2dd4bf" strokeWidth="1.5" />
                  <line x1="16" y1="20" x2="16" y2="23" stroke="#2dd4bf" strokeWidth="1.5" />
                  <line x1="12" y1="23" x2="20" y2="23" stroke="#2dd4bf" strokeWidth="1.5" />
                </g>

                {/* Center 3D Isometric Smartphone */}
                <g transform="translate(108, 38) rotate(-12)">
                  {/* Outer glossy body */}
                  <rect x="0" y="0" width="66" height="124" rx="16" fill="#082b31" stroke="#10b981" strokeWidth="2.5" />
                  {/* Screen */}
                  <rect x="4" y="6" width="58" height="112" rx="12" fill="#04161a" />
                  {/* WhatsApp Emblem */}
                  <circle cx="33" cy="62" r="19" fill="#25d366" filter="drop-shadow(0 2px 8px rgba(37, 211, 102, 0.6))" />
                  <path
                    d="M26 67 L27.5 61 C26 59 26 56 27.5 54 C29.5 50.5 34 50 37.5 52 C40 54 41 57.5 39.5 60.5 C38 63 34.5 64.5 31.5 65 Z"
                    fill="#ffffff"
                  />
                </g>

                {/* 3D Shield with Checkmark badge */}
                <g transform="translate(162, 130)">
                  <path
                    d="M18 4 L30 8 V18 C30 25 24 31 18 34 C12 31 6 25 6 18 V8 Z"
                    fill="url(#shieldGrad)"
                    stroke="#2dd4bf"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M12 18 L16 22 L24 14"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </g>

                {/* Gradients */}
                <defs>
                  <linearGradient id="shieldGrad" x1="6" y1="4" x2="30" y2="34" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#10b981" />
                    <stop offset="1" stopColor="#059669" />
                  </linearGradient>
                </defs>

                {/* Ambient light sparks */}
                <circle cx="100" cy="30" r="1.5" fill="#2dd4bf" />
                <circle cx="210" cy="45" r="2" fill="#10b981" />
                <circle cx="200" cy="180" r="1.5" fill="#2dd4bf" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── QR CODE STATE MATCHING DESIGN 20 (USE WHATSAPP ON YOUR COMPUTER) ──
  return (
    <div
      className="modal-overlay"
      onClick={showNewQR ? undefined : onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 860,
          background: 'linear-gradient(135deg, rgba(8, 24, 28, 0.98) 0%, rgba(6, 16, 20, 0.99) 100%)',
          border: '1px solid rgba(45, 212, 191, 0.35)',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(16, 185, 129, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Background ambient silk waves matching Design 20 */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '60%', height: '100%', pointerEvents: 'none', opacity: 0.15 }}>
          <svg width="100%" height="100%" viewBox="0 0 500 400" fill="none">
            <path d="M50 80 Q 250 20, 450 160 T 500 300" stroke="#2dd4bf" strokeWidth="2" fill="none" />
            <path d="M100 120 Q 300 60, 480 220" stroke="#10b981" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        {/* 1. Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid rgba(45, 212, 191, 0.15)',
            background: 'rgba(9, 24, 28, 0.8)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Glowing circular link badge */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.55)',
                border: '1.5px solid rgba(45, 212, 191, 0.6)',
                flexShrink: 0,
              }}
            >
              <Link2 size={19} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.2px' }}>
                Connect your device
              </h3>
              <p style={{ fontSize: 12, color: '#8696a0', margin: '3px 0 0 0' }}>
                Follow the steps below to link your messaging account to this device.
              </p>
            </div>
          </div>

          <button
            onClick={showNewQR ? handleCancelNewQR : onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              color: '#8696a0',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8696a0')}
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Modal Body: 2 Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.25fr 1fr',
            gap: 28,
            padding: '24px 28px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left Column: 4 Steps + Bottom Note */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#00a884',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: 4,
                  boxShadow: '0 0 8px rgba(0, 168, 132, 0.4)',
                }}
              >
                1
              </div>

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'rgba(45, 212, 191, 0.08)',
                  border: '1px solid rgba(45, 212, 191, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Smartphone size={17} color="#2dd4bf" />
              </div>

              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                  Open your messaging app on your phone
                </div>
                <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2, lineHeight: 1.4 }}>
                  Go to the Linked Devices section in Settings (iPhone) or Menu (Android).
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#00a884',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: 4,
                  boxShadow: '0 0 8px rgba(0, 168, 132, 0.4)',
                }}
              >
                2
              </div>

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'rgba(45, 212, 191, 0.08)',
                  border: '1px solid rgba(45, 212, 191, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Monitor size={17} color="#2dd4bf" />
              </div>

              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                  Tap Link a Device
                </div>
                <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2, lineHeight: 1.4 }}>
                  Select the option to link a new device from the menu.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#00a884',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: 4,
                  boxShadow: '0 0 8px rgba(0, 168, 132, 0.4)',
                }}
              >
                3
              </div>

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'rgba(45, 212, 191, 0.08)',
                  border: '1px solid rgba(45, 212, 191, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                </svg>
              </div>

              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                  Scan the QR code
                </div>
                <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2, lineHeight: 1.4 }}>
                  Point your phone's camera at this screen to capture the code.
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#00a884',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: 4,
                  boxShadow: '0 0 8px rgba(0, 168, 132, 0.4)',
                }}
              >
                4
              </div>

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'rgba(45, 212, 191, 0.08)',
                  border: '1px solid rgba(45, 212, 191, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={17} color="#2dd4bf" />
              </div>

              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                  Enjoy Chat Pro on your computer
                </div>
                <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2, lineHeight: 1.4 }}>
                  Your chats, messages and contacts will sync instantly.
                </div>
              </div>
            </div>

            {/* Bottom Informational Card (Shield Callout) */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'rgba(16, 185, 129, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Shield size={20} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff' }}>
                  Your phone does not need to stay online after linking.
                </div>
                <div style={{ fontSize: 11, color: '#8696a0', marginTop: 2, lineHeight: 1.4 }}>
                  Once connected, your device will work independently until you log out.
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Viewfinder QR Code Box + Ready Status + Refresh Card */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Viewfinder with 4 glowing cyan/emerald corners */}
            <div
              style={{
                position: 'relative',
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Corner 1: Top-Left */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 24,
                  height: 24,
                  borderTop: '3px solid #2dd4bf',
                  borderLeft: '3px solid #2dd4bf',
                  borderTopLeftRadius: 10,
                  boxShadow: '0 0 10px rgba(45, 212, 191, 0.65)',
                }}
              />
              {/* Corner 2: Top-Right */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 24,
                  height: 24,
                  borderTop: '3px solid #2dd4bf',
                  borderRight: '3px solid #2dd4bf',
                  borderTopRightRadius: 10,
                  boxShadow: '0 0 10px rgba(45, 212, 191, 0.65)',
                }}
              />
              {/* Corner 3: Bottom-Left */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: 24,
                  height: 24,
                  borderBottom: '3px solid #2dd4bf',
                  borderLeft: '3px solid #2dd4bf',
                  borderBottomLeftRadius: 10,
                  boxShadow: '0 0 10px rgba(45, 212, 191, 0.65)',
                }}
              />
              {/* Corner 4: Bottom-Right */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 24,
                  height: 24,
                  borderBottom: '3px solid #2dd4bf',
                  borderRight: '3px solid #2dd4bf',
                  borderBottomRightRadius: 10,
                  boxShadow: '0 0 10px rgba(45, 212, 191, 0.65)',
                }}
              />

              {/* Inside white QR code card */}
              <div
                style={{
                  width: 190,
                  height: 190,
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                }}
              >
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Device QR Code"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      height: '100%',
                      padding: 16,
                      background: '#ffffff',
                    }}
                  >
                    <Loader2 size={36} color="#00a884" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700, textAlign: 'center' }}>
                      Generating live QR Code...
                    </span>
                    <span style={{ fontSize: 10.5, color: '#64748b', textAlign: 'center', lineHeight: 1.4 }}>
                      Connecting securely. Your camera-scannable code will appear here.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Card: Ready to Link or Generating */}
            <div
              style={{
                width: '100%',
                maxWidth: 240,
                background: 'rgba(255, 255, 255, 0.03)',
                border: qrCodeUrl ? '1px solid rgba(45, 212, 191, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: '9px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: qrCodeUrl ? '#10b981' : '#f59e0b',
                    boxShadow: qrCodeUrl ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
                  }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff' }}>
                  {qrCodeUrl ? 'Ready to link' : 'Preparing code...'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#8696a0', marginTop: 2 }}>
                {qrCodeUrl
                  ? 'Scan the QR code with your phone to connect.'
                  : 'Establishing secure device link...'}
              </div>
            </div>

            {/* Refresh QR Box */}
            <div
              onClick={handleRequestNewQR}
              style={{
                width: '100%',
                maxWidth: 240,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: '9px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.4)';
                e.currentTarget.style.background = 'rgba(45, 212, 191, 0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              }}
            >
              <RefreshCw
                size={15}
                color="#2dd4bf"
                style={{
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
                  Refresh QR
                </div>
                <div style={{ fontSize: 10.5, color: '#8696a0', marginTop: 1 }}>
                  Get a new code if the current one expires.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Modal Footer: Cancel & Link Device Buttons */}
        <div
          style={{
            padding: '12px 28px 20px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <button
            onClick={showNewQR ? handleCancelNewQR : onClose}
            style={{
              padding: '8px 22px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              addToast('info', 'Connecting device... Scan QR code on your phone.');
              startQRFlow(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 22px',
              borderRadius: 9999,
              background: '#00a884',
              border: 'none',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 168, 132, 0.45)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Link2 size={14} />
            <span>Link Device</span>
          </button>
        </div>
      </div>
    </div>
  );
}
