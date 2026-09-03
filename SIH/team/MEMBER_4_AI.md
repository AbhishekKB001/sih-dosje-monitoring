# SIH 2026 — Member 4 Contribution

## Current Status
`COMPLETE / READY FOR INTEGRATION`

---

## Member Identity
- **Name**: Kanaka Chala
- **Git Username**: `Kanakachala-Boom`
- **Git Author**: `Kanakachala-Boom <kanakachala691@gmail.com>`
- **Branch**: `member4-ai` *(Merged into `origin/main`)*

---

## Responsibility
**AI Video Intelligence & Visual Health Subsystem**
- Multi-camera video ingestion abstraction (Demo MP4, Webcam, RTSP, Member 3 stream adapter)
- OpenCV frame preprocessing, normalization, and FPS pacing
- Camera visual health diagnostics (Black Screen, Low Light, Blur, Frozen Stream, Lens Tampering)
- Real-time YOLOv8n object detection (`yolov8n.pt`)
- Multi-Object Tracking: **YOLOv8n object detection + ByteTrack-style two-stage IoU tracking**
- Spatial polygon zone analytics (Convex/concave zones, restricted-zone intrusion)
- Directional line crossing tripwire analytics
- Temporal analytics (Dwell accumulation, loitering detection, weekly after-hours schedules)
- Occupancy analytics (Live room count, peak, min, average over rolling windows)
- Crowd analytics (Configurable capacity thresholds, multi-frame surge confirmation)
- Non-biometric attendance consistency auditing (Zero facial recognition, strictly neutral language)
- Anomaly engine & Multi-signal incident correlation
- AI Alert Manager with full supervisor lifecycle (`NEW` -> `ACKNOWLEDGED` -> `RESOLVED`)
- Tamper-sealed evidence snapshots with cryptographic SHA-256 file integrity verification
- Human supervisor audit review engine & false-positive tracking
- REST API & Real-time Server-Sent Events (SSE) streaming server
- FastAPI router plug-in adapter for Member 1 central backend
- Standalone Docker containerization & Docker Compose stack
- Comprehensive automated test suites (79/79 passing pytest tests on CPU)

---

## Verified Work Completed

1. **Video Source Abstraction**: Unified `BaseVideoSource` interface with `DemoVideoSource` (MP4 looping), `WebcamVideoSource`, `RTSPVideoSource`, and `Member3VideoSourceAdapter`.
2. **OpenCV Preprocessing & Visual Health**: Frame integrity validation, grayscale conversion, and automated detection of blackout, low light, blur, frozen video, and physical lens tampering (`ai_subsystem/vision/visual_health.py`).
3. **YOLOv8n Detection & Tracking**: Ultralytics YOLOv8n inference pipeline with class filtering and ByteTrack-style two-stage IoU association tracker maintaining track states (`NEW`, `ACTIVE`, `LOST`, `EXPIRED`) (`ai_subsystem/vision/tracker.py`).
4. **Spatial Analytics**: Point-in-polygon testing for arbitrary polygon zones, restricted area breach alerts, and directional line crossing tripwires (`ai_subsystem/analytics/spatial.py`).
5. **Temporal Analytics**: Dwell time accumulation per track, loitering alerts, and weekly operational schedules (`ai_subsystem/analytics/temporal.py`, `schedule.py`).
6. **Occupancy & Crowd Analytics**: Rolling window occupancy metrics (current, peak, min, average) and capacity threshold crowd alerts (`ai_subsystem/analytics/occupancy.py`).
7. **Non-Biometric Attendance Consistency**: Discrepancy calculation auditing observed occupancy against reported attendance adhering to strict neutral decision-support language (`ai_subsystem/analytics/attendance.py`).
8. **Anomaly Engine & Incident Correlation**: Multi-signal temporal sliding-window engine correlating anomalies into unified incidents (`ACTIVE` -> `CONTAINED` -> `RESOLVED`) with cooldown suppression (`ai_subsystem/analytics/anomaly.py`, `incident.py`).
9. **Alert Lifecycle & Evidence Sealing**: Supervisor alert manager and automated evidence snapshot capture with cryptographic SHA-256 file integrity verification (`ai_subsystem/analytics/alerts.py`, `evidence.py`).
10. **Human Review Engine**: Supervisor audit determination workflow (`TRUE_EVENT`, `FALSE_POSITIVE`, `INCONCLUSIVE`) with local JSON persistence (`ai_subsystem/adapters/storage_adapter.py`).
11. **REST API & SSE Service**: Lightweight standard-library HTTP server (`Member4APIService` on port 8000) providing 11 REST endpoints and live SSE event broadcasting at `/api/v1/events/stream`.
12. **FastAPI Router Adapter**: Ready-to-mount APIRouter in `ai_subsystem/adapters/fastapi_router.py` enabling 1-line mounting into Member 1's backend.
13. **Automated Testing**: 79 unit and integration tests passing in 124.48s with 100% success rate on CPU.

