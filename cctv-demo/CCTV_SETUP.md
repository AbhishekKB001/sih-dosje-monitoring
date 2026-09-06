# CCTV Surveillance System Setup & Architecture

## Overview
The CCTV Surveillance Subsystem (Member 3 responsibility) enables real-time visual monitoring across all assigned Smart India Hackathon (SIH) projects. It provides:
1. Multi-camera registration and mapping to specific projects.
2. Low-latency live video streaming in standard web browsers using **HLS (HTTP Live Streaming)** and **WebRTC (WHEP)**.
3. Automated camera status and health monitoring (Online/Offline/Error detection).
4. Real-time alert dispatching for stream failures, disconnects, and computer vision AI events.
5. Secure credential masking to prevent exposing camera login passwords.

---

## Stream Pipeline Architecture

```
CCTV Camera (RTSP) / Simulated Video Feed
                   │
                   ▼ (RTSP :8554)
                MediaMTX
                   │
      ┌────────────┴────────────┐
      ▼                         ▼
 HLS (:8888)              WebRTC (:8889)
      │                         │
      └────────────┬────────────┘
                   ▼
       Frontend React Dashboard
```

1. **Ingress**: Video feeds are pushed to or pulled by MediaMTX using RTSP (`rtsp://localhost:8554/live/<streamKey>`).
2. **Transmuxing**: MediaMTX dynamically transmuxes H.264 video into:
   - **HLS**: Fragmented MP4 segments served over HTTP on port `8888` (`http://localhost:8888/live/<streamKey>/index.m3u8`).
   - **WebRTC (WHEP)**: Sub-second latency playback endpoint on port `8889` (`http://localhost:8889/live/<streamKey>/whep`).
3. **Frontend Playback**: The frontend `HlsPlayer` component uses `hls.js` with auto-recovery and fallback for Safari/iOS.

---

## Simulated RTSP Stream for Demo & Development
To demonstrate without physical government CCTV hardware:
1. Generate test video:
   ```bash
   ffmpeg -y -f lavfi -i "testsrc2=duration=15:size=1280x720:rate=30" -f lavfi -i "sine=frequency=1000:duration=15" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac videos/cctv-sample.mp4
   ```
2. Stream in infinite loop to MediaMTX:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/start-cctv-stream.ps1 -StreamKey "camera-1"
   ```

---

## Connecting Real CCTV Cameras
When deploying with real ONVIF/RTSP IP cameras:
1. Obtain the camera's authorized RTSP URL from the network administrator, e.g.:
   `rtsp://admin:CameraPass2026@192.168.1.120:554/Streaming/Channels/101`
2. Open the Dashboard at `http://localhost:5173`.
3. Click **Register Camera**.
4. Enter the camera details, paste the RTSP URL, and click **Test Connection**.
5. Once verified, save the camera. MediaMTX can pull directly from the camera by configuring the path source in `mediamtx.yml`:
   ```yaml
   paths:
     camera-gate-1:
       source: rtsp://admin:CameraPass2026@192.168.1.120:554/Streaming/Channels/101
       sourceOnDemand: yes
   ```
