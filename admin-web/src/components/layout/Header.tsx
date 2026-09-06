import { useState } from 'react';
import { Search, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Real-time monitoring overview' },
  '/projects': { title: 'Project Management', subtitle: 'All projects under DoSJE schemes' },
  '/institutes': { title: 'Institute Management', subtitle: 'Registered institutes and facilities' },
  '/inspections': { title: 'Inspection Monitoring', subtitle: 'Assigned and completed inspections' },
  '/live-map': { title: 'Live Map', subtitle: 'Geo-distribution of institutes and inspections' },
  '/cctv': { title: 'CCTV Monitoring', subtitle: 'Camera feed status across institutes' },
  '/alerts': { title: 'Alerts', subtitle: 'System-generated anomalies and flags' },
  '/reports': { title: 'Reports', subtitle: 'Submitted inspection reports' },
  '/analytics': { title: 'Analytics', subtitle: 'Performance across districts and projects' },
  '/users': { title: 'User Management', subtitle: 'Officials, inspectors, and access roles' },
  '/audit-logs': { title: 'Audit Logs', subtitle: 'Who did what, when, and where' },
};

export default function Header({ path }: { path: string }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = PAGE_TITLES[path] ?? { title: 'DoSJE Admin Dashboard', subtitle: '' };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-panel px-6">
      <div>
        <h1 className="font-serif text-[17px] font-semibold text-ink">{meta.title}</h1>
        <p className="text-[12px] text-slate-soft">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-md border border-hairline bg-paper px-3 py-1.5 text-slate-faint md:flex">
          <Search size={14} />
          <input
            placeholder="Search projects, institutes, inspectors…"
            className="w-64 bg-transparent text-[13px] text-slate placeholder:text-slate-faint focus:outline-none"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-paper"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'DA'}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-[13px] font-medium text-ink">{user?.name ?? 'Admin'}</p>
              <p className="text-[11px] capitalize text-slate-faint">
                {user?.role?.replace('_', ' ') ?? ''}
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-faint" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-48 rounded-md border border-hairline bg-panel py-1 shadow-panel">
              <button
                onClick={() => logout()}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-alert hover:bg-alert-bg"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
