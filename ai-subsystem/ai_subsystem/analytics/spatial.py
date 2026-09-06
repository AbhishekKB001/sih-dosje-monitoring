"""
Spatial Analytics Engine for Member 4 AI Subsystem.
Implements high-performance Polygon Zone Analysis and Virtual Line Crossing Detection.
"""

import math
import time
import uuid
from typing import Dict, List, Optional, Set, Tuple
import cv2
import numpy as np

from ai_subsystem.config import SpatialConfig
from ai_subsystem.schemas import (
    LineCrossingEvent,
    Track,
    VirtualLine,
    Zone,
    ZoneEventType,
    ZoneState,
    ZoneTransition,
    ZoneType,
)
from ai_subsystem.utils.logger import logger


def is_point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
    """
    Evaluates whether a 2D point (x, y) is inside or on the boundary of a polygon.
    Uses OpenCV pointPolygonTest with np.float32 for robust floating point geometry.
    """
    if len(polygon) < 3:
        return False

    pts = np.array(polygon, dtype=np.float32).reshape((-1, 1, 2))
    # measureDist=False returns +1 (inside), -1 (outside), 0 (on edge)
    res = cv2.pointPolygonTest(pts, (float(point[0]), float(point[1])), measureDist=False)
    return res >= 0


def ccw(A: Tuple[float, float], B: Tuple[float, float], C: Tuple[float, float]) -> bool:
    """Tests if three points are listed in a counterclockwise orientation."""
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])


def do_segments_intersect(
    A: Tuple[float, float], B: Tuple[float, float],
    C: Tuple[float, float], D: Tuple[float, float]
) -> bool:
    """
    Determines if line segment AB intersects line segment CD.
    """
    return (ccw(A, C, D) != ccw(B, C, D)) and (ccw(A, B, C) != ccw(A, B, D))


def calculate_crossing_direction(
    traj_start: Tuple[float, float], traj_end: Tuple[float, float],
    line_p1: Tuple[float, float], line_p2: Tuple[float, float]
) -> str:
    """
    Determines crossing direction using 2D cross product with line normal.
    Returns 'IN' or 'OUT'.
    """
    dx = line_p2[0] - line_p1[0]
    dy = line_p2[1] - line_p1[1]

    # Normal vector perpendicular to line
    nx, ny = -dy, dx

    # Trajectory vector
    vx = traj_end[0] - traj_start[0]
    vy = traj_end[1] - traj_start[1]

    dot_product = (vx * nx) + (vy * ny)
    return "IN" if dot_product >= 0 else "OUT"


class PolygonZoneEngine:
    """
    Evaluates tracks against configured polygon zones for a specific camera.
    Maintains isolated per-track zone containment state and dwell time history.
    """

    def __init__(self, camera_id: str, config: Optional[SpatialConfig] = None):
        self.camera_id = camera_id
        self.config = config or SpatialConfig()
        self._zones: Dict[str, Zone] = {}
        
        # Track-zone state tracking: (track_id, zone_id) -> ZoneState
        self._track_states: Dict[Tuple[int, str], ZoneState] = {}
        # Track-zone entry timestamps: (track_id, zone_id) -> timestamp_utc
        self._entry_times: Dict[Tuple[int, str], float] = {}

        # Populate initial zones if configured
        for zone in self.config.zones:
            if zone.camera_id == self.camera_id:
                self.add_zone(zone)

    def add_zone(self, zone: Zone) -> None:
        """Registers a polygon zone."""
        self._zones[zone.zone_id] = zone
        logger.debug(f"[{self.camera_id}] Registered zone '{zone.name}' ({zone.zone_type.value})")

    def get_zones(self) -> List[Zone]:
        """Returns all configured zones for this camera."""
        return list(self._zones.values())

    def update(self, tracks: List[Track], timestamp_utc: Optional[float] = None) -> List[ZoneTransition]:
        """
        Evaluates all active tracks against all enabled zones for this camera.
        Returns explainable ZoneTransition events for state changes and breaches.
        """
        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        events: List[ZoneTransition] = []
        active_track_ids = {t.track_id for t in tracks}

        # 1. Clean up stale state for tracks that have disappeared
        stale_keys = [k for k in self._track_states.keys() if k[0] not in active_track_ids]
        for key in stale_keys:
            self._track_states.pop(key, None)
            self._entry_times.pop(key, None)

        # 2. Process each track against all enabled zones
        for track in tracks:
            track_point = track.bottom_center if self.config.bottom_center_anchoring else track.centroid

            for zone_id, zone in self._zones.items():
                if not zone.enabled:
                    continue

                state_key = (track.track_id, zone_id)
                prev_state = self._track_states.get(state_key, ZoneState.OUTSIDE)
                is_inside = is_point_in_polygon(track_point, zone.polygon)

                if is_inside:
                    if prev_state in (ZoneState.OUTSIDE, ZoneState.EXITED):
                        # ENTERED event
                        self._track_states[state_key] = ZoneState.ENTERED
                        self._entry_times[state_key] = now_ts
                        dwell_sec = 0.0

                        event_type = (
                            ZoneEventType.RESTRICTED_ZONE_BREACH
                            if zone.zone_type == ZoneType.RESTRICTED
                            else ZoneEventType.ZONE_ENTER
                        )

                        explanation = (
                            f"Track ID #{track.track_id} ({track.class_name}) BREACHED restricted zone "
                            f"'{zone.name}' at point ({track_point[0]:.1f}, {track_point[1]:.1f})"
                            if zone.zone_type == ZoneType.RESTRICTED
                            else f"Track ID #{track.track_id} ({track.class_name}) entered zone '{zone.name}'"
                        )

                        events.append(ZoneTransition(
                            event_id=f"EVT-ZN-{uuid.uuid4().hex[:8]}",
                            camera_id=self.camera_id,
                            track_id=track.track_id,
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            zone_type=zone.zone_type,
                            event_type=event_type,
                            timestamp_utc=now_ts,
                            dwell_time_sec=dwell_sec,
                            explanation=explanation
                        ))
                    else:
                        # Continuing INSIDE state
                        self._track_states[state_key] = ZoneState.INSIDE
                        entry_ts = self._entry_times.get(state_key, now_ts)
                        dwell_sec = max(0.0, now_ts - entry_ts)

                else:
                    # Point is outside polygon
                    if prev_state in (ZoneState.ENTERED, ZoneState.INSIDE):
                        # EXITED event
                        self._track_states[state_key] = ZoneState.EXITED
                        entry_ts = self._entry_times.get(state_key, now_ts)
                        dwell_sec = max(0.0, now_ts - entry_ts)
                        self._entry_times.pop(state_key, None)

                        events.append(ZoneTransition(
                            event_id=f"EVT-ZN-{uuid.uuid4().hex[:8]}",
                            camera_id=self.camera_id,
                            track_id=track.track_id,
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            zone_type=zone.zone_type,
                            event_type=ZoneEventType.ZONE_EXIT,
                            timestamp_utc=now_ts,
                            dwell_time_sec=dwell_sec,
                            explanation=(
                                f"Track ID #{track.track_id} ({track.class_name}) exited zone '{zone.name}' "
                                f"after dwelling for {dwell_sec:.2f}s"
                            )
                        ))
                    else:
                        self._track_states[state_key] = ZoneState.OUTSIDE

        return events

    def get_track_dwell_time(self, track_id: int, zone_id: str, current_timestamp_utc: float) -> float:
        """Returns the current accumulated dwell time (seconds) for a track in a zone."""
        state_key = (track_id, zone_id)
        if self._track_states.get(state_key) in (ZoneState.ENTERED, ZoneState.INSIDE):
            entry_ts = self._entry_times.get(state_key, current_timestamp_utc)
            return max(0.0, current_timestamp_utc - entry_ts)
        return 0.0


