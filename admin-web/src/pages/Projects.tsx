import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { RiskBadge, StatusBadge } from '../components/ui/Badges';
import type { RiskLevel } from '../types';

export default function Projects() {
  const { data, isLoading, error, reload } = useAsyncData(api.getProjects);
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('all');
  const [risk, setRisk] = useState<RiskLevel | 'all'>('all');

  const districts = useMemo(
    () => Array.from(new Set((data ?? []).map((p) => p.district))).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => {
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.institute.toLowerCase().includes(query.toLowerCase()) ||
        p.ngo.toLowerCase().includes(query.toLowerCase());
      const matchesDistrict = district === 'all' || p.district === district;
      const matchesRisk = risk === 'all' || p.riskLevel === risk;
      return matchesQuery && matchesDistrict && matchesRisk;
    });
  }, [data, query, district, risk]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-md border border-hairline bg-paper px-3 py-2">
          <Search size={14} className="text-slate-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, institutes, or NGOs…"
            className="w-full bg-transparent text-[13px] text-slate placeholder:text-slate-faint focus:outline-none"
          />
        </div>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="rounded-md border border-hairline bg-panel px-3 py-2 text-[13px] text-slate"
        >
          <option value="all">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value as RiskLevel | 'all')}
          className="rounded-md border border-hairline bg-panel px-3 py-2 text-[13px] text-slate"
        >
          <option value="all">All risk levels</option>
          <option value="low">Low risk</option>
          <option value="medium">Medium risk</option>
          <option value="high">High risk</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading projects…" />
      ) : filtered.length === 0 ? (
        <EmptyState label="No projects match your filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-hairline text-[11.5px] uppercase tracking-wide text-slate-faint">
                <th className="pb-2 pr-4 font-medium">Project</th>
                <th className="pb-2 pr-4 font-medium">Institute</th>
                <th className="pb-2 pr-4 font-medium">NGO</th>
                <th className="pb-2 pr-4 font-medium">District</th>
                <th className="pb-2 pr-4 font-medium">Beneficiaries</th>
                <th className="pb-2 pr-4 font-medium">Inspection</th>
                <th className="pb-2 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-hairline/60 last:border-0 hover:bg-paper/60">
                  <td className="py-2.5 pr-4 font-medium text-slate">{p.name}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{p.institute}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{p.ngo}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{p.district}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{p.beneficiaries}</td>
                  <td className="py-2.5 pr-4"><StatusBadge status={p.inspectionStatus} /></td>
                  <td className="py-2.5"><RiskBadge level={p.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
