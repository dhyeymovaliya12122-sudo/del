import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Plus, Check, Power, Trash2, MoreVertical,
  MessageSquare, Users, SlidersHorizontal, Eye, Shield,
  CreditCard, CheckCircle2, XCircle, ArrowUpDown, Filter,
  Smartphone, ChevronRight, Settings, ExternalLink, RefreshCw, X, QrCode,
  Calendar, Clock, Send, Sparkles, MessageCircle, FileText, CheckCircle,
  AlertCircle, ArrowRight, Play, ListFilter, UserCheck, Inbox, Reply,
  Edit3, AlertTriangle, WifiOff
} from 'lucide-react';
import {
  Account, WhatsAppChat, WhatsAppMessage, WhatsAppContact,
  accountsApi, whatsappWebApi, schedulerApi, authApi
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIndianLastActive, formatIndianDateTime } from '../../utils/indianTime';
import { BackButton } from '../common/BackButton';

export type DateFilterPreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'all' | 'custom';

export interface ChatPlanItem {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  recipients: string[];
  message: string;
  timing: 'now' | 'scheduled';
  scheduledAt?: string;
  repeatType?: 'once' | 'daily' | 'weekly' | 'monthly';
  status: 'sent' | 'scheduled' | 'pending' | 'failed';
  createdAt: string;
}

interface WhatsAppAccountsManagerDashboardProps {
  accounts: Account[];
  activeAccount: Account | null;
  onSelectAccount: (account: Account) => void;
  onAddAccount?: () => void;
  onRefreshAccounts?: (params?: { startDate?: string; endDate?: string }) => void | Promise<void>;
  onStopAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
  onNavigateToChats?: (account: Account) => void;
  onOpenQR?: (account: Account) => void;
  onKpiClick?: (type: 'accounts' | 'active' | 'users') => void;
  onBack?: () => void;
  userName?: string;
  userRole?: string;
  totalUsers?: number;
}


