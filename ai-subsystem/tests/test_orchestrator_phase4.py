"""
End-to-End Orchestrator Integration Tests for Phase 4:
Occupancy, Crowd Analytics, and Non-Biometric Attendance Consistency.
"""

import numpy as np
import pytest

from ai_subsystem.config import (
    AIConfig,
    AttendanceConsistencyConfig,
    OccupancyConfig,
    SingleCameraConfig,
    SourceType,
    SpatialConfig,
)
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import (
    CrowdSeverity,
    Detection,
    FramePayload,
    ReportedAttendance,
    VisualHealthResult,
    VisualHealthState,
    Zone,
    ZoneType,
)
from ai_subsystem.vision.detector import DeterministicMockDetector


def make_frame(camera_id: str, frame_index: int, timestamp: float) -> FramePayload:
    dummy_img = np.zeros((480, 640, 3), dtype=np.uint8)
    return FramePayload(
        camera_id=camera_id,
        institution_id="INST-DoSJE-DEMO",
        frame_index=frame_index,
        timestamp_utc=timestamp,
        frame_bgr=dummy_img,
        source_fps=25.0
    )


def test_orchestrator_phase4_occupancy_and_attendance_pipeline():
    # 1. Setup Zone with crowd thresholds
    activity_hall = Zone(
        zone_id="ZN-HALL-01",
        camera_id="CAM-P4-01",
        name="Activity Hall",
        zone_type=ZoneType.COMMON_AREA,
        polygon=[(50.0, 50.0), (400.0, 50.0), (400.0, 400.0), (50.0, 400.0)],
        max_capacity=5,
        warning_threshold=4,
        critical_threshold=6
    )

    config = AIConfig(
        occupancy=OccupancyConfig(
            confirmation_frames=2,
            alert_cooldown_sec=30.0
        ),
        attendance=AttendanceConsistencyConfig(
            tolerance_percentage=25.0,
            min_tolerance_absolute=5,
            use_peak_occupancy=True
        )
    )
    mock_detector = DeterministicMockDetector(config=config.detector)
    orchestrator = AIPipelineOrchestrator(config=config, detector=mock_detector)

    cam_cfg = SingleCameraConfig(
        camera_id="CAM-P4-01",
        source_type=SourceType.DEMO,
        uri="dummy.mp4",
        spatial=SpatialConfig(zones=[activity_hall]),
        occupancy=config.occupancy,
        attendance=config.attendance
    )
    orchestrator.register_camera(cam_cfg)

    # Register official administrative reported attendance: 30 attendees
    orchestrator.register_reported_attendance(
        ReportedAttendance(
            institution_id="INST-DoSJE-DEMO",
            camera_id="CAM-P4-01",
            session_name="Skill Training",
            reported_count=30
        )
    )

    health_ok = VisualHealthResult(
        camera_id="CAM-P4-01", frame_index=1, state=VisualHealthState.HEALTHY, is_healthy=True
    )

    ts_base = 1000.0

    # Step 1: 4 people inside Activity Hall (NEW tracks)
    # Box 1: (100, 100, 140, 200) -> bottom center (120, 200)
    # Box 2: (150, 100, 190, 200) -> bottom center (170, 200)
    # Box 3: (200, 100, 240, 200) -> bottom center (220, 200)
    # Box 4: (250, 100, 290, 200) -> bottom center (270, 200)
    dets_step1 = [
        Detection(camera_id="CAM-P4-01", frame_index=1, timestamp_utc=ts_base, class_id=0, class_name="person", confidence=0.9, bbox=(100, 100, 140, 200)),
        Detection(camera_id="CAM-P4-01", frame_index=1, timestamp_utc=ts_base, class_id=0, class_name="person", confidence=0.9, bbox=(150, 100, 190, 200)),
        Detection(camera_id="CAM-P4-01", frame_index=1, timestamp_utc=ts_base, class_id=0, class_name="person", confidence=0.9, bbox=(200, 100, 240, 200)),
        Detection(camera_id="CAM-P4-01", frame_index=1, timestamp_utc=ts_base, class_id=0, class_name="person", confidence=0.9, bbox=(250, 100, 290, 200)),
    ]
    mock_detector.set_mock_detections(dets_step1)
    res_f1 = orchestrator.process_frame(make_frame("CAM-P4-01", 1, ts_base), health_ok)
    assert res_f1["status"] == "PROCESSED"
    # Tracks are NEW on frame 1, so active tracks = 0
    assert res_f1["occupancy"]["current_occupancy"] == 0

    # Step 2: 4 people continue (Frame 2 of tracking -> tracks become ACTIVE)
    ts_f2 = ts_base + 0.5
    dets_step2 = [
        Detection(camera_id="CAM-P4-01", frame_index=2, timestamp_utc=ts_f2, class_id=0, class_name="person", confidence=0.9, bbox=(102, 100, 142, 200)),
        Detection(camera_id="CAM-P4-01", frame_index=2, timestamp_utc=ts_f2, class_id=0, class_name="person", confidence=0.9, bbox=(152, 100, 192, 200)),
        Detection(camera_id="CAM-P4-01", frame_index=2, timestamp_utc=ts_f2, class_id=0, class_name="person", confidence=0.9, bbox=(202, 100, 242, 200)),
        Detection(camera_id="CAM-P4-01", frame_index=2, timestamp_utc=ts_f2, class_id=0, class_name="person", confidence=0.9, bbox=(252, 100, 292, 200)),
    ]
    mock_detector.set_mock_detections(dets_step2)
    res_f2 = orchestrator.process_frame(make_frame("CAM-P4-01", 2, ts_f2), health_ok)

    assert res_f2["occupancy"]["current_occupancy"] == 4
    assert len(res_f2["zone_occupancy"]) == 1
    assert res_f2["zone_occupancy"][0]["zone_id"] == "ZN-HALL-01"
    assert res_f2["zone_occupancy"][0]["current_occupancy"] == 4
    # Confirmation frame 1 of 2 for crowd warning: no crowd alert yet
    assert len(res_f2["crowd_events"]) == 0

    # ATTENDANCE DISCREPANCY EVENT TRIGGERED ON ACTIVE TRACKS!
    # Reported attendance = 30, observed peak = 4 (diff = 26, pct = 86.7% > 25% tolerance)
    assert len(res_f2["attendance_events"]) >= 1
    disc_evt = res_f2["attendance_events"][0]
    assert disc_evt["reported_attendance"] == 30
    assert disc_evt["observed_occupancy"] == 4
    assert disc_evt["discrepancy_value"] == 26
    assert "Observed occupancy differs materially from reported attendance. Operational verification recommended." in disc_evt["explanation"]
    assert "fraud" not in disc_evt["explanation"].lower()

    # Step 3: Frame 3 -> 4 people continue -> Confirmation frame 2 of 2 reached!
    ts_f3 = ts_base + 1.0
    mock_detector.set_mock_detections(dets_step2)
    res_f3 = orchestrator.process_frame(make_frame("CAM-P4-01", 3, ts_f3), health_ok)

    # CROWD WARNING EVENT TRIGGERED!
    assert len(res_f3["crowd_events"]) == 1
    assert res_f3["crowd_events"][0]["severity"] == CrowdSeverity.WARNING.value
    assert res_f3["crowd_events"][0]["zone_id"] == "ZN-HALL-01"
    assert "CROWD WARNING" in res_f3["crowd_events"][0]["explanation"]
