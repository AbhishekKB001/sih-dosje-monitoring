import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthenticateToken, authenticateToken } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { AuthenticatedRequest } from '../types';

const router = Router();

// GET /api/vc/sessions
router.get('/sessions', optionalAuthenticateToken, async (req, res) => {
  try {
    const { status, inspectionId } = req.query;
    const where: any = {};
    if (status) where.status = String(status).toUpperCase();
    if (inspectionId) where.inspectionId = String(inspectionId);

    const sessions = await prisma.vCSession.findMany({
      where,
      include: {
        hostUser: { select: { id: true, name: true, email: true, role: true } },
        participantUser: { select: { id: true, name: true, email: true, role: true } },
        inspection: { include: { institute: true } },
      },
      orderBy: { scheduledTime: 'desc' },
    });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch VC sessions' });
  }
});

// POST /api/vc/sessions
// Create surprise VC call session
router.post('/sessions', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { inspectionId, participantUserId, hostUserId } = req.body;
    const sessionNumber = `VC-DOSJE-${Math.floor(100 + Math.random() * 900)}`;

    const hostId = req.user?.id || hostUserId;
    if (!hostId) {
      res.status(400).json({ success: false, message: 'Host user ID is required' });
      return;
    }

    // Demo WebRTC meeting room (clearly labelled simulated/demo conference bridge)
    const meetingUrl = `https://meet.jit.si/dosje-surveillance-${sessionNumber.toLowerCase()}`;

    const session = await prisma.vCSession.create({
      data: {
        sessionNumber,
        inspectionId: inspectionId || null,
        scheduledTime: new Date(),
        hostUserId: hostId,
        participantUserId: participantUserId || null,
        status: 'ACTIVE',
        meetingUrl,
      },
      include: {
        hostUser: { select: { id: true, name: true, role: true } },
        inspection: { include: { institute: true } },
      },
    });

    await recordAuditLog({
      userId: hostId,
      userRole: req.user?.role,
      action: 'INITIATE_SURPRISE_VC',
      entity: 'VC_SESSION',
      entityId: session.id,
      details: `Initiated surprise video conference session ${sessionNumber}`,
    });

    res.status(201).json({
      success: true,
      message: 'Surprise Video Conference session initiated (Demo Bridge Active)',
      session,
    });
  } catch (err: any) {
    console.error('VC session create error:', err);
    res.status(500).json({ success: false, message: 'Failed to initiate video conference' });
  }
});

// GET /api/vc/ice-servers - Provide STUN/TURN servers to WebRTC clients
router.get('/ice-servers', (req, res) => {
  const stun = process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302';
  const turn = process.env.TURN_SERVER_URL;
  const username = process.env.TURN_USERNAME;
  const credential = process.env.TURN_PASSWORD;

  const iceServers: any[] = [{ urls: stun }];
  if (turn) {
    iceServers.push({
      urls: turn,
      username: username || undefined,
      credential: credential || undefined,
    });
  }
  res.json({ success: true, iceServers });
});

// POST /api/vc/sessions/random - Random participant selection and session dispatch
router.post('/sessions/random', optionalAuthenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { inspectionId, initiatedById, eligibleRoles } = req.body;

    const roles = eligibleRoles && eligibleRoles.length > 0 ? eligibleRoles : ['PROJECT_INCHARGE', 'STAFF', 'ADMIN'];
    const candidates = await prisma.user.findMany({
      where: { role: { in: roles } },
      take: 20,
    });

    let selectedParticipant = null;
    if (candidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      selectedParticipant = candidates[randomIndex];
    }

    const sessionNumber = `VC-RND-${Math.floor(1000 + Math.random() * 9000)}`;
    const hostId = req.user?.id || initiatedById || (candidates[0] ? candidates[0].id : undefined);

    if (!hostId) {
      res.status(400).json({ success: false, message: 'Host user ID required' });
      return;
    }

    const meetingUrl = `https://meet.jit.si/dosje-surveillance-${sessionNumber.toLowerCase()}`;

    const session = await prisma.vCSession.create({
      data: {
        sessionNumber,
        inspectionId: inspectionId || null,
        scheduledTime: new Date(),
        hostUserId: hostId,
        participantUserId: selectedParticipant ? selectedParticipant.id : null,
        status: 'ACTIVE',
        meetingUrl,
      },
      include: {
        hostUser: { select: { id: true, name: true, role: true } },
        participantUser: { select: { id: true, name: true, role: true } },
        inspection: { include: { institute: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Random participant VC session initiated',
      data: session,
      session,
      participant: selectedParticipant,
    });
  } catch (err: any) {
    console.error('Random VC session error:', err);
    res.status(500).json({ success: false, message: 'Failed to initiate random VC session' });
  }
});

// PATCH /api/vc/sessions/:id
router.patch('/sessions/:id', async (req, res): Promise<void> => {
  try {
    const { status, recordingUrl } = req.body;
    const session = await prisma.vCSession.update({
      where: { id: req.params.id },
      data: {
        status: status ? String(status).toUpperCase() : undefined,
        recordingUrl: recordingUrl || undefined,
      },
    });

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update VC session' });
  }
});

// POST /api/vc/sessions/:id/status
router.post('/sessions/:id/status', async (req, res): Promise<void> => {
  try {
    const { status } = req.body;
    const session = await prisma.vCSession.update({
      where: { id: req.params.id },
      data: { status: status ? String(status).toUpperCase() : undefined },
    });
    res.json({ success: true, data: session, session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update VC session status' });
  }
});

// POST /api/vc/sessions/:id/result
router.post('/sessions/:id/result', async (req, res): Promise<void> => {
  try {
    const { result, notes } = req.body;
    const session = await prisma.vCSession.update({
      where: { id: req.params.id },
      data: {
        status: result === 'VERIFIED' ? 'ENDED' : 'MISSED',
      },
    });
    res.json({ success: true, data: session, session, result, notes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record VC verification result' });
  }
});

export default router;
