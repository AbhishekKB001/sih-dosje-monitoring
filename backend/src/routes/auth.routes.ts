import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dosje_secret_key_sih2026_jwt_token_auth';

// POST /api/auth/login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) {
      res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      district: user.district,
      state: user.state,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    await recordAuditLog({
      userId: user.id,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      details: `User ${user.email} logged in successfully`,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      token,
      user: tokenPayload,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

// POST /api/auth/mpin
router.post('/mpin', async (req, res): Promise<void> => {
  try {
    const { mpin, email, role } = req.body;
    if (!mpin) {
      res.status(400).json({ success: false, message: 'MPIN is required' });
      return;
    }

    let user;
    if (email) {
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    } else if (role) {
      user = await prisma.user.findFirst({ where: { role: { contains: role.toUpperCase() }, active: true } });
    }

    if (!user) {
      // Demo fallback user if running locally
      user = await prisma.user.findFirst({ where: { role: 'INSPECTOR' } });
    }

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Check MPIN if hashed or accept demo mpin '1234'
    let isMatch = false;
    if (user.mpinHash) {
      isMatch = await bcrypt.compare(mpin, user.mpinHash);
    }
    if (!isMatch && (mpin === '1234' || mpin === '0000')) {
      isMatch = true;
    }

    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid MPIN' });
      return;
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      district: user.district,
      state: user.state,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: tokenPayload,
    });
  } catch (err: any) {
    console.error('MPIN login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        district: true,
        state: true,
        phone: true,
        active: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (_req, res): Promise<void> => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
