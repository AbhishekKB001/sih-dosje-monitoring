"""
Unit tests for BaseVideoSource and specific source implementations.
"""

import os
import pytest
import numpy as np
from ai_subsystem.schemas import SourceState
from ai_subsystem.sources.demo_source import DemoVideoSource
from ai_subsystem.sources.member3_adapter import Member3VideoSourceAdapter
from ai_subsystem.utils.synthetic_video import generate_demo_video


@pytest.fixture(scope="module")
def sample_video_path(tmp_path_factory):
    fn = tmp_path_factory.mktemp("video") / "test_demo.mp4"
    return generate_demo_video(output_path=str(fn), num_frames=30, width=320, height=240, fps=25)


def test_demo_source_successful_read(sample_video_path):
    source = DemoVideoSource(camera_id="CAM-01", filepath=sample_video_path, loop_video=True, pace_fps=False)
    
    with source:
        assert source.get_state() == SourceState.STREAMING
        assert source.fps > 0
        assert source.width == 320
        assert source.height == 240

        success, frame_payload = source.read_frame()
        assert success is True
        assert frame_payload is not None
        assert frame_payload.camera_id == "CAM-01"
        assert frame_payload.width == 320
        assert frame_payload.height == 240
        assert frame_payload.frame_index == 1


def test_demo_source_missing_file_error():
    source = DemoVideoSource(camera_id="CAM-ERR", filepath="non_existent_path.mp4")
    success = source.connect()
    assert success is False
    assert source.get_state() == SourceState.ERROR


def test_demo_source_looping(sample_video_path):
    source = DemoVideoSource(camera_id="CAM-LOOP", filepath=sample_video_path, loop_video=True, pace_fps=False)
    source.connect()
    
    # Read beyond the 30 frames to verify auto-looping without error
    frames_read = 0
    for _ in range(45):
        success, payload = source.read_frame()
        if success and payload is not None:
            frames_read += 1
            
    assert frames_read == 45
    source.disconnect()


def test_member3_adapter_callback():
    dummy_frame = np.ones((100, 100, 3), dtype=np.uint8) * 150

    def mock_fetcher():
        return True, dummy_frame, 1234567.0

    adapter = Member3VideoSourceAdapter(camera_id="CAM-M3", frame_fetcher=mock_fetcher)
    with adapter:
        assert adapter.get_state() == SourceState.STREAMING
        success, payload = adapter.read_frame()
        assert success is True
        assert payload.camera_id == "CAM-M3"
        assert payload.timestamp_utc == 1234567.0
        assert payload.width == 100
        assert payload.height == 100
