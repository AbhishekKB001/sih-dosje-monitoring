import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthenticateToken, authenticateToken, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Helper to format project for both Web and Mobile
function formatProject(p: any) {
  const primaryInstitute = p.institutes && p.institutes[0];
  const lastInspection = primaryInstitute?.inspections && primaryInstitute.inspections[0];

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const riskScore = lastInspection?.riskScore || 0;
  if (riskScore >= 70) riskLevel = 'high';
  else if (riskScore >= 40) riskLevel = 'medium';

  const statusMap: Record<string, 'active' | 'paused' | 'closed'> = {
    ACTIVE: 'active',
    PENDING: 'paused',
    COMPLETED: 'closed',
  };

  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    scheme: p.scheme,
    budget: p.budget,
    beneficiaryCount: p.beneficiaryCount,
    beneficiaries: p.beneficiaryCount,
    state: p.state,
    district: p.district,
    status: statusMap[p.status] || 'active',
    rawStatus: p.status,
    institute: primaryInstitute ? primaryInstitute.name : 'Central Operational Wing',
    ngo: primaryInstitute?.contactPerson || 'DoSJE Partner Agency',
    inspectionStatus: (lastInspection?.status?.toLowerCase() as any) || 'assigned',
    riskLevel,
    lastInspected: lastInspection?.completedDate ? lastInspection.completedDate.toISOString() : null,
    institutes: p.institutes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// GET /api/projects
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const { scheme, state, district } = req.query;
    const where: any = {};
    if (scheme) where.scheme = String(scheme);
    if (state) where.state = String(state);
    if (district) where.district = String(district);

    const projects = await prisma.project.findMany({
      where,
      include: {
        institutes: {
          include: {
            inspections: {
              orderBy: { scheduledDate: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects.map(formatProject));
  } catch (err) {
    console.error('Projects GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', optionalAuthenticateToken, async (req, res): Promise<void> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        institutes: {
          include: {
            cameras: true,
            inspections: { orderBy: { scheduledDate: 'desc' }, take: 5 },
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    res.json(formatProject(project));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
});

// POST /api/projects
router.post('/', authenticateToken, requireRole(['ADMIN', 'PMU']), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { code, name, description, scheme, budget, beneficiaryCount, state, district, status } = req.body;

    if (!name || !scheme || !state || !district) {
      res.status(400).json({ success: false, message: 'Missing required project fields' });
      return;
    }

    const projectCode = code || `PRJ-${scheme}-${Math.floor(100 + Math.random() * 900)}`;

    const newProject = await prisma.project.create({
      data: {
        code: projectCode,
        name,
        description: description || null,
        scheme,
        budget: Number(budget) || 0.0,
        beneficiaryCount: Number(beneficiaryCount) || 0,
        state,
        district,
        status: status || 'ACTIVE',
      },
      include: { institutes: true },
    });

    await recordAuditLog({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'CREATE_PROJECT',
      entity: 'PROJECT',
      entityId: newProject.id,
      details: `Project ${newProject.name} (${newProject.code}) registered under ${newProject.scheme}`,
    });

    res.status(201).json(formatProject(newProject));
  } catch (err: any) {
    console.error('Project create error:', err);
    res.status(500).json({ success: false, message: 'Failed to create project' });
  }
});

export default router;
