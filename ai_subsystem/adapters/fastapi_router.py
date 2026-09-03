"""
Member 4 AI Subsystem — Plug-and-Play FastAPI Router.
Allows Member 1 (Backend Team) to mount Member 4 AI intelligence endpoints directly
into their FastAPI application with:
    from ai_subsystem.adapters.fastapi_router import get_ai_router
    app.include_router(get_ai_router(orchestrator), prefix="/api/v1/ai", tags=["Member 4 AI Intelligence"])
"""

from typing import Any, Dict, List, Optional
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import (
    AIAlert,
    AIAnomaly,
    AIIncident,
    EvidenceRecord,
    EvidenceVerificationResult,
    HumanReviewRecord,
    OccupancySnapshot,
    ReportedAttendance,
    ReviewOutcome,
)

def get_ai_router(orchestrator: AIPipelineOrchestrator):
    """
    Constructs and returns a FastAPI APIRouter configured with the active AI orchestrator.
    Only requires FastAPI if Member 1 imports this file.
    """
    try:
        from fastapi import APIRouter, HTTPException, Query, status
        from fastapi.responses import FileResponse, StreamingResponse
    except ImportError:
        raise ImportError(
            "FastAPI is required to use fastapi_router.py. "
            "Install fastapi via: pip install fastapi uvicorn"
        )

    router = APIRouter()

    @router.get("/health", summary="Get Subsystem Health & Status")
    def get_health() -> Dict[str, Any]:
        return {
            "status": "UP",
            "service": "Member 4 AI Subsystem",
            "config_version": orchestrator.config.config_version,
            "model_version": orchestrator.config.model_version,
            "system_status": orchestrator.get_system_status()
        }

    @router.get("/cameras", summary="List Registered Cameras & Telemetry")
    def list_cameras() -> Dict[str, Any]:
        return {
            "count": len(orchestrator.config.cameras),
            "cameras": [c.model_dump() for c in orchestrator.config.cameras],
            "telemetry": orchestrator.get_system_status()["cameras"]
        }

    @router.get("/cameras/{camera_id}/occupancy", response_model=OccupancySnapshot, summary="Get Live Camera Occupancy")
    def get_occupancy(camera_id: str):
        analyzer = orchestrator.get_occupancy_analyzer(camera_id)
        return analyzer.get_occupancy_snapshot()

    @router.get("/cameras/{camera_id}/anomalies", response_model=List[AIAnomaly], summary="Get Recent Anomalies")
    def get_anomalies(camera_id: str):
        engine = orchestrator.get_anomaly_engine(camera_id)
        return engine._recent_anomalies

    @router.get("/cameras/{camera_id}/incidents", response_model=List[AIIncident], summary="Get Active Correlated Incidents")
    def get_incidents(camera_id: str):
        engine = orchestrator.get_incident_engine(camera_id)
        return list(engine._active_incidents.values())

    @router.get("/cameras/{camera_id}/alerts", response_model=List[AIAlert], summary="Get Active Actionable Alerts")
    def get_alerts(camera_id: str):
        mgr = orchestrator.get_alert_manager(camera_id)
        return mgr.get_active_alerts()

    @router.post("/alerts/{alert_id}/acknowledge", response_model=AIAlert, summary="Supervisor Acknowledge Alert")
    def acknowledge_alert(alert_id: str, camera_id: str, user_id: str = "supervisor_demo", notes: str = ""):
        mgr = orchestrator.get_alert_manager(camera_id)
        res = mgr.acknowledge_alert(alert_id, user_id=user_id, notes=notes)
        if not res:
            raise HTTPException(status_code=404, detail="Alert not found or already in terminal state")
        orchestrator.storage.save_alert(res)
        return res

    @router.post("/alerts/{alert_id}/resolve", response_model=AIAlert, summary="Supervisor Resolve Alert")
    def resolve_alert(alert_id: str, camera_id: str, user_id: str = "supervisor_demo", notes: str = ""):
        mgr = orchestrator.get_alert_manager(camera_id)
        res = mgr.resolve_alert(alert_id, user_id=user_id, notes=notes)
        if not res:
            raise HTTPException(status_code=404, detail="Alert not found or cannot be resolved")
        orchestrator.storage.save_alert(res)
        return res

    @router.get("/evidence/{evidence_id}", summary="Download Visual Evidence JPEG")
    def get_evidence_file(evidence_id: str):
        for cid, em in orchestrator._evidence_managers.items():
            if evidence_id in em._evidence_records:
                path = em._evidence_records[evidence_id].image_path
                return FileResponse(path, media_type="image/jpeg")
        raise HTTPException(status_code=404, detail="Evidence not found")

    @router.get("/evidence/{evidence_id}/verify", response_model=EvidenceVerificationResult, summary="Verify SHA-256 Hash Integrity")
    def verify_evidence(evidence_id: str):
        for cid, em in orchestrator._evidence_managers.items():
            if evidence_id in em._evidence_records:
                return em.verify_evidence_integrity(evidence_id)
        raise HTTPException(status_code=404, detail="Evidence not found")

    @router.post("/reviews", response_model=HumanReviewRecord, status_code=status.HTTP_201_CREATED, summary="Submit Supervisor Audit Review")
    def submit_review(camera_id: str, target_id: str, outcome: ReviewOutcome, reviewer_id: str = "supervisor_demo", notes: str = ""):
        em = orchestrator.get_evidence_manager(camera_id)
        rec = em.submit_human_review(target_id=target_id, reviewer_id=reviewer_id, outcome=outcome, notes=notes)
        orchestrator.storage.save_review_record(rec)
        return rec

    @router.post("/attendance", status_code=status.HTTP_201_CREATED, summary="Register Administrative Attendance")
    def register_attendance(attendance: ReportedAttendance):
        orchestrator.register_reported_attendance(attendance)
        return {"success": True, "data": attendance}

    return router
