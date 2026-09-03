"""
KANAKA CHALA — Member 4 AI Subsystem
Non-Biometric Attendance Consistency Engine (Phase 4)

Compares reported administrative attendance numbers against anonymous observed
occupancy statistics (peak/average) across a configurable observation window.
Zero facial recognition or biometric profiling is performed.
Adheres strictly to neutral operational review terminology (never claims fraud).
"""

import time
from typing import Dict, Optional
import uuid

from ai_subsystem.config import AttendanceConsistencyConfig
from ai_subsystem.schemas import (
    AttendanceDiscrepancyEvent,
    OccupancySnapshot,
    ReportedAttendance,
)
from ai_subsystem.utils.logger import get_logger

logger = get_logger("analytics.attendance")


class AttendanceConsistencyEngine:
    """
    Evaluates consistency between reported attendance and computer-vision observed occupancy.
    Strictly operational decision-support tool; does NOT declare fraud or identity violations.
    """

    # Strictly mandated neutral operational phrasing
    NEUTRAL_DISCREPANCY_NOTICE = (
        "Observed occupancy differs materially from reported attendance. Operational verification recommended."
    )

    def __init__(
        self,
        camera_id: str,
        config: Optional[AttendanceConsistencyConfig] = None,
        config_version: str = "cfg-2026.4",
        model_version: str = "v1.0.0"
    ):
        self.camera_id = camera_id
        self.config = config or AttendanceConsistencyConfig()
        self.config_version = config_version
        self.model_version = model_version

        # Stored reported attendance records: key -> ReportedAttendance
        self._reported_records: Dict[str, ReportedAttendance] = {}
        # Target -> last discrepancy alert timestamp (to prevent spamming every frame)
        self._last_alert_ts: Dict[str, float] = {}
        # Camera -> first evaluation timestamp (to avoid premature flags on start)
        self._first_seen_ts: Dict[str, float] = {}

    def register_reported_attendance(self, record: ReportedAttendance) -> None:
        """
        Registers an official reported attendance record for this camera or institution.
        """
        key = self._make_record_key(record.camera_id, record.zone_id, record.session_name)
        self._reported_records[key] = record
        logger.info(
            f"[{self.camera_id}] Registered reported attendance: {record.reported_count} "
            f"for session '{record.session_name}' (Institution: {record.institution_id})"
        )

    def evaluate_consistency(
        self,
        occupancy_snapshot: OccupancySnapshot,
        reported_attendance: Optional[ReportedAttendance] = None,
        timestamp_utc: Optional[float] = None,
        alert_cooldown_sec: Optional[float] = None
    ) -> Optional[AttendanceDiscrepancyEvent]:
        """
        Compares observed occupancy snapshot against reported attendance figure.

        Args:
            occupancy_snapshot: Snapshot containing observed peak and average occupancy.
            reported_attendance: Optional explicit record; if omitted, checks registered records.
            timestamp_utc: Explicit evaluation timestamp.
            alert_cooldown_sec: Optional override for seconds between emitted alerts.

        Returns:
            AttendanceDiscrepancyEvent if discrepancy exceeds configured tolerance, else None.
        """
        if not self.config.enabled:
            return None

        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        cooldown = alert_cooldown_sec if alert_cooldown_sec is not None else self.config.alert_cooldown_sec

        # 1. Resolve applicable reported record
        record = reported_attendance
        if record is None:
            # Look up matching records registered for this camera / zone
            matching = [
                r for r in self._reported_records.values()
                if (r.camera_id in (None, self.camera_id))
                and (r.zone_id == occupancy_snapshot.zone_id)
            ]
            if matching:
                # Use the most recent registered record
                record = sorted(matching, key=lambda x: x.timestamp_utc, reverse=True)[0]

        if record is None:
            return None

        # 2. Validate reported attendance minimum threshold
        reported_count = record.reported_count
        if reported_count < self.config.min_reported_attendance_for_check:
            # Below minimum sample size to avoid false flags
            return None

        # 3. Determine observed comparison metric (peak or average)
        if self.config.use_peak_occupancy:
            observed_count = occupancy_snapshot.peak_occupancy
            metric_label = "peak"
        else:
            observed_count = int(round(occupancy_snapshot.avg_occupancy))
            metric_label = "average"

        # 4. Check if 0-occupancy check is premature on a brand new stream
        first_ts = self._first_seen_ts.setdefault(self.camera_id, now_ts)
        if observed_count == 0 and (now_ts - first_ts) < self.config.min_observation_sec:
            return None

        # 5. Calculate discrepancy metrics
        # Discrepancy value: difference between reported attendance and observed occupancy
        diff = reported_count - observed_count
        abs_diff = abs(diff)
        pct_diff = (abs_diff / float(reported_count)) * 100.0

        # 6. Check if discrepancy exceeds tolerances
        tolerance_pct = self.config.tolerance_percentage
        min_abs_tol = self.config.min_tolerance_absolute

        is_discrepant = (pct_diff > tolerance_pct) and (abs_diff >= min_abs_tol)

        target_key = f"{self.camera_id}:{occupancy_snapshot.zone_id or 'all'}:{record.session_name}"

        if not is_discrepant:
            return None

        # 7. Check alert cooldown
        last_alert = self._last_alert_ts.get(target_key, 0.0)
        if (now_ts - last_alert) < cooldown:
            return None

        self._last_alert_ts[target_key] = now_ts

        # 7. Formulate strictly neutral explainable event
        window_sec = occupancy_snapshot.window_duration_sec
        location_desc = f"zone '{occupancy_snapshot.zone_name}'" if occupancy_snapshot.zone_name else f"camera '{self.camera_id}'"

        explanation = (
            f"{self.NEUTRAL_DISCREPANCY_NOTICE} "
            f"Location: {location_desc} | "
            f"Reported attendance: {reported_count} | "
            f"Observed {metric_label} occupancy: {observed_count} (over {window_sec:.0f}s window) | "
            f"Difference: {diff:+d} ({pct_diff:.1f}%) | "
            f"Configured tolerance: {tolerance_pct:.1f}% (min difference: {min_abs_tol})."
        )

        return AttendanceDiscrepancyEvent(
            event_id=f"EVT-DISC-{uuid.uuid4().hex[:8]}",
            camera_id=self.camera_id,
            institution_id=record.institution_id,
            zone_id=occupancy_snapshot.zone_id,
            timestamp_utc=now_ts,
            reported_attendance=reported_count,
            observed_occupancy=observed_count,
            observation_window_sec=window_sec,
            discrepancy_value=diff,
            discrepancy_percentage=round(pct_diff, 2),
            tolerance_percentage=tolerance_pct,
            explanation=explanation,
            config_version=self.config_version,
            model_version=self.model_version
        )

    @staticmethod
    def _make_record_key(camera_id: Optional[str], zone_id: Optional[str], session_name: str = "Standard Session") -> str:
        return f"{camera_id or '*'}:{zone_id or '*'}:{session_name}"
