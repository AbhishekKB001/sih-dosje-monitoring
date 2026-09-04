"""
Unit tests for Non-Biometric Attendance Consistency Engine (Phase 4).
Validates anonymous comparison between reported attendance figures and observed occupancy,
discrepancy thresholds, tolerance boundaries, cooldown behavior, and mandated neutral phrasing.
"""

import pytest

from ai_subsystem.analytics.attendance import AttendanceConsistencyEngine
from ai_subsystem.config import AttendanceConsistencyConfig
from ai_subsystem.schemas import OccupancySnapshot, ReportedAttendance


def make_snapshot(
    camera_id: str = "CAM-01",
    zone_id: str = None,
    zone_name: str = None,
    current: int = 12,
    peak: int = 12,
    avg: float = 10.0,
    window_sec: float = 900.0,
    timestamp: float = 1000.0
) -> OccupancySnapshot:
    return OccupancySnapshot(
        timestamp_utc=timestamp,
        camera_id=camera_id,
        zone_id=zone_id,
        zone_name=zone_name,
        current_occupancy=current,
        peak_occupancy=peak,
        min_occupancy=current,
        avg_occupancy=avg,
        window_duration_sec=window_sec,
        active_track_ids=list(range(1, current + 1))
    )


def test_attendance_discrepancy_detection_and_neutral_language():
    cfg = AttendanceConsistencyConfig(
        tolerance_percentage=25.0,
        min_tolerance_absolute=5,
        use_peak_occupancy=True
    )
    engine = AttendanceConsistencyEngine(camera_id="CAM-01", config=cfg)

    # Official reported attendance is 40 attendees
    rep = ReportedAttendance(
        institution_id="INST-DoSJE-04",
        camera_id="CAM-01",
        session_name="Morning Shift",
        reported_count=40
    )
    engine.register_reported_attendance(rep)

    # Observed peak occupancy in camera FOV is 12 (diff = 28, pct = 70.0% > 25.0%)
    snap = make_snapshot(camera_id="CAM-01", current=10, peak=12, window_sec=900.0, timestamp=1000.0)

    event = engine.evaluate_consistency(snap, timestamp_utc=1000.0)

    assert event is not None
    assert event.camera_id == "CAM-01"
    assert event.institution_id == "INST-DoSJE-04"
    assert event.reported_attendance == 40
    assert event.observed_occupancy == 12
    assert event.discrepancy_value == 28
    assert event.discrepancy_percentage == 70.0
    assert event.tolerance_percentage == 25.0
    assert event.observation_window_sec == 900.0

    # MANDATORY LANGUAGE REQUIREMENT VERIFICATION
    # Must contain the designated neutral operational notice:
    assert "Observed occupancy differs materially from reported attendance. Operational verification recommended." in event.explanation

    # Must NEVER claim fraud, ghost beneficiaries, fake people, or fraud committed:
    forbidden_terms = ["fraud", "ghost", "fake people", "fraud committed", "fraudulent", "fake person"]
    for term in forbidden_terms:
        assert term not in event.explanation.lower(), f"Forbidden term '{term}' found in explanation!"


def test_attendance_within_tolerance_generates_no_event():
    cfg = AttendanceConsistencyConfig(
        tolerance_percentage=25.0,
        min_tolerance_absolute=5
    )
    engine = AttendanceConsistencyEngine(camera_id="CAM-01", config=cfg)

    # Reported: 40 attendees
    rep = ReportedAttendance(
        institution_id="INST-DoSJE-04",
        camera_id="CAM-01",
        reported_count=40
    )
    engine.register_reported_attendance(rep)

    # Observed peak: 35 attendees (diff = 5, pct = 12.5% <= 25.0% tolerance)
    snap = make_snapshot(camera_id="CAM-01", current=35, peak=35, timestamp=1000.0)

    event = engine.evaluate_consistency(snap, timestamp_utc=1000.0)
    assert event is None


