import { Request } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';

export interface AuditLogOptions {
  userId?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(options: AuditLogOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId ?? null,
        userRole: options.userRole ?? null,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId ?? null,
        details: options.details ?? null,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to persist audit record:', err);
  }
}

export function auditMiddleware(action: string, entity: string) {
  return async (req: AuthenticatedRequest, _res: any, next: any) => {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const ua = req.headers['user-agent'] || 'API-Client';

      await recordAuditLog({
        userId: req.user?.id,
        userRole: req.user?.role,
        action,
        entity,
        ipAddress: ip,
        userAgent: ua,
      });
    } catch {
      // Non-blocking
    }
    next();
  };
}
