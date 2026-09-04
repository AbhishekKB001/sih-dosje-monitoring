attendance_anomaly = True

risk_score = 0

if attendance_anomaly:
    risk_score += 30

print("Risk Score:", risk_score)

if risk_score >= 70:
    print("Risk Level: HIGH")
elif risk_score >= 40:
    print("Risk Level: MEDIUM")
else:
    print("Risk Level: LOW")
