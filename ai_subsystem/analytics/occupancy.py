"""
KANAKA CHALA — Member 4 AI Subsystem
Occupancy & Crowd Analytics Engine (Phase 4)

Calculates real-time, peak, minimum, and rolling-window average occupancy per camera
and per configured polygon zone using anonymous Track IDs from ByteTrack.
Monitors crowd thresholds with multi-frame temporal confirmation and cooldown throttling.
"""

from collections import deque
import time
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid

from ai_subsystem.analytics.spatial import PolygonZoneEngine, is_point_in_polygon
from ai_subsystem.config import OccupancyConfig
from ai_subsystem.schemas import (
    CrowdSeverity,
    CrowdThresholdEvent,
    OccupancySnapshot,
    Track,
    TrackState,
    Zone,
)
from ai_subsystem.utils.logger import get_logger

logger = get_logger("analytics.occupancy")


class OccupancyAnalyzer:
    """
    Analyzes anonymous tracked person entities to compute real-time and windowed occupancy.
    Provides strict multi-camera and per-zone isolation.
    """

    def __init__(self, camera_id: str, config: Optional[OccupancyConfig] = None):
        self.camera_id = camera_id
        self.config = config or OccupancyConfig()

        # Rolling observation histories: deque of (timestamp_utc, count)
        self._camera_history: deque[Tuple[float, int]] = deque()
        self._zone_histories: Dict[str, deque[Tuple[float, int]]] = {}

    def update(
        self,
        tracks: List[Track],
        zone_engine: Optional[PolygonZoneEngine] = None,
        timestamp_utc: Optional[float] = None
    ) -> Tuple[OccupancySnapshot, List[OccupancySnapshot]]:
        """
        Updates occupancy statistics from the current frame's tracks.

        Args:
            tracks: List of current Tracks from ByteTrack.
            zone_engine: Optional camera-specific PolygonZoneEngine.
            timestamp_utc: Explicit timestamp or system clock.

        Returns:
            Tuple of (camera_snapshot, list_of_zone_snapshots).
        """
        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        window_sec = self.config.window_duration_sec

        # 1. Filter ACTIVE person tracks and deduplicate track IDs in this frame
        active_person_tracks = [
            t for t in tracks
            if t.state == TrackState.ACTIVE and t.class_name == "person"
        ]
        unique_active_tracks = {t.track_id: t for t in active_person_tracks}
        camera_current_count = len(unique_active_tracks)

        # 2. Update camera rolling history
        self._camera_history.append((now_ts, camera_current_count))
        self._prune_history(self._camera_history, now_ts, window_sec)
        cam_peak, cam_min, cam_avg = self._compute_window_stats(self._camera_history, camera_current_count)

        camera_snapshot = OccupancySnapshot(
            timestamp_utc=now_ts,
            camera_id=self.camera_id,
            zone_id=None,
            zone_name=None,
            current_occupancy=camera_current_count,
            peak_occupancy=cam_peak,
            min_occupancy=cam_min,
            avg_occupancy=round(cam_avg, 2),
            window_duration_sec=window_sec,
            active_track_ids=sorted(list(unique_active_tracks.keys()))
        )

        # 3. Calculate per-zone occupancy if zone_engine provided
        zone_snapshots: List[OccupancySnapshot] = []
        if zone_engine is not None:
            zones = zone_engine.get_zones()
            for zone in zones:
                if not zone.enabled:
                    continue

                zone_id = zone.zone_id
                if zone_id not in self._zone_histories:
                    self._zone_histories[zone_id] = deque()

                # Find tracks inside this zone using bottom-center contact point
                tracks_in_zone: Set[int] = set()
                for track_id, track in unique_active_tracks.items():
                    pt = track.bottom_center
                    if is_point_in_polygon(pt, zone.polygon):
                        tracks_in_zone.add(track_id)

                zone_current_count = len(tracks_in_zone)
                z_hist = self._zone_histories[zone_id]
                z_hist.append((now_ts, zone_current_count))
                self._prune_history(z_hist, now_ts, window_sec)
                z_peak, z_min, z_avg = self._compute_window_stats(z_hist, zone_current_count)

                zone_snapshots.append(OccupancySnapshot(
                    timestamp_utc=now_ts,
                    camera_id=self.camera_id,
                    zone_id=zone.zone_id,
                    zone_name=zone.name,
                    current_occupancy=zone_current_count,
                    peak_occupancy=z_peak,
                    min_occupancy=z_min,
                    avg_occupancy=round(z_avg, 2),
                    window_duration_sec=window_sec,
                    active_track_ids=sorted(list(tracks_in_zone))
                ))

        return camera_snapshot, zone_snapshots

    @staticmethod
    def _prune_history(history: deque[Tuple[float, int]], now_ts: float, window_sec: float) -> None:
        """Removes observations older than (now_ts - window_sec)."""
        cutoff = now_ts - window_sec
        while history and history[0][0] < cutoff:
            history.popleft()

    @staticmethod
    def _compute_window_stats(
        history: deque[Tuple[float, int]], current_count: int
    ) -> Tuple[int, int, float]:
        """Calculates peak, minimum, and average occupancy from history."""
        if not history:
            return current_count, current_count, float(current_count)
        counts = [item[1] for item in history]
        return max(counts), min(counts), sum(counts) / len(counts)


