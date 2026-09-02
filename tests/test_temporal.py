"""
Unit tests for Temporal Analytics, Loitering, and Operational Schedules.
"""

from datetime import datetime, timezone
import pytest
from ai_subsystem.analytics.schedule import ScheduleEvaluator, is_timestamp_in_window
from ai_subsystem.analytics.spatial import PolygonZoneEngine
from ai_subsystem.analytics.temporal import TemporalEngine
from ai_subsystem.config import TemporalConfig
from ai_subsystem.schemas import (
    OperationalSchedule,
    ScheduleTimeWindow,
    Track,
    TrackState,
    Zone,
    ZoneType,
)


def make_track(
    track_id: int,
    bbox: tuple[float, float, float, float],
    camera_id: str = "CAM-01",
    timestamp: float = 1000.0,
    hits: int = 5
) -> Track:
    x1, y1, x2, y2 = bbox
    return Track(
        track_id=track_id,
        camera_id=camera_id,
        class_id=0,
        class_name="person",
        confidence=0.9,
        current_bbox=bbox,
        trajectory=[((x1 + x2) / 2.0, (y1 + y2) / 2.0)],
        state=TrackState.ACTIVE,
        first_seen_utc=timestamp,
        last_seen_utc=timestamp,
        hits_count=hits
    )


def test_schedule_evaluator_daytime_window():
    # Daytime window: Monday to Friday 09:00 to 18:00
    sched = OperationalSchedule(
        schedule_id="SCHED-DAY",
        name="Business Hours",
        allowed_windows=[
            ScheduleTimeWindow(
                start_time="09:00",
                end_time="18:00",
                days_of_week=[0, 1, 2, 3, 4]  # Mon-Fri
            )
        ]
    )

    # 1. Tuesday 14:30 UTC -> OPERATIONAL (True)
    dt_active = datetime(2026, 9, 8, 14, 30, tzinfo=timezone.utc)  # Tuesday
    assert ScheduleEvaluator.is_operational_time(sched, dt_active.timestamp()) is True

    # 2. Tuesday 21:00 UTC -> AFTER-HOURS (False)
    dt_inactive_night = datetime(2026, 9, 8, 21, 0, tzinfo=timezone.utc)
    assert ScheduleEvaluator.is_operational_time(sched, dt_inactive_night.timestamp()) is False

    # 3. Sunday 12:00 UTC -> AFTER-HOURS (Weekend closed)
    dt_sunday = datetime(2026, 9, 6, 12, 0, tzinfo=timezone.utc)
    assert ScheduleEvaluator.is_operational_time(sched, dt_sunday.timestamp()) is False


def test_schedule_evaluator_overnight_window():
    # Overnight window: Friday night 22:00 to Saturday morning 06:00
    sched = OperationalSchedule(
        schedule_id="SCHED-NIGHT",
        name="Friday Night Shift",
        allowed_windows=[
            ScheduleTimeWindow(
                start_time="22:00",
                end_time="06:00",
                days_of_week=[4],  # Friday
                is_overnight=True
            )
        ]
    )

    # 1. Friday 23:30 UTC -> ACTIVE (Within overnight Friday portion)
    dt_fri_night = datetime(2026, 9, 11, 23, 30, tzinfo=timezone.utc)  # Friday
    assert ScheduleEvaluator.is_operational_time(sched, dt_fri_night.timestamp()) is True

    # 2. Saturday 04:00 UTC -> ACTIVE (Within overnight Saturday morning portion)
    dt_sat_morning = datetime(2026, 9, 12, 4, 0, tzinfo=timezone.utc)  # Saturday
    assert ScheduleEvaluator.is_operational_time(sched, dt_sat_morning.timestamp()) is True

    # 3. Saturday 12:00 UTC -> AFTER-HOURS (Past morning window)
    dt_sat_afternoon = datetime(2026, 9, 12, 12, 0, tzinfo=timezone.utc)
    assert ScheduleEvaluator.is_operational_time(sched, dt_sat_afternoon.timestamp()) is False


def test_loitering_detection_with_confirmation_and_deduplication():
    cfg = TemporalConfig(
        default_loitering_threshold_sec=10.0,
        loitering_confirmation_frames=3
    )
    temporal_engine = TemporalEngine(camera_id="CAM-01", config=cfg)
    zone_engine = PolygonZoneEngine(camera_id="CAM-01")
    
    zone = Zone(
        zone_id="ZN-VAULT",
        camera_id="CAM-01",
        name="Vault Lobby",
        polygon=[(0.0, 0.0), (100.0, 0.0), (100.0, 100.0), (0.0, 100.0)],
        loitering_threshold_sec=5.0  # 5s loiter threshold
    )
    zone_engine.add_zone(zone)

    # Time T=0: Enter zone
    t0 = make_track(track_id=10, bbox=(20, 20, 60, 60), timestamp=0.0)
    zone_engine.update([t0], timestamp_utc=0.0)
    loit_ev, _ = temporal_engine.update([t0], zone_engine, timestamp_utc=0.0)
    assert len(loit_ev) == 0

    # Time T=6s: Dwell time is 6s (>= 5s), but confirmation frames = 1 (needs 3)
    t6 = make_track(track_id=10, bbox=(20, 20, 60, 60), timestamp=6.0)
    zone_engine.update([t6], timestamp_utc=6.0)
    loit_ev, _ = temporal_engine.update([t6], zone_engine, timestamp_utc=6.0)
    assert len(loit_ev) == 0  # Frame 1 of confirmation

    # Time T=7s: Frame 2 of confirmation
    t7 = make_track(track_id=10, bbox=(20, 20, 60, 60), timestamp=7.0)
    zone_engine.update([t7], timestamp_utc=7.0)
    loit_ev, _ = temporal_engine.update([t7], zone_engine, timestamp_utc=7.0)
    assert len(loit_ev) == 0  # Frame 2 of confirmation

    # Time T=8s: Frame 3 of confirmation -> LOITERING EVENT EMITTED!
    t8 = make_track(track_id=10, bbox=(20, 20, 60, 60), timestamp=8.0)
    zone_engine.update([t8], timestamp_utc=8.0)
    loit_ev, _ = temporal_engine.update([t8], zone_engine, timestamp_utc=8.0)
    assert len(loit_ev) == 1
    assert loit_ev[0].track_id == 10
    assert loit_ev[0].zone_id == "ZN-VAULT"
    assert loit_ev[0].dwell_time_sec == 8.0
    assert "LOITERING" in loit_ev[0].explanation

    # Time T=9s: Continuing to dwell -> Duplicate alert suppressed!
    t9 = make_track(track_id=10, bbox=(20, 20, 60, 60), timestamp=9.0)
    zone_engine.update([t9], timestamp_utc=9.0)
    loit_ev, _ = temporal_engine.update([t9], zone_engine, timestamp_utc=9.0)
    assert len(loit_ev) == 0  # Suppressed!
