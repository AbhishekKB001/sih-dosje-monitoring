# RTSP Stream Ingestion & Pipeline Guide

## Overview
Real-Time Streaming Protocol (RTSP) is the industry standard for IP surveillance cameras and NVRs (Network Video Recorders). This document explains how video flows from camera sources into the SIH platform.

---

## Simulated RTSP Pipeline (Development & Demonstration)

For development and hackathon demonstrations, we simulate a 24/7 CCTV surveillance feed using FFmpeg:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-cctv-stream.ps1 -StreamKey "camera-1"
```

Under the hood, this executes:
```bash
ffmpeg -re -stream_loop -1 -i videos/cctv-sample.mp4 -c:v copy -an -f rtsp -rtsp_transport tcp rtsp://localhost:8554/live/camera-1
```

Parameters explained:
- `-re`: Reads input at native frame rate (simulates real camera clock).
- `-stream_loop -1`: Loops indefinitely so the feed never terminates.
- `-c:v copy`: Stream copy without re-encoding to minimize CPU consumption.
- `-rtsp_transport tcp`: Uses TCP for reliable transmission over local network.

---

## Simulating Multiple Concurrent Cameras
To simulate multiple cameras simultaneously, run multiple background stream instances:
```powershell
# Camera 2: Vocational Hall
ffmpeg -re -stream_loop -1 -i videos/cctv-sample.mp4 -c:v copy -an -f rtsp -rtsp_transport tcp rtsp://localhost:8554/live/camera-2

# Camera 3: Admin Reception
ffmpeg -re -stream_loop -1 -i videos/cctv-sample.mp4 -c:v copy -an -f rtsp -rtsp_transport tcp rtsp://localhost:8554/live/camera-3
```

---

## Hardware Camera Specifications & Codecs
When configuring actual hardware cameras:
- **Video Codec**: H.264 (Baseline or Main profile). H.265 (HEVC) requires hardware-assisted browser decoding and should be avoided or transcoded.
- **Audio**: AAC or None.
- **Resolution**: 1080p (1920x1080) or 720p (1280x720) at 15–25 FPS.
- **Keyframe (GOP) Interval**: 1 to 2 seconds (crucial for low HLS latency).
