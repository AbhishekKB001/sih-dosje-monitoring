import net from 'net';
import { prisma } from '../../prisma.js';

export interface CreateCameraInput {
    name: string;
    location: string;
    projectId: string;
    rtspUrl: string;
    streamKey?: string;
    protocol?: string;
    enabled?: boolean;
}

export interface UpdateCameraInput {
    name?: string;
    location?: string;
    rtspUrl?: string;
    enabled?: boolean;
    status?: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DISABLED';
}

export class CctvService {
    /**
     * Masks sensitive credentials in RTSP URLs for client consumption.
     * e.g. rtsp://admin:secret123@192.168.1.20:554/ch1 -> rtsp://***:***@192.168.1.20:554/ch1
     */
    static maskRtspUrl(url: string): string {
        if (!url) return '';
        return url.replace(/(rtsp:\/\/[^:]+):([^@]+)@/i, '$1:***@');
    }

    /**
     * Generates standard player endpoints for frontend consumption.
     */
    static getStreamEndpoints(streamKey: string) {
        const host = process.env.MEDIA_SERVER_HOST || 'localhost';
        const hlsPort = process.env.MEDIAMTX_HLS_PORT || '8888';
        const webrtcPort = process.env.MEDIAMTX_WEBRTC_PORT || '8889';

        return {
            hlsUrl: `http://${host}:${hlsPort}/live/${streamKey}/index.m3u8`,
            webrtcUrl: `http://${host}:${webrtcPort}/live/${streamKey}/whep`,
            webPlayerUrl: `http://${host}:${hlsPort}/live/${streamKey}/`,
        };
    }

    static async listCameras(projectId?: string) {
        const cameras = await prisma.camera.findMany({
            where: projectId ? { projectId } : undefined,
            include: {
                project: {
                    select: { id: true, name: true, code: true, location: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return cameras.map((cam) => {
            const endpoints = this.getStreamEndpoints(cam.streamKey);
            return {
                ...cam,
                rtspUrlMasked: this.maskRtspUrl(cam.rtspUrl),
                endpoints,
            };
        });
    }

    static async getCameraById(id: string) {
        const camera = await prisma.camera.findUnique({
            where: { id },
            include: {
                project: true,
                alerts: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!camera) return null;

        return {
            ...camera,
            rtspUrlMasked: this.maskRtspUrl(camera.rtspUrl),
            endpoints: this.getStreamEndpoints(camera.streamKey),
        };
    }

    static async createCamera(input: CreateCameraInput) {
        // Generate clean unique streamKey if not provided
        const streamKey = input.streamKey || `cam-${Date.now().toString(36)}`;

        const camera = await prisma.camera.create({
            data: {
                name: input.name,
                location: input.location,
                projectId: input.projectId,
                rtspUrl: input.rtspUrl,
                streamKey,
                protocol: input.protocol || 'RTSP',
                enabled: input.enabled ?? true,
                status: 'OFFLINE',
                healthStatus: 'HEALTHY',
            },
            include: {
                project: true,
            },
        });

        // Create an initial alert
        await prisma.cctvAlert.create({
            data: {
                cameraId: camera.id,
                eventType: 'CAMERA_REGISTERED',
                severity: 'INFO',
                message: `Camera ${camera.name} registered at ${camera.location}`,
            },
        });

        return {
            ...camera,
            rtspUrlMasked: this.maskRtspUrl(camera.rtspUrl),
            endpoints: this.getStreamEndpoints(camera.streamKey),
        };
    }

    static async updateCamera(id: string, input: UpdateCameraInput) {
        const updated = await prisma.camera.update({
            where: { id },
            data: input,
            include: { project: true },
        });

        return {
            ...updated,
            rtspUrlMasked: this.maskRtspUrl(updated.rtspUrl),
            endpoints: this.getStreamEndpoints(updated.streamKey),
        };
    }

    static async deleteCamera(id: string) {
        return prisma.camera.delete({
            where: { id },
        });
    }

    static async toggleCamera(id: string, enabled: boolean) {
        const camera = await prisma.camera.update({
            where: { id },
            data: {
                enabled,
                status: enabled ? 'OFFLINE' : 'DISABLED',
            },
        });

        await prisma.cctvAlert.create({
            data: {
                cameraId: id,
                eventType: enabled ? 'CAMERA_ENABLED' : 'CAMERA_DISABLED',
                severity: 'INFO',
                message: `Camera ${camera.name} was ${enabled ? 'enabled' : 'disabled'}`,
            },
        });

        return camera;
    }

    /**
     * Lightweight connection test for RTSP camera endpoint without heavy video decoding.
     * Parses the host & port and performs a socket handshake.
     */
    static async testConnection(rtspUrl: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
        const startTime = Date.now();

        try {
            // Parse RTSP URL e.g. rtsp://user:pass@127.0.0.1:8554/live/path
            const match = rtspUrl.match(/rtsp:\/\/(?:[^@]+@)?([^:/]+)(?::(\d+))?/i);
            if (!match) {
                return {
                    success: false,
                    message: 'Invalid RTSP URL format. Example: rtsp://localhost:8554/live/camera-1',
                    latencyMs: 0,
                };
            }

            const host = match[1];
            const port = match[2] ? parseInt(match[2], 10) : 554;

            return new Promise((resolve) => {
                const socket = new net.Socket();
                socket.setTimeout(3500);

                socket.on('connect', () => {
                    const latencyMs = Date.now() - startTime;
                    socket.destroy();
                    resolve({
                        success: true,
                        message: `Camera endpoint reachable at ${host}:${port} (${latencyMs}ms)`,
                        latencyMs,
                    });
                });

                socket.on('timeout', () => {
                    socket.destroy();
                    resolve({
                        success: false,
                        message: `Connection timed out connecting to ${host}:${port}`,
                        latencyMs: Date.now() - startTime,
                    });
                });

                socket.on('error', (err) => {
                    socket.destroy();
                    resolve({
                        success: false,
                        message: `Unable to connect to ${host}:${port}: ${err.message}`,
                        latencyMs: Date.now() - startTime,
                    });
                });

                socket.connect(port, host);
            });
        } catch (error: any) {
            return {
                success: false,
                message: `Connection test error: ${error.message}`,
                latencyMs: Date.now() - startTime,
            };
        }
    }
}
