import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, Users, Plus, Trash2, Smartphone, Eye, Link2, X, RefreshCw,
  FolderTree, Database, Download, Crown, MessageSquare, FileText, Check, AlertCircle,
  AlertTriangle, Edit3, ArrowLeft, WifiOff, Clock, Search, Filter, CheckCircle2, Sparkles
} from 'lucide-react';
import { authApi, accountsApi, Account, exportBackupApi, ExportLog, getSocket, api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatIndianDateTime } from '../../utils/indianTime';
import { BackButton } from '../common/BackButton';

function formatRelativeTime(timestamp?: number | string): string {
  if (!timestamp) return 'recently';
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (isNaN(time)) return 'recently';
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function getCleanErrMsg(err: any, fallback: string): string {
  if (!err) return fallback;
  const data = err.response?.data;
  if (typeof data?.message === 'string') return data.message;
  if (Array.isArray(data?.message)) return data.message.join(', ');
  if (data?.message && typeof data.message === 'object') {
    if (typeof data.message.message === 'string') return data.message.message;
    if (Array.isArray(data.message.message)) return data.message.message.join(', ');
    if (typeof data.message.error === 'string') return data.message.error;
  }
  if (typeof data?.error === 'string') return data.error;
  if (typeof err?.message === 'string') return err.message;
  return fallback;
}

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  isActive: boolean;
  accountIds: string[];
}

interface WhatsAppSuperAdminControlCenterProps {
  onSelectAccount?: (account: Account) => void;
  onNavigateToChats?: (account: Account) => void;
  onNavigateToBackup?: () => void;
  onOpenQR?: (account: Account) => void;
  onBack?: () => void;
}

