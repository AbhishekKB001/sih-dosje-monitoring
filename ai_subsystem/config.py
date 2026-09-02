"""
Configuration management for Member 4 AI Subsystem.
Provides versioned, strictly typed, and validated configuration models.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SourceType(str, Enum):
    DEMO = "demo"
    WEBCAM = "webcam"
    RTSP = "rtsp"
    MEMBER3_ADAPTER = "member3_adapter"


class VisualHealthConfig(BaseModel):
    """Thresholds and parameters for visual/frame health analysis."""
    enabled: bool = Field(default=True, description="Enable visual content health checking")
    
    # Black screen / occlusion thresholds (0-255 scale)
    black_frame_threshold: float = Field(default=15.0, ge=0.0, le=255.0, description="Mean pixel value below which frame is considered black")
    
    # Low light / extreme darkness threshold
    low_light_threshold: float = Field(default=35.0, ge=0.0, le=255.0, description="Mean pixel value below which scene is under-illuminated")
    
    # Blur detection threshold (Laplacian variance)
    blur_variance_threshold: float = Field(default=80.0, ge=0.0, description="Laplacian variance threshold below which frame is blurred")
    
    # Frozen frame detection (Mean absolute difference between consecutive frames)
    freeze_diff_threshold: float = Field(default=0.1, ge=0.0, le=50.0, description="Max frame difference threshold indicating frozen video")
    freeze_consecutive_frames: int = Field(default=10, ge=2, description="Consecutive static frames before declaring FROZEN")
    
    # Scene change / tampering threshold
    scene_change_threshold: float = Field(default=65.0, ge=10.0, le=255.0, description="Frame difference threshold indicating sudden viewpoint tampering")
    
    # State persistence before firing health events (prevents flapping)
    fault_persistence_frames: int = Field(default=5, ge=1, description="Frames a fault must persist before state transition")
    recovery_persistence_frames: int = Field(default=5, ge=1, description="Frames of normal signal before recovering to HEALTHY")


class SamplingConfig(BaseModel):
    """Configuration for frame downsampling and rate control."""
    target_fps: float = Field(default=5.0, gt=0.0, le=60.0, description="Target processing FPS for AI analytics")
    max_queue_size: int = Field(default=30, ge=1, description="Max buffer queue size per camera worker")
    drop_oldest_on_full: bool = Field(default=True, description="Drop oldest frames when processing buffer is full")


class DetectorConfig(BaseModel):
    """Configuration for YOLOv8 Object Detection."""
    enabled: bool = Field(default=True, description="Enable object detection")
    model_name: str = Field(default="yolov8n.pt", description="YOLO model path or identifier (e.g. yolov8n.pt, yolov8s.pt)")
    confidence_threshold: float = Field(default=0.35, ge=0.01, le=1.0, description="Minimum detection confidence score")
    iou_threshold: float = Field(default=0.45, ge=0.01, le=1.0, description="NMS IoU threshold")
    input_size: int = Field(default=640, ge=128, le=1280, description="Model input image resolution")
    target_classes: List[str] = Field(default_factory=lambda: ["person"], description="List of target class names to detect (e.g. ['person', 'car'])")
    device: str = Field(default="cpu", description="Inference device ('cpu', 'cuda', 'cuda:0')")
    half_precision: bool = Field(default=False, description="Use FP16 half precision if supported by GPU")


class TrackerConfig(BaseModel):
    """Configuration for ByteTrack Multi-Object Tracking."""
    enabled: bool = Field(default=True, description="Enable multi-object tracking")
    tracker_type: str = Field(default="bytetrack", description="Tracker algorithm name")
    track_high_thresh: float = Field(default=0.5, ge=0.1, le=1.0, description="High confidence threshold for 1st association step")
    track_low_thresh: float = Field(default=0.1, ge=0.01, le=0.5, description="Low confidence threshold for 2nd association step")
    new_track_thresh: float = Field(default=0.4, ge=0.1, le=1.0, description="Confidence threshold required to spawn a new track")
    match_iou_thresh: float = Field(default=0.3, ge=0.01, le=1.0, description="Minimum IoU overlap to match detection to track")
    min_hits_to_active: int = Field(default=2, ge=1, description="Consecutive detections before track becomes ACTIVE")
    max_lost_frames: int = Field(default=30, ge=1, description="Max consecutive lost frames before track is EXPIRED")
    max_history_length: int = Field(default=50, ge=5, description="Max bounding box / trajectory positions retained in memory")


class SingleCameraConfig(BaseModel):
    """Configuration for an individual camera stream source."""
    camera_id: str = Field(..., description="Unique camera identifier, e.g. CAM-001")
    institution_id: Optional[str] = Field(default=None, description="Optional institution ID")
    source_type: SourceType = Field(default=SourceType.DEMO, description="Source type")
    uri: str = Field(default="", description="Filepath for demo MP4, device index for webcam, or RTSP URL")
    loop_video: bool = Field(default=True, description="Loop video indefinitely if source_type is demo")
    reconnect_attempts: int = Field(default=5, ge=0, description="Max reconnect retries on stream drop")
    reconnect_delay_sec: float = Field(default=2.0, ge=0.1, description="Initial delay between reconnection attempts")
    max_reconnect_delay_sec: float = Field(default=30.0, ge=1.0, description="Max exponential backoff delay")
    enabled: bool = Field(default=True, description="Whether this camera is active")


class AIConfig(BaseModel):
    """Master AI Subsystem Configuration."""
    config_version: str = Field(default="cfg-2026.1", description="Configuration schema version")
    model_version: str = Field(default="v1.0.0", description="AI model pipeline version")
    
    visual_health: VisualHealthConfig = Field(default_factory=VisualHealthConfig)
    sampling: SamplingConfig = Field(default_factory=SamplingConfig)
    detector: DetectorConfig = Field(default_factory=DetectorConfig)
    tracker: TrackerConfig = Field(default_factory=TrackerConfig)
    
    cameras: Dict[str, SingleCameraConfig] = Field(
        default_factory=dict,
        description="Map of camera_id to individual camera configurations"
    )

    @field_validator("cameras")
    @classmethod
    def validate_camera_ids(cls, v: Dict[str, SingleCameraConfig]) -> Dict[str, SingleCameraConfig]:
        for cid, cfg in v.items():
            if cid != cfg.camera_id:
                raise ValueError(f"Key '{cid}' does not match camera_id '{cfg.camera_id}'")
        return v

    def add_camera(self, camera_cfg: SingleCameraConfig) -> None:
        self.cameras[camera_cfg.camera_id] = camera_cfg

    def get_camera(self, camera_id: str) -> Optional[SingleCameraConfig]:
        return self.cameras.get(camera_id)
