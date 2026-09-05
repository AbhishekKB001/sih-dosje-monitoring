import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState } from '../components/ui/States';
import type { RiskLevel } from '../types';

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#3F7A54',
  medium: '#C08A2E',
  high: '#B23A34',
};

export default function LiveMap() {
  const institutes = useAsyncData(api.getInstitutes);
  const [district, setDistrict] = useState('all');
  const [risk, setRisk] = useState<RiskLevel | 'all'>('all');

  const districts = useMemo(
    () => Array.from(new Set((institutes.data ?? []).map((i) => i.district))).sort(),
    [institutes.data]
  );

  const filtered = useMemo(() => {
    if (!institutes.data) return [];
    return institutes.data.filter((i) => {
      const matchesDistrict = district === 'all' || i.district === district;
      const matchesRisk = risk === 'all' || i.riskLevel === risk;
      return matchesDistrict && matchesRisk;
    });
  }, [institutes.data, district, risk]);

  if (institutes.error) return <ErrorState message={institutes.error} onRetry={institutes.reload} />;

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
        <div className="flex items-center gap-4 text-[12px] text-slate-soft">
          {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
            <span key={r} className="flex items-center gap-1.5 capitalize">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_COLORS[r] }} />
              {r}
            </span>
          ))}
        </div>
      </div>

      {institutes.isLoading ? (
        <LoadingState label="Loading map data…" />
      ) : (
        <div className="h-[560px] overflow-hidden rounded-md border border-hairline">
          <MapContainer center={[15.3, 76.0]} zoom={7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((inst) => (
              <CircleMarker
                key={inst.id}
                center={[inst.lat, inst.lng]}
                radius={7}
                pathOptions={{
                  color: RISK_COLORS[inst.riskLevel],
                  fillColor: RISK_COLORS[inst.riskLevel],
                  fillOpacity: 0.75,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="text-[12.5px]">
                    <p className="font-medium">{inst.name}</p>
                    <p className="text-slate-soft">{inst.district}</p>
                    <p className="mt-1 capitalize">Risk: {inst.riskLevel}</p>
                    <p className="capitalize">CCTV: {inst.cctvStatus.replace('_', ' ')}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}
    </Panel>
  );
}
