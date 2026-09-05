import { useMemo, useState } from 'react';
import { Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState, EmptyState } from '../components/ui/States';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const RESULT_ICON = {
  success: <CheckCircle2 size={13} className="text-verified" />,
  failure: <XCircle size={13} className="text-alert" />,
  pending: <Clock size={13} className="text-watch" />,
};

export default function AuditLogs() {
  const { data, isLoading, error, reload } = useAsyncData(api.getAuditLogs);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .filter(
        (log) =>
          !query ||
          log.user.toLowerCase().includes(query.toLowerCase()) ||
          log.entity.toLowerCase().includes(query.toLowerCase()) ||
          log.action.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [data, query]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <Panel>
      <div className="mb-4 flex items-center gap-2 rounded-md border border-hairline bg-paper px-3 py-2 md:w-96">
        <Search size={14} className="text-slate-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by user, action, or entity…"
          className="w-full bg-transparent text-[13px] text-slate placeholder:text-slate-faint focus:outline-none"
        />
      </div>

      {isLoading ? (
        <LoadingState label="Loading audit trail…" />
      ) : filtered.length === 0 ? (
        <EmptyState label="No audit entries match your search." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-hairline text-[11.5px] uppercase tracking-wide text-slate-faint">
                <th className="pb-2 pr-4 font-medium">User</th>
                <th className="pb-2 pr-4 font-medium">Action</th>
                <th className="pb-2 pr-4 font-medium">Entity</th>
                <th className="pb-2 pr-4 font-medium">Location</th>
                <th className="pb-2 pr-4 font-medium">Timestamp</th>
                <th className="pb-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-hairline/60 last:border-0 hover:bg-paper/60">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-slate">{log.user}</p>
                    <p className="text-[11px] capitalize text-slate-faint">{log.role.replace('_', ' ')}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-soft">{log.action}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{log.entity}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{log.location ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{formatDateTime(log.timestamp)}</td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 capitalize text-slate-soft">
                      {RESULT_ICON[log.result]} {log.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
