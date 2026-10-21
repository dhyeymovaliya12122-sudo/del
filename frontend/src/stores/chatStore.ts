// -----------------------------------------------------------------------------
//  src/stores/chatStore.ts
//  [A-3 FIX] Zustand store - chats, contacts, selected chat.
//  Extracted from the 1,675-line App.tsx monolith.
//  [ISOLATION FIX] Added activeAccountId tracking and flush action.
// -----------------------------------------------------------------------------
import { create } from 'zustand';
import { WhatsAppChat, WhatsAppContact } from '../services/api';
import { autoRegisterChat, autoRegisterContact } from '../utils/contactResolver';

interface ChatState {
  chats: WhatsAppChat[];
  contacts: WhatsAppContact[];
  selectedChat: WhatsAppChat | null;
  loadingChats: boolean;
  /** Tracks which account the current chats/contacts belong to */
  activeAccountId: string | null;
  setChats: (chatsOrUpdater: WhatsAppChat[] | ((prev: WhatsAppChat[]) => WhatsAppChat[])) => void;
  setContacts: (contactsOrUpdater: WhatsAppContact[] | ((prev: WhatsAppContact[]) => WhatsAppContact[])) => void;
  setSelectedChat: (chat: WhatsAppChat | null) => void;
  setLoadingChats: (loading: boolean) => void;
  updateChatInList: (updatedChat: Partial<WhatsAppChat> & { id: string }) => void;
  /** Instantly flush all account-scoped state before switching accounts.
   *  Prevents ghost-frame leaks where old account's chats briefly appear
   *  in the new account's view during a mid-flight fetch. */
  flushForAccountSwitch: (newAccountId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  contacts: [],
  selectedChat: null,
  loadingChats: false,
  activeAccountId: null,

  setChats: (chatsOrUpdater) =>
    set((state) => {
      const nextChats = typeof chatsOrUpdater === 'function' ? chatsOrUpdater(state.chats) : chatsOrUpdater;
      if (Array.isArray(nextChats)) {
        for (const c of nextChats) {
          autoRegisterChat(c);
        }
      }
      return { chats: nextChats };
    }),
  setContacts: (contactsOrUpdater) =>
    set((state) => {
      const nextContacts = typeof contactsOrUpdater === 'function' ? contactsOrUpdater(state.contacts) : contactsOrUpdater;
      if (Array.isArray(nextContacts)) {
        for (const c of nextContacts) {
          autoRegisterContact(c);
        }
      }
      return { contacts: nextContacts };
    }),
  setSelectedChat: (chat) => set({ selectedChat: chat }),
  setLoadingChats: (loading) => set({ loadingChats: loading }),

  updateChatInList: (updatedChat) => {
    autoRegisterChat(updatedChat);
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === updatedChat.id ? { ...c, ...updatedChat } : c,
      ),
      // Keep selectedChat in sync
      selectedChat:
        state.selectedChat?.id === updatedChat.id
          ? { ...state.selectedChat, ...updatedChat }
          : state.selectedChat,
    }));
  },

  flushForAccountSwitch: (newAccountId) =>
    set({
      chats: [],
      contacts: [],
      selectedChat: null,
      loadingChats: true, // Show loading indicator immediately
      activeAccountId: newAccountId,
    }),
}));
