
def calculate_risk_score(
    attendance_anomaly_score=0,
    inspection_issue_score=0,
    complaint_score=0,
    cctv_inconsistency_score=0,
    reporting_irregularity_score=0
):
    """
    Calculate overall project risk score from 0 to 100.

    Weights:
    Attendance anomaly       : 30%
    Inspection issues        : 25%
    Complaints               : 15%
    CCTV inconsistency       : 20%
    Reporting irregularity   : 10%
    """

    # Weighted risk calculation
    risk_score = (
        attendance_anomaly_score * 0.30
        + inspection_issue_score * 0.25
        + complaint_score * 0.15
        + cctv_inconsistency_score * 0.20
        + reporting_irregularity_score * 0.10
    )

    risk_score = round(min(max(risk_score, 0), 100), 2)

    # Determine risk level
    if risk_score >= 70:
        risk_level = "HIGH"
        inspection_priority = "URGENT"

    elif risk_score >= 40:
        risk_level = "MEDIUM"
        inspection_priority = "PRIORITY"

    else:
        risk_level = "LOW"
        inspection_priority = "NORMAL"

    return risk_score, risk_level, inspection_priority

