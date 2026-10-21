// -----------------------------------------------------------------------------
//  src/stores/uiStore.ts
//  [A-3 FIX] Zustand store � all UI modal state, ghost mode, nav tab, notifications.
//  Extracted from App.tsx. Ghost mode now keyed by session (sessionStorage) so it
//  doesn't bleed across logouts (addresses [F-3] from Phase 2 audit).
// -----------------------------------------------------------------------------
import { create } from 'zustand';
import { ClientMessageNotification } from '../components/Notifications/ClientNotificationCenter';
import { Account } from '../services/api';

interface SchedulerPreset {
  initialText: string;
  initialRepeat: 'once' | 'daily' | 'weekly' | 'monthly';
  openCreate: boolean;
  isMultiRecipient?: boolean;
}

interface AutoReplyPreset {
  openCreate: boolean;
  name?: string;
  triggerType?: 'contains' | 'keyword' | 'regex' | 'new_contact' | 'any';
  triggerValue?: string;
  replyMessage?: string;
  onlyOutsideHours?: boolean;
}

interface UIState {
  // Nav
  navTab: string;
  navHistory: string[];
  setNavTab: (tab: string) => void;
  goBack: () => void;

  // Modals
  showQRModal: boolean;
  qrAccountTarget: Account | null;
  showAccountsModal: boolean;
  showSuperAdminModal: boolean;
  showAutoReplyModal: boolean;
  showSchedulerModal: boolean;
  showUpgradeModal: boolean;
  showExportModal: boolean;
  showAccountDropdown: boolean;
  showNotificationCenter: boolean;
  showQRDataFlowModal: boolean;

  setShowQRModal: (v: boolean) => void;
  setQrAccountTarget: (a: Account | null) => void;
  setShowAccountsModal: (v: boolean) => void;
  setShowSuperAdminModal: (v: boolean) => void;
  setShowAutoReplyModal: (v: boolean) => void;
  setShowSchedulerModal: (v: boolean) => void;
  setShowUpgradeModal: (v: boolean) => void;
  setShowExportModal: (v: boolean) => void;
  setShowAccountDropdown: (v: boolean) => void;
  setShowNotificationCenter: (v: boolean) => void;
  setShowQRDataFlowModal: (v: boolean) => void;

  // Account deletion in-app flow
  accountToDelete: Account | null;
  deletingAccount: boolean;
  setAccountToDelete: (a: Account | null) => void;
  setDeletingAccount: (v: boolean) => void;

  // Ghost mode � session-scoped (no localStorage bleed across logouts)
  isGhostMode: boolean;
  toggleGhostMode: (userId?: string) => void;
  clearGhostMode: (userId?: string) => void;

  // Presets for modals opened from contextual actions
  schedulerPreset: SchedulerPreset;
  autoReplyPreset: AutoReplyPreset;
  setSchedulerPreset: (p: Partial<SchedulerPreset>) => void;
  setAutoReplyPreset: (p: Partial<AutoReplyPreset>) => void;

  // Notification center
  floatingNotifications: ClientMessageNotification[];
  notificationHistory: ClientMessageNotification[];
  hasNewNotifications: boolean;
  addFloatingNotification: (n: ClientMessageNotification) => void;
  dismissFloatingNotification: (id: string) => void;
  markNotificationsRead: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  navTab: 'dashboard',
  navHistory: [],
  setNavTab: (newTab) => {
    const current = get().navTab;
    if (current === newTab) return;
    set(state => ({
      navTab: newTab,
      navHistory: [...state.navHistory.slice(-25), current],
    }));
  },
  goBack: () => {
    const history = get().navHistory;
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      set({ navTab: prev, navHistory: newHistory });
    } else {
      set({ navTab: 'chats' });
    }
  },

  showQRModal: false,
  qrAccountTarget: null,
  showAccountsModal: false,
  showSuperAdminModal: false,
  showAutoReplyModal: false,
  showSchedulerModal: false,
  showUpgradeModal: false,
  showExportModal: false,
  showAccountDropdown: false,
  showNotificationCenter: false,
  showQRDataFlowModal: false,

  setShowQRModal: (v) => set({ showQRModal: v }),
  setQrAccountTarget: (a) => set({ qrAccountTarget: a }),
  setShowAccountsModal: (v) => set({ showAccountsModal: v }),
  setShowSuperAdminModal: (v) => set({ showSuperAdminModal: v }),
  setShowAutoReplyModal: (v) => set({ showAutoReplyModal: v }),
  setShowSchedulerModal: (v) => set({ showSchedulerModal: v }),
  setShowUpgradeModal: (v) => set({ showUpgradeModal: v }),
  setShowExportModal: (v) => set({ showExportModal: v }),
  setShowAccountDropdown: (v) => set({ showAccountDropdown: v }),
  setShowNotificationCenter: (v) => set({ showNotificationCenter: v }),
  setShowQRDataFlowModal: (v) => set({ showQRDataFlowModal: v }),

  accountToDelete: null,
  deletingAccount: false,
  setAccountToDelete: (a) => set({ accountToDelete: a }),
  setDeletingAccount: (v) => set({ deletingAccount: v }),

  // [F-3 FIX] Ghost mode reads from sessionStorage keyed by userId
  isGhostMode: false,
  toggleGhostMode: (userId) => {
    set((state) => {
      const next = !state.isGhostMode;
      if (userId) {
        try { sessionStorage.setItem(`wa_ghost_${userId}`, String(next)); } catch {}
      }
      return { isGhostMode: next };
    });
  },
  clearGhostMode: (userId) => {
    if (userId) {
      try { sessionStorage.removeItem(`wa_ghost_${userId}`); } catch {}
    }
    set({ isGhostMode: false });
  },

  schedulerPreset: { initialText: '', initialRepeat: 'once', openCreate: false },
  autoReplyPreset: { openCreate: false },
  setSchedulerPreset: (p) =>
    set((state) => ({ schedulerPreset: { ...state.schedulerPreset, ...p } })),
  setAutoReplyPreset: (p) =>
    set((state) => ({ autoReplyPreset: { ...state.autoReplyPreset, ...p } })),

  floatingNotifications: [],
  notificationHistory: [],
  hasNewNotifications: false,

  addFloatingNotification: (n) =>
    set((state) => {
      // Deduplicate: if a banner for this exact chat+account already exists,
      // replace it with the newest message instead of stacking another card.
      const withoutDupe = state.floatingNotifications.filter(
        (existing) => !(existing.clientJid === n.clientJid && existing.accountId === n.accountId),
      );
      return {
        floatingNotifications: [n, ...withoutDupe].slice(0, 5),
        notificationHistory: [n, ...state.notificationHistory].slice(0, 100),
        hasNewNotifications: true,
      };
    }),
  dismissFloatingNotification: (id) =>
    set((state) => ({
      floatingNotifications: state.floatingNotifications.filter((n) => n.id !== id),
    })),
  markNotificationsRead: () => set({ hasNewNotifications: false }),
}));

