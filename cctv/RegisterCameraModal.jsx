import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, RefreshCw, Radio } from 'lucide-react';

export default function RegisterCameraModal({ projects, onClose, onCameraAdded }) {
    const [projectId, setProjectId] = useState(projects[0]?.id || '');
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [rtspUrl, setRtspUrl] = useState('rtsp://localhost:8554/live/camera-');
    const [streamKey, setStreamKey] = useState('');
    const [enabled, setEnabled] = useState(true);

    // Connection Test State
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Submit State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    const handleTestConnection = async () => {
        if (!rtspUrl) {
            setTestResult({ success: false, message: 'Please enter an RTSP URL first' });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            const res = await fetch('http://localhost:5000/api/cameras/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rtspUrl }),
            });
            const data = await res.json();
            setTestResult(data);
        } catch (err) {
            setTestResult({
                success: false,
                message: 'FAILURE: Unable to reach backend connection testing service.',
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !location || !projectId || !rtspUrl) {
            setSubmitError('All required fields must be completed.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch('http://localhost:5000/api/cameras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    location,
                    projectId,
                    rtspUrl,
                    streamKey: streamKey || `cam-${Date.now().toString(36)}`,
                    protocol: 'RTSP',
                    enabled,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || data.error || 'Failed to register camera');
            }

            onCameraAdded(data.data);
            onClose();
        } catch (err) {
            setSubmitError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div
                className="glass-card animate-fade-in"
                style={{
                    width: '100%',
                    maxWidth: '540px',
                    padding: '24px',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                            Register CCTV Camera
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Add and map a surveillance stream to an SIH project
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {submitError && (
                    <div style={{
                        background: 'rgba(244, 63, 94, 0.15)',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        color: '#fda4af',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <AlertTriangle size={16} />
                        {submitError}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Project Mapping */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Target Project / Institute *
                        </label>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                color: '#fff',
                                fontSize: '13px',
                                outline: 'none',
                            }}
                        >
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Camera Name */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Camera Identifier Name *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Workshop Block Entrance"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                color: '#fff',
                                fontSize: '13px',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Installation Location *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Ground Floor Corridor East"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                color: '#fff',
                                fontSize: '13px',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* RTSP Stream URL */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
                                RTSP Stream URL *
                            </label>
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--accent-cyan)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                {isTesting ? <RefreshCw size={12} className="animate-spin" /> : <Radio size={12} />}
                                Test Connection
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="rtsp://localhost:8554/live/camera-1"
                            value={rtspUrl}
                            onChange={(e) => setRtspUrl(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                color: '#fff',
                                fontSize: '13px',
                                fontFamily: 'var(--font-mono)',
                                outline: 'none',
                            }}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Credentials (e.g. rtsp://user:pass@ip:554) will be encrypted and masked.
                        </p>
                    </div>

                    {/* Test Connection Output Box */}
                    {testResult && (
                        <div
                            style={{
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                                color: testResult.success ? '#6ee7b7' : '#fda4af',
                            }}
                        >
                            {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span>
                                <strong>{testResult.success ? 'SUCCESS:' : 'FAILURE:'}</strong> {testResult.message}
                            </span>
                        </div>
                    )}

                    {/* Stream Key (Optional) */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Stream Key / Path (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. camera-workshop-01"
                            value={streamKey}
                            onChange={(e) => setStreamKey(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                color: '#fff',
                                fontSize: '13px',
                                fontFamily: 'var(--font-mono)',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary"
                        >
                            {isSubmitting ? 'Registering...' : 'Save & Register Camera'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
