"""
Data models and schema definitions for Member 4 AI Subsystem.
Defines immutable/dataclass/Pydantic models for frames, visual health, and metrics.
"""

from enum import Enum
import time
from typing import Any, Dict, Optional
import numpy as np
from pydantic import BaseModel, Field, ConfigDict


class SourceState(str, Enum):
    """Lifecycle states of a video stream source."""
    DISCONNECTED = "DISCONNECTED"
    CONNECTING = "CONNECTING"
    STREAMING = "STREAMING"
    INTERRUPTED = "INTERRUPTED"
    ERROR = "ERROR"
    CLOSED = "CLOSED"


class VisualHealthState(str, Enum):
    """Content-level visual health states analyzed by Computer Vision."""
    HEALTHY = "HEALTHY"
    FROZEN = "FROZEN"
    BLACK_SCREEN = "BLACK_SCREEN"
    BLURRED = "BLURRED"
    LOW_LIGHT = "LOW_LIGHT"
    SCENE_CHANGE = "SCENE_CHANGE"


class FramePayload:
    """
    In-memory representation of a video frame moving through the pipeline.
    Avoids copying heavy NumPy pixel buffers unnecessarily.
    """
    __slots__ = (
        "camera_id",
        "institution_id",
        "frame_index",
        "timestamp_utc",
        "frame_bgr",
        "width",
        "height",
        "source_fps"
    )

    def __init__(
        self,
        camera_id: str,
        frame_index: int,
        timestamp_utc: float,
        frame_bgr: np.ndarray,
        institution_id: Optional[str] = None,
        source_fps: float = 30.0,
    ):
        self.camera_id = camera_id
        self.institution_id = institution_id
        self.frame_index = frame_index
        self.timestamp_utc = timestamp_utc
        self.frame_bgr = frame_bgr
        self.height, self.width = frame_bgr.shape[:2] if frame_bgr is not None else (0, 0)
        self.source_fps = source_fps

    def is_valid(self) -> bool:
        return (
            self.frame_bgr is not None
            and isinstance(self.frame_bgr, np.ndarray)
            and self.width > 0
            and self.height > 0
        )

    def __repr__(self) -> str:
        return (
            f"<FramePayload cam={self.camera_id} idx={self.frame_index} "
            f"size={self.width}x{self.height} ts={self.timestamp_utc:.3f}>"
        )


class VisualHealthResult(BaseModel):
    """Result of visual health analysis performed on a single frame."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    camera_id: str
    frame_index: int
    timestamp_utc: float = Field(default_factory=time.time)
    state: VisualHealthState = VisualHealthState.HEALTHY
    mean_intensity: float = 0.0
    blur_variance: float = 0.0
    frame_diff: float = 0.0
    is_healthy: bool = True
    fault_reason: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CameraMetrics(BaseModel):
    """Real-time observability snapshot for a camera stream."""
    camera_id: str
    institution_id: Optional[str] = None
    source_state: SourceState = SourceState.DISCONNECTED
    health_state: VisualHealthState = VisualHealthState.HEALTHY
    input_fps: float = 0.0
    processed_fps: float = 0.0
    frames_read_total: int = 0
    frames_dropped_total: int = 0
    reconnect_count: int = 0
    last_frame_timestamp_utc: float = 0.0
    pipeline_latency_ms: float = 0.0
    active_tracks_count: int = 0
    unprocessed_queue_size: int = 0


class StreamEvent(BaseModel):
    """Structured event emitted when stream health or lifecycle changes."""
    event_id: str
    camera_id: str
    institution_id: Optional[str] = None
    event_type: str
    timestamp_utc: float = Field(default_factory=time.time)
    severity: str = "INFO"  # INFO, WARNING, ERROR, CRITICAL
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
