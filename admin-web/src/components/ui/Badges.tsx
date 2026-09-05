import clsx from 'clsx';
import type { RiskLevel, InspectionStatus, AlertSeverity } from '../../types';

export function RiskBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    low: 'bg-verified-bg text-verified',
    medium: 'bg-watch-bg text-watch',
    high: 'bg-alert-bg text-alert',
  };
  const labels: Record<RiskLevel, string> = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' };
  return (
    <span className={clsx('inline-flex items-center rounded px-2 py-0.5 text-[11.5px] font-medium', styles[level])}>
      {labels[level]}
    </span>
  );
}

export function StatusBadge({ status }: { status: InspectionStatus }) {
  const styles: Record<InspectionStatus, string> = {
    assigned: 'bg-paper text-slate-soft border border-hairline',
    in_progress: 'bg-watch-bg text-watch',
    completed: 'bg-verified-bg text-verified',
    flagged: 'bg-alert-bg text-alert',
    under_review: 'bg-ink/5 text-ink',
  };
  const labels: Record<InspectionStatus, string> = {
    assigned: 'Assigned',
    in_progress: 'In progress',
    completed: 'Completed',
    flagged: 'Flagged',
    under_review: 'Under review',
  };
  return (
    <span className={clsx('inline-flex items-center rounded px-2 py-0.5 text-[11.5px] font-medium', styles[status])}>
      {labels[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const styles: Record<AlertSeverity, string> = {
    low: 'bg-paper text-slate-soft border border-hairline',
    medium: 'bg-watch-bg text-watch',
    high: 'bg-alert-bg text-alert',
    critical: 'bg-alert text-white',
  };
  const labels: Record<AlertSeverity, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };
  return (
    <span className={clsx('inline-flex items-center rounded px-2 py-0.5 text-[11.5px] font-medium', styles[severity])}>
      {labels[severity]}
    </span>
  );
}

export function DotStatus({ status }: { status: 'online' | 'offline' | 'partial' | 'degraded' | 'not_installed' }) {
  const styles: Record<typeof status, string> = {
    online: 'bg-verified',
    offline: 'bg-alert',
    partial: 'bg-watch',
    degraded: 'bg-watch',
    not_installed: 'bg-slate-faint',
  };
  const labels: Record<typeof status, string> = {
    online: 'Online',
    offline: 'Offline',
    partial: 'Partial',
    degraded: 'Degraded',
    not_installed: 'Not installed',
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate">
      <span className={clsx('h-1.5 w-1.5 rounded-full', styles[status])} />
      {labels[status]}
    </span>
  );
}
