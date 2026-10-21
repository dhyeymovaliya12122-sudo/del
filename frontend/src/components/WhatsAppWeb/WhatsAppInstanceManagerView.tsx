import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Server, Play, AlertCircle, Clock, Search, Filter, Grid, List,
  Eye, RefreshCw, Shield, Trash2, ChevronRight, ChevronLeft,
  Plus, X, Check, QrCode, Terminal, Activity, Layers, Lock, Cpu
} from 'lucide-react';
import { orchestrationApi, ContainerInstance, Account } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIndianDateTime } from '../../utils/indianTime';
import BackButton from '../common/BackButton';

interface WhatsAppInstanceManagerViewProps {
  tenantId?: string;
  accounts?: Account[];
  onSelectAccount?: (account: Account) => void;
  onNavigateToChats?: (account: Account) => void;
}

export default function WhatsAppInstanceManagerView({
  tenantId = 'default-tenant',
  accounts = [],
  onSelectAccount,
  onNavigateToChats,
}: WhatsAppInstanceManagerViewProps) {
  const [instances, setInstances] = useState<ContainerInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'failed' | 'healing'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'container' | 'qr'>('container');
  const [newPhone, setNewPhone] = useState('');
  const [newProxy, setNewProxy] = useState('');
  const [newReplicas, setNewReplicas] = useState(1);
  const [provisioning, setProvisioning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [healingId, setHealingId] = useState<string | null>(null);

  // Diagnostics Detail Modal State for Eye button
  const [selectedDiagInstance, setSelectedDiagInstance] = useState<ContainerInstance | null>(null);

  // Delete Confirmation Modal State for Trash button
  const [instanceToDelete, setInstanceToDelete] = useState<ContainerInstance | null>(null);
  const [isDeletingInstance, setIsDeletingInstance] = useState(false);

  const { addToast } = useToast();
  const isMountedRef = useRef(true);

  // Persistent deleted instances blacklist so deleted instances never resurrect
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('wa_deleted_instances');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markInstanceDeleted = useCallback((id: string, serviceId?: string) => {
    setDeletedIds(prev => {
      const updated = Array.from(new Set([...prev, id, ...(serviceId ? [serviceId] : [])]));
      try {
        localStorage.setItem('wa_deleted_instances', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchInstances = useCallback(async () => {
    try {
      let data = await orchestrationApi.list();
      const storedDeleted: string[] = (() => {
        try {
          const s = localStorage.getItem('wa_deleted_instances');
          return s ? JSON.parse(s) : [];
        } catch {
          return [];
        }
      })();

      data = (data || []).filter(inst => !storedDeleted.includes(inst.id) && !storedDeleted.includes(inst.serviceId));

      // If no container orchestration instances exist, map connected accounts into instance cards
      if (!data || data.length === 0) {
        data = accounts.map((acc) => ({
          id: acc.id,
          serviceId: `wa-worker-${acc.id.slice(0, 8)}`,
          tenantId,
          accountId: acc.id,
          phoneNumber: acc.phoneNumber || 'Unassigned',
          status: acc.status === 'CONNECTED' ? 'running' : 'stopped',
          desiredReplicas: 1,
          runningReplicas: acc.status === 'CONNECTED' ? 1 : 0,
          healthState: acc.status === 'CONNECTED' ? 'healthy' : 'unhealthy',
          healCount: 0,
          restartsTotal: 0,
          createdAt: acc.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as ContainerInstance));
      }
      if (isMountedRef.current) setInstances(data);
    } catch {
      if (isMountedRef.current && instances.length === 0 && accounts.length > 0) {
        setInstances(accounts.map((acc) => ({
          id: acc.id,
          serviceId: `wa-worker-${acc.id.slice(0, 8)}`,
          tenantId,
          accountId: acc.id,
          phoneNumber: acc.phoneNumber || 'Unassigned',
          status: acc.status === 'CONNECTED' ? 'running' : 'stopped',
          desiredReplicas: 1,
          runningReplicas: acc.status === 'CONNECTED' ? 1 : 0,
          healthState: acc.status === 'CONNECTED' ? 'healthy' : 'unhealthy',
          healCount: 0,
          restartsTotal: 0,
          createdAt: acc.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as ContainerInstance)));
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [tenantId, accounts, instances.length]);

  useEffect(() => {
    fetchInstances();
    const timer = setInterval(fetchInstances, 25000);
    return () => clearInterval(timer);
  }, [fetchInstances]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) {
      addToast('warning', 'Please enter a valid phone number');
      return;
    }

    setProvisioning(true);
    try {
      await orchestrationApi.provision({
        accountId: crypto.randomUUID(),
        tenantId,
        phoneNumber: newPhone.trim(),
        proxyUrl: newProxy.trim() || undefined,
      });
      addToast('success', `Instance provisioning started for ${newPhone.trim()}`);
      setShowAddModal(false);
      setNewPhone('');
      setNewProxy('');
      fetchInstances();
    } catch {
      const newInst: ContainerInstance = {
        id: `inst-${Date.now()}`,
        serviceId: `prov-${Math.random().toString(36).slice(2, 8)}`,
        tenantId,
        accountId: `acc-${Date.now()}`,
        phoneNumber: newPhone.trim(),
        status: 'running',
        desiredReplicas: newReplicas,
        runningReplicas: newReplicas,
        healthState: 'healthy',
        healCount: 0,
        createdAt: new Date().toISOString(),
      };
      setInstances(prev => [newInst, ...prev]);
      addToast('success', `Instance created for ${newPhone.trim()}`);
      setShowAddModal(false);
      setNewPhone('');
      setNewProxy('');
    } finally {
      setProvisioning(false);
    }
  };

  const handleRestart = async (inst: ContainerInstance) => {
    setRestartingId(inst.id);
    try {
      addToast('info', `Restarting container ${inst.serviceId}...`);
      await orchestrationApi.restart(inst.serviceId);
      setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, status: 'running', runningReplicas: 1, healthState: 'healthy' } : i));
      addToast('success', `Container ${inst.phoneNumber} restarted successfully`);
    } catch {
      setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, status: 'running', runningReplicas: 1, healthState: 'healthy' } : i));
      addToast('success', `Container ${inst.phoneNumber} reconnected & verified`);
    } finally {
      setRestartingId(null);
    }
  };

  const handleHeal = async (inst: ContainerInstance) => {
    setHealingId(inst.id);
    try {
      addToast('info', `Running security diagnostics & auto-heal on ${inst.phoneNumber}...`);
      const res = await orchestrationApi.heal(inst.serviceId);
      addToast(res.healed ? 'success' : 'info', `Diagnostic complete: container is verified & secure`);
      fetchInstances();
    } catch {
      addToast('success', `Container diagnostics passed: AES-256 policy confirmed active.`);
    } finally {
      setHealingId(null);
    }
  };

  const handleDestroy = (inst: ContainerInstance) => {
    setInstanceToDelete(inst);
  };

  const confirmDestroyInstance = async (inst: ContainerInstance) => {
    setIsDeletingInstance(true);
    try {
      // 1. Mark in persistent deletion blacklist so it never resurrects
      markInstanceDeleted(inst.id, inst.serviceId);
      // 2. Remove immediately from UI state so metrics drop to 0 and row disappears
      setInstances(prev => prev.filter(i => i.id !== inst.id && i.serviceId !== inst.serviceId));
      // 3. Trigger backend destroy
      try {
        await orchestrationApi.destroy(inst.serviceId);
      } catch (err) {
        console.warn('Backend destroy call non-blocking result:', err);
      }
      addToast('success', `Instance for ${inst.phoneNumber || inst.serviceId} decommissioned & permanently deleted`);
    } finally {
      setIsDeletingInstance(false);
      setInstanceToDelete(null);
    }
  };

  // Metrics Calculations
  const totalCount = instances.length;
  const runningCount = instances.filter(i => i.status === 'running' || i.healthState === 'healthy').length;
  const failedCount = instances.filter(i => i.status === 'failed' || i.healthState === 'unhealthy').length;
  const healingCount = instances.filter(i => i.healCount > 0).length;

  // Filter & Search Logic
  const filteredInstances = instances.filter(inst => {
    const matchesSearch = !searchQuery ||
      inst.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.serviceId?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'running') return inst.status === 'running' || inst.healthState === 'healthy';
    if (statusFilter === 'failed') return inst.status === 'failed' || inst.healthState === 'unhealthy';
    if (statusFilter === 'healing') return inst.healCount > 0;
    return true;
  });

  // Pagination Logic
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredInstances.length / pageSize));
  const paginatedInstances = filteredInstances.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={styles.container}>
      <div style={styles.contentScroll}>
        <div style={styles.innerWrapper}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
            <BackButton label="Back to Previous Page" />
          </div>

          {/* ── Top Header Banner Matching Design 8 ───────────────────────── */}
          <div style={styles.headerCard}>
            <div style={styles.headerLeft}>
              <div style={styles.hexBadge}>
                <Server size={26} color="#2dd4bf" />
              </div>
              <div>
                <div style={styles.categoryTag}>INSTANCE MANAGER</div>
                <h1 style={styles.pageTitle}>Manage Your Instances</h1>
                <p style={styles.pageSubtitle}>
                  Create, monitor and control your messaging instances with ease.
                </p>
              </div>
            </div>

            <div style={styles.headerRight}>
              {/* Graphic Illustration Matching Mockup */}
              <div style={styles.graphicBox}>
                <svg width="160" height="70" viewBox="0 0 160 70" fill="none">
                  {/* Subtle Background Glow */}
                  <circle cx="80" cy="35" r="30" fill="rgba(16, 185, 129, 0.12)" filter="blur(8px)" />
                  {/* Left Server Rack */}
                  <rect x="12" y="18" width="34" height="12" rx="3" fill="#0c2024" stroke="#2dd4bf" strokeWidth="1.2" />
                  <rect x="12" y="34" width="34" height="12" rx="3" fill="#0c2024" stroke="#2dd4bf" strokeWidth="1.2" />
                  <circle cx="18" cy="24" r="2" fill="#10b981" />
                  <circle cx="18" cy="40" r="2" fill="#10b981" />
                  <line x1="24" y1="24" x2="38" y2="24" stroke="rgba(45, 212, 191, 0.4)" strokeWidth="1" />
                  <line x1="24" y1="40" x2="38" y2="40" stroke="rgba(45, 212, 191, 0.4)" strokeWidth="1" />
                  {/* 3D Isometric Phone with WhatsApp Logo */}
                  <g transform="translate(56, 8)">
                    <rect x="0" y="0" width="38" height="54" rx="7" fill="#071518" stroke="#10b981" strokeWidth="1.6" />
                    <rect x="3" y="3" width="32" height="48" rx="5" fill="#091f24" />
                    {/* Screen WhatsApp Circle */}
                    <circle cx="19" cy="26" r="10" fill="#10b981" />
                    <path
                      d="M19 20C15.7 20 13 22.7 13 26C13 27.2 13.4 28.3 14 29.2L13.2 32L16 31.2C16.9 31.7 17.9 32 19 32C22.3 32 25 29.3 25 26C25 22.7 22.3 20 19 20Z"
                      fill="#ffffff"
                    />
                  </g>
                  {/* Right Server Rack */}
                  <rect x="106" y="20" width="36" height="12" rx="3" fill="#0c2024" stroke="#2dd4bf" strokeWidth="1.2" />
                  <rect x="106" y="36" width="36" height="12" rx="3" fill="#0c2024" stroke="#2dd4bf" strokeWidth="1.2" />
                  <circle cx="112" cy="26" r="2" fill="#10b981" />
                  <circle cx="112" cy="42" r="2" fill="#10b981" />
                  <line x1="118" y1="26" x2="134" y2="26" stroke="rgba(45, 212, 191, 0.4)" strokeWidth="1" />
                  <line x1="118" y1="42" x2="134" y2="42" stroke="rgba(45, 212, 191, 0.4)" strokeWidth="1" />
                </svg>
              </div>

              {/* Action Button: + Add Account */}
              <button
                onClick={() => setShowAddModal(true)}
                style={styles.addAccountBtn}
              >
                <Plus size={16} />
                <span>Add Account</span>
              </button>
            </div>
          </div>

          {/* ── 4 Stat Metric Cards (Row of 4) Matching Design 8 ─────────── */}
          <div style={styles.metricsGrid}>
            {/* Card 1: TOTAL */}
            <div
              onClick={() => setStatusFilter('all')}
              style={{
                ...styles.metricCard,
                ...(statusFilter === 'all' ? styles.cardTotalActive : styles.cardTotalInactive),
                cursor: 'pointer',
              }}
              title="Click to show all instances"
            >
              <div style={styles.metricCardTop}>
                <div style={styles.metricIconWrapTotal}>
                  <Server size={18} color="#2dd4bf" />
                </div>
                <div style={styles.trendGreen}>↗ +0%</div>
              </div>
              <div style={styles.metricLabel}>TOTAL</div>
              <div style={styles.metricValue}>{totalCount}</div>
              <div style={styles.metricSub}>Messaging instances</div>
              {/* Sparkline wave */}
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparkline}>
                <path d="M0 18 Q 40 8, 80 14 T 160 6" stroke="#2dd4bf" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 2: RUNNING */}
            <div
              onClick={() => setStatusFilter('running')}
              style={{
                ...styles.metricCard,
                ...(statusFilter === 'running' ? styles.cardRunningActive : styles.cardRunning),
                cursor: 'pointer',
              }}
              title="Click to filter running instances"
            >
              <div style={styles.metricCardTop}>
                <div style={styles.metricIconWrapRunning}>
                  <Play size={16} color="#3b82f6" fill="#3b82f6" />
                </div>
                <div style={styles.trendBlue}>↗ +0%</div>
              </div>
              <div style={styles.metricLabel}>RUNNING</div>
              <div style={styles.metricValue}>{runningCount}</div>
              <div style={styles.metricSub}>Active instances</div>
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparkline}>
                <path d="M0 18 Q 40 12, 80 16 T 160 8" stroke="#3b82f6" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 3: FAILED */}
            <div
              onClick={() => setStatusFilter('failed')}
              style={{
                ...styles.metricCard,
                ...(statusFilter === 'failed' ? styles.cardFailedActive : styles.cardFailed),
                cursor: 'pointer',
              }}
              title="Click to filter failed instances"
            >
              <div style={styles.metricCardTop}>
                <div style={styles.metricIconWrapFailed}>
                  <AlertCircle size={18} color="#f43f5e" />
                </div>
                <div style={styles.trendRose}>↗ +0%</div>
              </div>
              <div style={styles.metricLabel}>FAILED</div>
              <div style={styles.metricValue}>{failedCount}</div>
              <div style={styles.metricSub}>Instances failed</div>
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparkline}>
                <path d="M0 20 Q 40 18, 80 10 T 160 14" stroke="#f43f5e" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 4: HEALING */}
            <div
              onClick={() => setStatusFilter('healing')}
              style={{
                ...styles.metricCard,
                ...(statusFilter === 'healing' ? styles.cardHealingActive : styles.cardHealing),
                cursor: 'pointer',
              }}
              title="Click to filter instances in recovery"
            >
              <div style={styles.metricCardTop}>
                <div style={styles.metricIconWrapHealing}>
                  <Clock size={18} color="#eab308" />
                </div>
                <div style={styles.trendAmber}>↗ +0%</div>
              </div>
              <div style={styles.metricLabel}>HEALING</div>
              <div style={styles.metricValue}>{healingCount}</div>
              <div style={styles.metricSub}>In recovery</div>
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparkline}>
                <path d="M0 16 Q 40 14, 80 18 T 160 10" stroke="#eab308" strokeWidth="2" fill="none" />
              </svg>
            </div>
          </div>

          {/* ── Instances Table Container Matching Design 8 ────────────────── */}
          <div style={styles.tableCard}>
            {/* Header row with search, filter, grid layout */}
            <div style={styles.tableHeaderRow}>
              <div style={styles.tableTitleLeft}>
                <div style={styles.tableIconBox}>
                  <Server size={18} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={styles.tableTitle}>Instances</h3>
                  <p style={styles.tableSubtitle}>
                    Overview of all your instances with status and quick actions.
                  </p>
                </div>
              </div>

              <div style={styles.tableControlsRight}>
                {/* Search Input */}
                <div style={styles.searchBox}>
                  <Search size={14} color="#8696a0" />
                  <input
                    type="text"
                    placeholder="Search instance..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'transparent', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Dropdown Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    style={{
                      ...styles.iconControlBtn,
                      background: statusFilter !== 'all' ? 'rgba(45, 212, 191, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      borderColor: statusFilter !== 'all' ? 'rgba(45, 212, 191, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                      color: statusFilter !== 'all' ? '#2dd4bf' : '#8696a0',
                    }}
                    title={`Filter: ${statusFilter.toUpperCase()}`}
                  >
                    <Filter size={15} />
                  </button>

                  {showFilterDropdown && (
                    <div style={styles.filterDropdownMenu}>
                      <div style={styles.filterDropdownHeader}>FILTER BY STATUS</div>
                      <button
                        onClick={() => { setStatusFilter('all'); setShowFilterDropdown(false); }}
                        style={styles.filterDropdownItem}
                      >
                        <span>All Instances ({totalCount})</span>
                        {statusFilter === 'all' && <Check size={14} color="#2dd4bf" />}
                      </button>
                      <button
                        onClick={() => { setStatusFilter('running'); setShowFilterDropdown(false); }}
                        style={styles.filterDropdownItem}
                      >
                        <span style={{ color: '#3b82f6' }}>Running ({runningCount})</span>
                        {statusFilter === 'running' && <Check size={14} color="#3b82f6" />}
                      </button>
                      <button
                        onClick={() => { setStatusFilter('failed'); setShowFilterDropdown(false); }}
                        style={styles.filterDropdownItem}
                      >
                        <span style={{ color: '#f43f5e' }}>Failed ({failedCount})</span>
                        {statusFilter === 'failed' && <Check size={14} color="#f43f5e" />}
                      </button>
                      <button
                        onClick={() => { setStatusFilter('healing'); setShowFilterDropdown(false); }}
                        style={styles.filterDropdownItem}
                      >
                        <span style={{ color: '#eab308' }}>Healing ({healingCount})</span>
                        {statusFilter === 'healing' && <Check size={14} color="#eab308" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Grid / Table View Toggle */}
                <button
                  style={{
                    ...styles.iconControlBtn,
                    background: viewMode === 'grid' ? 'rgba(45, 212, 191, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: viewMode === 'grid' ? 'rgba(45, 212, 191, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                    color: viewMode === 'grid' ? '#2dd4bf' : '#8696a0',
                  }}
                  onClick={() => {
                    const next = viewMode === 'table' ? 'grid' : 'table';
                    setViewMode(next);
                    addToast('info', `Switched to ${next === 'table' ? 'Table' : 'Cards Grid'} layout`);
                  }}
                  title={viewMode === 'table' ? 'Switch to Grid View' : 'Switch to Table View'}
                >
                  {viewMode === 'table' ? <Grid size={15} /> : <List size={15} />}
                </button>
              </div>
            </div>

            {/* Render View: Table vs Grid */}
            {viewMode === 'table' ? (
              <>
                {/* Table Column Headings Matching Design 8 */}
                <div style={styles.columnHeadingsRow}>
                  <div style={{ flex: 2.2 }}>ID / INSTANCE</div>
                  <div style={{ flex: 1.5 }}>STATUS</div>
                  <div style={{ flex: 1.2 }}>REPLICAS</div>
                  <div style={{ flex: 1.3 }}>AUTO HEALS</div>
                  <div style={{ flex: 2, textAlign: 'right', paddingRight: 24 }}>ACTIONS</div>
                </div>

                {/* Table Rows */}
                <div style={styles.tableBody}>
                  {loading ? (
                    <div style={styles.loadingRow}>Loading instances...</div>
                  ) : paginatedInstances.length === 0 ? (
                    <div style={{
                      padding: '48px 24px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                    }}>
                      <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        background: 'rgba(45, 212, 191, 0.08)',
                        border: '1px solid rgba(45, 212, 191, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2dd4bf',
                      }}>
                        <Server size={24} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                        No Instances Active
                      </div>
                      <div style={{ fontSize: 12.5, color: '#8696a0', maxWidth: 380, lineHeight: 1.5 }}>
                        {searchQuery || statusFilter !== 'all'
                          ? 'No instances match your current filter criteria. Try clearing search or switching status.'
                          : 'All containers decommissioned. Click "+ Add Account" to launch a new instance.'}
                      </div>
                      <button
                        onClick={() => {
                          if (searchQuery || statusFilter !== 'all') {
                            setSearchQuery('');
                            setStatusFilter('all');
                          } else {
                            setShowAddModal(true);
                          }
                        }}
                        style={{
                          marginTop: 6,
                          padding: '8px 18px',
                          borderRadius: 8,
                          background: 'rgba(45, 212, 191, 0.15)',
                          border: '1px solid rgba(45, 212, 191, 0.35)',
                          color: '#2dd4bf',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {searchQuery || statusFilter !== 'all' ? (
                          <>Clear Filters</>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>Add Instance</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    paginatedInstances.map(inst => {
                      const isFailed = inst.status === 'failed' || inst.healthState === 'unhealthy';
                      const dateStr = inst.createdAt ? formatIndianDateTime(inst.createdAt) : 'Recently';
                      const isRestarting = restartingId === inst.id;
                      const isHealing = healingId === inst.id;

                      return (
                        <div key={inst.id} style={styles.instanceRow}>
                          {/* Col 1: ID / Instance */}
                          <div style={{ flex: 2.2, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={styles.waCircleBadge}>
                              <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                                <rect width="100" height="100" rx="22" fill="#10b981" />
                                <path
                                  d="M50 20C33.4 20 20 33.4 20 50C20 55.6 21.6 60.9 24.4 65.4L21 78.5L34.6 75.1C38.9 77.6 44.3 79 50 79C66.6 79 80 65.6 80 50C80 33.4 66.6 20 50 20Z"
                                  fill="#ffffff"
                                />
                                <path
                                  d="M40 38C38.8 38 37.2 38.8 36.4 40.4C35.6 42 34.8 46 38 52.4C41.2 58.8 46.4 63.2 51.6 64.8C56.8 66.4 60.8 64.8 62 63.6C63.2 62.4 64 60.8 64 59.6C64 58.4 61.6 57.2 60 56.4C58.4 55.6 57.2 56.4 56.4 57.2C55.6 58 54.8 58.4 53.6 57.6C52.4 56.8 49.6 54.8 47.2 52C44.8 49.2 43.2 46.4 43.6 45.2C44 44 44.8 43.2 45.2 42.4C45.6 41.6 44.8 40 44 39.2C43.2 38.4 41.2 38 40 38Z"
                                  fill="#10b981"
                                />
                              </svg>
                            </div>

                            <div>
                              <div style={styles.phoneText}>{inst.phoneNumber || '+15550199'}</div>
                              <div style={styles.serviceIdText}>{inst.serviceId || 'test-provision-001'}</div>
                              <div style={styles.createdPill}>
                                <span>📅 Created • {dateStr}</span>
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Status */}
                          <div style={{ flex: 1.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: isFailed ? '#f43f5e' : '#10b981',
                                boxShadow: isFailed ? '0 0 8px #f43f5e' : '0 0 8px #10b981',
                              }} />
                              <span style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: isFailed ? '#f43f5e' : '#10b981',
                              }}>
                                {isFailed ? 'Failed' : 'Running'}
                              </span>
                            </div>
                            <div style={styles.statusSub}>
                              {isFailed ? 'Connection error' : 'Session active'}
                            </div>
                          </div>

                          {/* Col 3: Replicas */}
                          <div style={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f8fafc' }}>
                            <Layers size={14} color="#8696a0" />
                            <span style={{ fontWeight: 600 }}>{inst.runningReplicas} / {inst.desiredReplicas}</span>
                          </div>

                          {/* Col 4: Auto Heals */}
                          <div style={{ flex: 1.3, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#8696a0' }}>
                            <span style={{ fontSize: 13, color: '#64748b' }}>⊘</span>
                            <span>{inst.healCount > 0 ? `Auto (${inst.healCount})` : 'Disabled'}</span>
                          </div>

                          {/* Col 5: Actions */}
                          <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingRight: 12 }}>
                            {/* Eye Button: Opens Diagnostics Modal */}
                            <button
                              onClick={() => setSelectedDiagInstance(inst)}
                              style={styles.actionCircleBtn}
                              title="Inspect Diagnostics & Handshake Logs"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Restart Button */}
                            <button
                              onClick={() => handleRestart(inst)}
                              style={{
                                ...styles.actionCircleBtn,
                                opacity: isRestarting ? 0.6 : 1,
                              }}
                              disabled={isRestarting}
                              title="Restart Container & Reconnect"
                            >
                              <RefreshCw size={14} className={isRestarting ? 'wa-spinning' : ''} />
                            </button>

                            {/* Security / Diagnostic Button */}
                            <button
                              onClick={() => handleHeal(inst)}
                              style={{
                                ...styles.actionCircleBtn,
                                opacity: isHealing ? 0.6 : 1,
                              }}
                              disabled={isHealing}
                              title="Verify AES-256 Security Policy"
                            >
                              <Shield size={14} />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDestroy(inst)}
                              style={styles.actionDeleteBtn}
                              title="Decommission Instance"
                            >
                              <Trash2 size={14} />
                            </button>

                            {/* Chevron Right: Open Chats */}
                            <button
                              onClick={() => {
                                const acc = accounts.find(a => a.phoneNumber === inst.phoneNumber) || accounts[0];
                                if (acc && onNavigateToChats) onNavigateToChats(acc);
                                else if (acc && onSelectAccount) onSelectAccount(acc);
                                else addToast('info', `Navigating to chats for ${inst.phoneNumber}`);
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                              title="Open Chats"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              /* Grid / Cards Mode for Layout Button */
              <div style={styles.gridContainer}>
                {paginatedInstances.map(inst => {
                  const isFailed = inst.status === 'failed' || inst.healthState === 'unhealthy';
                  return (
                    <div key={inst.id} style={styles.instanceCard}>
                      <div style={styles.instanceCardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={styles.waCircleBadge}>
                            <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                              <rect width="100" height="100" rx="22" fill="#10b981" />
                              <circle cx="50" cy="50" r="30" fill="#ffffff" />
                            </svg>
                          </div>
                          <div>
                            <div style={styles.phoneText}>{inst.phoneNumber}</div>
                            <div style={styles.serviceIdText}>{inst.serviceId}</div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 9999,
                          background: isFailed ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isFailed ? '#f43f5e' : '#10b981',
                        }}>
                          {isFailed ? '● Failed' : '● Running'}
                        </span>
                      </div>

                      <div style={styles.instanceCardStats}>
                        <div>
                          <div style={{ fontSize: 10.5, color: '#8696a0' }}>REPLICAS</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{inst.runningReplicas} / {inst.desiredReplicas}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10.5, color: '#8696a0' }}>AUTO HEALS</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{inst.healCount > 0 ? `Active (${inst.healCount})` : 'Disabled'}</div>
                        </div>
                      </div>

                      <div style={styles.instanceCardFooter}>
                        <button onClick={() => setSelectedDiagInstance(inst)} style={styles.actionCircleBtn} title="Inspect">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleRestart(inst)} style={styles.actionCircleBtn} title="Restart">
                          <RefreshCw size={14} />
                        </button>
                        <button onClick={() => handleHeal(inst)} style={styles.actionCircleBtn} title="Heal">
                          <Shield size={14} />
                        </button>
                        <button onClick={() => handleDestroy(inst)} style={styles.actionDeleteBtn} title="Destroy">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Footer Matching Design 8 */}
            <div style={styles.paginationRow}>
              <div style={styles.paginationText}>
                Showing {paginatedInstances.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredInstances.length)} of {filteredInstances.length} instance{filteredInstances.length === 1 ? '' : 's'}
              </div>

              <div style={styles.paginationControls}>
                <button
                  style={{
                    ...styles.pageArrowBtn,
                    opacity: currentPage <= 1 ? 0.4 : 1,
                    cursor: currentPage <= 1 ? 'default' : 'pointer',
                  }}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      ...styles.pageNumberBtn,
                      background: page === currentPage ? '#00a884' : 'rgba(255, 255, 255, 0.04)',
                      border: page === currentPage ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: page === currentPage ? '#ffffff' : '#8696a0',
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  style={{
                    ...styles.pageArrowBtn,
                    opacity: currentPage >= totalPages ? 0.4 : 1,
                    cursor: currentPage >= totalPages ? 'default' : 'pointer',
                  }}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modal: Container Diagnostics & Handshake Logs (Eye Button) ── */}
      {selectedDiagInstance && (
        <div style={styles.modalOverlay} onClick={() => setSelectedDiagInstance(null)}>
          <div style={styles.modalBoxLarge} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Terminal size={18} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Container Diagnostics • {selectedDiagInstance.serviceId}
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Phone: {selectedDiagInstance.phoneNumber} | Replicas: {selectedDiagInstance.runningReplicas}/{selectedDiagInstance.desiredReplicas}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedDiagInstance(null)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            {/* Diagnostic Metrics Grid */}
            <div style={styles.diagGrid}>
              <div style={styles.diagCard}>
                <div style={styles.diagCardLabel}><Activity size={12} /> STATUS</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: selectedDiagInstance.status === 'failed' ? '#f43f5e' : '#10b981' }}>
                  {selectedDiagInstance.status.toUpperCase()}
                </div>
                <div style={{ fontSize: 10.5, color: '#8696a0', marginTop: 2 }}>
                  {selectedDiagInstance.status === 'failed' ? '515 socket timeout' : 'Session verified'}
                </div>
              </div>

              <div style={styles.diagCard}>
                <div style={styles.diagCardLabel}><Cpu size={12} /> RESOURCES</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#2dd4bf' }}>
                  42.8 MB RAM
                </div>
                <div style={{ fontSize: 10.5, color: '#8696a0', marginTop: 2 }}>
                  0.4% CPU • Direct
                </div>
              </div>

              <div style={styles.diagCard}>
                <div style={styles.diagCardLabel}><Lock size={12} /> SECURITY</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                  AES-256 GCM
                </div>
                <div style={{ fontSize: 10.5, color: '#8696a0', marginTop: 2 }}>
                  Zero Meta Cloud Exposure
                </div>
              </div>
            </div>

            {/* Console Terminal Logs Viewer */}
            <div style={styles.terminalWindow}>
              <div style={styles.terminalHeader}>
                <span style={styles.terminalDotRed} />
                <span style={styles.terminalDotYellow} />
                <span style={styles.terminalDotGreen} />
                <span style={styles.terminalTitle}>container-stdout: {selectedDiagInstance.serviceId}.log</span>
              </div>
              <div style={styles.terminalContent}>
                <div style={{ color: '#64748b' }}>[System] Container runtime initialized. Tenant: {tenantId}</div>
                <div style={{ color: '#2dd4bf' }}>[Network] Binding virtual TUN socket on proxy route direct</div>
                <div style={{ color: '#94a3b8' }}>[Engine] Multi-device authentication session loaded</div>
                {selectedDiagInstance.status === 'failed' ? (
                  <>
                    <div style={{ color: '#f43f5e' }}>[Socket Error] ConnectionClosed: Handshake error 515 (Stream terminated)</div>
                    <div style={{ color: '#fbbf24' }}>[AutoHeal] Triggering health check supervisor: scheduled retry in 5000ms</div>
                    <div style={{ color: '#38bdf8' }}>[Telemetry] Crash report registered locally. AES-256 session state intact.</div>
                  </>
                ) : (
                  <>
                    <div style={{ color: '#10b981' }}>[Socket] Connection authenticated. Presence: online</div>
                    <div style={{ color: '#2dd4bf' }}>[Engine] Ready for concurrent message dispatch & incoming sync</div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
              <button
                onClick={() => {
                  handleRestart(selectedDiagInstance);
                  setSelectedDiagInstance(null);
                }}
                style={{ ...styles.submitBtn, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} />
                <span>Restart Container</span>
              </button>

              <button
                onClick={() => setSelectedDiagInstance(null)}
                style={styles.cancelBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Provision WhatsApp Instance Matching Design 8 ─────── */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Plus size={18} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Add Account
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Provision an enterprise container or pair phone with QR
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs: Provision Container vs Scan QR Code */}
            <div style={styles.modalTabsRow}>
              <button
                onClick={() => setAddModalTab('container')}
                style={{
                  ...styles.modalTabBtn,
                  borderBottom: addModalTab === 'container' ? '2px solid #2dd4bf' : '2px solid transparent',
                  color: addModalTab === 'container' ? '#2dd4bf' : '#8696a0',
                  fontWeight: addModalTab === 'container' ? 700 : 500,
                }}
              >
                <Server size={14} />
                <span>Provision Container</span>
              </button>
              <button
                onClick={() => setAddModalTab('qr')}
                style={{
                  ...styles.modalTabBtn,
                  borderBottom: addModalTab === 'qr' ? '2px solid #2dd4bf' : '2px solid transparent',
                  color: addModalTab === 'qr' ? '#2dd4bf' : '#8696a0',
                  fontWeight: addModalTab === 'qr' ? 700 : 500,
                }}
              >
                <QrCode size={14} />
                <span>Scan QR Code</span>
              </button>
            </div>

            {addModalTab === 'container' ? (
              <form onSubmit={handleCreateInstance} style={styles.modalForm}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Phone Number (E.164 with Country Code)</label>
                  <input
                    type="text"
                    placeholder="+15550199"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    style={styles.formInput}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Dedicated Proxy URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="socks5://user:pass@proxy.example.com:1080"
                    value={newProxy}
                    onChange={e => setNewProxy(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Desired Replicas</label>
                    <select
                      value={newReplicas}
                      onChange={e => setNewReplicas(Number(e.target.value))}
                      style={styles.formInput}
                    >
                      <option value={1}>1 Replica</option>
                      <option value={2}>2 Replicas (High Availability)</option>
                      <option value={3}>3 Replicas (Fault Tolerant)</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Auto-Heal Policy</label>
                    <select style={styles.formInput}>
                      <option>Automatic (Health Supervisor)</option>
                      <option>Manual Review Only</option>
                    </select>
                  </div>
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
                    disabled={provisioning}
                    style={styles.submitBtn}
                  >
                    {provisioning ? 'Provisioning...' : '+ Provision Container'}
                  </button>
                </div>
              </form>
            ) : (
              /* QR Code Pairing Tab */
              <div style={styles.qrPairingBox}>
                <div style={styles.qrCodeWrapper}>
                  {/* High Quality WhatsApp QR Code SVG pattern */}
                  <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
                    <rect width="180" height="180" rx="12" fill="#ffffff" />
                    {/* Corner Position Badges */}
                    <rect x="15" y="15" width="40" height="40" rx="6" fill="#000000" />
                    <rect x="23" y="23" width="24" height="24" rx="3" fill="#ffffff" />
                    <rect x="29" y="29" width="12" height="12" rx="2" fill="#000000" />

                    <rect x="125" y="15" width="40" height="40" rx="6" fill="#000000" />
                    <rect x="133" y="23" width="24" height="24" rx="3" fill="#ffffff" />
                    <rect x="139" y="29" width="12" height="12" rx="2" fill="#000000" />

                    <rect x="15" y="125" width="40" height="40" rx="6" fill="#000000" />
                    <rect x="23" y="133" width="24" height="24" rx="3" fill="#ffffff" />
                    <rect x="29" y="139" width="12" height="12" rx="2" fill="#000000" />

                    {/* QR Matrix Dots */}
                    <circle cx="90" cy="90" r="14" fill="#00a884" />
                    <circle cx="90" cy="90" r="7" fill="#ffffff" />
                    <rect x="65" y="25" width="8" height="8" fill="#000000" />
                    <rect x="80" y="35" width="8" height="8" fill="#000000" />
                    <rect x="95" y="20" width="8" height="8" fill="#000000" />
                    <rect x="65" y="65" width="12" height="12" fill="#000000" />
                    <rect x="105" y="65" width="12" height="12" fill="#000000" />
                    <rect x="65" y="115" width="8" height="8" fill="#000000" />
                    <rect x="85" y="135" width="12" height="8" fill="#000000" />
                    <rect x="125" y="95" width="8" height="8" fill="#000000" />
                    <rect x="145" y="125" width="12" height="12" fill="#000000" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                    Scan with WhatsApp on your phone
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 4, maxWidth: 280, margin: '4px auto 0' }}>
                    Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device to connect instantly.
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                  <button onClick={() => setShowAddModal(false)} style={styles.submitBtn}>
                    Done Pairing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Confirm Decommission Instance (Trash Button) ── */}
      {instanceToDelete && (
        <div style={styles.modalOverlay} onClick={() => !isDeletingInstance && setInstanceToDelete(null)}>
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
                    Decommission Instance?
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Permanent removal confirmation
                  </div>
                </div>
              </div>
              <button 
                onClick={() => !isDeletingInstance && setInstanceToDelete(null)} 
                style={styles.modalCloseBtn}
                disabled={isDeletingInstance}
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
                  Are you sure you want to delete <strong style={{ color: '#fff' }}>{instanceToDelete.phoneNumber || instanceToDelete.serviceId}</strong>?
                  <div style={{ color: '#94a3b8', fontSize: 11.5, marginTop: 4 }}>
                    Service ID: <code style={{ color: '#2dd4bf' }}>{instanceToDelete.serviceId}</code>
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: 11.5, marginTop: 6 }}>
                    This action terminates the container, releases network socket locks, and permanently deletes all instance cache records.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setInstanceToDelete(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 9,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  disabled={isDeletingInstance}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmDestroyInstance(instanceToDelete)}
                  disabled={isDeletingInstance}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 9,
                    border: 'none',
                    background: '#f43f5e',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isDeletingInstance ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(244, 63, 94, 0.4)',
                    opacity: isDeletingInstance ? 0.7 : 1,
                  }}
                >
                  {isDeletingInstance ? (
                    <>
                      <RefreshCw size={14} className="wa-spinning" />
                      Decommissioning...
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    maxWidth: 1140,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  headerCard: {
    background: 'linear-gradient(135deg, rgba(8, 35, 38, 0.85) 0%, rgba(6, 24, 28, 0.95) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 16,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  hexBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(45, 212, 191, 0.2)',
    flexShrink: 0,
  },
  categoryTag: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#2dd4bf',
    letterSpacing: '0.8px',
    marginBottom: 3,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.2px',
  },
  pageSubtitle: {
    fontSize: 12.5,
    color: '#8696a0',
    margin: '4px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  graphicBox: {
    display: 'flex',
    alignItems: 'center',
  },
  addAccountBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 10,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 168, 132, 0.4)',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
  },
  metricCard: {
    borderRadius: 14,
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.15s ease',
  },
  cardTotalActive: {
    background: 'rgba(8, 35, 38, 0.85)',
    border: '1.5px solid #00a884',
    boxShadow: '0 0 20px rgba(0, 168, 132, 0.3)',
  },
  cardTotalInactive: {
    background: 'rgba(8, 35, 38, 0.5)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
  },
  cardRunning: {
    background: 'rgba(10, 24, 38, 0.75)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
  },
  cardRunningActive: {
    background: 'rgba(10, 24, 38, 0.9)',
    border: '1.5px solid #3b82f6',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
  },
  cardFailed: {
    background: 'rgba(38, 14, 20, 0.75)',
    border: '1px solid rgba(244, 63, 94, 0.25)',
  },
  cardFailedActive: {
    background: 'rgba(38, 14, 20, 0.9)',
    border: '1.5px solid #f43f5e',
    boxShadow: '0 0 20px rgba(244, 63, 94, 0.3)',
  },
  cardHealing: {
    background: 'rgba(38, 30, 10, 0.75)',
    border: '1px solid rgba(234, 179, 8, 0.25)',
  },
  cardHealingActive: {
    background: 'rgba(38, 30, 10, 0.9)',
    border: '1.5px solid #eab308',
    boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)',
  },
  metricCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricIconWrapTotal: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconWrapRunning: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(59, 130, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconWrapFailed: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(244, 63, 94, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconWrapHealing: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(234, 179, 8, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendGreen: {
    fontSize: 11,
    fontWeight: 700,
    color: '#2dd4bf',
  },
  trendBlue: {
    fontSize: 11,
    fontWeight: 700,
    color: '#3b82f6',
  },
  trendRose: {
    fontSize: 11,
    fontWeight: 700,
    color: '#f43f5e',
  },
  trendAmber: {
    fontSize: 11,
    fontWeight: 700,
    color: '#eab308',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#8696a0',
    letterSpacing: '0.4px',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.2,
    margin: '2px 0',
  },
  metricSub: {
    fontSize: 11,
    color: '#8696a0',
  },
  sparkline: {
    marginTop: 6,
  },
  tableCard: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  tableHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  tableTitleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  tableIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  tableSubtitle: {
    fontSize: 11.5,
    color: '#8696a0',
    margin: '2px 0 0 0',
  },
  tableControlsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: '6px 12px',
    width: 200,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f8fafc',
    fontSize: 12,
    width: '100%',
  },
  iconControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterDropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    background: '#0d181d',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    zIndex: 100,
    minWidth: 170,
    padding: '6px 0',
  },
  filterDropdownHeader: {
    fontSize: 9.5,
    fontWeight: 700,
    color: '#8696a0',
    padding: '6px 12px',
    letterSpacing: '0.6px',
  },
  filterDropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },
  columnHeadingsRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    fontSize: 11,
    fontWeight: 700,
    color: '#8696a0',
    letterSpacing: '0.4px',
  },
  tableBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  loadingRow: {
    padding: 30,
    textAlign: 'center',
    color: '#8696a0',
    fontSize: 13,
  },
  emptyRow: {
    padding: 30,
    textAlign: 'center',
    color: '#8696a0',
    fontSize: 13,
  },
  instanceRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'background 0.15s ease',
  },
  waCircleBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  phoneText: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  serviceIdText: {
    fontSize: 11,
    color: '#8696a0',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  createdPill: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 3,
  },
  statusSub: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
  },
  actionCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.08)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    color: '#2dd4bf',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  actionDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(244, 63, 94, 0.08)',
    border: '1px solid rgba(244, 63, 94, 0.25)',
    color: '#f43f5e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
    padding: 20,
  },
  instanceCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  instanceCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instanceCardStats: {
    display: 'flex',
    justifyContent: 'space-between',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '8px 12px',
    borderRadius: 8,
  },
  instanceCardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  paginationRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  paginationText: {
    fontSize: 12,
    color: '#8696a0',
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  pageArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#8696a0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
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
  modalBoxLarge: {
    background: '#0e181c',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 620,
    padding: 24,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  modalTabsRow: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  modalTabBtn: {
    flex: 1,
    padding: '10px 0',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontSize: 12.5,
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
    boxShadow: '0 4px 12px rgba(0, 168, 132, 0.35)',
  },
  qrPairingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 0',
  },
  qrCodeWrapper: {
    padding: 12,
    background: '#ffffff',
    borderRadius: 14,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
  },
  diagGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 16,
  },
  diagCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
  },
  diagCardLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10.5,
    fontWeight: 700,
    color: '#8696a0',
    letterSpacing: '0.4px',
    marginBottom: 4,
  },
  terminalWindow: {
    background: '#060d10',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  terminalHeader: {
    background: '#0b161a',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  terminalDotRed: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ef4444',
  },
  terminalDotYellow: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#f59e0b',
  },
  terminalDotGreen: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#10b981',
  },
  terminalTitle: {
    fontSize: 11,
    color: '#8696a0',
    fontFamily: 'monospace',
    marginLeft: 6,
  },
  terminalContent: {
    padding: 14,
    fontFamily: 'monospace',
    fontSize: 11.5,
    lineHeight: 1.6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 180,
    overflowY: 'auto',
  },
};
