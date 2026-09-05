# Smart Real-Time Monitoring & Inspection Mobile App — Backend API
### Ministry of Social Justice and Empowerment (MoSJE) | Problem ID: SIH26095

**Role:** MEMBER 1 — Backend + Database + Authentication + Core API Developer  
**Status:** Production Ready | Tested & Verified (59/59 End-to-End Tests Passed)

---

## 1. System Overview

The DoSJE Monitoring Backend provides a resilient, secure, and scalable REST API platform for real-time monitoring, inspection lifecycle management, CCTV surveillance status ingestion, AI anomaly processing, field evidence recording, and role-based operational oversight across institutions and NGOs supported by MoSJE.

---

## 2. Technology Stack

- **Runtime & Framework:** Node.js (v24.x) & Express.js (v5.x)
- **Database:** PostgreSQL (v18.x) (`dosje_monitoring`)
- **ORM / Query Engine:** Prisma 7.10.0 with native PostgreSQL adapter (`@prisma/adapter-pg` + `pg`)
- **Authentication & Security:** 
  - JWT Bearer Authentication (`jsonwebtoken`, 24h expiration)
  - Salted Password Hashing (`bcryptjs`, 12 rounds)
  - HTTP Security Headers (`helmet`)
  - Configurable Cross-Origin Resource Sharing (`cors`)
  - Rate Limiting (`express-rate-limit`)
  - Strict Request Validation (`express-validator`)
- **API Documentation:** OpenAPI 3.0 Specification & Interactive Swagger UI (`swagger-ui-express`)

---

## 3. Directory Structure

```
backend/
├── config/
│   └── database.js               # Prisma Client configured with @prisma/adapter-pg
├── controllers/
│   ├── aiDetectionController.js  # Member 3 AI detection ingestion
│   ├── alertController.js        # Member 4 security and operational alerts
│   ├── auditLogController.js     # Admin audit trail query controller
│   ├── authController.js         # Register, login, and current user profile
│   ├── cameraController.js       # Camera CRUD & Member 2 CCTV status API
│   ├── dashboardController.js    # Aggregated KPI monitoring metrics
│   ├── fileMetadataController.js # Member 5 inspection evidence document metadata
│   ├── inspectionController.js   # Inspection scheduling, lifecycle & reports
│   ├── notificationController.js # User alerts and notifications
│   ├── userController.js         # Secure user CRUD & RBAC management
│   └── vcSessionController.js    # Member 3 video conferencing session records
├── docs/
│   └── openapiSpec.js            # OpenAPI 3.0 comprehensive schema definition
├── middleware/
│   ├── authMiddleware.js         # JWT verification & role-based authorization
│   ├── errorHandler.js           # Centralized 400/401/403/404/409/422/500 handler
│   └── validator.js              # Centralized express-validator schemas
├── prisma/
│   └── schema.prisma             # Prisma 7 PostgreSQL schema (11 models, 10 enums)
├── routes/
│   ├── aiDetectionRoutes.js
│   ├── alertRoutes.js
│   ├── auditLogRoutes.js
│   ├── authRoutes.js
│   ├── cameraRoutes.js
│   ├── dashboardRoutes.js
│   ├── docRoutes.js              # /api/docs and /api/openapi.json
│   ├── fileMetadataRoutes.js
│   ├── inspectionRoutes.js
│   ├── notificationRoutes.js
│   ├── projectRoutes.js
│   ├── userRoutes.js
│   └── vcSessionRoutes.js
├── tests/
│   └── run_tests.js              # Comprehensive automated end-to-end test suite
├── .env.example                  # Sanitized environment template
├── .gitignore                    # Git ignore file (excludes secrets & dependencies)
├── package.json                  # Dependencies and execution scripts
├── prisma.config.ts              # Prisma 7 configuration file
└── server.js                     # Express application entrypoint
```

---

## 4. Getting Started & Installation

### Step 1: Clone and Navigate
```powershell
cd C:\Users\user\OneDrive\Documents\Sih-Dosje-Monitoring\backend
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```powershell
cp .env.example .env
```
Ensure your `.env` contains:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/dosje_monitoring
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://localhost:19006
```
*(Never commit `.env` or expose passwords/tokens).*

### Step 3: Install Dependencies
```powershell
npm.cmd install
```

