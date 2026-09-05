# Troubleshooting & Diagnostics Guide

## Common Issues & Resolutions

### 1. "HLS Stream 404 Not Found"
- **Cause**: MediaMTX is running but no publisher is streaming to the path, or the stream has stopped.
- **Resolution**:
  1. Check MediaMTX active streams:
     ```powershell
     curl.exe http://localhost:9997/v3/paths/list
     ```
  2. Verify that the FFmpeg RTSP loop publisher is running:
     ```powershell
     powershell -ExecutionPolicy Bypass -File scripts/start-cctv-stream.ps1 -StreamKey "camera-1"
     ```

### 2. "Camera Shows OFFLINE on Dashboard"
- **Cause**: The background health monitor could not reach the RTSP socket or stream path.
- **Resolution**:
  1. Click **Test Connection** on the camera card to perform an immediate socket probe.
  2. Ensure port `8554` (or camera port `554`) is not blocked by Windows Defender Firewall.

### 3. "WebRTC Video Call Shows Black Screen"
- **Cause**: Browser webcam/microphone permissions denied.
- **Resolution**:
  1. Grant camera and microphone permissions in browser address bar (lock icon).
  2. If running on a virtual machine without a webcam, the frontend automatically falls back to an animated canvas video stream.

### 4. "Port Already in Use (5000 / 8554 / 5173)"
- **Resolution**:
  Identify and terminate conflicting processes:
  ```powershell
  # Find PID on port 5000:
  Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
  Stop-Process -Id <PID> -Force
  ```