class CrowdAnalyticsEngine:
    """
    Evaluates occupancy snapshots against capacity and crowd density thresholds.
    Supports temporal confirmation and cooldown suppression.
    """

    def __init__(self, camera_id: str, config: Optional[OccupancyConfig] = None):
        self.camera_id = camera_id
        self.config = config or OccupancyConfig()

        # Target ID -> consecutive frame count exceeding threshold
        # Target ID can be camera_id or zone_id
        self._confirmations: Dict[str, int] = {}
        # Target ID -> last alert timestamp
        self._last_alert_ts: Dict[str, float] = {}

    def evaluate(
        self,
        camera_snapshot: OccupancySnapshot,
        zone_snapshots: List[OccupancySnapshot],
        zones_map: Optional[Any] = None,
        timestamp_utc: Optional[float] = None
    ) -> List[CrowdThresholdEvent]:
        """
        Evaluates current occupancy against capacity thresholds for camera and zones.
        """
        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        events: List[CrowdThresholdEvent] = []
        if isinstance(zones_map, dict):
            z_dict = zones_map
        elif isinstance(zones_map, list):
            z_dict = {z.zone_id: z for z in zones_map}
        else:
            z_dict = {}

        # 1. Evaluate zone occupancies
        for z_snap in zone_snapshots:
            zone_id = z_snap.zone_id or ""
            zone = z_dict.get(zone_id)
            if not zone or not zone.enabled:
                continue

            max_cap = zone.max_capacity or self.config.default_max_capacity
            warn_threshold = zone.warning_threshold or int(max_cap * self.config.capacity_warning_ratio)
            crit_threshold = zone.critical_threshold or int(max_cap * self.config.capacity_critical_ratio)

            curr = z_snap.current_occupancy

            if curr >= crit_threshold:
                self._confirmations[zone_id] = self._confirmations.get(zone_id, 0) + 1
                if self._confirmations[zone_id] >= self.config.confirmation_frames:
                    if (now_ts - self._last_alert_ts.get(zone_id, 0.0)) >= self.config.alert_cooldown_sec:
                        self._last_alert_ts[zone_id] = now_ts
                        self._confirmations[zone_id] = 0
                        events.append(CrowdThresholdEvent(
                            event_id=f"EVT-CRWD-{uuid.uuid4().hex[:8]}",
                            camera_id=self.camera_id,
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            current_occupancy=curr,
                            threshold=crit_threshold,
                            severity=CrowdSeverity.CRITICAL,
                            timestamp_utc=now_ts,
                            explanation=(
                                f"CROWD CRITICAL: Observed occupancy ({curr}) in zone '{zone.name}' "
                                f"exceeds critical capacity threshold ({crit_threshold})"
                            )
                        ))
            elif curr >= warn_threshold:
                self._confirmations[zone_id] = self._confirmations.get(zone_id, 0) + 1
                if self._confirmations[zone_id] >= self.config.confirmation_frames:
                    if (now_ts - self._last_alert_ts.get(zone_id, 0.0)) >= self.config.alert_cooldown_sec:
                        self._last_alert_ts[zone_id] = now_ts
                        self._confirmations[zone_id] = 0
                        events.append(CrowdThresholdEvent(
                            event_id=f"EVT-CRWD-{uuid.uuid4().hex[:8]}",
                            camera_id=self.camera_id,
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            current_occupancy=curr,
                            threshold=warn_threshold,
                            severity=CrowdSeverity.WARNING,
                            timestamp_utc=now_ts,
                            explanation=(
                                f"CROWD WARNING: Observed occupancy ({curr}) in zone '{zone.name}' "
                                f"exceeds warning threshold ({warn_threshold})"
                            )
                        ))
            else:
                self._confirmations[zone_id] = 0

        # 2. Evaluate overall camera field-of-view capacity if camera-wide max_capacity applies
        cam_target_id = f"cam:{self.camera_id}"
        cam_cap = self.config.default_max_capacity
        cam_warn = int(cam_cap * self.config.capacity_warning_ratio)
        cam_crit = int(cam_cap * self.config.capacity_critical_ratio)
        cam_curr = camera_snapshot.current_occupancy

        if cam_curr >= cam_crit:
            self._confirmations[cam_target_id] = self._confirmations.get(cam_target_id, 0) + 1
            if self._confirmations[cam_target_id] >= self.config.confirmation_frames:
                if (now_ts - self._last_alert_ts.get(cam_target_id, 0.0)) >= self.config.alert_cooldown_sec:
                    self._last_alert_ts[cam_target_id] = now_ts
                    self._confirmations[cam_target_id] = 0
                    events.append(CrowdThresholdEvent(
                        event_id=f"EVT-CRWD-{uuid.uuid4().hex[:8]}",
                        camera_id=self.camera_id,
                        zone_id=None,
                        zone_name=None,
                        current_occupancy=cam_curr,
                        threshold=cam_crit,
                        severity=CrowdSeverity.CRITICAL,
                        timestamp_utc=now_ts,
                        explanation=(
                            f"CROWD CRITICAL: Total camera field-of-view occupancy ({cam_curr}) "
                            f"exceeds critical capacity threshold ({cam_crit})"
                        )
                    ))
        elif cam_curr >= cam_warn:
            self._confirmations[cam_target_id] = self._confirmations.get(cam_target_id, 0) + 1
            if self._confirmations[cam_target_id] >= self.config.confirmation_frames:
                if (now_ts - self._last_alert_ts.get(cam_target_id, 0.0)) >= self.config.alert_cooldown_sec:
                    self._last_alert_ts[cam_target_id] = now_ts
                    self._confirmations[cam_target_id] = 0
                    events.append(CrowdThresholdEvent(
                        event_id=f"EVT-CRWD-{uuid.uuid4().hex[:8]}",
                        camera_id=self.camera_id,
                        zone_id=None,
                        zone_name=None,
                        current_occupancy=cam_curr,
                        threshold=cam_warn,
                        severity=CrowdSeverity.WARNING,
                        timestamp_utc=now_ts,
                        explanation=(
                            f"CROWD WARNING: Total camera field-of-view occupancy ({cam_curr}) "
                            f"exceeds warning threshold ({cam_warn})"
                        )
                    ))
        else:
            self._confirmations[cam_target_id] = 0

        return events
