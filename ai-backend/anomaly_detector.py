
import statistics


def detect_attendance_anomaly(attendance):
    """
    Detect attendance problems.

    Checks:
    1. Consistently low attendance
    2. Sudden drop in latest attendance

    Returns:
        anomaly: True/False
        anomaly_score: 0-100
        message: explanation
    """

    if len(attendance) < 3:
        return False, 0, "Not enough attendance data"

    average = statistics.mean(attendance)
    latest = attendance[-1]

    # --------------------------------
    # 1. Check consistently low attendance
    # --------------------------------
    if average < 50:
        return True, 80, "Critically low attendance detected"

    elif average < 60:
        return True, 60, "Low attendance detected"

    # --------------------------------
    # 2. Check sudden drop
    # --------------------------------
    drop = ((average - latest) / average) * 100

    if drop >= 30:
        return True, 80, "Severe attendance drop detected"

    elif drop >= 20:
        return True, 60, "Significant attendance drop detected"

    elif drop >= 10:
        return True, 30, "Moderate attendance drop detected"

    # --------------------------------
    # 3. Normal attendance
    # --------------------------------
    return False, 0, "Attendance pattern is normal"


# Sample test
attendance_data = [90, 92, 89, 91, 48]

anomaly, score, message = detect_attendance_anomaly(attendance_data)

print("Attendance Data:", attendance_data)
print("Anomaly:", anomaly)
print("Anomaly Score:", score)
print("Result:", message)

