# REST API Documentation

Base URL: `http://localhost:5000`

---

## CCTV Surveillance Endpoints

### 1. List Cameras
- **Endpoint**: `GET /api/cameras`
- **Query Params**: `projectId` (optional)
- **Response**:
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "id": "uuid",
      "name": "Main Entrance Gate",
      "location": "North Gate",
      "status": "ONLINE",
      "healthStatus": "HEALTHY",
      "rtspUrlMasked": "rtsp://localhost:8554/live/camera-1",
      "endpoints": {
        "hlsUrl": "http://localhost:8888/live/camera-1/index.m3u8",
        "webrtcUrl": "http://localhost:8889/live/camera-1/whep",
        "webPlayerUrl": "http://localhost:8888/live/camera-1/"
      }
    }
  ]
}
```

### 2. Register Camera
- **Endpoint**: `POST /api/cameras`
- **Request Body**:
```json
{
  "name": "Vocational Workshop",
  "location": "Block B",
  "projectId": "project-uuid",
  "rtspUrl": "rtsp://admin:pass@192.168.1.50:554/ch1",
  "streamKey": "camera-workshop-01",
  "enabled": true
}
```

### 3. Test Camera Connection
- **Endpoint**: `POST /api/cameras/test-connection`
- **Request Body**: `{ "rtspUrl": "rtsp://localhost:8554/live/camera-1" }`
- **Response**: `{ "success": true, "message": "Camera endpoint reachable at localhost:8554 (8ms)", "latencyMs": 8 }`

### 4. Enable / Disable Camera
- **Endpoint**: `POST /api/cameras/:id/enable` / `POST /api/cameras/:id/disable`

### 5. List Alerts
- **Endpoint**: `GET /api/alerts?limit=50`

### 6. Inject AI Detection Event (Members 4 & 5 Integration)
- **Endpoint**: `POST /api/alerts/ai-event`
- **Request Body**:
```json
{
  "cameraId": "camera-uuid",
  "eventType": "AI_INTRUSION_DETECTED",
  "severity": "CRITICAL",
  "message": "Unauthorized perimeter crossing detected.",
  "metadata": { "confidence": 0.96 }
}
```

---

## Video Conferencing Endpoints

### 1. Initiate Random VC Session
- **Endpoint**: `POST /api/vc/sessions/random`
- **Request Body**:
```json
{
  "inspectionId": "inspection-uuid",
  "initiatedById": "inspector-uuid",
  "eligibleRoles": ["PROJECT_INCHARGE", "STAFF", "BENEFICIARY"]
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session-uuid",
      "roomId": "inspection-room-uuid",
      "selectedParticipant": { "name": "Ravi Kumar", "role": "BENEFICIARY" }
    },
    "roomId": "inspection-room-uuid",
    "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }]
  }
}
```

### 2. Submit Verification Result
- **Endpoint**: `POST /api/vc/sessions/:id/result`
- **Request Body**:
```json
{
  "result": "VERIFIED",
  "notes": "Beneficiary present on-site. Verified via live video."
}
```

### 3. Get ICE Configuration
- **Endpoint**: `GET /api/vc/ice-servers`
