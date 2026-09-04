"""
Unit and Integration Tests for Member 4 REST API & SSE Service.
Validates all endpoints: Health, Occupancy, Attendance, Alerts, Evidence,
Verification, Human Review, and Persistent Storage.
"""

import json
import os
import tempfile
import time
import cv2
import numpy as np
import pytest
import requests

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
)
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import (
    AIAlert,
    AlertLifecycleState,
    AlertSeverity,
    Detection,
    FramePayload,
    ReportedAttendance,
    ReviewOutcome,
    VisualHealthResult,
    VisualHealthState,
)
from ai_subsystem.vision.detector import BaseObjectDetector


class MockDetector(BaseObjectDetector):
    def __init__(self, config=None):
        super().__init__(config=config)
        self.is_loaded = True
        self._mock_dets = []

    def load_model(self) -> bool:
        self.is_loaded = True
        return True

    def detect(self, frame_payload):
        return list(self._mock_dets)

    def get_model_metadata(self):
        return {"model_name": "mock", "version": "1.0.0"}


@pytest.fixture
def api_test_setup():
    with tempfile.TemporaryDirectory() as tmp_dir:
        storage = LocalStorageAdapter(base_dir=tmp_dir)
        evd_cfg = EvidenceConfig(storage_dir=os.path.join(tmp_dir, "evidence"), enabled=True)
        config = AIConfig(
            evidence=evd_cfg,
            alert=AlertManagerConfig(alert_cooldown_sec=1.0)
        )
        detector = MockDetector(config=config.detector)
        orchestrator = AIPipelineOrchestrator(config=config, detector=detector, storage_adapter=storage)

        cam_cfg = SingleCameraConfig(
            camera_id="CAM-API-01",
            institution_id="INST-DoSJE-TEST",
            source_type=SourceType.DEMO,
            uri="dummy.mp4"
        )
        orchestrator.register_camera(cam_cfg)

        # Start API server on random high port
        test_port = 8123
        api_service = Member4APIService(orchestrator=orchestrator, host="127.0.0.1", port=test_port)
        api_service.start(blocking=False)
        time.sleep(0.3)

        base_url = f"http://127.0.0.1:{test_port}/api/v1"

        yield {
            "orchestrator": orchestrator,
            "api_service": api_service,
            "base_url": base_url,
            "tmp_dir": tmp_dir,
            "storage": storage
        }

        api_service.stop()


