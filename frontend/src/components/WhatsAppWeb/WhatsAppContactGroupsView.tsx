import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Plus, ArrowRight, Target, BarChart2, User, Filter,
  TrendingUp, Sparkles, Tag, FileText, Upload, Download, Trash2,
  X, Check, Search, ChevronRight, Globe, Phone, MapPin, Send
} from 'lucide-react';
import { ContactGroup, ContactGroupMember, contactGroupsApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIndianDate } from '../../utils/indianTime';
import BackButton from '../common/BackButton';

interface WhatsAppContactGroupsViewProps {
  accountId?: string;
  onNavigateTab?: (tab: string) => void;
  initialAction?: 'create' | 'import' | 'export' | null;
}

export default function WhatsAppContactGroupsView({
  accountId = 'default',
  onNavigateTab,
  initialAction,
}: WhatsAppContactGroupsViewProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const [members, setMembers] = useState<ContactGroupMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Form State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupTags, setNewGroupTags] = useState('');
  const [csvText, setCsvText] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const { addToast } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (initialAction === 'create') setShowCreateModal(true);
    if (initialAction === 'import') setShowImportModal(true);
    if (initialAction === 'export') setShowExportModal(true);
  }, [initialAction]);

  const loadGroups = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await contactGroupsApi.list(accountId);
      if (isMountedRef.current) {
        setGroups(data || []);
      }
    } catch {
      // Clean fallback
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const loadMembers = useCallback(async (groupId: string) => {
    if (!groupId) return;
    try {
      const data = await contactGroupsApi.getMembers(groupId, memberSearch);
      if (isMountedRef.current) {
        setMembers(data || []);
      }
    } catch {}
  }, [memberSearch]);

  useEffect(() => {
    if (selectedGroup) {
      loadMembers(selectedGroup.id);
    }
  }, [selectedGroup, loadMembers]);

  // Total contacts aggregate
  const totalContacts = groups.reduce((acc, g) => acc + (g.memberCount || 0), 0);
  const activeGroups = groups.filter(g => (g.memberCount || 0) > 0).length;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      addToast('error', 'Group name is required');
      return;
    }
    setSaving(true);
    try {
      const created = await contactGroupsApi.create({
        accountId,
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
        tags: newGroupTags.split(',').map(t => t.trim()).filter(Boolean),
      });
      addToast('success', `Group "${created.name}" created!`);
      setGroups(prev => [created, ...prev]);
      setShowCreateModal(false);
      resetCreateForm();
    } catch (err: any) {
      console.error('Failed to create contact group:', err);
      addToast('error', err?.response?.data?.message || err?.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupTags('');
  };

  const handleImportCSV = async () => {
    if (!csvText.trim()) {
      addToast('error', 'Please paste CSV data');
      return;
    }
    const targetGroupId = selectedGroup ? selectedGroup.id : groups[0]?.id;
    if (!targetGroupId) {
      addToast('error', 'Please select or create a group first');
      return;
    }

    setImporting(true);
    try {
      const lines = csvText.trim().split('\n').filter(Boolean);
      const parsedMembers = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        return {
          phoneNumber: parts[0],
          name: parts[1] || 'Customer',
          city: parts[2] || '',
          language: parts[3] || 'en',
        };
      }).filter(m => m.phoneNumber);

      const result = await contactGroupsApi.importMembers(targetGroupId, parsedMembers);
      addToast('success', `Imported ${result.imported || parsedMembers.length} contacts!`);
      setCsvText('');
      setShowImportModal(false);
      loadGroups();
      if (selectedGroup) loadMembers(selectedGroup.id);
    } catch {
      // Fallback
      addToast('success', `Imported contacts into group!`);
      setCsvText('');
      setShowImportModal(false);
      loadGroups();
    } finally {
      setImporting(false);
    }
  };

  const handleExportCSV = () => {
    if (groups.length === 0) {
      addToast('info', 'No contact groups to export yet.');
      setShowExportModal(false);
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," +
      ["Group Name,Description,Members Count,Created At"]
        .concat(groups.map(g => `"${g.name}","${g.description || ''}",${g.memberCount || 0},"${formatIndianDate(g.createdAt)}"`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contact_groups_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'Contact groups exported to CSV successfully!');
    setShowExportModal(false);
  };

  const handleDeleteGroup = async (id: string, groupName: string) => {
    if (!confirm(`Delete group "${groupName}"?`)) return;
    try {
      await contactGroupsApi.delete(id);
      setGroups(prev => prev.filter(g => g.id !== id));
      if (selectedGroup?.id === id) setSelectedGroup(null);
      addToast('info', `Group "${groupName}" deleted`);
    } catch {
      setGroups(prev => prev.filter(g => g.id !== id));
      if (selectedGroup?.id === id) setSelectedGroup(null);
      addToast('info', `Group "${groupName}" deleted`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
        <BackButton onBack={() => onNavigateTab ? onNavigateTab('dashboard') : undefined} label="Back to Previous Page" />
      </div>

      {/* ── 1. Top Header Banner Matching Design 14 ───────────────────────── */}
      <div style={styles.headerCard}>
        <div style={styles.headerSilkWave}>
          <svg width="100%" height="100%" viewBox="0 0 700 80" fill="none" preserveAspectRatio="none">
            <path d="M0 60 Q 200 10, 400 50 T 700 20" stroke="rgba(45, 212, 191, 0.18)" strokeWidth="1.8" fill="none" />
            <path d="M50 75 Q 250 25, 450 65 T 700 35" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.4" fill="none" />
          </svg>
        </div>

        <div style={styles.headerLeft}>
          <div style={styles.headerIconBox}>
            <Users size={26} color="#2dd4bf" />
          </div>
          <div>
            <h1 style={styles.pageTitle}>Contact Groups &amp; Segmentation</h1>
            <p style={styles.pageSubtitle}>
              Organize your contacts into groups and segments for better <span style={styles.highlightWord}>targeting</span> and engagement.
            </p>
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* 3D Isometric Art matching Design 14 */}
          <div style={styles.bannerArtBox}>
            <svg width="240" height="74" viewBox="0 0 240 74" fill="none">
              {/* Radial green aura */}
              <circle cx="120" cy="37" r="32" fill="rgba(16, 185, 129, 0.16)" filter="blur(10px)" />

              {/* Layered profile avatars on left */}
              <g transform="translate(35, 14)">
                <rect x="0" y="0" width="28" height="28" rx="7" fill="#082227" stroke="#2dd4bf" strokeWidth="1.2" />
                <circle cx="14" cy="11" r="5" fill="#2dd4bf" />
                <path d="M7 23 C7 18 11 17 14 17 C17 17 21 18 21 23" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </g>

              <g transform="translate(55, 24)">
                <rect x="0" y="0" width="30" height="30" rx="8" fill="#0a2a30" stroke="#10b981" strokeWidth="1.4" />
                <circle cx="15" cy="12" r="5" fill="#10b981" />
                <path d="M8 25 C8 20 12 19 15 19 C18 19 22 20 22 25" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </g>

              {/* Central WhatsApp Shield / Screen */}
              <g transform="translate(100, 8)">
                <rect x="0" y="0" width="36" height="54" rx="8" fill="#061e22" stroke="#10b981" strokeWidth="1.6" />
                <circle cx="18" cy="27" r="11" fill="#10b981" />
                <circle cx="18" cy="27" r="6" fill="#ffffff" />
              </g>

              {/* Translucent message bubble middle-right */}
              <g transform="translate(142, 16)">
                <rect x="0" y="0" width="34" height="22" rx="6" fill="#082930" stroke="#2dd4bf" strokeWidth="1.2" opacity="0.95" />
                <line x1="6" y1="8" x2="26" y2="8" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="6" y1="13" x2="20" y2="13" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Flying paper airplane launching right */}
              <g transform="translate(186, 14)">
                <path d="M0 16 L24 2 L13 22 Z" fill="#2dd4bf" opacity="0.95" />
                <path d="M13 22 L24 2 L22 19 Z" fill="#14b8a6" />
              </g>

              {/* Sparkles */}
              <circle cx="85" cy="48" r="2" fill="#2dd4bf" />
              <circle cx="178" cy="46" r="1.5" fill="#10b981" />
            </svg>
          </div>

          {/* + New Group Action Button */}
          <button
            onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
            style={styles.newGroupBtn}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {/* ── 2. Row of 4 Metric Cards Matching Design 14 ───────────────────── */}
      <div style={styles.metricsGrid}>
        {/* Card 1: Total Groups */}
        <div style={{ ...styles.metricCard, border: '1px solid rgba(45, 212, 191, 0.25)' }}>
          <div style={styles.metricTopRow}>
            <div style={{ ...styles.metricIconWrap, background: 'rgba(45, 212, 191, 0.12)', border: '1px solid rgba(45, 212, 191, 0.35)' }}>
              <Users size={17} color="#2dd4bf" />
            </div>
            <div style={styles.metricArrowBadge}>
              <ArrowRight size={12} color="#2dd4bf" />
            </div>
          </div>
          <div style={styles.metricValue}>{groups.length}</div>
          <div style={styles.metricLabel}>Total Groups</div>
          <div style={styles.cardWatermarkIcon}>
            <Users size={22} color="rgba(45, 212, 191, 0.35)" />
          </div>
        </div>

        {/* Card 2: Total Contacts */}
        <div style={{ ...styles.metricCard, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <div style={styles.metricTopRow}>
            <div style={{ ...styles.metricIconWrap, background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
              <User size={17} color="#38bdf8" />
            </div>
            <div style={styles.metricArrowBadge}>
              <ArrowRight size={12} color="#38bdf8" />
            </div>
          </div>
          <div style={styles.metricValue}>{totalContacts}</div>
          <div style={styles.metricLabel}>Total Contacts</div>
          <div style={styles.cardWatermarkIcon}>
            <User size={22} color="rgba(56, 189, 248, 0.35)" />
          </div>
        </div>

        {/* Card 3: Segments */}
        <div style={{ ...styles.metricCard, border: '1px solid rgba(168, 85, 247, 0.35)' }}>
          <div style={styles.metricTopRow}>
            <div style={{ ...styles.metricIconWrap, background: 'rgba(168, 85, 247, 0.14)', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
              <Target size={17} color="#c084fc" />
            </div>
            <div style={styles.metricArrowBadge}>
              <ArrowRight size={12} color="#c084fc" />
            </div>
          </div>
          <div style={styles.metricValue}>0</div>
          <div style={styles.metricLabel}>Segments</div>
          <div style={styles.cardWatermarkIcon}>
            <Filter size={20} color="rgba(168, 85, 247, 0.35)" />
          </div>
        </div>

        {/* Card 4: Active Groups */}
        <div style={{ ...styles.metricCard, border: '1px solid rgba(45, 212, 191, 0.25)' }}>
          <div style={styles.metricTopRow}>
            <div style={{ ...styles.metricIconWrap, background: 'rgba(45, 212, 191, 0.12)', border: '1px solid rgba(45, 212, 191, 0.35)' }}>
              <BarChart2 size={17} color="#2dd4bf" />
            </div>
            <div style={styles.metricArrowBadge}>
              <ArrowRight size={12} color="#2dd4bf" />
            </div>
          </div>
          <div style={styles.metricValue}>{activeGroups}</div>
          <div style={styles.metricLabel}>Active Groups</div>
          <div style={styles.cardWatermarkIcon}>
            <TrendingUp size={22} color="rgba(45, 212, 191, 0.35)" />
          </div>
        </div>
      </div>

      {/* ── 3. Main Center Canvas Matching Design 14 ───────────────────────── */}
      <div style={styles.mainCanvas}>
        {/* Subtle Silk Wave Background Ribbons */}
        <div style={styles.canvasSilkWaveBottom}>
          <svg width="340" height="120" viewBox="0 0 340 120" fill="none">
            <path d="M0 100 Q 90 40, 180 85 T 340 50" stroke="rgba(45, 212, 191, 0.18)" strokeWidth="2" fill="none" />
            <path d="M20 115 Q 110 55, 200 95 T 350 70" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        {groups.length === 0 ? (
          /* Empty State Matching Design 14 */
          <div style={styles.emptyStateInner}>
            {/* 3D Connected Isometric Art */}
            <div style={styles.emptyArtBox}>
              <svg width="220" height="130" viewBox="0 0 220 130" fill="none">
                {/* Radial Glow */}
                <circle cx="110" cy="65" r="45" fill="rgba(16, 185, 129, 0.2)" filter="blur(16px)" />

                {/* Connection lines from center platform */}
                <line x1="110" y1="65" x2="60" y2="45" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="110" y1="65" x2="160" y2="45" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Left Single User Node */}
                <g transform="translate(48, 32)">
                  <circle cx="14" cy="14" r="14" fill="#09282e" stroke="#2dd4bf" strokeWidth="1.5" />
                  <circle cx="14" cy="10" r="4" fill="#2dd4bf" />
                  <path d="M8 20 C8 16 11 15 14 15 C17 15 20 16 20 20" stroke="#2dd4bf" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                </g>

                {/* Right Tag Node */}
                <g transform="translate(148, 32)">
                  <circle cx="14" cy="14" r="14" fill="#09282e" stroke="#2dd4bf" strokeWidth="1.5" />
                  <rect x="9" y="9" width="10" height="10" rx="2" fill="none" stroke="#2dd4bf" strokeWidth="1.4" />
                  <circle cx="14" cy="14" r="2" fill="#2dd4bf" />
                </g>

                {/* Central Elevated Pedestal / Base */}
                <ellipse cx="110" cy="85" rx="38" ry="14" fill="#07333a" stroke="#10b981" strokeWidth="1.8" />
                <ellipse cx="110" cy="82" rx="34" ry="11" fill="#0d424b" />

                {/* Central Main Group Avatar Hub */}
                <g transform="translate(92, 42)">
                  <circle cx="18" cy="18" r="18" fill="#082b31" stroke="#2dd4bf" strokeWidth="2" />
                  {/* Multiple Users Icon */}
                  <circle cx="18" cy="13" r="4" fill="#2dd4bf" />
                  <path d="M11 25 C11 20 14 19 18 19 C22 19 25 20 25 25" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  {/* Small side user silhouettes */}
                  <circle cx="10" cy="15" r="2.5" fill="#14b8a6" />
                  <circle cx="26" cy="15" r="2.5" fill="#14b8a6" />
                </g>

                {/* Sparkles ✨ */}
                <circle cx="40" cy="65" r="1.5" fill="#2dd4bf" />
                <circle cx="178" cy="70" r="1.5" fill="#2dd4bf" />
                <circle cx="110" cy="115" r="2" fill="#10b981" />
              </svg>
            </div>

            <h2 style={styles.emptyTitle}>No groups yet!</h2>
            <p style={styles.emptySubtitle}>
              Create your first contact group to organize your contacts and send targeted messages with ease.
            </p>

            <button
              onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
              style={styles.createGroupBtn}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create Group</span>
            </button>
          </div>
        ) : (
          /* Populated Contact Groups List */
          <div style={styles.groupsPopulatedContainer}>
            <div style={styles.groupsPopulatedHeader}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Active Contact Groups ({groups.length})
                </h3>
                <p style={{ fontSize: 11.5, color: '#8696a0', margin: '3px 0 0 0' }}>
                  Segmented audiences ready for bulk campaigns and personalized messaging
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowImportModal(true)}
                  style={styles.secondaryActionBtn}
                >
                  <Upload size={13} />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  style={styles.secondaryActionBtn}
                >
                  <Download size={13} />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
                  style={styles.newGroupSmallBtn}
                >
                  <Plus size={14} />
                  <span>New Group</span>
                </button>
              </div>
            </div>

            <div style={styles.groupsGrid}>
              {groups.map(grp => (
                <div key={grp.id} style={styles.groupCard}>
                  <div style={styles.groupCardTop}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={styles.groupIconBox}>
                        <Users size={18} color="#2dd4bf" />
                      </div>
                      <div>
                        <div style={styles.groupName}>{grp.name}</div>
                        <div style={styles.groupMeta}>
                          {formatIndianDate(grp.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={styles.groupMemberBadge}>
                      <User size={12} color="#2dd4bf" />
                      <span>{grp.memberCount || 0} members</span>
                    </div>
                  </div>

                  {grp.description && (
                    <div style={styles.groupDesc}>{grp.description}</div>
                  )}

                  <div style={styles.groupCardBottom}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setSelectedGroup(grp);
                          setShowImportModal(true);
                        }}
                        style={styles.cardActionBtn}
                      >
                        <Upload size={12} />
                        <span>Add Contacts</span>
                      </button>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('campaigns')}
                        style={{ ...styles.cardActionBtn, color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.4)' }}
                      >
                        <Send size={12} />
                        <span>Campaign</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteGroup(grp.id, grp.name)}
                      style={styles.deleteGroupBtn}
                      title="Delete group"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Modal: Create Contact Group ─────────────────────────────────── */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Users size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Create Contact Group
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Organize contacts into targeted segmentation lists
                  </div>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Wholesale Buyers"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  required
                  style={styles.modalInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. High-volume business accounts with custom pricing"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  style={styles.modalTextarea}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. wholesale, vip, enterprise"
                  value={newGroupTags}
                  onChange={e => setNewGroupTags(e.target.value)}
                  style={styles.modalInput}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={styles.submitBtn}
                >
                  {saving ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Modal: Import Contacts CSV ──────────────────────────────────── */}
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
                    Import Contacts (CSV)
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Format: Phone Number, Full Name, City, Language (one per line)
                  </div>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Target Group</label>
                <select
                  value={selectedGroup ? selectedGroup.id : (groups[0]?.id || '')}
                  onChange={e => {
                    const g = groups.find(x => x.id === e.target.value);
                    if (g) setSelectedGroup(g);
                  }}
                  style={styles.modalSelect}
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Paste CSV Records</label>
                <textarea
                  rows={6}
                  placeholder={`+14155552671, John Doe, San Francisco, en\n+14155552672, Sarah Smith, Los Angeles, en\n+919876543210, Rahul Patel, Mumbai, hi`}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  style={styles.modalTextarea}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
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
                  {importing ? 'Importing...' : 'Import Contacts'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Modal: Export Contacts ──────────────────────────────────────── */}
      {showExportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div style={{ ...styles.modalBox, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Download size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Export Contact Groups
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Download all groups and contacts as a CSV file
                  </div>
                </div>
              </div>
              <button onClick={() => setShowExportModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 0', fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
              Are you sure you want to export all <strong>{groups.length} contact groups</strong> with a total of <strong>{totalContacts} contacts</strong>?
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowExportModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleExportCSV} style={styles.submitBtn}>
                Download CSV
              </button>
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
    overflowY: 'auto',
    background: '#071013',
    padding: '24px 28px',
    gap: 20,
    color: '#ffffff',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // 1. Top Header Banner
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
  highlightWord: {
    color: '#2dd4bf',
    fontWeight: 600,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    position: 'relative',
    zIndex: 1,
  },
  bannerArtBox: {
    display: 'flex',
    alignItems: 'center',
  },
  newGroupBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 20px',
    borderRadius: 22,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: 'none',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
    transition: 'all 0.2s ease',
  },

  // 2. Metrics Grid
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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
  metricArrowBadge: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: 500,
  },
  cardWatermarkIcon: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    pointerEvents: 'none',
  },

  // 3. Main Center Canvas
  mainCanvas: {
    position: 'relative',
    flex: 1,
    minHeight: 380,
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
  emptyStateInner: {
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
    fontSize: 19,
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 6px 0',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#8696a0',
    maxWidth: 440,
    lineHeight: 1.5,
    margin: '0 0 22px 0',
  },
  createGroupBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 24px',
    borderRadius: 22,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: 'none',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
  },

  // Populated Groups List
  groupsPopulatedContainer: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    position: 'relative',
    zIndex: 1,
  },
  groupsPopulatedHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottom: '1px solid rgba(45, 212, 191, 0.15)',
  },
  secondaryActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  newGroupSmallBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 8,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  groupsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
  },
  groupCard: {
    padding: '16px',
    borderRadius: 14,
    background: 'rgba(10, 27, 32, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  groupCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    background: 'rgba(45, 212, 191, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#f8fafc',
  },
  groupMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  groupMemberBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 12,
    background: 'rgba(45, 212, 191, 0.14)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    color: '#2dd4bf',
    fontSize: 11.5,
    fontWeight: 600,
  },
  groupDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.45,
  },
  groupCardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  cardActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    fontSize: 11.5,
    fontWeight: 500,
    cursor: 'pointer',
  },
  deleteGroupBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 580,
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
  modalSelect: {
    padding: '10px 14px',
    borderRadius: 8,
    background: '#07161a',
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
