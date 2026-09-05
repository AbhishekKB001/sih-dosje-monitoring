param (
    [string]$StreamKey = "camera-1",
    [string]$VideoFile = "$PSScriptRoot\..\01.avi",
    [string]$RtspUrl = "rtsp://localhost:8554/live"
)

# Resolve ffmpeg from PATH or common tools
$ffmpeg = "ffmpeg"
if (!(Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\tools\ffmpeg\bin\ffmpeg.exe") {
        $ffmpeg = "C:\tools\ffmpeg\bin\ffmpeg.exe"
    } else {
        Write-Warning "ffmpeg was not found in PATH. Please install ffmpeg to simulate RTSP streaming."
    }
}

$targetUrl = "$RtspUrl/$StreamKey"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "SIH CCTV RTSP Stream Simulator (Member 3)" -ForegroundColor Yellow
Write-Host "Source: $VideoFile" -ForegroundColor Green
Write-Host "Publishing to: $targetUrl" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

if (Test-Path "$VideoFile") {
    # Stream in loop with native framerate (-re)
    & $ffmpeg -re -stream_loop -1 -i "$VideoFile" -c:v copy -an -f rtsp -rtsp_transport tcp "$targetUrl"
} else {
    Write-Error "Video file not found at $VideoFile"
}