def test_small_absolute_difference_tolerance():
    cfg = AttendanceConsistencyConfig(
        tolerance_percentage=20.0,
        min_tolerance_absolute=5  # Requires at least 5 people difference
    )
    engine = AttendanceConsistencyEngine(camera_id="CAM-01", config=cfg)

    # Reported: 10 attendees
    rep = ReportedAttendance(
        institution_id="INST-DoSJE-04",
        camera_id="CAM-01",
        reported_count=10
    )
    engine.register_reported_attendance(rep)

    # Observed peak: 7 attendees (diff = 3, pct = 30% > 20%, but abs_diff 3 < min_tolerance_absolute 5)
    snap = make_snapshot(camera_id="CAM-01", current=7, peak=7, timestamp=1000.0)

    event = engine.evaluate_consistency(snap, timestamp_utc=1000.0)
    # Suppressed because difference is within absolute noise margin
    assert event is None


def test_low_reported_attendance_handling():
    cfg = AttendanceConsistencyConfig(
        min_reported_attendance_for_check=5
    )
    engine = AttendanceConsistencyEngine(camera_id="CAM-01", config=cfg)

    # Reported: 3 attendees (< min_reported_attendance_for_check 5)
    rep = ReportedAttendance(
        institution_id="INST-DoSJE-04",
        camera_id="CAM-01",
        reported_count=3
    )
    engine.register_reported_attendance(rep)

    snap = make_snapshot(camera_id="CAM-01", current=0, peak=0, timestamp=1000.0)
    event = engine.evaluate_consistency(snap, timestamp_utc=1000.0)
    assert event is None


def test_attendance_alert_cooldown():
    cfg = AttendanceConsistencyConfig(tolerance_percentage=20.0, min_tolerance_absolute=5)
    engine = AttendanceConsistencyEngine(camera_id="CAM-01", config=cfg)

    rep = ReportedAttendance(
        institution_id="INST-DoSJE-04",
        camera_id="CAM-01",
        reported_count=50
    )
    engine.register_reported_attendance(rep)

    snap = make_snapshot(camera_id="CAM-01", peak=10, timestamp=1000.0)

    # First evaluation at T=1000.0 -> Event emitted
    ev1 = engine.evaluate_consistency(snap, timestamp_utc=1000.0, alert_cooldown_sec=60.0)
    assert ev1 is not None

    # Immediate second evaluation at T=1005.0 -> Cooldown active, suppressed
    ev2 = engine.evaluate_consistency(snap, timestamp_utc=1005.0, alert_cooldown_sec=60.0)
    assert ev2 is None

    # After cooldown expires at T=1065.0 -> Event emitted
    ev3 = engine.evaluate_consistency(snap, timestamp_utc=1065.0, alert_cooldown_sec=60.0)
    assert ev3 is not None


def test_multi_camera_attendance_isolation():
    cfg = AttendanceConsistencyConfig(tolerance_percentage=20.0, min_tolerance_absolute=5)
    engine_cam1 = AttendanceConsistencyEngine(camera_id="CAM-01", config=cfg)
    engine_cam2 = AttendanceConsistencyEngine(camera_id="CAM-02", config=cfg)

    # Cam 1 has reported 50
    rep1 = ReportedAttendance(institution_id="INST-01", camera_id="CAM-01", reported_count=50)
    engine_cam1.register_reported_attendance(rep1)

    # Cam 2 has reported 15
    rep2 = ReportedAttendance(institution_id="INST-02", camera_id="CAM-02", reported_count=15)
    engine_cam2.register_reported_attendance(rep2)

    # Cam 1 observes 10 (discrepancy for 50)
    snap1 = make_snapshot(camera_id="CAM-01", peak=10, timestamp=1000.0)
    # Cam 2 observes 14 (within tolerance for 15)
    snap2 = make_snapshot(camera_id="CAM-02", peak=14, timestamp=1000.0)

    ev1 = engine_cam1.evaluate_consistency(snap1, timestamp_utc=1000.0)
    ev2 = engine_cam2.evaluate_consistency(snap2, timestamp_utc=1000.0)

    assert ev1 is not None
    assert ev1.camera_id == "CAM-01"
    assert ev1.reported_attendance == 50

    assert ev2 is None  # Cam 2 is within tolerance
