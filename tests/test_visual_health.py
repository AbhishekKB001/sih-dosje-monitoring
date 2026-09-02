"""
Unit tests for Visual Content Health Monitor.
"""

import cv2
import numpy as np
import pytest
from ai_subsystem.config import VisualHealthConfig
from ai_subsystem.schemas import FramePayload, VisualHealthState
from ai_subsystem.vision.visual_health import VisualHealthMonitor


def make_payload(frame_bgr: np.ndarray, frame_index: int = 1) -> FramePayload:
    return FramePayload(
        camera_id="CAM-TEST",
        frame_index=frame_index,
        timestamp_utc=1000.0 + frame_index * 0.04,
        frame_bgr=frame_bgr
    )


def test_visual_health_normal_frame():
    monitor = VisualHealthMonitor(camera_id="CAM-TEST")
    
    # Create textured, well-lit frame
    frame = np.zeros((200, 200, 3), dtype=np.uint8)
    cv2.circle(frame, (100, 100), 50, (255, 255, 255), -1)
    cv2.putText(frame, "TEST", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
    
    payload = make_payload(frame)
    result = monitor.analyze_frame(payload)
    assert result.is_healthy is True
    assert result.state == VisualHealthState.HEALTHY


def test_visual_health_black_screen():
    # Set fault_persistence_frames=1 for immediate testing
    cfg = VisualHealthConfig(black_frame_threshold=15.0, fault_persistence_frames=1)
    monitor = VisualHealthMonitor(camera_id="CAM-TEST", config=cfg)
    
    black_frame = np.zeros((200, 200, 3), dtype=np.uint8)
    payload = make_payload(black_frame)
    
    result = monitor.analyze_frame(payload)
    assert result.is_healthy is False
    assert result.state == VisualHealthState.BLACK_SCREEN
    assert "Black frame" in (result.fault_reason or "")


def test_visual_health_low_light():
    cfg = VisualHealthConfig(
        black_frame_threshold=10.0,
        low_light_threshold=30.0,
        fault_persistence_frames=1
    )
    monitor = VisualHealthMonitor(camera_id="CAM-TEST", config=cfg)
    
    dim_frame = np.ones((200, 200, 3), dtype=np.uint8) * 20
    payload = make_payload(dim_frame)
    
    result = monitor.analyze_frame(payload)
    assert result.is_healthy is False
    assert result.state == VisualHealthState.LOW_LIGHT


def test_visual_health_blur():
    cfg = VisualHealthConfig(
        blur_variance_threshold=50.0,
        fault_persistence_frames=1
    )
    monitor = VisualHealthMonitor(camera_id="CAM-TEST", config=cfg)
    
    # Heavy Gaussian blurred flat frame
    flat_frame = np.ones((200, 200, 3), dtype=np.uint8) * 128
    blurred = cv2.GaussianBlur(flat_frame, (25, 25), 0)
    payload = make_payload(blurred)
    
    result = monitor.analyze_frame(payload)
    assert result.is_healthy is False
    assert result.state == VisualHealthState.BLURRED


def test_visual_health_frozen_frame():
    cfg = VisualHealthConfig(
        freeze_consecutive_frames=3,
        fault_persistence_frames=1
    )
    monitor = VisualHealthMonitor(camera_id="CAM-TEST", config=cfg)
    
    # Repeatedly feed identical static image with bright background
    static_frame = np.ones((200, 200, 3), dtype=np.uint8) * 180
    cv2.putText(static_frame, "STATIC", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    
    # Frame 1: establishes baseline
    res1 = monitor.analyze_frame(make_payload(static_frame, frame_index=1))
    assert res1.state == VisualHealthState.HEALTHY
    
    # Frame 2: static count = 1
    monitor.analyze_frame(make_payload(static_frame, frame_index=2))
    
    # Frame 3: static count = 2
    monitor.analyze_frame(make_payload(static_frame, frame_index=3))
    
    # Frame 4: static count = 3 -> FROZEN
    res4 = monitor.analyze_frame(make_payload(static_frame, frame_index=4))
    assert res4.is_healthy is False
    assert res4.state == VisualHealthState.FROZEN
