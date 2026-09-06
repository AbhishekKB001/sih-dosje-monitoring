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
// Create surprise VC call session routed to designated Project Incharge
router.post('/sessions', optionalAuthenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { inspectionId, participantUserId, hostUserId, projectId, instituteId } = req.body;
    const sessionNumber = `VC-DOSJE-${Math.floor(100 + Math.random() * 900)}`;

    const hostId = req.user?.id || hostUserId || 'USR-ADMIN-01';

    // Canonical Project Incharge resolution: Project -> Institute -> Incharge User
    let targetInstitute = null;
    if (instituteId) {
      targetInstitute = await prisma.institute.findUnique({
        where: { id: instituteId },
        include: { project: true, inchargeUser: true },
      });
    } else if (projectId) {
      targetInstitute = await prisma.institute.findFirst({
        where: { projectId },
        include: { project: true, inchargeUser: true },
      });
    } else if (inspectionId) {
      const insp = await prisma.inspection.findUnique({
        where: { id: inspectionId },
        include: { institute: { include: { project: true, inchargeUser: true } } },
      });
      targetInstitute = insp?.institute;
    }

    let finalParticipantId = participantUserId;
    if (!finalParticipantId && targetInstitute?.inchargeUserId) {
      finalParticipantId = targetInstitute.inchargeUserId;
    } else if (!finalParticipantId && targetInstitute?.inchargeUser?.id) {
      finalParticipantId = targetInstitute.inchargeUser.id;
    }

    // Fallback: designated Demo Incharge A or any Agency Representative
    if (!finalParticipantId) {
      const fallbackUser = await prisma.user.findFirst({
        where: { role: 'AGENCY_REPRESENTATIVE' },
      });
      finalParticipantId = fallbackUser?.id || null;
    }

    // Real Jitsi WebRTC room conference bridge
    const meetingUrl = `https://meet.jit.si/dosje-surveillance-${sessionNumber.toLowerCase()}`;

    const session = await prisma.vCSession.create({
      data: {
        sessionNumber,
        inspectionId: inspectionId || null,
        scheduledTime: new Date(),
        hostUserId: hostId,
        participantUserId: finalParticipantId,
        projectId: targetInstitute?.projectId || projectId || null,
        instituteId: targetInstitute?.id || instituteId || null,
        status: 'PENDING',
        meetingUrl,
      },
      include: {
        hostUser: { select: { id: true, name: true, role: true } },
        participantUser: { select: { id: true, name: true, role: true } },
        inspection: { include: { institute: true } },
      },
    });

    await recordAuditLog({
      userId: hostId,
      userRole: req.user?.role,
      action: 'INITIATE_SURPRISE_VC',
      entity: 'VC_SESSION',
      entityId: session.id,
      details: `Initiated surprise video conference session ${sessionNumber} to Project Incharge (${session.participantUser?.name || 'Unassigned'}) for ${targetInstitute?.name || 'Institute'}`,
    });

    res.status(201).json({
      success: true,
      message: 'Surprise Video Conference session initiated (Project Incharge Routed)',
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

// GET /api/vc/incoming - Poll for active incoming calls targeted at logged-in user
router.get('/incoming', optionalAuthenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      res.json({ success: true, activeCall: null });
      return;
    }

    // Look for pending/active calls for this user within the last 45 seconds
    const cutoff = new Date(Date.now() - 45 * 1000);
    const session = await prisma.vCSession.findFirst({
      where: {
        participantUserId: userId,
        status: { in: ['PENDING', 'ACTIVE'] },
        createdAt: { gte: cutoff },
      },
      include: {
        hostUser: { select: { id: true, name: true, role: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      res.json({ success: true, activeCall: null });
      return;
    }

    let instituteName = 'Monitored Center';
    let projectName = 'DoSJE Scheme Welfare Project';
    if (session.instituteId) {
      const inst = await prisma.institute.findUnique({
        where: { id: session.instituteId },
        include: { project: true },
      });
      if (inst) {
        instituteName = inst.name;
        projectName = inst.project?.name || projectName;
      }
    }

    res.json({
      success: true,
      activeCall: {
        id: session.id,
        sessionNumber: session.sessionNumber,
        callerName: session.hostUser?.name || 'DoSJE Department Official',
        callerRole: session.hostUser?.role || 'ADMIN',
        callerDepartment: session.hostUser?.department || 'Central Monitoring & Evaluation',
        projectName,
        instituteName,
        meetingUrl: session.meetingUrl,
        createdAt: session.createdAt,
        status: session.status,
      },
    });
  } catch (err: any) {
    console.error('Incoming VC error:', err);
    res.status(500).json({ success: false, message: 'Failed to check incoming calls' });
  }
});

// POST /api/vc/sessions/random - Random project selection and targeted Project Incharge dispatch
router.post('/sessions/random', optionalAuthenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { inspectionId, initiatedById, projectId, instituteId } = req.body;

    // Pick target institute: specific if requested, otherwise random active institute
    let targetInstitute = null;
    if (instituteId) {
      targetInstitute = await prisma.institute.findUnique({
        where: { id: instituteId },
        include: { project: true, inchargeUser: true },
      });
    } else if (projectId) {
      targetInstitute = await prisma.institute.findFirst({
        where: { projectId },
        include: { project: true, inchargeUser: true },
      });
    } else {
      const institutes = await prisma.institute.findMany({
        where: { active: true },
        include: { project: true, inchargeUser: true },
      });
      if (institutes.length > 0) {
        targetInstitute = institutes[Math.floor(Math.random() * institutes.length)];
      }
    }

    if (!targetInstitute) {
      res.status(400).json({ success: false, message: 'No institute found for VC audit' });
      return;
    }

    // Strictly resolve Project Incharge for the selected institute
    let selectedParticipant = targetInstitute.inchargeUser;
    if (!selectedParticipant && targetInstitute.inchargeUserId) {
      selectedParticipant = await prisma.user.findUnique({ where: { id: targetInstitute.inchargeUserId } });
    }
    if (!selectedParticipant) {
      selectedParticipant = await prisma.user.findFirst({ where: { role: 'AGENCY_REPRESENTATIVE' } });
    }

    const sessionNumber = `VC-RND-${Math.floor(1000 + Math.random() * 9000)}`;
    const hostId = req.user?.id || initiatedById || 'USR-ADMIN-01';

    const meetingUrl = `https://meet.jit.si/dosje-surveillance-${sessionNumber.toLowerCase()}`;

    const session = await prisma.vCSession.create({
      data: {
        sessionNumber,
        inspectionId: inspectionId || null,
        projectId: targetInstitute.projectId,
        instituteId: targetInstitute.id,
        scheduledTime: new Date(),
        hostUserId: hostId,
        participantUserId: selectedParticipant ? selectedParticipant.id : null,
        status: 'PENDING',
        meetingUrl,
      },
      include: {
        hostUser: { select: { id: true, name: true, role: true } },
        participantUser: { select: { id: true, name: true, role: true } },
        inspection: { include: { institute: true } },
      },
    });

    await recordAuditLog({
      userId: hostId,
      userRole: req.user?.role,
      action: 'RANDOM_VC_INITIATED',
      entity: 'VC_SESSION',
      entityId: session.id,
      details: `Dispatched surprise VC ${sessionNumber} to Incharge ${selectedParticipant?.name} for project ${targetInstitute.project?.name || targetInstitute.name}`,
    });

    res.status(201).json({
      success: true,
      message: `Surprise VC call dispatched to ${targetInstitute.name} Incharge`,
      data: session,
      session,
      targetInstitute: {
        id: targetInstitute.id,
        name: targetInstitute.name,
        projectName: targetInstitute.project?.name,
      },
      participant: selectedParticipant,
      meetingUrl,
    });
  } catch (err: any) {
    console.error('Random VC session error:', err);
    res.status(500).json({ success: false, message: 'Failed to initiate random VC session' });
  }
});

// POST /api/vc/sessions/:id/accept
router.post('/sessions/:id/accept', optionalAuthenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const session = await prisma.vCSession.update({
      where: { id: req.params.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
      include: {
        hostUser: { select: { id: true, name: true } },
        participantUser: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      userId: req.user?.id || session.participantUserId || undefined,
      userRole: req.user?.role || 'AGENCY_REPRESENTATIVE',
      action: 'ACCEPT_VC_CALL',
      entity: 'VC_SESSION',
      entityId: session.id,
      details: `Project Incharge accepted video conference session ${session.sessionNumber}`,
    });

    res.json({ success: true, session, meetingUrl: session.meetingUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to accept VC call' });
  }
});

// POST /api/vc/sessions/:id/reject
router.post('/sessions/:id/reject', optionalAuthenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { reason } = req.body;
    const session = await prisma.vCSession.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        endedAt: new Date(),
        result: 'REJECTED',
        notes: reason || 'Call declined or timed out',
      },
    });

    await recordAuditLog({
      userId: req.user?.id || session.participantUserId || undefined,
      userRole: req.user?.role || 'AGENCY_REPRESENTATIVE',
      action: 'REJECT_VC_CALL',
      entity: 'VC_SESSION',
      entityId: session.id,
      details: `VC session ${session.sessionNumber} was rejected: ${reason || 'User declined'}`,
    });

    res.json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to reject VC call' });
  }
});

