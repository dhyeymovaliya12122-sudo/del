import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Smile, Paperclip, MoreVertical, Search, Lock,
  Check, CheckCheck, ArrowLeft, Mic, FileText, UserPlus,
  Sparkles, Image as ImageIcon, Video, Music, Download,
  Eye, X as CloseIcon, FileSpreadsheet, Calendar, Languages,
  ExternalLink, Reply, Star, Phone, Shield, Smartphone, Zap, MessageSquare,
  AlertCircle, QrCode, BarChart2, User, Headphones, Plus, Trash2, RefreshCw, Edit2,
} from 'lucide-react';
import { WhatsAppChat, WhatsAppMessage, WhatsAppContact, Account, whatsappWebApi, getSocket } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { format, isToday, isYesterday } from 'date-fns';
const ScheduledMessagesModal = React.lazy(() => import('../Scheduler/ScheduledMessagesModal'));
import AudioWaveformRecorder from './AudioWaveformRecorder';
import { sanitizeMessageContent } from '../../utils/sanitize';
import { localChatStorage } from '../../utils/localChatStorage';
import { soundEffects } from '../../utils/soundEffects';

interface WhatsAppChatAreaProps {
  chat: WhatsAppChat | null;
  accountId: string;
  tenantId: string;
  activeAccount?: Account | null;
  accounts?: Account[];
  onBack?: () => void;
  onMessageSent?: () => void;
  onOpenContacts?: () => void;
  onOpenMetaAI?: () => void;
  onOpenExport?: () => void;
  contacts?: WhatsAppContact[];
  isConnected?: boolean;
  onOpenQR?: () => void;
  onAccountDisconnected?: (accountId: string) => void;
}


function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

import { formatIndianTime, formatIndianDateDivider, formatIndianDateTime } from '../../utils/indianTime';

function formatMsgTime(timestamp: number): string {
  return formatIndianTime(timestamp);
}

function formatDateDivider(timestamp: number): string {
  return formatIndianDateDivider(timestamp);
}

