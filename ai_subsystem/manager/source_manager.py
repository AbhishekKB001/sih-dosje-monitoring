"""
Source Manager and Multi-Camera Worker Pool for Member 4 AI Subsystem.
Provides isolated multi-camera processing, thread supervision, and fault isolation.
"""

import queue
import threading
import time
from typing import Callable, Dict, Optional
from ai_subsystem.config import SingleCameraConfig, SourceType
from ai_subsystem.observability.metrics import MetricsCollector
from ai_subsystem.schemas import FramePayload, SourceState, StreamEvent, VisualHealthResult, VisualHealthState
from ai_subsystem.sources.base import BaseVideoSource
from ai_subsystem.sources.demo_source import DemoVideoSource
from ai_subsystem.sources.member3_adapter import Member3VideoSourceAdapter
from ai_subsystem.sources.rtsp_source import RTSPVideoSource
from ai_subsystem.sources.webcam_source import WebcamVideoSource
from ai_subsystem.utils.logger import logger
from ai_subsystem.vision.sampling import FrameSampler
from ai_subsystem.vision.visual_health import VisualHealthMonitor


class CameraWorker:
    """
    Supervised multi-threaded worker responsible for reading and processing a single camera feed.
    Decouples frame ingestion (Producer) from AI inference (Consumer) via a bounded queue.
    Guarantees that a crash, timeout, or slow inference in this camera will not affect other cameras.
    """

    def __init__(
        self,
        config: SingleCameraConfig,
        metrics_collector: MetricsCollector,
        frame_handler: Optional[Callable[[FramePayload, VisualHealthResult], None]] = None,
        event_handler: Optional[Callable[[StreamEvent], None]] = None,
    ):
        self.config = config
        self.camera_id = config.camera_id
        self.metrics = metrics_collector
        self.frame_handler = frame_handler
        self.event_handler = event_handler

        self.source: BaseVideoSource = self._create_source(config)
        self.health_monitor = VisualHealthMonitor(camera_id=self.camera_id)
        self.sampler = FrameSampler()

        self._processing_queue: queue.Queue = queue.Queue(maxsize=self.sampler.config.max_queue_size)
        self._running = False
        self._ingestion_thread: Optional[threading.Thread] = None
        self._processing_thread: Optional[threading.Thread] = None
        self._prev_health_state: VisualHealthState = VisualHealthState.HEALTHY

        self.metrics.register_camera(self.camera_id, config.institution_id)

    def _create_source(self, cfg: SingleCameraConfig) -> BaseVideoSource:
        """Instantiates the appropriate BaseVideoSource implementation."""
        if cfg.source_type == SourceType.DEMO:
            return DemoVideoSource(
                camera_id=cfg.camera_id,
                filepath=cfg.uri,
                institution_id=cfg.institution_id,
                loop_video=cfg.loop_video
            )
        elif cfg.source_type == SourceType.WEBCAM:
            device_idx = int(cfg.uri) if cfg.uri.isdigit() else 0
            return WebcamVideoSource(
                camera_id=cfg.camera_id,
                device_index=device_idx,
                institution_id=cfg.institution_id
            )
        elif cfg.source_type == SourceType.RTSP:
            return RTSPVideoSource(
                camera_id=cfg.camera_id,
                rtsp_url=cfg.uri,
                institution_id=cfg.institution_id,
                max_reconnect_attempts=cfg.reconnect_attempts,
                initial_retry_delay_sec=cfg.reconnect_delay_sec,
                max_retry_delay_sec=cfg.max_reconnect_delay_sec
            )
        elif cfg.source_type == SourceType.MEMBER3_ADAPTER:
            return Member3VideoSourceAdapter(
                camera_id=cfg.camera_id,
                institution_id=cfg.institution_id,
                gateway_endpoint=cfg.uri
            )
        else:
            raise ValueError(f"Unknown source type: {cfg.source_type}")

    def start(self) -> None:
        """Starts the ingestion and processing worker threads."""
        if self._running:
            return
        self._running = True
        self._ingestion_thread = threading.Thread(
            target=self._ingestion_loop, name=f"Ingestion-{self.camera_id}", daemon=True
        )
        self._processing_thread = threading.Thread(
            target=self._processing_loop, name=f"Processing-{self.camera_id}", daemon=True
        )
        self._ingestion_thread.start()
        self._processing_thread.start()
        logger.info(f"[{self.camera_id}] Ingestion and Processing workers started")

    def stop(self) -> None:
        """Stops worker threads and cleans up resources."""
        self._running = False
        if self.source:
            self.source.disconnect()
        if self._ingestion_thread and self._ingestion_thread.is_alive():
            self._ingestion_thread.join(timeout=1.5)
        if self._processing_thread and self._processing_thread.is_alive():
            self._processing_thread.join(timeout=1.5)
        self.metrics.update_source_state(self.camera_id, SourceState.CLOSED)
        logger.info(f"[{self.camera_id}] Workers stopped")

    def _ingestion_loop(self) -> None:
        """Producer: continuously captures frames and monitors visual health at native camera FPS."""
        try:
            connected = self.source.connect()
            if not connected:
                self.metrics.update_source_state(self.camera_id, SourceState.ERROR)
                self._emit_event("CAMERA_CONNECT_FAILED", "ERROR", f"Failed to initialize source '{self.config.uri}'")

            while self._running:
                if self.source.get_state() in (SourceState.INTERRUPTED, SourceState.ERROR):
                    self._emit_event("CAMERA_STREAM_INTERRUPTED", "WARNING", "Stream interrupted, attempting reconnect")
                    self.metrics.record_reconnect(self.camera_id)
                    reconnected = self.source.reconnect()
                    if not reconnected:
                        self.metrics.update_source_state(self.camera_id, SourceState.ERROR)
                        time.sleep(1.0)
                        continue
                    self._emit_event("CAMERA_STREAM_RECOVERED", "INFO", "Stream re-established successfully")

                success, frame_payload = self.source.read_frame()

                if not success or frame_payload is None:
                    if self.source.get_state() == SourceState.CLOSED:
                        break
                    time.sleep(0.005)
                    continue

                # Record frame ingestion
                self.metrics.record_frame_read(self.camera_id, frame_payload.timestamp_utc)

                # Check fast visual content health (Blur / Freeze / Black screen / Low light)
                health_result = self.health_monitor.analyze_frame(frame_payload)
                self.metrics.update_health_state(self.camera_id, health_result.state)

                if health_result.state != self._prev_health_state:
                    severity = "INFO" if health_result.is_healthy else "WARNING"
                    self._emit_event(
                        f"VISUAL_HEALTH_{health_result.state.value}",
                        severity,
                        health_result.fault_reason or f"Visual state transitioned to {health_result.state.value}",
                        {"metrics": health_result.model_dump()}
                    )
                    self._prev_health_state = health_result.state

                # Check sampling rate for AI consumer
                if self.sampler.should_sample(frame_payload):
                    try:
                        self._processing_queue.put_nowait((frame_payload, health_result))
                    except queue.Full:
                        if self.sampler.config.drop_oldest_on_full:
                            try:
                                self._processing_queue.get_nowait()
                                self._processing_queue.put_nowait((frame_payload, health_result))
                            except (queue.Empty, queue.Full):
                                pass
                        self.metrics.record_frame_dropped(self.camera_id)
                else:
                    self.metrics.record_frame_dropped(self.camera_id)

        except Exception as e:
            logger.error(f"[{self.camera_id}] Unhandled ingestion exception: {e}", exc_info=True)
            self.metrics.update_source_state(self.camera_id, SourceState.ERROR)
            self._emit_event("WORKER_CRASHED", "CRITICAL", f"Ingestion worker crashed: {e}")
        finally:
            self.source.disconnect()

    def _processing_loop(self) -> None:
        """Consumer: pulls sampled frames from queue and executes AI pipeline."""
        while self._running:
            try:
                item = self._processing_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            frame_payload, health_result = item
            start_proc = time.time()
            if self.frame_handler is not None:
                try:
                    self.frame_handler(frame_payload, health_result)
                except Exception as e:
                    logger.error(f"[{self.camera_id}] Error in AI frame handler: {e}")

            elapsed_ms = (time.time() - start_proc) * 1000.0
            self.metrics.record_pipeline_latency(self.camera_id, elapsed_ms)
            self._processing_queue.task_done()

    def _emit_event(self, event_type: str, severity: str, message: str, details: Optional[dict] = None) -> None:
        """Helper to fire stream/health events."""
        event = StreamEvent(
            event_id=f"EVT-{self.camera_id}-{int(time.time() * 1000)}",
            camera_id=self.camera_id,
            institution_id=self.config.institution_id,
            event_type=event_type,
            severity=severity,
            message=message,
            details=details or {}
        )
        if self.event_handler:
            self.event_handler(event)


