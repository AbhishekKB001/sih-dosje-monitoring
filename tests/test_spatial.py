"""
Unit tests for Spatial Polygon Zones and Virtual Line Crossing Analytics.
"""

import pytest
from ai_subsystem.analytics.spatial import (
    LineCrossingEngine,
    PolygonZoneEngine,
    calculate_crossing_direction,
    do_segments_intersect,
    is_point_in_polygon,
)
from ai_subsystem.config import SpatialConfig
from ai_subsystem.schemas import (
    Track,
    TrackState,
    VirtualLine,
    Zone,
    ZoneEventType,
    ZoneType,
)


def make_track(
    track_id: int,
    bbox: tuple[float, float, float, float],
    camera_id: str = "CAM-SPATIAL-01",
    timestamp: float = 1000.0
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
        hits_count=3
    )


def test_point_in_polygon_geometry():
    # Square polygon: (100, 100) to (300, 300)
    polygon = [(100.0, 100.0), (300.0, 100.0), (300.0, 300.0), (100.0, 300.0)]

    inside_pt = (200.0, 200.0)
    outside_pt = (50.0, 50.0)
    edge_pt = (100.0, 200.0)

    assert is_point_in_polygon(inside_pt, polygon) is True
    assert is_point_in_polygon(outside_pt, polygon) is False
    assert is_point_in_polygon(edge_pt, polygon) is True


def test_zone_engine_entry_and_exit_transitions():
    cfg = SpatialConfig(bottom_center_anchoring=True)
    engine = PolygonZoneEngine(camera_id="CAM-01", config=cfg)

    # Monitored corridor zone: (100, 100) -> (300, 300)
    zone = Zone(
        zone_id="ZN-CORRIDOR",
        camera_id="CAM-01",
        name="Main Corridor",
        zone_type=ZoneType.MONITORED,
        polygon=[(100.0, 100.0), (300.0, 100.0), (300.0, 300.0), (100.0, 300.0)]
    )
    engine.add_zone(zone)

    # Frame 1: Person outside zone
    t1 = make_track(track_id=1, bbox=(10.0, 10.0, 40.0, 60.0), timestamp=10.0)
    events_f1 = engine.update([t1], timestamp_utc=10.0)
    assert len(events_f1) == 0

    # Frame 2: Person enters zone (bottom center is (200, 200))
    t2 = make_track(track_id=1, bbox=(180.0, 140.0, 220.0, 200.0), timestamp=11.0)
    events_f2 = engine.update([t2], timestamp_utc=11.0)
    assert len(events_f2) == 1
    assert events_f2[0].event_type == ZoneEventType.ZONE_ENTER
    assert events_f2[0].zone_id == "ZN-CORRIDOR"
    assert events_f2[0].track_id == 1

    # Frame 3: Person continues dwelling inside (no redundant entry event)
    t3 = make_track(track_id=1, bbox=(185.0, 145.0, 225.0, 205.0), timestamp=15.0)
    events_f3 = engine.update([t3], timestamp_utc=15.0)
    assert len(events_f3) == 0
    assert engine.get_track_dwell_time(1, "ZN-CORRIDOR", current_timestamp_utc=15.0) == 4.0

    # Frame 4: Person exits zone
    t4 = make_track(track_id=1, bbox=(400.0, 400.0, 450.0, 480.0), timestamp=16.0)
    events_f4 = engine.update([t4], timestamp_utc=16.0)
    assert len(events_f4) == 1
    assert events_f4[0].event_type == ZoneEventType.ZONE_EXIT
    assert events_f4[0].dwell_time_sec == 5.0


def test_restricted_zone_breach_detection():
    engine = PolygonZoneEngine(camera_id="CAM-01")
    restricted_zone = Zone(
        zone_id="ZN-SERVER-ROOM",
        camera_id="CAM-01",
        name="Server Room",
        zone_type=ZoneType.RESTRICTED,
        polygon=[(100.0, 100.0), (200.0, 100.0), (200.0, 200.0), (100.0, 200.0)]
    )
    engine.add_zone(restricted_zone)

    track_breach = make_track(track_id=42, bbox=(140.0, 120.0, 160.0, 180.0), timestamp=100.0)
    events = engine.update([track_breach], timestamp_utc=100.0)

    assert len(events) == 1
    assert events[0].event_type == ZoneEventType.RESTRICTED_ZONE_BREACH
    assert "BREACHED" in events[0].explanation


def test_line_crossing_and_direction():
    # Vertical line at x=200 from y=50 to y=400
    line_p1 = (200.0, 50.0)
    line_p2 = (200.0, 400.0)

    # Trajectory crossing left to right: (150, 200) -> (250, 200)
    start_pt = (150.0, 200.0)
    end_pt = (250.0, 200.0)

    assert do_segments_intersect(start_pt, end_pt, line_p1, line_p2) is True
    direction = calculate_crossing_direction(start_pt, end_pt, line_p1, line_p2)
    assert direction in ("IN", "OUT")

    # Non-intersecting trajectory: (10, 10) -> (50, 50)
    assert do_segments_intersect((10.0, 10.0), (50.0, 50.0), line_p1, line_p2) is False


def test_line_crossing_engine_event_emission():
    engine = LineCrossingEngine(camera_id="CAM-01")
    tripwire = VirtualLine(
        line_id="LN-ENTRY",
        camera_id="CAM-01",
        name="Main Entrance Line",
        pt1=(200.0, 0.0),
        pt2=(200.0, 480.0),
        direction_label_in="ENTRY",
        direction_label_out="EXIT"
    )
    engine.add_line(tripwire)

    # Step 1: Track positioned on left side of line (x=150)
    t_step1 = make_track(track_id=7, bbox=(130.0, 100.0, 170.0, 200.0), timestamp=1.0)
    ev_1 = engine.update([t_step1], timestamp_utc=1.0)
    assert len(ev_1) == 0

    # Step 2: Track moves across line to right side (x=250)
    t_step2 = make_track(track_id=7, bbox=(230.0, 100.0, 270.0, 200.0), timestamp=1.1)
    ev_2 = engine.update([t_step2], timestamp_utc=1.1)
    assert len(ev_2) == 1
    assert ev_2[0].line_id == "LN-ENTRY"
    assert ev_2[0].track_id == 7
    assert ev_2[0].direction in ("ENTRY", "EXIT")


def test_spatial_multi_camera_isolation():
    engine_a = PolygonZoneEngine(camera_id="CAM-A")
    engine_b = PolygonZoneEngine(camera_id="CAM-B")

    engine_a.add_zone(Zone(
        zone_id="ZN-A", camera_id="CAM-A", name="Zone A",
        polygon=[(0, 0), (100, 0), (100, 100), (0, 100)]
    ))

    # Track on Camera B in zone coordinates should NOT trigger on Camera B (isolated engine)
    track_b = make_track(track_id=1, bbox=(10, 10, 50, 50), camera_id="CAM-B")
    events_b = engine_b.update([track_b])
    assert len(events_b) == 0
    assert len(engine_b.get_zones()) == 0
