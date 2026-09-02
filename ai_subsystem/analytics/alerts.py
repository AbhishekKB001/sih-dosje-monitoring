"""
KANAKA CHALA — Member 4 AI Subsystem
AI Alert Manager & Lifecycle Engine

Manages high-priority actionable alerts generated from anomalies and correlated incidents.
Enforces deduplication, cooldown throttling, explainability, and supervisor lifecycle transitions:
NEW -> ACKNOWLEDGED -> RESOLVED (or DISMISSED).
"""

import time
from typing import Dict, List, Optional
import uuid

from ai_subsystem.config import AlertManagerConfig
from ai_subsystem.schemas import (
    AIAlert,
    AIAnomaly,
    AIIncident,
    AlertLifecycleState,
    AlertSeverity,
    AnomalySeverity,
    IncidentSeverity,
)
from ai_subsystem.utils.logger import logger


class AIAlertManager:
    """
    Dedicated AI Alert Manager for authorized inspection and monitoring personnel.
    Maintains alert lifecycle and suppresses notification floods.
    """

    def __init__(
        self,
        camera_id: str,
        institution_id: Optional[str] = None,
        config: Optional[AlertManagerConfig] = None,
        config_version: str = "cfg-2026.1",
        model_version: str = "v1.0.0"
    ):
        self.camera_id = camera_id
        self.institution_id = institution_id
        self.config = config or AlertManagerConfig()
        self.config_version = config_version
        self.model_version = model_version

        # Registry of alerts: alert_id -> AIAlert
        self._alerts: Dict[str, AIAlert] = {}

        # Cooldown tracker: alert_signature -> last_emitted_ts
        self._alert_cooldowns: Dict[str, float] = {}

    def _is_cooling_down(self, signature: str, now_ts: float) -> bool:
        last = self._alert_cooldowns.get(signature, 0.0)
        return (now_ts - last) < self.config.alert_cooldown_sec

    def _record_cooldown(self, signature: str, now_ts: float) -> None:
        self._alert_cooldowns[signature] = now_ts

    def create_alert_from_incident(
        self,
        incident: AIIncident,
        timestamp_utc: Optional[float] = None
    ) -> Optional[AIAlert]:
        """
        Creates an actionable AIAlert from a correlated incident if cooldown allows.
        """
        if not self.config.enabled:
            return None

        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        sig = f"INC_ALERT:{self.camera_id}:{incident.incident_type.value}:{incident.zone_id or 'all'}"

        if self._is_cooling_down(sig, now_ts):
            return None

        self._record_cooldown(sig, now_ts)

        sev = (
            AlertSeverity.CRITICAL
            if incident.severity == IncidentSeverity.CRITICAL
            else AlertSeverity.WARNING
        )

        alert_id = f"ALT-INC-{uuid.uuid4().hex[:8]}"
        alert = AIAlert(
            alert_id=alert_id,
            incident_id=incident.incident_id,
            camera_id=self.camera_id,
            institution_id=self.institution_id or incident.institution_id,
            zone_id=incident.zone_id,
            alert_type=incident.incident_type.value,
            severity=sev,
            lifecycle_state=AlertLifecycleState.NEW,
            created_at_utc=now_ts,
            title=f"Incident Alert: {incident.incident_type.value.replace('_', ' ').title()}",
            explanation=incident.explanation,
            recommended_action=incident.recommended_action,
            contributing_signal_ids=incident.contributing_anomaly_ids,
            config_version=self.config_version,
            model_version=self.model_version
        )

        self._alerts[alert_id] = alert
        logger.info(f"[{self.camera_id}] Generated AI Alert '{alert_id}' ({alert.severity.value}) for incident '{incident.incident_id}'")
        return alert

    def create_alert_from_anomaly(
        self,
        anomaly: AIAnomaly,
        timestamp_utc: Optional[float] = None
    ) -> Optional[AIAlert]:
        """
        Creates an actionable AIAlert from a standalone high-severity anomaly if cooldown allows.
        """
        if not self.config.enabled:
            return None

        # Standalone alerts only generated for HIGH or CRITICAL anomalies
        if anomaly.severity not in (AnomalySeverity.HIGH, AnomalySeverity.CRITICAL):
            return None

        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        sig = f"ANOM_ALERT:{self.camera_id}:{anomaly.anomaly_type.value}:{anomaly.zone_id or 'all'}"

        if self._is_cooling_down(sig, now_ts):
            return None

        self._record_cooldown(sig, now_ts)

        sev = (
            AlertSeverity.CRITICAL
            if anomaly.severity == AnomalySeverity.CRITICAL
            else AlertSeverity.WARNING
        )

        alert_id = f"ALT-ANOM-{uuid.uuid4().hex[:8]}"
        alert = AIAlert(
            alert_id=alert_id,
            anomaly_id=anomaly.anomaly_id,
            camera_id=self.camera_id,
            institution_id=self.institution_id or anomaly.institution_id,
            zone_id=anomaly.zone_id,
            alert_type=anomaly.anomaly_type.value,
            severity=sev,
            lifecycle_state=AlertLifecycleState.NEW,
            created_at_utc=now_ts,
            title=f"Anomaly Alert: {anomaly.anomaly_type.value.replace('_', ' ').title()}",
            explanation=anomaly.explanation,
            recommended_action="Operational verification recommended. Review CCTV footage.",
            contributing_signal_ids=anomaly.contributing_event_ids,
            config_version=self.config_version,
            model_version=self.model_version
        )

        self._alerts[alert_id] = alert
        logger.info(f"[{self.camera_id}] Generated AI Alert '{alert_id}' ({alert.severity.value}) for anomaly '{anomaly.anomaly_id}'")
        return alert

    def acknowledge_alert(
        self,
        alert_id: str,
        user_id: str,
        notes: Optional[str] = None,
        timestamp_utc: Optional[float] = None
    ) -> Optional[AIAlert]:
        """Transitions alert state to ACKNOWLEDGED."""
        alert = self._alerts.get(alert_id)
        if not alert:
            return None

        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        alert.lifecycle_state = AlertLifecycleState.ACKNOWLEDGED
        alert.acknowledged_at_utc = now_ts
        alert.acknowledged_by = user_id
        if notes:
            alert.resolution_notes = notes

        logger.info(f"[{self.camera_id}] Alert '{alert_id}' ACKNOWLEDGED by user '{user_id}'")
        return alert

    def resolve_alert(
        self,
        alert_id: str,
        user_id: str,
        notes: str,
        timestamp_utc: Optional[float] = None
    ) -> Optional[AIAlert]:
        """Transitions alert state to RESOLVED with mandatory supervisor notes."""
        alert = self._alerts.get(alert_id)
        if not alert:
            return None

        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        alert.lifecycle_state = AlertLifecycleState.RESOLVED
        alert.resolved_at_utc = now_ts
        alert.resolution_notes = notes

        logger.info(f"[{self.camera_id}] Alert '{alert_id}' RESOLVED by user '{user_id}' (Notes: {notes})")
        return alert

    def dismiss_alert(
        self,
        alert_id: str,
        user_id: str,
        notes: str,
        timestamp_utc: Optional[float] = None
    ) -> Optional[AIAlert]:
        """Transitions alert state to DISMISSED (e.g. false alarm)."""
        alert = self._alerts.get(alert_id)
        if not alert:
            return None

        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        alert.lifecycle_state = AlertLifecycleState.DISMISSED
        alert.resolved_at_utc = now_ts
        alert.resolution_notes = notes

        logger.info(f"[{self.camera_id}] Alert '{alert_id}' DISMISSED by user '{user_id}' (Notes: {notes})")
        return alert

    def get_active_alerts(self) -> List[AIAlert]:
        """Returns all alerts currently in NEW or ACKNOWLEDGED state."""
        return [
            a for a in self._alerts.values()
            if a.lifecycle_state in (AlertLifecycleState.NEW, AlertLifecycleState.ACKNOWLEDGED)
        ]

    def get_alert(self, alert_id: str) -> Optional[AIAlert]:
        return self._alerts.get(alert_id)
