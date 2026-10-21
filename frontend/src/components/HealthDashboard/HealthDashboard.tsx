import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import {
  Activity, AlertTriangle, CheckCircle2, Server,
  Zap, Database, Radio, RefreshCw,
} from 'lucide-react';
import {
  circuitBreakerApi, queueApi, streamApi,
  orchestrationApi, ContainerInstance, StreamHealth,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getSocket } from '../../services/api';
import { formatIndianTimeWithSec } from '../../utils/indianTime';
import BackButton from '../common/BackButton';

interface MetricCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}

function MetricCard({ label, value, sub, icon, color = 'var(--wa-green)' }: MetricCard) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="card-title">{label}</span>
        <div style={{
          color,
          background: `${color}20`,
          padding: 8,
          borderRadius: 8,
        }}>
          {icon}
        </div>
      </div>
      <div className="card-value" style={{ color }}>{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  );
}

function CBStateRow({ proxyId, state, failures }: {
  proxyId: string; state: string; failures: number;
}) {
  const { addToast } = useToast();

  const handleReset = async () => {
    try {
      await circuitBreakerApi.reset(proxyId);
      addToast('success', `Circuit reset for proxy ${proxyId.slice(0, 8)}`);
    } catch {
      addToast('error', 'Failed to reset circuit');
    }
  };

  return (
    <div className="instance-row">
      <div style={{ flex: 1 }}>
        <div className="instance-name" style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {proxyId.slice(0, 16)}…
        </div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`cb-chip ${state}`}>
            {state === 'CLOSED' ? '🟢' : state === 'OPEN' ? '🔴' : '🟡'} {state}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {failures} failure{failures !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      {state !== 'CLOSED' && (
        <button className="btn btn-sm btn-ghost" onClick={handleReset}>
          Reset
        </button>
      )}
    </div>
  );
}

interface QueueChartData {
  time: string;
  waiting: number;
  active: number;
  delayed: number;
}

