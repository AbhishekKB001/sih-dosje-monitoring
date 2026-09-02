"""
Integration tests for AIPipelineOrchestrator vision, detection, and tracking pipeline.
"""

import numpy as np
import pytest
from ai_subsystem.config import AIConfig, SingleCameraConfig, SourceType
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import Detection, FramePayload, TrackState, VisualHealthResult, VisualHealthState
from ai_subsystem.vision.detector import DeterministicMockDetector


def make_frame(camera_id: str, frame_index: int = 1) -> FramePayload:
    frame = np.ones((480, 640, 3), dtype=np.uint8) * 150
    return FramePayload(
        camera_id=camera_id,
        frame_index=frame_index,
        timestamp_utc=1000.0 + frame_index * 0.1,
        frame_bgr=frame
    )


def test_orchestrator_vision_pipeline_integration():
    config = AIConfig()
    mock_detector = DeterministicMockDetector(config=config.detector)
    
    orchestrator = AIPipelineOrchestrator(config=config, detector=mock_detector)
    
    cam_cfg = SingleCameraConfig(camera_id="CAM-VIS-01", source_type=SourceType.DEMO, uri="dummy.mp4")
    orchestrator.register_camera(cam_cfg)

    # Inject mock detection
    mock_detector.set_mock_detections([
        Detection(
            camera_id="CAM-VIS-01", frame_index=1, timestamp_utc=1000.1,
            class_id=0, class_name="person", confidence=0.9,
            bbox=(100, 100, 200, 300)
        )
    ])

    payload_f1 = make_frame("CAM-VIS-01", frame_index=1)
    health_ok = VisualHealthResult(
        camera_id="CAM-VIS-01", frame_index=1, state=VisualHealthState.HEALTHY, is_healthy=True
    )

    # Process frame 1 (spawns NEW track)
    res_f1 = orchestrator.process_frame(payload_f1, health_ok)
    assert res_f1["status"] == "PROCESSED"
    assert len(res_f1["detections"]) == 1

    # Process frame 2 with matching detection (promotes track to ACTIVE)
    mock_detector.set_mock_detections([
        Detection(
            camera_id="CAM-VIS-01", frame_index=2, timestamp_utc=1000.2,
            class_id=0, class_name="person", confidence=0.88,
            bbox=(102, 101, 201, 302)
        )
    ])
    payload_f2 = make_frame("CAM-VIS-01", frame_index=2)
    res_f2 = orchestrator.process_frame(payload_f2, health_ok)

    assert res_f2["status"] == "PROCESSED"
    assert len(res_f2["active_tracks"]) == 1
    assert res_f2["active_tracks"][0]["track_id"] == 1
    assert res_f2["active_tracks"][0]["state"] == TrackState.ACTIVE.value

    # Verify metrics updated
    metrics = orchestrator.metrics.get_camera_metrics("CAM-VIS-01")
    assert metrics.active_tracks_count == 1


def test_orchestrator_multi_camera_tracking_isolation():
    config = AIConfig()
    mock_detector = DeterministicMockDetector(config=config.detector)
    orchestrator = AIPipelineOrchestrator(config=config, detector=mock_detector)

    orchestrator.register_camera(SingleCameraConfig(camera_id="CAM-ALPHA", source_type=SourceType.DEMO, uri="a.mp4"))
    orchestrator.register_camera(SingleCameraConfig(camera_id="CAM-BETA", source_type=SourceType.DEMO, uri="b.mp4"))

    # Track on Camera Alpha
    mock_detector.set_mock_detections([
        Detection(camera_id="CAM-ALPHA", frame_index=1, timestamp_utc=1.0, class_id=0, class_name="person", confidence=0.9, bbox=(10, 10, 50, 50))
    ])
    health_ok_alpha = VisualHealthResult(camera_id="CAM-ALPHA", frame_index=1, state=VisualHealthState.HEALTHY, is_healthy=True)
    orchestrator.process_frame(make_frame("CAM-ALPHA", 1), health_ok_alpha)

    # Track on Camera Beta
    mock_detector.set_mock_detections([
        Detection(camera_id="CAM-BETA", frame_index=1, timestamp_utc=1.0, class_id=0, class_name="person", confidence=0.9, bbox=(200, 200, 300, 300))
    ])
    health_ok_beta = VisualHealthResult(camera_id="CAM-BETA", frame_index=1, state=VisualHealthState.HEALTHY, is_healthy=True)
    orchestrator.process_frame(make_frame("CAM-BETA", 1), health_ok_beta)

    tracker_alpha = orchestrator.get_tracker("CAM-ALPHA")
    tracker_beta = orchestrator.get_tracker("CAM-BETA")

    assert tracker_alpha != tracker_beta
    assert len(tracker_alpha._tracks) == 1
    assert len(tracker_beta._tracks) == 1
    assert tracker_alpha._tracks[1].camera_id == "CAM-ALPHA"
    assert tracker_beta._tracks[1].camera_id == "CAM-BETA"
