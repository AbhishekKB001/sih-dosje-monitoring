import React, { useState } from 'react';
import { X, Bell, AlertTriangle, Info, Check, ShieldAlert, Sparkles } from 'lucide-react';

export default function AlertsDrawer({ alerts, onClose, onRefreshAlerts }) {
    const [isSimulating, setIsSimulating] = useState(false);

    const markAsRead = async (id) => {
        try {
            await fetch(`http://localhost:5000/api/alerts/${id}/read`, { method: 'POST' });
            onRefreshAlerts();
        } catch (err) {
            console.error('Failed to mark alert as read:', err);
        }
    };

    const simulateAiEvent = async () => {
        setIsSimulating(true);
        try {
            await fetch('http://localhost:5000/api/alerts/ai-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cameraId: alerts[0]?.cameraId || 'sample-cam-id',
                    eventType: 'AI_INTRUSION_DETECTED',
                    severity: 'CRITICAL',
                    message: 'AI Vision Alert: Unauthorized movement detected outside operating hours.',
                    metadata: { confidence: 0.94, bbox: [120, 80, 240, 360], frameTimestamp: new Date().toISOString() },
                }),
            });
            onRefreshAlerts();
        } catch (err) {
            console.error('Failed to simulate AI alert:', err);
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div
                className="glass-card animate-fade-in"
                style={{
                    width: '100%',
                    maxWidth: '560px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-amber)',
                        }}>
                            <Bell size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                                CCTV Surveillance Alerts
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Real-time security notifications & AI event logs
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* SIH AI Injection Bar */}
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={14} /> AI Integration Hook (Members 4 & 5)
                        </div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            Inject a simulated computer vision detection event into the stream feed
                        </p>
                    </div>
                    <button
                        onClick={simulateAiEvent}
                        disabled={isSimulating}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '6px 12px' }}
                    >
                        Simulate AI Event
                    </button>
                </div>

                {/* Alerts List */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {alerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            <ShieldAlert size={36} style={{ marginBottom: '10px', opacity: 0.4 }} />
                            <p style={{ fontSize: '14px' }}>No active alerts</p>
                            <p style={{ fontSize: '12px' }}>All camera nodes operating nominally.</p>
                        </div>
                    ) : (
                        alerts.map((alert) => (
                            <div
                                key={alert.id}
                                style={{
                                    background: alert.isRead ? 'rgba(18, 26, 46, 0.4)' : 'rgba(27, 38, 64, 0.85)',
                                    border: `1px solid ${alert.severity === 'CRITICAL'
                                            ? 'rgba(244, 63, 94, 0.4)'
                                            : alert.severity === 'WARNING'
                                                ? 'rgba(245, 158, 11, 0.4)'
                                                : 'var(--border-color)'
                                        }`,
                                    padding: '12px 14px',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                }}
                            >
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ marginTop: '2px' }}>
                                        {alert.severity === 'CRITICAL' ? (
                                            <ShieldAlert size={18} color="#f43f5e" />
                                        ) : alert.severity === 'WARNING' ? (
                                            <AlertTriangle size={18} color="#f59e0b" />
                                        ) : (
                                            <Info size={18} color="#38bdf8" />
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                                                {alert.eventType.replace(/_/g, ' ')}
                                            </span>
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                fontWeight: 700,
                                                background:
                                                    alert.severity === 'CRITICAL'
                                                        ? 'rgba(244, 63, 94, 0.2)'
                                                        : alert.severity === 'WARNING'
                                                            ? 'rgba(245, 158, 11, 0.2)'
                                                            : 'rgba(56, 189, 248, 0.2)',
                                                color:
                                                    alert.severity === 'CRITICAL'
                                                        ? '#f43f5e'
                                                        : alert.severity === 'WARNING'
                                                            ? '#f59e0b'
                                                            : '#38bdf8',
                                            }}>
                                                {alert.severity}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '3px' }}>
                                            {alert.message}
                                        </p>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                            {new Date(alert.createdAt).toLocaleTimeString()} · Camera: {alert.camera?.name || 'Node'}
                                        </span>
                                    </div>
                                </div>

                                {!alert.isRead && (
                                    <button
                                        onClick={() => markAsRead(alert.id)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent-cyan)',
                                            cursor: 'pointer',
                                            padding: '4px',
                                        }}
                                        title="Mark as Read"
                                    >
                                        <Check size={16} />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
