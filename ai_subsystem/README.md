# Member 4 — AI Video Intelligence & Visual Health Subsystem

## Overview
This subsystem represents **Member 4's core contribution** to the SIH26095 DoSJE Centralized Monitoring Platform. It provides source-agnostic video frame ingestion, visual content health monitoring, frame downsampling, and multi-camera supervision.

---

## Phase 1 Architecture Components

### 1. Ingestion Layer (`ai_subsystem/sources/`)
* **`BaseVideoSource`**: Universal abstract interface for reading frames.
* **`DemoVideoSource`**: Consumes local MP4 videos with authentic frame pacing and auto-rewind looping.
* **`WebcamVideoSource`**: Captures live frames from USB/integrated webcams for development testing.
* **`RTSPVideoSource`**: Network RTSP client with exponential backoff, watchdog, and reconnect logic.
* **`Member3VideoSourceAdapter`**: Clean adapter interface connecting to Member 3's stream gateway.

### 2. Vision, Detection & Tracking (`ai_subsystem/vision/`)
* **`OpenCVPreprocessor`**: Frame integrity validation, grayscale conversion, and resizing.
* **`VisualHealthMonitor`**: Real Computer Vision algorithms detecting:
  * **Black Screen / Lens Occlusion** (Mean intensity $< 15$)
  * **Severe Low Light** (Mean intensity $< 35$)
  * **Blur / Lens Out-of-Focus** (Laplacian variance $< 80$)
  * **Frozen Video Stream** (Inter-frame difference $< 0.1$ across consecutive frames)
  * **Camera Tampering / Sudden Viewpoint Shift** (Inter-frame difference $> 65$)
* **`FrameSampler`**: Paces video downsampling from native camera FPS down to target AI processing FPS (e.g. 5 FPS).
* **`YOLOv8Detector`**: Production-ready Ultralytics YOLOv8 inference wrapper.
  * Model: `yolov8n.pt` (nano weights, lightweight, CPU/GPU compatible).
  * Extensible target class filtering (e.g. `['person', 'car']`).
  * Thread-safe pre-warmed inference with latency tracking.
* **`MultiObjectTracker`**: ByteTrack multi-object tracking implementation.
  * Persistent integer Track IDs across video frames.
  * Deterministic state transitions: `NEW` $\rightarrow$ `ACTIVE` $\rightarrow$ `LOST` $\rightarrow$ `EXPIRED` (with `LOST` $\rightarrow$ `ACTIVE` recovery).
  * History tracking (bounding box trajectory and dwell time).

### 3. Concurrency & Multi-Camera Pool (`ai_subsystem/manager/`)
* **`CameraWorker`**: Isolated thread per camera. If one camera stream disconnects or corrupts, other camera workers continue running without interruption.
* **`SourceManager`**: Central lifecycle coordinator.

### 4. Pipeline Orchestrator (`ai_subsystem/orchestrator.py`)
* **`AIPipelineOrchestrator`**: Master coordinator routing frames through Ingestion $\rightarrow$ Visual Health $\rightarrow$ Detection $\rightarrow$ Tracking $\rightarrow$ Telemetry.

### 5. Observability & Telemetry (`ai_subsystem/observability/`)
* **`MetricsCollector`**: Tracks input FPS, processed FPS, inference latency (ms), active track count, frame drops, and stream health.

---

## Running Tests & Standalone Demos

### 1. Run All Automated Tests (Unit + Integration + Smoke)
```bash
.\venv\Scripts\pytest -v
```

### 2. Run Standalone Phase 1 Demo (Ingestion & Visual Health)
```bash
.\venv\Scripts\python run_phase1_demo.py
```

### 3. Run Standalone Phase 2 Demo (YOLO Detection & Multi-Object Tracking)
```bash
.\venv\Scripts\python run_phase2_demo.py
```
*(Saves annotated detection snapshot to `data/demo_phase2_annotated.jpg`)*
