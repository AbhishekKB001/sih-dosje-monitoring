# SIH 2026 — Member 1 Contribution

## Current Status
- **Central Backend & Database**: `NOT VERIFIED / NOT FOUND IN AUDITED REPOSITORY`
- **Flutter / Mobile Contribution**: `VERIFIED IN MAIN` *(associated with SIH Developer identity)*

---

## Member Identity
- **Git Username**: `AbhishekKB001` *(Verified repository owner/creator and PR merger)*
- **Git Author (Initial Commit & PR Merge)**: `AbhishekKB001 <2024is_abhishekkbhadrashetti_a@nie.ac.in>`
- **Git Author (Flutter Mobile Implementation)**: `SIH Developer <developer@dosje.gov.in>`
- **Branch**: `main`, `origin/ui`

---

## Responsibility
- Central Application Backend (FastAPI / Node.js / Django)
- Relational Database Management (PostgreSQL with PostGIS for geofences)
- Central Authentication & Role-Based Access Control (RBAC)
- Surprise Inspection Duty Assignment Engine (risk-score-weighted dispatch)
- Persistent Storage for Inspection Reports, Attendance Records, and Officer Profiles
- Event Broker / WebSockets dispatcher for centralized notifications

---

## Verified Work Completed

### VERIFIED (Flutter / Mobile Application Contribution)
The audited repository contains substantial Flutter/mobile implementation associated with the `SIH Developer` identity, merged into `origin/main`:
- **Complete Flutter Mobile Client**: Material 3 GovTech application with tri-color styling and multi-role shell.
- **Flutter Data Models**: `lib/data/models/` (`user_model.dart`, `inspection_duty_model.dart`, `institute_model.dart`, `cctv_feed_model.dart`, `anomaly_model.dart`, `notification_model.dart`).
- **Flutter Repositories**: `lib/data/repositories/` (`auth_repository.dart`, `inspection_repository.dart`, `cctv_repository.dart`, `notification_repository.dart`).
- **ViewModels (Provider MVVM)**: `lib/viewmodels/` (`auth_viewmodel.dart`, `inspection_viewmodel.dart`, `cctv_viewmodel.dart`, `dashboard_viewmodel.dart`, `notification_viewmodel.dart`, `video_call_viewmodel.dart`).
- **Screens & Views**: `lib/views/` (Login, MPIN/Biometric, 3 Stakeholder Dashboards, CCTV Grid, PTZ Player, 5-Step Inspection Wizard, Random VC, Anomaly Alerts, Notification Center, Officer Profile).
- **Authentication UI & Mock RBAC**: Role switching between Official, Inspector, and Institute Incharge.
- **Inspection Workflow & Mock Duty Assignment**: Geofence arrival check (<100m) and 5-step digital audit wizard.
- **Notification UI & Repository**: In-app notification center and alert dispatcher.

### NOT VERIFIED (Central Backend & Database)
No corresponding Central Backend & Database implementation was found in the audited repository or branches:
- Central backend server (No standalone FastAPI, Express, Flask, Django, or NestJS server application)
- Database (No PostgreSQL, PostGIS, SQLite, MySQL, or MongoDB database instances, connections, or configuration)
- Backend database migrations or ORM schemas (No Alembic, SQLAlchemy, Prisma, or TypeORM schemas)
- Server-side JWT / RBAC (No server token issuance, token verification middleware, bcrypt password hashing, or route guards)
- Server-side duty assignment engine (No backend scheduler, database queue, or server-side risk scoring)
- Central WebSocket / message broker (No Redis, RabbitMQ, Kafka, or WebSocket server for real-time dispatch)

### Important Separation of Member 4 Adapters
> [!IMPORTANT]
> The following files belong strictly to **Member 4's AI subsystem** and must **NOT** be attributed to Member 1:
> - `ai_subsystem/adapters/api_service.py` *(Embedded Python standard library HTTP service on port 8000 for AI analytics)*
> - `ai_subsystem/adapters/fastapi_router.py` *(Plug-and-play APIRouter adapter created by Member 4 for a future backend to mount)*
> - `ai_subsystem/adapters/storage_adapter.py` *(Local JSON file-based audit persistence for evidence and supervisor review records)*

