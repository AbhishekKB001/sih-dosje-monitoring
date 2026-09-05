import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthenticateToken, authenticateToken, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { AuthenticatedRequest } from '../types';

const router = Router();

function formatInstitute(inst: any) {
  const lastInspection = inst.inspections && inst.inspections[0];
  const riskScore = lastInspection?.riskScore || 0;

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (riskScore >= 70) riskLevel = 'high';
  else if (riskScore >= 40) riskLevel = 'medium';

  const totalCameras = inst.cameras?.length || 0;
  const onlineCameras = inst.cameras?.filter((c: any) => c.status === 'ONLINE').length || 0;

  let cctvStatus: 'online' | 'offline' | 'partial' | 'not_installed' = 'not_installed';
  if (totalCameras > 0) {
    if (onlineCameras === totalCameras) cctvStatus = 'online';
    else if (onlineCameras > 0) cctvStatus = 'partial';
    else cctvStatus = 'offline';
  }

  return {
    id: inst.id,
    code: inst.code,
    name: inst.name,
    type: inst.type,
    address: inst.address,
    state: inst.state,
    district: inst.district,
    lat: inst.latitude,
    lng: inst.longitude,
    latitude: inst.latitude,
    longitude: inst.longitude,
    geofenceRadiusMeters: inst.geofenceRadiusMeters || 100.0,
    project: inst.project?.name || 'General DoSJE Scheme',
    projectId: inst.projectId,
    scheme: inst.project?.scheme || 'SMILE',
    ngo: inst.contactPerson || 'DoSJE Partner Agency',
    inchargeName: inst.contactPerson || 'Center Administrator',
    inchargeContact: inst.contactPhone || '+91 98765 43210',
    staffCount: 12,
    beneficiaries: inst.project?.beneficiaryCount || 45,
    totalBeneficiaries: inst.project?.beneficiaryCount || 45,
    activeBeneficiaries: Math.round((inst.project?.beneficiaryCount || 45) * 0.88),
    cctvStatus,
    cctvActiveCount: onlineCameras,
    cctvTotalCount: totalCameras,
    riskLevel,
    isFlaggedForInspection: riskLevel === 'high' || totalCameras === 0,
    complianceScore: riskLevel === 'high' ? 62 : riskLevel === 'medium' ? 78 : 94,
    lastInspection: lastInspection?.completedDate ? lastInspection.completedDate.toISOString() : null,
    cameras: inst.cameras,
    active: inst.active,
    createdAt: inst.createdAt,
    updatedAt: inst.updatedAt,
  };
}

// GET /api/institutes
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const { district, state, type } = req.query;
    const where: any = { active: true };
    if (district) where.district = String(district);
    if (state) where.state = String(state);
    if (type) where.type = String(type);

    const institutes = await prisma.institute.findMany({
      where,
      include: {
        project: true,
        cameras: true,
        inspections: {
          orderBy: { scheduledDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(institutes.map(formatInstitute));
  } catch (err) {
    console.error('Institutes GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch institutes' });
  }
});

// GET /api/institutes/:id
router.get('/:id', optionalAuthenticateToken, async (req, res): Promise<void> => {
  try {
    const institute = await prisma.institute.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        cameras: true,
        inspections: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
        },
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    if (!institute) {
      res.status(404).json({ success: false, message: 'Institute not found' });
      return;
    }

    res.json(formatInstitute(institute));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch institute' });
  }
});

// POST /api/institutes
router.post('/', authenticateToken, requireRole(['ADMIN', 'PMU']), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { code, name, type, address, state, district, latitude, longitude, projectId, contactPerson, contactPhone } = req.body;

    if (!name || !state || !district || latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, message: 'Missing required institute parameters' });
      return;
    }

    const instCode = code || `INST-${district.toUpperCase().substring(0, 3)}-${Math.floor(100 + Math.random() * 900)}`;

    const newInst = await prisma.institute.create({
      data: {
        code: instCode,
        name,
        type: type || 'SHELTER_HOME',
        address: address || `${district}, ${state}`,
        state,
        district,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        projectId: projectId || null,
        contactPerson: contactPerson || null,
        contactPhone: contactPhone || null,
      },
      include: { project: true, cameras: true },
    });

    await recordAuditLog({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'CREATE_INSTITUTE',
      entity: 'INSTITUTE',
      entityId: newInst.id,
      details: `Institute ${newInst.name} registered at [${newInst.latitude}, ${newInst.longitude}]`,
    });

    res.status(201).json(formatInstitute(newInst));
  } catch (err: any) {
    console.error('Institute create error:', err);
    res.status(500).json({ success: false, message: 'Failed to create institute' });
  }
});

export default router;
