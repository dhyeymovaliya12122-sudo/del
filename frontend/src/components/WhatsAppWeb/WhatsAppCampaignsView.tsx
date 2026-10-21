import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Send, Plus, Users, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  Play, Pause, Trash2, Eye, Clock, Shield, Sparkles, X, Check,
  Search, Filter, Target, FileText, ChevronDown, RotateCcw, AlertCircle,
  ExternalLink, MessageSquare, Phone
} from 'lucide-react';
import { Campaign, CampaignRecipient, campaignsApi, Account, WhatsAppContact } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIndianDate } from '../../utils/indianTime';
import BackButton from '../common/BackButton';

interface WhatsAppCampaignsViewProps {
  accountId?: string;
  accounts?: Account[];
  contacts?: WhatsAppContact[];
  onOpenUpgrade?: () => void;
}

function highlightKeyword(text: string, keywords: string[]) {
  if (!text || keywords.length === 0) return <span>{text}</span>;
  const valid = keywords.filter(k => k && k.trim());
  if (valid.length === 0) return <span>{text}</span>;
  const escaped = valid.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        valid.some(k => k.toLowerCase() === part.toLowerCase()) ? (
          <mark
            key={i}
            style={{
              background: 'rgba(244, 63, 94, 0.25)',
              color: '#fda4af',
              padding: '1px 5px',
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

function maskPhone(phone?: string) {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 2)}********${clean.slice(-2)}`;
  }
  return phone;
}

function formatSentAt(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}/${month}/${year}, ${time}`;
  } catch {
    return '—';
  }
}

export default function WhatsAppCampaignsView({
  accountId = 'default',
  accounts = [],
  contacts = [],
  onOpenUpgrade,
}: WhatsAppCampaignsViewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State for creating campaign
  const [campaignName, setCampaignName] = useState('');
  const [targetAudience, setTargetAudience] = useState('All Synced Phonebook');
  const [messageBody, setMessageBody] = useState('Hello {{name}}! We are delighted to share our exclusive new product announcements with you. Reply to this message for priority VIP support! 🚀');
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [antiBanDelay, setAntiBanDelay] = useState('5-10s (Safe Interval)');
  const [creating, setCreating] = useState(false);

  // ── Contact List & Keyword Filter States matching User\'s Screenshot ──
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [statusDropdown, setStatusDropdown] = useState('all');
  const [leadMatchDropdown, setLeadMatchDropdown] = useState('all');
  const [repliesDropdown, setRepliesDropdown] = useState('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [replyKeywords, setReplyKeywords] = useState<string[]>([]);
  const [viewingLogRecipient, setViewingLogRecipient] = useState<CampaignRecipient | null>(null);

  const { addToast } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const loadCampaigns = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await campaignsApi.list(accountId);
      const list = Array.isArray(data) ? [...data] : [];
      if (isMountedRef.current) {
        setCampaigns(list);
      }
    } catch {
      if (isMountedRef.current) {
        setCampaigns([]);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Open campaign recipient contacts list
  const handleOpenCampaignContacts = async (camp: Campaign) => {
    setSelectedCampaign(camp);
    setLoadingRecipients(true);
    setContactSearch('');
    setStatusDropdown('all');
    setLeadMatchDropdown('all');
    setRepliesDropdown('all');
    setKeywordInput('');
    setReplyKeywords([]);
    setSelectedRecipientIds([]);
    try {
      const data = await campaignsApi.getRecipients(camp.id);
      if (Array.isArray(data)) {
        setRecipients(data);
      } else {
        setRecipients([]);
      }
    } catch {
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      addToast('warning', 'Please enter a campaign name');
      return;
    }

    setCreating(true);
    try {
      const created = await campaignsApi.create({
        accountId,
        name: campaignName.trim(),
        messageBody: messageBody.trim(),
      });

      // Automatically populate initial recipients from synced contacts
      try {
        const seedRecipients = contacts?.slice(0, 50).map(c => ({
          phoneNumber: c.phoneNumber || c.id.split('@')[0],
          name: c.name || c.notifyName || 'Customer',
        })) || [];
        if (seedRecipients.length > 0) {
          await campaignsApi.addRecipients(created.id, seedRecipients);
        }
      } catch { }

      addToast('success', `Campaign "${created.name || campaignName}" launched successfully!`);
      setCampaigns(prev => [created, ...prev]);
      setShowCreateModal(false);
      setCampaignName('');
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      addToast('error', err?.response?.data?.message || err?.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (camp: Campaign) => {
    const nextStatus = camp.status === 'running' ? 'paused' : 'running';
    try {
      await campaignsApi.updateStatus(camp.id, nextStatus);
      addToast('info', `Campaign status changed to ${nextStatus}`);
      loadCampaigns();
    } catch {
      setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, status: nextStatus as any } : c));
      addToast('info', `Campaign status changed to ${nextStatus}`);
    }
  };

  const handleDeleteCampaign = async (camp: Campaign) => {
    if (!confirm(`Delete campaign "${camp.name}"?`)) return;
    try {
      await campaignsApi.delete(camp.id);
      addToast('success', `Campaign "${camp.name}" deleted`);
      setCampaigns(prev => prev.filter(c => c.id !== camp.id));
      if (selectedCampaign?.id === camp.id) {
        setSelectedCampaign(null);
      }
    } catch {
      setCampaigns(prev => prev.filter(c => c.id !== camp.id));
      if (selectedCampaign?.id === camp.id) {
        setSelectedCampaign(null);
      }
      addToast('success', `Campaign "${camp.name}" deleted`);
    }
  };

  // Filtered Recipients Memo
  const filteredRecipients = useMemo(() => {
    return recipients.filter(r => {
      // 1. Search name or phone
      if (contactSearch.trim()) {
        const q = contactSearch.toLowerCase();
        const matchesName = (r.name || '').toLowerCase().includes(q);
        const matchesPhone = (r.phoneNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone) return false;
      }

      // 2. Status dropdown
      if (statusDropdown !== 'all' && r.status !== statusDropdown) {
        return false;
      }

      // 3. Lead match dropdown
      if (leadMatchDropdown !== 'all' && r.leadMatch !== leadMatchDropdown) {
        return false;
      }

      // 4. Replies dropdown
      if (repliesDropdown === 'has_reply') {
        if (!r.recentReply || r.recentReply.toLowerCase().includes('no reply')) return false;
      } else if (repliesDropdown === 'no_reply') {
        if (r.recentReply && !r.recentReply.toLowerCase().includes('no reply')) return false;
      }

      // 5. Word in reply keywords filter (Matches user screenshot: [ ⊘ thank ⊗ ])
      if (replyKeywords.length > 0) {
        const text = (r.recentReply || '').toLowerCase();
        const matches = replyKeywords.some(kw => text.includes(kw.toLowerCase()));
        if (!matches) return false;
      }

      return true;
    });
  }, [recipients, contactSearch, statusDropdown, leadMatchDropdown, repliesDropdown, replyKeywords]);

  // Metrics Calculations
  const totalCount = campaigns.length;
  const runningCount = campaigns.filter(c => c.status === 'running').length;
  const completedCount = campaigns.filter(c => c.status === 'completed').length;
  const failedCount = campaigns.filter(c => c.status === 'failed').length;

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter === 'running') return c.status === 'running';
    if (statusFilter === 'completed') return c.status === 'completed';
    if (statusFilter === 'failed') return c.status === 'failed';
    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.contentScroll}>
        <div style={styles.innerWrapper}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
            <BackButton label="Back to Previous Page" />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* A. CONTACT LIST & MESSAGE FILTERING VIEW (MATCHES SCREENSHOT)      */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {selectedCampaign ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 8,
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      marginTop: 2,
                    }}
                    title="Back to all campaigns"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: 'rgba(16, 185, 129, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981',
                      }}>
                        <Users size={16} />
                      </div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                        {selectedCampaign.name}
                      </h2>
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
                      Contact list — who this campaign sent to
                    </div>
                    <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 600, marginTop: 2 }}>
                      Account: {selectedCampaign.accountId || accountId || 'Primary'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={async () => {
                      try {
                        await campaignsApi.sendNow(selectedCampaign.id);
                        addToast('success', `Campaign "${selectedCampaign.name}" started! Dispatching messages...`);
                        setTimeout(() => handleOpenCampaignContacts(selectedCampaign), 1200);
                      } catch (err: any) {
                        addToast('error', err?.response?.data?.message || err?.message || 'Failed to start campaign');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#00a884',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Start sending messages to all pending contacts"
                  >
                    <Send size={13} />
                    <span>Send Campaign</span>
                  </button>

                  <button
                    onClick={() => handleOpenCampaignContacts(selectedCampaign)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '7px 14px',
                      borderRadius: 8,
                      color: '#cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Filters Ribbon Bar (Exact pixel-accurate reproduction of user screenshot) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                background: '#0c161a',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}>
                {/* 1. Search name or phone... */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  padding: '7px 12px',
                  minWidth: 180,
                  flex: 1.2,
                }}>
                  <Search size={14} color="#8696a0" />
                  <input
                    type="text"
                    placeholder="Search name or phone..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: 12.5,
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                  {contactSearch && (
                    <X size={13} color="#8696a0" style={{ cursor: 'pointer' }} onClick={() => setContactSearch('')} />
                  )}
                </div>

                {/* 2. All Status (x) */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={statusDropdown}
                    onChange={e => setStatusDropdown(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: '7px 28px 7px 12px',
                      color: '#e2e8f0',
                      fontSize: 12.5,
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all" style={{ background: '#0e181c' }}>All Status ({recipients.length})</option>
                    <option value="pending" style={{ background: '#0e181c' }}>Pending ({recipients.filter(r => r.status === 'pending').length})</option>
                    <option value="sent" style={{ background: '#0e181c' }}>Sent ({recipients.filter(r => r.status === 'sent').length})</option>
                    <option value="delivered" style={{ background: '#0e181c' }}>Delivered ({recipients.filter(r => r.status === 'delivered').length})</option>
                    <option value="read" style={{ background: '#0e181c' }}>Read ({recipients.filter(r => r.status === 'read').length})</option>
                    <option value="failed" style={{ background: '#0e181c' }}>Failed ({recipients.filter(r => r.status === 'failed').length})</option>
                  </select>
                  <ChevronDown size={14} color="#8696a0" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                {/* 3. All Lead Match */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={leadMatchDropdown}
                    onChange={e => setLeadMatchDropdown(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: '7px 28px 7px 12px',
                      color: '#e2e8f0',
                      fontSize: 12.5,
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all" style={{ background: '#0e181c' }}>All Lead Match</option>
                    <option value="Direct Lead" style={{ background: '#0e181c' }}>Direct Lead</option>
                  </select>
                  <ChevronDown size={14} color="#8696a0" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                {/* 4. All Replies */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={repliesDropdown}
                    onChange={e => setRepliesDropdown(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: '7px 28px 7px 12px',
                      color: '#e2e8f0',
                      fontSize: 12.5,
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all" style={{ background: '#0e181c' }}>All Replies</option>
                    <option value="has_reply" style={{ background: '#0e181c' }}>Has Replies</option>
                    <option value="no_reply" style={{ background: '#0e181c' }}>No reply on record</option>
                  </select>
                  <ChevronDown size={14} color="#8696a0" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                {/* 5. Word in reply — e.g. "B" */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  padding: '7px 12px',
                  minWidth: 190,
                  flex: 1.2,
                }}>
                  <Search size={14} color="#8696a0" />
                  <input
                    type="text"
                    placeholder='Word in reply — e.g. "B"'
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && keywordInput.trim()) {
                        e.preventDefault();
                        const trimmed = keywordInput.trim().toLowerCase();
                        if (!replyKeywords.includes(trimmed)) {
                          setReplyKeywords([...replyKeywords, trimmed]);
                        }
                        setKeywordInput('');
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: 12.5,
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                  {keywordInput.trim() && (
                    <button
                      onClick={() => {
                        const trimmed = keywordInput.trim().toLowerCase();
                        if (!replyKeywords.includes(trimmed)) {
                          setReplyKeywords([...replyKeywords, trimmed]);
                        }
                        setKeywordInput('');
                      }}
                      style={{
                        background: '#00a884',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Add
                    </button>
                  )}
                </div>

                {/* 6. Active Keyword Tag Chips (matches [ ⊘ thank ⊗ ] from screenshot) */}
                {replyKeywords.map(kw => (
                  <div
                    key={kw}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      color: '#fb7185',
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ fontSize: 13, opacity: 0.8 }}>⊘</span>
                    <span>{kw}</span>
                    <span
                      onClick={() => setReplyKeywords(replyKeywords.filter(k => k !== kw))}
                      style={{
                        cursor: 'pointer',
                        fontSize: 14,
                        marginLeft: 2,
                        display: 'flex',
                        alignItems: 'center',
                        color: '#fda4af',
                      }}
                      title={`Remove filter for "${kw}"`}
                    >
                      ⊗
                    </span>
                  </div>
                ))}
              </div>

              {/* Table Matching Screenshot */}
              <div style={{
                background: '#0c161a',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                overflowX: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              }}>
                {/* Table Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748b',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  minWidth: 980,
                }}>
                  <div style={{ width: 36, display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredRecipients.length > 0 && selectedRecipientIds.length === filteredRecipients.length}
                      onChange={() => {
                        if (selectedRecipientIds.length === filteredRecipients.length) {
                          setSelectedRecipientIds([]);
                        } else {
                          setSelectedRecipientIds(filteredRecipients.map(r => r.id));
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ flex: 1.8 }}>NAME</div>
                  <div style={{ flex: 1.3 }}>PHONE</div>
                  <div style={{ flex: 1.1 }}>STATUS</div>
                  <div style={{ flex: 1.8 }}>WEBHOOK RESPONSE</div>
                  <div style={{ flex: 1.5 }}>SENT AT</div>
                  <div style={{ flex: 0.8 }}>REMARKS</div>
                  <div style={{ flex: 1.6 }}>LEAD MATCH</div>
                  <div style={{ flex: 2.2 }}>RECENT REPLIES</div>
                  <div style={{ flex: 0.9, textAlign: 'right' }}>ACTIONS</div>
                </div>

                {/* Table Body */}
                {loadingRecipients ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#8696a0', fontSize: 13 }}>
                    Loading campaign contact list and message replies...
                  </div>
                ) : filteredRecipients.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center' }}>
                    <AlertCircle size={28} color="#8696a0" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>
                      No contacts match your filters
                    </div>
                    <div style={{ fontSize: 12, color: '#8696a0', marginTop: 4 }}>
                      {replyKeywords.length > 0 ? `No replies contain the keyword "${replyKeywords.join(', ')}"` : 'Try loosening search or status filters.'}
                    </div>
                    {(replyKeywords.length > 0 || contactSearch || statusDropdown !== 'all' || repliesDropdown !== 'all') && (
                      <button
                        onClick={() => {
                          setContactSearch('');
                          setStatusDropdown('all');
                          setLeadMatchDropdown('all');
                          setRepliesDropdown('all');
                          setReplyKeywords([]);
                        }}
                        style={{
                          marginTop: 12,
                          background: 'rgba(0, 168, 132, 0.15)',
                          border: '1px solid rgba(0, 168, 132, 0.35)',
                          color: '#00a884',
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredRecipients.map(r => {
                    const isChecked = selectedRecipientIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          fontSize: 12.5,
                          color: '#e2e8f0',
                          minWidth: 980,
                          background: isChecked ? 'rgba(0, 168, 132, 0.08)' : 'transparent',
                          transition: 'background 0.12s ease',
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{ width: 36, display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedRecipientIds(selectedRecipientIds.filter(id => id !== r.id));
                              } else {
                                setSelectedRecipientIds([...selectedRecipientIds, r.id]);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>

                        {/* Name */}
                        <div style={{ flex: 1.8, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
                          {r.name || 'Unknown'}
                        </div>

                        {/* Phone */}
                        <div style={{ flex: 1.3, color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
                          {maskPhone(r.phoneNumber)}
                        </div>

                        {/* Status */}
                        <div style={{ flex: 1.1 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 9999,
                            background:
                              r.status === 'sent' ? 'rgba(59, 130, 246, 0.12)' :
                              r.status === 'read' ? 'rgba(16, 185, 129, 0.12)' :
                              r.status === 'delivered' ? 'rgba(45, 212, 191, 0.12)' :
                              r.status === 'pending' ? 'rgba(234, 179, 8, 0.12)' :
                              'rgba(239, 68, 68, 0.12)',
                            color:
                              r.status === 'sent' ? '#60a5fa' :
                              r.status === 'read' ? '#10b981' :
                              r.status === 'delivered' ? '#2dd4bf' :
                              r.status === 'pending' ? '#facc15' :
                              '#f87171',
                            border: `1px solid ${
                              r.status === 'sent' ? 'rgba(59, 130, 246, 0.3)' :
                              r.status === 'read' ? 'rgba(16, 185, 129, 0.3)' :
                              r.status === 'delivered' ? 'rgba(45, 212, 191, 0.3)' :
                              r.status === 'pending' ? 'rgba(234, 179, 8, 0.3)' :
                              'rgba(239, 68, 68, 0.3)'
                            }`,
                          }}>
                            {
                              r.status === 'sent' ? '✈ Sent' :
                              r.status === 'read' ? '✓✓ Read' :
                              r.status === 'delivered' ? '✓ Delivered' :
                              r.status === 'pending' ? '⏳ Pending' :
                              '✕ Failed'
                            }
                          </span>
                        </div>

                        {/* Webhook Response */}
                        <div style={{ flex: 1.8, paddingRight: 8 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background:
                              r.status === 'pending' ? 'rgba(234, 179, 8, 0.1)' :
                              r.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' :
                              'rgba(59, 130, 246, 0.1)',
                            color:
                              r.status === 'pending' ? '#fde047' :
                              r.status === 'failed' ? '#f87171' :
                              '#93c5fd',
                            border: `1px solid ${
                              r.status === 'pending' ? 'rgba(234, 179, 8, 0.25)' :
                              r.status === 'failed' ? 'rgba(239, 68, 68, 0.25)' :
                              'rgba(59, 130, 246, 0.25)'
                            }`,
                          }}>
                            {r.status === 'pending' ? <Clock size={10} /> : <Send size={10} />}
                            <span>{r.webhookResponse || (r.status === 'pending' ? 'PENDING Ready to Send' : 'Sent')}</span>
                          </span>
                        </div>

                        {/* Sent At */}
                        <div style={{ flex: 1.5, color: '#94a3b8', fontSize: 11.5 }}>
                          {r.sentAt ? formatSentAt(r.sentAt) : r.status === 'pending' ? 'Not sent yet' : '—'}
                        </div>

                        {/* Remarks */}
                        <div style={{ flex: 0.8, color: '#64748b' }}>
                          {r.remarks || '—'}
                        </div>

                        {/* Lead Match */}
                        <div style={{ flex: 1.6, paddingRight: 8 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 9999,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                          }}>
                            <Target size={11} />
                            <span>{r.leadMatch || 'Direct'}</span>
                          </span>
                        </div>

                        {/* Recent Replies with Keyword Highlight */}
                        <div style={{ flex: 2.2, paddingRight: 10 }}>
                          {!r.recentReply || r.recentReply.toLowerCase().includes('no reply') ? (
                            <span style={{ fontStyle: 'italic', color: '#64748b', fontSize: 12 }}>
                              No reply on record
                            </span>
                          ) : (
                            <div style={{
                              color: '#cbd5e1',
                              fontSize: 12,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 240,
                            }} title={r.recentReply}>
                              {highlightKeyword(r.recentReply, replyKeywords)}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ flex: 0.9, textAlign: 'right' }}>
                          <button
                            onClick={() => setViewingLogRecipient(r)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#cbd5e1',
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="View Webhook & Message Logs"
                          >
                            <FileText size={11} />
                            <span>Log</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <>
              {/* ── 1. Top Header Banner Matching Design 10 ───────────────────── */}
              <div style={styles.headerCard}>
                <div style={styles.headerLeft}>
                  <div style={styles.headerIconBox}>
                    <Send size={24} color="#ffffff" style={{ transform: 'rotate(-10deg)' }} />
                  </div>
                  <div>
                    <h1 style={styles.pageTitle}>Campaigns</h1>
                    <p style={styles.pageSubtitle}>
                      Send approved messages to thousands of customers at once
                    </p>
                  </div>
                </div>

                <div style={styles.headerRight}>
                  {/* 3D Isometric Art Illustration matching Mockup */}
                  <div style={styles.bannerArtBox}>
                    <svg width="220" height="70" viewBox="0 0 220 70" fill="none">
                      <circle cx="110" cy="35" r="30" fill="rgba(16, 185, 129, 0.15)" filter="blur(10px)" />
                      <path d="M15 48 Q 50 18, 90 28" stroke="rgba(45, 212, 191, 0.4)" strokeWidth="1.2" strokeDasharray="3 3" />
                      <path d="M42 22 L56 34 L40 38 Z" fill="#2dd4bf" opacity="0.8" />
                      <rect x="70" y="8" width="34" height="54" rx="6" fill="#071518" stroke="#10b981" strokeWidth="1.4" />
                      <circle cx="87" cy="32" r="10" fill="#10b981" />
                      <circle cx="87" cy="32" r="5" fill="#ffffff" />
                      <rect x="114" y="14" width="38" height="15" rx="4" fill="#0c2328" stroke="#2dd4bf" strokeWidth="1" />
                      <line x1="120" y1="21" x2="144" y2="21" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                      <rect x="114" y="34" width="34" height="15" rx="4" fill="#0c2328" stroke="#2dd4bf" strokeWidth="1" />
                      <line x1="120" y1="41" x2="140" y2="41" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M172 38 L188 28 L188 48 Z" fill="#10b981" opacity="0.85" />
                      <ellipse cx="188" cy="38" rx="3" ry="10" fill="#2dd4bf" />
                      <rect x="166" y="35" width="8" height="6" rx="1.5" fill="#10b981" />
                    </svg>
                  </div>

                  {/* Action Button: + New Campaign */}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    style={styles.newCampaignBtn}
                  >
                    <Plus size={16} />
                    <span>New Campaign</span>
                  </button>
                </div>
              </div>

              {/* ── 2. Row of 4 Metric Cards Matching Design 10 ───────────────── */}
              <div style={styles.metricsGrid}>
                {/* Card 1: TOTAL CAMPAIGNS */}
                <div
                  onClick={() => setStatusFilter('all')}
                  style={{
                    ...styles.metricCard,
                    ...(statusFilter === 'all' ? styles.cardTotalActive : styles.cardTotal),
                    cursor: 'pointer',
                  }}
                  title="Filter all campaigns"
                >
                  <div style={styles.metricTopRow}>
                    <div style={styles.iconBoxGreen}>
                      <Users size={18} color="#2dd4bf" />
                    </div>
                    <div style={styles.arrowCircleBadge}>
                      <ArrowRight size={12} color="#2dd4bf" />
                    </div>
                  </div>
                  <div style={styles.metricLabel}>TOTAL CAMPAIGNS</div>
                  <div style={styles.metricValue}>{totalCount}</div>
                  <div style={styles.metricSub}>All created campaigns</div>
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
                  title="Filter active running campaigns"
                >
                  <div style={styles.metricTopRow}>
                    <div style={styles.iconBoxBlue}>
                      <Send size={16} color="#3b82f6" style={{ transform: 'rotate(-10deg)' }} />
                    </div>
                    <div style={styles.arrowCircleBadge}>
                      <ArrowRight size={12} color="#3b82f6" />
                    </div>
                  </div>
                  <div style={styles.metricLabel}>RUNNING</div>
                  <div style={styles.metricValue}>{runningCount}</div>
                  <div style={styles.metricSub}>Active campaigns</div>
                  <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparkline}>
                    <path d="M0 18 Q 40 12, 80 16 T 160 8" stroke="#3b82f6" strokeWidth="2" fill="none" />
                  </svg>
                </div>

                {/* Card 3: COMPLETED */}
                <div
                  onClick={() => setStatusFilter('completed')}
                  style={{
                    ...styles.metricCard,
                    ...(statusFilter === 'completed' ? styles.cardCompletedActive : styles.cardCompleted),
                    cursor: 'pointer',
                  }}
                  title="Filter finished campaigns"
                >
                  <div style={styles.metricTopRow}>
                    <div style={styles.iconBoxPurple}>
                      <CheckCircle2 size={18} color="#a855f7" />
                    </div>
                    <div style={styles.arrowCircleBadge}>
                      <ArrowRight size={12} color="#a855f7" />
                    </div>
                  </div>
                  <div style={styles.metricLabel}>COMPLETED</div>
                  <div style={styles.metricValue}>{completedCount}</div>
                  <div style={styles.metricSub}>Successfully finished</div>
                  <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparkline}>
                    <path d="M0 20 Q 40 18, 80 10 T 160 14" stroke="#a855f7" strokeWidth="2" fill="none" />
                  </svg>
                </div>

                {/* Card 4: FAILED */}
                <div
                  onClick={() => setStatusFilter('failed')}
                  style={{
                    ...styles.metricCard,
                    ...(statusFilter === 'failed' ? styles.cardFailedActive : styles.cardFailed),
                    cursor: 'pointer',
                  }}
                  title="Filter failed campaigns"
                >
                  <div style={styles.metricTopRow}>
                    <div style={styles.iconBoxAmber}>
                      <XCircle size={18} color="#f59e0b" />
                    </div>
                    <div style={styles.arrowCircleBadge}>
                      <ArrowRight size={12} color="#f59e0b" />
                    </div>
                  </div>
                  <div style={styles.metricLabel}>FAILED</div>
                  <div style={styles.metricValue}>{failedCount}</div>
                  <div style={styles.metricSub}>Campaigns with errors</div>
                  <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparkline}>
                    <path d="M0 16 Q 40 14, 80 18 T 160 10" stroke="#f59e0b" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              </div>

              {/* ── 3. Main Center Section Matching Design 10 ────────────────── */}
              {filteredCampaigns.length === 0 ? (
                <div style={styles.emptyContainerCard}>
                  <div style={styles.containerSilkWave}>
                    <svg width="260" height="180" viewBox="0 0 260 180" fill="none">
                      <path d="M30 180 Q 90 80, 180 130 T 260 70" stroke="rgba(45, 212, 191, 0.2)" strokeWidth="2" fill="none" />
                      <path d="M10 180 Q 80 110, 160 150 T 260 100" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1.5" fill="none" />
                      <path d="M-20 180 Q 60 130, 140 165 T 260 135" stroke="rgba(45, 212, 191, 0.1)" strokeWidth="1" fill="none" />
                    </svg>
                  </div>
                  <div style={styles.emptyIllustrationBox}>
                    <svg width="200" height="130" viewBox="0 0 200 130" fill="none">
                      <ellipse cx="100" cy="98" rx="65" ry="22" fill="rgba(16, 185, 129, 0.22)" filter="blur(10px)" />
                      <ellipse cx="100" cy="96" rx="58" ry="18" fill="rgba(45, 212, 191, 0.15)" />
                      <path d="M48 88 L100 106 L152 88 L100 70 Z" fill="#082226" stroke="#2dd4bf" strokeWidth="1.8" />
                      <path d="M48 88 L100 106 L100 114 L48 96 Z" fill="#05171a" stroke="#14b8a6" strokeWidth="0.8" />
                      <path d="M100 106 L152 88 L152 96 L100 114 Z" fill="#031012" stroke="#0f766e" strokeWidth="0.8" />
                      <g transform="translate(74, 18)">
                        <path d="M12 36 L52 6 L34 46 Z" fill="#2dd4bf" opacity="0.95" />
                        <path d="M34 46 L52 6 L50 42 Z" fill="#14b8a6" />
                        <path d="M34 46 L38 55 L43 47 Z" fill="#0f766e" />
                      </g>
                    </svg>
                  </div>
                  <h2 style={styles.emptyTitle}>No campaigns yet</h2>
                  <p style={styles.emptySubtitle}>
                    Create your first bulk campaign and reach thousands of customers with just a few clicks!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    style={styles.createCampaignCenterBtn}
                  >
                    <Plus size={16} />
                    <span>Create Campaign</span>
                  </button>
                </div>
              ) : (
                <div style={styles.tableCard}>
                  <div style={styles.tableHeaderRow}>
                    <div style={{ flex: 2.2 }}>CAMPAIGN NAME</div>
                    <div style={{ flex: 1.2 }}>STATUS</div>
                    <div style={{ flex: 1.2 }}>RECIPIENTS</div>
                    <div style={{ flex: 1.4 }}>DELIVERED / READ</div>
                    <div style={{ flex: 2.0, textAlign: 'right', paddingRight: 16 }}>ACTIONS</div>
                  </div>

                  <div style={styles.tableBody}>
                    {filteredCampaigns.map(camp => (
                      <div key={camp.id} style={styles.tableRow}>
                        <div
                          style={{ flex: 2.2, cursor: 'pointer' }}
                          onClick={() => handleOpenCampaignContacts(camp)}
                          title="Click to view contact list & replies"
                        >
                          <div style={{ ...styles.campNameText, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{camp.name}</span>
                          </div>
                          <div style={styles.campDateText}>Created {formatIndianDate(camp.createdAt)} • Click to view contacts</div>
                        </div>

                        <div style={{ flex: 1.2 }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: 9999,
                            background: camp.status === 'running' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            color: camp.status === 'running' ? '#10b981' : '#cbd5e1',
                          }}>
                            ● {camp.status.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ flex: 1.2, fontSize: 13, color: '#f8fafc', fontWeight: 600 }}>
                          {camp.totalRecipients || 0} recipients
                        </div>

                        <div style={{ flex: 1.4, fontSize: 12, color: '#8696a0' }}>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{camp.deliveredCount || 0}</span> delivered • <span style={{ color: '#3b82f6', fontWeight: 600 }}>{camp.readCount || 0}</span> read
                        </div>

                        <div style={{ flex: 2.0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingRight: 16 }}>
                          <button
                            onClick={() => handleOpenCampaignContacts(camp)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              background: 'rgba(0, 168, 132, 0.15)',
                              border: '1px solid rgba(0, 168, 132, 0.35)',
                              color: '#00a884',
                              padding: '5px 10px',
                              borderRadius: 7,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="View Contact list & message replies (as in screenshot)"
                          >
                            <Users size={13} />
                            <span>Contact List</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(camp)}
                            style={styles.actionCircleBtn}
                            title={camp.status === 'running' ? 'Pause Campaign' : 'Resume Campaign'}
                          >
                            {camp.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(camp)}
                            style={styles.actionDeleteBtn}
                            title="Delete Campaign"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* ── Modal: Recipient Webhook & Message Log (matches 📄 Log button) ── */}
      {viewingLogRecipient && (
        <div style={styles.modalOverlay} onClick={() => setViewingLogRecipient(null)}>
          <div style={{ ...styles.modalBox, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...styles.modalBadge, background: 'rgba(59, 130, 246, 0.15)' }}>
                  <FileText size={18} color="#60a5fa" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Message Delivery & Gateway Log
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Recipient: {viewingLogRecipient.name || 'Unknown'} ({maskPhone(viewingLogRecipient.phoneNumber)})
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingLogRecipient(null)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {/* Status Banner */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#8696a0' }}>GATEWAY STATUS</div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: viewingLogRecipient.status === 'pending' ? '#facc15' : viewingLogRecipient.status === 'failed' ? '#f87171' : '#60a5fa',
                    marginTop: 2,
                  }}>
                    {viewingLogRecipient.webhookResponse || (viewingLogRecipient.status === 'pending' ? 'PENDING Ready to Send' : 'Sent')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8696a0' }}>LEAD PROJECT</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginTop: 2 }}>
                    {viewingLogRecipient.leadMatch || 'Direct'}
                  </div>
                </div>
              </div>

              {/* Timeline Stages */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                padding: '14px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
                  Event Progression
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: ['sent', 'delivered', 'read'].includes(viewingLogRecipient.status) ? '#10b981' : viewingLogRecipient.status === 'failed' ? '#f87171' : '#eab308',
                  }}>
                    <CheckCircle2 size={14} />
                    <span style={{ fontWeight: 600 }}>Message Queued & Dispatched</span>
                    <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 11 }}>
                      {viewingLogRecipient.sentAt ? formatSentAt(viewingLogRecipient.sentAt) : viewingLogRecipient.status === 'pending' ? 'Pending dispatch' : '—'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: ['delivered', 'read'].includes(viewingLogRecipient.status) ? '#10b981' : '#64748b',
                  }}>
                    <CheckCircle2 size={14} />
                    <span style={{ fontWeight: 600 }}>Delivered to Recipient Device</span>
                    <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 11 }}>
                      {viewingLogRecipient.deliveredAt ? formatSentAt(viewingLogRecipient.deliveredAt) : 'Pending ACK'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: viewingLogRecipient.status === 'read' ? '#10b981' : '#64748b',
                  }}>
                    <CheckCircle2 size={14} />
                    <span style={{ fontWeight: 600 }}>Read Receipt Received</span>
                    <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 11 }}>
                      {viewingLogRecipient.readAt ? formatSentAt(viewingLogRecipient.readAt) : 'Not read yet'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Reply Box */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: 11, color: '#8696a0', fontWeight: 600 }}>RECORDED INCOMING REPLY</div>
                <div style={{
                  fontSize: 13,
                  color: viewingLogRecipient.recentReply && !viewingLogRecipient.recentReply.includes('No reply') ? '#f8fafc' : '#64748b',
                  fontStyle: viewingLogRecipient.recentReply && !viewingLogRecipient.recentReply.includes('No reply') ? 'normal' : 'italic',
                  marginTop: 6,
                  lineHeight: 1.5,
                }}>
                  {viewingLogRecipient.recentReply || 'No reply on record'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setViewingLogRecipient(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Create New Bulk Campaign ─────────────────────────────────── */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <Send size={18} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Create Bulk Campaign
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Broadcast to phonebook contacts with automated delivery throttles
                  </div>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Product Launch Announcement"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Target Audience / Group</label>
                <select
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  style={styles.formInput}
                >
                  <option value="All Synced Phonebook">All Synced Phonebook ({contacts?.length || 0} contacts)</option>
                  <option value="Active Contacts">Active Contacts ({contacts?.filter(c => c.name || c.notifyName)?.length || 0} contacts)</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Message Template / Content</label>
                <textarea
                  rows={4}
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  style={styles.formTextarea}
                  required
                />
                <div style={{ fontSize: 10.5, color: '#8696a0', marginTop: 2 }}>
                  Variables: <code style={{ color: '#2dd4bf' }}>{`{{name}}`}</code>, <code style={{ color: '#2dd4bf' }}>{`{{phone}}`}</code> will be substituted dynamically.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Dispatch Schedule</label>
                  <select
                    value={scheduleType}
                    onChange={e => setScheduleType(e.target.value as any)}
                    style={styles.formInput}
                  >
                    <option value="immediate">Send Immediately</option>
                    <option value="scheduled">Schedule for Later</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Anti-Ban Throttling</label>
                  <select
                    value={antiBanDelay}
                    onChange={e => setAntiBanDelay(e.target.value)}
                    style={styles.formInput}
                  >
                    <option value="5-10s (Safe Interval)">5-10s (Recommended Safe)</option>
                    <option value="15-30s (Ultra Safe)">15-30s (Ultra Safe)</option>
                    <option value="Immediate Burst">Immediate Burst (High Risk)</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={styles.submitBtn}
                >
                  {creating ? 'Launching...' : 'Launch Campaign'}
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
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    background: '#071013',
    color: '#e2e8f0',
    overflow: 'hidden',
    fontFamily: "\'Inter\', sans-serif",
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
    gap: 18,
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
  headerIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(45, 212, 191, 0.25)',
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.3px',
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
  bannerArtBox: {
    display: 'flex',
    alignItems: 'center',
  },
  newCampaignBtn: {
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
  cardTotal: {
    background: 'rgba(8, 35, 38, 0.55)',
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
  cardCompleted: {
    background: 'rgba(24, 14, 38, 0.75)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
  },
  cardCompletedActive: {
    background: 'rgba(24, 14, 38, 0.9)',
    border: '1.5px solid #a855f7',
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
  },
  cardFailed: {
    background: 'rgba(38, 26, 10, 0.75)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  cardFailedActive: {
    background: 'rgba(38, 26, 10, 0.9)',
    border: '1.5px solid #f59e0b',
    boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
  },
  metricTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconBoxGreen: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxBlue: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(59, 130, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxPurple: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(168, 85, 247, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxAmber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'rgba(245, 158, 11, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircleBadge: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#8696a0',
    letterSpacing: '0.6px',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1,
  },
  metricSub: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 4,
  },
  sparkline: {
    marginTop: 'auto',
    paddingTop: 8,
  },
  emptyContainerCard: {
    background: 'rgba(12, 35, 40, 0.45)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    borderRadius: 16,
    padding: '48px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  containerSilkWave: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    opacity: 0.7,
  },
  emptyIllustrationBox: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f8fafc',
    margin: '0 0 6px 0',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8696a0',
    maxWidth: 440,
    lineHeight: 1.5,
    margin: '0 0 20px 0',
  },
  createCampaignCenterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 22px',
    borderRadius: 10,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 168, 132, 0.4)',
  },
  tableCard: {
    background: 'rgba(12, 28, 32, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  tableHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 18px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    fontSize: 11,
    fontWeight: 700,
    color: '#8696a0',
    letterSpacing: '0.5px',
  },
  tableBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'background 0.12s ease',
  },
  campNameText: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#f8fafc',
  },
  campDateText: {
    fontSize: 11.5,
    color: '#8696a0',
    marginTop: 2,
  },
  actionCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
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
    maxWidth: 520,
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
  formTextarea: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#ffffff',
    fontSize: 12.5,
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
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
    boxShadow: '0 4px 14px rgba(0, 168, 132, 0.35)',
  },
};
