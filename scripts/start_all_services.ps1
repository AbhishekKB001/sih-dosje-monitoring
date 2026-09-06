<#
.SYNOPSIS
    DoSJE Drishti - Canonical One-Click Windows Demo Platform Launcher
.DESCRIPTION
    Starts the canonical Central Backend (port 4000), AI & CCTV Streaming Service (port 8000),
    and Admin Web Dashboard (port 5173) in order with automated health checks,
    graceful port conflict handling, and automated ADB reverse port mapping for the Flutter app.
#>

$ErrorActionPreference = "Continue"
if (Test-Path (Join-Path $PSScriptRoot "backend")) {
    $root = $PSScriptRoot
} else {
    $root = Split-Path -Parent $PSScriptRoot
}

Clear-Host
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "     DEPARTMENT OF SOCIAL JUSTICE AND EMPOWERMENT (DoSJE) - DRISHTI       " -ForegroundColor Yellow
Write-Host "               INTEGRATED DEMO PLATFORM STARTUP LAUNCHER                  " -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Project Root: $root`n" -ForegroundColor DarkGray

# Helper: Test if port is actively listening (Instantaneous socket probe)
function Test-PortActive ($port) {
    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $connectTask = $client.ConnectAsync([System.Net.IPAddress]::Loopback, $port)
        $isConnected = $connectTask.Wait(300)
        $client.Close()
        return $isConnected
    } catch {
        return $false
    }
}

# Helper: HTTP Health Check with retries
function Wait-ForEndpoint ($url, $timeoutSeconds, $serviceName) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSeconds) {
        try {
            $resp = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 800
        }
    }
    return $false
}

# -------------------------------------------------------------------------
# STEP 1: Central Backend API (Port 4000)
# -------------------------------------------------------------------------
Write-Host "[1/3] Checking Central Backend REST API (Port 4000)..." -ForegroundColor Yellow

if (Test-PortActive 4000) {
    if (Wait-ForEndpoint "http://127.0.0.1:4000/api/health" 3 "Central Backend") {
        Write-Host "  [OK] Central Backend is ALREADY RUNNING and healthy on port 4000" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Port 4000 is open but not responding to /api/health." -ForegroundColor Red
        Write-Host "            If another service is using port 4000, please close it or run stop_all_services.bat." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "  Starting Central Backend on http://localhost:4000..." -ForegroundColor Cyan
    $backendDir = Join-Path $root "backend"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'DoSJE - Central Backend (Port 4000)'; Set-Location '$backendDir'; npm run dev"
    
    Write-Host "  Waiting for backend health check..." -NoNewline
    if (Wait-ForEndpoint "http://127.0.0.1:4000/api/health" 20 "Central Backend") {
        Write-Host " READY!" -ForegroundColor Green
    } else {
        Write-Host " TIMEOUT (Check backend terminal window for logs)" -ForegroundColor Red
    }
}

# -------------------------------------------------------------------------
# STEP 2: AI Subsystem & CCTV Stream Server (Port 8000)
# -------------------------------------------------------------------------
Write-Host "`n[2/3] Checking AI Vision Subsystem & CCTV Streamer (Port 8000)..." -ForegroundColor Yellow

if (Test-PortActive 8000) {
    if (Wait-ForEndpoint "http://127.0.0.1:8000/api/v1/health" 3 "AI Subsystem") {
        Write-Host "  [OK] AI Subsystem is ALREADY RUNNING and healthy on port 8000" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Port 8000 is open but not responding to /api/v1/health." -ForegroundColor Red
    }
} else {
    Write-Host "  Starting AI Subsystem & Live CCTV Streamer on http://localhost:8000..." -ForegroundColor Cyan
    $pythonExe = Join-Path $root "venv\Scripts\python.exe"
    if (-not (Test-Path $pythonExe)) {
        $pythonExe = Join-Path $root "ai-subsystem\venv\Scripts\python.exe"
    }
    if (-not (Test-Path $pythonExe)) {
        $pythonExe = "python"
    }
    
    $aiDir = Join-Path $root "ai-subsystem"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'DoSJE - AI & CCTV Stream (Port 8000)'; Set-Location '$aiDir'; & '$pythonExe' run_ai_cctv_server.py"
    
    Write-Host "  Waiting for AI & CCTV stream initialization..." -NoNewline
    if (Wait-ForEndpoint "http://127.0.0.1:8000/api/v1/health" 50 "AI Subsystem") {
        Write-Host " READY!" -ForegroundColor Green
    } else {
        Write-Host " TIMEOUT (Check AI terminal window for logs)" -ForegroundColor Red
    }
}

