import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# Training data
data = {
    "attendance": [
        95, 92, 90, 88, 85, 82, 80, 78, 75, 72,
        70, 68, 65, 60, 55, 50, 45, 40, 35, 30,
        94, 91, 89, 86, 83, 79, 76, 73, 69, 64
    ],

    "inspection_issue_score": [
        2, 3, 4, 5, 6, 7, 8, 10, 12, 15,
        18, 20, 22, 25, 30, 35, 40, 45, 50, 55,
        3, 4, 6, 7, 9, 11, 13, 16, 21, 27
    ],

    "complaint_score": [
        1, 1, 2, 2, 3, 3, 4, 5, 5, 6,
        8, 9, 10, 12, 15, 18, 20, 25, 30, 35,
        1, 2, 2, 3, 4, 5, 6, 7, 9, 13
    ],

    "cctv_inconsistency_score": [
        2, 3, 3, 4, 5, 6, 7, 8, 10, 12,
        15, 17, 20, 23, 28, 32, 38, 43, 48, 55,
        2, 3, 4, 5, 6, 8, 9, 11, 14, 19
    ],

    "reporting_irregularity_score": [
        1, 1, 2, 2, 3, 4, 4, 5, 6, 7,
        9, 10, 12, 14, 17, 20, 24, 28, 32, 38,
        1, 2, 2, 3, 4, 5, 6, 7, 9, 12
    ],

    "risk_level": [
    "LOW", "LOW", "LOW", "LOW", "LOW",
    "LOW", "LOW", "LOW", "LOW", "LOW",
    "MEDIUM", "MEDIUM", "MEDIUM", "MEDIUM", "MEDIUM",
    "HIGH", "HIGH", "HIGH", "HIGH", "HIGH",
    "LOW", "LOW", "LOW", "LOW", "LOW",
    "MEDIUM", "MEDIUM", "MEDIUM", "MEDIUM", "MEDIUM"
]
}
for key, value in data.items():
    print(key, len(value))
# Create DataFrame
df = pd.DataFrame(data)

print("Number of training rows:", len(df))

# Features
X = df[
    [
        "attendance",
        "inspection_issue_score",
        "complaint_score",
        "cctv_inconsistency_score",
        "reporting_irregularity_score"
    ]
]

# Target
y = df["risk_level"]

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# Create Random Forest model
model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)

# Train model
model.fit(X_train, y_train)

# Test model
y_pred = model.predict(X_test)

# Accuracy
accuracy = accuracy_score(y_test, y_pred)

print("\nModel Accuracy:", round(accuracy, 2))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Save model
joblib.dump(model, "risk_model.pkl")

print("\nModel saved successfully as risk_model.pkl")