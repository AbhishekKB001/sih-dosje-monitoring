# DoSJE Drishti 👁️🇮🇳
### Centralized Surveillance, Surprise Inspections & Real-time Institutional Monitoring Portal
**Ministry of Social Justice and Empowerment (DoSJE), Government of India**

![Flutter](https://img.shields.io/badge/Flutter-3.47.2-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-3.13.2-0175C2?style=for-the-badge&logo=dart&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![AI Subsystem](https://img.shields.io/badge/AI%20Vision-YOLO%20%7C%20DeepSORT-FF6F00?style=for-the-badge)
![GovTech](https://img.shields.io/badge/Smart%20Governance-DoSJE-FF9933?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-138808?style=for-the-badge)

---

## 📌 Problem Statement Overview
Development of a centralized mobile application for real-time monitoring, surprise inspections, CCTV surveillance integration, and random inspection assignment for projects/institutes/NGOs running under Department of Social Justice and Empowerment (DoSJE) schemes.

### 🎯 Key Objectives:
- **Zero Proxy Reporting**: Eliminate fake attendance, ghost beneficiaries, and proxy operations through real-time biometric and CCTV validation.
- **Automated Random Audits**: Eliminate bias with AI-driven surprise inspection duties allocated based on telemetry risk scores.
- **Mandatory On-site Geofencing**: Inspection forms remain cryptographically locked until the inspector is within **100 meters** of the institutional GPS coordinates.
- **Tamper-Evident Live Capture**: Gate photos and evidence snapshots are cryptographically watermarked with exact GPS coordinates, IST timestamp, and SHA-256 integrity hash.
- **Surprise Video Calls (VC)**: Real-time dual-feed video conferencing to verify classrooms and incharge availability on demand.

---

## 👥 Supported Stakeholder Personas

The app features an instant **Role-Switcher** in the top bar to evaluate features from each perspective:

| Role | Responsibilities & In-App Capabilities |
| :--- | :--- |
| **DoSJE Official (HQ Admin)** | National/State dashboard, scheme filtering (SMILE, PM-DAKSH, etc.), multi-stream CCTV grid, AI anomaly ticker, random surprise duty generator, surprise VC dialer. |
| **PMU Inspection Officer** | Assigned surprise inspection queue, GPS geofence arrival unlock, 5-step field audit wizard, live watermarked photo capture, digital sign-off. |
| **Institute / NGO Incharge** | CCTV camera operational health, daily biometric punch tally, statutory checklist, and surprise VC standby status. |

---

## ✨ Mobile Features & Modules

### 1. 🔐 Multi-Tier Authentication & Security
- Single Sign-On (SSO) with auto-filled credentials for testing.
- Custom 4-digit **MPIN Keypad**.
- Simulated **Biometric Authentication** (Fingerprint / Face ID).
- Government security advisories and IT Act compliance notices.

### 2. 📊 Real-Time Monitoring Dashboard
- **Scheme Filtering**: Filter by *SMILE*, *PM-DAKSH*, *Nasha Mukt Bharat*, *Senior Citizen Welfare Homes*, *Divyangjan Rehabilitation*.
- **KPI Metrics**: Real-time counters for Total Institutes, Active/Offline CCTVs, Surprise Audits, and Critical AI Anomalies.
- **1-Click AI Duty Assigner**: Risk scoring algorithm that analyzes offline cameras, attendance discrepancies, and compliance history to trigger surprise duties.

### 3. 📹 Live CCTV Surveillance Hub & Interactive PTZ Player
- **Stream Grid**: Filter feeds by location (*Main Gate*, *Classroom*, *Dining Hall*, *Dormitory*, *Office*).
- **Realistic HUD**: Animated blinking `REC` indicator, live timestamp, FPS counter, and resolution.
- **PTZ Controls**: Pan / Tilt directional joystick simulator and Zoom (`1.0x` - `4.0x`).
- **Cryptographic Evidence Capture**: Instant watermarked snapshots timestamped with anti-tamper stamps.
- **Stream Recovery**: Real-time ping/reconnection for obstructed or offline cameras.

### 4. 📋 Surprise Inspection Module (PMU Teams)
- **Geofence Proximity Lock**: Form remains locked until GPS proves distance $\le$ 100m. Includes a *"Simulate On-Site Arrival"* button for live jury demo.
- **5-Step Inspection Form Wizard**:
  1. **Arrival Proof**: Live gate photo with GPS coordinate watermark and hash.
  2. **Infrastructure & Sanitation**: Hygiene, dormitory, food, and fire safety checklist.
  3. **Beneficiary Headcount Audit**: Slider comparing registered vs present beneficiaries to catch proxy claims.
  4. **CCTV & Logbook Audit**: Verification of NVR hardware, 30-day storage, and biometric registers.
  5. **Score & Digital Sign-off**: Star compliance score, remarks, and digital signature canvas.
- **Signed Audit Report Preview**: Official government certificate format with simulated PDF download.

### 5. 📞 Random Video Conferencing (VC) Module
- One-tap surprise video connection with Institute Incharge or classrooms.
- Dual-feed WebRTC UI (main stream + Picture-in-Picture).
- In-call controls (Mute, Video toggle, Camera flip, Duration timer).
- **In-Call Snapshot Evidence**: Watermarked capture directly from active call session.

### 6. 🚨 AI Anomaly & Attendance Analytics
- Automated anomaly detection for:
  - Camera tampering / blackout
  - Proxy biometric punch-ins
  - Headcount mismatch between portal and CCTV
  - Unauthorized supervisory staff absence
- Severity filters: *Critical*, *Warning*, *Info*.

### 7. 🔔 Notification Hub & Digital ID
- Categorized push alerts (*Critical*, *Inspection*, *CCTV*, *Compliance*).
- Officer digital ID badge with employee code, designation, and QR code verification.
- Offline-first draft synchronization indicator.

---

## 🧠 AI Subsystem & Vision Intelligence
Located in [`ai_subsystem/`](./ai_subsystem/):
- **Vision Pipeline**: YOLO detection, DeepSORT tracking, and visual health monitoring (lens obstruction, glare, blackout).
- **Spatial & Temporal Analytics**: Polygon restricted zones, loitering detection, and schedule compliance.
- **Crowd & Occupancy Analytics**: Real-time room occupancy and non-biometric attendance consistency auditing.
- **Mobile API Contract**: REST and SSE endpoints defined in [`docs/FLUTTER_INTEGRATION_CONTRACT.md`](./docs/FLUTTER_INTEGRATION_CONTRACT.md).

---

## 🏗️ Project Structure

```
├── ai_subsystem/         # Python AI & Computer Vision Subsystem
├── docs/                 # Architectural specifications & mobile API contracts
├── lib/                  # Flutter Mobile Application
│   ├── core/             # Colors, Theme, Strings, Mock Data
│   ├── data/             # Models & Repositories
│   ├── viewmodels/       # MVVM State ViewModels (Provider)
│   ├── views/            # Auth, Dashboard, CCTV, Inspections, VC, Analytics
│   └── widgets/          # Custom Cards, HUDs, Geofence Widgets
├── tests/                # AI subsystem unit & integration tests
└── test/                 # Flutter mobile widget & unit tests
```

---

## 🚀 Getting Started

### 📱 Running the Flutter Mobile App
```bash
# 1. Install dependencies
flutter pub get

# 2. Run automated test suite
flutter test

# 3. Launch the app
flutter run -d chrome     # Run on Web
# or
flutter run -d windows    # Run on Windows Desktop
```

### 🧠 Running the AI Subsystem
```bash
# 1. Install python dependencies
pip install -r requirements.txt

# 2. Run integration demo
python run_phase6_integration_demo.py
```

---

## 🧪 Quality & Test Coverage
- **Flutter Static Analysis**: `flutter analyze` passes with **0 errors, 0 warnings**.
- **Flutter Automated Tests**: 4/4 test suites passed.
- **Production Web Build**: Verified with `flutter build web`.

---

## ⚖️ License
Distributed under the MIT License. Developed for Ministry of Social Justice and Empowerment (DoSJE) Smart India Hackathon initiative.
