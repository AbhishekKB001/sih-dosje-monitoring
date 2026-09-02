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
* **`VisualHealthMonitor`**: Real Computer Vision algorithms detecting Black Screen, Low Light, Blur, Frozen Stream, and Camera Tampering.
* **`FrameSampler`**: Paces video downsampling from native camera FPS down to target AI processing FPS (e.g. 5 FPS).
* **`YOLOv8Detector`**: Ultralytics YOLOv8 inference wrapper (`yolov8n.pt`).
* **`MultiObjectTracker`**: In-house ByteTrack two-stage confidence association tracker with lifecycle state machine (`NEW` $\rightarrow$ `ACTIVE` $\rightarrow$ `LOST` $\rightarrow$ `EXPIRED`).

### 3. Spatial & Temporal Analytics (`ai_subsystem/analytics/`)
* **`PolygonZoneEngine`**: Point-in-polygon geometry testing for arbitrary convex/concave polygonal zones with contact-point (bottom-center) anchoring.
  * Supported Zone Types: `MONITORED`, `RESTRICTED`, `ENTRY_EXIT`, `COMMON_AREA`.
  * Emitted Spatial Events: `ZONE_ENTER`, `ZONE_EXIT`, `ZONE_INSIDE`, `RESTRICTED_ZONE_BREACH`.
* **`LineCrossingEngine`**: Directional tripwire line segment crossing analysis using 2D cross-product normal vectors with jitter deduplication.
* **`TemporalEngine`**:
  * Track dwell time accumulation across zones and camera field of view.
  * **Loitering Detection**: Detects entities remaining in zones beyond threshold with multi-frame temporal confirmation and duplicate alert suppression.
  * **After-Hours Security**: Evaluates activity against configured weekly operational schedules (including overnight windows crossing midnight).

### 4. Occupancy, Crowd Analytics & Attendance Consistency (`ai_subsystem/analytics/`)
* **`OccupancyAnalyzer`**:
  * Anonymous person entity aggregation using unique ByteTrack integer Track IDs.
  * Real-time metrics: Current occupancy, peak occupancy, minimum occupancy, and average occupancy.
  * Configurable rolling observation windows (e.g. 1 minute, 5 minutes, 15 minutes).
  * Strict multi-camera and per-zone isolation.
  * Duplicate Track ID deduplication per frame.
* **`CrowdAnalyticsEngine`**:
  * Configurable nominal max capacity, warning thresholds (e.g., 80%), and critical thresholds (100%+).
  * Multi-frame temporal confirmation to filter transient occlusions.
  * Alert cooldown throttling to avoid notification flooding.
  * Emitted Events: `CROWD_THRESHOLD_EXCEEDED` (Severity: `WARNING` or `CRITICAL`).
* **`AttendanceConsistencyEngine`**:
  * Non-biometric comparison between official administrative reported attendance and computer-vision observed occupancy.
  * **Zero Biometrics**: Operates strictly on anonymous counts without facial recognition or identity profiling.
  * **Mandated Neutral Language**: System strictly reports operational discrepancies without declaring fraud:
    > *"Observed occupancy differs materially from reported attendance. Operational verification recommended."*
  * Discrepancy metric: Absolute count difference and percentage variance against configured tolerance thresholds.
  * Emitted Events: `ATTENDANCE_OCCUPANCY_DISCREPANCY`.

### 5. Anomaly Detection & Decision Support (`ai_subsystem/analytics/anomaly.py`)
* **`AnomalyEngine`**:
  * Consumes structured signals already produced by upstream visual health, spatial, temporal, occupancy, and attendance engines without repeating YOLO inferences.
  * Normalizes events into `AIAnomaly` models (`RESTRICTED_ZONE_BREACH`, `LOITERING_DETECTED`, `AFTER_HOURS_ACTIVITY`, `CROWD_SURGE`, `ATTENDANCE_DISCREPANCY`, `VISUAL_STREAM_ANOMALY`).
  * Enforces per-target cooldown throttling to prevent notification flooding.
  * Adheres strictly to decision-support terminology (no accusations of fraud or crime).

