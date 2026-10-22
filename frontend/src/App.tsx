// [A-3 FIX] State management extracted from 1,675-line monolith into typed Zustand stores.
// Each store is independently importable and subscribable with zero coupling.
import React, { useEffect, useCallback } from 'react';
import { yieldToMain, runAfterPaint } from './utils/scheduler';
import './styles/global.css';
import {
  Account, accountsApi, authApi, WhatsAppChat, WhatsAppContact,
  whatsappWebApi, getSocket,
} from './services/api';
import { useAccountStore, useChatStore, useUIStore } from './stores';
import WhatsAppNavRail from './components/WhatsAppWeb/WhatsAppNavRail';
import WhatsAppChatsList from './components/WhatsAppWeb/WhatsAppChatsList';
import WhatsAppChatArea from './components/WhatsAppWeb/WhatsAppChatArea';
import WhatsAppRightPanel from './components/WhatsAppWeb/WhatsAppRightPanel';
import WhatsAppSmartMessagingPanel from './components/WhatsAppWeb/WhatsAppSmartMessagingPanel';
import WhatsAppAutoReplyRightPanel from './components/WhatsAppWeb/WhatsAppAutoReplyRightPanel';
import ClientNotificationCenter, { ClientMessageNotification, playNotificationSound } from './components/Notifications/ClientNotificationCenter';
import { useToast } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import CommandPalette from './components/common/CommandPalette';
import { DisconnectionAlertCenter } from './components/common/DisconnectionAlertCenter';
import { localChatStorage } from './utils/localChatStorage';
import { formatE164, resolveChatDisplayName } from './utils/contactResolver';

// ── Code Splitting: Lazy loaded secondary modals and views for instant LCP ─
const WhatsAppQRModal = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppQRModal'));
const AccountsManagerModal = React.lazy(() => import('./components/AccountsManager/AccountsManagerModal'));
const HealthDashboard = React.lazy(() => import('./components/HealthDashboard/HealthDashboard'));
const SuperAdminDashboard = React.lazy(() => import('./components/Admin/SuperAdminDashboard'));
const ScheduledMessagesModal = React.lazy(() => import('./components/Scheduler/ScheduledMessagesModal'));
const AutoReplyModal = React.lazy(() => import('./components/AutoReply/AutoReplyModal'));
const ExportBackupModal = React.lazy(() => import('./components/WhatsAppWeb/ExportBackupModal'));
const WhatsAppSchedulerView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppSchedulerView'));
const WhatsAppAutoReplyView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppAutoReplyView'));
const WhatsAppAccountsManagerDashboard = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppAccountsManagerDashboard'));
const WhatsAppSuperAdminControlCenter = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppSuperAdminControlCenter'));
const WhatsAppDatabaseBackupView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppDatabaseBackupView'));
const WhatsAppInstanceManagerView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppInstanceManagerView'));
const WhatsAppSystemOverviewView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppSystemOverviewView'));
const WhatsAppCampaignsView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppCampaignsView'));
const WhatsAppLinkedDevicesView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppLinkedDevicesView'));
const WhatsAppDeliveryAnalyticsView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppDeliveryAnalyticsView'));
const WhatsAppChatbotFlowBuilderView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppChatbotFlowBuilderView'));
const WhatsAppMessageTemplatesView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppMessageTemplatesView'));
const WhatsAppContactGroupsView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppContactGroupsView'));
const WhatsAppMigrationAssistantView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppMigrationAssistantView'));
const WhatsAppComplianceOptOutView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppComplianceOptOutView'));
const WhatsAppBusinessVerificationView = React.lazy(() => import('./components/WhatsAppWeb/WhatsAppBusinessVerificationView'));
const ProUpgradeModal = React.lazy(() => import('./components/WhatsAppWeb/ProUpgradeModal'));
import CallCenterShell from './components/CallCenter/CallCenterShell';
import CallCenterDashboardView from './components/CallCenter/CallCenterDashboardView';
import BackButton from './components/common/BackButton';
import {
  QrCode, RefreshCw, Trash2, LayoutDashboard,
  Server, Zap, Users, ChevronDown, CheckCircle2,
  Send, BarChart2, Bot, FileText, Shield, ArrowRight, BadgeCheck,
  User, LogOut, FolderDown, Check, Globe, Bell, Volume2, Search, Sun, Moon, Crown, X, Settings, SlidersHorizontal,
  Database, Plus, Smartphone, AlertTriangle,
} from 'lucide-react';

const TENANT_ID = import.meta.env.VITE_TENANT_ID ?? 'default-tenant';

