param (
    [string]$StreamKey = "camera-1",
    [string]$VideoFile = "C:\Users\hrithik naveen\.antigravity-ide\sih-inspection-platform\videos\cctv-sample.mp4",
    [string]$RtspUrl = "rtsp://localhost:8554/live"
)

$ffmpeg = "C:\Users\hrithik naveen\tools\ffmpeg\bin\ffmpeg.exe"
$targetUrl = "$RtspUrl/$StreamKey"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "SIH CCTV RTSP Stream Simulator (Member 3)" -ForegroundColor Yellow
Write-Host "Source: $VideoFile" -ForegroundColor Green
Write-Host "Publishing to: $targetUrl" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

# Stream in loop with native framerate (-re)
& $ffmpeg -re -stream_loop -1 -i "$VideoFile" -c:v copy -an -f rtsp -rtsp_transport tcp "$targetUrl"
