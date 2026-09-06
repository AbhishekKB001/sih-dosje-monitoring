from collections import deque
import time
from typing import Dict, List, Optional
from ai_subsystem.schemas import CameraMetrics, SourceState, VisualHealthState


class MetricsCollector:
    """
    Central in-memory telemetry collector for stream performance, AI latency, and error counts.
    Maintains sliding-window rate estimation for input FPS and processed FPS.
    """

    def __init__(self, config_version: str = "cfg-2026.1", model_version: str = "v1.0.0", window_sec: float = 3.0):
        self.config_version = config_version
        self.model_version = model_version
        self.window_sec = window_sec
        self._cameras: Dict[str, CameraMetrics] = {}
        self._read_timestamps: Dict[str, deque] = {}
        self._processed_timestamps: Dict[str, deque] = {}
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
            self._read_timestamps[camera_id] = deque()
            self._processed_timestamps[camera_id] = deque()

    def record_frame_read(self, camera_id: str, timestamp_utc: float) -> None:
        """Records a successful frame ingestion event and updates input FPS."""
        metrics = self._cameras.get(camera_id)
        if metrics:
            metrics.frames_read_total += 1
            metrics.last_frame_timestamp_utc = timestamp_utc
            metrics.source_state = SourceState.STREAMING

            dq = self._read_timestamps.get(camera_id)
            if dq is not None:
                now = time.time()
                dq.append(now)
                # Prune timestamps older than window
                while dq and (now - dq[0]) > self.window_sec:
                    dq.popleft()
                if len(dq) > 1:
                    duration = max(dq[-1] - dq[0], 0.001)
                    metrics.input_fps = (len(dq) - 1) / duration
                else:
                    metrics.input_fps = float(len(dq))

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
        """Records AI inference latency, active tracks, and calculates processed FPS."""
        metrics = self._cameras.get(camera_id)
        if metrics:
            metrics.active_tracks_count = active_tracks_count
            metrics.pipeline_latency_ms = (
                0.7 * metrics.pipeline_latency_ms + 0.3 * latency_ms
                if metrics.pipeline_latency_ms > 0 else latency_ms
            )

            dq = self._processed_timestamps.get(camera_id)
            if dq is not None:
                now = time.time()
                dq.append(now)
                while dq and (now - dq[0]) > self.window_sec:
                    dq.popleft()
                if len(dq) > 1:
                    duration = max(dq[-1] - dq[0], 0.001)
                    metrics.processed_fps = (len(dq) - 1) / duration
                else:
                    metrics.processed_fps = float(len(dq))


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
