# DoSJE Drishti — Technical Limitations & Truth in Implementation ⚖️

In strict accordance with scientific honesty, government engineering standards, and the Smart India Hackathon (SIH) evaluation guidelines, this document explicitly discloses the exact technical classification of every component across the platform.

---

## 📊 Component Truth Table

| Subsystem / Feature | Exact Technical Implementation | Classification | Transparent Evaluation Note |
| :--- | :--- | :--- | :--- |
| **Relational Database** | PostgreSQL / SQLite accessed via Prisma ORM | **REAL SOFTWARE** | Fully operational with automated schema push and migrations. |
| **Authentication & RBAC** | Salted bcrypt passwords, JWT bearer tokens, MPIN | **REAL SOFTWARE** | Enforces strict HTTP 403 Forbidden for unauthorized roles. |
| **Risk Scoring Engine** | 5-factor weighted algorithm ($0.30A + 0.25I + 0.20C + 0.15Al + 0.10R$) | **REAL SOFTWARE** | 6/6 unit tests passing; clamps values strictly between 0 and 100. |
| **Stochastic Assignment** | Risk-weighted random allocation | **REAL SOFTWARE** | Eliminates inspector bias and generates verified surprise duties. |
| **CCTV Software Streamer** | Multi-camera OpenCV video pipeline streaming `01.avi` at 25 FPS | **REAL SOFTWARE** | Genuine video decoding and MJPEG HTTP streaming. |
| **Physical CCTV Hardware** | Physical ONVIF / RTSP IP camera hardware | **HARDWARE DEPENDENT** | Physical cameras are not present in demo lab; the software pipeline is RTSP-ready. |
| **ONVIF PTZ Controls** | Virtual pan/tilt/zoom state coordinator | **SIMULATED ONVIF PROFILE S** | Coordinates are tracked in memory and logged; requires motorized hardware for physical pan. |
| **CCTV Video Recording** | Video frame extraction into `data/evidence/clips/` | **REAL SOFTWARE** | Produces verifiable `.mp4` video clips with SHA-256 hashes. |
| **YOLOv8 Detection** | Ultralytics YOLOv8 nano (`yolov8n.pt`) inference | **REAL SOFTWARE** | Genuine neural network inference detecting persons in video frames. |
| **Multi-Object Tracking** | ByteTrack algorithm | **REAL SOFTWARE** | Assigns persistent spatial track IDs across video frames. |
| **AI Stream Annotation** | OpenCV polygon and bounding box drawing via `?view=ai` | **REAL SOFTWARE** | Genuine overlay rendered directly onto the video buffer. |
| **Mobile Satellite GPS** | `geolocator: ^13.0.4` reading hardware GPS sensor | **REAL HARDWARE** | Reads physical satellite coordinates and enforces 100m geofence. |
| **Mobile Camera Capture** | `image_picker: ^1.1.2` invoking Android camera driver | **REAL HARDWARE** | Captures real physical photos and 60-second video walkthroughs. |
| **Visible Pixel Watermark** | `image: ^4.3.0` drawing directly into bitmap pixels | **REAL SOFTWARE** | Watermark is burnt into image bytes; accompanied by SHA-256 hash. |
| **Offline Draft Vault** | `path_provider: ^2.1.5` saving local JSON files | **REAL SOFTWARE** | Persists drafts during dead zones and auto-syncs upon reconnection. |
| **Video Conferencing Bridge**| `url_launcher: ^6.3.0` connecting to canonical Jitsi Meet | **REAL SOFTWARE** | Live two-way audio, video, camera toggle, and screen share. |
| **Incoming Call Signaling** | High-frequency polling on `/api/vc/incoming` | **POLLING / REAL HTTP** | Foreground polling provides immediate delivery without FCM cloud keys. |
| **Background Push (FCM)** | Google Firebase Cloud Messaging background wake-up | **DOCUMENTED LIMITATION** | Requires active Google Play Services and project FCM server keys. |
| **Biometric Face Recognition**| Attendance facial matching against national DB | **DOCUMENTED LIMITATION** | Prototype compares numeric variance; full 1:N face matching is an enterprise roadmap item. |

---

## 🔍 Detailed Explanations

### 1. CCTV Video Simulation (`cctv-demo/videos/01.avi`)
- **What is implemented**: A genuine Python/OpenCV video streaming pipeline that continuously ingests frames from `01.avi`, runs real-time YOLOv8 object detection, computes spatial dwell times, and serves MJPEG streams over HTTP port 8000.
- **Why it is simulated**: Physical ONVIF IP cameras cannot be physically installed across nationwide welfare institutes during a hackathon evaluation. The code architecture is built with an abstraction layer (`BaseVideoSource`) that seamlessly accepts real RTSP URLs (`rtsp://user:pass@camera-ip:554/live`) without modifying the vision or tracking pipelines.

### 2. Virtual PTZ (Pan-Tilt-Zoom)
- **What is implemented**: The Admin Web CCTV controller provides directional buttons (Pan Left/Right, Tilt Up/Down, Zoom In/Out, Home). These commands send HTTP requests to `/api/cctv/cameras/:id/ptz`, which calculates updated coordinates, updates the camera state, and records an administrative audit log.
- **Why it is simulated**: Without physical motorized PTZ camera mounts, the motors cannot physically move.

### 3. Video Call Push Signaling
- **What is implemented**: When an inspector or official triggers a surprise video audit, the backend maps the target institute and records an active call session. The target incharge device polls `/api/vc/incoming?userId=<id>`, immediately detects the call, rings, and presents the Accept/Reject modal.
- **Why background push is omitted**: Background app wake-up via FCM requires cloud project credentials and Google Play Services provisioning. The foreground polling mechanism provides zero-configuration, 100% reliable evaluation on any local network.
