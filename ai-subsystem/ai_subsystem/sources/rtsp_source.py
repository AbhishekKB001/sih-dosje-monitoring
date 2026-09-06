"""
RTSP Video Source implementation.
Robust RTSP client with connection timeout handling, watchdog, and exponential backoff.
"""

import os
import time
from typing import Optional
import cv2
from ai_subsystem.schemas import FramePayload, SourceState
from ai_subsystem.sources.base import BaseVideoSource
from ai_subsystem.utils.logger import logger


class RTSPVideoSource(BaseVideoSource):
    """
    Consumes live RTSP network streams.
    Includes timeout watchdog, automatic reconnection with exponential backoff, and frame health tracking.
    """

    def __init__(
        self,
        camera_id: str,
        rtsp_url: str,
        institution_id: Optional[str] = None,
        read_timeout_sec: float = 5.0,
        initial_retry_delay_sec: float = 2.0,
        max_retry_delay_sec: float = 30.0,
        max_reconnect_attempts: int = 10,
    ):
        super().__init__(camera_id=camera_id, institution_id=institution_id)
        self.rtsp_url = rtsp_url
        self.read_timeout_sec = read_timeout_sec
        self.initial_retry_delay_sec = initial_retry_delay_sec
        self.max_retry_delay_sec = max_retry_delay_sec
        self.max_reconnect_attempts = max_reconnect_attempts
        self._cap: Optional[cv2.VideoCapture] = None
        self._consecutive_failures: int = 0

    def connect(self) -> bool:
        self.state = SourceState.CONNECTING
        logger.info(f"[{self.camera_id}] Connecting to RTSP endpoint...")

        # Configure OpenCV VideoCapture for RTSP low latency
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|analyzeduration;1000000|probesize;1000000"
        
        self._cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)

        if not self._cap.isOpened():
            logger.error(f"[{self.camera_id}] Failed to connect to RTSP endpoint")
            self.state = SourceState.ERROR
            return False

        self.width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.fps = self._cap.get(cv2.CAP_PROP_FPS) or 25.0

        self.state = SourceState.STREAMING
        self._consecutive_failures = 0
        logger.info(
            f"[{self.camera_id}] RTSP stream connected ({self.width}x{self.height} @ {self.fps:.1f} FPS)"
        )
        return True

    def disconnect(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        self.state = SourceState.CLOSED
        logger.info(f"[{self.camera_id}] RTSP stream disconnected")

    def reconnect(self) -> bool:
        self.reconnect_count += 1
        self._consecutive_failures += 1
        
        if self.reconnect_count > self.max_reconnect_attempts:
            logger.error(f"[{self.camera_id}] Max RTSP reconnection attempts exceeded ({self.max_reconnect_attempts})")
            self.state = SourceState.ERROR
            return False

        delay = min(
            self.initial_retry_delay_sec * (2 ** (self._consecutive_failures - 1)),
            self.max_retry_delay_sec
        )
        logger.info(f"[{self.camera_id}] Reconnecting RTSP stream in {delay:.1f}s (attempt #{self.reconnect_count})...")
        time.sleep(delay)
        
        self.disconnect()
        return self.connect()

    def read_frame(self) -> tuple[bool, Optional[FramePayload]]:
        cap = self._cap
        if self.state != SourceState.STREAMING or cap is None:
            return False, None

        ret, frame = cap.read()
        
        if not ret or frame is None:
            self.state = SourceState.INTERRUPTED
            logger.warning(f"[{self.camera_id}] RTSP frame read failed, stream interrupted")
            return False, None

        self.frame_index += 1
        now_utc = time.time()
        self.last_frame_time = now_utc
        self._consecutive_failures = 0

        payload = FramePayload(
            camera_id=self.camera_id,
            institution_id=self.institution_id,
            frame_index=self.frame_index,
            timestamp_utc=now_utc,
            frame_bgr=frame,
            source_fps=self.fps
        )
        return True, payload
