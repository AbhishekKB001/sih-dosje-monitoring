"""
Demo / Offline Video Source implementation.
Plays local video files (e.g. MP4) with looping and authentic frame pacing.
"""

import os
import time
from typing import Optional
import cv2
from ai_subsystem.schemas import FramePayload, SourceState
from ai_subsystem.sources.base import BaseVideoSource
from ai_subsystem.utils.logger import logger


class DemoVideoSource(BaseVideoSource):
    """
    Consumes a local video file (e.g. MP4).
    Simulates a live continuous camera stream by auto-rewinding on EOF and pacing frames.
    """

    def __init__(
        self,
        camera_id: str,
        filepath: str,
        institution_id: Optional[str] = None,
        loop_video: bool = True,
        pace_fps: bool = True,
    ):
        super().__init__(camera_id=camera_id, institution_id=institution_id)
        self.filepath = filepath
        self.loop_video = loop_video
        self.pace_fps = pace_fps
        self._cap: Optional[cv2.VideoCapture] = None
        self._last_read_wall_time: float = 0.0

    def connect(self) -> bool:
        if not os.path.exists(self.filepath):
            logger.error(f"[{self.camera_id}] Demo video file not found: {self.filepath}")
            self.state = SourceState.ERROR
            return False

        self.state = SourceState.CONNECTING
        self._cap = cv2.VideoCapture(self.filepath)

        if not self._cap.isOpened():
            logger.error(f"[{self.camera_id}] Failed to open video file: {self.filepath}")
            self.state = SourceState.ERROR
            return False

        # Read video metadata
        self.fps = self._cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.state = SourceState.STREAMING
        logger.info(
            f"[{self.camera_id}] Connected to demo video '{self.filepath}' "
            f"({self.width}x{self.height} @ {self.fps:.1f} FPS)"
        )
        return True

    def disconnect(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        self.state = SourceState.CLOSED
        logger.info(f"[{self.camera_id}] Demo video source disconnected")

    def reconnect(self) -> bool:
        self.reconnect_count += 1
        logger.info(f"[{self.camera_id}] Rewinding/Reconnecting demo video source (attempt #{self.reconnect_count})")
        self.disconnect()
        return self.connect()

    def read_frame(self) -> tuple[bool, Optional[FramePayload]]:
        cap = self._cap
        if self.state != SourceState.STREAMING or cap is None:
            return False, None

        # Pace frame reading if required to simulate real-time playback
        if self.pace_fps and self.fps > 0:
            target_interval = 1.0 / self.fps
            elapsed = time.time() - self._last_read_wall_time
            if self._last_read_wall_time > 0 and elapsed < target_interval:
                time.sleep(target_interval - elapsed)

        cap = self._cap
        if cap is None:
            return False, None

        ret, frame = cap.read()
        self._last_read_wall_time = time.time()

        if not ret or frame is None:
            if self.loop_video and self._cap is not None:
                # Rewind to start of video
                self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self._cap.read()
                if not ret or frame is None:
                    self.state = SourceState.INTERRUPTED
                    return False, None
            else:
                self.state = SourceState.CLOSED
                return False, None

        self.frame_index += 1
        now_utc = time.time()
        self.last_frame_time = now_utc

        payload = FramePayload(
            camera_id=self.camera_id,
            institution_id=self.institution_id,
            frame_index=self.frame_index,
            timestamp_utc=now_utc,
            frame_bgr=frame,
            source_fps=self.fps
        )
        return True, payload
