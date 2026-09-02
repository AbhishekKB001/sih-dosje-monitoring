"""
AI Pipeline Orchestrator for Member 4 AI Subsystem.
Central coordinator routing frames through visual health, preprocessing, detection, tracking, rules, and alerting.
"""

from typing import Any, Dict, List, Optional
from ai_subsystem.adapters.event_publisher import BaseEventPublisher, InMemoryEventPublisher
from ai_subsystem.adapters.storage_adapter import BaseStorageAdapter, LocalStorageAdapter
from ai_subsystem.config import AIConfig, SingleCameraConfig
from ai_subsystem.manager.source_manager import SourceManager
from ai_subsystem.observability.metrics import MetricsCollector
from ai_subsystem.schemas import Detection, FramePayload, StreamEvent, Track, TrackState, VisualHealthResult, VisualHealthState
from ai_subsystem.utils.logger import logger
from ai_subsystem.vision.detector import BaseObjectDetector, YOLOv8Detector
from ai_subsystem.vision.preprocessor import OpenCVPreprocessor
from ai_subsystem.vision.tracker import MultiObjectTracker


class AIPipelineOrchestrator:
    """
    Master pipeline coordinator.
    Routes frames through visual health, YOLOv8 object detection, and ByteTrack multi-object tracking.
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

        # Per-camera tracker instances for clean multi-camera state isolation
        self._trackers: Dict[str, MultiObjectTracker] = {}

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
        """Registers and prepares a camera for processing, creating its dedicated tracker."""
        self.config.add_camera(camera_cfg)
        self.source_manager.add_camera(camera_cfg)
        if camera_cfg.camera_id not in self._trackers:
            self._trackers[camera_cfg.camera_id] = MultiObjectTracker(
                camera_id=camera_cfg.camera_id,
                config=self.config.tracker
            )

    def get_tracker(self, camera_id: str) -> MultiObjectTracker:
        """Retrieves or creates the isolated tracker for a specific camera."""
        if camera_id not in self._trackers:
            self._trackers[camera_id] = MultiObjectTracker(
                camera_id=camera_id,
                config=self.config.tracker
            )
        return self._trackers[camera_id]

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
        Coordinates: Ingestion -> Visual Health -> Preprocessing -> Detection -> Tracking -> (Phase 3-5).
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
                "active_tracks": []
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

        # 5. Record Telemetry & Metrics
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
