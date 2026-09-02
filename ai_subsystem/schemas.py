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


class TrackState(str, Enum):
    """Lifecycle states of a multi-object track."""
    NEW = "NEW"
    ACTIVE = "ACTIVE"
    LOST = "LOST"
    EXPIRED = "EXPIRED"


class Detection(BaseModel):
    """
    Strongly typed object detection bounding box produced by YOLO or any compatible model.
    Coordinates are absolute pixels (x1, y1, x2, y2).
    """
    camera_id: str
    frame_index: int
    timestamp_utc: float
    class_id: int
    class_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: tuple[float, float, float, float]  # (x1, y1, x2, y2)
    model_name: str = "yolov8n"
    model_version: str = "v1.0.0"

    @property
    def x1(self) -> float:
        return self.bbox[0]

    @property
    def y1(self) -> float:
        return self.bbox[1]

    @property
    def x2(self) -> float:
        return self.bbox[2]

    @property
    def y2(self) -> float:
        return self.bbox[3]

    @property
    def width(self) -> float:
        return max(0.0, self.x2 - self.x1)

    @property
    def height(self) -> float:
        return max(0.0, self.y2 - self.y1)

    @property
    def area(self) -> float:
        return self.width * self.height

    @property
    def center_xy(self) -> tuple[float, float]:
        return ((self.x1 + self.x2) / 2.0, (self.y1 + self.y2) / 2.0)


class Track(BaseModel):
    """
    Persistent multi-object track representation across consecutive frames.
    """
    track_id: int
    camera_id: str
    class_id: int
    class_name: str
    confidence: float
    current_bbox: tuple[float, float, float, float]  # (x1, y1, x2, y2)
    bbox_history: list[tuple[float, float, float, float]] = Field(default_factory=list)
    trajectory: list[tuple[float, float]] = Field(default_factory=list)
    state: TrackState = TrackState.NEW
    first_seen_utc: float
    last_seen_utc: float
    hits_count: int = 1
    lost_frames_count: int = 0
    age_frames: int = 1

    @property
    def centroid(self) -> tuple[float, float]:
        x1, y1, x2, y2 = self.current_bbox
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    @property
    def bottom_center(self) -> tuple[float, float]:
        """Calculates bottom center of bounding box (contact point with ground)."""
        x1, y1, x2, y2 = self.current_bbox
        return ((x1 + x2) / 2.0, y2)

    @property
    def dwell_time_sec(self) -> float:
        return max(0.0, self.last_seen_utc - self.first_seen_utc)


# =====================================================================
# Phase 3: Spatial & Temporal Intelligence Models
# =====================================================================

class ZoneType(str, Enum):
    MONITORED = "MONITORED"
    RESTRICTED = "RESTRICTED"
    ENTRY_EXIT = "ENTRY_EXIT"
    COMMON_AREA = "COMMON_AREA"


class ZoneState(str, Enum):
    OUTSIDE = "OUTSIDE"
    ENTERED = "ENTERED"
    INSIDE = "INSIDE"
    EXITED = "EXITED"


class ZoneEventType(str, Enum):
    ZONE_ENTER = "ZONE_ENTER"
    ZONE_EXIT = "ZONE_EXIT"
    ZONE_INSIDE = "ZONE_INSIDE"
    RESTRICTED_ZONE_BREACH = "RESTRICTED_ZONE_BREACH"


class Zone(BaseModel):
    """
    Polygon geometric zone defined within a camera's field of view.
    Coordinates are specified as a list of (x, y) vertex points.
    """
    zone_id: str
    camera_id: str
    name: str
    zone_type: ZoneType = ZoneType.MONITORED
    polygon: list[tuple[float, float]] = Field(..., min_length=3)
    enabled: bool = True
    loitering_threshold_sec: Optional[float] = None  # e.g., 30.0s for restricted areas
    metadata: dict = Field(default_factory=dict)


class ZoneTransition(BaseModel):
    """
    Explainable spatial event emitted when a tracked entity enters, dwells, or exits a zone.
    """
    event_id: str
    camera_id: str
    track_id: int
    zone_id: str
    zone_name: str
    zone_type: ZoneType
    event_type: ZoneEventType
    timestamp_utc: float
    dwell_time_sec: float
    explanation: str


class VirtualLine(BaseModel):
    """
    Virtual tripwire line segment for detecting directional crossing.
    Defined by two endpoints (pt1, pt2) in camera coordinate space.
    """
    line_id: str
    camera_id: str
    name: str
    pt1: tuple[float, float]
    pt2: tuple[float, float]
    direction_label_in: str = "ENTRY"
    direction_label_out: str = "EXIT"
    enabled: bool = True


class LineCrossingEvent(BaseModel):
    """
    Explainable line crossing event emitted when a track crosses a virtual line.
    """
    event_id: str
    camera_id: str
    track_id: int
    line_id: str
    line_name: str
    direction: str  # e.g. "ENTRY" or "EXIT"
    timestamp_utc: float
    explanation: str


class ScheduleTimeWindow(BaseModel):
    """
    Permitted operational hours window.
    Supports overnight schedules across midnight (e.g. 22:00 -> 06:00).
    """
    start_time: str = "09:00"  # HH:MM format (24hr)
    end_time: str = "18:00"    # HH:MM format (24hr)
    days_of_week: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])  # 0=Monday, 6=Sunday
    is_overnight: bool = False


class OperationalSchedule(BaseModel):
    """
    Configurable operating schedule for an institution or camera.
    """
    schedule_id: str
    name: str
    allowed_windows: list[ScheduleTimeWindow] = Field(default_factory=list)
    enabled: bool = True


class LoiteringEvent(BaseModel):
    """
    Explainable temporal event emitted when a person remains in a zone beyond threshold.
    """
    event_id: str
    camera_id: str
    track_id: int
    zone_id: str
    zone_name: str
    dwell_time_sec: float
    threshold_sec: float
    timestamp_utc: float
    explanation: str


class AfterHoursEvent(BaseModel):
    """
    Explainable security event emitted when motion/person is observed outside operating hours.
    """
    event_id: str
    camera_id: str
    track_id: int
    schedule_id: str
    observed_time_str: str
    timestamp_utc: float
    explanation: str


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
