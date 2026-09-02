"""
AI Pipeline Orchestrator for Member 4 AI Subsystem.
Central coordinator routing frames through visual health, preprocessing, detection, tracking, rules, and alerting.
"""

from typing import Any, Dict, List, Optional
from ai_subsystem.adapters.event_publisher import BaseEventPublisher, InMemoryEventPublisher
from ai_subsystem.adapters.storage_adapter import BaseStorageAdapter, LocalStorageAdapter
from ai_subsystem.analytics.spatial import LineCrossingEngine, PolygonZoneEngine
from ai_subsystem.analytics.temporal import TemporalEngine
from ai_subsystem.config import AIConfig, SingleCameraConfig
from ai_subsystem.manager.source_manager import SourceManager
from ai_subsystem.observability.metrics import MetricsCollector
from ai_subsystem.schemas import (
    AfterHoursEvent,
    Detection,
    FramePayload,
    LineCrossingEvent,
    LoiteringEvent,
    StreamEvent,
    Track,
    TrackState,
    VisualHealthResult,
    VisualHealthState,
    ZoneTransition,
)
from ai_subsystem.utils.logger import logger
from ai_subsystem.vision.detector import BaseObjectDetector, YOLOv8Detector
from ai_subsystem.vision.preprocessor import OpenCVPreprocessor
from ai_subsystem.vision.tracker import MultiObjectTracker


