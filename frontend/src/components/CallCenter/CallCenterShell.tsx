import React, { useState } from 'react';
import {
  Gauge,
  Settings,
  Users,
  FileText,
  Plug,
  Wrench,
  HelpCircle,
  Grid,
  ChevronRight,
  Megaphone,
  Bell,
  LogOut,
  Phone,
  MessageSquare,
  SlidersHorizontal,
  Server,
  FolderTree,
  Database,
  BarChart2,
  Shield,
  Bot,
  BadgeCheck,
  Radio,
  Send,
  RefreshCw,
} from 'lucide-react';

export interface CallCenterShellProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout?: () => void;
  unreadCount?: number;
  totalAccountsCount?: number;
  userName?: string;
  userRole?: string;
  onOpenNotifications?: () => void;
  children: React.ReactNode;
}

export default function CallCenterShell({
  activeTab,
  onSelectTab,
  onLogout,
  unreadCount = 0,
  totalAccountsCount = 1,
  userName = 'Super Admin',
  userRole = 'SUPER_ADMIN',
  onOpenNotifications,
  children,
}: CallCenterShellProps) {
  const [activeSubDrawer, setActiveSubDrawer] = useState<string | null>(null);

  // Group mappings: which high-level sidebar item owns which underlying sub-view
  const getSidebarCategory = (tab: string): string => {
    if (tab === 'dashboard') return 'dashboard';
    if (['instances', 'accounts', 'organization', 'users', 'linked-devices'].includes(tab)) return 'manage';
    if (['contacts', 'contacts-import', 'contacts-export'].includes(tab)) return 'leads';
    if (['analytics', 'reports', 'database-backup', 'campaigns'].includes(tab)) return 'reports';
    if (['connectors', 'migration', 'chatbot'].includes(tab)) return 'connectors';
    if (['settings', 'verification', 'optout', 'compliance', 'auto-reply', 'templates'].includes(tab)) return 'settings';
    if (['help', 'system-overview'].includes(tab)) return 'help';
    if (['chats', 'home', 'services', 'scheduler'].includes(tab)) return 'services';
    return 'dashboard';
  };

  const activeCategory = getSidebarCategory(activeTab);

  const handleSidebarClick = (category: string, defaultTab: string) => {
    if (activeCategory === category && activeSubDrawer === category) {
      setActiveSubDrawer(null);
    } else {
      setActiveSubDrawer(category);
    }
    onSelectTab(defaultTab);
  };

  return (
    <div style={styles.shellContainer}>
      {/* ── TOP UTILITY TABS BAR (Website | Callyzer User | Google Meet) ────────── */}
      <div style={styles.topUtilityBar}>
        <div style={styles.utilityLeft}>
          <div style={styles.utilityTabActive}>
            <span style={styles.utilityDotYellow} />
            <span>Website</span>
          </div>
          <div style={styles.utilityTab}>
            <span style={styles.utilityDotOrange} />
            <span>Callyzer User</span>
          </div>
          <div style={styles.utilityTab}>
            <span style={styles.utilityDotGreen} />
            <span>Google Meet</span>
          </div>
        </div>

        <div style={styles.utilityRight}>
          <span style={styles.utilityFleetLabel}>Telemarketing Fleet</span>
          <span style={styles.utilityBadgeLive}>● Live Online</span>
        </div>
      </div>

      <div style={styles.mainLayout}>
        {/* ── LEFT SIDEBAR (Dark Charcoal #1e2227) ───────────────────────────── */}
        <aside style={styles.sidebar}>
          {/* Top Dialer Logo */}
          <div style={styles.sidebarLogoBox}>
            <div style={styles.logoCircle}>
              <Phone size={18} color="#ffffff" strokeWidth={2.4} />
            </div>
            <span style={styles.logoLabel}>Callyzer</span>
          </div>

          {/* Navigation Buttons Stack */}
          <nav style={styles.sidebarNav}>
            {/* 1. Dashboard (Active Yellow) */}
            <button
              onClick={() => handleSidebarClick('dashboard', 'dashboard')}
              style={{
                ...styles.navBtn,
                ...(activeCategory === 'dashboard' ? styles.navBtnActive : {}),
              }}
              title="Dashboard"
            >
              <div style={styles.navIconBox}>
                <Gauge
                  size={20}
                  color={activeCategory === 'dashboard' ? '#ffc107' : '#9ca3af'}
                  strokeWidth={2.2}
                />
              </div>
              <span
                style={{
                  ...styles.navLabel,
                  color: activeCategory === 'dashboard' ? '#ffc107' : '#d1d5db',
                }}
              >
                Dashboard
              </span>
            </button>

            {/* 2. Manage */}
            <button
              onClick={() => handleSidebarClick('manage', 'instances')}
              style={{
                ...styles.navBtn,
                ...(activeCategory === 'manage' ? styles.navBtnActive : {}),
              }}
              title="Manage Accounts, Fleet & Admins"
            >
              <div style={styles.navIconBox}>
                <Settings
                  size={20}
                  color={activeCategory === 'manage' ? '#ffc107' : '#f59e0b'}
                  strokeWidth={2}
                />
                <ChevronRight size={13} color="#9ca3af" style={styles.chevron} />
              </div>
              <span style={styles.navLabel}>Manage</span>
            </button>

            {/* 3. Leads */}
            <button
              onClick={() => handleSidebarClick('leads', 'contacts')}
              style={{
                ...styles.navBtn,
                ...(activeCategory === 'leads' ? styles.navBtnActive : {}),
              }}
              title="Leads & Contact Directory"
            >
              <div style={styles.navIconBox}>
                <Users
                  size={20}
                  color={activeCategory === 'leads' ? '#ffc107' : '#f59e0b'}
                  strokeWidth={2}
                />
                <ChevronRight size={13} color="#9ca3af" style={styles.chevron} />
              </div>
              <span style={styles.navLabel}>Leads</span>
            </button>

            {/* 4. Reports */}
            <button
              onClick={() => handleSidebarClick('reports', 'analytics')}
              style={{
                ...styles.navBtn,
                ...(activeCategory === 'reports' ? styles.navBtnActive : {}),
              }}
              title="Analytics, Backups & Campaigns"
            >
              <div style={styles.navIconBox}>
                <FileText
                  size={20}
                  color={activeCategory === 'reports' ? '#ffc107' : '#f59e0b'}
                  strokeWidth={2}
                />
                <ChevronRight size={13} color="#9ca3af" style={styles.chevron} />
              </div>
              <span style={styles.navLabel}>Reports</span>
            </button>

            {/* 5. Connectors */}
            <button
              onClick={() => handleSidebarClick('connectors', 'chatbot')}
              style={{
                ...styles.navBtn,
                ...(activeCategory === 'connectors' ? styles.navBtnActive : {}),
              }}
              title="Webhooks, API & Migration"
            >
              <div style={styles.navIconBox}>
                <Plug
                  size={20}
                  color={activeCategory === 'connectors' ? '#ffc107' : '#f59e0b'}
                  strokeWidth={2}
                />
              </div>
              <span style={styles.navLabel}>Connectors</span>
            </button>

            {/* 6. Settings */}
            <button
              onClick={() => handleSidebarClick('settings', 'verification')}
              style={{
                ...styles.navBtn,
                ...(activeCategory === 'settings' ? styles.navBtnActive : {}),
              }}
              title="Business Verification, Compliance & Auto-Reply"
            >
              <div style={styles.navIconBox}>
                <Wrench
                  size={20}
                  color={activeCategory === 'settings' ? '#ffc107' : '#f59e0b'}
                  strokeWidth={2}
                />
              </div>
              <span style={styles.navLabel}>Settings</span>
            </button>

            {/* 7. Help */}
            <button
              onClick={() => handleSidebarClick('help', 'system-overview')}
              style={{
                ...styles.navBtn,
                ...(activeCategory === 'help' ? styles.navBtnActive : {}),
              }}
              title="System Diagnostics & Telemetry"
            >
              <div style={styles.navIconBox}>
                <HelpCircle
                  size={20}
                  color={activeCategory === 'help' ? '#ffc107' : '#f59e0b'}
                  strokeWidth={2}
                />
              </div>
              <span style={styles.navLabel}>Help</span>
            </button>

            {/* 8. Services (Live Chat & Communication Suite) */}
            <button
              onClick={() => handleSidebarClick('services', 'chats')}
              style={{
                ...styles.navBtn,
                ...styles.navBtnServices,
                ...(activeCategory === 'services' ? styles.navBtnActive : {}),
              }}
              title="Live Chat Console & Message Dispatcher"
            >
              <div style={styles.navIconBox}>
                <Grid
                  size={20}
                  color={activeCategory === 'services' ? '#ffc107' : '#f59e0b'}
                  strokeWidth={2.2}
                />
                {unreadCount > 0 && (
                  <span style={styles.unreadCounter}>{unreadCount}</span>
                )}
              </div>
              <span style={styles.navLabel}>Services</span>
            </button>
          </nav>
        </aside>

        {/* ── RIGHT CONTAINER: TOP WHITE HEADER + WORKSPACE ─────────────────── */}
        <div style={styles.rightContentArea}>
          {/* ── TOP HEADER (White #ffffff) ──────────────────────────────────── */}
          <header style={styles.topHeader}>
            <div style={styles.headerLeft}>
              <h1 style={styles.headerTitle}>Webs Optimization Software Solution</h1>
              <span style={styles.headerSubtitleTag}>Enterprise Telemarketing Hub</span>
            </div>

            <div style={styles.headerRight}>
              {/* Help Circle Button */}
              <button
                style={styles.headerActionBtn}
                title="System Help & Architecture"
                onClick={() => onSelectTab('system-overview')}
              >
                <HelpCircle size={18} color="#eab308" />
              </button>

              {/* Announcements Button */}
              <button
                style={styles.headerActionBtn}
                title="Announcements"
                onClick={() => alert('Platform notice: Zero packet drop. All fleet instances operational.')}
              >
                <Megaphone size={18} color="#eab308" />
              </button>

              {/* Notifications Bell */}
              <button
                style={styles.headerActionBtn}
                title="Client Notifications"
                onClick={onOpenNotifications || (() => onSelectTab('chats'))}
              >
                <Bell size={18} color="#eab308" />
                {unreadCount > 0 && <span style={styles.notificationDot} />}
              </button>

              {/* Logout Button */}
              <button
                style={styles.headerLogoutBtn}
                onClick={onLogout || (() => { if (confirm('Log out from telemarketing portal?')) window.location.reload(); })}
                title="Sign out"
              >
                <LogOut size={16} color="#eab308" />
                <span>Logout</span>
              </button>
            </div>
          </header>

          {/* ── SUB-NAVIGATION DRAWER FOR ACTIVE CATEGORY (Tabs Strip) ───────── */}
          {activeCategory !== 'dashboard' && (
            <div style={styles.subCategoryStrip}>
              {activeCategory === 'manage' && (
                <>
                  <button
                    onClick={() => onSelectTab('instances')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'instances' ? styles.subTabBtnActive : {}) }}
                  >
                    <Server size={14} />
                    <span>Fleet Instances</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('accounts')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'accounts' ? styles.subTabBtnActive : {}) }}
                  >
                    <SlidersHorizontal size={14} />
                    <span>Phone Accounts</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('organization')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'organization' ? styles.subTabBtnActive : {}) }}
                  >
                    <FolderTree size={14} />
                    <span>Sub-Admins</span>
                  </button>
                </>
              )}

              {activeCategory === 'leads' && (
                <>
                  <button
                    onClick={() => onSelectTab('contacts')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'contacts' ? styles.subTabBtnActive : {}) }}
                  >
                    <Users size={14} />
                    <span>Customer Groups</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('contacts-import')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'contacts-import' ? styles.subTabBtnActive : {}) }}
                  >
                    <Send size={14} />
                    <span>Import Leads</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('contacts-export')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'contacts-export' ? styles.subTabBtnActive : {}) }}
                  >
                    <FileText size={14} />
                    <span>Export CSV</span>
                  </button>
                </>
              )}

              {activeCategory === 'reports' && (
                <>
                  <button
                    onClick={() => onSelectTab('analytics')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'analytics' ? styles.subTabBtnActive : {}) }}
                  >
                    <BarChart2 size={14} />
                    <span>Delivery Analytics</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('database-backup')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'database-backup' ? styles.subTabBtnActive : {}) }}
                  >
                    <Database size={14} />
                    <span>Forensic Database Backup</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('campaigns')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'campaigns' ? styles.subTabBtnActive : {}) }}
                  >
                    <Send size={14} />
                    <span>Campaign Logs</span>
                  </button>
                </>
              )}

              {activeCategory === 'connectors' && (
                <>
                  <button
                    onClick={() => onSelectTab('chatbot')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'chatbot' ? styles.subTabBtnActive : {}) }}
                  >
                    <Plug size={14} />
                    <span>Webhooks &amp; Flow Builder</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('migration')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'migration' ? styles.subTabBtnActive : {}) }}
                  >
                    <RefreshCw size={14} />
                    <span>Migration Assistant</span>
                  </button>
                </>
              )}

              {activeCategory === 'settings' && (
                <>
                  <button
                    onClick={() => onSelectTab('verification')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'verification' ? styles.subTabBtnActive : {}) }}
                  >
                    <BadgeCheck size={14} />
                    <span>Business Verification</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('optout')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'optout' || activeTab === 'compliance' ? styles.subTabBtnActive : {}) }}
                  >
                    <Shield size={14} />
                    <span>Compliance &amp; DND</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('auto-reply')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'auto-reply' ? styles.subTabBtnActive : {}) }}
                  >
                    <Bot size={14} />
                    <span>Auto-Reply Rules</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('templates')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'templates' ? styles.subTabBtnActive : {}) }}
                  >
                    <FileText size={14} />
                    <span>Message Templates</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('settings')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'settings' ? styles.subTabBtnActive : {}) }}
                  >
                    <Settings size={14} />
                    <span>Enterprise Keys &amp; Proxies</span>
                  </button>
                </>
              )}

              {activeCategory === 'help' && (
                <>
                  <button
                    onClick={() => onSelectTab('system-overview')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'system-overview' ? styles.subTabBtnActive : {}) }}
                  >
                    <Radio size={14} />
                    <span>Diagnostics &amp; Health</span>
                  </button>
                </>
              )}

              {activeCategory === 'services' && (
                <>
                  <button
                    onClick={() => onSelectTab('chats')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'chats' ? styles.subTabBtnActive : {}) }}
                  >
                    <MessageSquare size={14} />
                    <span>Live Chat Console</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('home')}
                    style={{ ...styles.subTabBtn, ...(activeTab === 'home' ? styles.subTabBtnActive : {}) }}
                  >
                    <Send size={14} />
                    <span>Message Scheduler</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── WORKSPACE BODY ──────────────────────────────────────────────── */}
          <div style={styles.workspaceBody}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shellContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#f0f2f5',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  topUtilityBar: {
    height: 32,
    backgroundColor: '#181b1f',
    borderBottom: '1px solid #2a2e35',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    flexShrink: 0,
    zIndex: 30,
  },
  utilityLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  utilityTabActive: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#262a32',
    padding: '3px 12px',
    borderRadius: '4px 4px 0 0',
    cursor: 'pointer',
  },
  utilityTab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: '#9ca3af',
    padding: '3px 10px',
    cursor: 'pointer',
  },
  utilityDotYellow: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#ffc107',
  },
  utilityDotOrange: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#f97316',
  },
  utilityDotGreen: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  utilityRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  utilityFleetLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  utilityBadgeLive: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: 600,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: '2px 8px',
    borderRadius: 9999,
  },
  mainLayout: {
    display: 'flex',
    flex: 1,
    height: 'calc(100vh - 32px)',
    overflow: 'hidden',
  },
  sidebar: {
    width: 88,
    backgroundColor: '#1e2227',
    borderRight: '1px solid #2b3038',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    overflowY: 'auto',
    zIndex: 20,
  },
  sidebarLogoBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 0 12px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    backgroundColor: '#f59e0b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
  },
  logoLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#e5e7eb',
    marginTop: 4,
    letterSpacing: '0.4px',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    padding: '4px 0',
  },
  navBtn: {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 4px',
    width: '100%',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.15s ease',
  },
  navBtnActive: {
    backgroundColor: '#14181c',
  },
  navBtnServices: {
    marginTop: 'auto',
    borderBottom: 'none',
  },
  navIconBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
  },
  chevron: {
    position: 'absolute',
    right: -14,
    top: 6,
  },
  unreadCounter: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 9999,
    padding: '1px 5px',
    border: '1.5px solid #1e2227',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  rightContentArea: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  topHeader: {
    height: 56,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    flexShrink: 0,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: '#2d3748',
    margin: 0,
    letterSpacing: '-0.2px',
  },
  headerSubtitleTag: {
    fontSize: 11,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 500,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  headerActionBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 6,
  },
  notificationDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    border: '1.5px solid #ffffff',
  },
  headerLogoutBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#eab308',
    padding: '6px 10px',
    borderRadius: 6,
  },
  subCategoryStrip: {
    height: 40,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 24px',
    flexShrink: 0,
  },
  subTabBtn: {
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: 6,
  },
  subTabBtnActive: {
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    fontWeight: 600,
  },
  workspaceBody: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
  },
};
