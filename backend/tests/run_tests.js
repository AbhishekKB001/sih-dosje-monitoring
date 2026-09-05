const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const prisma = require("../config/database");
const { generateToken } = require("../utils/jwt");

const BASE_URL = "http://localhost:5000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
    if (condition) {
        passedCount++;
        console.log(`  ✓ PASS: ${message}`);
    } else {
        failedCount++;
        console.error(`  ✗ FAIL: ${message}`);
    }
}

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
        "Content-Type": "application/json",
        ...(options.token && { Authorization: `Bearer ${options.token}` }),
        ...options.headers,
    };

    const res = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let data;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        data = await res.json();
    } else {
        data = await res.text();
    }

    return { status: res.status, ok: res.ok, data };
}

async function runSuite() {
    console.log("==================================================");
    console.log("STARTING MEMBER 1 AUTOMATED COMPREHENSIVE TEST SUITE");
    console.log("==================================================\n");

    // Retrieve test admin user or create one if needed
    let adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN", status: "ACTIVE" },
    });

    if (!adminUser) {
        const { hashPassword } = require("../utils/password");
        adminUser = await prisma.user.create({
            data: {
                name: "System Administrator",
                email: "admin.test@dosje.gov.in",
                passwordHash: await hashPassword("Admin@Secure123!"),
                role: "ADMIN",
                status: "ACTIVE",
            },
        });
    }

    const adminToken = generateToken(adminUser);

    const testTimestamp = Date.now();
    const testEmail = `inspector_${testTimestamp}@dosje.gov.in`;
    const testViewerEmail = `viewer_${testTimestamp}@dosje.gov.in`;

    // 1. HEALTH & CONNECTIVITY
    console.log("1. Health & Database Connectivity Tests:");
    const rootRes = await request("/");
    assert(rootRes.status === 200 && rootRes.data.message.includes("DoSJE"), "GET / returns 200 OK");

    const dbRes = await request("/api/test-db");
    assert(dbRes.status === 200 && dbRes.data.success === true, "GET /api/test-db returns DB connected");

    // 2. AUTHENTICATION & VALIDATION
    console.log("\n2. Authentication & Validation Tests:");
    const regRes = await request("/api/auth/register", {
        method: "POST",
        body: {
            name: "Test Viewer",
            email: testViewerEmail,
            password: "Password123!",
            role: "VIEWER",
        },
    });
    assert(regRes.status === 201 && regRes.data.user.email === testViewerEmail, "POST /api/auth/register creates user");
    assert(!regRes.data.user.passwordHash, "passwordHash is NEVER returned in register response");
    const viewerId = regRes.data.user.id;

    // Duplicate email registration test
    const dupRegRes = await request("/api/auth/register", {
        method: "POST",
        body: {
            name: "Duplicate Viewer",
            email: testViewerEmail,
            password: "Password123!",
        },
    });
    assert(dupRegRes.status === 409, "POST /api/auth/register prevents duplicate email (409 Conflict)");

    // Login test
    const loginRes = await request("/api/auth/login", {
        method: "POST",
        body: {
            email: testViewerEmail,
            password: "Password123!",
        },
    });
    assert(loginRes.status === 200 && loginRes.data.token, "POST /api/auth/login returns JWT token");
    const viewerToken = loginRes.data.token;

    // Invalid password test
    const badLoginRes = await request("/api/auth/login", {
        method: "POST",
        body: {
            email: testViewerEmail,
            password: "WrongPassword!",
        },
    });
    assert(badLoginRes.status === 401, "POST /api/auth/login rejects invalid password (401)");

    // GET /api/auth/me test
    const meRes = await request("/api/auth/me", { token: viewerToken });
    assert(meRes.status === 200 && meRes.data.user.id === viewerId, "GET /api/auth/me returns current user profile");

    // Unauthorized without token
    const noTokenRes = await request("/api/auth/me");
    assert(noTokenRes.status === 401, "GET /api/auth/me without token returns 401 Unauthorized");

    // 3. USER MANAGEMENT & RBAC
    console.log("\n3. User Management & Admin RBAC Tests:");
    // Viewer forbidden from user listing
    const viewerListUsersRes = await request("/api/users", { token: viewerToken });
    assert(viewerListUsersRes.status === 403, "Viewer is forbidden from GET /api/users (403 Forbidden)");

    // Admin lists users
    const adminListUsersRes = await request("/api/users", { token: adminToken });
    assert(adminListUsersRes.status === 200 && Array.isArray(adminListUsersRes.data.users), "Admin can list all users");

    // Admin creates an inspector user
    const createInspectorRes = await request("/api/users", {
        method: "POST",
        token: adminToken,
        body: {
            name: "Test Inspector Officer",
            email: testEmail,
            password: "InspectorPassword123!",
            role: "INSPECTOR",
            phone: "+919876543210",
        },
    });
    assert(createInspectorRes.status === 201 && createInspectorRes.data.user.role === "INSPECTOR", "Admin creates INSPECTOR user");
    assert(!createInspectorRes.data.user.passwordHash, "passwordHash is NEVER returned in admin user creation");
    const inspectorId = createInspectorRes.data.user.id;

    // Login as newly created inspector to obtain inspector token
    const inspectorLoginRes = await request("/api/auth/login", {
        method: "POST",
        body: {
            email: testEmail,
            password: "InspectorPassword123!",
        },
    });
    assert(inspectorLoginRes.status === 200 && inspectorLoginRes.data.token, "Inspector can log in and receive token");
    const inspectorToken = inspectorLoginRes.data.token;

    // 4. PROJECT CRUD & RBAC
    console.log("\n4. Project Management Tests:");
    const testProjectCode = `PRJ-TEST-${testTimestamp}`;
    const createProjectRes = await request("/api/projects", {
        method: "POST",
        token: adminToken,
        body: {
            projectCode: testProjectCode,
            name: "Automated Inspection Test Facility",
            scheme: "PM-DAKSH",
            organizationName: "Social Welfare Council",
            institutionType: "Skill Development Centre",
            district: "South Delhi",
            state: "Delhi",
            contactPerson: "Dr. Sharma",
            contactNumber: "+911122334455",
            status: "ACTIVE",
            latitude: 28.5355,
            longitude: 77.2410,
        },
    });
    assert(createProjectRes.status === 201 && createProjectRes.data.project.projectCode === testProjectCode, "Admin creates project (201)");
    const projectId = createProjectRes.data.project.id;

    // Duplicate projectCode check
    const dupProjRes = await request("/api/projects", {
        method: "POST",
        token: adminToken,
        body: {
            projectCode: testProjectCode,
            name: "Duplicate Project Code",
            scheme: "PM-DAKSH",
            organizationName: "Social Welfare Council",
            district: "South Delhi",
            state: "Delhi",
        },
    });
    assert(dupProjRes.status === 409, "POST /api/projects prevents duplicate projectCode (409 Conflict)");

    // List projects
    const listProjRes = await request("/api/projects", { token: viewerToken });
    assert(listProjRes.status === 200 && listProjRes.data.projects.length > 0, "GET /api/projects lists projects");

    // Get project by ID
    const getProjRes = await request(`/api/projects/${projectId}`, { token: viewerToken });
    assert(getProjRes.status === 200 && getProjRes.data.project.id === projectId, "GET /api/projects/:id returns details");

    // Update project
    const updateProjRes = await request(`/api/projects/${projectId}`, {
        method: "PUT",
        token: adminToken,
        body: {
            name: "Automated Inspection Test Facility (Updated)",
        },
    });
    assert(updateProjRes.status === 200 && updateProjRes.data.project.name.includes("(Updated)"), "PUT /api/projects/:id updates project");

    // 5. CAMERA MANAGEMENT & MEMBER 2 CCTV APIs
    console.log("\n5. Camera Management & Member 2 CCTV APIs:");
    const testCameraCode = `CAM-TEST-${testTimestamp}`;
    const createCamRes = await request("/api/cameras", {
        method: "POST",
        token: adminToken,
        body: {
            cameraCode: testCameraCode,
            projectId,
            name: "Corridor IP Camera 01",
            location: "Ground Floor Corridor",
            streamUrl: "rtsp://mock.cctv/stream1",
            streamId: "stream_live_01",
            type: "IP_CAMERA",
            status: "OFFLINE",
        },
    });
    assert(createCamRes.status === 201 && createCamRes.data.camera.cameraCode === testCameraCode, "POST /api/cameras creates camera");
    const cameraId = createCamRes.data.camera.id;

    // Duplicate cameraCode check
    const dupCamRes = await request("/api/cameras", {
        method: "POST",
        token: adminToken,
        body: {
            cameraCode: testCameraCode,
            projectId,
            name: "Duplicate Camera",
        },
    });
    assert(dupCamRes.status === 409, "POST /api/cameras prevents duplicate cameraCode (409 Conflict)");

    // Member 2 Camera Status Update API: POST /api/cameras/:camera_id/status
    const camStatusRes = await request(`/api/cameras/${cameraId}/status`, {
        method: "POST",
        token: adminToken,
        body: { status: "ONLINE" },
    });
    assert(camStatusRes.status === 200 && camStatusRes.data.camera.status === "ONLINE", "POST /api/cameras/:id/status updates status to ONLINE (Member 2)");
    assert(camStatusRes.data.camera.lastActive !== null, "Camera lastActive timestamp updated when online");

    // Member 2 Project Cameras API: GET /api/projects/:project_id/cameras
    const projCamsRes = await request(`/api/projects/${projectId}/cameras`, { token: viewerToken });
    assert(projCamsRes.status === 200 && projCamsRes.data.count >= 1, "GET /api/projects/:project_id/cameras returns project cameras (Member 2)");

    // 6. MEMBER 3 AI DETECTION API
    console.log("\n6. Member 3 AI Detection API Tests:");
    const aiDetectionRes = await request("/api/ai/detections", {
        method: "POST",
        token: adminToken,
        body: {
            cameraId,
            detectedAt: new Date().toISOString(),
            objects: [
                { label: "person", count: 4, confidence: 0.94 },
                { label: "wheelchair", count: 1, confidence: 0.88 },
            ],
            confidence: 0.94,
        },
    });
    assert(aiDetectionRes.status === 201 && aiDetectionRes.data.detection.id, "POST /api/ai/detections records AI detection (Member 3)");
    const aiDetectionId = aiDetectionRes.data.detection.id;

    const listAiRes = await request(`/api/ai/detections?cameraId=${cameraId}`, { token: viewerToken });
    assert(listAiRes.status === 200 && listAiRes.data.detections.length >= 1, "GET /api/ai/detections lists detection events");

    // 7. MEMBER 4 ALERT APIs
    console.log("\n7. Member 4 Alert APIs Tests:");
    const testAlertCode = `ALT-TEST-${testTimestamp}`;
    const createAlertRes = await request("/api/alerts", {
        method: "POST",
        token: adminToken,
        body: {
            alertCode: testAlertCode,
            projectId,
            cameraId,
            aiDetectionId,
            title: "Overcrowding in Corridor",
            description: "High density detected beyond safety limits",
            riskLevel: "CRITICAL",
            status: "ACTIVE",
        },
    });
    assert(createAlertRes.status === 201 && createAlertRes.data.alert.alertCode === testAlertCode, "POST /api/alerts creates CRITICAL alert (Member 4)");
    const alertId = createAlertRes.data.alert.id;

    // Get alert by ID
    const getAlertRes = await request(`/api/alerts/${alertId}`, { token: viewerToken });
    assert(getAlertRes.status === 200 && getAlertRes.data.alert.id === alertId, "GET /api/alerts/:id returns alert details");

    // Update alert status to RESOLVED
    const resolveAlertRes = await request(`/api/alerts/${alertId}/status`, {
        method: "PUT",
        token: adminToken,
        body: { status: "RESOLVED" },
    });
    assert(resolveAlertRes.status === 200 && resolveAlertRes.data.alert.status === "RESOLVED", "PUT /api/alerts/:id/status updates status to RESOLVED");
    assert(resolveAlertRes.data.alert.resolvedAt !== null, "Alert resolvedAt timestamp is automatically populated upon resolution");

    // 8. INSPECTION MANAGEMENT
    console.log("\n8. Inspection Management Tests:");
    const createInspRes = await request("/api/inspections", {
        method: "POST",
        token: adminToken,
        body: {
            projectId,
            inspectorId,
            type: "ROUTINE",
            scheduledDate: new Date(Date.now() + 86400000).toISOString(),
            remarks: "Scheduled bi-monthly compliance assessment",
        },
    });
    assert(createInspRes.status === 201 && createInspRes.data.inspection.id, "POST /api/inspections schedules inspection");
    const inspectionId = createInspRes.data.inspection.id;

    // Non-inspector assignment negative check
    const badAssignRes = await request("/api/inspections", {
        method: "POST",
        token: adminToken,
        body: {
            projectId,
            inspectorId: viewerId, // VIEWER role
            type: "ROUTINE",
        },
    });
    assert(badAssignRes.status === 400, "POST /api/inspections validates that inspector has INSPECTOR role (400 Bad Request)");

    // Inspector lists assigned inspections
    const inspectorListRes = await request("/api/inspections", { token: inspectorToken });
    assert(inspectorListRes.status === 200 && inspectorListRes.data.inspections.some(i => i.id === inspectionId), "Inspector sees assigned inspections");

    // Update status to COMPLETED
    const completeInspRes = await request(`/api/inspections/${inspectionId}/status`, {
        method: "PUT",
        token: inspectorToken,
        body: { status: "COMPLETED" },
    });
    assert(completeInspRes.status === 200 && completeInspRes.data.inspection.status === "COMPLETED", "PUT /api/inspections/:id/status transitions to COMPLETED");
    assert(completeInspRes.data.inspection.completedAt !== null, "completedAt timestamp is populated when inspection completes");

    // 9. INSPECTION REPORT
    console.log("\n9. Inspection Report Tests:");
    const createReportRes = await request(`/api/inspections/${inspectionId}/report`, {
        method: "POST",
        token: inspectorToken,
        body: {
            findings: "Facility cleanliness and accessibility ramps meet all statutory norms.",
            recommendations: "Install additional fire alarms on east corridor.",
        },
    });
    assert(createReportRes.status === 201 && createReportRes.data.report.id, "POST /api/inspections/:id/report submits report");

    const getReportRes = await request(`/api/inspections/${inspectionId}/report`, { token: viewerToken });
    assert(getReportRes.status === 200 && getReportRes.data.report.findings.includes("statutory norms"), "GET /api/inspections/:id/report fetches report");

    // 10. VC SESSION BACKEND SUPPORT (Member 3)
    console.log("\n10. VC Session Backend Tests (Member 3):");
    const createVcRes = await request(`/api/inspections/${inspectionId}/vc-sessions`, {
        method: "POST",
        token: inspectorToken,
        body: {
            meetingId: `vc_${testTimestamp}`,
            meetingUrl: "https://meet.jit.si/dosje_monitoring_test_room",
            status: "SCHEDULED",
        },
    });
    assert(createVcRes.status === 201 && createVcRes.data.session.id, "POST /api/inspections/:id/vc-sessions records meeting");
    const vcSessionId = createVcRes.data.session.id;

    const listVcRes = await request(`/api/inspections/${inspectionId}/vc-sessions`, { token: inspectorToken });
    assert(listVcRes.status === 200 && listVcRes.data.sessions.length >= 1, "GET /api/inspections/:id/vc-sessions returns meeting list");

    const updateVcRes = await request(`/api/vc-sessions/${vcSessionId}`, {
        method: "PUT",
        token: inspectorToken,
        body: { status: "ENDED" },
    });
    assert(updateVcRes.status === 200 && updateVcRes.data.session.status === "ENDED", "PUT /api/vc-sessions/:id marks session ENDED");
    assert(updateVcRes.data.session.endedAt !== null, "endedAt timestamp set when session ends");

    // 11. FILE METADATA
    console.log("\n11. File & Evidence Metadata Tests (Member 5):");
    const createFileRes = await request(`/api/inspections/${inspectionId}/files`, {
        method: "POST",
        token: inspectorToken,
        body: {
            fileName: "ramp_inspection_photo.jpg",
            fileType: "image/jpeg",
            filePath: "/uploads/inspections/ramp_inspection_photo.jpg",
            storageId: `store_${testTimestamp}`,
        },
    });
    assert(createFileRes.status === 201 && createFileRes.data.file.id, "POST /api/inspections/:id/files records evidence metadata");
    const fileId = createFileRes.data.file.id;

    const listFilesRes = await request(`/api/inspections/${inspectionId}/files`, { token: viewerToken });
    assert(listFilesRes.status === 200 && listFilesRes.data.files.length >= 1, "GET /api/inspections/:id/files lists inspection files");

    const delFileRes = await request(`/api/files/${fileId}`, {
        method: "DELETE",
        token: inspectorToken,
    });
    assert(delFileRes.status === 200, "DELETE /api/files/:id removes file metadata");

    // 12. DASHBOARD SUMMARY
    console.log("\n12. Dashboard Summary Tests:");
    const dashRes = await request("/api/dashboard/summary", { token: viewerToken });
    assert(dashRes.status === 200 && dashRes.data.success === true, "GET /api/dashboard/summary returns 200");
    const summary = dashRes.data.summary;
    assert(summary.totalProjects >= 1, `Dashboard summary shows totalProjects: ${summary.totalProjects}`);
    assert(summary.totalCameras >= 1, `Dashboard summary shows totalCameras: ${summary.totalCameras}`);
    assert(summary.onlineCameras >= 1, `Dashboard summary shows onlineCameras: ${summary.onlineCameras}`);
    assert(summary.completedInspections >= 1, `Dashboard summary shows completedInspections: ${summary.completedInspections}`);

    // 13. NOTIFICATIONS
    console.log("\n13. Notification Tests:");
    // Admin was notified of the CRITICAL alert
    const notifsRes = await request("/api/notifications", { token: adminToken });
    assert(notifsRes.status === 200 && notifsRes.data.notifications.length >= 1, "GET /api/notifications returns user notifications");
    const firstNotifId = notifsRes.data.notifications[0].id;

    const markReadRes = await request(`/api/notifications/${firstNotifId}/read`, {
        method: "PUT",
        token: adminToken,
    });
    assert(markReadRes.status === 200 && markReadRes.data.notification.isRead === true, "PUT /api/notifications/:id/read marks notification as read");

    const markAllReadRes = await request("/api/notifications/read-all", {
        method: "PUT",
        token: adminToken,
    });
    assert(markAllReadRes.status === 200, "PUT /api/notifications/read-all marks all notifications as read");

    // 14. AUDIT LOGGING (Admin only)
    console.log("\n14. Audit Logging Tests:");
    const auditRes = await request("/api/audit-logs", { token: adminToken });
    assert(auditRes.status === 200 && auditRes.data.logs.length > 0, "GET /api/audit-logs returns recorded system audit logs");
    const actionsRecorded = auditRes.data.logs.map(l => l.action);
    assert(actionsRecorded.includes("CREATE_PROJECT"), "Audit logs contain CREATE_PROJECT action");
    assert(actionsRecorded.includes("CREATE_CAMERA"), "Audit logs contain CREATE_CAMERA action");
    assert(actionsRecorded.includes("CREATE_AI_DETECTION"), "Audit logs contain CREATE_AI_DETECTION action");
    assert(actionsRecorded.includes("CREATE_ALERT"), "Audit logs contain CREATE_ALERT action");

    // Viewer forbidden from audit logs
    const viewerAuditRes = await request("/api/audit-logs", { token: viewerToken });
    assert(viewerAuditRes.status === 403, "Viewer forbidden from viewing audit logs (403 Forbidden)");

    // 15. ERROR & 404 HANDLING
    console.log("\n15. Centralized Error & 404 Handling Tests:");
    const notFoundRes = await request("/api/non-existent-resource-endpoint");
    assert(notFoundRes.status === 404 && notFoundRes.data.success === false, "Unmatched route returns standardized 404 JSON");

    // 16. CLEANUP TEST DATA
    console.log("\n16. Test Cleanup:");
    try {
        await prisma.project.delete({ where: { id: projectId } }); // Cascades cameras, inspections, alerts
        await prisma.user.delete({ where: { id: inspectorId } });
        await prisma.user.delete({ where: { id: viewerId } });
        console.log("  ✓ Test artifacts cleaned up successfully from database");
    } catch (cleanupErr) {
        console.warn("  ⚠ Non-fatal cleanup note:", cleanupErr.message);
    }

    console.log("\n==================================================");
    console.log(`TEST RESULTS SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log("==================================================");

    await prisma.$disconnect();

    if (failedCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runSuite().catch(async (err) => {
    console.error("Test Suite Unhandled Exception:", err);
    await prisma.$disconnect();
    process.exit(1);
});