class SourceManager:
    """
    Manages the lifecycle of multiple CameraWorker instances.
    Provides isolation, status reporting, and centralized start/stop control.
    """

    def __init__(
        self,
        metrics_collector: MetricsCollector,
        frame_handler: Optional[Callable[[FramePayload, VisualHealthResult], None]] = None,
        event_handler: Optional[Callable[[StreamEvent], None]] = None,
    ):
        self.metrics = metrics_collector
        self.frame_handler = frame_handler
        self.event_handler = event_handler
        self._workers: Dict[str, CameraWorker] = {}
        self._lock = threading.Lock()

    def add_camera(self, config: SingleCameraConfig) -> CameraWorker:
        """Registers a new camera and instantiates its worker."""
        with self._lock:
            if config.camera_id in self._workers:
                logger.warning(f"Camera '{config.camera_id}' already exists in SourceManager. Stopping existing.")
                self._workers[config.camera_id].stop()

            worker = CameraWorker(
                config=config,
                metrics_collector=self.metrics,
                frame_handler=self.frame_handler,
                event_handler=self.event_handler
            )
            self._workers[config.camera_id] = worker
            return worker

    def start_camera(self, camera_id: str) -> bool:
        """Starts ingestion on a single camera."""
        with self._lock:
            worker = self._workers.get(camera_id)
            if not worker:
                logger.error(f"Cannot start camera '{camera_id}': not found")
                return False
            worker.start()
            return True

    def stop_camera(self, camera_id: str) -> bool:
        """Stops ingestion on a single camera."""
        with self._lock:
            worker = self._workers.get(camera_id)
            if not worker:
                return False
            worker.stop()
            return True

    def start_all(self) -> None:
        """Starts all registered camera workers."""
        with self._lock:
            for worker in self._workers.values():
                worker.start()

    def stop_all(self) -> None:
        """Stops all active camera workers."""
        with self._lock:
            for worker in self._workers.values():
                worker.stop()

    def get_worker(self, camera_id: str) -> Optional[CameraWorker]:
        """Retrieves a specific camera worker."""
        return self._workers.get(camera_id)

    def list_cameras(self) -> list[str]:
        """Returns list of registered camera IDs."""
        return list(self._workers.keys())
