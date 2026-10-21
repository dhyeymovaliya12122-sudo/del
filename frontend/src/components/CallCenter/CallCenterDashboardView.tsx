import React, { useState } from 'react';
import {
  Phone,
  Clock,
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Slash,
  XCircle,
  PhoneOff,
  Users,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

export interface CallCenterDashboardViewProps {
  onNavigateTab?: (tab: string) => void;
  onLogout?: () => void;
  activeSidebarItem?: string;
  totalAccountsCount?: number;
  totalContactsCount?: number;
}

interface PeriodMetrics {
  periodName: string;
  periodDate: string;
  totalCalls: number;
  callDuration: string;
  incoming: number;
  incomingDuration: string;
  outgoing: number;
  outgoingDuration: string;
  missed: number;
  rejected: number;
  neverAttended: number;
  notPickupByClient: number;
  uniqueClients: number;
  workingHours: string;
  connectedCalls: number;
}

export default function CallCenterDashboardView({
  onNavigateTab,
  totalAccountsCount = 1,
  totalContactsCount = 0,
}: CallCenterDashboardViewProps) {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Exact reference data from Callyzer telemarketing dashboard
  const periodsData: PeriodMetrics[] = [
    {
      periodName: 'Today',
      periodDate: '16 Oct 2026',
      totalCalls: 30,
      callDuration: '0h 14m 43s',
      incoming: 2,
      incomingDuration: '0h 8m 56s',
      outgoing: 16,
      outgoingDuration: '0h 5m 47s',
      missed: 12,
      rejected: 0,
      neverAttended: 2,
      notPickupByClient: 6,
      uniqueClients: 17,
      workingHours: '0h 43m 9s',
      connectedCalls: 11,
    },
    {
      periodName: 'Yesterday',
      periodDate: '15 Oct 2026',
      totalCalls: 835,
      callDuration: '12h 43m 45s',
      incoming: 139,
      incomingDuration: '4h 54m 41s',
      outgoing: 614,
      outgoingDuration: '7h 49m 4s',
      missed: 71,
      rejected: 11,
      neverAttended: 8,
      notPickupByClient: 246,
      uniqueClients: 579,
      workingHours: '27h 13m 16s',
      connectedCalls: 449,
    },
    {
      periodName: 'Last Week',
      periodDate: '05 to 11 Oct 2026',
      totalCalls: 4628,
      callDuration: '61h 39m 14s',
      incoming: 720,
      incomingDuration: '27h 30m 34s',
      outgoing: 3427,
      outgoingDuration: '34h 8m 40s',
      missed: 465,
      rejected: 16,
      neverAttended: 43,
      notPickupByClient: 768,
      uniqueClients: 1844,
      workingHours: '147h 16m 22s',
      connectedCalls: 2381,
    },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleNavClick = (tabId: string) => {
    if (onNavigateTab) {
      onNavigateTab(tabId);
    }
  };

  return (
    <div style={styles.dashboardContainer}>
      {/* ── Dashboard Quick Toolbar ────────────────────────────────────────── */}
      <div style={styles.toolbarRow}>
        <div style={styles.toolbarLeft}>
          <span style={styles.breadcrumbTitle}>Call Analytics Dashboard</span>
          <span style={styles.breadcrumbSep}>/</span>
          <span style={styles.breadcrumbSub}>Live Telemarketing Overview</span>
        </div>

        <div style={styles.toolbarRight}>
          <button
            onClick={handleRefresh}
            style={styles.refreshBtn}
            disabled={isRefreshing}
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {/* ── 3-COLUMN PERIOD GRID (Today, Yesterday, Last Week) ─────────────── */}
      <div style={styles.threeColumnGrid}>
        {periodsData.map((period, colIdx) => (
          <div key={colIdx} style={styles.periodCard}>
            {/* Period Header */}
            <div style={styles.periodHeader}>
              <h2 style={styles.periodTitle}>{period.periodName}</h2>
              <span style={styles.periodDate}>{period.periodDate}</span>
            </div>

            {/* 2-Column Metrics Grid (7 Rows Matching Reference Image) */}
            <div style={styles.metricGrid}>
              {/* Row 1: Total Calls | Call Duration */}
              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.totalCalls.toLocaleString()}</div>
                <div style={styles.metricLabelMuted}>
                  <Phone size={13} color="#9ca3af" />
                  <span>Total Calls</span>
                </div>
              </div>

              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.callDuration}</div>
                <div style={styles.metricLabelMuted}>
                  <Clock size={13} color="#9ca3af" />
                  <span>Call Duration</span>
                </div>
              </div>

              {/* Row 2: Incoming (Green) | Incoming Duration (Green) */}
              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.incoming.toLocaleString()}</div>
                <div style={styles.metricLabelGreen}>
                  <ArrowDown size={14} color="#10b981" />
                  <span>Incoming</span>
                </div>
              </div>

              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.incomingDuration}</div>
                <div style={styles.metricLabelGreen}>
                  <ArrowDown size={14} color="#10b981" />
                  <span>Incoming Duration</span>
                </div>
              </div>

              {/* Row 3: Outgoing (Orange) | Outgoing Duration (Orange) */}
              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.outgoing.toLocaleString()}</div>
                <div style={styles.metricLabelOrange}>
                  <ArrowUp size={14} color="#f59e0b" />
                  <span>Outgoing</span>
                </div>
              </div>

              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.outgoingDuration}</div>
                <div style={styles.metricLabelOrange}>
                  <ArrowUp size={14} color="#f59e0b" />
                  <span>Outgoing Duration</span>
                </div>
              </div>

              {/* Row 4: Missed (Red) | Rejected (Red) */}
              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.missed.toLocaleString()}</div>
                <div style={styles.metricLabelRed}>
                  <CornerDownLeft size={13} color="#ef4444" />
                  <span>Missed</span>
                </div>
              </div>

              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.rejected.toLocaleString()}</div>
                <div style={styles.metricLabelRed}>
                  <Slash size={13} color="#ef4444" />
                  <span>Rejected</span>
                </div>
              </div>

              {/* Row 5: Never Attended (Red) | Not Pickup by Client (Red) */}
              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.neverAttended.toLocaleString()}</div>
                <div style={styles.metricLabelRed}>
                  <XCircle size={13} color="#ef4444" />
                  <span>Never Attended</span>
                </div>
              </div>

              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.notPickupByClient.toLocaleString()}</div>
                <div style={styles.metricLabelRed}>
                  <PhoneOff size={13} color="#ef4444" />
                  <span>Not Pickup by Client</span>
                </div>
              </div>

              {/* Row 6: Unique Clients (Gray) | Working Hours (Gray) */}
              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.uniqueClients.toLocaleString()}</div>
                <div style={styles.metricLabelMuted}>
                  <Users size={13} color="#9ca3af" />
                  <span>Unique Clients</span>
                </div>
              </div>

              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.workingHours}</div>
                <div style={styles.metricLabelMuted}>
                  <Clock size={13} color="#9ca3af" />
                  <span>Working Hours</span>
                </div>
              </div>

              {/* Row 7: Connected Calls (Gray) | Drilldown Action Slot */}
              <div style={styles.metricTile}>
                <div style={styles.metricValueLarge}>{period.connectedCalls.toLocaleString()}</div>
                <div style={styles.metricLabelMuted}>
                  <Phone size={13} color="#9ca3af" />
                  <span>Connected Calls</span>
                </div>
              </div>

              <div style={{ ...styles.metricTile, ...styles.metricTileAction }}>
                <button
                  onClick={() => handleNavClick('analytics')}
                  style={styles.drilldownBtn}
                  title={`View detailed call logs for ${period.periodName}`}
                >
                  <span>View Details</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Quick Launch Fleet Status Strip ─────────────────────────── */}
      <div style={styles.bottomStatusStrip}>
        <div style={styles.statusPill}>
          <span style={styles.pulseGreenDot} />
          <span>Active Channels: <strong>{totalAccountsCount} Online</strong></span>
        </div>
        <div style={styles.statusPill}>
          <UserCheck size={14} color="#10b981" />
          <span>Synced Client Directory: <strong>{totalContactsCount.toLocaleString()} Contacts</strong></span>
        </div>
        <div style={styles.statusPill}>
          <CheckCircle2 size={14} color="#10b981" />
          <span>Multi-Device Gateway: <strong>100% Up</strong></span>
        </div>
      </div>
    </div>
  );
}

