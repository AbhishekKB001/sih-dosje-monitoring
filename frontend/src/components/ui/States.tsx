import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Inbox } from 'lucide-react';
import clsx from 'clsx';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'default' | 'alert' | 'watch' | 'verified';
}) {
  const toneStyles: Record<string, string> = {
    default: 'text-ink bg-paper',
    alert: 'text-alert bg-alert-bg',
    watch: 'text-watch bg-watch-bg',
    verified: 'text-verified bg-verified-bg',
  };
  return (
    <div className="rounded-lg border border-hairline bg-panel p-4 shadow-panel">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-soft">{label}</p>
        <div className={clsx('flex h-7 w-7 items-center justify-center rounded', toneStyles[tone])}>
          <Icon size={14} />
        </div>
      </div>
      <p className="mt-2 font-serif text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('rounded-lg border border-hairline bg-panel shadow-panel', className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="font-serif text-[14.5px] font-semibold text-ink">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-faint">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-hairline border-t-ochre" />
      <p className="text-[13px]">{label}</p>
    </div>
  );
}

export function EmptyState({ label = 'Nothing to show here yet.' }: { label?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-faint">
      <Inbox size={22} strokeWidth={1.5} />
      <p className="text-[13px]">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-alert">
      <AlertTriangle size={22} strokeWidth={1.5} />
      <p className="text-[13px]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-md border border-alert/30 px-3 py-1 text-[12px] text-alert hover:bg-alert-bg"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 font-serif text-[15px] font-semibold text-ink">{children}</h3>;
}
