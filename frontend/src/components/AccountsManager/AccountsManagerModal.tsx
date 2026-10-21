import React, { useState, useMemo } from 'react';
import {
  X, Search, Plus, Trash2, RefreshCw, QrCode,
  Check, Power, MessageSquare, AlertCircle, Smartphone,
  Users, CheckCircle2,
} from 'lucide-react';
import { Account, accountsApi, whatsappWebApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import './AccountsManagerModal.css';

interface AccountsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  activeAccount: Account | null;
  onSelectAccount: (account: Account) => void;
  onRefreshAccounts: () => void;
  onOpenQR: (account: Account) => void;
  tenantId: string;
}

export default function AccountsManagerModal({
  isOpen,
  onClose,
  accounts,
  activeAccount,
  onSelectAccount,
  onRefreshAccounts,
  onOpenQR,
  tenantId,
}: AccountsManagerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const activeCount = accounts.filter(a => a.status === 'CONNECTED').length;
  const inactiveCount = accounts.filter(a => a.status !== 'CONNECTED').length;

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchesSearch =
        (acc.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.phoneNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'active') return acc.status === 'CONNECTED';
      if (filterTab === 'inactive') return acc.status !== 'CONNECTED';
      return true;
    });
  }, [accounts, searchTerm, filterTab]);

  // Create new account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) {
      addToast('error', 'Please enter an account name / label');
      return;
    }

    setCreating(true);
    try {
      const created = await accountsApi.create({
        displayName: newAccountName.trim(),
        phoneNumber: newPhoneNumber.trim() || undefined,
        tenantId,
      });

      addToast('success', `Account "${created.displayName}" created!`);
      setNewAccountName('');
      setNewPhoneNumber('');
      setShowAddForm(false);
      onRefreshAccounts();

      // Immediately launch QR scanner for this new account
      onOpenQR(created);
    } catch (err: any) {
      console.error('Failed to create account:', err);
      addToast('error', err?.response?.data?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  // Reconnect account
  const handleReconnect = async (account: Account) => {
    setLoadingActionId(account.id);
    try {
      addToast('info', `Reconnecting ${account.displayName || account.phoneNumber}...`);
      await whatsappWebApi.reconnect(account.id);
      addToast('success', 'Reconnection initiated');
      setTimeout(onRefreshAccounts, 1500);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to reconnect');
    } finally {
      setLoadingActionId(null);
    }
  };

  // Disconnect / Logout account
  const handleLogout = async (account: Account) => {
    if (!window.confirm(`Are you sure you want to disconnect "${account.displayName || account.phoneNumber}"?`)) {
      return;
    }

    setLoadingActionId(account.id);
    try {
      await whatsappWebApi.logout(account.id);
      addToast('info', `Account "${account.displayName || account.phoneNumber}" disconnected`);
      setTimeout(onRefreshAccounts, 1000);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Failed to disconnect');
    } finally {
      setLoadingActionId(null);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Delete account completely from DB
  const handleDelete = async (account: Account) => {
    if (confirmDeleteId !== account.id) {
      setConfirmDeleteId(account.id);
      addToast('info', `Click "Confirm?" to permanently delete "${account.displayName || account.phoneNumber}"`);
      return;
    }

    setConfirmDeleteId(null);
    setLoadingActionId(account.id);
    try {
      await accountsApi.delete(account.id);
      addToast('success', `Account "${account.displayName || account.phoneNumber}" deleted successfully`);
      onRefreshAccounts();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      addToast('error', err?.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoadingActionId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="wa-acc-modal-overlay" onClick={onClose}>
      <div className="wa-acc-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="wa-acc-header">
          <div className="wa-acc-title-wrap">
            <div className="wa-acc-title">
              <Users size={20} color="#00a884" />
              <span>Account Manager</span>
              <span className="wa-acc-counter-pill">
                {accounts.length} / 60 Accounts
              </span>
            </div>
          </div>
          <button className="wa-acc-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="wa-acc-toolbar">
          {/* Search Box */}
          <div className="wa-acc-search-box">
            <Search size={16} color="#8696a0" />
            <input
              type="text"
              className="wa-acc-search-input"
              placeholder="Search by account name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ background: 'transparent', border: 'none', color: '#8696a0', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="wa-acc-filter-tabs">
            <button
              className={`wa-acc-filter-tab ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All ({accounts.length})
            </button>
            <button
              className={`wa-acc-filter-tab ${filterTab === 'active' ? 'active' : ''}`}
              onClick={() => setFilterTab('active')}
            >
              🟢 Active ({activeCount})
            </button>
            <button
              className={`wa-acc-filter-tab ${filterTab === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilterTab('inactive')}
            >
              🔴 Inactive ({inactiveCount})
            </button>
          </div>

          {/* Add Account Trigger — Super Admin only */}
          {isSuperAdmin && (
            <button
              className="wa-acc-add-btn"
              onClick={() => setShowAddForm(prev => !prev)}
            >
              <Plus size={16} />
              <span>{showAddForm ? 'Cancel' : 'Add Account'}</span>
            </button>
          )}
        </div>

        {/* Add Account Inline Form */}
        {showAddForm && (
          <div className="wa-acc-add-form-container">
            <form onSubmit={handleCreateAccount} className="wa-acc-add-form">
              <div className="wa-acc-input-group">
                <label>Account Name / Label *</label>
                <input
                  type="text"
                  className="wa-acc-input"
                  placeholder="e.g. Sales Team #2, Support Desk, Personal"
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="wa-acc-input-group">
                <label>Phone Number (Optional - detected automatically on QR scan)</label>
                <input
                  type="text"
                  className="wa-acc-input"
                  placeholder="e.g. +91 98765 43210 (or leave blank)"
                  value={newPhoneNumber}
                  onChange={e => setNewPhoneNumber(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="wa-acc-btn-primary"
                disabled={creating}
                style={{ padding: '8px 20px', height: 38 }}
              >
                {creating ? <RefreshCw size={15} className="spin" /> : <QrCode size={15} />}
                <span>Create & Link Device (QR)</span>
              </button>
            </form>
          </div>
        )}

        {/* Cards Grid */}
        <div className="wa-acc-body">
          {filteredAccounts.length === 0 ? (
            <div className="wa-acc-empty">
              <AlertCircle size={40} color="#8696a0" />
              <h4>No accounts found</h4>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {searchTerm
                  ? 'Try a different search query'
                  : isSuperAdmin
                  ? 'Click "Add Account" above to link a new phone.'
                  : 'No accounts have been allocated to your account yet. Contact Super Admin to allocate accounts.'}
              </p>
            </div>
          ) : (
            <div className="wa-acc-grid">
              {filteredAccounts.map(account => {
                const isCurrent = activeAccount?.id === account.id;
                const isConnected = account.status === 'CONNECTED';
                const isReconnecting = account.status === 'RECONNECTING';
                const isLoading = loadingActionId === account.id;

                const displayName = account.displayName || 'Account';
                const phoneDisplay = account.phoneNumber?.startsWith('pending_')
                  ? 'Awaiting QR Scan'
                  : account.phoneNumber;

                return (
                  <div
                    key={account.id}
                    className={`wa-acc-card ${isCurrent ? 'current' : ''}`}
                  >
                    {/* Top Row: Avatar + Info */}
                    <div className="wa-acc-card-top">
                      <div className="wa-acc-avatar">
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      <div className="wa-acc-card-info">
                        <div className="wa-acc-name-row">
                          <span className="wa-acc-name" title={displayName}>
                            {displayName}
                          </span>
                          {isCurrent && (
                            <span className="wa-acc-current-badge">
                              CURRENT
                            </span>
                          )}
                        </div>

                        <div className="wa-acc-phone">{phoneDisplay}</div>

                        {/* Status Badge */}
                        <div
                          className={`wa-acc-status-pill ${
                            isConnected ? 'active' : isReconnecting ? 'reconnecting' : 'inactive'
                          }`}
                        >
                          <span
                            className={`wa-acc-status-dot ${
                              isConnected ? 'active' : isReconnecting ? 'reconnecting' : 'inactive'
                            }`}
                          />
                          <span>
                            {isConnected ? 'ACTIVE (ONLINE)' : isReconnecting ? 'PAIRING' : 'INACTIVE (OFFLINE)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="wa-acc-card-stats">
                      <div>
                        Chats: <strong>{account.chatCount ?? 0}</strong>
                      </div>
                      <div>
                        Unread: <strong>{account.unreadCount ?? 0}</strong>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="wa-acc-card-actions">
                      {/* Primary switch / view button */}
                      {!isCurrent ? (
                        <button
                          className="wa-acc-btn-primary"
                          onClick={() => {
                            onSelectAccount(account);
                            onClose();
                          }}
                        >
                          <Check size={14} />
                          <span>Switch to this</span>
                        </button>
                      ) : (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            color: '#00a884',
                            fontWeight: 600,
                            padding: '7px 10px',
                          }}
                        >
                          <CheckCircle2 size={15} />
                          <span>Currently Viewing</span>
                        </div>
                      )}

                      {/* Link QR Button if disconnected or unlinked */}
                      {!isConnected && (
                        <button
                          className="wa-acc-btn-secondary"
                          onClick={() => {
                            onOpenQR(account);
                          }}
                          title="Scan QR Code to Link"
                        >
                          <QrCode size={14} />
                          <span>Scan QR</span>
                        </button>
                      )}

                      {/* Reconnect button if disconnected but previously linked */}
                      {!isConnected && !account.phoneNumber?.startsWith('pending_') && (
                        <button
                          className="wa-acc-btn-secondary"
                          onClick={() => handleReconnect(account)}
                          disabled={isLoading}
                          title="Reconnect Account"
                        >
                          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
                        </button>
                      )}

                      {/* Disconnect button if connected */}
                      {isConnected && (
                        <button
                          className="wa-acc-btn-secondary"
                          onClick={() => handleLogout(account)}
                          disabled={isLoading}
                          title="Disconnect / Pause Session"
                        >
                          <Power size={14} />
                        </button>
                      )}

                      {/* Delete button — Super Admin only */}
                      {isSuperAdmin && (
                        <button
                          className="wa-acc-btn-icon-danger"
                          onClick={() => handleDelete(account)}
                          disabled={isLoading}
                          title={confirmDeleteId === account.id ? 'Click to permanently delete' : 'Delete Account'}
                          style={confirmDeleteId === account.id ? { background: '#f15c6d', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 } : {}}
                        >
                          {confirmDeleteId === account.id ? 'Confirm?' : <Trash2 size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
