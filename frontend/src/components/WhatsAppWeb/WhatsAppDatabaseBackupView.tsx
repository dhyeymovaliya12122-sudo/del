import React, { useState } from 'react';
import {
  Database, Shield, ChevronDown, Check, Download, FileText,
  FileSpreadsheet, Image as ImageIcon, Headphones, ChevronRight,
  HardDrive, ChevronLeft, Lock, ArrowUpRight, MessageSquare,
  Sparkles, RefreshCw
} from 'lucide-react';
import { Account, exportBackupApi, ExportPayload } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import BackButton from '../common/BackButton';

interface WhatsAppDatabaseBackupViewProps {
  accounts: Account[];
  activeAccount: Account | null;
  onCancel?: () => void;
  onOpenExistingBackups?: () => void;
}

export default function WhatsAppDatabaseBackupView({
  accounts,
  activeAccount,
  onCancel,
  onOpenExistingBackups,
}: WhatsAppDatabaseBackupViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return activeAccount?.id || (accounts[0]?.id ?? 'all');
  });

  const [scope, setScope] = useState<'all' | 'single_chat'>('all');
  const [format, setFormat] = useState<'zip' | 'excel' | 'pdf'>('zip');
  const [mediaOption, setMediaOption] = useState<'none' | 'docs_audio' | 'all'>('all');
  const [piiRedacted, setPiiRedacted] = useState<boolean>(true);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { addToast } = useToast();

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];

  const handleDownload = async () => {
    setExporting(true);
    try {
      addToast('info', 'Compiling forensic backup and extracting database conversations...');
      const payload: ExportPayload = {
        accountId: selectedAccountId,
        scope,
        format,
        includeMedia: mediaOption,
        piiRedacted,
      };
      await exportBackupApi.exportSync(payload);
      addToast('success', `${format === 'zip' ? 'Forensic ZIP' : format === 'excel' ? 'Excel workbook' : 'PDF report'} downloaded successfully!`);
    } catch (err: any) {
      console.error('Export failed:', err);
      addToast('error', `Backup download failed: ${err.message || 'Server error'}`);
    } finally {
      setExporting(false);
    }
  };

  const accountDisplayLabel = selectedAccount
    ? `${selectedAccount.displayName || selectedAccount.phoneNumber || 'Account'} (CONNECTED)`
    : 'Account (CONNECTED)';

  const formatDisplayLabel = format === 'zip' ? 'Forensic ZIP' : format === 'excel' ? 'Excel (.xlsx)' : 'PDF Report';
  const mediaDisplayLabel = mediaOption === 'all' ? 'Full Media' : mediaOption === 'docs_audio' ? 'Docs & Audio' : 'No Media';
  const scopeDisplayLabel = scope === 'all' ? 'All Contacts & Conversations' : 'You (Message yourself) Only';

  return (
    <div style={styles.container}>
      {/* ── Center Content Scroll ─────────────────────────────────────── */}
      <div style={styles.mainScroll}>
        <div style={styles.contentWrap}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
            <BackButton onBack={onCancel} label="Back to Previous Page" />
          </div>

          {/* ── Top Header Banner ────────────────────────────────────────── */}
          <div style={styles.headerCard}>
            <div style={styles.headerLeft}>
              <div style={styles.dbIconBox}>
                <Database size={28} color="#2dd4bf" />
              </div>
              <div>
                <h1 style={styles.pageTitle}>Database Backup &amp; Conversation Export</h1>
                <p style={styles.pageSubtitle}>
                  Enterprise forensic-grade backup with offline viewer &amp; Excel reports
                </p>
              </div>
            </div>

            {/* Graphic Illustration on the right */}
            <div style={styles.headerIllustration}>
              <div style={styles.cloudGraphicBox}>
                <svg width="120" height="60" viewBox="0 0 140 70" fill="none">
                  {/* Cloud */}
                  <path
                    d="M100 45C108 45 115 39 115 31C115 24 109 18 102 18C101 11 94 6 86 6C78 6 72 10 70 16C68 15 65 14 62 14C53 14 46 21 46 30C46 31 46 32 46 33C40 35 36 40 36 46C36 53 42 59 50 59H100C108 59 114 53 114 45Z"
                    fill="rgba(45, 212, 191, 0.15)"
                    stroke="#2dd4bf"
                    strokeWidth="1.5"
                  />
                  {/* Phone Device Mockup */}
                  <rect x="90" y="20" width="30" height="46" rx="5" fill="#0c1a1f" stroke="#00a884" strokeWidth="1.5" />
                  <circle cx="105" cy="38" r="8" fill="#00a884" />
                  <path d="M102 36C103 35 104 35 105 36L108 39" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Document */}
                  <rect x="40" y="24" width="22" height="30" rx="3" fill="#0c1a1f" stroke="#2dd4bf" strokeWidth="1.2" />
                  <line x1="45" y1="30" x2="57" y2="30" stroke="#2dd4bf" strokeWidth="1.2" />
                  <line x1="45" y1="35" x2="55" y2="35" stroke="#2dd4bf" strokeWidth="1.2" />
                  <line x1="45" y1="40" x2="52" y2="40" stroke="#2dd4bf" strokeWidth="1.2" />
                  {/* Sync Arrows */}
                  <path d="M68 36H82M82 36L78 32M82 36L78 40" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Section 1: WhatsApp Account ──────────────────────────────── */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionHeader}>
              <div style={styles.stepNumber}>1</div>
              <div>
                <div style={styles.sectionTitle}>Account</div>
                <div style={styles.sectionSubtitle}>Select the account whose data you want to backup or export</div>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                style={styles.dropdownTrigger}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={styles.waIconSmall}>
                    <MessageSquare size={14} color="#00a884" />
                  </div>
                  <span style={styles.dropdownValue}>{accountDisplayLabel}</span>
                </div>
                <ChevronDown size={16} color="#8696a0" />
              </div>

              {isAccountDropdownOpen && (
                <div style={styles.dropdownMenu}>
                  {accounts.map(acc => (
                    <div
                      key={acc.id}
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        setIsAccountDropdownOpen(false);
                      }}
                      style={{
                        ...styles.dropdownItem,
                        background: acc.id === selectedAccountId ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                        color: acc.id === selectedAccountId ? '#2dd4bf' : '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: acc.status === 'CONNECTED' ? '#10b981' : '#64748b'
                        }} />
                        <span>{acc.displayName || acc.phoneNumber || acc.id} ({acc.status})</span>
                      </div>
                      {acc.id === selectedAccountId && <Check size={14} color="#2dd4bf" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 2: Export Scope ──────────────────────────────────── */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionHeader}>
              <div style={styles.stepNumber}>2</div>
              <div>
                <div style={styles.sectionTitle}>Export Scope</div>
                <div style={styles.sectionSubtitle}>Choose what data you want to include in the backup</div>
              </div>
            </div>

            <div style={styles.gridTwo}>
              {/* Scope A: All Contacts & Conversations */}
              <div
                onClick={() => setScope('all')}
                style={{
                  ...styles.selectableCard,
                  ...(scope === 'all' ? styles.cardSelected : styles.cardUnselected),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={styles.scopeIconBox}>
                    <MessageSquare size={18} color="#2dd4bf" />
                  </div>
                  <div>
                    <div style={styles.cardTitle}>All Contacts &amp; Conversations</div>
                    <div style={styles.cardSubtitle}>
                      Full backup of all customer chats and contact directory
                    </div>
                  </div>
                </div>

                <div style={styles.checkCircleWrapper}>
                  {scope === 'all' ? (
                    <div style={styles.checkedCircle}>
                      <Check size={12} color="#0c1317" />
                    </div>
                  ) : (
                    <div style={styles.uncheckedCircle} />
                  )}
                </div>
              </div>

              {/* Scope B: You (Message yourself) Only */}
              <div
                onClick={() => setScope('single_chat')}
                style={{
                  ...styles.selectableCard,
                  ...(scope === 'single_chat' ? styles.cardSelected : styles.cardUnselected),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ ...styles.scopeIconBox, background: 'rgba(255, 255, 255, 0.04)' }}>
                    <MessageSquare size={18} color="#8696a0" />
                  </div>
                  <div>
                    <div style={styles.cardTitle}>You (Message yourself) Only</div>
                    <div style={styles.cardSubtitle}>
                      Export active conversation thread
                    </div>
                  </div>
                </div>

                <div style={styles.checkCircleWrapper}>
                  {scope === 'single_chat' ? (
                    <div style={styles.checkedCircle}>
                      <Check size={12} color="#0c1317" />
                    </div>
                  ) : (
                    <div style={styles.uncheckedCircle} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: Export Format ─────────────────────────────────── */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionHeader}>
              <div style={styles.stepNumber}>3</div>
              <div>
                <div style={styles.sectionTitle}>Export Format</div>
                <div style={styles.sectionSubtitle}>Select the file format for your export</div>
              </div>
            </div>

            <div style={styles.gridThree}>
              {/* Format 1: Forensic ZIP */}
              <div
                onClick={() => setFormat('zip')}
                style={{
                  ...styles.selectableCard,
                  ...(format === 'zip' ? styles.cardSelected : styles.cardUnselected),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={styles.formatIconBox}>
                    <FileText size={18} color="#2dd4bf" />
                  </div>
                  <div>
                    <div style={styles.cardTitle}>Forensic ZIP</div>
                    <div style={styles.cardSubtitle}>
                      Offline Web Viewer, index.html, vCard &amp; separated chat folders
                    </div>
                  </div>
                </div>

                <div style={styles.checkCircleWrapper}>
                  {format === 'zip' ? (
                    <div style={styles.checkedCircle}>
                      <Check size={12} color="#0c1317" />
                    </div>
                  ) : (
                    <div style={styles.uncheckedCircle} />
                  )}
                </div>
              </div>

              {/* Format 2: Excel (.xlsx) */}
              <div
                onClick={() => setFormat('excel')}
                style={{
                  ...styles.selectableCard,
                  ...(format === 'excel' ? styles.cardSelected : styles.cardUnselected),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ ...styles.formatIconBox, background: 'rgba(255, 255, 255, 0.04)' }}>
                    <FileSpreadsheet size={18} color="#8696a0" />
                  </div>
                  <div>
                    <div style={styles.cardTitle}>Excel (.xlsx)</div>
                    <div style={styles.cardSubtitle}>
                      Contacts directory and filterable conversations workbook
                    </div>
                  </div>
                </div>

                <div style={styles.checkCircleWrapper}>
                  {format === 'excel' ? (
                    <div style={styles.checkedCircle}>
                      <Check size={12} color="#0c1317" />
                    </div>
                  ) : (
                    <div style={styles.uncheckedCircle} />
                  )}
                </div>
              </div>

              {/* Format 3: PDF Report */}
              <div
                onClick={() => setFormat('pdf')}
                style={{
                  ...styles.selectableCard,
                  ...(format === 'pdf' ? styles.cardSelected : styles.cardUnselected),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ ...styles.formatIconBox, background: 'rgba(255, 255, 255, 0.04)' }}>
                    <FileText size={18} color="#8696a0" />
                  </div>
                  <div>
                    <div style={styles.cardTitle}>PDF Report</div>
                    <div style={styles.cardSubtitle}>
                      Formal printable transcripts with message bubble logs
                    </div>
                  </div>
                </div>

                <div style={styles.checkCircleWrapper}>
                  {format === 'pdf' ? (
                    <div style={styles.checkedCircle}>
                      <Check size={12} color="#0c1317" />
                    </div>
                  ) : (
                    <div style={styles.uncheckedCircle} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Media Attachments ─────────────────────────────── */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionHeader}>
              <div style={styles.stepNumber}>4</div>
              <div>
                <div style={styles.sectionTitle}>Media Attachments</div>
                <div style={styles.sectionSubtitle}>Choose which media files to include in the backup</div>
              </div>
            </div>

            <div style={styles.gridThree}>
              {/* Media Option 1: No Media */}
              <div
                onClick={() => setMediaOption('none')}
                style={{
                  ...styles.selectableCard,
                  ...(mediaOption === 'none' ? styles.cardSelected : styles.cardUnselected),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ ...styles.formatIconBox, background: 'rgba(255, 255, 255, 0.04)' }}>
                    <FileText size={18} color="#8696a0" />
                  </div>
                  <div>
                    <div style={styles.cardTitle}>No Media</div>
                    <div style={styles.cardSubtitle}>
                      Lightweight (1-5 MB), fast
                    </div>
                  </div>
                </div>

                <div style={styles.checkCircleWrapper}>
                  {mediaOption === 'none' ? (
                    <div style={styles.checkedCircle}>
                      <Check size={12} color="#0c1317" />
                    </div>
                  ) : (
                    <div style={styles.uncheckedCircle} />
                  )}
                </div>
              </div>

              {/* Media Option 2: Docs & Audio */}
              <div
                onClick={() => setMediaOption('docs_audio')}
                style={{
                  ...styles.selectableCard,
                  ...(mediaOption === 'docs_audio' ? styles.cardSelected : styles.cardUnselected),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ ...styles.formatIconBox, background: 'rgba(255, 255, 255, 0.04)' }}>
                    <FileText size={18} color="#8696a0" />
                  </div>
                  <div>
                    <div style={styles.cardTitle}>Docs &amp; Audio</div>
                    <div style={styles.cardSubtitle}>
                      PDFs, invoices, voice notes
                    </div>
                  </div>
                </div>

                <div style={styles.checkCircleWrapper}>
                  {mediaOption === 'docs_audio' ? (
                    <div style={styles.checkedCircle}>
                      <Check size={12} color="#0c1317" />
                    </div>
                  ) : (
                    <div style={styles.uncheckedCircle} />
                  )}
                </div>
              </div>

              {/* Media Option 3: Full Media */}
              <div
                onClick={() => setMediaOption('all')}
                style={{
                  ...styles.selectableCard,
                  ...(mediaOption === 'all' ? styles.cardSelected : styles.cardUnselected),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={styles.formatIconBox}>
                    <ImageIcon size={18} color="#2dd4bf" />
                  </div>
                  <div>
                    <div style={styles.cardTitle}>Full Media</div>
                    <div style={styles.cardSubtitle}>
                      Images, videos &amp; all files
                    </div>
                  </div>
                </div>

                <div style={styles.checkCircleWrapper}>
                  {mediaOption === 'all' ? (
                    <div style={styles.checkedCircle}>
                      <Check size={12} color="#0c1317" />
                    </div>
                  ) : (
                    <div style={styles.uncheckedCircle} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 5: Redact Sensitive PII ──────────────────────────── */}
          <div style={styles.piiToggleRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={styles.shieldRoundBox}>
                <Shield size={18} color="#2dd4bf" />
              </div>

              {/* Toggle Switch */}
              <div
                onClick={() => setPiiRedacted(!piiRedacted)}
                style={{
                  ...styles.switchTrack,
                  background: piiRedacted ? '#00a884' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <div
                  style={{
                    ...styles.switchThumb,
                    transform: piiRedacted ? 'translateX(18px)' : 'translateX(0)',
                  }}
                />
              </div>

              <div>
                <div style={styles.piiTitle}>Redact Sensitive PII</div>
                <div style={styles.piiSubtitle}>
                  Mask credit card numbers, OTPs, and authentication tokens for audit compliance
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Action Controls ───────────────────────────────────── */}
          <div style={styles.bottomBar}>
            <button
              onClick={onCancel}
              style={styles.cancelActionBtn}
            >
              <ChevronLeft size={16} />
              <span>Cancel</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={exporting}
              style={styles.downloadActionBtn}
            >
              {exporting ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  <span>Compiling Forensic Archive...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download {format === 'zip' ? 'ZIP Backup' : format === 'excel' ? 'Excel Export' : 'PDF Report'}</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* ── Right Sidebar Panel Matching Design 7 ─────────────────────── */}
      <aside style={styles.rightSidebar}>
        {/* Card 1: Backup Summary */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <div style={styles.summaryIconBox}>
              <Database size={20} color="#2dd4bf" />
            </div>
            <div>
              <div style={styles.summaryTitle}>Backup Summary</div>
              <div style={styles.summarySubtitle}>Ready to export and download</div>
            </div>
          </div>

          <div style={styles.summarySpecList}>
            <div style={styles.specRow}>
              <div style={styles.specLabel}>
                <MessageSquare size={13} color="#2dd4bf" />
                <span>Account</span>
              </div>
              <span style={styles.specValue}>{accountDisplayLabel}</span>
            </div>

            <div style={styles.specRow}>
              <div style={styles.specLabel}>
                <MessageSquare size={13} color="#2dd4bf" />
                <span>Scope</span>
              </div>
              <span style={styles.specValue}>{scopeDisplayLabel}</span>
            </div>

            <div style={styles.specRow}>
              <div style={styles.specLabel}>
                <FileText size={13} color="#2dd4bf" />
                <span>Format</span>
              </div>
              <span style={styles.specValue}>{formatDisplayLabel}</span>
            </div>

            <div style={styles.specRow}>
              <div style={styles.specLabel}>
                <ImageIcon size={13} color="#2dd4bf" />
                <span>Media</span>
              </div>
              <span style={styles.specValue}>{mediaDisplayLabel}</span>
            </div>

            <div style={styles.specRow}>
              <div style={styles.specLabel}>
                <Shield size={13} color="#2dd4bf" />
                <span>PII Redaction</span>
              </div>
              <span style={{ ...styles.specValue, color: piiRedacted ? '#10b981' : '#8696a0' }}>
                {piiRedacted ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Quick Actions */}
        <div style={styles.quickCard}>
          <div style={styles.quickHeader}>
            <span style={{ color: '#10b981', display: 'flex' }}>⚡</span>
            <span style={styles.quickTitle}>Quick Actions</span>
          </div>

          <div style={styles.quickItemList}>
            <div
              style={styles.quickItem}
              onClick={onOpenExistingBackups}
            >
              <div style={styles.quickItemLeft}>
                <FileText size={15} color="#8696a0" />
                <div>
                  <div style={styles.quickItemTitle}>View Existing Backups</div>
                  <div style={styles.quickItemSub}>Access previous backups</div>
                </div>
              </div>
              <ChevronRight size={14} color="#64748b" />
            </div>

            <div
              style={styles.quickItem}
              onClick={() => {
                setFormat('excel');
                handleDownload();
              }}
            >
              <div style={styles.quickItemLeft}>
                <FileSpreadsheet size={15} color="#8696a0" />
                <div>
                  <div style={styles.quickItemTitle}>Export Reports</div>
                  <div style={styles.quickItemSub}>Generate Excel or PDF</div>
                </div>
              </div>
              <ChevronRight size={14} color="#64748b" />
            </div>

            <div
              style={styles.quickItem}
              onClick={() => addToast('info', 'Storage Usage: 2.4 GB allocated • 18 Backups stored locally.')}
            >
              <div style={styles.quickItemLeft}>
                <HardDrive size={15} color="#8696a0" />
                <div>
                  <div style={styles.quickItemTitle}>Manage Storage</div>
                  <div style={styles.quickItemSub}>Check backup files &amp; space</div>
                </div>
              </div>
              <ChevronRight size={14} color="#64748b" />
            </div>
          </div>
        </div>

        {/* Card 3: Need Help? */}
        <div style={styles.helpCard}>
          <div style={styles.helpTop}>
            <div style={styles.helpIconBox}>
              <Headphones size={18} color="#2dd4bf" />
            </div>
            <div>
              <div style={styles.helpTitle}>Need Help?</div>
              <div style={styles.helpSubtitle}>
                Visit our support center for more information and guidance.
              </div>
            </div>
          </div>

          <button
            onClick={() => addToast('info', 'Chat Pro Help Center & Knowledge Base is available 24/7.')}
            style={styles.contactSupportBtn}
          >
            <span>Contact Support</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Bottom Calligraphy Accent Matching Design 7 */}
        <div style={styles.calligraphyWrap}>
          <span style={styles.calligraphyLine1}>Secure Conversations</span>
          <div style={styles.calligraphyLine2}>
            <span>Build Stronger Teams</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100%',
    width: '100%',
    background: '#071013',
    color: '#e2e8f0',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
  },
  mainScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 32px',
  },
  contentWrap: {
    maxWidth: 820,
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
  dbIconBox: {
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
  headerIllustration: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudGraphicBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'rgba(0, 168, 132, 0.2)',
    border: '1px solid rgba(45, 212, 191, 0.4)',
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#f8fafc',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#8696a0',
  },
  dropdownTrigger: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  waIconSmall: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(0, 168, 132, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownValue: {
    fontSize: 13.5,
    fontWeight: 600,
    color: '#ffffff',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    background: '#0d1a1e',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 12,
    padding: 6,
    zIndex: 50,
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  gridThree: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  selectableCard: {
    borderRadius: 12,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minHeight: 68,
  },
  cardSelected: {
    background: 'rgba(8, 35, 38, 0.7)',
    border: '1px solid rgba(45, 212, 191, 0.6)',
    boxShadow: '0 0 16px rgba(45, 212, 191, 0.15)',
  },
  cardUnselected: {
    background: 'rgba(11, 23, 28, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  scopeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  formatIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
    lineHeight: 1.3,
  },
  checkCircleWrapper: {
    marginLeft: 8,
    flexShrink: 0,
  },
  checkedCircle: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#10b981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
  },
  uncheckedCircle: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '1.5px solid rgba(255, 255, 255, 0.15)',
  },
  piiToggleRow: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '14px 18px',
  },
  shieldRoundBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTrack: {
    width: 42,
    height: 24,
    borderRadius: 9999,
    padding: 3,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    display: 'flex',
    alignItems: 'center',
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s ease',
  },
  piiTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#ffffff',
  },
  piiSubtitle: {
    fontSize: 11.5,
    color: '#8696a0',
    marginTop: 2,
  },
  bottomBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  cancelActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    borderRadius: 10,
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  downloadActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 24px',
    borderRadius: 10,
    background: '#00a884',
    border: 'none',
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 168, 132, 0.4)',
    transition: 'transform 0.15s ease',
  },
  rightSidebar: {
    width: 320,
    borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
    background: '#071013',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flexShrink: 0,
    overflowY: 'auto',
  },
  summaryCard: {
    background: 'rgba(8, 35, 38, 0.7)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 14,
    padding: '16px',
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(45, 212, 191, 0.15)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
  },
  summarySubtitle: {
    fontSize: 11,
    color: '#8696a0',
  },
  summarySpecList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  specRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
  },
  specLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#8696a0',
  },
  specValue: {
    fontWeight: 600,
    color: '#f8fafc',
    textAlign: 'right',
  },
  quickCard: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '16px',
  },
  quickHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
  },
  quickItemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  quickItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.02)',
    transition: 'background 0.15s ease',
  },
  quickItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  quickItemTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#f8fafc',
  },
  quickItemSub: {
    fontSize: 10.5,
    color: '#8696a0',
  },
  helpCard: {
    background: 'rgba(11, 23, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  helpTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  helpIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(45, 212, 191, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
  },
  helpSubtitle: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
    lineHeight: 1.3,
  },
  contactSupportBtn: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    background: 'transparent',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  calligraphyWrap: {
    marginTop: 'auto',
    padding: '16px 8px 8px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    userSelect: 'none',
  },
  calligraphyLine1: {
    fontFamily: "'Brush Script MT', 'Dancing Script', 'Caveat', cursive, sans-serif",
    fontSize: 15,
    color: '#8696a0',
    letterSpacing: '0.3px',
    fontStyle: 'italic',
  },
  calligraphyLine2: {
    fontFamily: "'Brush Script MT', 'Dancing Script', 'Caveat', cursive, sans-serif",
    fontSize: 15,
    color: '#2dd4bf',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    letterSpacing: '0.3px',
    fontStyle: 'italic',
  },
};
