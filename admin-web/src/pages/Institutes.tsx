import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { RiskBadge, DotStatus } from '../components/ui/Badges';

function formatDate(iso: string | null) {
  if (!iso) return 'Never inspected';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Institutes() {
  const { data, isLoading, error, reload } = useAsyncData(api.getInstitutes);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (i) =>
        !query ||
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.district.toLowerCase().includes(query.toLowerCase()) ||
        i.ngo.toLowerCase().includes(query.toLowerCase())
    );
  }, [data, query]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <Panel>
      <div className="mb-4 flex items-center gap-2 rounded-md border border-hairline bg-paper px-3 py-2 md:w-96">
        <Search size={14} className="text-slate-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search institutes, district, or NGO…"
          className="w-full bg-transparent text-[13px] text-slate placeholder:text-slate-faint focus:outline-none"
        />
      </div>

      {isLoading ? (
        <LoadingState label="Loading institutes…" />
      ) : filtered.length === 0 ? (
        <EmptyState label="No institutes match your search." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((inst) => (
            <div key={inst.id} className="rounded-md border border-hairline p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-[13.5px] font-medium leading-snug text-slate">{inst.name}</p>
                <RiskBadge level={inst.riskLevel} />
              </div>
              <p className="text-[12px] text-slate-soft">{inst.district} · {inst.ngo}</p>
              <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-[12px] text-slate-soft">
                <span>Staff</span>
                <span className="text-right text-slate">{inst.staffCount}</span>
                <span>Beneficiaries</span>
                <span className="text-right text-slate">{inst.beneficiaries}</span>
                <span>CCTV</span>
                <span className="text-right"><DotStatus status={inst.cctvStatus} /></span>
                <span>Last inspection</span>
                <span className="text-right text-slate">{formatDate(inst.lastInspection)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