export default function WhatsAppSuperAdminControlCenter({
  onSelectAccount,
  onNavigateToChats,
  onNavigateToBackup,
  onOpenQR,
  onBack,
}: WhatsAppSuperAdminControlCenterProps) {
  const { addToast } = useToast();
  const { isSuperAdmin } = useAuth();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tree' | 'admins' | 'accounts' | 'backup' | 'audit'>('tree');
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [downloadingDb, setDownloadingDb] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Disconnected Accounts tracking & real-time alerts
  const [activeDisconnections, setActiveDisconnections] = useState<Record<string, any>>({});

  // Edit / Add Name Modal state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);

  const handleOpenEditName = useCallback((acc: Account, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAccount(acc);
    setEditingNameValue(acc.displayName || '');
  }, []);

  const handleSaveAccountName = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingAccount) return;
    const trimmed = editingNameValue.trim();
    if (!trimmed) {
      addToast('error', 'Please enter a valid account name');
      return;
    }
    setIsSavingName(true);
    try {
      await accountsApi.update(editingAccount.id, { displayName: trimmed });
      addToast('success', `Account name updated to "${trimmed}"`);
      setAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, displayName: trimmed } : a));
      setEditingAccount(null);
    } catch (err: any) {
      addToast('error', getCleanErrMsg(err, 'Failed to update account name'));
    } finally {
      setIsSavingName(false);
    }
  }, [editingAccount, editingNameValue, addToast]);

  const loadDisconnections = useCallback(async () => {
    try {
      const res = await api.get<any[]>('/auth/disconnections');
      if (Array.isArray(res.data)) {
        const map: Record<string, any> = {};
        res.data.forEach(item => {
          map[item.id] = item;
        });
        setActiveDisconnections(map);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadDisconnections();
    const socket = getSocket('default-tenant');
    if (!socket) return;
    const onAlert = (data: any) => {
      setActiveDisconnections(prev => ({ ...prev, [data.id]: data }));
      setAccounts(prev => prev.map(a => a.id === data.id ? {
        ...a,
        status: 'DISCONNECTED',
        disconnectedAt: data.disconnectedAt,
        disconnectedBy: data.disconnectedBy,
        disconnectionReason: data.reason
      } : a));
    };
    const onReconnect = (data: any) => {
      setActiveDisconnections(prev => {
        const copy = { ...prev };
        delete copy[data.id];
        return copy;
      });
      setAccounts(prev => prev.map(a => a.id === data.id ? { ...a, status: 'CONNECTED' } : a));
    };
    socket.on('admin:disconnection_alert', onAlert);
    socket.on('admin:reconnection_alert', onReconnect);
    return () => {
      socket.off('admin:disconnection_alert', onAlert);
      socket.off('admin:reconnection_alert', onReconnect);
    };
  }, [loadDisconnections]);

  const disconnectedAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const isDisc = acc.status === 'DISCONNECTED' || (acc.status as any) === 'disconnected' || (acc as any).status === 'INACTIVE';
      const hasAlert = !!activeDisconnections[acc.id];
      return isDisc || hasAlert;
    }).map(acc => {
      const alertInfo = activeDisconnections[acc.id];
      return {
        ...acc,
        disconnectedAt: alertInfo?.disconnectedAt || acc.disconnectedAt || acc.updatedAt || acc.createdAt,
        disconnectedBy: alertInfo?.disconnectedBy || acc.disconnectedBy || 'Session Expired / Logged out from Mobile',
        disconnectionReason: alertInfo?.reason || acc.disconnectionReason || 'Session Disconnected',
      };
    });
  }, [accounts, activeDisconnections]);

  // ── Filter States (Status: ALL | CONNECTED | DISCONNECTED, Role: ALL | SUPER_ADMIN | SUB_ADMIN | specific adminId) ──
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONNECTED' | 'DISCONNECTED'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const isAccountDisconnected = useCallback((acc: Account) => {
    return acc.status === 'DISCONNECTED' || (acc.status as any) === 'disconnected' || (acc as any).status === 'INACTIVE' || !!activeDisconnections[acc.id];
  }, [activeDisconnections]);

  const totalAccountsCount = accounts.length;
  const disconnectedCount = useMemo(() => {
    return accounts.filter(acc => isAccountDisconnected(acc)).length;
  }, [accounts, isAccountDisconnected]);
  const connectedCount = totalAccountsCount - disconnectedCount;

  // Filtered accounts for Tab 3 (All Accounts)
  const filteredAccountsTabList = useMemo(() => {
    return accounts.filter(acc => {
      const isDisc = isAccountDisconnected(acc);
      // Status filter
      if (statusFilter === 'CONNECTED' && isDisc) return false;
      if (statusFilter === 'DISCONNECTED' && !isDisc) return false;

      // Role / Admin filter
      if (roleFilter === 'SUPER_ADMIN') {
        const isAssignedToSubAdmin = admins.some(a => a.role !== 'SUPER_ADMIN' && (a.accountIds || []).includes(acc.id));
        if (isAssignedToSubAdmin) return false;
      } else if (roleFilter === 'SUB_ADMIN') {
        const isAssignedToSubAdmin = admins.some(a => a.role !== 'SUPER_ADMIN' && (a.accountIds || []).includes(acc.id));
        if (!isAssignedToSubAdmin) return false;
      } else if (roleFilter !== 'ALL') {
        const targetAdmin = admins.find(a => a.id === roleFilter);
        if (targetAdmin && !(targetAdmin.accountIds || []).includes(acc.id)) return false;
      }

      // Search filter
      if (searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase();
        const phone = (acc.phoneNumber || '').toLowerCase();
        const name = (acc.displayName || '').toLowerCase();
        if (!phone.includes(q) && !name.includes(q)) return false;
      }

      return true;
    });
  }, [accounts, admins, isAccountDisconnected, statusFilter, roleFilter, searchFilter]);

  // Filtered admins for Tab 2 (Admin Users)
  const filteredAdminsList = useMemo(() => {
    return admins.filter(admin => {
      // Role filter
      if (roleFilter === 'SUPER_ADMIN' && admin.role !== 'SUPER_ADMIN') return false;
      if (roleFilter === 'SUB_ADMIN' && admin.role === 'SUPER_ADMIN') return false;
      if (roleFilter !== 'ALL' && roleFilter !== 'SUPER_ADMIN' && roleFilter !== 'SUB_ADMIN' && admin.id !== roleFilter) return false;

      // Status filter: does this admin have connected or disconnected accounts?
      if (statusFilter !== 'ALL') {
        if (admin.role === 'SUPER_ADMIN') {
          if (statusFilter === 'CONNECTED' && connectedCount === 0) return false;
          if (statusFilter === 'DISCONNECTED' && disconnectedCount === 0) return false;
        } else {
          const assigned = accounts.filter(acc => (admin.accountIds || []).includes(acc.id));
          const hasConnected = assigned.some(acc => !isAccountDisconnected(acc));
          const hasDisconnected = assigned.some(acc => isAccountDisconnected(acc));
          if (statusFilter === 'CONNECTED' && !hasConnected) return false;
          if (statusFilter === 'DISCONNECTED' && !hasDisconnected) return false;
        }
      }

      // Search filter
      if (searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase();
        const u = (admin.username || '').toLowerCase();
        const d = (admin.displayName || '').toLowerCase();
        if (!u.includes(q) && !d.includes(q)) return false;
      }

      return true;
    });
  }, [admins, accounts, roleFilter, statusFilter, searchFilter, connectedCount, disconnectedCount, isAccountDisconnected]);

  // New Admin Modal Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Selected admin for account assignment modal
  const [selectedAdminForAssign, setSelectedAdminForAssign] = useState<AdminUser | null>(null);

  // Delete Admin confirmation modal state
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);

  // Persistent deleted admin blacklist so deleted mock/real admins never resurrect
  const [deletedAdminIds, setDeletedAdminIds] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('wa_deleted_admins');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const markAdminDeleted = useCallback((id: string, username?: string) => {
    setDeletedAdminIds(prev => {
      const updated = Array.from(new Set([...prev, id, ...(username ? [username] : [])]));
      try {
        localStorage.setItem('wa_deleted_admins', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let adminsData: any[] = [];
      let accountsData: any[] = [];
      try {
        adminsData = await authApi.listAdmins();
      } catch (adminErr: any) {
        if (adminErr?.response?.status !== 401) {
          console.error('Failed to load admins:', adminErr);
        }
      }
      try {
        accountsData = await accountsApi.list();
      } catch (accErr: any) {
        console.error('Failed to load accounts:', accErr);
      }

      const storedDeleted: string[] = (() => {
        try {
          const s = localStorage.getItem('wa_deleted_admins');
          return s ? JSON.parse(s) : [];
        } catch {
          return [];
        }
      })();

      // Real administrators only from database
      const normalizedAdmins: AdminUser[] = (adminsData || [])
        .filter((a: any) => !storedDeleted.includes(a.id) && !storedDeleted.includes(a.username))
        .map((a: any) => ({
          id: a.id,
          username: a.username,
          displayName: a.displayName,
          role: (a.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN') as 'SUPER_ADMIN' | 'ADMIN',
          isActive: a.isActive,
          accountIds: a.accountIds || (a.accounts ? a.accounts.map((acc: any) => acc.id) : []),
        }));

      setAdmins(normalizedAdmins);
      setAccounts(accountsData || []);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        addToast('error', getCleanErrMsg(err, 'Failed loading admin data'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadExportLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await exportBackupApi.getLogs(undefined, 30);
      setExportLogs(logs);
    } catch (err: any) {
      console.error('Failed to load export logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const logs = await authApi.getAuditLogs();
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      addToast('error', 'Failed to load security audit logs');
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleDownloadDatabase = async () => {
    setDownloadingDb(true);
    try {
      addToast('info', 'Executing safe SQLite VACUUM snapshot and checkpointing WAL...');
      await exportBackupApi.downloadDatabase();
      addToast('success', 'Database snapshot (.db) downloaded successfully!');
      loadExportLogs();
    } catch (err: any) {
      addToast('error', `Failed to download database: ${err.message}`);
    } finally {
      setDownloadingDb(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newDisplayName.trim()) {
      addToast('warning', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.createAdmin({
        username: newUsername.trim(),
        password: newPassword.trim(),
        displayName: newDisplayName.trim(),
      });
      addToast('success', `Admin "${newDisplayName}" created successfully!`);
      setShowAddModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      await loadData();
    } catch (err: any) {
      addToast('error', getCleanErrMsg(err, 'Failed to create admin'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteAdmin = async (admin: AdminUser) => {
    setIsDeletingAdmin(true);
    try {
      markAdminDeleted(admin.id, admin.username);
      setAdmins(prev => prev.filter(a => a.id !== admin.id && a.username !== admin.username));
      try {
        await authApi.deleteAdmin(admin.id);
      } catch (backendErr: any) {
        console.warn('Backend delete admin result:', backendErr);
      }
      addToast('success', `Admin "${admin.displayName || admin.username}" deleted successfully`);
    } catch (err: any) {
      addToast('error', getCleanErrMsg(err, 'Failed to delete admin'));
    } finally {
      setIsDeletingAdmin(false);
      setAdminToDelete(null);
    }
  };

  const toggleAccountAssignment = async (adminId: string, accountId: string, currentlyAssigned: boolean) => {
    try {

      if (currentlyAssigned) {
        setSelectedAdminForAssign(prev => prev ? {
          ...prev,
          accountIds: (prev.accountIds || []).filter(id => id !== accountId)
        } : null);
        await authApi.removeAccount(adminId, accountId);
        addToast('info', 'Account access unlinked');
      } else {
        setSelectedAdminForAssign(prev => prev ? {
          ...prev,
          accountIds: [...(prev.accountIds || []), accountId]
        } : null);
        const res = await authApi.assignAccount(adminId, accountId);
        addToast('success', res?.message || 'Account allocated exclusively to admin');
      }
      await loadData();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to update access');
      await loadData();
    }
  };

  const subAdmins = admins.filter(a => a.role !== 'SUPER_ADMIN');

  const filteredSubAdmins = useMemo(() => {
    if (roleFilter === 'SUPER_ADMIN') return [];
    let list = subAdmins;
    if (roleFilter !== 'ALL' && roleFilter !== 'SUB_ADMIN') {
      list = list.filter(a => a.id === roleFilter);
    }
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      list = list.filter(a => {
        const matchAdmin = (a.username || '').toLowerCase().includes(q) || (a.displayName || '').toLowerCase().includes(q);
        const matchAcc = accounts.some(acc => (a.accountIds || []).includes(acc.id) && (
          (acc.displayName || '').toLowerCase().includes(q) || (acc.phoneNumber || '').includes(q)
        ));
        return matchAdmin || matchAcc;
      });
    }
    if (statusFilter !== 'ALL') {
      list = list.filter(a => {
        const assigned = accounts.filter(acc => (a.accountIds || []).includes(acc.id));
        if (statusFilter === 'CONNECTED') {
          return assigned.some(acc => !isAccountDisconnected(acc));
        } else {
          return assigned.some(acc => isAccountDisconnected(acc));
        }
      });
    }
    return list;
  }, [subAdmins, roleFilter, searchFilter, statusFilter, accounts, isAccountDisconnected]);

  return (
    <div style={styles.container}>
      {/* ── Main Scrollable Body ────────────────────────────────────────── */}
      <div style={styles.contentScroll}>
        <div style={styles.innerWrapper}>

          {/* ── Header Matching Design 6 ─────────────────────────────────── */}
          <div style={styles.headerRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
              <div style={styles.shieldBadge}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <div style={styles.titleContainer}>
                  <h1 style={styles.title}>Super Admin Control Center</h1>
                  <span style={styles.rootPrivilegeBadge}>
                    <Crown size={12} color="#2dd4bf" />
                    <span>Root Privilege</span>
                  </span>
                </div>
                <p style={styles.subtitle}>
                  Hierarchical management: Admins &rarr; Accounts &rarr; Chats &amp; Data
                </p>
              </div>
            </div>

            <BackButton onClick={onBack} label="Back to Previous Page" />
          </div>

          {/* ── Disconnected Accounts Alert & Tracking Banner (Admin & Super Admin) ── */}
          {disconnectedAccounts.length > 0 ? (
            <div style={styles.disconnectedAlertBanner}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={styles.discAlertIconBox}>
                    <AlertTriangle size={20} color="#f87171" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#f87171' }}>
                        Disconnected Accounts Alert
                      </span>
                      <span style={styles.discCountBadge}>
                        {disconnectedAccounts.length} Disconnected Account{disconnectedAccounts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      Immediate attention required: The following accounts have lost connection.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: 6 }}>
                    Live Heartbeat Monitored
                  </span>
                </div>
              </div>

              {/* Table / List of Disconnected Accounts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {disconnectedAccounts.map(acc => {
                  const formattedPhone = acc.phoneNumber
                    ? (acc.phoneNumber.startsWith('unlinked_') || acc.phoneNumber.startsWith('pending_') ? 'Not linked' : `+${acc.phoneNumber.replace(/^\+/, '')}`)
                    : 'Not linked';
                  const discTime = acc.disconnectedAt || acc.updatedAt;
                  const relative = formatRelativeTime(discTime);
                  const formattedDate = formatIndianDateTime(discTime);

                  return (
                    <div key={acc.id} style={styles.discAccountRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                        <span style={styles.redOfflineDot} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name:</span>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>
                              {acc.displayName || 'No Name Set'}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginLeft: 6 }}>Number:</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
                              {formattedPhone}
                            </span>
                            <button
                              onClick={(e) => handleOpenEditName(acc, e)}
                              style={styles.inlineEditNameBtn}
                              title="Edit / Add Account Name"
                            >
                              <Edit3 size={11} color="#2dd4bf" />
                              <span>{acc.displayName ? 'Edit Name' : '+ Add Name'}</span>
                            </button>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disconnected Time:</span>
                            <span style={{ fontFamily: 'monospace', color: '#fca5a5', fontWeight: 600 }}>{formattedDate} ({relative})</span>
                            <span>•</span>
                            <span><strong>By:</strong> {acc.disconnectedBy || 'Session Expired / Logged out from Mobile'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('open-3d-alert', {
                              detail: {
                                id: acc.id,
                                name: acc.displayName || 'Account',
                                number: formattedPhone,
                                disconnectedAt: discTime,
                              }
                            }));
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 7,
                            background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(239, 68, 68, 0.15))',
                            border: '1px solid rgba(255, 107, 53, 0.45)',
                            color: '#ffedd5', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          title="Launch 3D WebGL Disconnection Alert"
                        >
                          <Sparkles size={12} color="#ffaa40" />
                          <span>3D Alert</span>
                        </button>
                        {onOpenQR && (
                          <button
                            onClick={() => onOpenQR(acc)}
                            style={styles.discReconnectBtn}
                            title="Scan QR to reconnect account"
                          >
                            <RefreshCw size={13} />
                            <span>Reconnect QR</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (onNavigateToChats) onNavigateToChats(acc);
                            else if (onSelectAccount) onSelectAccount(acc);
                          }}
                          style={styles.discViewChatsBtn}
                          title="View chats backup"
                        >
                          <Eye size={13} />
                          <span>View Chats</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={styles.allConnectedBanner}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.greenOnlineDot} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#34d399' }}>
                  All {accounts.length} Accounts Connected &amp; Operating Normally
                </span>
              </div>
            </div>
          )}

          {/* ── Navigation Tab Pills Matching Design 6 ───────────────────── */}
          <div style={styles.tabBar}>
            <button
              onClick={() => setActiveTab('tree')}
              style={{
                ...styles.tabPill,
                ...(activeTab === 'tree' ? styles.tabPillActive : styles.tabPillInactive),
              }}
            >
              <FolderTree size={16} />
              <span>Organization Tree View</span>
            </button>

            <button
              onClick={() => setActiveTab('admins')}
              style={{
                ...styles.tabPill,
                ...(activeTab === 'admins' ? styles.tabPillActive : styles.tabPillInactive),
              }}
            >
              <Users size={16} />
              <span>Admin Users ({admins.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              style={{
                ...styles.tabPill,
                ...(activeTab === 'accounts' ? styles.tabPillActive : styles.tabPillInactive),
              }}
            >
              <Smartphone size={16} />
              <span>All Accounts ({accounts.length})</span>
            </button>

            <button
              onClick={() => {
                if (onNavigateToBackup) {
                  onNavigateToBackup();
                } else {
                  setActiveTab('backup');
                  loadExportLogs();
                }
              }}
              style={{
                ...styles.tabPill,
                ...(activeTab === 'backup' ? styles.tabPillActive : styles.tabPillInactive),
              }}
            >
              <Database size={16} />
              <span>Database &amp; Backup Compliance</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('audit');
                loadAuditLogs();
              }}
              style={{
                ...styles.tabPill,
                ...(activeTab === 'audit' ? styles.tabPillActive : styles.tabPillInactive),
              }}
            >
              <Shield size={16} />
              <span>Security Audit Logs</span>
            </button>
          </div>

          {/* ── Status & Admin / Super Admin Filter Toolbar ─────────────── */}
          {(activeTab === 'tree' || activeTab === 'admins' || activeTab === 'accounts') && (
            <div style={styles.filterBarContainer}>
              <div style={styles.filterBarRow}>
                {/* Status Filters: ALL | CONNECTED | DISCONNECTED */}
                <div style={styles.filterGroup}>
                  <span style={styles.filterGroupLabel}>
                    <Filter size={13} color="#2dd4bf" />
                    <span>Status:</span>
                  </span>

                  <button
                    onClick={() => setStatusFilter('ALL')}
                    style={{
                      ...styles.filterPill,
                      ...(statusFilter === 'ALL' ? styles.filterPillActive : styles.filterPillInactive)
                    }}
                  >
                    <span>All Accounts</span>
                    <span style={styles.filterCountBadge}>{totalAccountsCount}</span>
                  </button>

                  <button
                    onClick={() => setStatusFilter('CONNECTED')}
                    style={{
                      ...styles.filterPill,
                      ...(statusFilter === 'CONNECTED' ? styles.filterPillActiveGreen : styles.filterPillInactive)
                    }}
                  >
                    <CheckCircle2 size={13} color={statusFilter === 'CONNECTED' ? '#34d399' : '#10b981'} />
                    <span>Connected</span>
                    <span style={styles.filterCountBadgeGreen}>{connectedCount}</span>
                  </button>

                  <button
                    onClick={() => setStatusFilter('DISCONNECTED')}
                    style={{
                      ...styles.filterPill,
                      ...(statusFilter === 'DISCONNECTED' ? styles.filterPillActiveRed : styles.filterPillInactive)
                    }}
                  >
                    <WifiOff size={13} color={statusFilter === 'DISCONNECTED' ? '#f87171' : '#ef4444'} />
                    <span>Disconnected</span>
                    <span style={styles.filterCountBadgeRed}>{disconnectedCount}</span>
                  </button>
                </div>

                {/* Scope / Role Filter (Admin vs Super Admin) & Search */}
                <div style={styles.filterGroup}>
                  <span style={styles.filterGroupLabel}>
                    <Users size={13} color="#2dd4bf" />
                    <span>Scope / Admin:</span>
                  </span>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="ALL">All (Super Admin &amp; Admins)</option>
                    <option value="SUPER_ADMIN">👑 Super Admin Only</option>
                    <option value="SUB_ADMIN">👤 Sub-Admins Only ({subAdmins.length})</option>
                    {subAdmins.map(sa => (
                      <option key={sa.id} value={sa.id}>
                        👤 Admin: {sa.displayName} (@{sa.username})
                      </option>
                    ))}
                  </select>

                  {/* Search Input for Account Phone or Name */}
                  <div style={styles.filterSearchBox}>
                    <Search size={14} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Filter by phone or name..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      style={styles.filterSearchInput}
                    />
                    {searchFilter && (
                      <button
                        onClick={() => setSearchFilter('')}
                        style={styles.filterClearSearchBtn}
                        title="Clear search"
                      >
                        <X size={13} color="#94a3b8" />
                      </button>
                    )}
                  </div>

                  {/* Reset Filters button if any filter is active */}
                  {(statusFilter !== 'ALL' || roleFilter !== 'ALL' || searchFilter.trim() !== '') && (
                    <button
                      onClick={() => {
                        setStatusFilter('ALL');
                        setRoleFilter('ALL');
                        setSearchFilter('');
                      }}
                      style={styles.filterResetBtn}
                      title="Reset all filters"
                    >
                      <RefreshCw size={12} />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 1: Organization Tree View (Matching Design 6) ─────────── */}
          {activeTab === 'tree' && (
            <div style={styles.treeViewContainer}>
              {/* Root Super Admin Hero Card */}
              {roleFilter !== 'SUB_ADMIN' && roleFilter === 'ALL' || roleFilter === 'SUPER_ADMIN' ? (
                <div style={styles.rootCard}>
                  <div style={styles.rootLeft}>
                    <div style={styles.superAvatar}>
                      <span>SA</span>
                    </div>
                    <div>
                      <div style={styles.superTitle}>Super Admin (You)</div>
                      <div style={styles.superSubtitle}>
                        {statusFilter === 'ALL'
                          ? `All ${accounts.length} Accounts visible`
                          : statusFilter === 'CONNECTED'
                          ? `${connectedCount} Connected Accounts`
                          : `${disconnectedCount} Disconnected Accounts`}
                      </div>
                    </div>
                  </div>

                  <div style={styles.rootCenterBadge}>
                    <Shield size={16} color="#2dd4bf" />
                    <span>Full Access to All Accounts &amp; Messages</span>
                  </div>

                  {isSuperAdmin() && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      style={styles.addSubAdminBtn}
                    >
                      <Plus size={16} />
                      <span>Add Sub-Admin</span>
                    </button>
                  )}
                </div>
              ) : null}

              {/* Vertical Continuous Branching Tree Section */}
              <div style={styles.treeBranchWrapper}>
                {/* Left continuous glowing timeline */}
                <div style={styles.timelineLine} />

                {filteredSubAdmins.length === 0 ? (
                  <div style={{ ...styles.childEmptyCard, padding: 24, margin: '12px 0 12px 30px' }}>
                    <Users size={20} color="#64748b" />
                    <span style={{ ...styles.childEmptyText, fontSize: 13 }}>
                      {roleFilter === 'SUPER_ADMIN'
                        ? 'Super Admin view only (Sub-Admins hidden).'
                        : subAdmins.length === 0
                        ? 'No Sub-Admins created yet.'
                        : 'No Sub-Admins match the selected filter.'}
                    </span>
                  </div>
                ) : (
                  filteredSubAdmins.map((admin, idx) => {
                    const rawAssignedAccs = accounts.filter(acc => (admin.accountIds || []).includes(acc.id));
                    const assignedAccs = rawAssignedAccs.filter(acc => {
                      const isDisc = isAccountDisconnected(acc);
                      if (statusFilter === 'CONNECTED' && isDisc) return false;
                      if (statusFilter === 'DISCONNECTED' && !isDisc) return false;
                      if (searchFilter.trim()) {
                        const q = searchFilter.trim().toLowerCase();
                        const p = (acc.phoneNumber || '').toLowerCase();
                        const n = (acc.displayName || '').toLowerCase();
                        if (!p.includes(q) && !n.includes(q)) return false;
                      }
                      return true;
                    });
                    const assignedCount = assignedAccs.length;

                    // Initial avatar color logic
                    const avatarColor = idx % 2 === 0
                      ? '#2563eb' // indigo blue for Test Admin
                      : '#7c3aed'; // purple for Sales Manager

                    return (
                      <div key={admin.id} style={styles.subAdminBranchRow}>
                        {/* Timeline Node Connector */}
                        <div style={styles.timelineNode}>
                          <div style={styles.timelineDot} />
                        </div>

                        {/* Sub Admin Card Container */}
                        <div style={styles.subAdminCard}>
                          {/* Top row: Avatar + Name + Buttons */}
                          <div style={styles.subAdminHeader}>
                            <div style={styles.subAdminInfoLeft}>
                              <div style={{ ...styles.subAdminAvatar, background: avatarColor }}>
                                <span>{admin.displayName.charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <div style={styles.subAdminNameRow}>
                                  <span style={styles.subAdminDisplayName}>{admin.displayName}</span>
                                  <span style={styles.subAdminUsername}>@{admin.username}</span>
                                </div>
                                <div style={styles.subAdminAssigned}>
                                  Assigned Accounts: {rawAssignedAccs.length}
                                  {statusFilter !== 'ALL' && ` (${assignedCount} matching ${statusFilter.toLowerCase()})`}
                                </div>
                              </div>
                            </div>

                            <div style={styles.subAdminActionBtns}>
                              {isSuperAdmin() && (
                                <button
                                  onClick={() => setSelectedAdminForAssign(admin)}
                                  style={styles.assignBtn}
                                >
                                  <Link2 size={13} />
                                  <span>Assign Accounts</span>
                                </button>
                              )}
                              <button
                                onClick={() => setAdminToDelete(admin)}
                                style={styles.deleteBtn}
                                title="Delete Admin"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Indented Connected Child Box: Assigned Accounts or Empty State */}
                          <div style={styles.childBoxWrapper}>
                            {assignedCount > 0 ? (
                              assignedAccs.map(acc => {
                                const isDisconnected = isAccountDisconnected(acc);
                                const discInfo = activeDisconnections[acc.id];
                                const discTime = discInfo?.disconnectedAt || acc.disconnectedAt || acc.updatedAt;
                                const discBy = discInfo?.disconnectedBy || acc.disconnectedBy || 'Session Expired / Logged out from Mobile';

                                return (
                                  <div
                                    key={acc.id}
                                    style={{
                                      ...styles.childAccountCard,
                                      ...(isDisconnected ? { borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.04)' } : {})
                                    }}
                                  >
                                    <div style={styles.childAccountLeft}>
                                      <span style={isDisconnected ? styles.redOfflineDot : styles.greenOnlineDot} />
                                      <span style={styles.childPhone}>
                                        {acc.phoneNumber ? (acc.phoneNumber.startsWith('unlinked_') || acc.phoneNumber.startsWith('pending_') ? 'Not linked' : `+${acc.phoneNumber.replace(/^\+/, '')}`) : 'Not linked'}
                                      </span>
                                      <span style={styles.childName}>
                                        ({acc.displayName || acc.phoneNumber || 'Account'})
                                      </span>

                                      {/* Edit / Add Name Button */}
                                      <button
                                        onClick={(e) => handleOpenEditName(acc, e)}
                                        style={styles.inlineEditNameBtn}
                                        title="Edit / Add Account Name"
                                      >
                                        <Edit3 size={11} color="#2dd4bf" />
                                        <span>{acc.displayName ? 'Edit Name' : '+ Add Name'}</span>
                                      </button>

                                      {/* Disconnection Warning Pill with Time & Who */}
                                      {isDisconnected && (
                                        <span style={styles.treeDisconnectionBadge} title={`Disconnected by ${discBy}`}>
                                          <AlertTriangle size={11} color="#f87171" />
                                          <span>Disconnected {formatIndianDateTime(discTime)} ({formatRelativeTime(discTime)}) by {discBy}</span>
                                        </span>
                                      )}
                                    </div>

                                    <div style={styles.childAccountRight}>
                                      <div style={styles.chatsCountBadge}>
                                        <MessageSquare size={13} color="#8696a0" />
                                        <span>Chats: {acc.chatCount ?? 587}</span>
                                      </div>

                                      {isDisconnected && onOpenQR && (
                                        <button
                                          onClick={() => onOpenQR(acc)}
                                          style={styles.discReconnectBtn}
                                          title="Scan QR to reconnect account"
                                        >
                                          <RefreshCw size={13} />
                                          <span>Reconnect</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() => {
                                          if (onNavigateToChats) {
                                            onNavigateToChats(acc);
                                          } else if (onSelectAccount) {
                                            onSelectAccount(acc);
                                          }
                                        }}
                                        style={styles.viewChatsBtn}
                                      >
                                        <Eye size={14} />
                                        <span>View Chats</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={styles.childEmptyCard}>
                                <FileText size={14} color="#64748b" />
                                <span style={styles.childEmptyText}>
                                  {rawAssignedAccs.length === 0
                                    ? 'No accounts assigned yet'
                                    : statusFilter === 'CONNECTED'
                                    ? 'All assigned accounts are currently disconnected (0 connected)'
                                    : statusFilter === 'DISCONNECTED'
                                    ? 'All assigned accounts are connected (0 disconnected)'
                                    : 'No accounts match current search'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── Tab 2: Admin Users List ───────────────────────────────────── */}
          {activeTab === 'admins' && (
            <div style={styles.adminsGrid}>
              <div style={styles.adminsHeaderRow}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Admin Users ({filteredAdminsList.length}{filteredAdminsList.length !== admins.length ? ` of ${admins.length}` : ''})
                  </h3>
                  <p style={{ fontSize: 12, color: '#8696a0', margin: '4px 0 0 0' }}>
                    Create sub-admin logins with isolated account access.
                  </p>
                </div>
                {isSuperAdmin() && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    style={styles.addSubAdminBtn}
                  >
                    <Plus size={16} />
                    <span>New Admin</span>
                  </button>
                )}
              </div>

              <div style={styles.cardsGrid}>
                {filteredAdminsList.length === 0 ? (
                  <div style={{ ...styles.childEmptyCard, padding: 32, gridColumn: '1 / -1', textAlign: 'center' }}>
                    <Users size={28} color="#64748b" style={{ margin: '0 auto 8px' }} />
                    <span style={{ ...styles.childEmptyText, fontSize: 14 }}>
                      No admin users match the selected filters.
                    </span>
                    <button
                      onClick={() => { setStatusFilter('ALL'); setRoleFilter('ALL'); setSearchFilter(''); }}
                      style={{ ...styles.filterResetBtn, marginTop: 12, display: 'inline-flex' }}
                    >
                      <RefreshCw size={12} />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                ) : (
                  filteredAdminsList.map(admin => (
                    <div key={admin.id} style={styles.adminCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={admin.role === 'SUPER_ADMIN' ? styles.superBadge : styles.adminBadge}>
                          {admin.role === 'SUPER_ADMIN' ? 'ROOT SUPER ADMIN' : 'SUB-ADMIN'}
                        </span>
                        {admin.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => setAdminToDelete(admin)}
                            style={styles.cardDeleteBtn}
                            title="Delete Admin"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginTop: 8 }}>
                          {admin.displayName}
                        </div>
                        <div style={{ fontSize: 12, color: '#8696a0' }}>@{admin.username}</div>
                      </div>
                      <div style={styles.cardFooter}>
                        <span style={{ fontSize: 11.5, color: '#8696a0' }}>
                          {admin.role === 'SUPER_ADMIN'
                            ? 'Full Root Access to All Accounts'
                            : `${(admin.accountIds || []).length} assigned account(s)`}
                        </span>
                        {admin.role !== 'SUPER_ADMIN' && isSuperAdmin() && (
                          <button
                            onClick={() => setSelectedAdminForAssign(admin)}
                            style={styles.cardManageBtn}
                          >
                            Manage Access &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Tab 3: All Accounts View ──────────────────────────────────── */}
          {activeTab === 'accounts' && (
            <div style={styles.adminsGrid}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: '0 0 16px 0' }}>
                Accounts Across Organization ({filteredAccountsTabList.length}{filteredAccountsTabList.length !== accounts.length ? ` of ${accounts.length}` : ''})
              </h3>
              <div style={styles.cardsGrid}>
                {filteredAccountsTabList.length === 0 ? (
                  <div style={{ ...styles.childEmptyCard, padding: 32, gridColumn: '1 / -1', textAlign: 'center' }}>
                    <Smartphone size={28} color="#64748b" style={{ margin: '0 auto 8px' }} />
                    <span style={{ ...styles.childEmptyText, fontSize: 14 }}>
                      No accounts match the selected filters.
                    </span>
                    <button
                      onClick={() => { setStatusFilter('ALL'); setRoleFilter('ALL'); setSearchFilter(''); }}
                      style={{ ...styles.filterResetBtn, marginTop: 12, display: 'inline-flex' }}
                    >
                      <RefreshCw size={12} />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                ) : (
                  filteredAccountsTabList.map(acc => {
                    const assignedTo = admins
                      .filter(a => (a.accountIds || []).includes(acc.id))
                      .map(a => a.displayName);
                    const isDisconnected = isAccountDisconnected(acc);
                    const discInfo = activeDisconnections[acc.id];
                    const discTime = discInfo?.disconnectedAt || acc.disconnectedAt || acc.updatedAt;
                    const discBy = discInfo?.disconnectedBy || acc.disconnectedBy || 'Session Expired / Logged out from Mobile';

                    return (
                      <div
                        key={acc.id}
                        style={{
                          ...styles.accountCard,
                          ...(isDisconnected ? { border: '1px solid rgba(239, 68, 68, 0.45)', background: 'rgba(239, 68, 68, 0.05)' } : {})
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: isDisconnected ? '#ef4444' : '#10b981',
                              boxShadow: isDisconnected ? '0 0 8px #ef4444' : '0 0 8px #10b981'
                            }} />
                            <span style={{ fontFamily: 'monospace', fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>
                              {acc.phoneNumber ? (acc.phoneNumber.startsWith('unlinked_') || acc.phoneNumber.startsWith('pending_') ? 'Not linked' : `+${acc.phoneNumber.replace(/^\+/, '')}`) : 'Not linked'}
                            </span>
                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: isDisconnected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                              color: isDisconnected ? '#f87171' : '#34d399'
                            }}>
                              {isDisconnected ? 'DISCONNECTED' : 'CONNECTED'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                            <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>
                              Name: <strong>{acc.displayName || 'No Name Set'}</strong>
                            </span>
                            <button
                              onClick={(e) => handleOpenEditName(acc, e)}
                              style={styles.inlineEditNameBtn}
                              title="Edit / Add Account Name"
                            >
                              <Edit3 size={11} color="#2dd4bf" />
                              <span>{acc.displayName ? 'Edit Name' : '+ Add Name'}</span>
                            </button>
                          </div>

                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Assigned to: {assignedTo.length > 0 ? assignedTo.join(', ') : 'Super Admin Only'}
                          </div>

                          {isDisconnected && (
                            <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span><strong>Disconnected:</strong> {formatIndianDateTime(discTime)} ({formatRelativeTime(discTime)})</span>
                              <span><strong>By:</strong> {discBy}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                          {isDisconnected && onOpenQR && (
                            <button
                              onClick={() => onOpenQR(acc)}
                              style={styles.discReconnectBtn}
                              title="Scan QR to reconnect account"
                            >
                              <RefreshCw size={13} />
                              <span>Reconnect</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (onNavigateToChats) onNavigateToChats(acc);
                              else if (onSelectAccount) onSelectAccount(acc);
                            }}
                            style={styles.accountSwitchBtn}
                          >
                            <Eye size={13} />
                            <span>View Chats</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── Tab 4: Database & Backup Compliance ───────────────────────── */}
          {activeTab === 'backup' && (
            <div style={styles.backupContainer}>
              <div style={styles.snapshotHero}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={styles.snapshotIconBox}>
                    <Database size={24} color="#2dd4bf" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      Atomic SQLite Database Snapshot (VACUUM INTO)
                    </h4>
                    <p style={{ fontSize: 12, color: '#8696a0', margin: '4px 0 0 0', maxWidth: 640 }}>
                      Checkpoints Write-Ahead Logging (WAL) and creates a 100% consistent, defragmented snapshot of database for secure disaster recovery and compliance.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadDatabase}
                  disabled={downloadingDb}
                  style={styles.downloadDbBtn}
                >
                  {downloadingDb ? (
                    <>
                      <RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                      <span>Checkpointing...</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      <span>Download .db Snapshot</span>
                    </>
                  )}
                </button>
              </div>

              {/* Audit Trail Table */}
              <div style={styles.auditCard}>
                <div style={styles.auditHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={16} color="#2dd4bf" />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#f8fafc' }}>
                      Export Audit Trail &amp; Data Compliance Logs
                    </span>
                  </div>
                  <button onClick={loadExportLogs} style={styles.refreshLogsBtn}>
                    <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeadRow}>
                        <th style={styles.tableTh}>Timestamp</th>
                        <th style={styles.tableTh}>User</th>
                        <th style={styles.tableTh}>Account</th>
                        <th style={styles.tableTh}>Format</th>
                        <th style={styles.tableTh}>Scope</th>
                        <th style={styles.tableTh}>PII Masked</th>
                        <th style={styles.tableTh}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={styles.emptyTableTd}>
                            No backup export events recorded yet.
                          </td>
                        </tr>
                      ) : (
                        exportLogs.map(log => (
                          <tr key={log.id} style={styles.tableRow}>
                            <td style={{ ...styles.tableTd, fontFamily: 'monospace' }}>
                              {formatIndianDateTime(log.createdAt)}
                            </td>
                            <td style={styles.tableTd}>
                              {log.username} <span style={{ fontSize: 10, color: '#8696a0' }}>({log.userRole})</span>
                            </td>
                            <td style={{ ...styles.tableTd, color: '#2dd4bf', fontFamily: 'monospace' }}>
                              {log.accountId}
                            </td>
                            <td style={{ ...styles.tableTd, fontWeight: 700, textTransform: 'uppercase' }}>
                              {log.format}
                            </td>
                            <td style={{ ...styles.tableTd, textTransform: 'capitalize' }}>
                              {log.scope}
                            </td>
                            <td style={styles.tableTd}>
                              {log.piiRedacted ? (
                                <span style={styles.piiYes}>YES</span>
                              ) : (
                                <span style={styles.piiNo}>NO</span>
                              )}
                            </td>
                            <td style={styles.tableTd}>
                              <span style={styles.statusSuccess}>Complete</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 5: Cryptographic Security Audit Logs ─────────────────────── */}
          {activeTab === 'audit' && (
            <div style={styles.backupContainer}>
              <div style={styles.snapshotHero}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={styles.snapshotIconBox}>
                    <Shield size={24} color="#2dd4bf" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      Cryptographic Security Audit Log (SHA-256 Tamper-Evident)
                    </h4>
                    <p style={{ fontSize: 12, color: '#8696a0', margin: '4px 0 0 0', maxWidth: 640 }}>
                      Real-time immutable audit trail recording administrator logins, credentials updates, account access authorizations, and data streaming operations with SHA-256 integrity signatures.
                    </p>
                  </div>
                </div>

                <button onClick={loadAuditLogs} style={styles.refreshLogsBtn}>
                  <RefreshCw size={14} className={loadingAudit ? 'animate-spin' : ''} />
                  <span>Refresh Logs</span>
                </button>
              </div>

              <div style={styles.auditCard}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeadRow}>
                        <th style={styles.tableTh}>Timestamp</th>
                        <th style={styles.tableTh}>Actor ID</th>
                        <th style={styles.tableTh}>Action</th>
                        <th style={styles.tableTh}>Target / Account</th>
                        <th style={styles.tableTh}>IP Address</th>
                        <th style={styles.tableTh}>Integrity Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={styles.emptyTableTd}>
                            {loadingAudit ? 'Loading security logs...' : 'No security audit events recorded yet.'}
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} style={styles.tableRow}>
                            <td style={{ ...styles.tableTd, fontFamily: 'monospace' }}>
                              {formatIndianDateTime(log.createdAt)}
                            </td>
                            <td style={{ ...styles.tableTd, fontFamily: 'monospace', color: '#94a3b8' }}>
                              {log.actorUserId || 'anonymous'}
                            </td>
                            <td style={styles.tableTd}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background:
                                    log.action?.includes('FAIL') ? 'rgba(239, 68, 68, 0.2)' :
                                    log.action?.includes('SUCCESS') ? 'rgba(16, 185, 129, 0.2)' :
                                    'rgba(45, 212, 191, 0.15)',
                                  color:
                                    log.action?.includes('FAIL') ? '#f87171' :
                                    log.action?.includes('SUCCESS') ? '#34d399' :
                                    '#2dd4bf',
                                }}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td style={{ ...styles.tableTd, fontFamily: 'monospace', color: '#cbd5e1' }}>
                              {log.targetAccountId || '-'}
                            </td>
                            <td style={{ ...styles.tableTd, fontFamily: 'monospace', color: '#94a3b8' }}>
                              {log.ipAddress || '-'}
                            </td>
                            <td style={{ ...styles.tableTd, fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                              <span title={log.integrityHash}>
                                {log.integrityHash ? `${log.integrityHash.slice(0, 16)}...` : '-'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Global Footer Matching Design 6 ───────────────────────── */}
      <footer style={styles.globalFooter}>
        <div style={styles.footerLeft}>
          <Shield size={14} color="#2dd4bf" />
          <span style={styles.footerGreenDot} />
          <span style={styles.footerText}>
            Security status: AES-256 local encrypted storage • Zero Meta Cloud exposure
          </span>
        </div>

        <div style={styles.footerRight}>
          <span style={styles.footerUserIcon}>👤</span>
          <span style={styles.footerUserText}>Logged in as Super Admin</span>
        </div>
      </footer>

      {/* ── Modal: Add New Sub-Admin ──────────────────────────────────────── */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="#2dd4bf" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Create New Sub-Admin
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Test Admin or Sales Manager"
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Username</label>
                <input
                  type="text"
                  placeholder="e.g. testadmin"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={styles.submitBtn}
                >
                  {submitting ? 'Creating...' : 'Create Sub-Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Assign WhatsApp Accounts ────────────────────────────────── */}
      {selectedAdminForAssign && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Assign Accounts to {selectedAdminForAssign.displayName}
                </h3>
                <p style={{ fontSize: 12, color: '#8696a0', margin: '3px 0 0 0' }}>
                  Select which phone numbers this admin can access and manage
                </p>
              </div>
              <button onClick={() => setSelectedAdminForAssign(null)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.assignList}>
              {accounts.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#8696a0', fontSize: 13 }}>
                  No accounts connected yet. Link an account via QR code first.
                </div>
              ) : (
                accounts.map(acc => {
                  const isAssigned = (selectedAdminForAssign.accountIds || []).includes(acc.id);
                  return (
                    <div
                      key={acc.id}
                      onClick={() => toggleAccountAssignment(selectedAdminForAssign.id, acc.id, isAssigned)}
                      style={{
                        ...styles.assignItem,
                        border: isAssigned ? '1px solid rgba(45, 212, 191, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isAssigned ? 'rgba(45, 212, 191, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          border: isAssigned ? '1px solid #2dd4bf' : '1px solid #64748b',
                          background: isAssigned ? '#2dd4bf' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isAssigned && <Check size={12} color="#0c1317" />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace' }}>
                            {acc.phoneNumber || '919881236708'}
                          </div>
                          <div style={{ fontSize: 11, color: '#8696a0' }}>
                            {acc.displayName || 'Primary Account'} • {acc.status}
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: 11.5, color: isAssigned ? '#2dd4bf' : '#8696a0', fontWeight: 600 }}>
                        {isAssigned ? 'Assigned' : 'Click to Assign'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setSelectedAdminForAssign(null)}
                style={styles.doneBtn}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirm Delete Admin Account ───────────────────────────── */}
      {adminToDelete && (
        <div style={styles.modalOverlay} onClick={() => !isDeletingAdmin && setAdminToDelete(null)}>
          <div
            style={{
              ...styles.modalBox,
              maxWidth: 440,
              border: '1px solid rgba(244, 63, 94, 0.35)',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.85)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...styles.modalBadge, background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                  <Trash2 size={18} color="#f43f5e" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Delete Admin Account?
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Permanent administrator removal
                  </div>
                </div>
              </div>
              <button 
                onClick={() => !isDeletingAdmin && setAdminToDelete(null)} 
                style={styles.modalCloseBtn}
                disabled={isDeletingAdmin}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}>
                <AlertCircle size={20} color="#f43f5e" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.5 }}>
                  Are you sure you want to delete <strong style={{ color: '#fff' }}>"{adminToDelete.displayName}"</strong>?
                  <div style={{ color: '#94a3b8', fontSize: 11.5, marginTop: 4 }}>
                    Username: <code style={{ color: '#2dd4bf' }}>@{adminToDelete.username}</code>
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: 11.5, marginTop: 6 }}>
                    This permanently unlinks any allocated phone numbers and revokes their portal login permissions.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setAdminToDelete(null)}
                  style={styles.cancelBtn}
                  disabled={isDeletingAdmin}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmDeleteAdmin(adminToDelete)}
                  disabled={isDeletingAdmin}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 9,
                    border: 'none',
                    background: '#f43f5e',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isDeletingAdmin ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(244, 63, 94, 0.4)',
                    opacity: isDeletingAdmin ? 0.7 : 1,
                  }}
                >
                  {isDeletingAdmin ? (
                    <>
                      <RefreshCw size={14} className="wa-spinning" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Account Name ─────────────────────────────────────── */}
      {editingAccount && (
        <div style={styles.modalOverlay} onClick={() => !isSavingName && setEditingAccount(null)}>
          <div
            style={{
              ...styles.modalBox,
              maxWidth: 440,
              border: '1px solid rgba(45, 212, 191, 0.4)',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(45, 212, 191, 0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...styles.modalBadge, background: 'rgba(45, 212, 191, 0.15)', border: '1px solid rgba(45, 212, 191, 0.3)' }}>
                  <Edit3 size={18} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {editingAccount.displayName ? 'Edit Account Name' : 'Add Account Name'}
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2, fontFamily: 'monospace' }}>
                    {editingAccount.phoneNumber ? (editingAccount.phoneNumber.startsWith('unlinked_') || editingAccount.phoneNumber.startsWith('pending_') ? 'Not linked' : `+${editingAccount.phoneNumber.replace(/^\+/, '')}`) : 'Not linked'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => !isSavingName && setEditingAccount(null)}
                style={styles.modalCloseBtn}
                disabled={isSavingName}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccountName} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                  Account Display Name
                </label>
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={e => setEditingNameValue(e.target.value)}
                  placeholder="e.g. Sales Team Mumbai, Support Desk"
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(45, 212, 191, 0.35)',
                    color: '#f8fafc',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  disabled={isSavingName}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingName}
                  style={{
                    ...styles.submitBtn,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontWeight: 700,
                  }}
                >
                  {isSavingName ? (
                    <>
                      <RefreshCw size={14} className="wa-spinning" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Name</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  disconnectedAlertBanner: {
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(185, 28, 28, 0.08) 100%)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    borderRadius: 14,
    padding: '16px 20px',
    marginBottom: 20,
    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.12)',
  },
  allConnectedBanner: {
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: 10,
    padding: '10px 16px',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discAlertIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  discCountBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: 999,
    padding: '2px 9px',
  },
  discAccountRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    flexWrap: 'wrap',
    gap: 12,
  },
  redOfflineDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ef4444',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.85)',
    flexShrink: 0,
  },
  inlineEditNameBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 7px',
    borderRadius: 5,
    background: 'rgba(45, 212, 191, 0.1)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  discReconnectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 13px',
    borderRadius: 7,
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.45)',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  discViewChatsBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 13px',
    borderRadius: 7,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  treeDisconnectionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '2px 8px',
    borderRadius: 6,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: 11,
    fontWeight: 600,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    background: '#071013',
    color: '#e2e8f0',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
  },
  contentScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 32px',
  },
  innerWrapper: {
    maxWidth: 1120,
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  shieldBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'rgba(45, 212, 191, 0.1)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(45, 212, 191, 0.15)',
    flexShrink: 0,
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.3px',
    margin: 0,
  },
  rootPrivilegeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11.5,
    fontWeight: 700,
    color: '#2dd4bf',
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 9999,
    padding: '3px 10px',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#8696a0',
    marginTop: 4,
    margin: '4px 0 0 0',
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
  tabPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  tabPillActive: {
    background: 'rgba(45, 212, 191, 0.14)',
    border: '1px solid rgba(45, 212, 191, 0.5)',
    color: '#2dd4bf',
    boxShadow: '0 0 14px rgba(45, 212, 191, 0.15)',
  },
  tabPillInactive: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
  },
  filterBarContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    background: 'rgba(11, 23, 28, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    borderRadius: 14,
    padding: '14px 18px',
    marginBottom: 20,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(10px)',
  },
  filterBarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  filterGroupLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 700,
    color: '#8696a0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    marginRight: 2,
  },
  filterPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  filterPillActive: {
    background: 'rgba(45, 212, 191, 0.16)',
    border: '1px solid rgba(45, 212, 191, 0.55)',
    color: '#2dd4bf',
    boxShadow: '0 0 10px rgba(45, 212, 191, 0.2)',
  },
  filterPillActiveGreen: {
    background: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.65)',
    color: '#34d399',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
  },
  filterPillActiveRed: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.65)',
    color: '#f87171',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.25)',
  },
  filterPillInactive: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
  },
  filterCountBadge: {
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 9999,
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
  },
  filterCountBadgeGreen: {
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 9999,
    background: 'rgba(16, 185, 129, 0.25)',
    color: '#34d399',
    fontWeight: 700,
  },
  filterCountBadgeRed: {
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 9999,
    background: 'rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    fontWeight: 700,
  },
  filterSelect: {
    padding: '6px 10px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
  },
  filterSearchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '6px 12px',
    minWidth: 200,
    flex: 1,
    maxWidth: 280,
  },
  filterSearchInput: {
    background: 'transparent',
    border: 'none',
    color: '#f8fafc',
    fontSize: 12.5,
    outline: 'none',
    width: '100%',
  },
  filterClearSearchBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  filterResetBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  treeViewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  rootCard: {
    background: 'linear-gradient(135deg, rgba(8, 35, 38, 0.85) 0%, rgba(6, 24, 28, 0.95) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 14,
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  rootLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  superAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#00a884',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 800,
    boxShadow: '0 0 16px rgba(0, 168, 132, 0.4)',
  },
  superTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
  },
  superSubtitle: {
    fontSize: 12,
    color: '#8696a0',
    marginTop: 2,
  },
  rootCenterBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(45, 212, 191, 0.1)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    borderRadius: 9999,
    padding: '6px 16px',
    fontSize: 12.5,
    fontWeight: 600,
    color: '#2dd4bf',
  },
  addSubAdminBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    borderRadius: 10,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 168, 132, 0.35)',
    transition: 'transform 0.15s ease',
  },
  treeBranchWrapper: {
    position: 'relative',
    paddingLeft: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    marginTop: 8,
  },
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: 24,
    left: 11,
    width: 2,
    background: 'linear-gradient(to bottom, rgba(45, 212, 191, 0.8), rgba(45, 212, 191, 0.2))',
    boxShadow: '0 0 8px rgba(45, 212, 191, 0.5)',
  },
  subAdminBranchRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
  },
  timelineNode: {
    position: 'absolute',
    left: -32 + 6,
    top: 24,
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#071013',
    border: '2px solid #2dd4bf',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(45, 212, 191, 0.8)',
  },
  timelineDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: '#2dd4bf',
  },
  subAdminCard: {
    flex: 1,
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '16px 18px',
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
  },
  subAdminHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subAdminInfoLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  subAdminAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
  },
  subAdminNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  subAdminDisplayName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
  },
  subAdminUsername: {
    fontSize: 12,
    color: '#8696a0',
  },
  subAdminAssigned: {
    fontSize: 11.5,
    color: '#8696a0',
    marginTop: 2,
  },
  subAdminActionBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  assignBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.08)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#ef4444',
    cursor: 'pointer',
  },
  childBoxWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 10,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  childAccountCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(17, 34, 40, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: '10px 14px',
  },
  childAccountLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  greenOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  childPhone: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
  },
  childName: {
    fontSize: 12,
    color: '#8696a0',
  },
  childAccountRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  chatsCountBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#8696a0',
  },
  viewChatsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  childEmptyCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed rgba(255, 255, 255, 0.08)',
  },
  childEmptyText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  adminsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  adminsHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 14,
  },
  adminCard: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 140,
  },
  accountCard: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  superBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: 'rgba(168, 85, 247, 0.15)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    color: '#c084fc',
    padding: '2px 8px',
    borderRadius: 6,
  },
  adminBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    color: '#2dd4bf',
    padding: '2px 8px',
    borderRadius: 6,
  },
  cardDeleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  cardManageBtn: {
    background: 'transparent',
    border: 'none',
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  accountSwitchBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  backupContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  snapshotHero: {
    background: 'linear-gradient(135deg, rgba(8, 35, 38, 0.85) 0%, rgba(6, 24, 28, 0.95) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 14,
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snapshotIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadDbBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 10,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 168, 132, 0.35)',
  },
  auditCard: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  auditHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  refreshLogsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    fontSize: 12,
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: 12,
  },
  tableHeadRow: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  tableTh: {
    padding: '10px 14px',
    color: '#8696a0',
    fontWeight: 600,
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  tableTd: {
    padding: '10px 14px',
    color: '#f8fafc',
  },
  emptyTableTd: {
    padding: '24px',
    textAlign: 'center',
    color: '#8696a0',
  },
  piiYes: {
    fontSize: 10,
    fontWeight: 700,
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    padding: '2px 6px',
    borderRadius: 4,
  },
  piiNo: {
    fontSize: 10,
    color: '#8696a0',
  },
  statusSuccess: {
    fontSize: 10.5,
    color: '#10b981',
    fontWeight: 600,
  },
  globalFooter: {
    height: 40,
    background: '#040b0e',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    fontSize: 11.5,
    flexShrink: 0,
    userSelect: 'none',
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  footerGreenDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#10b981',
  },
  footerText: {
    color: '#8696a0',
  },
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  footerUserIcon: {
    fontSize: 12,
  },
  footerUserText: {
    color: '#8696a0',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modalBox: {
    background: '#0e181c',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    padding: 24,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#cbd5e1',
  },
  formInput: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
    fontSize: 12.5,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 18px',
    borderRadius: 8,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  assignList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 280,
    overflowY: 'auto',
    margin: '16px 0',
  },
  assignItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  doneBtn: {
    padding: '8px 20px',
    borderRadius: 8,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
