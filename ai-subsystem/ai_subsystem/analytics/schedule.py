"""
Schedule evaluation and after-hours checking for Member 4 AI Subsystem.
Supports granular weekly schedules and overnight time windows.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
from ai_subsystem.schemas import OperationalSchedule, ScheduleTimeWindow


def parse_hhmm_to_minutes(time_str: str) -> int:
    """Converts 'HH:MM' string to minutes from midnight (0 - 1439)."""
    parts = time_str.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time format '{time_str}', expected 'HH:MM'")
    hours = int(parts[0])
    minutes = int(parts[1])
    return hours * 60 + minutes


def is_timestamp_in_window(
    dt: datetime,
    window: ScheduleTimeWindow
) -> bool:
    """
    Checks if a given datetime falls within a ScheduleTimeWindow.
    Properly evaluates overnight windows crossing midnight.
    """
    weekday = dt.weekday()  # 0=Monday, 6=Sunday
    current_minutes = dt.hour * 60 + dt.minute

    start_min = parse_hhmm_to_minutes(window.start_time)
    end_min = parse_hhmm_to_minutes(window.end_time)

    # Standard Daytime Window (e.g., 09:00 -> 18:00)
    if start_min <= end_min:
        if weekday in window.days_of_week:
            if start_min <= current_minutes <= end_min:
                return True
    else:
        # Overnight Window (e.g., 22:00 -> 06:00 next day)
        # Part 1: Evening portion on the configured day (>= start_min)
        if weekday in window.days_of_week and current_minutes >= start_min:
            return True
        # Part 2: Morning portion on the next day (<= end_min)
        prev_day = (weekday - 1) % 7
        if prev_day in window.days_of_week and current_minutes <= end_min:
            return True

    return False


class ScheduleEvaluator:
    """
    Evaluates operational schedules for institutions and cameras.
    """

    @staticmethod
    def is_operational_time(
        schedule: OperationalSchedule,
        timestamp_utc: float,
        tz_offset_hours: float = 0.0
    ) -> bool:
        """
        Determines whether the given UTC timestamp falls within authorized operational hours.
        Returns True if within allowed windows, False if After-Hours.
        """
        if not schedule.enabled or not schedule.allowed_windows:
            # If no allowed windows are defined or schedule is disabled, assume standard operating
            return True

        # Adjust UTC timestamp by timezone offset
        tz = timezone(timedelta(hours=tz_offset_hours))
        dt = datetime.fromtimestamp(timestamp_utc, tz=tz)

        for window in schedule.allowed_windows:
            if is_timestamp_in_window(dt, window):
                return True

        return False
