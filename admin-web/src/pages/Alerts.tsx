import { useMemo, useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { SeverityBadge } from '../components/ui/Badges';
import type { AlertSeverity, AlertItem } from '../types';

const TYPE_LABELS: Record<AlertItem['type'], string> = {
  attendance_anomaly: 'Attendance anomaly',
  cctv_offline: 'CCTV offline',
  inspection_anomaly: 'Inspection anomaly',
  high_risk_project: 'High-risk project',
  missing_report: 'Missing report',
  gps_issue: 'GPS issue',
  follow_up_required: 'Follow-up required',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Alerts() {
  const { data, isLoading, error, reload } = useAsyncData(api.getAlerts);
  const [severity, setSeverity] = useState<AlertSeverity | 'all'>('all');
  const [status, setStatus] = useState<AlertItem['status'] | 'all'>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, AlertItem['status']>>({});

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [raisingId, setRaisingId] = useState<string | null>(null);
  const [raiseMessage, setRaiseMessage] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .map((a) => ({ ...a, status: localStatuses[a.id] ?? a.status }))
      .filter((a) => {
        const matchesSeverity = severity === 'all' || a.severity === severity;
        const matchesStatus = status === 'all' || a.status === status;
        return matchesSeverity && matchesStatus;
      });
  }, [data, severity, status, localStatuses]);

  async function acknowledge(id: string) {
    setUpdating(id);
    try {
      await api.updateAlertStatus(id, 'acknowledged');
      setLocalStatuses((s) => ({ ...s, [id]: 'acknowledged' }));
    } finally {
      setUpdating(null);
    }
  }

  async function handleRaiseForInspection(alert: AlertItem) {
    setRaisingId(alert.id);
    try {
      await api.triggerRandomAssignment();
      setRaiseMessage((m) => ({
        ...m,
        [alert.id]: 'Surprise duty raised & allocated to PMU inspector via risk telemetry.',
      }));
      setTimeout(() => {
        setRaiseMessage((m) => {
          const copy = { ...m };
          delete copy[alert.id];
          return copy;
        });
      }, 6000);
    } catch (e: any) {
      setRaiseMessage((m) => ({ ...m, [alert.id]: `Failed to raise: ${e.message}` }));
    } finally {
      setRaisingId(null);
    }
  }

  async function handleResolveSubmit(id: string) {
    setUpdating(id);
    try {
      await api.updateAlertStatus(id, 'resolved', resolveNotes || 'Resolved after administrative review.');
      setLocalStatuses((s) => ({ ...s, [id]: 'resolved' }));
      setResolvingId(null);
      setResolveNotes('');
    } finally {
      setUpdating(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as AlertSeverity | 'all')}
          className="rounded-md border border-hairline bg-panel px-3 py-2 text-[13px] text-slate"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AlertItem['status'] | 'all')}
          className="rounded-md border border-hairline bg-panel px-3 py-2 text-[13px] text-slate"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading alerts…" />
      ) : filtered.length === 0 ? (
        <EmptyState label="No alerts match your filters." />
      ) : (
        <div className="divide-y divide-hairline/70">
          {filtered.map((alert) => (
            <div key={alert.id} className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-slate">{TYPE_LABELS[alert.type]}</p>
                    <SeverityBadge severity={alert.severity} />
                    {alert.status !== 'open' && (
                      <span className={`rounded px-2 py-0.5 text-[11px] capitalize ${
                        alert.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-600 font-medium'
                          : 'bg-paper text-slate-soft'
                      }`}>
                        {alert.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-slate-soft">{alert.description}</p>
                  <p className="mt-1.5 text-[11px] text-slate-faint">
                    {alert.project} · {alert.district} · {formatDateTime(alert.time)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRaiseForInspection(alert)}
                    disabled={raisingId === alert.id}
                    className="rounded-md border border-ochre/40 bg-ochre/10 px-3 py-1.5 text-[12px] font-semibold text-ochre hover:bg-ochre/20 disabled:opacity-50 transition"
                  >
                    {raisingId === alert.id ? 'Allocating…' : 'Raise for Inspection'}
                  </button>

                  {alert.status === 'open' && (
                    <button
                      onClick={() => acknowledge(alert.id)}
                      disabled={updating === alert.id}
                      className="rounded-md border border-hairline px-3 py-1.5 text-[12px] font-medium text-slate hover:bg-paper disabled:opacity-50"
                    >
                      {updating === alert.id ? 'Updating…' : 'Acknowledge'}
                    </button>
                  )}

                  {alert.status !== 'resolved' && (
                    <button
                      onClick={() => {
                        setResolvingId(resolvingId === alert.id ? null : alert.id);
                        setResolveNotes('');
                      }}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-600 hover:bg-emerald-500/20"
                    >
                      {resolvingId === alert.id ? 'Cancel' : 'Resolve'}
                    </button>
                  )}
                </div>
              </div>

              {raiseMessage[alert.id] && (
                <div className="mt-2 rounded-md bg-ochre/10 p-2.5 text-[12px] font-medium text-ochre border border-ochre/20">
                  {raiseMessage[alert.id]}
                </div>
              )}

              {resolvingId === alert.id && (
                <div className="mt-2 rounded-md bg-paper p-3 border border-hairline">
                  <p className="text-[12px] font-medium text-slate mb-1">Official Resolution Audit Note</p>
                  <input
                    type="text"
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Enter compliance action or resolution findings…"
                    className="w-full rounded border border-hairline bg-panel px-2.5 py-1.5 text-[12px] text-slate placeholder:text-slate-faint focus:outline-none"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setResolvingId(null)}
                      className="rounded px-2.5 py-1 text-[11.5px] text-slate-soft hover:text-slate"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleResolveSubmit(alert.id)}
                      disabled={updating === alert.id}
                      className="rounded bg-emerald-600 px-3 py-1 text-[11.5px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updating === alert.id ? 'Submitting…' : 'Confirm Resolution'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
