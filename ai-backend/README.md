# MoSJE AI Risk Engine — Experimental Prototype

> **Notice**: This folder contains the initial machine learning prototype developed during exploratory research.
> The production, fully-tested implementation has been integrated directly into:
> - **Central Risk Scoring Engine**: [`backend/src/services/riskEngine.ts`](../backend/src/services/riskEngine.ts) (Deterministic weighted risk formulas & unit tests)
> - **AI Vision & CCTV Intelligence Subsystem**: [`ai-subsystem/`](../ai-subsystem/) (YOLOv8, ByteTrack, OpenCV, FastAPI, and 84 passing test suites)

---

## Prototype Contents
- `app.py`: Standalone FastAPI service prototype for attendance anomaly detection.
- `anomaly_detector.py`: Statistical z-score / standard-deviation anomaly scoring algorithm.
- `risk_engine.py` & `risk_score.py`: Initial Python risk score calculations.
- `risk_model.pkl`: Serialized scikit-learn model artifact.
- `train_model.py`: Training script for synthetic inspection priority data.