class AIPipelineOrchestrator:
    """
    Master pipeline coordinator.
    Routes frames through: Ingestion -> Visual Health -> YOLOv8 Detection -> ByteTrack Tracking
    -> Spatial Polygon & Line Analytics -> Temporal Loitering & After-Hours Intelligence.
    """

    def __init__(
        self,
        config: Optional[AIConfig] = None,
        detector: Optional[BaseObjectDetector] = None,
        storage_adapter: Optional[BaseStorageAdapter] = None,
        event_publisher: Optional[BaseEventPublisher] = None,
    ):
        self.config = config or AIConfig()
        self.storage = storage_adapter or LocalStorageAdapter()
        self.publisher = event_publisher or InMemoryEventPublisher()
        
        self.metrics = MetricsCollector(
            config_version=self.config.config_version,
            model_version=self.config.model_version
        )
        self.preprocessor = OpenCVPreprocessor()

        # Initialize detector (YOLOv8 by default, or injected detector for tests)
        self.detector = detector or YOLOv8Detector(config=self.config.detector)

        # Per-camera isolated analytics engines
        self._trackers: Dict[str, MultiObjectTracker] = {}
        self._zone_engines: Dict[str, PolygonZoneEngine] = {}
        self._line_engines: Dict[str, LineCrossingEngine] = {}
        self._temporal_engines: Dict[str, TemporalEngine] = {}

        # Initialize multi-camera source manager
        self.source_manager = SourceManager(
            metrics_collector=self.metrics,
            frame_handler=self.process_frame,
            event_handler=self.handle_stream_event
        )

        logger.info(
            f"AIPipelineOrchestrator initialized (config: {self.config.config_version}, "
            f"model: {self.config.model_version}, detector: {self.config.detector.model_name})"
        )

    def register_camera(self, camera_cfg: SingleCameraConfig) -> None:
        """Registers and prepares a camera and its dedicated spatial/temporal engines."""
        self.config.add_camera(camera_cfg)
        self.source_manager.add_camera(camera_cfg)
        cid = camera_cfg.camera_id

        if cid not in self._trackers:
            self._trackers[cid] = MultiObjectTracker(
                camera_id=cid,
                config=self.config.tracker
            )

        # Initialize Spatial & Temporal Engines
        self._zone_engines[cid] = PolygonZoneEngine(camera_id=cid, config=camera_cfg.spatial)
        self._line_engines[cid] = LineCrossingEngine(camera_id=cid, config=camera_cfg.spatial)

        # Match schedule if configured
        matched_sched = None
        if camera_cfg.schedule_id:
            for s in self.config.temporal.schedules:
                if s.schedule_id == camera_cfg.schedule_id:
                    matched_sched = s
                    break

        self._temporal_engines[cid] = TemporalEngine(
            camera_id=cid,
            config=self.config.temporal,
            schedule=matched_sched
        )

    def get_tracker(self, camera_id: str) -> MultiObjectTracker:
        """Retrieves or creates the isolated tracker for a specific camera."""
        if camera_id not in self._trackers:
            self._trackers[camera_id] = MultiObjectTracker(
                camera_id=camera_id,
                config=self.config.tracker
            )
        return self._trackers[camera_id]

    def get_zone_engine(self, camera_id: str) -> PolygonZoneEngine:
        """Retrieves or creates the isolated zone engine for a specific camera."""
        if camera_id not in self._zone_engines:
            cam_cfg = self.config.get_camera(camera_id)
            spatial_cfg = cam_cfg.spatial if cam_cfg else self.config.spatial
            self._zone_engines[camera_id] = PolygonZoneEngine(camera_id=camera_id, config=spatial_cfg)
        return self._zone_engines[camera_id]

    def get_line_engine(self, camera_id: str) -> LineCrossingEngine:
        """Retrieves or creates the isolated line engine for a specific camera."""
        if camera_id not in self._line_engines:
            cam_cfg = self.config.get_camera(camera_id)
            spatial_cfg = cam_cfg.spatial if cam_cfg else self.config.spatial
            self._line_engines[camera_id] = LineCrossingEngine(camera_id=camera_id, config=spatial_cfg)
        return self._line_engines[camera_id]

    def get_temporal_engine(self, camera_id: str) -> TemporalEngine:
        """Retrieves or creates the isolated temporal engine for a specific camera."""
        if camera_id not in self._temporal_engines:
            self._temporal_engines[camera_id] = TemporalEngine(camera_id=camera_id, config=self.config.temporal)
        return self._temporal_engines[camera_id]

    def start(self) -> None:
        """Starts stream ingestion across all configured cameras."""
        logger.info("Starting AIPipelineOrchestrator...")
        if self.config.detector.enabled and not self.detector.is_loaded:
            self.detector.load_model()
        self.source_manager.start_all()

    def stop(self) -> None:
        """Gracefully stops all workers and releases resources."""
        logger.info("Stopping AIPipelineOrchestrator...")
        self.source_manager.stop_all()

    def process_frame(self, frame_payload: FramePayload, health_result: VisualHealthResult) -> Dict[str, Any]:
        """
        Main execution pipeline for a sampled frame.
        Coordinates: Ingestion -> Visual Health -> Preprocessing -> Detection -> Tracking
        -> Spatial Polygon Zones -> Virtual Line Crossing -> Temporal Loitering & After-Hours.
        """
        camera_id = frame_payload.camera_id
        
        # 1. Validation & Preprocessing
        if not self.preprocessor.validate_frame(frame_payload):
            logger.warning(f"[{camera_id}] Frame validation failed (corrupt or empty)")
            return {"status": "INVALID_FRAME", "camera_id": camera_id}

        # 2. Visual Content Health Gate
        if not health_result.is_healthy:
            self.metrics.update_health_state(camera_id, health_result.state)
            return {
                "status": "VISUAL_DEGRADATION",
                "camera_id": camera_id,
                "health_state": health_result.state.value,
                "reason": health_result.fault_reason,
                "detections": [],
                "active_tracks": [],
                "zone_events": [],
                "line_events": [],
                "loitering_events": [],
                "after_hours_events": []
            }

        # 3. Object Detection (YOLOv8)
        detections: List[Detection] = []
        if self.config.detector.enabled:
            detections = self.detector.detect(frame_payload)

        # 4. Multi-Object Tracking (ByteTrack)
        tracks: List[Track] = []
        active_tracks: List[Track] = []
        if self.config.tracker.enabled:
            tracker = self.get_tracker(camera_id)
            tracks = tracker.update(detections, frame_payload.timestamp_utc)
            active_tracks = [t for t in tracks if t.state == TrackState.ACTIVE]

        # 5. Spatial Analytics: Polygon Zones & Line Crossing
        zone_events: List[ZoneTransition] = []
        line_events: List[LineCrossingEvent] = []
        zone_engine = self.get_zone_engine(camera_id)
        line_engine = self.get_line_engine(camera_id)
        
        if active_tracks:
            zone_events = zone_engine.update(active_tracks, frame_payload.timestamp_utc)
            line_events = line_engine.update(active_tracks, frame_payload.timestamp_utc)

        # 6. Temporal Analytics: Dwell Time, Loitering & After-Hours
        loitering_events: List[LoiteringEvent] = []
        after_hours_events: List[AfterHoursEvent] = []
        temporal_engine = self.get_temporal_engine(camera_id)

        if active_tracks:
            loitering_events, after_hours_events = temporal_engine.update(
                tracks=active_tracks,
                zone_engine=zone_engine,
                timestamp_utc=frame_payload.timestamp_utc
            )

        # 7. Record Telemetry & Metrics
        self.metrics.record_inference_metrics(
            camera_id=camera_id,
            latency_ms=self.detector.last_inference_latency_ms,
            detection_count=len(detections),
            active_tracks_count=len(active_tracks)
        )

        # Update metrics & publish real-time telemetry
        cam_metrics = self.metrics.get_camera_metrics(camera_id)
        if cam_metrics:
            self.publisher.publish_telemetry(cam_metrics)

        return {
            "status": "PROCESSED",
            "camera_id": camera_id,
            "frame_index": frame_payload.frame_index,
            "visual_health": health_result.state.value,
            "detections": [d.model_dump() for d in detections],
            "active_tracks": [t.model_dump() for t in active_tracks],
            "active_tracks_count": len(active_tracks),
            "zone_events": [e.model_dump() for e in zone_events],
            "line_events": [e.model_dump() for e in line_events],
            "loitering_events": [e.model_dump() for e in loitering_events],
            "after_hours_events": [e.model_dump() for e in after_hours_events],
            "inference_latency_ms": self.detector.last_inference_latency_ms
        }

    def handle_stream_event(self, event: StreamEvent) -> None:
        """Handles stream lifecycle and health events."""
        self.storage.save_health_event(event)
        self.publisher.publish_health_event(event)

    def get_system_status(self) -> Dict[str, Any]:
        """Returns overall subsystem health and active camera states."""
        return {
            "summary": self.metrics.get_system_summary(),
            "cameras": {
                cid: m.model_dump()
                for cid, m in self.metrics.get_all_metrics().items()
            }
        }
