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
  RiskLevel,
  InspectionStatus,
} from '../types';

// Seeded pseudo-random so numbers are stable across renders/reloads.
let seed = 42;
function rand() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const DISTRICTS = [
  { name: 'Bengaluru Urban', lat: 12.9716, lng: 77.5946 },
  { name: 'Mysuru', lat: 12.2958, lng: 76.6394 },
  { name: 'Belagavi', lat: 15.8497, lng: 74.4977 },
  { name: 'Kalaburagi', lat: 17.3297, lng: 76.8343 },
  { name: 'Ballari', lat: 15.1394, lng: 76.9214 },
  { name: 'Tumakuru', lat: 13.3379, lng: 77.1022 },
  { name: 'Dharwad', lat: 15.4589, lng: 75.0078 },
  { name: 'Shivamogga', lat: 13.9299, lng: 75.5681 },
];

const NGOS = [
  'Samarpan Welfare Trust',
  'Ashadeep Foundation',
  'Nava Jyothi Society',
  'Karuna Seva Samithi',
  'Jagruti Social Trust',
  'Prerana Institute',
];

const PROJECT_TYPES = [
  'Post-Matric Hostel',
  'Skill Development Centre',
  'Old Age Care Home',
  'Rehabilitation Centre',
  'Day Care for PwD',
  'Scholarship Verification Unit',
  'Community Livelihood Mission',
  'Girls Residential School',
];

const INSPECTORS = [
  'A. Ramesh',
  'P. Lakshmi',
  'S. Manjunath',
  'K. Fathima',
  'R. Deepak',
  'N. Ananya',
  'V. Suresh Kumar',
  'T. Meenakshi',
];

const OFFICERS = [
  { name: 'Dr. S. Nagaraj', role: 'super_admin' as const },
  { name: 'Meera Iyengar', role: 'district_officer' as const },
  { name: 'Joseph D\'Souza', role: 'district_officer' as const },
];

