# WebRTC Video Conferencing Architecture & Signaling

## Overview
WebRTC (Web Real-Time Communication) provides direct browser-to-browser audio and video communication with sub-second latency for the **Random Video Verification** module.

---

## Signaling & Media Architecture

```
  Inspector (Browser)                     Participant (Browser)
          │                                        │
          │────── 1. join-room(roomId) ───────────│
          │                                        │
    Signaling Server (Socket.IO :5000)             │
          │                                        │
          │────── 2. participant-joined ──────────▶│
          │                                        │
          │────── 3. offer (SDP) ─────────────────▶│
          │◀───── 4. answer (SDP) ─────────────────│
          │                                        │
          │◀───── 5. ICE candidates ──────────────▶│
          │                                        │
          ▼                                        ▼
    ┌────────────────────────────────────────────────────┐
    │       Direct P2P Encrypted Audio/Video (SRTP)      │
    │            (Via STUN or TURN relay)                │
    └────────────────────────────────────────────────────┘
```

---

## Socket.IO Signaling Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join-room` | Client -> Server | `{ roomId, userId, userName, role }` | Joins inspection room |
| `participant-joined` | Server -> Client | `{ socketId, userId, userName, role }` | Triggers caller to generate SDP offer |
| `offer` | Client <-> Client | `{ roomId, sdp }` | WebRTC session description offer |
| `answer` | Client <-> Client | `{ roomId, sdp }` | WebRTC session description answer |
| `ice-candidate` | Client <-> Client | `{ roomId, candidate }` | Network path routing candidates |
| `end-call` | Client -> Server | `{ roomId, sessionId }` | Terminates call session |

---

## Frontend WebRTC Implementation
The frontend uses standard browser `RTCPeerConnection`:
- Captures microphone and camera via `navigator.mediaDevices.getUserMedia()`.
- Provides an automated animated canvas stream fallback if no physical webcam is plugged in.
- Attaches local tracks (`pc.addTrack()`).
- Binds incoming tracks to `<video>` elements (`pc.ontrack`).
- Dispatches ICE candidates to the signaling server (`pc.onicecandidate`).
