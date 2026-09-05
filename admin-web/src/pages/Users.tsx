import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import type { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  district_officer: 'District Officer',
  inspector: 'Inspector',
  project_incharge: 'Project In-charge',
  staff: 'Staff',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-verified-bg text-verified',
  suspended: 'bg-alert-bg text-alert',
  invited: 'bg-watch-bg text-watch',
};

function formatDate(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Users() {
  const { data, isLoading, error, reload } = useAsyncData(api.getAdminUsers);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((u) => {
      const matchesQuery = !query || u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase());
      const matchesRole = role === 'all' || u.role === role;
      return matchesQuery && matchesRole;
    });
  }, [data, query, role]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-md border border-hairline bg-paper px-3 py-2">
          <Search size={14} className="text-slate-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-transparent text-[13px] text-slate placeholder:text-slate-faint focus:outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | 'all')}
          className="rounded-md border border-hairline bg-panel px-3 py-2 text-[13px] text-slate"
        >
          <option value="all">All roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading users…" />
      ) : filtered.length === 0 ? (
        <EmptyState label="No users match your filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-hairline text-[11.5px] uppercase tracking-wide text-slate-faint">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">District</th>
                <th className="pb-2 pr-4 font-medium">Last login</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-hairline/60 last:border-0 hover:bg-paper/60">
                  <td className="py-2.5 pr-4 font-medium text-slate">{u.name}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{u.email}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{ROLE_LABELS[u.role]}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{u.district ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-slate-soft">{formatDate(u.lastLogin)}</td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11.5px] font-medium capitalize ${STATUS_STYLES[u.status]}`}>
                      {u.status}
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
