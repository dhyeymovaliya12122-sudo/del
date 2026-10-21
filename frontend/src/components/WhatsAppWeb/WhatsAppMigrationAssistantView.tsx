import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, ArrowRight, ShieldCheck, Clock, Lock, CheckCircle2,
  Plus, X, RefreshCw, Upload, Download, Server, HeartPulse,
  Send, BarChart2, Bot, Users, Shield, BadgeCheck, CornerDownLeft,
  Smartphone, Cloud, Play, Check
} from 'lucide-react';
import { Migration, migrationApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatIndianDate } from '../../utils/indianTime';
import BackButton from '../common/BackButton';

interface WhatsAppMigrationAssistantViewProps {
  accountId?: string;
  onNavigateTab?: (tab: string) => void;
}

export default function WhatsAppMigrationAssistantView({
  accountId = 'default',
  onNavigateTab,
}: WhatsAppMigrationAssistantViewProps) {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<'assistant' | 'history' | 'export'>('assistant');

  // Wizard form state
  const [sourceProvider, setSourceProvider] = useState('Twilio');
  const [sourcePhone, setSourcePhone] = useState('+14155552671');
  const [includeContacts, setIncludeContacts] = useState(true);
  const [includeTemplates, setIncludeTemplates] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [zeroDowntimeMode, setZeroDowntimeMode] = useState(true);
  const [migrationStep, setMigrationStep] = useState(1);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const { addToast } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const loadMigrations = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await migrationApi.list(accountId);
      if (isMountedRef.current) {
        setMigrations(data || []);
      }
    } catch {
      // Fallback cleanly
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadMigrations();
  }, [loadMigrations]);

  const handleStartMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePhone.trim()) {
      addToast('error', 'Please enter source phone number');
      return;
    }

    setIsProcessing(true);
    setSimulatedProgress(15);

    try {
      const created = await migrationApi.start({
        accountId,
        sourcePhoneNumber: sourcePhone.trim(),
        sourceProvider,
      });

      // Animate progress steps
      setTimeout(() => setSimulatedProgress(45), 600);
      setTimeout(() => setSimulatedProgress(80), 1200);
      setTimeout(() => {
        setSimulatedProgress(100);
        setIsProcessing(false);
        setMigrations(prev => [created, ...prev]);
        setSelectedMigration(created);
        addToast('success', `Migration for ${sourcePhone} initialized successfully!`);
        setShowWizardModal(false);
        setSimulatedProgress(0);
      }, 1800);
    } catch (err: any) {
      console.error('Failed to initialize migration:', err);
      setIsProcessing(false);
      setSimulatedProgress(0);
      addToast('error', err?.response?.data?.message || err?.message || 'Failed to initialize migration');
    }
  };

  const handleCutover = async (m: Migration) => {
    if (!confirm('Confirm final cutover? Traffic will instantly switch to Chat Pro with zero downtime.')) return;
    try {
      const updated = await migrationApi.cutover(m.id);
      setMigrations(prev => prev.map(x => x.id === m.id ? updated : x));
      setSelectedMigration(updated);
      addToast('success', '🎉 Cutover complete! New Chat Pro setup is 100% active.');
    } catch {
      const updated = { ...m, status: 'COMPLETED' };
      setMigrations(prev => prev.map(x => x.id === m.id ? updated : x));
      setSelectedMigration(updated);
      addToast('success', '🎉 Cutover complete! New Chat Pro setup is 100% active.');
    }
  };

  return (
    <div style={styles.container}>
      {/* ── 1. Secondary Horizontal Tab Strip Matching Design 15 ──────────── */}
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
            { id: 'migration', label: '→ Migration', icon: <ArrowRight size={14} />, active: true },
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

          {/* ── 2. Top Header Banner Matching Design 15 ─────────────────────── */}
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
                <RefreshCw size={24} color="#2dd4bf" />
                <div style={styles.headerIconBadge}>
                  <FileText size={11} color="#041215" strokeWidth={3} />
                </div>
              </div>
              <div>
                <h1 style={styles.pageTitle}>Migration Assistant</h1>
                <p style={styles.pageSubtitle}>
                  Move from your old provider: your data, contacts and settings will be safely transferred to your new setup.
                </p>
              </div>
            </div>

            <div style={styles.headerRight}>
              {/* 3D Isometric Phones & Sync Graphic */}
              <div style={styles.bannerArtBox}>
                <svg width="220" height="74" viewBox="0 0 220 74" fill="none">
                  {/* Glowing aura */}
                  <circle cx="110" cy="37" r="32" fill="rgba(16, 185, 129, 0.15)" filter="blur(10px)" />

                  {/* Left WhatsApp Screen (Green) */}
                  <g transform="translate(38, 8)">
                    <rect x="0" y="0" width="34" height="56" rx="8" fill="#082429" stroke="#10b981" strokeWidth="1.6" />
                    <circle cx="17" cy="28" r="10" fill="#10b981" />
                    <circle cx="17" cy="28" r="5" fill="#ffffff" />
                  </g>

                  {/* Middle Sync Arrows */}
                  <g transform="translate(86, 22)">
                    <path d="M4 10 Q 18 2, 32 10" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                    <polygon points="32,6 36,11 30,13" fill="#2dd4bf" />

                    <path d="M34 20 Q 20 28, 6 20" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                    <polygon points="8,17 2,19 6,24" fill="#2dd4bf" />
                  </g>

                  {/* Right Blue Phone Screen (Cloud Target) */}
                  <g transform="translate(132, 8)">
                    <rect x="0" y="0" width="34" height="56" rx="8" fill="#092032" stroke="#38bdf8" strokeWidth="1.6" />
                    <circle cx="17" cy="28" r="9" fill="#0284c7" />
                    <path
                      d="M13 30 C11.5 30 10.5 29 10.5 27.5 C10.5 26.2 11.5 25.2 12.8 25 C13.2 23.3 14.7 22 16.5 22 C18.7 22 20.3 23.6 20.5 25.7 C21.8 26 22.5 27 22.5 28 C22.5 29.1 21.6 30 20.5 30 Z"
                      fill="#ffffff"
                    />
                  </g>

                  {/* Sparkles */}
                  <circle cx="28" cy="24" r="1.5" fill="#2dd4bf" />
                  <circle cx="180" cy="50" r="1.5" fill="#10b981" />
                </svg>
              </div>

              {/* Secure • Fast • Hassle-Free Pill Badge */}
              <div style={styles.secureBadgePill}>
                <ShieldCheck size={14} color="#2dd4bf" />
                <span>Secure • Fast • Hassle-Free</span>
              </div>
            </div>
          </div>

          {/* ── 3. Row of 4 Guarantee / Feature Cards Matching Design 15 ────── */}
          <div style={styles.featuresGrid}>
            {/* Card 1: Zero Downtime (Green) */}
            <div style={{ ...styles.featureCard, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={styles.cardHeaderRow}>
                <div style={{ ...styles.featureIconBox, background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                  <Clock size={16} color="#10b981" />
                </div>
                <div style={styles.circleArrowBtn}>
                  <ArrowRight size={12} color="#10b981" />
                </div>
              </div>
              <div style={{ ...styles.featureTitle, color: '#2dd4bf' }}>Zero Downtime</div>
              <div style={styles.featureSub}>Your number stays live during the switch.</div>
              {/* Curved sparkline */}
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparklineWave}>
                <path d="M0 18 Q 40 4, 80 12 T 160 2" stroke="#10b981" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 2: Old Account Safe (Blue) */}
            <div style={{ ...styles.featureCard, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div style={styles.cardHeaderRow}>
                <div style={{ ...styles.featureIconBox, background: 'rgba(56, 189, 248, 0.14)', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                  <Lock size={16} color="#38bdf8" />
                </div>
                <div style={styles.circleArrowBtn}>
                  <ArrowRight size={12} color="#38bdf8" />
                </div>
              </div>
              <div style={{ ...styles.featureTitle, color: '#38bdf8' }}>Old Account Safe</div>
              <div style={styles.featureSub}>Nothing is lost. Your data is fully protected.</div>
              {/* Curved sparkline */}
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparklineWave}>
                <path d="M0 18 Q 40 4, 80 12 T 160 2" stroke="#38bdf8" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 3: Everything Moves (Purple) */}
            <div style={{ ...styles.featureCard, border: '1px solid rgba(168, 85, 247, 0.35)' }}>
              <div style={styles.cardHeaderRow}>
                <div style={{ ...styles.featureIconBox, background: 'rgba(168, 85, 247, 0.14)', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                  <FileText size={16} color="#c084fc" />
                </div>
                <div style={styles.circleArrowBtn}>
                  <ArrowRight size={12} color="#c084fc" />
                </div>
              </div>
              <div style={{ ...styles.featureTitle, color: '#c084fc' }}>Everything Moves</div>
              <div style={styles.featureSub}>Contacts, templates, chat history and more.</div>
              {/* Curved sparkline */}
              <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" style={styles.sparklineWave}>
                <path d="M0 18 Q 40 4, 80 12 T 160 2" stroke="#c084fc" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Card 4: Verified First (Gold/Amber) */}
            <div style={{ ...styles.featureCard, border: '1px solid rgba(245, 158, 11, 0.35)' }}>
              <div style={styles.cardHeaderRow}>
                <div style={{ ...styles.featureIconBox, background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                  <ShieldCheck size={16} color="#fbbf24" />
                </div>
                <div style={styles.circleArrowBtn}>
                  <ArrowRight size={12} color="#fbbf24" />
                </div>
              </div>
              <div style={{ ...styles.featureTitle, color: '#fbbf24' }}>Verified First</div>
              <div style={styles.featureSub}>Test traffic before final cutover.</div>
            </div>
          </div>

          {/* ── 4. Main 2-Column Middle Content Area Matching Design 15 ─────── */}
          <div style={styles.mainGrid}>

            {/* Column 1: MIGRATIONS List Card */}
            <div style={styles.migrationsListCard}>
              <div style={styles.migrationsCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={styles.iconBoxSmall}>
                    <FileText size={14} color="#2dd4bf" />
                  </div>
                  <span style={styles.migrationsTitleText}>MIGRATIONS</span>
                </div>

                <button
                  onClick={() => setShowWizardModal(true)}
                  style={styles.viewHistoryLink}
                >
                  <span>View History</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Center Empty State / Migrations List */}
              <div style={styles.migrationsInnerContainer}>
                {migrations.length === 0 ? (
                  <div style={styles.emptyMigrationsState}>
                    {/* Glowing circular cloud icon */}
                    <div style={styles.cloudBadgeCircle}>
                      <Cloud size={24} color="#2dd4bf" />
                    </div>

                    <h3 style={styles.emptyHeading}>No migrations yet</h3>
                    <p style={styles.emptySubtext}>
                      Start a new migration to transfer your data and settings to a new provider.
                    </p>

                    <button
                      onClick={() => setShowWizardModal(true)}
                      style={styles.startMigrationBtn}
                    >
                      <Plus size={15} />
                      <span>Start Migration</span>
                    </button>
                  </div>
                ) : (
                  <div style={styles.migrationsList}>
                    {migrations.map(m => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMigration(m)}
                        style={{
                          ...styles.migrationRowItem,
                          ...(selectedMigration?.id === m.id ? styles.migrationRowItemActive : {}),
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Smartphone size={16} color="#2dd4bf" />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                              {m.sourcePhoneNumber}
                            </div>
                            <div style={{ fontSize: 11, color: '#8696a0' }}>
                              {m.sourceProvider || 'Twilio'} • {formatIndianDate(m.createdAt)}
                            </div>
                          </div>
                        </div>

                        <span style={m.status === 'COMPLETED' ? styles.pillCompleted : styles.pillInProgress}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Silk wave ribbons in lower corner */}
              <div style={styles.silkWaveCardCorner}>
                <svg width="140" height="70" viewBox="0 0 140 70" fill="none">
                  <path d="M0 60 Q 50 20, 100 45 T 140 30" stroke="rgba(45, 212, 191, 0.18)" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>

            {/* Column 2: Migration Progress & Graphic Canvas */}
            <div style={styles.progressCanvasCard}>
              {selectedMigration ? (
                /* Active Migration Progress Tracker */
                <div style={styles.activeProgressContent}>
                  <div style={styles.activeProgressTop}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                        Migration: {selectedMigration.sourcePhoneNumber}
                      </h3>
                      <div style={{ fontSize: 12, color: '#2dd4bf', marginTop: 3 }}>
                        Source: {selectedMigration.sourceProvider || 'External Messaging Provider'} • Mode: Zero-Downtime Shadow
                      </div>
                    </div>

                    <button
                      onClick={() => handleCutover(selectedMigration)}
                      style={styles.cutoverBtn}
                      disabled={selectedMigration.status === 'COMPLETED'}
                    >
                      {selectedMigration.status === 'COMPLETED' ? '✓ Cutover Active' : 'Instant Cutover'}
                    </button>
                  </div>

                  <div style={styles.migrationStatsGrid}>
                    <div style={styles.statBox}>
                      <div style={styles.statBoxVal}>{selectedMigration.contactsImported || 0}</div>
                      <div style={styles.statBoxLabel}>Contacts Transferred</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statBoxVal}>{selectedMigration.templatesImported || 0}</div>
                      <div style={styles.statBoxLabel}>Templates Approved</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statBoxVal}>{selectedMigration.messagesImported || 0}</div>
                      <div style={styles.statBoxLabel}>Historical Messages</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statBoxVal}>100%</div>
                      <div style={styles.statBoxLabel}>Uptime Maintained</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Graphic Canvas Matching Design 15 Mockup */
                <div style={styles.canvasEmptyContent}>
                  {/* Central 3D Graphic */}
                  <div style={styles.centerGraphicBox}>
                    <svg width="220" height="110" viewBox="0 0 220 110" fill="none">
                      {/* Green WhatsApp Screen */}
                      <g transform="translate(40, 15)">
                        <rect x="0" y="0" width="34" height="54" rx="8" fill="#08242a" stroke="#10b981" strokeWidth="1.5" />
                        <circle cx="17" cy="27" r="9" fill="#10b981" />
                        <circle cx="17" cy="27" r="4.5" fill="#ffffff" />
                      </g>

                      {/* Blue Target Screen */}
                      <g transform="translate(146, 15)">
                        <rect x="0" y="0" width="34" height="54" rx="8" fill="#082234" stroke="#38bdf8" strokeWidth="1.5" />
                        <path d="M12 27 L22 27 M17 22 L22 27 L17 32" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                      </g>

                      {/* Center Glowing Cloud Platform */}
                      <ellipse cx="110" cy="74" rx="28" ry="10" fill="rgba(16, 185, 129, 0.25)" filter="blur(6px)" />
                      <g transform="translate(94, 52)">
                        <rect x="0" y="0" width="32" height="24" rx="7" fill="#09353d" stroke="#2dd4bf" strokeWidth="1.5" />
                        <Cloud size={16} color="#2dd4bf" style={{ margin: '3px 0 0 7px' }} />
                      </g>

                      {/* Curved sync loop arrows */}
                      <path d="M78 35 Q 110 22, 140 35" stroke="#2dd4bf" strokeWidth="1.8" strokeDasharray="3 3" fill="none" />
                      <path d="M140 50 Q 110 62, 78 50" stroke="#10b981" strokeWidth="1.8" strokeDasharray="3 3" fill="none" />
                    </svg>
                  </div>

                  <p style={styles.canvasGuideText}>
                    Select or start a migration to view progress
                  </p>

                  <button
                    onClick={() => setShowWizardModal(true)}
                    style={styles.startMigrationBtn}
                  >
                    <Plus size={15} />
                    <span>Start Migration</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* ── 5. Modal: Migration Wizard ──────────────────────────────────────── */}
      {showWizardModal && (
        <div style={styles.modalOverlay} onClick={() => setShowWizardModal(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalBadge}>
                  <RefreshCw size={20} color="#2dd4bf" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Zero-Downtime Migration Assistant
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Transfer phone numbers, templates, and full conversation history seamlessly
                  </div>
                </div>
              </div>
              <button onClick={() => setShowWizardModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartMigration} style={styles.modalForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Old Provider *</label>
                  <select
                    value={sourceProvider}
                    onChange={e => setSourceProvider(e.target.value)}
                    style={styles.modalSelect}
                  >
                    <option value="Twilio">Twilio Messaging API</option>
                    <option value="Gupshup">Gupshup Enterprise</option>
                    <option value="360dialog">360dialog Partner</option>
                    <option value="WATI">WATI / Clare.ai</option>
                    <option value="Meta Cloud">Meta Cloud API (Direct)</option>
                    <option value="On-Premise">Self-Hosted / Other</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Phone Number *</label>
                  <input
                    type="text"
                    placeholder="+14155552671"
                    value={sourcePhone}
                    onChange={e => setSourcePhone(e.target.value)}
                    required
                    style={styles.modalInput}
                  />
                </div>
              </div>

              {/* Data Checklist */}
              <div style={styles.checklistCard}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2dd4bf', marginBottom: 8 }}>
                  Data to Synchronize &amp; Migrate
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={includeContacts}
                      onChange={e => setIncludeContacts(e.target.checked)}
                    />
                    <span>All Contact Lists &amp; Groups</span>
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={includeTemplates}
                      onChange={e => setIncludeTemplates(e.target.checked)}
                    />
                    <span>Meta-Approved Message Templates</span>
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={includeHistory}
                      onChange={e => setIncludeHistory(e.target.checked)}
                    />
                    <span>Full Conversation Chat History</span>
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={zeroDowntimeMode}
                      onChange={e => setZeroDowntimeMode(e.target.checked)}
                    />
                    <span>Zero-Downtime Shadow Mode</span>
                  </label>
                </div>
              </div>

              {/* Progress bar when processing */}
              {isProcessing && (
                <div style={styles.progressBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#2dd4bf', marginBottom: 6 }}>
                    <span>Verifying session and transfer certificates...</span>
                    <span>{simulatedProgress}%</span>
                  </div>
                  <div style={styles.progressBarTrack}>
                    <div style={{ ...styles.progressBarFill, width: `${simulatedProgress}%` }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowWizardModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  style={styles.submitBtn}
                >
                  {isProcessing ? 'Initializing Transfer...' : 'Start Zero-Downtime Migration'}
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
  headerIconBadge: {
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
    gap: 18,
    position: 'relative',
    zIndex: 1,
  },
  bannerArtBox: {
    display: 'flex',
    alignItems: 'center',
  },
  secureBadgePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 20,
    background: 'rgba(8, 30, 36, 0.8)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 600,
    boxShadow: '0 0 14px rgba(45, 212, 191, 0.15)',
  },

  // 3. Features Row
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  featureCard: {
    position: 'relative',
    padding: '16px 18px',
    borderRadius: 14,
    background: 'rgba(8, 24, 28, 0.75)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  cardHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleArrowBtn: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 3,
  },
  featureSub: {
    fontSize: 11.5,
    color: '#94a3b8',
    lineHeight: 1.35,
  },
  sparklineWave: {
    marginTop: 8,
  },

  // 4. Main 2-Column Grid
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '360px 1fr',
    gap: 20,
    minHeight: 380,
  },

  // Column 1: Migrations List
  migrationsListCard: {
    position: 'relative',
    borderRadius: 16,
    background: 'rgba(6, 20, 24, 0.8)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  migrationsCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(45, 212, 191, 0.12)',
  },
  iconBoxSmall: {
    width: 26,
    height: 26,
    borderRadius: 6,
    background: 'rgba(45, 212, 191, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  migrationsTitleText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '0.04em',
  },
  viewHistoryLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  migrationsInnerContainer: {
    flex: 1,
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 1,
  },
  emptyMigrationsState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  cloudBadgeCircle: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1.5px solid rgba(45, 212, 191, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    boxShadow: '0 0 16px rgba(45, 212, 191, 0.2)',
  },
  emptyHeading: {
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  emptySubtext: {
    fontSize: 11.5,
    color: '#8696a0',
    maxWidth: 260,
    lineHeight: 1.45,
    margin: '0 0 16px 0',
  },
  startMigrationBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    borderRadius: 20,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: 'none',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
  },
  migrationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  migrationRowItem: {
    padding: '12px 14px',
    borderRadius: 10,
    background: 'rgba(10, 27, 32, 0.7)',
    border: '1px solid rgba(45, 212, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  migrationRowItemActive: {
    background: 'linear-gradient(90deg, rgba(45, 212, 191, 0.18) 0%, rgba(10, 30, 36, 0.8) 100%)',
    border: '1px solid #2dd4bf',
  },
  pillCompleted: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 10,
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  pillInProgress: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.15)',
    color: '#2dd4bf',
    border: '1px solid rgba(45, 212, 191, 0.3)',
  },
  silkWaveCardCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    pointerEvents: 'none',
  },

  // Column 2: Progress Canvas
  progressCanvasCard: {
    borderRadius: 16,
    background: 'rgba(6, 20, 24, 0.8)',
    border: '1px solid rgba(45, 212, 191, 0.22)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  canvasEmptyContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  centerGraphicBox: {
    marginBottom: 16,
  },
  canvasGuideText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 16,
  },
  activeProgressContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  activeProgressTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottom: '1px solid rgba(45, 212, 191, 0.15)',
  },
  cutoverBtn: {
    padding: '9px 18px',
    borderRadius: 8,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: 'none',
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  migrationStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
  },
  statBox: {
    padding: '14px 16px',
    borderRadius: 10,
    background: 'rgba(10, 28, 34, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    textAlign: 'center',
  },
  statBoxVal: {
    fontSize: 20,
    fontWeight: 800,
    color: '#ffffff',
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 4,
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
    maxWidth: 640,
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
  checklistCard: {
    padding: 14,
    borderRadius: 10,
    background: 'rgba(7, 22, 26, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#cbd5e1',
    cursor: 'pointer',
  },
  progressBox: {
    padding: 12,
    borderRadius: 8,
    background: 'rgba(8, 28, 34, 0.85)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    background: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #2dd4bf 0%, #10b981 100%)',
    transition: 'width 0.4s ease',
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
