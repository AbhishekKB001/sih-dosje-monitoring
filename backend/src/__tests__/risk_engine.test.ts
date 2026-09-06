import { calculateRiskScore, detectAttendanceAnomaly } from '../services/riskEngine';

export function runRiskEngineTests(): boolean {
  console.log('================================================================');
  console.log('🧠 Running Member 5 Canonical Risk Engine Tests...');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, name: string) {
    if (cond) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. Clean baseline
  const lowRisk = calculateRiskScore({
    attendanceAnomalyScore: 10,
    inspectionIssueScore: 10,
    cctvInconsistencyScore: 0,
    complaintOrAlertScore: 0,
    reportingIrregularityScore: 0,
  });
  assert(
    lowRisk.riskScore < 40 &&
      lowRisk.riskLevel === 'LOW' &&
      lowRisk.inspectionPriority === 'NORMAL' &&
      lowRisk.breakdown.attendanceContribution === 3.0 &&
      lowRisk.breakdown.inspectionContribution === 2.5,
    'Clean baseline evaluates to LOW risk (<40) and NORMAL priority'
  );

  // 2. Medium risk
  const medRisk = calculateRiskScore({
    attendanceAnomalyScore: 60, // 18.0
    inspectionIssueScore: 50,   // 12.5
    cctvInconsistencyScore: 40, // 8.0
    complaintOrAlertScore: 40,  // 6.0
    reportingIrregularityScore: 20, // 2.0 -> total 46.5
  });
  assert(
    medRisk.riskScore === 46.5 &&
      medRisk.riskLevel === 'MEDIUM' &&
      medRisk.inspectionPriority === 'PRIORITY' &&
      medRisk.recommendedActions.length > 0,
    'Moderate anomalies evaluate to MEDIUM risk (40-69) and PRIORITY inspection'
  );

  // 3. High risk
  const highRisk = calculateRiskScore({
    attendanceAnomalyScore: 90, // 27.0
    inspectionIssueScore: 80,   // 20.0
    cctvInconsistencyScore: 90, // 18.0
    complaintOrAlertScore: 80,  // 12.0
    reportingIrregularityScore: 50, // 5.0 -> total 82.0
  });
  assert(
    highRisk.riskScore === 82.0 &&
      highRisk.riskLevel === 'HIGH' &&
      highRisk.inspectionPriority === 'URGENT',
    'Severe variance evaluates to HIGH risk (>=70) and URGENT priority'
  );

  // 4. Clamping
  const clamped = calculateRiskScore({
    attendanceAnomalyScore: 150,
    inspectionIssueScore: 200,
    cctvInconsistencyScore: 100,
    complaintOrAlertScore: 100,
    reportingIrregularityScore: 100,
  });
  assert(
    clamped.riskScore === 100 && clamped.riskLevel === 'HIGH',
    'Out-of-range risk factors are clamped strictly between 0 and 100'
  );

  // 5. Attendance Anomaly Detection: Drop > 30%
  const severeDrop = detectAttendanceAnomaly([90, 92, 89, 91, 48]);
  assert(
    severeDrop.isAnomaly && severeDrop.anomalyScore >= 80,
    'detectAttendanceAnomaly identifies severe sudden drop (>30%) with score >= 80'
  );

  // 6. Normal attendance
  const normalAtt = detectAttendanceAnomaly([88, 89, 87, 86, 88]);
  assert(
    !normalAtt.isAnomaly && normalAtt.anomalyScore === 0,
    'detectAttendanceAnomaly marks normal variations as non-anomalous'
  );

  console.log(`📊 Risk Engine Results: ${passed} PASSED, ${failed} FAILED\n`);
  return failed === 0;
}

if (require.main === module) {
  const ok = runRiskEngineTests();
  process.exit(ok ? 0 : 1);
}
