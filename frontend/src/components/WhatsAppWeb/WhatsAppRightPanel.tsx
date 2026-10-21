import React, { useState } from 'react';
import {
  MessageSquare, Send, UserPlus, FileText,
  Edit3, Shield, Clock, Image, Activity,
  Wifi, WifiOff, RefreshCw, QrCode,
  Phone, Users, MessageCircle, Zap, Lock, AlertTriangle, Trash2,
} from 'lucide-react';
import { Account, WhatsAppChat } from '../../services/api';
import { formatIndianLastActive, formatIndianDateTime } from '../../utils/indianTime';

interface WhatsAppRightPanelProps {
  account: Account | null;
  selectedChat: WhatsAppChat | null;
  onNewChat: () => void;
  onBroadcast: () => void;
  onAddContact: () => void;
  onSendTemplate: () => void;
  onOpenQR?: () => void;
  onReconnect?: () => void;
  onDeleteAccount?: (account: Account) => void;
  onClose?: () => void;
  userName?: string;
}

export default function WhatsAppRightPanel({
  account,
  selectedChat,
  onNewChat,
  onBroadcast,
  onAddContact,
  onSendTemplate,
  onOpenQR,
  onReconnect,
  onDeleteAccount,
  onClose,
  userName = 'You (Message yourself)',
}: WhatsAppRightPanelProps) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const isConnected = account?.status === 'CONNECTED';
  const isReconnecting = account?.status === 'RECONNECTING';
  const isDisconnected = !isConnected && !isReconnecting;

  // Fix phone display for unlinked/pending accounts
  const rawPhone = account?.phoneNumber || '';
  const phoneNumber = rawPhone.startsWith('pending_') || rawPhone.startsWith('unlinked_')
    ? '⚠ Not linked yet'
    : rawPhone
      ? `+${rawPhone.replace(/^\+/, '')}`
      : 'No number';

  const displayName = account?.displayName && !account.displayName.includes('unlinked')
    ? account.displayName
    : (account?.phoneNumber ? `+${account.phoneNumber.replace(/^\+/, '')}` : (userName || 'Account'));

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase() || 'YO';

  // Real stats from account object
  const chatCount = account?.chatCount ?? 0;
  const unreadCount = account?.unreadCount ?? 0;

  // Format last active using Indian Standard Time (IST)
  const formatLastActive = () => {
    return formatIndianLastActive(account?.lastMessageAt, isConnected);
  };

  // Status colors & labels (only show Active if actually connected)
  const statusColor = isConnected ? '#10b981' : isReconnecting ? '#f59e0b' : '#ef4444';
  const statusBg = isConnected ? 'rgba(16,185,129,0.12)' : isReconnecting ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
  const statusBorder = isConnected ? 'rgba(16,185,129,0.3)' : isReconnecting ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)';
  const statusLabel = isConnected ? 'Active' : isReconnecting ? 'Reconnecting' : 'Disconnected';

  const actionButtons = [
    {
      id: 'new-chat',
      icon: <MessageSquare size={18} color="#2dd4bf" />,
      label: 'New Chat',
      onClick: onNewChat,
      disabled: false,
      title: 'Start a new chat with this account',
    },
    {
      id: 'broadcast',
      icon: <Send size={18} color="#06b6d4" />,
      label: 'Broadcast',
      onClick: onBroadcast,
      disabled: false,
      title: 'Launch bulk broadcast campaign',
    },
    {
      id: 'add-contact',
      icon: <UserPlus size={18} color="#3b82f6" />,
      label: 'Add Contact',
      onClick: onAddContact,
      disabled: false,
      title: 'Add a new contact and start chat',
    },
    {
      id: 'send-template',
      icon: <FileText size={18} color="#a855f7" />,
      label: 'Send Template',
      onClick: onSendTemplate,
      disabled: false,
      title: 'Send a pre-approved message template',
    },
  ];

  return (
    <aside style={styles.panel}>
      {/* ── Top Header ───────────────────────────────────────────── */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Account Details</span>
        <div style={{
          ...styles.statusPill,
          background: statusBg,
          border: `1px solid ${statusBorder}`,
          color: statusColor,
        }}>
          <span style={{ ...styles.statusDot, background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
          <span>{statusLabel}</span>
        </div>
      </div>

      <div style={styles.content}>
        {/* ── Disconnected Alert Notice if not linked ─────────────── */}
        {!isConnected && (
          <div style={{
            margin: '0 0 14px 0',
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.28)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: 12.5, fontWeight: 600 }}>
              <WifiOff size={16} color="#ef4444" />
              <span>Device Not Linked</span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94a3b8', lineHeight: 1.4 }}>
              Messages cannot be sent until this account is paired with your mobile phone.
            </p>
            <button
              onClick={onOpenQR}
              style={{
                marginTop: 2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 8,
                background: '#00a884',
                border: 'none',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <QrCode size={14} />
              <span>Link Device (Scan QR)</span>
            </button>
          </div>
        )}

        {/* ── Profile Card ──────────────────────────────────────────── */}
        <div style={styles.profileCard}>
          <div style={{
            ...styles.avatar,
            background: isConnected
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : isReconnecting
                ? 'linear-gradient(135deg, #b45309, #f59e0b)'
                : 'linear-gradient(135deg, #7f1d1d, #ef4444)',
            boxShadow: `0 4px 12px ${isConnected ? 'rgba(16,185,129,0.3)' : isReconnecting ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {initials}
          </div>
          <div style={styles.profileInfo}>
            <div style={styles.profileNameRow}>
              <span style={styles.profileName} title={displayName}>{displayName}</span>
              <button
                style={styles.editBtn}
                title="Edit display name"
                onClick={() => {}}
              >
                <Edit3 size={13} color="#8696a0" />
              </button>
            </div>
            <div style={{
              ...styles.phoneText,
              color: rawPhone.startsWith('unlinked_') || rawPhone.startsWith('pending_') ? '#f59e0b' : '#8696a0',
            }}>
              {phoneNumber}
            </div>
          </div>
        </div>

        {/* ── Active WhatsApp Account & Linked Device Status Card ───── */}
        {account && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {account.displayName ? account.displayName.slice(0, 2).toUpperCase() : 'WA'}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>
                  {account.displayName || 'Account'}
                </div>
                <div style={{ fontSize: 10.5, color: '#8696a0' }}>
                  {account.phoneNumber ? `+${account.phoneNumber.replace(/^\+/, '')}` : 'Not linked'}
                </div>
              </div>
            </div>
            {onOpenQR && (
              <button
                type="button"
                onClick={onOpenQR}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: isConnected ? 'rgba(0, 168, 132, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${isConnected ? 'rgba(0, 168, 132, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: isConnected ? '#2dd4bf' : '#f87171',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="View Link / QR Code"
              >
                <QrCode size={12} />
                <span>{isConnected ? 'Linked' : 'Link QR'}</span>
              </button>
            )}
          </div>
        )}

        {/* ── Reconnect Banner (when not connected) ──────────────────── */}
        {!isConnected && (
          <div style={{
            background: isReconnecting ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${isReconnecting ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isReconnecting
                ? <RefreshCw size={15} color="#f59e0b" style={{ animation: 'spin 1.5s linear infinite' }} />
                : <WifiOff size={15} color="#ef4444" />}
              <span style={{ fontSize: 12, fontWeight: 600, color: isReconnecting ? '#f59e0b' : '#ef4444' }}>
                {isReconnecting ? 'Restoring connection...' : 'Account disconnected'}
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#8696a0', margin: 0, lineHeight: 1.5 }}>
              {isReconnecting
                ? 'Reconnecting session. This may take a moment.'
                : 'This account is offline. Scan the QR code to reconnect.'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onOpenQR}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(45, 212, 191, 0.12)',
                  border: '1px solid rgba(45, 212, 191, 0.35)',
                  color: '#2dd4bf',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <QrCode size={14} />
                Scan QR
              </button>
              <button
                onClick={onReconnect}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: '#3b82f6',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <RefreshCw size={14} />
                Reconnect
              </button>
              {onDeleteAccount && account && (
                <button
                  type="button"
                  onClick={() => onDeleteAccount(account)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#f87171',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Permanently Delete Account"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 2x2 Stats Grid (real data) ──────────────────────────────── */}
        <div style={styles.statsGrid}>
          {/* Total Chats */}
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <MessageCircle size={15} color="#2dd4bf" />
              <span style={styles.statLabel}>Total Chats</span>
            </div>
            <div style={styles.statValue}>{chatCount.toLocaleString()}</div>
          </div>

          {/* Unread */}
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <Activity size={15} color="#3b82f6" />
              <span style={styles.statLabel}>Unread</span>
            </div>
            <div style={styles.statValue}>{unreadCount.toLocaleString()}</div>
          </div>

          {/* Last Active */}
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <Clock size={15} color="#f59e0b" />
              <span style={styles.statLabel}>Last Active</span>
            </div>
            <div style={styles.statValueSmall}>{formatLastActive()}</div>
          </div>

          {/* Account Status */}
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <Shield size={15} color={statusColor} />
              <span style={styles.statLabel}>Status</span>
            </div>
            <div style={{ ...styles.statValueSmall, color: statusColor, fontWeight: 600 }}>
              {isConnected ? 'Active' : isReconnecting ? 'Reconnecting' : 'Offline'}
            </div>
          </div>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Quick Actions</div>
          <div style={styles.actionsGrid}>
            {actionButtons.map(btn => (
              <button
                key={btn.id}
                id={`quick-action-${btn.id}`}
                style={{
                  ...styles.actionBtn,
                  background: hoveredBtn === btn.id
                    ? 'rgba(45, 212, 191, 0.08)'
                    : 'rgba(17, 27, 33, 0.85)',
                  border: hoveredBtn === btn.id
                    ? '1px solid rgba(45, 212, 191, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  transform: hoveredBtn === btn.id ? 'translateY(-1px)' : 'none',
                  boxShadow: hoveredBtn === btn.id ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                }}
                onClick={btn.onClick}
                onMouseEnter={() => setHoveredBtn(btn.id)}
                onMouseLeave={() => setHoveredBtn(null)}
                title={btn.title}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Connection Status ─────────────────────────────────────────── */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Connection Status</div>
          <div
            style={{
              ...styles.connCard,
              cursor: !isConnected ? 'pointer' : 'default',
              borderColor: isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
            }}
            onClick={!isConnected ? onOpenQR : undefined}
            title={!isConnected ? 'Click to scan QR code and link device' : 'Connected to Web Chat'}
          >
            <div style={styles.connLeft}>
              <div style={{
                ...styles.livePulse,
                background: statusColor,
                boxShadow: `0 0 0 3px ${isConnected ? 'rgba(16,185,129,0.2)' : isReconnecting ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
                animation: isReconnecting ? 'pulse 1.5s infinite' : 'none',
              }} />
              <div>
                <div style={{
                  ...styles.connTitle,
                  color: isConnected ? '#f8fafc' : isReconnecting ? '#fbbf24' : '#f87171',
                }}>
                  {isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected (Offline)'}
                </div>
                <div style={styles.connSubtitle}>
                  {isConnected ? 'Web Chat • Live' : isReconnecting ? 'Restoring session...' : 'Tap to scan QR and connect'}
                </div>
              </div>
            </div>
            <div style={styles.signalBars}>
              <div style={{ ...styles.bar, height: 6, background: isConnected ? '#10b981' : '#374151' }} />
              <div style={{ ...styles.bar, height: 10, background: isConnected ? '#10b981' : '#374151' }} />
              <div style={{ ...styles.bar, height: 14, background: isConnected ? '#10b981' : '#374151' }} />
              <div style={{ ...styles.bar, height: 18, background: isConnected ? '#10b981' : '#374151' }} />
            </div>
          </div>
        </div>

        {/* ── Security Info ─────────────────────────────────────────────── */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Security</div>
          <div style={{
            background: 'rgba(17, 27, 33, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <Lock size={15} color="#2dd4bf" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#e2e8f0', marginBottom: 3 }}>
                End-to-End Encrypted
              </div>
              <div style={{ fontSize: 10.5, color: '#8696a0', lineHeight: 1.5 }}>
                Messages are secured with end-to-end encryption. Only you and the recipient can read them.
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
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
    height: '100%',
    flexShrink: 0,
    overflowY: 'auto',
    fontFamily: "'Inter', sans-serif",
    userSelect: 'none',
  },
  header: {
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 9px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(17, 27, 33, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: '12px 14px',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileNameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  profileName: {
    fontSize: 13.5,
    fontWeight: 600,
    color: '#f8fafc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  editBtn: {
    background: 'none',
    border: 'none',
    padding: 2,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  statCard: {
    background: 'rgba(17, 27, 33, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 10.5,
    color: '#8696a0',
    fontWeight: 500,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f8fafc',
  },
  statValueSmall: {
    fontSize: 12,
    fontWeight: 600,
    color: '#cbd5e1',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: '0.2px',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  actionBtn: {
    borderRadius: 10,
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 7,
    color: '#e2e8f0',
    fontSize: 11.5,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  connCard: {
    background: 'rgba(17, 27, 33, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  connTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#f8fafc',
  },
  connSubtitle: {
    fontSize: 10.5,
    color: '#8696a0',
  },
  signalBars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 3,
    height: 18,
  },
  bar: {
    width: 3.5,
    borderRadius: 1,
  },
};
