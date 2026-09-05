import React, { useState, useEffect } from 'react';
import { Video, Plus, Filter, RefreshCw, Power, Trash2, ExternalLink, ShieldCheck, MapPin } from 'lucide-react';
import HlsPlayer from '../../components/HlsPlayer.jsx';
import RegisterCameraModal from './RegisterCameraModal.jsx';

export default function CctvDashboard({ projects, onOpenAlerts }) {
    const [cameras, setCameras] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [testingId, setTestingId] = useState(null);

    const fetchCameras = async () => {
        try {
            const url = selectedProjectId === 'ALL'
                ? 'http://localhost:5000/api/cameras'
                : `http://localhost:5000/api/cameras?projectId=${selectedProjectId}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setCameras(data.data);
            }
        } catch (err) {
            console.error('Failed to load cameras:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCameras();
        const timer = setInterval(fetchCameras, 8000); // Auto refresh camera status
        return () => clearInterval(timer);
    }, [selectedProjectId]);

    const handleToggleCamera = async (id, currentEnabled) => {
        try {
            const endpoint = currentEnabled ? 'disable' : 'enable';
            await fetch(`http://localhost:5000/api/cameras/${id}/${endpoint}`, { method: 'POST' });
            fetchCameras();
        } catch (err) {
            console.error('Failed to toggle camera:', err);
        }
    };

    const handleDeleteCamera = async (id) => {
        if (!window.confirm('Are you sure you want to remove this camera?')) return;
        try {
            await fetch(`http://localhost:5000/api/cameras/${id}`, { method: 'DELETE' });
            fetchCameras();
        } catch (err) {
            console.error('Failed to delete camera:', err);
        }
    };

    const handleTestProbe = async (id) => {
        setTestingId(id);
        try {
            const res = await fetch(`http://localhost:5000/api/cameras/${id}/test`, { method: 'POST' });
            const data = await res.json();
            alert(data.success ? `SUCCESS: ${data.message}` : `FAILURE: ${data.message}`);
            fetchCameras();
        } catch (err) {
            alert('Unable to reach server to test connection');
        } finally {
            setTestingId(null);
        }
    };

    const onlineCount = cameras.filter((c) => c.status === 'ONLINE').length;
    const offlineCount = cameras.filter((c) => c.status !== 'ONLINE').length;

    return (
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
            {/* Top Banner & Metric Badges */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '24px',
            }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                        CCTV Surveillance Monitoring Dashboard
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Live RTSP video ingestion transmuxed to HLS & WebRTC via MediaMTX
                    </p>
                </div>

                {/* Action Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Status Counter */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                    }}>
                        <span style={{ color: '#34d399', fontWeight: 700 }}>{onlineCount} Online</span>
                        <span style={{ color: '#64748b' }}>|</span>
                        <span style={{ color: '#f87171', fontWeight: 700 }}>{offlineCount} Offline</span>
                    </div>

                    <button
                        onClick={() => setIsRegisterOpen(true)}
                        className="btn btn-primary"
                    >
                        <Plus size={16} />
                        Register Camera
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                padding: '12px 18px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Filter size={16} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
                        Filter by Project:
                    </span>
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        style={{
                            padding: '6px 12px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fff',
                            fontSize: '13px',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="ALL">All SIH Projects ({projects.length})</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.code})
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={fetchCameras}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    title="Refresh camera feeds"
                >
                    <RefreshCw size={14} />
                    Refresh Feeds
                </button>
            </div>

            {/* Multi-Camera Grid */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
                    <p>Loading CCTV camera nodes...</p>
                </div>
            ) : cameras.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Video size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>No Cameras Registered</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        There are no surveillance cameras mapped to the selected project.
                    </p>
                    <button
                        onClick={() => setIsRegisterOpen(true)}
                        className="btn btn-primary"
                        style={{ marginTop: '16px' }}
                    >
                        <Plus size={16} /> Register First Camera
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
                    gap: '20px',
                }}>
                    {cameras.map((cam) => {
                        const isLive = cam.status === 'ONLINE' && cam.enabled;

                        return (
                            <div
                                key={cam.id}
                                className="glass-card animate-fade-in"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    border: isLive ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border-color)',
                                }}
                            >
                                {/* Card Header */}
                                <div style={{
                                    padding: '14px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(18, 26, 46, 0.6)',
                                    borderBottom: '1px solid var(--border-color)',
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                                                {cam.name}
                                            </h4>
                                            {isLive ? (
                                                <div className="live-indicator">
                                                    <div className="live-dot" />
                                                    <span>LIVE</span>
                                                </div>
                                            ) : (
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: 'rgba(100, 116, 139, 0.2)',
                                                    color: '#94a3b8',
                                                    border: '1px solid rgba(100, 116, 139, 0.3)',
                                                }}>
                                                    {cam.enabled ? 'OFFLINE' : 'DISABLED'}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                            <MapPin size={12} color="var(--text-muted)" />
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {cam.location} · {cam.project?.name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick Toggle */}
                                    <button
                                        onClick={() => handleToggleCamera(cam.id, cam.enabled)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: cam.enabled ? '#34d399' : '#64748b',
                                            cursor: 'pointer',
                                            padding: '4px',
                                        }}
                                        title={cam.enabled ? 'Disable Camera' : 'Enable Camera'}
                                    >
                                        <Power size={18} />
                                    </button>
                                </div>

                                {/* Video Playback Container */}
                                <div style={{ padding: '12px', background: '#070a14' }}>
                                    <HlsPlayer
                                        streamUrl={cam.endpoints?.hlsUrl}
                                        cameraName={cam.name}
                                        isOnline={isLive}
                                        onRetry={() => handleTestProbe(cam.id)}
                                    />
                                </div>

                                {/* Stream Metadata & Telemetry Footer */}
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'rgba(18, 26, 46, 0.8)',
                                    borderTop: '1px solid var(--border-color)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    fontSize: '12px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                        <span>Stream Path:</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                                            live/{cam.streamKey}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                        <span>Health Status:</span>
                                        <span style={{
                                            fontWeight: 600,
                                            color: cam.healthStatus === 'HEALTHY' ? '#34d399' : '#f87171',
                                        }}>
                                            {cam.healthStatus}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                        <span>Last Seen:</span>
                                        <span style={{ color: '#cbd5e1' }}>
                                            {cam.lastSeen ? new Date(cam.lastSeen).toLocaleTimeString() : 'Never'}
                                        </span>
                                    </div>

                                    {/* Card Action Toolbar */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginTop: '6px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                    }}>
                                        <button
                                            onClick={() => handleTestProbe(cam.id)}
                                            disabled={testingId === cam.id}
                                            className="btn btn-secondary"
                                            style={{ fontSize: '11px', padding: '5px 10px' }}
                                        >
                                            {testingId === cam.id ? <RefreshCw size={12} className="animate-spin" /> : null}
                                            Test Connection
                                        </button>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <a
                                                href={cam.endpoints?.webPlayerUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-secondary"
                                                style={{ fontSize: '11px', padding: '5px 8px' }}
                                                title="Open MediaMTX native player"
                                            >
                                                <ExternalLink size={13} />
                                            </a>

                                            <button
                                                onClick={() => handleDeleteCamera(cam.id)}
                                                className="btn btn-danger"
                                                style={{ fontSize: '11px', padding: '5px 8px' }}
                                                title="Remove Camera"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Registration Modal */}
            {isRegisterOpen && (
                <RegisterCameraModal
                    projects={projects}
                    onClose={() => setIsRegisterOpen(false)}
                    onCameraAdded={fetchCameras}
                />
            )}
        </div>
    );
}
