import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/audit-logs
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const { action, entity, userId } = req.query;
    const where: any = {};
    if (action) where.action = String(action);
    if (entity) where.entity = String(entity);
    if (userId) where.userId = String(userId);

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const roleMap: Record<string, string> = {
      ADMIN: 'super_admin',
      PMU: 'district_officer',
      INSPECTOR: 'inspector',
      AGENCY_REPRESENTATIVE: 'project_incharge',
    };

    res.json(
      logs.map((l) => ({
        id: l.id,
        user: l.user ? l.user.name : l.userRole || 'System Engine',
        role: roleMap[l.user?.role || l.userRole || 'ADMIN'] || 'super_admin',
        action: l.action,
        timestamp: l.timestamp.toISOString(),
        location: l.ipAddress || 'HQ Central Server',
        entity: l.entity,
        entityId: l.entityId,
        details: l.details,
        result: 'success',
      }))
    );
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

export default router;
