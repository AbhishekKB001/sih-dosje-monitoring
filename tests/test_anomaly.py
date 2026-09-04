"""
Unit tests for Phase 5 Anomaly Detection Engine (ai_subsystem.analytics.anomaly).
Verifies signal normalization, explainable decision-support phrasing,
per-target cooldown throttling, and multi-camera state isolation.
"""

import pytest
from ai_subsystem.analytics.anomaly import AnomalyEngine
from ai_subsystem.config import AnomalyConfig
from ai_subsystem.schemas import (
    AfterHoursEvent,
    AnomalySeverity,
    AnomalyType,
    AttendanceDiscrepancyEvent,
    CrowdSeverity,
    CrowdThresholdEvent,
    LoiteringEvent,
    VisualHealthResult,
    VisualHealthState,
    ZoneEventType,
    ZoneTransition,
    ZoneType,
)


def test_restricted_zone_anomaly_generation_and_neutral_language():
    engine = AnomalyEngine(camera_id="CAM-01", institution_id="INST-01")

    transition = ZoneTransition(
        event_id="TR-001",
        camera_id="CAM-01",
        track_id=101,
        zone_id="ZN-VAULT",
        zone_name="Secure Vault",
        zone_type=ZoneType.RESTRICTED,
        event_type=ZoneEventType.RESTRICTED_ZONE_BREACH,
        timestamp_utc=100.0,
        dwell_time_sec=0.5,
        explanation="Restricted zone breach"
    )

    anomalies = engine.evaluate_signals(zone_transitions=[transition], timestamp_utc=100.0)
    assert len(anomalies) == 1
    anom = anomalies[0]

    assert anom.anomaly_type == AnomalyType.RESTRICTED_ZONE_BREACH
    assert anom.severity == AnomalySeverity.CRITICAL
    assert anom.confidence_score >= 0.90
    assert anom.camera_id == "CAM-01"
    assert anom.zone_id == "ZN-VAULT"
    assert "TR-001" in anom.contributing_event_ids
    assert "Operational verification recommended" in anom.explanation
    # Decision support compliance: no criminal assertion
    assert "criminal" not in anom.explanation.lower()
    assert "fraud" not in anom.explanation.lower()


def test_loitering_anomaly_generation():
    engine = AnomalyEngine(camera_id="CAM-01")

    loit = LoiteringEvent(
        event_id="LOIT-001",
        camera_id="CAM-01",
        track_id=42,
        zone_id="ZN-CORR",
        zone_name="East Corridor",
        dwell_time_sec=65.0,
        threshold_sec=60.0,
        timestamp_utc=200.0,
        explanation="Loitering detected"
    )

    anomalies = engine.evaluate_signals(loitering_events=[loit], timestamp_utc=200.0)
    assert len(anomalies) == 1
    anom = anomalies[0]
    assert anom.anomaly_type == AnomalyType.LOITERING_DETECTED
    assert anom.severity == AnomalySeverity.MEDIUM
    assert "East Corridor" in anom.explanation
    assert "LOIT-001" in anom.contributing_event_ids


def test_after_hours_anomaly_generation():
    engine = AnomalyEngine(camera_id="CAM-01")

    ah = AfterHoursEvent(
        event_id="AH-001",
        camera_id="CAM-01",
        track_id=99,
        schedule_id="SCHED-WEEKDAY",
        operating_window_start="08:00",
        operating_window_end="18:00",
        observed_time_str="21:30",
        timestamp_utc=300.0,
        explanation="After-hours activity detected"
    )

    anomalies = engine.evaluate_signals(after_hours_events=[ah], timestamp_utc=300.0)
    assert len(anomalies) == 1
    anom = anomalies[0]
    assert anom.anomaly_type == AnomalyType.AFTER_HOURS_ACTIVITY
    assert anom.severity == AnomalySeverity.HIGH
    assert "outside scheduled operational hours" in anom.explanation


