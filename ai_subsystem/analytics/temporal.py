"""
Temporal Analytics Engine for Member 4 AI Subsystem.
Implements Dwell Time Tracking, Confirmed Loitering Detection, and After-Hours Activity Monitoring.
"""

from datetime import datetime, timezone
import time
from typing import Dict, List, Optional, Set, Tuple
import uuid

from ai_subsystem.analytics.schedule import ScheduleEvaluator
from ai_subsystem.analytics.spatial import PolygonZoneEngine
from ai_subsystem.config import TemporalConfig
from ai_subsystem.schemas import (
    AfterHoursEvent,
    LoiteringEvent,
    OperationalSchedule,
    Track,
    TrackState,
    Zone,
)
from ai_subsystem.utils.logger import logger


class TemporalEngine:
    """
    Coordinates temporal intelligence for a specific camera:
    - Measures persistent track dwell times across zones and camera FOV.
    - Detects loitering with temporal confirmation to eliminate false triggers.
    - Detects after-hours security violations against configured operational schedules.
    """

    def __init__(
        self,
        camera_id: str,
        config: Optional[TemporalConfig] = None,
        schedule: Optional[OperationalSchedule] = None,
    ):
        self.camera_id = camera_id
        self.config = config or TemporalConfig()
        self.schedule = schedule

        # Loitering state tracking:
        # Key: (track_id, zone_id) -> consecutive_frames_over_thresh
        self._loiter_confirmations: Dict[Tuple[int, str], int] = {}
        # Key: (track_id, zone_id) -> bool (has already fired alert for this visit)
        self._loiter_alerted: Dict[Tuple[int, str], bool] = {}

        # After-hours state tracking:
        # Key: track_id -> last_after_hours_alert_ts
        self._after_hours_alerted: Dict[int, float] = {}

    def set_schedule(self, schedule: Optional[OperationalSchedule]) -> None:
        """Updates or sets the active schedule for this camera."""
        self.schedule = schedule

    def update(
        self,
        tracks: List[Track],
        zone_engine: PolygonZoneEngine,
        timestamp_utc: Optional[float] = None
    ) -> Tuple[List[LoiteringEvent], List[AfterHoursEvent]]:
        """
        Evaluates active tracks for loitering and after-hours security conditions.
        Returns tuples of (loitering_events, after_hours_events).
        """
        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        loitering_events: List[LoiteringEvent] = []
        after_hours_events: List[AfterHoursEvent] = []

        active_track_ids = {t.track_id for t in tracks if t.state == TrackState.ACTIVE}

        # Clean up stale tracks from memory
        self._clean_stale_records(active_track_ids)

        zones = zone_engine.get_zones()

        for track in tracks:
            if track.state != TrackState.ACTIVE:
                continue

            # =========================================================
            # 1. Zone Loitering Evaluation
            # =========================================================
            for zone in zones:
                if not zone.enabled:
                    continue

                threshold_sec = zone.loitering_threshold_sec or self.config.default_loitering_threshold_sec
                dwell_sec = zone_engine.get_track_dwell_time(track.track_id, zone.zone_id, now_ts)
                key = (track.track_id, zone.zone_id)

                if dwell_sec >= threshold_sec:
                    # Increment confirmation frames counter
                    self._loiter_confirmations[key] = self._loiter_confirmations.get(key, 0) + 1
                    already_alerted = self._loiter_alerted.get(key, False)

                    # Check if temporal confirmation threshold reached and not already alerted
                    if (
                        self._loiter_confirmations[key] >= self.config.loitering_confirmation_frames
                        and not already_alerted
                    ):
                        self._loiter_alerted[key] = True
                        loitering_events.append(LoiteringEvent(
                            event_id=f"EVT-LOIT-{uuid.uuid4().hex[:8]}",
                            camera_id=self.camera_id,
                            track_id=track.track_id,
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            dwell_time_sec=dwell_sec,
                            threshold_sec=threshold_sec,
                            timestamp_utc=now_ts,
                            explanation=(
                                f"Track ID #{track.track_id} ({track.class_name}) LOITERING in zone "
                                f"'{zone.name}' for {dwell_sec:.1f}s (threshold: {threshold_sec:.1f}s, "
                                f"confirmed across {self._loiter_confirmations[key]} frames)"
                            )
                        ))
                else:
                    # If track has exited or is below threshold, reset confirmation and alert state
                    if dwell_sec == 0.0:
                        self._loiter_confirmations.pop(key, None)
                        self._loiter_alerted.pop(key, None)

            # =========================================================
            # 2. After-Hours Activity Evaluation
            # =========================================================
            if self.schedule and self.schedule.enabled and self.schedule.allowed_windows:
                is_operational = ScheduleEvaluator.is_operational_time(self.schedule, now_ts)
                
                if not is_operational:
                    last_alert = self._after_hours_alerted.get(track.track_id, 0.0)
                    # 30 second cooldown per track to prevent telemetry flooding
                    if (now_ts - last_alert) >= 30.0 and track.hits_count >= 2:
                        self._after_hours_alerted[track.track_id] = now_ts
                        time_str = datetime.fromtimestamp(now_ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                        after_hours_events.append(AfterHoursEvent(
                            event_id=f"EVT-AFTH-{uuid.uuid4().hex[:8]}",
                            camera_id=self.camera_id,
                            track_id=track.track_id,
                            schedule_id=self.schedule.schedule_id,
                            observed_time_str=time_str,
                            timestamp_utc=now_ts,
                            explanation=(
                                f"AFTER-HOURS ACTIVITY: Track ID #{track.track_id} ({track.class_name}) "
                                f"observed active at {time_str} outside authorized operating schedule "
                                f"'{self.schedule.name}'"
                            )
                        ))

        return loitering_events, after_hours_events

    def _clean_stale_records(self, active_track_ids: Set[int]) -> None:
        """Evicts expired tracks from internal tracking registries."""
        stale_loiter_keys = [k for k in self._loiter_confirmations.keys() if k[0] not in active_track_ids]
        for k in stale_loiter_keys:
            self._loiter_confirmations.pop(k, None)
            self._loiter_alerted.pop(k, None)

        stale_after_hours = [tid for tid in self._after_hours_alerted.keys() if tid not in active_track_ids]
        for tid in stale_after_hours:
            self._after_hours_alerted.pop(tid, None)
