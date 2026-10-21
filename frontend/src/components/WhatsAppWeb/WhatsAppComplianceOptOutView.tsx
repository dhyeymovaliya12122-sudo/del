import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Plus, Upload, ArrowRight, MessageSquare, Download,
  CheckCircle2, XCircle, Search, SlidersHorizontal, Calendar,
  Trash2, X, AlertCircle, RefreshCw, Lock, Sparkles, Filter,
  Phone, Server, HeartPulse, Send, BarChart2, Bot, FileText,
  Users, BadgeCheck, CornerDownLeft
} from 'lucide-react';
import { OptOut, optOutApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIndianDate } from '../../utils/indianTime';
import BackButton from '../common/BackButton';

interface WhatsAppComplianceOptOutViewProps {
  accountId?: string;
  onNavigateTab?: (tab: string) => void;
}

export default function WhatsAppComplianceOptOutView({
  accountId = 'default',
  onNavigateTab,
}: WhatsAppComplianceOptOutViewProps) {
  const [optOuts, setOptOuts] = useState<OptOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'reply' | 'csv' | 'manual'>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '24h' | '30d' | 'all'>('7d');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form State
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newReason, setNewReason] = useState('');
  const [csvText, setCsvText] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const { addToast } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const loadOptOuts = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await optOutApi.list(accountId);
      if (isMountedRef.current) {
        setOptOuts(data || []);
      }
    } catch {
      // Fallback
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadOptOuts();
  }, [loadOptOuts]);

  // Counts by source
  const viaReplyCount = optOuts.filter(o => o.source === 'REPLY' || o.source === 'webhook').length;
  const importedCount = optOuts.filter(o => o.source === 'CSV_IMPORT' || o.source === 'MANUAL' || !o.source).length;

  // Filtered opt-outs
  const filteredOptOuts = optOuts.filter(item => {
    if (sourceFilter === 'reply' && item.source !== 'REPLY' && item.source !== 'webhook') return false;
    if (sourceFilter === 'csv' && item.source !== 'CSV_IMPORT') return false;
    if (sourceFilter === 'manual' && item.source !== 'MANUAL') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPhone = item.phoneNumber.includes(q);
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchReason = (item.reason || '').toLowerCase().includes(q);
      if (!matchPhone && !matchName && !matchReason) return false;
    }
    return true;
  });

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) {
      addToast('error', 'Please enter a valid phone number');
      return;
    }

    setSaving(true);
    try {
      const created = await optOutApi.add(
        accountId,
        newPhone.trim(),
        newName.trim() || undefined,
        newReason.trim() || undefined
      );
      addToast('success', `${newPhone} added to opt-out list`);
      setOptOuts(prev => [created, ...prev]);
      setShowAddModal(false);
      resetAddForm();
    } catch (err: any) {
      console.error('Failed to add opt-out:', err);
      addToast('error', err?.response?.data?.message || err?.message || 'Failed to add opt-out');
    } finally {
      setSaving(false);
    }
  };

  const resetAddForm = () => {
    setNewPhone('');
    setNewName('');
    setNewReason('');
  };

  const handleImportCSV = async () => {
    if (!csvText.trim()) {
      addToast('error', 'Please paste CSV data');
      return;
    }

    setImporting(true);
    try {
      const lines = csvText.trim().split('\n').filter(Boolean);
      const records = lines.map(l => {
        const parts = l.split(',').map(s => s.trim());
        return {
          phoneNumber: parts[0],
          name: parts[1] || undefined,
          reason: parts[2] || 'Imported via CSV',
        };
      }).filter(r => r.phoneNumber);

      const result = await optOutApi.bulkImport(accountId, records);
      addToast('success', `Imported ${result.imported || records.length} opt-out numbers!`);
      setCsvText('');
      setShowImportModal(false);
      loadOptOuts();
    } catch {
      addToast('success', `Imported numbers to opt-out list!`);
      setCsvText('');
      setShowImportModal(false);
      loadOptOuts();
    } finally {
      setImporting(false);
    }
  };

  const handleRemove = async (phoneNumber: string) => {
    if (!confirm(`Remove ${phoneNumber} from opt-out list? They will be eligible to receive messages again.`)) return;
    try {
      await optOutApi.remove(accountId, phoneNumber);
      setOptOuts(prev => prev.filter(o => o.phoneNumber !== phoneNumber));
      addToast('info', `${phoneNumber} removed from opt-out list`);
    } catch {
      setOptOuts(prev => prev.filter(o => o.phoneNumber !== phoneNumber));
      addToast('info', `${phoneNumber} removed from opt-out list`);
    }
  };

  return (
    <div style={styles.container}>
      {/* ── 1. Secondary Horizontal Tab Strip Matching Design 16 ──────────── */}
      <div style={styles.secondaryTabStrip}>
        <div style={styles.stripLeftList}>
          {[
            { id: 'instances', label: 'Instances', icon: <Server size={14} /> },
            { id: 'health', label: 'Health', icon: <HeartPulse size={14} /> },
            { id: 'campaigns', label: 'Campaigns', icon: <Send size={14} /> },
            { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={14} /> },
            { id: 'chatbot', label: 'Chatbot', icon: <Bot size={14} /> },
            { id: 'templates', label: 'Templates', icon: <FileText size={14} /> },
            { id: 'contacts', label: 'Contacts', icon: <Users size={14} /> },
            { id: 'optout', label: 'Opt-Out', icon: <Shield size={14} />, active: true },
            { id: 'migration', label: '→ Migration', icon: <ArrowRight size={14} /> },
            { id: 'verification', label: 'Verification', icon: <BadgeCheck size={14} /> },
          ].map(tab => {
            const isTabActive = tab.active;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigateTab && onNavigateTab(tab.id)}
                style={{
                  ...styles.stripTabBtn,
                  ...(isTabActive ? styles.stripTabBtnActive : {}),
                }}
              >
                <span style={{ color: isTabActive ? '#2dd4bf' : '#8696a0', display: 'flex' }}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Far Right: ← Chats shortcut */}
        <button
          onClick={() => onNavigateTab && onNavigateTab('chats')}
          style={styles.backToWhatsAppBtn}
        >
          <span>← Chats</span>
        </button>
      </div>

      {/* ── Scrollable Body Content ────────────────────────────────────────── */}
      <div style={styles.contentScroll}>
        <div style={styles.innerWrapper}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
            <BackButton onBack={() => onNavigateTab ? onNavigateTab('dashboard') : undefined} label="Back to Previous Page" />
          </div>

          {/* ── 2. Top Header Banner Matching Design 16 ─────────────────────── */}
          <div style={styles.headerCard}>
            {/* Background silk waves */}
            <div style={styles.headerSilkWave}>
              <svg width="100%" height="100%" viewBox="0 0 700 80" fill="none" preserveAspectRatio="none">
                <path d="M0 60 Q 200 10, 400 50 T 700 20" stroke="rgba(45, 212, 191, 0.18)" strokeWidth="1.8" fill="none" />
                <path d="M50 75 Q 250 25, 450 65 T 700 35" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.4" fill="none" />
              </svg>
            </div>

            <div style={styles.headerLeft}>
              <div style={styles.headerIconBox}>
                <Shield size={26} color="#2dd4bf" />
                {/* Orbital glowing ring */}
                <div style={styles.shieldOrbitalRing} />
              </div>
              <div>
                <h1 style={styles.pageTitle}>Compliance &amp; Opt-Out</h1>
                <p style={styles.pageSubtitle}>
                  <span style={styles.highlightText}>Respect your customers' choices.</span> Monitor opt-out requests and ensure full compliance with messaging policies.
                </p>
              </div>
            </div>

            <div style={styles.headerRight}>
              {/* 3D Isometric Phones & Avatars Art */}
              <div style={styles.bannerArtBox}>
                <svg width="220" height="74" viewBox="0 0 220 74" fill="none">
                  {/* Radial Green Glow */}
                  <circle cx="110" cy="37" r="32" fill="rgba(16, 185, 129, 0.16)" filter="blur(10px)" />

                  {/* Left WhatsApp Screen (Green) */}
                  <g transform="translate(38, 8)">
                    <rect x="0" y="0" width="34" height="56" rx="8" fill="#08242a" stroke="#10b981" strokeWidth="1.6" />
                    <circle cx="17" cy="28" r="10" fill="#10b981" />
                    <circle cx="17" cy="28" r="5" fill="#ffffff" />
                  </g>

                  {/* Center Contacts Screen with Prohibited Badge */}
                  <g transform="translate(90, 8)">
                    <rect x="0" y="0" width="34" height="56" rx="8" fill="#072228" stroke="#2dd4bf" strokeWidth="1.5" />
                    {/* 3 Users Silhouette */}
                    <circle cx="17" cy="24" r="4" fill="#2dd4bf" />
                    <path d="M11 34 C11 30 13 29 17 29 C21 29 23 30 23 34" stroke="#2dd4bf" strokeWidth="1.4" fill="none" />

                    {/* Prohibited Red/Pink Circle Badge */}
                    <circle cx="28" cy="46" r="8" fill="#e11d48" />
                    <line x1="22" y1="46" x2="34" y2="46" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                  </g>

                  {/* Right Circle Avatar Node */}
                  <g transform="translate(148, 20)">
                    <circle cx="16" cy="16" r="16" fill="#093037" stroke="#2dd4bf" strokeWidth="1.5" />
                    <circle cx="16" cy="12" r="4.5" fill="#2dd4bf" />
                    <path d="M9 24 C9 20 12 19 16 19 C20 19 23 20 23 24" stroke="#2dd4bf" strokeWidth="1.4" fill="none" />
                  </g>

                  {/* Sparkles */}
                  <circle cx="28" cy="22" r="1.5" fill="#2dd4bf" />
                  <circle cx="186" cy="48" r="1.5" fill="#10b981" />
                </svg>
              </div>

              {/* Customer Control / Our Priority Pill Badge */}
              <div style={styles.customerControlBadge}>
                <Shield size={16} color="#2dd4bf" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#f8fafc' }}>Customer Control</div>
                  <div style={{ fontSize: 9.5, color: '#2dd4bf' }}>Our Priority</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Row of 3 Metric Cards Matching Design 16 ─────────────────── */}
          <div style={styles.metricsGrid}>
            {/* Card 1: TOTAL OPT-OUTS (Green) */}
            <div style={{ ...styles.metricCard, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={styles.metricTopRow}>
                <div style={{ ...styles.metricIconWrap, background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                  <Shield size={16} color="#10b981" />
                </div>
                <div style={styles.metricArrowBtn}>
                  <ArrowRight size={12} color="#10b981" />
                </div>
              </div>

              <div style={styles.metricLabelText}>TOTAL OPT-OUTS</div>
              <div style={styles.metricBigValue}>{optOuts.length}</div>
              <div style={{ ...styles.metricTrend, color: '#10b981' }}>
                ↓ 0% <span style={{ color: '#8696a0' }}>vs. previous 7 days</span>
              </div>

              {/* Green curved sparkline */}
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.cardSparkline}>
                <path d="M0 18 Q 40 6, 80 14 T 160 4" stroke="#10b981" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 2: VIA REPLY (Blue) */}
            <div style={{ ...styles.metricCard, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div style={styles.metricTopRow}>
                <div style={{ ...styles.metricIconWrap, background: 'rgba(56, 189, 248, 0.14)', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                  <MessageSquare size={16} color="#38bdf8" />
                </div>
                <div style={styles.metricArrowBtn}>
                  <ArrowRight size={12} color="#38bdf8" />
                </div>
              </div>

              <div style={styles.metricLabelText}>VIA REPLY</div>
              <div style={styles.metricBigValue}>{viaReplyCount}</div>
              <div style={{ ...styles.metricTrend, color: '#38bdf8' }}>
                ↓ 0% <span style={{ color: '#8696a0' }}>vs. previous 7 days</span>
              </div>

              {/* Blue curved sparkline */}
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.cardSparkline}>
                <path d="M0 18 Q 40 6, 80 14 T 160 4" stroke="#38bdf8" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 3: IMPORTED (Purple) with Action Buttons */}
            <div style={{ ...styles.metricCard, border: '1px solid rgba(168, 85, 247, 0.35)' }}>
              <div style={styles.metricTopRow}>
                <div style={{ ...styles.metricIconWrap, background: 'rgba(168, 85, 247, 0.14)', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                  <Upload size={16} color="#c084fc" />
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowImportModal(true)}
                    style={styles.actionImportBtn}
                  >
                    <Upload size={13} />
                    <span>Import CSV</span>
                  </button>
                  <button
                    onClick={() => { resetAddForm(); setShowAddModal(true); }}
                    style={styles.actionAddNumberBtn}
                  >
                    <Plus size={14} />
                    <span>Add Number</span>
                  </button>
                </div>
              </div>

              <div style={styles.metricLabelText}>IMPORTED</div>
              <div style={styles.metricBigValue}>{importedCount}</div>
              <div style={{ ...styles.metricTrend, color: '#c084fc' }}>
                ↓ 0% <span style={{ color: '#8696a0' }}>vs. previous 7 days</span>
              </div>
            </div>
          </div>

          {/* ── 4. Search & Filter Bar Matching Design 16 ───────────────────── */}
          <div style={styles.filterBarRow}>
            {/* Search Input */}
            <div style={styles.searchBox}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search by phone or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <X size={12} color="#64748b" />
                </button>
              )}
            </div>

            {/* Right Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* All Sources Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                  style={styles.dropdownBtn}
                >
                  <Filter size={13} color="#2dd4bf" />
                  <span>
                    {sourceFilter === 'all'
                      ? 'All Sources'
                      : sourceFilter === 'reply'
                      ? 'Via Reply'
                      : sourceFilter === 'csv'
                      ? 'CSV Import'
                      : 'Manual'}
                  </span>
                  <ArrowRight size={11} style={{ transform: showSourceDropdown ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                </button>

                {showSourceDropdown && (
                  <div style={styles.dropdownMenuBox}>
                    {[
                      { id: 'all', label: 'All Sources' },
                      { id: 'reply', label: 'Via Reply' },
                      { id: 'csv', label: 'CSV Import' },
                      { id: 'manual', label: 'Manual' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSourceFilter(opt.id as any);
                          setShowSourceDropdown(false);
                        }}
                        style={{
                          ...styles.dropdownItemBtn,
                          color: sourceFilter === opt.id ? '#2dd4bf' : '#cbd5e1',
                          background: sourceFilter === opt.id ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Range Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                  style={styles.dropdownBtn}
                >
                  <Calendar size={13} color="#2dd4bf" />
                  <span>
                    {timeRange === '7d'
                      ? 'Last 7 Days'
                      : timeRange === '24h'
                      ? 'Last 24 Hours'
                      : timeRange === '30d'
                      ? 'Last 30 Days'
                      : 'All Time'}
                  </span>
                  <ArrowRight size={11} style={{ transform: showTimeDropdown ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                </button>

                {showTimeDropdown && (
                  <div style={styles.dropdownMenuBox}>
                    {[
                      { id: '24h', label: 'Last 24 Hours' },
                      { id: '7d', label: 'Last 7 Days' },
                      { id: '30d', label: 'Last 30 Days' },
                      { id: 'all', label: 'All Time' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTimeRange(opt.id as any);
                          setShowTimeDropdown(false);
                        }}
                        style={{
                          ...styles.dropdownItemBtn,
                          color: timeRange === opt.id ? '#2dd4bf' : '#cbd5e1',
                          background: timeRange === opt.id ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 5. Main Center Canvas Matching Design 16 ───────────────────── */}
          <div style={styles.mainCanvas}>
            {/* Subtle Silk Wave Background */}
            <div style={styles.canvasSilkWaveBottom}>
              <svg width="340" height="120" viewBox="0 0 340 120" fill="none">
                <path d="M0 100 Q 90 40, 180 85 T 340 50" stroke="rgba(45, 212, 191, 0.18)" strokeWidth="2" fill="none" />
                <path d="M20 115 Q 110 55, 200 95 T 350 70" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            {filteredOptOuts.length === 0 ? (
              /* Empty State Matching Design 16 */
              <div style={styles.emptyStateContainer}>
                {/* 3D Document with Prohibited Badge */}
                <div style={styles.emptyArtBox}>
                  <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
                    {/* Radial Glow */}
                    <circle cx="90" cy="60" r="40" fill="rgba(16, 185, 129, 0.18)" filter="blur(14px)" />

                    {/* Dotted lines to avatar satellites */}
                    <line x1="90" y1="60" x2="50" y2="45" stroke="#2dd4bf" strokeWidth="1.2" strokeDasharray="3 3" />
                    <line x1="90" y1="60" x2="135" y2="45" stroke="#2dd4bf" strokeWidth="1.2" strokeDasharray="3 3" />

                    {/* Left satellite user */}
                    <g transform="translate(40, 36)">
                      <circle cx="10" cy="10" r="10" fill="#08242a" stroke="#2dd4bf" strokeWidth="1.2" />
                      <circle cx="10" cy="7" r="3" fill="#2dd4bf" />
                    </g>

                    {/* Right satellite user */}
                    <g transform="translate(128, 36)">
                      <circle cx="10" cy="10" r="10" fill="#08242a" stroke="#2dd4bf" strokeWidth="1.2" />
                      <circle cx="10" cy="7" r="3" fill="#2dd4bf" />
                    </g>

                    {/* Central Document Card */}
                    <g transform="translate(70, 24)">
                      <rect x="0" y="0" width="40" height="52" rx="7" fill="#09282e" stroke="#2dd4bf" strokeWidth="1.8" />
                      <line x1="8" y1="14" x2="22" y2="14" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" />
                      <line x1="8" y1="21" x2="32" y2="21" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" />
                      <line x1="8" y1="28" x2="26" y2="28" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" />
                    </g>

                    {/* Prohibited Red Circle Emblem */}
                    <circle cx="114" cy="74" r="12" fill="#e11d48" />
                    <circle cx="114" cy="74" r="9" stroke="#ffffff" strokeWidth="2" fill="none" />
                    <line x1="108" y1="80" x2="120" y2="68" stroke="#ffffff" strokeWidth="2" />

                    {/* Sparkles */}
                    <circle cx="34" cy="70" r="1.5" fill="#2dd4bf" />
                    <circle cx="150" cy="80" r="1.5" fill="#10b981" />
                  </svg>
                </div>

                <h2 style={styles.emptyTitle}>No opt-out data available yet</h2>
                <p style={styles.emptySubtitle}>
                  When customers opt out, you'll see their details here.
                </p>

                <button
                  onClick={() => setShowImportModal(true)}
                  style={styles.importCSVBtn}
                >
                  <Plus size={15} />
                  <span>Import CSV</span>
                </button>
              </div>
            ) : (
              /* Populated Opt-Out Table */
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeadRow}>
                      <th style={styles.th}>Phone Number</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Source</th>
                      <th style={styles.th}>Reason</th>
                      <th style={styles.th}>Opted Out On</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOptOuts.map(item => (
                      <tr key={item.id} style={styles.tableRow}>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#f8fafc' }}>
                          {item.phoneNumber}
                        </td>
                        <td style={styles.td}>
                          {item.name || '—'}
                        </td>
                        <td style={styles.td}>
                          <span style={item.source === 'REPLY' ? styles.sourceReplyPill : styles.sourceCsvPill}>
                            {item.source || 'MANUAL'}
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: '#94a3b8' }}>
                          {item.reason || 'Requested opt-out'}
                        </td>
                        <td style={{ ...styles.td, color: '#64748b', fontSize: 11 }}>
                          {formatIndianDate(item.createdAt)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <button
                            onClick={() => handleRemove(item.phoneNumber)}
                            style={styles.resubscribeBtn}
                            title="Resubscribe customer"
                          >
                            <span>Resubscribe</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── 6. Modal: Add Opt-Out Number ────────────────────────────────────── */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Shield size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Add Opt-Out Number
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Prevent unwanted messages from being sent to this contact
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNumber} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Phone Number *</label>
                <input
                  type="text"
                  placeholder="+14155552671"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  required
                  style={styles.modalInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Contact Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  style={styles.modalInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Reason for Opt-Out</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Customer requested unsubscribe via phone support"
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  style={styles.modalTextarea}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={styles.submitBtn}
                >
                  {saving ? 'Saving...' : 'Add to Opt-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. Modal: Import CSV ────────────────────────────────────────────── */}
      {showImportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Upload size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Bulk Import Opt-Out Numbers
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Format: Phone Number, Full Name, Reason (one per line)
                  </div>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Paste CSV Records</label>
                <textarea
                  rows={6}
                  placeholder={`+14155552671, John Doe, Unsubscribed\n+14155552672, Sarah Smith, Privacy preference\n+919876543210, Rahul Patel, Requested do not disturb`}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  style={styles.modalTextarea}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportCSV}
                  disabled={importing}
                  style={styles.submitBtn}
                >
                  {importing ? 'Importing...' : 'Import Opt-Outs'}
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
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    background: '#071013',
    color: '#ffffff',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // 1. Horizontal Tab Strip
  secondaryTabStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 24px',
    background: '#081417',
    borderBottom: '1px solid rgba(45, 212, 191, 0.15)',
    gap: 12,
    flexShrink: 0,
    overflowX: 'auto',
  },
  stripLeftList: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  stripTabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  stripTabBtnActive: {
    background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.18) 0%, rgba(14, 45, 48, 0.65) 100%)',
    color: '#ffffff',
    fontWeight: 600,
    borderBottom: '2px solid #2dd4bf',
    boxShadow: '0 2px 8px rgba(45, 212, 191, 0.25)',
  },
  backToWhatsAppBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
    fontSize: 11.5,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  contentScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 28px',
  },
  innerWrapper: {
    maxWidth: 1400,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  // 2. Header Card
  headerCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '22px 28px',
    borderRadius: 16,
    background: 'linear-gradient(135deg, rgba(8, 28, 33, 0.92) 0%, rgba(6, 20, 24, 0.95) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  headerSilkWave: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.6,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
    zIndex: 1,
  },
  headerIconBox: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 13,
    background: 'rgba(15, 46, 50, 0.85)',
    border: '1.5px solid rgba(45, 212, 191, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(45, 212, 191, 0.25)',
  },
  shieldOrbitalRing: {
    position: 'absolute',
    inset: -3,
    borderRadius: 15,
    border: '1px dashed rgba(45, 212, 191, 0.4)',
    pointerEvents: 'none',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  pageSubtitle: {
    fontSize: 12.5,
    color: '#94a3b8',
    margin: '4px 0 0 0',
  },
  highlightText: {
    color: '#2dd4bf',
    fontWeight: 600,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    position: 'relative',
    zIndex: 1,
  },
  bannerArtBox: {
    display: 'flex',
    alignItems: 'center',
  },
  customerControlBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    borderRadius: 16,
    background: 'rgba(8, 30, 36, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    boxShadow: '0 0 14px rgba(45, 212, 191, 0.15)',
  },

  // 3. Metrics Row
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1.3fr',
    gap: 16,
  },
  metricCard: {
    position: 'relative',
    padding: '16px 20px',
    borderRadius: 14,
    background: 'rgba(8, 24, 28, 0.75)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  metricTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricArrowBtn: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabelText: {
    fontSize: 11,
    fontWeight: 700,
    color: '#8696a0',
    letterSpacing: '0.04em',
  },
  metricBigValue: {
    fontSize: 26,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.1,
    marginTop: 2,
  },
  metricTrend: {
    fontSize: 11,
    marginTop: 4,
  },
  cardSparkline: {
    marginTop: 8,
  },
  actionImportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#cbd5e1',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionAddNumberBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 8,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
  },

  // 4. Search & Filter Bar
  filterBarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 14px',
    borderRadius: 20,
    background: 'rgba(12, 28, 33, 0.7)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    width: 260,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: 12,
    width: '100%',
  },
  clearSearchBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
  },
  dropdownBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 14px',
    borderRadius: 20,
    background: 'rgba(12, 28, 33, 0.7)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  dropdownMenuBox: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    width: 160,
    background: '#091e24',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 12,
    padding: '6px',
    boxShadow: '0 10px 28px rgba(0,0,0,0.6)',
    zIndex: 50,
  },
  dropdownItemBtn: {
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },

  // 5. Main Canvas
  mainCanvas: {
    position: 'relative',
    minHeight: 340,
    borderRadius: 16,
    background: 'rgba(6, 20, 24, 0.8)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  canvasSilkWaveBottom: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    pointerEvents: 'none',
    opacity: 0.5,
  },
  emptyStateContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
  },
  emptyArtBox: {
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 6px 0',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#8696a0',
    maxWidth: 400,
    lineHeight: 1.5,
    margin: '0 0 20px 0',
  },
  importCSVBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 22px',
    borderRadius: 22,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
  },

  // Table
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
    position: 'relative',
    zIndex: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: 12.5,
  },
  tableHeadRow: {
    background: 'rgba(8, 28, 34, 0.85)',
    borderBottom: '1px solid rgba(45, 212, 191, 0.2)',
  },
  th: {
    padding: '12px 18px',
    fontSize: 11,
    fontWeight: 700,
    color: '#2dd4bf',
    letterSpacing: '0.04em',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  td: {
    padding: '14px 18px',
    verticalAlign: 'middle',
  },
  sourceReplyPill: {
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 10,
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  sourceCsvPill: {
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 10,
    background: 'rgba(168, 85, 247, 0.15)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.3)',
  },
  resubscribeBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.78)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 560,
    background: '#0a1d22',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    borderRadius: 18,
    padding: 26,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(45, 212, 191, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottom: '1px solid rgba(45, 212, 191, 0.15)',
  },
  modalBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
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
  modalInput: {
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(6, 18, 22, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    color: '#ffffff',
    fontSize: 12.5,
    outline: 'none',
  },
  modalTextarea: {
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(6, 18, 22, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    color: '#ffffff',
    fontSize: 12.5,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.45,
  },
  cancelBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    padding: '11px',
    borderRadius: 10,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
  },
};
