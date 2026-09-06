"""
KANAKA CHALA — Member 4 AI Subsystem
Multi-Signal Incident Correlation Engine

Combines related temporal, spatial, crowd, attendance, and visual-health anomaly
signals occurring within a configurable observation window into elevated,
explainable, and actionable AI incidents.
"""

from collections import deque
import time
from typing import Deque, Dict, List, Optional, Set
import uuid

from ai_subsystem.config import IncidentCorrelationConfig
from ai_subsystem.schemas import (
    AIAnomaly,
    AIIncident,
    AnomalyType,
    IncidentSeverity,
    IncidentStatus,
    IncidentType,
)
from ai_subsystem.utils.logger import logger


class IncidentCorrelationEngine:
    """
    Correlates individual AIAnomaly signals across time and space.
    Synthesizes multiple low- or medium-level warnings into high-priority incidents.
    """

    def __init__(
        self,
        camera_id: str,
        institution_id: Optional[str] = None,
        config: Optional[IncidentCorrelationConfig] = None,
        config_version: str = "cfg-2026.1",
        model_version: str = "v1.0.0"
    ):
        self.camera_id = camera_id
        self.institution_id = institution_id
        self.config = config or IncidentCorrelationConfig()
        self.config_version = config_version
        self.model_version = model_version

        # Sliding window buffer of recent anomalies: (timestamp_utc, anomaly)
        self._anomaly_buffer: Deque[AIAnomaly] = deque()

        # Active incident registry: incident_id -> AIIncident
        self._active_incidents: Dict[str, AIIncident] = {}

        # Cooldown tracker: incident_signature -> last_emitted_utc
        self._incident_cooldowns: Dict[str, float] = {}

    def _prune_buffer(self, now_ts: float) -> None:
        """Removes anomalies older than the correlation window."""
        window_sec = self.config.correlation_window_sec
        while self._anomaly_buffer and (now_ts - self._anomaly_buffer[0].timestamp_utc) > window_sec:
            self._anomaly_buffer.popleft()

    def process_anomalies(
        self,
        new_anomalies: List[AIAnomaly],
        timestamp_utc: Optional[float] = None
    ) -> List[AIIncident]:
        """
        Consumes new anomalies, updates correlation buffer, and returns any new/elevated incidents.
        """
        if not self.config.enabled:
            return []

        now_ts = timestamp_utc if timestamp_utc is not None else time.time()

        for anom in new_anomalies:
            self._anomaly_buffer.append(anom)

        self._prune_buffer(now_ts)

        generated_incidents: List[AIIncident] = []

        # Analyze current window buffer for multi-signal patterns
        anom_list = list(self._anomaly_buffer)
        if len(anom_list) < self.config.min_signals_to_escalate:
            return []

        # Group by anomaly types present in current window
        types_present: Set[AnomalyType] = {a.anomaly_type for a in anom_list}

        # 1. Pattern: Correlated Security Incursion
        # (Restricted Zone Breach + Loitering or After-Hours)
        if AnomalyType.RESTRICTED_ZONE_BREACH in types_present and (
            AnomalyType.LOITERING_DETECTED in types_present or AnomalyType.AFTER_HOURS_ACTIVITY in types_present
        ):
            sig = f"SEC_INCURSION:{self.camera_id}"
            if not self._is_cooling_down(sig, now_ts):
                inc = self._create_security_incident(anom_list, now_ts)
                self._record_cooldown(sig, now_ts)
                self._active_incidents[inc.incident_id] = inc
                generated_incidents.append(inc)

        # 2. Pattern: Correlated Operational Attendance Anomaly
        # (Attendance Discrepancy + Crowd Surge or Repeated Discrepancy)
        if AnomalyType.ATTENDANCE_DISCREPANCY in types_present and (
            AnomalyType.CROWD_SURGE in types_present
            or sum(1 for a in anom_list if a.anomaly_type == AnomalyType.ATTENDANCE_DISCREPANCY) >= 2
        ):
            sig = f"OP_ATTENDANCE:{self.camera_id}"
            if not self._is_cooling_down(sig, now_ts):
                inc = self._create_attendance_incident(anom_list, now_ts)
                self._record_cooldown(sig, now_ts)
                self._active_incidents[inc.incident_id] = inc
                generated_incidents.append(inc)

        # 3. Pattern: Crowd Safety Concern
        # (Multiple Crowd Surges in the window)
        crowd_count = sum(1 for a in anom_list if a.anomaly_type == AnomalyType.CROWD_SURGE)
        if crowd_count >= 2 and AnomalyType.RESTRICTED_ZONE_BREACH not in types_present:
            sig = f"CROWD_SAFETY:{self.camera_id}"
            if not self._is_cooling_down(sig, now_ts):
                inc = self._create_crowd_incident(anom_list, now_ts)
                self._record_cooldown(sig, now_ts)
                self._active_incidents[inc.incident_id] = inc
                generated_incidents.append(inc)

        return generated_incidents

    def _is_cooling_down(self, signature: str, now_ts: float) -> bool:
        last = self._incident_cooldowns.get(signature, 0.0)
        return (now_ts - last) < self.config.incident_cooldown_sec

    def _record_cooldown(self, signature: str, now_ts: float) -> None:
        self._incident_cooldowns[signature] = now_ts

    def _collect_contributing(self, matching_anomalies: List[AIAnomaly]) -> tuple[List[str], List[str]]:
        anom_ids = [a.anomaly_id for a in matching_anomalies]
        event_ids: List[str] = []
        for a in matching_anomalies:
            event_ids.extend(a.contributing_event_ids)
        return anom_ids, list(dict.fromkeys(event_ids))  # unique preserving order

    def _create_security_incident(self, all_anoms: List[AIAnomaly], now_ts: float) -> AIIncident:
        matching = [
            a for a in all_anoms
            if a.anomaly_type in (
                AnomalyType.RESTRICTED_ZONE_BREACH,
                AnomalyType.LOITERING_DETECTED,
                AnomalyType.AFTER_HOURS_ACTIVITY
            )
        ]
        anom_ids, evt_ids = self._collect_contributing(matching)
        first_ts = min(a.timestamp_utc for a in matching) if matching else now_ts

        target_zone = next((a.zone_name for a in matching if a.zone_name), "Secured Boundary")

        return AIIncident(
            incident_id=f"INC-SEC-{uuid.uuid4().hex[:8]}",
            camera_id=self.camera_id,
            institution_id=self.institution_id,
            zone_id=next((a.zone_id for a in matching if a.zone_id), None),
            zone_name=target_zone,
            incident_type=IncidentType.CORRELATED_SECURITY_INCURSION,
            severity=IncidentSeverity.CRITICAL,
            status=IncidentStatus.ACTIVE,
            start_time_utc=first_ts,
            last_updated_utc=now_ts,
            contributing_anomaly_ids=anom_ids,
            contributing_event_ids=evt_ids,
            signals_count=len(matching),
            explanation=(
                f"Multi-signal security incursion detected: Correlated restricted zone breach and "
                f"continued presence observed in '{target_zone}' on camera '{self.camera_id}'. "
                f"Combined evidence confirms persistent breach across {len(matching)} signals."
            ),
            recommended_action=(
                "Immediate physical security review recommended. Check perimeter access logs "
                "and verify on-site personnel authorization."
            ),
            config_version=self.config_version,
            model_version=self.model_version
        )

    def _create_attendance_incident(self, all_anoms: List[AIAnomaly], now_ts: float) -> AIIncident:
        matching = [
            a for a in all_anoms
            if a.anomaly_type in (AnomalyType.ATTENDANCE_DISCREPANCY, AnomalyType.CROWD_SURGE)
        ]
        anom_ids, evt_ids = self._collect_contributing(matching)
        first_ts = min(a.timestamp_utc for a in matching) if matching else now_ts

        return AIIncident(
            incident_id=f"INC-OPS-{uuid.uuid4().hex[:8]}",
            camera_id=self.camera_id,
            institution_id=self.institution_id,
            zone_id=next((a.zone_id for a in matching if a.zone_id), None),
            incident_type=IncidentType.OPERATIONAL_ATTENDANCE_ANOMALY,
            severity=IncidentSeverity.HIGH,
            status=IncidentStatus.ACTIVE,
            start_time_utc=first_ts,
            last_updated_utc=now_ts,
            contributing_anomaly_ids=anom_ids,
            contributing_event_ids=evt_ids,
            signals_count=len(matching),
            explanation=(
                f"Operational discrepancy correlated: Observed headcounts consistently differ "
                f"materially from reported administrative rosters over multiple observation intervals "
                f"on camera '{self.camera_id}'. Decision-support review flagged."
            ),
            recommended_action=(
                "Perform operational verification and cross-reference administrative attendance "
                "records with supervisor logs. No fraud is asserted by the system."
            ),
            config_version=self.config_version,
            model_version=self.model_version
        )

    def _create_crowd_incident(self, all_anoms: List[AIAnomaly], now_ts: float) -> AIIncident:
        matching = [a for a in all_anoms if a.anomaly_type == AnomalyType.CROWD_SURGE]
        anom_ids, evt_ids = self._collect_contributing(matching)
        first_ts = min(a.timestamp_utc for a in matching) if matching else now_ts

        target_zone = next((a.zone_name for a in matching if a.zone_name), "Monitored Zone")

        return AIIncident(
            incident_id=f"INC-CRWD-{uuid.uuid4().hex[:8]}",
            camera_id=self.camera_id,
            institution_id=self.institution_id,
            zone_id=next((a.zone_id for a in matching if a.zone_id), None),
            zone_name=target_zone,
            incident_type=IncidentType.CROWD_SAFETY_CONCERN,
            severity=IncidentSeverity.HIGH,
            status=IncidentStatus.ACTIVE,
            start_time_utc=first_ts,
            last_updated_utc=now_ts,
            contributing_anomaly_ids=anom_ids,
            contributing_event_ids=evt_ids,
            signals_count=len(matching),
            explanation=(
                f"Sustained crowd surge detected: Capacity thresholds repeatedly exceeded in "
                f"zone '{target_zone}'. Multiple observations indicate persistent high density."
            ),
            recommended_action=(
                "Review room capacity and open secondary egress or hall partitions to ease congestion."
            ),
            config_version=self.config_version,
            model_version=self.model_version
        )
