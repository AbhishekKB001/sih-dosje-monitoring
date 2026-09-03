"""
Unit tests for Member 4 Occupancy and Crowd Analytics (Phase 4).
Tests zero occupancy, single/multiple people, duplicate track deduplication,
zone-specific occupancy, windowed stats (peak/min/avg), crowd warning/critical thresholds,
temporal confirmation, and multi-camera isolation.
"""

import pytest

from ai_subsystem.analytics.occupancy import CrowdAnalyticsEngine, OccupancyAnalyzer
from ai_subsystem.analytics.spatial import PolygonZoneEngine
from ai_subsystem.config import OccupancyConfig
from ai_subsystem.schemas import CrowdSeverity, Track, TrackState, Zone, ZoneType


def make_track(
    track_id: int,
    bbox: tuple[float, float, float, float],
    class_name: str = "person",
    state: TrackState = TrackState.ACTIVE,
    timestamp: float = 100.0
) -> Track:
    return Track(
        track_id=track_id,
        camera_id="CAM-01",
        class_id=0,
        class_name=class_name,
        confidence=0.9,
        current_bbox=bbox,
        state=state,
        first_seen_utc=timestamp,
        last_seen_utc=timestamp,
        hits_count=5,
        time_since_update=0,
        trajectory=[((bbox[0] + bbox[2]) / 2, bbox[3])]
    )


def test_zero_occupancy():
    analyzer = OccupancyAnalyzer(camera_id="CAM-01")
    cam_snap, zone_snaps = analyzer.update([], timestamp_utc=100.0)
    assert cam_snap.current_occupancy == 0
    assert cam_snap.peak_occupancy == 0
    assert cam_snap.min_occupancy == 0
    assert cam_snap.avg_occupancy == 0.0
    assert cam_snap.active_track_ids == []
    assert zone_snaps == []


def test_single_and_multiple_people_occupancy():
    analyzer = OccupancyAnalyzer(camera_id="CAM-01")
    t1 = make_track(1, (10, 10, 30, 50))
    t2 = make_track(2, (60, 10, 80, 50))

    # Single person
    cam_snap, _ = analyzer.update([t1], timestamp_utc=100.0)
    assert cam_snap.current_occupancy == 1
    assert cam_snap.active_track_ids == [1]

    # Two people
    cam_snap, _ = analyzer.update([t1, t2], timestamp_utc=101.0)
    assert cam_snap.current_occupancy == 2
    assert cam_snap.active_track_ids == [1, 2]


def test_duplicate_track_id_deduplication():
    analyzer = OccupancyAnalyzer(camera_id="CAM-01")
    t1_a = make_track(1, (10, 10, 30, 50))
    t1_b = make_track(1, (10, 10, 30, 50))  # Duplicate ID in same frame

    cam_snap, _ = analyzer.update([t1_a, t1_b], timestamp_utc=100.0)
    assert cam_snap.current_occupancy == 1
    assert cam_snap.active_track_ids == [1]


def test_non_person_class_filtering():
    analyzer = OccupancyAnalyzer(camera_id="CAM-01")
    person_track = make_track(1, (10, 10, 30, 50), class_name="person")
    car_track = make_track(2, (60, 10, 120, 80), class_name="car")
    chair_track = make_track(3, (130, 10, 150, 40), class_name="chair")

    cam_snap, _ = analyzer.update([person_track, car_track, chair_track], timestamp_utc=100.0)
    assert cam_snap.current_occupancy == 1
    assert cam_snap.active_track_ids == [1]


def test_zone_specific_occupancy():
    analyzer = OccupancyAnalyzer(camera_id="CAM-01")
    zone_engine = PolygonZoneEngine(camera_id="CAM-01")

    # Zone covering (0,0) to (100,100)
    room_a = Zone(
        zone_id="ZN-ROOM-A",
        camera_id="CAM-01",
        name="Conference Room A",
        polygon=[(0.0, 0.0), (100.0, 0.0), (100.0, 100.0), (0.0, 100.0)]
    )
    zone_engine.add_zone(room_a)

    # Person 1 inside Room A (bottom center = (30, 60))
    t1 = make_track(1, (20, 20, 40, 60))
    # Person 2 outside Room A (bottom center = (150, 60))
    t2 = make_track(2, (140, 20, 160, 60))

    cam_snap, zone_snaps = analyzer.update([t1, t2], zone_engine=zone_engine, timestamp_utc=100.0)
    assert cam_snap.current_occupancy == 2
    assert len(zone_snaps) == 1
    assert zone_snaps[0].zone_id == "ZN-ROOM-A"
    assert zone_snaps[0].current_occupancy == 1
    assert zone_snaps[0].active_track_ids == [1]