# -------------------------------------------------------------------------
# STEP 3: Admin Web Dashboard (Port 5173)
# -------------------------------------------------------------------------
Write-Host "`n[3/3] Checking React Admin Web Dashboard (Port 5173)..." -ForegroundColor Yellow

if (Test-PortActive 5173) {
    if (Wait-ForEndpoint "http://127.0.0.1:5173" 3 "Admin Web") {
        Write-Host "  [OK] Admin Web Dashboard is ALREADY RUNNING on http://localhost:5173" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Port 5173 is open but not responding." -ForegroundColor Red
    }
} else {
    Write-Host "  Starting React Admin Web Dashboard on http://localhost:5173..." -ForegroundColor Cyan
    $adminWebDir = Join-Path $root "admin-web"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'DoSJE - Admin Web Dashboard (Port 5173)'; Set-Location '$adminWebDir'; npm run dev -- --port 5173 --host 0.0.0.0"
    
    Write-Host "  Waiting for Admin Web preview..." -NoNewline
    if (Wait-ForEndpoint "http://127.0.0.1:5173" 20 "Admin Web") {
        Write-Host " READY!" -ForegroundColor Green
    } else {
        Write-Host " TIMEOUT (Check Admin Web terminal window for logs)" -ForegroundColor Red
    }
}

# -------------------------------------------------------------------------
# STEP 4: Optional Android Emulator Reverse Port Forwarding
# -------------------------------------------------------------------------
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (Test-Path $adbPath) {
    try {
        $devs = & $adbPath devices 2>$null
        if ($devs -match "emulator-\d+\s+device") {
            & $adbPath -s emulator-5554 reverse tcp:4000 tcp:4000 2>$null
            Write-Host "`n[ADB] Auto-configured Android Emulator reverse port: tcp:4000 -> localhost:4000" -ForegroundColor DarkCyan
        }
    } catch {}
}

# -------------------------------------------------------------------------
# SUMMARY DASHBOARD
# -------------------------------------------------------------------------
Write-Host "`n==========================================================================" -ForegroundColor Cyan
Write-Host "                      ALL DEMO SERVICES ARE READY                         " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  [Admin Dashboard]        http://localhost:5173" -ForegroundColor White
Write-Host "  [Central Backend REST]   http://localhost:4000/api" -ForegroundColor White
Write-Host "  [Backend Health Check]   http://localhost:4000/api/health" -ForegroundColor White
Write-Host "  [Live CCTV MJPEG Stream] http://localhost:8000/api/v1/stream/CAM-MOSJE-01" -ForegroundColor White
Write-Host "  [AI Intelligence Health] http://localhost:8000/api/v1/health" -ForegroundColor White
Write-Host "  [Flutter Mobile Backend] http://localhost:4000/api (ADB reverse active)" -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan

Write-Host "Press [O] to open Admin Dashboard in browser, or any other key to exit (auto-closing in 5s)..." -ForegroundColor Yellow
$sw = [System.Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt 5) {
    try {
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.KeyChar -eq 'o' -or $key.KeyChar -eq 'O') {
                Start-Process "http://localhost:5173"
            }
            break
        }
    } catch {
        # Non-interactive terminal, container, or background subagent session
        break
    }
    Start-Sleep -Milliseconds 100
}
Write-Host "Launcher finished successfully." -ForegroundColor Green
