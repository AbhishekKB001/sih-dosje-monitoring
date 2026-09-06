import React from 'react';
import { Video, PhoneCall, ShieldCheck, Activity, Bell } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, unreadAlertsCount = 0, onOpenAlerts }) {
    return (
        <header style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        }}>
            {/* Brand & Project Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                }}>
                    <ShieldCheck size={24} color="#fff" />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                            SIH 2026
                        </span>
                        <span style={{
                            background: 'rgba(59, 130, 246, 0.18)',
                            color: '#60a5fa',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}>
                            MEMBER 3
                        </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        AI Real-Time Monitoring & Smart Inspection Subsystem
                    </p>
                </div>
            </div>

            {/* Module Switcher Tabs */}
            <nav style={{
                display: 'flex',
                background: 'var(--bg-primary)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
            }}>
                <button
                    onClick={() => setActiveTab('cctv')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: activeTab === 'cctv' ? 'var(--accent-blue)' : 'transparent',
                        color: activeTab === 'cctv' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                    }}
                >
                    <Video size={16} />
                    CCTV Surveillance
                </button>

                <button
                    onClick={() => setActiveTab('vc')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: activeTab === 'vc' ? 'var(--accent-blue)' : 'transparent',
                        color: activeTab === 'vc' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                    }}
                >
                    <PhoneCall size={16} />
                    Random Video Inspection
                </button>
            </nav>

            {/* Action / Alerts & Health */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                    onClick={onOpenAlerts}
                    className="btn btn-secondary"
                    style={{ position: 'relative', padding: '8px 12px' }}
                    title="View CCTV System Alerts"
                >
                    <Bell size={18} />
                    {unreadAlertsCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: 'var(--accent-rose)',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 800,
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 8px rgba(244, 63, 94, 0.7)',
                        }}>
                            {unreadAlertsCount}
                        </span>
                    )}
                </button>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#34d399',
                    fontWeight: 600,
                }}>
                    <Activity size={14} />
                    MediaMTX Active
                </div>
            </div>
        </header>
    );
}
