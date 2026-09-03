# MoSJE Centralized Monitoring Platform — Member 4 AI Subsystem
## Flutter / Mobile App Integration Contract & Dart Models

This document defines the formal integration contract, JSON payloads, UI presentation standards, and copy-paste ready Dart data models for **Member 2 / Member 5 (Flutter Mobile Engineering Team)** to consume Member 4 AI intelligence outputs.

---

## 1. REST & SSE Endpoints for Mobile Integration

Base URL: `http://<server-ip>:8000/api/v1`

| Endpoint | Method | Purpose | Mobile Screen Usage |
| :--- | :---: | :--- | :--- |
| `/cameras` | `GET` | Camera list & operational telemetry | Dashboard & Camera selector |
| `/cameras/{id}/occupancy` | `GET` | Current, peak, min & avg room occupancy | Live Inspection screen |
| `/cameras/{id}/alerts` | `GET` | Active AI alerts list with recommendations | Alert Feed / Notifications tab |
| `/alerts/{id}/acknowledge` | `POST` | Supervisor acknowledges an alert | Alert Detail action button |
| `/alerts/{id}/resolve` | `POST` | Supervisor marks alert resolved | Alert Detail action button |
| `/evidence/{id}` | `GET` | Download raw JPEG evidence snapshot | Evidence Viewer modal |
| `/evidence/{id}/verify` | `GET` | Verify cryptographic SHA-256 integrity | Evidence Verification badge |
| `/reviews` | `POST` | Submit supervisor audit review | Review & Feedback dialog |
| `/attendance` | `POST` | Submit official administrative attendance | Attendance sync tab |
| `/events/stream` | `GET` | Real-time Server-Sent Events (SSE) stream | Real-time notification badge |

---

## 2. Mobile UI Display Guidelines

### 2.1 Severity Color Standards
Ensure all alerts, badges, and banners adhere strictly to the DoSJE operational palette:
* **CRITICAL** (`#DC2626` / Red): Restricted zone breach, after-hours intrusion, severe crowd surge.
* **HIGH** (`#EA580C` / Orange): Material attendance discrepancy, prolonged loitering.
* **WARNING / MEDIUM** (`#D97706` / Amber): Approaching room capacity, minor attendance variance.
* **LOW / INFO** (`#2563EB` / Blue): Operational advisory, normal zone transitions.

### 2.2 Mandatory Neutral / Decision-Support Phrasing
In strict compliance with government policy and ethical AI guidelines:
* **FORBIDDEN PHRASES**: The app must **NEVER** display terms such as:
  * `"Fraud Detected"`
  * `"Criminal Activity"`
  * `"Fake Beneficiary"`
  * `"Hostile Trespasser"`
* **MANDATORY NEUTRAL NOTICES**: All discrepancy and security notices must state:
  * *"Observed occupancy differs materially from reported attendance. Operational verification recommended."*
  * *"Presence detected in restricted zone. Verification recommended."*

### 2.3 Cryptographic Integrity Indicator
When viewing an evidence snapshot, display a verification pill:
* If `is_valid == true`: Green badge: `[✓ SHA-256 Verified: Genuine Snapshot]`
* If `is_valid == false`: Red badge: `[⚠ Warning: File Tamper Detected]`

---

## 3. Copy-Paste Ready Dart Data Models

Save the following models in your Flutter project under `lib/models/ai_intelligence_models.dart`:

