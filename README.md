# DoSJE Drishti 👁️🇮🇳
### Centralized Surveillance, Surprise Inspections & Real-time Institutional Monitoring Portal
**Ministry of Social Justice and Empowerment (DoSJE), Government of India**

![Flutter](https://img.shields.io/badge/Flutter-3.47.2-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-3.13.2-0175C2?style=for-the-badge&logo=dart&logoColor=white)
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

## ✨ Core Features & Screenshots

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

## 🏗️ Architecture & Project Structure

Clean **MVVM (Model-View-ViewModel)** architecture:

```
lib/
├── core/
│   ├── constants/        # AppColors, AppStrings, MockData
│   └── theme/            # Material 3 Gov Theme with Tri-color accents
├── data/
│   ├── models/           # UserModel, InstituteModel, CCTVFeedModel, InspectionDutyModel, AnomalyModel, NotificationModel
│   └── repositories/     # AuthRepository, CCTVRepository, InspectionRepository, NotificationRepository
├── viewmodels/           # AuthViewModel, DashboardViewModel, CCTVViewModel, InspectionViewModel, VideoCallViewModel, NotificationViewModel
├── widgets/              # CustomAppBar, StatMetricCard, LiveCCTVCard, GeofenceStatusCard
└── views/
    ├── auth/             # SplashScreen, RoleSelectionScreen, LoginScreen, MpinBiometricScreen
    ├── dashboard/        # MainNavigationScreen, OfficialDashboardView, InspectorDashboardView, InstituteDashboardView
    ├── cctv/             # CCTVGridView, CCTVPlayerView (PTZ + Evidence Snapshots)
    ├── inspection/       # InspectionDutyListView, InspectionDetailView, InspectionFormWizardView, InspectionReportView
    ├── video_call/       # RandomVcScreen (Dual stream WebRTC simulation)
    ├── analytics/        # AnomalyAlertsView (AI alerts, tampering, proxy attendance)
    ├── notifications/    # NotificationCenterView (Urgent badges & deep-linking)
    └── profile/          # ProfileView (Digital ID card, role-switcher, preferences)
```

---

## 🚀 Getting Started

### Prerequisites
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (v3.22.0 or higher)
- Dart SDK (v3.4.0 or higher)

### Setup & Run
```bash
# 1. Clone this repository
git clone https://github.com/<your-username>/<your-repo-name>.git
cd sih

# 2. Get dependencies
flutter pub get

# 3. Run automated test suite
flutter test

# 4. Launch the application
# On Chrome (Web):
flutter run -d chrome

# On Windows Desktop:
flutter run -d windows
```

---

## 🧪 Quality & Test Coverage
- **Static Analysis**: `flutter analyze` passes with **0 errors, 0 warnings**.
- **Automated Tests**: Comprehensive unit and widget tests covering auth role-switching, geofence arrival calculation, dashboard metrics, and UI rendering.
- **Production Build**: Verified with `flutter build web`.

---

## ⚖️ License
Distributed under the MIT License. Developed for Ministry of Social Justice and Empowerment (DoSJE) Smart India Hackathon initiative.
