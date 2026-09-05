@echo off
title DoSJE Drishti - Central Platform Launcher
cd /d "%~dp0"
echo ================================================================
echo  👁️🇮🇳 DoSJE DRISHTI - CENTRAL MONITORING SYSTEM LAUNCHER
echo ================================================================
echo  1. Launching Central Backend API (Port 4000)...
start "DoSJE Backend (Port 4000)" cmd /c "cd /d %~dp0backend && npm run dev"

echo  2. Waiting for backend initialization...
timeout /t 3 /nobreak >nul

echo  3. Launching React Admin Web Dashboard (Port 5173)...
start "DoSJE Admin Web (Port 5173)" cmd /c "cd /d %~dp0admin-web && npm run dev"

echo  4. Launching AI Vision Intelligence Subsystem (Port 8000)...
start "DoSJE AI Subsystem (Port 8000)" cmd /c "cd /d %~dp0 && .\venv\Scripts\python run_phase6_integration_demo.py"

echo ================================================================
echo  ✅ ALL SERVICES LAUNCHED SUCCESSFULLY!
echo ================================================================
echo  💻 React Admin Web:      http://localhost:5173
echo  ⚙️ Central Backend API:   http://localhost:4000/api
echo  📱 Flutter Mobile Web:   http://localhost:4000/mobile
echo  🧠 AI Intelligence API:  http://localhost:8000/api/v1
echo ================================================================
pause
