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
            <div key={alert.id} className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-slate">{TYPE_LABELS[alert.type]}</p>
                  <SeverityBadge severity={alert.severity} />
                  {alert.status !== 'open' && (
                    <span className="rounded bg-paper px-2 py-0.5 text-[11px] capitalize text-slate-soft">
                      {alert.status}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-slate-soft">{alert.description}</p>
                <p className="mt-1.5 text-[11px] text-slate-faint">
                  {alert.project} · {alert.district} · {formatDateTime(alert.time)}
                </p>
              </div>
              {alert.status === 'open' && (
                <button
                  onClick={() => acknowledge(alert.id)}
                  disabled={updating === alert.id}
                  className="shrink-0 rounded-md border border-hairline px-3 py-1.5 text-[12px] font-medium text-slate hover:bg-paper disabled:opacity-50"
                >
                  {updating === alert.id ? 'Updating…' : 'Acknowledge'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
