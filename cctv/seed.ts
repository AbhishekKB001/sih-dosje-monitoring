import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding initial SIH inspection platform data...');

    // 1. Projects
    const project1 = await prisma.project.upsert({
        where: { code: 'PRJ-DEL-01' },
        update: {},
        create: {
            name: 'ABC Rehabilitation Centre',
            code: 'PRJ-DEL-01',
            location: 'Sector 14, New Delhi',
            description: 'Central vocational training and physical rehabilitation facility',
        },
    });

    const project2 = await prisma.project.upsert({
        where: { code: 'PRJ-BLR-02' },
        update: {},
        create: {
            name: 'National Skill Development Institute',
            code: 'PRJ-BLR-02',
            location: 'Whitefield, Bengaluru',
            description: 'Advanced technical workforce development center',
        },
    });

    // 2. Users across roles
    const inspector = await prisma.user.upsert({
        where: { email: 'rajesh.inspector@sih.gov.in' },
        update: {},
        create: {
            name: 'Dr. Rajesh Sharma',
            email: 'rajesh.inspector@sih.gov.in',
            role: Role.INSPECTOR,
            isAvailable: true,
        },
    });

    // Project 1 Participants
    const incharge1 = await prisma.user.upsert({
        where: { email: 'suresh.incharge@rehab.org' },
        update: {},
        create: {
            name: 'Suresh Menon',
            email: 'suresh.incharge@rehab.org',
            role: Role.PROJECT_INCHARGE,
            projectId: project1.id,
            isAvailable: true,
        },
    });

    const staff1 = await prisma.user.upsert({
        where: { email: 'ananya.staff@rehab.org' },
        update: {},
        create: {
            name: 'Ananya Deshmukh',
            email: 'ananya.staff@rehab.org',
            role: Role.STAFF,
            projectId: project1.id,
            isAvailable: true,
        },
    });

    const staff2 = await prisma.user.upsert({
        where: { email: 'vikram.staff@rehab.org' },
        update: {},
        create: {
            name: 'Vikram Malhotra',
            email: 'vikram.staff@rehab.org',
            role: Role.STAFF,
            projectId: project1.id,
            isAvailable: true,
        },
    });

    const beneficiary1 = await prisma.user.upsert({
        where: { email: 'ravi.kumar@beneficiary.in' },
        update: {},
        create: {
            name: 'Ravi Kumar',
            email: 'ravi.kumar@beneficiary.in',
            role: Role.BENEFICIARY,
            projectId: project1.id,
            isAvailable: true,
        },
    });

    const beneficiary2 = await prisma.user.upsert({
        where: { email: 'sunita.devi@beneficiary.in' },
        update: {},
        create: {
            name: 'Sunita Devi',
            email: 'sunita.devi@beneficiary.in',
            role: Role.BENEFICIARY,
            projectId: project1.id,
            isAvailable: true,
        },
    });

    // Project 2 Participants
    await prisma.user.upsert({
        where: { email: 'kavita.incharge@nsdc.in' },
        update: {},
        create: {
            name: 'Kavita Rao',
            email: 'kavita.incharge@nsdc.in',
            role: Role.PROJECT_INCHARGE,
            projectId: project2.id,
            isAvailable: true,
        },
    });

    await prisma.user.upsert({
        where: { email: 'arjun.staff@nsdc.in' },
        update: {},
        create: {
            name: 'Arjun Verma',
            email: 'arjun.staff@nsdc.in',
            role: Role.STAFF,
            projectId: project2.id,
            isAvailable: true,
        },
    });

    await prisma.user.upsert({
        where: { email: 'deepak.patel@beneficiary.in' },
        update: {},
        create: {
            name: 'Deepak Patel',
            email: 'deepak.patel@beneficiary.in',
            role: Role.BENEFICIARY,
            projectId: project2.id,
            isAvailable: true,
        },
    });

    // 3. CCTV Cameras for Project 1
    const cam1 = await prisma.camera.upsert({
        where: { streamKey: 'camera-1' },
        update: {},
        create: {
            name: 'Main Entrance Gate (Live Demo)',
            location: 'North Perimeter Gate',
            projectId: project1.id,
            rtspUrl: 'rtsp://localhost:8554/live/camera-1',
            streamKey: 'camera-1',
            protocol: 'RTSP',
            status: 'ONLINE',
            healthStatus: 'HEALTHY',
            lastSeen: new Date(),
        },
    });

    await prisma.camera.upsert({
        where: { streamKey: 'camera-2' },
        update: {},
        create: {
            name: 'Vocational Training Hall',
            location: 'Workshop Block B',
            projectId: project1.id,
            rtspUrl: 'rtsp://localhost:8554/live/camera-2',
            streamKey: 'camera-2',
            protocol: 'RTSP',
            status: 'OFFLINE',
            healthStatus: 'UNREACHABLE',
        },
    });

    await prisma.camera.upsert({
        where: { streamKey: 'camera-3' },
        update: {},
        create: {
            name: 'Admin Corridor & Reception',
            location: 'Ground Floor Lobby',
            projectId: project1.id,
            rtspUrl: 'rtsp://localhost:8554/live/camera-3',
            streamKey: 'camera-3',
            protocol: 'RTSP',
            status: 'OFFLINE',
            healthStatus: 'UNREACHABLE',
        },
    });

    // Camera for Project 2
    await prisma.camera.upsert({
        where: { streamKey: 'camera-4' },
        update: {},
        create: {
            name: 'Campus Perimeter East',
            location: 'East Perimeter Wall',
            projectId: project2.id,
            rtspUrl: 'rtsp://localhost:8554/live/camera-4',
            streamKey: 'camera-4',
            protocol: 'RTSP',
            status: 'OFFLINE',
            healthStatus: 'UNREACHABLE',
        },
    });

    // 4. Initial CCTV Alert
    await prisma.cctvAlert.create({
        data: {
            cameraId: cam1.id,
            eventType: 'SYSTEM_INITIALIZED',
            severity: 'INFO',
            message: 'CCTV surveillance pipeline initialized for Project ABC Rehabilitation Centre',
        },
    });

    // 5. Active Inspection Record
    const inspection = await prisma.inspection.create({
        data: {
            projectId: project1.id,
            inspectorId: inspector.id,
            status: 'IN_PROGRESS',
        },
    });

    console.log(`Database seeded successfully!`);
    console.log(`Project 1 ID: ${project1.id}`);
    console.log(`Inspection ID: ${inspection.id}`);
    console.log(`Inspector ID: ${inspector.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
