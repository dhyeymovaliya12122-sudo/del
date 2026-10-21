import React, { useState, useEffect, useRef } from 'react';
import {
  Search, MessageSquare, BarChart2, Bot, Users, LayoutDashboard,
  QrCode, FolderDown, Shield, LogOut, Moon, Sun, Smartphone,
  Zap, Bell, Settings, ArrowRight, CornerDownLeft, Sparkles,
} from 'lucide-react';
import { useAccountStore, useChatStore, useUIStore } from '../../stores';
import { useAuth } from '../../contexts/AuthContext';

interface PaletteItem {
  id: string;
  category: 'Navigation' | 'Accounts' | 'Chats' | 'Quick Actions';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { accounts, activeAccount, setActiveAccount } = useAccountStore();
  const { chats, setSelectedChat } = useChatStore();
  const {
    navTab, setNavTab,
    setShowQRModal, setQrAccountTarget,
    setShowAccountsModal, setShowSuperAdminModal,
    setShowExportModal,
  } = useUIStore();
  const { logout, user } = useAuth();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global keydown listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items list
  const items: PaletteItem[] = [
    // Navigation
    {
      id: 'nav-chats',
      category: 'Navigation',
      title: 'Chats',
      subtitle: 'Real-time multi-account inbox',
      icon: <MessageSquare className="w-4 h-4 text-emerald-500" />,
      action: () => { setNavTab('chats'); setIsOpen(false); },
      shortcut: 'Tab 1',
    },
    {
      id: 'nav-analytics',
      category: 'Navigation',
      title: 'Delivery Analytics',
      subtitle: 'Message throughput, read rates & response times',
      icon: <BarChart2 className="w-4 h-4 text-sky-500" />,
      action: () => { setNavTab('delivery_analytics'); setIsOpen(false); },
    },
    {
      id: 'nav-campaigns',
      category: 'Navigation',
      title: 'Bulk Campaigns',
      subtitle: 'High-speed targeted broadcast campaigns',
      icon: <Zap className="w-4 h-4 text-amber-500" />,
      action: () => { setNavTab('campaigns'); setIsOpen(false); },
    },
    {
      id: 'nav-chatbot',
      category: 'Navigation',
      title: 'AI Chatbot Flow Builder',
      subtitle: 'LLM agents, intent routing & FAQs',
      icon: <Bot className="w-4 h-4 text-purple-500" />,
      action: () => { setNavTab('chatbot_builder'); setIsOpen(false); },
    },
    {
      id: 'nav-health',
      category: 'Navigation',
      title: 'System Health & Metrics',
      subtitle: 'Redis, DB, Baileys sockets & memory metrics',
      icon: <LayoutDashboard className="w-4 h-4 text-emerald-500" />,
      action: () => { setNavTab('health_dashboard'); setIsOpen(false); },
    },

    // Quick Actions
    {
      id: 'action-link-device',
      category: 'Quick Actions',
      title: 'Link Device (QR)',
      subtitle: 'Scan QR code to connect a new number',
      icon: <QrCode className="w-4 h-4 text-emerald-400" />,
      action: () => {
        if (activeAccount) setQrAccountTarget(activeAccount);
        setShowQRModal(true);
        setIsOpen(false);
      },
    },
    {
      id: 'action-export-backup',
      category: 'Quick Actions',
      title: 'Export & Backup Chats',
      subtitle: 'Download full conversation history in JSON/Excel',
      icon: <FolderDown className="w-4 h-4 text-cyan-400" />,
      action: () => { setShowExportModal(true); setIsOpen(false); },
    },
    ...(user?.role === 'SUPER_ADMIN' ? [{
      id: 'action-super-admin',
      category: 'Quick Actions' as const,
      title: 'Super Admin Control Center',
      subtitle: 'Admin management, audit logs & system configs',
      icon: <Shield className="w-4 h-4 text-rose-500" />,
      action: () => { setShowSuperAdminModal(true); setIsOpen(false); },
    }] : []),

    {
      id: 'action-3d-alert',
      category: 'Quick Actions',
      title: '🌌 3D Cosmic Disconnection Alert Studio',
      subtitle: 'Launch WebGL shader-based disconnection space simulator',
      icon: <Zap className="w-4 h-4 text-orange-400" />,
      action: () => {
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent('open-3d-alert'));
      },
      shortcut: 'Ctrl+Shift+D',
    },
    {
      id: 'action-3d-landing',
      category: 'Quick Actions',
      title: '🌐 3D SaaS Landing Platform',
      subtitle: 'View public 3D landing page, interactive features & pricing',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      action: () => {
        setIsOpen(false);
        window.history.pushState({}, '', '/landing');
        window.dispatchEvent(new PopStateEvent('popstate'));
      },
    },
    {
      id: 'action-logout',
      category: 'Quick Actions',
      title: 'Sign Out',
      subtitle: 'Clear authentication session and cookies',
      icon: <LogOut className="w-4 h-4 text-rose-400" />,
      action: () => { logout(); setIsOpen(false); },
    },

    // Accounts
    ...accounts.map((acc) => ({
      id: `account-${acc.id}`,
      category: 'Accounts' as const,
      title: acc.displayName || acc.phoneNumber || acc.id,
      subtitle: `Status: ${acc.status} • Phone: ${acc.phoneNumber || 'Unlinked'}`,
      icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
      action: () => {
        setActiveAccount(acc);
        setIsOpen(false);
      },
      shortcut: activeAccount?.id === acc.id ? 'Active' : undefined,
    })),

    // Recent Chats (top 8)
    ...chats.slice(0, 8).map((chat) => ({
      id: `chat-${chat.id}`,
      category: 'Chats' as const,
      title: chat.name || chat.id.split('@')[0],
      subtitle: chat.lastMessageText || 'No recent messages',
      icon: <MessageSquare className="w-4 h-4 text-slate-400" />,
      action: () => {
        setSelectedChat(chat);
        setNavTab('chats');
        setIsOpen(false);
      },
    })),
  ];

  // Filter items by query
  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        className="w-full max-w-2xl bg-[#111b21] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 bg-[#202c33]/40">
          <Search className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, account, or chat name... (ESC to close)"
            className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none text-base"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white/10 text-slate-300 rounded border border-white/10">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y divide-white/5">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No matching commands or chats found</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                      : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{item.title}</span>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {item.shortcut && (
                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                        {item.shortcut}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-4 h-4 text-emerald-400 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-[#202c33]/40 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-white/5 rounded border border-white/10">↑</kbd>
              <kbd className="px-1.5 py-0.5 font-mono bg-white/5 rounded border border-white/10">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-white/5 rounded border border-white/10">↵</kbd>
              Select
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Press <kbd className="px-1 py-0.2 bg-white/5 rounded">Ctrl + K</kbd> anytime
          </span>
        </div>
      </div>
    </div>
  );
}
