import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Search, MessageSquare, Users, Pin, Check, CheckCheck,
  MoreVertical, Plus, ArrowLeft, RefreshCw, Filter, Calendar, RotateCcw, Tag, X,
} from 'lucide-react';
import { WhatsAppChat, WhatsAppContact, Account } from '../../services/api';
import { format, isToday, isYesterday } from 'date-fns';
import { resolveChatDisplayName, resolveAccountDisplayName, cleanMessageSnippet, getInitials, isProperName, isLidId, formatE164 } from '../../utils/contactResolver';
import { ChevronDown, Smartphone, QrCode, UserPlus } from 'lucide-react';
import { debounce } from '../../utils/scheduler';

interface WhatsAppChatsListProps {
  chats: WhatsAppChat[];
  contacts: WhatsAppContact[];
  selectedChatId: string | null;
  onSelectChat: (chat: WhatsAppChat) => void;
  onSelectContact: (contact: WhatsAppContact) => void;
  loading: boolean;
  onRefresh?: () => void;
  forceContactsTab?: boolean;
  accounts?: Account[];
  activeAccount?: Account | null;
  onSelectAccount?: (account: Account) => void;
  onOpenQR?: (account?: Account) => void;
  onAddAccount?: () => void;
}

import { formatIndianChatTime } from '../../utils/indianTime';

type FilterType = 'all' | 'unread' | 'favourites' | 'groups' | 'contacts' | 'broadcasts';

function formatChatTime(timestamp: number): string {
  return formatIndianChatTime(timestamp);
}