// ── INLINE STYLES MATCHING THE REFERENCE DESIGN EXACTLY ──────────────────────
const styles: Record<string, React.CSSProperties> = {
  dashboardContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    padding: '20px 24px',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    backgroundColor: '#f0f2f5',
    boxSizing: 'border-box',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  toolbarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    flexShrink: 0,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1f2937',
  },
  breadcrumbSep: {
    color: '#9ca3af',
    fontSize: 13,
  },
  breadcrumbSub: {
    fontSize: 13,
    color: '#6b7280',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  threeColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 18,
    alignItems: 'stretch',
    flexShrink: 0,
  },
  periodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  periodHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    padding: '12px 16px',
    borderBottom: '1px solid #f3f4f6',
    backgroundColor: '#fafbfc',
  },
  periodTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
  },
  periodDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 400,
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1px',
    backgroundColor: '#f3f4f6',
    flex: 1,
  },
  metricTile: {
    backgroundColor: '#ffffff',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 58,
  },
  metricTileAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValueLarge: {
    fontSize: 17,
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.2,
    marginBottom: 4,
    letterSpacing: '-0.3px',
  },
  metricLabelMuted: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11.5,
    fontWeight: 500,
    color: '#6b7280',
  },
  metricLabelGreen: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11.5,
    fontWeight: 600,
    color: '#10b981',
  },
  metricLabelOrange: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11.5,
    fontWeight: 600,
    color: '#f59e0b',
  },
  metricLabelRed: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11.5,
    fontWeight: 600,
    color: '#ef4444',
  },
  drilldownBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 5,
    padding: '6px 12px',
    fontSize: 11.5,
    fontWeight: 600,
    color: '#4b5563',
    cursor: 'pointer',
    width: '100%',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
  },
  bottomStatusStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 12,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 12,
    color: '#374151',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
  },
  pulseGreenDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
  },
};
