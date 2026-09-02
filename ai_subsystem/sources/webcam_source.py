"""
Webcam Video Source implementation.
Captures frames from local integrated or USB cameras for live testing.
"""

import time
from typing import Optional
import cv2
from ai_subsystem.schemas import FramePayload, SourceState
from ai_subsystem.sources.base import BaseVideoSource
from ai_subsystem.utils.logger import logger


class WebcamVideoSource(BaseVideoSource):
    """
    Consumes live video from a connected USB or integrated webcam.
    """

    def __init__(
        self,
        camera_id: str,
        device_index: int = 0,
        institution_id: Optional[str] = None,
        requested_width: int = 1280,
        requested_height: int = 720,
    ):
        super().__init__(camera_id=camera_id, institution_id=institution_id)
        self.device_index = device_index
        self.requested_width = requested_width
        self.requested_height = requested_height
        self._cap: Optional[cv2.VideoCapture] = None

    def connect(self) -> bool:
        self.state = SourceState.CONNECTING
        logger.info(f"[{self.camera_id}] Connecting to webcam device #{self.device_index}...")
        self._cap = cv2.VideoCapture(self.device_index)

        if not self._cap.isOpened():
            logger.error(f"[{self.camera_id}] Failed to open webcam device #{self.device_index}")
            self.state = SourceState.ERROR
            return False

        # Attempt to configure requested resolution
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.requested_width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.requested_height)

        self.width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.fps = self._cap.get(cv2.CAP_PROP_FPS) or 30.0

        self.state = SourceState.STREAMING
        logger.info(
            f"[{self.camera_id}] Webcam connected ({self.width}x{self.height} @ {self.fps:.1f} FPS)"
        )
        return True

    def disconnect(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        self.state = SourceState.CLOSED
        logger.info(f"[{self.camera_id}] Webcam source disconnected")

    def reconnect(self) -> bool:
        self.reconnect_count += 1
        logger.info(f"[{self.camera_id}] Reconnecting webcam device #{self.device_index} (attempt #{self.reconnect_count})")
        self.disconnect()
        return self.connect()

    def read_frame(self) -> tuple[bool, Optional[FramePayload]]:
        cap = self._cap
        if self.state != SourceState.STREAMING or cap is None:
            return False, None

        ret, frame = cap.read()
        if not ret or frame is None:
            self.state = SourceState.INTERRUPTED
            logger.warning(f"[{self.camera_id}] Webcam read failed, state changed to INTERRUPTED")
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
