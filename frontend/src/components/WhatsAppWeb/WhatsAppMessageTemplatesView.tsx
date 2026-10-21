import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Plus, Search, SlidersHorizontal, LayoutGrid, List,
  Megaphone, Headphones, Bell, MessageSquare, MoreHorizontal,
  ChevronRight, Lightbulb, Send, CheckCircle2, Clock, XCircle,
  X, Trash2, Check, Sparkles, RefreshCw, Eye, Tag, Globe, CornerDownLeft
} from 'lucide-react';
import { MessageTemplate, templatesApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import BackButton from '../common/BackButton';

interface WhatsAppMessageTemplatesViewProps {
  accountId?: string;
  onNavigateTab?: (tab: string) => void;
}

export default function WhatsAppMessageTemplatesView({
  accountId = 'default',
  onNavigateTab,
}: WhatsAppMessageTemplatesViewProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending' | 'approved' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'marketing' | 'customer_support' | 'notifications' | 'general' | 'others'>('marketing');
  const [language, setLanguage] = useState('en');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('👋 Hello {{1}}, your order #{{2}} has been confirmed and is scheduled for immediate dispatch! Thank you for choosing us.');
  const [footerText, setFooterText] = useState('Reply STOP to unsubscribe');
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await templatesApi.list(accountId);
      if (isMountedRef.current) {
        setTemplates(data || []);
      }
    } catch {
      // Fallback cleanly
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Counts by status
  const counts = {
    all: templates.length,
    draft: templates.filter(t => t.status === 'draft').length,
    pending: templates.filter(t => t.status === 'pending').length,
    approved: templates.filter(t => t.status === 'approved').length,
    rejected: templates.filter(t => t.status === 'rejected').length,
  };

  // Category counts
  const categoryCounts = {
    marketing: templates.filter(t => t.category === 'marketing').length,
    customer_support: templates.filter(t => t.category === 'customer_support' || t.category === 'support').length,
    notifications: templates.filter(t => t.category === 'notifications' || t.category === 'utility').length,
    general: templates.filter(t => t.category === 'general').length,
    others: templates.filter(t => !['marketing', 'customer_support', 'support', 'notifications', 'utility', 'general'].includes(t.category)).length,
  };

  // Filtered list
  const filteredTemplates = templates.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'marketing' && t.category !== 'marketing') return false;
      if (categoryFilter === 'customer_support' && !['customer_support', 'support'].includes(t.category)) return false;
      if (categoryFilter === 'notifications' && !['notifications', 'utility'].includes(t.category)) return false;
      if (categoryFilter === 'general' && t.category !== 'general') return false;
      if (categoryFilter === 'others' && ['marketing', 'customer_support', 'support', 'notifications', 'utility', 'general'].includes(t.category)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchBody = t.body.toLowerCase().includes(q);
      const matchCategory = t.category.toLowerCase().includes(q);
      if (!matchName && !matchBody && !matchCategory) return false;
    }
    return true;
  });

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('error', 'Please enter a template name');
      return;
    }
    if (!bodyText.trim()) {
      addToast('error', 'Please enter template body content');
      return;
    }

    setSaving(true);
    try {
      const created = await templatesApi.create({
        accountId,
        name: name.trim().toLowerCase().replace(/\s+/g, '_'),
        category,
        language,
        header: headerText.trim() || undefined,
        body: bodyText.trim(),
        footer: footerText.trim() || undefined,
        buttons: '[]',
        status: 'pending',
      });
      addToast('success', `Template "${created.name}" created and submitted for approval!`);
      setTemplates(prev => [created, ...prev]);
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Failed to create template:', err);
      addToast('error', err?.response?.data?.message || err?.message || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setHeaderText('');
    setBodyText('👋 Hello {{1}}, your order #{{2}} has been confirmed and is scheduled for immediate dispatch! Thank you for choosing us.');
    setFooterText('Reply STOP to unsubscribe');
    setCategory('marketing');
    setLanguage('en');
  };

  const handleDeleteTemplate = async (id: string, tplName: string) => {
    if (!confirm(`Delete template "${tplName}"?`)) return;
    try {
      await templatesApi.delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      addToast('info', `Template "${tplName}" deleted`);
    } catch {
      setTemplates(prev => prev.filter(t => t.id !== id));
      addToast('info', `Template "${tplName}" deleted`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
        <BackButton onBack={() => onNavigateTab ? onNavigateTab('dashboard') : undefined} label="Back to Previous Page" />
      </div>

      {/* ── 1. Top Header Banner Matching Design 13 ───────────────────────── */}
      <div style={styles.headerCard}>
        <div style={styles.headerSilkWave}>
          <svg width="100%" height="100%" viewBox="0 0 700 80" fill="none" preserveAspectRatio="none">
            <path d="M0 60 Q 200 10, 400 50 T 700 20" stroke="rgba(45, 212, 191, 0.18)" strokeWidth="1.8" fill="none" />
            <path d="M50 75 Q 250 25, 450 65 T 700 35" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.4" fill="none" />
          </svg>
        </div>

        <div style={styles.headerLeft}>
          <div style={styles.headerIconBox}>
            <FileText size={24} color="#2dd4bf" />
            <div style={styles.headerIconPlusBadge}>
              <Plus size={11} color="#041215" strokeWidth={3} />
            </div>
          </div>
          <div>
            <h1 style={styles.pageTitle}>Message Templates</h1>
            <p style={styles.pageSubtitle}>
              Create and manage message templates for quick and efficient communication.
            </p>
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* 3D Isometric Art matching Mockup */}
          <div style={styles.bannerArtBox}>
            <svg width="240" height="74" viewBox="0 0 240 74" fill="none">
              {/* Radial glow aura */}
              <circle cx="120" cy="37" r="32" fill="rgba(16, 185, 129, 0.16)" filter="blur(10px)" />

              {/* Chat bubble top-left */}
              <g transform="translate(42, 12)">
                <rect x="0" y="0" width="34" height="20" rx="5" fill="#0b2b31" stroke="#2dd4bf" strokeWidth="1.2" opacity="0.9" />
                <line x1="6" y1="7" x2="26" y2="7" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="6" y1="12" x2="20" y2="12" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Central WhatsApp Screen */}
              <g transform="translate(90, 8)">
                <rect x="0" y="0" width="36" height="56" rx="8" fill="#082227" stroke="#10b981" strokeWidth="1.6" />
                <circle cx="18" cy="28" r="11" fill="#10b981" />
                {/* WhatsApp Phone Logo */}
                <path
                  d="M13 23.5 C13 21 15 19 18 19 C21 19 23 21 23 23.5 C23 25.5 21.5 27.2 19.5 27.8 L19.2 30 L17.2 29.2 C14.8 28.5 13 26.2 13 23.5 Z"
                  fill="#ffffff"
                />
              </g>

              {/* Translucent Chat bubble middle-right */}
              <g transform="translate(136, 18)">
                <rect x="0" y="0" width="36" height="22" rx="6" fill="#082b33" stroke="#2dd4bf" strokeWidth="1.2" />
                <line x1="6" y1="8" x2="28" y2="8" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="6" y1="13" x2="22" y2="13" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* 3D Paper Airplane flying right */}
              <g transform="translate(182, 16)">
                <path d="M0 16 L22 2 L12 22 Z" fill="#2dd4bf" opacity="0.95" />
                <path d="M12 22 L22 2 L20 19 Z" fill="#14b8a6" />
              </g>

              {/* Sparkles */}
              <circle cx="75" cy="45" r="2" fill="#2dd4bf" />
              <circle cx="170" cy="50" r="1.5" fill="#10b981" />
            </svg>
          </div>

          {/* + New Template Button */}
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            style={styles.newTemplateBtn}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* ── 2. Filter Bar & Search Controls Matching Design 13 ─────────────── */}
      <div style={styles.controlsRow}>
        {/* Left Filter Pills with Live Counts */}
        <div style={styles.filterPillsGroup}>
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'draft', label: `Draft (${counts.draft})` },
            { id: 'pending', label: `Pending (${counts.pending})` },
            { id: 'approved', label: `Approved (${counts.approved})` },
            { id: 'rejected', label: `Rejected (${counts.rejected})` },
          ].map(pill => {
            const isActive = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id as any)}
                style={{
                  ...styles.statusPillBtn,
                  ...(isActive ? styles.statusPillBtnActive : {}),
                }}
              >
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Search, Category Dropdown & Layout Mode */}
        <div style={styles.controlsRightGroup}>
          {/* Search Box */}
          <div style={styles.searchBox}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search templates..."
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

          {/* Category Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              style={styles.categoryDropdownBtn}
            >
              <SlidersHorizontal size={13} color="#2dd4bf" />
              <span>
                {categoryFilter === 'all'
                  ? 'All Categories'
                  : categoryFilter === 'marketing'
                  ? 'Marketing'
                  : categoryFilter === 'customer_support'
                  ? 'Customer Support'
                  : categoryFilter === 'notifications'
                  ? 'Notifications'
                  : categoryFilter === 'general'
                  ? 'General'
                  : 'Others'}
              </span>
              <ChevronRight
                size={13}
                color="#64748b"
                style={{
                  transform: showCategoryDropdown ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>

            {showCategoryDropdown && (
              <div style={styles.dropdownMenu}>
                {[
                  { id: 'all', label: 'All Categories' },
                  { id: 'marketing', label: 'Marketing' },
                  { id: 'customer_support', label: 'Customer Support' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'general', label: 'General' },
                  { id: 'others', label: 'Others' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setCategoryFilter(opt.id);
                      setShowCategoryDropdown(false);
                    }}
                    style={{
                      ...styles.dropdownItem,
                      color: categoryFilter === opt.id ? '#2dd4bf' : '#cbd5e1',
                      background: categoryFilter === opt.id ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                    }}
                  >
                    <span>{opt.label}</span>
                    {categoryFilter === opt.id && <Check size={13} color="#2dd4bf" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Toggle: Grid vs List */}
          <div style={styles.viewToggleWrap}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                ...styles.viewToggleBtn,
                background: viewMode === 'grid' ? '#2dd4bf' : 'transparent',
                color: viewMode === 'grid' ? '#041215' : '#64748b',
              }}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                ...styles.viewToggleBtn,
                background: viewMode === 'list' ? '#2dd4bf' : 'transparent',
                color: viewMode === 'list' ? '#041215' : '#64748b',
              }}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Main 2-Column Content Area Matching Design 13 ──────────────── */}
      <div style={styles.mainGrid}>
        {/* Left / Center Main Container */}
        <div style={styles.leftColumn}>
          {filteredTemplates.length === 0 ? (
            /* Empty State Matching Design 13 */
            <div style={styles.emptyContainer}>
              {/* 3D Glowing Document Art */}
              <div style={styles.emptyArtWrapper}>
                <svg width="180" height="130" viewBox="0 0 180 130" fill="none">
                  {/* Radial green halo */}
                  <circle cx="90" cy="65" r="45" fill="rgba(16, 185, 129, 0.2)" filter="blur(16px)" />

                  {/* Cloud backing */}
                  <ellipse cx="90" cy="70" rx="60" ry="34" fill="#082329" opacity="0.8" />

                  {/* Document Box */}
                  <g transform="translate(68, 30)">
                    <rect x="0" y="0" width="44" height="56" rx="8" fill="#08282e" stroke="#2dd4bf" strokeWidth="1.8" />
                    {/* Fold corner */}
                    <path d="M30 0 L44 14 L30 14 Z" fill="#14b8a6" />
                    {/* Document Lines */}
                    <line x1="8" y1="20" x2="24" y2="20" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="8" y1="27" x2="34" y2="27" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="8" y1="34" x2="28" y2="34" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" />
                  </g>

                  {/* + Badge in bottom right */}
                  <circle cx="118" cy="80" r="13" fill="#10b981" />
                  <line x1="118" y1="74" x2="118" y2="86" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="112" y1="80" x2="124" y2="80" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />

                  {/* Small Sparkle Stars */}
                  <circle cx="48" cy="40" r="2" fill="#2dd4bf" />
                  <circle cx="138" cy="34" r="1.5" fill="#2dd4bf" />
                  <circle cx="145" cy="85" r="2" fill="#10b981" />
                </svg>
              </div>

              <h2 style={styles.emptyTitle}>No templates yet!</h2>
              <p style={styles.emptySubtitle}>
                Create your first approved message template to start sending quick replies.
              </p>

              <button
                onClick={() => { resetForm(); setShowCreateModal(true); }}
                style={styles.createTemplateBtn}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Create Template</span>
              </button>
            </div>
          ) : (
            /* Populated Templates Grid / List */
            <div style={viewMode === 'grid' ? styles.templatesGrid : styles.templatesList}>
              {filteredTemplates.map(tpl => (
                <div key={tpl.id} style={styles.templateCard}>
                  <div style={styles.tplCardTopRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={styles.tplIconCircle}>
                        <FileText size={15} color="#2dd4bf" />
                      </div>
                      <div>
                        <div style={styles.tplName}>{tpl.name}</div>
                        <div style={styles.tplCategoryBadge}>
                          <Tag size={10} />
                          <span>{tpl.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span style={{
                      ...styles.statusBadge,
                      ...(tpl.status === 'approved'
                        ? styles.statusApproved
                        : tpl.status === 'pending'
                        ? styles.statusPending
                        : tpl.status === 'rejected'
                        ? styles.statusRejected
                        : styles.statusDraft),
                    }}>
                      {tpl.status === 'approved' && <CheckCircle2 size={11} />}
                      {tpl.status === 'pending' && <Clock size={11} />}
                      {tpl.status === 'rejected' && <XCircle size={11} />}
                      <span>{tpl.status.toUpperCase()}</span>
                    </span>
                  </div>

                  {/* Body Preview */}
                  <div style={styles.tplBodyPreview}>
                    {tpl.header && (
                      <div style={{ fontWeight: 600, color: '#2dd4bf', marginBottom: 4 }}>
                        {tpl.header}
                      </div>
                    )}
                    <div>{tpl.body}</div>
                    {tpl.footer && (
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                        {tpl.footer}
                      </div>
                    )}
                  </div>

                  {/* Bottom Meta & Actions */}
                  <div style={styles.tplCardBottom}>
                    <div style={styles.tplMetaText}>
                      <Globe size={11} color="#64748b" />
                      <span>{tpl.language.toUpperCase()}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {tpl.status === 'draft' && (
                        <button
                          onClick={async () => {
                            try {
                              await templatesApi.submit(tpl.id);
                              addToast('success', `Submitted "${tpl.name}" to Meta!`);
                              loadTemplates();
                            } catch {
                              addToast('info', `Submitted "${tpl.name}" for review`);
                            }
                          }}
                          style={styles.submitMetaBtn}
                          title="Submit to Meta"
                        >
                          <Send size={11} />
                          <span>Submit</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        style={styles.deleteTplBtn}
                        title="Delete template"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Pro Tip Card Matching Design 13 */}
          <div style={styles.proTipCard}>
            <div style={styles.proTipWave}>
              <svg width="140" height="70" viewBox="0 0 140 70" fill="none">
                <path d="M0 55 Q 50 20, 90 45 T 140 25" stroke="rgba(45, 212, 191, 0.22)" strokeWidth="1.8" fill="none" />
              </svg>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
              <div style={styles.lightbulbWrap}>
                <Lightbulb size={20} color="#2dd4bf" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.proTipTitle}>Pro Tip</div>
                <div style={styles.proTipText}>
                  Use template categories to keep your messages organized and easy to find.
                </div>
              </div>
            </div>

            {/* Subtle paper airplane watermark */}
            <div style={styles.proTipAirplane}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M4 22 L32 6 L18 30 Z" fill="rgba(45, 212, 191, 0.28)" />
                <path d="M18 30 L32 6 L28 26 Z" fill="rgba(20, 184, 166, 0.35)" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Template Categories Panel Matching Design 13 */}
        <div style={styles.rightPanel}>
          <div style={styles.categoriesCard}>
            <div style={styles.categoriesHeader}>
              <div style={styles.categoriesHeaderLeft}>
                <FileText size={17} color="#2dd4bf" />
                <span style={styles.categoriesTitle}>Template Categories</span>
              </div>
            </div>

            <div style={styles.categoriesList}>
              {[
                {
                  id: 'marketing',
                  name: 'Marketing',
                  icon: <Megaphone size={16} color="#2dd4bf" />,
                  count: categoryCounts.marketing,
                  activeColor: '#2dd4bf',
                },
                {
                  id: 'customer_support',
                  name: 'Customer Support',
                  icon: <Headphones size={16} color="#2dd4bf" />,
                  count: categoryCounts.customer_support,
                  activeColor: '#38bdf8',
                },
                {
                  id: 'notifications',
                  name: 'Notifications',
                  icon: <Bell size={16} color="#a78bfa" />,
                  count: categoryCounts.notifications,
                  activeColor: '#a78bfa',
                },
                {
                  id: 'general',
                  name: 'General',
                  icon: <MessageSquare size={16} color="#f59e0b" />,
                  count: categoryCounts.general,
                  activeColor: '#f59e0b',
                },
                {
                  id: 'others',
                  name: 'Others',
                  icon: <MoreHorizontal size={16} color="#2dd4bf" />,
                  count: categoryCounts.others,
                  activeColor: '#2dd4bf',
                },
              ].map(cat => {
                const isSelected = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (categoryFilter === cat.id) {
                        setCategoryFilter('all');
                      } else {
                        setCategoryFilter(cat.id);
                      }
                    }}
                    style={{
                      ...styles.categoryItemBtn,
                      ...(isSelected ? styles.categoryItemBtnActive : {}),
                    }}
                  >
                    <div style={styles.categoryItemLeft}>
                      <div style={styles.catIconBox}>
                        {cat.icon}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{
                          ...styles.catName,
                          color: isSelected ? '#2dd4bf' : '#ffffff',
                        }}>
                          {cat.name}
                        </div>
                        <div style={styles.catCount}>{cat.count}</div>
                      </div>
                    </div>

                    <ChevronRight size={15} color={isSelected ? '#2dd4bf' : '#64748b'} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Modal: Create New Template with Live WhatsApp Preview ──────── */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <FileText size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Create Message Template
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Meta-compliant templates for instant broadcast and automated replies
                  </div>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} style={styles.modalBodyGrid}>
              {/* Form Controls */}
              <div style={styles.formCol}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Template Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. order_confirmation_vip"
                    value={name}
                    onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    required
                    style={styles.modalInput}
                  />
                  <div style={styles.formHelp}>Lowercase letters, numbers, and underscores only.</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Category *</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as any)}
                      style={styles.modalSelect}
                    >
                      <option value="marketing">Marketing</option>
                      <option value="customer_support">Customer Support</option>
                      <option value="notifications">Notifications / Utility</option>
                      <option value="general">General</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      style={styles.modalSelect}
                    >
                      <option value="en">English (en)</option>
                      <option value="es">Spanish (es)</option>
                      <option value="pt">Portuguese (pt)</option>
                      <option value="hi">Hindi (hi)</option>
                      <option value="gu">Gujarati (gu)</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Header (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ORDER STATUS UPDATE"
                    value={headerText}
                    onChange={e => setHeaderText(e.target.value)}
                    style={styles.modalInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={styles.formLabel}>Body Text *</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => setBodyText(prev => prev + ' {{1}}')}
                        style={styles.varBtn}
                      >
                        + &#123;&#123;1&#125;&#125;
                      </button>
                      <button
                        type="button"
                        onClick={() => setBodyText(prev => prev + ' {{2}}')}
                        style={styles.varBtn}
                      >
                        + &#123;&#123;2&#125;&#125;
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={bodyText}
                    onChange={e => setBodyText(e.target.value)}
                    required
                    style={styles.modalTextarea}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Footer (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Reply STOP to unsubscribe"
                    value={footerText}
                    onChange={e => setFooterText(e.target.value)}
                    style={styles.modalInput}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
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
                    {saving ? 'Submitting...' : 'Submit to Meta & Save'}
                  </button>
                </div>
              </div>

              {/* Right Live WhatsApp Bubble Preview */}
              <div style={styles.previewCol}>
                <div style={styles.previewCardTitle}>
                  <Eye size={14} color="#2dd4bf" />
                  <span>Live Message Preview</span>
                </div>

                <div style={styles.phoneScreen}>
                  <div style={styles.phoneHeader}>
                    <div style={styles.phoneAvatar}>CP</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }}>Business Account</div>
                      <div style={{ fontSize: 9.5, color: '#2dd4bf' }}>Official Channel</div>
                    </div>
                  </div>

                  <div style={styles.phoneMessageArea}>
                    <div style={styles.waBubble}>
                      {headerText && (
                        <div style={styles.waHeader}>{headerText}</div>
                      )}
                      <div style={styles.waBody}>
                        {bodyText.replace(/\{\{1\}\}/g, 'Alex').replace(/\{\{2\}\}/g, '98234')}
                      </div>
                      {footerText && (
                        <div style={styles.waFooter}>{footerText}</div>
                      )}
                      <div style={styles.waTime}>10:42 AM · Sent</div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
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

  // 1. Header Card
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
  headerIconPlusBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#2dd4bf',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  newTemplateBtn: {
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

  // 2. Filter Controls Bar
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  filterPillsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusPillBtn: {
    padding: '7px 16px',
    borderRadius: 20,
    background: 'rgba(12, 28, 33, 0.7)',
    border: '1px solid rgba(45, 212, 191, 0.18)',
    color: '#94a3b8',
    fontSize: 12.5,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  statusPillBtnActive: {
    background: 'linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)',
    border: '1px solid #2dd4bf',
    color: '#041215',
    fontWeight: 700,
    boxShadow: '0 0 14px rgba(45, 212, 191, 0.45)',
  },
  controlsRightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
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
    width: 220,
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
  categoryDropdownBtn: {
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
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    width: 180,
    background: '#091e24',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 12,
    padding: '6px',
    boxShadow: '0 10px 28px rgba(0,0,0,0.6)',
    zIndex: 50,
  },
  dropdownItem: {
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },
  viewToggleWrap: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(12, 28, 33, 0.7)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  viewToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  // 3. Main Grid Layout
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: 20,
    alignItems: 'start',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 32px',
    borderRadius: 16,
    background: 'rgba(8, 22, 26, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
  },
  emptyArtWrapper: {
    marginBottom: 16,
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
    maxWidth: 420,
    lineHeight: 1.5,
    margin: '0 0 22px 0',
  },
  createTemplateBtn: {
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

  // Populated Templates Grid
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  templatesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  templateCard: {
    padding: 16,
    borderRadius: 14,
    background: 'rgba(8, 24, 28, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'all 0.2s ease',
  },
  tplCardTopRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  tplIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tplName: {
    fontSize: 13,
    fontWeight: 700,
    color: '#f8fafc',
  },
  tplCategoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: '#2dd4bf',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  statusApproved: {
    background: 'rgba(16, 185, 129, 0.18)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.4)',
  },
  statusPending: {
    background: 'rgba(245, 158, 11, 0.18)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.4)',
  },
  statusRejected: {
    background: 'rgba(239, 68, 68, 0.18)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.4)',
  },
  statusDraft: {
    background: 'rgba(100, 116, 139, 0.18)',
    color: '#94a3b8',
    border: '1px solid rgba(100, 116, 139, 0.4)',
  },
  tplBodyPreview: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 1.45,
    padding: '10px 12px',
    background: 'rgba(5, 17, 20, 0.65)',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.04)',
    maxHeight: 90,
    overflow: 'hidden',
  },
  tplCardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tplMetaText: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#8696a0',
  },
  submitMetaBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 6,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.4)',
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteTplBtn: {
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

  // Pro Tip Card
  proTipCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderRadius: 14,
    background: 'rgba(8, 26, 30, 0.7)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    overflow: 'hidden',
  },
  proTipWave: {
    position: 'absolute',
    bottom: 0,
    right: 60,
    pointerEvents: 'none',
  },
  lightbulbWrap: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'rgba(45, 212, 191, 0.14)',
    border: '1.5px solid rgba(45, 212, 191, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 0 12px rgba(45, 212, 191, 0.25)',
  },
  proTipTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#2dd4bf',
    marginBottom: 3,
  },
  proTipText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.45,
  },
  proTipAirplane: {
    position: 'relative',
    zIndex: 1,
    opacity: 0.8,
  },

  // Right Column: Template Categories Panel
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  categoriesCard: {
    padding: '18px 20px',
    borderRadius: 16,
    background: 'rgba(8, 22, 26, 0.8)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  categoriesHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottom: '1px solid rgba(45, 212, 191, 0.12)',
  },
  categoriesHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#f8fafc',
  },
  categoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  categoryItemBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(10, 27, 32, 0.65)',
    border: '1px solid rgba(45, 212, 191, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  categoryItemBtnActive: {
    background: 'linear-gradient(90deg, rgba(45, 212, 191, 0.2) 0%, rgba(10, 30, 36, 0.8) 100%)',
    border: '1px solid #2dd4bf',
    boxShadow: '0 0 14px rgba(45, 212, 191, 0.25)',
  },
  categoryItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  catIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: 'rgba(14, 42, 48, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 12.5,
    fontWeight: 600,
    marginBottom: 2,
  },
  catCount: {
    fontSize: 11,
    color: '#8696a0',
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
    maxWidth: 820,
    maxHeight: '92vh',
    overflowY: 'auto',
    background: '#0a1d22',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    borderRadius: 18,
    padding: 26,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(45, 212, 191, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
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
  modalBodyGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: 24,
  },
  formCol: {
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
  formHelp: {
    fontSize: 11,
    color: '#64748b',
  },
  varBtn: {
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    color: '#2dd4bf',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 6,
    cursor: 'pointer',
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

  // WhatsApp Preview Column
  previewCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  previewCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: '#2dd4bf',
  },
  phoneScreen: {
    borderRadius: 16,
    background: '#0b1f24',
    border: '1.5px solid rgba(45, 212, 191, 0.35)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
  },
  phoneHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: '#07161a',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  phoneAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#10b981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
  },
  phoneMessageArea: {
    padding: '24px 16px',
    minHeight: 240,
    background: '#071417',
    backgroundImage: 'radial-gradient(rgba(45, 212, 191, 0.04) 1px, transparent 0)',
    backgroundSize: '16px 16px',
    display: 'flex',
    alignItems: 'flex-start',
  },
  waBubble: {
    maxWidth: '92%',
    padding: '12px 14px',
    borderRadius: '12px 12px 12px 2px',
    background: '#005c4b',
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 1.45,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  waHeader: {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#2dd4bf',
    marginBottom: 4,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: 4,
  },
  waBody: {
    fontSize: 12,
    whiteSpace: 'pre-wrap',
  },
  waFooter: {
    fontSize: 10.5,
    color: '#cbd5e1',
    marginTop: 6,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: 4,
  },
  waTime: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'right',
    marginTop: 6,
  },
};
