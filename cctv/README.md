# Smart India Hackathon (SIH) 2026
## AI-Based Real-Time Monitoring & Smart Inspection
### Part 3 — CCTV Surveillance & Random Video Conferencing (Member 3)

---

## Executive Overview
This repository contains the complete production-grade implementation of **Member 3's subsystem** for the SIH AI-Based Real-Time Monitoring & Smart Inspection platform:
1. **CCTV Surveillance System**: RTSP camera registration, project-to-camera mapping, MediaMTX media server integration, HLS & WebRTC live browser streaming, background health monitoring, secure stream credential masking, and event alerts.
2. **Random Video Conferencing (VC) System**: Server-side unbiased random participant selection across eligible roles (Project In-Charge, Staff, Beneficiary), WebRTC 1-on-1 audio/video calling, Socket.IO signaling, STUN/TURN integration, and official inspection verification logging.

---

## System Architecture

```
                        CENTRAL SIH APPLICATION
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
              CCTV MODULE                     VC MODULE
                    │                             │
               RTSP Ingress                 WebRTC Call
                    ▼                             ▼
                MediaMTX                      Socket.IO
              (:8554, :8888, :8889)           Signaling (:5000)
                    │                             │
          ┌─────────┴─────────┐              STUN / TURN
          ▼                   ▼                   │
      Live HLS             WebRTC                 │
          │                   │                   │
          └─────────┬─────────┘                   │
                    ▼                             ▼
             CCTV Dashboard                 VC Dashboard
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
                        Node.js & Express Backend
                                   ▼
                        Prisma ORM (SQLite / MySQL)
```

---

## Features Checklist

### CCTV Surveillance
- [x] Multi-camera registration with project mapping
- [x] RTSP stream ingestion
- [x] MediaMTX transmuxing engine
- [x] Low-latency HLS video playback (`hls.js`)
- [x] WebRTC (WHEP) sub-second streaming
- [x] Interactive live monitoring dashboard with project filtering
- [x] Real-time camera status (ONLINE / OFFLINE / DISABLED)
- [x] Background non-intrusive camera health monitor
- [x] CCTV event alerts (Offline, Restored, AI intrusion/safety detections)
- [x] Secure credential masking (`rtsp://***:***@ip:port`)
- [x] Simulated CCTV source (FFmpeg MP4 loop streamer)

### Random Video Conferencing (VC)
- [x] WebRTC peer-to-peer audio & video communication
- [x] Socket.IO signaling server (rooms, offers, answers, ICE candidates)
- [x] Google Public STUN integration
- [x] Coturn TURN configuration and credential delivery
- [x] Server-side random participant selection service
- [x] Multi-role support: Project In-Charge, Staff, Beneficiary
- [x] Inactive/unavailable user exclusion filter
- [x] In-call controls: Audio mute, camera toggle, call termination
- [x] Post-call inspection verification form (VERIFIED / NOT_VERIFIED + notes)
- [x] Permanent audit logging to database

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v20+ LTS
- **FFmpeg**: v6+ (in PATH)
- **MediaMTX**: v1.9+

### 2. Start MediaMTX Media Server
From project root:
```powershell
.\media-server\mediamtx.exe .\media-server\mediamtx.yml
```

### 3. Start Simulated RTSP CCTV Feed
From project root:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-cctv-stream.ps1 -StreamKey "camera-1"
```

### 4. Start Backend Server
```powershell
cd backend
npm run dev
```
Backend runs on: `http://localhost:5000`

### 5. Start Frontend Dashboard
```powershell
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

---

## Running Automated Tests

Run the complete test suite covering all 21 CCTV & VC acceptance criteria:
```powershell
cd backend
npm test
```

Expected output:
```
==================================================
Test Execution Complete: 21 Passed, 0 Failed
==================================================
```

---

## SIH Demonstration Walkthrough

1. **CCTV Monitoring**:
   - Open `http://localhost:5173`
   - Select **CCTV Surveillance** in the navbar.
   - Observe **Camera 01: Main Entrance Gate (Live Demo)** playing low-latency HLS video with live running timestamps.
   - Filter cameras by project: "ABC Rehabilitation Centre" vs "National Skill Development Institute".
   - Click **Register Camera**, enter an RTSP URL, click **Test Connection** to show the live probe, and save.
   - Click the **Bell Icon** to open the Alerts Drawer; click **Simulate AI Event** to demonstrate AI detection ingestion.

2. **Random Video Inspection**:
   - Switch to **Random Video Inspection** in the navbar.
   - Select the active inspection for "ABC Rehabilitation Centre".
   - Click **START RANDOM VIDEO CONFERENCE**.
   - The backend `RandomParticipantService` randomly selects an eligible staff member or beneficiary.
   - The WebRTC call initiates with local picture-in-picture and remote video feeds.
   - Test audio mute, video toggle, and click **End Call**.
   - Fill out the **Verification Result** (`VERIFIED` / `NOT_VERIFIED`), add inspector notes, and click **Submit Official Inspection Record**.
   - Observe the session record appear in the Verification Call History list.

---

## Documentation Suite

- [CCTV Setup Guide](docs/CCTV_SETUP.md)
- [MediaMTX Setup Guide](docs/MEDIAMTX_SETUP.md)
- [RTSP Ingestion Guide](docs/RTSP_SETUP.md)
- [WebRTC Architecture](docs/WEBRTC_SETUP.md)
- [TURN / Coturn Setup](docs/TURN_SETUP.md)
- [Random VC Workflow](docs/RANDOM_VC.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Team Integration Guide](docs/INTEGRATION.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Docker Compose](docker-compose.yml)
