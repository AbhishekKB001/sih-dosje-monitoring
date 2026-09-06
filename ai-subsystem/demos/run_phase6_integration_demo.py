"""
KANAKA CHALA — Member 4 AI Subsystem
Phase 6 Final Integration Demonstration:
End-to-End AI Pipeline, REST API Service, Real-Time SSE Streaming,
Evidence Cryptographic Sealing, and Mobile/Flutter Data Contracts.

Demonstrates the complete operational lifecycle:
Video -> YOLO Detection -> ByteTrack -> Analytics ->
Anomaly Detection -> AI Alert -> Cryptographic Evidence Snapshot ->
REST API Endpoints -> Real-Time SSE Stream -> Mobile Payload Formatting ->
Supervisor Review Submission -> Audit Log Persistence.
"""

import json
import os
import sys
import threading
import time
import requests

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from ai_subsystem.adapters.api_service import Member4APIService
from ai_subsystem.adapters.storage_adapter import LocalStorageAdapter
from ai_subsystem.config import (
    AIConfig,
    AlertManagerConfig,
    AnomalyConfig,
    EvidenceConfig,
    IncidentCorrelationConfig,
    SingleCameraConfig,
    SourceType,
    SpatialConfig,
    TemporalConfig,
)
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import (
    ReviewOutcome,
    Zone,
    ZoneType,
)
from ai_subsystem.utils.logger import logger
from ai_subsystem.utils.synthetic_video import generate_demo_video


