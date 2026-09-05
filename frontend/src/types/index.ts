// Domain types for the DoSJE Admin Dashboard (Member 6).
// These shapes are the contract the dashboard expects from Member 2's backend.
// Mock data in src/lib/mockData.ts conforms to these same types so swapping
// the service layer (src/services/api.ts) from mock -> real fetch is a no-op
// for every component.

export type RiskLevel = 'low' | 'medium' | 'high';

export type InspectionStatus =
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'flagged'
  | 'under_review';

export type UserRole =
  | 'super_admin'
  | 'district_officer'
  | 'inspector'
  | 'project_incharge'
  | 'staff';

export interface Project {
  id: string;
  name: string;
  institute: string;
  ngo: string;
  district: string;
  status: 'active' | 'paused' | 'closed';
  beneficiaries: number;
  inspectionStatus: InspectionStatus;
  riskLevel: RiskLevel;
  lastInspected: string | null;
}

export interface Institute {
  id: string;
  name: string;
  district: string;
  project: string;
  ngo: string;
  staffCount: number;
  beneficiaries: number;
  cctvStatus: 'online' | 'offline' | 'partial' | 'not_installed';
  lastInspection: string | null;
  riskLevel: RiskLevel;
  lat: number;
  lng: number;
}

export interface Inspection {
  id: string;
  projectId: string;
  projectName: string;
  institute: string;
  inspector: string;
  assignedDate: string;
  status: InspectionStatus;
  gpsVerified: boolean;
  evidenceStatus: 'none' | 'partial' | 'complete';
  riskScore: number; // 0-100
  reportStatus: 'not_submitted' | 'submitted' | 'reviewed';
  district: string;
  lat: number;
  lng: number;
}

export interface CameraFeed {
  id: string;
  name: string;
  institute: string;
  district: string;
  status: 'online' | 'offline' | 'degraded';
  lastActiveAt: string;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertItem {
  id: string;
  type:
    | 'attendance_anomaly'
    | 'cctv_offline'
    | 'inspection_anomaly'
    | 'high_risk_project'
    | 'missing_report'
    | 'gps_issue'
    | 'follow_up_required';
  severity: AlertSeverity;
  project: string;
  district: string;
  time: string;
  status: 'open' | 'acknowledged' | 'resolved';
  description: string;
}

export interface InspectionReport {
  id: string;
  inspectionId: string;
  inspector: string;
  institute: string;
  district: string;
  timestamp: string;
  checklistPassed: number;
  checklistTotal: number;
  evidenceCount: number;
  aiRiskIndicators: string[];
  recommendation: string;
  finalStatus: 'compliant' | 'minor_issues' | 'major_issues' | 'escalated';
}

export interface AuditLogEntry {
  id: string;
  user: string;
  role: UserRole;
  action: string;
  timestamp: string;
  location: string | null;
  entity: string;
  result: 'success' | 'failure' | 'pending';
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  district: string | null;
  status: 'active' | 'suspended' | 'invited';
  lastLogin: string | null;
}

export interface DashboardStats {
  totalProjects: number;
  activeInstitutes: number;
  pendingInspections: number;
  completedInspections: number;
  activeCameras: number;
  openAlerts: number;
  highRiskProjects: number;
}

export interface TrendPoint {
  label: string;
  completed: number;
  flagged: number;
}

export interface RiskDistributionPoint {
  name: RiskLevel;
  value: number;
}

export interface DistrictPerformance {
  district: string;
  completionRate: number;
  avgRiskScore: number;
  cctvUptime: number;
}
