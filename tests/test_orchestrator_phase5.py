"""
Integration test for Phase 5 end-to-end pipeline in AIPipelineOrchestrator.
Validates:
Ingestion -> Visual Health -> Detection -> Tracking -> Spatial Zones -> Temporal Analytics
-> Occupancy -> Anomalies -> Correlated Incidents -> AI Alerts -> Sealed Evidence Snapshots
-> Cryptographic Verification -> Human Review.
"""

import tempfile
import numpy as np
import pytest

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
    AlertLifecycleState,
    Detection,
    FramePayload,
    IncidentType,
    ReviewOutcome,
    VisualHealthResult,
    VisualHealthState,
    Zone,
    ZoneType,
)
from ai_subsystem.vision.detector import BaseObjectDetector


class DeterministicMockDetector(BaseObjectDetector):
    def __init__(self, config=None):
        super().__init__(config=config)
        self._next_detections = []

    def set_mock_detections(self, detections):
        self._next_detections = list(detections)

    def load_model(self) -> bool:
        self.is_loaded = True
        return True

    def detect(self, frame_payload):
        return list(self._next_detections)

    def get_model_metadata(self):
        return {"model_name": "mock", "version": "1.0.0"}


def make_frame(camera_id: str, frame_idx: int, ts_utc: float) -> FramePayload:
    # 640x480 gray canvas
    frame_bgr = np.full((480, 640, 3), 120, dtype=np.uint8)
    return FramePayload(
        camera_id=camera_id,
        frame_index=frame_idx,
        timestamp_utc=ts_utc,
        frame_bgr=frame_bgr,
        source_fps=25.0
    )


