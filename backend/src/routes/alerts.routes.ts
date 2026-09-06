import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthenticateToken } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

function formatAlert(a: any) {
  let status: 'open' | 'acknowledged' | 'resolved' = 'open';
  if (a.resolved) status = 'resolved';
  else if (a.acknowledged) status = 'acknowledged';

  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  };

  const typeMap: Record<string, string> = {
    HEADCOUNT_ANOMALY: 'attendance_anomaly',
    ATTENDANCE_DISCREPANCY: 'attendance_anomaly',
    CCTV_OFFLINE: 'cctv_offline',
    CAMERA_OBSTRUCTION: 'cctv_offline',
    RESTRICTED_ZONE_BREACH: 'high_risk_project',
    LOITERING: 'inspection_anomaly',
    OFF_HOURS_ACTIVITY: 'inspection_anomaly',
    UNATTENDED_ROOM: 'follow_up_required',
  };

  const formattedType = typeMap[a.type] || 'attendance_anomaly';

  return {
    id: a.id,
    alertId: a.alertId,
    alert_id: a.alertId,
    type: formattedType,
    rawType: a.type,
    alertType: a.type,
    alert_type: a.type,
    severity: severityMap[a.severity] || 'medium',
    rawSeverity: a.severity,
    title: `${a.type.replace(/_/g, ' ')}`,
    description: a.description,
    explanation: a.description,
    project: a.institute?.project?.name || 'DoSJE Welfare Scheme',
    district: a.institute?.district || 'Central District',
    time: a.timestamp.toISOString(),
    timestampUtc: a.timestamp.getTime() / 1000,
    status,
    lifecycleState: status.toUpperCase(),
    lifecycle_state: status.toUpperCase(),
    cameraId: a.cameraId,
    camera_id: a.cameraId,
    cameraCode: a.camera?.cameraId || a.cameraId,
    instituteId: a.instituteId,
    institution_id: a.instituteId,
    instituteName: a.institute?.name || 'Center Under Monitoring',
    zone: a.zone || a.camera?.zone || 'ENTRY',
    confidence: a.confidence || 0.88,
    frameSnapshotUrl: a.frameSnapshotUrl || `/api/evidence/${a.id}`,
    evidenceSnapshotId: a.frameSnapshotUrl,
    evidence_snapshot_id: a.frameSnapshotUrl,
    acknowledged: a.acknowledged,
    acknowledgedBy: a.acknowledgedBy,
    acknowledged_by: a.acknowledgedBy,
    acknowledgedAt: a.acknowledgedAt ? a.acknowledgedAt.toISOString() : null,
    resolved: a.resolved,
    resolvedBy: a.resolutionNotes,
    resolved_by: a.resolutionNotes,
    resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
    resolutionNotes: a.resolutionNotes,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

// GET /api/alerts
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const { status, severity, cameraId, instituteId } = req.query;
    const where: any = {};
    if (status === 'open') {
      where.resolved = false;
      where.acknowledged = false;
    } else if (status === 'acknowledged') {
      where.acknowledged = true;
      where.resolved = false;
    } else if (status === 'resolved') {
      where.resolved = true;
    }

    if (severity) where.severity = String(severity).toUpperCase();
    if (cameraId) where.cameraId = String(cameraId);
    if (instituteId) where.instituteId = String(instituteId);

    const alerts = await prisma.aIAlert.findMany({
      where,
      include: {
        institute: { include: { project: true } },
        camera: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    res.json(alerts.map(formatAlert));
  } catch (err) {
    console.error('Alerts GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

// GET /api/alerts/:id
router.get('/:id', optionalAuthenticateToken, async (req, res): Promise<void> => {
  try {
    const alert = await prisma.aIAlert.findFirst({
      where: { OR: [{ id: req.params.id }, { alertId: req.params.id }] },
      include: {
        institute: { include: { project: true } },
        camera: true,
      },
    });

    if (!alert) {
      res.status(404).json({ success: false, message: 'Alert not found' });
      return;
    }

    res.json(formatAlert(alert));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch alert' });
  }
});

// POST /api/alerts
// AI Subsystem webhook integration endpoint
router.post('/', async (req, res): Promise<void> => {
  try {
    const body = req.body;
    const alertId = body.alert_id || body.alertId || `ALT-${Date.now().toString().slice(-6)}`;
    const cameraId = body.camera_id || body.cameraId;
    let instituteId = body.institution_id || body.instituteId;
    const alertType = body.alert_type || body.alertType || body.type || 'RESTRICTED_ZONE_BREACH';
    const severity = (body.severity || 'HIGH').toUpperCase();
    const description =
      body.explanation ||
      body.description ||
      body.title ||
      'Observed telemetry variance in monitored facility. Verification recommended.';
    const zone = body.zone || 'SECURED_ZONE';
    const detectedCount = body.detected_count || body.detectedCount;
    const expectedCount = body.expected_count || body.expectedCount;
    const confidence = body.confidence || 0.88;
    const frameSnapshotUrl = body.evidence_snapshot_id || body.frameSnapshotUrl;

    // Resolve camera and institute UUID foreign keys
    let resolvedCameraUuid: string | null = null;
    if (cameraId) {
      const cam = await prisma.camera.findFirst({
        where: { OR: [{ id: cameraId }, { cameraId: cameraId }] },
      });
      if (cam) {
        resolvedCameraUuid = cam.id;
        if (!instituteId) instituteId = cam.instituteId;
      }
    }

    if (instituteId) {
      const inst = await prisma.institute.findFirst({
        where: { OR: [{ id: instituteId }, { code: instituteId }] },
      });
      if (inst) instituteId = inst.id;
    }

    if (!instituteId) {
      const firstInst = await prisma.institute.findFirst();
      instituteId = firstInst ? firstInst.id : '';
    }

    // Upsert alert
    const alert = await prisma.aIAlert.upsert({
      where: { alertId },
      create: {
        alertId,
        cameraId: resolvedCameraUuid,
        instituteId,
        type: alertType,
        severity,
        description,
        zone,
        detectedCount: detectedCount ? Number(detectedCount) : null,
        expectedCount: expectedCount ? Number(expectedCount) : null,
        confidence: Number(confidence) || 0.88,
        frameSnapshotUrl: frameSnapshotUrl || null,
        acknowledged: false,
        resolved: false,
      },
      update: {
        description,
        detectedCount: detectedCount ? Number(detectedCount) : undefined,
      },
      include: {
        institute: { include: { project: true } },
        camera: true,
      },
    });

    // Notify all admins and PMU inspectors of critical/high alert
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      const alertRecipients = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'PMU', 'INSPECTOR'] }, active: true },
        take: 5,
      });

      for (const recipient of alertRecipients) {
        await prisma.notification.create({
          data: {
            userId: recipient.id,
            title: `🚨 ${severity} Alert: ${alertType.replace(/_/g, ' ')}`,
            message: `${description} (${alert.institute.name})`,
            type: 'ALERT',
            link: `/alerts/${alert.id}`,
          },
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Alert registered successfully',
      alert: formatAlert(alert),
    });
  } catch (err: any) {
    console.error('Alert create error:', err);
    res.status(500).json({ success: false, message: 'Failed to record AI alert' });
  }
});

// PATCH /api/alerts/:id (Used by React Admin Dashboard)
router.patch('/:id', async (req, res): Promise<void> => {
  try {
    const { status, notes, user_id, user } = req.body;
    const alert = await prisma.aIAlert.findFirst({
      where: { OR: [{ id: req.params.id }, { alertId: req.params.id }] },
    });

    if (!alert) {
      res.status(404).json({ success: false, message: 'Alert not found' });
      return;
    }

    const isResolved = status === 'resolved';
    const isAcknowledged = status === 'acknowledged' || isResolved;
    const operator = user_id || user || 'HQ Supervisor';

    const updated = await prisma.aIAlert.update({
      where: { id: alert.id },
      data: {
        acknowledged: isAcknowledged,
        acknowledgedBy: isAcknowledged ? operator : alert.acknowledgedBy,
        acknowledgedAt: isAcknowledged ? new Date() : alert.acknowledgedAt,
        resolved: isResolved,
        resolvedAt: isResolved ? new Date() : alert.resolvedAt,
        resolutionNotes: notes || (isResolved ? `Resolved by ${operator}` : alert.resolutionNotes),
      },
      include: {
        institute: { include: { project: true } },
        camera: true,
      },
    });

    await recordAuditLog({
      action: isResolved ? 'RESOLVE_ALERT' : 'ACKNOWLEDGE_ALERT',
      entity: 'AI_ALERT',
      entityId: alert.id,
      details: `Alert ${alert.alertId} marked ${status} by ${operator}`,
    });

    res.json({ success: true, alert: formatAlert(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update alert' });
  }
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', async (req, res): Promise<void> => {
  try {
    const { user_id, notes } = req.body;
    const alert = await prisma.aIAlert.findFirst({
      where: { OR: [{ id: req.params.id }, { alertId: req.params.id }] },
    });

    if (!alert) {
      res.status(404).json({ success: false, message: 'Alert not found' });
      return;
    }

    const updated = await prisma.aIAlert.update({
      where: { id: alert.id },
      data: {
        acknowledged: true,
        acknowledgedBy: user_id || 'supervisor_demo',
        acknowledgedAt: new Date(),
        resolutionNotes: notes || alert.resolutionNotes,
      },
      include: {
        institute: { include: { project: true } },
        camera: true,
      },
    });

    res.json(formatAlert(updated));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to acknowledge alert' });
  }
});

// POST /api/alerts/:id/resolve
router.post('/:id/resolve', async (req, res): Promise<void> => {
  try {
    const { user_id, notes } = req.body;
    const alert = await prisma.aIAlert.findFirst({
      where: { OR: [{ id: req.params.id }, { alertId: req.params.id }] },
    });

    if (!alert) {
      res.status(404).json({ success: false, message: 'Alert not found' });
      return;
    }

    const updated = await prisma.aIAlert.update({
      where: { id: alert.id },
      data: {
        acknowledged: true,
        resolved: true,
        resolvedAt: new Date(),
        resolutionNotes: notes || `Resolved by ${user_id || 'supervisor_demo'}`,
      },
      include: {
        institute: { include: { project: true } },
        camera: true,
      },
    });

    res.json(formatAlert(updated));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resolve alert' });
  }
});

export default router;