const AVATAR_COLORS = [
  '#00a884', '#128c7e', '#075e54', '#25d366', '#34b7f1',
  '#f0b429', '#e056fd', '#ff7675', '#74b9ff', '#a29bfe',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Returns a clean chat display name, resolving real contact names and formatting phone numbers */
function getDisplayName(chat: WhatsAppChat, contactsList?: WhatsAppContact[]): string {
  return resolveChatDisplayName(chat, contactsList).name;
}

// ── Enterprise Performance: Memoized ChatListItem with O(2) Reconciliation ─
interface ChatListItemProps {
  chat: WhatsAppChat;
  isSelected: boolean;
  onSelectChat: (chat: WhatsAppChat) => void;
  contacts: WhatsAppContact[];
  accounts?: Account[];
}

const ChatListItem = React.memo(
  function ChatListItem({ chat, isSelected, onSelectChat, contacts, accounts }: ChatListItemProps) {
    const color = getAvatarColor(chat.id);
    const title = getDisplayName(chat, contacts);
    const matchingAcc = accounts?.find(a => a.id === chat.accountId);
    const resolvedAccountBadge = matchingAcc
      ? resolveAccountDisplayName(matchingAcc)
      : (chat.accountName ? resolveAccountDisplayName({ displayName: chat.accountName, phoneNumber: chat.accountPhone }) : '');

    return (
      <div
        className={`wa-chat-item ${isSelected ? 'active' : ''}`}
        onClick={() => onSelectChat(chat)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onSelectChat(chat)}
      >
        {/* Avatar */}
        <div
          className={`wa-avatar ${chat.isGroup ? 'group-avatar' : ''}`}
          style={{ backgroundColor: color }}
        >
          {chat.isGroup ? (
            chat.name && chat.name.toLowerCase().includes('crew') ? (
              <span style={{ fontSize: 11, fontWeight: 700 }}>crewX</span>
            ) : (
              getInitials(title || 'Group', true)
            )
          ) : (
            getInitials(title, false)
          )}
        </div>

        {/* Content */}
        <div className="wa-chat-content">
          {/* Row 1: Chat Title + Timestamp */}
          <div className="wa-chat-top-row">
            <span className="wa-chat-name" title={title}>
              {title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {resolvedAccountBadge && resolvedAccountBadge !== 'Account' && (
                <span
                  className="wa-account-badge-pill"
                  style={{
                    fontSize: 10.5,
                    padding: '1px 6px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(0, 168, 132, 0.12)',
                    color: '#00a884',
                    fontWeight: 600,
                    border: '1px solid rgba(0, 168, 132, 0.25)',
                  }}
                  title={`Account: ${resolvedAccountBadge}`}
                >
                  {resolvedAccountBadge}
                </span>
              )}
              <span className="wa-chat-time">
                {formatChatTime(chat.lastMessageTimestamp)}
              </span>
            </div>
          </div>

          {/* Optional Subtitle */}
          {chat.subtitle && (
            <div className="wa-chat-subtitle-row">
              <span className="wa-chat-subtitle">{chat.subtitle}</span>
            </div>
          )}

          {/* Row 2: Last Message Snippet + Badges */}
          <div className="wa-chat-bottom-row">
            <div className="wa-chat-last-msg">
              {chat.lastMessageFromMe && (
                <span className="wa-check-icon">
                  {chat.lastMessageStatus === 'read' ? (
                    <CheckCheck size={14} color="#53c8f0" />
                  ) : chat.lastMessageStatus === 'delivered' ? (
                    <CheckCheck size={14} color="var(--text-muted)" />
                  ) : (
                    <Check size={14} color="var(--text-muted)" />
                  )}
                </span>
              )}
              <span className="wa-msg-text" title={cleanMessageSnippet(chat.lastMessageText)}>
                {cleanMessageSnippet(chat.lastMessageText) || 'Tap to chat'}
              </span>
            </div>

            <div className="wa-chat-badges">
              {chat.pinned && <Pin size={12} className="wa-pin-icon" />}
              {chat.unreadCount > 0 && (
                <span className="wa-unread-badge">
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.chat.lastMessageTimestamp === next.chat.lastMessageTimestamp &&
    prev.chat.unreadCount === next.chat.unreadCount &&
    prev.chat.name === next.chat.name &&
    prev.chat.lastMessageText === next.chat.lastMessageText &&
    prev.chat.lastMessageStatus === next.chat.lastMessageStatus &&
    prev.chat.pinned === next.chat.pinned &&
    prev.chat.accountName === next.chat.accountName
);

export default function WhatsAppChatsList({
  chats,
  contacts,
  selectedChatId,
  onSelectChat,
  onSelectContact,
  loading,
  onRefresh,
  forceContactsTab,
  accounts = [],
  activeAccount,
  onSelectAccount,
  onOpenQR,
  onAddAccount,
}: WhatsAppChatsListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showContactsView, setShowContactsView] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // ── Date and Keyword ("Word in reply") Filter States ────────────────────────
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [replyKeywords, setReplyKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [replyDirection, setReplyDirection] = useState<'all' | 'incoming' | 'outgoing'>('all');

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (dateFilterPreset !== 'all') count++;
    if (replyKeywords.length > 0) count += replyKeywords.length;
    if (replyDirection !== 'all') count++;
    return count;
  }, [dateFilterPreset, replyKeywords, replyDirection]);

  // ── INP FIX: Decoupled State via useTransition (0ms Input Response) ────────
  const [searchInput, setSearchInput] = useState('');
  const [, startTransition] = React.useTransition();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val); // Frame 1: Immediate Input Response (0ms INP)
    startTransition(() => {
      setSearch(val); // Low Priority: Background non-blocking calculation
      setContactsLimit(100);
      setVisibleChatCount(40);
    });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    startTransition(() => {
      setSearch('');
      setVisibleChatCount(40);
    });
  };

  React.useEffect(() => {
    if (forceContactsTab) {
      setFilter('contacts');
      setShowContactsView(true);
    }
  }, [forceContactsTab]);

  const [contactsLimit, setContactsLimit] = useState(100);

  // ── Virtual Windowing Pagination: 40 Items Initial + IntersectionObserver ──
  const [visibleChatCount, setVisibleChatCount] = useState(40);
  const chatSentinelRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setVisibleChatCount(40);
  }, [filter, search]);

  const isContactsActive = showContactsView || filter === 'contacts';

  // Filter chats by search, category, date range, and keywords
  const filteredChats = useMemo(() => {
    let list = chats;

    // Category filter
    if (filter === 'unread') {
      list = list.filter(c => c.unreadCount > 0);
    } else if (filter === 'groups') {
      list = list.filter(c => c.isGroup);
    } else if (filter === 'favourites') {
      list = list.filter(c => c.pinned);
    }

    // 1. Date Range Filter
    if (dateFilterPreset !== 'all') {
      const now = new Date();
      let startMs = 0;
      let endMs = Infinity;

      if (dateFilterPreset === 'today') {
        startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
        endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      } else if (dateFilterPreset === 'yesterday') {
        startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0).getTime();
        endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999).getTime();
      } else if (dateFilterPreset === 'last7') {
        startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      } else if (dateFilterPreset === 'last30') {
        startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      } else if (dateFilterPreset === 'custom') {
        if (customStartDate) startMs = new Date(`${customStartDate}T00:00:00`).getTime();
        if (customEndDate) endMs = new Date(`${customEndDate}T23:59:59.999`).getTime();
      }

      list = list.filter(c => {
        const t = c.lastMessageTimestamp || 0;
        return t >= startMs && t <= endMs;
      });
    }

    // 2. Keyword Filter ("Word in reply / message")
    if (replyKeywords.length > 0) {
      list = list.filter(c => {
        const text = (c.lastMessageText || '').toLowerCase();
        return replyKeywords.some(kw => text.includes(kw.toLowerCase()));
      });
    }

    // 3. Reply Direction Filter
    if (replyDirection === 'incoming') {
      list = list.filter(c => !c.lastMessageFromMe);
    } else if (replyDirection === 'outgoing') {
      list = list.filter(c => c.lastMessageFromMe);
    }

    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        c =>
          (c.name && c.name.toLowerCase().includes(s)) ||
          (c.lastMessageText && c.lastMessageText.toLowerCase().includes(s)) ||
          (c.id && c.id.toLowerCase().includes(s))
      );
    }

    return list;
  }, [chats, filter, search, contacts, dateFilterPreset, customStartDate, customEndDate, replyKeywords, replyDirection]);

  // ── Virtual Windowing: Render first 40 chats, lazy append via IntersectionObserver ──
  const visibleChats = useMemo(() => {
    return filteredChats.slice(0, visibleChatCount);
  }, [filteredChats, visibleChatCount]);

  React.useEffect(() => {
    const sentinel = chatSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleChatCount(prev => Math.min(prev + 40, filteredChats.length));
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredChats.length]);

  // Filter contacts by search and prioritize real names
  const filteredContacts = useMemo(() => {
    // Exclude anonymous LIDs lacking an authentic name and raw ID placeholders
    const baseList = contacts.filter(c => {
      const isLid = isLidId(c.id) || isLidId(c.phoneNumber);
      const hasProperName = (c.name && isProperName(c.name)) || (c.notifyName && isProperName(c.notifyName));
      if (isLid && !hasProperName) return false;
      const cleanDigits = c.id.split('@')[0].replace(/\D/g, '');
      const hasRealPhone = !isLid && cleanDigits.length >= 7;
      if (!hasProperName && !hasRealPhone) return false;
      return true;
    });

    let list = baseList;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = baseList.filter(
        c =>
          (c.name && c.name.toLowerCase().includes(s)) ||
          (c.phoneNumber && c.phoneNumber.toLowerCase().includes(s)) ||
          (c.notifyName && c.notifyName.toLowerCase().includes(s))
      );
    }

    // Prioritize contacts with authentic human names over raw phone numbers
    return [...list].sort((a, b) => {
      const nameA = (isProperName(a.name) ? a.name : (isProperName(a.notifyName) ? a.notifyName : '')) || '';
      const nameB = (isProperName(b.name) ? b.name : (isProperName(b.notifyName) ? b.notifyName : '')) || '';
      const isRealA = !!nameA;
      const isRealB = !!nameB;
      if (isRealA && !isRealB) return -1;
      if (!isRealA && isRealB) return 1;
      return nameA.localeCompare(nameB);
    });
  }, [contacts, search]);

  const visibleContacts = useMemo(() => {
    return filteredContacts.slice(0, contactsLimit);
  }, [filteredContacts, contactsLimit]);

  const unreadChatsCount = useMemo(() => {
    return chats.filter(c => (c.unreadCount || 0) > 0).length;
  }, [chats]);

  const groupChatsCount = useMemo(() => {
    return chats.filter(c => c.isGroup).length;
  }, [chats]);

  return (
    <div className="wa-chats-panel" style={{ position: 'relative' }}>
      {/* ── Top-Pinned Virtual Progress Line (Replaces full-screen loader shifts) ── */}
      {loading && <div className="wa-top-loader" />}

      {/* ── 1. Active WhatsApp Account & Device Pairing Header ── */}
      {activeAccount && (
        <div style={{
          padding: '8px 14px',
          background: 'rgba(15, 23, 42, 0.75)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          position: 'relative',
        }}>
          {/* Account selector trigger */}
          <div
            onClick={() => accounts.length > 1 && setShowAccountDropdown(!showAccountDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: accounts.length > 1 ? 'pointer' : 'default',
              flex: 1,
              minWidth: 0,
            }}
            title={accounts.length > 1 ? "Click to switch account" : "Active account"}
          >
            <div style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 11,
              flexShrink: 0,
            }}>
              {getInitials(resolveAccountDisplayName(activeAccount))}
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  color: '#f8fafc',
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {resolveAccountDisplayName(activeAccount)}
                </span>
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: activeAccount.status === 'CONNECTED' ? '#10b981' : activeAccount.status === 'RECONNECTING' ? '#f59e0b' : '#ef4444',
                  boxShadow: activeAccount.status === 'CONNECTED' ? '0 0 6px #10b981' : 'none',
                }} />
              </div>
              <div style={{
                color: '#8696a0',
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {formatE164(activeAccount.phoneNumber) || (activeAccount.phoneNumber ? (activeAccount.phoneNumber.startsWith('unlinked') ? '⚠ Not linked yet' : `+${activeAccount.phoneNumber.replace(/^\+/, '')}`) : '')}
              </div>
            </div>
            {accounts.length > 1 && (
              <ChevronDown size={14} color="#8696a0" />
            )}
          </div>

          {/* Quick Action: Link Device / Scan QR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {onOpenQR && (
              <button
                type="button"
                onClick={() => onOpenQR(activeAccount)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 9px',
                  borderRadius: 6,
                  background: activeAccount.status === 'CONNECTED' ? 'rgba(0, 168, 132, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${activeAccount.status === 'CONNECTED' ? 'rgba(0, 168, 132, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  color: activeAccount.status === 'CONNECTED' ? '#2dd4bf' : '#f87171',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title={activeAccount.status === 'CONNECTED' ? 'Device Linked - View QR / Pairing' : 'Scan QR code to Link Device'}
              >
                <QrCode size={13} />
                <span>{activeAccount.status === 'CONNECTED' ? 'Linked' : 'Link QR'}</span>
              </button>
            )}
          </div>

          {/* Accounts Dropdown Menu */}
          {showAccountDropdown && accounts.length > 1 && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 998,
                }}
                onClick={() => setShowAccountDropdown(false)}
              />
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 10,
                right: 10,
                marginTop: 4,
                background: '#111b21',
                border: '1px solid rgba(45, 212, 191, 0.25)',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 999,
                overflow: 'hidden',
                padding: '6px 0',
              }}>
                <div style={{
                  padding: '6px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#2dd4bf',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  Switch Account
                </div>
                {accounts.map(acc => {
                  const isCur = acc.id === activeAccount.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        if (onSelectAccount) onSelectAccount(acc);
                        setShowAccountDropdown(false);
                      }}
                      style={{
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isCur ? 'rgba(0, 168, 132, 0.12)' : 'transparent',
                        borderLeft: isCur ? '3px solid #00a884' : '3px solid transparent',
                      }}
                    >
                      <div>
                        <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: isCur ? 600 : 400 }}>
                          {resolveAccountDisplayName(acc)}
                        </div>
                        <div style={{ color: '#8696a0', fontSize: 11 }}>
                          {formatE164(acc.phoneNumber) || (acc.phoneNumber ? `+${acc.phoneNumber.replace(/^\+/, '')}` : 'Not linked')}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: acc.status === 'CONNECTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: acc.status === 'CONNECTED' ? '#10b981' : '#f87171',
                        fontWeight: 600,
                      }}>
                        {acc.status === 'CONNECTED' ? 'Active' : 'Offline'}
                      </span>
                    </div>
                  );
                })}
                {onAddAccount && (
                  <div
                    onClick={() => {
                      setShowAccountDropdown(false);
                      onAddAccount();
                    }}
                    style={{
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#2dd4bf',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Another Account</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Header Matching Image 2 ──────────────────────────────────────── */}
      <div className="wa-chats-header">
        {isContactsActive ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="wa-icon-btn"
                onClick={() => {
                  setShowContactsView(false);
                  if (filter === 'contacts') setFilter('all');
                }}
                title="Back to Chats"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="wa-chats-title" style={{ margin: 0, fontSize: 16 }}>
                  Contacts ({filteredContacts.length})
                </h2>
                <span style={{ fontSize: 11, color: '#8696a0' }}>
                  {search ? 'Search results' : 'All synced phonebook contacts'}
                </span>
              </div>
            </div>
            {onRefresh && (
              <button
                className={`wa-action-btn-sm ${loading ? 'wa-spinning' : ''}`}
                onClick={onRefresh}
                title="Fetch and sync all contacts"
                style={{
                  background: 'rgba(0, 168, 132, 0.15)',
                  border: '1px solid rgba(0, 168, 132, 0.35)',
                  color: '#00a884',
                  fontSize: 11.5,
                  padding: '3px 9px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  borderRadius: 5,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={12} />
                <span>Fetch Contacts</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="wa-chats-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                Chats
              </h2>
              {unreadChatsCount > 0 && (
                <span
                  style={{
                    background: '#10b981',
                    color: '#0a1317',
                    fontSize: 11,
                    fontWeight: 700,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {unreadChatsCount}
                </span>
              )}
            </div>

            <div className="wa-chats-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className={`wa-icon-btn ${loading ? 'wa-spinning' : ''}`}
                title="Sync & refresh chat history from database"
                onClick={onRefresh}
                style={{ borderRadius: 6 }}
              >
                <RefreshCw size={17} />
              </button>

              <button
                className={`wa-icon-btn ${activeFiltersCount > 0 || showFilterDrawer ? 'active' : ''}`}
                title="Filter conversations by date and keywords"
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                style={{
                  position: 'relative',
                  color: (activeFiltersCount > 0 || showFilterDrawer) ? '#00a884' : undefined,
                  background: (activeFiltersCount > 0 || showFilterDrawer) ? 'rgba(0, 168, 132, 0.15)' : undefined,
                  borderRadius: 6,
                }}
              >
                <Filter size={18} />
                {activeFiltersCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    minWidth: 14,
                    height: 14,
                    padding: '0 2px',
                    borderRadius: 9999,
                    background: '#00a884',
                    color: '#071013',
                    fontSize: 9.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #111b21',
                  }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <button
                className="wa-icon-btn"
                onClick={() => {
                  setShowContactsView(!showContactsView);
                  if (!showContactsView) setFilter('contacts');
                  else setFilter('all');
                }}
                title={showContactsView ? 'Show Chats' : 'New chat'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Search Bar Matching Image 2 ─────────────────────────────────── */}
      <div className="wa-search-wrapper">
        <div className="wa-search-bar">
          <Search size={16} className="wa-search-icon" />
          <input
            type="text"
            placeholder={isContactsActive ? "Search contacts by name or phone..." : "Search messages, contacts, or chats..."}
            value={searchInput}
            onChange={handleSearchChange}
          />
          {searchInput && (
            <button
              className="wa-search-clear"
              onClick={handleClearSearch}
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Category Sub-Tabs Matching Image 2 ──────────────────────────── */}
      <div className="wa-filter-pills-row">
        <button
          className={`wa-filter-pill ${filter === 'all' && !showContactsView ? 'active' : ''}`}
          onClick={() => {
            setFilter('all');
            setShowContactsView(false);
          }}
        >
          All
        </button>

        <button
          className={`wa-filter-pill ${filter === 'unread' && !showContactsView ? 'active' : ''}`}
          onClick={() => {
            setFilter('unread');
            setShowContactsView(false);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>Unread</span>
          {unreadChatsCount > 0 && (
            <span style={{
              fontSize: 10.5,
              background: filter === 'unread' ? '#111b21' : '#10b981',
              color: filter === 'unread' ? '#10b981' : '#111b21',
              padding: '1px 5px',
              borderRadius: 9999,
              fontWeight: 700,
            }}>
              {unreadChatsCount}
            </span>
          )}
        </button>

        <button
          className={`wa-filter-pill ${isContactsActive ? 'active' : ''}`}
          onClick={() => {
            setFilter('contacts');
            setShowContactsView(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>Contacts</span>
          {contacts.length > 0 && (
            <span style={{
              fontSize: 10.5,
              background: isContactsActive ? '#111b21' : 'rgba(255, 255, 255, 0.15)',
              color: isContactsActive ? '#10b981' : '#94a3b8',
              padding: '1px 6px',
              borderRadius: 9999,
              fontWeight: 700,
            }}>
              {contacts.length}
            </span>
          )}
        </button>

        <button
          className={`wa-filter-pill ${filter === 'groups' && !showContactsView ? 'active' : ''}`}
          onClick={() => {
            setFilter('groups');
            setShowContactsView(false);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>Groups</span>
          {groupChatsCount > 0 && (
            <span style={{
              fontSize: 10.5,
              background: filter === 'groups' ? '#111b21' : 'rgba(255, 255, 255, 0.15)',
              color: filter === 'groups' ? '#10b981' : '#94a3b8',
              padding: '1px 6px',
              borderRadius: 9999,
              fontWeight: 700,
            }}>
              {groupChatsCount}
            </span>
          )}
        </button>

        <button
          className={`wa-filter-pill ${filter === 'broadcasts' && !showContactsView ? 'active' : ''}`}
          onClick={() => {
            setFilter('broadcasts');
            setShowContactsView(false);
          }}
        >
          Broadcasts
        </button>
      </div>

      {/* ── Advanced Date & Keyword Filter Drawer ────────────────────────── */}
      {showFilterDrawer && (
        <div style={{
          padding: '12px 14px',
          background: '#111b21',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* Header: Title and Reset */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#f8fafc' }}>
              <Filter size={14} color="#00a884" />
              <span>Filter Chats by Date & Keywords</span>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setDateFilterPreset('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setReplyKeywords([]);
                  setKeywordInput('');
                  setReplyDirection('all');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2dd4bf',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                <RotateCcw size={11} />
                <span>Reset All</span>
              </button>
            )}
          </div>

          {/* Date Range Presets */}
          <div>
            <div style={{ fontSize: 11, color: '#8696a0', marginBottom: 5, fontWeight: 600 }}>
              MESSAGE DATE RANGE
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last7', label: 'Last 7 Days' },
                { id: 'last30', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setDateFilterPreset(preset.id as any)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 14,
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: dateFilterPreset === preset.id ? '#00a884' : 'rgba(255, 255, 255, 0.05)',
                    color: dateFilterPreset === preset.id ? '#ffffff' : '#aebac1',
                    borderColor: dateFilterPreset === preset.id ? '#00a884' : 'rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {dateFilterPreset === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#202c33',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 6,
                    padding: '5px 8px',
                    fontSize: 12,
                    color: '#e9edef',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 11, color: '#8696a0' }}>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#202c33',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 6,
                    padding: '5px 8px',
                    fontSize: 12,
                    color: '#e9edef',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>

          {/* Word in reply / message keywords (matches user's screenshot) */}
          <div>
            <div style={{ fontSize: 11, color: '#8696a0', marginBottom: 5, fontWeight: 600 }}>
              WORD IN REPLY / MESSAGE KEYWORDS
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#202c33',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '2px 8px',
              gap: 6,
            }}>
              <Search size={13} color="#8696a0" />
              <input
                type="text"
                placeholder='Word in reply — e.g. "thank", "price"...'
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && keywordInput.trim()) {
                    e.preventDefault();
                    const trimmed = keywordInput.trim().toLowerCase();
                    if (!replyKeywords.includes(trimmed)) {
                      setReplyKeywords([...replyKeywords, trimmed]);
                    }
                    setKeywordInput('');
                  }
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  color: '#e9edef',
                  padding: '6px 0',
                }}
              />
              {keywordInput.trim() && (
                <button
                  onClick={() => {
                    const trimmed = keywordInput.trim().toLowerCase();
                    if (!replyKeywords.includes(trimmed)) {
                      setReplyKeywords([...replyKeywords, trimmed]);
                    }
                    setKeywordInput('');
                  }}
                  style={{
                    background: '#00a884',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 4,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              )}
            </div>

            {/* Keyword Tag Chips matching screenshot style */}
            {replyKeywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {replyKeywords.map(kw => (
                  <span
                    key={kw}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                      borderRadius: 8,
                      padding: '3px 8px',
                      fontSize: 11.5,
                      color: '#fb7185',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ fontSize: 11, opacity: 0.8 }}>⊘</span>
                    <span>{kw}</span>
                    <span
                      style={{ cursor: 'pointer', marginLeft: 2, color: '#fda4af', fontSize: 13 }}
                      onClick={() => setReplyKeywords(replyKeywords.filter(k => k !== kw))}
                      title={`Remove "${kw}"`}
                    >
                      ⊗
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Direction Filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
            <span style={{ fontSize: 11, color: '#8696a0', fontWeight: 600 }}>REPLY TYPE:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'incoming', label: 'Incoming Only' },
                { id: 'outgoing', label: 'Sent Only' },
              ].map(dir => (
                <button
                  key={dir.id}
                  onClick={() => setReplyDirection(dir.id as any)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: replyDirection === dir.id ? 'rgba(0, 168, 132, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    color: replyDirection === dir.id ? '#00a884' : '#8696a0',
                  }}
                >
                  {dir.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Active Filter Badges Bar ────────────────────────────────────── */}
      {activeFiltersCount > 0 && !showFilterDrawer && (
        <div style={{
          padding: '6px 14px',
          background: 'rgba(0, 168, 132, 0.08)',
          borderBottom: '1px solid rgba(0, 168, 132, 0.2)',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          fontSize: 11,
        }}>
          <span style={{ color: '#00a884', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={11} /> Filters:
          </span>
          {dateFilterPreset !== 'all' && (
            <span style={{
              background: 'rgba(45, 212, 191, 0.15)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              borderRadius: 10,
              padding: '1px 6px',
              color: '#2dd4bf',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              📅 {dateFilterPreset === 'custom' ? `${customStartDate || 'Start'} to ${customEndDate || 'End'}` : dateFilterPreset}
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setDateFilterPreset('all')} />
            </span>
          )}
          {replyKeywords.map(kw => (
            <span key={kw} style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              borderRadius: 8,
              padding: '1px 6px',
              color: '#fb7185',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
            }}>
              <span>⊘ {kw}</span>
              <span style={{ cursor: 'pointer', color: '#fda4af', fontSize: 12 }} onClick={() => setReplyKeywords(replyKeywords.filter(k => k !== kw))}>⊗</span>
            </span>
          ))}
          {replyDirection !== 'all' && (
            <span style={{
              background: 'rgba(45, 212, 191, 0.15)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              borderRadius: 10,
              padding: '1px 6px',
              color: '#2dd4bf',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              {replyDirection === 'incoming' ? '📥 Incoming' : '📤 Outgoing'}
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setReplyDirection('all')} />
            </span>
          )}
          <button
            onClick={() => {
              setDateFilterPreset('all');
              setCustomStartDate('');
              setCustomEndDate('');
              setReplyKeywords([]);
              setKeywordInput('');
              setReplyDirection('all');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              marginLeft: 'auto',
              textDecoration: 'underline',
              fontSize: 10.5,
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Chat List Items Matching Image 4 ────────────────────────────── */}
      <div className="wa-chat-items-list">
        {loading && chats.length === 0 ? (
          <div className="wa-skeleton-list">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="wa-skeleton-item">
                <div className="wa-skeleton-line wa-skeleton-avatar" />
                <div className="wa-skeleton-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="wa-skeleton-line" style={{ width: '120px', height: '14px' }} />
                    <div className="wa-skeleton-line" style={{ width: '40px', height: '10px' }} />
                  </div>
                  <div className="wa-skeleton-line" style={{ width: '180px', height: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : isContactsActive ? (
          /* Contacts View */
          filteredContacts.length === 0 ? (
            <div className="wa-empty-state">
              <Users size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No contacts found matching &quot;{search}&quot;</p>
            </div>
          ) : (
            <>
              {visibleContacts.map(contact => {
                const color = getAvatarColor(contact.id);
                const resolvedContact = resolveChatDisplayName(contact, contacts);
                const isLid = isLidId(contact.id) || isLidId(contact.phoneNumber);
                const cleanDigits = contact.id.split('@')[0].replace(/\D/g, '');
                const cleanContactPhone = (contact.phoneNumber && !isProperName(contact.phoneNumber) && !isLid)
                  ? contact.phoneNumber
                  : (!isLid && cleanDigits.length >= 7 ? (formatE164(cleanDigits) || `+${cleanDigits}`) : '');
                const properContactName = (contact.name && isProperName(contact.name)) ? contact.name.trim() :
                                          (contact.notifyName && isProperName(contact.notifyName)) ? contact.notifyName.trim() : '';
                const displayName = (resolvedContact.name && isProperName(resolvedContact.name))
                  ? resolvedContact.name
                  : (properContactName || cleanContactPhone || '');
                return (
                  <div
                    key={contact.id}
                    className="wa-chat-item"
                    onClick={() => {
                      onSelectContact(contact);
                      setShowContactsView(false);
                      setFilter('all');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="wa-avatar" style={{ backgroundColor: color }}>
                      {getInitials(displayName || properContactName || cleanContactPhone)}
                    </div>
                    <div className="wa-chat-content">
                      <div className="wa-chat-top-row">
                        <span className="wa-chat-name" title={displayName}>
                          {displayName || properContactName || cleanContactPhone}
                        </span>
                      </div>
                      <div className="wa-chat-bottom-row">
                        <span className="wa-msg-text">
                          {properContactName && cleanContactPhone ? cleanContactPhone : (cleanContactPhone || properContactName || '')}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', paddingRight: 8, flexShrink: 0 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 9px',
                        borderRadius: 6,
                        background: 'rgba(0, 168, 132, 0.15)',
                        border: '1px solid rgba(0, 168, 132, 0.3)',
                        color: '#00a884',
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        <MessageSquare size={12} />
                        <span>Chat</span>
                      </span>
                    </div>
                  </div>
                );
              })}
              {visibleContacts.length < filteredContacts.length && (
                <div style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    className="wa-action-btn-sm"
                    onClick={() => setContactsLimit(prev => prev + 100)}
                    style={{
                      background: '#202c33',
                      border: '1px solid #2a3942',
                      color: '#00a884',
                      padding: '6px 16px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Load More Contacts ({filteredContacts.length - visibleContacts.length} remaining)
                  </button>
                </div>
              )}
            </>
          )
        ) : filteredChats.length === 0 ? (
          /* Empty Chat List */
          <div className="wa-empty-state">
            <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>{search ? 'No chats match your search' : 'No chats available'}</p>
            <button
              className="wa-action-btn-sm"
              onClick={() => setShowContactsView(true)}
              style={{ marginTop: 12 }}
            >
              Start a Chat from Contacts ({contacts.length})
            </button>
          </div>
        ) : (
          <>
            {visibleChats.map(chat => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isSelected={selectedChatId === chat.id}
                onSelectChat={onSelectChat}
                contacts={contacts}
                accounts={accounts}
              />
            ))}
            {visibleChatCount < filteredChats.length && (
              <div ref={chatSentinelRef} style={{ height: 24, width: '100%' }} />
            )}
          </>
        )}

        {/* When searching, also show matching contacts so user can chat with anyone */}
        {search.trim() && filteredContacts.length > 0 && !showContactsView && (
          <div className="wa-search-contacts-group">
            <div className="wa-search-contacts-title">
              <span>CONTACTS ({filteredContacts.length})</span>
            </div>
            {filteredContacts.slice(0, 30).map(contact => {
              const color = getAvatarColor(contact.id);
              const resolvedSearch = resolveChatDisplayName(contact, contacts);
              const isLid = isLidId(contact.id) || isLidId(contact.phoneNumber);
              const cleanDigits = contact.id.split('@')[0].replace(/\D/g, '');
              const cleanContactPhone = (contact.phoneNumber && !isProperName(contact.phoneNumber) && !isLid)
                ? contact.phoneNumber
                : (!isLid && cleanDigits.length >= 7 ? (formatE164(cleanDigits) || `+${cleanDigits}`) : '');
              const properContactName = (contact.name && isProperName(contact.name)) ? contact.name.trim() :
                                        (contact.notifyName && isProperName(contact.notifyName)) ? contact.notifyName.trim() : '';
              const displayName = (resolvedSearch.name && isProperName(resolvedSearch.name))
                ? resolvedSearch.name
                : (properContactName || cleanContactPhone || '');
              return (
                <div
                  key={'sc-' + contact.id}
                  className="wa-chat-item"
                  onClick={() => onSelectContact(contact)}
                >
                  <div className="wa-avatar" style={{ backgroundColor: color }}>
                    {getInitials(displayName || properContactName || cleanContactPhone)}
                  </div>
                  <div className="wa-chat-content">
                    <div className="wa-chat-top-row">
                      <span className="wa-chat-name" title={displayName}>
                        {displayName || properContactName || cleanContactPhone}
                      </span>
                    </div>
                    <div className="wa-chat-bottom-row">
                      <span className="wa-msg-text">
                        {properContactName && cleanContactPhone ? cleanContactPhone : (cleanContactPhone || properContactName || '')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