def test_orchestrator_phase5_full_anomaly_incident_alert_evidence_pipeline():
    with tempfile.TemporaryDirectory() as tmp_evidence_dir:
        # 1. Configure Restricted Zone
        server_room = Zone(
            zone_id="ZN-SERVER-01",
            camera_id="CAM-P5-01",
            name="Restricted Server Room",
            zone_type=ZoneType.RESTRICTED,
            polygon=[(50.0, 50.0), (300.0, 50.0), (300.0, 300.0), (50.0, 300.0)],
            loitering_threshold_sec=1.0
        )

        config = AIConfig(
            temporal=TemporalConfig(
                default_loitering_threshold_sec=1.0,
                loitering_confirmation_frames=1
            ),
            anomaly=AnomalyConfig(cooldown_sec=1.0),
            incident=IncidentCorrelationConfig(
                correlation_window_sec=30.0,
                incident_cooldown_sec=5.0,
                min_signals_to_escalate=2
            ),
            alert=AlertManagerConfig(alert_cooldown_sec=1.0),
            evidence=EvidenceConfig(storage_dir=tmp_evidence_dir, enabled=True)
        )

        mock_detector = DeterministicMockDetector(config=config.detector)
        orchestrator = AIPipelineOrchestrator(config=config, detector=mock_detector)

        cam_cfg = SingleCameraConfig(
            camera_id="CAM-P5-01",
            institution_id="INST-DoSJE-P5",
            source_type=SourceType.DEMO,
            uri="dummy.mp4",
            spatial=SpatialConfig(zones=[server_room]),
            temporal=config.temporal,
            anomaly=config.anomaly,
            incident=config.incident,
            alert=config.alert,
            evidence=config.evidence
        )
        orchestrator.register_camera(cam_cfg)

        health_ok = VisualHealthResult(
            camera_id="CAM-P5-01", frame_index=1, state=VisualHealthState.HEALTHY, is_healthy=True
        )

        ts_base = 1000.0

        # Step 1: Entity appears inside Restricted Zone at T=1000.0
        # Bottom center is (150, 200) -> inside server room polygon
        det_f1 = [
            Detection(camera_id="CAM-P5-01", frame_index=1, timestamp_utc=ts_base, class_id=0, class_name="person", confidence=0.9, bbox=(100, 100, 200, 200))
        ]
        mock_detector.set_mock_detections(det_f1)
        res_f1 = orchestrator.process_frame(make_frame("CAM-P5-01", 1, ts_base), health_ok)
        assert res_f1["status"] == "PROCESSED"
        # Frame 1: Track is NEW (ByteTrack requires 2 frames to activate)
        assert res_f1["active_tracks_count"] == 0

        # Step 2: Entity advances inside Restricted Zone at T=1000.5
        # Track becomes ACTIVE -> Restricted Zone Breach triggered!
        ts_f2 = ts_base + 0.5
        det_f2 = [
            Detection(camera_id="CAM-P5-01", frame_index=2, timestamp_utc=ts_f2, class_id=0, class_name="person", confidence=0.9, bbox=(102, 100, 202, 200))
        ]
        mock_detector.set_mock_detections(det_f2)
        res_f2 = orchestrator.process_frame(make_frame("CAM-P5-01", 2, ts_f2), health_ok)

        # 1. Zone transition detected
        assert len(res_f2["zone_events"]) == 1
        # 2. Normalized into Anomaly
        assert len(res_f2["anomalies"]) == 1
        anom_breach = res_f2["anomalies"][0]
        assert anom_breach["anomaly_type"] == "RESTRICTED_ZONE_BREACH"
        assert anom_breach["severity"] == "CRITICAL"
        # 3. Actionable AI Alert generated
        assert len(res_f2["alerts"]) >= 1
        alert = res_f2["alerts"][0]
        assert alert["severity"] == "CRITICAL"
        assert alert["lifecycle_state"] == "NEW"
        # 4. Cryptographic Evidence Snapshot captured and sealed
        assert len(res_f2["evidence"]) >= 1
        evd = res_f2["evidence"][0]
        assert evd["sha256_hash"] is not None
        assert len(evd["sha256_hash"]) == 64

        # Verify evidence integrity on disk
        evd_mgr = orchestrator.get_evidence_manager("CAM-P5-01")
        verify_res = evd_mgr.verify_evidence_integrity(evd["evidence_id"])
        assert verify_res.is_valid is True

        # Step 3: Entity loiters inside Restricted Zone at T=1002.0 (> 1.0s dwell threshold)
        ts_f3 = ts_base + 2.0
        mock_detector.set_mock_detections(det_f2)
        res_f3 = orchestrator.process_frame(make_frame("CAM-P5-01", 3, ts_f3), health_ok)

        # 1. Loitering event detected
        assert len(res_f3["loitering_events"]) == 1
        # 2. Loitering anomaly generated
        assert any(a["anomaly_type"] == "LOITERING_DETECTED" for a in res_f3["anomalies"])
        # 3. Multi-Signal Incident Correlation: Breach + Loitering in same window -> CORRELATED_SECURITY_INCURSION!
        assert len(res_f3["incidents"]) == 1
        inc = res_f3["incidents"][0]
        assert inc["incident_type"] == IncidentType.CORRELATED_SECURITY_INCURSION.value
        assert inc["severity"] == "CRITICAL"
        assert inc["signals_count"] >= 2
        assert "Multi-signal security incursion detected" in inc["explanation"]

        # Step 4: Supervisor Lifecycle Actions & Human Audit Review
        alert_mgr = orchestrator.get_alert_manager("CAM-P5-01")
        ack_alert = alert_mgr.acknowledge_alert(alert["alert_id"], user_id="duty_officer_amit", notes="Patrol dispatched")
        assert ack_alert.lifecycle_state == AlertLifecycleState.ACKNOWLEDGED

        res_alert = alert_mgr.resolve_alert(alert["alert_id"], user_id="duty_officer_amit", notes="Inspection complete. Contractor escorted.")
        assert res_alert.lifecycle_state == AlertLifecycleState.RESOLVED

        # Submit Human Review feedback
        rev = evd_mgr.submit_human_review(
            target_id=inc["incident_id"],
            reviewer_id="duty_officer_amit",
            outcome=ReviewOutcome.TRUE_EVENT,
            notes="Correlated breach confirmed by on-site guard."
        )
        assert rev.outcome == ReviewOutcome.TRUE_EVENT
        assert evd_mgr.get_false_positive_rate() == 0.0
