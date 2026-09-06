"""
Unit tests for Phase 5 AI Alert Manager, Evidence Sealing & Human Review (ai_subsystem.analytics).
Verifies alert lifecycle states, SHA-256 evidence integrity, post-creation tamper detection,
and human review false-positive tracking.
"""

import os
import tempfile
import numpy as np
import pytest

from ai_subsystem.analytics.alerts import AIAlertManager
from ai_subsystem.analytics.evidence import EvidenceManager
from ai_subsystem.config import AlertManagerConfig, EvidenceConfig
from ai_subsystem.schemas import (
    AIAnomaly,
    AIIncident,
    AlertLifecycleState,
    AlertSeverity,
    AnomalySeverity,
    AnomalyType,
    IncidentSeverity,
    IncidentType,
    ReviewOutcome,
)


def test_alert_manager_lifecycle_transitions():
    cfg = AlertManagerConfig(alert_cooldown_sec=10.0)
    manager = AIAlertManager(camera_id="CAM-01", config=cfg)

    inc = AIIncident(
        incident_id="INC-001",
        camera_id="CAM-01",
        incident_type=IncidentType.CORRELATED_SECURITY_INCURSION,
        severity=IncidentSeverity.CRITICAL,
        start_time_utc=100.0,
        last_updated_utc=100.0,
        explanation="Security incursion",
        recommended_action="Inspect immediately"
    )

    # 1. New alert generated
    alert = manager.create_alert_from_incident(inc, timestamp_utc=100.0)
    assert alert is not None
    assert alert.lifecycle_state == AlertLifecycleState.NEW
    assert alert.severity == AlertSeverity.CRITICAL
    assert alert.incident_id == "INC-001"

    # 2. Acknowledge alert
    ack_alert = manager.acknowledge_alert(
        alert.alert_id,
        user_id="supervisor_demo",
        notes="Security team dispatched to Zone A",
        timestamp_utc=105.0
    )
    assert ack_alert is not None
    assert ack_alert.lifecycle_state == AlertLifecycleState.ACKNOWLEDGED
    assert ack_alert.acknowledged_by == "supervisor_demo"
    assert ack_alert.acknowledged_at_utc == 105.0

    # 3. Resolve alert
    res_alert = manager.resolve_alert(
        alert.alert_id,
        user_id="supervisor_demo",
        notes="Authorized maintenance staff verified. Demo authorization verified.",
        timestamp_utc=120.0
    )
    assert res_alert is not None
    assert res_alert.lifecycle_state == AlertLifecycleState.RESOLVED
    assert res_alert.resolved_at_utc == 120.0
    assert "Demo authorization verified" in res_alert.resolution_notes


def test_alert_cooldown_throttling():
    cfg = AlertManagerConfig(alert_cooldown_sec=20.0)
    manager = AIAlertManager(camera_id="CAM-01", config=cfg)

    anom = AIAnomaly(
        anomaly_id="ANOM-01",
        camera_id="CAM-01",
        timestamp_utc=100.0,
        anomaly_type=AnomalyType.RESTRICTED_ZONE_BREACH,
        severity=AnomalySeverity.CRITICAL,
        explanation="Vault entry breach"
    )

    # First alert generated at T=100
    a1 = manager.create_alert_from_anomaly(anom, timestamp_utc=100.0)
    assert a1 is not None

    # Repeated alert at T=110 (within 20s cooldown) -> Suppressed
    a2 = manager.create_alert_from_anomaly(anom, timestamp_utc=110.0)
    assert a2 is None

    # Alert at T=125 (cooldown expired) -> Generated
    a3 = manager.create_alert_from_anomaly(anom, timestamp_utc=125.0)
    assert a3 is not None


def test_evidence_snapshot_generation_and_sha256_sealing():
    with tempfile.TemporaryDirectory() as tmp_dir:
        cfg = EvidenceConfig(storage_dir=tmp_dir, enabled=True)
        manager = EvidenceManager(camera_id="CAM-EVD-01", config=cfg)

        # Create dummy BGR image (640x480 gray)
        dummy_frame = np.full((480, 640, 3), 128, dtype=np.uint8)

        record = manager.capture_evidence(
            frame_bgr=dummy_frame,
            source_event_id="EVT-ALERT-01",
            event_type="CORRELATED_SECURITY_INCURSION",
            explanation="Perimeter breach detected",
            incident_id="INC-01",
            zone_id="ZN-VAULT",
            timestamp_utc=1000.0
        )

        assert record is not None
        assert os.path.exists(record.image_path)
        assert record.sha256_hash is not None
        assert len(record.sha256_hash) == 64  # Hex SHA-256 is 64 chars
        assert record.file_size_bytes > 0

        # Verify integrity immediately
        res = manager.verify_evidence_integrity(record.evidence_id)
        assert res.is_valid is True
        assert res.computed_hash == record.sha256_hash
        assert "Integrity verified" in res.explanation


def test_evidence_integrity_tamper_detection():
    with tempfile.TemporaryDirectory() as tmp_dir:
        cfg = EvidenceConfig(storage_dir=tmp_dir, enabled=True)
        manager = EvidenceManager(camera_id="CAM-EVD-02", config=cfg)

        dummy_frame = np.full((480, 640, 3), 100, dtype=np.uint8)
        record = manager.capture_evidence(
            frame_bgr=dummy_frame,
            source_event_id="EVT-ALERT-02",
            event_type="ATTENDANCE_DISCREPANCY",
            explanation="Roster discrepancy",
            timestamp_utc=2000.0
        )
        assert record is not None

        # Verify pristine file passes
        pristine_check = manager.verify_evidence_integrity(record.evidence_id)
        assert pristine_check.is_valid is True

        # SIMULATE FILE TAMPERING: Append or alter bytes in the saved JPEG image file
        with open(record.image_path, "ab") as f:
            f.write(b"\x00\xFF\x00\xFF_TAMPERED_CONTENT")

        # Now verify integrity: must detect discrepancy!
        tampered_check = manager.verify_evidence_integrity(record.evidence_id)
        assert tampered_check.is_valid is False
        assert tampered_check.computed_hash != record.sha256_hash
        assert "TAMPER DETECTED" in tampered_check.explanation


def test_human_review_submission_and_false_positive_tracking():
    with tempfile.TemporaryDirectory() as tmp_dir:
        cfg = EvidenceConfig(storage_dir=tmp_dir)
        manager = EvidenceManager(camera_id="CAM-01", config=cfg)

        # Submit 1 True Event and 1 False Positive
        rev1 = manager.submit_human_review(
            target_id="ALT-001",
            reviewer_id="auditor_anita",
            outcome=ReviewOutcome.TRUE_EVENT,
            notes="Confirmed unauthorized entry on footage",
            timestamp_utc=100.0
        )
        assert rev1.review_id.startswith("REV-")

        rev2 = manager.submit_human_review(
            target_id="ALT-002",
            reviewer_id="auditor_anita",
            outcome=ReviewOutcome.FALSE_POSITIVE,
            notes="Shadow from outdoor tree triggered restricted zone threshold",
            timestamp_utc=110.0
        )

        reviews_for_alt1 = manager.get_reviews_for_target("ALT-001")
        assert len(reviews_for_alt1) == 1
        assert reviews_for_alt1[0].outcome == ReviewOutcome.TRUE_EVENT

        # Out of 2 reviews: 1 FP, 1 True -> 50.0% FP rate
        fp_rate = manager.get_false_positive_rate()
        assert fp_rate == 50.0
