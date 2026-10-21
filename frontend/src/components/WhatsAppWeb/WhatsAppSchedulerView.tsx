import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Send, Zap, RefreshCw,
  Users, Shield, Plus, ChevronRight, Trash2, Repeat, User
} from 'lucide-react';
import BackButton from '../common/BackButton';
import { schedulerApi, ScheduledMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface WhatsAppSchedulerViewProps {
  onScheduleNew: () => void;
  onPresetSelect?: (preset: string) => void;
  accountId?: string;
}

export default function WhatsAppSchedulerView({
  onScheduleNew,
  onPresetSelect,
  accountId,
}: WhatsAppSchedulerViewProps) {
  const [jobs, setJobs] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const fetchJobs = async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      const data = await schedulerApi.list(accountId);
      setJobs(data || []);
    } catch (err) {
      console.warn('Failed to fetch scheduled jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [accountId]);

  const handleCancelJob = async (jobId: string) => {
    try {
      await schedulerApi.cancel(jobId);
      addToast('info', 'Scheduled message cancelled');
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err: any) {
      addToast('error', 'Failed to cancel schedule: ' + (err?.message || 'Server error'));
    }
  };

  const activeJobs = jobs.filter(j => j.status === 'pending');

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 14 }}>
        <BackButton label="Back to Previous Page" />
      </div>

      {/* ── Top Header Card ───────────────────────────────────────────── */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={styles.calendarIconBox}>
            <Calendar size={24} color="#2dd4bf" />
          </div>
          <div>
            <h2 style={styles.headerTitle}>Message Scheduler</h2>
            <p style={styles.headerSubtitle}>
              Schedule one-time or recurring messages to any contact
            </p>
          </div>
        </div>

        <button style={styles.scheduleNewBtn} onClick={onScheduleNew}>
          <Plus size={16} strokeWidth={2.5} />
          <span>Schedule New</span>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* ── Active Scheduled Jobs Cards (Displayed above Hero when jobs exist) ── */}
      {activeJobs.length > 0 && (
        <div style={styles.activeJobsSection}>
          <div style={styles.activeJobsHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={styles.activeJobsBadge}>
                <Clock size={15} color="#2dd4bf" />
                <span style={{ fontWeight: 700, color: '#2dd4bf', fontSize: 13 }}>
                  Active Scheduled Jobs ({activeJobs.length})
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#8696a0' }}>Messages queued in automated delivery scheduler</span>
            </div>
            <button
              onClick={fetchJobs}
              style={styles.refreshJobsBtn}
              title="Refresh Queue"
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div style={styles.jobsGrid}>
            {activeJobs.map((job) => {
              const recipient = (job.toJid || '').replace('@s.whatsapp.net', '').replace('@g.us', '');
              const isGroup = (job.toJid || '').endsWith('@g.us');
              return (
                <div key={job.id} style={styles.jobCard}>
                  <div style={styles.jobCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={styles.jobRecipientIcon}>
                        <User size={13} color="#2dd4bf" />
                      </div>
                      <div>
                        <span style={styles.jobRecipientName}>{isGroup ? 'Group: ' : ''}{recipient}</span>
                        <div style={styles.jobTimeText}>
                          <Clock size={11} color="#38bdf8" />
                          <span>{job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : 'Scheduled'}</span>
                        </div>
                      </div>
                    </div>

                    <span style={styles.repeatBadge}>
                      <Repeat size={10} />
                      <span>{job.repeatType || 'once'}</span>
                    </span>
                  </div>

                  <div style={styles.jobMessageBubble}>
                    {job.messageText}
                  </div>

                  <div style={styles.jobCardFooter}>
                    <span style={styles.pendingStatusPill}>
                      <span style={styles.pulseDot} />
                      <span>Pending Queue</span>
                    </span>

                    <button
                      onClick={() => handleCancelJob(job.id)}
                      style={styles.cancelJobBtn}
                      title="Cancel this scheduled message"
                    >
                      <Trash2 size={13} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main Hero Card: No Scheduled Messages Yet ─────────────────── */}
      <div style={styles.heroCard}>
        {/* Ambient Wave Graphic in Background */}
        <div style={styles.ambientWave} />

        {/* Center Illustrated Graphic (Clock + Calendar + Send Badge) */}
        <div style={styles.graphicWrap}>
          <div style={styles.clockCircle}>
            {/* Clock Hands */}
            <div style={styles.clockHandHour} />
            <div style={styles.clockHandMinute} />
            <div style={styles.clockCenterDot} />
          </div>

          {/* Calendar Badge */}
          <div style={styles.calendarBadge}>
            <div style={styles.calendarRings}>
              <span style={styles.ring} />
              <span style={styles.ring} />
            </div>
            <div style={styles.calendarGrid}>
              <div style={styles.calDot} />
              <div style={styles.calDot} />
              <div style={styles.calDot} />
              <div style={styles.calDot} />
            </div>
          </div>

          {/* Floating Send Paper Airplane Badge */}
          <div style={styles.sendBadge}>
            <Send size={15} color="#051a14" style={{ transform: 'rotate(15deg) translate(-1px, 1px)' }} />
          </div>

          {/* Decorative floating dots */}
          <div style={{ ...styles.sparkleDot, top: 10, left: -20 }} />
          <div style={{ ...styles.sparkleDot, bottom: 15, right: -25, width: 7, height: 7 }} />
          <div style={{ ...styles.sparkleDot, top: -10, right: 30, width: 4, height: 4 }} />
        </div>

        {/* Hero Title with highlighted 'yet' */}
        <h3 style={styles.heroTitle}>
          No scheduled messages <span style={styles.highlightYet}>yet</span>
        </h3>

        <p style={styles.heroSubtitle}>
          Schedule birthday wishes, client reminders, follow-ups, or recurring morning announcements.
        </p>

        {/* Big Action Pill Button */}
        <button style={styles.scheduleFirstBtn} onClick={onScheduleNew}>
          <Calendar size={18} />
          <span>Schedule Your First Message</span>
          <ChevronRight size={16} />
        </button>

        {/* ── 4 Feature Cards (Horizontal Row) ────────────────────────── */}
        <div style={styles.featureRow}>
          {/* Card 1: One-time Message */}
          <div
            style={{ ...styles.featureCard, cursor: 'pointer' }}
            onClick={() => onPresetSelect && onPresetSelect('One-time Message')}
            title="Click to schedule a one-time message"
          >
            <div style={{ ...styles.featureIconWrap, background: 'rgba(45, 212, 191, 0.12)', color: '#2dd4bf' }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={styles.featureTitle}>One-time Message</div>
              <div style={styles.featureDesc}>Send at a specific time</div>
            </div>
          </div>

          {/* Card 2: Recurring Messages */}
          <div
            style={{ ...styles.featureCard, cursor: 'pointer' }}
            onClick={() => onPresetSelect && onPresetSelect('Recurring Messages')}
            title="Click to schedule recurring messages"
          >
            <div style={{ ...styles.featureIconWrap, background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
              <RefreshCw size={17} />
            </div>
            <div>
              <div style={styles.featureTitle}>Recurring Messages</div>
              <div style={styles.featureDesc}>Daily, weekly or monthly</div>
            </div>
          </div>

          {/* Card 3: Multiple Recipients */}
          <div
            style={{ ...styles.featureCard, cursor: 'pointer' }}
            onClick={() => onPresetSelect && onPresetSelect('Multiple Recipients')}
            title="Click to send to multiple contacts"
          >
            <div style={{ ...styles.featureIconWrap, background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
              <Users size={18} />
            </div>
            <div>
              <div style={styles.featureTitle}>Multiple Recipients</div>
              <div style={styles.featureDesc}>Send to contacts or groups</div>
            </div>
          </div>

          {/* Card 4: 100% Secure */}
          <div
            style={{ ...styles.featureCard, cursor: 'pointer' }}
            onClick={() => onPresetSelect && onPresetSelect('100% Secure')}
            title="Encrypted with local Baileys session keys"
          >
            <div style={{ ...styles.featureIconWrap, background: 'rgba(45, 212, 191, 0.12)', color: '#2dd4bf' }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={styles.featureTitle}>100% Secure</div>
              <div style={styles.featureDesc}>Your data stays private</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    background: '#071013',
    padding: '20px 24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    fontFamily: "'Inter', sans-serif",
  },
  activeJobsSection: {
    background: 'rgba(13, 25, 30, 0.75)',
    border: '1px solid rgba(45, 212, 191, 0.25)',
    borderRadius: 16,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    backdropFilter: 'blur(16px)',
  },
  activeJobsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeJobsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(45, 212, 191, 0.1)',
    border: '1px solid rgba(45, 212, 191, 0.3)',
    borderRadius: 8,
    padding: '4px 10px',
  },
  refreshJobsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '5px 12px',
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  jobsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12,
  },
  jobCard: {
    background: 'rgba(17, 34, 40, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transition: 'all 0.2s ease',
  },
  jobCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  jobRecipientIcon: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(45, 212, 191, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  jobRecipientName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#f8fafc',
    display: 'block',
  },
  jobTimeText: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
  },
  repeatBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: '2px 6px',
    fontSize: 10.5,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  jobMessageBubble: {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 1.4,
    maxHeight: 60,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  jobCardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  pendingStatusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    fontWeight: 600,
    color: '#10b981',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  cancelJobBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: 6,
    padding: '3px 8px',
    color: '#f87171',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  headerCard: {
    background: 'rgba(13, 25, 30, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backdropFilter: 'blur(16px)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  calendarIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'rgba(45, 212, 191, 0.12)',
    border: '1.5px solid rgba(45, 212, 191, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(45, 212, 191, 0.2)',
  },
  headerTitle: {
    margin: 0,
    fontSize: 21,
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.3px',
  },
  headerSubtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#8696a0',
  },
  scheduleNewBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  heroCard: {
    flex: 1,
    background: 'rgba(11, 22, 27, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientWave: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 180,
    background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 80%)',
    filter: 'blur(50px)',
    pointerEvents: 'none',
  },
  graphicWrap: {
    position: 'relative',
    width: 140,
    height: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  clockCircle: {
    width: 82,
    height: 82,
    borderRadius: '50%',
    border: '4px solid #14b8a6',
    background: 'radial-gradient(circle, #09332e 0%, #061c1a 100%)',
    boxShadow: '0 0 30px rgba(20, 184, 166, 0.35)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  clockHandHour: {
    position: 'absolute',
    top: 24,
    left: 38,
    width: 3,
    height: 18,
    background: '#2dd4bf',
    borderRadius: 2,
    transformOrigin: 'bottom center',
    transform: 'rotate(-45deg)',
  },
  clockHandMinute: {
    position: 'absolute',
    top: 16,
    left: 38,
    width: 2.5,
    height: 25,
    background: '#5eead4',
    borderRadius: 2,
    transformOrigin: 'bottom center',
    transform: 'rotate(50deg)',
  },
  clockCenterDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#ffffff',
    zIndex: 3,
  },
  calendarBadge: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 48,
    height: 52,
    background: '#0d3832',
    border: '2px solid rgba(45, 212, 191, 0.4)',
    borderRadius: 10,
    boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
    zIndex: 1,
    padding: '8px 6px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
  },
  calendarRings: {
    display: 'flex',
    gap: 12,
    marginTop: -14,
  },
  ring: {
    width: 4,
    height: 9,
    background: '#2dd4bf',
    borderRadius: 2,
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 5,
    marginTop: 6,
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#2dd4bf',
    opacity: 0.6,
  },
  sendBadge: {
    position: 'absolute',
    bottom: 2,
    right: 28,
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2dd4bf, #10b981)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.6)',
    zIndex: 4,
  },
  sparkleDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#5eead4',
    boxShadow: '0 0 8px #5eead4',
    opacity: 0.8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#f8fafc',
    margin: '0 0 8px 0',
    letterSpacing: '-0.3px',
  },
  highlightYet: {
    color: '#2dd4bf',
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: '#8696a0',
    maxWidth: 520,
    margin: '0 0 28px 0',
    lineHeight: 1.5,
  },
  scheduleFirstBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '13px 26px',
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #00a884 0%, #10b981 100%)',
    border: '1px solid rgba(52, 211, 153, 0.45)',
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 6px 24px rgba(16, 185, 129, 0.4)',
    marginBottom: 44,
    transition: 'transform 0.15s ease',
  },
  featureRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
    width: '100%',
    maxWidth: 820,
  },
  featureCard: {
    background: 'rgba(17, 28, 33, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    textAlign: 'left',
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#f8fafc',
  },
  featureDesc: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2,
  },
};
