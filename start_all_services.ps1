# DoSJE Drishti - Central Platform PowerShell Launcher
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " 👁️🇮🇳 DoSJE DRISHTI - CENTRAL MONITORING SYSTEM LAUNCHER" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

Write-Host "1. Launching Central Backend API (Port 4000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "2. Launching React Admin Web Dashboard (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\admin-web'; npm run dev"

Write-Host "3. Launching AI Vision Subsystem (Port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; .\venv\Scripts\python run_phase6_integration_demo.py"

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host " ✅ ALL SERVICES LAUNCHED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " 💻 React Admin Web:      http://localhost:5173" -ForegroundColor White
Write-Host " ⚙️ Central Backend API:   http://localhost:4000/api" -ForegroundColor White
Write-Host " 📱 Flutter Mobile Web:   http://localhost:4000/mobile" -ForegroundColor White
Write-Host " 🧠 AI Intelligence API:  http://localhost:8000/api/v1" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