function riskLevel(score: number): RiskLevel {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

const INSPECTION_STATUSES: InspectionStatus[] = [
  'assigned',
  'in_progress',
  'completed',
  'flagged',
  'under_review',
];

export const institutes: Institute[] = Array.from({ length: 24 }).map((_, i) => {
  const d = pick(DISTRICTS);
  const score = randInt(5, 95);
  return {
    id: `INST-${1000 + i}`,
    name: `${pick(PROJECT_TYPES)} — ${d.name} ${i + 1}`,
    district: d.name,
    project: `PRJ-${2000 + i}`,
    ngo: pick(NGOS),
    staffCount: randInt(4, 40),
    beneficiaries: randInt(20, 400),
    cctvStatus: pick(['online', 'online', 'online', 'offline', 'partial', 'not_installed']),
    lastInspection: rand() > 0.15 ? daysAgo(randInt(1, 90)) : null,
    riskLevel: riskLevel(score),
    lat: d.lat + (rand() - 0.5) * 0.4,
    lng: d.lng + (rand() - 0.5) * 0.4,
  };
});

export const projects: Project[] = institutes.map((inst, i) => {
  const score = randInt(5, 95);
  return {
    id: inst.project,
    name: inst.name.split(' — ')[0] + ` Programme ${i + 1}`,
    institute: inst.name,
    ngo: inst.ngo,
    district: inst.district,
    status: pick(['active', 'active', 'active', 'paused', 'closed']),
    beneficiaries: inst.beneficiaries,
    inspectionStatus: pick(INSPECTION_STATUSES),
    riskLevel: riskLevel(score),
    lastInspected: inst.lastInspection,
  };
});

export const inspections: Inspection[] = Array.from({ length: 30 }).map((_, i) => {
  const inst = pick(institutes);
  const status = pick(INSPECTION_STATUSES);
  const score = randInt(5, 95);
  return {
    id: `INS-${5000 + i}`,
    projectId: inst.project,
    projectName: inst.name.split(' — ')[0],
    institute: inst.name,
    inspector: pick(INSPECTORS),
    assignedDate: daysAgo(randInt(0, 45)),
    status,
    gpsVerified: status !== 'assigned' ? rand() > 0.1 : false,
    evidenceStatus:
      status === 'completed' || status === 'under_review'
        ? 'complete'
        : status === 'in_progress'
        ? 'partial'
        : 'none',
    riskScore: score,
    reportStatus:
      status === 'completed' || status === 'under_review'
        ? pick(['submitted', 'reviewed'])
        : 'not_submitted',
    district: inst.district,
    lat: inst.lat,
    lng: inst.lng,
  };
});

export const cameras: CameraFeed[] = institutes
  .filter((i) => i.cctvStatus !== 'not_installed')
  .flatMap((inst, i) =>
    Array.from({ length: randInt(1, 3) }).map((_, j) => ({
      id: `CAM-${100 + i * 3 + j}`,
      name: `${inst.name.split(' — ')[0]} - Cam ${j + 1}`,
      institute: inst.name,
      district: inst.district,
      status:
        inst.cctvStatus === 'online'
          ? (pick(['online', 'online', 'online', 'degraded']) as CameraFeed['status'])
          : inst.cctvStatus === 'partial'
          ? (pick(['online', 'offline']) as CameraFeed['status'])
          : 'offline',
      lastActiveAt: daysAgo(randInt(0, 5)),
    }))
  );

const ALERT_TYPES: AlertItem['type'][] = [
  'attendance_anomaly',
  'cctv_offline',
  'inspection_anomaly',
  'high_risk_project',
  'missing_report',
  'gps_issue',
  'follow_up_required',
];

const ALERT_DESCRIPTIONS: Record<AlertItem['type'], string> = {
  attendance_anomaly: 'Recorded attendance deviates significantly from the CCTV occupancy estimate.',
  cctv_offline: 'Camera feed has been unreachable for more than 6 hours.',
  inspection_anomaly: 'Inspection evidence pattern flagged for manual review.',
  high_risk_project: 'Composite risk score has crossed the high-risk threshold.',
  missing_report: 'Inspection was marked complete but no report was submitted.',
  gps_issue: 'Inspector check-in location falls outside the institute geofence.',
  follow_up_required: 'Previous flagged inspection has no recorded follow-up action.',
};

export const alerts: AlertItem[] = Array.from({ length: 18 }).map((_, i) => {
  const type = pick(ALERT_TYPES);
  const inst = pick(institutes);
  return {
    id: `ALT-${7000 + i}`,
    type,
    severity: pick(['low', 'medium', 'high', 'critical']),
    project: inst.name.split(' — ')[0],
    district: inst.district,
    time: daysAgo(randInt(0, 20)),
    status: pick(['open', 'open', 'acknowledged', 'resolved']),
    description: ALERT_DESCRIPTIONS[type],
  };
});

export const reports: InspectionReport[] = inspections
  .filter((i) => i.status === 'completed' || i.status === 'under_review' || i.status === 'flagged')
  .map((insp, i) => {
    const total = randInt(8, 12);
    const passed = insp.riskScore > 60 ? randInt(2, total - 3) : randInt(total - 3, total);
    return {
      id: `RPT-${8000 + i}`,
      inspectionId: insp.id,
      inspector: insp.inspector,
      institute: insp.institute,
      district: insp.district,
      timestamp: insp.assignedDate,
      checklistPassed: passed,
      checklistTotal: total,
      evidenceCount: randInt(3, 15),
      aiRiskIndicators:
        insp.riskScore > 60
          ? ['Attendance count mismatch vs. CCTV frame sample', 'Photo evidence timestamp gap exceeds 4 hours']
          : insp.riskScore > 35
          ? ['Minor discrepancy in beneficiary headcount']
          : [],
      recommendation:
        insp.riskScore > 60
          ? 'Escalate for district-level physical re-verification.'
          : insp.riskScore > 35
          ? 'Schedule a routine follow-up inspection within 30 days.'
          : 'No further action required at this time.',
      finalStatus:
        insp.riskScore > 70
          ? 'escalated'
          : insp.riskScore > 55
          ? 'major_issues'
          : insp.riskScore > 30
          ? 'minor_issues'
          : 'compliant',
    };
  });

const ACTIONS = [
  'Started inspection',
  'GPS location verified',
  'Uploaded evidence',
  'Submitted report',
  'Reviewed report',
  'Acknowledged alert',
  'Resolved alert',
  'Updated project status',
  'Logged in',
  'Assigned inspection',
];

export const auditLogs: AuditLogEntry[] = Array.from({ length: 40 }).map((_, i) => {
  const useOfficer = rand() > 0.6;
  const inst = pick(institutes);
  return {
    id: `AUD-${9000 + i}`,
    user: useOfficer ? pick(OFFICERS).name : pick(INSPECTORS),
    role: useOfficer ? pick(OFFICERS).role : 'inspector',
    action: pick(ACTIONS),
    timestamp: daysAgo(randInt(0, 30)),
    location: rand() > 0.3 ? inst.district : null,
    entity: inst.name.split(' — ')[0],
    result: pick(['success', 'success', 'success', 'pending', 'failure']),
  };
});

export const adminUsers: AdminUser[] = [
  ...OFFICERS.map((o, i) => ({
    id: `USR-${100 + i}`,
    name: o.name,
    email: o.name.toLowerCase().replace(/[^a-z]+/g, '.') + '@dosje.gov.in',
    role: o.role,
    district: o.role === 'district_officer' ? pick(DISTRICTS).name : null,
    status: 'active' as const,
    lastLogin: daysAgo(randInt(0, 3)),
  })),
  ...INSPECTORS.map((name, i) => ({
    id: `USR-${200 + i}`,
    name,
    email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@dosje.gov.in',
    role: 'inspector' as const,
    district: pick(DISTRICTS).name,
    status: pick(['active', 'active', 'active', 'suspended', 'invited'] as const),
    lastLogin: rand() > 0.1 ? daysAgo(randInt(0, 14)) : null,
  })),
];

export const dashboardStats: DashboardStats = {
  totalProjects: projects.length,
  activeInstitutes: institutes.filter((i) => i.cctvStatus !== 'not_installed').length,
  pendingInspections: inspections.filter((i) => i.status === 'assigned' || i.status === 'in_progress').length,
  completedInspections: inspections.filter((i) => i.status === 'completed' || i.status === 'under_review').length,
  activeCameras: cameras.filter((c) => c.status === 'online').length,
  openAlerts: alerts.filter((a) => a.status === 'open').length,
  highRiskProjects: projects.filter((p) => p.riskLevel === 'high').length,
};

export const inspectionTrend: TrendPoint[] = [
  { label: 'Week 1', completed: 14, flagged: 2 },
  { label: 'Week 2', completed: 19, flagged: 3 },
  { label: 'Week 3', completed: 16, flagged: 5 },
  { label: 'Week 4', completed: 23, flagged: 3 },
  { label: 'Week 5', completed: 21, flagged: 6 },
  { label: 'Week 6', completed: 27, flagged: 4 },
];

export const riskDistribution: RiskDistributionPoint[] = [
  { name: 'low', value: projects.filter((p) => p.riskLevel === 'low').length },
  { name: 'medium', value: projects.filter((p) => p.riskLevel === 'medium').length },
  { name: 'high', value: projects.filter((p) => p.riskLevel === 'high').length },
];

export const districtPerformance: DistrictPerformance[] = DISTRICTS.map((d) => ({
  district: d.name,
  completionRate: randInt(55, 98),
  avgRiskScore: randInt(15, 65),
  cctvUptime: randInt(70, 99),
}));
