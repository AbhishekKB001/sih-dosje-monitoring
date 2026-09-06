import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CctvService } from './cctv.service.js';
import { prisma } from '../../prisma.js';

export const cctvRouter = Router();

const createCameraSchema = z.object({
    name: z.string().min(2, 'Camera name must be at least 2 characters'),
    location: z.string().min(2, 'Location is required'),
    projectId: z.string().uuid('Valid Project ID is required'),
    rtspUrl: z.string().regex(/^rtsp:\/\/.+/i, 'URL must start with rtsp://'),
    streamKey: z.string().optional(),
    protocol: z.string().default('RTSP'),
    enabled: z.boolean().default(true),
});

const updateCameraSchema = z.object({
    name: z.string().min(2).optional(),
    location: z.string().min(2).optional(),
    rtspUrl: z.string().regex(/^rtsp:\/\/.+/i).optional(),
    enabled: z.boolean().optional(),
});

// GET /api/cameras - List all cameras
cctvRouter.get('/cameras', async (req: Request, res: Response) => {
    try {
        const projectId = req.query.projectId as string | undefined;
        const cameras = await CctvService.listCameras(projectId);
        res.json({ success: true, count: cameras.length, data: cameras });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/cameras - Register a new camera
cctvRouter.post('/cameras', async (req: Request, res: Response) => {
    try {
        const parsed = createCameraSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.format() });
        }

        const camera = await CctvService.createCamera(parsed.data);
        res.status(201).json({ success: true, data: camera });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/cameras/test-connection - Test arbitrary RTSP URL
cctvRouter.post('/cameras/test-connection', async (req: Request, res: Response) => {
    try {
        const { rtspUrl } = req.body;
        if (!rtspUrl) {
            return res.status(400).json({ success: false, message: 'rtspUrl is required' });
        }

        const result = await CctvService.testConnection(rtspUrl);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/cameras/:id - Get camera by ID
cctvRouter.get('/cameras/:id', async (req: Request, res: Response) => {
    try {
        const camera = await CctvService.getCameraById(req.params.id);
        if (!camera) {
            return res.status(404).json({ success: false, message: 'Camera not found' });
        }
        res.json({ success: true, data: camera });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/cameras/:id - Update camera
cctvRouter.put('/cameras/:id', async (req: Request, res: Response) => {
    try {
        const parsed = updateCameraSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.format() });
        }

        const camera = await CctvService.updateCamera(req.params.id, parsed.data);
        res.json({ success: true, data: camera });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/cameras/:id - Delete camera
cctvRouter.delete('/cameras/:id', async (req: Request, res: Response) => {
    try {
        await CctvService.deleteCamera(req.params.id);
        res.json({ success: true, message: 'Camera deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/cameras/:id/stream - Get playback stream URLs
cctvRouter.get('/cameras/:id/stream', async (req: Request, res: Response) => {
    try {
        const camera = await CctvService.getCameraById(req.params.id);
        if (!camera) {
            return res.status(404).json({ success: false, message: 'Camera not found' });
        }

        res.json({
            success: true,
            cameraId: camera.id,
            name: camera.name,
            status: camera.status,
            streamEndpoints: camera.endpoints,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/cameras/:id/test - Test connection for specific camera
cctvRouter.post('/cameras/:id/test', async (req: Request, res: Response) => {
    try {
        const camera = await prisma.camera.findUnique({ where: { id: req.params.id } });
        if (!camera) {
            return res.status(404).json({ success: false, message: 'Camera not found' });
        }

        const result = await CctvService.testConnection(camera.rtspUrl);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/cameras/:id/enable - Enable camera
cctvRouter.post('/cameras/:id/enable', async (req: Request, res: Response) => {
    try {
        const camera = await CctvService.toggleCamera(req.params.id, true);
        res.json({ success: true, data: camera });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/cameras/:id/disable - Disable camera
cctvRouter.post('/cameras/:id/disable', async (req: Request, res: Response) => {
    try {
        const camera = await CctvService.toggleCamera(req.params.id, false);
        res.json({ success: true, data: camera });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/alerts - List CCTV alerts
cctvRouter.get('/alerts', async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
        const alerts = await prisma.cctvAlert.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                camera: {
                    select: { id: true, name: true, location: true, projectId: true },
                },
            },
        });

        res.json({ success: true, count: alerts.length, data: alerts });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/alerts/:id/read - Mark alert read
cctvRouter.post('/alerts/:id/read', async (req: Request, res: Response) => {
    try {
        const alert = await prisma.cctvAlert.update({
            where: { id: req.params.id },
            data: { isRead: true },
        });
        res.json({ success: true, data: alert });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/alerts/ai-event - Integration endpoint for AI detection models
cctvRouter.post('/alerts/ai-event', async (req: Request, res: Response) => {
    try {
        const { cameraId, eventType, message, severity, metadata } = req.body;
        if (!cameraId || !message) {
            return res.status(400).json({ success: false, message: 'cameraId and message are required' });
        }

        const alert = await prisma.cctvAlert.create({
            data: {
                cameraId,
                eventType: eventType || 'AI_DETECTION',
                severity: severity || 'WARNING',
                message,
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        });

        res.status(201).json({ success: true, data: alert });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});
