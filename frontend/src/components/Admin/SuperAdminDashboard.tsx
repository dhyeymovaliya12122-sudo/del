import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Key, Plus, Trash2, CheckCircle2,
  AlertCircle, Smartphone, Eye, Link2, X, RefreshCw,
  FolderTree, Activity, Database, Download, HardDrive, FileSpreadsheet
} from 'lucide-react';

import { authApi, accountsApi, Account, exportBackupApi, ExportLog } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIndianDateTime } from '../../utils/indianTime';

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

interface SuperAdminDashboardProps {
  onClose: () => void;
  onSelectAccount?: (account: Account) => void;
}

export default function SuperAdminDashboard({ onClose, onSelectAccount }: SuperAdminDashboardProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tree' | 'admins' | 'accounts' | 'backup'>('tree');
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [downloadingDb, setDownloadingDb] = useState(false);
  
  // New Admin Modal Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Selected admin for account assignment
  const [selectedAdminForAssign, setSelectedAdminForAssign] = useState<AdminUser | null>(null);

  const { addToast } = useToast();

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
          addToast('error', `Failed to load admin list: ${adminErr?.response?.data?.message || adminErr.message}`);
        }
      }
      try {
        accountsData = await accountsApi.list();
      } catch (accErr: any) {
        console.error('Failed to load accounts:', accErr);
      }

      const normalizedAdmins: AdminUser[] = (adminsData || []).map((a: any) => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        isActive: a.isActive,
        accountIds: a.accountIds || (a.accounts ? a.accounts.map((acc: any) => acc.id) : []),
      }));
      setAdmins(normalizedAdmins);
      setAccounts(accountsData || []);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        addToast('error', `Failed loading admin data: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      loadData();
    } catch (err: any) {
      addToast('error', getCleanErrMsg(err, 'Failed to create admin'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Admin "${name}"?`)) return;
    try {
      await authApi.deleteAdmin(id);
      addToast('success', `Admin "${name}" removed`);
      loadData();
    } catch (err: any) {
      addToast('error', getCleanErrMsg(err, 'Failed to delete admin'));
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
        const otherAdmin = admins.find(a => a.id !== adminId && (a.accountIds || []).includes(accountId));
        if (otherAdmin) {
          const confirmTransfer = window.confirm(
            `Strict 1-to-1 Exclusivity Policy:\n\nAccount is currently allocated to Admin "${otherAdmin.displayName || otherAdmin.username}".\n\nTransferring it will remove access from "${otherAdmin.displayName || otherAdmin.username}" and assign it EXCLUSIVELY to "${selectedAdminForAssign?.displayName || 'this admin'}".\n\nDo you want to proceed with this transfer?`
          );
          if (!confirmTransfer) return;
        }

        setSelectedAdminForAssign(prev => prev ? {
          ...prev,
          accountIds: [...(prev.accountIds || []), accountId]
        } : null);
        const res = await authApi.assignAccount(adminId, accountId);
        addToast('success', res?.message || res?.data?.message || 'Account allocated exclusively to admin');
      }
      await loadData();
    } catch (err: any) {
      addToast('error', getCleanErrMsg(err, 'Failed to update access'));
      await loadData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#202c33] border-b border-[#2a3942]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#e9edef] flex items-center gap-2">
                Super Admin Control Center
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Root Privilege
                </span>
              </h2>
              <p className="text-xs text-[#8696a0]">
                Hierarchical management: Admins &rarr; Accounts &rarr; Chats & Data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 hover:bg-[#374248] text-[#aebac1] rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#374248] text-[#aebac1] hover:text-white rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-[#111b21] border-b border-[#222d34]">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'tree'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <FolderTree size={16} />
            Organization Tree View
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'admins'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <Users size={16} />
            Admin Users ({admins.length})
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'accounts'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <Smartphone size={16} />
            All Accounts ({accounts.length})
          </button>
          <button
            onClick={() => { setActiveTab('backup'); loadExportLogs(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'backup'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            <Database size={16} />
            Database &amp; Backup Compliance
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0c1317]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#8696a0]">
              <RefreshCw size={32} className="animate-spin mb-3 text-emerald-500" />
              <p>Loading administrative hierarchy...</p>
            </div>
          ) : activeTab === 'tree' ? (
            /* Organization Tree View */
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="p-4 bg-[#1f2c34] border border-[#2a3942] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    SA
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#e9edef] flex items-center gap-2">
                      Super Admin (You)
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                        Full Access to All Accounts & Messages
                      </span>
                    </h3>
                    <p className="text-xs text-[#8696a0]">All {accounts.length} Accounts visible</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                >
                  <Plus size={14} />
                  Add Sub-Admin
                </button>
              </div>

              {/* Sub Admins Tree Branch */}
              <div className="pl-6 border-l-2 border-emerald-500/30 space-y-4">
                {admins.filter(a => a.role !== 'SUPER_ADMIN').length === 0 ? (
                  <div className="p-4 bg-[#111b21] border border-dashed border-[#2a3942] rounded-xl text-center text-[#8696a0] text-sm">
                    No sub-admins yet. Click "Add Sub-Admin" to delegate accounts to team members.
                  </div>
                ) : (
                  admins.filter(a => a.role !== 'SUPER_ADMIN').map(admin => {
                    const assignedAccounts = accounts.filter(acc => (admin.accountIds || []).includes(acc.id));
                    return (
                      <div key={admin.id} className="p-4 bg-[#111b21] border border-[#2a3942] rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                              {admin.displayName[0]?.toUpperCase() || 'A'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#e9edef] text-sm">{admin.displayName}</span>
                                <span className="text-xs text-[#8696a0]">(@{admin.username})</span>
                              </div>
                              <p className="text-xs text-[#8696a0]">
                                Assigned Accounts: {assignedAccounts.length} / {accounts.length}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedAdminForAssign(admin)}
                              className="px-2.5 py-1 text-xs bg-[#202c33] hover:bg-[#2a3942] text-emerald-400 rounded border border-[#2a3942] transition-colors flex items-center gap-1"
                            >
                              <Link2 size={12} />
                              Assign Accounts
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(admin.id, admin.displayName)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Delete Admin"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Accounts belonging to this Admin */}
                        <div className="pl-4 border-l-2 border-[#2a3942] space-y-2 mt-2">
                          {assignedAccounts.length === 0 ? (
                            <p className="text-xs text-[#667781] italic">No accounts assigned yet</p>
                          ) : (
                            assignedAccounts.map(acc => (
                              <div
                                key={acc.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-[#182229] border border-[#222d34] text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${
                                    acc.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`} />
                                  <span className="font-mono text-[#e9edef]">{acc.phoneNumber || 'Unknown'}</span>
                                  {acc.displayName && (
                                    <span className="text-[#8696a0]">({acc.displayName})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-[#8696a0]">
                                    Chats: {acc.chatCount ?? 0}
                                  </span>
                                  {onSelectAccount && (
                                    <button
                                      onClick={() => {
                                        onSelectAccount(acc);
                                        onClose();
                                      }}
                                      className="text-emerald-400 hover:underline flex items-center gap-1"
                                    >
                                      <Eye size={12} />
                                      View Chats
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : activeTab === 'admins' ? (
            /* Admin Management Tab */
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#e9edef]">Admin Users</h3>
                  <p className="text-xs text-[#8696a0]">Create sub-admin logins with isolated account access</p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow transition-colors"
                >
                  <Plus size={16} />
                  New Admin
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {admins.map(admin => (
                  <div
                    key={admin.id}
                    className="p-5 bg-[#182229] border border-[#2a3942] rounded-xl flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          admin.role === 'SUPER_ADMIN'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {admin.role}
                        </span>
                        {admin.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.displayName)}
                            className="text-[#8696a0] hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-[#e9edef] mt-2">{admin.displayName}</h4>
                      <p className="text-xs text-[#8696a0]">Username: @{admin.username}</p>
                    </div>

                    <div className="pt-3 border-t border-[#222d34] flex items-center justify-between text-xs">
                      <span className="text-[#8696a0]">
                        {admin.role === 'SUPER_ADMIN'
                          ? 'Full Root Access'
                          : `${(admin.accountIds || []).length} account(s) accessible`}
                      </span>
                      {admin.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => setSelectedAdminForAssign(admin)}
                          className="text-emerald-400 hover:underline font-medium"
                        >
                          Manage Access &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'accounts' ? (
            /* Accounts Overview Tab */
            <div className="space-y-4 max-w-4xl mx-auto">
              <h3 className="text-base font-semibold text-[#e9edef]">Accounts Across All Admins</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accounts.map(acc => {
                  const assignedTo = admins.filter(a => (a.accountIds || []).includes(acc.id)).map(a => a.displayName);
                  return (
                    <div
                      key={acc.id}
                      className="p-4 bg-[#182229] border border-[#2a3942] rounded-xl flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            acc.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          <span className="font-mono text-sm font-semibold text-[#e9edef]">{acc.phoneNumber || 'Pending Link'}</span>
                        </div>
                        <p className="text-xs text-[#8696a0]">
                          Name: {acc.displayName || 'Default Account'}
                        </p>
                        <p className="text-[11px] text-[#667781]">
                          Assigned to: {assignedTo.length > 0 ? assignedTo.join(', ') : 'Super Admin only'}
                        </p>
                      </div>
                      {onSelectAccount && (
                        <button
                          onClick={() => {
                            onSelectAccount(acc);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-[#202c33] hover:bg-[#2a3942] text-emerald-400 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Switch &rarr;
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Database & Backup Compliance View */
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Card 1: Safe SQLite Snapshot */}
              <div className="p-5 bg-[#1f2c34] border border-[#2a3942] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Database size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#e9edef] text-base">
                      Atomic SQLite Database Snapshot (VACUUM INTO)
                    </h3>
                    <p className="text-xs text-[#8696a0] max-w-xl mt-1">
                      Checkpoints Write-Ahead Logging (WAL) and creates a 100% consistent, defragmented, and uncorrupted snapshot of <code className="text-emerald-400">database.db</code> for cold storage and disaster recovery.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadDatabase}
                  disabled={downloadingDb}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-colors disabled:opacity-50"
                >
                  {downloadingDb ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Checkpointing...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Download .db Snapshot</span>
                    </>
                  )}
                </button>
              </div>

              {/* Card 2: Export Audit Trail Table */}
              <div className="bg-[#1f2c34] border border-[#2a3942] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#2a3942] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-emerald-400" />
                    <h3 className="font-semibold text-[#e9edef] text-sm">
                      Export Audit Trail &amp; Data Compliance Logs
                    </h3>
                  </div>
                  <button
                    onClick={loadExportLogs}
                    className="p-1.5 hover:bg-[#2a3942] rounded-md text-[#8696a0] hover:text-white"
                    title="Refresh logs"
                  >
                    <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#111b21] text-[#8696a0] border-b border-[#2a3942]">
                      <tr>
                        <th className="p-3 font-semibold">Timestamp</th>
                        <th className="p-3 font-semibold">User</th>
                        <th className="p-3 font-semibold">Account</th>
                        <th className="p-3 font-semibold">Format</th>
                        <th className="p-3 font-semibold">Scope</th>
                        <th className="p-3 font-semibold">PII Masked</th>
                        <th className="p-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3942]">
                      {exportLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-[#8696a0]">
                            No export activity recorded yet.
                          </td>
                        </tr>
                      ) : (
                        exportLogs.map(log => (
                          <tr key={log.id} className="hover:bg-[#202c33] transition-colors">
                            <td className="p-3 text-[#e9edef] font-mono whitespace-nowrap">
                              {formatIndianDateTime(log.createdAt)}
                            </td>
                            <td className="p-3 text-[#e9edef]">
                              {log.username} <span className="text-[10px] text-[#8696a0]">({log.userRole})</span>
                            </td>
                            <td className="p-3 font-mono text-emerald-400">
                              {log.accountId}
                            </td>
                            <td className="p-3 uppercase font-bold text-xs">
                              {log.format}
                            </td>
                            <td className="p-3 capitalize text-[#8696a0]">
                              {log.scope}
                            </td>
                            <td className="p-3">
                              {log.piiRedacted ? (
                                <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold">YES</span>
                              ) : (
                                <span className="text-[#8696a0] text-[10px]">NO</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                                {log.status}
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


        {/* Footer */}
        <div className="px-6 py-3 bg-[#202c33] border-t border-[#2a3942] flex items-center justify-between text-xs text-[#8696a0]">
          <span>Security status: AES-256 local encrypted storage &bull; Zero Meta Cloud exposure</span>
          <span>Logged in as Super Admin</span>
        </div>
      </div>

      {/* Modal: Create New Admin */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
              <h3 className="font-bold text-[#e9edef] flex items-center gap-2">
                <Users size={18} className="text-emerald-400" />
                Create New Admin
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8696a0] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8696a0] mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Support Team"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8696a0] mb-1">Username</label>
                <input
                  type="text"
                  placeholder="e.g. sales_admin"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8696a0] mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#111b21] border border-[#2a3942] rounded-lg px-3 py-2 text-sm text-[#e9edef] focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-[#8696a0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Accounts to Admin */}
      {selectedAdminForAssign && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
              <div>
                <h3 className="font-bold text-[#e9edef]">
                  Exclusive Account Allocation: {selectedAdminForAssign.displayName}
                </h3>
                <p className="text-xs text-[#8696a0]">
                  Allocate dedicated accounts exclusively to this admin (Strict 1 Account = 1 Admin Policy)
                </p>
              </div>
              <button onClick={() => setSelectedAdminForAssign(null)} className="text-[#8696a0] hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Strict 1-to-1 Exclusivity Banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 text-xs text-emerald-400 flex items-start gap-2">
              <Shield size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>Strict 1-to-1 Exclusivity:</strong> An account can only belong to <strong>one admin</strong>. Admins work in total isolation. If an account is already allocated to another admin, selecting it will automatically and cleanly transfer it to this admin.
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {accounts.length === 0 ? (
                <p className="text-xs text-[#8696a0]">No accounts available to assign.</p>
              ) : (
                accounts.map(acc => {
                  const isAssigned = (selectedAdminForAssign.accountIds || []).includes(acc.id);
                  const otherAdmin = admins.find(a => a.id !== selectedAdminForAssign.id && (a.accountIds || []).includes(acc.id));

                  return (
                    <div
                      key={acc.id}
                      onClick={() => toggleAccountAssignment(selectedAdminForAssign.id, acc.id, isAssigned)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        isAssigned
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-[#e9edef]'
                          : otherAdmin
                            ? 'bg-amber-500/5 border-amber-500/30 text-[#8696a0] hover:border-amber-500/50'
                            : 'bg-[#111b21] border-[#2a3942] text-[#8696a0] hover:border-[#374248]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone size={16} className={isAssigned ? 'text-emerald-400' : otherAdmin ? 'text-amber-400' : 'text-[#8696a0]'} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-[#e9edef] font-mono">{acc.phoneNumber || acc.id}</p>
                            {isAssigned && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                Dedicated to this Admin
                              </span>
                            )}
                            {otherAdmin && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                                Allocated to @{otherAdmin.displayName || otherAdmin.username}
                              </span>
                            )}
                            {!isAssigned && !otherAdmin && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#202c33] text-[#8696a0]">
                                Available
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#8696a0]">
                            {acc.displayName || 'Default Account'}
                            {otherAdmin && ' • Click to reassign exclusively'}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => {}} // handled by row onClick
                        className="accent-emerald-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAdminForAssign(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