export function getMediaUrlWithAuth(rawUrl?: string): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) return rawUrl;
  const token = typeof window !== 'undefined' ? (sessionStorage.getItem('wa_token') || localStorage.getItem('wa_token')) : null;
  if (!token) return rawUrl;
  if (rawUrl.includes('token=')) return rawUrl;
  const sep = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${sep}token=${encodeURIComponent(token)}`;
}

const SENDER_COLORS = [
  '#00a884', '#f0b429', '#e056fd', '#ff7675', '#74b9ff',
  '#a29bfe', '#53bdeb', '#f15c6d', '#00d2d3', '#ff9f43',
];

function getSenderColor(nameOrJid: string): string {
  let hash = 0;
  for (let i = 0; i < nameOrJid.length; i++) {
    hash = nameOrJid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🔥', '🙏', '😊', '🎉', '👏', '👌', '🤝', '🙌', '✨', '😎', '💯'];

import { resolveChatDisplayName, resolveAccountDisplayName, getInitials, isProperName } from '../../utils/contactResolver';

function getDisplayName(
  chat: { name: string; id: string; isGroup: boolean },
  contactsList?: WhatsAppContact[],
): string {
  return resolveChatDisplayName(chat, contactsList).name;
}

function getDisplayPhone(
  chat: { name: string; id: string; isGroup: boolean },
  contactsList?: WhatsAppContact[],
): string {
  const resolved = resolveChatDisplayName(chat, contactsList);
  return resolved.isGroup ? 'Group Conversation' : resolved.phone;
}

export default function WhatsAppChatArea({
  chat,
  accountId,
  tenantId,
  activeAccount,
  accounts,
  onBack,
  onMessageSent,
  onOpenContacts,
  onOpenMetaAI,
  onOpenExport,
  contacts,
  isConnected = true,
  onOpenQR,
  onAccountDisconnected,
}: WhatsAppChatAreaProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [replyingTo, setReplyingTo] = useState<WhatsAppMessage | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const [renamedName, setRenamedName] = useState<string | null>(null);

  useEffect(() => {
    setRenamedName(null);
  }, [chat?.id]);

  const handleSaveRename = async () => {
    if (!chat || !customNameInput.trim()) return;
    const trimmed = customNameInput.trim();
    setSavingRename(true);
    try {
      await whatsappWebApi.saveChat(accountId, {
        id: chat.id,
        name: trimmed,
        isGroup: chat.isGroup,
      });
      setRenamedName(trimmed);
      if (chat) chat.name = trimmed;
      addToast('success', 'Name updated successfully across accounts!');
      setShowRenameModal(false);
      onMessageSent?.();
    } catch (err: any) {
      addToast('error', 'Failed to rename: ' + (err?.message || 'Network error'));
    } finally {
      setSavingRename(false);
    }
  };

  // Filter messages based on in-chat search query
  const filteredTimelineMessages = React.useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    const q = chatSearchQuery.toLowerCase();
    return messages.filter(
      m => (m.text || '').toLowerCase().includes(q) || (m.fileName || '').toLowerCase().includes(q)
    );
  }, [messages, chatSearchQuery]);

  // [Grade 'O' Performance] Progressive message windowing: prevents DOM bloat for large chat histories
  const [visibleMessageCount, setVisibleMessageCount] = useState(150);
  useEffect(() => {
    setVisibleMessageCount(150);
  }, [chat?.id]);

  const totalFiltered = filteredTimelineMessages.length;
  const startIndex = Math.max(0, totalFiltered - visibleMessageCount);
  const visibleTimelineMessages = React.useMemo(() => {
    return filteredTimelineMessages.slice(startIndex);
  }, [filteredTimelineMessages, startIndex]);
  const remainingHiddenCount = startIndex;

  // Helper to highlight matching text in messages with XSS sanitization
  const renderHighlightedText = (text: string, query: string) => {
    const cleanText = sanitizeMessageContent(text);
    if (!query.trim()) return cleanText;
    const parts = cleanText.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} style={{ background: 'rgba(234, 179, 8, 0.5)', color: '#fef08a', padding: '0 2px', borderRadius: 2 }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };
  const [docPreview, setDocPreview] = useState<{
    url: string;
    downloadUrl: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    type: 'pdf' | 'video' | 'audio' | 'image' | 'text' | 'office' | 'generic';
    textContent?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoVideoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearingMessages, setClearingMessages] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const { addToast } = useToast();

  const handleFetchPreviousMessages = async () => {
    if (!chat || !accountId || accountId === 'all' || fetchingHistory) return;
    setFetchingHistory(true);
    addToast('info', 'Requesting message history from your phone...');
    try {
      const targetJid = (chat.id === 'you_self' && activeAccount?.phoneNumber)
        ? `${activeAccount.phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`
        : chat.id;

      await whatsappWebApi.syncChat(accountId, targetJid, 50);

      // Progressive polling for phone peer data sync:
      // Phone history sync typically takes 1.5 to 8 seconds depending on phone connection
      let foundMessages: WhatsAppMessage[] = [];
      const pollDelays = [1500, 2000, 3000, 4000];
      for (const delay of pollDelays) {
        await new Promise(r => setTimeout(r, delay));
        try {
          const fresh = await whatsappWebApi.getMessages(accountId, targetJid);
          if (fresh && fresh.length > 0) {
            foundMessages = fresh;
            break;
          }
        } catch {}
      }

      if (foundMessages.length > 0) {
        await localChatStorage.saveLocalMessages(foundMessages);
        setMessages(foundMessages);
        addToast('success', `Synchronized ${foundMessages.length} messages from phone!`);
      } else {
        const localCheck = await localChatStorage.getLocalMessages(accountId, targetJid);
        if (localCheck && localCheck.length > 0) {
          setMessages(localCheck);
          addToast('success', `Synchronized ${localCheck.length} messages!`);
        } else {
          addToast('warning', 'Sync request sent. If your phone is online, messages will appear automatically in a moment.');
        }
      }
    } catch (err: any) {
      console.warn('Sync chat messages notice:', err);
      addToast('warning', 'Sync request sent. Messages will appear once your phone responds.');
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleOpenDocument = async (msg: WhatsAppMessage, forceDownload = false) => {
    const cleanId = (msg.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const rawUrl = getMediaUrlWithAuth(msg.mediaUrl || (cleanId ? `/api/v1/whatsapp/media/${accountId}/${cleanId}` : ''));

    if (!rawUrl) {
      addToast('info', `Document content not available on server (${msg.fileName || 'file'}). Only metadata was synced.`);
      return;
    }

    const docName = msg.fileName || msg.text?.replace(/^📎\s*/, '') || 'document';
    const ext = docName.includes('.') ? docName.split('.').pop()?.toLowerCase() || '' : '';

    // Build URL with name and download params
    const sep = rawUrl.includes('?') ? '&' : '?';
    const inlineUrl = `${rawUrl}${sep}name=${encodeURIComponent(docName)}`;
    const downloadUrl = `${rawUrl}${sep}name=${encodeURIComponent(docName)}&download=1`;

    if (forceDownload) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = docName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('info', `Downloading ${docName}...`);
      return;
    }

    // PDF documents preview in embedded modal viewer
    if (ext === 'pdf' || msg.mimeType === 'application/pdf') {
      setDocPreview({
        url: inlineUrl,
        downloadUrl,
        fileName: docName,
        fileSize: msg.fileSize,
        mimeType: msg.mimeType || 'application/pdf',
        type: 'pdf',
      });
      return;
    }

    // Video documents (e.g. .mp4, .webm, .mov, .mkv)
    if (['mp4', 'webm', 'mov', 'mkv'].includes(ext) || msg.mimeType?.startsWith('video/')) {
      setDocPreview({
        url: inlineUrl,
        downloadUrl,
        fileName: docName,
        fileSize: msg.fileSize,
        mimeType: msg.mimeType || 'video/mp4',
        type: 'video',
      });
      return;
    }

    // Audio documents (e.g. .mp3, .ogg, .opus, .wav, .m4a)
    if (['mp3', 'ogg', 'opus', 'wav', 'm4a'].includes(ext) || msg.mimeType?.startsWith('audio/')) {
      setDocPreview({
        url: inlineUrl,
        downloadUrl,
        fileName: docName,
        fileSize: msg.fileSize,
        mimeType: msg.mimeType || 'audio/mpeg',
        type: 'audio',
      });
      return;
    }

    // Image documents (e.g. .jpg, .jpeg, .png, .webp, .gif, .svg)
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'heic'].includes(ext) || msg.mimeType?.startsWith('image/')) {
      setDocPreview({
        url: inlineUrl,
        downloadUrl,
        fileName: docName,
        fileSize: msg.fileSize,
        mimeType: msg.mimeType || 'image/jpeg',
        type: 'image',
      });
      return;
    }

    // Text / CSV / Markdown / JSON / Code preview in embedded text viewer
    if (['txt', 'csv', 'json', 'md', 'xml', 'log', 'js', 'ts', 'html', 'css'].includes(ext)) {
      try {
        const res = await fetch(inlineUrl);
        const text = await res.text();
        setDocPreview({
          url: inlineUrl,
          downloadUrl,
          fileName: docName,
          fileSize: msg.fileSize,
          mimeType: msg.mimeType || 'text/plain',
          type: 'text',
          textContent: text,
        });
        return;
      } catch (e) {
        console.error('Failed to fetch text document preview:', e);
      }
    }

    // Office documents (Word, Excel, PowerPoint)
    if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
      setDocPreview({
        url: inlineUrl,
        downloadUrl,
        fileName: docName,
        fileSize: msg.fileSize,
        mimeType: msg.mimeType || 'application/octet-stream',
        type: 'office',
      });
      return;
    }

    // Generic / archive documents
    setDocPreview({
      url: inlineUrl,
      downloadUrl,
      fileName: docName,
      fileSize: msg.fileSize,
      mimeType: msg.mimeType || 'application/octet-stream',
      type: 'generic',
    });
  };

  // Listen for realtime deleted message events (Deleted Message Recovery)
  useEffect(() => {
    if (!accountId) return;
    const socket = getSocket(tenantId, accountId);
    const onDeleted = (data: { messageId: string }) => {
      setMessages(prev => prev.map(m => (m.id === data.messageId ? { ...m, isDeleted: true } : m)));
    };
    socket.on('whatsapp:message_deleted', onDeleted);
    return () => {
      socket.off('whatsapp:message_deleted', onDeleted);
    };
  }, [accountId, tenantId]);

  const handleExportChat = () => {
    if (!chat || messages.length === 0) {
      addToast('info', 'No messages to export in this conversation.');
      return;
    }
    const lines = [
      `================================================================================`,
      `Chat History Export (Platform Pro)`,
      `Contact: ${getDisplayName(chat, contacts)} (${chat.id})`,
      `Account: ${accountId}`,
      `Exported: ${formatIndianDateTime(new Date())} (IST)`,
      `Total Messages: ${messages.length}`,
      `================================================================================\n`,
      ...messages.map(m => {
        const time = formatIndianDateTime(m.timestamp);
        const sender = m.fromMe ? 'You' : (m.senderName || chat.name || m.chatJid);
        const deletedTag = m.isDeleted ? ' [🗑️ DELETED BY SENDER - PRESERVED BY PLATFORM]' : '';
        const viewOnceTag = m.isViewOnce ? ' [👁️ VIEW-ONCE MEDIA SAVED]' : '';
        const editedTag = m.isEdited ? ' [✏️ EDITED]' : '';
        const text = m.text || `[Media: ${m.mediaType || 'file'}]`;
        return `[${time}] ${sender}${deletedTag}${viewOnceTag}${editedTag}: ${text}`;
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_export_${(chat.name || chat.id).replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Conversation history exported to file!');
  };

  const handleAISmartReply = () => {
    if (!messages.length) {
      addToast('info', 'AI needs at least one message in conversation to generate reply.');
      return;
    }
    const lastIncoming = [...messages].reverse().find(m => !m.fromMe);
    const incomingText = (lastIncoming?.text || '').toLowerCase();
    let reply = `Thanks for reaching out! Let me check this and get back to you shortly.`;
    if (incomingText.includes('price') || incomingText.includes('cost') || incomingText.includes('rate')) {
      reply = `Hello! Thanks for your interest. Our pricing packages are shared above. Feel free to ask if you would like a custom quotation!`;
    } else if (incomingText.includes('hello') || incomingText.includes('hi') || incomingText.includes('hey')) {
      reply = `Hi there! 👋 How can I help you today?`;
    } else if (incomingText.includes('order') || incomingText.includes('track')) {
      reply = `I have received your order reference and am checking the delivery status right now.`;
    } else if (incomingText.includes('thanks') || incomingText.includes('thank you')) {
      reply = `You are very welcome! Let me know if you need any further assistance.`;
    }
    setInput(reply);
    inputRef.current?.focus();
    addToast('success', 'AI smart reply generated!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chat) return;
    setSending(true);

    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');
    const isAud = file.type.startsWith('audio/');
    const mediaType = isImg ? 'image' : isVid ? 'video' : isAud ? 'audio' : 'document';
    const localPreviewUrl = URL.createObjectURL(file);

    const optimisticMsg: WhatsAppMessage = {
      id: 'opt-media-' + Math.random().toString(36).slice(2),
      accountId,
      chatJid: chat.id,
      senderJid: accountId,
      fromMe: true,
      text: file.name,
      mediaType,
      mediaUrl: localPreviewUrl,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      status: 'sent',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      addToast('info', `Uploading ${file.name}...`);
      const saved = await whatsappWebApi.sendMedia(accountId, chat.id, file);
      if (saved) {
        localChatStorage.saveLocalMessage(saved);
        setMessages(prev => prev.map(m => (m.id === optimisticMsg.id ? saved : m)));
      }
      addToast('success', `${file.name} sent!`);
      onMessageSent?.();
    } catch (err: any) {
      console.error('Failed to send media:', err);
      addToast('error', err?.response?.data?.message || 'Failed to send file');
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMsg.id ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (photoVideoInputRef.current) photoVideoInputRef.current.value = '';
      if (documentInputRef.current) documentInputRef.current.value = '';
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };


function getInitialMockMessages(_chat: any, _accountId: string): WhatsAppMessage[] {
  // No synthetic/fake messages — real messages only.
  // Empty chats will show the authentic 'No messages here yet' state.
  return [];
}


  useEffect(() => {
    if (!chat || !accountId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    // Timeout safety net (2.5s) to guarantee loading state is never stuck indefinitely
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoadingMessages(false);
      }
    }, 2500);

    const loadConversation = async () => {
      try {
        const targetJid = (chat.id === 'you_self' && activeAccount?.phoneNumber)
          ? `${activeAccount.phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`
          : chat.id;

        // 1. Instant Local Storage First (0ms): retrieve all messages from browser IndexedDB
        let localMsgs: WhatsAppMessage[] = [];
        try {
          localMsgs = await localChatStorage.getLocalMessages(accountId, targetJid);
          if (localMsgs.length === 0 && targetJid !== chat.id) {
            localMsgs = await localChatStorage.getLocalMessages(accountId, chat.id);
          }
          if (isMounted && localMsgs && localMsgs.length > 0) {
            setMessages(localMsgs);
            setLoadingMessages(false);
          }
        } catch (storageErr) {
          console.warn('[LocalChatStorage] Read error:', storageErr);
        }

        // 2. Query server for any pending remote messages & backfill into local storage
        let serverMsgs: WhatsAppMessage[] = [];
        try {
          serverMsgs = await whatsappWebApi.getMessages(accountId, targetJid);
          if ((!serverMsgs || serverMsgs.length === 0) && targetJid !== chat.id) {
            serverMsgs = await whatsappWebApi.getMessages(accountId, chat.id);
          }
        } catch (apiErr) {
          console.warn('Server messages fetch notice (using client local storage):', apiErr);
        }

        if (isMounted) {
          if (serverMsgs && serverMsgs.length > 0) {
            try {
              await localChatStorage.saveLocalMessages(serverMsgs);
              const allLocal = await localChatStorage.getLocalMessages(accountId, targetJid);
              if (isMounted && allLocal && allLocal.length > 0) {
                setMessages(allLocal);
              } else if (isMounted) {
                setMessages(serverMsgs);
              }
            } catch (syncErr) {
              console.warn('[LocalChatStorage] Sync error:', syncErr);
              if (isMounted) {
                setMessages(serverMsgs);
              }
            }
          } else if (!localMsgs || localMsgs.length === 0) {
            setMessages([]);
            // Auto-trigger on-demand history sync from phone if chat is empty
            if (accountId && accountId !== 'all' && targetJid && isConnected) {
              whatsappWebApi.syncChat(accountId, targetJid, 50).catch(() => null);
            }
          }
        }
      } catch (err) {
        console.warn('[WhatsAppChatArea] Load conversation error:', err);
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimer);
          setLoadingMessages(false);
        }
      }
    };

    loadConversation();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [chat?.id, accountId]);

  // Listen to live WebSocket message events
  useEffect(() => {
    if (!accountId) return;

    const socket = getSocket(tenantId, accountId);

    const handleNewMessage = (data: { message: WhatsAppMessage; chat?: WhatsAppChat }) => {
      const msg = data.message;
      if (!msg) return;

      // Guard: ignore messages for other accounts
      if (msg.accountId && accountId && accountId !== 'all' && msg.accountId !== accountId) {
        return;
      }

      // Skip empty protocol messages (receipts, reactions with no displayable content)
      const hasContent = (msg.text && msg.text.trim()) || msg.mediaType;
      if (!hasContent) return;

      // Match by exact JID or by stripped phone number to handle @lid ↔ @s.whatsapp.net
      const stripJid = (jid: string) => jid.split('@')[0].replace(/\+/g, '');
      const chatPhone = chat ? stripJid(chat.id) : '';
      const msgChatPhone = stripJid(msg.chatJid);
      const msgSenderPhone = stripJid(msg.senderJid || '');

      const belongsToChat = chat && (
        msg.chatJid === chat.id ||
        msg.senderJid === chat.id ||
        (chatPhone && msgChatPhone === chatPhone) ||
        (chatPhone && msgSenderPhone === chatPhone)
      );

      if (belongsToChat) {
        localChatStorage.saveLocalMessage(msg);
        if (!msg.fromMe) {
          soundEffects.playReceivedSound();
        }
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) {
            return prev.map(m => (m.id === msg.id ? { ...m, ...msg } : m));
          }
          return [...prev, msg];
        });
      }
    };

    const handleEdited = (data: { messageId: string; text: string; isEdited?: boolean; chatJid?: string }) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === data.messageId
            ? { ...m, text: data.text, isEdited: true }
            : m
        )
      );
    };

    const handleStatus = (data: { messageId: string; status: string }) => {
      setMessages(prev =>
        prev.map(m => (m.id === data.messageId ? { ...m, status: data.status } : m))
      );
    };

    const handleReaction = (data: { messageId: string; reaction: string | null }) => {
      setMessages(prev =>
        prev.map(m => (m.id === data.messageId ? { ...m, reaction: data.reaction || undefined } : m))
      );
    };

    socket.on('whatsapp:message_new', handleNewMessage);
    socket.on('whatsapp:message_edited', handleEdited);
    socket.on('whatsapp:message_status', handleStatus);
    socket.on('whatsapp:message_reaction', handleReaction);

    // When background media repair completes, re-fetch messages for the open chat
    // so newly-backfilled mediaUrls render immediately without a manual refresh.
    const handleMediaRepaired = (data: { accountId: string; fixed: number; redownloaded: number }) => {
      if ((data.fixed + data.redownloaded) > 0 && chat) {
        whatsappWebApi.getMessages(accountId, chat.id).then(msgs => {
          setMessages(msgs);
        }).catch(() => null);
      }
    };
    socket.on('whatsapp:media_repaired', handleMediaRepaired);

    // Auto-update message list when historical messages arrive from phone
    const handleHistorySynced = (data?: { accountId?: string }) => {
      if ((!data?.accountId || data.accountId === accountId) && chat) {
        const targetJid = (chat.id === 'you_self' && activeAccount?.phoneNumber)
          ? `${activeAccount.phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`
          : chat.id;
        whatsappWebApi.getMessages(accountId, targetJid).then(async (msgs) => {
          if (msgs && msgs.length > 0) {
            await localChatStorage.saveLocalMessages(msgs);
            setMessages(msgs);
          }
        }).catch(() => null);
      }
    };
    socket.on('whatsapp:history_synced', handleHistorySynced);
    socket.on('whatsapp:messages_synced', handleHistorySynced);

    return () => {
      socket.off('whatsapp:message_new', handleNewMessage);
      socket.off('whatsapp:message_edited', handleEdited);
      socket.off('whatsapp:message_status', handleStatus);
      socket.off('whatsapp:message_reaction', handleReaction);
      socket.off('whatsapp:media_repaired', handleMediaRepaired);
      socket.off('whatsapp:history_synced', handleHistorySynced);
      socket.off('whatsapp:messages_synced', handleHistorySynced);
    };
  }, [chat?.id, accountId, tenantId]);

  // Auto scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chat || sending) return;
    if (!isConnected) {
      addToast('warning', 'Account is disconnected. Please click "Link Device (QR)" to reconnect.');
      onOpenQR?.();
      return;
    }
    const text = input.trim();
    const quoted = replyingTo;
    setInput('');
    setReplyingTo(null);
    setSending(true);
    setShowEmojis(false);

    // Optimistic message
    const optimisticMsg: WhatsAppMessage = {
      id: 'opt-' + Math.random().toString(36).slice(2),
      accountId,
      chatJid: chat.id,
      senderJid: accountId,
      fromMe: true,
      text,
      status: 'sent',
      quotedMsgId: quoted?.id,
      quotedText: quoted?.text || (quoted?.mediaType ? `[${quoted.mediaType}]` : undefined),
      quotedSender: quoted?.senderName || (quoted?.fromMe ? 'You' : quoted?.senderJid?.split('@')[0]),
      timestamp: Date.now(),
    };

    localChatStorage.saveLocalMessage(optimisticMsg);
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const saved = await whatsappWebApi.sendMessage(accountId, chat.id, text, quoted?.id);
      if (saved) {
        localChatStorage.saveLocalMessage(saved);
        setMessages(prev => prev.map(m => (m.id === optimisticMsg.id ? saved : m)));
      }
      onMessageSent?.();
    } catch (error: any) {
      console.error('Failed to send WhatsApp message:', error);
      const errMsg: string = error?.response?.data?.message || '';
      const isNotConnected = errMsg.toLowerCase().includes('not connected') || errMsg.toLowerCase().includes('scan the qr') || errMsg.toLowerCase().includes('no active session');
      if (isNotConnected) {
        addToast('error', 'Account session disconnected. Reconnecting...');
        onAccountDisconnected?.(accountId);
      } else {
        addToast('error', errMsg || 'Failed to send message. Please ensure account is connected.');
      }
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMsg.id ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendVoiceNote = async (base64Data: string) => {
    if (!chat || sending) return;
    if (!isConnected) {
      addToast('warning', 'Account is disconnected. Please click "Link Device (QR)" to reconnect.');
      onOpenQR?.();
      return;
    }
    const quoted = replyingTo;
    setIsRecordingAudio(false);
    setReplyingTo(null);
    setSending(true);

    const optimisticMsg: WhatsAppMessage = {
      id: 'opt-v-' + Math.random().toString(36).slice(2),
      accountId,
      chatJid: chat.id,
      senderJid: accountId,
      fromMe: true,
      text: '🎵 Voice message',
      mediaType: 'audio',
      mimeType: 'audio/ogg; codecs=opus',
      status: 'sent',
      quotedMsgId: quoted?.id,
      quotedText: quoted?.text || (quoted?.mediaType ? `[${quoted.mediaType}]` : undefined),
      quotedSender: quoted?.senderName || (quoted?.fromMe ? 'You' : quoted?.senderJid?.split('@')[0]),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const saved = await whatsappWebApi.sendVoice(accountId, chat.id, base64Data, quoted?.id);
      if (saved) {
        localChatStorage.saveLocalMessage(saved);
        setMessages(prev => prev.map(m => (m.id === optimisticMsg.id ? saved : m)));
      }
      onMessageSent?.();
      addToast('success', 'Voice note sent!');
    } catch (error: any) {
      console.error('Failed to send voice note:', error);
      const errMsg: string = error?.response?.data?.message || '';
      const isNotConnected = errMsg.toLowerCase().includes('not connected') || errMsg.toLowerCase().includes('scan the qr') || errMsg.toLowerCase().includes('no active session');
      if (isNotConnected) {
        addToast('error', 'Account session disconnected. Reconnecting...');
        onAccountDisconnected?.(accountId);
      } else {
        addToast('error', errMsg || 'Failed to send voice note');
      }
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMsg.id ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  // Close attachment menu on Escape
  useEffect(() => {
    if (!showAttachMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAttachMenu(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAttachMenu]);

  const handleSendPoll = async () => {
    if (!chat || sending) return;
    const cleanQuestion = pollQuestion.trim();
    const cleanOptions = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!cleanQuestion) {
      addToast('error', 'Please enter a poll question');
      return;
    }
    if (cleanOptions.length < 2) {
      addToast('error', 'Please provide at least 2 options for the poll');
      return;
    }

    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const formattedPoll = [
      `📊 *Poll: ${cleanQuestion}*`,
      '',
      ...cleanOptions.map((opt, idx) => `${numberEmojis[idx] || `${idx + 1}.`} ${opt}`),
      '',
      '_Reply with the option number to cast your vote._'
    ].join('\n');

    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setSending(true);

    const optimisticMsg: WhatsAppMessage = {
      id: 'opt-poll-' + Math.random().toString(36).slice(2),
      accountId,
      chatJid: chat.id,
      senderJid: accountId,
      fromMe: true,
      text: formattedPoll,
      status: 'sent',
      timestamp: Date.now(),
    };

    localChatStorage.saveLocalMessage(optimisticMsg);
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const saved = await whatsappWebApi.sendMessage(accountId, chat.id, formattedPoll);
      if (saved) {
        localChatStorage.saveLocalMessage(saved);
        setMessages(prev => prev.map(m => (m.id === optimisticMsg.id ? saved : m)));
      }
      onMessageSent?.();
      addToast('success', 'Poll sent!');
    } catch (err: any) {
      console.error('Failed to send poll:', err);
      addToast('error', err?.response?.data?.message || 'Failed to send poll');
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMsg.id ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const handleShareContact = async (contact: WhatsAppContact) => {
    if (!chat || sending) return;
    const contactDisplayName = contact.name || contact.notifyName || 'Contact';
    const contactPhone = contact.phoneNumber || contact.id.replace('@s.whatsapp.net', '');
    const contactText = [
      `👤 *Contact Card*`,
      `Name: *${contactDisplayName}*`,
      `Phone: ${contactPhone}`,
      contact.id ? `ID: ${contact.id}` : ''
    ].filter(Boolean).join('\n');

    setShowContactPicker(false);
    setSending(true);

    const optimisticMsg: WhatsAppMessage = {
      id: 'opt-contact-' + Math.random().toString(36).slice(2),
      accountId,
      chatJid: chat.id,
      senderJid: accountId,
      fromMe: true,
      text: contactText,
      status: 'sent',
      timestamp: Date.now(),
    };

    localChatStorage.saveLocalMessage(optimisticMsg);
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const saved = await whatsappWebApi.sendMessage(accountId, chat.id, contactText);
      if (saved) {
        localChatStorage.saveLocalMessage(saved);
        setMessages(prev => prev.map(m => (m.id === optimisticMsg.id ? saved : m)));
      }
      onMessageSent?.();
      addToast('success', `Shared contact: ${contactDisplayName}`);
    } catch (err: any) {
      console.error('Failed to share contact:', err);
      addToast('error', err?.response?.data?.message || 'Failed to share contact');
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMsg.id ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const handleConfirmClearMessages = async () => {
    if (!chat || clearingMessages) return;
    setClearingMessages(true);
    try {
      const targetAcc = accountId || chat.accountId || '';
      if (targetAcc) {
        await whatsappWebApi.clearChatMessages(targetAcc, chat.id);
      }
      await localChatStorage.clearChatMessages(targetAcc, chat.id);
      setMessages([]);
      chat.lastMessageText = '';
      chat.unreadCount = 0;
      onMessageSent?.();
      addToast('success', 'Conversation history cleared successfully');
      setShowClearConfirmModal(false);
    } catch (err: any) {
      console.error('Failed to clear messages:', err);
      addToast('error', 'Failed to clear messages: ' + (err?.response?.data?.message || err?.message || 'Server error'));
    } finally {
      setClearingMessages(false);
    }
  };

  const handleReact = async (msg: WhatsAppMessage, emoji: string) => {
    if (!chat) return;
    const prevReaction = msg.reaction;

    // Optimistic update
    setMessages(prev =>
      prev.map(m => (m.id === msg.id ? { ...m, reaction: emoji || undefined } : m))
    );

    try {
      await whatsappWebApi.sendReaction(accountId, chat.id, msg.id, emoji, msg.fromMe);
    } catch (err: any) {
      console.error('Failed to send reaction:', err);
      setMessages(prev =>
        prev.map(m => (m.id === msg.id ? { ...m, reaction: prevReaction } : m))
      );
      addToast('error', 'Failed to send reaction');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── If no chat selected, render exact Welcome Canvas from Image 2 ────
  if (!chat) {
    return (
      <div className="wa-conversation-pane" style={{ background: '#081216', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '40px 20px',
          textAlign: 'center',
          userSelect: 'none',
        }}>
          {/* Glowing Emblem */}
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(16, 185, 129, 0.05) 70%, transparent 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 0 36px rgba(16, 185, 129, 0.25)',
            border: '1.5px solid rgba(45, 212, 191, 0.45)',
          }}>
            <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
              <path
                d="M50 12C29 12 12 29 12 50C12 57.2 14.1 63.9 17.7 69.7L13 87L30.9 82.4C36.5 85.8 43 88 50 88C71 88 88 71 88 50C88 29 71 12 50 12Z"
                stroke="#2dd4bf"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M37 36C35.5 36 33.5 37 32.5 39C31.5 41 30.5 46 34.5 54C38.5 62 45 67.5 51.5 69.5C58 71.5 63 69.5 64.5 68C66 66.5 67 64.5 67 63C67 61.5 64 60 62 59C60 58 58.5 59 57.5 60C56.5 61 55.5 61.5 54 60.5C52.5 59.5 49 57 46 53.5C43 50 41 46.5 41.5 45C42 43.5 43 42.5 43.5 41.5C44 40.5 43 38.5 42 37.5C41 36.5 38.5 36 37 36Z"
                fill="#2dd4bf"
              />
            </svg>
          </div>

          <h1 style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#f8fafc',
            margin: '0 0 6px 0',
            letterSpacing: '-0.3px',
          }}>
            Welcome back, Dhyey!
          </h1>

          <p style={{
            fontSize: 14,
            color: '#94a3b8',
            margin: '0 0 32px 0',
            maxWidth: 440,
          }}>
            Your personal space for notes, reminders and more.
          </p>

          {/* 4 Feature Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            width: '100%',
            maxWidth: 720,
          }}>
            <div style={{
              background: 'rgba(17, 27, 33, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 12,
              padding: '18px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}>
              <MessageSquare size={22} color="#2dd4bf" />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>Send Messages</div>
              <div style={{ fontSize: 11, color: '#8696a0' }}>Text, voice, media</div>
            </div>

            <div style={{
              background: 'rgba(17, 27, 33, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 12,
              padding: '18px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}>
              <Shield size={22} color="#10b981" />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>Keep it Secure</div>
              <div style={{ fontSize: 11, color: '#8696a0' }}>End-to-end encrypted</div>
            </div>

            <div style={{
              background: 'rgba(17, 27, 33, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 12,
              padding: '18px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}>
              <Smartphone size={22} color="#38bdf8" />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>Multi-Device</div>
              <div style={{ fontSize: 11, color: '#8696a0' }}>Access anywhere</div>
            </div>

            <div style={{
              background: 'rgba(17, 27, 33, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 12,
              padding: '18px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}>
              <Zap size={22} color="#2dd4bf" />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>Stay Productive</div>
              <div style={{ fontSize: 11, color: '#8696a0' }}>Quick &amp; simple</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group messages by date
  let lastDateStr = '';

  const baseHeaderTitle = getDisplayName(chat, contacts);
  const headerTitle = renamedName || baseHeaderTitle;
  const headerSubtitle = getDisplayPhone(chat, contacts);

  const currentChatAccount = accounts?.find(a => a.id === (chat.accountId || accountId)) || activeAccount;
  const accountOwnerName = resolveAccountDisplayName(currentChatAccount);

  return (
    <div className="wa-conversation-pane">
      {/* ── Chat Header Matching Image 2 & 3 ──────────────────────────────── */}
      <div className="wa-chat-header">
        <div className="wa-header-left">
          {onBack && (
            <button className="wa-icon-btn" onClick={onBack} title="Back">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="wa-avatar-sm">
            {getInitials(headerTitle, chat.isGroup)}
          </div>
          <div className="wa-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="wa-header-title" title={headerTitle}>
                {headerTitle}
              </span>
              <button
                className="wa-icon-btn"
                title="Rename contact / chat"
                onClick={() => {
                  setCustomNameInput(headerTitle);
                  setShowRenameModal(true);
                }}
                style={{ padding: 2, width: 22, height: 22, opacity: 0.65 }}
              >
                <Edit2 size={13} color="#aebac1" />
              </button>
              {accountOwnerName && accountOwnerName !== 'WhatsApp Account' && accountOwnerName !== 'Account' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(0, 168, 132, 0.12)',
                    border: '1px solid rgba(0, 168, 132, 0.3)',
                    color: '#2dd4bf',
                    fontWeight: 600,
                  }}
                  title={`Active WhatsApp Account Owner: ${accountOwnerName}`}
                >
                  <Smartphone size={11} color="#2dd4bf" />
                  <span>Account: {accountOwnerName}</span>
                </span>
              )}
            </div>
            <span className="wa-header-subtitle">
              {headerSubtitle}
            </span>
          </div>
        </div>

        <div className="wa-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="wa-icon-btn" title="Start voice call">
            <Phone size={18} color="#aebac1" />
          </button>
          <button className="wa-icon-btn" title="Start video call">
            <Video size={18} color="#aebac1" />
          </button>
          <button
            className="wa-icon-btn"
            title="Search in conversation"
            onClick={() => setShowInChatSearch(prev => !prev)}
            style={{
              background: showInChatSearch ? 'rgba(0, 168, 132, 0.2)' : undefined,
              color: showInChatSearch ? '#00a884' : undefined,
            }}
          >
            <Search size={18} color={showInChatSearch ? "#00a884" : "#aebac1"} />
          </button>
          <button
            className="wa-icon-btn"
            title="Export conversation history (.txt)"
            onClick={handleExportChat}
          >
            <Download size={18} color="#aebac1" />
          </button>
          <button
            className="wa-icon-btn"
            title="Fetch Previous Messages from Phone"
            onClick={handleFetchPreviousMessages}
            disabled={fetchingHistory}
            style={{ opacity: fetchingHistory ? 0.6 : 1 }}
          >
            <RefreshCw
              size={18}
              color="#aebac1"
              style={{ animation: fetchingHistory ? 'spin 1s linear infinite' : 'none' }}
            />
          </button>
          <div style={{ position: 'relative' }}>
            <button
              className="wa-icon-btn"
              title="More options"
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            >
              <MoreVertical size={18} color="#aebac1" />
            </button>
            {showHeaderMenu && (
              <>
                <div
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                  onClick={() => setShowHeaderMenu(false)}
                />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  width: 215,
                  background: '#233138',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  padding: '6px 0',
                  zIndex: 999,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                  <div
                    onClick={() => {
                      handleFetchPreviousMessages();
                      setShowHeaderMenu(false);
                    }}
                    style={{
                      padding: '9px 16px',
                      fontSize: 13,
                      color: '#e9edef',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <RefreshCw size={15} color="#00a884" />
                    <span>Fetch Previous Messages</span>
                  </div>
                  <div
                    onClick={() => {
                      setCustomNameInput(headerTitle);
                      setShowRenameModal(true);
                      setShowHeaderMenu(false);
                    }}
                    style={{
                      padding: '9px 16px',
                      fontSize: 13,
                      color: '#e9edef',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Edit2 size={15} color="#00a884" />
                    <span>Rename Contact / Group</span>
                  </div>
                  <div
                    onClick={() => {
                      handleExportChat();
                      setShowHeaderMenu(false);
                    }}
                    style={{
                      padding: '9px 16px',
                      fontSize: 13,
                      color: '#e9edef',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Download size={15} color="#00a884" />
                    <span>Export Chat History</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowInChatSearch(true);
                      setShowHeaderMenu(false);
                    }}
                    style={{
                      padding: '9px 16px',
                      fontSize: 13,
                      color: '#e9edef',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Search size={15} color="#2dd4bf" />
                    <span>Search in Chat</span>
                  </div>
                  {onOpenQR && (
                    <div
                      onClick={() => {
                        onOpenQR();
                        setShowHeaderMenu(false);
                      }}
                      style={{
                        padding: '9px 16px',
                        fontSize: 13,
                        color: '#e9edef',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <QrCode size={15} color="#38bdf8" />
                      <span>Link / Reconnect Device</span>
                    </div>
                  )}
                  <div
                    onClick={() => {
                      setShowHeaderMenu(false);
                      setShowClearConfirmModal(true);
                    }}
                    style={{
                      padding: '9px 16px',
                      fontSize: 13,
                      color: '#f87171',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <Trash2 size={15} color="#f87171" />
                    <span>Clear Messages</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── In-Chat Message Search Bar ───────────────────────────────── */}
      {showInChatSearch && (
        <div style={{
          padding: '8px 18px',
          background: '#111b21',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Search size={16} color="#8696a0" />
          <input
            type="text"
            placeholder="Search messages in this conversation..."
            value={chatSearchQuery}
            onChange={e => setChatSearchQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e9edef',
              fontSize: 13,
            }}
          />
          {chatSearchQuery && (
            <span style={{ fontSize: 11.5, color: '#8696a0', marginRight: 4 }}>
              {filteredTimelineMessages.length} match{filteredTimelineMessages.length === 1 ? '' : 'es'}
            </span>
          )}
          {chatSearchQuery && (
            <button
              onClick={() => setChatSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#8696a0',
                cursor: 'pointer',
                fontSize: 13,
                padding: '2px 6px',
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            onClick={() => {
              setShowInChatSearch(false);
              setChatSearchQuery('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 4,
            }}
            title="Close search"
          >
            Close
          </button>
        </div>
      )}

      {/* ── Disconnected / Not Linked Warning Notice ────────────────────────── */}
      {!isConnected && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12.5,
          color: '#fca5a5',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>
              <strong>Device Disconnected:</strong> This account is not linked to your phone. Scan QR code to send messages.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenQR}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#00a884',
              border: 'none',
              borderRadius: 6,
              color: '#ffffff',
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0, 168, 132, 0.35)',
            }}
          >
            <QrCode size={13} />
            <span>Link Device (QR)</span>
          </button>
        </div>
      )}

      {/* ── Messages Timeline Matching Images 2 & 3 ───────────────────────── */}
      <div className="wa-messages-timeline">
        {/* Yellow/Amber Encryption notice banner */}
        <div className="wa-encryption-notice">
          <Lock size={13} />
          <span>Messages are end-to-end encrypted. No one outside of this chat can read them.</span>
        </div>

        {loadingMessages ? (
          <div className="wa-loading-state" style={{ height: 200 }}>
            <div className="wa-spinner" />
            <p>Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="wa-welcome-center-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '30px 20px',
            textAlign: 'center',
            userSelect: 'none',
            margin: 'auto 0',
          }}>
            {/* Chat bubble icon */}
            <div style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.04) 70%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 0 28px rgba(16, 185, 129, 0.15)',
              border: '1.5px solid rgba(45, 212, 191, 0.3)',
            }}>
              <svg width="42" height="42" viewBox="0 0 100 100" fill="none">
                <path
                  d="M50 12C29 12 12 29 12 50C12 57.2 14.1 63.9 17.7 69.7L13 87L30.9 82.4C36.5 85.8 43 88 50 88C71 88 88 71 88 50C88 29 71 12 50 12Z"
                  stroke="#2dd4bf"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M37 36C35.5 36 33.5 37 32.5 39C31.5 41 30.5 46 34.5 54C38.5 62 45 67.5 51.5 69.5C58 71.5 63 69.5 64.5 68C66 66.5 67 64.5 67 63C67 61.5 64 60 62 59C60 58 58.5 59 57.5 60C56.5 61 55.5 61.5 54 60.5C52.5 59.5 49 57 46 53.5C43 50 41 46.5 41.5 45C42 43.5 43 42.5 43.5 41.5C44 40.5 43 38.5 42 37.5C41 36.5 38.5 36 37 36Z"
                  fill="#2dd4bf"
                />
              </svg>
            </div>

            <h1 style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#e9edef',
              margin: '0 0 6px 0',
              letterSpacing: '-0.3px',
            }}>
              No messages yet
            </h1>

            <p style={{
              fontSize: 13,
              color: '#8696a0',
              margin: '0 0 12px 0',
              maxWidth: 340,
            }}>
              Send a message to start the conversation. All messages are end-to-end encrypted.
            </p>

            {/* On-Demand History Fetch Button */}
            <button
              type="button"
              onClick={handleFetchPreviousMessages}
              disabled={fetchingHistory}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 20px',
                borderRadius: 20,
                background: '#00a884',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: fetchingHistory ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(0, 168, 132, 0.35)',
                margin: '8px 0 16px 0',
                transition: 'all 0.2s ease',
                opacity: fetchingHistory ? 0.75 : 1,
              }}
              title="Request message history for this chat directly from WhatsApp"
            >
              <RefreshCw
                size={15}
                style={{ animation: fetchingHistory ? 'spin 1s linear infinite' : 'none' }}
              />
              <span>{fetchingHistory ? 'Fetching from Phone...' : 'Fetch Previous Messages from Phone'}</span>
            </button>

            {/* End-to-end encryption note */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(45, 212, 191, 0.07)',
              border: '1px solid rgba(45, 212, 191, 0.2)',
            }}>
              <Lock size={13} color="#2dd4bf" />
              <span style={{ fontSize: 12, color: '#8696a0' }}>End-to-end encrypted</span>
            </div>
          </div>
        ) : (
          <>
            {remainingHiddenCount > 0 && (
              <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                <button
                  type="button"
                  onClick={() => setVisibleMessageCount(prev => prev + 150)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    background: '#202c33',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#00a884',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Load {Math.min(150, remainingHiddenCount)} older messages ({remainingHiddenCount} earlier)</span>
                </button>
              </div>
            )}
            {visibleTimelineMessages.map(msg => {
            const isOut = msg.fromMe;
            const dateStr = formatDateDivider(msg.timestamp);
            const showDivider = dateStr && dateStr !== lastDateStr;
            if (showDivider) lastDateStr = dateStr;

            // In group chats, get sender name and color for incoming messages
            const senderName = msg.senderName || (msg.senderJid ? msg.senderJid.split('@')[0] : '');
            const senderColor = getSenderColor(senderName || msg.senderJid || 'user');

            return (
              <React.Fragment key={msg.id}>
                {showDivider && (
                  <div className="wa-date-divider">
                    <span>{dateStr}</span>
                  </div>
                )}
                <div
                  className={`wa-bubble-row ${isOut ? 'outbound' : 'inbound'}`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  <div className={`wa-bubble ${isOut ? 'outbound' : 'inbound'}`} style={{ position: 'relative' }}>
                    {/* Hover Actions Toolbar */}
                    {hoveredMsgId === msg.id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          [isOut ? 'right' : 'left']: 'calc(100% + 8px)',
                          background: '#202c33',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 20,
                          padding: '3px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
                          zIndex: 20,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {['👍', '❤️', '😂', '🔥', '🙏'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReact(msg, emoji);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 16,
                              padding: '2px 4px',
                              borderRadius: 4,
                              lineHeight: 1,
                              transition: 'transform 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            title={`React ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.18)', margin: '0 2px' }} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo(msg);
                            inputRef.current?.focus();
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#aebac1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 4,
                            borderRadius: 4,
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#00a884')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#aebac1')}
                          title="Reply to message"
                        >
                          <Reply size={15} />
                        </button>
                      </div>
                    )}

                    {/* Quoted Message Reference */}
                    {msg.quotedText && (
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.25)',
                          borderLeft: '3px solid #00a884',
                          borderRadius: 4,
                          padding: '4px 8px',
                          marginBottom: 6,
                          fontSize: 12,
                          maxWidth: '100%',
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#00a884', fontSize: 11, marginBottom: 2 }}>
                          {msg.quotedSender ? (msg.quotedSender.split('@')[0]) : 'Replied message'}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {msg.quotedText}
                        </div>
                      </div>
                    )}

                    {/* In group chats, display sender name above bubble for incoming messages */}
                    {chat.isGroup && !isOut && senderName && (
                      <div
                        className="wa-bubble-sender-name"
                        style={{ color: senderColor }}
                      >
                        {senderName}
                      </div>
                    )}

                    {/* ── Deleted Message Recovery Badge (Extreme Feature) ── */}
                    {msg.isDeleted && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#ff6b6b',
                          background: 'rgba(255, 107, 107, 0.18)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          marginBottom: 6,
                          border: '1px solid rgba(255, 107, 107, 0.35)',
                          letterSpacing: '0.2px',
                        }}
                      >
                        <span>🗑️ Deleted by sender</span>
                        <span style={{ fontSize: 9, opacity: 0.8, fontWeight: 500 }}>(Recovered)</span>
                      </div>
                    )}

                    {/* ── View-Once Saved Badge (Extreme Feature) ── */}
                    {msg.isViewOnce && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.18)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          marginBottom: 6,
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          letterSpacing: '0.2px',
                        }}
                      >
                        <span>👁️ View-Once Saved</span>
                        <span style={{ fontSize: 9, opacity: 0.8, fontWeight: 500 }}>(Bypassed)</span>
                      </div>
                    )}

                    {/* ── Rich Media Rendering ────────────────────────── */}
                    {/* 1. Image */}
                    {(msg.mediaType === 'image' || (msg.mediaUrl && /\.(jpe?g|png|webp|gif)$/i.test(msg.mediaUrl))) && (
                      <div className="wa-bubble-media-wrap">
                        {msg.mediaUrl ? (
                          <div className="wa-bubble-img-box" onClick={() => setLightboxUrl(getMediaUrlWithAuth(msg.mediaUrl!))}>
                            <img
                              src={getMediaUrlWithAuth(msg.mediaUrl)}
                              alt={msg.fileName || msg.text || 'Photo'}
                              className="wa-bubble-img"
                              loading="lazy"
                            />
                            <div className="wa-img-hover-overlay">
                              <Eye size={18} />
                            </div>
                          </div>
                        ) : (
                          <div className="wa-media-fallback-card" style={{ cursor: 'pointer' }}
                            onClick={() => {
                              const url = getMediaUrlWithAuth(`/api/v1/whatsapp/media/${accountId}/${msg.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`);
                              window.open(url, '_blank');
                            }}
                          >
                            <ImageIcon size={28} color="#25d366" />
                            <div className="wa-media-fallback-info">
                              <span className="wa-media-fallback-title">{msg.fileName || 'Photo'}</span>
                              <span className="wa-media-fallback-sub" style={{ color: '#00a884' }}>Tap to download</span>
                            </div>
                            <Download size={16} color="#00a884" style={{ flexShrink: 0 }} />
                          </div>
                        )}
                        {msg.text && msg.text !== '📷 Photo' && !msg.text.startsWith('📷') && (
                          <div className="wa-bubble-caption">{msg.text}</div>
                        )}
                      </div>
                    )}

                    {/* 2. Video */}
                    {(msg.mediaType === 'video' || (msg.mediaUrl && /\.(mp4|webm|mov)$/i.test(msg.mediaUrl))) && (
                      <div className="wa-bubble-media-wrap">
                        {msg.mediaUrl ? (
                          <video
                            src={getMediaUrlWithAuth(msg.mediaUrl)}
                            controls
                            className="wa-bubble-video"
                            preload="metadata"
                          />
                        ) : (
                          <div className="wa-media-fallback-card" style={{ cursor: 'pointer' }}
                            onClick={() => {
                              const url = getMediaUrlWithAuth(`/api/v1/whatsapp/media/${accountId}/${msg.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`);
                              window.open(url, '_blank');
                            }}
                          >
                            <Video size={28} color="#34b7f1" />
                            <div className="wa-media-fallback-info">
                              <span className="wa-media-fallback-title">{msg.fileName || 'Video'}</span>
                              <span className="wa-media-fallback-sub" style={{ color: '#00a884' }}>Tap to download</span>
                            </div>
                            <Download size={16} color="#00a884" style={{ flexShrink: 0 }} />
                          </div>
                        )}
                        {msg.text && msg.text !== '🎥 Video' && !msg.text.startsWith('🎥') && (
                          <div className="wa-bubble-caption">{msg.text}</div>
                        )}
                      </div>
                    )}

                    {/* 3. Audio / Voice Note */}
                    {(msg.mediaType === 'audio' || (msg.mediaUrl && /\.(ogg|opus|mp3|wav|m4a)$/i.test(msg.mediaUrl))) && (
                      <div className="wa-bubble-media-wrap wa-bubble-audio-wrap">
                        <div className="wa-audio-icon-box">
                          <Mic size={20} color="#00a884" />
                        </div>
                        {msg.mediaUrl ? (
                          <audio
                            src={getMediaUrlWithAuth(msg.mediaUrl)}
                            controls
                            className="wa-bubble-audio"
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="wa-media-fallback-sub">Voice note</span>
                            <button
                              type="button"
                              className="wa-doc-action-btn"
                              title="Download voice note"
                              onClick={() => {
                                const url = getMediaUrlWithAuth(`/api/v1/whatsapp/media/${accountId}/${msg.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.ogg?download=1`);
                                window.open(url, '_blank');
                              }}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. Document / PDF / Sheet */}
                    {(msg.mediaType === 'document' || (msg.mediaUrl && !/\.(jpe?g|png|webp|gif|mp4|webm|ogg|opus|mp3|wav)$/i.test(msg.mediaUrl) && msg.mediaType !== 'image' && msg.mediaType !== 'video' && msg.mediaType !== 'audio')) && (
                      <div className="wa-bubble-media-wrap">
                        <div
                          className="wa-doc-card"
                          onClick={() => handleOpenDocument(msg, false)}
                          title="Click to open or preview document"
                        >
                          <div className={`wa-doc-badge ${msg.fileName?.endsWith('.pdf') ? 'pdf' : msg.fileName?.match(/\.(xlsx?|csv)$/i) ? 'excel' : msg.fileName?.match(/\.(docx?)$/i) ? 'word' : 'generic'}`}>
                            <FileText size={24} />
                            <span className="wa-doc-badge-ext">
                              {msg.fileName?.split('.').pop()?.toUpperCase() || 'DOC'}
                            </span>
                          </div>
                          <div className="wa-doc-details">
                            <span className="wa-doc-name" title={msg.fileName || msg.text || 'Document'}>
                              {msg.fileName || msg.text || 'Document'}
                            </span>
                            <span className="wa-doc-meta-sub">
                              {msg.fileSize ? formatBytes(msg.fileSize) : 'Document'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className="wa-doc-action-btn"
                              title="Preview / Open document"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDocument(msg, false);
                              }}
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              type="button"
                              className="wa-doc-action-btn"
                              title="Download document"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDocument(msg, true);
                              }}
                            >
                              <Download size={17} />
                            </button>
                          </div>
                        </div>
                        {msg.text && msg.text !== msg.fileName && !msg.text.startsWith('📎') && (
                          <div className="wa-bubble-caption">{msg.text}</div>
                        )}
                      </div>
                    )}

                    {/* 5. Sticker */}
                    {msg.mediaType === 'sticker' && (
                      <div className="wa-bubble-media-wrap">
                        {msg.mediaUrl ? (
                          <img
                            src={getMediaUrlWithAuth(msg.mediaUrl)}
                            alt="Sticker"
                            style={{ maxWidth: 140, maxHeight: 140, objectFit: 'contain' }}
                          />
                        ) : (
                          <div className="wa-media-fallback-card" style={{ cursor: 'pointer' }}
                            onClick={() => {
                              const url = getMediaUrlWithAuth(`/api/v1/whatsapp/media/${accountId}/${msg.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.webp`);
                              window.open(url, '_blank');
                            }}
                          >
                            <span style={{ fontSize: 26 }}>🎨</span>
                            <div className="wa-media-fallback-info">
                              <span className="wa-media-fallback-title">Sticker</span>
                              <span className="wa-media-fallback-sub" style={{ color: '#00a884' }}>Tap to open</span>
                            </div>
                            <Download size={16} color="#00a884" style={{ flexShrink: 0 }} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6. Plain Text or Fallback */}
                    {(!msg.mediaType || (msg.mediaType !== 'image' && msg.mediaType !== 'video' && msg.mediaType !== 'audio' && msg.mediaType !== 'document' && msg.mediaType !== 'sticker')) && (
                      msg.text && msg.text.trim() ? (
                        <span className="wa-bubble-text">{renderHighlightedText(msg.text, chatSearchQuery)}</span>
                      ) : (
                        // Completely empty message (protocol/receipt) — render nothing
                        // The backend should filter these, but just in case:
                        <span className="wa-bubble-text" style={{ opacity: 0.5, fontSize: '0.8em' }}>
                          {msg.mediaType ? `[${msg.mediaType}]` : '[message]'}
                        </span>
                      )
                    )}

                    <div className="wa-bubble-meta">
                      {Boolean(msg.isEdited) && (
                        <span
                          className="wa-bubble-edited"
                          style={{
                            fontSize: 11,
                            color: isOut ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)',
                            marginRight: 4,
                            fontStyle: 'italic',
                          }}
                          title="Edited message"
                        >
                          Edited
                        </span>
                      )}
                      <span className="wa-bubble-time">{formatMsgTime(msg.timestamp)}</span>
                      {isOut && (
                        <span className="wa-bubble-tick">
                          {msg.status === 'read' ? (
                            <CheckCheck size={14} color="#53c8f0" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck size={14} color="rgba(255,255,255,0.6)" />
                          ) : msg.status === 'failed' ? (
                            <span style={{ color: 'var(--text-danger)' }}>✗</span>
                          ) : (
                            <Check size={14} color="rgba(255,255,255,0.6)" />
                          )}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHoveredMsgId(hoveredMsgId === msg.id ? null : msg.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: hoveredMsgId === msg.id ? '#00a884' : 'rgba(255,255,255,0.35)',
                          cursor: 'pointer',
                          padding: '0 2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: 3,
                          transition: 'color 0.15s ease',
                        }}
                        title="React or reply"
                      >
                        <Smile size={12} />
                      </button>
                    </div>

                    {/* Message Reaction Badge */}
                    {msg.reaction && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -11,
                          [isOut ? 'right' : 'left']: 8,
                          background: '#202c33',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 12,
                          padding: '1px 6px',
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
                          cursor: 'pointer',
                          zIndex: 2,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReact(msg, '');
                        }}
                        title="Click to remove reaction"
                      >
                        <span>{msg.reaction}</span>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Emoji Tray ────────────────────────────────────────────────────── */}
      {showEmojis && (
        <div className="wa-emoji-tray">
          {COMMON_EMOJIS.map(emoji => (
            <button
              key={emoji}
              className="wa-emoji-btn"
              onClick={() => {
                setInput(prev => prev + emoji);
                inputRef.current?.focus();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* ── Disconnected Account Warning Banner ─────────────────────────────── */}
      {!isConnected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 16px',
            background: 'rgba(241, 92, 109, 0.14)',
            borderTop: '1px solid rgba(241, 92, 109, 0.35)',
            borderBottom: '1px solid rgba(241, 92, 109, 0.35)',
            fontSize: 12.5,
            color: '#f87171',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠️</span>
            <span>Account is disconnected. Messages cannot be sent until re-linked.</span>
          </div>
          {onOpenQR && (
            <button
              type="button"
              onClick={onOpenQR}
              style={{
                background: '#00a884',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Scan QR
            </button>
          )}
        </div>
      )}

      {/* ── Replying To Banner ───────────────────────────────────────────── */}
      {replyingTo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: 'rgba(32, 44, 51, 0.95)',
            borderLeft: '4px solid #00a884',
            borderRadius: '8px 8px 0 0',
            margin: '0 12px',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#00a884' }}>
              Replying to {replyingTo.fromMe ? 'You' : (replyingTo.senderName || replyingTo.senderJid?.split('@')[0] || 'Contact')}
            </span>
            <span style={{ fontSize: 13, color: '#e9edef', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyingTo.text || (replyingTo.mediaType ? `[${replyingTo.mediaType}]` : 'Attachment')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Cancel reply"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      )}

      {/* ── Message Composer Bar ─────────────────────────────────────────── */}
      <div className="wa-composer-bar">
        {isRecordingAudio ? (
          <AudioWaveformRecorder
            onSend={handleSendVoiceNote}
            onCancel={() => setIsRecordingAudio(false)}
          />
        ) : (
          <>
            <button
              className={`wa-icon-btn ${showEmojis ? 'active' : ''}`}
              onClick={() => setShowEmojis(!showEmojis)}
              title="Emoji"
            >
              <Smile size={22} />
            </button>

            {/* Hidden Dedicated File Inputs for WhatsApp Attachments */}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
              onChange={handleFileUpload}
            />
            <input
              ref={photoVideoInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*,video/*"
              onChange={handleFileUpload}
            />
            <input
              ref={documentInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.ppt,.pptx,.tar,.gz"
              onChange={handleFileUpload}
            />
            <input
              ref={audioInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
              onChange={handleFileUpload}
            />

            {/* Attachment Button & WhatsApp Popover Menu */}
            <div style={{ position: 'relative' }}>
              <button
                className={`wa-icon-btn ${showAttachMenu ? 'active' : ''}`}
                title="Attach"
                onClick={() => setShowAttachMenu(prev => !prev)}
                style={showAttachMenu ? { color: '#00a884', background: 'rgba(0, 168, 132, 0.15)' } : undefined}
              >
                <Paperclip size={20} />
              </button>

              {showAttachMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                    onClick={() => setShowAttachMenu(false)}
                  />

                  {/* WhatsApp-style Popover Menu */}
                  <div
                    ref={attachMenuRef}
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 14px)',
                      left: -8,
                      width: 210,
                      background: '#233138',
                      borderRadius: 14,
                      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '8px 6px',
                      zIndex: 999,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      backdropFilter: 'blur(12px)',
                      animation: 'fadeIn 0.15s ease-out',
                    }}
                  >
                    {/* 1. Photos & Videos */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        photoVideoInputRef.current?.click();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'transparent',
                        border: 'none',
                        color: '#e9edef',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s ease, transform 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #c084fc, #9333ea)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(147, 51, 234, 0.35)',
                        }}
                      >
                        <ImageIcon size={18} color="#fff" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>Photos & Videos</span>
                        <span style={{ fontSize: 11, color: '#8696a0' }}>Images, clips</span>
                      </div>
                    </button>

                    {/* 2. Document */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        documentInputRef.current?.click();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'transparent',
                        border: 'none',
                        color: '#e9edef',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s ease, transform 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #818cf8, #4f46e5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                        }}
                      >
                        <FileText size={18} color="#fff" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>Document</span>
                        <span style={{ fontSize: 11, color: '#8696a0' }}>PDF, spreadsheets, docs</span>
                      </div>
                    </button>

                    {/* 3. Audio */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        audioInputRef.current?.click();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'transparent',
                        border: 'none',
                        color: '#e9edef',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s ease, transform 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.35)',
                        }}
                      >
                        <Headphones size={18} color="#fff" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>Audio</span>
                        <span style={{ fontSize: 11, color: '#8696a0' }}>Music, voice files</span>
                      </div>
                    </button>

                    {/* 4. Contact */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        if (contacts && contacts.length > 0) {
                          setShowContactPicker(true);
                        } else if (onOpenContacts) {
                          onOpenContacts();
                        } else {
                          addToast('info', 'No contacts found. Use the Contacts directory to import.');
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'transparent',
                        border: 'none',
                        color: '#e9edef',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s ease, transform 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                        }}
                      >
                        <User size={18} color="#fff" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>Contact</span>
                        <span style={{ fontSize: 11, color: '#8696a0' }}>Share contact card</span>
                      </div>
                    </button>

                    {/* 5. Poll */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setShowPollModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'transparent',
                        border: 'none',
                        color: '#e9edef',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s ease, transform 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #34d399, #059669)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)',
                        }}
                      >
                        <BarChart2 size={18} color="#fff" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>Poll</span>
                        <span style={{ fontSize: 11, color: '#8696a0' }}>Create a quick vote</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="wa-input-container">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
            </div>

            {input.trim() ? (
              <button
                className="wa-send-btn"
                onClick={handleSend}
                disabled={sending}
                title="Send message (Enter)"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                className="wa-icon-btn"
                title="Voice message (Record PTT)"
                onClick={() => setIsRecordingAudio(true)}
              >
                <Mic size={22} />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Image Lightbox Modal ────────────────────────────────────────── */}
      {lightboxUrl && (
        <div className="wa-lightbox-backdrop" onClick={() => setLightboxUrl(null)}>
          <div className="wa-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="wa-lightbox-close-btn" onClick={() => setLightboxUrl(null)}>
              <CloseIcon size={24} />
            </button>
            <img src={lightboxUrl} alt="Enlarged media" className="wa-lightbox-img" />
            <div className="wa-lightbox-actions">
              <a
                href={lightboxUrl}
                download="whatsapp-media"
                target="_blank"
                rel="noopener noreferrer"
                className="wa-lightbox-download"
              >
                <Download size={18} /> Download
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Previewer Modal (All Formats: PDF, Text, CSV, etc.) ── */}
      {docPreview && (
        <div
          className="wa-lightbox-backdrop"
          onClick={() => setDocPreview(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: 'rgba(11, 20, 26, 0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '92vw',
              maxWidth: 950,
              height: '88vh',
              maxHeight: 850,
              background: '#111b21',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                height: 56,
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#202c33',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: docPreview.type === 'pdf' ? '#e53935' : docPreview.type === 'video' ? '#7c3aed' : docPreview.type === 'audio' ? '#0284c7' : docPreview.type === 'office' ? '#059669' : '#00a884',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: 0.5,
                  }}
                >
                  {docPreview.type === 'pdf' ? 'PDF' : docPreview.type === 'video' ? 'VIDEO' : docPreview.type === 'audio' ? 'AUDIO' : docPreview.fileName.split('.').pop()?.toUpperCase() || 'DOC'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      color: '#e9edef',
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 480,
                    }}
                    title={docPreview.fileName}
                  >
                    {docPreview.fileName}
                  </span>
                  {docPreview.fileSize && (
                    <span style={{ color: '#8696a0', fontSize: 11 }}>
                      {formatBytes(docPreview.fileSize)}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a
                  href={docPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wa-icon-btn"
                  title="Open in new window / full screen"
                  style={{ textDecoration: 'none', color: '#aebac1' }}
                >
                  <ExternalLink size={18} />
                </a>
                <a
                  href={docPreview.downloadUrl}
                  download={docPreview.fileName}
                  className="wa-icon-btn"
                  title="Download file"
                  style={{ textDecoration: 'none', color: '#00a884' }}
                >
                  <Download size={18} />
                </a>
                <button
                  className="wa-icon-btn"
                  onClick={() => setDocPreview(null)}
                  title="Close viewer (Esc)"
                  style={{ color: '#ff6b6b' }}
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, width: '100%', height: 'calc(100% - 56px)', position: 'relative', background: '#0c1317', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {docPreview.type === 'pdf' && (
                <iframe
                  src={docPreview.url}
                  title={docPreview.fileName}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                  }}
                />
              )}

              {docPreview.type === 'video' && (
                <video
                  src={docPreview.url}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '96%',
                    maxHeight: '94%',
                    borderRadius: 8,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  }}
                />
              )}

              {docPreview.type === 'audio' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '80%', maxWidth: 500, padding: 30, background: '#182229', borderRadius: 12 }}>
                  <Mic size={48} color="#00a884" />
                  <span style={{ color: '#e9edef', fontSize: 16, fontWeight: 600 }}>{docPreview.fileName}</span>
                  <audio src={docPreview.url} controls autoPlay style={{ width: '100%' }} />
                </div>
              )}

              {docPreview.type === 'image' && (
                <img
                  src={docPreview.url}
                  alt={docPreview.fileName}
                  style={{
                    maxWidth: '96%',
                    maxHeight: '94%',
                    objectFit: 'contain',
                  }}
                />
              )}

              {docPreview.type === 'text' && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'auto',
                    padding: 24,
                    color: '#d1d7db',
                    fontSize: 13,
                    fontFamily: 'Consolas, Monaco, monospace',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    userSelect: 'text',
                  }}
                >
                  {docPreview.textContent}
                </div>
              )}

              {docPreview.type === 'office' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 18,
                    padding: 30,
                    maxWidth: 480,
                    textAlign: 'center',
                    background: '#182229',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      background: docPreview.fileName.match(/\.(xlsx?|csv)$/i) ? '#2e7d32' : docPreview.fileName.match(/\.(docx?)$/i) ? '#1565c0' : '#e65100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <FileText size={32} />
                  </div>
                  <div>
                    <h3 style={{ color: '#e9edef', fontSize: 16, fontWeight: 600, margin: '0 0 6px 0' }}>
                      {docPreview.fileName}
                    </h3>
                    <p style={{ color: '#8696a0', fontSize: 13, margin: 0 }}>
                      Microsoft Office document ({docPreview.fileSize ? formatBytes(docPreview.fileSize) : 'Document'})
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                    <a
                      href={docPreview.downloadUrl}
                      download={docPreview.fileName}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        background: '#00a884',
                        color: '#111b21',
                        fontWeight: 600,
                        fontSize: 13,
                        borderRadius: 8,
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={16} />
                      Download & Open
                    </a>
                    <a
                      href={docPreview.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#e9edef',
                        fontWeight: 500,
                        fontSize: 13,
                        borderRadius: 8,
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={16} />
                      Open Raw File
                    </a>
                  </div>
                </div>
              )}

              {docPreview.type === 'generic' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    color: '#8696a0',
                  }}
                >
                  <FileText size={52} color="#00a884" />
                  <p style={{ color: '#e9edef', fontSize: 15, fontWeight: 500 }}>
                    {docPreview.fileName}
                  </p>
                  <a
                    href={docPreview.downloadUrl}
                    download={docPreview.fileName}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 20px',
                      background: '#00a884',
                      color: '#111b21',
                      fontWeight: 600,
                      borderRadius: 8,
                      textDecoration: 'none',
                    }}
                  >
                    <Download size={18} />
                    Download {docPreview.fileName}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Scheduled Messages Modal (Extreme Feature) ── */}
      {showSchedulerModal && (
        <React.Suspense fallback={null}>
          <ScheduledMessagesModal
            accountId={accountId}
            defaultToJid={chat.id}
            defaultContactName={getDisplayName(chat, contacts)}
            onClose={() => setShowSchedulerModal(false)}
          />
        </React.Suspense>
      )}
      {/* ── Create Poll Modal ────────────────────────────────────────── */}
      {showPollModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 16,
          }}
          onClick={() => setShowPollModal(false)}
        >
          <div
            style={{
              background: '#202c33',
              borderRadius: 16,
              width: '100%',
              maxWidth: 460,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#111b21',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #34d399, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChart2 size={18} color="#fff" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e9edef' }}>Create Poll</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPollModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8696a0',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                }}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Question */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8696a0', marginBottom: 6 }}>
                  Question
                </label>
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={pollQuestion}
                  onChange={e => setPollQuestion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#111b21',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e9edef',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>

              {/* Options */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8696a0', marginBottom: 6 }}>
                  Options
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#8696a0', width: 20, textAlign: 'center' }}>
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={e => {
                          const updated = [...pollOptions];
                          updated[idx] = e.target.value;
                          setPollOptions(updated);
                        }}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 8,
                          background: '#111b21',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#e9edef',
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 6,
                            borderRadius: 6,
                            display: 'flex',
                          }}
                          title="Remove option"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {pollOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(0, 168, 132, 0.12)',
                      border: '1px dashed rgba(0, 168, 132, 0.4)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#00a884',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={16} /> Add Option
                  </button>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '14px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#182229',
              }}
            >
              <button
                type="button"
                onClick={() => setShowPollModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#8696a0',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPoll}
                disabled={sending || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2)
                    ? 'rgba(0, 168, 132, 0.4)'
                    : '#00a884',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Send size={15} /> Send Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contact Picker Modal ────────────────────────────────────────── */}
      {showContactPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 16,
          }}
          onClick={() => setShowContactPicker(false)}
        >
          <div
            style={{
              background: '#202c33',
              borderRadius: 16,
              width: '100%',
              maxWidth: 440,
              maxHeight: '80vh',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#111b21',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={18} color="#fff" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e9edef' }}>Share Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactPicker(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8696a0',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                }}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#111b21',
                  borderRadius: 8,
                  padding: '8px 12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <Search size={16} color="#8696a0" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearchQuery}
                  onChange={e => setContactSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e9edef',
                    fontSize: 14,
                    width: '100%',
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Contacts List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', minHeight: 200, maxHeight: 360 }}>
              {(contacts || [])
                .filter(c => {
                  if (!contactSearchQuery.trim()) return true;
                  const q = contactSearchQuery.toLowerCase();
                  return (
                    (c.name || '').toLowerCase().includes(q) ||
                    (c.notifyName || '').toLowerCase().includes(q) ||
                    (c.phoneNumber || '').toLowerCase().includes(q) ||
                    (c.id || '').toLowerCase().includes(q)
                  );
                })
                .map(c => {
                  const name = c.name || c.notifyName || c.phoneNumber || c.id.split('@')[0];
                  const phone = c.phoneNumber || c.id.replace('@s.whatsapp.net', '');
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleShareContact(c)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 18px',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: '#00a884',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#e9edef' }}>{name}</div>
                          <div style={{ fontSize: 12, color: '#8696a0' }}>{phone}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{
                          background: 'rgba(0, 168, 132, 0.15)',
                          border: 'none',
                          color: '#00a884',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Share
                      </button>
                    </div>
                  );
                })}
              {(contacts || []).filter(c => {
                if (!contactSearchQuery.trim()) return true;
                const q = contactSearchQuery.toLowerCase();
                return (
                  (c.name || '').toLowerCase().includes(q) ||
                  (c.notifyName || '').toLowerCase().includes(q) ||
                  (c.phoneNumber || '').toLowerCase().includes(q) ||
                  (c.id || '').toLowerCase().includes(q)
                );
              }).length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#8696a0', fontSize: 13 }}>
                  No contacts found matching "{contactSearchQuery}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#182229',
              }}
            >
              {onOpenContacts ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowContactPicker(false);
                    onOpenContacts();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#00a884',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <UserPlus size={15} /> Open Contact Directory
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setShowContactPicker(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#e9edef',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Clear Messages Confirmation Dialog ─────────────────────────── */}
      {showClearConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => {
            if (!clearingMessages) setShowClearConfirmModal(false);
          }}
        >
          <div
            style={{
              background: '#202c33',
              borderRadius: 16,
              width: '100%',
              maxWidth: 440,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              animation: 'fadeIn 0.15s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                  Clear Conversation History?
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#8696a0' }}>
                  Permanently delete all messages in this chat
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
              This will permanently delete all messages with{' '}
              <strong style={{ color: '#fff' }}>{chat ? getDisplayName(chat, contacts) : 'this contact'}</strong> from
              both your local browser cache and the SQLite database. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                disabled={clearingMessages}
                onClick={() => setShowClearConfirmModal(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: clearingMessages ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearingMessages}
                onClick={handleConfirmClearMessages}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: clearingMessages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                }}
              >
                {clearingMessages ? (
                  <>
                    <RefreshCw size={14} className="wa-spinning" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Clear Messages</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Contact / Group Modal ── */}
      {showRenameModal && chat && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 20, 26, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowRenameModal(false)}
        >
          <div
            style={{
              background: '#202c33',
              borderRadius: 12,
              padding: 24,
              width: '90%',
              maxWidth: 440,
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#e9edef', fontWeight: 600 }}>
                {chat.isGroup ? 'Rename Group' : 'Rename Contact'}
              </h3>
              <button
                className="wa-icon-btn"
                onClick={() => setShowRenameModal(false)}
                style={{ padding: 4 }}
              >
                <CloseIcon size={18} color="#aebac1" />
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8696a0', lineHeight: 1.5 }}>
              Set a clean, proper name for this {chat.isGroup ? 'group' : 'contact'}. This name will be saved and automatically shared across all connected accounts.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#00a884', fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
                DISPLAY NAME
              </label>
              <input
                type="text"
                value={customNameInput}
                onChange={e => setCustomNameInput(e.target.value)}
                placeholder="Enter proper name..."
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setShowRenameModal(false);
                }}
                style={{
                  width: '100%',
                  background: '#2a3942',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#e9edef',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowRenameModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  padding: '8px 18px',
                  color: '#aebac1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                disabled={savingRename || !customNameInput.trim()}
                style={{
                  background: '#00a884',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 22px',
                  color: '#111b21',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: (savingRename || !customNameInput.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (savingRename || !customNameInput.trim()) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {savingRename ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
