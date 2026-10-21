/**
 * useAccountSwitcher.ts
 * Enterprise custom hook for active account switching, status polling, and account deletion.
 * Commandment #2: Separate business logic from UI components.
 * Commandment #8: Proper state management.
 */
import { useCallback, useEffect } from 'react';
import { Account, accountsApi, authApi } from '../services/api';
import { useAccountStore, useChatStore, useUIStore } from '../stores';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { runAfterPaint } from '../utils/scheduler';

export function useAccountSwitcher(
  fetchChatsAndContacts: (accountId: string) => Promise<void>,
) {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const {
    accounts,
    activeAccount,
    setAccounts,
    setActiveAccount,
    setTotalUsersCount,
    fetchAccounts,
  } = useAccountStore();
  const { flushForAccountSwitch } = useChatStore();
  const {
    accountToDelete,
    setAccountToDelete,
    setDeletingAccount,
    setQrAccountTarget,
    setShowQRModal,
  } = useUIStore();

  const handleSelectAccount = useCallback(
    (account?: Account) => {
      if (!account) return;
      flushForAccountSwitch(account.id);
      setActiveAccount(account);
      runAfterPaint(() => {
        fetchChatsAndContacts(account.id);
      });
      addToast('info', `Switched to account: ${account.displayName || account.phoneNumber}`);
    },
    [flushForAccountSwitch, setActiveAccount, fetchChatsAndContacts, addToast],
  );

  const handleOpenQRForAccount = useCallback(
    (account?: Account) => {
      const target = account || activeAccount;
      if (!target) return;
      setQrAccountTarget(target);
      setShowQRModal(true);
    },
    [activeAccount, setQrAccountTarget, setShowQRModal],
  );

  const handleConfirmDeleteAccount = useCallback(async () => {
    if (!accountToDelete) return;
    setDeletingAccount(true);
    try {
      await accountsApi.delete(accountToDelete.id);
      addToast(
        'success',
        `Account "${accountToDelete.displayName || accountToDelete.phoneNumber}" successfully deleted`,
      );
      setAccounts(accounts.filter((a) => a.id !== accountToDelete.id));
      setAccountToDelete(null);
      await fetchAccounts(user?.role, user?.accountIds);
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      addToast('error', err?.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  }, [
    accountToDelete,
    setDeletingAccount,
    addToast,
    setAccounts,
    accounts,
    setAccountToDelete,
    fetchAccounts,
    user,
  ]);

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
  }, [user?.role, setTotalUsersCount]);

  const userRole = user?.role;
  const userAccountIds = user?.accountIds;
  const accountIdsKey = (user?.accountIds || []).join(',');

  useEffect(() => {
    if (isAuthenticated) {
      fetchAccounts(userRole, userAccountIds);
      fetchUsersCount();
      const statusTimer = setInterval(() => {
        fetchAccounts(userRole, userAccountIds);
        fetchUsersCount();
      }, 60000);
      return () => clearInterval(statusTimer);
    }
  }, [isAuthenticated, fetchAccounts, fetchUsersCount, userRole, accountIdsKey]);

  return {
    accounts,
    activeAccount,
    handleSelectAccount,
    handleOpenQRForAccount,
    handleConfirmDeleteAccount,
    fetchUsersCount,
  };
}
