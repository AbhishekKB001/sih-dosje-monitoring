"""
Abstract Event Publisher for Member 4 AI Subsystem.
Decouples real-time event broadcasting from specific messaging/WebSocket backends.
"""

from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional
from ai_subsystem.schemas import CameraMetrics, StreamEvent
from ai_subsystem.utils.logger import logger


class BaseEventPublisher(ABC):
    """
    Abstract contract for publishing AI alerts, health events, and real-time metrics.
    """

    @abstractmethod
    def publish_health_event(self, event: StreamEvent) -> None:
        """Emits a stream health degradation or recovery event."""
        pass

    @abstractmethod
    def publish_telemetry(self, metrics: CameraMetrics) -> None:
        """Emits real-time camera observability metrics."""
        pass


class InMemoryEventPublisher(BaseEventPublisher):
    """
    In-memory event publisher with callback subscription support for tests and local development.
    """

    def __init__(self):
        self.published_events: List[StreamEvent] = []
        self.published_metrics: List[CameraMetrics] = []
        self._subscribers: List[Callable[[Dict[str, Any]], None]] = []

    def subscribe(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Registers a listener for emitted events (e.g. WebSocket forwarder)."""
        self._subscribers.append(callback)

    def publish_health_event(self, event: StreamEvent) -> None:
        self.published_events.append(event)
        payload = {
            "type": "STREAM_HEALTH_EVENT",
            "data": event.model_dump()
        }
        for sub in self._subscribers:
            try:
                sub(payload)
            except Exception as e:
                logger.error(f"Event subscriber callback error: {e}")

    def publish_telemetry(self, metrics: CameraMetrics) -> None:
        self.published_metrics.append(metrics)
        payload = {
            "type": "CAMERA_TELEMETRY",
            "data": metrics.model_dump()
        }
        for sub in self._subscribers:
            try:
                sub(payload)
            except Exception as e:
                logger.error(f"Metrics subscriber callback error: {e}")