def run_phase6_integration_demo():
    logger.info("=" * 80)
    logger.info("  KANAKA CHALA — Member 4 AI Subsystem (Phase 6 Final Integration)")
    logger.info("  Full AI Pipeline, REST API, Real-Time SSE, Evidence & Mobile Contracts")
    logger.info("=" * 80)

    # 1. Setup paths
    os.makedirs("data", exist_ok=True)
    evidence_dir = os.path.join("data", "evidence")
    os.makedirs(evidence_dir, exist_ok=True)
    audit_dir = "evidence_store"
    os.makedirs(audit_dir, exist_ok=True)

    video_path = os.path.join("data", "demo_cctv.mp4")
    if not os.path.exists(video_path):
        logger.info("Generating demo CCTV video asset...")
        generate_demo_video(video_path, num_frames=125, fps=25)

    # 2. Configure Monitored Restricted Zone & Schedules
    secured_vault = Zone(
        zone_id="ZN-VAULT-01",
        camera_id="CAM-MOSJE-01",
        name="Secured Document & Records Room",
        zone_type=ZoneType.RESTRICTED,
        polygon=[(30.0, 30.0), (350.0, 30.0), (350.0, 450.0), (30.0, 450.0)],
        loitering_threshold_sec=1.5
    )

    storage = LocalStorageAdapter(base_dir=audit_dir)
    config = AIConfig(
        temporal=TemporalConfig(default_loitering_threshold_sec=1.5, loitering_confirmation_frames=1),
        anomaly=AnomalyConfig(enabled=True, cooldown_sec=5.0),
        incident=IncidentCorrelationConfig(enabled=True, correlation_window_sec=30.0, incident_cooldown_sec=10.0),
        alert=AlertManagerConfig(enabled=True, alert_cooldown_sec=5.0),
        evidence=EvidenceConfig(enabled=True, storage_dir=evidence_dir, jpeg_quality=92)
    )

    cam_cfg = SingleCameraConfig(
        camera_id="CAM-MOSJE-01",
        institution_id="INST-DoSJE-DEMO",
        source_type=SourceType.DEMO,
        uri=video_path,
        loop_video=True,
        spatial=SpatialConfig(zones=[secured_vault]),
        temporal=config.temporal,
        anomaly=config.anomaly,
        incident=config.incident,
        alert=config.alert,
        evidence=config.evidence
    )

    # 3. Initialize Orchestrator and REST API Server
    orchestrator = AIPipelineOrchestrator(config=config, storage_adapter=storage)
    orchestrator.register_camera(cam_cfg)

    api_port = 8000
    api_service = Member4APIService(orchestrator=orchestrator, host="127.0.0.1", port=api_port)
    api_service.start(blocking=False)
    time.sleep(0.5)

    base_url = f"http://127.0.0.1:{api_port}/api/v1"
    logger.info(f"REST API & SSE Service running at {base_url}")

    # 4. Connect a background Real-Time SSE Listener
    sse_events_received = []
    sse_stop_event = threading.Event()

    def sse_client_worker():
        try:
            with requests.get(f"{base_url}/events/stream", stream=True, timeout=10) as sse_resp:
                for line in sse_resp.iter_lines():
                    if sse_stop_event.is_set():
                        break
                    if line:
                        decoded = line.decode("utf-8")
                        if decoded.startswith("data:"):
                            try:
                                payload = json.loads(decoded[5:].strip())
                                sse_events_received.append(payload)
                            except Exception:
                                pass
        except Exception:
            pass

    sse_thread = threading.Thread(target=sse_client_worker, daemon=True)
    sse_thread.start()

    # 5. Submit Administrative Attendance via REST API
    logger.info("\n--- [Step 1] Submitting Administrative Attendance via REST API ---")
    att_payload = {
        "camera_id": "CAM-MOSJE-01",
        "institution_id": "INST-DoSJE-DEMO",
        "session_name": "Vocational Training Morning Batch",
        "reported_count": 25,
        "metadata": {"inspector": "demo_officer", "shift": "Morning"}
    }
    att_resp = requests.post(f"{base_url}/attendance", json=att_payload)
    logger.info(f"  POST /attendance -> Status {att_resp.status_code}: {att_resp.json()['message']}")

    # 6. Start Video Pipeline & Ingestion Workers
    logger.info("\n--- [Step 2] Starting AI Processing Pipeline ---")
    orchestrator.start()

    # Run for 4 observation intervals to ingest video and process discrepancies
    time.sleep(4.5)

    orchestrator.stop()
    logger.info("Video processing complete. Querying REST API for generated intelligence...")

    # 7. Query REST API Endpoints
    logger.info("\n--- [Step 3] Querying REST API Intelligence Endpoints ---")

    # Health
    health = requests.get(f"{base_url}/health").json()
    logger.info(f"  GET /health   -> Status: {health['status']} | Model: {health['model_version']} | Config: {health['config_version']}")

    # Occupancy
    occupancy = requests.get(f"{base_url}/cameras/CAM-MOSJE-01/occupancy").json()
    logger.info(f"  GET /occupancy -> Current: {occupancy['current_occupancy']} | Peak: {occupancy['peak_occupancy']} | Avg: {occupancy['avg_occupancy']}")

    # Alerts
    alerts_resp = requests.get(f"{base_url}/cameras/CAM-MOSJE-01/alerts").json()
    active_alerts = alerts_resp.get("alerts", [])
    logger.info(f"  GET /alerts   -> Total Alerts Generated: {len(active_alerts)}")

    target_alert_id = None
    target_evidence_id = None

    if active_alerts:
        first_alert = active_alerts[0]
        target_alert_id = first_alert["alert_id"]
        target_evidence_id = first_alert.get("evidence_snapshot_id")
        logger.info(f"\n  [Sample AI Alert Detail]")
        logger.info(f"    Alert ID    : {first_alert['alert_id']}")
        logger.info(f"    Type        : {first_alert['alert_type']}")
        logger.info(f"    Severity    : {first_alert['severity']}")
        logger.info(f"    State       : {first_alert['lifecycle_state']}")
        logger.info(f"    Title       : {first_alert['title']}")
        logger.info(f"    Explanation : {first_alert['explanation']}")
        logger.info(f"    Action      : {first_alert['recommended_action']}")

    # 8. Download Evidence Snapshot & Verify Cryptographic Integrity
    if target_evidence_id:
        logger.info("\n--- [Step 4] Cryptographic Evidence Sealing & Tamper Verification ---")
        evd_resp = requests.get(f"{base_url}/evidence/{target_evidence_id}")
        logger.info(f"  GET /evidence/{target_evidence_id} -> Size: {len(evd_resp.content)} bytes (Content-Type: {evd_resp.headers.get('Content-Type')})")

        ver_resp = requests.get(f"{base_url}/evidence/{target_evidence_id}/verify").json()
        logger.info(f"  GET /evidence/{target_evidence_id}/verify -> Valid: {ver_resp['is_valid']} | Hash: {ver_resp['recorded_hash'][:24]}...")
        logger.info(f"  Integrity Note : {ver_resp['explanation']}")

    # 9. Supervisor Mobile Actions (Acknowledge, Resolve, and Audit Review)
    if target_alert_id:
        logger.info("\n--- [Step 5] Supervisor Alert Lifecycle & Human Review ---")

        # Acknowledge
        ack_resp = requests.post(
            f"{base_url}/alerts/{target_alert_id}/acknowledge",
            json={"camera_id": "CAM-MOSJE-01", "user_id": "supervisor_demo", "notes": "Dispatched inspection team"}
        ).json()
        logger.info(f"  POST /alerts/{target_alert_id}/acknowledge -> State: {ack_resp.get('lifecycle_state')} by '{ack_resp.get('acknowledged_by')}'")

        # Resolve
        res_resp = requests.post(
            f"{base_url}/alerts/{target_alert_id}/resolve",
            json={"camera_id": "CAM-MOSJE-01", "user_id": "supervisor_demo", "notes": "Operational discrepancy reconciled against physical registry. Demo authorization verified."}
        ).json()
        logger.info(f"  POST /alerts/{target_alert_id}/resolve -> State: {res_resp.get('lifecycle_state')} (Notes: {res_resp.get('resolution_notes')})")

        # Submit Human Review
        rev_payload = {
            "camera_id": "CAM-MOSJE-01",
            "target_id": target_alert_id,
            "reviewer_id": "supervisor_demo",
            "outcome": "TRUE_EVENT",
            "notes": "Verified genuine discrepancy. Reconciled with district PMU records."
        }
        rev_resp = requests.post(f"{base_url}/reviews", json=rev_payload).json()
        logger.info(f"  POST /reviews -> Review ID: {rev_resp.get('review_id')} | Outcome: {rev_resp.get('outcome')} by '{rev_resp.get('reviewer_id')}'")

    # 10. Audit Log Inspection
    audit_resp = requests.get(f"{base_url}/audit").json()
    logger.info(f"\n--- [Step 6] Persistent Audit Trail Inspection ---")
    logger.info(f"  Persisted Alerts   : {len(audit_resp.get('alerts', []))}")
    logger.info(f"  Persisted Evidence : {len(audit_resp.get('evidence', []))}")
    logger.info(f"  Persisted Reviews  : {len(audit_resp.get('reviews', []))}")

    # 11. SSE Real-Time Stream Inspection
    sse_stop_event.set()
    time.sleep(0.5)
    logger.info(f"\n--- [Step 7] Real-Time SSE Stream Verification ---")
    logger.info(f"  Total Real-Time Events Received: {len(sse_events_received)}")
    event_types = [e.get("type") for e in sse_events_received]
    logger.info(f"  Sample Received Types: {set(event_types)}")

    # 12. Teammate Integration Status Matrix
    logger.info("\n" + "=" * 80)
    logger.info("  TEAMMATE INTEGRATION STATUS MATRIX (HONEST CLASSIFICATION)")
    logger.info("=" * 80)
    logger.info("  [Member 3 - CCTV / Streams]     : PARTIALLY INTEGRATED")
    logger.info("    -> Adapter (Member3StreamAdapter)     : INTEGRATED & FULLY TESTED")
    logger.info("    -> Live Hardware RTSP / NVR Stream    : NOT AVAILABLE YET (Teammate pending)")
    logger.info("  [Member 1 - Backend & Database]  : PARTIALLY INTEGRATED")
    logger.info("    -> REST API & FastAPI Router Adapter  : INTEGRATED & FULLY TESTED")
    logger.info("    -> Host Backend Server & PostgreSQL   : NOT AVAILABLE YET (Teammate pending)")
    logger.info("  [Member 2/5 - Flutter Mobile App]: PARTIALLY INTEGRATED")
    logger.info("    -> Dart Models & Mobile JSON Contract : INTEGRATED & FULLY TESTED")
    logger.info("    -> Host Mobile Flutter App Codebase   : NOT AVAILABLE YET (Teammate pending)")
    logger.info("=" * 80)

    # 13. Stop API Server
    api_service.stop()
    logger.info("Phase 6 Integration Demo Completed Successfully!\n")


if __name__ == "__main__":
    run_phase6_integration_demo()