---

## Repository Files
- `lib/main.dart`
- `lib/core/constants/app_colors.dart`
- `lib/core/constants/app_strings.dart`
- `lib/core/constants/mock_data.dart`
- `lib/core/theme/app_theme.dart`
- `lib/data/models/anomaly_model.dart`
- `lib/data/models/cctv_feed_model.dart`
- `lib/data/models/inspection_duty_model.dart`
- `lib/data/models/institute_model.dart`
- `lib/data/models/notification_model.dart`
- `lib/data/models/user_model.dart`
- `lib/data/repositories/auth_repository.dart`
- `lib/data/repositories/cctv_repository.dart`
- `lib/data/repositories/inspection_repository.dart`
- `lib/data/repositories/notification_repository.dart`
- `lib/viewmodels/auth_viewmodel.dart`
- `lib/viewmodels/cctv_viewmodel.dart`
- `lib/viewmodels/dashboard_viewmodel.dart`
- `lib/viewmodels/inspection_viewmodel.dart`
- `lib/viewmodels/notification_viewmodel.dart`
- `lib/viewmodels/video_call_viewmodel.dart`
- `lib/views/analytics/anomaly_alerts_view.dart`
- `lib/views/auth/login_screen.dart`
- `lib/views/auth/mpin_biometric_screen.dart`
- `lib/views/auth/role_selection_screen.dart`
- `lib/views/auth/splash_screen.dart`
- `lib/views/cctv/cctv_grid_view.dart`
- `lib/views/cctv/cctv_player_view.dart`
- `lib/views/dashboard/inspector_dashboard_view.dart`
- `lib/views/dashboard/institute_dashboard_view.dart`
- `lib/views/dashboard/main_navigation_screen.dart`
- `lib/views/dashboard/official_dashboard_view.dart`
- `lib/views/inspection/inspection_detail_view.dart`
- `lib/views/inspection/inspection_duty_list_view.dart`
- `lib/views/inspection/inspection_form_wizard_view.dart`
- `lib/views/inspection/inspection_report_view.dart`
- `lib/views/notifications/notification_center_view.dart`
- `lib/views/profile/profile_view.dart`
- `lib/views/video_call/random_vc_screen.dart`
- `lib/widgets/custom_app_bar.dart`
- `lib/widgets/geofence_status_card.dart`
- `lib/widgets/live_cctv_card.dart`
- `lib/widgets/stat_metric_card.dart`
- `pubspec.yaml`

---

## Git Evidence
- `2dc1d30`: Initial commit by `AbhishekKB001 <2024is_abhishekkbhadrashetti_a@nie.ac.in>`
- `2f1cf31`: `Merge pull request #1 from AbhishekKB001/member4-ai` by `AbhishekKB001`
- `bb83d1b`: `feat: complete DoSJE Drishti Flutter mobile application for SIH` by `SIH Developer <developer@dosje.gov.in>`
- `1681f8e`: `Merge branch 'origin/main': integrate AI subsystem and Flutter mobile application` by `SIH Developer <developer@dosje.gov.in>`

---

## Integration Dependencies
- **Consumes**: AI events, occupancy telemetry, and evidence verification from Member 4 (`ai_subsystem/adapters/fastapi_router.py` or HTTP port 8000).
- **Provides**: Central REST APIs and WebSocket streams to the Flutter mobile client (`lib/data/repositories/`).

---

## Pending Work
1. Implement host backend application server (e.g. FastAPI / Express / NestJS).
2. Set up PostgreSQL schema with PostGIS support for institutional coordinates and geofences.
3. Implement server-side JWT authentication and role-based route guards.
4. Mount Member 4's `ai_subsystem/adapters/fastapi_router.py` into the backend server.
5. Provide live REST endpoints for the Flutter mobile application to replace `lib/core/constants/mock_data.dart`.

---

## Verification Notes
- **Flutter / Mobile Contribution**: `VERIFIED IN MAIN` *(associated with SIH Developer identity)*
- **Central Backend & Database**: `NOT VERIFIED / NOT FOUND IN AUDITED REPOSITORY`
- **Individual Mobile Ownership**: Specific division of code ownership between Member 1 and other mobile members is not distinguishable from Git metadata alone.
