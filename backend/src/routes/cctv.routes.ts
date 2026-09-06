import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

// POST /api/cctv/cameras/:id/ptz
// Pan-Tilt-Zoom telemetry control abstraction
router.post('/cameras/:id/ptz', optionalAuthenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { action, pan, tilt, zoom } = req.body;
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id: req.params.id }, { cameraId: req.params.id }] },
      include: { institute: true },
    });

    if (!camera) {
      res.status(404).json({ success: false, message: 'Camera not found' });
      return;
    }

    const command = action || 'RESET';
    const currentCoords = {
      pan: typeof pan === 'number' ? pan : 0.0,
      tilt: typeof tilt === 'number' ? tilt : 0.0,
      zoom: typeof zoom === 'number' ? zoom : 1.0,
    };

    // Calculate step movement based on action
    switch (command.toUpperCase()) {
      case 'PAN_LEFT':
        currentCoords.pan = Math.max(-180, currentCoords.pan - 15);
        break;
      case 'PAN_RIGHT':
        currentCoords.pan = Math.min(180, currentCoords.pan + 15);
        break;
      case 'TILT_UP':
        currentCoords.tilt = Math.min(90, currentCoords.tilt + 10);
        break;
      case 'TILT_DOWN':
        currentCoords.tilt = Math.max(-45, currentCoords.tilt - 10);
        break;
      case 'ZOOM_IN':
        currentCoords.zoom = Math.min(10.0, Math.round((currentCoords.zoom + 0.5) * 10) / 10);
        break;
      case 'ZOOM_OUT':
        currentCoords.zoom = Math.max(1.0, Math.round((currentCoords.zoom - 0.5) * 10) / 10);
        break;
      case 'RESET':
        currentCoords.pan = 0.0;
        currentCoords.tilt = 0.0;
        currentCoords.zoom = 1.0;
        break;
    }

    await recordAuditLog({
      userId: req.user?.id,
      userRole: req.user?.role || 'OPERATOR',
      action: 'PTZ_CAMERA_COMMAND',
      entity: 'CAMERA',
      entityId: camera.id,
      details: `PTZ action '${command}' dispatched for camera ${camera.cameraId} (${camera.name}). New coordinates: Pan ${currentCoords.pan}°, Tilt ${currentCoords.tilt}°, Zoom ${currentCoords.zoom}x`,
    });

    res.json({
      success: true,
      cameraId: camera.cameraId,
      cameraName: camera.name,
      command,
      capability: 'SIMULATED_ONVIF_PROFILE_S',
      isPhysicalHardwareConnected: false,
      ptzSupported: true,
      currentPosition: currentCoords,
      ptz: currentCoords,
      status: 'EXECUTED_VIA_TELEMETRY_BRIDGE',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('PTZ error:', err);
    res.status(500).json({ success: false, message: 'Failed to execute PTZ command' });
  }
});

// POST /api/cctv/cameras/:id/record
// On-demand video clip recording trigger for incident preservation
router.post('/cameras/:id/record', optionalAuthenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { action, durationSec } = req.body;
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id: req.params.id }, { cameraId: req.params.id }] },
      include: { institute: true },
    });

    if (!camera) {
      res.status(404).json({ success: false, message: 'Camera not found' });
      return;
    }

    const isStart = (action || 'START').toUpperCase() === 'START';
    const clipDuration = Number(durationSec) || 60;
    const clipId = `REC-${camera.cameraId}-${Date.now()}`;
    const clipRelativePath = `/data/evidence/clips/${clipId}.mp4`;
    const clipsDir = path.resolve(__dirname, '../../data/evidence/clips');
    const clipFullPath = path.join(clipsDir, `${clipId}.mp4`);

    let clipHash = '';
    let isFileGenerated = false;

    if (isStart) {
      fs.mkdirSync(clipsDir, { recursive: true });
      const demoSource = path.resolve(__dirname, '../../data/demo_cctv.mp4');
      if (fs.existsSync(demoSource)) {
        fs.copyFileSync(demoSource, clipFullPath);
        const buffer = fs.readFileSync(clipFullPath);
        clipHash = crypto.createHash('sha256').update(buffer).digest('hex');
        isFileGenerated = true;
      }
    }

    await recordAuditLog({
      userId: req.user?.id,
      userRole: req.user?.role || 'OPERATOR',
      action: isStart ? 'START_CAMERA_RECORDING' : 'STOP_CAMERA_RECORDING',
      entity: 'CAMERA',
      entityId: camera.id,
      details: `${isStart ? 'Started' : 'Stopped'} incident clip recording (${clipId}) on ${camera.cameraId}. Duration: ${clipDuration}s. File generated: ${isFileGenerated}`,
    });

    res.json({
      success: true,
      cameraId: camera.cameraId,
      cameraName: camera.name,
      clipId,
      isRecording: isStart,
      recording: isStart,
      durationSec: clipDuration,
      storagePath: clipRelativePath,
      isFileGenerated,
      sha256Hash: clipHash,
      message: isStart ? 'Real demo incident clip recording initiated and stored in vault' : 'Recording stopped and sealed',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Record error:', err);
    res.status(500).json({ success: false, message: 'Failed to toggle recording' });
  }
});

export default router;
