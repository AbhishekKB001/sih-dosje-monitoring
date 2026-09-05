# Master Launcher for SIH CCTV & Video Conferencing (Member 3)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting SIH CCTV Surveillance & Video Conferencing" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$projRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. MediaMTX (if available locally)
if (Test-Path "$projRoot\cctv\mediamtx.exe") {
    Write-Host "[1/4] Starting MediaMTX Media Server on :8554 (RTSP), :8888 (HLS), :8889 (WebRTC)..." -ForegroundColor Green
    Start-Process -FilePath "$projRoot\cctv\mediamtx.exe" -ArgumentList "$projRoot\cctv\mediamtx.yml" -WindowStyle Minimized
} elseif (Get-Command mediamtx -ErrorAction SilentlyContinue) {
    Write-Host "[1/4] Starting MediaMTX Media Server from PATH..." -ForegroundColor Green
    Start-Process -FilePath "mediamtx" -ArgumentList "$projRoot\cctv\mediamtx.yml" -WindowStyle Minimized
} else {
    Write-Host "[1/4] MediaMTX binary not found locally. To run RTSP/WebRTC proxy, download mediamtx or run docker-compose." -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# 2. Simulated RTSP Stream
if (Test-Path "$projRoot\cctv\start-cctv-stream.ps1") {
    Write-Host "[2/4] Starting Simulated CCTV RTSP Feed (FFmpeg loop with 01.avi)..." -ForegroundColor Green
    Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$projRoot\cctv\start-cctv-stream.ps1`" -StreamKey camera-1" -WindowStyle Minimized
}

Start-Sleep -Seconds 2

# 3. Central Backend API & Signaling Server
Write-Host "[3/4] Starting Central Backend Server on http://localhost:4000..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$projRoot\backend`" && npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 3

# 4. Admin Web Dashboard
Write-Host "[4/4] Starting Admin Web Dashboard on http://localhost:5173..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$projRoot\admin-web`" && npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 2

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  ALL SYSTEMS RUNNING!" -ForegroundColor Green
Write-Host "  Open Browser: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  Backend API:  http://localhost:4000/api/health" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Start-Process "http://localhost:5173"
