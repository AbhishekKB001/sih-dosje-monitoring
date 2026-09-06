"""
Abstract Base Video Source for Member 4 AI Subsystem.
Defines the standard contract for reading video frames regardless of origin.
"""

from abc import ABC, abstractmethod
import time
from typing import Any, Dict, Optional
from ai_subsystem.schemas import FramePayload, SourceState
from ai_subsystem.utils.logger import logger


class BaseVideoSource(ABC):
    """
    Abstract interface for all video sources (Demo MP4, Webcam, RTSP, Member3 Gateway).
    Guarantees that downstream AI components interact with a uniform contract.
    """

    def __init__(self, camera_id: str, institution_id: Optional[str] = None):
        self.camera_id = camera_id
        self.institution_id = institution_id
        self.state: SourceState = SourceState.DISCONNECTED
        self.frame_index: int = 0
        self.fps: float = 30.0
        self.width: int = 0
        self.height: int = 0
        self.reconnect_count: int = 0
        self.last_frame_time: float = 0.0

    @abstractmethod
    def connect(self) -> bool:
        """Establishes connection to the video source. Returns True if successful."""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Releases underlying capture resources and resets state to CLOSED/DISCONNECTED."""
        pass

    @abstractmethod
    def read_frame(self) -> tuple[bool, Optional[FramePayload]]:
        """
        Retrieves the next video frame.
        Returns:
            (success: bool, frame_payload: Optional[FramePayload])
        """
        pass

    @abstractmethod
    def reconnect(self) -> bool:
        """Attempts to cleanly re-establish a dropped connection."""
        pass

    def get_state(self) -> SourceState:
        """Returns current lifecycle state of the video source."""
        return self.state

    def get_metadata(self) -> Dict[str, Any]:
        """Returns technical properties of the stream."""
        return {
            "camera_id": self.camera_id,
            "institution_id": self.institution_id,
            "state": self.state.value,
            "fps": self.fps,
            "resolution": f"{self.width}x{self.height}",
            "frames_read": self.frame_index,
            "reconnect_count": self.reconnect_count,
            "last_frame_time": self.last_frame_time
        }

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
