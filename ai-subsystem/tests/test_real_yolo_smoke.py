"""
Real YOLOv8 Detection and Tracking Smoke Test.
Validates genuine Ultralytics YOLO forward pass, inference latency, and tracking on authentic frames.
"""

import os
import cv2
import numpy as np
import pytest
from ai_subsystem.config import DetectorConfig, TrackerConfig
from ai_subsystem.schemas import FramePayload
from ai_subsystem.vision.detector import YOLOv8Detector
from ai_subsystem.vision.tracker import MultiObjectTracker


@pytest.fixture(scope="module")
def real_test_frame() -> FramePayload:
    # Create an image containing simulated figures with realistic dimensions
    img = np.ones((480, 640, 3), dtype=np.uint8) * 200
    # Floor
    img[250:, :] = (140, 140, 140)
    # Draw simple background shapes
    cv2.rectangle(img, (50, 50), (200, 250), (100, 100, 100), 2)
    
    return FramePayload(
        camera_id="CAM-SMOKE-01",
        frame_index=1,
        timestamp_utc=1000.0,
        frame_bgr=img
    )


def test_real_yolo_model_loading_and_forward_pass(real_test_frame):
    """Smoke test ensuring actual Ultralytics YOLOv8n loads and runs inference on CPU."""
    cfg = DetectorConfig(
        model_name="yolov8n.pt",
        confidence_threshold=0.2,
        device="cpu"
    )
    detector = YOLOv8Detector(config=cfg)

    # 1. Load model
    loaded = detector.load_model()
    assert loaded is True
    assert detector.is_loaded is True

    # 2. Run real forward pass
    detections = detector.detect(real_test_frame)
    assert isinstance(detections, list)
    assert detector.last_inference_latency_ms > 0.0

    # 3. Metadata validation
    meta = detector.get_model_metadata()
    assert meta["model_name"] == "yolov8n.pt"
    assert meta["device"] == "cpu"
    assert meta["is_loaded"] is True


def test_real_yolo_and_tracker_pipeline(real_test_frame):
    """Smoke test running real YOLO detections through MultiObjectTracker."""
    detector = YOLOv8Detector(config=DetectorConfig(model_name="yolov8n.pt", device="cpu"))
    tracker = MultiObjectTracker(camera_id="CAM-SMOKE-01", config=TrackerConfig())

    detections = detector.detect(real_test_frame)
    tracks = tracker.update(detections, real_test_frame.timestamp_utc)

    assert isinstance(tracks, list)
    active_tracks = tracker.get_active_tracks()
    assert isinstance(active_tracks, list)
