# DoSJE Drishti — REST API Reference Specification 📡

**Base URL**: `http://localhost:4000/api`  
**AI Base URL**: `http://localhost:8000/api/v1`  
**Authentication**: Bearer Token (`Authorization: Bearer <JWT_TOKEN>`)

---

## 🔐 1. Authentication & RBAC

### `POST /api/auth/login`
Authenticates a user with email and password.
- **Request**:
  ```json
  {
    "email": "member2.inspector@sih.gov.in",
    "password": "DemoPass@2026"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "user": {
      "id": "USR-MEMBER-02",
      "email": "member2.inspector@sih.gov.in",
      "name": "Member 2 (PMU Inspection Officer)",
      "role": "INSPECTOR",
      "department": "PMU Field Operations"
    }
  }
  ```

### `POST /api/auth/mpin`
Authenticates an inspector via 4-digit MPIN.
- **Request**: `{"mpin": "1234", "role": "INSPECTOR"}`

---

## 🏛️ 2. Projects & Institutes

### `GET /api/projects`
Retrieves all flagship schemes and active projects.
- **Response**: List of project objects (`SMILE`, `PM-DAKSH`, `SHREYAS`).

### `GET /api/institutes`
Retrieves all registered welfare institutes with GPS geofence definitions.
- **Response**:
  ```json
  [
    {
      "id": "INST-001",
      "code": "INST-DIVYANG-PUNE",
      "name": "Divyangjan Rehabilitation & Skill Academy",
      "latitude": 18.5204,
      "longitude": 73.8567,
      "geofenceRadiusMeters": 100,
      "inchargeUserId": "USR-MEMBER-04"
    }
  ]
  ```

---

## 📋 3. Inspections & Stochastic Assignment

### `POST /api/inspections/random-assign`
Evaluates telemetry risk scores and assigns a surprise inspection duty to an eligible inspector.
- **Request**: `{}` (Empty or optional `{ "inspectorId": "USR-MEMBER-02" }`)
- **Response (201 Created)**:
  ```json
  {
    "id": "58fa510b-0cac-4219-8f56-8b04f987d99c",
    "dutyCode": "DOSJE-SURPRISE-2020",
    "instituteId": "INST-002",
    "assignedInspectorId": "USR-MEMBER-02",
    "status": "assigned",
    "riskScore": 72
  }
  ```

### `POST /api/inspections/:id/verify-geofence`
Verifies on-site presence against the institute's coordinates.
- **Request**: `{"latitude": 18.5204, "longitude": 73.8567}`
- **Response (200 OK)**:
  ```json
  {
    "verified": true,
    "distanceMeters": 12.4,
    "geofenceRadius": 100,
    "status": "geofence_unlocked"
  }
  ```

### `POST /api/inspections/:id/report`
Submits completed audit checklist, ratings, and digital signature.

### `GET /api/inspections/fairness-stats`
Returns inspector workload distribution metrics to guarantee anti-bias allocation.

---

## 📹 4. CCTV & Streaming Telemetry

### `GET /api/cctv/cameras`
Lists all 6 registered camera feeds with streaming URLs and health status.

### `POST /api/cctv/cameras/:id/ptz`
Sends pan, tilt, or zoom commands to the virtual ONVIF controller.
- **Request**: `{"action": "PAN_LEFT" | "PAN_RIGHT" | "TILT_UP" | "TILT_DOWN" | "ZOOM_IN" | "ZOOM_OUT" | "HOME"}`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "ptz": { "pan": -15, "tilt": 0, "zoom": 1.0 }
  }
  ```

### `POST /api/cctv/cameras/:id/record`
Toggles continuous clip recording state (`START` / `STOP`).

---

## 🚨 5. AI Vision Alerts

### `POST /api/alerts` (Webhook from AI Subsystem)
Receives automated anomaly detections.
- **Headers**: `X-AI-Signature: <HMAC_SIGNATURE>`
- **Request**:
  ```json
  {
    "cameraId": "CAM-MOSJE-01",
    "alertType": "RESTRICTED_ZONE_BREACH",
    "severity": "CRITICAL",
    "confidence": 0.94,
    "snapshotHash": "961aa96ead9bab45...",
    "details": { "dwellTimeSeconds": 14.2, "zone": "Vault" }
  }
  ```

### `PATCH /api/alerts/:id`
Updates alert lifecycle status (`acknowledged`, `resolved`).

---

## 📹 6. Targeted Video Conferencing (VC)

### `POST /api/vc/initiate`
Initiates a surprise video conference targeted to an institute's designated incharge.
- **Request**: `{"projectId": "PROJ-SMILE-01", "instituteId": "INST-001"}`
- **Response (201 Created)**:
  ```json
  {
    "sessionId": "VC-2026-001",
    "inchargeUserId": "USR-MEMBER-04",
    "meetingUrl": "https://meet.jit.si/dosje-audit-smi-inst001-9281",
    "status": "ringing"
  }
  ```

### `GET /api/vc/incoming?userId=:id`
High-frequency polling endpoint returning active incoming calls for a user.

---

## 🛡️ 7. Evidence & Cryptographic Vault

### `POST /api/evidence`
Uploads watermarked photo or short video evidence.
- **Multipart Form**: `inspectionId`, `instituteId`, `file`
- **Response (201 Created)**:
  ```json
  {
    "evidenceId": "EV-90218",
    "sha256": "8d67f81b79ba8eab6865bec30cb69f7b21620372c847e79224513c5e19ba12f7",
    "mimeType": "image/jpeg",
    "fileSize": 142850
  }
  ```

---

## 📜 8. Audit Logs

### `GET /api/audit-logs`
Returns chronological, immutable audit entries with actor details, IP address, and payload snapshots.
