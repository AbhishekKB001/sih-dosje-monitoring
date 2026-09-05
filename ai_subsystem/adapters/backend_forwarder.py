"""
Backend Forwarder for Member 4 AI Subsystem.
Automatically intercepts AI alerts, anomalies, and multi-signal incidents
emitted by the AI Orchestrator and forwards them via HTTP POST to the
Central Backend API at http://localhost:4000/api/alerts.
"""

import json
import threading
import time
from typing import Any, Callable, Dict, Optional
import requests

from ai_subsystem.utils.logger import logger

DEFAULT_BACKEND_URL = "http://localhost:4000/api/alerts"


class BackendAlertForwarder:
    """
    Subscribes to AI pipeline events and dispatches HTTP webhooks to the central backend.
    """

    def __init__(self, backend_url: str = DEFAULT_BACKEND_URL, timeout_sec: float = 3.0):
        self.backend_url = backend_url
        self.timeout_sec = timeout_sec
        self.forwarded_count = 0
        self.failed_count = 0
        self._lock = threading.Lock()

    def handle_event(self, event_payload: Dict[str, Any]) -> None:
        """Callback invoked by InMemoryEventPublisher when an event occurs."""
        event_type = event_payload.get("type")

        if event_type in ("AI_ALERT_EVENT", "AI_INCIDENT_EVENT"):
            data = event_payload.get("data", {})
            self._forward_async(data)

    def _forward_async(self, alert_data: Dict[str, Any]) -> None:
        """Dispatches forwarder in a background thread to prevent blocking AI inference."""
        t = threading.Thread(target=self._send_payload, args=(alert_data,), daemon=True)
        t.start()

    def _send_payload(self, alert_data: Dict[str, Any]) -> bool:
        """Sends JSON payload to central backend."""
        try:
            headers = {"Content-Type": "application/json"}
            resp = requests.post(
                self.backend_url,
                json=alert_data,
                headers=headers,
                timeout=self.timeout_sec
            )
            if resp.status_code in (200, 201):
                with self._lock:
                    self.forwarded_count += 1
                logger.info(
                    f"[BackendForwarder] Successfully forwarded alert {alert_data.get('alert_id')} "
                    f"to {self.backend_url} (HTTP {resp.status_code})"
                )
                return True
            else:
                with self._lock:
                    self.failed_count += 1
                logger.warning(
                    f"[BackendForwarder] Backend responded with HTTP {resp.status_code}: {resp.text}"
                )
                return False
        except Exception as e:
            with self._lock:
                self.failed_count += 1
            logger.warning(f"[BackendForwarder] Failed to connect to central backend: {e}")
            return False


def attach_backend_forwarder(
    orchestrator: Any,
    backend_url: str = DEFAULT_BACKEND_URL
) -> BackendAlertForwarder:
    """
    Convenience factory: attaches forwarder to orchestrator's event publisher.
    """
    forwarder = BackendAlertForwarder(backend_url=backend_url)
    if hasattr(orchestrator, "event_publisher") and orchestrator.event_publisher:
        orchestrator.event_publisher.subscribe(forwarder.handle_event)
        logger.info(f"Attached AI Backend Forwarder target -> {backend_url}")
    return forwarder
