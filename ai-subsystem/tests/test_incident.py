"""
Unit tests for Phase 5 Incident Correlation Engine (ai_subsystem.analytics.incident).
Verifies multi-signal temporal clustering, incident escalation,
cooldown suppression, and multi-camera state isolation.
"""

import pytest
from ai_subsystem.analytics.incident import IncidentCorrelationEngine
from ai_subsystem.config import IncidentCorrelationConfig
from ai_subsystem.schemas import (
    AIAnomaly,
    AnomalySeverity,
    AnomalyType,
    IncidentSeverity,
    IncidentType,
)


def make_anomaly(
    camera_id: str,
    anom_type: AnomalyType,
    severity: AnomalySeverity,
    timestamp_utc: float,
    zone_id: str = "ZN-01",
    zone_name: str = "Test Zone"
) -> AIAnomaly:
    return AIAnomaly(
        anomaly_id=f"ANOM-{anom_type.value[:4]}-{int(timestamp_utc)}",
        camera_id=camera_id,
        zone_id=zone_id,
        zone_name=zone_name,
        timestamp_utc=timestamp_utc,
        anomaly_type=anom_type,
        severity=severity,
        explanation=f"Test anomaly {anom_type.value}"
    )


def test_security_incident_correlation_multi_signal():
    cfg = IncidentCorrelationConfig(correlation_window_sec=60.0, incident_cooldown_sec=30.0)
    engine = IncidentCorrelationEngine(camera_id="CAM-SEC-01", config=cfg)

    # Signal 1: Restricted zone breach at T=100.0
    anom_breach = make_anomaly("CAM-SEC-01", AnomalyType.RESTRICTED_ZONE_BREACH, AnomalySeverity.CRITICAL, 100.0)
    incidents_1 = engine.process_anomalies([anom_breach], timestamp_utc=100.0)
    # Only 1 signal present; min_signals_to_escalate is 2 -> no incident yet
    assert len(incidents_1) == 0

    # Signal 2: Loitering in that zone at T=120.0 (20s later, within 60s window)
    anom_loiter = make_anomaly("CAM-SEC-01", AnomalyType.LOITERING_DETECTED, AnomalySeverity.MEDIUM, 120.0)
    incidents_2 = engine.process_anomalies([anom_loiter], timestamp_utc=120.0)

    # Combined into 1 elevated Correlated Security Incursion incident!
    assert len(incidents_2) == 1
    inc = incidents_2[0]
    assert inc.incident_type == IncidentType.CORRELATED_SECURITY_INCURSION
    assert inc.severity == IncidentSeverity.CRITICAL
    assert inc.signals_count == 2
    assert inc.camera_id == "CAM-SEC-01"
    assert anom_breach.anomaly_id in inc.contributing_anomaly_ids
    assert anom_loiter.anomaly_id in inc.contributing_anomaly_ids
    assert "Multi-signal security incursion detected" in inc.explanation
    assert "Immediate physical security review recommended" in inc.recommended_action


def test_operational_incident_correlation():
    cfg = IncidentCorrelationConfig(correlation_window_sec=60.0)
    engine = IncidentCorrelationEngine(camera_id="CAM-OPS-01", config=cfg)

    # Signal 1: Attendance discrepancy at T=200.0
    anom_att = make_anomaly("CAM-OPS-01", AnomalyType.ATTENDANCE_DISCREPANCY, AnomalySeverity.HIGH, 200.0)
    engine.process_anomalies([anom_att], timestamp_utc=200.0)

    # Signal 2: Crowd surge at T=215.0
    anom_crwd = make_anomaly("CAM-OPS-01", AnomalyType.CROWD_SURGE, AnomalySeverity.HIGH, 215.0)
    incidents = engine.process_anomalies([anom_crwd], timestamp_utc=215.0)

    assert len(incidents) == 1
    inc = incidents[0]
    assert inc.incident_type == IncidentType.OPERATIONAL_ATTENDANCE_ANOMALY
    assert inc.severity == IncidentSeverity.HIGH
    assert "Operational discrepancy correlated" in inc.explanation
    assert "No fraud is asserted" in inc.recommended_action


def test_temporal_correlation_window_expiry():
    cfg = IncidentCorrelationConfig(correlation_window_sec=30.0)  # 30s window
    engine = IncidentCorrelationEngine(camera_id="CAM-01", config=cfg)

    # Signal 1 at T=100.0
    anom_breach = make_anomaly("CAM-01", AnomalyType.RESTRICTED_ZONE_BREACH, AnomalySeverity.CRITICAL, 100.0)
    engine.process_anomalies([anom_breach], timestamp_utc=100.0)

    # Signal 2 at T=140.0 (40s later -> 100.0 has pruned out of 30s window)
    anom_loiter = make_anomaly("CAM-01", AnomalyType.LOITERING_DETECTED, AnomalySeverity.MEDIUM, 140.0)
    incidents = engine.process_anomalies([anom_loiter], timestamp_utc=140.0)

    # No incident formed because breach had expired from active correlation window
    assert len(incidents) == 0


def test_incident_cooldown_and_deduplication():
    cfg = IncidentCorrelationConfig(correlation_window_sec=60.0, incident_cooldown_sec=30.0)
    engine = IncidentCorrelationEngine(camera_id="CAM-01", config=cfg)

    a1 = make_anomaly("CAM-01", AnomalyType.RESTRICTED_ZONE_BREACH, AnomalySeverity.CRITICAL, 100.0)
    a2 = make_anomaly("CAM-01", AnomalyType.LOITERING_DETECTED, AnomalySeverity.MEDIUM, 105.0)

    inc1 = engine.process_anomalies([a1, a2], timestamp_utc=105.0)
    assert len(inc1) == 1

    # Same pattern repeats at T=115.0 (within 30s cooldown) -> Suppressed
    a3 = make_anomaly("CAM-01", AnomalyType.LOITERING_DETECTED, AnomalySeverity.MEDIUM, 115.0)
    inc2 = engine.process_anomalies([a3], timestamp_utc=115.0)
    assert len(inc2) == 0

    # Pattern at T=140.0 (35s later, cooldown expired) -> Emits new incident
    a4 = make_anomaly("CAM-01", AnomalyType.RESTRICTED_ZONE_BREACH, AnomalySeverity.CRITICAL, 140.0)
    inc3 = engine.process_anomalies([a4], timestamp_utc=140.0)
    assert len(inc3) == 1


def test_incident_multi_camera_isolation():
    engine1 = IncidentCorrelationEngine(camera_id="CAM-01")
    engine2 = IncidentCorrelationEngine(camera_id="CAM-02")

    a1 = make_anomaly("CAM-01", AnomalyType.RESTRICTED_ZONE_BREACH, AnomalySeverity.CRITICAL, 100.0)
    a2 = make_anomaly("CAM-01", AnomalyType.LOITERING_DETECTED, AnomalySeverity.MEDIUM, 102.0)

    inc1 = engine1.process_anomalies([a1, a2], timestamp_utc=102.0)
    inc2 = engine2.process_anomalies([], timestamp_utc=102.0)

    assert len(inc1) == 1
    assert inc1[0].camera_id == "CAM-01"
    assert len(inc2) == 0
