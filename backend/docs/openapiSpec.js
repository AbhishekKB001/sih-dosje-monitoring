const openapiSpec = {
    openapi: "3.0.3",
    info: {
        title: "DoSJE Smart Real-Time Monitoring & Inspection API",
        version: "1.0.0",
        description: `
**Ministry of Social Justice and Empowerment (MoSJE)**
*Problem ID: SIH26095 — Smart Real-Time Monitoring & Inspection Mobile App*

Backend Core API services providing:
- Role-Based Access Control (ADMIN, INSPECTOR, PROJECT_INCHARGE, STAFF, VIEWER)
- Secure JWT Bearer Authentication
- Project & Institution Infrastructure Monitoring
- Member 2 CCTV Integration & Camera Health Status
- Member 3 AI Detection Ingestion & Video Conferencing Support
- Member 4 Smart Anomaly & Violation Alerts
- Member 5 Field Inspection Schedules, Reports & Document Metadata
- Dashboard Aggregations & Centralized Non-Repudiation Audit Logging
        `,
    },
    servers: [
        {
            url: "http://localhost:4000/api",
            description: "Canonical Central Backend API",
        },
        {
            url: "http://localhost:4000",
            description: "Local Development Server Root",
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Enter your JWT token obtained from /api/auth/login",
            },
        },
        schemas: {
            User: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Rajesh Kumar" },
                    email: { type: "string", example: "rajesh@example.gov.in" },
                    phone: { type: "string", example: "+919876543210" },
                    role: {
                        type: "string",
                        enum: ["ADMIN", "INSPECTOR", "PROJECT_INCHARGE", "STAFF", "VIEWER"],
                        example: "INSPECTOR",
                    },
                    status: {
                        type: "string",
                        enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
                        example: "ACTIVE",
                    },
                    createdAt: { type: "string", format: "date-time" },
                },
            },
            Project: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    projectCode: { type: "string", example: "PRJ-DEL-001" },
                    name: { type: "string", example: "Old Age Care Home Rohini" },
                    scheme: { type: "string", example: "NAPSrC" },
                    organizationName: { type: "string", example: "Samarpan Welfare Society" },
                    institutionType: { type: "string", example: "Senior Citizen Home" },
                    district: { type: "string", example: "North West Delhi" },
                    state: { type: "string", example: "Delhi" },
                    status: {
                        type: "string",
                        enum: ["ACTIVE", "INACTIVE", "COMPLETED", "SUSPENDED"],
                        example: "ACTIVE",
                    },
                    latitude: { type: "number", format: "float", example: 28.7041 },
                    longitude: { type: "number", format: "float", example: 77.1025 },
                },
            },
            Camera: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    cameraCode: { type: "string", example: "CAM-01-ENTRANCE" },
                    projectId: { type: "integer", example: 1 },
                    name: { type: "string", example: "Main Gate Camera" },
                    location: { type: "string", example: "Entrance Gate A" },
                    streamUrl: { type: "string", example: "rtsp://camera.internal/live" },
                    streamId: { type: "string", example: "stream_cctv_01" },
                    type: {
                        type: "string",
                        enum: ["CCTV", "IP_CAMERA", "PTZ", "OTHER"],
                        example: "CCTV",
                    },
                    status: {
                        type: "string",
                        enum: ["ONLINE", "OFFLINE", "MAINTENANCE"],
                        example: "ONLINE",
                    },
                    lastActive: { type: "string", format: "date-time" },
                },
            },
            Alert: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    alertCode: { type: "string", example: "ALT-2026-001" },
                    projectId: { type: "integer", example: 1 },
                    cameraId: { type: "integer", example: 1 },
                    title: { type: "string", example: "Unauthorized Access Detected" },
                    description: { type: "string", example: "Person detected in restricted area after hours" },
                    riskLevel: {
                        type: "string",
                        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                        example: "HIGH",
                    },
                    status: {
                        type: "string",
                        enum: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"],
                        example: "ACTIVE",
                    },
                    resolvedAt: { type: "string", format: "date-time", nullable: true },
                },
            },
            Inspection: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    projectId: { type: "integer", example: 1 },
                    inspectorId: { type: "integer", example: 2 },
                    type: {
                        type: "string",
                        enum: ["ROUTINE", "SURPRISE", "SPECIAL", "REMOTE"],
                        example: "ROUTINE",
                    },
                    scheduledDate: { type: "string", format: "date-time" },
                    status: {
                        type: "string",
                        enum: ["ASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
                        example: "SCHEDULED",
                    },
                    remarks: { type: "string", example: "Quarterly inspection compliance check" },
                    completedAt: { type: "string", format: "date-time", nullable: true },
                },
            },
            DashboardSummary: {
                type: "object",
                properties: {
                    totalProjects: { type: "integer", example: 10 },
                    activeProjects: { type: "integer", example: 8 },
                    totalCameras: { type: "integer", example: 30 },
                    onlineCameras: { type: "integer", example: 24 },
                    offlineCameras: { type: "integer", example: 4 },
                    maintenanceCameras: { type: "integer", example: 2 },
                    pendingInspections: { type: "integer", example: 5 },
                    completedInspections: { type: "integer", example: 20 },
                    activeAlerts: { type: "integer", example: 7 },
                    highRiskAlerts: { type: "integer", example: 3 },
                },
            },
        },
    },
    security: [
        {
            BearerAuth: [],
        },
    ],
    paths: {
        "/api/auth/register": {
            post: {
                tags: ["Authentication"],
                summary: "Register a new user account",
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "email", "password"],
                                properties: {
                                    name: { type: "string", example: "John Doe" },
                                    email: { type: "string", example: "john@example.com" },
                                    password: { type: "string", example: "secret123" },
                                    phone: { type: "string", example: "+919876543210" },
                                    role: {
                                        type: "string",
                                        enum: ["ADMIN", "INSPECTOR", "PROJECT_INCHARGE", "STAFF", "VIEWER"],
                                        default: "VIEWER",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: "User successfully registered" },
                    409: { description: "Email already registered" },
                },
            },
        },
        "/api/auth/login": {
            post: {
                tags: ["Authentication"],
                summary: "Authenticate user and issue JWT token",
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                    email: { type: "string", example: "admin@example.com" },
                                    password: { type: "string", example: "secure_password" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "Login successful with JWT token" },
                    401: { description: "Invalid email or password" },
                },
            },
        },
        "/api/auth/me": {
            get: {
                tags: ["Authentication"],
                summary: "Get current authenticated user profile",
                responses: {
                    200: { description: "Current user profile" },
                    401: { description: "Missing or invalid token" },
                },
            },
        },
        "/api/users": {
            get: {
                tags: ["User Management"],
                summary: "List all users (Admin only)",
                parameters: [
                    { name: "role", in: "query", schema: { type: "string" } },
                    { name: "status", in: "query", schema: { type: "string" } },
                ],
                responses: {
                    200: { description: "List of users" },
                    403: { description: "Admin authorization required" },
                },
            },
            post: {
                tags: ["User Management"],
                summary: "Create a user with specified role (Admin only)",
                responses: {
                    201: { description: "User created" },
                },
            },
        },
        "/api/users/{id}": {
            get: {
                tags: ["User Management"],
                summary: "Get user details by ID",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "User found" }, 404: { description: "User not found" } },
            },
            put: {
                tags: ["User Management"],
                summary: "Update user profile / status",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "User updated" } },
            },
            delete: {
                tags: ["User Management"],
                summary: "Delete user (Admin only)",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "User deleted" } },
            },
        },
        "/api/projects": {
            get: {
                tags: ["Projects"],
                summary: "List all projects",
                parameters: [
                    { name: "status", in: "query", schema: { type: "string" } },
                    { name: "district", in: "query", schema: { type: "string" } },
                    { name: "state", in: "query", schema: { type: "string" } },
                ],
                responses: { 200: { description: "List of projects" } },
            },
            post: {
                tags: ["Projects"],
                summary: "Create project (Admin only)",
                responses: { 201: { description: "Project created" } },
            },
        },
        "/api/projects/{id}": {
            get: {
                tags: ["Projects"],
                summary: "Get project by ID",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Project details" } },
            },
            put: {
                tags: ["Projects"],
                summary: "Update project (Admin only)",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Project updated" } },
            },
            delete: {
                tags: ["Projects"],
                summary: "Delete project (Admin only)",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Project deleted" } },
            },
        },
        "/api/projects/{project_id}/cameras": {
            get: {
                tags: ["Cameras (Member 2)"],
                summary: "Get all cameras for a specific project",
                parameters: [{ name: "project_id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "List of cameras for project" } },
            },
        },
        "/api/cameras": {
            get: {
                tags: ["Cameras (Member 2)"],
                summary: "List all cameras",
                parameters: [
                    { name: "projectId", in: "query", schema: { type: "integer" } },
                    { name: "status", in: "query", schema: { type: "string" } },
                ],
                responses: { 200: { description: "List of cameras" } },
            },
            post: {
                tags: ["Cameras (Member 2)"],
                summary: "Create a camera record",
                responses: { 201: { description: "Camera created" } },
            },
        },
        "/api/cameras/{id}": {
            get: {
                tags: ["Cameras (Member 2)"],
                summary: "Get camera by ID",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Camera details" } },
            },
            put: {
                tags: ["Cameras (Member 2)"],
                summary: "Update camera metadata",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Camera updated" } },
            },
        },
        "/api/cameras/{camera_id}/status": {
            post: {
                tags: ["Cameras (Member 2)"],
                summary: "Update camera live status (Member 2 CCTV integration)",
                parameters: [{ name: "camera_id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["status"],
                                properties: {
                                    status: {
                                        type: "string",
                                        enum: ["ONLINE", "OFFLINE", "MAINTENANCE"],
                                        example: "ONLINE",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: "Camera status updated" } },
            },
        },
        "/api/ai/detections": {
            post: {
                tags: ["AI Detections (Member 3)"],
                summary: "Record AI detection event (Member 3 AI pipeline)",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["cameraId", "objects"],
                                properties: {
                                    cameraId: { type: "integer", example: 1 },
                                    detectedAt: { type: "string", format: "date-time", example: "2026-09-05T09:00:00Z" },
                                    objects: {
                                        type: "array",
                                        items: { type: "object" },
                                        example: [{ label: "person", count: 3, confidence: 0.91 }],
                                    },
                                    confidence: { type: "number", format: "float", example: 0.91 },
                                },
                            },
                        },
                    },
                },
                responses: { 201: { description: "AI detection stored" } },
            },
            get: {
                tags: ["AI Detections (Member 3)"],
                summary: "List AI detections",
                parameters: [{ name: "cameraId", in: "query", schema: { type: "integer" } }],
                responses: { 200: { description: "List of detections" } },
            },
        },
        "/api/alerts": {
            get: {
                tags: ["Alerts (Member 4)"],
                summary: "List alerts with filtering",
                parameters: [
                    { name: "projectId", in: "query", schema: { type: "integer" } },
                    { name: "riskLevel", in: "query", schema: { type: "string" } },
                    { name: "status", in: "query", schema: { type: "string" } },
                ],
                responses: { 200: { description: "List of alerts" } },
            },
            post: {
                tags: ["Alerts (Member 4)"],
                summary: "Create a new security/operational alert",
                responses: { 201: { description: "Alert created" } },
            },
        },
        "/api/alerts/{id}": {
            get: {
                tags: ["Alerts (Member 4)"],
                summary: "Get alert details",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Alert details" } },
            },
        },
        "/api/alerts/{id}/status": {
            put: {
                tags: ["Alerts (Member 4)"],
                summary: "Update alert lifecycle status",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["status"],
                                properties: {
                                    status: {
                                        type: "string",
                                        enum: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"],
                                        example: "RESOLVED",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: "Status updated" } },
            },
        },
        "/api/inspections": {
            get: {
                tags: ["Inspections (Member 5)"],
                summary: "List inspections",
                parameters: [
                    { name: "projectId", in: "query", schema: { type: "integer" } },
                    { name: "inspectorId", in: "query", schema: { type: "integer" } },
                    { name: "status", in: "query", schema: { type: "string" } },
                ],
                responses: { 200: { description: "List of inspections" } },
            },
            post: {
                tags: ["Inspections (Member 5)"],
                summary: "Create/schedule an inspection",
                responses: { 201: { description: "Inspection created" } },
            },
        },
        "/api/inspections/{id}": {
            get: {
                tags: ["Inspections (Member 5)"],
                summary: "Get inspection detail with report and files",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Inspection details" } },
            },
            put: {
                tags: ["Inspections (Member 5)"],
                summary: "Update inspection metadata",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Inspection updated" } },
            },
            delete: {
                tags: ["Inspections (Member 5)"],
                summary: "Delete inspection (Admin only)",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Inspection deleted" } },
            },
        },
        "/api/inspections/{id}/status": {
            put: {
                tags: ["Inspections (Member 5)"],
                summary: "Update inspection status lifecycle",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["status"],
                                properties: {
                                    status: {
                                        type: "string",
                                        enum: ["ASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
                                        example: "COMPLETED",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: "Status updated" } },
            },
        },
        "/api/inspections/{id}/report": {
            get: {
                tags: ["Inspections (Member 5)"],
                summary: "Get inspection report",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Inspection report" } },
            },
            post: {
                tags: ["Inspections (Member 5)"],
                summary: "Submit inspection report",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 201: { description: "Report submitted" } },
            },
            put: {
                tags: ["Inspections (Member 5)"],
                summary: "Update inspection report",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Report updated" } },
            },
        },
        "/api/inspections/{id}/files": {
            get: {
                tags: ["Files & Evidence (Member 5)"],
                summary: "Get metadata for inspection files",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "List of files" } },
            },
            post: {
                tags: ["Files & Evidence (Member 5)"],
                summary: "Record file metadata for inspection evidence",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 201: { description: "File metadata saved" } },
            },
        },
        "/api/files/{id}": {
            delete: {
                tags: ["Files & Evidence (Member 5)"],
                summary: "Delete file metadata record",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "File metadata deleted" } },
            },
        },
        "/api/inspections/{id}/vc-sessions": {
            get: {
                tags: ["VC Sessions (Member 3)"],
                summary: "Get VC sessions for inspection",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "VC sessions" } },
            },
            post: {
                tags: ["VC Sessions (Member 3)"],
                summary: "Create VC session record",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 201: { description: "VC session created" } },
            },
        },
        "/api/vc-sessions/{id}": {
            put: {
                tags: ["VC Sessions (Member 3)"],
                summary: "Update VC session details",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "VC session updated" } },
            },
        },
        "/api/dashboard/summary": {
            get: {
                tags: ["Dashboard"],
                summary: "Get aggregated dashboard monitoring metrics",
                responses: {
                    200: {
                        description: "Dashboard summary counts",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/DashboardSummary",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/notifications": {
            get: {
                tags: ["Notifications"],
                summary: "Get current user notifications",
                parameters: [{ name: "isRead", in: "query", schema: { type: "boolean" } }],
                responses: { 200: { description: "List of notifications" } },
            },
        },
        "/api/notifications/read-all": {
            put: {
                tags: ["Notifications"],
                summary: "Mark all notifications as read",
                responses: { 200: { description: "All notifications marked read" } },
            },
        },
        "/api/notifications/{id}/read": {
            put: {
                tags: ["Notifications"],
                summary: "Mark single notification as read",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Notification marked read" } },
            },
        },
        "/api/audit-logs": {
            get: {
                tags: ["Audit Logging"],
                summary: "View audit logs (Admin only)",
                parameters: [
                    { name: "action", in: "query", schema: { type: "string" } },
                    { name: "userId", in: "query", schema: { type: "integer" } },
                    { name: "projectId", in: "query", schema: { type: "integer" } },
                ],
                responses: { 200: { description: "List of audit logs" } },
            },
        },
    },
};

module.exports = openapiSpec;
