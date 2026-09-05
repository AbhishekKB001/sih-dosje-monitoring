import { useMemo, useState } from 'react';
import { Search, VideoOff, Video as VideoIcon } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import * as api from '../services/api';
import { Panel, LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { DotStatus } from '../components/ui/Badges';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function CCTV() {
  const { data, isLoading, error, reload } = useAsyncData(api.getCameras);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (c) =>
        !query ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.institute.toLowerCase().includes(query.toLowerCase())
    );
  }, [data, query]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center gap-2 rounded-md border border-hairline bg-paper px-3 py-2 md:w-96">
          <Search size={14} className="text-slate-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cameras or institutes…"
            className="w-full bg-transparent text-[13px] text-slate placeholder:text-slate-faint focus:outline-none"
          />
        </div>
      </Panel>

      {isLoading ? (
        <LoadingState label="Loading camera feeds…" />
      ) : filtered.length === 0 ? (
        <EmptyState label="No cameras match your search." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cam) => (
            <div key={cam.id} className="overflow-hidden rounded-lg border border-hairline bg-panel shadow-panel">
              <div className="flex aspect-video items-center justify-center bg-ink/95">
                {cam.status === 'offline' ? (
                  <div className="flex flex-col items-center gap-1.5 text-white/40">
                    <VideoOff size={22} strokeWidth={1.5} />
                    <span className="text-[11px]">Feed unavailable</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-white/30">
                    <VideoIcon size={22} strokeWidth={1.5} />
                    <span className="text-[11px]">Live feed integration point — Member 3</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-slate">{cam.name}</p>
                  <DotStatus status={cam.status} />
                </div>
                <p className="mt-0.5 text-[12px] text-slate-soft">{cam.institute}</p>
                <p className="mt-1 text-[11px] text-slate-faint">Last active {formatDateTime(cam.lastActiveAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
