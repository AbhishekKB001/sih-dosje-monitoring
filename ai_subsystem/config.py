"""
Configuration management for Member 4 AI Subsystem.
Provides versioned, strictly typed, and validated configuration models.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from ai_subsystem.schemas import OperationalSchedule, VirtualLine, Zone


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


class SpatialConfig(BaseModel):
    """Configuration for spatial polygon zones and virtual tripwire lines."""
    zones: List[Zone] = Field(default_factory=list, description="Configured polygon zones")
    lines: List[VirtualLine] = Field(default_factory=list, description="Configured virtual tripwire lines")
    bottom_center_anchoring: bool = Field(
        default=True,
        description="Use bounding box bottom-center point (feet contact) rather than centroid for zone containment"
    )


class TemporalConfig(BaseModel):
    """Configuration for temporal analytics, loitering, and operating schedules."""
    default_loitering_threshold_sec: float = Field(
        default=30.0, ge=1.0, description="Default time in zone before loitering event is raised"
    )
    loitering_confirmation_frames: int = Field(
        default=3, ge=1, description="Consecutive frames track must remain in zone to confirm loitering"
    )
    schedules: List[OperationalSchedule] = Field(
        default_factory=list, description="Registered operational schedules for institutions/cameras"
    )


class OccupancyConfig(BaseModel):
    """Configuration for camera and zone occupancy aggregation and crowd thresholding."""
    window_duration_sec: float = Field(
        default=300.0, ge=10.0, description="Duration of sliding window for rolling occupancy statistics (e.g., 300s = 5 min)"
    )
    default_max_capacity: int = Field(
        default=50, ge=1, description="Default maximum capacity when not explicitly defined on a zone"
    )
    capacity_warning_ratio: float = Field(
        default=0.8, ge=0.1, le=1.0, description="Ratio of max capacity triggering WARNING severity"
    )
    capacity_critical_ratio: float = Field(
        default=1.0, ge=0.5, le=2.0, description="Ratio of max capacity triggering CRITICAL severity"
    )
    confirmation_frames: int = Field(
        default=3, ge=1, description="Consecutive frames crowd threshold must be exceeded before alert"
    )
    alert_cooldown_sec: float = Field(
        default=30.0, ge=1.0, description="Cooldown between repeated crowd alerts for the same zone/camera"
    )


class AttendanceConsistencyConfig(BaseModel):
    """Configuration for non-biometric comparison between reported attendance and observed occupancy."""
    enabled: bool = Field(default=True, description="Enable attendance vs occupancy consistency evaluation")
    default_observation_window_sec: float = Field(
        default=900.0, ge=1.0, description="Default observation window for attendance analysis (e.g., 900s = 15 min)"
    )
    tolerance_percentage: float = Field(
        default=25.0, ge=0.0, le=100.0, description="Allowed percentage discrepancy before human verification is recommended"
    )
    min_tolerance_absolute: int = Field(
        default=5, ge=1, description="Minimum absolute count difference required before flagging discrepancy"
    )
    min_reported_attendance_for_check: int = Field(
        default=5, ge=1, description="Minimum reported attendance to avoid division-by-zero or trivial flagging"
    )
    min_observation_sec: float = Field(
        default=2.0, ge=0.0, description="Minimum elapsed stream seconds before 0-occupancy triggers discrepancy"
    )
    alert_cooldown_sec: float = Field(
        default=60.0, ge=1.0, description="Cooldown between repeated discrepancy alerts"
    )
    use_peak_occupancy: bool = Field(
        default=True, description="Compare reported attendance against observed peak occupancy (True) or average (False)"
    )


class AnomalyConfig(BaseModel):
    """Configuration for decision-support anomaly detection."""
    enabled: bool = Field(default=True, description="Enable anomaly detection engine")
    cooldown_sec: float = Field(default=10.0, ge=0.5, description="Cooldown between identical anomaly types per target")
    min_confidence_score: float = Field(default=0.70, ge=0.0, le=1.0, description="Minimum confidence for anomaly generation")


class IncidentCorrelationConfig(BaseModel):
    """Configuration for temporal multi-signal incident correlation."""
    enabled: bool = Field(default=True, description="Enable multi-signal incident correlation")
    correlation_window_sec: float = Field(
        default=60.0, ge=5.0, description="Temporal window to correlate related anomaly signals"
    )
    incident_cooldown_sec: float = Field(
        default=30.0, ge=1.0, description="Cooldown between reporting duplicate or continued incidents"
    )
    min_signals_to_escalate: int = Field(
        default=2, ge=2, description="Minimum distinct signals required to form an elevated multi-signal incident"
    )


class AlertManagerConfig(BaseModel):
    """Configuration for AI Alert Manager and notification lifecycle."""
    enabled: bool = Field(default=True, description="Enable AI alert manager")
    alert_cooldown_sec: float = Field(
        default=30.0, ge=1.0, description="Minimum seconds between alerts for the same category/target"
    )
    auto_resolve_after_sec: float = Field(
        default=3600.0, ge=60.0, description="Auto-resolve stale unresolved alerts after duration"
    )


class EvidenceConfig(BaseModel):
    """Configuration for evidence snapshot generation and SHA-256 integrity sealing."""
    enabled: bool = Field(default=True, description="Enable visual evidence snapshot generation")
    storage_dir: str = Field(
        default="data/evidence", description="Filesystem directory for storing evidence snapshots"
    )
    jpeg_quality: int = Field(
        default=92, ge=50, le=100, description="JPEG compression quality for evidence captures"
    )
    save_annotated_frame: bool = Field(
        default=True, description="Save annotated visual context with bounding boxes/zones"
    )


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
    spatial: SpatialConfig = Field(default_factory=SpatialConfig, description="Camera-specific zones and lines")
    schedule_id: Optional[str] = Field(default=None, description="Optional operational schedule ID for after-hours checks")
    occupancy: OccupancyConfig = Field(default_factory=OccupancyConfig, description="Occupancy and crowd thresholds")
    attendance: AttendanceConsistencyConfig = Field(default_factory=AttendanceConsistencyConfig, description="Attendance comparison config")
    anomaly: AnomalyConfig = Field(default_factory=AnomalyConfig, description="Anomaly detection thresholds")
    incident: IncidentCorrelationConfig = Field(default_factory=IncidentCorrelationConfig, description="Incident correlation settings")
    alert: AlertManagerConfig = Field(default_factory=AlertManagerConfig, description="Alert manager settings")
    evidence: EvidenceConfig = Field(default_factory=EvidenceConfig, description="Evidence capture and sealing settings")


class AIConfig(BaseModel):
    """Master AI Subsystem Configuration."""
    config_version: str = Field(default="cfg-2026.1", description="Configuration schema version")
    model_version: str = Field(default="v1.0.0", description="AI model pipeline version")
    
    visual_health: VisualHealthConfig = Field(default_factory=VisualHealthConfig)
    sampling: SamplingConfig = Field(default_factory=SamplingConfig)
    detector: DetectorConfig = Field(default_factory=DetectorConfig)
    tracker: TrackerConfig = Field(default_factory=TrackerConfig)
    spatial: SpatialConfig = Field(default_factory=SpatialConfig)
    temporal: TemporalConfig = Field(default_factory=TemporalConfig)
    occupancy: OccupancyConfig = Field(default_factory=OccupancyConfig)
    attendance: AttendanceConsistencyConfig = Field(default_factory=AttendanceConsistencyConfig)
    anomaly: AnomalyConfig = Field(default_factory=AnomalyConfig)
    incident: IncidentCorrelationConfig = Field(default_factory=IncidentCorrelationConfig)
    alert: AlertManagerConfig = Field(default_factory=AlertManagerConfig)
    evidence: EvidenceConfig = Field(default_factory=EvidenceConfig)
    
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

    def add_camera(self, cam_cfg: SingleCameraConfig) -> None:
        """Helper to register or update a single camera configuration."""
        self.cameras[cam_cfg.camera_id] = cam_cfg

    def get_camera(self, camera_id: str) -> Optional[SingleCameraConfig]:
        return self.cameras.get(camera_id)

