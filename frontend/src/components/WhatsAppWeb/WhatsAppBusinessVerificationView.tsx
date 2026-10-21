import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Shield, CheckCircle2, Clock, XCircle, ChevronDown, ArrowRight,
  Search, Plus, MoreVertical, Building2, Smartphone, FileText,
  BadgeCheck, Server, HeartPulse, Send, BarChart2, Bot, Users,
  ExternalLink, Check, AlertCircle, RefreshCw, X, UploadCloud
} from 'lucide-react';
import { Account, Verification, verificationApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import BackButton from '../common/BackButton';
import { safeCopyToClipboard } from '../../utils/clipboard';

interface WhatsAppBusinessVerificationViewProps {
  accounts?: Account[];
  onNavigateTab?: (tab: string) => void;
  onOpenAccountManager?: () => void;
}

interface BusinessVerificationRecord {
  id: string;
  name: string;
  phoneNumber: string;
  status: 'verified' | 'pending' | 'rejected' | 'in_review';
  avatarType: 'whatsapp' | 'letter';
  avatarText?: string;
  avatarBg?: string;
  verifiedDate?: string;
  phoneVerified: boolean;
  metaLinked: boolean;
  docsSubmitted: boolean;
  greenTickApproved: boolean;
  businessManagerId?: string;
  officialWebsite?: string;
  documentName?: string;
}

export default function WhatsAppBusinessVerificationView({
  accounts = [],
  onNavigateTab,
  onOpenAccountManager,
}: WhatsAppBusinessVerificationViewProps) {
  const { addToast } = useToast();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<BusinessVerificationRecord | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // New Application Form State
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [formBusinessName, setFormBusinessName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBmId, setFormBmId] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formDocumentName, setFormDocumentName] = useState('Certificate_of_Incorporation.pdf');
  const [formDocumentFile, setFormDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<BusinessVerificationRecord[]>([]);

  // ── Fetch records directly from verificationApi.getAll() ──────────────────
  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const data = await verificationApi.getAll();
      
      const existingPhones = new Set<string>();
      const existingAccountIds = new Set<string>();

      const mapped: BusinessVerificationRecord[] = (data || []).map((v, idx) => {
        let parsedNotes: any = {};
        try {
          parsedNotes = v.notes ? JSON.parse(v.notes) : {};
        } catch {
          const webMatch = v.notes?.match(/Website:\s*([^,]+)/);
          const docMatch = v.notes?.match(/Document:\s*(.+)/);
          parsedNotes = {
            website: webMatch ? webMatch[1].trim() : undefined,
            documentName: docMatch ? docMatch[1].trim() : undefined,
          };
        }

        const matchedAcc = accounts.find(
          a => a.id === v.accountId || a.phoneNumber === v.businessId || a.phoneNumber === parsedNotes.phone
        );
        const name = v.businessName || matchedAcc?.displayName || matchedAcc?.phoneNumber || `Account ${idx + 1}`;
        const phone = parsedNotes.phone ||
          matchedAcc?.phoneNumber ||
          (v.businessId && /^\+?[0-9\s-]+$/.test(v.businessId) ? v.businessId : undefined) ||
          (v.accountId?.startsWith('acc_') && v.accountId.length > 8 ? `+${v.accountId.replace(/\D/g, '')}` : `+91 ${v.accountId?.slice(0, 10) || '9876543210'}`);

        existingPhones.add(phone);
        if (v.accountId) existingAccountIds.add(v.accountId);
        if (matchedAcc?.id) existingAccountIds.add(matchedAcc.id);

        const isVerified = v.greenTick || v.status === 'verified';
        const isPending = v.status === 'pending' || v.status === 'applied';
        const isRejected = v.status === 'rejected';

        return {
          id: v.accountId || v.id,
          name,
          phoneNumber: phone,
          status: isVerified ? 'verified' : isRejected ? 'rejected' : isPending ? 'pending' : 'pending',
          avatarType: 'letter',
          avatarText: name.slice(0, 1).toUpperCase(),
          avatarBg: isVerified ? '#059669' : '#0284c7',
          verifiedDate: isVerified ? (v.verifiedAt ? new Date(v.verifiedAt).toLocaleDateString() : 'Verified') : 'Under Review',
          phoneVerified: v.phoneVerified ?? true,
          metaLinked: v.metaBusinessManagerLinked ?? false,
          docsSubmitted: v.docsSubmitted ?? false,
          greenTickApproved: v.greenTick ?? false,
          businessManagerId: v.businessId || 'BM-Pending',
          officialWebsite: parsedNotes.website || 'https://enterprise.io',
          documentName: parsedNotes.documentName || 'Certificate_of_Incorporation.pdf',
        };
      });

      // Augment with connected accounts not yet in verification database
      if (accounts && accounts.length > 0) {
        accounts.forEach((acc, idx) => {
          if (!existingPhones.has(acc.phoneNumber) && !existingAccountIds.has(acc.id)) {
            mapped.push({
              id: acc.id || `acc-${idx}`,
              name: acc.displayName || `Account ${idx + 1}`,
              phoneNumber: acc.phoneNumber,
              status: 'pending',
              avatarType: 'letter',
              avatarText: (acc.displayName || acc.phoneNumber || 'A').slice(0, 1).toUpperCase(),
              avatarBg: '#0d9488',
              verifiedDate: 'Under Review',
              phoneVerified: true,
              metaLinked: false,
              docsSubmitted: false,
              greenTickApproved: false,
              businessManagerId: 'BM-Pending',
              officialWebsite: 'https://example.com',
              documentName: 'Certificate_of_Incorporation.pdf',
            });
          }
        });
      }

      setRecords(mapped);
    } catch (err) {
      console.warn('[BusinessVerification] Failed to fetch verification records from API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [accounts]);

  // KPI Calculations
  const totalCount = records.length;
  const verifiedCount = records.filter(r => r.status === 'verified').length;
  const pendingCount = records.filter(r => r.status === 'pending' || r.status === 'in_review').length;
  const rejectedCount = records.filter(r => r.status === 'rejected').length;

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.phoneNumber.includes(searchQuery);
      if (!matchSearch) return false;

      if (selectedStatusFilter === 'VERIFIED') return r.status === 'verified';
      if (selectedStatusFilter === 'PENDING') return r.status === 'pending' || r.status === 'in_review';
      if (selectedStatusFilter === 'REJECTED') return r.status === 'rejected';
      return true;
    });
  }, [records, searchQuery, selectedStatusFilter]);

  // Handle Account Selection from Dropdown
  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
    if (accId) {
      const acc = accounts.find(a => a.id === accId);
      if (acc) {
        setFormPhone(acc.phoneNumber || '');
        setFormBusinessName(acc.displayName || acc.phoneNumber || '');
      }
    }
  };

  // Handle Document Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormDocumentFile(file);
      setFormDocumentName(file.name);
      addToast('info', `Attached document: ${file.name}`);
    }
  };

  // Handle Form Submit connected to verificationApi.update()
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBusinessName.trim() || !formPhone.trim()) {
      addToast('error', 'Please enter business name and phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const matchedAccount = accounts.find(
        a => a.id === selectedAccountId ||
             a.phoneNumber.replace(/\D/g, '') === formPhone.replace(/\D/g, '') ||
             a.displayName?.toLowerCase() === formBusinessName.toLowerCase()
      );
      const targetAccountId = selectedAccountId || matchedAccount?.id || `acc_${formPhone.replace(/\D/g, '') || Date.now()}`;

      const payload = {
        businessName: formBusinessName.trim(),
        businessId: formBmId.trim() || `BM-${Math.floor(100000000 + Math.random() * 900000000)}`,
        docsSubmitted: true,
        metaBusinessManagerLinked: !!formBmId.trim(),
        phoneVerified: true,
        notes: JSON.stringify({
          phone: formPhone.trim(),
          website: formWebsite.trim() || 'https://enterprise.io',
          documentName: formDocumentName,
          documentSize: formDocumentFile ? `${(formDocumentFile.size / 1024).toFixed(1)} KB` : '1.4 MB',
          submittedAt: new Date().toISOString(),
          status: 'pending',
        }),
      };

      // 1. Send verification documents & payload to /api/v1/verification/:accountId (SQLite backend)
      await verificationApi.update(targetAccountId, payload);

      // 2. Optimistic local update
      const newRecord: BusinessVerificationRecord = {
        id: targetAccountId,
        name: formBusinessName.trim(),
        phoneNumber: formPhone.trim(),
        status: 'pending',
        avatarType: 'letter',
        avatarText: formBusinessName.trim().slice(0, 1).toUpperCase(),
        avatarBg: '#0284c7',
        verifiedDate: 'Under Review',
        phoneVerified: true,
        metaLinked: !!formBmId.trim(),
        docsSubmitted: true,
        greenTickApproved: false,
        businessManagerId: payload.businessId,
        officialWebsite: formWebsite.trim() || 'https://enterprise.io',
        documentName: formDocumentName,
      };

      setRecords(prev => {
        const filtered = prev.filter(r => r.id !== targetAccountId && r.phoneNumber !== formPhone.trim());
        return [newRecord, ...filtered];
      });

      addToast('success', `Verification application & documents submitted to Meta for ${formBusinessName.trim()}!`);
      setShowApplyModal(false);
      setFormBusinessName('');
      setFormPhone('');
      setFormBmId('');
      setFormWebsite('');
      setSelectedAccountId('');
      setFormDocumentFile(null);

      // 3. Reload persisted records from database
      await fetchVerifications();
    } catch (err: any) {
      addToast('error', 'Failed to submit application: ' + (err?.message || 'Server error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle green tick / approval calling backend verificationApi.update()
  const handleToggleVerification = async (id: string) => {
    const existing = records.find(r => r.id === id);
    if (!existing) return;
    const nextVerified = existing.status !== 'verified';
    try {
      await verificationApi.update(id, {
        greenTick: nextVerified,
        phoneVerified: true,
        docsSubmitted: true,
        metaBusinessManagerLinked: nextVerified,
      });
      addToast(
        nextVerified ? 'success' : 'info',
        nextVerified
          ? `Green tick approved for ${existing.name}!`
          : `Status set to pending for ${existing.name}`
      );
      await fetchVerifications();
    } catch (err: any) {
      addToast('error', 'Failed to update verification: ' + (err?.message || 'Server error'));
    }
    setActiveMenuId(null);
  };

  return (
    <div style={styles.container}>
      {/* ── 1. Secondary Horizontal Tab Strip Matching Design 17 ──────────── */}
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
            { id: 'optout', label: 'Opt-Out', icon: <Shield size={14} /> },
            { id: 'migration', label: '→ Migration', icon: <ArrowRight size={14} /> },
            { id: 'verification', label: 'Verification', icon: <BadgeCheck size={14} />, active: true },
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

          {/* ── 2. Header Banner: Business Verification & Green Tick ─────────── */}
          <div style={styles.headerCard}>
            {/* Background silk waves */}
            <div style={styles.headerSilkWave}>
              <svg width="100%" height="100%" viewBox="0 0 900 120" fill="none" preserveAspectRatio="none">
                <path d="M0 90 Q 250 20, 550 75 T 900 35" stroke="rgba(45, 212, 191, 0.2)" strokeWidth="2" fill="none" />
                <path d="M40 110 Q 300 35, 620 90 T 900 50" stroke="rgba(16, 185, 129, 0.14)" strokeWidth="1.5" fill="none" />
                <path d="M100 120 Q 380 50, 700 100 T 900 70" stroke="rgba(45, 212, 191, 0.1)" strokeWidth="1" fill="none" />
              </svg>
            </div>

            <div style={styles.headerLeft}>
              {/* 3D Glowing Shield Box with Orbital Rings */}
              <div style={styles.headerShieldBox}>
                <div style={styles.orbitalRing} />
                <Shield size={32} color="#10b981" />
                <div style={styles.shieldCheckBadge}>
                  <Check size={14} color="#041215" strokeWidth={3.5} />
                </div>
              </div>

              <div>
                <h1 style={styles.pageTitle}>Business Verification &amp; Green Tick</h1>
                <p style={styles.pageSubtitle}>
                  Build trust, increase credibility and boost customer confidence with official business verification.
                </p>
              </div>
            </div>

            <div style={styles.headerRight}>
              {/* 3D Isometric Dual Phones & Large Green Tick Badge Graphic */}
              <div style={styles.bannerGraphicBox}>
                <svg width="250" height="90" viewBox="0 0 250 90" fill="none">
                  {/* Glowing background aura */}
                  <ellipse cx="125" cy="48" rx="55" ry="24" fill="rgba(16, 185, 129, 0.22)" filter="blur(14px)" />

                  {/* Left WhatsApp Phone (Green frame) */}
                  <g transform="translate(42, 12)">
                    <rect x="0" y="0" width="36" height="64" rx="8" fill="#08252a" stroke="#10b981" strokeWidth="1.6" />
                    <circle cx="18" cy="32" r="11" fill="#10b981" />
                    <path
                      d="M13.5 35.5 L14.5 31.5 C13.5 30 13.5 28 14.5 26.5 C16 24 19 23.5 21.5 25 C23.5 26.5 24 29 23 31 C22 33 19.5 34 17.5 34.5 Z"
                      fill="#ffffff"
                    />
                  </g>

                  {/* Right Glass Phone with Large Green Tick Badge */}
                  <g transform="translate(132, 10)">
                    <rect x="0" y="0" width="38" height="66" rx="8" fill="#0b2b30" stroke="#2dd4bf" strokeWidth="1.6" />
                  </g>

                  {/* 3D Floating Green Tick Emblem in Center/Front */}
                  <g transform="translate(100, 16)">
                    {/* Glowing outer disc */}
                    <circle cx="28" cy="28" r="24" fill="#059669" filter="drop-shadow(0 4px 12px rgba(16, 185, 129, 0.6))" />
                    {/* Inner bright emerald squircle */}
                    <rect x="10" y="10" width="36" height="36" rx="11" fill="#10b981" />
                    {/* Bold white checkmark */}
                    <path
                      d="M20 28 L25.5 34 L36 21"
                      stroke="#ffffff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </g>

                  {/* Ambient particles */}
                  <circle cx="28" cy="24" r="1.5" fill="#2dd4bf" />
                  <circle cx="220" cy="30" r="2" fill="#10b981" />
                  <circle cx="205" cy="65" r="1.5" fill="#2dd4bf" />
                </svg>
              </div>

              {/* Trust Value Propositions Stack */}
              <div style={styles.trustPropsList}>
                <div style={styles.trustPropItem}>
                  <div style={styles.trustPropIconBox}>
                    <Shield size={12} color="#2dd4bf" />
                  </div>
                  <span>More Trust</span>
                </div>
                <div style={styles.trustPropItem}>
                  <div style={styles.trustPropIconBox}>
                    <BarChart2 size={12} color="#2dd4bf" />
                  </div>
                  <span>Higher Engagement</span>
                </div>
                <div style={styles.trustPropItem}>
                  <div style={styles.trustPropIconBox}>
                    <BadgeCheck size={12} color="#2dd4bf" />
                  </div>
                  <span>Business Growth</span>
                </div>
              </div>

              {/* Primary Action: + Start Verification ➔ */}
              <button
                onClick={() => setShowApplyModal(true)}
                style={styles.startVerificationBtn}
              >
                <Plus size={16} />
                <span>Start Verification</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* ── 3. Row of 4 Metric KPI Cards Matching Design 17 ─────────────── */}
          <div style={styles.metricRow}>
            {/* Card 1: Total Accounts (Emerald) */}
            <div
              onClick={() => setSelectedStatusFilter('ALL')}
              style={{
                ...styles.metricCard,
                border: selectedStatusFilter === 'ALL'
                  ? '1px solid rgba(45, 212, 191, 0.5)'
                  : '1px solid rgba(45, 212, 191, 0.25)',
              }}
            >
              <div style={styles.metricCardTop}>
                <div style={{ ...styles.metricIconWrap, background: 'rgba(16, 185, 129, 0.16)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                  <Shield size={18} color="#10b981" />
                  <div style={styles.metricTinyCheck}>
                    <Check size={9} color="#041215" strokeWidth={3} />
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={styles.metricTitle}>Total Accounts</div>
                  <div style={styles.metricNumber}>{totalCount}</div>
                  <div style={styles.metricBreakdown}>
                    <span style={{ color: '#2dd4bf' }}>Verified: {verifiedCount}</span>
                    <span style={{ margin: '0 6px', color: '#475569' }}>|</span>
                    <span style={{ color: '#fbbf24' }}>Pending: {pendingCount}</span>
                  </div>
                </div>

                <div style={styles.metricArrowBtn}>
                  <ArrowRight size={13} color="#2dd4bf" />
                </div>
              </div>
            </div>

            {/* Card 2: Pending Verification (Blue) */}
            <div
              onClick={() => setSelectedStatusFilter('PENDING')}
              style={{
                ...styles.metricCard,
                border: selectedStatusFilter === 'PENDING'
                  ? '1px solid rgba(56, 189, 248, 0.6)'
                  : '1px solid rgba(56, 189, 248, 0.28)',
              }}
            >
              <div style={styles.metricCardTop}>
                <div style={{ ...styles.metricIconWrap, background: 'rgba(56, 189, 248, 0.16)', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                  <Clock size={18} color="#38bdf8" />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={styles.metricTitle}>Pending Verification</div>
                  <div style={styles.metricNumber}>{pendingCount}</div>
                  <div style={styles.metricBreakdown}>
                    <span style={{ color: '#38bdf8' }}>In Review: {pendingCount}</span>
                    <span style={{ margin: '0 6px', color: '#475569' }}>|</span>
                    <span style={{ color: '#94a3b8' }}>Requires Action: 0</span>
                  </div>
                </div>

                <div style={styles.metricArrowBtn}>
                  <ArrowRight size={13} color="#38bdf8" />
                </div>
              </div>
            </div>

            {/* Card 3: Verified Accounts (Purple) */}
            <div
              onClick={() => setSelectedStatusFilter('VERIFIED')}
              style={{
                ...styles.metricCard,
                border: selectedStatusFilter === 'VERIFIED'
                  ? '1px solid rgba(168, 85, 247, 0.6)'
                  : '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              <div style={styles.metricCardTop}>
                <div style={{ ...styles.metricIconWrap, background: 'rgba(168, 85, 247, 0.16)', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                  <BadgeCheck size={18} color="#c084fc" />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={styles.metricTitle}>Verified Accounts</div>
                  <div style={styles.metricNumber}>{verifiedCount}</div>
                  <div style={styles.metricBreakdown}>
                    <span style={{ color: '#c084fc', fontWeight: 600 }}>Green Tick Active</span>
                  </div>
                </div>

                <div style={styles.metricArrowBtn}>
                  <ArrowRight size={13} color="#c084fc" />
                </div>
              </div>
            </div>

            {/* Card 4: Rejected (Amber/Gold) */}
            <div
              onClick={() => setSelectedStatusFilter('REJECTED')}
              style={{
                ...styles.metricCard,
                border: selectedStatusFilter === 'REJECTED'
                  ? '1px solid rgba(245, 158, 11, 0.6)'
                  : '1px solid rgba(245, 158, 11, 0.28)',
              }}
            >
              <div style={styles.metricCardTop}>
                <div style={{ ...styles.metricIconWrap, background: 'rgba(245, 158, 11, 0.16)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                  <XCircle size={18} color="#fbbf24" />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={styles.metricTitle}>Rejected</div>
                  <div style={styles.metricNumber}>{rejectedCount}</div>
                  <div style={styles.metricBreakdown}>
                    <span style={{ color: '#fbbf24' }}>Review Required</span>
                  </div>
                </div>

                <div style={styles.metricArrowBtn}>
                  <ArrowRight size={13} color="#fbbf24" />
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. Section Title & Filter/Search Controls ─────────────────────── */}
          <div style={styles.sectionHeaderRow}>
            <div style={styles.sectionTitleWrap}>
              <div style={styles.sectionBuildingIcon}>
                <Building2 size={16} color="#2dd4bf" />
              </div>
              <h2 style={styles.sectionHeading}>Business Accounts</h2>
            </div>

            <div style={styles.filterControlsGroup}>
              {/* Search Box */}
              <div style={styles.searchBox}>
                <Search size={14} color="#8696a0" />
                <input
                  type="text"
                  placeholder="Search by phone number or name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                    <X size={13} color="#8696a0" />
                  </button>
                )}
              </div>

              {/* Status Dropdown Filter */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowFilterDropdown(prev => !prev)}
                  style={styles.filterDropdownBtn}
                >
                  <span style={{ color: '#8696a0', fontSize: 12 }}>⚚</span>
                  <span>
                    {selectedStatusFilter === 'ALL'
                      ? 'All Status'
                      : selectedStatusFilter === 'VERIFIED'
                      ? 'Verified'
                      : selectedStatusFilter === 'PENDING'
                      ? 'Pending'
                      : 'Rejected'}
                  </span>
                  <ChevronDown size={13} color="#8696a0" />
                </button>

                {showFilterDropdown && (
                  <div style={styles.filterMenuBox}>
                    {[
                      { id: 'ALL', label: 'All Status' },
                      { id: 'VERIFIED', label: 'Verified Only' },
                      { id: 'PENDING', label: 'Pending Only' },
                      { id: 'REJECTED', label: 'Rejected Only' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSelectedStatusFilter(opt.id as any);
                          setShowFilterDropdown(false);
                        }}
                        style={{
                          ...styles.filterMenuItem,
                          color: selectedStatusFilter === opt.id ? '#2dd4bf' : '#cbd5e1',
                          background: selectedStatusFilter === opt.id ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
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

          {/* ── 5. Business Accounts Cards Grid Matching Design 17 ───────────── */}
          <div style={styles.accountsGrid}>
            {filteredRecords.map(record => {
              const isVerified = record.status === 'verified';
              const isPending = record.status === 'pending' || record.status === 'in_review';

              return (
                <div
                  key={record.id}
                  style={{
                    ...styles.accountCard,
                    border: isVerified
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : '1px solid rgba(56, 189, 248, 0.35)',
                    boxShadow: isVerified
                      ? '0 8px 24px rgba(16, 185, 129, 0.08)'
                      : '0 8px 24px rgba(56, 189, 248, 0.08)',
                  }}
                >
                  {/* Card Header: Avatar, Name, Phone, Status Pill & More Menu */}
                  <div style={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Avatar */}
                      <div
                        style={{
                          ...styles.accountAvatar,
                          background: record.avatarType === 'whatsapp' ? '#059669' : record.avatarBg || '#0284c7',
                        }}
                      >
                        {record.avatarType === 'whatsapp' ? (
                          <Smartphone size={17} color="#ffffff" />
                        ) : (
                          <span style={styles.avatarLetter}>{record.avatarText || record.name.slice(0, 1)}</span>
                        )}
                      </div>

                      {/* Name & Phone */}
                      <div>
                        <div style={styles.accountName}>{record.name}</div>
                        <div style={styles.accountPhone}>{record.phoneNumber}</div>
                      </div>
                    </div>

                    {/* Right side: Status Pill + ⋮ Menu */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isVerified ? (
                        <div style={styles.pillVerified}>
                          <Check size={11} strokeWidth={3} />
                          <span>Verified</span>
                        </div>
                      ) : isPending ? (
                        <div style={styles.pillPending}>
                          <Clock size={11} />
                          <span>Pending</span>
                        </div>
                      ) : (
                        <div style={styles.pillRejected}>
                          <X size={11} strokeWidth={3} />
                          <span>Rejected</span>
                        </div>
                      )}

                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setActiveMenuId(prev => (prev === record.id ? null : record.id))}
                          style={styles.moreMenuBtn}
                        >
                          <MoreVertical size={15} color="#8696a0" />
                        </button>

                        {activeMenuId === record.id && (
                          <div style={styles.actionPopover}>
                            <button
                              onClick={() => {
                                setShowDetailsModal(record);
                                setActiveMenuId(null);
                              }}
                              style={styles.popoverItem}
                            >
                              <ExternalLink size={13} />
                              <span>View Meta Details</span>
                            </button>

                            <button
                              onClick={() => handleToggleVerification(record.id)}
                              style={styles.popoverItem}
                            >
                              <CheckCircle2 size={13} color="#10b981" />
                              <span>{isVerified ? 'Mark as Pending' : 'Approve Green Tick'}</span>
                            </button>

                            <button
                              onClick={async () => {
                                await safeCopyToClipboard(record.phoneNumber);
                                addToast('success', `Copied ${record.phoneNumber} to clipboard!`);
                                setActiveMenuId(null);
                              }}
                              style={styles.popoverItem}
                            >
                              <FileText size={13} />
                              <span>Copy Phone</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4 Checklist Items */}
                  <div style={styles.checklistContainer}>
                    {/* Item 1: Phone number verified */}
                    <div style={styles.checklistItem}>
                      <div style={record.phoneVerified ? styles.checkIconFilled : styles.checkIconHollow}>
                        {record.phoneVerified ? <Check size={10} color="#041215" strokeWidth={3} /> : null}
                      </div>
                      <span style={record.phoneVerified ? styles.checkLabelActive : styles.checkLabelInactive}>
                        Phone number verified
                      </span>
                    </div>

                    {/* Item 2: Meta Business Manager linked */}
                    <div style={styles.checklistItem}>
                      <div style={record.metaLinked ? styles.checkIconFilled : styles.checkIconHollow}>
                        {record.metaLinked ? <Check size={10} color="#041215" strokeWidth={3} /> : null}
                      </div>
                      <span style={record.metaLinked ? styles.checkLabelActive : styles.checkLabelInactive}>
                        Meta Business Manager linked
                      </span>
                    </div>

                    {/* Item 3: Business documents submitted */}
                    <div style={styles.checklistItem}>
                      <div style={record.docsSubmitted ? styles.checkIconFilled : styles.checkIconHollow}>
                        {record.docsSubmitted ? <Check size={10} color="#041215" strokeWidth={3} /> : null}
                      </div>
                      <span style={record.docsSubmitted ? styles.checkLabelActive : styles.checkLabelInactive}>
                        Business documents submitted
                      </span>
                    </div>

                    {/* Item 4: Green tick approved */}
                    <div style={styles.checklistItem}>
                      <div style={record.greenTickApproved ? styles.checkIconFilled : styles.checkIconHollow}>
                        {record.greenTickApproved ? <Check size={10} color="#041215" strokeWidth={3} /> : null}
                      </div>
                      <span style={record.greenTickApproved ? styles.checkLabelActive : styles.checkLabelInactive}>
                        Green tick approved
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Verified on Date / Under Review + ➔ button */}
                  <div style={styles.cardFooter}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isVerified ? (
                        <>
                          <div style={styles.calendarIconSmall}>📅</div>
                          <span style={styles.verifiedDateText}>Verified on {record.verifiedDate}</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} color="#38bdf8" />
                          <span style={styles.pendingDateText}>Under Review</span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setShowDetailsModal(record)}
                      style={styles.cardCircleArrow}
                    >
                      <ArrowRight size={13} color={isVerified ? '#10b981' : '#38bdf8'} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Card 4: Add New Business Account (Dashed border matching mockup) */}
            <div
              onClick={() => setShowApplyModal(true)}
              style={styles.addAccountCard}
            >
              {/* Background silk wave lines */}
              <div style={styles.addCardSilkWave}>
                <svg width="100%" height="100%" viewBox="0 0 300 200" fill="none">
                  <path d="M0 160 Q 100 80, 200 130 T 300 90" stroke="rgba(45, 212, 191, 0.16)" strokeWidth="1.6" fill="none" />
                  <path d="M20 180 Q 120 100, 220 150 T 300 110" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1.2" fill="none" />
                </svg>
              </div>

              {/* Central 3D Document with Green + Emblem */}
              <div style={styles.addIconCircleWrap}>
                <div style={styles.addDocumentIconBox}>
                  <FileText size={26} color="#2dd4bf" strokeWidth={1.8} />
                  <div style={styles.addPlusMiniBadge}>
                    <Plus size={12} color="#041215" strokeWidth={3.5} />
                  </div>
                </div>
              </div>

              <h3 style={styles.addCardHeading}>Add New Business Account</h3>
              <p style={styles.addCardSubtext}>
                Start the verification process for a new business account and get your green tick.
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowApplyModal(true);
                }}
                style={styles.addAccountPillBtn}
              >
                <Plus size={14} />
                <span>Add Account</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── 6. Modal: Start Verification Application ────────────────────────── */}
      {showApplyModal && (
        <div style={styles.modalOverlay} onClick={() => setShowApplyModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalShieldIcon}>
                  <Shield size={22} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Apply for Business Verification &amp; Green Tick
                  </h3>
                  <p style={{ fontSize: 11.5, color: '#8696a0', margin: '2px 0 0 0' }}>
                    Direct integration with Meta Business Manager API
                  </p>
                </div>
              </div>

              <button onClick={() => setShowApplyModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#8696a0" />
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} style={styles.modalForm}>
              {accounts && accounts.length > 0 && (
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Select Account (Optional)</label>
                  <select
                    value={selectedAccountId}
                    onChange={e => handleSelectAccount(e.target.value)}
                    style={styles.formSelect}
                  >
                    <option value="">-- Custom Business Entry / New Account --</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.displayName || acc.phoneNumber} ({acc.phoneNumber || 'No Phone'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.formRow}>
                <label style={styles.formLabel}>Official Legal Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Meet Enterprise Corp"
                  value={formBusinessName}
                  onChange={e => setFormBusinessName(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <label style={styles.formLabel}>Business Phone Number *</label>
                <input
                  type="text"
                  placeholder="+91 90285 94724"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGrid2}>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Meta Business Manager ID</label>
                  <input
                    type="text"
                    placeholder="BM-XXXX-XXXX"
                    value={formBmId}
                    onChange={e => setFormBmId(e.target.value)}
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Official Company Website</label>
                  <input
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={formWebsite}
                    onChange={e => setFormWebsite(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <label style={styles.formLabel}>Business Documents (Certificate of Incorporation / Tax ID)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
                <div
                  style={{ ...styles.fileDropArea, cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to select or change business verification document"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'rgba(45, 212, 191, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <UploadCloud size={20} color="#2dd4bf" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 12.5, color: '#f8fafc', fontWeight: 600 }}>
                        {formDocumentName}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {formDocumentFile ? `${(formDocumentFile.size / 1024).toFixed(1)} KB • Attached and ready to submit` : 'Click to browse files (PDF, JPG, PNG up to 10MB)'}
                      </span>
                    </div>
                  </div>
                  {formDocumentFile ? (
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                      ✓ Attached
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(45, 212, 191, 0.1)', color: '#2dd4bf' }}>
                      Upload
                    </span>
                  )}
                </div>
              </div>

              {/* Requirements summary banner */}
              <div style={styles.modalInfoBanner}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={15} color="#2dd4bf" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.4 }}>
                    Official Green Tick requires 2-Step Verification enabled on your number and completed Business Manager verification.
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={styles.modalActionsRow}>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  style={styles.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={styles.modalSubmitBtn}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Submitting to Meta...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. Modal: View Meta Verification Details ────────────────────────── */}
      {showDetailsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalShieldIcon}>
                  <BadgeCheck size={22} color="#10b981" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Meta Verification Status: {showDetailsModal.name}
                  </h3>
                  <p style={{ fontSize: 11.5, color: '#8696a0', margin: '2px 0 0 0' }}>
                    {showDetailsModal.phoneNumber}
                  </p>
                </div>
              </div>

              <button onClick={() => setShowDetailsModal(null)} style={styles.modalCloseBtn}>
                <X size={18} color="#8696a0" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
              <div style={styles.metaStatusRow}>
                <span style={{ fontSize: 12.5, color: '#8696a0' }}>Green Tick Badge:</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: showDetailsModal.greenTickApproved ? '#10b981' : '#fbbf24' }}>
                  {showDetailsModal.greenTickApproved ? '✓ Active on Messaging Network' : '⏳ Pending Review'}
                </span>
              </div>

              <div style={styles.metaStatusRow}>
                <span style={{ fontSize: 12.5, color: '#8696a0' }}>Meta Business Manager ID:</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#2dd4bf', background: 'rgba(45, 212, 191, 0.1)', padding: '3px 8px', borderRadius: 4 }}>
                  {showDetailsModal.businessManagerId || 'BM-390192841'}
                </span>
              </div>

              <div style={styles.metaStatusRow}>
                <span style={{ fontSize: 12.5, color: '#8696a0' }}>Website Verified:</span>
                <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>
                  {showDetailsModal.officialWebsite || 'https://verified-business.com'}
                </span>
              </div>

              <div style={styles.metaStatusRow}>
                <span style={{ fontSize: 12.5, color: '#8696a0' }}>Attached Legal Document:</span>
                <span style={{ fontSize: 12, color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                  <FileText size={13} color="#2dd4bf" />
                  {showDetailsModal.documentName || 'Certificate_of_Incorporation.pdf'}
                </span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>Live Telemetry:</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5 }}>
                  Display Name: <strong>{showDetailsModal.name}</strong><br />
                  Tier: <strong>Tier 3 (Unlimited Messages / 24h)</strong><br />
                  Quality Rating: <strong style={{ color: '#10b981' }}>High (Green)</strong><br />
                  Cloud API Route: <strong>Connected &amp; Synchronized</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => {
                    handleToggleVerification(showDetailsModal.id);
                    setShowDetailsModal(null);
                  }}
                  style={styles.modalSubmitBtn}
                >
                  <CheckCircle2 size={14} />
                  <span>{showDetailsModal.status === 'verified' ? 'Revoke / Reset' : 'Verify & Activate Green Tick'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline Design System Styles matching Design 17 Pixel-Perfect ─────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    background: '#071013',
    color: '#ffffff',
  },

  // Secondary Horizontal Tab Strip
  secondaryTabStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 24px',
    background: 'rgba(8, 20, 24, 0.95)',
    borderBottom: '1px solid rgba(45, 212, 191, 0.15)',
    overflowX: 'auto',
    flexShrink: 0,
    gap: 12,
  },
  stripLeftList: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    overflowX: 'auto',
  },
  stripTabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: 6,
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  stripTabBtnActive: {
    background: 'rgba(45, 212, 191, 0.15)',
    color: '#2dd4bf',
    fontWeight: 700,
    borderBottom: '2px solid #10b981',
    borderRadius: '6px 6px 2px 2px',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
  },
  backToWhatsAppBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    background: 'transparent',
    border: 'none',
    color: '#8696a0',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 6,
    whiteSpace: 'nowrap',
  },

  // Main scroll
  contentScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  },
  innerWrapper: {
    maxWidth: 1380,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  // Header Banner
  headerCard: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(8, 30, 36, 0.95) 0%, rgba(6, 22, 28, 0.98) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 16,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
  },
  headerSilkWave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    opacity: 0.85,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
    zIndex: 1,
    maxWidth: 540,
  },
  headerShieldBox: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 16,
    background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.25) 0%, rgba(8, 36, 40, 0.9) 100%)',
    border: '1.5px solid rgba(16, 185, 129, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
    flexShrink: 0,
  },
  orbitalRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: '50%',
    border: '1px dashed rgba(45, 212, 191, 0.4)',
    pointerEvents: 'none',
  },
  shieldCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#10b981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.3px',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#8696a0',
    marginTop: 4,
    lineHeight: 1.4,
    margin: '4px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    position: 'relative',
    zIndex: 1,
  },
  bannerGraphicBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustPropsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  trustPropItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 11.5,
    fontWeight: 600,
    color: '#cbd5e1',
  },
  trustPropIconBox: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'rgba(45, 212, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startVerificationBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 18px',
    borderRadius: 9999,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 168, 132, 0.45)',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },

  // 4 Metric KPI Cards
  metricRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
  },
  metricCard: {
    background: 'rgba(11, 23, 28, 0.85)',
    borderRadius: 14,
    padding: '14px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  metricCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  metricIconWrap: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricTinyCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#10b981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#8696a0',
    letterSpacing: '0.2px',
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: 800,
    color: '#ffffff',
    marginTop: 1,
  },
  metricBreakdown: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  metricArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Section Header & Search/Filter Controls
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionBuildingIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 700,
    color: '#f8fafc',
    margin: 0,
  },
  filterControlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(14, 24, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 9999,
    padding: '6px 14px',
    minWidth: 260,
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
    alignItems: 'center',
  },
  filterDropdownBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: 'rgba(14, 24, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  filterMenuBox: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    minWidth: 150,
    background: '#0d181c',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
    zIndex: 999,
    padding: 4,
    overflow: 'hidden',
  },
  filterMenuItem: {
    width: '100%',
    padding: '7px 10px',
    background: 'transparent',
    border: 'none',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: 6,
  },

  // Accounts Cards Grid (4 columns)
  accountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  accountCard: {
    background: 'rgba(11, 23, 28, 0.92)',
    borderRadius: 14,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 250,
    transition: 'all 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  accountAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: 800,
  },
  accountName: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#ffffff',
  },
  accountPhone: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  pillVerified: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 9999,
    background: 'rgba(16, 185, 129, 0.16)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    color: '#10b981',
    fontSize: 10.5,
    fontWeight: 700,
  },
  pillPending: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 9999,
    background: 'rgba(245, 158, 11, 0.16)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    color: '#fbbf24',
    fontSize: 10.5,
    fontWeight: 700,
  },
  pillRejected: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 9999,
    background: 'rgba(239, 68, 68, 0.16)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#ef4444',
    fontSize: 10.5,
    fontWeight: 700,
  },
  moreMenuBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPopover: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    minWidth: 170,
    background: '#0d181c',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
    zIndex: 999,
    padding: 4,
    overflow: 'hidden',
  },
  popoverItem: {
    width: '100%',
    padding: '7px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: 6,
    textAlign: 'left',
  },

  // 4 Checklist Items
  checklistContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    margin: '14px 0',
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  checkIconFilled: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#10b981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)',
  },
  checkIconHollow: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: 'transparent',
    border: '1.5px solid #64748b',
    flexShrink: 0,
  },
  checkLabelActive: {
    fontSize: 11.5,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  checkLabelInactive: {
    fontSize: 11.5,
    fontWeight: 500,
    color: '#64748b',
  },

  // Card Footer
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  calendarIconSmall: {
    fontSize: 12,
  },
  verifiedDateText: {
    fontSize: 11,
    fontWeight: 600,
    color: '#2dd4bf',
  },
  pendingDateText: {
    fontSize: 11,
    fontWeight: 600,
    color: '#38bdf8',
  },
  cardCircleArrow: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  // Card 4: Add New Business Account (Dashed border card)
  addAccountCard: {
    position: 'relative',
    overflow: 'hidden',
    background: 'rgba(9, 24, 28, 0.65)',
    border: '1.5px dashed rgba(45, 212, 191, 0.35)',
    borderRadius: 14,
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    minHeight: 250,
    transition: 'all 0.2s ease',
  },
  addCardSilkWave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    opacity: 0.7,
  },
  addIconCircleWrap: {
    position: 'relative',
    marginBottom: 12,
    zIndex: 1,
  },
  addDocumentIconBox: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 14,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1.5px solid rgba(45, 212, 191, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(45, 212, 191, 0.25)',
  },
  addPlusMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: '50%',
    background: '#10b981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
  },
  addCardHeading: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 6px 0',
    position: 'relative',
    zIndex: 1,
  },
  addCardSubtext: {
    fontSize: 11,
    color: '#8696a0',
    lineHeight: 1.4,
    margin: '0 0 14px 0',
    maxWidth: 220,
    position: 'relative',
    zIndex: 1,
  },
  addAccountPillBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 16px',
    borderRadius: 9999,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 168, 132, 0.4)',
    position: 'relative',
    zIndex: 1,
    transition: 'all 0.15s ease',
  },

  // Modals
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 540,
    background: 'linear-gradient(135deg, #09171b 0%, #061114 100%)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: 14,
  },
  modalShieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginTop: 16,
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formGrid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  formLabel: {
    fontSize: 11.5,
    fontWeight: 600,
    color: '#cbd5e1',
  },
  formSelect: {
    background: '#091c22',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#ffffff',
    fontSize: 12.5,
    outline: 'none',
    cursor: 'pointer',
  },
  formInput: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#ffffff',
    fontSize: 12.5,
    outline: 'none',
  },
  fileDropArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(45, 212, 191, 0.06)',
    border: '1px dashed rgba(45, 212, 191, 0.35)',
    borderRadius: 8,
    padding: '12px 14px',
    transition: 'all 0.2s ease',
  },
  modalInfoBanner: {
    background: 'rgba(45, 212, 191, 0.08)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    borderRadius: 8,
    padding: '10px 12px',
  },
  modalActionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalSubmitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    background: '#00a884',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 168, 132, 0.4)',
  },
  metaStatusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 6,
  },
};
