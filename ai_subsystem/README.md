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

### 2. Vision & Visual Health (`ai_subsystem/vision/`)
* **`OpenCVPreprocessor`**: Frame integrity validation, grayscale conversion, and resizing.
* **`VisualHealthMonitor`**: Real Computer Vision algorithms detecting:
  * **Black Screen / Lens Occlusion** (Mean intensity $< 15$)
  * **Severe Low Light** (Mean intensity $< 35$)
  * **Blur / Lens Out-of-Focus** (Laplacian variance $< 80$)
  * **Frozen Video Stream** (Inter-frame difference $< 0.8$ across consecutive frames)
  * **Scene Tampering / Sudden Viewpoint Shift** (Inter-frame difference $> 65$)
* **`FrameSampler`**: Paces frame sampling to target processing FPS (e.g. 5 FPS).

### 3. Concurrency & Multi-Camera Pool (`ai_subsystem/manager/`)
* **`CameraWorker`**: Isolated thread per camera. If one camera stream disconnects or corrupts, other camera workers continue running without interruption.
* **`SourceManager`**: Central lifecycle coordinator.

### 4. Pipeline Orchestrator Skeleton (`ai_subsystem/orchestrator.py`)
* **`AIPipelineOrchestrator`**: Master coordinator routing frames from ingestion $\rightarrow$ visual health $\rightarrow$ future detection/tracking/rules stages.

### 5. Observability & Telemetry (`ai_subsystem/observability/`)
* **`MetricsCollector`**: Tracks input FPS, processed FPS, latency (ms), frame drops, and stream health.

---

## Running Tests & Standalone Demo

### 1. Run Automated Unit & Integration Tests
```bash
.\venv\Scripts\pytest -v
```

### 2. Run Standalone Phase 1 Demonstration
```bash
.\venv\Scripts\python run_phase1_demo.py
```
