import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DoSJE Central Database Seeding...');

  // 1. Clean existing records for idempotent seeding
  await prisma.evidenceItem.deleteMany();
  await prisma.inspectionReport.deleteMany();
  await prisma.vCSession.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.aIAlert.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.camera.deleteMany();
  await prisma.institute.deleteMany();
  await prisma.project.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned previous records.');

  // 2. Hash passwords and MPINs
  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  const inspectorPasswordHash = await bcrypt.hash('inspector123', 10);
  const mpinHash = await bcrypt.hash('1234', 10);

  // 3. Seed Users across personas
  const adminUser = await prisma.user.create({
    data: {
      id: 'USR-ADMIN-01',
      email: 'admin@dosje.gov.in',
      passwordHash: defaultPasswordHash,
      mpinHash,
      name: 'Dr. S. Nagaraj',
      role: 'ADMIN',
      department: 'Central Monitoring & Evaluation',
      state: 'National HQ',
      district: 'New Delhi',
      phone: '+91 11 2338 1234',
    },
  });

  const inspectorUser = await prisma.user.create({
    data: {
      id: 'USR-PMU-104',
      email: 'inspector@dosje.gov.in',
      passwordHash: inspectorPasswordHash,
      mpinHash,
      name: 'Rajesh Kumar Verma',
      role: 'INSPECTOR',
      department: 'PMU Surprise Audit Cell',
      state: 'Delhi',
      district: 'Central Delhi',
      phone: '+91 98112 34567',
    },
  });

  const pmuUser = await prisma.user.create({
    data: {
      id: 'USR-PMU-201',
      email: 'pmu@dosje.gov.in',
      passwordHash: inspectorPasswordHash,
      mpinHash,
      name: 'Priya Sharma (PMU Lead)',
      role: 'PMU',
      department: 'National PMU Operations',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      phone: '+91 98223 45678',
    },
  });

  const instituteUser = await prisma.user.create({
    data: {
      id: 'USR-INST-301',
      email: 'institute@dosje.gov.in',
      passwordHash: defaultPasswordHash,
      mpinHash,
      name: 'Anand K. Rao (Center Incharge)',
      role: 'AGENCY_REPRESENTATIVE',
      department: 'Center Operations',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      phone: '+91 98334 56789',
    },
  });

  console.log('✅ Seeded 4 primary stakeholder users.');

  // 4. Seed DoSJE Welfare Projects
  const projectSmile = await prisma.project.create({
    data: {
      id: 'PRJ-SMILE-01',
      code: 'PRJ-SMILE-DEL-101',
      name: 'SMILE Comprehensive Rehabilitation Project',
      description: 'Support for Marginalized Individuals for Livelihood and Enterprise',
      scheme: 'SMILE',
      budget: 45000000.0,
      beneficiaryCount: 180,
      state: 'Delhi',
      district: 'Central Delhi',
      status: 'ACTIVE',
    },
  });

  const projectDaksh = await prisma.project.create({
    data: {
      id: 'PRJ-DAKSH-02',
      code: 'PRJ-DAKSH-UP-204',
      name: 'PM-DAKSH Skill Development & Training Mission',
      description: 'Pradhan Mantri Dakshta Aur Kushalta Sampann Hitgrahi scheme',
      scheme: 'PM-DAKSH',
      budget: 62000000.0,
      beneficiaryCount: 320,
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      status: 'ACTIVE',
    },
  });

  const projectVayoshri = await prisma.project.create({
    data: {
      id: 'PRJ-VAYO-03',
      code: 'PRJ-VAYO-KAR-305',
      name: 'Rashtriya Vayoshri Senior Living Welfare Initiative',
      description: 'Assisted living devices & comprehensive geriatric support',
      scheme: 'VAYOSHRI',
      budget: 38000000.0,
      beneficiaryCount: 140,
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      status: 'ACTIVE',
    },
  });

  const projectShreyas = await prisma.project.create({
    data: {
      id: 'PRJ-SHREYAS-04',
      code: 'PRJ-SHREYAS-MH-408',
      name: 'SHREYAS Higher Education & Skill Coaching Center',
      description: 'Scholarships for Higher Education for Young Achievers Scheme',
      scheme: 'SHREYAS',
      budget: 52000000.0,
      beneficiaryCount: 210,
      state: 'Maharashtra',
      district: 'Pune',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Seeded 4 DoSJE flagship projects.');

  // 5. Seed Institutes with GPS Coordinates
  const instDelhi = await prisma.institute.create({
    data: {
      id: 'INST-DEL-01',
      code: 'INST-DEL-SMILE-01',
      name: 'Dr. Ambedkar National Memorial Skill Institute',
      type: 'TRAINING_INSTITUTE',
      address: '26 Alipur Road, Civil Lines, New Delhi, 110054',
      state: 'Delhi',
      district: 'Central Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      geofenceRadiusMeters: 100.0,
      contactPerson: 'Smt. Kavita Meena',
      contactPhone: '+91 11 2398 7654',
      projectId: projectSmile.id,
    },
  });

  const instLucknow = await prisma.institute.create({
    data: {
      id: 'INST-LKO-02',
      code: 'INST-LKO-DAKSH-02',
      name: 'PMU SMILE Shelter & Vocational Training Home',
      type: 'SHELTER_HOME',
      address: 'Sector 4, Gomti Nagar, Lucknow, Uttar Pradesh, 226010',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      latitude: 26.8467,
      longitude: 80.9462,
      geofenceRadiusMeters: 100.0,
      contactPerson: 'Shri Manoj Saxena',
      contactPhone: '+91 522 2345 678',
      projectId: projectDaksh.id,
    },
  });

  const instBlr = await prisma.institute.create({
    data: {
      id: 'INST-BLR-03',
      code: 'INST-BLR-VAYO-03',
      name: 'DoSJE Vayoshri Senior Living Welfare Home',
      type: 'HOSTEL',
      address: 'Jayanagar 4th Block, Bengaluru, Karnataka, 560011',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      latitude: 12.9716,
      longitude: 77.5946,
      geofenceRadiusMeters: 100.0,
      contactPerson: 'Anand K. Rao',
      contactPhone: '+91 80 2654 3210',
      projectId: projectVayoshri.id,
    },
  });

  const instPune = await prisma.institute.create({
    data: {
      id: 'INST-PUN-04',
      code: 'INST-PUN-SHREYAS-04',
      name: 'Divyangjan Rehabilitation & Skill Academy',
      type: 'TRAINING_INSTITUTE',
      address: 'Shivaji Nagar, Pune, Maharashtra, 411005',
      state: 'Maharashtra',
      district: 'Pune',
      latitude: 18.5204,
      longitude: 73.8567,
      geofenceRadiusMeters: 100.0,
      contactPerson: 'Dr. Sunita Deshmukh',
      contactPhone: '+91 20 2553 4567',
      projectId: projectShreyas.id,
    },
  });

  console.log('✅ Seeded 4 institutes with GPS coordinates.');

  // 6. Seed Cameras (3-Camera Simulation layer matching Phase 5)
  const cam1 = await prisma.camera.create({
    data: {
      id: 'CAM-01',
      cameraId: 'CAM-MOSJE-01',
      name: 'Main Gate & Ingress Portal',
      rtspUrl: 'http://localhost:8000/api/v1/stream/CAM-MOSJE-01',
      streamType: 'SIMULATED',
      instituteId: instDelhi.id,
      zone: 'ENTRY',
      status: 'ONLINE',
      fps: 25,
      resolution: '1920x1080',
    },
  });

  const cam2 = await prisma.camera.create({
    data: {
      id: 'CAM-02',
      cameraId: 'CAM-MOSJE-02',
      name: 'Classroom & Vocational Hall',
      rtspUrl: 'http://localhost:8000/api/v1/stream/CAM-MOSJE-02',
      streamType: 'SIMULATED',
      instituteId: instDelhi.id,
      zone: 'CLASSROOM_1',
      status: 'ONLINE',
      fps: 25,
      resolution: '1920x1080',
    },
  });

  const cam3 = await prisma.camera.create({
    data: {
      id: 'CAM-03',
      cameraId: 'CAM-MOSJE-03',
      name: 'Dining & Common Activity Hall',
      rtspUrl: 'http://localhost:8000/api/v1/stream/CAM-MOSJE-03',
      streamType: 'SIMULATED',
      instituteId: instDelhi.id,
      zone: 'DINING',
      status: 'ONLINE',
      fps: 25,
      resolution: '1920x1080',
    },
  });

  const cam4 = await prisma.camera.create({
    data: {
      id: 'CAM-04',
      cameraId: 'CAM-MOSJE-04',
      name: 'Dormitory Security Corridor',
      rtspUrl: 'http://localhost:8000/api/v1/stream/CAM-MOSJE-04',
      streamType: 'SIMULATED',
      instituteId: instLucknow.id,
      zone: 'HOSTEL_A',
      status: 'ONLINE',
      fps: 25,
      resolution: '1920x1080',
    },
  });

  const cam5 = await prisma.camera.create({
    data: {
      id: 'CAM-05',
      cameraId: 'CAM-MOSJE-05',
      name: 'Perimeter East Boundary Gate',
      rtspUrl: 'http://localhost:8000/api/v1/stream/CAM-MOSJE-05',
      streamType: 'SIMULATED',
      instituteId: instBlr.id,
      zone: 'CORRIDOR',
      status: 'DEGRADED',
      fps: 15,
      resolution: '1280x720',
    },
  });

  const cam6 = await prisma.camera.create({
    data: {
      id: 'CAM-06',
      cameraId: 'CAM-MOSJE-06',
      name: 'Confidential Records & NVR Server Room',
      rtspUrl: 'http://localhost:8000/api/v1/stream/CAM-MOSJE-06',
      streamType: 'SIMULATED',
      instituteId: instLucknow.id,
      zone: 'CORRIDOR',
      status: 'OFFLINE',
      fps: 0,
      resolution: '1920x1080',
    },
  });

  console.log('✅ Seeded 6 CCTV feeds across monitored institutes.');

  // 7. Seed Initial AI Alerts
  await prisma.aIAlert.create({
    data: {
      alertId: 'ALT-2026-001',
      cameraId: cam1.id,
      instituteId: instDelhi.id,
      type: 'RESTRICTED_ZONE_BREACH',
      severity: 'CRITICAL',
      description: 'Presence detected in restricted document vault zone. Operational verification recommended.',
      zone: 'ZN-VAULT-01',
      detectedCount: 1,
      expectedCount: 0,
      confidence: 0.94,
      frameSnapshotUrl: '/data/evidence/evidence_demo.jpg',
      acknowledged: true,
      acknowledgedBy: 'Dr. S. Nagaraj',
      acknowledgedAt: new Date(Date.now() - 3600000),
      resolved: false,
    },
  });

  await prisma.aIAlert.create({
    data: {
      alertId: 'ALT-2026-002',
      cameraId: cam6.id,
      instituteId: instLucknow.id,
      type: 'CCTV_OFFLINE',
      severity: 'HIGH',
      description: 'NVR stream signal loss on Camera 06. Telemetry heartbeat lost for > 15 minutes.',
      zone: 'CORRIDOR',
      detectedCount: 0,
      expectedCount: 1,
      confidence: 0.99,
      acknowledged: false,
      resolved: false,
    },
  });

  await prisma.aIAlert.create({
    data: {
      alertId: 'ALT-2026-003',
      cameraId: cam2.id,
      instituteId: instDelhi.id,
      type: 'HEADCOUNT_ANOMALY',
      severity: 'HIGH',
      description: 'Observed occupancy (14) differs materially from reported attendance (42). Operational verification recommended.',
      zone: 'CLASSROOM_1',
      detectedCount: 14,
      expectedCount: 42,
      confidence: 0.89,
      acknowledged: false,
      resolved: false,
    },
  });

  console.log('✅ Seeded initial AI intelligence alerts.');

  // 8. Seed Routine and Surprise Inspections
  const inspScheduled = await prisma.inspection.create({
    data: {
      id: 'INS-2026-001',
      inspectionNumber: 'DOSJE-SURPRISE-104',
      instituteId: instDelhi.id,
      inspectorId: inspectorUser.id,
      type: 'SURPRISE',
      status: 'SCHEDULED',
      scheduledDate: new Date(),
      isSurprise: true,
      geofenceVerified: false,
      riskScore: 78.5,
      notes: 'High telemetry risk audit triggered by offline camera & attendance discrepancy alert.',
    },
  });

  const inspCompleted = await prisma.inspection.create({
    data: {
      id: 'INS-2026-002',
      inspectionNumber: 'DOSJE-ROUTINE-082',
      instituteId: instBlr.id,
      inspectorId: inspectorUser.id,
      type: 'ROUTINE',
      status: 'COMPLETED',
      scheduledDate: new Date(Date.now() - 3 * 24 * 3600000),
      completedDate: new Date(Date.now() - 3 * 24 * 3600000 + 7200000),
      isSurprise: false,
      geofenceVerified: true,
      arrivalLatitude: 12.9716,
      arrivalLongitude: 77.5946,
      arrivalTimestamp: new Date(Date.now() - 3 * 24 * 3600000 + 1200000),
      riskScore: 28.0,
      notes: 'Satisfactory routine bi-monthly audit.',
    },
  });

  // 9. Inspection Report for Completed Inspection
  await prisma.inspectionReport.create({
    data: {
      inspectionId: inspCompleted.id,
      summary: 'Verified infrastructure, sanitation and biometric registers. 38/40 beneficiaries physically present.',
      beneficiariesVerified: 38,
      attendanceMatches: true,
      infrastructureRating: 4,
      sanitationRating: 5,
      hygieneRating: 4,
      foodQualityRating: 4,
      recommendations: 'Maintain backup battery for local CCTV storage drive.',
      actionRequired: false,
    },
  });

  // 10. Seed Evidence Items with Cryptographic Hashes
  await prisma.evidenceItem.create({
    data: {
      inspectionId: inspCompleted.id,
      fileUrl: '/data/evidence/evidence_demo.jpg',
      fileType: 'IMAGE',
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      latitude: 12.9716,
      longitude: 77.5946,
      tamperEvident: true,
    },
  });

  // 11. Initial Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      userRole: 'ADMIN',
      action: 'SYSTEM_INITIALIZATION',
      entity: 'SYSTEM',
      details: 'DoSJE Central Surveillance & Monitoring System initialized and seeded successfully.',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🎉 Seed completed successfully! Database is ready.');
}

main()
  .catch((e) => {
    console.error('Seed failure:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
