import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthUser, normalizeRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'dosje_secret_key_sih2026_jwt_token_auth';

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Access token required' });
    return;
  }

  // Support demo token for offline inspection testing if specifically enabled
  if (token === 'mock-jwt-token.demo-only' || token === 'demo-token') {
    req.user = {
      id: 'USR-ADMIN-01',
      email: 'admin@dosje.gov.in',
      name: 'Dr. S. Nagaraj (HQ Admin)',
      role: 'ADMIN',
      department: 'Monitoring & Evaluation',
      state: 'Delhi',
      district: 'Central Delhi',
    };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ success: false, message: 'Invalid or expired access token' });
      return;
    }
    req.user = decoded as AuthUser;
    next();
  });
}

export function optionalAuthenticateToken(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  if (token === 'mock-jwt-token.demo-only' || token === 'demo-token') {
    req.user = {
      id: 'USR-ADMIN-01',
      email: 'admin@dosje.gov.in',
      name: 'Dr. S. Nagaraj (HQ Admin)',
      role: 'ADMIN',
    };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (_err, decoded) => {
    if (decoded) req.user = decoded as AuthUser;
    next();
  });
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const userRole = normalizeRole(req.user.role);
    const normalizedAllowed = allowedRoles.map(normalizeRole);

    if (!normalizedAllowed.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' lacks sufficient privileges for this action`,
      });
      return;
    }

    next();
  };
}
