# SIH Team Integration Guide (Members 1, 2, 4, 5, 6)

## Overview
This platform is architected modularly to provide simple plug-and-play integration for all other 5 team members of our SIH team.

---

## Team Responsibilities & Integration Points

### Member 1: Geo-Tagging & Site Mapping
- **Data Hook**: `Project` and `Camera` models include `location` strings.
- **Integration**: Add latitude/longitude coordinates to `Project` or `Camera` schema:
  ```prisma
  model Camera {
    // ...
    latitude  Float?
    longitude Float?
  }
  ```
- **Endpoint**: Map cameras directly onto your Leaflet/Mapbox frontend by consuming `GET /api/cameras`.

### Member 2: Institutional Audits & Verification Workflow
- **Data Hook**: `Inspection` model links `projectId` and `inspectorId`.
- **Integration**: Start or conclude overall institutional audits; each audit can trigger multiple `VideoCallSession` verification calls.

### Member 4: Computer Vision AI & Defect/Intrusion Detection
- **Video Feed Access**: Member 4's Python OpenCV/YOLO pipeline can ingest RTSP streams directly from MediaMTX:
  ```python
  import cv2
  cap = cv2.VideoCapture("rtsp://localhost:8554/live/camera-1")
  ```
- **Alert Dispatch**: When an AI anomaly is detected, trigger the alert webhook:
  ```bash
  curl -X POST http://localhost:5000/api/alerts/ai-event \
    -H "Content-Type: application/json" \
    -d '{"cameraId":"<cam-id>", "eventType":"SAFETY_VIOLATION", "message":"No helmet detected", "severity":"WARNING"}'
  ```

### Member 5: Automated Reporting & Evidence Generation
- **Data Hook**: Query `GET /api/vc/sessions/inspection/:id` to retrieve all verified participants, timestamps, and inspector notes to auto-generate the official inspection PDF report.

### Member 6: Master Admin Dashboard & Role-Based Access Control
- **Authentication**: Backend Express router uses modular middleware. Plug in your JWT or OAuth2 verification middleware into `src/index.ts`:
  ```typescript
  app.use('/api', authMiddleware, cctvRouter);
  ```
