"""
Abstract Storage Adapter for Member 4 AI Subsystem.
Decouples evidence/event persistence from specific database technologies (Postgres/MongoDB/S3).
"""

from abc import ABC, abstractmethod
import os
from typing import Any, Dict, Optional
from ai_subsystem.schemas import StreamEvent
from ai_subsystem.utils.logger import logger


class BaseStorageAdapter(ABC):
    """
    Abstract contract for persisting AI evidence files, events, and audit metadata.
    """

    @abstractmethod
    def save_evidence_snapshot(
        self,
        camera_id: str,
        event_id: str,
        image_bgr: Any,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Saves annotated snapshot and returns URI/filepath."""
        pass

    @abstractmethod
    def save_health_event(self, event: StreamEvent) -> None:
        """Persists a stream health or degradation event."""
        pass


class LocalStorageAdapter(BaseStorageAdapter):
    """
    Default local filesystem and in-memory storage adapter for development and demo mode.
    """

    def __init__(self, base_dir: str = "evidence_store"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)
        self.health_events: list[StreamEvent] = []

    def save_evidence_snapshot(
        self,
        camera_id: str,
        event_id: str,
        image_bgr: Any,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        import cv2
        filename = f"{camera_id}_{event_id}.jpg"
        filepath = os.path.join(self.base_dir, filename)
        if image_bgr is not None:
            cv2.imwrite(filepath, image_bgr)
            logger.info(f"Saved evidence snapshot to {filepath}")
        return filepath

    def save_health_event(self, event: StreamEvent) -> None:
        self.health_events.append(event)
        logger.info(f"Logged health event [{event.event_type}] for camera {event.camera_id}")
