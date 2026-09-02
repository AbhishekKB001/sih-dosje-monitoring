"""
AI Pipeline Orchestrator for Member 4 AI Subsystem.
Central coordinator routing frames through visual health, preprocessing, detection, tracking, rules, and alerting.
"""

from typing import Any, Dict, Optional
from ai_subsystem.adapters.event_publisher import BaseEventPublisher, InMemoryEventPublisher
from ai_subsystem.adapters.storage_adapter import BaseStorageAdapter, LocalStorageAdapter
from ai_subsystem.config import AIConfig, SingleCameraConfig
from ai_subsystem.manager.source_manager import SourceManager
from ai_subsystem.observability.metrics import MetricsCollector
from ai_subsystem.schemas import FramePayload, StreamEvent, VisualHealthResult, VisualHealthState
from ai_subsystem.utils.logger import logger
from ai_subsystem.vision.preprocessor import OpenCVPreprocessor


class AIPipelineOrchestrator:
    """
    Master pipeline coordinator.
    Acts as the single integration point for all AI processing stages across multi-camera streams.
    """

    def __init__(
        self,
        config: Optional[AIConfig] = None,
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

        # Initialize multi-camera source manager
        self.source_manager = SourceManager(
            metrics_collector=self.metrics,
            frame_handler=self.process_frame,
            event_handler=self.handle_stream_event
        )

        logger.info(
            f"AIPipelineOrchestrator initialized (config: {self.config.config_version}, "
            f"model: {self.config.model_version})"
        )

    def register_camera(self, camera_cfg: SingleCameraConfig) -> None:
        """Registers and prepares a camera for processing."""
        self.config.add_camera(camera_cfg)
        self.source_manager.add_camera(camera_cfg)

    def start(self) -> None:
        """Starts stream ingestion across all configured cameras."""
        logger.info("Starting AIPipelineOrchestrator...")
        self.source_manager.start_all()

    def stop(self) -> None:
        """Gracefully stops all workers and releases resources."""
        logger.info("Stopping AIPipelineOrchestrator...")
        self.source_manager.stop_all()

    def process_frame(self, frame_payload: FramePayload, health_result: VisualHealthResult) -> Dict[str, Any]:
        """
        Main execution pipeline for a sampled frame.
        Coordinates: Ingestion -> Visual Health -> Preprocessing -> (Phase 2-5 Stages).
        """
        camera_id = frame_payload.camera_id
        
        # 1. Validation & Preprocessing
        if not self.preprocessor.validate_frame(frame_payload):
            logger.warning(f"[{camera_id}] Frame validation failed (corrupt or empty)")
            return {"status": "INVALID_FRAME", "camera_id": camera_id}

        # 2. Visual Content Health Gate
        if not health_result.is_healthy:
            # If visual quality is severely degraded (e.g. lens covered or frozen), record telemetry
            self.metrics.update_health_state(camera_id, health_result.state)
            return {
                "status": "VISUAL_DEGRADATION",
                "camera_id": camera_id,
                "health_state": health_result.state.value,
                "reason": health_result.fault_reason
            }

        # 3. Pipeline Extension Hooks (Phases 2 - 5)
        # Note: These hooks will be populated seamlessly in subsequent phases:
        # detections = self._run_detection(frame_payload)           # Phase 2
        # tracks = self._run_tracking(detections)                   # Phase 2
        # spatial_events = self._run_spatial(tracks)                # Phase 3
        # temporal_events = self._run_temporal(tracks)              # Phase 3
        # occupancy = self._run_occupancy(tracks)                   # Phase 4
        # attendance = self._run_attendance(occupancy)             # Phase 4
        # anomalies = self._run_anomaly_engine(...)                 # Phase 5
        # incidents = self._run_incident_correlator(anomalies)      # Phase 5
        # alerts = self._run_alert_manager(incidents)               # Phase 5

        # Update metrics & publish real-time telemetry
        cam_metrics = self.metrics.get_camera_metrics(camera_id)
        if cam_metrics:
            self.publisher.publish_telemetry(cam_metrics)

        return {
            "status": "PROCESSED",
            "camera_id": camera_id,
            "frame_index": frame_payload.frame_index,
            "visual_health": health_result.state.value,
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
