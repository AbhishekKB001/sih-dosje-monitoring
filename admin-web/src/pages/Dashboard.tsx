import {
  FolderKanban,
  Building2,
  ClipboardCheck,
  ClipboardCheck as CompletedIcon,
  Video,
  BellRing,
  AlertOctagon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { StatCard, Panel, LoadingState, ErrorState } from '../components/ui/States';
import { RiskBadge, StatusBadge, SeverityBadge } from '../components/ui/Badges';
import { Link } from 'react-router-dom';

const RISK_COLORS: Record<string, string> = {
  low: '#3F7A54',
  medium: '#C08A2E',
  high: '#B23A34',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function Dashboard() {
  const stats = useAsyncData(api.getDashboardStats);
  const trend = useAsyncData(api.getInspectionTrend);
  const risk = useAsyncData(api.getRiskDistribution);
  const inspections = useAsyncData(api.getInspections);
  const alerts = useAsyncData(api.getAlerts);

  if (stats.error) return <ErrorState message={stats.error} onRetry={stats.reload} />;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      {stats.isLoading || !stats.data ? (
        <LoadingState label="Loading overview statistics…" />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
          <StatCard label="Total Projects" value={stats.data.totalProjects} icon={FolderKanban} />
          <StatCard label="Active Institutes" value={stats.data.activeInstitutes} icon={Building2} />
          <StatCard label="Pending Inspections" value={stats.data.pendingInspections} icon={ClipboardCheck} tone="watch" />
          <StatCard label="Completed Inspections" value={stats.data.completedInspections} icon={CompletedIcon} tone="verified" />
          <StatCard label="Active Cameras" value={stats.data.activeCameras} icon={Video} />
          <StatCard label="Open Alerts" value={stats.data.openAlerts} icon={BellRing} tone="watch" />
          <StatCard label="High-Risk Projects" value={stats.data.highRiskProjects} icon={AlertOctagon} tone="alert" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Inspection trend */}
        <Panel title="Inspection Trend" className="xl:col-span-2">
          {trend.isLoading || !trend.data ? (
            <LoadingState />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trend.data} margin={{ left: -20, top: 5, right: 10 }}>
                <defs>
                  <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B4732E" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#B4732E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="flaggedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B23A34" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#B23A34" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E1DFD6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5B6270' }} axisLine={{ stroke: '#E1DFD6' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#5B6270' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, borderColor: '#E1DFD6', fontSize: 12.5 }}
                  labelStyle={{ color: '#14213D', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#B4732E" fill="url(#completedFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="flagged" name="Flagged" stroke="#B23A34" fill="url(#flaggedFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Risk distribution */}
        <Panel title="Risk Distribution">
          {risk.isLoading || !risk.data ? (
            <LoadingState />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={risk.data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {risk.data.map((entry) => (
                    <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E1DFD6', fontSize: 12.5 }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-[12px] capitalize text-slate">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Recent inspections */}
        <Panel
          title="Recent Inspections"
          className="xl:col-span-2"
          action={
            <Link to="/inspections" className="text-[12.5px] font-medium text-ochre hover:underline">
              View all
            </Link>
          }
        >
          {inspections.isLoading || !inspections.data ? (
            <LoadingState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-hairline text-[11.5px] uppercase tracking-wide text-slate-faint">
                    <th className="pb-2 pr-3 font-medium">Institute</th>
                    <th className="pb-2 pr-3 font-medium">Inspector</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.data.slice(0, 6).map((insp) => (
                    <tr key={insp.id} className="border-b border-hairline/60 last:border-0">
                      <td className="py-2.5 pr-3 text-slate">{insp.projectName}</td>
                      <td className="py-2.5 pr-3 text-slate-soft">{insp.inspector}</td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge status={insp.status} />
                      </td>
                      <td className="py-2.5">
                        <RiskBadge
                          level={insp.riskScore >= 70 ? 'high' : insp.riskScore >= 40 ? 'medium' : 'low'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Recent alerts */}
        <Panel
          title="Recent Alerts"
          action={
            <Link to="/alerts" className="text-[12.5px] font-medium text-ochre hover:underline">
              View all
            </Link>
          }
        >
          {alerts.isLoading || !alerts.data ? (
            <LoadingState />
          ) : (
            <div className="space-y-3">
              {alerts.data.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start justify-between gap-3 border-b border-hairline/60 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-[12.5px] font-medium text-slate">{alert.project}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-slate-soft">{alert.description}</p>
                    <p className="mt-1 text-[11px] text-slate-faint">{formatDate(alert.time)} · {alert.district}</p>
                  </div>
                  <SeverityBadge severity={alert.severity} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
