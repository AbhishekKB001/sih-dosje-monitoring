import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthenticateToken, authenticateToken, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { AuthenticatedRequest } from '../types';

const router = Router();

function formatCamera(c: any) {
  const statusLower = c.status.toLowerCase() as 'online' | 'offline' | 'degraded';

  return {
    id: c.id,
    cameraId: c.cameraId,
    cameraCode: c.cameraId,
    name: c.name,
    institute: c.institute?.name || 'DoSJE Center',
    instituteName: c.institute?.name || 'DoSJE Center',
    instituteId: c.instituteId,
    schemeName: c.institute?.project?.scheme || 'SMILE',
    district: c.institute?.district || 'Central District',
    locationZone: c.zone,
    zone: c.zone,
    status: statusLower,
    rawStatus: c.status,
    streamUrl: c.rtspUrl,
    rtspUrl: c.rtspUrl,
    streamType: c.streamType,
    fps: c.fps || 25,
    resolution: c.resolution || '1920x1080',
    isPtzSupported: true,
    lastActiveAt: c.lastPing ? c.lastPing.toISOString() : new Date().toISOString(),
    lastPing: c.lastPing,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// GET /api/cctv/cameras (and aliased to /api/cameras)
router.get('/cameras', optionalAuthenticateToken, async (req, res) => {
  try {
    const { status, instituteId } = req.query;
    const where: any = {};
    if (status) where.status = String(status).toUpperCase();
    if (instituteId) where.instituteId = String(instituteId);

    const cameras = await prisma.camera.findMany({
      where,
      include: {
        institute: {
          include: { project: true },
        },
      },
      orderBy: { cameraId: 'asc' },
    });

    res.json(cameras.map(formatCamera));
  } catch (err) {
    console.error('Cameras GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch camera feeds' });
  }
});

// GET /api/cctv/cameras/:id
router.get('/cameras/:id', optionalAuthenticateToken, async (req, res): Promise<void> => {
  try {
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id: req.params.id }, { cameraId: req.params.id }] },
      include: { institute: { include: { project: true } } },
    });

    if (!camera) {
      res.status(404).json({ success: false, message: 'Camera feed not found' });
      return;
    }

    res.json(formatCamera(camera));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch camera details' });
  }
});

// POST /api/cctv/cameras
router.post('/cameras', authenticateToken, requireRole(['ADMIN', 'PMU']), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { cameraId, name, rtspUrl, instituteId, zone, streamType, fps, resolution } = req.body;

    if (!cameraId || !name || !instituteId || !zone) {
      res.status(400).json({ success: false, message: 'Missing required camera parameters' });
      return;
    }

    const newCam = await prisma.camera.create({
      data: {
        cameraId,
        name,
        rtspUrl: rtspUrl || `http://localhost:8000/api/v1/stream/${cameraId}`,
        streamType: streamType || 'SIMULATED',
        instituteId,
        zone,
        status: 'ONLINE',
        fps: Number(fps) || 25,
        resolution: resolution || '1920x1080',
        lastPing: new Date(),
      },
      include: { institute: { include: { project: true } } },
    });

    await recordAuditLog({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'REGISTER_CAMERA',
      entity: 'CAMERA',
      entityId: newCam.id,
      details: `Registered camera ${newCam.cameraId} (${newCam.name}) at institute ${newCam.institute?.name}`,
    });

    res.status(201).json(formatCamera(newCam));
  } catch (err: any) {
    console.error('Camera register error:', err);
    res.status(500).json({ success: false, message: 'Failed to register camera' });
  }
});

// POST /api/cctv/cameras/:id/ping (Heartbeat telemetry)
router.post('/cameras/:id/ping', async (req, res): Promise<void> => {
  try {
    const { status, fps, resolution } = req.body;
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id: req.params.id }, { cameraId: req.params.id }] },
    });

    if (!camera) {
      res.status(404).json({ success: false, message: 'Camera not found' });
      return;
    }

    const updated = await prisma.camera.update({
      where: { id: camera.id },
      data: {
        status: status ? String(status).toUpperCase() : 'ONLINE',
        fps: fps ? Number(fps) : camera.fps,
        resolution: resolution || camera.resolution,
        lastPing: new Date(),
      },
      include: { institute: { include: { project: true } } },
    });

    res.json(formatCamera(updated));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update camera heartbeat' });
  }
});

export default router;