def test_windowed_occupancy_peak_min_avg():
    # 60-second window
    cfg = OccupancyConfig(window_duration_sec=60.0)
    analyzer = OccupancyAnalyzer(camera_id="CAM-01", config=cfg)

    # T=0: 2 people
    t1, t2 = make_track(1, (10, 10, 20, 20)), make_track(2, (30, 10, 40, 20))
    snap1, _ = analyzer.update([t1, t2], timestamp_utc=0.0)
    assert snap1.peak_occupancy == 2
    assert snap1.min_occupancy == 2
    assert snap1.avg_occupancy == 2.0

    # T=10: 5 people
    tracks_5 = [make_track(i, (i * 10, 10, i * 10 + 5, 20)) for i in range(1, 6)]
    snap2, _ = analyzer.update(tracks_5, timestamp_utc=10.0)
    assert snap2.peak_occupancy == 5
    assert snap2.min_occupancy == 2
    assert snap2.avg_occupancy == 3.5  # (2 + 5)/2

    # T=20: 1 person
    snap3, _ = analyzer.update([t1], timestamp_utc=20.0)
    assert snap3.peak_occupancy == 5
    assert snap3.min_occupancy == 1
    assert round(snap3.avg_occupancy, 2) == round((2 + 5 + 1) / 3, 2)

    # T=70: T=0 has expired (cutoff is 70-60 = 10)
    snap4, _ = analyzer.update([t1], timestamp_utc=70.0)
    # Window now contains T=10 (5), T=20 (1), T=70 (1)
    assert snap4.peak_occupancy == 5
    assert snap4.min_occupancy == 1
    assert round(snap4.avg_occupancy, 2) == round((5 + 1 + 1) / 3, 2)


def test_crowd_thresholds_temporal_confirmation_and_cooldown():
    cfg = OccupancyConfig(
        confirmation_frames=2,
        alert_cooldown_sec=10.0
    )
    crowd_engine = CrowdAnalyticsEngine(camera_id="CAM-01", config=cfg)
    analyzer = OccupancyAnalyzer(camera_id="CAM-01", config=cfg)
    zone_engine = PolygonZoneEngine(camera_id="CAM-01")

    # Room A: max capacity = 5, warning = 4, critical = 6
    room_a = Zone(
        zone_id="ZN-A",
        camera_id="CAM-01",
        name="Lab Room",
        polygon=[(0.0, 0.0), (100.0, 0.0), (100.0, 100.0), (0.0, 100.0)],
        max_capacity=5,
        warning_threshold=4,
        critical_threshold=6
    )
    zone_engine.add_zone(room_a)

    # 4 people (warning threshold reached)
    tracks_4 = [make_track(i, (20, 20, 30, 40)) for i in range(1, 5)]

    # Frame 1: Exceeds warning threshold, but confirmation_frames=2 -> no event yet
    c_snap, z_snaps = analyzer.update(tracks_4, zone_engine=zone_engine, timestamp_utc=100.0)
    ev1 = crowd_engine.evaluate(c_snap, z_snaps, zone_engine.get_zones(), timestamp_utc=100.0)
    assert len(ev1) == 0

    # Frame 2: Confirmed across 2 frames -> CROWD WARNING event emitted!
    c_snap, z_snaps = analyzer.update(tracks_4, zone_engine=zone_engine, timestamp_utc=101.0)
    ev2 = crowd_engine.evaluate(c_snap, z_snaps, zone_engine.get_zones(), timestamp_utc=101.0)
    assert len(ev2) == 1
    assert ev2[0].severity == CrowdSeverity.WARNING
    assert ev2[0].zone_id == "ZN-A"
    assert ev2[0].current_occupancy == 4
    assert "WARNING" in ev2[0].explanation

    # Frame 3: Cooldown active (last alert was at 101.0, cooldown is 10s) -> suppressed
    c_snap, z_snaps = analyzer.update(tracks_4, zone_engine=zone_engine, timestamp_utc=102.0)
    ev3 = crowd_engine.evaluate(c_snap, z_snaps, zone_engine.get_zones(), timestamp_utc=102.0)
    assert len(ev3) == 0

    # Frame 4 (at T=111s, 10s later): Now 6 people -> 2nd confirmation reached and cooldown expired -> CRITICAL capacity event emitted!
    tracks_6 = [make_track(i, (20, 20, 30, 40)) for i in range(1, 7)]
    c_snap, z_snaps = analyzer.update(tracks_6, zone_engine=zone_engine, timestamp_utc=111.0)
    ev4 = crowd_engine.evaluate(c_snap, z_snaps, zone_engine.get_zones(), timestamp_utc=111.0)
    assert len(ev4) == 1
    assert ev4[0].severity == CrowdSeverity.CRITICAL
    assert ev4[0].current_occupancy == 6
    assert "CRITICAL" in ev4[0].explanation


def test_multi_camera_occupancy_isolation():
    analyzer_cam1 = OccupancyAnalyzer(camera_id="CAM-01")
    analyzer_cam2 = OccupancyAnalyzer(camera_id="CAM-02")

    t1 = make_track(1, (10, 10, 30, 50))
    t2 = make_track(2, (10, 10, 30, 50))
    t3 = make_track(3, (10, 10, 30, 50))

    # Cam 1 sees 1 person, Cam 2 sees 2 people
    snap1, _ = analyzer_cam1.update([t1], timestamp_utc=100.0)
    snap2, _ = analyzer_cam2.update([t2, t3], timestamp_utc=100.0)

    assert snap1.camera_id == "CAM-01"
    assert snap1.current_occupancy == 1
    assert snap1.active_track_ids == [1]

    assert snap2.camera_id == "CAM-02"
    assert snap2.current_occupancy == 2
    assert snap2.active_track_ids == [2, 3]
