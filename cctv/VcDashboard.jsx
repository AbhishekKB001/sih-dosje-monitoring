import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
    PhoneCall,
    PhoneOff,
    Mic,
    MicOff,
    Video as VideoIcon,
    VideoOff,
    Users,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Clock,
    Sparkles,
    AlertCircle
} from 'lucide-react';

export default function VcDashboard({ inspections, projects }) {
    const [selectedInspectionId, setSelectedInspectionId] = useState(inspections[0]?.id || '');
    const [eligibleRoles, setEligibleRoles] = useState(['PROJECT_INCHARGE', 'STAFF', 'BENEFICIARY']);
    const [isInitiating, setIsInitiating] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const [callState, setCallState] = useState('IDLE'); // IDLE, CALLING, RINGING, CONNECTED, ENDED
    const [verificationResult, setVerificationResult] = useState('VERIFIED');
    const [verificationNotes, setVerificationNotes] = useState('');
    const [isSubmittingResult, setIsSubmittingResult] = useState(false);
    const [error, setError] = useState(null);
    const [previousSessions, setPreviousSessions] = useState([]);

    // Media & WebRTC State
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoDisabled, setIsVideoDisabled] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);

    const currentInspection = inspections.find((i) => i.id === selectedInspectionId);

    // Load previous sessions for this inspection
    const fetchSessions = async () => {
        if (!selectedInspectionId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/vc/sessions/inspection/${selectedInspectionId}`);
            const data = await res.json();
            if (data.success) {
                setPreviousSessions(data.data);
            }
        } catch (err) {
            console.error('Failed to load VC sessions:', err);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [selectedInspectionId]);

    // Cleanup media on unmount
    useEffect(() => {
        return () => {
            cleanupCall();
        };
    }, []);

    const cleanupCall = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    };

    const toggleRole = (role) => {
        if (eligibleRoles.includes(role)) {
            if (eligibleRoles.length === 1) return; // keep at least one
            setEligibleRoles(eligibleRoles.filter((r) => r !== role));
        } else {
            setEligibleRoles([...eligibleRoles, role]);
        }
    };

    // 1. Start Random VC Initiation
    const handleStartRandomVc = async () => {
        if (!selectedInspectionId) return;
        setIsInitiating(true);
        setError(null);
        setCallState('CALLING');

        try {
            const inspectorId = currentInspection?.inspectorId || '4f3896cd-dd3c-404b-a8e7-de9e3d89fb63';

            const res = await fetch('http://localhost:5000/api/vc/sessions/random', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inspectionId: selectedInspectionId,
                    initiatedById: inspectorId,
                    eligibleRoles,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to start random VC');
            }

            setActiveSession(data.data.session);
            const roomId = data.data.roomId;
            const iceServers = data.data.iceServers;

            // 2. Initialize WebRTC and Signaling
            await setupWebRtcCall(roomId, iceServers, data.data.session.id);
        } catch (err) {
            setError(err.message);
            setCallState('IDLE');
        } finally {
            setIsInitiating(false);
        }
    };

    // 2. WebRTC PeerConnection Setup
    const setupWebRtcCall = async (roomId, iceServers, sessionId) => {
        try {
            // Connect Socket.IO
            const socket = io('http://localhost:5000');
            socketRef.current = socket;

            // Request user camera and microphone
            let localStream;
            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: true,
                });
            } catch (mediaErr) {
                console.warn('Real camera/mic unavailable, creating synthetic canvas stream for demo:', mediaErr);
                // Fallback to canvas stream if camera permission denied or no hardware
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                const drawLoop = () => {
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#38bdf8';
                    ctx.font = '24px Inter';
                    ctx.fillText('SIH Inspector Video Feed', 40, 80);
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '16px monospace';
                    ctx.fillText(new Date().toLocaleTimeString(), 40, 120);
                    requestAnimationFrame(drawLoop);
                };
                drawLoop();
                localStream = canvas.captureStream(30);
            }

            localStreamRef.current = localStream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
            }

            // Create RTCPeerConnection
            const pc = new RTCPeerConnection({ iceServers });
            peerConnectionRef.current = pc;

            // Add local tracks to peer connection
            localStream.getTracks().forEach((track) => {
                pc.addTrack(track, localStream);
            });

            // Handle remote incoming track
            pc.ontrack = (event) => {
                console.log('[WebRTC] Received remote stream track:', event.streams[0]);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                    setCallState('CONNECTED');
                }
            };

            // Handle ICE Candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', { roomId, candidate: event.candidate });
                }
            };

            // Join Signaling Room as Inspector
            socket.emit('join-room', {
                roomId,
                userId: 'inspector-1',
                userName: 'Dr. Rajesh Sharma',
                role: 'INSPECTOR',
            });

            // Signaling Listeners
            socket.on('participant-joined', async () => {
                console.log('[Signaling] Participant joined room! Creating offer...');
                setCallState('RINGING');
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('offer', { roomId, sdp: offer });
            });

            socket.on('answer', async (data) => {
                console.log('[Signaling] Received answer from participant');
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                setCallState('CONNECTED');
            });

            socket.on('ice-candidate', async (data) => {
                if (data.candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => { });
                }
            });

            socket.on('call-ended', () => {
                handleEndCall();
            });

            // Auto-simulate participant answering for single-machine demo after 3 seconds!
            setTimeout(async () => {
                if (callState !== 'CONNECTED' && pc.signalingState === 'stable') {
                    // If no second browser tab joined, connect remote video to simulated feed
                    setCallState('CONNECTED');
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = localStream; // Echo for demo
                    }
                }
            }, 3500);

        } catch (err) {
            console.error('[WebRTC] Call setup error:', err);
            setError('Unable to establish WebRTC media connection: ' + err.message);
            setCallState('IDLE');
        }
    };

    const toggleMuteAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoDisabled(!videoTrack.enabled);
            }
        }
    };

    const handleEndCall = async () => {
        if (socketRef.current && activeSession?.roomId) {
            socketRef.current.emit('end-call', {
                roomId: activeSession.roomId,
                sessionId: activeSession.id,
            });
        }

        setCallState('ENDED');
    };

    const handleSubmitVerification = async () => {
        if (!activeSession) return;
        setIsSubmittingResult(true);

        try {
            const res = await fetch(`http://localhost:5000/api/vc/sessions/${activeSession.id}/result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    result: verificationResult,
                    notes: verificationNotes || 'Verification completed by inspector.',
                }),
            });

            const data = await res.json();
            if (data.success) {
                cleanupCall();
                setActiveSession(null);
                setCallState('IDLE');
                setVerificationNotes('');
                fetchSessions();
            }
        } catch (err) {
            alert('Error saving verification result: ' + err.message);
        } finally {
            setIsSubmittingResult(false);
        }
    };

    return (
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
            {/* Title & Description */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    Random Video Inspection Subsystem
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Unbiased cryptographic server-side participant selection, WebRTC 1-on-1 calls & verification logs
                </p>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fda4af',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Main Grid: Left = Call Workspace, Right = Inspection History */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '24px' }}>
                {/* Left: Active Call / Selection Workspace */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    {callState === 'IDLE' ? (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Users size={20} color="var(--accent-cyan)" />
                                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                                    Inspection Participant Randomizer
                                </h3>
                            </div>

                            {/* Inspection Selector */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                                    Select Target Inspection:
                                </label>
                                <select
                                    value={selectedInspectionId}
                                    onChange={(e) => setSelectedInspectionId(e.target.value)}
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
                                    {inspections.map((insp) => (
                                        <option key={insp.id} value={insp.id}>
                                            {insp.project?.name} ({insp.project?.code}) — Status: {insp.status}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Role Inclusion Filter */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                                    Eligible Roles for Random Pool:
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {['PROJECT_INCHARGE', 'STAFF', 'BENEFICIARY'].map((role) => {
                                        const isSelected = eligibleRoles.includes(role);
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => toggleRole(role)}
                                                style={{
                                                    background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'var(--bg-primary)',
                                                    border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                                                    color: isSelected ? '#93c5fd' : 'var(--text-muted)',
                                                    padding: '8px 14px',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {isSelected ? '✓ ' : ''}{role.replace(/_/g, ' ')}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                    The backend RandomParticipantService will query active users matching these roles for the project and select one at random.
                                </p>
                            </div>

                            {/* Start Call CTA Button */}
                            <button
                                onClick={handleStartRandomVc}
                                disabled={isInitiating}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    fontSize: '15px',
                                    borderRadius: 'var(--radius-md)',
                                }}
                            >
                                <Sparkles size={18} />
                                {isInitiating ? 'Selecting Participant & Initiating Room...' : 'START RANDOM VIDEO CONFERENCE'}
                            </button>
                        </div>
                    ) : callState === 'ENDED' ? (
                        /* Post-Call Verification Form */
                        <div className="animate-fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <ShieldCheck size={22} color="var(--accent-emerald)" />
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                                    Inspector Post-Call Verification Result
                                </h3>
                            </div>

                            <div style={{
                                background: 'var(--bg-primary)',
                                padding: '14px 16px',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '16px',
                                fontSize: '13px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Participant:</span>
                                    <span style={{ fontWeight: 600, color: '#fff' }}>{activeSession?.selectedParticipant?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                                    <span style={{ color: '#60a5fa', fontWeight: 600 }}>{activeSession?.participantRole}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Room ID:</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#94a3b8' }}>
                                        {activeSession?.roomId}
                                    </span>
                                </div>
                            </div>

                            {/* Decision Toggle */}
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                                Official Verification Outcome *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setVerificationResult('VERIFIED')}
                                    style={{
                                        padding: '12px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${verificationResult === 'VERIFIED' ? 'var(--accent-emerald)' : 'var(--border-color)'}`,
                                        background: verificationResult === 'VERIFIED' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                                        color: verificationResult === 'VERIFIED' ? '#34d399' : 'var(--text-muted)',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <CheckCircle2 size={18} />
                                    VERIFIED
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVerificationResult('NOT_VERIFIED')}
                                    style={{
                                        padding: '12px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${verificationResult === 'NOT_VERIFIED' ? 'var(--accent-rose)' : 'var(--border-color)'}`,
                                        background: verificationResult === 'NOT_VERIFIED' ? 'rgba(244, 63, 94, 0.15)' : 'var(--bg-primary)',
                                        color: verificationResult === 'NOT_VERIFIED' ? '#f43f5e' : 'var(--text-muted)',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <XCircle size={18} />
                                    NOT VERIFIED
                                </button>
                            </div>

                            {/* Notes */}
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                                Inspection Remarks / Observations:
                            </label>
                            <textarea
                                rows={3}
                                placeholder="e.g. Identity verified via video call, confirmed on-duty presence in workshop."
                                value={verificationNotes}
                                onChange={(e) => setVerificationNotes(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    color: '#fff',
                                    fontSize: '13px',
                                    outline: 'none',
                                    marginBottom: '18px',
                                    resize: 'vertical',
                                }}
                            />

                            <button
                                onClick={handleSubmitVerification}
                                disabled={isSubmittingResult}
                                className="btn btn-success"
                                style={{ width: '100%', padding: '12px' }}
                            >
                                {isSubmittingResult ? 'Recording Verification...' : 'Submit Official Inspection Record'}
                            </button>
                        </div>
                    ) : (
                        /* Active WebRTC Call View */
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            {/* Participant Telemetry Header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingBottom: '12px',
                                marginBottom: '12px',
                                borderBottom: '1px solid var(--border-color)',
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                                            {activeSession?.selectedParticipant?.name}
                                        </span>
                                        <span style={{
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            color: '#60a5fa',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                        }}>
                                            {activeSession?.participantRole}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {currentInspection?.project?.name} · {activeSession?.selectedParticipant?.email}
                                    </span>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: callState === 'CONNECTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: callState === 'CONNECTED' ? '#34d399' : '#f59e0b',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    padding: '4px 10px',
                                    borderRadius: '16px',
                                }}>
                                    <div className="live-dot" style={{
                                        backgroundColor: callState === 'CONNECTED' ? '#10b981' : '#f59e0b'
                                    }} />
                                    {callState === 'CONNECTED' ? 'CONNECTED (WebRTC)' : 'CONNECTING...'}
                                </div>
                            </div>

                            {/* Video Screen Layout */}
                            <div style={{
                                position: 'relative',
                                width: '100%',
                                aspectRatio: '16/9',
                                background: '#04070f',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8)',
                            }}>
                                {/* Remote Participant Video (Full) */}
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />

                                {/* Local Inspector Video (Picture-in-Picture) */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '16px',
                                    right: '16px',
                                    width: '160px',
                                    aspectRatio: '16/9',
                                    background: '#0f172a',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '2px solid rgba(255, 255, 255, 0.2)',
                                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)',
                                }}>
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '4px',
                                        left: '6px',
                                        fontSize: '10px',
                                        color: '#fff',
                                        background: 'rgba(0,0,0,0.6)',
                                        padding: '1px 4px',
                                        borderRadius: '4px'
                                    }}>
                                        Inspector
                                    </span>
                                </div>
                            </div>

                            {/* Call Controls Toolbar */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                marginTop: '16px',
                            }}>
                                <button
                                    onClick={toggleMuteAudio}
                                    className="btn btn-secondary"
                                    style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '50%',
                                        padding: 0,
                                        background: isAudioMuted ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-tertiary)',
                                        color: isAudioMuted ? '#f43f5e' : '#fff',
                                    }}
                                    title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
                                >
                                    {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
                                </button>

                                <button
                                    onClick={toggleVideo}
                                    className="btn btn-secondary"
                                    style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '50%',
                                        padding: 0,
                                        background: isVideoDisabled ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-tertiary)',
                                        color: isVideoDisabled ? '#f43f5e' : '#fff',
                                    }}
                                    title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
                                >
                                    {isVideoDisabled ? <VideoOff size={20} /> : <VideoIcon size={20} />}
                                </button>

                                <button
                                    onClick={handleEndCall}
                                    className="btn btn-danger"
                                    style={{
                                        width: '54px',
                                        height: '54px',
                                        borderRadius: '50%',
                                        padding: 0,
                                        background: 'var(--accent-rose)',
                                        color: '#fff',
                                        boxShadow: '0 4px 14px rgba(244, 63, 94, 0.4)',
                                    }}
                                    title="End Verification Call"
                                >
                                    <PhoneOff size={22} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Inspection VC Log History */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Clock size={18} color="var(--accent-cyan)" />
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                            Verification Call History
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
                        {previousSessions.length === 0 ? (
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                                No video calls recorded yet for this inspection.
                            </p>
                        ) : (
                            previousSessions.map((s) => (
                                <div
                                    key={s.id}
                                    style={{
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-color)',
                                        padding: '12px 14px',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                                            {s.selectedParticipant?.name}
                                        </span>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            background: s.result === 'VERIFIED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                            color: s.result === 'VERIFIED' ? '#34d399' : '#f87171',
                                        }}>
                                            {s.result}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                        <span>Role: {s.selectedParticipant?.role}</span>
                                        <span>·</span>
                                        <span>{new Date(s.createdAt).toLocaleTimeString()}</span>
                                    </div>

                                    {s.notes && (
                                        <p style={{ fontSize: '12px', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                                            "{s.notes}"
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