### Step 4: Verify Database Connection
```powershell
node -e "require('./server.js')"
```

### Step 5: Start the Backend Server
```powershell
npm start
# Server starts at http://localhost:5000
# Interactive Swagger UI available at http://localhost:5000/api/docs
```

---

## 5. Running Automated Tests

Run the complete 59-assertion end-to-end integration test suite:
```powershell
npm test
```
The test suite validates:
- Database connectivity & Prisma adapter
- JWT login, registration, password hashing & error handling
- Role-Based Access Control (Admin, Inspector, Viewer)
- Projects, Cameras, Member 2 CCTV Status, Member 3 AI, Member 4 Alerts
- Inspections, Reports, Member 3 VC Sessions, Member 5 File Metadata
- Dashboard aggregations, Notifications, and Audit Trail logs
- Standardized 404 responses and negative input edge cases

---

## 6. Role-Based Access Control (RBAC) Matrix

| Resource / Action | ADMIN | INSPECTOR | PROJECT_INCHARGE | STAFF | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| **Manage Users** (`/api/users`) | Full CRUD | ❌ | ❌ | ❌ | ❌ |
| **Manage Projects** (`POST/PUT/DELETE /api/projects`) | Full CRUD | ❌ | ❌ | ❌ | ❌ |
| **View Projects** (`GET /api/projects`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manage Cameras** (`POST/PUT /api/cameras`) | ✅ | ❌ | ✅ | ❌ | ❌ |
| **View Cameras** (`GET /api/cameras`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Member 2 CCTV Status** (`POST /api/cameras/:id/status`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Record AI Detections** (`POST /api/ai/detections`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Create / Resolve Alerts** (`/api/alerts`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **View Alerts** (`GET /api/alerts`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Schedule Inspections** (`POST /api/inspections`) | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Update Inspection Status** (`PUT /api/inspections/:id/status`) | ✅ | Assigned Only | ✅ | ❌ | ❌ |
| **Submit Inspection Report** (`POST/PUT /report`) | ✅ | Assigned Only | ❌ | ❌ | ❌ |
| **Manage VC Sessions** (`/api/vc-sessions`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Manage File Metadata** (`/api/files`) | ✅ | Assigned Only | ❌ | ❌ | ❌ |
| **View Dashboard Summary** (`/api/dashboard/summary`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Audit Trail** (`/api/audit-logs`) | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 7. API Reference & Team Integration Guide

Base URL: `http://localhost:5000/api`  
Interactive Swagger UI: `http://localhost:5000/api/docs`  
OpenAPI JSON Specification: `http://localhost:5000/api/openapi.json`  

### Authentication Method
Include the Bearer token in the `Authorization` header for all protected endpoints:
```
Authorization: Bearer <your_jwt_token>
```

---

### Member 2 Integration — CCTV Surveillance & Camera Status

#### 1. Update Camera Online / Offline Status
- **Method:** `POST /api/cameras/:camera_id/status`
- **Description:** Called periodically by the CCTV ping or stream ingestion service to indicate camera health.
- **Request Body:**
```json
{
  "status": "ONLINE" // "ONLINE" | "OFFLINE" | "MAINTENANCE"
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Camera status updated to ONLINE",
  "camera": {
    "id": 1,
    "cameraCode": "CAM-01-ENTRANCE",
    "status": "ONLINE",
    "lastActive": "2026-09-05T10:12:30.000Z"
  }
}
```

#### 2. Get All Cameras for a Specific Project
- **Method:** `GET /api/projects/:project_id/cameras`
- **Response:**
```json
{
  "success": true,
  "projectId": 1,
  "projectName": "Senior Care Center",
  "count": 4,
  "cameras": [
    {
      "id": 1,
      "cameraCode": "CAM-01-ENTRANCE",
      "name": "Gate Camera",
      "streamUrl": "rtsp://192.168.1.100/live",
      "streamId": "stream_01",
      "status": "ONLINE",
      "lastActive": "2026-09-05T10:12:30.000Z"
    }
  ]
}
```

---

### Member 3 Integration — AI Detection & Video Conferencing

#### 1. Ingest AI Detection Event
- **Method:** `POST /api/ai/detections`
- **Description:** Called by Member 3's computer vision / inference engine when objects or anomalies are detected.
- **Request Body:**
```json
{
  "cameraId": 1,
  "detectedAt": "2026-09-05T10:15:00.000Z",
  "objects": [
    { "label": "person", "count": 3, "confidence": 0.94 },
    { "label": "wheelchair", "count": 1, "confidence": 0.89 }
  ],
  "confidence": 0.94
}
```

#### 2. Create VC Session for Remote Inspection
- **Method:** `POST /api/inspections/:id/vc-sessions`
- **Request Body:**
```json
{
  "meetingId": "meet_dosje_room_101",
  "meetingUrl": "https://meet.jit.si/dosje_monitoring_room_101",
  "status": "SCHEDULED"
}
```

#### 3. Update VC Session Lifecycle (End Meeting)
- **Method:** `PUT /api/vc-sessions/:id`
- **Request Body:**
```json
{
  "status": "ENDED"
}
```

---

### Member 4 Integration — Anomaly & Alert APIs

#### 1. Raise Alert
- **Method:** `POST /api/alerts`
- **Description:** Automatically generates notifications for stakeholders when riskLevel is `HIGH` or `CRITICAL`.
- **Request Body:**
```json
{
  "alertCode": "ALT-2026-0042",
  "projectId": 1,
  "cameraId": 1,
  "aiDetectionId": 5,
  "title": "Restricted Area Breach After Hours",
  "description": "Motion detected in pharmacy storage between 02:00 and 03:00.",
  "riskLevel": "CRITICAL",
  "status": "ACTIVE"
}
```

#### 2. Resolve / Acknowledge Alert
- **Method:** `PUT /api/alerts/:id/status`
- **Request Body:**
```json
{
  "status": "RESOLVED" // "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED"
}
```

---

### Member 5 Integration — Mobile App Field Inspections & Reports

#### 1. Get Assigned Inspections
- **Method:** `GET /api/inspections`
- Inspectors automatically receive only their assigned inspections.
- Admins receive all inspections across all projects.

#### 2. Complete Inspection Status
- **Method:** `PUT /api/inspections/:id/status`
- **Request Body:**
```json
{
  "status": "COMPLETED" // "ASSIGNED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
}
```

#### 3. Submit Inspection Findings Report
- **Method:** `POST /api/inspections/:id/report`
- **Request Body:**
```json
{
  "findings": "Accessible ramp slope compliant. Kitchen hygiene meets standards.",
  "recommendations": "Renew medical fitness certificates for auxiliary staff."
}
```

#### 4. Save Inspection Evidence Metadata
- **Method:** `POST /api/inspections/:id/files`
- **Request Body:**
```json
{
  "fileName": "site_photo_ramp.jpg",
  "fileType": "image/jpeg",
  "filePath": "/storage/inspections/1/ramp.jpg",
  "storageId": "s3_ref_10283"
}
```

---

### Member 6 Integration — Web Dashboard & Core APIs

#### 1. Dashboard Aggregate Summary
- **Method:** `GET /api/dashboard/summary`
- **Response:**
```json
{
  "success": true,
  "summary": {
    "totalProjects": 12,
    "activeProjects": 11,
    "totalCameras": 48,
    "onlineCameras": 44,
    "offlineCameras": 3,
    "maintenanceCameras": 1,
    "pendingInspections": 6,
    "completedInspections": 32,
    "activeAlerts": 4,
    "highRiskAlerts": 1
  }
}
```

#### 2. Centralized Non-Repudiation Audit Logs (Admin Only)
- **Method:** `GET /api/audit-logs?page=1&limit=50`
- Captures `action`, `userId`, `projectId`, `details`, client `ipAddress`, and `userAgent`.

---

## 8. Security & Best Practices

1. **Password Protection:** Passwords are never saved in plain text (salted with 12 bcrypt rounds). `passwordHash` is stripped from all user-facing responses.
2. **Prisma 7 Compatibility:** Powered by Prisma 7.10.0 and `@prisma/adapter-pg`. Database schema relations use foreign key cascades and nullify constraints correctly.
3. **Audit Trail:** All write/mutation actions are logged into `AuditLog` asynchronously.
4. **Resilient Error Responses:** Centralized error handler catches Prisma duplicate key (`P2002`), record not found (`P2025`), and foreign key (`P2003`) errors, mapping them to standard HTTP status codes (`409`, `404`, `400`). Stack traces are suppressed in production.
