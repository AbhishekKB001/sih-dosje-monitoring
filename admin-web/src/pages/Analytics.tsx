import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState, StatCard } from '../components/ui/States';
import { TrendingUp, ShieldAlert, Video, ClipboardList } from 'lucide-react';

export default function Analytics() {
  const perf = useAsyncData(api.getDistrictPerformance);
  const reports = useAsyncData(api.getReports);

  if (perf.error) return <ErrorState message={perf.error} onRetry={perf.reload} />;

  const avgCompletion = perf.data
    ? Math.round(perf.data.reduce((s, d) => s + d.completionRate, 0) / perf.data.length)
    : 0;
  const avgUptime = perf.data
    ? Math.round(perf.data.reduce((s, d) => s + d.cctvUptime, 0) / perf.data.length)
    : 0;
  const escalated = reports.data?.filter((r) => r.finalStatus === 'escalated').length ?? 0;
  const majorIssues = reports.data?.filter((r) => r.finalStatus === 'major_issues').length ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Avg. Completion Rate" value={`${avgCompletion}%`} icon={TrendingUp} tone="verified" />
        <StatCard label="Avg. CCTV Uptime" value={`${avgUptime}%`} icon={Video} />
        <StatCard label="Escalated Reports" value={escalated} icon={ShieldAlert} tone="alert" />
        <StatCard label="Major-Issue Reports" value={majorIssues} icon={ClipboardList} tone="watch" />
      </div>

      <Panel title="District-Wise Inspection Completion Rate">
        {perf.isLoading || !perf.data ? (
          <LoadingState />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={perf.data} margin={{ left: -20, top: 5, right: 10 }}>
              <CartesianGrid stroke="#E1DFD6" vertical={false} />
              <XAxis dataKey="district" tick={{ fontSize: 11, fill: '#5B6270' }} axisLine={{ stroke: '#E1DFD6' }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12, fill: '#5B6270' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E1DFD6', fontSize: 12.5 }} />
              <Bar dataKey="completionRate" name="Completion %" fill="#B4732E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="CCTV Uptime by District">
          {perf.isLoading || !perf.data ? (
            <LoadingState />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={perf.data} layout="vertical" margin={{ left: 10, top: 5, right: 20 }}>
                <CartesianGrid stroke="#E1DFD6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#5B6270' }} axisLine={{ stroke: '#E1DFD6' }} tickLine={false} />
                <YAxis type="category" dataKey="district" tick={{ fontSize: 11, fill: '#5B6270' }} width={110} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E1DFD6', fontSize: 12.5 }} />
                <Bar dataKey="cctvUptime" name="Uptime %" fill="#14213D" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Average Risk Score by District">
          {perf.isLoading || !perf.data ? (
            <LoadingState />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={perf.data} layout="vertical" margin={{ left: 10, top: 5, right: 20 }}>
                <CartesianGrid stroke="#E1DFD6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#5B6270' }} axisLine={{ stroke: '#E1DFD6' }} tickLine={false} />
                <YAxis type="category" dataKey="district" tick={{ fontSize: 11, fill: '#5B6270' }} width={110} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E1DFD6', fontSize: 12.5 }} />
                <Bar dataKey="avgRiskScore" name="Avg. risk score" fill="#B23A34" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>
    </div>
  );
}
