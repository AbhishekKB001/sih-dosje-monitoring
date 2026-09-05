import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

async function runBackendTests() {
  console.log('================================================================');
  console.log('🚀 Running Central Backend Integration Tests...');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health
    const health = await request(app).get('/api/health');
    assert(health.status === 200 && health.body.status === 'UP', 'GET /api/health returns status UP');

    // 2. Auth Login
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@dosje.gov.in',
      password: 'admin123',
    });
    assert(adminLogin.status === 200 && !!adminLogin.body.token, 'POST /api/auth/login succeeds for ADMIN');
    const adminToken = adminLogin.body.token;

    // 3. MPIN Login
    const mpinLogin = await request(app).post('/api/auth/mpin').send({
      email: 'inspector@dosje.gov.in',
      mpin: '1234',
    });
    assert(mpinLogin.status === 200 && mpinLogin.body.user.role === 'INSPECTOR', 'POST /api/auth/mpin succeeds for INSPECTOR');
    const inspectorToken = mpinLogin.body.token;

    // 4. Server-side RBAC
    const unauthorizedCreate = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ name: 'Unauthorized', email: 'unauth@dosje.gov.in', password: 'pwd', role: 'ADMIN' });
    assert(unauthorizedCreate.status === 403, 'Server-Side RBAC: INSPECTOR blocked from ADMIN user creation (403)');

    // 5. Dashboard Stats
    const stats = await request(app).get('/api/dashboard/stats');
    assert(
      stats.status === 200 &&
        stats.body.totalProjects >= 4 &&
        stats.body.activeInstitutes >= 4 &&
        stats.body.activeCameras >= 4,
      'GET /api/dashboard/stats returns real database metrics'
    );

    // 6. Projects & Institutes
    const projects = await request(app).get('/api/projects');
    assert(projects.status === 200 && projects.body.length >= 4, 'GET /api/projects returns seeded flagship projects');

    const institutes = await request(app).get('/api/institutes');
    assert(
      institutes.status === 200 &&
        institutes.body[0].lat !== undefined &&
        institutes.body[0].cctvStatus !== undefined,
      'GET /api/institutes returns GPS coordinates & CCTV status'
    );

    // 7. CCTV Cameras
    const cameras = await request(app).get('/api/cctv/cameras');
    assert(cameras.status === 200 && cameras.body.length >= 6, 'GET /api/cctv/cameras returns 6 registered CCTV feeds');

    // 8. Weighted Random Inspection Engine
    const randomAssign = await request(app)
      .post('/api/inspections/random-assign')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(
      randomAssign.status === 201 &&
        randomAssign.body.success &&
        randomAssign.body.duty.isSurpriseAudit === true,
      'POST /api/inspections/random-assign allocates surprise duty from telemetry risk'
    );
    const inspectionId = randomAssign.body.duty.id;

    // 9. Geofence Arrival Verification
    const duty = randomAssign.body.duty;
    const geofence = await request(app)
      .post(`/api/inspections/${inspectionId}/verify-geofence`)
      .send({ latitude: duty.lat, longitude: duty.lng });
    assert(geofence.status === 200 && geofence.body.geofenceVerified === true, 'POST /api/inspections/:id/verify-geofence verifies arrival within 100m');

    // 10. Inspection Report Submission
    const report = await request(app)
      .post(`/api/inspections/${inspectionId}/report`)
      .send({
        summary: 'Field audit completed. Biometric attendance verified.',
        beneficiariesVerified: 42,
        attendanceMatches: true,
        infrastructureRating: 5,
        sanitationRating: 4,
      });
    assert(report.status === 200 && report.body.inspection.status === 'completed', 'POST /api/inspections/:id/report completes inspection');

    // 11. AI Webhook & Alert Lifecycle
    const aiAlert = await request(app).post('/api/alerts').send({
      alert_id: `ALT-TEST-${Date.now()}`,
      camera_id: 'CAM-MOSJE-01',
      alert_type: 'RESTRICTED_ZONE_BREACH',
      severity: 'CRITICAL',
      explanation: 'Presence detected in restricted document room.',
      zone: 'ZN-VAULT-01',
    });
    assert(aiAlert.status === 201 && aiAlert.body.alert.severity === 'critical', 'POST /api/alerts records AI detected event from webhook');
    const alertId = aiAlert.body.alert.id;

    const ackAlert = await request(app)
      .patch(`/api/alerts/${alertId}`)
      .send({ status: 'acknowledged', user: 'Dr. S. Nagaraj' });
    assert(ackAlert.status === 200 && ackAlert.body.alert.status === 'acknowledged', 'PATCH /api/alerts/:id updates status to acknowledged');

    const resolveAlert = await request(app)
      .patch(`/api/alerts/${alertId}`)
      .send({ status: 'resolved', notes: 'Authorized entry confirmed' });
    assert(resolveAlert.status === 200 && resolveAlert.body.alert.status === 'resolved', 'PATCH /api/alerts/:id updates status to resolved');

    // 12. Attendance Discrepancy Flagging
    const att = await request(app).post('/api/attendance').send({
      totalEnrolled: 50,
      physicalCount: 45,
      bioMetricCount: 25, // 20 variance -> triggers discrepancy flag
    });
    assert(att.status === 201 && att.body.discrepancyFlag === true, 'POST /api/attendance flags material discrepancy and triggers alert');

    // 13. Cryptographic Evidence
    const evd = await request(app).post('/api/evidence').send({
      inspectionId,
      rawBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
    });
    assert(evd.status === 201 && !!evd.body.evidence.sha256Hash, 'POST /api/evidence cryptographically seals snapshot with SHA-256');

    // 14. Immutable Audit Logs
    const logs = await request(app).get('/api/audit-logs');
    assert(logs.status === 200 && logs.body.length >= 2, 'GET /api/audit-logs records all administrative & inspection actions');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log('================================================================');
    console.log(`📊 Backend Integration Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runBackendTests();
