import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import type { InspectionReport } from '../types';

const FINAL_STATUS_STYLES: Record<InspectionReport['finalStatus'], string> = {
  compliant: 'bg-verified-bg text-verified',
  minor_issues: 'bg-watch-bg text-watch',
  major_issues: 'bg-alert-bg text-alert',
  escalated: 'bg-alert text-white',
};
const FINAL_STATUS_LABELS: Record<InspectionReport['finalStatus'], string> = {
  compliant: 'Compliant',
  minor_issues: 'Minor issues',
  major_issues: 'Major issues',
  escalated: 'Escalated',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Reports() {
  const { data, isLoading, error, reload } = useAsyncData(api.getReports);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<InspectionReport | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (r) =>
        !query ||
        r.institute.toLowerCase().includes(query.toLowerCase()) ||
        r.inspector.toLowerCase().includes(query.toLowerCase())
    );
  }, [data, query]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel className={selected ? 'xl:col-span-2' : 'xl:col-span-3'}>
        <div className="mb-4 flex items-center gap-2 rounded-md border border-hairline bg-paper px-3 py-2 md:w-96">
          <Search size={14} className="text-slate-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports by institute or inspector…"
            className="w-full bg-transparent text-[13px] text-slate placeholder:text-slate-faint focus:outline-none"
          />
        </div>

        {isLoading ? (
          <LoadingState label="Loading reports…" />
        ) : filtered.length === 0 ? (
          <EmptyState label="No inspection reports submitted yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline text-[11.5px] uppercase tracking-wide text-slate-faint">
                  <th className="pb-2 pr-4 font-medium">Institute</th>
                  <th className="pb-2 pr-4 font-medium">Inspector</th>
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Checklist</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`cursor-pointer border-b border-hairline/60 last:border-0 hover:bg-paper/60 ${
                      selected?.id === r.id ? 'bg-paper' : ''
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-medium text-slate">{r.institute}</td>
                    <td className="py-2.5 pr-4 text-slate-soft">{r.inspector}</td>
                    <td className="py-2.5 pr-4 text-slate-soft">{formatDate(r.timestamp)}</td>
                    <td className="py-2.5 pr-4 text-slate-soft">{r.checklistPassed}/{r.checklistTotal}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11.5px] font-medium ${FINAL_STATUS_STYLES[r.finalStatus]}`}>
                        {FINAL_STATUS_LABELS[r.finalStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selected && (
        <Panel title="Report Detail" action={
          <button onClick={() => setSelected(null)} className="text-slate-faint hover:text-slate">
            <X size={16} />
          </button>
        }>
          <div className="space-y-4 text-[13px]">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-faint">Institute</p>
              <p className="mt-0.5 font-medium text-slate">{selected.institute}</p>
            </div>
            <div className="grid grid-cols-2 gap-y-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-faint">Inspector</p>
                <p className="text-slate">{selected.inspector}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-faint">Date</p>
                <p className="text-slate">{formatDate(selected.timestamp)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-faint">District</p>
                <p className="text-slate">{selected.district}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-faint">Evidence items</p>
                <p className="text-slate">{selected.evidenceCount} files</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-faint">Checklist</p>
              <p className="mt-0.5 text-slate">{selected.checklistPassed} of {selected.checklistTotal} items passed</p>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-faint">AI risk indicators</p>
              {selected.aiRiskIndicators.length === 0 ? (
                <p className="text-slate-soft">No anomalies flagged by the AI review.</p>
              ) : (
                <ul className="space-y-1.5">
                  {selected.aiRiskIndicators.map((indicator, i) => (
                    <li key={i} className="rounded bg-watch-bg px-2.5 py-1.5 text-[12.5px] text-watch">
                      {indicator}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1.5 text-[11px] text-slate-faint">
                These are decision-support indicators, not confirmed findings — final determination rests with the reviewing officer.
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-faint">Recommendation</p>
              <p className="mt-0.5 text-slate">{selected.recommendation}</p>
            </div>
            <div className="flex items-center justify-between border-t border-hairline pt-3">
              <span className="text-[11px] uppercase tracking-wide text-slate-faint">Final status</span>
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11.5px] font-medium ${FINAL_STATUS_STYLES[selected.finalStatus]}`}>
                {FINAL_STATUS_LABELS[selected.finalStatus]}
              </span>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
