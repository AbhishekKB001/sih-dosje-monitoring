"""
Member 3 Stream Gateway Adapter.
Connects Member 4 AI Subsystem to Member 3's authorized stream management layer.
"""

from typing import Any, Callable, Optional
import numpy as np
from ai_subsystem.schemas import FramePayload, SourceState
from ai_subsystem.sources.base import BaseVideoSource
from ai_subsystem.utils.logger import logger


class Member3VideoSourceAdapter(BaseVideoSource):
    """
    Adapter interfacing with Member 3's CCTV stream gateway.
    Consumes frames provided by Member 3's authorized stream manager or transport layer.
    """

    def __init__(
        self,
        camera_id: str,
        institution_id: Optional[str] = None,
        frame_fetcher: Optional[Callable[[], tuple[bool, Optional[np.ndarray], float]]] = None,
        gateway_endpoint: Optional[str] = None,
    ):
        super().__init__(camera_id=camera_id, institution_id=institution_id)
        self.frame_fetcher = frame_fetcher
        self.gateway_endpoint = gateway_endpoint

    def connect(self) -> bool:
        self.state = SourceState.CONNECTING
        logger.info(f"[{self.camera_id}] Binding to Member 3 Stream Gateway (endpoint: {self.gateway_endpoint or 'direct_callback'})...")
        # Ready to bind to Member 3's stream broker when team deploys
        self.state = SourceState.STREAMING
        logger.info(f"[{self.camera_id}] Member 3 Stream Gateway adapter active")
        return True

    def disconnect(self) -> None:
        self.state = SourceState.CLOSED
        logger.info(f"[{self.camera_id}] Member 3 Stream Gateway adapter disconnected")

    def reconnect(self) -> bool:
        self.reconnect_count += 1
        logger.info(f"[{self.camera_id}] Re-synchronizing with Member 3 Stream Gateway (attempt #{self.reconnect_count})")
        self.disconnect()
        return self.connect()

    def read_frame(self) -> tuple[bool, Optional[FramePayload]]:
        if self.state != SourceState.STREAMING:
            return False, None

        if self.frame_fetcher is not None:
            success, frame, ts_utc = self.frame_fetcher()
            if not success or frame is None:
                self.state = SourceState.INTERRUPTED
                return False, None
            
            self.frame_index += 1
            self.last_frame_time = ts_utc
            payload = FramePayload(
                camera_id=self.camera_id,
                institution_id=self.institution_id,
                frame_index=self.frame_index,
                timestamp_utc=ts_utc,
                frame_bgr=frame,
                source_fps=self.fps
            )
            return True, payload

        # Fallback if no fetcher is registered
        return False, None