export default function HealthDashboard({ tenantId }: { tenantId: string }) {
  const [cbStates, setCbStates] = useState<any[]>([]);
  const [instances, setInstances] = useState<ContainerInstance[]>([]);
  const [streamHealth, setStreamHealth] = useState<StreamHealth | null>(null);
  const [rateLimits, setRateLimits] = useState<Record<string, number>>({});
  const [queueHistory, setQueueHistory] = useState<QueueChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [cb, inst, stream, rates] = await Promise.allSettled([
        circuitBreakerApi.all(),
        orchestrationApi.list(),
        streamApi.health(),
        queueApi.rateLimits(),
      ]);

      if (!isMountedRef.current) return;

      if (cb.status === 'fulfilled') setCbStates(cb.value);
      if (inst.status === 'fulfilled') setInstances(inst.value);
      if (stream.status === 'fulfilled') setStreamHealth(stream.value);
      let currentRates: Record<string, number> = {};
      if (rates.status === 'fulfilled') {
        currentRates = rates.value || {};
        setRateLimits(currentRates);
      }

      // Append to rolling chart history (last 20 ticks)
      setQueueHistory(prev => {
        const now = formatIndianTimeWithSec(new Date());
        const totalWaiting = Object.values(currentRates).reduce((a, b) => a + b, 0);
        const next = [...prev, { time: now, waiting: totalWaiting, active: 0, delayed: 0 }];
        return next.slice(-20);
      });
    } catch {
      // In-component silent fallback during unmount or tab switch
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Listen for circuit breaker alerts from Socket.io
  useEffect(() => {
    const socket = getSocket(tenantId);
    const handleCB = (data: any) => {
      addToast(
        data.state === 'OPEN' ? 'error' : 'warning',
        `Proxy circuit ${data.state} for account ${data.accountId?.slice(0, 8)}`,
      );
      fetchAll();
    };
    socket.on('proxy:circuit-breaker', handleCB);
    return () => { socket.off('proxy:circuit-breaker', handleCB); };
  }, [tenantId, addToast, fetchAll]);

  const healthyInstances = instances.filter(i => i.healthState === 'healthy').length;
  const openCircuits = cbStates.filter(c => c.state === 'OPEN').length;
  const totalAccountsRateLimited = Object.keys(rateLimits).length;

  return (
    <div className="health-pane">
      <div style={{ marginBottom: 14 }}>
        <BackButton label="Back to Previous Page" />
      </div>
      {/* Top metrics grid */}
      <div>
        <div className="section-header">
          <h2 className="section-title">System Overview</h2>
          <button className="btn btn-sm btn-ghost" onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <div className="metrics-grid">
          <MetricCard
            label="Active Instances"
            value={loading ? '—' : `${healthyInstances}/${instances.length}`}
            sub={`${instances.filter(i => i.healCount > 0).length} auto-healed`}
            icon={<Server size={18} />}
            color="var(--wa-green)"
          />
          <MetricCard
            label="Open Circuits"
            value={loading ? '—' : openCircuits}
            sub={openCircuits > 0 ? 'Queues paused' : 'All proxies healthy'}
            icon={<AlertTriangle size={18} />}
            color={openCircuits > 0 ? 'var(--text-danger)' : 'var(--wa-green)'}
          />
          <MetricCard
            label="Stream Lag"
            value={loading ? '—' : streamHealth?.lag ?? 0}
            sub={`${streamHealth?.length ?? 0} in buffer`}
            icon={<Radio size={18} />}
            color={
              (streamHealth?.lag ?? 0) > 1000 ? 'var(--text-danger)' :
              (streamHealth?.lag ?? 0) > 100 ? 'var(--text-warning)' : 'var(--wa-green)'
            }
          />
          <MetricCard
            label="Active Senders"
            value={loading ? '—' : totalAccountsRateLimited}
            sub="Accounts with active rate limits"
            icon={<Zap size={18} />}
            color="var(--text-warning)"
          />
        </div>
      </div>

      {/* Queue activity chart */}
      {queueHistory.length > 2 && (
        <div className="card">
          <div className="card-title">Queue Activity (Last 5 min)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={queueHistory}>
              <defs>
                <linearGradient id="gWaiting" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00a884" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00a884" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                }}
              />
              <Area
                type="monotone"
                dataKey="waiting"
                stroke="#00a884"
                fill="url(#gWaiting)"
                strokeWidth={2}
                name="Rate limited"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Circuit Breaker States */}
      <div>
        <div className="section-header">
          <h2 className="section-title">Circuit Breaker States</h2>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {cbStates.length} proxies
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cbStates.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 16 }}>
              No proxies configured
            </div>
          ) : (
            cbStates.map((cb) => (
              <CBStateRow
                key={cb.proxyId}
                proxyId={cb.proxyId}
                state={cb.state}
                failures={cb.failures ?? 0}
              />
            ))
          )}
        </div>
      </div>

      {/* Container Instances */}
      <div>
        <div className="section-header">
          <h2 className="section-title">Container Instances</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {instances.map(inst => (
            <div key={inst.id} className="instance-row">
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: inst.healthState === 'healthy'
                  ? 'var(--health-healthy)'
                  : inst.healthState === 'unhealthy'
                    ? 'var(--health-critical)'
                    : 'var(--health-unknown)',
              }} />
              <div className="instance-info">
                <div className="instance-name">{inst.phoneNumber}</div>
                <div className="instance-detail">
                  {inst.serviceId.slice(0, 16)}… · {inst.runningReplicas}/{inst.desiredReplicas} replicas · {inst.healCount} heals
                </div>
              </div>
              <div className="status-indicator" style={{
                background: inst.healthState === 'healthy'
                  ? 'rgba(0,168,132,0.15)' : 'rgba(241,92,109,0.15)',
                color: inst.healthState === 'healthy'
                  ? 'var(--health-healthy)' : 'var(--health-critical)',
              }}>
                <span className="pulse-dot" />
                {inst.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
