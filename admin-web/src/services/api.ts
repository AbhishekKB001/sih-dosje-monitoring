// ---------------------------------------------------------------------------
// DoSJE Admin Dashboard — API Service Layer
// ---------------------------------------------------------------------------
// Every page in this dashboard calls functions from this file — never fetch()
// directly from a component, and never import mockData.ts outside this file.
//
// HOW TO CONNECT MEMBER 2'S REAL BACKEND:
//   1. Set VITE_API_BASE_URL in .env (see .env.example).
//   2. Set VITE_USE_MOCK_DATA=false in .env.
//   3. Each function below already has a `real` branch calling `request()`
//      against the documented endpoint — verify the path/shape matches
//      Member 2's actual API and adjust if needed.
//   4. No component code needs to change.
// ---------------------------------------------------------------------------

import type {
  Project,
  Institute,
  Inspection,
  CameraFeed,
  AlertItem,
  InspectionReport,
  AuditLogEntry,
  AdminUser,
  DashboardStats,
  TrendPoint,
  RiskDistributionPoint,
  DistrictPerformance,
} from '../types';
import * as mock from '../lib/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const USE_MOCK = (import.meta.env.VITE_USE_MOCK_DATA ?? 'true') !== 'false';

// Simulated network latency so loading states are visible/testable with mock data.
const MOCK_DELAY_MS = 350;
function withDelay<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), MOCK_DELAY_MS));
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Central fetch wrapper: attaches auth header, base URL, and error handling. */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('kc_admin_token');
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {
      /* response had no JSON body */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- Auth ------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
}
export interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string; role: string };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (USE_MOCK) {
    if (!payload.email || !payload.password) {
      throw new ApiError('Email and password are required.', 400);
    }
    return withDelay({
      token: 'mock-jwt-token.demo-only',
      user: {
        id: 'USR-MEMBER-01',
        name: 'Member 1 (DoSJE Official)',
        email: payload.email || 'member1.dosje@sih.gov.in',
        role: 'ADMIN',
      },
    });
  }
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<void> {
  if (USE_MOCK) return withDelay(undefined);
  return request('/auth/logout', { method: 'POST' });
}

// --- Dashboard ---------------------------------------------------------------

export async function getDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) return withDelay(mock.dashboardStats);
  return request('/dashboard/stats');
}

export async function getInspectionTrend(): Promise<TrendPoint[]> {
  if (USE_MOCK) return withDelay(mock.inspectionTrend);
  return request('/dashboard/inspection-trend');
}

export async function getRiskDistribution(): Promise<RiskDistributionPoint[]> {
  if (USE_MOCK) return withDelay(mock.riskDistribution);
  return request('/dashboard/risk-distribution');
}

// --- Projects ----------------------------------------------------------------

export async function getProjects(): Promise<Project[]> {
  if (USE_MOCK) return withDelay(mock.projects);
  return request('/projects');
}

// --- Institutes ----------------------------------------------------------------

export async function getInstitutes(): Promise<Institute[]> {
  if (USE_MOCK) return withDelay(mock.institutes);
  return request('/institutes');
}

// --- Inspections ----------------------------------------------------------------

export async function getInspections(): Promise<Inspection[]> {
  if (USE_MOCK) return withDelay(mock.inspections);
  return request('/inspections');
}

// --- CCTV ----------------------------------------------------------------

export async function getCameras(): Promise<CameraFeed[]> {
  if (USE_MOCK) return withDelay(mock.cameras);
  return request('/cctv/cameras');
}

export async function sendPtzCommand(
  id: string,
  action: 'PAN_LEFT' | 'PAN_RIGHT' | 'TILT_UP' | 'TILT_DOWN' | 'ZOOM_IN' | 'ZOOM_OUT' | 'HOME',
  speed = 1.0
): Promise<{ success: boolean; ptz: { pan: number; tilt: number; zoom: number }; message: string }> {
  if (USE_MOCK) {
    return withDelay({
      success: true,
      ptz: { pan: 10, tilt: 5, zoom: 1.2 },
      message: `PTZ command ${action} executed successfully (simulated)`,
    });
  }
  return request(`/cctv/cameras/${id}/ptz`, {
    method: 'POST',
    body: JSON.stringify({ action, speed }),
  });
}

export async function toggleRecording(
  id: string,
  action: 'START' | 'STOP',
  profile = 'SIMULATED_ONVIF_RECORDING'
): Promise<{ success: boolean; recording: boolean; message: string }> {
  if (USE_MOCK) {
    return withDelay({
      success: true,
      recording: action === 'START',
      message: `Recording ${action.toLowerCase()}ed successfully (simulated)`,
    });
  }
  return request(`/cctv/cameras/${id}/record`, {
    method: 'POST',
    body: JSON.stringify({ action, profile }),
  });
}

// --- Alerts ----------------------------------------------------------------

export async function getAlerts(): Promise<AlertItem[]> {
  if (USE_MOCK) return withDelay(mock.alerts);
  return request('/alerts');
}

export async function updateAlertStatus(
  id: string,
  status: AlertItem['status'],
  notes?: string
): Promise<void> {
  if (USE_MOCK) return withDelay(undefined);
  return request(`/alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}

export async function resolveAlert(id: string, notes?: string): Promise<void> {
  return updateAlertStatus(id, 'resolved', notes);
}

// --- Reports ----------------------------------------------------------------

export async function getReports(): Promise<InspectionReport[]> {
  if (USE_MOCK) return withDelay(mock.reports);
  return request('/reports');
}

export async function getReportSummary(id: string): Promise<any> {
  if (USE_MOCK) {
    return withDelay({
      success: true,
      report: { id, certificateHash: 'CERT-DEMO-001', complianceStatus: 'COMPLIANT' },
    });
  }
  return request(`/reports/${id}/summary`);
}

// --- Dynamic Weighted Assignment (Member 5 & 1) ------------------------------

export async function triggerRandomAssignment(payload?: {
  count?: number;
  date?: string;
  instituteId?: string;
}): Promise<{ success: boolean; message: string; count: number; assigned: any[]; duty?: any }> {
  if (USE_MOCK) {
    return withDelay({
      success: true,
      message: 'Surprise inspections generated and assigned based on multi-factor risk scores',
      count: payload?.count || 1,
      assigned: [],
    });
  }
  return request('/inspections/random-assign', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

// --- Surprise Video Conference (Member 1 & 4) --------------------------------

export async function initiateSurpriseVC(payload?: {
  projectId?: string;
  instituteId?: string;
}): Promise<{ success: boolean; session: any; meetingUrl: string; message: string }> {
  if (USE_MOCK) {
    return withDelay({
      success: true,
      message: 'Surprise Video Conference initiated (Demo Bridge Active)',
      session: { sessionNumber: 'VC-DOSJE-DEMO' },
      meetingUrl: 'https://meet.jit.si/dosje-surveillance-demo',
    });
  }
  return request('/vc/sessions/random', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

// --- Analytics ----------------------------------------------------------------

export async function getDistrictPerformance(): Promise<DistrictPerformance[]> {
  if (USE_MOCK) return withDelay(mock.districtPerformance);
  return request('/analytics/district-performance');
}

// --- Users ----------------------------------------------------------------

export async function getAdminUsers(): Promise<AdminUser[]> {
  if (USE_MOCK) return withDelay(mock.adminUsers);
  return request('/users');
}

// --- Audit Logs ----------------------------------------------------------------

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  if (USE_MOCK) return withDelay(mock.auditLogs);
  return request('/audit-logs');
}