class LineCrossingEngine:
    """
    Evaluates tracks against virtual tripwire lines to detect directional crossings.
    """

    def __init__(self, camera_id: str, config: Optional[SpatialConfig] = None):
        self.camera_id = camera_id
        self.config = config or SpatialConfig()
        self._lines: Dict[str, VirtualLine] = {}
        # Track previous position: track_id -> (x, y)
        self._prev_positions: Dict[int, Tuple[float, float]] = {}
        # Crossed lines cache to prevent repeated jitter triggers: (track_id, line_id) -> last_crossed_ts
        self._crossed_cache: Dict[Tuple[int, str], float] = {}

        for line in self.config.lines:
            if line.camera_id == self.camera_id:
                self.add_line(line)

    def add_line(self, line: VirtualLine) -> None:
        """Registers a virtual tripwire line."""
        self._lines[line.line_id] = line
        logger.debug(f"[{self.camera_id}] Registered virtual line '{line.name}'")

    def update(self, tracks: List[Track], timestamp_utc: Optional[float] = None) -> List[LineCrossingEvent]:
        """
        Evaluates tracks against virtual lines by checking trajectory segment intersections.
        """
        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        events: List[LineCrossingEvent] = []
        active_track_ids = {t.track_id for t in tracks}

        # Clean stale tracks
        self._prev_positions = {k: v for k, v in self._prev_positions.items() if k in active_track_ids}
        self._crossed_cache = {k: v for k, v in self._crossed_cache.items() if k[0] in active_track_ids}

        for track in tracks:
            curr_pt = track.bottom_center if self.config.bottom_center_anchoring else track.centroid
            prev_pt = self._prev_positions.get(track.track_id)
            if prev_pt is None and len(track.trajectory) >= 2:
                prev_pt = track.trajectory[-2]

            if prev_pt is not None and curr_pt != prev_pt:
                for line_id, line in self._lines.items():
                    if not line.enabled:
                        continue

                    cache_key = (track.track_id, line_id)
                    last_cross = self._crossed_cache.get(cache_key, 0.0)

                    # Suppress duplicate events within 1.0s window for the same track and line
                    if (now_ts - last_cross) < 1.0:
                        continue

                    # Test segment intersection: (prev_pt -> curr_pt) vs (line.pt1 -> line.pt2)
                    if do_segments_intersect(prev_pt, curr_pt, line.pt1, line.pt2):
                        raw_dir = calculate_crossing_direction(prev_pt, curr_pt, line.pt1, line.pt2)
                        dir_label = line.direction_label_in if raw_dir == "IN" else line.direction_label_out

                        self._crossed_cache[cache_key] = now_ts
                        events.append(LineCrossingEvent(
                            event_id=f"EVT-LN-{uuid.uuid4().hex[:8]}",
                            camera_id=self.camera_id,
                            track_id=track.track_id,
                            line_id=line.line_id,
                            line_name=line.name,
                            direction=dir_label,
                            timestamp_utc=now_ts,
                            explanation=(
                                f"Track ID #{track.track_id} ({track.class_name}) crossed virtual line "
                                f"'{line.name}' in direction [{dir_label}]"
                            )
                        ))

            self._prev_positions[track.track_id] = curr_pt

        return events
