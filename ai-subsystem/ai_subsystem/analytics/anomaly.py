"""
KANAKA CHALA — Member 4 AI Subsystem
Anomaly Detection Engine (Decision-Support Analytics)

Consumes structured signals already produced by upstream visual health, spatial,
temporal, occupancy, and attendance engines and normalizes them into unified AIAnomalies.
Strictly employs neutral decision-support phrasing and enforces per-target cooldowns.
"""

import time
import uuid
from typing import Dict, List, Optional

from ai_subsystem.config import AnomalyConfig
from ai_subsystem.schemas import (
    AIAnomaly,
    AfterHoursEvent,
    AnomalySeverity,
    AnomalyType,
    AttendanceDiscrepancyEvent,
    CrowdSeverity,
    CrowdThresholdEvent,
    LoiteringEvent,
    VisualHealthResult,
    VisualHealthState,
    ZoneEventType,
    ZoneTransition,
)
from ai_subsystem.utils.logger import logger


class AnomalyEngine:
    """
    Dedicated anomaly normalization and evaluation engine.
    Consumes upstream detections, tracks, spatial transitions, temporal events,
    and attendance checks without repeating object detection inferences.
    """

    def __init__(
        self,
        camera_id: str,
        institution_id: Optional[str] = None,
        config: Optional[AnomalyConfig] = None,
        config_version: str = "cfg-2026.1",
        model_version: str = "v1.0.0"
    ):
        self.camera_id = camera_id
        self.institution_id = institution_id
        self.config = config or AnomalyConfig()
        self.config_version = config_version
        self.model_version = model_version

        # Target key -> last emitted anomaly timestamp for cooldown throttling
        self._last_emitted_ts: Dict[str, float] = {}

    def _generate_anomaly_id(self) -> str:
        return f"ANOM-{uuid.uuid4().hex[:8]}"

    def _is_cooling_down(self, target_key: str, now_ts: float) -> bool:
        last_ts = self._last_emitted_ts.get(target_key, 0.0)
        return (now_ts - last_ts) < self.config.cooldown_sec

    def _record_emission(self, target_key: str, now_ts: float) -> None:
        self._last_emitted_ts[target_key] = now_ts

    def evaluate_signals(
        self,
        zone_transitions: Optional[List[ZoneTransition]] = None,
        loitering_events: Optional[List[LoiteringEvent]] = None,
        after_hours_events: Optional[List[AfterHoursEvent]] = None,
        crowd_events: Optional[List[CrowdThresholdEvent]] = None,
        attendance_events: Optional[List[AttendanceDiscrepancyEvent]] = None,
        health_result: Optional[VisualHealthResult] = None,
        timestamp_utc: Optional[float] = None
    ) -> List[AIAnomaly]:
        """
        Evaluates active upstream events and converts them into normalized AIAnomalies.
        """
        if not self.config.enabled:
            return []

        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        anomalies: List[AIAnomaly] = []

        # 1. Restricted Zone Breaches
        if zone_transitions:
            for zt in zone_transitions:
                if zt.event_type == ZoneEventType.RESTRICTED_ZONE_BREACH:
                    target_key = f"RESTRICTED:{zt.zone_id}:{zt.track_id}"
                    if not self._is_cooling_down(target_key, now_ts):
                        self._record_emission(target_key, now_ts)
                        anom = AIAnomaly(
                            anomaly_id=self._generate_anomaly_id(),
                            camera_id=self.camera_id,
                            institution_id=self.institution_id,
                            zone_id=zt.zone_id,
                            zone_name=zt.zone_name,
                            timestamp_utc=now_ts,
                            anomaly_type=AnomalyType.RESTRICTED_ZONE_BREACH,
                            severity=AnomalySeverity.CRITICAL,
                            confidence_score=0.95,
                            contributing_event_ids=[zt.event_id],
                            explanation=(
                                f"Restricted zone boundary entry detected: Track ID #{zt.track_id} "
                                f"entered restricted zone '{zt.zone_name or zt.zone_id}'. "
                                f"Operational verification recommended."
                            ),
                            config_version=self.config_version,
                            model_version=self.model_version
                        )
                        anomalies.append(anom)

        # 2. Loitering Events
        if loitering_events:
            for loit in loitering_events:
                target_key = f"LOITER:{loit.zone_id}:{loit.track_id}"
                if not self._is_cooling_down(target_key, now_ts):
                    self._record_emission(target_key, now_ts)
                    anom = AIAnomaly(
                        anomaly_id=self._generate_anomaly_id(),
                        camera_id=self.camera_id,
                        institution_id=self.institution_id,
                        zone_id=loit.zone_id,
                        zone_name=loit.zone_name,
                        timestamp_utc=now_ts,
                        anomaly_type=AnomalyType.LOITERING_DETECTED,
                        severity=AnomalySeverity.MEDIUM,
                        confidence_score=0.85,
                        contributing_event_ids=[loit.event_id],
                        explanation=(
                            f"Stationary presence detected: Track ID #{loit.track_id} observed in "
                            f"zone '{loit.zone_name}' for {loit.dwell_time_sec:.1f}s, exceeding dwell "
                            f"threshold ({loit.threshold_sec:.1f}s). Decision-support alert generated."
                        ),
                        config_version=self.config_version,
                        model_version=self.model_version
                    )
                    anomalies.append(anom)

        # 3. After-Hours Activity
        if after_hours_events:
            for ah in after_hours_events:
                target_key = f"AFTER_HOURS:{ah.schedule_id}:{ah.track_id}"
                if not self._is_cooling_down(target_key, now_ts):
                    self._record_emission(target_key, now_ts)
                    anom = AIAnomaly(
                        anomaly_id=self._generate_anomaly_id(),
                        camera_id=self.camera_id,
                        institution_id=self.institution_id,
                        zone_id=None,
                        timestamp_utc=now_ts,
                        anomaly_type=AnomalyType.AFTER_HOURS_ACTIVITY,
                        severity=AnomalySeverity.HIGH,
                        confidence_score=0.90,
                        contributing_event_ids=[ah.event_id],
                        explanation=(
                            f"After-hours presence detected: Active entity #{ah.track_id} observed "
                            f"at {ah.observed_time_str} outside scheduled operational hours "
                            f"(Schedule: {ah.schedule_id}). Operational verification recommended."
                        ),
                        config_version=self.config_version,
                        model_version=self.model_version
                    )
                    anomalies.append(anom)

        # 4. Crowd Capacity Events
        if crowd_events:
            for crwd in crowd_events:
                target_key = f"CROWD:{crwd.zone_id or 'cam'}:{crwd.severity.value}"
                if not self._is_cooling_down(target_key, now_ts):
                    self._record_emission(target_key, now_ts)
                    sev = (
                        AnomalySeverity.CRITICAL
                        if crwd.severity == CrowdSeverity.CRITICAL
                        else AnomalySeverity.HIGH
                    )
                    anom = AIAnomaly(
                        anomaly_id=self._generate_anomaly_id(),
                        camera_id=self.camera_id,
                        institution_id=self.institution_id,
                        zone_id=crwd.zone_id,
                        zone_name=crwd.zone_name,
                        timestamp_utc=now_ts,
                        anomaly_type=AnomalyType.CROWD_SURGE,
                        severity=sev,
                        confidence_score=0.88,
                        contributing_event_ids=[crwd.event_id],
                        explanation=(
                            f"Crowd threshold exceeded: Observed occupancy ({crwd.current_occupancy}) "
                            f"exceeds {crwd.severity.value.lower()} threshold ({crwd.threshold}) in "
                            f"location '{crwd.zone_name or self.camera_id}'."
                        ),
                        config_version=self.config_version,
                        model_version=self.model_version
                    )
                    anomalies.append(anom)

        # 5. Attendance Discrepancy Events
        if attendance_events:
            for att in attendance_events:
                target_key = f"ATTENDANCE:{att.zone_id or 'cam'}"
                if not self._is_cooling_down(target_key, now_ts):
                    self._record_emission(target_key, now_ts)
                    anom = AIAnomaly(
                        anomaly_id=self._generate_anomaly_id(),
                        camera_id=self.camera_id,
                        institution_id=self.institution_id,
                        zone_id=att.zone_id,
                        timestamp_utc=now_ts,
                        anomaly_type=AnomalyType.ATTENDANCE_DISCREPANCY,
                        severity=AnomalySeverity.HIGH,
                        confidence_score=0.92,
                        contributing_event_ids=[att.event_id],
                        explanation=att.explanation,
                        config_version=self.config_version,
                        model_version=self.model_version
                    )
                    anomalies.append(anom)

        # 6. Visual Health Anomaly
        if health_result and not health_result.is_healthy:
            target_key = f"HEALTH:{health_result.state.value}"
            if not self._is_cooling_down(target_key, now_ts):
                self._record_emission(target_key, now_ts)
                anom = AIAnomaly(
                    anomaly_id=self._generate_anomaly_id(),
                    camera_id=self.camera_id,
                    institution_id=self.institution_id,
                    zone_id=None,
                    timestamp_utc=now_ts,
                    anomaly_type=AnomalyType.VISUAL_STREAM_ANOMALY,
                    severity=AnomalySeverity.HIGH,
                    confidence_score=0.95,
                    contributing_event_ids=[f"VH-{health_result.frame_index}"],
                    explanation=(
                        f"Camera visual feed quality anomaly: State={health_result.state.value} "
                        f"detected on camera '{self.camera_id}'. {health_result.fault_reason} "
                        f"Technical check recommended."
                    ),
                    config_version=self.config_version,
                    model_version=self.model_version
                )
                anomalies.append(anom)

        return anomalies
