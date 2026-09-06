"""
Spatial and Temporal Analytics package for Member 4 AI Subsystem.
"""

from ai_subsystem.analytics.spatial import (
    PolygonZoneEngine,
    LineCrossingEngine,
    is_point_in_polygon,
    do_segments_intersect,
    calculate_crossing_direction,
)
from ai_subsystem.analytics.schedule import ScheduleEvaluator, is_timestamp_in_window
from ai_subsystem.analytics.temporal import TemporalEngine
from ai_subsystem.analytics.occupancy import OccupancyAnalyzer, CrowdAnalyticsEngine
from ai_subsystem.analytics.attendance import AttendanceConsistencyEngine
from ai_subsystem.analytics.anomaly import AnomalyEngine
from ai_subsystem.analytics.incident import IncidentCorrelationEngine
from ai_subsystem.analytics.alerts import AIAlertManager
from ai_subsystem.analytics.evidence import EvidenceManager

__all__ = [
    "PolygonZoneEngine",
    "LineCrossingEngine",
    "is_point_in_polygon",
    "do_segments_intersect",
    "calculate_crossing_direction",
    "ScheduleEvaluator",
    "is_timestamp_in_window",
    "TemporalEngine",
    "OccupancyAnalyzer",
    "CrowdAnalyticsEngine",
    "AttendanceConsistencyEngine",
    "AnomalyEngine",
    "IncidentCorrelationEngine",
    "AIAlertManager",
    "EvidenceManager",
]

