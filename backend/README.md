# DoSJE Drishti — Central Backend API
### Ministry of Social Justice and Empowerment (MoSJE) | Problem ID: SIH26095

**Platform:** DoSJE Drishti Central Monitoring Platform  
**Language/Framework:** Node.js (v20+ / v24+) & Express.js (v5.x) with TypeScript  
**Database:** Prisma ORM with SQLite (zero-config local default) & PostgreSQL (production ready)  
**Port:** `4000` (API Base: `http://localhost:4000/api`)  

---

## 1. System Overview

The DoSJE Monitoring Backend provides the central authoritative REST API and real-time integration hub for the DoSJE Drishti platform. It coordinates:
- **Role-Based Access Control (RBAC):** `ADMIN`, `INSPECTOR`, `PROJECT_INCHARGE`, `STAFF`, `VIEWER` with secure JWT authentication and password hashing.
- **Project & Institution Oversight:** Monitoring infrastructure, financial outlay, beneficiary counts, and GPS coordinates.
- **CCTV & RTSP Camera Management:** Real-time camera status, stream URLs, and MediaMTX proxy integration.
- **AI Anomaly & Detection Ingestion:** High-throughput webhook for YOLOv8 edge inferences from `ai_subsystem` (crowd surge, after-hours movement, loitering, restricted zone intrusion).
- **Random Video Inspection:** Dynamic auditor assignment and WebRTC peer negotiation for unscheduled compliance checks.
- **Field Inspection Lifecycle:** Scheduled, in-progress, completed inspection reports with tamper-evident audit trails.
- **Centralized Non-Repudiation Audit Logging:** Every state transition and security event is permanently recorded.

---

## 2. API Endpoints

All endpoints are prefixed with `/api`.

| Route Prefix | Description | Auth Required |
| :--- | :--- | :---: |
| `/api/auth` | Login, user registration, profile retrieval (`/me`) | No (login/register) / Yes (`/me`) |
| `/api/dashboard` | Aggregated KPIs, inspection completion, anomaly counts | Yes |
| `/api/projects` | Project directory, institution details, location filters | Yes |
| `/api/inspections` | Inspection scheduling, status updates, findings | Yes |
| `/api/cameras` | Camera registry, RTSP feed discovery, status ping | Yes |
| `/api/alerts` | Alert inbox, severity levels, acknowledgment & resolution | Yes |
| `/api/ai` | AI detection ingestion webhook (HMAC/bearer secured) | Yes / API Key |
| `/api/vc` | Random inspection VC sessions & STUN/TURN ICE credentials | Yes |
| `/api/audit-logs` | Immutable system audit log trail | Admin only |
| `/api/health` | Service health check and uptime probe | No |

Interactive OpenAPI 3.0 specification available in [`backend/docs/openapiSpec.js`](docs/openapiSpec.js).

---

## 3. Quick Start

### Step 1: Install Dependencies
```powershell
cd backend
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

Ensure the configuration specifies:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=replace_with_secure_jwt_secret
AI_SHARED_SECRET=replace_with_secure_ai_secret
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Step 3: Initialize Database
```powershell
npx prisma generate
npx prisma db push
```

To seed initial demo data:
```powershell
npx tsx src/prisma/seed.ts
```

### Step 4: Run Development Server
```powershell
npm run dev
```
The server will start at `http://localhost:4000`.

---

## 4. Testing & Verification

Run the integration test suite:
```powershell
npm test
```

Run the full end-to-end 23-step verification scenario:
```powershell
npx tsx src/__tests__/e2e_scenario.ts
```

Build for production:
```powershell
npm run build
```
