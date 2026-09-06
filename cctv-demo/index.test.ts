import { CctvService } from '../src/modules/cctv/cctv.service.js';
import { RandomParticipantService } from '../src/modules/vc/random-participant.service.js';
import { VcService } from '../src/modules/vc/vc.service.js';
import { prisma } from '../src/prisma.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
    if (condition) {
        console.log(`  ✓ PASS: ${testName}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${testName}`);
        failed++;
    }
}

async function runTests() {
    console.log('\n==================================================');
    console.log('  SIH Member 3 — Automated Unit & Integration Tests');
    console.log('==================================================\n');

    // Retrieve seeded project and users
    const project = await prisma.project.findFirst();
    if (!project) throw new Error('Seeded project not found');

    const inspector = await prisma.user.findFirst({ where: { role: 'INSPECTOR' } });
    if (!inspector) throw new Error('Seeded inspector not found');

    const inspection = await prisma.inspection.findFirst({ where: { projectId: project.id } });
    if (!inspection) throw new Error('Seeded inspection not found');

    // ----------------------------------------------------
    // CCTV TEST SUITE
    // ----------------------------------------------------
    console.log('[TEST SUITE 1: CCTV Surveillance System]');

    // Test 1: URL Masking
    const plainRtsp = 'rtsp://admin:supersecret99@192.168.1.100:554/h264';
    const masked = CctvService.maskRtspUrl(plainRtsp);
    assert(
        !masked.includes('supersecret99') && masked.includes('***'),
        'Security: Sensitive RTSP credentials correctly masked'
    );

    // Test 2: Stream Endpoints Generation
    const endpoints = CctvService.getStreamEndpoints('camera-test-01');
    assert(
        endpoints.hlsUrl.includes('8888') && endpoints.hlsUrl.endsWith('.m3u8'),
        'Stream URL: HLS manifest URL generated correctly'
    );
    assert(
        endpoints.webrtcUrl.includes('8889') && endpoints.webrtcUrl.endsWith('/whep'),
        'Stream URL: WebRTC WHEP endpoint generated correctly'
    );

    // Test 3: Camera Creation & Mapping
    const newCam = await CctvService.createCamera({
        name: 'Unit Test Gate Camera',
        location: 'Gate 4',
        projectId: project.id,
        rtspUrl: 'rtsp://localhost:8554/live/test-cam',
        streamKey: `test-${Date.now()}`,
    });
    assert(!!newCam.id, 'CCTV CRUD: Camera registered successfully in DB');
    assert(newCam.projectId === project.id, 'CCTV Mapping: Camera correctly mapped to target Project');

    // Test 4: Camera Listing & Project Filter
    const projectCams = await CctvService.listCameras(project.id);
    assert(projectCams.length >= 1, 'CCTV Query: Filter cameras by Project ID operates correctly');

    // Test 5: Camera Update
    const updatedCam = await CctvService.updateCamera(newCam.id, { location: 'Gate 4 North' });
    assert(updatedCam.location === 'Gate 4 North', 'CCTV CRUD: Camera location updated successfully');

    // Test 6: Camera Enable / Disable Toggle
    const disabledCam = await CctvService.toggleCamera(newCam.id, false);
    assert(disabledCam.enabled === false && disabledCam.status === 'DISABLED', 'CCTV Status: Camera disable toggle sets status to DISABLED');

    // Test 7: Camera Deletion
    await CctvService.deleteCamera(newCam.id);
    const checkDeleted = await CctvService.getCameraById(newCam.id);
    assert(checkDeleted === null, 'CCTV CRUD: Camera deleted successfully');

    // Test 8: Invalid RTSP URL probe
    const probeInvalid = await CctvService.testConnection('http://invalid-url');
    assert(!probeInvalid.success, 'CCTV Probe: Invalid RTSP scheme correctly rejected');

    // ----------------------------------------------------
    // VIDEO CONFERENCING TEST SUITE
    // ----------------------------------------------------
    console.log('\n[TEST SUITE 2: Random Video Conferencing (VC) System]');

    // Test 9: Random Participant Selection
    const selection = await RandomParticipantService.selectParticipant({
        projectId: project.id,
        inspectionId: inspection.id,
    });
    assert(!!selection.selectedUser.id, 'VC Selection: Eligible participant selected successfully');
    assert(
        ['PROJECT_INCHARGE', 'STAFF', 'BENEFICIARY'].includes(selection.selectedUser.role),
        `VC Role Filter: Selected user has valid eligible role (${selection.selectedUser.role})`
    );
    assert(selection.totalEligiblePool > 0, 'VC Pool: Eligible candidate pool quantified correctly');

    // Test 10: Unavailable user exclusion
    const tempUser = await prisma.user.create({
        data: {
            name: 'Temporarily Inactive User',
            email: `inactive-${Date.now()}@sih.gov.in`,
            role: 'STAFF',
            projectId: project.id,
            isAvailable: false, // Inactive!
        },
    });

    // Verify inactive user is never selected across 10 iterations
    let inactiveSelected = false;
    for (let i = 0; i < 10; i++) {
        const pick = await RandomParticipantService.selectParticipant({
            projectId: project.id,
            inspectionId: inspection.id,
        });
        if (pick.selectedUser.id === tempUser.id) {
            inactiveSelected = true;
            break;
        }
    }
    assert(!inactiveSelected, 'VC Availability: Inactive/unavailable users are excluded from random selection');
    await prisma.user.delete({ where: { id: tempUser.id } });

    // Test 11: VC Session Initiation & Room ID
    const vcSessionData = await VcService.initiateRandomVcSession({
        inspectionId: inspection.id,
        initiatedById: inspector.id,
    });
    assert(!!vcSessionData.session.id, 'VC Session: Session created in database');
    assert(vcSessionData.roomId.startsWith('inspection-room-'), 'VC Room: Unique WebRTC room ID generated');
    assert(vcSessionData.session.status === 'REQUESTED', 'VC Lifecycle: Initial call status is REQUESTED');

    // Test 12: STUN / TURN Config
    assert(vcSessionData.iceServers.length >= 1, 'WebRTC ICE: STUN/TURN configuration delivered');

    // Test 13: Call Status Transitions
    const accepted = await VcService.updateSessionStatus(vcSessionData.session.id, 'CONNECTED');
    assert(accepted.status === 'CONNECTED' && !!accepted.connectedAt, 'VC Lifecycle: Status updated to CONNECTED with timestamp');

    // Test 14: Verification Result Submission
    const verified = await VcService.submitVerificationResult(
        vcSessionData.session.id,
        'VERIFIED',
        'Automated unit test verification note'
    );
    assert(verified.result === 'VERIFIED', 'VC Verification: Result VERIFIED saved');
    assert(verified.status === 'ENDED', 'VC Verification: Session marked ENDED upon verification');

    console.log('\n==================================================');
    console.log(`Test Execution Complete: ${passed} Passed, ${failed} Failed`);
    console.log('==================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests()
    .catch((err) => {
        console.error('Fatal Test Suite Error:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
