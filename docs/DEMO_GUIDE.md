# DoSJE Drishti — SIH 2026 Live Demonstration & Evaluation Guide 🎯

This document outlines the step-by-step presentation script and evaluation walkthrough for the **Smart India Hackathon 2026** jury presentation.

---

## 🎭 Demonstration Personas

| Screen / Device | User Persona | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin Web (Browser)** | **Member 1** (DoSJE Official) | `member1.dosje@sih.gov.in` | `DemoPass@2026` |
| **Mobile App (Phone/Emulator)** | **Member 2** (PMU Field Inspector) | `member2.inspector@sih.gov.in` | `DemoPass@2026` |
| **Incharge App (Phone B / Tab)** | **Member 4** (Project Incharge A) | `member4.incharge@sih.gov.in` | `DemoPass@2026` |

---

## 🎬 5-Stage Live Presentation Workflow

### Stage 1: Central Command & National CCTV Telemetry
1. Open browser at `http://localhost:5173`.
2. Login as **Member 1 (DoSJE Official)** (`member1.dosje@sih.gov.in`).
3. **Show Dashboard**:
   - Point out real-time IST clock, auto-refresh badge, and deep-linked stat cards (Flagship Projects, Institutes, Inspections).
   - Show the **Risk Distribution** bar chart generated dynamically by Member 5's Risk Engine.
4. **Navigate to CCTV Page**:
   - Show all 6 live feeds streaming from OpenCV at 25 FPS.
   - Click **`AI Analysis View`**: Highlight real-time green bounding boxes, ByteTrack tracking IDs, and spatial monitoring zone polygons.
   - Toggle to **`Raw CCTV Feed`** to show the clean feed.
   - Click directional buttons on the **Virtual ONVIF PTZ Pad** (Pan, Tilt, Zoom).
   - Click **`Start REC`**: Highlight live recording indicator and creation of verifiable MP4 clip in `data/evidence/clips/`.

---

### Stage 2: AI Anomaly Detection & Alert Triage
1. **Navigate to Alerts Page**:
   - Show open alerts forwarded automatically by the Python AI subsystem (`POST /api/alerts`).
   - Click on an alert (e.g. `Loitering in Restricted Vault` or `Biometric Attendance Discrepancy`).
   - View the snapshot evidence with cryptographic SHA-256 hash stamp.
2. **Raise for Surprise Inspection**:
   - Click the **`Raise for Inspection`** button on the alert card.
   - Explain how the risk engine factors this anomaly into the institute's composite score and triggers stochastic allocation.

---

### Stage 3: Field Inspector Mobile Workflow (Member 2)
1. Open the Flutter mobile application.
2. On the login screen, click the **`Member 2 (Inspector)`** quick picker chip.
3. Authenticate with `DemoPass@2026`.
4. **Verify Identity**:
   - Highlight that the dashboard and profile header correctly display **Member 2 (PMU Inspection Officer)**.
5. **Open Assigned Inspection Duty**:
   - Select the surprise duty (e.g. `DOSJE-INSP-901`).
   - Show the institute details, scheme name, and risk rationale.
6. **Hardware Geofence Verification**:
   - In Step 1, click **`Acquire Real GPS`**.
   - Show live satellite coordinates, accuracy in meters, and computed distance.
   - Show how the geofence unlocks when within the 100-meter perimeter.
7. **Hardware Camera & Watermarking**:
   - Tap **`Open Camera Photo`** to capture the physical gate.
   - Show the resulting image stamped with a solid black/yellow banner:  
     `DoSJE DRISHTI | PROJ: ... | INST: ... | GPS: <LAT, LNG> +/- <ACC>m | <IST_TIME>`
   - Point out the SHA-256 integrity hash generated immediately upon capture.
   - Tap **`Record Video`** to record a short 30-second video walkthrough.
8. **Checklist & Digital Signature**:
   - Complete Step 2 (Infrastructure), Step 3 (Headcount verification), and Step 4 (CCTV records).
   - In Step 5, tap **`Sign`** to apply digital Aadhaar eSign bound to Member 2's name.
   - Tap **`Submit Final Report`**.

---

### Stage 4: Admin Report Verification & Audit Trail
1. Switch back to **Admin Web**:
   - Navigate to **Inspections Page**: Show that the duty is now marked `Submitted` / `Completed`.
   - Open the **Inspection Summary Certificate**: Show the tamper-evident digital seal, inspector signature, uploaded photos, and SHA-256 hashes.
2. Navigate to **Audit Logs Page**:
   - Show the immutable chronological log capturing:
     - Inspection duty creation
     - Geofence unlock event
     - Evidence cryptographic hash recording
     - Final report submission and signature

---

### Stage 5: Project-Targeted Surprise Video Conferencing (VC)
1. On Admin Web or Inspector App, click **`Surprise VC Audit`**.
2. Select **Demo Institute A** (linked to Member 4).
3. Backend resolves the designated incharge: `member4.incharge@sih.gov.in`.
4. On Device B (logged in as Member 4), the incoming call modal immediately appears with ringing alert.
5. Tap **`Accept`**: Both parties are connected to the canonical Jitsi Meet room (`https://meet.jit.si/dosje-audit-...`) with two-way video, audio, camera flip, and mute controls.
6. End call: Backend logs the session duration and outcome to the audit trail.
