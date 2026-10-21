import React, { useEffect } from 'react';
import {
  Bell, MessageSquare, ExternalLink, X, Smartphone, User,
  CheckCheck, Volume2, Shield,
} from 'lucide-react';
import { formatIndianTime } from '../../utils/indianTime';

export interface ClientMessageNotification {
  id: string;
  accountId: string;
  accountName: string;
  accountPhone: string;
  assignedAdminUserId: string | null;
  assignedAdminName: string | null;
  clientJid: string;
  clientName: string;
  clientPhone: string;
  messageText: string;
  mediaType?: string;
  timestamp: number;
  isGroup?: boolean;
  groupName?: string;
}

// ── Synthesize high-fidelity dual-tone WhatsApp chime via Web Audio API ────────
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Harmonic bell chime frequency ramp (880Hz A5 -> 1320Hz E6)
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Ignore audio autoplay restrictions gracefully
  }
}

interface ClientNotificationCenterProps {
  floatingNotifications: ClientMessageNotification[];
  history: ClientMessageNotification[];
  showDropdown: boolean;
  onCloseDropdown: () => void;
  onDismissFloating: (id: string) => void;
  onClearHistory: () => void;
  onOpenChat: (notif: ClientMessageNotification) => void;
}

export default function ClientNotificationCenter({
  floatingNotifications,
  history,
  showDropdown,
  onCloseDropdown,
  onDismissFloating,
  onClearHistory,
  onOpenChat,
}: ClientNotificationCenterProps) {
  // Format relative time or time of day in Indian Standard Time (IST)
  const formatTime = (ts: number) => {
    return formatIndianTime(ts);
  };

  return (
    <>
      {/* ── Floating Notification Cards (Pop-up upon new client message) ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: 380,
          width: 'calc(100vw - 48px)',
          pointerEvents: 'none',
        }}
      >
        {floatingNotifications.map((notif) => (
          <div
            key={notif.id}
            style={{
              pointerEvents: 'auto',
              background: 'linear-gradient(135deg, rgba(17, 27, 33, 0.96), rgba(32, 44, 51, 0.98))',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(0, 168, 132, 0.5)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55), 0 0 16px rgba(0, 168, 132, 0.25)',
              borderRadius: 14,
              padding: '14px 16px',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* Top Bar: Account Badge & Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(0, 168, 132, 0.15)',
                    border: '1px solid rgba(0, 168, 132, 0.3)',
                    color: '#00a884',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  <Smartphone size={12} />
                  {notif.accountName} ({notif.accountPhone})
                </span>
                <span style={{ fontSize: 10.5, color: '#8696a0' }}>{formatTime(notif.timestamp)}</span>
              </div>
              <button
                onClick={() => onDismissFloating(notif.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8696a0',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                }}
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>

            {/* Middle: Client Name & Contact */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00a884, #128c7e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {notif.clientName ? notif.clientName[0].toUpperCase() : 'C'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e9edef', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {notif.clientName}
                </div>
                <div style={{ fontSize: 11, color: '#8696a0', fontFamily: 'monospace' }}>
                  {notif.clientPhone}
                </div>
              </div>
            </div>

            {/* Message Snippet */}
            <div
              style={{
                fontSize: 12.5,
                color: '#d1d7db',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '6px 10px',
                borderRadius: 8,
                borderLeft: '3px solid #00a884',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 64,
                overflow: 'hidden',
              }}
            >
              {notif.mediaType ? (
                <span style={{ color: '#00a884', fontWeight: 600 }}>
                  {notif.mediaType === 'image' ? '📷 Photo: ' : notif.mediaType === 'audio' ? '🎵 Voice Note: ' : '📎 Document: '}
                </span>
              ) : null}
              {notif.messageText}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 2 }}>
              <button
                onClick={() => onOpenChat(notif)}
                style={{
                  background: '#00a884',
                  color: '#111b21',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
                }}
              >
                <span>Open Chat</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Dropdown Notification History Panel ── */}
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 14,
            width: 360,
            maxHeight: 460,
            background: '#111b21',
            border: '1px solid #2a3942',
            borderRadius: 12,
            boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              background: '#202c33',
              borderBottom: '1px solid #2a3942',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} color="#00a884" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e9edef' }}>
                Client Incoming Messages
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  background: 'rgba(0,168,132,0.2)',
                  color: '#00a884',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {history.length}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {history.length > 0 && (
                <button
                  onClick={onClearHistory}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8696a0',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: '2px 6px',
                  }}
                  title="Clear notification history"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onCloseDropdown}
                style={{ background: 'transparent', border: 'none', color: '#8696a0', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List of Messages */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 380, padding: 6 }}>
            {history.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#8696a0', fontSize: 12 }}>
                <MessageSquare size={28} color="#374248" style={{ margin: '0 auto 8px' }} />
                No incoming client messages yet.
                <div style={{ fontSize: 11, color: '#54656f', marginTop: 4 }}>
                  When clients message your numbers, real-time alerts appear here.
                </div>
              </div>
            ) : (
              history.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => onOpenChat(notif)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    marginBottom: 4,
                    background: '#202c33',
                    border: '1px solid #2a3942',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#2a3942';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#202c33';
                  }}
                >
                  {/* Account Badge & Timestamp */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#00a884',
                        background: 'rgba(0,168,132,0.12)',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      📱 {notif.accountName}
                    </span>
                    <span style={{ fontSize: 10, color: '#8696a0' }}>{formatTime(notif.timestamp)}</span>
                  </div>

                  {/* Client Info */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#e9edef' }}>
                      {notif.clientName}
                    </span>
                    <span style={{ fontSize: 11, color: '#8696a0', fontFamily: 'monospace' }}>
                      {notif.clientPhone}
                    </span>
                  </div>

                  {/* Message Snippet */}
                  <p
                    style={{
                      fontSize: 11.5,
                      color: '#aebac1',
                      margin: '3px 0 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {notif.mediaType ? `[${notif.mediaType}] ` : ''}
                    {notif.messageText}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
