# SIH 2026 — DoSJE Monitoring
## Master Team Contribution & Integration Status

> **Repository**: [https://github.com/AbhishekKB001/sih-dosje-monitoring](https://github.com/AbhishekKB001/sih-dosje-monitoring)  
> **Problem Statement**: SIH26095 — Smart Real-Time Monitoring & Inspection Mobile App for Ministry of Social Justice and Empowerment (DoSJE)  
> **Auditing Standard**: Strictly evidence-based from Git history and repository contents. The repository represents **ONE unified project**. Source code remains in its existing integrated locations.

---

## Executive Contribution & Integration Summary

At the current project stage, **Member 1** and **Member 4** have verified completed contributions. Other member contributions will be documented when their implementation and Git evidence become available.

| Member | Document | Responsibility | Current Status | Verified Contribution | Integration Status |
|:---|:---|:---|:---:|:---|:---:|
| **Member 1** | [Member 1](team/MEMBER_1_BACKEND.md) | Central Backend, Database & API Server | 🔴 **NOT VERIFIED / NOT FOUND** *(Central Backend)*<br>🟢 **VERIFIED IN MAIN** *(Flutter/Mobile)* | Verified Flutter/Mobile contribution; Central Backend NOT VERIFIED | 🟠 **PENDING** (FastAPI router adapter ready in AI subsystem) |
| **Member 2** | [Member 2](team/MEMBER_2_MOBILE.md) | Mobile Application (Flutter) & Field Inspections | 🟡 **PENDING / NOT VERIFIED** | No individually verified contribution identified in repo | 🟡 **PARTIALLY INTEGRATED** (Flutter UI complete with mock data) |
| **Member 3** | [Member 3](team/MEMBER_3_CCTV.md) | CCTV Ingestion, RTSP & Stream Management | 🟡 **PENDING / NOT VERIFIED** | No corresponding CCTV/stream implementation found | 🟠 **PENDING** (Adapter bridge implemented by Member 4) |
| **Member 4** | [Member 4](team/MEMBER_4_AI.md) | AI Video Intelligence & Visual Health | 🟢 **COMPLETE / READY FOR INTEGRATION** | Complete AI Subsystem, YOLOv8n + ByteTrack-style tracking, tests | 🔵 **READY FOR INTEGRATION** (Subsystem complete; project integration pending) |
| **Member 5** | [Member 5](team/MEMBER_5_INTEGRATION.md) | Mobile Integration, API Wire & State Flow | 🟡 **PENDING / NOT VERIFIED** | No individually verified contribution identified in repo | 🟡 **PARTIALLY INTEGRATED** (Data models & mock repositories present) |
| **Member 6** | [Member 6](team/MEMBER_6_QA_DEVOPS.md) | System Testing, CI/CD, Deployment & Docs | 🟡 **PENDING / NOT VERIFIED** | Docker files present; individual ownership not verified | 🟠 **PENDING** (Automated CI/CD workflows missing) |

---

## Project-Wide Integration Reality

> ### ⚠️ Key Architecture Distinction
> - **Member 4 AI Video Intelligence Subsystem**: **COMPLETE / READY FOR INTEGRATION**  
>   *(Verified in repository & main: 79/79 passing pytest tests on CPU, REST API on port 8000, SSE streaming, FastAPI router adapter, and Docker support)*.
> - **Entire SIH Project**: **NOT YET FULLY INTEGRATED**  
>   *(The repository contains individual component implementations—notably Member 4's AI subsystem and the Flutter mobile application—but live network wire connections between mobile client, central backend, database, and physical CCTV cameras are not yet fully integrated)*.

---

## ONE PROJECT ARCHITECTURE

The repository represents **ONE SIH PROJECT**. It is not six separate applications or six separate repositories. The actual source code remains in its existing integrated locations.

### Intended Final Integration Architecture
```
              [ Physical CCTV / IP Cameras / NVR / DVR ]
                                  │
                                  ▼
           [ Member 3 — CCTV / RTSP / Stream Gateway Layer ]
                                  │ (RTSP Streams / ONVIF Metadata)
                                  ▼
           [ Member 4 — AI Video Intelligence & Visual Health ]
                                  │ (REST API / SSE Events / Tamper-Sealed Evidence)
                                  ▼
           [ Member 1 — Central Backend & PostgreSQL Database ]
                                  │ (REST APIs / JWT Auth / WebSockets / Duties)
                                  ▼
         [ Member 2 / Member 5 — Flutter Mobile Application ]
         (HQ Admin Dashboard | PMU Inspector Wizard | Institute Incharge)
                                  │
                                  ▼
           [ Member 6 — Testing / Deployment / CI-CD QA ]
                                  │
                                  ▼
             [ Production SIH 2026 Hackathon Demo Solution ]
```

### Current Architectural Reality
- **Member 1 Flutter / Mobile**: **VERIFIED** *(Complete application present in `lib/` on `origin/main`, associated with SIH Developer identity)*.
- **Member 4 AI Subsystem**: **VERIFIED** *(Complete vision and analytics pipeline in `ai_subsystem/`, 79/79 tests passing on CPU, merged into `origin/main`)*.
- **Central Backend & Database**: **NOT VERIFIED / NOT FOUND IN AUDITED REPOSITORY** *(No backend server, PostgreSQL schema, or server-side RBAC found)*.
- **CCTV Implementation**: **NOT VERIFIED / NOT FOUND IN AUDITED REPOSITORY** *(No corresponding CCTV/stream implementation found; Member 4 adapters available)*.
- **Remaining Member Contributions**: **PENDING / NOT VERIFIED** *(Individual ownership between team members not proven by Git commit metadata)*.

---

## Individual Member Summaries & Document Links

### 1. [Member 1 — Central Backend & Mobile Contribution](team/MEMBER_1_BACKEND.md)
- **Status**: Central Backend & Database: **NOT VERIFIED / NOT FOUND IN AUDITED REPOSITORY** | Flutter/Mobile: **VERIFIED IN MAIN**
- **Git Finding**: `AbhishekKB001` is verified in Git metadata as repository owner/creator and PR merger. The audited repository contains substantial Flutter/mobile implementation associated with the `SIH Developer` identity. However, no separate Central Backend & Database implementation was found in the audited repository/branches.
- **Verified Code**: Flutter mobile application (`lib/`), data models (`lib/data/models/`), repositories (`lib/data/repositories/`), viewmodels (`lib/viewmodels/`), screens (`lib/views/`), mock RBAC auth, inspection workflow, and notification center.
- **Not Verified**: Central backend server, PostgreSQL/PostGIS, server-side JWT/RBAC, server-side duty assignment engine, central WebSocket broker, database migrations.
- **Separation Note**: `ai_subsystem/adapters/api_service.py`, `ai_subsystem/adapters/fastapi_router.py`, and `ai_subsystem/adapters/storage_adapter.py` belong to Member 4's AI subsystem and must **NOT** be attributed to Member 1.

### 2. [Member 2 — Mobile Application & Stakeholder UI](team/MEMBER_2_MOBILE.md)
- **Status**: **PENDING / NOT VERIFIED**
- **Responsibility**: Flutter/mobile application and stakeholder UI/UX (Official dashboard, Inspector wizard, Institute Incharge, 100m geofence lock, PTZ camera controls).
- **Audit Finding**: No individually verified completed contribution has been identified in the audited repository/branches at this stage. Individual ownership is not proven by Git metadata.

### 3. [Member 3 — CCTV Ingestion & Streaming](team/MEMBER_3_CCTV.md)
- **Status**: **PENDING / NOT VERIFIED**
- **Responsibility**: CCTV camera registration, RTSP/stream gateway, ONVIF discovery, NVR/DVR gateway, and physical camera integration.
- **Audit Finding**: No corresponding CCTV/stream implementation was found in the audited repository/branches. Physical CCTV hardware was not tested. Integration bridge adapters (`ai_subsystem/sources/member3_adapter.py` and `rtsp_source.py`) were implemented by Member 4 to facilitate immediate connection.

### 4. [Member 4 — AI Video Intelligence & Visual Health](team/MEMBER_4_AI.md)
- **Status**: **COMPLETE / READY FOR INTEGRATION**
- **Author**: Kanaka Chala (`Kanakachala-Boom <kanakachala691@gmail.com>`) on branch `member4-ai` (merged into `origin/main`).
- **Verified Scope**:
  - Video source abstraction (`BaseVideoSource`, demo MP4, webcam, RTSP, Member 3 adapter)
  - OpenCV preprocessing, normalization, and visual health monitoring (black screen, blur, low light, freeze, tampering)
  - **YOLOv8n object detection + ByteTrack-style two-stage IoU tracking**
  - Spatial polygon zones, restricted intrusion detection, and directional line crossing tripwires
  - Temporal dwell accumulation, loitering detection, and weekly after-hours schedules
  - Rolling window occupancy analytics and crowd surge threshold alerts
  - Non-biometric attendance consistency auditing using strictly neutral decision-support terminology
  - Anomaly engine, multi-signal incident correlation, and alert lifecycle manager (`NEW` -> `ACKNOWLEDGED` -> `RESOLVED`)
  - Tamper-sealed evidence snapshots with cryptographic SHA-256 file integrity verification
  - Human review workflow, REST API on port 8000, real-time SSE stream (`/api/v1/events/stream`), and FastAPI router adapter
  - 79 automated pytest tests passing on CPU in 124.48s (100% pass rate)
- **Disclaimers**: Physical CCTV hardware was **NOT** tested; GPU performance was **NOT** tested (executed on CPU); SHA-256 is for **file integrity and anti-tamper verification**, not a legal chain of custody. Member 4 is the verified owner of `ai_subsystem/`.

### 5. [Member 5 — Mobile Integration & State Flow](team/MEMBER_5_INTEGRATION.md)
- **Status**: **PENDING / NOT VERIFIED**
- **Responsibility**: Mobile integration engineering, API wire connection, data serialization, mobile state management, and offline caching.
- **Audit Finding**: No individually verified completed contribution has been identified in the audited repository/branches at this stage. Individual ownership is not proven by Git metadata.

### 6. [Member 6 — QA, Testing & DevOps](team/MEMBER_6_QA_DEVOPS.md)
- **Status**: **PENDING / NOT VERIFIED**
- **Responsibility**: System-wide QA, automated end-to-end testing, Docker containerization, CI/CD pipelines, and project documentation.
- **Audit Finding**: No individually verified completed contribution has been identified in the audited repository/branches at this stage. Existing Docker files were committed under Member 4's phase commits and Flutter commits. Automated CI/CD workflows are pending.

---

## Integration Roadmap

### Phase 1 — Individual Contributions
Members complete their assigned implementation on their dedicated branches.

### Phase 2 — Branch Verification
Verify branches, commits, test suites, and individual contribution ownership.

### Phase 3 — Backend + AI Integration
Mount Member 4's `ai_subsystem/adapters/fastapi_router.py` into the central backend server when the host server and PostgreSQL database become available.

### Phase 4 — CCTV + AI Integration
Connect authorized RTSP/HLS streams from physical cameras and Member 3's gateway to the AI subsystem.

### Phase 5 — Backend + Flutter Integration
Replace client-side mock data in `lib/core/constants/mock_data.dart` with verified live REST API and SSE stream calls from the backend and AI service.

### Phase 6 — Full System Testing
Execute full-stack testing across the entire pipeline: CCTV -> AI -> Backend -> Database -> Flutter.

### Phase 7 — Final SIH Demo
Run the complete integrated project in staging, verify offline and online resilience, and prepare the final jury demonstration.

---

## Contribution Rule

Every team member must adhere to these eight project standards:

1. **Work on your assigned branch**: Never commit unreviewed code directly to `main`.
2. **Commit meaningful changes**: Include clear, descriptive commit messages documenting changes made.
3. **Keep your member contribution document updated**: Maintain your status file in `docs/team/` with verified commits and file paths.
4. **Never overwrite another member's core implementation**: Do not edit `ai_subsystem/` or `lib/` without coordinated review.
5. **Open a Pull Request before merging into main**: Require team review and test validation prior to merging.
6. **Run relevant tests before requesting merge**:
   - Python AI: Run `pytest` (Must maintain 79/79 passing on CPU).
   - Flutter: Run `flutter test` and `flutter analyze`.
7. **Keep secrets and credentials out of Git**: Never commit `.env`, private IP addresses, RTSP passwords, or signing keys. Use `.env.example`.
8. **Update integration status after successful integration**: Update `docs/TEAM_WORK_STATUS.md` as integration milestones are achieved.
