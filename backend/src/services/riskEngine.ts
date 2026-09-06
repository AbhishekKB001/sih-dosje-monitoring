/**
 * Canonical Risk Engine & Anomaly Assessment Service
 * Ministry of Social Justice and Empowerment (DoSJE) - Drishti Platform
 *
 * Implements the mathematical risk formula originally defined by Member 5:
 *   Weights:
 *   - Attendance Anomaly Score    : 30% (Drop in headcount, discrepancy vs biometric)
 *   - Inspection Issues Score     : 25% (Historical checklist violations, low ratings)
 *   - CCTV Inconsistency Score    : 20% (Offline cameras, stream degradation)
 *   - Complaint / AI Alert Score  : 15% (Unresolved high/critical anomalies)
 *   - Reporting Irregularity Score: 10% (Late report submission, missing documents)
 *
 * Overall Risk Score = (0.30 * att) + (0.25 * insp) + (0.20 * cctv) + (0.15 * alert) + (0.10 * rep)
 * Clamped strictly between 0 and 100.
 */

export interface RiskFactors {
  attendanceAnomalyScore: number;     // 0 to 100
  inspectionIssueScore: number;       // 0 to 100
  cctvInconsistencyScore: number;     // 0 to 100
  complaintOrAlertScore: number;      // 0 to 100
  reportingIrregularityScore: number; // 0 to 100
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type InspectionPriority = 'NORMAL' | 'PRIORITY' | 'URGENT';

export interface RiskEvaluationResult {
  riskScore: number;                  // 0.00 to 100.00
  riskLevel: RiskLevel;               // LOW (<40), MEDIUM (40-69), HIGH (>=70)
  inspectionPriority: InspectionPriority; // NORMAL, PRIORITY, URGENT
  factors: RiskFactors;
  breakdown: {
    attendanceContribution: number;
    inspectionContribution: number;
    cctvContribution: number;
    alertContribution: number;
    reportingContribution: number;
  };
  recommendedActions: string[];
}

/**
 * Calculates the multi-factor institutional risk score according to canonical DoSJE weights.
 */
export function calculateRiskScore(factors: Partial<RiskFactors>): RiskEvaluationResult {
  const att = Math.min(Math.max(factors.attendanceAnomalyScore ?? 0, 0), 100);
  const insp = Math.min(Math.max(factors.inspectionIssueScore ?? 0, 0), 100);
  const cctv = Math.min(Math.max(factors.cctvInconsistencyScore ?? 0, 0), 100);
  const alert = Math.min(Math.max(factors.complaintOrAlertScore ?? 0, 0), 100);
  const rep = Math.min(Math.max(factors.reportingIrregularityScore ?? 0, 0), 100);

  const attContrib = att * 0.30;
  const inspContrib = insp * 0.25;
  const cctvContrib = cctv * 0.20;
  const alertContrib = alert * 0.15;
  const repContrib = rep * 0.10;

  const rawScore = attContrib + inspContrib + cctvContrib + alertContrib + repContrib;
  const riskScore = Math.round(Math.min(Math.max(rawScore, 0), 100) * 100) / 100;

  let riskLevel: RiskLevel = 'LOW';
  let inspectionPriority: InspectionPriority = 'NORMAL';

  if (riskScore >= 70) {
    riskLevel = 'HIGH';
    inspectionPriority = 'URGENT';
  } else if (riskScore >= 40) {
    riskLevel = 'MEDIUM';
    inspectionPriority = 'PRIORITY';
  }

  const recommendedActions: string[] = [];
  if (att >= 50) {
    recommendedActions.push('Conduct on-site physical biometric logbook headcount reconciliation.');
  }
  if (cctv >= 40) {
    recommendedActions.push('Dispatch field technician to inspect NVR network switches and camera power lines.');
  }
  if (alert >= 50) {
    recommendedActions.push('Immediate supervisory review of unresolved perimeter and after-hours alerts.');
  }
  if (insp >= 50) {
    recommendedActions.push('Follow-up inspection required due to repeated low infrastructure and sanitation ratings.');
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('Maintain routine algorithmic telemetry monitoring schedule.');
  }

  return {
    riskScore,
    riskLevel,
    inspectionPriority,
    factors: {
      attendanceAnomalyScore: att,
      inspectionIssueScore: insp,
      cctvInconsistencyScore: cctv,
      complaintOrAlertScore: alert,
      reportingIrregularityScore: rep,
    },
    breakdown: {
      attendanceContribution: Math.round(attContrib * 100) / 100,
      inspectionContribution: Math.round(inspContrib * 100) / 100,
      cctvContribution: Math.round(cctvContrib * 100) / 100,
      alertContribution: Math.round(alertContrib * 100) / 100,
      reportingContribution: Math.round(repContrib * 100) / 100,
    },
    recommendedActions,
  };
}

/**
 * Detects attendance anomaly patterns from historical headcount observations.
 */
export function detectAttendanceAnomaly(attendanceHistory: number[]): {
  isAnomaly: boolean;
  anomalyScore: number;
  message: string;
} {
  if (attendanceHistory.length < 3) {
    return { isAnomaly: false, anomalyScore: 0, message: 'Insufficient attendance history' };
  }

  const sum = attendanceHistory.reduce((a, b) => a + b, 0);
  const average = sum / attendanceHistory.length;
  const latest = attendanceHistory[attendanceHistory.length - 1];

  // Consistently critical low attendance (<50%)
  if (average < 50) {
    return { isAnomaly: true, anomalyScore: 85, message: 'Critically low average attendance rate detected (<50%)' };
  } else if (average < 65) {
    return { isAnomaly: true, anomalyScore: 60, message: 'Substandard average attendance rate detected (<65%)' };
  }

  // Sudden drop detection vs historical baseline
  const percentageDrop = ((average - latest) / average) * 100;
  if (percentageDrop >= 30) {
    return { isAnomaly: true, anomalyScore: 80, message: `Severe sudden attendance drop (${Math.round(percentageDrop)}% drop from baseline)` };
  } else if (percentageDrop >= 20) {
    return { isAnomaly: true, anomalyScore: 60, message: `Significant attendance variance detected (${Math.round(percentageDrop)}% drop)` };
  } else if (percentageDrop >= 10) {
    return { isAnomaly: true, anomalyScore: 30, message: `Moderate attendance variance detected (${Math.round(percentageDrop)}% drop)` };
  }

  return { isAnomaly: false, anomalyScore: 0, message: 'Attendance patterns within normal expected tolerance' };
}
