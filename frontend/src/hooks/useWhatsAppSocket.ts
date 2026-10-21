/**
 * useWhatsAppSocket.ts
 * Enterprise real-time WebSocket orchestration hook.
 * Commandment #2: Separate business logic from UI components.
 * Commandment #5: Proper error handling everywhere.
 */
import { useEffect } from 'react';
import { getSocket } from '../services/api';
import { useAccountStore, useChatStore, useUIStore } from '../stores';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { localChatStorage } from '../utils/localChatStorage';
import {
  autoRegisterChat,
  autoRegisterContact,
  isProperName,
  resolveChatDisplayName,
} from '../utils/contactResolver';
import {
  ClientMessageNotification,
  playNotificationSound,
} from '../components/Notifications/ClientNotificationCenter';
import { WhatsAppChat } from '../services/api/types';

const TENANT_ID = import.meta.env.VITE_TENANT_ID ?? 'default-tenant';

export function useWhatsAppSocket(
  fetchChatsAndContacts: (accountId: string) => Promise<void>,
) {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { activeAccount, setAccounts, setActiveAccount, fetchAccounts } = useAccountStore();
  const { setChats, setContacts } = useChatStore();
  const { addFloatingNotification, dismissFloatingNotification } = useUIStore();

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket(TENANT_ID, activeAccount?.id);

    const handleConnectionUpdate = (data: any) => {
      const curAccount = useAccountStore.getState().activeAccount;
      const targetId = data.accountId || curAccount?.id;
      if (data.status === 'connected') {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === targetId
              ? { ...a, status: 'CONNECTED', ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}) }
              : a,
          ),
        );
        if (curAccount?.id === targetId) {
          setActiveAccount((prev) =>
            prev ? { ...prev, status: 'CONNECTED', ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}) } : null,
          );
          fetchChatsAndContacts(targetId);
        }
        fetchAccounts();
      } else if (data.status === 'connecting' || data.status === 'disconnected') {
        setAccounts((prev) =>
          prev.map((a) => (a.id === targetId ? { ...a, status: 'RECONNECTING' } : a)),
        );
        if (curAccount?.id === targetId) {
          setActiveAccount((prev) => (prev ? { ...prev, status: 'RECONNECTING' } : null));
        }
      }
    };

    const handleAccountStatus = (data: {
      accountId: string;
      status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
      phoneNumber?: string;
      displayName?: string;
    }) => {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === data.accountId) {
            const hasCustom = !!(
              acc.displayName &&
              acc.displayName !== 'WhatsApp Account' &&
              acc.displayName !== 'Account' &&
              acc.displayName !== 'Default Account' &&
              !acc.displayName.startsWith('Account ') &&
              !acc.displayName.startsWith('unlinked_') &&
              !acc.displayName.startsWith('pending_')
            );
            const nextDisplayName = hasCustom
              ? acc.displayName
              : data.displayName || acc.displayName;

            return {
              ...acc,
              status: data.status,
              displayName: nextDisplayName,
              ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
            };
          }
          return acc;
        }),
      );

      const curAccount = useAccountStore.getState().activeAccount;
      if (curAccount?.id === data.accountId) {
        setActiveAccount((prev) =>
          prev
            ? {
                ...prev,
                status: data.status,
                ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
              }
            : null,
        );
      }

      if (data.status === 'CONNECTED') {
        fetchAccounts();
      }
    };

    const handleChatsUpdated = (data?: { accountId?: string }) => {
      const curAccount = useAccountStore.getState().activeAccount;
      if (
        data?.accountId &&
        curAccount?.id &&
        curAccount.id !== 'all' &&
        data.accountId !== curAccount.id
      ) {
        return;
      }
      if (curAccount?.id) fetchChatsAndContacts(curAccount.id);
    };

    const handleContactsUpdated = (data?: { accountId?: string }) => {
      const curAccount = useAccountStore.getState().activeAccount;
      if (
        data?.accountId &&
        curAccount?.id &&
        curAccount.id !== 'all' &&
        data.accountId !== curAccount.id
      ) {
        return;
      }
      if (curAccount?.id) {
        import('../services/api').then(({ whatsappWebApi }) => {
          whatsappWebApi.getContacts(curAccount.id).then(setContacts).catch(() => {});
        });
      }
    };

    const handleHistorySynced = (data?: { accountId?: string }) => {
      const curAccount = useAccountStore.getState().activeAccount;
      if (
        data?.accountId &&
        curAccount?.id &&
        curAccount.id !== 'all' &&
        data.accountId !== curAccount.id
      ) {
        return;
      }
      addToast('success', 'History and contacts synced!');
      if (curAccount?.id) fetchChatsAndContacts(curAccount.id);
    };

    const handleNewMessage = (data: { message: any; chat?: WhatsAppChat; accountId?: string }) => {
      const msgAccountId = data.chat?.accountId || data.message?.accountId || data.accountId;
      const curAccount = useAccountStore.getState().activeAccount;
      if (
        curAccount?.id &&
        curAccount.id !== 'all' &&
        msgAccountId &&
        msgAccountId !== curAccount.id
      ) {
        return;
      }

      if (data.message) {
        localChatStorage.saveLocalMessage(data.message);
      }

      if (data.chat) {
        const newChat = { ...data.chat };
        autoRegisterChat(newChat);
        if (
          data.message?.senderName &&
          (data.message?.senderJid || data.message?.from)
        ) {
          autoRegisterContact({
            id: data.message?.senderJid || data.message?.from,
            name: data.message.senderName,
          });
        }
        if (!newChat.isGroup && (!newChat.name || !isProperName(newChat.name))) {
          const resolved = resolveChatDisplayName(newChat);
          if (resolved.name) {
            newChat.name = resolved.name;
          }
        }
        localChatStorage.saveLocalChat(newChat);
        setChats((currentChats) => {
          const isUniversal = curAccount?.id === 'all';
          const exists = currentChats.some(
            (c) =>
              c.id === newChat.id && (isUniversal ? c.accountId === newChat.accountId : true),
          );
          const updatedList = exists
            ? currentChats.map((c) =>
                c.id === newChat.id && (isUniversal ? c.accountId === newChat.accountId : true)
                  ? { ...c, ...newChat }
                  : c,
              )
            : [newChat, ...currentChats];
          return [...updatedList].sort(
            (a, b) => Number(b.lastMessageTimestamp) - Number(a.lastMessageTimestamp),
          );
        });
      } else if (curAccount?.id) {
        fetchChatsAndContacts(curAccount.id);
      }
    };

    const handleClientNotification = (notif: ClientMessageNotification) => {
      if (user && user.role !== 'SUPER_ADMIN') {
        const isAssigned =
          notif.assignedAdminUserId === user.id ||
          user.accountIds?.includes(notif.accountId);
        if (!isAssigned) return;
      }

      playNotificationSound();

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(`Client Message: ${notif.clientName}`, {
            body: `[Account: ${notif.accountName}]: ${notif.messageText}`,
          });
        } catch {}
      }

      addFloatingNotification(notif);
      setTimeout(() => {
        dismissFloatingNotification(notif.id);
      }, 9000);
    };

    const handleMessageEdited = (data: {
      messageId: string;
      chatJid: string;
      text: string;
      accountId?: string;
    }) => {
      const curAccount = useAccountStore.getState().activeAccount;
      if (
        curAccount?.id &&
        curAccount.id !== 'all' &&
        data.accountId &&
        data.accountId !== curAccount.id
      ) {
        return;
      }
      localChatStorage.updateLocalMessage(data.messageId, { text: data.text });
      const rawEditPhone = (data.chatJid || '').split('@')[0].replace(/\D/g, '');
      setChats((currentChats) =>
        currentChats.map((c) => {
          const rawChatPhone = c.id.split('@')[0].replace(/\D/g, '');
          const isMatch =
            c.id === data.chatJid ||
            (rawEditPhone && rawChatPhone && rawEditPhone === rawChatPhone);
          if (isMatch) {
            return { ...c, lastMessageText: data.text };
          }
          return c;
        }),
      );
    };

    const handleAccountRemoved = (data: { accountId: string }) => {
      if (data?.accountId) {
        setAccounts((prev) => prev.filter((a) => a.id !== data.accountId));
        const curAccount = useAccountStore.getState().activeAccount;
        if (curAccount?.id === data.accountId) {
          setActiveAccount(null);
        }
        fetchAccounts();
      }
    };

    socket.on('connection.update', handleConnectionUpdate);
    socket.on('account:status', handleAccountStatus);
    socket.on('account:removed', handleAccountRemoved);
    socket.on('account:deleted', handleAccountRemoved);
    socket.on('whatsapp:chats_updated', handleChatsUpdated);
    socket.on('whatsapp:contacts_updated', handleContactsUpdated);
    socket.on('whatsapp:history_synced', handleHistorySynced);
    socket.on('whatsapp:messages_synced', handleHistorySynced);
    socket.on('whatsapp:message_new', handleNewMessage);
    socket.on('whatsapp:message_edited', handleMessageEdited);
    socket.on('whatsapp:ready', handleChatsUpdated);
    socket.on('whatsapp:client_notification', handleClientNotification);

    return () => {
      socket.off('connection.update', handleConnectionUpdate);
      socket.off('account:status', handleAccountStatus);
      socket.off('account:removed', handleAccountRemoved);
      socket.off('account:deleted', handleAccountRemoved);
      socket.off('whatsapp:chats_updated', handleChatsUpdated);
      socket.off('whatsapp:contacts_updated', handleContactsUpdated);
      socket.off('whatsapp:history_synced', handleHistorySynced);
      socket.off('whatsapp:messages_synced', handleHistorySynced);
      socket.off('whatsapp:ready', handleChatsUpdated);
      socket.off('whatsapp:message_new', handleNewMessage);
      socket.off('whatsapp:message_edited', handleMessageEdited);
      socket.off('whatsapp:client_notification', handleClientNotification);
    };
  }, [
    isAuthenticated,
    activeAccount?.id,
    fetchChatsAndContacts,
    fetchAccounts,
    addToast,
    user,
    setAccounts,
    setActiveAccount,
    setChats,
    setContacts,
    addFloatingNotification,
    dismissFloatingNotification,
  ]);
}
