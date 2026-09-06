# DoSJE Drishti — AI Vision & Video Pipeline Subsystem 🤖

The **AI Vision & Video Pipeline Subsystem** serves as the intelligent surveillance backbone of the DoSJE Drishti platform. It is engineered to monitor physical institute facilities, detect safety/compliance anomalies, track real-time occupancy, analyze loitering and restricted perimeter breaches, and trigger automated alerts to the Central Ministry Dashboard.

---

## 🌟 Capabilities & Architecture

1. **Multi-Camera Source Ingestion (`ai_subsystem/sources/`)**:
   - Manages concurrent video feeds (demonstration loop via `01.avi`, physical RTSP streams, and USB webcams).
   - Real-time frame decoding via OpenCV with automatic frame-drop mitigation and loop replay.

2. **Visual Health Preprocessing (`ai_subsystem/vision/`)**:
   - Monitors CCTV stream health: lens occlusion, glare, blur, and offline/freeze detection.

3. **YOLOv8 Detection & ByteTrack (`ai_subsystem/vision/`)**:
   - Ultra-fast object detection using YOLOv8 (`yolov8n.pt`).
   - ByteTrack multi-object tracking assigning persistent spatial track IDs across frames.

4. **Spatial & Temporal Analytics (`ai_subsystem/analytics/`)**:
   - **Line Crossing Engine**: Tracks ingress/egress directional boundary crossings.
   - **Polygon Zone Engine**: Monitors designated physical perimeters (Classrooms, Corridors, Gates).
   - **Temporal Engine**: Quantifies person dwell times to flag unauthorized loitering.

5. **Occupancy & Attendance Consistency (`ai_subsystem/analytics/`)**:
   - Real-time headcount estimation in monitored zones.
   - Variance detection comparing physical headcount against registered morning biometric attendance logs.

6. **Anomaly Detection & Automated Alert Forwarding (`ai_subsystem/adapters/`)**:
   - Real-time incident correlation engine filtering false positives.
   - Automated HTTP Webhook forwarder sending signed detection payloads directly to Central Backend port 4000 (`/api/alerts`).

7. **Dual-View MJPEG Streaming Server (`run_ai_cctv_server.py`)**:
   - Exposes high-performance HTTP MJPEG feeds on port `8000`.
   - **Raw CCTV Feed**: `http://localhost:8000/api/v1/stream/{camera_id}?view=raw`
   - **AI Analysis Overlay**: `http://localhost:8000/api/v1/stream/{camera_id}?view=ai` (Draws live bounding boxes, tracking IDs, zone polygons, and telemetry HUD).

---

## 🛠️ Prerequisites

- **Python**: 3.10 to 3.13 (Tested on Python 3.13)
- **OpenCV**: `opencv-python>=4.8.0`
- **PyTorch & Ultralytics**: `ultralytics>=8.0.0`, `torch>=2.0.0`
- **FastAPI / Uvicorn**: `fastapi>=0.100.0`, `uvicorn>=0.23.0`

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd ai-subsystem
pip install -r requirements.txt
```

### 2. Pretrained Model Weights
The lightweight YOLOv8 nano model (`yolov8n.pt`, 6.5 MB) is located at `ai-subsystem/models/yolov8n.pt`. If absent, Ultralytics will automatically download it on first run.

### 3. Launch AI & CCTV Streaming Server
```bash
# Run standalone
python run_ai_cctv_server.py
```
Health check endpoint: `http://localhost:8000/api/v1/health`

---

## 🧪 Testing

The AI subsystem includes 84 unit, integration, and mathematical tests across 23 test suites:
```bash
# Run full pytest suite from ai-subsystem
pytest tests -v
```

---

## 📂 Directory Layout

```text
ai-subsystem/
├── ai_subsystem/            # Canonical Python package
│   ├── adapters/            # Webhook forwarder, event publisher, REST streamer
│   ├── analytics/           # Spatial zones, loitering, occupancy, anomaly, incident
│   ├── manager/             # Multi-camera concurrency pool
│   ├── observability/       # System metrics & telemetry collectors
│   ├── sources/             # Demo video source, RTSP adapter, webcam source
│   ├── utils/               # Structured logging & image helpers
│   ├── vision/              # YOLOv8 detector, ByteTrack tracker, visual health
│   ├── config.py            # Typed Pydantic configuration schemas
│   ├── orchestrator.py      # Master pipeline orchestrator
│   └── schemas.py           # Domain models & telemetry structures
├── configs/                 # Camera zone geometries and spatial rules
├── demos/                   # Phase 1 to Phase 6 CLI simulation runners
├── models/                  # Pretrained model weights (yolov8n.pt)
├── tests/                   # 84 pytest test cases
├── orchestrator.py          # Top-level module facade
├── requirements.txt         # Python package dependencies
├── run_ai_cctv_server.py    # Standalone MJPEG 25 FPS live streaming server
└── README.md
```
