"""
Abstract Event Publisher for Member 4 AI Subsystem.
Decouples real-time event broadcasting from specific messaging/WebSocket backends.
Provides in-memory pub/sub, callback subscription, and SSE event streaming queues.
"""

import queue
import threading
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional

from ai_subsystem.schemas import AIAlert, AIAnomaly, AIIncident, CameraMetrics, StreamEvent
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

    @abstractmethod
    def publish_alert(self, alert: AIAlert) -> None:
        """Emits an actionable AI alert."""
        pass

    @abstractmethod
    def publish_incident(self, incident: AIIncident) -> None:
        """Emits a correlated multi-signal incident."""
        pass

    @abstractmethod
    def publish_anomaly(self, anomaly: AIAnomaly) -> None:
        """Emits a normalized AI anomaly."""
        pass


class InMemoryEventPublisher(BaseEventPublisher):
    """
    In-memory event publisher with callback subscription and SSE streaming support.
    """

    def __init__(self):
        self.published_events: List[StreamEvent] = []
        self.published_metrics: List[CameraMetrics] = []
        self._subscribers: List[Callable[[Dict[str, Any]], None]] = []
        self._client_queues: List[queue.Queue] = []
        self._lock = threading.Lock()

    def subscribe(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Registers a listener for emitted events (e.g. WebSocket or API forwarder)."""
        with self._lock:
            self._subscribers.append(callback)

    def subscribe_queue(self, maxsize: int = 100) -> queue.Queue:
        """Creates and registers a thread-safe Queue for SSE streaming clients."""
        q = queue.Queue(maxsize=maxsize)
        with self._lock:
            self._client_queues.append(q)
        return q

    def unsubscribe_queue(self, q: queue.Queue) -> None:
        """Removes an active SSE client queue."""
        with self._lock:
            if q in self._client_queues:
                self._client_queues.remove(q)

    def _broadcast(self, payload: Dict[str, Any]) -> None:
        """Broadcasts a payload to all registered callbacks and queues."""
        with self._lock:
            subscribers = list(self._subscribers)
            queues = list(self._client_queues)

        for sub in subscribers:
            try:
                sub(payload)
            except Exception as e:
                logger.error(f"Event subscriber callback error: {e}")

        for q in queues:
            try:
                q.put_nowait(payload)
            except queue.Full:
                # Discard oldest to avoid blocking
                try:
                    q.get_nowait()
                    q.put_nowait(payload)
                except Exception:
                    pass

    def publish_health_event(self, event: StreamEvent) -> None:
        self.published_events.append(event)
        self._broadcast({
            "type": "STREAM_HEALTH_EVENT",
            "data": event.model_dump()
        })

    def publish_telemetry(self, metrics: CameraMetrics) -> None:
        self.published_metrics.append(metrics)
        self._broadcast({
            "type": "CAMERA_TELEMETRY",
            "data": metrics.model_dump()
        })

    def publish_alert(self, alert: AIAlert) -> None:
        self._broadcast({
            "type": "AI_ALERT_EVENT",
            "data": alert.model_dump()
        })

    def publish_incident(self, incident: AIIncident) -> None:
        self._broadcast({
            "type": "AI_INCIDENT_EVENT",
            "data": incident.model_dump()
        })

    def publish_anomaly(self, anomaly: AIAnomaly) -> None:
        self._broadcast({
            "type": "AI_ANOMALY_EVENT",
            "data": anomaly.model_dump()
        })
