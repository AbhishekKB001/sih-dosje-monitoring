# DoSJE Drishti 👁️🇮🇳
### Centralized Surveillance, Surprise Inspections & Real-time Institutional Monitoring Portal
**Ministry of Social Justice and Empowerment (DoSJE), Government of India**

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-3.47-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![AI Vision](https://img.shields.io/badge/AI%20Vision-YOLO%20%7C%20DeepSORT-FF6F00?style=for-the-badge)
![Smart Governance](https://img.shields.io/badge/Smart%20Governance-DoSJE-FF9933?style=for-the-badge)

---

## 🏛️ System Architecture

```
                             DOSJE DRISHTI PLATFORM
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │                                                     │
       📱 Flutter App                                        💻 React Web
   (PMU Inspector & Admin)                                 (Admin Dashboard)
             │                                                     │
             └──────────────────────────┬──────────────────────────┘
                                        │ REST API (Bearer JWT / RBAC)
                                        ▼
                           ⚙️ CENTRAL BACKEND (Port 4000)
                              [Express + TypeScript]
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
             ▼                          ▼                          ▼
     🗄️ Database (Prisma)         🧠 AI Subsystem            📹 CCTV Feeds
   SQLite (Dev) / Postgres     (YOLOv8 + ByteTrack)     (6 Monitored Feeds)
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │ Real-time Telemetry Webhooks
                                        ▼
                         🚨 AI Alerts & Surprise Duties
```

---

## ⚡ Canonical Network Ports

| Subsystem | Service URL | Purpose |
| :--- | :--- | :--- |
| **Central Backend API** | `http://localhost:4000/api` | Central source of truth, auth, RBAC, DB CRUD, telemetry webhooks |
| **React Admin Dashboard** | `http://localhost:5173` | HQ administrative oversight, live map, CCTV grid, charts & audit logs |
| **Flutter Mobile Client** | `http://localhost:4000/mobile` | Inspector surprise audit wizard, geofence unlock, watermarked photos |
| **AI Vision Subsystem** | `http://localhost:8000/api/v1` | YOLO person detection, spatial zones, loitering & attendance discrepancy |

---

## 🚀 1-Click Master Launcher (Windows)

Launch all subsystems simultaneously using either script from the root directory:

```powershell
# Double-click or run in terminal:
.\start_all_services.bat
# Or via PowerShell:
.\start_all_services.ps1
```

---

## 🔑 Seeded Demo Credentials

| Stakeholder Role | Email | Password | 4-Digit MPIN | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **DoSJE HQ Admin** | `admin@dosje.gov.in` | `admin123` | `1234` | Full national dashboard, AI anomaly ticker, CCTV grid, duty assigner |
| **PMU Inspector** | `inspector@dosje.gov.in` | `inspector123` | `1234` | Geofence unlock, 5-step field audit wizard, watermarked evidence capture |
| **PMU Lead** | `pmu@dosje.gov.in` | `pmu123` | `1234` | State-level oversight, random inspection allocation, compliance audit |
| **Institute Incharge** | `institute@dosje.gov.in` | `admin123` | `1234` | Operational health, daily biometric punch tally, standby surprise VC |

---

## 🧪 Comprehensive Quality & Test Verification

All suites pass 100% with zero errors:

| Test Suite | Command | Result | Coverage |
| :--- | :--- | :---: | :--- |
| **AI Subsystem Pytest** | `.\venv\Scripts\python -m pytest tests` | ✅ **81/81 PASSED** | YOLO detection, tracking, spatial zones, loitering, forwarder |
| **Backend Integration** | `cd backend && npm test` | ✅ **17/17 PASSED** | Auth, RBAC 403, random assign, geofence, alerts, evidence |
| **23-Step End-to-End** | `cd backend && npx tsx src/__tests__/e2e_scenario.ts` | ✅ **23/23 PASSED** | Full jury workflow from CCTV event to signed audit certificate |
| **Admin Web Build** | `cd admin-web && npm run build` | ✅ **0 ERRORS** | 2,465 modules transformed to production bundle |

---

## 🎬 Live SIH Jury Demonstration Script (5-Minute Walkthrough)

1. **National Headquarters Oversight**:
   - Open `http://localhost:5173`. Sign in with `admin@dosje.gov.in` / `admin123`.
   - Show live counters (Active Institutes, Online CCTVs, Open Alerts, High-Risk Projects).
   - Review the **Live Geographical Map** showing institutes across Delhi, UP, Maharashtra, and Karnataka.

2. **CCTV Telemetry & AI Anomaly Detection**:
   - Navigate to **CCTV Feeds** tab. Observe live feeds (`CAM-MOSJE-01` to `CAM-MOSJE-06`).
   - Notice `CAM-MOSJE-06` is offline, and `CAM-MOSJE-01` has triggered a **Restricted Zone Breach** alert.
   - Show how the AI Subsystem cryptographically sealed the snapshot with a SHA-256 hash.

3. **Weighted Random Inspection Duty Allocation**:
   - In the **Inspections** or **Dashboard** view, trigger **"Random Surprise Audit Assigner"**.
   - Explain the algorithm: weights institutes dynamically by offline camera hours, attendance deviations, and elapsed audit time.
   - The engine generates a surprise duty (e.g. `DOSJE-SURPRISE-3834`) and notifies the on-call inspector.

4. **Mobile Inspector Field Execution**:
   - Open `http://localhost:4000/mobile` (or mobile app). Log in with MPIN `1234`.
   - The inspector sees the newly assigned surprise duty. Notice the 5-step audit wizard is **LOCKED** due to GPS geofencing.
   - Click *"Simulate On-Site Arrival"* (< 100m). The form cryptographically unlocks.
   - Proceed through the 5 steps: Arrival Gate Photo (watermarked), Sanitation ratings, Headcount reconciliation, and Digital Sign-off.

5. **Closing the Loop (Zero Proxy Operations)**:
   - Switch back to Admin Web at `http://localhost:5173`.
   - The inspection is immediately visible in the **Completed** queue with submitted checklist scores.
   - Navigate to **Audit Logs** to show the immutable compliance record with exact user identities, timestamps, and IP addresses.
   - Attempt an unauthorized administrative operation to demonstrate server-side RBAC rejection (`403 Forbidden`).

---

## 🛠️ Manual Installation & Developer Setup

### 1. Central Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev               # Runs on http://localhost:4000
```

### 2. React Admin Web Setup
```bash
cd admin-web
npm install
npm run dev               # Runs on http://localhost:5173
```

### 3. AI Subsystem Setup
```bash
# In project root:
.\venv\Scripts\python run_phase6_integration_demo.py  # Runs on http://localhost:8000
```

---

## ⚖️ License & Hackathon Attribution
Developed for the **Ministry of Social Justice and Empowerment (DoSJE)**, Government of India, under the Smart India Hackathon initiative. Distributed under the MIT License.
