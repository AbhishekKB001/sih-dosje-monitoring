"""
Unit tests for AI Configuration models.
"""

import pytest
from pydantic import ValidationError
from ai_subsystem.config import AIConfig, SingleCameraConfig, SourceType, VisualHealthConfig


def test_default_config_creation():
    config = AIConfig()
    assert config.config_version == "cfg-2026.1"
    assert config.model_version == "v1.0.0"
    assert config.visual_health.enabled is True
    assert config.visual_health.black_frame_threshold == 15.0
    assert config.sampling.target_fps == 5.0


def test_add_camera_config():
    config = AIConfig()
    cam_cfg = SingleCameraConfig(
        camera_id="CAM-TEST-01",
        source_type=SourceType.DEMO,
        uri="test.mp4",
        loop_video=True
    )
    config.add_camera(cam_cfg)
    assert "CAM-TEST-01" in config.cameras
    assert config.get_camera("CAM-TEST-01").uri == "test.mp4"


def test_invalid_camera_dict_validation():
    with pytest.raises(ValidationError):
        AIConfig(
            cameras={
                "CAM-MISMATCH": SingleCameraConfig(
                    camera_id="CAM-ACTUAL",
                    source_type=SourceType.DEMO,
                    uri="test.mp4"
                )
            }
        )


def test_visual_health_threshold_constraints():
    with pytest.raises(ValidationError):
        VisualHealthConfig(black_frame_threshold=-5.0)  # ge=0.0 constraint
