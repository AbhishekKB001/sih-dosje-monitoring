"""
Abstract Storage Adapter for Member 4 AI Subsystem.
Decouples evidence/event persistence from specific database technologies (Postgres/MongoDB/S3).
Provides local file and structured JSON audit log persistence.
"""

import json
import os
import threading
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from ai_subsystem.schemas import (
    AIAlert,
    AIAnomaly,
    AIIncident,
    EvidenceRecord,
    HumanReviewRecord,
    StreamEvent,
)
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

    @abstractmethod
    def save_alert(self, alert: AIAlert) -> None:
        """Persists an actionable AI alert."""
        pass

    @abstractmethod
    def save_evidence_record(self, record: EvidenceRecord) -> None:
        """Persists a sealed evidence snapshot record."""
        pass

    @abstractmethod
    def save_review_record(self, record: HumanReviewRecord) -> None:
        """Persists a human supervisor audit review record."""
        pass


class LocalStorageAdapter(BaseStorageAdapter):
    """
    Default local filesystem and structured JSON storage adapter.
    Persists audit records to disk safely with thread synchronization.
    """

    def __init__(self, base_dir: str = "evidence_store"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)
        self.audit_file = os.path.join(self.base_dir, "audit_log.json")
        self._lock = threading.Lock()
        self.health_events: List[StreamEvent] = []
        self._init_audit_file()

    def _init_audit_file(self) -> None:
        """Ensures audit_log.json exists and contains a valid JSON structure."""
        with self._lock:
            if not os.path.exists(self.audit_file):
                initial_data = {
                    "alerts": [],
                    "anomalies": [],
                    "incidents": [],
                    "evidence": [],
                    "reviews": []
                }
                with open(self.audit_file, "w", encoding="utf-8") as f:
                    json.dump(initial_data, f, indent=2)

    def _append_record(self, section: str, record_data: Dict[str, Any]) -> None:
        """Thread-safe append of a record to the persistent audit log."""
        with self._lock:
            try:
                if os.path.exists(self.audit_file):
                    with open(self.audit_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                else:
                    data = {"alerts": [], "anomalies": [], "incidents": [], "evidence": [], "reviews": []}

                if section not in data:
                    data[section] = []

                # Update or append by primary ID
                id_key = "alert_id" if section == "alerts" else "evidence_id" if section == "evidence" else "review_id" if section == "reviews" else "incident_id" if section == "incidents" else "anomaly_id"
                existing_idx = None
                for idx, item in enumerate(data[section]):
                    if item.get(id_key) == record_data.get(id_key):
                        existing_idx = idx
                        break

                if existing_idx is not None:
                    data[section][existing_idx] = record_data
                else:
                    data[section].append(record_data)

                # Atomic write via temp file
                tmp_file = self.audit_file + ".tmp"
                with open(tmp_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                os.replace(tmp_file, self.audit_file)
            except Exception as e:
                logger.error(f"Failed to persist {section} record to {self.audit_file}: {e}")

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

    def save_alert(self, alert: AIAlert) -> None:
        self._append_record("alerts", alert.model_dump())

    def save_anomaly(self, anomaly: AIAnomaly) -> None:
        self._append_record("anomalies", anomaly.model_dump())

    def save_incident(self, incident: AIIncident) -> None:
        self._append_record("incidents", incident.model_dump())

    def save_evidence_record(self, record: EvidenceRecord) -> None:
        self._append_record("evidence", record.model_dump())

    def save_review_record(self, record: HumanReviewRecord) -> None:
        self._append_record("reviews", record.model_dump())

    def get_audit_log(self) -> Dict[str, Any]:
        """Reads and returns the complete persistent audit log."""
        with self._lock:
            if not os.path.exists(self.audit_file):
                return {"alerts": [], "anomalies": [], "incidents": [], "evidence": [], "reviews": []}
            try:
                with open(self.audit_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to read audit log {self.audit_file}: {e}")
                return {"alerts": [], "anomalies": [], "incidents": [], "evidence": [], "reviews": []}