### 6. Multi-Signal Incident Correlation (`ai_subsystem/analytics/incident.py`)
* **`IncidentCorrelationEngine`**:
  * Temporal sliding-window correlation engine (`correlation_window_sec`, e.g. 30s–60s).
  * Fuses related anomalies into unified high-severity `AIIncident` objects:
    * **Correlated Security Incursion**: Restricted zone breach + loitering / after-hours activity.
    * **Operational Attendance Anomaly**: Attendance discrepancy + crowd surge / repeated variance.
    * **Crowd Safety Concern**: Sustained multi-frame capacity breaches in a single zone.
  * Maintains incident lifecycle (`ACTIVE` $\rightarrow$ `CONTAINED` $\rightarrow$ `RESOLVED`).

### 7. AI Alert Manager & Supervisor Lifecycle (`ai_subsystem/analytics/alerts.py`)
* **`AIAlertManager`**:
  * Translates elevated incidents and critical anomalies into actionable `AIAlert` objects.
  * Maintains full supervisor lifecycle states: `NEW` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `RESOLVED` (or `DISMISSED`).
  * Employs configurable cooldown suppression per camera and alert signature.

### 8. Evidence Snapshot, Cryptographic Sealing & Human Review (`ai_subsystem/analytics/evidence.py`)
* **`EvidenceManager`**:
  * **Visual Snapshot**: Exports visual frame from the stream when significant events occur.
  * **Cryptographic Sealing**: Computes genuine SHA-256 digest over the binary image file upon capture.
  * **Integrity Verification**: `verify_evidence_integrity()` recalculates file digest from disk to detect any post-creation tampering or corruption.
  * **Human Supervisor Review**: Records structured audit decisions (`ReviewOutcome.TRUE_EVENT`, `FALSE_POSITIVE`, `INCONCLUSIVE`) with auditor notes and tracks cumulative false-positive rates for continuous rule tuning.

### 9. Concurrency & Multi-Camera Pool (`ai_subsystem/manager/`)
* **`CameraWorker`**: Isolated thread per camera. Decoupled asynchronous producer-consumer pipeline preventing video ingestion backpressure.
* **`SourceManager`**: Multi-camera lifecycle and fault-isolation coordinator.

### 10. Pipeline Orchestrator (`ai_subsystem/orchestrator.py`)
* **`AIPipelineOrchestrator`**: Master integration coordinator: Ingestion $\rightarrow$ Visual Health $\rightarrow$ YOLO Detection $\rightarrow$ ByteTrack Tracking $\rightarrow$ Spatial Polygon Zones $\rightarrow$ Line Crossing $\rightarrow$ Temporal Analytics $\rightarrow$ Occupancy & Crowd $\rightarrow$ Attendance Consistency $\rightarrow$ Anomaly Detection $\rightarrow$ Incident Correlation $\rightarrow$ AI Alerts $\rightarrow$ Cryptographically Sealed Evidence Snapshots.

---

## Running Tests & Standalone Demos

### 1. Run All Automated Tests (71 Tests Passing)
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

### 4. Run Standalone Phase 3 Demo (Spatial Zones, Tripwire Lines & After-Hours Schedules)
```bash
.\venv\Scripts\python run_phase3_demo.py
```

### 5. Run Standalone Phase 4 Demo (Occupancy, Crowd Thresholds & Attendance Consistency)
```bash
.\venv\Scripts\python run_phase4_demo.py
```
*(Saves annotated detection snapshot to `data/demo_phase4_annotated.jpg`)*

### 6. Run Standalone Phase 5 Demo (Anomalies, Incidents, Alerts & SHA-256 Sealed Evidence)
```bash
.\venv\Scripts\python run_phase5_demo.py
```
*(Captures sealed evidence snapshot under `data/evidence/` with SHA-256 verification and human review)*



