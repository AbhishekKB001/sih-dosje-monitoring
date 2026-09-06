# DoSJE Drishti — Final System Startup & Demo Guide 🇮🇳👁️

This guide explains how to start and operate the entire integrated **DoSJE Drishti Monitoring Platform** from scratch after a cold boot, laptop restart, or for an official jury demonstration.

---

## 🏗️ System Overview & Ports

| Subsystem | Service / Technology | Local Port | Health Check / Direct URL |
| :--- | :--- | :--- | :--- |
| **Central Backend** | Node.js / Express / Prisma SQLite | `4000` | `http://localhost:4000/api/health` |
| **AI Intelligence & CCTV** | Python / YOLOv8 / MJPEG Streamer | `8000` | `http://localhost:8000/api/v1/health` |
| **Admin Web Dashboard** | React / Vite / TailwindCSS | `5173` | `http://localhost:5173` |
| **Mobile App (Android)** | Flutter Native (`in.gov.dosje.dosje_drishti`) | Emulator | Connected to Backend via `adb reverse tcp:4000` |

---

## 🚀 Step-by-Step Startup Sequence (After Laptop Restart)

### Step 1: Start the SIH Pixel 8 Android Emulator (GUI Mode)

Open PowerShell and launch the virtual device with standard host GUI rendering:

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$sdk\platform-tools;$sdk\emulator;$env:Path"
& "$sdk\emulator\emulator.exe" -avd SIH_Pixel_8 -gpu host
```

> **Note:** Wait approximately 15–20 seconds until the phone window appears on your desktop and boots into the home screen.

---

### Step 2: Open the Already-Installed DoSJE Drishti App

Once the emulator is online, bring the pre-installed application to the foreground and configure the local host network bridge:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

# 1. Map backend port 4000 from emulator localhost to host machine
& $adb -s emulator-5554 reverse tcp:4000 tcp:4000

# 2. Launch DoSJE Drishti app
& $adb -s emulator-5554 shell monkey -p in.gov.dosje.dosje_drishti -c android.intent.category.LAUNCHER 1
```

The app will launch directly into the **Welcome to DoSJE Inspection Portal** role-selection screen.

---

### Step 3: Start All Central Platform Services (One-Click)

Simply double-click the Windows batch launcher from the project folder:

```cmd
start_all_services.bat
```

*Or execute from PowerShell:*
```powershell
.\start_all_services.ps1
```

#### What this one-click launcher automatically does:
1. **Safety Checks**: Inspects ports `4000`, `8000`, and `5173` for already-running services and avoids port collisions.
2. **Central Backend**: Launches `npm run dev` in `backend/` and polls `http://localhost:4000/api/health` until ready.
3. **AI & CCTV Service**: Ingests `01.avi`, initializes the 6-camera AI analysis pipeline, launches the HTTP MJPEG streamer on port `8000`, and automatically connects the alert forwarder.
4. **Admin Web**: Launches the React Vite server on `http://localhost:5173`.
5. **Auto Port Reverse**: Automatically runs `adb reverse tcp:4000 tcp:4000` if the emulator is detected.

---

### Step 4: Open & Operate the Admin Dashboard

Open your web browser and navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

#### Demo Credentials:
- **Email**: `admin@dosje.gov.in`
- **Password**: `admin123`

#### Key Demo Pages to Inspect:
1. **Live CCTV Page** (`/cctv`):
   - Displays real-time continuous 25 FPS video stream from `01.avi` via `http://localhost:8000/api/v1/stream/CAM-MOSJE-01`.
   - Grid includes camera telemetry, PTZ controls, and AI inference overlays.
2. **AI Alerts Center** (`/alerts`):
   - Shows active and historical anomalies (attendance discrepancy, loitering, camera occlusion).
   - Click **Acknowledge** or **Resolve** to demonstrate real-time backend updates and cryptographic evidence hashing.
3. **Surprise Audit & Map** (`/inspections` / `/map`):
   - Displays geofenced institutions, routine inspections, and real-time field duty logs.

---

### Step 5: Cleanly Stop Everything

When you are done with the demonstration, double-click:

```cmd
stop_all_services.bat
```

*Or from PowerShell:*
```powershell
.\stop_all_services.ps1
```

This safely closes the processes listening on ports `4000`, `8000`, and `5173` while keeping the Android emulator and project files intact.

---

## 🛠️ Quick Troubleshooting Checklist

- **Backend not reachable from Android Emulator?**
  Run: `adb -s emulator-5554 reverse tcp:4000 tcp:4000`
- **CCTV feed shows blank on Admin Web?**
  Ensure Port 8000 is online by checking: `http://localhost:8000/api/v1/health`
- **Need to re-seed demo data in backend database?**
  In PowerShell: `cd backend; npx prisma db push --force-reset; npm run prisma:seed`

---

## 🧪 Comprehensive Automated Test Suites

The platform includes full automated validation across every member component:

| Component / Test Suite | Command | Coverage |
| :--- | :--- | :--- |
| **Backend Integration & Risk Engine** | `cd backend; npm test` | 22/22 Integration & Risk Tests |
| **23-Step End-to-End Demonstration** | `cd backend; npx tsx src/__tests__/e2e_scenario.ts` | Complete 23-Step Cross-Member Flow |
| **Member 5 Risk Unit Tests** | `cd backend; npx tsx src/__tests__/risk_engine.test.ts` | 6/6 Mathematical Risk Engine Tests |
| **Member 4 Python AI Subsystem** | `.\venv\Scripts\python -m pytest tests` | 84/84 Vision, Zones & Forwarder Tests |
| **Flutter Mobile App Test Suite** | `flutter test --no-pub` | 4/4 Splash, Geofence & Auth Tests |
| **Flutter Static Analysis** | `flutter analyze --no-pub` | 0 errors, 0 warnings, 0 lints |
| **Admin Web Production Build** | `cd admin-web; npm run build` | Clean Vite production bundle |

---

## 📱 Physical Android Device Installation (Jury Handset)

A production ARM-compatible release APK is pre-compiled and ready for direct installation on physical Android phones (arm64-v8a, armeabi-v7a, x86_64):

- **Location**: `build\app\outputs\flutter-apk\app-release.apk`
- **Permissions Declared**: `INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`
- **Installation Command**:
  ```powershell
  adb install -r build\app\outputs\flutter-apk\app-release.apk
  ```
