import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Volume2, VolumeX, Maximize, AlertCircle, RefreshCw } from 'lucide-react';

export default function HlsPlayer({ streamUrl, cameraName, isOnline = true, onRetry }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isMuted, setIsMuted] = useState(true);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let hls = null;
        const video = videoRef.current;
        if (!video || !streamUrl || !isOnline) return;

        setError(null);
        setIsLoading(true);

        if (Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 30,
                maxBufferLength: 10,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 5,
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsLoading(false);
                video.play().catch(() => {
                    // Autoplay was blocked; keep muted
                    video.muted = true;
                    video.play().catch(() => { });
                });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn('[HlsPlayer] Network error, recovering...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn('[HlsPlayer] Media error, recovering...');
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error('[HlsPlayer] Unrecoverable HLS error:', data);
                            setError('Stream disconnected or unavailable');
                            hls.destroy();
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native iOS / Safari HLS support
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', () => {
                setIsLoading(false);
                video.play().catch(() => { });
            });
        } else {
            setError('HLS playback is not supported on this browser');
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [streamUrl, isOnline]);

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    const toggleFullscreen = () => {
        if (containerRef.current) {
            if (!document.fullscreenElement) {
                containerRef.current.requestFullscreen().catch(() => { });
            } else {
                document.exitFullscreen().catch(() => { });
            }
        }
    };

    if (!isOnline) {
        return (
            <div style={{
                width: '100%',
                aspectRatio: '16/9',
                background: '#0d1322',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '8px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
            }}>
                <AlertCircle size={28} color="#64748b" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Camera Stream Offline</span>
                <span style={{ fontSize: '11px', color: '#475569' }}>RTSP source not transmitting</span>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px', marginTop: '6px' }}
                    >
                        <RefreshCw size={12} /> Test Connection
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                background: '#000',
                borderRadius: '8px',
                overflow: 'hidden',
            }}
        >
            <video
                ref={videoRef}
                muted={isMuted}
                playsInline
                autoPlay
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                }}
            />

            {/* Live Badge Overlay */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                padding: '3px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                <div className="live-dot" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.05em' }}>
                    LIVE HLS
                </span>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(10, 15, 29, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#94a3b8',
                    fontSize: '12px',
                }}>
                    <RefreshCw size={18} className="animate-spin" />
                    Connecting live stream...
                </div>
            )}

            {/* Error Overlay */}
            {error && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(10, 15, 29, 0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#f87171',
                    fontSize: '12px',
                    padding: '16px',
                    textAlign: 'center',
                }}>
                    <AlertCircle size={22} />
                    <span>{error}</span>
                    <button
                        onClick={onRetry}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px', marginTop: '4px' }}
                    >
                        Retry Stream
                    </button>
                </div>
            )}

            {/* Player Bottom Floating Controls */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '8px 12px',
                background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.85))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: 0.9,
                transition: 'opacity 0.2s',
            }}>
                <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                    {cameraName}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={toggleMute}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        title="Full Screen"
                    >
                        <Maximize size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
