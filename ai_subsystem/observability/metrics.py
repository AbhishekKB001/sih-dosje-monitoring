"""
Observability and Telemetry Collector for Member 4 AI Subsystem.
Tracks per-camera and subsystem-wide performance metrics, latencies, and health.
"""

import time
from typing import Dict, Optional
from ai_subsystem.schemas import CameraMetrics, SourceState, VisualHealthState


class MetricsCollector:
    """
    Central in-memory telemetry collector for stream performance, AI latency, and error counts.
    """

    def __init__(self, config_version: str = "cfg-2026.1", model_version: str = "v1.0.0"):
        self.config_version = config_version
        self.model_version = model_version
        self._cameras: Dict[str, CameraMetrics] = {}
        self._system_alerts_total: int = 0
        self._system_false_positives: int = 0
        self._start_time: float = time.time()

    def register_camera(self, camera_id: str, institution_id: Optional[str] = None) -> None:
        """Registers a camera for telemetry tracking."""
        if camera_id not in self._cameras:
            self._cameras[camera_id] = CameraMetrics(
                camera_id=camera_id,
                institution_id=institution_id,
                source_state=SourceState.DISCONNECTED,
                health_state=VisualHealthState.HEALTHY,
            )

    def record_frame_read(self, camera_id: str, timestamp_utc: float) -> None:
        """Records a successful frame ingestion event."""
        metrics = self._cameras.get(camera_id)
        if metrics:
            metrics.frames_read_total += 1
            metrics.last_frame_timestamp_utc = timestamp_utc
            metrics.source_state = SourceState.STREAMING

    def record_frame_dropped(self, camera_id: str) -> None:
        """Records a frame dropped due to rate limiting or queue saturation."""
        metrics = self._cameras.get(camera_id)
        if metrics:
            metrics.frames_dropped_total += 1

    def record_reconnect(self, camera_id: str) -> None:
        """Records a reconnection event."""
        metrics = self._cameras.get(camera_id)
        if metrics:
            metrics.reconnect_count += 1
            metrics.source_state = SourceState.CONNECTING

    def update_health_state(self, camera_id: str, state: VisualHealthState) -> None:
        """Updates content-level visual health state."""
        metrics = self._cameras.get(camera_id)
        if metrics:
            metrics.health_state = state

    def update_source_state(self, camera_id: str, state: SourceState) -> None:
        """Updates transport/source connection state."""
        metrics = self._cameras.get(camera_id)
        if metrics:
            metrics.source_state = state

    def record_pipeline_latency(self, camera_id: str, latency_ms: float) -> None:
        """Records end-to-end frame processing latency."""
        metrics = self._cameras.get(camera_id)
        if metrics:
            # Exponential moving average for smooth display
            metrics.pipeline_latency_ms = (
                0.8 * metrics.pipeline_latency_ms + 0.2 * latency_ms
                if metrics.pipeline_latency_ms > 0 else latency_ms
            )

    def record_inference_metrics(
        self,
        camera_id: str,
        latency_ms: float,
        detection_count: int,
        active_tracks_count: int
    ) -> None:
        """Records AI inference latency and object counts."""
        metrics = self._cameras.get(camera_id)
        if metrics:
            metrics.active_tracks_count = active_tracks_count
            metrics.pipeline_latency_ms = (
                0.7 * metrics.pipeline_latency_ms + 0.3 * latency_ms
                if metrics.pipeline_latency_ms > 0 else latency_ms
            )

    def get_camera_metrics(self, camera_id: str) -> Optional[CameraMetrics]:
        """Returns current snapshot metrics for a single camera."""
        return self._cameras.get(camera_id)

    def get_all_metrics(self) -> Dict[str, CameraMetrics]:
        """Returns snapshot metrics for all registered cameras."""
        return self._cameras

    def get_system_summary(self) -> Dict[str, object]:
        """Returns subsystem-wide aggregated performance summary."""
        total_frames = sum(m.frames_read_total for m in self._cameras.values())
        total_dropped = sum(m.frames_dropped_total for m in self._cameras.values())
        active_cameras = sum(1 for m in self._cameras.values() if m.source_state == SourceState.STREAMING)
        degraded_cameras = sum(1 for m in self._cameras.values() if m.health_state != VisualHealthState.HEALTHY)

        return {
            "config_version": self.config_version,
            "model_version": self.model_version,
            "uptime_seconds": time.time() - self._start_time,
            "registered_cameras_count": len(self._cameras),
            "active_streaming_cameras": active_cameras,
            "visually_degraded_cameras": degraded_cameras,
            "total_frames_read": total_frames,
            "total_frames_dropped": total_dropped,
            "total_alerts": self._system_alerts_total,
            "total_false_positives": self._system_false_positives,
        }