```dart
// lib/models/ai_intelligence_models.dart

import 'dart:convert';

/// Represents an actionable AI Alert from Member 4 Subsystem
class AIAlertModel {
  final String alertId;
  final String cameraId;
  final String? institutionId;
  final String alertType;
  final String severity;
  final String title;
  final String explanation;
  final String recommendedAction;
  final String lifecycleState;
  final double timestampUtc;
  final String? evidenceSnapshotId;
  final String? acknowledgedBy;
  final String? resolvedBy;

  AIAlertModel({
    required this.alertId,
    required this.cameraId,
    this.institutionId,
    required this.alertType,
    required this.severity,
    required this.title,
    required this.explanation,
    required this.recommendedAction,
    required this.lifecycleState,
    required this.timestampUtc,
    this.evidenceSnapshotId,
    this.acknowledgedBy,
    this.resolvedBy,
  });

  factory AIAlertModel.fromJson(Map<String, dynamic> json) {
    return AIAlertModel(
      alertId: json['alert_id'] ?? '',
      cameraId: json['camera_id'] ?? '',
      institutionId: json['institution_id'],
      alertType: json['alert_type'] ?? '',
      severity: json['severity'] ?? 'LOW',
      title: json['title'] ?? '',
      explanation: json['explanation'] ?? '',
      recommendedAction: json['recommended_action'] ?? '',
      lifecycleState: json['lifecycle_state'] ?? 'NEW',
      timestampUtc: (json['timestamp_utc'] as num?)?.toDouble() ?? 0.0,
      evidenceSnapshotId: json['evidence_snapshot_id'],
      acknowledgedBy: json['acknowledged_by'],
      resolvedBy: json['resolved_by'],
    );
  }

  Map<String, dynamic> toJson() => {
    'alert_id': alertId,
    'camera_id': cameraId,
    'institution_id': institutionId,
    'alert_type': alertType,
    'severity': severity,
    'title': title,
    'explanation': explanation,
    'recommended_action': recommendedAction,
    'lifecycle_state': lifecycleState,
    'timestamp_utc': timestampUtc,
    'evidence_snapshot_id': evidenceSnapshotId,
  };
}

/// Represents real-time and sliding window occupancy
class OccupancyModel {
  final String cameraId;
  final int currentOccupancy;
  final int peakOccupancy;
  final int minOccupancy;
  final double avgOccupancy;
  final double windowDurationSec;
  final double timestampUtc;

  OccupancyModel({
    required this.cameraId,
    required this.currentOccupancy,
    required this.peakOccupancy,
    required this.minOccupancy,
    required this.avgOccupancy,
    required this.windowDurationSec,
    required this.timestampUtc,
  });

  factory OccupancyModel.fromJson(Map<String, dynamic> json) {
    return OccupancyModel(
      cameraId: json['camera_id'] ?? '',
      currentOccupancy: json['current_occupancy'] ?? 0,
      peakOccupancy: json['peak_occupancy'] ?? 0,
      minOccupancy: json['min_occupancy'] ?? 0,
      avgOccupancy: (json['avg_occupancy'] as num?)?.toDouble() ?? 0.0,
      windowDurationSec: (json['window_duration_sec'] as num?)?.toDouble() ?? 300.0,
      timestampUtc: (json['timestamp_utc'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

/// Cryptographic Evidence Integrity Result
class EvidenceVerificationModel {
  final String evidenceId;
  final bool isValid;
  final String explanation;
  final String recordedHash;
  final String computedHash;

  EvidenceVerificationModel({
    required this.evidenceId,
    required this.isValid,
    required this.explanation,
    required this.recordedHash,
    required this.computedHash,
  });

  factory EvidenceVerificationModel.fromJson(Map<String, dynamic> json) {
    return EvidenceVerificationModel(
      evidenceId: json['evidence_id'] ?? '',
      isValid: json['is_valid'] ?? false,
      explanation: json['explanation'] ?? '',
      recordedHash: json['recorded_hash'] ?? '',
      computedHash: json['computed_hash'] ?? '',
    );
  }
}

/// Human Supervisor Review Submission
class HumanReviewSubmission {
  final String cameraId;
  final String targetId;
  final String reviewerId;
  final String outcome; // 'TRUE_EVENT', 'FALSE_POSITIVE', 'INCONCLUSIVE'
  final String notes;

  HumanReviewSubmission({
    required this.cameraId,
    required this.targetId,
    required this.reviewerId,
    required this.outcome,
    required this.notes,
  });

  Map<String, dynamic> toJson() => {
    'camera_id': cameraId,
    'target_id': targetId,
    'reviewer_id': reviewerId,
    'outcome': outcome,
    'notes': notes,
  };
}
```
