// -----------------------------------------------------------------------------
//  src/stores/accountStore.ts
//  [A-3 FIX] Zustand store - Accounts & active selection.
//  Extracted from App.tsx which had 40+ useState declarations in one component.
// -----------------------------------------------------------------------------
import { create } from 'zustand';
import { Account, accountsApi } from '../services/api';
import { registerAccountDisplayName, autoRegisterAccount } from '../utils/contactResolver';

interface AccountState {
  accounts: Account[];
  activeAccount: Account | null;
  totalUsersCount: number;
  setAccounts: (accountsOrUpdater: Account[] | ((prev: Account[]) => Account[])) => void;
  setActiveAccount: (accountOrUpdater: Account | null | ((prev: Account | null) => Account | null)) => void;
  setTotalUsersCount: (count: number) => void;
  fetchAccounts: (userRole?: string, userAccountIds?: string[]) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  activeAccount: null,
  totalUsersCount: 0,

  setAccounts: (accountsOrUpdater) =>
    set((state) => ({
      accounts: typeof accountsOrUpdater === 'function' ? accountsOrUpdater(state.accounts) : accountsOrUpdater,
    })),
  setActiveAccount: (accountOrUpdater) =>
    set((state) => ({
      activeAccount: typeof accountOrUpdater === 'function' ? accountOrUpdater(state.activeAccount) : accountOrUpdater,
    })),
  setTotalUsersCount: (count) => set({ totalUsersCount: count }),

  fetchAccounts: async (userRole?: string, userAccountIds?: string[]) => {
    try {
      let list = await accountsApi.list();
      // Client-side role filter - ADMIN users only see their assigned accounts
      if (userRole && userRole !== 'SUPER_ADMIN' && userAccountIds) {
        list = list.filter((a) => userAccountIds.includes(a.id));
      }
      const prev = get().activeAccount;
      let nextActive = prev;

      if (!prev) {
        // Initial setup: select first connected account or first available
        nextActive = list.find((a) => a.status === 'CONNECTED') ?? list[0] ?? null;
      } else if (prev.id === 'all') {
        // Universal multi-account stream mode: preserve 'all'
        nextActive = prev;
      } else {
        const found = list.find((a) => a.id === prev.id);
        if (found) {
          // Merge updated properties (status, unread counts) without changing the active account identity
          nextActive = { ...prev, ...found };
        } else if (list.length > 0) {
          // Only switch if the previously active account was deleted or revoked
          nextActive = list[0];
        }
      }

      // Automatically register all account owner identities for universal contact resolution
      for (const a of list) {
        autoRegisterAccount(a);
      }

      set({ accounts: list, activeAccount: nextActive });
    } catch {
      // Keep existing state on failure; caller can show error toast if needed
    }
  },
}));