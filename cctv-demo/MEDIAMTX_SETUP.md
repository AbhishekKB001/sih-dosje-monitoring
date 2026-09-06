# MediaMTX Configuration & Deployment Guide

## Overview
**MediaMTX** (formerly `rtsp-simple-server`) is a zero-dependency, open-source real-time media server. It acts as the central streaming backbone for SIH Part 3.

---

## Active Port Bindings

| Port | Protocol | Usage | Description |
|------|----------|-------|-------------|
| **8554** | RTSP (TCP/UDP) | Ingress | Ingestion port for CCTV cameras & simulated streams |
| **8888** | HTTP (HLS) | Egress | Serves HLS playlists (`index.m3u8`) & fMP4 segments to frontend |
| **8889** | HTTP (WHEP) | Egress | WebRTC HTTP Egress Protocol for sub-second video delivery |
| **8189** | UDP (ICE) | WebRTC | ICE candidate connectivity for WebRTC clients |
| **9997** | HTTP (REST) | Control | Control API used by `CameraHealthMonitor` to probe stream status |
| **1935** | RTMP | Secondary | Optional RTMP ingress (OBS Studio, mobile streaming apps) |

---

## Configuration File: `media-server/mediamtx.yml`

Key production optimizations:
```yaml
# CORS enabled for web browser clients
hlsAllowOrigin: '*'
webrtcAllowOrigin: '*'

# Segment configuration for smooth low latency
hlsVariant: fmp4
hlsAlwaysRemux: yes
hlsSegmentCount: 5
hlsSegmentDuration: 1s

# ICE negotiation using Google public STUN
webrtcICEServers2:
  - url: stun:stun.l.google.com:19302

# Dynamic path mapping
paths:
  all_others:
    source: publisher
```

---

## Starting MediaMTX Locally

From the project root:
```powershell
.\media-server\mediamtx.exe .\media-server\mediamtx.yml
```

Expected log output:
```
INF MediaMTX v1.9.3
INF [RTSP] listener opened on :8554
INF [HLS] listener opened on :8888
INF [WebRTC] listener opened on :8889
INF [API] listener opened on :9997
```
