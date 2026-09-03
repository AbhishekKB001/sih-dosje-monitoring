"""
Unit tests for FrameSampler.
"""

import numpy as np
from ai_subsystem.config import SamplingConfig
from ai_subsystem.schemas import FramePayload
from ai_subsystem.vision.sampling import FrameSampler


def test_frame_sampler_downsampling():
    # Downsample from 30 FPS to 5 FPS (interval = 0.2s)
    cfg = SamplingConfig(target_fps=5.0)
    sampler = FrameSampler(config=cfg)

    dummy_frame = np.ones((50, 50, 3), dtype=np.uint8)

    sampled_count = 0
    # Simulate 30 frames at 30 FPS (timestamps spaced by 0.033s)
    for i in range(30):
        ts = 1000.0 + (i * 0.0333)
        payload = FramePayload(
            camera_id="CAM-SMP",
            frame_index=i + 1,
            timestamp_utc=ts,
            frame_bgr=dummy_frame
        )
        if sampler.should_sample(payload):
            sampled_count += 1

    # In 1 second at 5 FPS, expect approximately 5-6 sampled frames out of 30
    assert 4 <= sampled_count <= 6
    assert sampler.total_frames_received == 30
    assert sampler.total_frames_dropped == 30 - sampled_count
