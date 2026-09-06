import { prisma } from '../../prisma.js';
import { CctvService } from './cctv.service.js';

export class CameraHealthMonitor {
    private static intervalTimer: NodeJS.Timeout | null = null;
    private static isChecking = false;

    /**
     * Starts periodic non-intrusive camera health monitoring.
     */
    static start(intervalMs = 10000) {
        if (this.intervalTimer) return;

        console.log(`[CCTV HealthMonitor] Started with ${intervalMs}ms polling cycle`);
        this.intervalTimer = setInterval(() => {
            this.checkAllCameras().catch((err) => {
                console.error('[CCTV HealthMonitor] Error during health check cycle:', err.message);
            });
        }, intervalMs);

        // Run first check immediately
        this.checkAllCameras().catch(() => { });
    }

    static stop() {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
            console.log('[CCTV HealthMonitor] Stopped');
        }
    }

    static async checkAllCameras() {
        if (this.isChecking) return;
        this.isChecking = true;

        try {
            // 1. Fetch active paths from MediaMTX API
            const mtxApiUrl = process.env.MEDIAMTX_API_URL || 'http://localhost:9997';
            let activePaths: Set<string> = new Set();

            try {
                const response = await fetch(`${mtxApiUrl}/v3/paths/list`);
                if (response.ok) {
                    const data = (await response.json()) as any;
                    if (Array.isArray(data?.items)) {
                        for (const item of data.items) {
                            if (item.ready) {
                                // item.name is e.g. "live/camera-1" or "camera-1"
                                activePaths.add(item.name.replace(/^live\//, ''));
                                activePaths.add(item.name);
                            }
                        }
                    }
                }
            } catch (err: any) {
                // MediaMTX API temporarily unreachable
            }

            // 2. Query all enabled cameras
            const cameras = await prisma.camera.findMany({
                where: { enabled: true },
            });

            for (const camera of cameras) {
                const isStreamActiveOnMediaServer =
                    activePaths.has(camera.streamKey) || activePaths.has(`live/${camera.streamKey}`);

                let newStatus: 'ONLINE' | 'OFFLINE' | 'ERROR' = 'OFFLINE';
                let health = 'HEALTHY';
                let lastError: string | null = null;

                if (isStreamActiveOnMediaServer) {
                    newStatus = 'ONLINE';
                    health = 'HEALTHY';
                } else {
                    // Probe RTSP socket reachability
                    const probe = await CctvService.testConnection(camera.rtspUrl);
                    if (probe.success) {
                        newStatus = 'ONLINE';
                        health = 'HEALTHY';
                    } else {
                        newStatus = 'OFFLINE';
                        health = 'UNREACHABLE';
                        lastError = probe.message;
                    }
                }

                // Status transition alert handling
                if (camera.status !== newStatus) {
                    if (camera.status === 'ONLINE' && newStatus === 'OFFLINE') {
                        await prisma.cctvAlert.create({
                            data: {
                                cameraId: camera.id,
                                eventType: 'CAMERA_OFFLINE',
                                severity: 'WARNING',
                                message: `Camera ${camera.name} at ${camera.location} has gone OFFLINE. ${lastError || ''}`,
                            },
                        });
                        console.log(`[CCTV Alert] Camera ${camera.name} -> OFFLINE`);
                    } else if (camera.status === 'OFFLINE' && newStatus === 'ONLINE') {
                        await prisma.cctvAlert.create({
                            data: {
                                cameraId: camera.id,
                                eventType: 'CAMERA_RESTORED',
                                severity: 'INFO',
                                message: `Camera ${camera.name} connection restored. Stream active.`,
                            },
                        });
                        console.log(`[CCTV Alert] Camera ${camera.name} -> ONLINE`);
                    }
                }

                // Update database record
                await prisma.camera.update({
                    where: { id: camera.id },
                    data: {
                        status: newStatus,
                        healthStatus: health,
                        lastSeen: newStatus === 'ONLINE' ? new Date() : camera.lastSeen,
                        lastError,
                    },
                });
            }
        } finally {
            this.isChecking = false;
        }
    }
}