### Important Ownership Note
> [!IMPORTANT]
> Member 4 is the verified owner of the entire `ai_subsystem/` directory, including:
> - `ai_subsystem/adapters/api_service.py`
> - `ai_subsystem/adapters/fastapi_router.py`
> - `ai_subsystem/adapters/storage_adapter.py`
> 
> These files belong to the AI subsystem and must **NOT** be attributed to Member 1.

### Explicit Technical Scope Disclaimers
1. **No Physical CCTV Hardware Tested**: Physical CCTV/NVR hardware was **NOT** tested because physical hardware was not provided in the hackathon workspace. All video pipelines were verified using synthetic video generation, local MP4 files, and USB webcams.
2. **No GPU Acceleration Tested**: GPU / NPU hardware acceleration was **NOT** tested. All YOLOv8n inferences and automated test suites were executed on a CPU environment with PyTorch CPU.
3. **SHA-256 Scope**: SHA-256 is implemented for **file integrity and anti-tamper verification** (computing and recalculating image byte digests against records), **not** as a legally certified chain-of-custody framework.

---

## Repository Files
- `ai_subsystem/orchestrator.py`
- `ai_subsystem/schemas.py`
- `ai_subsystem/config.py`
- `ai_subsystem/sources/base.py`
- `ai_subsystem/sources/demo_source.py`
- `ai_subsystem/sources/webcam_source.py`
- `ai_subsystem/sources/rtsp_source.py`
- `ai_subsystem/sources/member3_adapter.py`
- `ai_subsystem/vision/preprocessor.py`
- `ai_subsystem/vision/sampling.py`
- `ai_subsystem/vision/visual_health.py`
- `ai_subsystem/vision/detector.py`
- `ai_subsystem/vision/tracker.py`
- `ai_subsystem/analytics/spatial.py`
- `ai_subsystem/analytics/temporal.py`
- `ai_subsystem/analytics/schedule.py`
- `ai_subsystem/analytics/occupancy.py`
- `ai_subsystem/analytics/attendance.py`
- `ai_subsystem/analytics/anomaly.py`
- `ai_subsystem/analytics/incident.py`
- `ai_subsystem/analytics/alerts.py`
- `ai_subsystem/analytics/evidence.py`
- `ai_subsystem/adapters/api_service.py`
- `ai_subsystem/adapters/fastapi_router.py`
- `ai_subsystem/adapters/event_publisher.py`
- `ai_subsystem/adapters/storage_adapter.py`
- `ai_subsystem/manager/source_manager.py`
- `ai_subsystem/observability/metrics.py`
- `ai_subsystem/utils/logger.py`
- `ai_subsystem/utils/synthetic_video.py`
- `tests/` (21 test files, 79 test functions)
- `run_phase1_demo.py` through `run_phase6_integration_demo.py`
- `docs/FLUTTER_INTEGRATION_CONTRACT.md`
- `Dockerfile`
- `docker-compose.yml`
- `requirements.txt`
- `.env.example`

---

## Git Evidence
- `3513ece`: `01 phase 1: foundation and source abstraction layer` by `Kanakachala-Boom`
- `be3074c`: `02 phase 2: vision, object detection and multi-object tracking` by `Kanakachala-Boom`
- `3fa9f9f`: `02 phase 2: decouple ingestion worker and add sliding window metrics verification` by `Kanakachala-Boom`
- `c8ba400`: `03 phase 3: spatial and temporal intelligence, polygon zones, loitering, and schedules` by `Kanakachala-Boom`
- `fd5aaf3`: `04 phase 4: occupancy, crowd analytics, and non-biometric attendance consistency` by `Kanakachala-Boom`
- `62e6d41`: `05 phase 5: anomaly detection, multi-signal incident correlation, evidence sealing and human review engine` by `Kanakachala-Boom`
- `eeb9259`: `06 phase 6: final integration, api service, mobile contracts, deployment and final qa` by `Kanakachala-Boom`
- `2f1cf31`: `Merge pull request #1 from AbhishekKB001/member4-ai` (Merged into `main`)
- `1681f8e`: `Merge branch 'origin/main': integrate AI subsystem and Flutter mobile application` (Consolidated in `origin/main`)

---

## Integration Dependencies
- **Consumes**: Live authorized video streams from Member 3 CCTV layer (`ai_subsystem/sources/member3_adapter.py` or `rtsp_source.py`).
- **Provides**:
  - Live AI router (`ai_subsystem/adapters/fastapi_router.py`) to Member 1 Central Backend.
  - REST & SSE endpoints (`GET /api/v1/cameras/{id}/occupancy`, `/alerts`, `/evidence/{id}`, `/verify`, `/events/stream`) to Flutter Mobile Client adhering to `docs/FLUTTER_INTEGRATION_CONTRACT.md`.

---

## Pending Work
1. Physical testing with real, deployed CCTV hardware (Member 3 dependency).
2. Wire real HTTP endpoint calls into Member 1 backend and Flutter mobile client.

---

## Verification Notes
- **Subsystem Status**: `COMPLETE / READY FOR INTEGRATION`
- **Git History**: `VERIFIED IN REPOSITORY`, `VERIFIED ON MEMBER BRANCH`, and `VERIFIED IN MAIN`
