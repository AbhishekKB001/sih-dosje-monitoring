from fastapi import FastAPI
from pydantic import BaseModel
import joblib

from anomaly_detector import detect_attendance_anomaly
from risk_engine import calculate_risk_score


app = FastAPI(
    title="MoSJE AI Risk Detection API",
    description="AI-based project risk detection and inspection prioritization",
    version="1.0"
)


# Load trained ML model
model = joblib.load("risk_model.pkl")


# Request data structure
class ProjectData(BaseModel):
    project_id: str
    attendance: list[float]

    inspection_issue_score: float = 0
    complaint_score: float = 0
    cctv_inconsistency_score: float = 0
    reporting_irregularity_score: float = 0


# Home endpoint
@app.get("/")
def home():
    return {
        "message": "MoSJE AI Risk Detection API is running"
    }


# Risk analysis endpoint
@app.post("/analyze")
def analyze(data: ProjectData):

    # -------------------------------------------------
    # 1. Attendance anomaly detection
    # -------------------------------------------------

    anomaly, anomaly_score, anomaly_message = detect_attendance_anomaly(
        data.attendance
    )

    # Calculate average attendance
    average_attendance = sum(data.attendance) / len(data.attendance)


    # -------------------------------------------------
    # 2. Machine Learning prediction
    # -------------------------------------------------

    features = [[
        average_attendance,
        data.inspection_issue_score,
        data.complaint_score,
        data.cctv_inconsistency_score,
        data.reporting_irregularity_score
    ]]

    predicted_risk = model.predict(features)[0]

    probabilities = model.predict_proba(features)[0]

    confidence = max(probabilities)


    # -------------------------------------------------
    # 3. Weighted risk score
    # -------------------------------------------------

    final_risk_score, risk_level, inspection_priority = calculate_risk_score(
        attendance_anomaly_score=anomaly_score,
        inspection_issue_score=data.inspection_issue_score,
        complaint_score=data.complaint_score,
        cctv_inconsistency_score=data.cctv_inconsistency_score,
        reporting_irregularity_score=data.reporting_irregularity_score
    )


    # -------------------------------------------------
    # 4. Final risk decision
    # -------------------------------------------------

    # Severe attendance anomaly gets immediate HIGH risk
    if anomaly_score >= 80:

        final_risk_level = "HIGH"
        final_inspection_priority = "URGENT"

    # Otherwise use the weighted risk score
    elif final_risk_score >= 70:

        final_risk_level = "HIGH"
        final_inspection_priority = "URGENT"

    elif final_risk_score >= 40:

        final_risk_level = "MEDIUM"
        final_inspection_priority = "PRIORITY"

    else:

        final_risk_level = "LOW"
        final_inspection_priority = "NORMAL"


    # -------------------------------------------------
    # 5. Return final response
    # -------------------------------------------------

    return {
        "project_id": data.project_id,

        "attendance_anomaly": anomaly,
        "anomaly_score": anomaly_score,
        "anomaly_message": anomaly_message,

        "average_attendance": round(average_attendance, 2),

        "ml_risk_level": predicted_risk,
        "ml_confidence": round(float(confidence), 2),

        "risk_score": final_risk_score,
        "risk_level": final_risk_level,
        "inspection_priority": final_inspection_priority
    }