def test_api_health_endpoint(api_test_setup):
    base_url = api_test_setup["base_url"]
    resp = requests.get(f"{base_url}/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "UP"
    assert "config_version" in data
    assert "model_version" in data


def test_api_cameras_and_occupancy_endpoint(api_test_setup):
    base_url = api_test_setup["base_url"]
    resp = requests.get(f"{base_url}/cameras")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 1
    assert data["cameras"][0]["camera_id"] == "CAM-API-01"

    occ_resp = requests.get(f"{base_url}/cameras/CAM-API-01/occupancy")
    assert occ_resp.status_code == 200
    occ_data = occ_resp.json()
    assert occ_data["camera_id"] == "CAM-API-01"
    assert occ_data["current_occupancy"] == 0


def test_api_attendance_registration_and_discrepancy(api_test_setup):
    base_url = api_test_setup["base_url"]
    orch = api_test_setup["orchestrator"]

    payload = {
        "camera_id": "CAM-API-01",
        "institution_id": "INST-DoSJE-TEST",
        "session_name": "Test Afternoon Batch",
        "reported_count": 25,
        "metadata": {"inspector": "demo_officer"}
    }
    resp = requests.post(f"{base_url}/attendance", json=payload)
    assert resp.status_code == 201
    assert resp.json()["success"] is True

    # Verify registered in orchestrator attendance engine
    engine = orch.get_attendance_engine("CAM-API-01")
    assert len(engine._reported_records) >= 1
    assert list(engine._reported_records.values())[0].reported_count == 25


def test_api_alert_lifecycle_and_actions(api_test_setup):
    base_url = api_test_setup["base_url"]
    orch = api_test_setup["orchestrator"]

    # Inject an active alert into CAM-API-01 AlertManager
    alt_mgr = orch.get_alert_manager("CAM-API-01")
    test_alert = AIAlert(
        alert_id="ALT-API-TEST-01",
        camera_id="CAM-API-01",
        institution_id="INST-DoSJE-TEST",
        alert_type="RESTRICTED_ZONE_BREACH",
        severity=AlertSeverity.CRITICAL,
        title="Test Security Breach",
        explanation="Unauthorized entry detected",
        recommended_action="Dispatch security",
        created_at_utc=1000.0,
        model_version="v1.0.0",
        config_version="cfg-2026.1"
    )
    alt_mgr._alerts[test_alert.alert_id] = test_alert

    # 1. Query alerts
    resp = requests.get(f"{base_url}/cameras/CAM-API-01/alerts")
    assert resp.status_code == 200
    alerts = resp.json()["alerts"]
    assert len(alerts) >= 1
    assert alerts[0]["alert_id"] == "ALT-API-TEST-01"

    # 2. Acknowledge alert
    ack_resp = requests.post(
        f"{base_url}/alerts/ALT-API-TEST-01/acknowledge",
        json={"camera_id": "CAM-API-01", "user_id": "supervisor_demo", "notes": "Investigating"}
    )
    assert ack_resp.status_code == 200
    ack_data = ack_resp.json()
    assert ack_data["lifecycle_state"] == "ACKNOWLEDGED"
    assert ack_data["acknowledged_by"] == "supervisor_demo"

    # 3. Resolve alert
    res_resp = requests.post(
        f"{base_url}/alerts/ALT-API-TEST-01/resolve",
        json={"camera_id": "CAM-API-01", "user_id": "supervisor_demo", "notes": "Authorized test entry verified"}
    )
    assert res_resp.status_code == 200
    res_data = res_resp.json()
    assert res_data["lifecycle_state"] == "RESOLVED"
    assert res_data["resolved_by"] == "supervisor_demo"


def test_api_evidence_serving_and_integrity_verification(api_test_setup):
    base_url = api_test_setup["base_url"]
    orch = api_test_setup["orchestrator"]
    tmp_dir = api_test_setup["tmp_dir"]

    # Create dummy image and capture via EvidenceManager
    img = np.full((100, 100, 3), 150, dtype=np.uint8)
    evd_mgr = orch.get_evidence_manager("CAM-API-01")
    rec = evd_mgr.capture_evidence(
        frame_bgr=img,
        source_event_id="EVT-TEST-01",
        event_type="TEST_BREACH",
        explanation="Test snapshot capture",
        timestamp_utc=2000.0
    )
    assert rec is not None

    # 1. Download Evidence Image via API
    img_resp = requests.get(f"{base_url}/evidence/{rec.evidence_id}")
    assert img_resp.status_code == 200
    assert img_resp.headers["Content-Type"] == "image/jpeg"
    assert len(img_resp.content) > 0

    # 2. Verify SHA-256 integrity via API
    ver_resp = requests.get(f"{base_url}/evidence/{rec.evidence_id}/verify")
    assert ver_resp.status_code == 200
    ver_data = ver_resp.json()
    assert ver_data["is_valid"] is True
    assert ver_data["recorded_hash"] == rec.sha256_hash

    # 3. Test tamper detection via API
    # Alter file
    with open(rec.image_path, "ab") as f:
        f.write(b"\xFF_TAMPERED")

    ver_tampered = requests.get(f"{base_url}/evidence/{rec.evidence_id}/verify")
    assert ver_tampered.status_code == 200
    assert ver_tampered.json()["is_valid"] is False


def test_api_human_review_submission_and_audit_log(api_test_setup):
    base_url = api_test_setup["base_url"]

    review_payload = {
        "camera_id": "CAM-API-01",
        "target_id": "ALT-TEST-REVIEW-01",
        "reviewer_id": "supervisor_demo",
        "outcome": "TRUE_EVENT",
        "notes": "Verified genuine discrepancy against center logbook"
    }

    resp = requests.post(f"{base_url}/reviews", json=review_payload)
    assert resp.status_code == 201
    rev_data = resp.json()
    assert rev_data["review_id"].startswith("REV-")
    assert rev_data["outcome"] == "TRUE_EVENT"

    # Query persistent audit log
    audit_resp = requests.get(f"{base_url}/audit")
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    assert "reviews" in audit_data
    assert len(audit_data["reviews"]) >= 1


def test_api_sse_streaming_events(api_test_setup):
    base_url = api_test_setup["base_url"]
    orch = api_test_setup["orchestrator"]

    # Connect to SSE endpoint with stream=True
    resp = requests.get(f"{base_url}/events/stream", stream=True, timeout=3.0)
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["Content-Type"]

    lines = []
    # Read initial connection message
    for line in resp.iter_lines():
        if line:
            decoded = line.decode("utf-8")
            lines.append(decoded)
            if "CONNECTION_ESTABLISHED" in decoded:
                break

    assert any("CONNECTION_ESTABLISHED" in l for l in lines)
    resp.close()


def test_api_evidence_path_traversal_security(api_test_setup):
    base_url = api_test_setup["base_url"]

    # Attempt directory traversal attack
    resp = requests.get(f"{base_url}/evidence/..%2F..%2Fetc%2Fpasswd")
    assert resp.status_code in (400, 403, 404)