def test_crowd_surge_and_attendance_anomalies():
    engine = AnomalyEngine(camera_id="CAM-01")

    crwd = CrowdThresholdEvent(
        event_id="CRWD-001",
        camera_id="CAM-01",
        zone_id="ZN-HALL",
        zone_name="Hall",
        current_occupancy=15,
        threshold=10,
        severity=CrowdSeverity.CRITICAL,
        timestamp_utc=400.0,
        explanation="Capacity exceeded"
    )

    att = AttendanceDiscrepancyEvent(
        event_id="ATT-001",
        camera_id="CAM-01",
        timestamp_utc=400.0,
        reported_attendance=25,
        observed_occupancy=5,
        observation_window_sec=60.0,
        discrepancy_value=20,
        discrepancy_percentage=80.0,
        tolerance_percentage=20.0,
        explanation="Observed occupancy differs materially from reported attendance."
    )

    anomalies = engine.evaluate_signals(
        crowd_events=[crwd],
        attendance_events=[att],
        timestamp_utc=400.0
    )
    assert len(anomalies) == 2
    types = {a.anomaly_type for a in anomalies}
    assert AnomalyType.CROWD_SURGE in types
    assert AnomalyType.ATTENDANCE_DISCREPANCY in types


def test_visual_health_anomaly_generation():
    engine = AnomalyEngine(camera_id="CAM-01")

    health = VisualHealthResult(
        camera_id="CAM-01",
        frame_index=15,
        state=VisualHealthState.BLACK_SCREEN,
        is_healthy=False,
        fault_reason="Complete occlusion or camera failure detected"
    )

    anomalies = engine.evaluate_signals(health_result=health, timestamp_utc=500.0)
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == AnomalyType.VISUAL_STREAM_ANOMALY
    assert anomalies[0].severity == AnomalySeverity.HIGH
    assert "BLACK_SCREEN" in anomalies[0].explanation


def test_anomaly_cooldown_throttling():
    config = AnomalyConfig(cooldown_sec=10.0)
    engine = AnomalyEngine(camera_id="CAM-01", config=config)

    transition = ZoneTransition(
        event_id="TR-001",
        camera_id="CAM-01",
        track_id=101,
        zone_id="ZN-VAULT",
        zone_name="Secure Vault",
        zone_type=ZoneType.RESTRICTED,
        event_type=ZoneEventType.RESTRICTED_ZONE_BREACH,
        timestamp_utc=100.0,
        dwell_time_sec=0.5,
        explanation="Restricted zone breach"
    )

    # First emission at T=100 -> Emitted
    anom1 = engine.evaluate_signals(zone_transitions=[transition], timestamp_utc=100.0)
    assert len(anom1) == 1

    # Second emission at T=105 (within 10s cooldown) -> Suppressed
    anom2 = engine.evaluate_signals(zone_transitions=[transition], timestamp_utc=105.0)
    assert len(anom2) == 0

    # Third emission at T=111 (cooldown expired) -> Emitted
    anom3 = engine.evaluate_signals(zone_transitions=[transition], timestamp_utc=111.0)
    assert len(anom3) == 1


def test_anomaly_multi_camera_isolation():
    eng_cam1 = AnomalyEngine(camera_id="CAM-01")
    eng_cam2 = AnomalyEngine(camera_id="CAM-02")

    tr_cam1 = ZoneTransition(
        event_id="TR-01",
        camera_id="CAM-01",
        track_id=1,
        zone_id="ZN-A",
        zone_name="Zone A",
        zone_type=ZoneType.RESTRICTED,
        event_type=ZoneEventType.RESTRICTED_ZONE_BREACH,
        timestamp_utc=100.0,
        dwell_time_sec=0.5,
        explanation="Restricted zone breach"
    )

    anoms_1 = eng_cam1.evaluate_signals(zone_transitions=[tr_cam1], timestamp_utc=100.0)
    anoms_2 = eng_cam2.evaluate_signals(zone_transitions=[], timestamp_utc=100.0)

    assert len(anoms_1) == 1
    assert anoms_1[0].camera_id == "CAM-01"
    assert len(anoms_2) == 0
