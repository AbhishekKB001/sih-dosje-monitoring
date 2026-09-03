"""
Integration tests for AIPipelineOrchestrator Phase 3 Spatial & Temporal Intelligence.
"""

import numpy as np
import pytest
from ai_subsystem.config import (
    AIConfig,
    SingleCameraConfig,
    SourceType,
    SpatialConfig,
    TemporalConfig,
)
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import (
    Detection,
    FramePayload,
    OperationalSchedule,
    ScheduleTimeWindow,
    TrackState,
    VirtualLine,
    VisualHealthResult,
    VisualHealthState,
    Zone,
    ZoneEventType,
    ZoneType,
)
from ai_subsystem.vision.detector import DeterministicMockDetector


def make_frame(camera_id: str, frame_index: int = 1, timestamp: float = 1000.0) -> FramePayload:
    frame = np.ones((480, 640, 3), dtype=np.uint8) * 128
    return FramePayload(
        camera_id=camera_id,
        frame_index=frame_index,
        timestamp_utc=timestamp,
        frame_bgr=frame
    )


def test_orchestrator_phase3_full_spatial_temporal_pipeline():
    # 1. Setup schedule (09:00 - 17:00 Mon-Fri)
    schedule = OperationalSchedule(
        schedule_id="SCHED-MAIN",
        name="Main Operating Hours",
        allowed_windows=[
            ScheduleTimeWindow(start_time="09:00", end_time="17:00", days_of_week=[0, 1, 2, 3, 4])
        ]
    )

    # 2. Setup restricted zone and tripwire line
    restricted_zone = Zone(
        zone_id="ZN-RESTRICTED-01",
        camera_id="CAM-P3-01",
        name="Server Room Area",
        zone_type=ZoneType.RESTRICTED,
        polygon=[(100.0, 50.0), (300.0, 50.0), (300.0, 300.0), (100.0, 300.0)],
        loitering_threshold_sec=3.0
    )
    tripwire = VirtualLine(
        line_id="LN-ENTRY-01",
        camera_id="CAM-P3-01",
        name="Doorway Tripwire",
        pt1=(100.0, 0.0),
        pt2=(100.0, 480.0)
    )

    config = AIConfig(
        temporal=TemporalConfig(
            default_loitering_threshold_sec=3.0,
            loitering_confirmation_frames=2,
            schedules=[schedule]
        )
    )
    mock_detector = DeterministicMockDetector(config=config.detector)
    orchestrator = AIPipelineOrchestrator(config=config, detector=mock_detector)

    cam_cfg = SingleCameraConfig(
        camera_id="CAM-P3-01",
        source_type=SourceType.DEMO,
        uri="dummy.mp4",
        schedule_id="SCHED-MAIN",
        spatial=SpatialConfig(
            zones=[restricted_zone],
            lines=[tripwire]
        )
    )
    orchestrator.register_camera(cam_cfg)

    health_ok = VisualHealthResult(
        camera_id="CAM-P3-01", frame_index=1, state=VisualHealthState.HEALTHY, is_healthy=True
    )

    # Sunday 22:00 UTC (After-Hours timestamp = 1788732000.0)
    ts_base = 1788732000.0

    # Step 1: Person appears left of doorway (x=50, NEW track)
    mock_detector.set_mock_detections([
        Detection(camera_id="CAM-P3-01", frame_index=1, timestamp_utc=ts_base, class_id=0, class_name="person", confidence=0.9, bbox=(20, 100, 80, 200))
    ])
    res_f1 = orchestrator.process_frame(make_frame("CAM-P3-01", 1, ts_base), health_ok)
    assert res_f1["status"] == "PROCESSED"

    # Step 2: Person advances (x=80, becomes ACTIVE track during After-Hours)
    ts_f2 = ts_base + 0.5
    mock_detector.set_mock_detections([
        Detection(camera_id="CAM-P3-01", frame_index=2, timestamp_utc=ts_f2, class_id=0, class_name="person", confidence=0.9, bbox=(50, 100, 110, 200))
    ])
    res_f2 = orchestrator.process_frame(make_frame("CAM-P3-01", 2, ts_f2), health_ok)
    assert len(res_f2["active_tracks"]) == 1
    # After-hours security event detected on active track!
    assert len(res_f2["after_hours_events"]) == 1
    assert "AFTER-HOURS" in res_f2["after_hours_events"][0]["explanation"]

    # Step 3: Person crosses tripwire (x=100) and enters restricted zone (x=110)
    ts_f3 = ts_base + 1.0
    mock_detector.set_mock_detections([
        Detection(camera_id="CAM-P3-01", frame_index=3, timestamp_utc=ts_f3, class_id=0, class_name="person", confidence=0.9, bbox=(80, 100, 140, 200))
    ])
    res_f3 = orchestrator.process_frame(make_frame("CAM-P3-01", 3, ts_f3), health_ok)

    # Line crossing detected!
    assert len(res_f3["line_events"]) == 1
    assert res_f3["line_events"][0]["line_id"] == "LN-ENTRY-01"

    # Restricted zone breach detected!
    assert len(res_f3["zone_events"]) == 1
    assert res_f3["zone_events"][0]["event_type"] == ZoneEventType.RESTRICTED_ZONE_BREACH.value
    assert "BREACHED" in res_f3["zone_events"][0]["explanation"]

    # Step 4 & 5: Person dwells inside restricted zone past threshold (4 seconds later)
    ts_f4 = ts_f3 + 4.0
    mock_detector.set_mock_detections([
        Detection(camera_id="CAM-P3-01", frame_index=4, timestamp_utc=ts_f4, class_id=0, class_name="person", confidence=0.9, bbox=(82, 100, 142, 200))
    ])
    orchestrator.process_frame(make_frame("CAM-P3-01", 4, ts_f4), health_ok)

    ts_f5 = ts_f4 + 0.5
    mock_detector.set_mock_detections([
        Detection(camera_id="CAM-P3-01", frame_index=5, timestamp_utc=ts_f5, class_id=0, class_name="person", confidence=0.9, bbox=(84, 100, 144, 200))
    ])
    res_f5 = orchestrator.process_frame(make_frame("CAM-P3-01", 5, ts_f5), health_ok)

    # Loitering event confirmed!
    assert len(res_f5["loitering_events"]) == 1
    assert res_f5["loitering_events"][0]["zone_id"] == "ZN-RESTRICTED-01"
    assert "LOITERING" in res_f5["loitering_events"][0]["explanation"]
