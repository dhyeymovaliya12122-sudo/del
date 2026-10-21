/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  frontend/src/utils/localChatStorage.ts
 *  Client-Side Zero-Knowledge / Private Local Storage Engine (IndexedDB)
 *
 *  Stores all chats, messages, and contacts exclusively in the user's
 *  local browser storage. The cloud/host server ONLY stores credentials & logs.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { WhatsAppChat, WhatsAppContact, WhatsAppMessage } from '../services/api';
import { formatE164, isProperName, KNOWN_LID_MAP, DYNAMIC_IDENTITY_MAP, KNOWN_PHONE_CONTACTS } from './contactResolver';

const DB_NAME = 'WhatsAppPrivateLocalDB';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Chats Store
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('accountId', 'accountId', { unique: false });
          chatStore.createIndex('lastMessageTimestamp', 'lastMessageTimestamp', { unique: false });
        }

        // Messages Store
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('accountId', 'accountId', { unique: false });
          msgStore.createIndex('chatJid', 'chatJid', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
          msgStore.createIndex('account_chat', ['accountId', 'chatJid'], { unique: false });
        }

        // Contacts Store
        if (!db.objectStoreNames.contains('contacts')) {
          const contactStore = db.createObjectStore('contacts', { keyPath: 'id' });
          contactStore.createIndex('accountId', 'accountId', { unique: false });
        }

        // Pillar 3: Double Ratchet E2EE Sessions Store
        if (!db.objectStoreNames.contains('ratchet_sessions')) {
          db.createObjectStore('ratchet_sessions', { keyPath: 'chatJid' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

export const localChatStorage = {
  /**
   * Save or update a single chat in local browser storage.
   */
  async saveLocalChat(chat: WhatsAppChat): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('chats', 'readwrite');
        const store = tx.objectStore('chats');
        store.put(chat);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to save chat:', e);
    }
  },

  /**
   * Batch save or update chats in local browser storage.
   */
  async saveLocalChats(chats: WhatsAppChat[]): Promise<void> {
    if (!chats.length) return;
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('chats', 'readwrite');
        const store = tx.objectStore('chats');
        for (const chat of chats) {
          store.put(chat);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to batch save chats:', e);
    }
  },

  /**
   * Get all chats from local browser storage for a specific account.
   */
  async getLocalChats(accountId: string, search?: string): Promise<WhatsAppChat[]> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('chats', 'readonly');
        const store = tx.objectStore('chats');
        const request = store.getAll();

        request.onsuccess = () => {
          let list: WhatsAppChat[] = request.result || [];
          if (accountId && accountId !== 'all') {
            list = list.filter((c) => c.accountId === accountId);
          }
          if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
              (c) =>
                (c.name || '').toLowerCase().includes(q) ||
                (c.lastMessageText || '').toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q)
            );
          }
          // Purge corrupted placeholder names from cached local storage and heal dynamically
          list = list.map((c) => {
            const cleanDigits = c.id.split('@')[0].replace(/\D/g, '');
            // Check dynamic identity registry (populated from actual connected accounts, contacts, and socket sync)
            const dynamicEntry = DYNAMIC_IDENTITY_MAP.get(c.id) || DYNAMIC_IDENTITY_MAP.get(cleanDigits);
            if (dynamicEntry?.name && isProperName(dynamicEntry.name)) {
              return { ...c, name: dynamicEntry.name };
            }
            if (
              !c.name ||
              !isProperName(c.name) ||
              c.name === 'You (Message yourself)' ||
              c.name === 'Direct Chat' ||
              c.name === 'WhatsApp User' ||
              c.name === 'User' ||
              c.name === 'WhatsApp Group' ||
              c.name === 'Group' ||
              c.name === '..'
            ) {
              const healed = cleanDigits.length >= 7 ? (formatE164(cleanDigits) || `+${cleanDigits}`) : c.name;
              return { ...c, name: healed };
            }
            return c;
          });
          list.sort((a, b) => Number(b.lastMessageTimestamp || 0) - Number(a.lastMessageTimestamp || 0));
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to get chats:', e);
      return [];
    }
  },

  /**
   * Save a single message and automatically update the corresponding chat snippet in local storage.
   */
  async saveLocalMessage(msg: WhatsAppMessage): Promise<void> {
    if (!msg?.id) return;
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['messages', 'chats'], 'readwrite');
        const msgStore = tx.objectStore('messages');
        const chatStore = tx.objectStore('chats');

        msgStore.put(msg);

        // Update corresponding chat in local storage
        if (msg.chatJid) {
          const chatReq = chatStore.get(msg.chatJid);
          chatReq.onsuccess = () => {
            const existingChat = chatReq.result;
            const textSnippet = msg.text || (msg.mediaType ? `[${msg.mediaType}]` : '');
            const msgTs = Number(msg.timestamp) || Date.now();

            if (existingChat) {
              if (msgTs >= Number(existingChat.lastMessageTimestamp || 0)) {
                existingChat.lastMessageText = textSnippet;
                existingChat.lastMessageTimestamp = msgTs;
              }
              const cleanDigits = msg.chatJid.split('@')[0].replace(/\D/g, '');
              const dynamicEntry = DYNAMIC_IDENTITY_MAP.get(msg.chatJid) || DYNAMIC_IDENTITY_MAP.get(cleanDigits);
              if (dynamicEntry?.name && isProperName(dynamicEntry.name)) {
                existingChat.name = dynamicEntry.name;
              } else if (!existingChat.name || !isProperName(existingChat.name)) {
                existingChat.name = (msg.senderName && isProperName(msg.senderName))
                  ? msg.senderName
                  : (cleanDigits.length >= 7 ? (formatE164(cleanDigits) || `+${cleanDigits}`) : msg.chatJid.split('@')[0]);
              }
              chatStore.put(existingChat);
            } else {
              const cleanDigits = msg.chatJid.split('@')[0].replace(/\D/g, '');
              const dynamicEntry = DYNAMIC_IDENTITY_MAP.get(msg.chatJid) || DYNAMIC_IDENTITY_MAP.get(cleanDigits);
              let initialName = (msg.senderName && isProperName(msg.senderName)) ? msg.senderName : '';
              if (!initialName) {
                if (dynamicEntry?.name && isProperName(dynamicEntry.name)) {
                  initialName = dynamicEntry.name;
                } else if (cleanDigits.length >= 7) {
                  initialName = formatE164(cleanDigits) || `+${cleanDigits}`;
                } else {
                  initialName = msg.chatJid.split('@')[0];
                }
              }

              chatStore.put({
                id: msg.chatJid,
                accountId: msg.accountId,
                name: initialName,
                lastMessageText: textSnippet,
                lastMessageTimestamp: msgTs,
                unreadCount: msg.fromMe ? 0 : 1,
                isGroup: msg.chatJid.endsWith('@g.us'),
              });
            }
          };
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to save message:', e);
    }
  },

  /**
   * Batch save messages in local browser storage.
   */
  async saveLocalMessages(msgs: WhatsAppMessage[]): Promise<void> {
    if (!msgs.length) return;
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');
        for (const msg of msgs) {
          store.put(msg);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to batch save messages:', e);
    }
  },

  /**
   * Get messages for a given chat conversation from local browser storage.
   * Seamlessly cross-matches between phone numbers (@s.whatsapp.net) and LIDs (@lid).
   */
  async getLocalMessages(accountId: string, chatJid: string, limit = 500): Promise<WhatsAppMessage[]> {
    try {
      const db = await getDB();
      const stripDigits = (jid: string) => jid.split('@')[0].replace(/\+/g, '').replace(/\D/g, '');
      const rawTarget = chatJid.split('@')[0].replace(/\+/g, '').trim();
      const targetPhoneDigits = stripDigits(chatJid);

      // Collect all possible aliases for this contact/conversation
      const matchingIdentifiers = new Set<string>();
      matchingIdentifiers.add(chatJid);
      matchingIdentifiers.add(rawTarget);
      if (targetPhoneDigits) {
        matchingIdentifiers.add(targetPhoneDigits);
        matchingIdentifiers.add(`${targetPhoneDigits}@s.whatsapp.net`);
        matchingIdentifiers.add(`${targetPhoneDigits}@lid`);
      }

      // Cross-match using KNOWN_LID_MAP
      for (const [lidKey, info] of Object.entries(KNOWN_LID_MAP)) {
        const cleanLid = lidKey.split('@')[0].replace(/\D/g, '');
        const phoneDigits = (info.phone || '').replace(/\D/g, '');
        if ((cleanLid && cleanLid === targetPhoneDigits) || (phoneDigits && phoneDigits === targetPhoneDigits)) {
          if (cleanLid) {
            matchingIdentifiers.add(cleanLid);
            matchingIdentifiers.add(`${cleanLid}@lid`);
          }
          if (phoneDigits) {
            matchingIdentifiers.add(phoneDigits);
            matchingIdentifiers.add(`${phoneDigits}@s.whatsapp.net`);
          }
        }
      }

      // Cross-match using DYNAMIC_IDENTITY_MAP
      const dynamicEntry = DYNAMIC_IDENTITY_MAP.get(chatJid) || DYNAMIC_IDENTITY_MAP.get(rawTarget);
      if (dynamicEntry?.phone) {
        const dynDigits = dynamicEntry.phone.replace(/\D/g, '');
        if (dynDigits) {
          matchingIdentifiers.add(dynDigits);
          matchingIdentifiers.add(`${dynDigits}@s.whatsapp.net`);
          matchingIdentifiers.add(`${dynDigits}@lid`);
        }
      }

      // Handle 'you_self' special ID by matching against registered active account identities
      if (chatJid === 'you_self' || chatJid.startsWith('you_self')) {
        for (const [key, entry] of DYNAMIC_IDENTITY_MAP.entries()) {
          const digits = (entry.phone || '').replace(/\D/g, '');
          if (digits) {
            matchingIdentifiers.add(key);
            matchingIdentifiers.add(digits);
            matchingIdentifiers.add(`${digits}@s.whatsapp.net`);
            matchingIdentifiers.add(`${digits}@lid`);
          }
        }
      }

      // Cross-match by proper name (links sister @lid and @s.whatsapp.net stored under same contact name)
      const properName = dynamicEntry?.name || KNOWN_PHONE_CONTACTS[targetPhoneDigits];
      if (properName && isProperName(properName)) {
        const lowerName = properName.toLowerCase();
        for (const [key, entry] of DYNAMIC_IDENTITY_MAP.entries()) {
          if (entry.name && entry.name.toLowerCase() === lowerName) {
            matchingIdentifiers.add(key);
            const digits = (entry.phone || '').replace(/\D/g, '');
            if (digits) {
              matchingIdentifiers.add(digits);
              matchingIdentifiers.add(`${digits}@s.whatsapp.net`);
              matchingIdentifiers.add(`${digits}@lid`);
            }
          }
        }
      }

      return new Promise((resolve, reject) => {
        const tx = db.transaction('messages', 'readonly');
        const store = tx.objectStore('messages');
        const request = store.getAll();

        request.onsuccess = () => {
          const allMsgs: WhatsAppMessage[] = request.result || [];
          const filtered = allMsgs.filter((m) => {
            const matchesAccount = !accountId || accountId === 'all' || m.accountId === accountId;
            if (!matchesAccount) return false;

            const chatJidClean = (m.chatJid || '').trim();
            const senderJidClean = (m.senderJid || '').trim();
            const chatDigits = stripDigits(chatJidClean);
            const senderDigits = stripDigits(senderJidClean);

            if (matchingIdentifiers.has(chatJidClean) || matchingIdentifiers.has(senderJidClean)) {
              return true;
            }
            if (chatDigits && matchingIdentifiers.has(chatDigits)) {
              return true;
            }
            if (senderDigits && matchingIdentifiers.has(senderDigits)) {
              return true;
            }
            return false;
          });

          // Sort ascending for chat timeline
          filtered.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
          resolve(filtered.slice(-limit));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to get messages:', e);
      return [];
    }
  },

  /**
   * Update message status, reactions, or edits locally.
   */
  async updateLocalMessage(id: string, partial: Partial<WhatsAppMessage>): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');
        const req = store.get(id);

        req.onsuccess = () => {
          if (req.result) {
            store.put({ ...req.result, ...partial });
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to update message:', e);
    }
  },

  /**
   * Save or update E2EE Double Ratchet session state locally in IndexedDB.
   */
  async saveRatchetState(chatJid: string, state: any): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('ratchet_sessions', 'readwrite');
        const store = tx.objectStore('ratchet_sessions');
        store.put({ chatJid, ...state, updatedAt: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to save ratchet state:', e);
    }
  },

  /**
   * Retrieve E2EE Double Ratchet session state from IndexedDB.
   */
  async getRatchetState(chatJid: string): Promise<any | null> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('ratchet_sessions', 'readonly');
        const store = tx.objectStore('ratchet_sessions');
        const req = store.get(chatJid);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to get ratchet state:', e);
      return null;
    }
  },

  /**
   * Delete E2EE Double Ratchet session state from IndexedDB.
   */
  async deleteRatchetState(chatJid: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('ratchet_sessions', 'readwrite');
        const store = tx.objectStore('ratchet_sessions');
        store.delete(chatJid);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to delete ratchet state:', e);
    }
  },

  /**
   * Delete all messages for a specific conversation from local IndexedDB and clear chat snippet.
   */
  async clearChatMessages(accountId: string, chatJid: string): Promise<void> {
    try {
      const db = await getDB();
      const stripPhone = (jid: string) => jid.split('@')[0].replace(/\+/g, '');
      const targetPhone = stripPhone(chatJid);

      return new Promise((resolve, reject) => {
        const tx = db.transaction(['messages', 'chats'], 'readwrite');
        const msgStore = tx.objectStore('messages');
        const chatStore = tx.objectStore('chats');
        const req = msgStore.getAll();

        req.onsuccess = () => {
          const allMsgs: WhatsAppMessage[] = req.result || [];
          for (const m of allMsgs) {
            const matchesAccount = !accountId || accountId === 'all' || m.accountId === accountId;
            if (!matchesAccount) continue;
            const isExactJid = m.chatJid === chatJid || m.senderJid === chatJid;
            const isMatchingPhone =
              targetPhone &&
              (stripPhone(m.chatJid || '') === targetPhone || stripPhone(m.senderJid || '') === targetPhone);
            if (isExactJid || isMatchingPhone) {
              msgStore.delete(m.id);
            }
          }

          // Reset last message text and unread count for this chat
          const chatReq = chatStore.get(chatJid);
          chatReq.onsuccess = () => {
            if (chatReq.result) {
              const chatObj = chatReq.result;
              chatObj.lastMessageText = '';
              chatObj.unreadCount = 0;
              chatStore.put(chatObj);
            }
          };
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to clear chat messages:', e);
    }
  },

  /**
   * Clear all local storage for an account or all accounts.
   */
  async clearLocalData(): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const stores = ['chats', 'messages', 'contacts', 'ratchet_sessions'].filter(s => db.objectStoreNames.contains(s));
        const tx = db.transaction(stores, 'readwrite');
        stores.forEach(s => tx.objectStore(s).clear());
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[LocalChatStorage] Failed to clear local data:', e);
    }
  },
};
