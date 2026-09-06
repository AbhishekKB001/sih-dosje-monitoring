"""
Frame Sampler & FPS Controller for Member 4 AI Subsystem.
Controls processing rate and paces frame ingestion to prevent GPU/CPU saturation.
"""

import time
from typing import Optional
from ai_subsystem.config import SamplingConfig
from ai_subsystem.schemas import FramePayload


class FrameSampler:
    """
    Downsamples high-FPS video streams to a configured target processing FPS (e.g. 5 FPS).
    Measures incoming FPS vs sampled FPS.
    """

    def __init__(self, config: Optional[SamplingConfig] = None):
        self.config = config or SamplingConfig()
        self._target_interval = 1.0 / self.config.target_fps if self.config.target_fps > 0 else 0.0
        self._last_sampled_timestamp_utc: float = 0.0
        
        # Performance tracking counters
        self.total_frames_received: int = 0
        self.total_frames_sampled: int = 0
        self.total_frames_dropped: int = 0
        self._start_time: float = time.time()

    def should_sample(self, frame_payload: FramePayload) -> bool:
        """
        Determines whether the incoming frame should be sampled for deep AI analysis.
        """
        self.total_frames_received += 1
        current_ts = frame_payload.timestamp_utc

        if self._target_interval <= 0:
            self.total_frames_sampled += 1
            return True

        if (current_ts - self._last_sampled_timestamp_utc) >= self._target_interval:
            self._last_sampled_timestamp_utc = current_ts
            self.total_frames_sampled += 1
            return True

        self.total_frames_dropped += 1
        return False

    def get_fps_stats(self) -> tuple[float, float]:
        """
        Returns (input_fps, sampled_fps) over the session lifetime.
        """
        elapsed = max(time.time() - self._start_time, 0.001)
        input_fps = self.total_frames_received / elapsed
        sampled_fps = self.total_frames_sampled / elapsed
        return input_fps, sampled_fps

    def reset(self) -> None:
        self.total_frames_received = 0
        self.total_frames_sampled = 0
        self.total_frames_dropped = 0
        self._last_sampled_timestamp_utc = 0.0
        self._start_time = time.time()