// PATCH /api/vc/sessions/:id
router.patch('/sessions/:id', async (req, res): Promise<void> => {
  try {
    const { status, recordingUrl, result, notes } = req.body;
    const session = await prisma.vCSession.update({
      where: { id: req.params.id },
      data: {
        status: status ? String(status).toUpperCase() : undefined,
        recordingUrl: recordingUrl || undefined,
        result: result || undefined,
        notes: notes || undefined,
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
router.post('/sessions/:id/result', optionalAuthenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { result, notes, durationSeconds } = req.body;
    const existing = await prisma.vCSession.findUnique({ where: { id: req.params.id } });

    let computedDuration = durationSeconds ? Number(durationSeconds) : null;
    if (!computedDuration && existing?.acceptedAt) {
      computedDuration = Math.round((Date.now() - existing.acceptedAt.getTime()) / 1000);
    }

    const session = await prisma.vCSession.update({
      where: { id: req.params.id },
      data: {
        status: result === 'VERIFIED' ? 'ENDED' : 'MISSED',
        endedAt: new Date(),
        result: result || 'VERIFIED',
        notes: notes || undefined,
        durationSeconds: computedDuration,
      },
    });

    await recordAuditLog({
      userId: req.user?.id || existing?.hostUserId || undefined,
      userRole: req.user?.role || 'ADMIN',
      action: 'COMPLETE_VC_AUDIT',
      entity: 'VC_SESSION',
      entityId: session.id,
      details: `Recorded result '${result}' for VC session ${session.sessionNumber}. Duration: ${computedDuration || 0}s`,
    });

    res.json({ success: true, data: session, session, result, notes, durationSeconds: computedDuration });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record VC verification result' });
  }
});

export default router;
