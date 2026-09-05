# Master Launcher for SIH Part 3 Platform (Member 3)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting SIH CCTV Surveillance & Video Conferencing" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$projRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$env:Path = "C:\Users\hrithik naveen\tools\node;C:\Users\hrithik naveen\tools\mediamtx;C:\Users\hrithik naveen\tools\ffmpeg\bin;" + $env:Path

# 1. MediaMTX
Write-Host "[1/4] Starting MediaMTX Media Server on :8554 (RTSP), :8888 (HLS), :8889 (WebRTC)..." -ForegroundColor Green
Start-Process -FilePath "$projRoot\media-server\mediamtx.exe" -ArgumentList "$projRoot\media-server\mediamtx.yml" -WindowStyle Minimized

Start-Sleep -Seconds 2

# 2. Simulated RTSP Stream
Write-Host "[2/4] Starting Simulated CCTV RTSP Feed (FFmpeg loop)..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$projRoot\scripts\start-cctv-stream.ps1`" -StreamKey camera-1" -WindowStyle Minimized

Start-Sleep -Seconds 2

# 3. Backend API & Signaling Server
Write-Host "[3/4] Starting Backend Node.js Server on http://localhost:5000..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$projRoot\backend`" && npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 3

# 4. Frontend Vite Dashboard
Write-Host "[4/4] Starting Frontend Dashboard on http://localhost:5173..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$projRoot\frontend`" && npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 2

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  ALL SYSTEMS RUNNING!" -ForegroundColor Green
Write-Host "  Open Browser: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  Backend API:  http://localhost:5000/api/health" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Start-Process "http://localhost:5173"