export default function App() {
  // ── [A-3 FIX] State now lives in typed Zustand stores — no more 40+ useState hooks ──
  // Each store is individually subscribable; unrelated state changes don't re-render this component.
  const {
    accounts, activeAccount, totalUsersCount,
    setAccounts, setActiveAccount, setTotalUsersCount, fetchAccounts,
  } = useAccountStore();
  const {
    chats, contacts, selectedChat, loadingChats,
    setChats, setContacts, setSelectedChat, setLoadingChats,
    flushForAccountSwitch,
  } = useChatStore();
  const {
    navTab, setNavTab, goBack,
    showQRModal, setShowQRModal,
    qrAccountTarget, setQrAccountTarget,
    showAccountsModal, setShowAccountsModal,
    showSuperAdminModal, setShowSuperAdminModal,
    showAutoReplyModal, setShowAutoReplyModal,
    showSchedulerModal, setShowSchedulerModal,
    showUpgradeModal, setShowUpgradeModal,
    showExportModal, setShowExportModal,
    showAccountDropdown, setShowAccountDropdown,
    showNotificationCenter, setShowNotificationCenter,
    accountToDelete, setAccountToDelete,
    deletingAccount, setDeletingAccount,
    isGhostMode, toggleGhostMode,
    schedulerPreset, setSchedulerPreset,
    autoReplyPreset, setAutoReplyPreset,
    floatingNotifications, notificationHistory, hasNewNotifications,
    addFloatingNotification, dismissFloatingNotification, markNotificationsRead,
  } = useUIStore();

  const { addToast } = useToast();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();


  // Request browser desktop notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { });
    }
  }, []);

  // [A-3 FIX] Ghost mode now delegates to uiStore which uses sessionStorage (fixes [F-3])
  const handleToggleGhostMode = () => {
    toggleGhostMode(user?.id);
    addToast('info', !isGhostMode ? '👻 Stealth Ghost Mode Active! Blue ticks suppressed.' : 'Stealth Ghost Mode Disabled.');
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    setDeletingAccount(true);
    try {
      await accountsApi.delete(accountToDelete.id);
      addToast('success', `Account "${accountToDelete.displayName || accountToDelete.phoneNumber}" successfully deleted`);
      // [A-3 FIX] Update accounts via store action
      setAccounts(accounts.filter((a) => a.id !== accountToDelete.id));
      setAccountToDelete(null);
      await fetchAccounts(user?.role, user?.accountIds);
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      addToast('error', err?.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  // [A-3 FIX] fetchAccounts now delegates to accountStore.fetchAccounts so the store
  // is the single source of truth. The local fetchUsersCount remains local.
  const fetchUsersCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      if (user?.role === 'SUPER_ADMIN') {
        const admins = await authApi.listAdmins();
        if (Array.isArray(admins)) setTotalUsersCount(admins.length);
      } else {
        setTotalUsersCount(1);
      }
    } catch (err) {
      console.error('Failed to fetch users count:', err);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAccounts(user?.role, user?.accountIds);
      fetchUsersCount();
      // Quiet background refresh fallback (real-time updates are pushed via WebSockets)
      const statusTimer = setInterval(() => {
        fetchAccounts(user?.role, user?.accountIds);
        fetchUsersCount();
      }, 60000);
      return () => clearInterval(statusTimer);
    }
  }, [isAuthenticated, fetchAccounts, fetchUsersCount]);

  // ── Fetch chats and contacts for active account (Local-First IndexedDB) ─
  const fetchChatsAndContacts = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setLoadingChats(true);

    // 1. Instant local-first response: read from browser's local IndexedDB (0ms latency)
    try {
      const localChats = await localChatStorage.getLocalChats(accountId);
      if (localChats.length > 0) {
        setChats(localChats);
        setLoadingChats(false);
      }
    } catch { }

    const safetyTimer = setTimeout(() => {
      setLoadingChats(false);
    }, 6000);

    try {
      const [fetchedChats, fetchedContacts] = await Promise.all([
        whatsappWebApi.getChats(accountId, undefined, 500, 0).catch(() => []),
        whatsappWebApi.getContacts(accountId).catch(() => []),
      ]);

      if (fetchedChats && fetchedChats.length > 0) {
        await localChatStorage.saveLocalChats(fetchedChats);
        const mergedChats = await localChatStorage.getLocalChats(accountId);
        setChats(mergedChats);
      }
      setContacts(fetchedContacts);

      // Update chat data without resetting user's selected chat!
      const currentSelected = useChatStore.getState().selectedChat;
      const allChats = (await localChatStorage.getLocalChats(accountId)) || fetchedChats;

      if (currentSelected) {
        // If user already chose a chat, update its metadata if present in allChats, NEVER override to chats[0]
        const matchedChat = allChats.find(c => c.id === currentSelected.id && (accountId === 'all' ? c.accountId === currentSelected.accountId : true));
        if (matchedChat) {
          setSelectedChat(matchedChat);
        }
      } else if (allChats.length > 0) {
        // Only select chats[0] if no chat is currently selected at all
        setSelectedChat(allChats[0]);
      }
    } catch (err: any) {
      console.error('Failed to load WhatsApp chats/contacts:', err);
    } finally {
      clearTimeout(safetyTimer);
      setLoadingChats(false);
    }
  }, [setChats, setContacts, setSelectedChat, setLoadingChats]);

  useEffect(() => {
    if (activeAccount?.id) {
      fetchChatsAndContacts(activeAccount.id);
    } else {
      setChats([]);
      setContacts([]);
      setSelectedChat(null);
    }
  }, [activeAccount?.id, fetchChatsAndContacts]);

  // ── Switch Active Account — INP-optimized with yieldToMain ──────────────
  // PATTERN: visual feedback first → yield to browser for paint → heavy work.
  // Without the yield, the account switch is one 200ms+ long task and the
  // click feels sluggish (contributing to the 336ms INP score).
  const handleSelectAccount = (account?: Account) => {
    if (!account) return;
    // STEP 1: Instant visual response — flush stale data & show loading spinner
    flushForAccountSwitch(account.id);
    setActiveAccount(account);
    // STEP 2: Defer heavy network fetch AFTER the browser has painted the flush
    runAfterPaint(() => {
      fetchChatsAndContacts(account.id);
    });
    addToast('info', `Switched to account: ${account.displayName || account.phoneNumber}`);
  };

  // ── Open QR Code Scanner for Specific Account ────────────────────────────
  const handleOpenQRForAccount = (account?: Account) => {
    const target = account || activeAccount;
    if (!target) return;
    setQrAccountTarget(target);
    setShowQRModal(true);
  };

  // ── Real-time Socket.io Event Handling ───────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket(TENANT_ID, activeAccount?.id);

    const handleConnectionUpdate = (data: any) => {
      const curAccount = useAccountStore.getState().activeAccount;
      const targetId = data.accountId || curAccount?.id;
      if (data.status === 'connected') {
        setAccounts(prev => prev.map(a => (a.id === targetId ? { ...a, status: 'CONNECTED', ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}) } : a)));
        if (curAccount?.id === targetId) {
          setActiveAccount(prev => prev ? { ...prev, status: 'CONNECTED', ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}) } : null);
          fetchChatsAndContacts(targetId);
        }
        fetchAccounts();
      } else if (data.status === 'connecting') {
        setAccounts(prev => prev.map(a => (a.id === targetId ? { ...a, status: 'RECONNECTING' } : a)));
        if (curAccount?.id === targetId) {
          setActiveAccount(prev => prev ? { ...prev, status: 'RECONNECTING' } : null);
        }
      } else if (data.status === 'disconnected') {
        setAccounts(prev => prev.map(a => (a.id === targetId ? { ...a, status: 'RECONNECTING' } : a)));
        if (curAccount?.id === targetId) {
          setActiveAccount(prev => prev ? { ...prev, status: 'RECONNECTING' } : null);
        }
      }
    };

    // Live active/inactive status broadcasts for all 60 accounts
    const handleAccountStatus = (data: { accountId: string; status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'; phoneNumber?: string; displayName?: string }) => {
      setAccounts(prev => prev.map(acc => {
        if (acc.id === data.accountId) {
          const hasCustom = !!(
            acc.displayName &&
            acc.displayName !== 'WhatsApp Account' &&
            acc.displayName !== 'Default Account' &&
            !acc.displayName.startsWith('Account ') &&
            !acc.displayName.startsWith('unlinked_') &&
            !acc.displayName.startsWith('pending_')
          );
          const nextDisplayName = hasCustom ? acc.displayName : (data.displayName || acc.displayName);

          return {
            ...acc,
            status: data.status,
            displayName: nextDisplayName,
            ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
          };
        }
        return acc;
      }));

      const curAccount = useAccountStore.getState().activeAccount;
      if (curAccount?.id === data.accountId) {
        setActiveAccount(prev => prev ? {
          ...prev,
          status: data.status,
          ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
        } : null);
      }

      // Re-fetch from REST to get fully up-to-date chatCount/unreadCount etc.
      if (data.status === 'CONNECTED') {
        fetchAccounts();
      }
    };

    const handleChatsUpdated = (data?: { accountId?: string }) => {
      const curAccount = useAccountStore.getState().activeAccount;
      if (data?.accountId && curAccount?.id && curAccount.id !== 'all' && data.accountId !== curAccount.id) {
        return;
      }
      if (curAccount?.id) fetchChatsAndContacts(curAccount.id);
    };

    const handleContactsUpdated = (data?: { accountId?: string }) => {
      const curAccount = useAccountStore.getState().activeAccount;
      if (data?.accountId && curAccount?.id && curAccount.id !== 'all' && data.accountId !== curAccount.id) {
        return;
      }
      if (curAccount?.id) {
        whatsappWebApi.getContacts(curAccount.id).then(setContacts).catch(() => { });
      }
    };

    const handleHistorySynced = (data?: { accountId?: string }) => {
      const curAccount = useAccountStore.getState().activeAccount;
      if (data?.accountId && curAccount?.id && curAccount.id !== 'all' && data.accountId !== curAccount.id) {
        return;
      }
      addToast('success', 'WhatsApp history and contacts synced!');
      if (curAccount?.id) fetchChatsAndContacts(curAccount.id);
    };

    const handleNewMessage = (data: { message: any; chat?: WhatsAppChat; accountId?: string }) => {
      const msgAccountId = data.chat?.accountId || data.message?.accountId || data.accountId;
      const curAccount = useAccountStore.getState().activeAccount;
      if (curAccount?.id && curAccount.id !== 'all' && msgAccountId && msgAccountId !== curAccount.id) {
        return; // Drop message from other accounts
      }

      // Persist directly to local browser IndexedDB
      if (data.message) {
        localChatStorage.saveLocalMessage(data.message);
      }

      if (data.chat) {
        const newChat = { ...data.chat };
        if (!newChat.isGroup && (!newChat.name || newChat.name === 'Direct Chat' || newChat.name === 'You (Message yourself)' || newChat.name === 'WhatsApp User' || newChat.name.startsWith('User …'))) {
          const cleanDigits = newChat.id.split('@')[0].replace(/\D/g, '');
          if (cleanDigits.length >= 7) {
            newChat.name = formatE164(cleanDigits) || `+${cleanDigits}`;
          }
        }
        localChatStorage.saveLocalChat(newChat);
        setChats((currentChats) => {
          const isUniversal = curAccount?.id === 'all';
          const exists = currentChats.some(c => c.id === newChat.id && (isUniversal ? c.accountId === newChat.accountId : true));
          const updatedList = exists
            ? currentChats.map(c => (c.id === newChat.id && (isUniversal ? c.accountId === newChat.accountId : true) ? { ...c, ...newChat } : c))
            : [newChat, ...currentChats];
          return [...updatedList].sort(
            (a, b) => Number(b.lastMessageTimestamp) - Number(a.lastMessageTimestamp)
          );
        });
      } else if (curAccount?.id) {
        fetchChatsAndContacts(curAccount.id);
      }
    };

    const handleClientNotification = (notif: ClientMessageNotification) => {
      // Permission check:
      // Super Admin monitors all incoming client messages across all accounts
      // Staff Admins strictly monitor only their allocated WhatsApp accounts
      if (user && user.role !== 'SUPER_ADMIN') {
        const isAssigned = notif.assignedAdminUserId === user.id || user.accountIds?.includes(notif.accountId);
        if (!isAssigned) return;
      }

      // Play pleasant dual-tone WhatsApp chime
      playNotificationSound();

      // Native desktop notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Client Message: ${notif.clientName}`, {
            body: `[Account: ${notif.accountName}]: ${notif.messageText}`,
          });
        } catch { }
      }

      // Append to floating alerts & persistent notification history
      addFloatingNotification(notif);

      // Auto dismiss floating alert after 9 seconds
      setTimeout(() => {
        dismissFloatingNotification(notif.id);
      }, 9000);
    };

    const handleMessageEdited = (data: { messageId: string; chatJid: string; text: string; accountId?: string }) => {
      const curAccount = useAccountStore.getState().activeAccount;
      if (curAccount?.id && curAccount.id !== 'all' && data.accountId && data.accountId !== curAccount.id) {
        return; // Drop edit from other accounts
      }
      localChatStorage.updateLocalMessage(data.messageId, { text: data.text });
      const rawEditPhone = (data.chatJid || '').split('@')[0].replace(/\D/g, '');
      setChats((currentChats) =>
        currentChats.map(c => {
          const rawChatPhone = c.id.split('@')[0].replace(/\D/g, '');
          const isMatch = c.id === data.chatJid || (rawEditPhone && rawChatPhone && rawEditPhone === rawChatPhone);
          if (isMatch) {
            return { ...c, lastMessageText: data.text };
          }
          return c;
        })
      );
    };

    socket.on('connection.update', handleConnectionUpdate);
    socket.on('account:status', handleAccountStatus);
    socket.on('whatsapp:chats_updated', handleChatsUpdated);
    socket.on('whatsapp:contacts_updated', handleContactsUpdated);
    socket.on('whatsapp:history_synced', handleHistorySynced);
    socket.on('whatsapp:message_new', handleNewMessage);
    socket.on('whatsapp:message_edited', handleMessageEdited);
    socket.on('whatsapp:ready', handleChatsUpdated);
    socket.on('whatsapp:client_notification', handleClientNotification);

    return () => {
      socket.off('connection.update', handleConnectionUpdate);
      socket.off('account:status', handleAccountStatus);
      socket.off('whatsapp:chats_updated', handleChatsUpdated);
      socket.off('whatsapp:contacts_updated', handleContactsUpdated);
      socket.off('whatsapp:history_synced', handleHistorySynced);
      socket.off('whatsapp:ready', handleChatsUpdated);
      socket.off('whatsapp:message_new', handleNewMessage);
      socket.off('whatsapp:message_edited', handleMessageEdited);
      socket.off('whatsapp:client_notification', handleClientNotification);
    };
  }, [isAuthenticated, activeAccount?.id, fetchChatsAndContacts, fetchAccounts, addToast, user]);

  // ── Open Chat from Incoming Client Notification ────────────────────────
  // INP FIX: This handler was a single 400ms+ long task causing the UI to freeze.
  // Strategy: instant visual response → yield → background network work.
  const handleOpenNotificationChat = useCallback(async (notif: ClientMessageNotification) => {
    // PHASE 1 ─ Instant (0ms): dismiss banner + navigate to chats tab
    // These are pure state writes — no network, no arrays, no sorting.
    // The browser will paint these changes on the NEXT frame.
    dismissFloatingNotification(notif.id);
    setShowNotificationCenter(false);
    setNavTab('chats'); // Navigate to chats tab IMMEDIATELY

    // PHASE 2 ─ Yield: let the browser paint the banner-dismissed state
    // and process any queued pointer events before we start heavy work.
    await yieldToMain();

    // PHASE 3 ─ Background: account resolution + data fetch
    // The user sees the banner disappear instantly; this work happens
    // behind the scenes and fills in the chat panel.
    let targetAcc = accounts.find(a => a.id === notif.accountId);
    if (!targetAcc) {
      try {
        const freshList = await accountsApi.list();
        targetAcc = freshList.find(a => a.id === notif.accountId);
        if (freshList.length > 0) setAccounts(freshList);
      } catch { }
    }

    // Fetch chats scoped to the target account.
    // Capture the return value directly — do NOT read the `chats` closure
    // variable as it is stale from before the awaits above.
    let freshChats = chats;
    if (targetAcc) {
      if (activeAccount?.id !== targetAcc.id) {
        flushForAccountSwitch(targetAcc.id);
        setActiveAccount(targetAcc);
      }
      try {
        const [fetched] = await Promise.all([
          whatsappWebApi.getChats(targetAcc.id, undefined, 500, 0),
          whatsappWebApi.getContacts(targetAcc.id).then(setContacts).catch(() => { }),
        ]);
        freshChats = fetched;
        setChats(fetched);
      } catch {
        freshChats = chats;
      }
    }

    // Find or synthesize the target chat using FRESH (not stale) data
    const targetChatJid = notif.clientJid;
    const existing = freshChats.find(c => c.id === targetChatJid);
    if (existing) {
      setSelectedChat(existing);
    } else {
      const synthesizedChat: WhatsAppChat = {
        id: targetChatJid,
        accountId: notif.accountId,
        name: notif.clientName,
        isGroup: !!notif.isGroup,
        unreadCount: 0,
        lastMessageText: notif.messageText,
        lastMessageTimestamp: notif.timestamp,
        lastMessageStatus: 'delivered',
        lastMessageFromMe: false,
        pinned: false,
      };
      setChats([synthesizedChat, ...freshChats]);
      setSelectedChat(synthesizedChat);
    }

    addToast('info', `Opened chat with ${notif.clientName} (${notif.accountName})`);
  }, [accounts, activeAccount?.id, chats, fetchChatsAndContacts, addToast, dismissFloatingNotification, setAccounts, setActiveAccount, setSelectedChat, setChats, setShowNotificationCenter, flushForAccountSwitch, setNavTab]);

  // ── Sync WhatsApp Groups & Contacts ──────────────────────────────────────
  const handleFullSync = async () => {
    if (!activeAccount?.id) return;
    try {
      addToast('info', 'Syncing groups and contacts with WhatsApp...');
      await whatsappWebApi.sync(activeAccount.id);
      await fetchChatsAndContacts(activeAccount.id);
      addToast('success', 'All groups and contacts synced successfully!');
    } catch {
      await fetchChatsAndContacts(activeAccount.id);
      addToast('info', 'Refreshed chats and contacts');
    }
  };

  // ── Handle contact selection to initiate chat & persist to DB ────────────
  const handleSelectContact = async (contact: WhatsAppContact) => {
    const existingChat = chats.find(c => c.id === contact.id);
    if (existingChat) {
      setSelectedChat(existingChat);
      if (!existingChat.lastMessageText && activeAccount?.id && activeAccount.id !== 'all') {
        whatsappWebApi.syncChat(activeAccount.id, existingChat.id).catch(() => null);
      }
    } else {
      const accId = activeAccount?.id && activeAccount.id !== 'all' ? activeAccount.id : contact.accountId || '';
      const cleanContactPhone = (contact.phoneNumber && contact.phoneNumber !== 'Direct Chat' && !contact.phoneNumber.includes('LID'))
        ? contact.phoneNumber
        : formatE164(contact.id.split('@')[0]) || (contact.id.replace(/\D/g, '') ? `+${contact.id.replace(/\D/g, '')}` : '');
      const resolvedName = resolveChatDisplayName(contact, contacts).name;
      const finalContactChatName = (resolvedName && resolvedName !== 'Direct Chat' && resolvedName !== 'WhatsApp User' && resolvedName !== 'You (Message yourself)')
        ? resolvedName
        : (cleanContactPhone || contact.name || contact.notifyName || contact.id.split('@')[0]);

      const newChat: WhatsAppChat = {
        id: contact.id,
        accountId: accId,
        name: finalContactChatName,
        isGroup: contact.id.endsWith('@g.us'),
        unreadCount: 0,
        lastMessageText: '',
        lastMessageTimestamp: Date.now(),
        lastMessageStatus: 'sent',
        lastMessageFromMe: false,
        pinned: false,
      };
      setChats([newChat, ...chats.filter(c => c.id !== newChat.id)]);
      setSelectedChat(newChat);

      // Persist newly initiated contact chat into SQLite database immediately
      if (accId && accId !== 'all') {
        try {
          await whatsappWebApi.saveChat(accId, {
            id: newChat.id,
            name: newChat.name,
            isGroup: newChat.isGroup,
          });
          whatsappWebApi.syncChat(accId, newChat.id).catch(() => null);
        } catch (err) {
          console.warn('Failed to persist contact chat:', err);
        }
      }
    }
  };

  // ── Select Chat with On-Demand Message History Sync ──────────────────────
  const handleSelectChat = (chat: WhatsAppChat) => {
    setSelectedChat(chat);
    const accId = chat.accountId || (activeAccount?.id !== 'all' ? activeAccount?.id : '');
    if (accId && !chat.lastMessageText) {
      whatsappWebApi.syncChat(accId, chat.id).catch(() => null);
    }
  };

  // ── Pre-Logout Data Preservation Flush ───────────────────────────────────
  const handleAppLogout = async () => {
    setShowAccountDropdown(false);
    if (activeAccount?.id && activeAccount.id !== 'all') {
      try {
        addToast('info', 'Preserving data and syncing session before logout...');
        await whatsappWebApi.flush(activeAccount.id);
      } catch (err) {
        console.warn('Pre-logout flush notice:', err);
      }
    }
    logout();
    addToast('info', 'Logged out successfully');
  };

  // ── Clean Demo Accounts ──────────────────────────────────────────────────
  const handleCleanDemoAccounts = async () => {
    try {
      await whatsappWebApi.cleanDemoAccounts();
      addToast('success', 'Demo accounts removed.');
      await fetchAccounts();
    } catch {
      addToast('error', 'Failed to clean demo accounts');
    }
  };

  // ── Meta AI Chat Trigger ────────────────────────────────────────────────
  const handleOpenMetaAI = () => {
    const metaAIChat: WhatsAppChat = {
      id: 'meta-ai@s.whatsapp.net',
      accountId: activeAccount?.id || '',
      name: 'Meta AI',
      isGroup: false,
      unreadCount: 0,
      lastMessageText: 'Hello! How can I help you today?',
      lastMessageTimestamp: Date.now(),
      lastMessageStatus: 'read',
      lastMessageFromMe: false,
      pinned: true,
    };
    setSelectedChat(metaAIChat);
  };

  // ── Smart Messaging Preset Click Handler ──────────────────────────────────
  const handleSmartPresetClick = (presetName: string) => {
    let text = '';
    let repeat: 'once' | 'daily' | 'weekly' | 'monthly' = 'once';

    const p = presetName.toLowerCase();
    if (p.includes('birthday')) {
      text = '🎉 Wishing you a wonderful Happy Birthday! May your day be filled with happiness, success, and prosperity! 🎂✨';
      repeat = 'once';
    } else if (p.includes('follow') || p.includes('client')) {
      text = 'Hello! Just following up on our recent conversation to see if you have any questions or if you would like to proceed. Looking forward to your thoughts!';
      repeat = 'once';
    } else if (p.includes('reminder') || p.includes('daily')) {
      text = '🔔 Friendly Reminder: Please review your daily agenda and key deliverables today. Let us know if you need any assistance!';
      repeat = 'daily';
    } else if (p.includes('marketing') || p.includes('broadcast')) {
      text = '🚀 Special Announcement: Check out our new platform releases and limited-time offers available this week!';
      repeat = 'weekly';
    } else {
      text = `Preset: ${presetName}`;
      repeat = 'once';
    }

    setSchedulerPreset({
      initialText: text,
      initialRepeat: repeat,
      openCreate: true,
    });
    setShowSchedulerModal(true);
  };

  // ── Auto-Reply Use Case Click Handler ────────────────────────────────────
  const handleUseCaseClick = (useCase: 'faq' | 'catalog' | 'pricing' | 'afterhours') => {
    if (useCase === 'faq') {
      setAutoReplyPreset({
        openCreate: true,
        name: 'FAQ Bot Responder',
        triggerType: 'contains',
        triggerValue: 'faq, questions, help',
        replyMessage: '👋 Hello! Here are our FAQs:\n1️⃣ Pricing & Plans\n2️⃣ Catalog & Services\n3️⃣ Support Contact\nReply with a number for details!',
        onlyOutsideHours: false,
      });
    } else if (useCase === 'catalog') {
      setAutoReplyPreset({
        openCreate: true,
        name: 'Product Catalog Dispatcher',
        triggerType: 'contains',
        triggerValue: 'catalog, products, menu, brochure',
        replyMessage: '📦 Explore our latest catalog here: https://catalog.whatsapp-pro.io - Reply with your product code to order instantly!',
        onlyOutsideHours: false,
      });
    } else if (useCase === 'pricing') {
      setAutoReplyPreset({
        openCreate: true,
        name: 'Instant Pricing Assistant',
        triggerType: 'contains',
        triggerValue: 'price, cost, pricing, rate, plan',
        replyMessage: '🏷️ Our WhatsApp Pro plan starts at $49/month with unlimited messages, proxy protection, and multi-tenant scaling. Would you like a demo?',
        onlyOutsideHours: false,
      });
    } else if (useCase === 'afterhours') {
      setAutoReplyPreset({
        openCreate: true,
        name: 'After-Hours Away Notice',
        triggerType: 'any',
        triggerValue: '*',
        replyMessage: '🌙 Thank you for contacting us! Our support team is currently offline for the day. Our business hours are Mon-Fri 9:00 AM - 6:00 PM. We will respond first thing tomorrow!',
        onlyOutsideHours: true,
      });
    }
    setShowAutoReplyModal(true);
  };

  const isConnected = Boolean(
    activeAccount &&
    (
      activeAccount.status?.toLowerCase() === 'connected' ||
      activeAccount.status?.toLowerCase() === 'active' ||
      activeAccount.status?.toLowerCase() === 'reconnecting'
    )
  );
  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Target account for QR modal
  const modalTarget = qrAccountTarget || activeAccount;

  if (authLoading) {
    return (
      <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#070f12' }}>
        <header className="wa-titlebar" style={{ height: 54, background: '#070f12', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="wa-skeleton-line sk-circle" style={{ width: 32, height: 32 }} />
            <div className="wa-skeleton-line" style={{ width: 110, height: 18 }} />
          </div>
          <div className="wa-skeleton-line" style={{ width: 340, height: 32, borderRadius: 9999 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="wa-skeleton-line" style={{ width: 100, height: 26, borderRadius: 9999 }} />
            <div className="wa-skeleton-line sk-circle" style={{ width: 32, height: 32 }} />
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: 72, background: '#0b1317', borderRight: '1px solid #1f2c34', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 16 }}>
            <div className="wa-skeleton-line sk-circle" style={{ width: 40, height: 40 }} />
            <div className="wa-skeleton-line sk-circle" style={{ width: 40, height: 40 }} />
            <div className="wa-skeleton-line sk-circle" style={{ width: 40, height: 40 }} />
            <div className="wa-skeleton-line sk-circle" style={{ width: 40, height: 40 }} />
          </div>
          <div style={{ width: 380, background: '#111b21', borderRight: '1px solid #1f2c34', display: 'flex', flexDirection: 'column', padding: 12, gap: 10 }}>
            <div className="wa-skeleton-line" style={{ width: '100%', height: 34, borderRadius: 8 }} />
            <div className="wa-skeleton-item" style={{ padding: '8px 0' }}>
              <div className="wa-skeleton-line sk-circle" style={{ width: 46, height: 46, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="wa-skeleton-line" style={{ width: 120, height: 14 }} />
                <div className="wa-skeleton-line" style={{ width: 180, height: 12 }} />
              </div>
            </div>
            <div className="wa-skeleton-item" style={{ padding: '8px 0' }}>
              <div className="wa-skeleton-line sk-circle" style={{ width: 46, height: 46, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="wa-skeleton-line" style={{ width: 140, height: 14 }} />
                <div className="wa-skeleton-line" style={{ width: 200, height: 12 }} />
              </div>
            </div>
            <div className="wa-skeleton-item" style={{ padding: '8px 0' }}>
              <div className="wa-skeleton-line sk-circle" style={{ width: 46, height: 46, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="wa-skeleton-line" style={{ width: 105, height: 14 }} />
                <div className="wa-skeleton-line" style={{ width: 160, height: 12 }} />
              </div>
            </div>
          </div>
          <div style={{ flex: 1, background: '#0b141a', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 59, background: '#202c33', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
              <div className="wa-skeleton-line sk-circle" style={{ width: 40, height: 40 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="wa-skeleton-line" style={{ width: 130, height: 14 }} />
                <div className="wa-skeleton-line" style={{ width: 80, height: 10 }} />
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ height: 62, background: '#202c33', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
              <div className="wa-skeleton-line sk-circle" style={{ width: 28, height: 28 }} />
              <div className="wa-skeleton-line" style={{ flex: 1, height: 38, borderRadius: 8 }} />
              <div className="wa-skeleton-line sk-circle" style={{ width: 28, height: 28 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={fetchAccounts} />;
  }

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f0f2f5' }}>
      <CallCenterShell
        activeTab={navTab}
        onSelectTab={(tab) => {
          setNavTab(tab);
          if (tab === 'meta-ai') handleOpenMetaAI();
        }}
        onLogout={handleAppLogout}
        unreadCount={totalUnread}
        totalAccountsCount={accounts.length}
        userName={user?.displayName || 'Super Admin'}
        userRole={user?.role}
        onOpenNotifications={() => setShowNotificationCenter(true)}
      >
        <React.Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', position: 'relative' }}><div className="wa-top-loader" /></div>}>
          {/* 1. Call Center Dashboard View (Matching Reference Callyzer UI) */}
          {navTab === 'dashboard' && (
            <CallCenterDashboardView
              onNavigateTab={(tab) => setNavTab(tab)}
              onLogout={handleAppLogout}
              activeSidebarItem="dashboard"
              totalAccountsCount={accounts.length}
              totalContactsCount={contacts.length}
              accountId={activeAccount?.id || accounts[0]?.id}
            />
          )}
            {/* ── 2. Instance Manager View Matching Design 8 ── */}
            {navTab === 'instances' && (
              <WhatsAppInstanceManagerView
                tenantId={TENANT_ID}
                accounts={accounts}
                onSelectAccount={(acc) => {
                  handleSelectAccount(acc);
                  setNavTab('chats');
                }}
                onNavigateToChats={(acc) => {
                  handleSelectAccount(acc);
                  setNavTab('chats');
                }}
              />
            )}

            {/* ── 3. Campaigns Dashboard Matching Design 10 (Main View) ── */}
            {navTab === 'campaigns' && (
              <WhatsAppCampaignsView
                accountId={activeAccount?.id || accounts[0]?.id || 'default'}
                accounts={accounts}
                onOpenUpgrade={() => setShowUpgradeModal(true)}
              />
            )}

            {/* ── 3a. System Overview Telemetry Matching Design 9 ── */}
            {navTab === 'system-overview' && (
              <WhatsAppSystemOverviewView
                tenantId={TENANT_ID}
                onNavigateToInstances={() => setNavTab('instances')}
                onNavigateToControlCenter={() => setNavTab('organization')}
                onNavigateToBackup={() => setNavTab('database-backup')}
              />
            )}

            {/* ── 3b. Super Admin Organization Hierarchy Matching Design 6 ── */}
            {(navTab === 'organization' || navTab === 'users') && (
              <WhatsAppSuperAdminControlCenter
                onSelectAccount={(acc) => {
                  handleSelectAccount(acc);
                  setNavTab('chats');
                }}
                onNavigateToChats={(acc) => {
                  handleSelectAccount(acc);
                  setNavTab('chats');
                }}
                onNavigateToBackup={() => setNavTab('database-backup')}
                onOpenQR={(acc) => handleOpenQRForAccount(acc)}
                onBack={() => goBack()}
              />
            )}

            {/* ── 4. Database Backup & Conversation Export Matching Design 7 ── */}
            {navTab === 'database-backup' && (
              <WhatsAppDatabaseBackupView
                accounts={accounts}
                activeAccount={activeAccount}
                onCancel={() => goBack()}
                onOpenExistingBackups={() => setNavTab('dashboard')}
              />
            )}

            {/* ── 5. WhatsApp Account Manager View Matching Design 5 ── */}
            {navTab === 'accounts' && (
              <WhatsAppAccountsManagerDashboard
                accounts={accounts}
                activeAccount={activeAccount}
                onBack={() => goBack()}
                onSelectAccount={(acc) => {
                  handleSelectAccount(acc);
                  setNavTab('chats');
                  addToast('success', `Switched active account to ${acc.displayName || acc.phoneNumber}`);
                }}
                onRefreshAccounts={() => fetchAccounts()}
                onAddAccount={() => {
                  setShowAccountsModal(true);
                }}
                onStopAccount={async (acc) => {
                  try {
                    await whatsappWebApi.logout(acc.id);
                    addToast('info', `Stopped session for ${acc.displayName || acc.phoneNumber}`);
                    await fetchAccounts();
                  } catch {
                    addToast('info', `Session stopped for ${acc.displayName || acc.phoneNumber}`);
                  }
                }}
                onDeleteAccount={(acc) => {
                  setAccountToDelete(acc);
                }}
                onNavigateToChats={(acc) => {
                  handleSelectAccount(acc);
                  setNavTab('chats');
                }}
                onOpenQR={(acc) => {
                  handleOpenQRForAccount(acc);
                }}
                userName={user?.displayName || user?.username || 'Super Admin'}
                userRole={user?.role || 'SUPER_ADMIN'}
                totalUsers={totalUsersCount}
                onKpiClick={(type) => {
                  if (type === 'accounts') {
                    const names = accounts.map(a => `• ${a.displayName || a.phoneNumber} (${a.status})`).join('\n');
                    addToast('info', `Accounts:\n${names || 'No accounts'}`);
                  } else if (type === 'active') {
                    const connected = accounts.filter(a => a.status === 'CONNECTED');
                    if (connected.length === 0) {
                      addToast('warning', 'No active accounts. Scan QR to connect.');
                    } else {
                      addToast('success', `Connected: ${connected.map(a => a.displayName || a.phoneNumber).join(', ')}`);
                    }
                  } else if (type === 'users') {
                    // [F-4 FIX] Protected Route/Action Guard
                    if (user?.role === 'SUPER_ADMIN') {
                      setShowSuperAdminModal(true);
                    } else {
                      addToast('error', 'Super Admin privileges required');
                    }
                  }
                }}
              />
            )}

            {/* ── Auto-redirect deprecated tabs to WhatsApp Chats ── */}
            {(navTab === 'connected-devices' || navTab === 'whatsapp') && (
              <div style={{ display: 'none' }}>
                {(() => { setTimeout(() => setNavTab('chats'), 0); return null; })()}
              </div>
            )}

            {/* ── 6. Chatbot Flow Builder Matching Design 12 ── */}
            {navTab === 'chatbot' && (
              <WhatsAppChatbotFlowBuilderView
                accountId={activeAccount?.id || accounts[0]?.id || 'default'}
                onNavigateTab={(tab) => setNavTab(tab)}
              />
            )}

            {/* ── 6b. Keyword Auto-Reply View Matching Design 4 ── */}
            {navTab === 'auto-reply' && (
              <>
                <WhatsAppAutoReplyView
                  onCreateRule={() => {
                    setAutoReplyPreset({ openCreate: true });
                    setShowAutoReplyModal(true);
                  }}
                  onCloseView={() => setNavTab('dashboard')}
                />
                <WhatsAppAutoReplyRightPanel
                  onSelectUseCase={handleUseCaseClick}
                  onOpenBotWorkflow={() => setNavTab('chatbot')}
                />
              </>
            )}

            {/* ── 7. Home View Matching Design 3: Message Scheduler & Smart Messaging ── */}
            {navTab === 'home' && (
              <>
                <WhatsAppSchedulerView
                  onScheduleNew={() => {
                    setSchedulerPreset({ initialText: '', initialRepeat: 'once', openCreate: true });
                    setShowSchedulerModal(true);
                  }}
                  onPresetSelect={(preset) => {
                    if (preset === 'One-time Message') {
                      setSchedulerPreset({ initialText: '', initialRepeat: 'once', openCreate: true });
                      setShowSchedulerModal(true);
                    } else if (preset === 'Recurring Messages') {
                      setSchedulerPreset({ initialText: '', initialRepeat: 'daily', openCreate: true });
                      setShowSchedulerModal(true);
                    } else if (preset === 'Multiple Recipients') {
                      setNavTab('campaigns');
                    } else if (preset === '100% Secure') {
                      addToast('info', '🔒 100% Secure: End-to-end encrypted session keys stored locally.');
                    }
                  }}
                />

                <WhatsAppSmartMessagingPanel
                  onSelectPreset={handleSmartPresetClick}
                  onUpgradePro={() => setShowUpgradeModal(true)}
                />
              </>
            )}

            {/* ── 8. Health Monitor Dashboard ── */}
            {navTab === 'health' && (
              <div style={{ flex: 1, overflow: 'auto', background: '#071013' }}>
                <HealthDashboard tenantId={TENANT_ID} />
              </div>
            )}


            {/* ── 10. Delivery Analytics Dashboard Matching Design 11 ── */}
            {navTab === 'analytics' && (
              <WhatsAppDeliveryAnalyticsView
                accountId={activeAccount?.id || accounts[0]?.id || 'default'}
                onNavigateToCampaigns={() => setNavTab('campaigns')}
              />
            )}

            {/* ── 11. Message Templates View Matching Design 13 ── */}
            {navTab === 'templates' && (
              <WhatsAppMessageTemplatesView
                accountId={activeAccount?.id || accounts[0]?.id || 'default'}
                onNavigateTab={(tab) => setNavTab(tab)}
              />
            )}

            {/* ── 12. Contact Groups & Segmentation Matching Design 14 ── */}
            {(navTab === 'contacts' || navTab === 'contacts-import' || navTab === 'contacts-export') && (
              <WhatsAppContactGroupsView
                accountId={activeAccount?.id || accounts[0]?.id || 'default'}
                onNavigateTab={(tab) => setNavTab(tab)}
                initialAction={
                  navTab === 'contacts-import'
                    ? 'import'
                    : navTab === 'contacts-export'
                      ? 'export'
                      : null
                }
              />
            )}

            {/* ── 13. Compliance & Opt-Out Matching Design 16 ── */}
            {(navTab === 'optout' || navTab === 'compliance') && (
              <WhatsAppComplianceOptOutView
                accountId={activeAccount?.id || accounts[0]?.id || 'default'}
                onNavigateTab={(tab) => setNavTab(tab)}
              />
            )}

            {/* ── 14. Migration Assistant Matching Design 15 ── */}
            {navTab === 'migration' && (
              <WhatsAppMigrationAssistantView
                accountId={activeAccount?.id || accounts[0]?.id || 'default'}
                onNavigateTab={(tab) => setNavTab(tab)}
              />
            )}

            {/* ── 15. Business Verification & Green Tick Matching Design 17 ── */}
            {navTab === 'verification' && (
              <WhatsAppBusinessVerificationView
                accounts={accounts}
                onNavigateTab={(tab) => setNavTab(tab)}
                onOpenAccountManager={() => setNavTab('accounts')}
              />
            )}

            {/* ── 16. Enterprise Settings ── */}
            {navTab === 'settings' && (
              <div style={{ flex: 1, overflow: 'auto', background: '#071013', padding: '32px' }}>
                <div style={{ maxWidth: 840, margin: '0 auto', background: 'rgba(11, 23, 28, 0.85)', border: '1px solid rgba(45, 212, 191, 0.25)', borderRadius: 16, padding: 28, boxShadow: '0 12px 36px rgba(0,0,0,0.5)' }}>
                  <div style={{ marginBottom: 18 }}>
                    <BackButton onClick={() => goBack()} label="Back to Previous Page" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(45, 212, 191, 0.12)', border: '1px solid rgba(45, 212, 191, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Settings size={24} color="#2dd4bf" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', margin: 0 }}>WhatsApp Pro Enterprise Settings</h2>
                      <p style={{ fontSize: 12.5, color: '#8696a0', margin: '4px 0 0 0' }}>Manage local AES-256 encryption keys, container network routing, and security policies</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 18 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2dd4bf', margin: '0 0 6px 0' }}>Local AES-256 Key Vault</h4>
                      <p style={{ fontSize: 12, color: '#8696a0', margin: 0 }}>Session keys are encrypted locally with hardware-bound keys. Meta Cloud access is disabled.</p>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 18 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2dd4bf', margin: '0 0 6px 0' }}>Container Proxy &amp; Gateway</h4>
                      <p style={{ fontSize: 12, color: '#8696a0', margin: 0 }}>Dedicated SOCKS5 / HTTP proxy per container instance to ensure high delivery rate and IP isolation.</p>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2dd4bf', margin: '0 0 6px 0' }}>Stealth Ghost Mode</h4>
                        <p style={{ fontSize: 12, color: '#8696a0', margin: 0 }}>Suppress read receipts and online presence indicators.</p>
                      </div>
                      <button
                        onClick={handleToggleGhostMode}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          background: isGhostMode ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                          border: 'none',
                          color: isGhostMode ? '#071013' : '#cbd5e1',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {isGhostMode ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 17. Chats View Matching Design 2: Chats Column + Chat Area + Right Panel ── */}
            {navTab === 'chats' && (
              <>
                {/* 2. Middle: Chats Column (~360px) */}
                <aside className="wa-sidebar-chats">
                  <WhatsAppChatsList
                    chats={chats}
                    contacts={contacts}
                    selectedChatId={selectedChat?.id ?? (chats.length > 0 ? null : 'you_self')}
                    onSelectChat={handleSelectChat}
                    onSelectContact={handleSelectContact}
                    loading={loadingChats}
                    onRefresh={handleFullSync}
                    forceContactsTab={false}
                    accounts={accounts}
                    activeAccount={activeAccount}
                    onSelectAccount={handleSelectAccount}
                    onOpenQR={handleOpenQRForAccount}
                    onAddAccount={() => setShowAccountsModal(true)}
                  />
                </aside>

                {/* 3. Center: Conversation Area */}
                <main className="wa-main-chat-area" style={{ flex: 1, minWidth: 0, height: '100%' }}>
                  <WhatsAppChatArea
                    chat={selectedChat || (chats.length === 0 ? {
                      id: 'you_self',
                      accountId: activeAccount?.id || 'default',
                      name: 'You (Message yourself)',
                      isGroup: false,
                      unreadCount: 0,
                      lastMessageText: 'Tap to chat',
                      lastMessageTimestamp: Date.now(),
                      lastMessageStatus: 'read',
                      lastMessageFromMe: true,
                      pinned: true,
                    } : null)}
                    accountId={selectedChat?.accountId || activeAccount?.id || ''}
                    tenantId={TENANT_ID}
                    contacts={contacts}
                    isConnected={isConnected}
                    onOpenQR={() => {
                      setQrAccountTarget(activeAccount);
                      setShowQRModal(true);
                    }}
                    onBack={() => setSelectedChat(null)}
                    onMessageSent={() => fetchChatsAndContacts(activeAccount?.id || 'all')}
                    onOpenContacts={() => {
                      if (contacts.length > 0) handleSelectContact(contacts[0]);
                    }}
                    onOpenMetaAI={handleOpenMetaAI}
                    onOpenExport={() => setNavTab('database-backup')}
                    onAccountDisconnected={(accId: string) => {
                      setAccounts(accounts.map(a => a.id === accId ? { ...a, status: 'DISCONNECTED' } : a));
                      if (activeAccount?.id === accId && activeAccount) {
                        setActiveAccount({ ...activeAccount, status: 'DISCONNECTED' });
                      }
                      const target = accounts.find(a => a.id === accId) || activeAccount;
                      if (target) { setQrAccountTarget({ ...target, status: 'DISCONNECTED' }); setShowQRModal(true); }
                    }}
                  />
                </main>

                {/* 4. Right: Account Details & Quick Actions Panel */}
                <WhatsAppRightPanel
                  account={activeAccount}
                  selectedChat={selectedChat}
                  onNewChat={() => setNavTab('chats')}
                  onBroadcast={() => setNavTab('campaigns')}
                  onAddContact={() => setNavTab('chats')}
                  onSendTemplate={() => setNavTab('templates')}
                  onOpenQR={() => {
                    setQrAccountTarget(activeAccount);
                    setShowQRModal(true);
                  }}
                  onReconnect={async () => {
                    if (!activeAccount?.id) return;
                    try {
                      await whatsappWebApi.reconnect(activeAccount.id);
                      addToast('info', `Reconnecting ${activeAccount.displayName || activeAccount.phoneNumber}...`);
                    } catch {
                      setQrAccountTarget(activeAccount);
                      setShowQRModal(true);
                    }
                  }}
                  onDeleteAccount={(acc) => setAccountToDelete(acc)}
                  userName={user?.displayName || 'You (Message yourself)'}
                />
              </>
            )}
          </React.Suspense>
        </CallCenterShell>

      <React.Suspense fallback={null}>
        {/* ── Multi-Account Manager Modal (Up to 60 Accounts) ───────────────── */}
        <AccountsManagerModal
          isOpen={showAccountsModal}
          onClose={() => setShowAccountsModal(false)}
          accounts={accounts}
          activeAccount={activeAccount}
          onSelectAccount={handleSelectAccount}
          onRefreshAccounts={fetchAccounts}
          onOpenQR={handleOpenQRForAccount}
          tenantId={TENANT_ID}
        />

        {/* ── WhatsApp QR Linking Modal with Connected State Handled ───────── */}
        {modalTarget && (
          <WhatsAppQRModal
            isOpen={showQRModal}
            onClose={() => {
              setShowQRModal(false);
              setQrAccountTarget(null);
            }}
            tenantId={TENANT_ID}
            accountId={modalTarget.id}
            isConnected={modalTarget.status === 'CONNECTED'}
            phoneNumber={modalTarget.phoneNumber}
            onSuccess={() => {
              fetchAccounts();
              if (modalTarget?.id) fetchChatsAndContacts(modalTarget.id);
              else if (activeAccount?.id) fetchChatsAndContacts(activeAccount.id);
            }}
          />
        )}

        {/* ── Super Admin Dashboard Modal (Hierarchical Root Management) ────── */}
        {showSuperAdminModal && user?.role === 'SUPER_ADMIN' && (
          <SuperAdminDashboard
            onClose={() => setShowSuperAdminModal(false)}
            onSelectAccount={(acc) => {
              handleSelectAccount(acc);
              setShowSuperAdminModal(false);
            }}
          />
        )}

        {/* ── 24/7 Auto-Reply Engine Modal with Pre-fill Support ───────────────── */}
        {showAutoReplyModal && (
          <AutoReplyModal
            accountId={activeAccount?.id || accounts[0]?.id || ''}
            initialShowCreate={autoReplyPreset.openCreate}
            initialName={autoReplyPreset.name}
            initialTriggerType={autoReplyPreset.triggerType}
            initialTriggerValue={autoReplyPreset.triggerValue}
            initialReplyMessage={autoReplyPreset.replyMessage}
            initialOnlyOutsideHours={autoReplyPreset.onlyOutsideHours}
            onClose={() => {
              setShowAutoReplyModal(false);
              setAutoReplyPreset({ openCreate: false });
            }}
          />
        )}

        {/* ── Message Scheduler Modal with Pre-fill Support ──────────────────── */}
        {showSchedulerModal && (
          <ScheduledMessagesModal
            accountId={activeAccount?.id || accounts[0]?.id || ''}
            defaultToJid={selectedChat?.id}
            defaultContactName={selectedChat?.name}
            initialMessageText={schedulerPreset.initialText}
            initialRepeatType={schedulerPreset.initialRepeat}
            initialShowCreate={schedulerPreset.openCreate}
            onClose={() => setShowSchedulerModal(false)}
          />
        )}

        {/* ── Pro Upgrade Modal ──────────────────────────────────────────────── */}
        <ProUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onUpgradeSuccess={() => addToast('success', '🎉 Welcome to WhatsApp Pro! Enterprise features unlocked.')}
        />

        {/* ── Database Backup & Export Modal ──────────────────────────────────── */}
        {showExportModal && (
          <ExportBackupModal
            accounts={accounts}
            activeAccount={activeAccount}
            activeChat={selectedChat}
            onClose={() => setShowExportModal(false)}
            onSelectAccount={handleSelectAccount}
          />
        )}
      </React.Suspense>

      {/* ── Real-time Client Incoming Message Floating Alerts ──────────────── */}
      <ClientNotificationCenter
        floatingNotifications={floatingNotifications}
        history={[]}
        showDropdown={false}
        onCloseDropdown={() => { }}
        onDismissFloating={(id) => dismissFloatingNotification(id)}
        onClearHistory={() => { }}
        onOpenChat={handleOpenNotificationChat}
      />

      {/* ── In-App Confirm Delete Account Modal (Guaranteed Unblockable) ── */}
      {accountToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20,
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => !deletingAccount && setAccountToDelete(null)}
        >
          <div
            style={{
              background: '#111b21',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 16,
              padding: '26px 30px',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.75)',
              color: '#e9edef',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={24} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f8fafc' }}>
                  Delete WhatsApp Account?
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: 12.5, color: '#8696a0' }}>
                  Permanent irreversible action
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 22px 0' }}>
              Are you sure you want to delete <strong style={{ color: '#ffffff' }}>"{accountToDelete.displayName || accountToDelete.phoneNumber}"</strong>?
              All associated chats, message logs, credentials, and session keys will be purged from the database.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setAccountToDelete(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#e9edef',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deletingAccount ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleConfirmDeleteAccount}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: deletingAccount ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.15s ease',
                }}
              >
                {deletingAccount ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette />

      {/* Enterprise Disconnection 1-Minute Alert Center */}
      <DisconnectionAlertCenter />
    </div>
  );
}

