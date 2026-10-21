import React, { useState, useEffect } from 'react';
import {
  X, Download, FileSpreadsheet, FileText, FolderArchive,
  Shield, Check, AlertCircle, RefreshCw, Calendar, Eye,
  Lock, HardDrive, Database, Sparkles, User, Globe, CheckCircle2, Clock
} from 'lucide-react';
import {
  Account, WhatsAppChat, exportBackupApi, ExportPayload, ExportStats, AutomatedBackupStatus
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { resolveChatDisplayName } from '../../utils/contactResolver';
import { formatIndianDateTime } from '../../utils/indianTime';

interface ExportBackupModalProps {
  accounts: Account[];
  activeAccount: Account | null;
  activeChat?: WhatsAppChat | null;
  onClose: () => void;
  onSelectAccount?: (acc: Account) => void;
}

export default function ExportBackupModal({
  accounts,
  activeAccount,
  activeChat,
  onClose,
  onSelectAccount,
}: ExportBackupModalProps) {
  const { user } = useAuth();
  const isAdminUser = !user || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  // Auto-Selection: automatically select 'all' on mount if user is Admin / SuperAdmin
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    if (activeChat) return activeAccount?.id || (accounts[0]?.id ?? 'all');
    if (isAdminUser || (!activeAccount && accounts.length > 0)) return 'all';
    return activeAccount?.id || 'all';
  });
  const [scope, setScope] = useState<'all' | 'single_chat' | 'unreplied'>(activeChat ? 'single_chat' : 'all');
  const [format, setFormat] = useState<'zip' | 'excel' | 'pdf'>('zip');
  // Default to 'all' media (Universal Media Mapping: Images, Videos, Audios, Documents)
  const [mediaOption, setMediaOption] = useState<'none' | 'docs_audio' | 'all'>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [piiRedacted, setPiiRedacted] = useState<boolean>(false);
  const [sinceLastBackup, setSinceLastBackup] = useState<boolean>(false);

  const [stats, setStats] = useState<ExportStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const [autoStatus, setAutoStatus] = useState<AutomatedBackupStatus | null>(null);
  const [triggeringAuto, setTriggeringAuto] = useState<boolean>(false);

  const { addToast } = useToast();

  // Load automated cron backup status
  useEffect(() => {
    exportBackupApi.getAutomatedStatus()
      .then(res => setAutoStatus(res))
      .catch(() => {});
  }, []);


  // Load stats when account or scope changes
  useEffect(() => {
    if (!selectedAccountId) return;
    setLoadingStats(true);
    const targetChatJid = scope === 'single_chat' && activeChat ? activeChat.id : undefined;
    exportBackupApi.getStats(selectedAccountId, targetChatJid)
      .then(res => setStats(res))
      .catch(err => {
        console.error('Failed to load export stats:', err);
      })
      .finally(() => setLoadingStats(false));
  }, [selectedAccountId, scope, activeChat]);

  const handleStartExport = async () => {
    if (!selectedAccountId) {
      addToast('warning', 'Please select an active account.');
      return;
    }

    setExporting(true);
    setProgress(20);

    let dateFrom: number | undefined;
    let dateTo: number | undefined;
    const now = Date.now();

    if (dateRange === '7d') {
      dateFrom = now - 7 * 24 * 60 * 60 * 1000;
    } else if (dateRange === '30d') {
      dateFrom = now - 30 * 24 * 60 * 60 * 1000;
    } else if (dateRange === 'custom') {
      if (customStart) dateFrom = new Date(customStart).getTime();
      if (customEnd) dateTo = new Date(customEnd).getTime() + 24 * 60 * 60 * 1000 - 1;
    }

    const payload: ExportPayload = {
      accountId: selectedAccountId,
      scope: scope === 'single_chat' ? 'single_chat' : 'all',
      chatJid: scope === 'single_chat' && activeChat ? activeChat.id : undefined,
      format,
      includeMedia: mediaOption,
      piiRedacted,
      sinceLastBackup,
      dateFrom,
      dateTo,
    };

    try {
      setProgress(50);
      addToast('info', 'Compiling archive and extracting database conversations...');
      await exportBackupApi.exportSync(payload);
      setProgress(100);
      addToast('success', 'Backup export downloaded successfully!');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Export failed:', err);
      addToast('error', `Export failed: ${err.message || 'Server error'}`);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  const selectedAcc = accounts.find(a => a.id === selectedAccountId);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 16,
    }}>
      <div style={{
        background: '#111b21',
        border: '1px solid #222e35',
        borderRadius: 14,
        width: '100%',
        maxWidth: 680,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        color: '#e9edef',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #222e35',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#182229',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #00a884, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#111b21',
              boxShadow: '0 4px 12px rgba(0, 168, 132, 0.3)',
            }}>
              <FolderArchive size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#fff' }}>
                Database Backup & Conversation Export
              </h2>
              <p style={{ fontSize: 12, color: '#8696a0', margin: '2px 0 0 0' }}>
                Enterprise forensic-grade backup with offline Web Chat viewer & Excel reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Account Selector */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8696a0', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={e => {
                setSelectedAccountId(e.target.value);
                const acc = accounts.find(a => a.id === e.target.value);
                if (acc && onSelectAccount) onSelectAccount(acc);
              }}
              style={{
                width: '100%',
                background: '#202c33',
                border: '1px solid #2a3942',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#e9edef',
                fontSize: 14,
                outline: 'none',
              }}
            >
              <option value="all">🌐 All Accounts (Complete Organization Backup)</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.displayName || acc.phoneNumber || acc.id} ({acc.status})
                </option>
              ))}
            </select>
            {selectedAccountId === 'all' && (
              <div style={{ marginTop: 6, fontSize: 11.5, color: '#53bdeb', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={13} /> Dynamic Multi-Account mode: Automatically iterates all active accounts and structures separated folders with offline viewers and complete media.
              </div>
            )}
          </div>


          {/* Export Scope */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8696a0', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
              Export Scope
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: activeChat ? '1fr 1fr' : '1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setScope('all')}
                style={{
                  background: scope === 'all' ? 'rgba(0, 168, 132, 0.15)' : '#202c33',
                  border: scope === 'all' ? '1.5px solid #00a884' : '1px solid #2a3942',
                  borderRadius: 8,
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: scope === 'all' ? '#00a884' : '#e9edef',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>📦 All Contacts & Conversations</div>
                <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                  Full backup of all customer chats and contact directory
                </div>
              </button>

              {activeChat && (
                <button
                  type="button"
                  onClick={() => setScope('single_chat')}
                  style={{
                    background: scope === 'single_chat' ? 'rgba(0, 168, 132, 0.15)' : '#202c33',
                    border: scope === 'single_chat' ? '1.5px solid #00a884' : '1px solid #2a3942',
                    borderRadius: 8,
                    padding: '10px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: scope === 'single_chat' ? '#00a884' : '#e9edef',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                    💬 {resolveChatDisplayName(activeChat).name} Only
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 2 }}>
                    Export active conversation thread
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Format Selector Cards */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8696a0', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
              Export Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {/* ZIP Archive */}
              <div
                onClick={() => setFormat('zip')}
                style={{
                  background: format === 'zip' ? 'rgba(0, 168, 132, 0.15)' : '#202c33',
                  border: format === 'zip' ? '2px solid #00a884' : '1px solid #2a3942',
                  borderRadius: 10,
                  padding: '12px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <FolderArchive size={26} color={format === 'zip' ? '#00a884' : '#8696a0'} />
                <div style={{ fontWeight: 700, fontSize: 13, color: format === 'zip' ? '#00a884' : '#fff' }}>
                  Forensic ZIP
                </div>
                <div style={{ fontSize: 10.5, color: '#8696a0', lineHeight: 1.3 }}>
                  Offline Web Viewer, index.html, vCard & separated chat folders
                </div>
              </div>

              {/* Excel */}
              <div
                onClick={() => setFormat('excel')}
                style={{
                  background: format === 'excel' ? 'rgba(16, 185, 129, 0.15)' : '#202c33',
                  border: format === 'excel' ? '2px solid #10b981' : '1px solid #2a3942',
                  borderRadius: 10,
                  padding: '12px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <FileSpreadsheet size={26} color={format === 'excel' ? '#10b981' : '#8696a0'} />
                <div style={{ fontWeight: 700, fontSize: 13, color: format === 'excel' ? '#10b981' : '#fff' }}>
                  Excel (.xlsx)
                </div>
                <div style={{ fontSize: 10.5, color: '#8696a0', lineHeight: 1.3 }}>
                  Contacts directory and filterable conversations workbook
                </div>
              </div>

              {/* PDF */}
              <div
                onClick={() => setFormat('pdf')}
                style={{
                  background: format === 'pdf' ? 'rgba(59, 130, 246, 0.15)' : '#202c33',
                  border: format === 'pdf' ? '2px solid #3b82f6' : '1px solid #2a3942',
                  borderRadius: 10,
                  padding: '12px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <FileText size={26} color={format === 'pdf' ? '#3b82f6' : '#8696a0'} />
                <div style={{ fontWeight: 700, fontSize: 13, color: format === 'pdf' ? '#3b82f6' : '#fff' }}>
                  PDF Report
                </div>
                <div style={{ fontSize: 10.5, color: '#8696a0', lineHeight: 1.3 }}>
                  Formal printable transcripts with message bubble logs
                </div>
              </div>
            </div>
          </div>

          {/* Media Inclusion */}
          {format === 'zip' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8696a0', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                Media Attachments
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { key: 'none', label: 'No Media', desc: 'Lightweight (1-5 MB), fast' },
                  { key: 'docs_audio', label: 'Docs & Audio', desc: 'PDFs, invoices, voice notes' },
                  { key: 'all', label: 'Full Media', desc: 'Images, videos & all files' },
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMediaOption(item.key as any)}
                    style={{
                      background: mediaOption === item.key ? 'rgba(0, 168, 132, 0.15)' : '#202c33',
                      border: mediaOption === item.key ? '1px solid #00a884' : '1px solid #2a3942',
                      borderRadius: 6,
                      padding: '8px 10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: mediaOption === item.key ? '#00a884' : '#e9edef',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#8696a0', marginTop: 2 }}>{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security & Compliance Toggles */}
          <div style={{
            background: '#182229',
            border: '1px solid #222e35',
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={piiRedacted}
                onChange={e => setPiiRedacted(e.target.checked)}
                style={{ accentColor: '#00a884', width: 16, height: 16, cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontWeight: 600 }}>🛡️ Redact Sensitive PII</span>
                <span style={{ color: '#8696a0', fontSize: 11, display: 'block' }}>
                  Mask credit card numbers, OTPs, and authentication tokens for audit compliance
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={sinceLastBackup}
                onChange={e => setSinceLastBackup(e.target.checked)}
                style={{ accentColor: '#00a884', width: 16, height: 16, cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontWeight: 600 }}>⏱️ Incremental Delta Backup</span>
                <span style={{ color: '#8696a0', fontSize: 11, display: 'block' }}>
                  Only export new messages received since the last completed backup
                </span>
              </div>
            </label>
          </div>

          {/* Live Stats Preview */}
          <div style={{
            background: 'rgba(0, 168, 132, 0.08)',
            border: '1px solid rgba(0, 168, 132, 0.25)',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
          }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <span style={{ color: '#8696a0', display: 'block', fontSize: 11 }}>Contacts</span>
                <strong style={{ color: '#00a884', fontSize: 14 }}>
                  {loadingStats ? '...' : (stats?.chatCount || 0)}
                </strong>
              </div>
              <div>
                <span style={{ color: '#8696a0', display: 'block', fontSize: 11 }}>Messages</span>
                <strong style={{ color: '#00a884', fontSize: 14 }}>
                  {loadingStats ? '...' : (stats?.messageCount || 0)}
                </strong>
              </div>
              <div>
                <span style={{ color: '#8696a0', display: 'block', fontSize: 11 }}>Media Disk Size</span>
                <strong style={{ color: '#53bdeb', fontSize: 14 }}>
                  {loadingStats ? '...' : (stats?.mediaSizeFormatted || '0 B')}
                </strong>
              </div>
            </div>
            {stats?.lastBackupAt && (
              <div style={{ textAlign: 'right', fontSize: 11, color: '#8696a0' }}>
                Last export: {formatIndianDateTime(stats.lastBackupAt)}
              </div>
            )}
          </div>

          {/* Automated Zero-Touch System Backup Status Indicator */}
          {autoStatus && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  flexShrink: 0,
                }}>
                  <Clock size={16} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: '#e9edef' }}>
                      Automated System Backup
                    </span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '1px 6px',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 600,
                      background: autoStatus.status === 'running' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                      color: autoStatus.status === 'running' ? '#eab308' : '#4ade80',
                    }}>
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'currentColor',
                      }} />
                      {autoStatus.status === 'running' ? 'Running' : 'Active (Cron 02:00 AM IST)'}
                    </span>
                  </div>
                  <span style={{ color: '#8696a0', display: 'block', fontSize: 11, marginTop: 2 }}>
                    {autoStatus.lastBackupAt
                      ? `Last auto-backup: ${formatIndianDateTime(autoStatus.lastBackupAt)} (${autoStatus.lastFileSizeFormatted || 'Master ZIP'}) • 30-Day Auto Retention`
                      : 'Scheduled daily at 02:00 AM IST • Automated 30-day retention'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={triggeringAuto || autoStatus.status === 'running'}
                onClick={async () => {
                  try {
                    setTriggeringAuto(true);
                    addToast('info', 'Executing zero-touch automated master backup in background...');
                    const res = await exportBackupApi.triggerAutomatedBackup();
                    setAutoStatus(res);
                    addToast('success', 'Automated system backup created and saved to server storage!');
                  } catch (err: any) {
                    addToast('error', `Failed to trigger automated backup: ${err.message}`);
                  } finally {
                    setTriggeringAuto(false);
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#e9edef',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: triggeringAuto ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                {triggeringAuto ? (
                  <>
                    <RefreshCw size={12} className="wa-spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Backing up...</span>
                  </>
                ) : (
                  <span>Run Now</span>
                )}
              </button>
            </div>
          )}
        </div>


        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #222e35',
          background: '#182229',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            style={{
              background: 'transparent',
              border: '1px solid #2a3942',
              color: '#8696a0',
              padding: '8px 18px',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartExport}
            disabled={exporting || loadingStats}
            style={{
              background: 'linear-gradient(135deg, #00a884, #059669)',
              border: 'none',
              color: '#111b21',
              fontWeight: 700,
              padding: '10px 24px',
              borderRadius: 8,
              fontSize: 14,
              cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0, 168, 132, 0.3)',
              opacity: exporting || loadingStats ? 0.7 : 1,
            }}
          >
            {exporting ? (
              <>
                <RefreshCw size={16} className="wa-spinner" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Generating {format.toUpperCase()}...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Download {format.toUpperCase()} Backup</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
