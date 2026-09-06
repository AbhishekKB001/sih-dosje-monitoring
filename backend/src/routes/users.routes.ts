import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { optionalAuthenticateToken, authenticateToken, requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import { AuthenticatedRequest } from '../types';

const router = Router();

function formatUser(u: any) {
  const roleMap: Record<string, string> = {
    ADMIN: 'super_admin',
    PMU: 'district_officer',
    INSPECTOR: 'inspector',
    AGENCY_REPRESENTATIVE: 'project_incharge',
    STATE_NODAL: 'district_officer',
  };

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: roleMap[u.role] || u.role.toLowerCase(),
    rawRole: u.role,
    department: u.department,
    district: u.district || 'Central HQ',
    state: u.state || 'National',
    status: u.active ? 'active' : 'suspended',
    lastLogin: u.updatedAt ? u.updatedAt.toISOString() : null,
    createdAt: u.createdAt,
  };
}

// GET /api/users
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const { role, district } = req.query;
    const where: any = {};
    if (role) where.role = String(role).toUpperCase();
    if (district) where.district = String(district);

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(users.map(formatUser));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { name, email, password, role, department, district, state, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const mpinHash = await bcrypt.hash('1234', 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        mpinHash,
        role: (role || 'INSPECTOR').toUpperCase(),
        department: department || null,
        district: district || null,
        state: state || null,
        phone: phone || null,
      },
    });

    await recordAuditLog({
      userId: req.user?.id,
      userRole: req.user?.role,
      action: 'CREATE_USER',
      entity: 'USER',
      entityId: newUser.id,
      details: `Created user ${newUser.email} with role ${newUser.role}`,
    });

    res.status(201).json(formatUser(newUser));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

export default router;
