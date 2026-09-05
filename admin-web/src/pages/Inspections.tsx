import { useMemo, useState } from 'react';
import { Search, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { RiskBadge, StatusBadge } from '../components/ui/Badges';
import type { InspectionStatus } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function riskOf(score: number) {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}

const STATUS_TABS: (InspectionStatus | 'all')[] = [
  'all',
  'assigned',
  'in_progress',
  'completed',
  'flagged',
  'under_review',
];

export default function Inspections() {
  const { data, isLoading, error, reload } = useAsyncData(api.getInspections);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<InspectionStatus | 'all'>('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((i) => {
      const matchesQuery =
        !query ||
        i.projectName.toLowerCase().includes(query.toLowerCase()) ||
        i.inspector.toLowerCase().includes(query.toLowerCase()) ||
        i.district.toLowerCase().includes(query.toLowerCase());
      const matchesTab = tab === 'all' || i.status === tab;
      return matchesQuery && matchesTab;
    });
  }, [data, query, tab]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md bg-paper p-1">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`rounded px-3 py-1.5 text-[12px] font-medium capitalize transition-colors ${
                tab === s ? 'bg-panel text-ink shadow-panel' : 'text-slate-soft hover:text-ink'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-hairline bg-paper px-3 py-2 md:w-72">
          <Search size={14} className="text-slate-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search inspections…"
            className="w-full bg-transparent text-[13px] text-slate placeholder:text-slate-faint focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading inspections…" />
      ) : filtered.length === 0 ? (
        <EmptyState label="No inspections match your filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-hairline text-[11.5px] uppercase tracking-wide text-slate-faint">
                <th className="pb-2 pr-4 font-medium">ID</th>
                <th className="pb-2 pr-4 font-medium">Institute</th>
                <th className="pb-2 pr-4 font-medium">Inspector</th>
                <th className="pb-2 pr-4 font-medium">Assigned</th>
                <th className="pb-2 pr-4 font-medium">GPS</th>
                <th className="pb-2 pr-4 font-medium">Evidence</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((insp) => (
                <tr key={insp.id} className="border-b border-hairline/60 last:border-0 hover:bg-paper/60">
                  <td className="py-2.5 pr-4 text-slate-faint">{insp.id}</td>
                  <td className="py-2.5 pr-4 font-medium text-slate">{insp.projectName}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{insp.inspector}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{formatDate(insp.assignedDate)}</td>
                  <td className="py-2.5 pr-4">
                    {insp.gpsVerified ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-verified">
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] text-slate-faint">
                        <XCircle size={13} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-soft capitalize">{insp.evidenceStatus}</td>
                  <td className="py-2.5 pr-4"><StatusBadge status={insp.status} /></td>
                  <td className="py-2.5"><RiskBadge level={riskOf(insp.riskScore)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-slate-faint">
          <MapPin size={12} /> GPS and evidence data will populate from Member 4's field-operations module.
        </p>
      )}
    </Panel>
  );
}
