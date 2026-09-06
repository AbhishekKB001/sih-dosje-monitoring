# DoSJE Drishti — Complete Installation & Setup Guide 🚀

This document provides step-by-step instructions to set up, configure, and execute the entire **DoSJE Drishti** platform from a fresh clone.

---

## 📋 System Prerequisites

| Dependency | Minimum Version | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | v18.x | v20.x or v22.x | Required for Central Backend & Admin Web |
| **npm** | v9.x | v10.x | Package manager for Node.js |
| **Python** | 3.10 | 3.12 or 3.13 | Required for AI Vision Subsystem & OpenCV |
| **Flutter SDK** | 3.22.x | 3.24.x or higher | Required for Mobile Inspection Client |
| **Android SDK** | API Level 21 | API Level 34 | Required for Android build & physical device |
| **Git** | 2.30+ | Latest | Version control |

---

## 📦 Step-by-Step Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/AbhishekKB001/sih-dosje-monitoring.git
cd sih-dosje-monitoring
```

---

### Step 2: Set Up Central Backend (Port 4000)
```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment variables
copy .env.example .env

# 3. Generate Prisma client & initialize database
npx prisma generate
npx prisma db push

# 4. Seed canonical SIH demo accounts & flagship data
npm run prisma:seed
```

To run the backend tests:
```bash
npm test
```

---

### Step 3: Set Up AI Vision Subsystem (Port 8000)
```bash
cd ../ai-subsystem

# 1. Create and activate Python virtual environment
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
# source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt
```

To verify the AI test suite:
```bash
pytest tests -v
```

---

### Step 4: Set Up Admin Web Dashboard (Port 5173)
```bash
cd ../admin-web

# 1. Install dependencies
npm install

# 2. Verify production build
npm run build
```

---

### Step 5: Set Up Flutter Mobile App
```bash
cd ../mobile-app

# 1. Get Flutter packages
flutter pub get

# 2. Run static analysis
flutter analyze --no-pub

# 3. Run unit & widget tests
flutter test --no-pub
```

---

## 🏃 Running the Platform

### Option A: One-Click Windows Launcher (Recommended)
From the repository root or `scripts/` directory:
```bash
# Double-click or run from terminal:
start_all_services.bat
```
Or via PowerShell:
```powershell
.\scripts\start_all_services.ps1
```
This script will automatically:
1. Probe and launch the **Central Backend** on `http://localhost:4000`.
2. Probe and launch the **AI CCTV & MJPEG Streamer** on `http://localhost:8000`.
3. Probe and launch the **Admin Web Dashboard** on `http://localhost:5173`.
4. Set up `adb reverse` port forwarders for connected Android devices.

To gracefully stop all background services:
```bash
stop_all_services.bat
```

---

### Option B: Manual Service-by-Service Startup

#### 1. Start Central Backend (Terminal 1)
```bash
cd backend
npm run dev
```
*Health Check*: `http://localhost:4000/api/health`

#### 2. Start AI Subsystem & CCTV Streamer (Terminal 2)
```bash
cd ai-subsystem
python run_ai_cctv_server.py
```
*Health Check*: `http://localhost:8000/api/v1/health`  
*Live Stream*: `http://localhost:8000/api/v1/stream/CAM-MOSJE-01?view=ai`

#### 3. Start Admin Web Dashboard (Terminal 3)
```bash
cd admin-web
npm run dev
```
*Dashboard*: `http://localhost:5173`

#### 4. Launch Flutter Mobile App (Terminal 4)
```bash
cd mobile-app
# For Android Emulator or Connected Phone:
flutter run
```

---

## 🔐 Canonical Demo Accounts

All demonstration accounts use the password: `DemoPass@2026`

| Persona | Role | Email | Use Case |
| :--- | :--- | :--- | :--- |
| **Member 1** | DoSJE Official (`ADMIN`) | `member1.dosje@sih.gov.in` | Full Admin Web governance & triage |
| **Member 2** | PMU Field Inspector (`INSPECTOR`) | `member2.inspector@sih.gov.in` | Field inspection & mobile app audit |
| **Member 3** | CCTV Monitoring Demo (`OFFICIAL`) | `member3.cctv@sih.gov.in` | Surveillance command center |
| **Member 4** | Project Incharge (`INSTITUTE`) | `member4.incharge@sih.gov.in` | Institute A / SMILE Scheme VC target |
| **Member 5** | Project Incharge (`INSTITUTE`) | `member5.incharge@sih.gov.in` | Institute B / PM-DAKSH Scheme VC target |
| **Member 6** | Staff / Beneficiary Demo (`INSTITUTE`) | `member6.staff@sih.gov.in` | Beneficiary liaison verification |
