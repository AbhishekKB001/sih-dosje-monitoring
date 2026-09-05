import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Building2,
  ClipboardCheck,
  Map,
  Video,
  BellRing,
  FileText,
  BarChart3,
  Users,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Management',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/institutes', label: 'Institutes', icon: Building2 },
      { to: '/users', label: 'Users', icon: Users },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
      { to: '/live-map', label: 'Live Map', icon: Map },
      { to: '/cctv', label: 'CCTV', icon: Video },
      { to: '/alerts', label: 'Alerts', icon: BellRing },
    ],
  },
  {
    label: 'Governance',
    items: [
      { to: '/reports', label: 'Reports', icon: FileText },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-ink text-white/90">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-ochre text-white">
          <ShieldCheck size={18} />
        </div>
        <div className="leading-tight">
          <p className="font-serif text-[15px] font-semibold text-white">DoSJE Admin</p>
          <p className="text-[11px] text-white/50">Monitoring &amp; Inspection Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-2 text-[11px] font-medium text-white/40">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] transition-colors',
                      isActive
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  <item.icon size={16} strokeWidth={1.8} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-white/40">
        SIH 2026 · PS 26095
      </div>
    </aside>
  );
}
