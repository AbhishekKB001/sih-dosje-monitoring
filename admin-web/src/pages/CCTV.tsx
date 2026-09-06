import { useMemo, useState } from 'react';
import {
  Search,
  VideoOff,
  Video as VideoIcon,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Home,
  Circle,
  Square,
  Sliders,
  Cpu,
  Eye,
} from 'lucide-react';
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
  const [globalViewMode, setGlobalViewMode] = useState<'ai' | 'raw'>('ai');
  const [cameraViewModes, setCameraViewModes] = useState<Record<string, 'ai' | 'raw'>>({});
  const [ptzCoordinates, setPtzCoordinates] = useState<Record<string, { pan: number; tilt: number; zoom: number }>>({});
  const [recordingState, setRecordingState] = useState<Record<string, boolean>>({});
  const [activePtzCam, setActivePtzCam] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ camId: string; text: string } | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (c) =>
        !query ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.institute.toLowerCase().includes(query.toLowerCase())
    );
  }, [data, query]);

  const handlePtz = async (
    camId: string,
    action: 'PAN_LEFT' | 'PAN_RIGHT' | 'TILT_UP' | 'TILT_DOWN' | 'ZOOM_IN' | 'ZOOM_OUT' | 'HOME'
  ) => {
    try {
      const res = await api.sendPtzCommand(camId, action);
      if (res && res.ptz) {
        setPtzCoordinates((prev) => ({ ...prev, [camId]: res.ptz }));
      }
      setFeedback({ camId, text: `PTZ: ${action.replace('_', ' ')}` });
      setTimeout(() => setFeedback((cur) => (cur?.camId === camId ? null : cur)), 2000);
    } catch (err: any) {
      setFeedback({ camId, text: `PTZ failed: ${err.message}` });
    }
  };

  const handleToggleRecord = async (camId: string) => {
    const isCurrentlyRecording = !!recordingState[camId];
    const action = isCurrentlyRecording ? 'STOP' : 'START';
    try {
      const res = await api.toggleRecording(camId, action);
      setRecordingState((prev) => ({ ...prev, [camId]: res.recording }));
      setFeedback({
        camId,
        text: res.recording ? 'Recording started' : 'Recording saved & stopped',
      });
      setTimeout(() => setFeedback((cur) => (cur?.camId === camId ? null : cur)), 2500);
    } catch (err: any) {
      setFeedback({ camId, text: `Record failed: ${err.message}` });
    }
  };

  const getStreamUrl = (cam: any, mode: 'ai' | 'raw') => {
    const base = cam.streamUrl || `http://localhost:8000/api/v1/stream/${cam.cameraCode || cam.cameraId || cam.id}`;
    if (base.includes('view=')) {
      return base.replace(/view=[^&]+/, `view=${mode}`);
    }
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}view=${mode}`;
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-md border border-hairline bg-paper px-3 py-2 md:w-96">
            <Search size={14} className="text-slate-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cameras or institutes…"
              className="w-full bg-transparent text-[13px] text-slate placeholder:text-slate-faint focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-md border border-hairline bg-paper p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setGlobalViewMode('ai')}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors ${
                  globalViewMode === 'ai'
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-soft hover:text-slate'
                }`}
                title="YOLOv8 Detection, ByteTrack, and Zone Analysis Overlay"
              >
                <Cpu size={12} /> AI Analysis View
              </button>
              <button
                type="button"
                onClick={() => setGlobalViewMode('raw')}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors ${
                  globalViewMode === 'raw'
                    ? 'bg-primary text-white shadow-sm font-semibold'
                    : 'text-slate-soft hover:text-slate'
                }`}
                title="Unprocessed Clean CCTV Camera Stream"
              >
                <Eye size={12} /> Raw CCTV Feed
              </button>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-slate-soft pl-2 border-l border-hairline">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live Feeds: {data?.filter((c) => c.status !== 'offline').length ?? 0}
              </span>
              <span className="text-hairline">|</span>
              <span className="text-slate-faint">ONVIF Profile S Controller</span>
            </div>
          </div>
        </div>
      </Panel>

      {isLoading ? (
        <LoadingState label="Loading camera feeds…" />
      ) : filtered.length === 0 ? (
        <EmptyState label="No cameras match your search." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cam) => {
            const coords = ptzCoordinates[cam.id] || { pan: 0, tilt: 0, zoom: 1.0 };
            const isRecording = !!recordingState[cam.id];
            const showPtz = activePtzCam === cam.id;
            const camFeedback = feedback?.camId === cam.id ? feedback.text : null;
            const effectiveMode = cameraViewModes[cam.id] || globalViewMode;
            const streamSrc = getStreamUrl(cam, effectiveMode);

            return (
              <div key={cam.id} className="overflow-hidden rounded-lg border border-hairline bg-panel shadow-panel flex flex-col">
                <div className="relative flex aspect-video items-center justify-center bg-ink/95 overflow-hidden">
                  {cam.status === 'offline' ? (
                    <div className="flex flex-col items-center gap-1.5 text-white/40">
                      <VideoOff size={22} strokeWidth={1.5} />
                      <span className="text-[11px]">Feed unavailable</span>
                    </div>
                  ) : (
                    <>
                      <img
                        key={`${cam.id}-${effectiveMode}`}
                        src={streamSrc}
                        alt={cam.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="hidden flex-col items-center gap-1.5 text-white/30">
                        <VideoIcon size={22} strokeWidth={1.5} />
                        <span className="text-[11px]">Connecting live feed…</span>
                      </div>
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-emerald-400 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {effectiveMode === 'ai' ? 'AI DETECTION & TRACKS' : 'RAW CCTV STREAM'}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCameraViewModes((prev) => ({
                            ...prev,
                            [cam.id]: effectiveMode === 'ai' ? 'raw' : 'ai',
                          }));
                        }}
                        className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm hover:bg-black transition-colors border border-white/10"
                        title="Toggle AI Analysis Overlay for this feed"
                      >
                        {effectiveMode === 'ai' ? (
                          <>
                            <Eye size={10} /> View Raw
                          </>
                        ) : (
                          <>
                            <Cpu size={10} /> View AI
                          </>
                        )}
                      </button>

                      {isRecording && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm animate-pulse">
                          <Circle size={8} fill="currentColor" /> REC
                        </div>
                      )}

                      {camFeedback && (
                        <div className="absolute bottom-2 left-2 right-2 rounded bg-black/75 px-2.5 py-1 text-center text-[11px] font-medium text-amber-300 backdrop-blur-sm">
                          {camFeedback}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-medium text-slate">{cam.name}</p>
                      <DotStatus status={cam.status} />
                    </div>
                    <p className="mt-0.5 text-[12px] text-slate-soft">{cam.institute}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-faint">
                      <span>Last active {formatDateTime(cam.lastActiveAt)}</span>
                      <span className="font-mono text-[10px]">
                        P:{coords.pan}° T:{coords.tilt}° Z:{coords.zoom.toFixed(1)}x
                      </span>
                    </div>
                  </div>

                  {cam.status !== 'offline' && (
                    <div className="mt-3 border-t border-hairline/60 pt-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setActivePtzCam(showPtz ? null : cam.id)}
                          className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                            showPtz ? 'bg-primary/10 text-primary' : 'bg-paper text-slate-soft hover:text-slate'
                          }`}
                        >
                          <Sliders size={12} /> {showPtz ? 'Hide PTZ Pad' : 'PTZ Controls'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleRecord(cam.id)}
                          className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            isRecording
                              ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                              : 'bg-paper text-slate-soft hover:text-slate hover:bg-paper/80'
                          }`}
                        >
                          {isRecording ? (
                            <>
                              <Square size={11} fill="currentColor" /> Stop REC
                            </>
                          ) : (
                            <>
                              <Circle size={11} className="text-red-500" /> Start REC
                            </>
                          )}
                        </button>
                      </div>

                      {showPtz && (
                        <div className="mt-2.5 rounded-md bg-paper p-2 border border-hairline/50">
                          <div className="text-[10.5px] font-medium text-slate-faint mb-1 text-center">
                            SIMULATED ONVIF PTZ PAD
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Tilt Up"
                              onClick={() => handlePtz(cam.id, 'TILT_UP')}
                              className="rounded bg-panel p-1.5 text-slate-soft hover:text-ink hover:bg-panel/90 shadow-sm"
                            >
                              <ChevronUp size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-center gap-2 my-1">
                            <button
                              title="Pan Left"
                              onClick={() => handlePtz(cam.id, 'PAN_LEFT')}
                              className="rounded bg-panel p-1.5 text-slate-soft hover:text-ink hover:bg-panel/90 shadow-sm"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button
                              title="Home Position"
                              onClick={() => handlePtz(cam.id, 'HOME')}
                              className="rounded bg-panel p-1.5 text-slate-soft hover:text-ink hover:bg-panel/90 shadow-sm"
                            >
                              <Home size={14} />
                            </button>
                            <button
                              title="Pan Right"
                              onClick={() => handlePtz(cam.id, 'PAN_RIGHT')}
                              className="rounded bg-panel p-1.5 text-slate-soft hover:text-ink hover:bg-panel/90 shadow-sm"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Tilt Down"
                              onClick={() => handlePtz(cam.id, 'TILT_DOWN')}
                              className="rounded bg-panel p-1.5 text-slate-soft hover:text-ink hover:bg-panel/90 shadow-sm"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                          <div className="mt-2 flex items-center justify-center gap-2 border-t border-hairline/40 pt-1.5">
                            <button
                              title="Zoom In"
                              onClick={() => handlePtz(cam.id, 'ZOOM_IN')}
                              className="flex items-center gap-1 rounded bg-panel px-2 py-1 text-[10.5px] text-slate-soft hover:text-ink shadow-sm"
                            >
                              <ZoomIn size={12} /> Zoom +
                            </button>
                            <button
                              title="Zoom Out"
                              onClick={() => handlePtz(cam.id, 'ZOOM_OUT')}
                              className="flex items-center gap-1 rounded bg-panel px-2 py-1 text-[10.5px] text-slate-soft hover:text-ink shadow-sm"
                            >
                              <ZoomOut size={12} /> Zoom -
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

