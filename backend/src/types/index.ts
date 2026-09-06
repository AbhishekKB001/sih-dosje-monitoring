import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string | null;
  district?: string | null;
  state?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export type StandardRole =
  | 'ADMIN'
  | 'INSPECTOR'
  | 'PMU'
  | 'STATE_NODAL'
  | 'AGENCY_REPRESENTATIVE';

export function normalizeRole(role: string): string {
  const upper = role.toUpperCase();
  if (['SUPER_ADMIN', 'ADMIN', 'OFFICIAL', 'HQ'].includes(upper)) return 'ADMIN';
  if (['INSPECTOR', 'PMU_INSPECTOR'].includes(upper)) return 'INSPECTOR';
  if (['PMU', 'DISTRICT_OFFICER', 'DISTRICT'].includes(upper)) return 'PMU';
  if (['STATE_NODAL', 'STATE'].includes(upper)) return 'STATE_NODAL';
  if (['INSTITUTE', 'PROJECT_INCHARGE', 'STAFF', 'AGENCY_REPRESENTATIVE'].includes(upper)) {
    return 'AGENCY_REPRESENTATIVE';
  }
  return upper;
}
