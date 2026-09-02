"""
Unit tests for Object Detection models and schemas.
"""

import numpy as np
import pytest
from ai_subsystem.config import DetectorConfig
from ai_subsystem.schemas import Detection, FramePayload
from ai_subsystem.vision.detector import DeterministicMockDetector, YOLOv8Detector


def make_dummy_payload(camera_id: str = "CAM-DET", frame_index: int = 1) -> FramePayload:
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    return FramePayload(
        camera_id=camera_id,
        frame_index=frame_index,
        timestamp_utc=1000.0 + frame_index * 0.04,
        frame_bgr=frame
    )


def test_detection_schema_and_properties():
    det = Detection(
        camera_id="CAM-01",
        frame_index=10,
        timestamp_utc=12345.67,
        class_id=0,
        class_name="person",
        confidence=0.85,
        bbox=(100.0, 150.0, 200.0, 350.0),
        model_name="yolov8n",
        model_version="v1.0"
    )

    assert det.x1 == 100.0
    assert det.y1 == 150.0
    assert det.x2 == 200.0
    assert det.y2 == 350.0
    assert det.width == 100.0
    assert det.height == 200.0
    assert det.area == 20000.0
    assert det.center_xy == (150.0, 250.0)


def test_detector_confidence_and_class_filtering():
    cfg = DetectorConfig(
        confidence_threshold=0.5,
        target_classes=["person"]
    )
    detector = DeterministicMockDetector(config=cfg)

    # 1. High confidence person (should pass)
    d1 = Detection(
        camera_id="CAM-01", frame_index=1, timestamp_utc=1.0,
        class_id=0, class_name="person", confidence=0.8,
        bbox=(10, 10, 50, 50)
    )
    # 2. Low confidence person (should be filtered out by confidence)
    d2 = Detection(
        camera_id="CAM-01", frame_index=1, timestamp_utc=1.0,
        class_id=0, class_name="person", confidence=0.3,
        bbox=(10, 10, 50, 50)
    )
    # 3. High confidence car (should be filtered out by class filter)
    d3 = Detection(
        camera_id="CAM-01", frame_index=1, timestamp_utc=1.0,
        class_id=2, class_name="car", confidence=0.9,
        bbox=(10, 10, 50, 50)
    )

    detector.set_mock_detections([d1, d2, d3])
    payload = make_dummy_payload()
    results = detector.detect(payload)

    assert len(results) == 1
    assert results[0].class_name == "person"
    assert results[0].confidence == 0.8


def test_yolo_invalid_model_handling():
    cfg = DetectorConfig(model_name="completely_nonexistent_custom_model_9999.pt")
    detector = YOLOv8Detector(config=cfg)
    
    # Should handle missing/invalid model safely without raising unhandled crash
    success = detector.load_model()
    assert success is False
    assert detector.is_loaded is False

    payload = make_dummy_payload()
    results = detector.detect(payload)
    assert results == []
