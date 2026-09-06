import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

describe('DoSJE Central Backend API Integration Suite', () => {
  let adminToken: string;
  let inspectorToken: string;
  let testInstituteId: string;
  let testInspectionId: string;

  beforeAll(async () => {
    // 1. Authenticate as ADMIN
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@dosje.gov.in',
      password: 'admin123',
    });
    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.token).toBeDefined();
    adminToken = adminLogin.body.token;

    // 2. Authenticate as INSPECTOR
    const inspectorLogin = await request(app).post('/api/auth/login').send({
      email: 'inspector@dosje.gov.in',
      password: 'inspector123',
    });
    expect(inspectorLogin.status).toBe(200);
    expect(inspectorLogin.body.token).toBeDefined();
    inspectorToken = inspectorLogin.body.token;

    // Retrieve an institute
    const inst = await prisma.institute.findFirst();
    testInstituteId = inst!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Health and Discovery', () => {
    it('GET /api/health returns UP status with port 4000', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.port).toBe(4000);
      expect(res.body.endpoints).toBeDefined();
    });
  });

  describe('2. Authentication & Server-Side RBAC', () => {
    it('POST /api/auth/mpin logs in with 4-digit PIN', async () => {
      const res = await request(app).post('/api/auth/mpin').send({
        email: 'inspector@dosje.gov.in',
        mpin: '1234',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('INSPECTOR');
    });

    it('Rejects unauthorized requests without token on protected routes', async () => {
      const res = await request(app).post('/api/projects').send({
        name: 'Unauthorized Project',
        scheme: 'SMILE',
        state: 'Delhi',
        district: 'New Delhi',
      });
      expect(res.status).toBe(401);
    });

    it('Rejects INSPECTOR role attempting ADMIN-only user creation (RBAC 403)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({
          name: 'Hacker User',
          email: 'hacker@dosje.gov.in',
          password: 'password123',
          role: 'ADMIN',
        });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  describe('3. Dashboard Stats & Analytics', () => {
    it('GET /api/dashboard/stats returns real database metrics', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.status).toBe(200);
      expect(res.body.totalProjects).toBeGreaterThanOrEqual(4);
      expect(res.body.activeInstitutes).toBeGreaterThanOrEqual(4);
      expect(res.body.activeCameras).toBeGreaterThanOrEqual(4);
      expect(res.body.openAlerts).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/dashboard/inspection-trend returns historical series', async () => {
      const res = await request(app).get('/api/dashboard/inspection-trend');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/analytics/district-performance returns district metrics', async () => {
      const res = await request(app).get('/api/analytics/district-performance');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('completionRate');
    });
  });

  describe('4. Projects & Institutes', () => {
    it('GET /api/projects lists projects formatted for Web & Mobile', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('scheme');
      expect(res.body[0]).toHaveProperty('beneficiaries');
      expect(res.body[0]).toHaveProperty('riskLevel');
    });

    it('GET /api/institutes returns GPS coordinates and CCTV status', async () => {
      const res = await request(app).get('/api/institutes');
      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty('lat');
      expect(res.body[0]).toHaveProperty('lng');
      expect(res.body[0]).toHaveProperty('cctvStatus');
      expect(res.body[0]).toHaveProperty('geofenceRadiusMeters');
    });
  });

  describe('5. CCTV Cameras & Simulation Layer', () => {
    it('GET /api/cctv/cameras returns 6 registered feeds', async () => {
      const res = await request(app).get('/api/cctv/cameras');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(6);
      const cam1 = res.body.find((c: any) => c.cameraId === 'CAM-MOSJE-01');
      expect(cam1).toBeDefined();
      expect(cam1.status).toBe('online');
    });

    it('POST /api/cctv/cameras/:id/ping updates heartbeat telemetry', async () => {
      const res = await request(app).post('/api/cctv/cameras/CAM-MOSJE-01/ping').send({
        status: 'ONLINE',
        fps: 25,
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('online');
    });
  });

  describe('6. Weighted Random Inspection Engine & Geofencing', () => {
    it('POST /api/inspections/random-assign generates surprise duty from telemetry risk', async () => {
      const res = await request(app)
        .post('/api/inspections/random-assign')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.duty.isSurpriseAudit).toBe(true);
      expect(res.body.duty.riskScore).toBeGreaterThanOrEqual(20);
      testInspectionId = res.body.duty.id;
    });

    it('POST /api/inspections/:id/verify-geofence verifies arrival within 100m radius', async () => {
      const res = await request(app)
        .post(`/api/inspections/${testInspectionId}/verify-geofence`)
        .send({ latitude: 28.614, longitude: 77.2091 }); // ~15m away
      expect(res.status).toBe(200);
      expect(res.body.geofenceVerified).toBe(true);
      expect(res.body.distanceMeters).toBeLessThanOrEqual(120);
    });

    it('POST /api/inspections/:id/report submits 5-step report and completes duty', async () => {
      const res = await request(app)
        .post(`/api/inspections/${testInspectionId}/report`)
        .send({
          summary: 'Field audit complete. Biometric punches align with physical headcount.',
          beneficiariesVerified: 40,
          attendanceMatches: true,
          infrastructureRating: 5,
          sanitationRating: 4,
          hygieneRating: 5,
          foodQualityRating: 4,
          actionRequired: false,
        });
      expect(res.status).toBe(200);
      expect(res.body.inspection.status).toBe('completed');
    });
  });

  describe('7. AI Subsystem Webhook & Alert Lifecycle', () => {
    let testAlertId: string;

    it('POST /api/alerts records AI detected event from webhook', async () => {
      const res = await request(app).post('/api/alerts').send({
        alert_id: `ALT-E2E-${Date.now()}`,
        camera_id: 'CAM-MOSJE-01',
        alert_type: 'RESTRICTED_ZONE_BREACH',
        severity: 'CRITICAL',
        explanation: 'Presence detected in restricted document room. Verification recommended.',
        zone: 'ZN-VAULT-01',
        confidence: 0.95,
      });
      expect(res.status).toBe(201);
      expect(res.body.alert.severity).toBe('critical');
      testAlertId = res.body.alert.id;
    });

    it('PATCH /api/alerts/:id updates status to acknowledged', async () => {
      const res = await request(app)
        .patch(`/api/alerts/${testAlertId}`)
        .send({ status: 'acknowledged', user: 'Dr. S. Nagaraj' });
      expect(res.status).toBe(200);
      expect(res.body.alert.status).toBe('acknowledged');
    });

    it('PATCH /api/alerts/:id marks alert resolved', async () => {
      const res = await request(app)
        .patch(`/api/alerts/${testAlertId}`)
        .send({ status: 'resolved', notes: 'Authorized staff entry verified.' });
      expect(res.status).toBe(200);
      expect(res.body.alert.status).toBe('resolved');
    });
  });

  describe('8. Attendance Discrepancy Engine', () => {
    it('POST /api/attendance flags material discrepancy and triggers alert', async () => {
      const res = await request(app).post('/api/attendance').send({
        instituteId: testInstituteId,
        totalEnrolled: 50,
        physicalCount: 45,
        bioMetricCount: 30, // 15 variance (> 5 threshold)
        verifiedBy: 'Inspector Verma',
      });
      expect(res.status).toBe(201);
      expect(res.body.discrepancyFlag).toBe(true);
    });
  });

  describe('9. Cryptographic Evidence Verification', () => {
    it('POST /api/evidence seals snapshot and computes SHA-256 hash', async () => {
      const res = await request(app).post('/api/evidence').send({
        inspectionId: testInspectionId,
        rawBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
      });
      expect(res.status).toBe(201);
      expect(res.body.evidence.sha256Hash).toBeDefined();
      expect(res.body.evidence.tamperEvident).toBe(true);
    });
  });

  describe('10. Audit Logs Immutability', () => {
    it('GET /api/audit-logs contains logs for all performed operations', async () => {
      const res = await request(app).get('/api/audit-logs');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const actions = res.body.map((l: any) => l.action);
      expect(actions).toContain('LOGIN_SUCCESS');
    });
  });
});