function highlightKeyword(text: string, keywords: string[]) {
  if (!text || keywords.length === 0) return <span>{text}</span>;
  const valid = keywords.filter(k => k && k.trim());
  if (valid.length === 0) return <span>{text}</span>;
  const escaped = valid.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        valid.some(k => k.toLowerCase() === part.toLowerCase()) ? (
          <mark
            key={i}
            style={{
              background: 'rgba(244, 63, 94, 0.25)',
              color: '#fda4af',
              padding: '1px 4px',
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}


export default function WhatsAppAccountsManagerDashboard({
  accounts,
  activeAccount,
  onSelectAccount,
  onAddAccount,
  onRefreshAccounts,
  onStopAccount,
  onDeleteAccount,
  onNavigateToChats,
  onOpenQR,
  onKpiClick,
  onBack,
  userName = 'Super Admin',
  userRole = 'SUPER_ADMIN',
  totalUsers = 0,
}: WhatsAppAccountsManagerDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<any | null>(null);
  const [editingAccountName, setEditingAccountName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [liveUsersCount, setLiveUsersCount] = useState<number | null>(null);
  const { addToast } = useToast();

  // ── Status & Admin / Super Admin Filter States ─────────────────────────
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONNECTED' | 'DISCONNECTED'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [dashboardAdmins, setDashboardAdmins] = useState<any[]>([]);

  useEffect(() => {
    authApi.listAdmins().then((res: any) => {
      if (Array.isArray(res)) setDashboardAdmins(res);
      else if (res && Array.isArray(res.admins)) setDashboardAdmins(res.admins);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem('wa_dashboard_demo_mode');
    } catch {}
  }, []);


  // ── Date Filtering State ──────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [enrichedAccounts, setEnrichedAccounts] = useState<Account[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);

  // ── Account Chats Explorer Modal State ────────────────────────────────────
  const [chatExplorerAccount, setChatExplorerAccount] = useState<Account | null>(null);
  const [accountChats, setAccountChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [chatMessages, setChatMessages] = useState<WhatsAppMessage[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // ── Account Chats Explorer Date & Keyword Filter State ────────────────────
  const [explorerDatePreset, setExplorerDatePreset] = useState<DateFilterPreset>('all');
  const [explorerCustomStart, setExplorerCustomStart] = useState<string>('');
  const [explorerCustomEnd, setExplorerCustomEnd] = useState<string>('');
  const [explorerKeywords, setExplorerKeywords] = useState<string[]>([]);
  const [explorerKeywordInput, setExplorerKeywordInput] = useState<string>('');
  const [explorerStatusFilter, setExplorerStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [explorerDirectionFilter, setExplorerDirectionFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  const explorerDateRange = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    let label = 'All Time';

    if (explorerDatePreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `Today (${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
    } else if (explorerDatePreset === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      label = 'Yesterday';
    } else if (explorerDatePreset === 'last7') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      end = new Date();
      label = 'Last 7 Days';
    } else if (explorerDatePreset === 'last30') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
      end = new Date();
      label = 'Last 30 Days';
    } else if (explorerDatePreset === 'custom') {
      if (explorerCustomStart) start = new Date(`${explorerCustomStart}T00:00:00`);
      if (explorerCustomEnd) end = new Date(`${explorerCustomEnd}T23:59:59`);
      label = 'Custom Range';
    }

    return {
      startDate: start ? start.toISOString() : undefined,
      endDate: end ? end.toISOString() : undefined,
      label,
    };
  }, [explorerDatePreset, explorerCustomStart, explorerCustomEnd]);

  const filteredExplorerChats = useMemo(() => {
    return accountChats.filter(chat => {
      if (chatSearch.trim()) {
        const q = chatSearch.toLowerCase();
        const matchesName = (chat.name || chat.id).toLowerCase().includes(q);
        const matchesText = (chat.lastMessageText || '').toLowerCase().includes(q);
        if (!matchesName && !matchesText) return false;
      }
      if (explorerStatusFilter === 'unread' && (!chat.unreadCount || chat.unreadCount === 0)) return false;
      if (explorerStatusFilter === 'read' && (chat.unreadCount && chat.unreadCount > 0)) return false;
      if (explorerDirectionFilter === 'incoming' && chat.lastMessageFromMe) return false;
      if (explorerDirectionFilter === 'outgoing' && !chat.lastMessageFromMe) return false;
      if (explorerKeywords.length > 0) {
        const text = (chat.lastMessageText || '').toLowerCase();
        const matches = explorerKeywords.some(kw => text.includes(kw.toLowerCase()));
        if (!matches) return false;
      }
      return true;
    });
  }, [accountChats, chatSearch, explorerStatusFilter, explorerDirectionFilter, explorerKeywords]);

  // ── Chats Create Plan Modal & State ───────────────────────────────────────
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [planAccountId, setPlanAccountId] = useState<string>('');
  const [planName, setPlanName] = useState<string>('');
  const [planRecipients, setPlanRecipients] = useState<string>('');
  const [planMessage, setPlanMessage] = useState<string>('');
  const [planTiming, setPlanTiming] = useState<'now' | 'scheduled'>('now');
  const [planScheduledAt, setPlanScheduledAt] = useState<string>('');
  const [planRepeat, setPlanRepeat] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [accountContacts, setAccountContacts] = useState<WhatsAppContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [chatPlans, setChatPlans] = useState<ChatPlanItem[]>(() => {
    try {
      const stored = localStorage.getItem('wa_chat_plans');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save chat plans to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wa_chat_plans', JSON.stringify(chatPlans));
    } catch { }
  }, [chatPlans]);

  // Compute start/end dates based on current preset
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    let label = 'Today';

    if (datePreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `Today (${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
    } else if (datePreset === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      label = `Yesterday (${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
    } else if (datePreset === 'last7') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      end = new Date();
      label = `Last 7 Days (${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
    } else if (datePreset === 'last30') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
      end = new Date();
      label = `Last 30 Days (${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
    } else if (datePreset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date();
      label = `This Month (${start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`;
    } else if (datePreset === 'custom') {
      if (customStartDate) start = new Date(`${customStartDate}T00:00:00`);
      if (customEndDate) end = new Date(`${customEndDate}T23:59:59`);
      label = `Custom (${customStartDate || 'Start'} to ${customEndDate || 'Now'})`;
    } else {
      label = 'All Time';
    }

    return {
      startDate: start ? start.toISOString() : undefined,
      endDate: end ? end.toISOString() : undefined,
      label,
    };
  }, [datePreset, customStartDate, customEndDate]);

  // Fetch accounts enriched with live incoming and response metrics
  const fetchEnrichedMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const data = await accountsApi.list({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (Array.isArray(data)) {
        setEnrichedAccounts(data);
      }
    } catch (err: any) {
      console.warn('Failed to load accounts message metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchEnrichedMetrics();
  }, [dateRange.startDate, dateRange.endDate]);

  // When accounts prop updates with new IDs or status changes, refresh metrics
  const accountsKey = useMemo(() => {
    return (accounts || []).map(a => `${a.id}:${a.status}`).join('|');
  }, [accounts]);

  const prevAccountsKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (accounts && accounts.length > 0 && prevAccountsKeyRef.current !== accountsKey) {
      prevAccountsKeyRef.current = accountsKey;
      fetchEnrichedMetrics();
    }
  }, [accountsKey]);

  // Load super admins count
  useEffect(() => {
    let isMounted = true;
    authApi.listAdmins()
      .then(admins => {
        if (isMounted && Array.isArray(admins)) {
          setLiveUsersCount(admins.length);
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  const displayUsersCount = liveUsersCount ?? (totalUsers || 0);

  // Active accounts list merging incoming accounts with fresh metric stats
  const activeAccountsList = useMemo(() => {
    return enrichedAccounts.length > 0 ? enrichedAccounts : accounts || [];
  }, [enrichedAccounts, accounts]);

  // Map real accounts to display models
  const displayAccounts = useMemo(() => {
    if (!activeAccountsList || activeAccountsList.length === 0) {
      return [];
    }

    const avatars = ['#0f766e', '#059669', '#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b'];

    return activeAccountsList.map((acc, idx) => {
      const isConn = acc.status === 'CONNECTED';
      const isUnlinked = acc.phoneNumber?.startsWith('unlinked_') || acc.phoneNumber?.startsWith('pending_');

      const lastAct = formatIndianLastActive(
        (acc as any).lastActivity || (acc as any).updatedAt || (acc as any).lastSeen,
        isConn
      );

      const initials = (acc.displayName || acc.phoneNumber || 'WA')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 2)
        .toUpperCase() || 'WA';

      const todaysIncoming = acc.todaysIncoming ?? 0;
      const todaysOutgoing = acc.todaysOutgoing ?? 0;
      const filteredIncoming = acc.filteredIncoming ?? todaysIncoming;
      const filteredOutgoing = acc.filteredOutgoing ?? todaysOutgoing;
      const totalIncoming = acc.totalIncoming ?? todaysIncoming;
      const totalOutgoing = acc.totalOutgoing ?? todaysOutgoing;

      return {
        id: acc.id,
        raw: acc,
        displayName: acc.displayName && !acc.displayName.includes('unlinked') ? acc.displayName : `Account ${idx + 1}`,
        phoneNumber: isUnlinked ? '⚠ Not linked yet' : (acc.phoneNumber || ''),
        status: acc.status || 'DISCONNECTED',
        avatarText: initials,
        avatarBg: avatars[idx % avatars.length],
        lastActivity: lastAct,
        messagesToday: acc.chatCount || 0,
        tier: (acc as any).tier || 'Tier 2 (10k / 24h)',
        todaysIncoming,
        todaysOutgoing,
        filteredIncoming,
        filteredOutgoing,
        totalIncoming,
        totalOutgoing,
      };
    });
  }, [activeAccountsList]);

  // Aggregate message metrics across all accounts
  const totals = useMemo(() => {
    const todaysIn = displayAccounts.reduce((sum, a) => sum + a.todaysIncoming, 0);
    const todaysOut = displayAccounts.reduce((sum, a) => sum + a.todaysOutgoing, 0);
    const periodIn = displayAccounts.reduce((sum, a) => sum + a.filteredIncoming, 0);
    const periodOut = displayAccounts.reduce((sum, a) => sum + a.filteredOutgoing, 0);
    const totalIn = displayAccounts.reduce((sum, a) => sum + (a.totalIncoming || 0), 0);
    const totalOut = displayAccounts.reduce((sum, a) => sum + (a.totalOutgoing || 0), 0);
    const responseRate = totalIn > 0 ? Math.min(100, Math.round((totalOut / totalIn) * 100)) : 100;
    return {
      todaysIn,
      todaysOut,
      periodIn,
      periodOut,
      totalIn,
      totalOut,
      responseRate,
    };
  }, [displayAccounts]);

  // Filter accounts by status (CONNECTED / DISCONNECTED), role/admin scope, and search term
  const filteredAccounts = useMemo(() => {
    return displayAccounts.filter(a => {
      // 1. Status Filter
      const isDisc = a.status === 'DISCONNECTED' || (a.status as any) === 'disconnected' || (a.raw as any)?.status === 'DISCONNECTED';
      if (statusFilter === 'CONNECTED' && isDisc) return false;
      if (statusFilter === 'DISCONNECTED' && !isDisc) return false;

      // 2. Role / Scope Filter
      if (roleFilter !== 'ALL') {
        const subAdmins = dashboardAdmins.filter(adm => adm.role !== 'SUPER_ADMIN');
        if (roleFilter === 'SUPER_ADMIN') {
          const isAssignedToSubAdmin = subAdmins.some(adm => (adm.accountIds || []).includes(a.id));
          if (isAssignedToSubAdmin) return false;
        } else if (roleFilter === 'SUB_ADMIN') {
          const isAssignedToSubAdmin = subAdmins.some(adm => (adm.accountIds || []).includes(a.id));
          if (!isAssignedToSubAdmin) return false;
        } else {
          const specificAdmin = dashboardAdmins.find(adm => adm.id === roleFilter);
          if (specificAdmin && !(specificAdmin.accountIds || []).includes(a.id)) return false;
        }
      }

      // 3. Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = a.displayName.toLowerCase().includes(q);
        const matchPhone = a.phoneNumber.toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }

      return true;
    });
  }, [displayAccounts, statusFilter, roleFilter, dashboardAdmins, searchTerm]);

  const totalAccounts = displayAccounts.length;
  const totalAccountsCount = displayAccounts.length;
  const activeAccountsCount = displayAccounts.filter(a => a.status === 'CONNECTED').length;
  const connectedAccountsCount = activeAccountsCount;
  const reconnectingCount = displayAccounts.filter(a => a.status === 'RECONNECTING').length;
  const disconnectedAccounts = useMemo(() => {
    return displayAccounts.filter(a => a.status === 'DISCONNECTED' || (a.status as any) === 'disconnected' || (a.raw as any)?.status === 'DISCONNECTED');
  }, [displayAccounts]);
  const disconnectedAccountsCount = disconnectedAccounts.length;
  const activePercent = totalAccounts > 0 ? Math.round((activeAccountsCount / totalAccounts) * 100) : 0;

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadExplorerChats = async (account: Account, startDate?: string, endDate?: string) => {
    setIsLoadingChats(true);
    try {
      const chats = await whatsappWebApi.getChats(
        account.id,
        undefined,
        300,
        0,
        startDate,
        endDate
      );
      setAccountChats(chats || []);
      if (chats && chats.length > 0) {
        handleSelectChatInExplorer(account.id, chats[0]);
      } else {
        setSelectedChat(null);
        setChatMessages([]);
      }
    } catch (err: any) {
      console.error('Failed to load account chats:', err);
      addToast('error', `Could not load chats for ${account.displayName || account.phoneNumber}`);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleOpenChatExplorer = async (account: Account) => {
    setChatExplorerAccount(account);
    setSelectedChat(null);
    setChatMessages([]);
    setExplorerDatePreset(datePreset);
    setExplorerCustomStart(customStartDate);
    setExplorerCustomEnd(customEndDate);
    setExplorerKeywords([]);
    setExplorerKeywordInput('');
    setExplorerStatusFilter('all');
    setExplorerDirectionFilter('all');
    setChatSearch('');
    loadExplorerChats(account, dateRange.startDate, dateRange.endDate);
  };

  // Re-fetch explorer chats when explorer date preset changes
  useEffect(() => {
    if (chatExplorerAccount) {
      loadExplorerChats(chatExplorerAccount, explorerDateRange.startDate, explorerDateRange.endDate);
    }
  }, [explorerDateRange.startDate, explorerDateRange.endDate]);

  const handleSelectChatInExplorer = async (accountId: string, chat: WhatsAppChat) => {
    setSelectedChat(chat);
    setIsLoadingMessages(true);
    try {
      const messages = await whatsappWebApi.getMessages(accountId, chat.id, 80);
      setChatMessages(messages || []);
      if ((!messages || messages.length === 0) && accountId) {
        whatsappWebApi.syncChat(accountId, chat.id, 50).catch(() => null);
      }
    } catch (err: any) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleFetchExplorerHistory = async () => {
    if (!chatExplorerAccount || !selectedChat || isLoadingMessages) return;
    setIsLoadingMessages(true);
    addToast('info', 'Requesting message history from phone...');
    try {
      await whatsappWebApi.syncChat(chatExplorerAccount.id, selectedChat.id, 50);
      await new Promise(r => setTimeout(r, 1500));
      const fresh = await whatsappWebApi.getMessages(chatExplorerAccount.id, selectedChat.id, 80);
      setChatMessages(fresh || []);
      if (fresh && fresh.length > 0) {
        addToast('success', `Synchronized ${fresh.length} messages from phone!`);
      } else {
        addToast('info', 'History requested. Older messages will appear once synced.');
      }
    } catch (err: any) {
      console.warn('Sync history error:', err);
      addToast('warning', 'Sync request sent to phone.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendExplorerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !chatExplorerAccount || !selectedChat) return;

    setIsSendingReply(true);
    try {
      await whatsappWebApi.sendMessage(
        chatExplorerAccount.id,
        selectedChat.id,
        replyText.trim()
      );
      addToast('success', `Message sent to ${selectedChat.name || selectedChat.id}`);
      setReplyText('');
      // Reload conversation messages
      const msgs = await whatsappWebApi.getMessages(chatExplorerAccount.id, selectedChat.id, 80);
      setChatMessages(msgs || []);
      // Refresh metrics in background
      fetchEnrichedMetrics();
    } catch (err: any) {
      console.error('Failed to send reply:', err);
      addToast('error', err?.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSendingReply(false);
    }
  };

  // ── Open Create Plan Modal ────────────────────────────────────────────────
  const handleOpenCreatePlan = (defaultAccountId?: string) => {
    const accId = defaultAccountId || (activeAccount?.id ?? (displayAccounts[0]?.id || ''));
    setPlanAccountId(accId);
    setPlanName(`Outreach Plan ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
    setPlanRecipients('');
    setPlanMessage('Hello {name}, thank you for contacting us! How can we assist your business today?');
    setPlanTiming('now');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setPlanScheduledAt(tomorrow.toISOString().slice(0, 16));
    setShowCreatePlanModal(true);

    if (accId) {
      loadAccountContacts(accId);
    }
  };

  const loadAccountContacts = async (accountId: string) => {
    if (!accountId) return;
    setIsLoadingContacts(true);
    try {
      const contacts = await whatsappWebApi.getContacts(accountId);
      setAccountContacts(contacts || []);
    } catch (err) {
      console.warn('Could not load account contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planAccountId) {
      addToast('error', 'Please select an account');
      return;
    }
    if (!planMessage.trim()) {
      addToast('error', 'Please enter a message for this plan');
      return;
    }

    const recipientsList = planRecipients
      .split(/[\n,;]+/)
      .map(r => r.trim().replace(/[^0-9]/g, ''))
      .filter(r => r.length >= 8);

    if (recipientsList.length === 0) {
      addToast('error', 'Please enter at least one valid recipient phone number');
      return;
    }

    setIsCreatingPlan(true);
    const targetAccount = displayAccounts.find(a => a.id === planAccountId);
    const accountName = targetAccount?.displayName || 'Account';

    try {
      if (planTiming === 'now') {
        // Immediate dispatch
        let sentCount = 0;
        for (const phone of recipientsList) {
          try {
            const formatted = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
            const personalizedMsg = planMessage.replace('{phone}', phone).replace('{name}', 'Customer');
            await whatsappWebApi.sendMessage(planAccountId, formatted, personalizedMsg);
            sentCount++;
          } catch (err: any) {
            console.warn(`Failed to dispatch message to ${phone}:`, err.message);
          }
        }

        const newPlan: ChatPlanItem = {
          id: `plan_${Date.now()}`,
          name: planName.trim() || 'Immediate Outreach Plan',
          accountId: planAccountId,
          accountName,
          recipients: recipientsList,
          message: planMessage,
          timing: 'now',
          status: sentCount > 0 ? 'sent' : 'failed',
          createdAt: new Date().toISOString(),
        };

        setChatPlans(prev => [newPlan, ...prev]);
        addToast('success', `Plan executed! Dispatched to ${sentCount}/${recipientsList.length} recipient(s).`);
      } else {
        // Scheduled outreach plan
        const scheduledTime = planScheduledAt ? new Date(planScheduledAt) : new Date(Date.now() + 3600000);
        for (const phone of recipientsList) {
          try {
            const formatted = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
            await schedulerApi.create({
              accountId: planAccountId,
              toJid: formatted,
              messageText: planMessage.replace('{phone}', phone).replace('{name}', 'Customer'),
              scheduledAt: scheduledTime.toISOString(),
              repeatType: planRepeat,
            });
          } catch (err: any) {
            console.warn(`Scheduler create skipped for ${phone}:`, err.message);
          }
        }

        const newPlan: ChatPlanItem = {
          id: `plan_${Date.now()}`,
          name: planName.trim() || 'Scheduled Outreach Plan',
          accountId: planAccountId,
          accountName,
          recipients: recipientsList,
          message: planMessage,
          timing: 'scheduled',
          scheduledAt: scheduledTime.toISOString(),
          repeatType: planRepeat,
          status: 'scheduled',
          createdAt: new Date().toISOString(),
        };

        setChatPlans(prev => [newPlan, ...prev]);
        addToast('success', `Plan "${newPlan.name}" scheduled for ${recipientsList.length} contacts!`);
      }

      setShowCreatePlanModal(false);
      fetchEnrichedMetrics();
    } catch (err: any) {
      console.error('Plan creation error:', err);
      addToast('error', err?.message || 'Failed to create plan');
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleOpenSettings = (account: any) => {
    setEditingAccountName(account.displayName || '');
    setShowSettingsModal(account);
  };

  const handleSaveAccountName = async () => {
    if (!showSettingsModal?.id || !editingAccountName.trim()) return;
    setIsSavingName(true);
    try {
      await accountsApi.update(showSettingsModal.id, { displayName: editingAccountName.trim() });
      addToast('success', `Account name updated to "${editingAccountName.trim()}"`);
      setShowSettingsModal((prev: any) => prev ? { ...prev, displayName: editingAccountName.trim() } : null);
      if (onRefreshAccounts) await onRefreshAccounts();
      fetchEnrichedMetrics();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to update account name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCreateAndScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) {
      addToast('error', 'Please enter an account name or label');
      return;
    }
    setCreatingAccount(true);
    try {
      const created = await accountsApi.create({
        displayName: newAccountName.trim(),
        phoneNumber: newPhoneNumber.trim() || undefined,
        tenantId: 'default-tenant',
      });
      addToast('success', `Account "${created.displayName}" created! Opening QR scanner...`);
      setShowAddAccountModal(false);
      setNewAccountName('');
      setNewPhoneNumber('');
      if (onRefreshAccounts) {
        await onRefreshAccounts();
      }
      if (onOpenQR) {
        onOpenQR(created);
      }
    } catch (err: any) {
      console.error('Failed to create account:', err);
      addToast('error', err?.response?.data?.message || 'Failed to create account');
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* ── 1. Top Welcome Banner Card Matching Design 19 ───────────────────── */}
      <div style={styles.welcomeBanner}>
        {/* Background ambient silk waves */}
        <div style={styles.bannerSilkWave}>
          <svg width="100%" height="100%" viewBox="0 0 900 130" fill="none" preserveAspectRatio="none">
            <path d="M0 100 Q 250 20, 550 85 T 900 45" stroke="rgba(45, 212, 191, 0.18)" strokeWidth="2" fill="none" />
            <path d="M40 120 Q 300 40, 620 95 T 900 60" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        <div style={styles.welcomeLeft}>
          {/* Double ring glowing WhatsApp emblem */}
          <div style={styles.waLogoWrapper}>
            <div style={styles.waLogoInner}>
              <Smartphone size={28} color="#ffffff" />
            </div>
          </div>

          <div style={styles.welcomeTextCol}>
            <div style={styles.welcomeSubtitleRow}>
              <BackButton onClick={onBack} label="Back to Previous Page" style={{ marginRight: 8, padding: '4px 10px', fontSize: 12 }} />
              <span style={styles.welcomeSubtitle}>Welcome back,</span>
              <span style={styles.clusterLivePill}>
                <span style={styles.livePulseDot} />
                CLUSTER LIVE
              </span>
            </div>
            <h1 style={styles.welcomeHeading}>{userName}</h1>
            <p style={styles.welcomeDesc}>
              Here's what's happening with your business accounts & active message flow
            </p>
          </div>
        </div>

        {/* Row of KPI Cards on right of banner */}
        <div style={styles.kpiCardsRow}>
          {/* Card 1: Total Accounts */}
          <div
            style={{ ...styles.kpiCard, cursor: 'pointer' }}
            onClick={() => onKpiClick?.('accounts')}
            title={`${totalAccounts} account(s): ${displayAccounts.map(a => a.displayName).join(', ')}`}
          >
            <div style={styles.kpiCardTop}>
              <div style={{ ...styles.kpiIconWrap, background: 'rgba(45, 212, 191, 0.15)', color: '#2dd4bf' }}>
                <Users size={16} />
              </div>
              <div style={styles.kpiTitle}>Total Accounts</div>
            </div>
            <div style={styles.kpiNumberRow}>
              <span style={styles.kpiNumber}>{totalAccounts}</span>
              {totalAccounts > 0 ? (
                reconnectingCount > 0
                  ? <span style={{ ...styles.kpiTrendPositive, color: '#f59e0b' }}>⟳ {reconnectingCount} reconn.</span>
                  : <span style={styles.kpiTrendPositive}>● {activeAccountsCount} active</span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddAccount) onAddAccount();
                    else setShowAddAccountModal(true);
                  }}
                  style={styles.kpiActionBtn}
                  title="Click to pair a new account"
                >
                  + Pair Device
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Active Accounts */}
          <div
            style={{ ...styles.kpiCard, cursor: 'pointer' }}
            onClick={() => onKpiClick?.('active')}
            title={`${activeAccountsCount} connected accounts`}
          >
            <div style={styles.kpiCardTop}>
              <div style={{ ...styles.kpiIconWrap, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <span style={styles.kpiGreenDot} />
              </div>
              <div style={styles.kpiTitle}>Active Accounts</div>
            </div>
            <div style={styles.kpiNumberRow}>
              <span style={styles.kpiNumber}>{activeAccountsCount}</span>
              {totalAccounts > 0 ? (
                <span style={activePercent >= 50 ? styles.kpiPercentActive : { ...styles.kpiPercentActive, color: '#f59e0b' }}>
                  {activePercent}% live
                </span>
              ) : (
                <span style={styles.kpiZeroLiveStatus}>
                  <span style={styles.livePulseDot} />
                  Mesh Ready
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Total Messages In */}
          <div
            style={{ ...styles.kpiCard, border: '1px solid rgba(56, 189, 248, 0.35)' }}
            title="Total inbound messages received across all accounts"
          >
            <div style={styles.kpiCardTop}>
              <div style={{ ...styles.kpiIconWrap, background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8' }}>
                <Inbox size={15} />
              </div>
              <div style={styles.kpiTitle}>Total Messages In</div>
            </div>
            <div style={styles.kpiNumberRow}>
              <span style={{ ...styles.kpiNumber, color: '#38bdf8' }}>{totals.totalIn}</span>
              {totals.totalIn > 0 ? (
                <span style={{ ...styles.kpiTrendPositive, color: '#38bdf8' }}>📥 {totals.todaysIn} today</span>
              ) : (
                <span style={{ ...styles.kpiZeroLiveStatus, color: '#38bdf8' }}>
                  📥 Stream Live
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Total Messages Sent */}
          <div
            style={{ ...styles.kpiCard, border: '1px solid rgba(16, 185, 129, 0.35)' }}
            title="Total outbound messages sent across all accounts"
          >
            <div style={styles.kpiCardTop}>
              <div style={{ ...styles.kpiIconWrap, background: 'rgba(16, 185, 129, 0.18)', color: '#10b981' }}>
                <Reply size={15} />
              </div>
              <div style={styles.kpiTitle}>Total Messages Sent</div>
            </div>
            <div style={styles.kpiNumberRow}>
              <span style={{ ...styles.kpiNumber, color: '#10b981' }}>{totals.totalOut}</span>
              {totals.totalOut > 0 ? (
                <span style={{ ...styles.kpiTrendPositive, color: '#10b981' }}>📤 {totals.todaysOut} today</span>
              ) : (
                <span style={{ ...styles.kpiZeroLiveStatus, color: '#10b981' }}>
                  📤 Queue Ready
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Disconnected Accounts Alert & Tracking Banner (Admin & Super Admin) ── */}
      {disconnectedAccounts.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(185, 28, 28, 0.08) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <AlertTriangle size={18} color="#f87171" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#f87171' }}>
                    ⚠️ {disconnectedAccounts.length} Disconnected Account{disconnectedAccounts.length > 1 ? 's' : ''}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 999, padding: '2px 8px'
                  }}>
                    Action Required
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  The following numbers are disconnected. Scan QR to restore message synchronization.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {disconnectedAccounts.map(account => {
              const raw = account.raw;
              const discTime = (raw as any)?.disconnectedAt || (raw as any)?.updatedAt || (raw as any)?.createdAt;
              const discBy = (raw as any)?.disconnectedBy || 'Session Expired / Logged out from Mobile';
              const formattedDate = formatIndianDateTime(discTime);

              return (
                <div
                  key={account.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 10,
                    flexWrap: 'wrap', gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name:</span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>
                          {account.displayName || 'Account'}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginLeft: 6 }}>Number:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
                          {account.phoneNumber}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSettings(account);
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 7px', borderRadius: 5,
                            background: 'rgba(45, 212, 191, 0.1)', border: '1px solid rgba(45, 212, 191, 0.3)',
                            color: '#2dd4bf', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                          title="Edit / Add Account Name"
                        >
                          <Edit3 size={11} />
                          <span>{account.displayName ? 'Edit Name' : '+ Add Name'}</span>
                        </button>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disconnected Time:</span>
                        <span style={{ fontFamily: 'monospace', color: '#fca5a5', fontWeight: 600 }}>{formattedDate}</span>
                        <span>•</span>
                        <span><strong>By:</strong> {discBy}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-3d-alert', {
                          detail: {
                            id: account.id,
                            name: account.displayName || 'Account',
                            number: account.phoneNumber,
                            disconnectedAt: discTime,
                          }
                        }));
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 7,
                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(239, 68, 68, 0.15))',
                        border: '1px solid rgba(255, 107, 53, 0.45)',
                        color: '#ffedd5', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title="Launch 3D WebGL Disconnection Alert"
                    >
                      <Sparkles size={12} color="#ffaa40" />
                      <span>3D Alert</span>
                    </button>
                    {onOpenQR && (
                      <button
                        type="button"
                        onClick={() => onOpenQR(account.raw)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 13px', borderRadius: 7,
                          background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.45)',
                          color: '#ffffff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        <RefreshCw size={13} />
                        <span>Reconnect QR</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenChatExplorer(account.raw)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 13px', borderRadius: 7,
                        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#cbd5e1', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Eye size={13} />
                      <span>View Chats</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. Date Duration Filter & Chat Plan Toolbar ──────────────────────── */}
      <div style={styles.filterToolbarContainer}>
        <div style={styles.filterToolbarLeft}>
          <div style={styles.filterLabelWrap}>
            <Calendar size={15} color="#2dd4bf" />
            <span style={styles.filterBarTitle}>Date Range:</span>
          </div>

          <div style={styles.pillGroup}>
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last7', label: 'Last 7 Days' },
                { id: 'last30', label: 'Last 30 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map(p => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                style={{
                  ...styles.pillBtn,
                  ...(datePreset === p.id ? styles.pillBtnActive : {}),
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div style={styles.customDateWrapper}>
              <span style={{ fontSize: 11, color: '#8696a0' }}>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                style={styles.dateInput}
              />
              <span style={{ fontSize: 11, color: '#8696a0' }}>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          )}

          {/* Active Range Pill */}
          <div style={styles.activeRangeTag}>
            <span>{dateRange.label}</span>
            {isLoadingMetrics && <RefreshCw size={12} className="animate-spin" color="#2dd4bf" />}
          </div>
        </div>

        {/* Right CTA: Create Chat Plan */}
        <div style={styles.filterToolbarRight}>
          <button
            onClick={() => handleOpenCreatePlan()}
            style={styles.createPlanBtn}
            title="Create an automated outreach or scheduled message plan"
          >
            <Sparkles size={15} color="#ffffff" />
            <span>Create Chat Plan</span>
          </button>
        </div>
      </div>

      {/* ── 3. Accounts Table Card ─────────────────────────────────────────── */}
      <div style={styles.accountsCardContainer}>
        {/* Table Card Header */}
        <div style={styles.cardHeaderRow}>
          <div style={styles.cardHeaderLeft}>
            <div style={styles.shieldIconBox}>
              <Shield size={18} color="#2dd4bf" />
            </div>
            <div>
              <h2 style={styles.accountsCardTitle}>Your Accounts</h2>
              <p style={styles.accountsCardSubtitle}>
                Live inbound/response message metrics and separate chats for any specific time duration
              </p>
            </div>
          </div>

          {/* Search Box & + Add Account CTA Button */}
          <div style={styles.cardHeaderRight}>
            <div style={styles.searchBox}>
              <Search size={14} color="#8696a0" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={styles.clearBtn}>
                  <X size={12} color="#8696a0" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowAddAccountModal(true)}
              style={styles.addAccountBtn}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Account</span>
            </button>
          </div>
        </div>

        {/* ── Status & Admin / Super Admin Filter Toolbar ─────────────── */}
        <div style={styles.accountsFilterToolbarRow}>
          <div style={styles.accountsFilterToolbarLeft}>
            <span style={styles.accountsFilterLabel}>
              <Filter size={13} color="#2dd4bf" />
              <span>Status:</span>
            </span>

            {/* All Accounts */}
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              style={{
                ...styles.accountsFilterPillBtn,
                ...(statusFilter === 'ALL' ? styles.accountsFilterPillBtnActive : styles.accountsFilterPillBtnInactive),
              }}
            >
              <span>All Accounts</span>
              <span style={styles.accountsFilterPillBadge}>{totalAccountsCount}</span>
            </button>

            {/* Connected */}
            <button
              type="button"
              onClick={() => setStatusFilter('CONNECTED')}
              style={{
                ...styles.accountsFilterPillBtn,
                ...(statusFilter === 'CONNECTED' ? styles.accountsFilterPillBtnActiveGreen : styles.accountsFilterPillBtnInactive),
              }}
            >
              <CheckCircle2 size={13} color={statusFilter === 'CONNECTED' ? '#34d399' : '#10b981'} />
              <span>Connected</span>
              <span style={styles.accountsFilterPillBadgeGreen}>{connectedAccountsCount}</span>
            </button>

            {/* Disconnected */}
            <button
              type="button"
              onClick={() => setStatusFilter('DISCONNECTED')}
              style={{
                ...styles.accountsFilterPillBtn,
                ...(statusFilter === 'DISCONNECTED' ? styles.accountsFilterPillBtnActiveRed : styles.accountsFilterPillBtnInactive),
              }}
            >
              <WifiOff size={13} color={statusFilter === 'DISCONNECTED' ? '#f87171' : '#ef4444'} />
              <span>Disconnected</span>
              <span style={styles.accountsFilterPillBadgeRed}>{disconnectedAccountsCount}</span>
            </button>
          </div>

          <div style={styles.accountsFilterToolbarRight}>
            {(dashboardAdmins.length > 0 || userRole === 'SUPER_ADMIN') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={styles.accountsFilterLabel}>
                  <Users size={13} color="#2dd4bf" />
                  <span>Scope:</span>
                </span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={styles.accountsFilterSelect}
                >
                  <option value="ALL">All (Super Admin &amp; Admins)</option>
                  <option value="SUPER_ADMIN">👑 Super Admin Accounts</option>
                  <option value="SUB_ADMIN">👤 Sub-Admin Accounts</option>
                  {dashboardAdmins
                    .filter(a => a.role !== 'SUPER_ADMIN')
                    .map(adm => (
                      <option key={adm.id} value={adm.id}>
                        👤 Admin: {adm.displayName} (@{adm.username})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Reset Filters Pill */}
            {(statusFilter !== 'ALL' || roleFilter !== 'ALL' || searchTerm.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setRoleFilter('ALL');
                  setSearchTerm('');
                }}
                style={styles.accountsFilterResetBtn}
                title="Reset all filters"
              >
                <RefreshCw size={11} />
                <span>Reset</span>
              </button>
            )}

            <span style={{ fontSize: 11.5, color: '#8696a0', marginLeft: 4 }}>
              Showing {filteredAccounts.length} of {totalAccountsCount}
            </span>
          </div>
        </div>

        {/* ── Table Content ─────────────────────────────────────────────────── */}
        <div style={styles.tableWrapper}>
          {/* Table Header Row */}
          <div style={styles.tableHeaderRow}>
            <div style={{ flex: 1.5, paddingLeft: 36 }}>Account Name / Number</div>
            <div style={{ flex: 0.8 }}>Status</div>
            <div style={{ flex: 1.8 }}>Total Messages (In & Sent)</div>
            <div style={{ flex: 1.5 }}>Period Activity ({dateRange.label})</div>
            <div style={{ flex: 1.2 }}>Last Active</div>
            <div style={{ flex: 1.2, textAlign: 'right', paddingRight: 16 }}>Actions</div>
          </div>

          {/* Table Rows */}
          <div style={styles.rowsList}>
            {filteredAccounts.length === 0 ? (
              <div style={{
                padding: '56px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(4, 20, 24, 0.9) 100%)',
                  border: '2px solid rgba(16, 185, 129, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  boxShadow: '0 0 24px rgba(16, 185, 129, 0.3)',
                }}>
                  <Smartphone size={30} />
                </div>
                <div>
                  <h4 style={{ color: '#f8fafc', margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px' }}>
                    {searchTerm || statusFilter !== 'ALL' || roleFilter !== 'ALL'
                      ? 'No accounts match the current filter criteria'
                      : 'No Accounts Connected'}
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0 0', maxWidth: 460, lineHeight: 1.5 }}>
                    {searchTerm || statusFilter !== 'ALL' || roleFilter !== 'ALL'
                      ? `No accounts found matching status "${statusFilter}", scope "${roleFilter}"${searchTerm ? ` and query "${searchTerm}"` : ''}. Reset your filters to display all accounts.`
                      : 'Connect your account via QR code to start managing live conversations, campaigns, and message analytics.'
                    }
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  {searchTerm || statusFilter !== 'ALL' || roleFilter !== 'ALL' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('ALL');
                        setRoleFilter('ALL');
                      }}
                      style={{
                        padding: '9px 20px',
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <RefreshCw size={13} />
                      <span>Reset All Filters</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (onAddAccount) onAddAccount();
                        else setShowAddAccountModal(true);
                      }}
                      style={{
                        padding: '9px 20px',
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #00a884 0%, #059669 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        boxShadow: '0 4px 14px rgba(0, 168, 132, 0.35)',
                      }}
                    >
                      <Plus size={16} />
                      <span>Connect Device (QR)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredAccounts.map((account, idx) => {
                const isConnected = account.status === 'CONNECTED';
                const isCurrentSelected =
                  (activeAccount && (activeAccount.id === account.id || activeAccount.displayName === account.displayName)) ||
                  (!activeAccount && idx === 0);
                const isExpanded = !!expandedRows[account.id];
                const isMenuActive = activeMenuId === account.id;

                return (
                  <div
                    key={account.id}
                    style={{
                      ...styles.tableRowContainer,
                      ...(isCurrentSelected ? styles.tableRowSelected : {}),
                      zIndex: isMenuActive ? 100 : (filteredAccounts.length - idx),
                      overflow: 'visible',
                    }}
                  >
                    <div
                      style={styles.tableRowMain}
                      onClick={() => {
                        onSelectAccount(account.raw);
                        if (onNavigateToChats) {
                          onNavigateToChats(account.raw);
                        }
                        addToast('success', `Opening chats for ${account.displayName}`);
                      }}
                    >
                      {/* Expand Arrow & Account Name/Number */}
                      <div style={{ flex: 1.6, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(account.id);
                          }}
                          style={styles.chevronBtn}
                        >
                          <ChevronRight
                            size={15}
                            color="#8696a0"
                            style={{
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </button>

                        {/* Avatar */}
                        <div style={{ ...styles.accountAvatar, background: account.avatarBg }}>
                          {account.avatarText}
                        </div>

                        {/* Name & Phone */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={styles.accountNameText}>{account.displayName || 'No Name Set'}</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSettings(account.raw || account);
                              }}
                              style={{
                                background: 'rgba(45, 212, 191, 0.1)',
                                border: '1px solid rgba(45, 212, 191, 0.3)',
                                borderRadius: 4,
                                padding: '2px 7px',
                                color: '#2dd4bf',
                                fontSize: 11,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontWeight: 600,
                              }}
                              title="Edit / Add Account Name"
                            >
                              <Edit3 size={11} color="#2dd4bf" />
                              <span>{account.displayName ? 'Edit Name' : '+ Add Name'}</span>
                            </button>
                          </div>
                          <div style={styles.accountPhoneText}>{account.phoneNumber}</div>
                          {account.status !== 'CONNECTED' && (account.raw?.disconnectedAt || account.raw?.disconnectedBy) && (
                            <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>Disc: {account.raw?.disconnectedAt ? formatIndianDateTime(account.raw.disconnectedAt) : 'Recently'}</span>
                              <span>•</span>
                              <span>By: {account.raw?.disconnectedBy || 'Session Expired'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Column */}
                      <div style={{ flex: 0.9, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: account.status === 'CONNECTED' ? '#10b981' : account.status === 'RECONNECTING' ? '#f59e0b' : '#64748b',
                            boxShadow: account.status === 'CONNECTED' ? '0 0 8px #10b981' : account.status === 'RECONNECTING' ? '0 0 6px #f59e0b' : 'none',
                          }}
                        />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: account.status === 'CONNECTED' ? '#10b981' : account.status === 'RECONNECTING' ? '#f59e0b' : '#94a3b8' }}>
                          {account.status === 'CONNECTED' ? 'Active' : account.status === 'RECONNECTING' ? 'Reconnecting' : 'Inactive'}
                        </span>
                      </div>

                      {/* Column: Total Messages (In & Sent) */}
                      <div style={{ flex: 1.8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={styles.metricBadgeIn} title="Total Inbound Messages Received">
                            <Inbox size={12} color="#38bdf8" />
                            <span>{account.totalIncoming} In</span>
                          </div>
                          <div style={styles.metricBadgeOut} title="Total Outbound Messages Sent">
                            <Reply size={12} color="#10b981" />
                            <span>{account.totalOutgoing} Sent</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>
                          Total: {account.totalIncoming + account.totalOutgoing} real messages
                        </div>
                      </div>

                      {/* Column: Filtered Period Activity */}
                      <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>
                          {account.filteredIncoming} In / {account.filteredOutgoing} Out
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>
                          Today: {account.todaysIncoming} In / {account.todaysOutgoing} Out
                        </div>
                      </div>

                      {/* Last Activity Column */}
                      <div style={{ flex: 1.2 }}>
                        <div style={styles.lastActivityTime}>{account.lastActivity}</div>
                        <div style={styles.messagesSubtext}>Chats: {account.messagesToday}</div>
                      </div>

                      {/* Actions Column */}
                      <div
                        style={{
                          flex: 1.1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 6,
                          paddingRight: 12,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Separate Account Chats Button */}
                        <button
                          onClick={() => handleOpenChatExplorer(account.raw)}
                          style={{
                            ...styles.actionIconBtn,
                            background: 'rgba(45, 212, 191, 0.12)',
                            borderColor: 'rgba(45, 212, 191, 0.35)',
                            color: '#2dd4bf',
                            width: 'auto',
                            padding: '4px 10px',
                            gap: 5,
                            fontSize: 11.5,
                            fontWeight: 600,
                          }}
                          title="View this account's chats for the selected time duration"
                        >
                          <ListFilter size={13} color="#2dd4bf" />
                          <span>View Chats</span>
                        </button>

                        {/* Quick Plan CTA Button */}
                        <button
                          onClick={() => handleOpenCreatePlan(account.id)}
                          style={{
                            ...styles.actionIconBtn,
                            background: 'rgba(0, 168, 132, 0.12)',
                            borderColor: 'rgba(0, 168, 132, 0.35)',
                          }}
                          title="Create Chat Plan for this account"
                        >
                          <Sparkles size={13} color="#00a884" />
                        </button>

                        {/* Settings Button */}
                        <button
                          onClick={() => handleOpenSettings(account)}
                          style={styles.actionIconBtn}
                          title="Account Settings & Rename"
                        >
                          <Settings size={13} color="#8696a0" />
                        </button>

                        {/* Direct Delete Account Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAccount(account.raw);
                          }}
                          style={{
                            ...styles.actionIconBtn,
                            color: '#f87171',
                            borderColor: 'rgba(239, 68, 68, 0.25)',
                            background: 'rgba(239, 68, 68, 0.08)',
                          }}
                          title="Delete Account"
                        >
                          <Trash2 size={13} color="#f87171" />
                        </button>

                        {/* More Menu Button */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(prev => prev === account.id ? null : account.id);
                            }}
                            style={{
                              ...styles.actionIconBtn,
                              background: activeMenuId === account.id ? 'rgba(45, 212, 191, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                              borderColor: activeMenuId === account.id ? 'rgba(45, 212, 191, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                            }}
                            title="More Options"
                          >
                            <MoreVertical size={13} color={activeMenuId === account.id ? "#2dd4bf" : "#8696a0"} />
                          </button>

                          {activeMenuId === account.id && (
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                }}
                              />
                              <div style={styles.dropdownMenu}>
                                <button
                                  onClick={() => {
                                    handleOpenChatExplorer(account.raw);
                                    setActiveMenuId(null);
                                  }}
                                  style={styles.dropdownItem}
                                >
                                  <ListFilter size={13} color="#2dd4bf" />
                                  <span>View Filtered Chats</span>
                                </button>

                                <button
                                  onClick={() => {
                                    handleOpenCreatePlan(account.id);
                                    setActiveMenuId(null);
                                  }}
                                  style={styles.dropdownItem}
                                >
                                  <Sparkles size={13} color="#00a884" />
                                  <span>Create Chat Plan</span>
                                </button>

                                <button
                                  onClick={() => {
                                    onSelectAccount(account.raw);
                                    setActiveMenuId(null);
                                    addToast('success', `Set ${account.displayName} as primary account`);
                                  }}
                                  style={styles.dropdownItem}
                                >
                                  <Check size={13} color="#10b981" />
                                  <span>Set as Active</span>
                                </button>

                                <button
                                  onClick={() => {
                                    onStopAccount(account.raw);
                                    setActiveMenuId(null);
                                  }}
                                  style={styles.dropdownItem}
                                >
                                  <Power size={13} color="#f59e0b" />
                                  <span>{account.status === 'CONNECTED' ? 'Disconnect' : 'Reconnect'}</span>
                                </button>

                                {account.status !== 'CONNECTED' && onOpenQR && (
                                  <button
                                    onClick={() => {
                                      onOpenQR(account.raw);
                                      setActiveMenuId(null);
                                    }}
                                    style={styles.dropdownItem}
                                  >
                                    <QrCode size={13} color="#2dd4bf" />
                                    <span>Scan QR Code</span>
                                  </button>
                                )}

                                <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

                                <button
                                  onClick={() => {
                                    onDeleteAccount(account.raw);
                                    setActiveMenuId(null);
                                  }}
                                  style={{ ...styles.dropdownItem, color: '#f87171' }}
                                >
                                  <Trash2 size={13} color="#f87171" />
                                  <span>Delete Account</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Row Detail Drawer */}
                    {isExpanded && (
                      <div style={styles.expandedDrawer}>
                        <div style={styles.drawerGrid}>
                          <div style={styles.drawerItem}>
                            <span style={styles.drawerLabel}>Tier Limit:</span>
                            <span style={styles.drawerValue}>{account.tier}</span>
                          </div>
                          <div style={styles.drawerItem}>
                            <span style={styles.drawerLabel}>Total Inbound (All Time):</span>
                            <span style={{ ...styles.drawerValue, color: '#38bdf8' }}>{account.totalIncoming} messages in</span>
                          </div>
                          <div style={styles.drawerItem}>
                            <span style={styles.drawerLabel}>Total Outbound (All Time):</span>
                            <span style={{ ...styles.drawerValue, color: '#10b981' }}>{account.totalOutgoing} messages sent</span>
                          </div>
                          <div style={styles.drawerItem}>
                            <span style={styles.drawerLabel}>Today's Activity:</span>
                            <span style={styles.drawerValue}>{account.todaysIncoming} In / {account.todaysOutgoing} Out</span>
                          </div>
                          <div style={styles.drawerItem}>
                            <span style={styles.drawerLabel}>Total Lifetime Messages:</span>
                            <span style={styles.drawerValueMono}>{account.totalIncoming + account.totalOutgoing} real msgs</span>
                          </div>
                          <div style={styles.drawerItem}>
                            <span style={styles.drawerLabel}>Socket Connection:</span>
                            <span style={{ ...styles.drawerValue, color: isConnected ? '#10b981' : '#f59e0b' }}>
                              {isConnected ? '● Connected (0ms lag)' : '○ Standby'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Active Chat Plans Tracker Card ──────────────────────────────── */}
      {chatPlans.length > 0 && (
        <div style={styles.plansCardContainer}>
          <div style={styles.plansCardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...styles.shieldIconBox, background: 'rgba(0, 168, 132, 0.15)' }}>
                <Sparkles size={18} color="#00a884" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Active Chat Outreach Plans ({chatPlans.length})
                </h3>
                <p style={{ fontSize: 12, color: '#8696a0', margin: '2px 0 0 0' }}>
                  Track and monitor scheduled messages and promotional outreach plans
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenCreatePlan()}
              style={{ ...styles.addAccountBtn, padding: '6px 14px', fontSize: 12 }}
            >
              <Plus size={14} />
              <span>New Plan</span>
            </button>
          </div>

          <div style={styles.plansList}>
            {chatPlans.map(plan => (
              <div key={plan.id} style={styles.planItemCard}>
                <div style={{ flex: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>{plan.name}</span>
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: plan.status === 'sent' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      color: plan.status === 'sent' ? '#10b981' : '#38bdf8',
                      border: `1px solid ${plan.status === 'sent' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                    }}>
                      {plan.status === 'sent' ? '✓ Sent' : plan.timing === 'scheduled' ? '⏰ Scheduled' : 'Pending'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 3 }}>
                    Via <strong>{plan.accountName}</strong> • {plan.recipients.length} target recipient(s)
                  </div>
                </div>

                <div style={{ flex: 2, padding: '0 12px' }}>
                  <div style={{
                    fontSize: 12,
                    color: '#cbd5e1',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    💬 "{plan.message}"
                  </div>
                </div>

                <div style={{ flex: 1, fontSize: 11.5, color: '#94a3b8' }}>
                  {plan.timing === 'scheduled' && plan.scheduledAt ? (
                    <div>Due: {new Date(plan.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  ) : (
                    <div>Created: {new Date(plan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => {
                      setChatPlans(prev => prev.filter(p => p.id !== plan.id));
                      addToast('info', `Plan "${plan.name}" removed`);
                    }}
                    style={{ ...styles.actionIconBtn, color: '#f87171' }}
                    title="Remove Plan"
                  >
                    <Trash2 size={13} color="#f87171" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Account Chats Explorer Modal (Time Duration Filtered) ───────── */}
      {chatExplorerAccount && (
        <div style={styles.modalOverlay} onClick={() => setChatExplorerAccount(null)}>
          <div
            style={{ ...styles.modalContent, maxWidth: 960, height: '82vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Explorer Header */}
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ ...styles.modalIconBox, background: 'rgba(45, 212, 191, 0.15)' }}>
                  <ListFilter size={20} color="#2dd4bf" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      Chats: {chatExplorerAccount.displayName || chatExplorerAccount.phoneNumber}
                    </h3>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: 'rgba(45, 212, 191, 0.15)',
                      color: '#2dd4bf',
                      border: '1px solid rgba(45, 212, 191, 0.3)',
                    }}>
                      Duration: {explorerDateRange.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Filtered message history and chats for this specific account
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => {
                    onSelectAccount(chatExplorerAccount);
                    if (onNavigateToChats) {
                      onNavigateToChats(chatExplorerAccount);
                    }
                    setChatExplorerAccount(null);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#00a884',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Open Chat</span>
                </button>
                <button onClick={() => setChatExplorerAccount(null)} style={styles.modalCloseBtn}>
                  <X size={18} color="#8696a0" />
                </button>
              </div>
            </div>

            {/* Filter Ribbon inside Explorer matching screenshot */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              background: 'rgba(15, 28, 33, 0.85)',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginTop: 10,
            }}>
              {/* Date Preset Selector */}
              <div style={{ position: 'relative' }}>
                <select
                  value={explorerDatePreset}
                  onChange={e => setExplorerDatePreset(e.target.value as any)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 7,
                    padding: '6px 24px 6px 10px',
                    color: '#2dd4bf',
                    fontSize: 12,
                    fontWeight: 600,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all" style={{ background: '#0e181c' }}>All Time</option>
                  <option value="today" style={{ background: '#0e181c' }}>Today</option>
                  <option value="yesterday" style={{ background: '#0e181c' }}>Yesterday</option>
                  <option value="last7" style={{ background: '#0e181c' }}>Last 7 Days</option>
                  <option value="last30" style={{ background: '#0e181c' }}>Last 30 Days</option>
                  <option value="custom" style={{ background: '#0e181c' }}>Custom Range</option>
                </select>
                <ChevronRight size={12} color="#2dd4bf" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
              </div>

              {/* Custom Date Inputs if Custom */}
              {explorerDatePreset === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="date"
                    value={explorerCustomStart}
                    onChange={e => setExplorerCustomStart(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6,
                      padding: '4px 6px',
                      color: '#e2e8f0',
                      fontSize: 11,
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#8696a0' }}>to</span>
                  <input
                    type="date"
                    value={explorerCustomEnd}
                    onChange={e => setExplorerCustomEnd(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6,
                      padding: '4px 6px',
                      color: '#e2e8f0',
                      fontSize: 11,
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Status Filter */}
              <div style={{ position: 'relative' }}>
                <select
                  value={explorerStatusFilter}
                  onChange={e => setExplorerStatusFilter(e.target.value as any)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 7,
                    padding: '6px 24px 6px 10px',
                    color: '#e2e8f0',
                    fontSize: 12,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all" style={{ background: '#0e181c' }}>All Status</option>
                  <option value="unread" style={{ background: '#0e181c' }}>Unread Only</option>
                  <option value="read" style={{ background: '#0e181c' }}>Read Only</option>
                </select>
                <ChevronRight size={12} color="#8696a0" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
              </div>

              {/* Direction Filter */}
              <div style={{ position: 'relative' }}>
                <select
                  value={explorerDirectionFilter}
                  onChange={e => setExplorerDirectionFilter(e.target.value as any)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 7,
                    padding: '6px 24px 6px 10px',
                    color: '#e2e8f0',
                    fontSize: 12,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all" style={{ background: '#0e181c' }}>All Replies</option>
                  <option value="incoming" style={{ background: '#0e181c' }}>Incoming Replies</option>
                  <option value="outgoing" style={{ background: '#0e181c' }}>Outgoing Replies</option>
                </select>
                <ChevronRight size={12} color="#8696a0" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
              </div>

              {/* Word in reply search input */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 7,
                padding: '5px 10px',
                minWidth: 160,
                flex: 1,
              }}>
                <Search size={12} color="#8696a0" />
                <input
                  type="text"
                  placeholder='Word in reply — e.g. "B"'
                  value={explorerKeywordInput}
                  onChange={e => setExplorerKeywordInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && explorerKeywordInput.trim()) {
                      e.preventDefault();
                      const trimmed = explorerKeywordInput.trim().toLowerCase();
                      if (!explorerKeywords.includes(trimmed)) {
                        setExplorerKeywords([...explorerKeywords, trimmed]);
                      }
                      setExplorerKeywordInput('');
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: 12,
                    outline: 'none',
                    width: '100%',
                  }}
                />
                {explorerKeywordInput.trim() && (
                  <button
                    onClick={() => {
                      const trimmed = explorerKeywordInput.trim().toLowerCase();
                      if (!explorerKeywords.includes(trimmed)) {
                        setExplorerKeywords([...explorerKeywords, trimmed]);
                      }
                      setExplorerKeywordInput('');
                    }}
                    style={{
                      background: '#00a884',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Add
                  </button>
                )}
              </div>

              {/* Active keyword chips matching screenshot */}
              {explorerKeywords.map(kw => (
                <div
                  key={kw}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.35)',
                    borderRadius: 7,
                    padding: '4px 8px',
                    color: '#fb7185',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 12, opacity: 0.8 }}>⊘</span>
                  <span>{kw}</span>
                  <span
                    onClick={() => setExplorerKeywords(explorerKeywords.filter(k => k !== kw))}
                    style={{ cursor: 'pointer', fontSize: 13, marginLeft: 2, color: '#fda4af' }}
                    title={`Remove "${kw}" filter`}
                  >
                    ⊗
                  </span>
                </div>
              ))}
            </div>

            {/* Split Explorer Body */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0, marginTop: 14, gap: 14 }}>
              {/* Left Column: Chats List */}
              <div style={{
                width: 320,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(15, 28, 33, 0.7)',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: 10, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ ...styles.searchBox, minWidth: 'auto', width: '100%', boxSizing: 'border-box' }}>
                    <Search size={13} color="#8696a0" />
                    <input
                      type="text"
                      placeholder="Search chats in range..."
                      value={chatSearch}
                      onChange={e => setChatSearch(e.target.value)}
                      style={styles.searchInput}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {isLoadingChats ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#8696a0', fontSize: 13 }}>
                      Loading chats for {dateRange.label}...
                    </div>
                  ) : accountChats.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#8696a0', fontSize: 13 }}>
                      No chats found within this time duration.
                    </div>
                  ) : (
                    filteredExplorerChats.map(chat => {
                        const isSelected = selectedChat?.id === chat.id;
                        return (
                          <div
                            key={chat.id}
                            onClick={() => handleSelectChatInExplorer(chatExplorerAccount.id, chat)}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              background: isSelected ? 'rgba(0, 168, 132, 0.18)' : 'transparent',
                              borderLeft: isSelected ? '3px solid #00a884' : '3px solid transparent',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                                {chat.name || chat.id.split('@')[0]}
                              </div>
                              <span style={{ fontSize: 10, color: '#64748b' }}>
                                {chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <div style={{
                              fontSize: 11.5,
                              color: '#8696a0',
                              marginTop: 3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {chat.lastMessageFromMe ? 'You: ' : ''}{chat.lastMessageText || 'No messages'}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Right Column: Chat Messages & Reply */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(11, 22, 26, 0.85)',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}>
                {selectedChat ? (
                  <>
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(15, 28, 33, 0.95)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>
                          {selectedChat.name || selectedChat.id}
                        </div>
                        <div style={{ fontSize: 11, color: '#8696a0' }}>{selectedChat.id}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: '#2dd4bf' }}>
                          {chatMessages.length} messages loaded
                        </span>
                        <button
                          type="button"
                          onClick={handleFetchExplorerHistory}
                          disabled={isLoadingMessages}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 14,
                            background: 'rgba(0, 168, 132, 0.2)',
                            border: '1px solid rgba(0, 168, 132, 0.4)',
                            color: '#00a884',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Fetch older messages from phone"
                        >
                          <RefreshCw size={12} style={{ animation: isLoadingMessages ? 'spin 1s linear infinite' : 'none' }} />
                          <span>Fetch from Phone</span>
                        </button>
                      </div>
                    </div>

                    {/* Messages Container */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}>
                      {isLoadingMessages ? (
                        <div style={{ textAlign: 'center', color: '#8696a0', padding: 20 }}>
                          Loading messages...
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#8696a0', padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                          <div>No messages found in this chat.</div>
                          <button
                            type="button"
                            onClick={handleFetchExplorerHistory}
                            disabled={isLoadingMessages}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 16px',
                              borderRadius: 18,
                              background: '#00a884',
                              color: '#fff',
                              border: 'none',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0, 168, 132, 0.3)',
                            }}
                          >
                            <RefreshCw size={14} style={{ animation: isLoadingMessages ? 'spin 1s linear infinite' : 'none' }} />
                            <span>Fetch Previous Messages from Phone</span>
                          </button>
                        </div>
                      ) : (
                        chatMessages.map(msg => (
                          <div
                            key={msg.id}
                            style={{
                              alignSelf: msg.fromMe ? 'flex-end' : 'flex-start',
                              maxWidth: '75%',
                              background: msg.fromMe ? '#005c4b' : 'rgba(32, 44, 51, 0.95)',
                              color: '#ffffff',
                              borderRadius: 8,
                              padding: '8px 12px',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                              position: 'relative',
                            }}
                          >
                            {!msg.fromMe && msg.senderName && (
                              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#2dd4bf', marginBottom: 2 }}>
                                {msg.senderName}
                              </div>
                            )}
                            <div style={{ fontSize: 12.5, lineHeight: 1.4, wordBreak: 'break-word' }}>
                              {highlightKeyword(msg.text, explorerKeywords)}
                            </div>
                            <div style={{
                              fontSize: 9.5,
                              color: 'rgba(255, 255, 255, 0.6)',
                              textAlign: 'right',
                              marginTop: 4,
                            }}>
                              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              {msg.fromMe && ' ✓✓'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick Reply Form */}
                    <form
                      onSubmit={handleSendExplorerReply}
                      style={{
                        padding: 10,
                        background: 'rgba(15, 28, 33, 0.95)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Type a quick reply from this account..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          fontSize: 12.5,
                          outline: 'none',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isSendingReply || !replyText.trim()}
                        style={{
                          padding: '9px 16px',
                          background: '#00a884',
                          border: 'none',
                          borderRadius: 8,
                          color: '#ffffff',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: isSendingReply ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Send size={13} />
                        <span>Send</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8696a0',
                    gap: 8,
                  }}>
                    <MessageCircle size={32} color="#2dd4bf" />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Select a chat on the left</div>
                    <div style={{ fontSize: 12 }}>View messages exchanged during {dateRange.label}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Chats Create Plan Modal ──────────────────────────────────────── */}
      {showCreatePlanModal && (
        <div style={styles.modalOverlay} onClick={() => !isCreatingPlan && setShowCreatePlanModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...styles.modalIconBox, background: 'rgba(0, 168, 132, 0.15)' }}>
                  <Sparkles size={20} color="#00a884" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Create Chat Plan
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Compose and schedule outreach messages with dynamic contact parameters
                  </div>
                </div>
              </div>
              <button
                onClick={() => !isCreatingPlan && setShowCreatePlanModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#8696a0" />
              </button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              {/* Account Selector */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                  Select Sending Account <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  value={planAccountId}
                  onChange={e => {
                    setPlanAccountId(e.target.value);
                    loadAccountContacts(e.target.value);
                  }}
                  style={styles.selectInput}
                  required
                >
                  {displayAccounts.map(a => (
                    <option key={a.id} value={a.id} style={{ background: '#0b1619', color: '#ffffff' }}>
                      {a.displayName} ({a.phoneNumber || 'unlinked'}) — {a.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Name */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                  Plan / Campaign Name <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Customer Follow-up, Product Launch Promo"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              {/* Recipients */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                    Target Phone Numbers <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  {accountContacts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const samplePhones = accountContacts
                          .filter(c => c.phoneNumber)
                          .slice(0, 5)
                          .map(c => c.phoneNumber.replace(/[^0-9]/g, ''))
                          .join(', ');
                        setPlanRecipients(prev => (prev ? `${prev}, ${samplePhones}` : samplePhones));
                        addToast('info', `Appended ${Math.min(5, accountContacts.length)} contacts`);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2dd4bf',
                        fontSize: 11,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      + Add {Math.min(5, accountContacts.length)} Account Contacts
                    </button>
                  )}
                </div>
                <textarea
                  placeholder="Enter recipient phone numbers separated by commas or newlines (e.g. 919876543210, 919123456789)"
                  value={planRecipients}
                  onChange={e => setPlanRecipients(e.target.value)}
                  rows={2}
                  style={{ ...styles.formInput, resize: 'vertical' }}
                  required
                />
                <div style={{ fontSize: 11, color: '#8696a0', marginTop: 3 }}>
                  Targeting: {planRecipients.split(/[\n,;]+/).filter(x => x.trim().length >= 8).length} recipient(s)
                </div>
              </div>

              {/* Message Composer & Variables */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                    Outreach Message <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['{name}', '{phone}', '{accountName}'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPlanMessage(prev => `${prev} ${tag}`)}
                        style={{
                          background: 'rgba(45, 212, 191, 0.12)',
                          border: '1px solid rgba(45, 212, 191, 0.25)',
                          borderRadius: 4,
                          color: '#2dd4bf',
                          fontSize: 10,
                          padding: '1px 5px',
                          cursor: 'pointer',
                        }}
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={planMessage}
                  onChange={e => setPlanMessage(e.target.value)}
                  rows={3}
                  style={{ ...styles.formInput, resize: 'vertical' }}
                  required
                />
              </div>

              {/* Timing Options */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                  Dispatch Schedule
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setPlanTiming('now')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: planTiming === 'now' ? '1.5px solid #00a884' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: planTiming === 'now' ? 'rgba(0, 168, 132, 0.15)' : 'transparent',
                      color: planTiming === 'now' ? '#10b981' : '#cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Send Immediately
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanTiming('scheduled')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: planTiming === 'scheduled' ? '1.5px solid #00a884' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: planTiming === 'scheduled' ? 'rgba(0, 168, 132, 0.15)' : 'transparent',
                      color: planTiming === 'scheduled' ? '#10b981' : '#cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ⏰ Schedule for Later
                  </button>
                </div>
              </div>

              {/* Scheduled Inputs */}
              {planTiming === 'scheduled' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ display: 'block', fontSize: 11.5, color: '#cbd5e1', marginBottom: 4 }}>
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={planScheduledAt}
                      onChange={e => setPlanScheduledAt(e.target.value)}
                      style={styles.formInput}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 11.5, color: '#cbd5e1', marginBottom: 4 }}>
                      Repeat
                    </label>
                    <select
                      value={planRepeat}
                      onChange={e => setPlanRepeat(e.target.value as any)}
                      style={styles.selectInput}
                    >
                      <option value="once">Once</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  disabled={isCreatingPlan}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPlan}
                  style={styles.submitPlanBtn}
                >
                  {isCreatingPlan ? (
                    <span>Processing Plan...</span>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{planTiming === 'now' ? 'Dispatch Now' : 'Schedule Plan'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. Account Settings Modal ──────────────────────────────────────── */}
      {showSettingsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSettingsModal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalIconBox}>
                  <Settings size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Account Settings: {showSettingsModal.displayName}
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    {showSettingsModal.phoneNumber} • {showSettingsModal.tier}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowSettingsModal(null)} style={styles.modalCloseBtn}>
                <X size={18} color="#8696a0" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              {/* Account Label / Custom Name Field */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 10, border: '1px solid rgba(45, 212, 191, 0.25)' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Account Label / Custom Name <span style={{ color: '#00a884' }}>(Source of Truth)</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={editingAccountName}
                    onChange={e => setEditingAccountName(e.target.value)}
                    style={{ ...styles.formInput, flex: 1 }}
                    placeholder="e.g. Sales Team, DEV THAKKAR REALESTATE"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAccountName}
                    disabled={isSavingName || !editingAccountName.trim() || editingAccountName.trim() === showSettingsModal.displayName}
                    style={{
                      padding: '8px 16px',
                      background: '#00a884',
                      border: 'none',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: (isSavingName || !editingAccountName.trim() || editingAccountName.trim() === showSettingsModal.displayName) ? 'not-allowed' : 'pointer',
                      opacity: (isSavingName || !editingAccountName.trim() || editingAccountName.trim() === showSettingsModal.displayName) ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isSavingName ? 'Saving...' : 'Save Name'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#8696a0', marginTop: 5 }}>
                  This name is permanently saved and will always be shown throughout the app instead of profile pushnames.
                </div>
              </div>

              <div style={styles.settingToggleRow}>
                <div>
                  <div style={styles.settingToggleTitle}>Real-Time Background Sync</div>
                  <div style={styles.settingToggleDesc}>Automatically sync messages, groups and contacts</div>
                </div>
                <input type="checkbox" defaultChecked style={{ accentColor: '#00a884', width: 18, height: 18 }} />
              </div>

              <div style={styles.settingToggleRow}>
                <div>
                  <div style={styles.settingToggleTitle}>Anti-Ban Proxy Routing</div>
                  <div style={styles.settingToggleDesc}>Rotate requests through isolated container socket proxies</div>
                </div>
                <input type="checkbox" defaultChecked style={{ accentColor: '#00a884', width: 18, height: 18 }} />
              </div>

              <div style={styles.settingToggleRow}>
                <div>
                  <div style={styles.settingToggleTitle}>Ghost Read Receipts</div>
                  <div style={styles.settingToggleDesc}>Prevent blue ticks from appearing when viewing chats</div>
                </div>
                <input type="checkbox" style={{ accentColor: '#00a884', width: 18, height: 18 }} />
              </div>

              {/* Danger Zone: Delete Account */}
              <div
                style={{
                  marginTop: 10,
                  padding: '12px 14px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>Delete Account</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    Permanently delete this account, active session, and chat logs.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const accToDelete = showSettingsModal;
                    setShowSettingsModal(null);
                    onDeleteAccount(accToDelete.raw || accToDelete);
                  }}
                  style={{
                    padding: '7px 14px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: 7,
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={13} color="#ffffff" />
                  <span>Delete</span>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => setShowSettingsModal(null)}
                  style={styles.saveSettingsBtn}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Add New Account Modal ───────────────────────────────────────── */}
      {showAddAccountModal && (
        <div style={styles.modalOverlay} onClick={() => !creatingAccount && setShowAddAccountModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...styles.modalIconBox, background: 'rgba(0, 168, 132, 0.15)' }}>
                  <Plus size={20} color="#00a884" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Add New Account
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Connect a new phone number to this dashboard via QR code
                  </div>
                </div>
              </div>
              <button
                onClick={() => !creatingAccount && setShowAddAccountModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#8696a0" />
              </button>
            </div>

            <form onSubmit={handleCreateAndScan} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Account Label / Name <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Team, Support Desk, Personal 2"
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  required
                  autoFocus
                  style={styles.formInput}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Phone Number <span style={{ color: '#8696a0', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 919876543210 (or leave blank to auto-detect on scan)"
                  value={newPhoneNumber}
                  onChange={e => setNewPhoneNumber(e.target.value)}
                  style={styles.formInput}
                />
                <div style={{ fontSize: 11, color: '#8696a0', marginTop: 4 }}>
                  Your phone number will be automatically registered when you scan the QR code.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  disabled={creatingAccount}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAccount}
                  style={styles.submitPlanBtn}
                >
                  {creatingAccount ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <QrCode size={14} />
                      <span>Create & Scan QR</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles matching Design 19 with exact dark glassmorphism ─────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
    background: '#071013',
    padding: '24px 28px',
    gap: 20,
    color: '#ffffff',
  },

  // 1. Top Welcome Banner
  welcomeBanner: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(8, 28, 34, 0.95) 0%, rgba(6, 18, 22, 0.98) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 16,
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(45, 212, 191, 0.15) inset',
    flexShrink: 0,
    minHeight: 110,
    boxSizing: 'border-box',
  },
  bannerSilkWave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    opacity: 0.85,
  },
  welcomeLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    position: 'relative',
    zIndex: 1,
    flexShrink: 0,
  },
  waLogoWrapper: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(4, 20, 24, 0.95) 100%)',
    border: '2px solid rgba(16, 185, 129, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)',
    flexShrink: 0,
  },
  waLogoInner: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: '#00a884',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  welcomeTextCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 3,
  },
  welcomeSubtitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  welcomeSubtitle: {
    fontSize: 11.5,
    color: '#2dd4bf',
    fontWeight: 700,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    lineHeight: '15px',
    margin: 0,
  },
  clusterLivePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '2px 8px',
    borderRadius: 12,
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10b981',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.6px',
    lineHeight: '14px',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981',
    display: 'inline-block',
  },
  demoModePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '2px 8px',
    borderRadius: 12,
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.6px',
    lineHeight: '14px',
  },
  welcomeHeading: {
    fontSize: 23,
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    lineHeight: '28px',
    letterSpacing: '-0.3px',
  },
  welcomeDesc: {
    fontSize: 12.5,
    color: '#94a3b8',
    margin: 0,
    lineHeight: '17px',
    maxWidth: 480,
  },

  // KPI Cards Row
  kpiCardsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    zIndex: 1,
    flexWrap: 'nowrap',
    flexShrink: 0,
  },
  kpiCard: {
    background: 'rgba(9, 24, 30, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    borderRadius: 12,
    padding: '10px 13px',
    minWidth: 124,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
  },
  kpiCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  kpiIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGreenDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  kpiTitle: {
    fontSize: 10.5,
    color: '#8696a0',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  kpiNumberRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: '22px',
  },
  kpiTrendPositive: {
    fontSize: 10,
    fontWeight: 600,
    color: '#10b981',
  },
  kpiPercentActive: {
    fontSize: 10,
    fontWeight: 600,
    color: '#2dd4bf',
  },
  kpiActionBtn: {
    background: 'rgba(45, 212, 191, 0.16)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    color: '#2dd4bf',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    transition: 'all 0.15s ease',
  },
  kpiZeroLiveStatus: {
    fontSize: 10.5,
    fontWeight: 600,
    color: '#10b981',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  bannerExitDemoBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    alignSelf: 'center',
    transition: 'all 0.15s ease',
  },
  bannerLoadDemoBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    alignSelf: 'center',
    transition: 'all 0.15s ease',
  },

  // 2. Date Filter Toolbar
  filterToolbarContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(10, 24, 29, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    borderRadius: 12,
    padding: '10px 16px',
    gap: 16,
    flexWrap: 'wrap',
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.25)',
  },
  filterToolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterLabelWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  filterBarTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#cbd5e1',
  },
  pillGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(0, 0, 0, 0.3)',
    padding: 3,
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  pillBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    padding: '5px 11px',
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pillBtnActive: {
    background: '#00a884',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
  },
  customDateWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dateInput: {
    padding: '4px 8px',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontSize: 11,
    outline: 'none',
  },
  activeRangeTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 9999,
    background: 'rgba(45, 212, 191, 0.1)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: 600,
  },
  filterToolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  createPlanBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 16px',
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #00a884 0%, #059669 100%)',
    border: '1px solid rgba(45, 212, 191, 0.4)',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 168, 132, 0.45)',
    transition: 'all 0.15s ease',
  },

  // 3. "Your WhatsApp Accounts" Card
  accountsCardContainer: {
    background: 'rgba(10, 22, 26, 0.9)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    borderRadius: 16,
    padding: '22px 24px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  cardHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  shieldIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountsCardTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#f8fafc',
    margin: 0,
  },
  accountsCardSubtitle: {
    fontSize: 12,
    color: '#8696a0',
    margin: '3px 0 0 0',
  },
  cardHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(15, 28, 33, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 9999,
    padding: '6px 14px',
    minWidth: 220,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: 12,
    width: '100%',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
  },
  addAccountBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 18px',
    borderRadius: 9999,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 168, 132, 0.45)',
    transition: 'all 0.15s ease',
  },

  // Accounts Filter Toolbar
  accountsFilterToolbarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: 12,
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
  },
  accountsFilterToolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  accountsFilterToolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  accountsFilterLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 700,
    color: '#8696a0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    marginRight: 2,
  },
  accountsFilterPillBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  accountsFilterPillBtnActive: {
    background: 'rgba(45, 212, 191, 0.16)',
    border: '1px solid rgba(45, 212, 191, 0.55)',
    color: '#2dd4bf',
    boxShadow: '0 0 10px rgba(45, 212, 191, 0.2)',
  },
  accountsFilterPillBtnActiveGreen: {
    background: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.65)',
    color: '#34d399',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
  },
  accountsFilterPillBtnActiveRed: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.65)',
    color: '#f87171',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.25)',
  },
  accountsFilterPillBtnInactive: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
  },
  accountsFilterPillBadge: {
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 9999,
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
  },
  accountsFilterPillBadgeGreen: {
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 9999,
    background: 'rgba(16, 185, 129, 0.25)',
    color: '#34d399',
    fontWeight: 700,
  },
  accountsFilterPillBadgeRed: {
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 9999,
    background: 'rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    fontWeight: 700,
  },
  accountsFilterSelect: {
    padding: '5px 10px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
  },
  accountsFilterResetBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  // Table
  tableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  tableHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    fontSize: 11.5,
    fontWeight: 600,
    color: '#8696a0',
  },
  rowsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  tableRowContainer: {
    position: 'relative',
    background: 'rgba(14, 28, 34, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    overflow: 'visible',
    transition: 'all 0.15s ease',
  },
  tableRowSelected: {
    border: '1.5px solid #00a884',
    boxShadow: '0 0 16px rgba(0, 168, 132, 0.25)',
    background: 'rgba(11, 30, 36, 0.9)',
  },
  tableRowMain: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  chevronBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  accountAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  accountNameText: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#ffffff',
  },
  accountPhoneText: {
    fontSize: 11,
    color: '#8696a0',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  metricBadgeIn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 700,
  },
  metricBadgeOut: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10b981',
    fontSize: 11,
    fontWeight: 700,
  },
  lastActivityTime: {
    fontSize: 12,
    fontWeight: 600,
    color: '#cbd5e1',
  },
  messagesSubtext: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 2,
  },
  actionIconBtn: {
    height: 28,
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    minWidth: 175,
    background: '#0c181c',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    borderRadius: 10,
    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    zIndex: 9999,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  dropdownItem: {
    width: '100%',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: 6,
    textAlign: 'left',
    transition: 'background 0.12s ease',
  },
  expandedDrawer: {
    padding: '12px 16px 14px 56px',
    background: 'rgba(8, 20, 24, 0.7)',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
  },
  drawerGrid: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  drawerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11.5,
  },
  drawerLabel: {
    color: '#8696a0',
  },
  drawerValue: {
    fontWeight: 600,
    color: '#2dd4bf',
  },
  drawerValueMono: {
    fontFamily: 'monospace',
    color: '#10b981',
    fontSize: 11,
  },

  // 4. Plans Card Tracker
  plansCardContainer: {
    background: 'rgba(10, 22, 26, 0.85)',
    border: '1px solid rgba(0, 168, 132, 0.25)',
    borderRadius: 14,
    padding: '18px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
  },
  plansCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plansList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  planItemCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(15, 28, 33, 0.7)',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    background: '#0c191d',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 14,
    padding: 22,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  selectInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  cancelBtn: {
    padding: '9px 16px',
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitPlanBtn: {
    padding: '9px 20px',
    background: '#00a884',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 4px 14px rgba(0, 168, 132, 0.4)',
  },
  settingToggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  settingToggleTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#ffffff',
  },
  settingToggleDesc: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
  },
  saveSettingsBtn: {
    padding: '8px 18px',
    background: '#00a884',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
