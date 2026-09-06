# DoSJE Drishti — Mobile Field Inspection Application (Flutter) 📱

The **DoSJE Drishti Mobile Application** is the field inspection and surveillance audit client for PMU Inspection Officers and Institute Incharges under the Ministry of Social Justice and Empowerment (DoSJE).

Built with **Flutter 3.x (Dart 3.x)**, the application is engineered for field-ready resilience with genuine hardware sensor integrations, strict geofence verification, cryptographic pixel watermarking, offline draft persistence, and WebRTC video calling.

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC)**:
   - Dynamic interfaces tailored to `INSPECTOR` (PMU Field Officers), `OFFICIAL` (DoSJE Ministry), and `INSTITUTE` (Center Incharges).
   - Six quick-switch demonstration personas with secure backend JWT authentication.

2. **Real Hardware Location & Geofencing**:
   - Live satellite GPS acquisition via `geolocator: ^13.0.4`.
   - Real-time Haversine distance computation to target institute coordinates.
   - Strict 100m geofence enforcement before unlocking audit inspection forms.

3. **Tamper-Evident Media Capture & Watermarking**:
   - Direct camera photo capture and 60-second video walkthroughs via `image_picker: ^1.1.2`.
   - Pixel-level cryptographic watermarking via `image: ^4.3.0` burning GPS coordinates, IST timestamp, inspection ID, and project code directly into the image pixels.
   - SHA-256 hash generation for cryptographic chain-of-custody verification.

4. **Offline-First Vault & Synchronization**:
   - Persistent local JSON storage via `path_provider: ^2.1.5` under `dosje_drafts/`.
   - Inspection checklists, headcounts, notes, and photos are saved locally during network dead zones.
   - Automatic sync resumption when network connectivity is restored.

5. **Project-Targeted Surprise Video Audits**:
   - Real-time polling for incoming video audit requests targeted to specific project incharges.
   - One-tap WebRTC bridge to canonical Jitsi Meet rooms (`https://meet.jit.si/dosje-audit-...`) with full two-way audio, video, camera toggle, and mute controls.

---

## 🛠️ Prerequisites

- **Flutter SDK**: 3.24.x or higher (Tested with Flutter 3.47.2 / Dart 3.x)
- **Android SDK**: API level 34 (Android 14) recommended (Min SDK: 21 / Android 5.0)
- **Java Development Kit (JDK)**: OpenJDK 17 or higher
- **Android Studio / VS Code** with Flutter & Dart extensions

---

## 🚀 Getting Started

### 1. Install Dependencies
From the `mobile-app` directory:
```bash
flutter pub get
```

### 2. Configure Backend Endpoint
By default, the mobile app connects to:
- **Physical Device**: `http://<your-local-ip>:4000/api` (or use ADB reverse: `adb reverse tcp:4000 tcp:4000`)
- **Android Emulator**: `http://10.0.2.2:4000/api` (automatic fallback is built-in)
- **Web / Desktop**: `http://localhost:4000/api`

To update the default base URL, edit [`lib/data/services/api_service.dart`](lib/data/services/api_service.dart):
```dart
String baseUrl = 'http://localhost:4000/api';
```

### 3. Run the Application
```bash
# Run on connected device or running emulator
flutter run

# Run on specific target
flutter run -d chrome     # Web Preview
flutter run -d emulator-5554 # Android Emulator
```

---

## 🧪 Testing & Code Quality

```bash
# Run static code analysis (0 warnings / 0 errors)
flutter analyze --no-pub

# Run unit and widget test suite
flutter test --no-pub
```

---

## 📦 Building for Production

### Release APK (ARM64 / ARMv7 / x86_64)
```bash
flutter build apk --release --no-tree-shake-icons
```
The compiled release APK will be located at:
`build/app/outputs/flutter-apk/app-release.apk`

---

## 📂 Architecture & Directory Structure

```text
mobile-app/
├── android/                 # Native Android Gradle configuration & permissions
├── ios/                     # Native iOS workspace configuration
├── lib/
│   ├── core/
│   │   ├── constants/       # AppColors, AppStrings, MockData fallback
│   │   ├── services/        # LocationService, WatermarkService, OfflineStorageService
│   │   └── theme/           # AppTheme configuration
│   ├── data/
│   │   ├── models/          # InspectionDutyModel, InstituteModel, UserModel, etc.
│   │   ├── repositories/    # AuthRepository, InspectionRepository, CCTVRepository
│   │   └── services/        # ApiService (REST HTTP client)
│   ├── viewmodels/          # AuthViewModel, InspectionViewModel, VideoCallViewModel
│   ├── views/               # Screens: Auth, Dashboard, Inspection Wizard, CCTV, VC
│   ├── widgets/             # Reusable UI widgets: GeofenceStatusCard, StatMetricCard
│   └── main.dart            # Application entry point with MultiProvider setup
├── test/                    # Unit and widget test suite
└── pubspec.yaml             # Manifest & dependencies
```
