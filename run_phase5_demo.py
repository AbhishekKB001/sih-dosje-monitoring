"""
KANAKA CHALA — Member 4 AI Subsystem
Phase 5 Demonstration Script: Anomaly Detection, Multi-Signal Incident Correlation,
Evidence Sealing & Human Review Engine

Demonstrates the complete real-world intelligence chain:
Video -> YOLO Detection -> ByteTrack -> Spatial Zone -> Temporal Loitering ->
Anomaly Detection -> Incident Correlation -> Actionable AI Alert ->
Sealed Evidence Snapshot -> SHA-256 Verification -> Supervisor Lifecycle & Review.
"""

import os
import sys
import time
import cv2
import numpy as np

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

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
    ReportedAttendance,
    ReviewOutcome,
    Zone,
    ZoneType,
)
from ai_subsystem.utils.logger import logger
from ai_subsystem.utils.synthetic_video import generate_demo_video


def run_phase5_demo():
    logger.info("=" * 75)
    logger.info("  KANAKA CHALA — Member 4 AI Subsystem (Phase 5 Demonstration)")
    logger.info("  Anomaly Detection, Multi-Signal Incident Correlation & Evidence Sealing")
    logger.info("=" * 75)

    # 1. Ensure test video asset exists
    os.makedirs("data", exist_ok=True)
    evidence_dir = os.path.join("data", "evidence")
    os.makedirs(evidence_dir, exist_ok=True)

    video_path = os.path.join("data", "demo_cctv.mp4")
    if not os.path.exists(video_path):
        logger.info("Generating demo CCTV video asset with moving person...")
        generate_demo_video(video_path, num_frames=125, fps=25)

    # 2. Configure Monitored Restricted Zone: Secured Record Room
    secured_vault = Zone(
        zone_id="ZN-VAULT-01",
        camera_id="CAM-MOSJE-01",
        name="Secured Document & Server Room",
        zone_type=ZoneType.RESTRICTED,
        polygon=[(30.0, 30.0), (350.0, 30.0), (350.0, 450.0), (30.0, 450.0)],
        loitering_threshold_sec=1.5
    )

    # 3. Configure Master Subsystem with Phase 5 Pipeline
    config = AIConfig(
        temporal=TemporalConfig(
            default_loitering_threshold_sec=1.5,
            loitering_confirmation_frames=1
        ),
        anomaly=AnomalyConfig(
            enabled=True,
            cooldown_sec=5.0
        ),
        incident=IncidentCorrelationConfig(
            enabled=True,
            correlation_window_sec=30.0,
            incident_cooldown_sec=10.0,
            min_signals_to_escalate=2
        ),
        alert=AlertManagerConfig(
            enabled=True,
            alert_cooldown_sec=5.0
        ),
        evidence=EvidenceConfig(
            enabled=True,
            storage_dir=evidence_dir,
            jpeg_quality=92
        )
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

    # 4. Initialize Orchestrator and Register Camera & Administrative Attendance
    orchestrator = AIPipelineOrchestrator(config=config)
    orchestrator.register_camera(cam_cfg)

    # Register official administrative reported attendance: 20 attendees
    reported_input = ReportedAttendance(
        institution_id="INST-DoSJE-DEMO",
        camera_id="CAM-MOSJE-01",
        session_name="Skill Development Session A",
        reported_count=20,
        metadata={"supervisor": "District Inspector", "shift": "Morning"}
    )
    orchestrator.register_reported_attendance(reported_input)

    logger.info("Starting AI Orchestrator with Anomaly, Incident & Evidence Engines...")
    orchestrator.start()

    time.sleep(1.0)

    # 5. Monitor Live Telemetry & Event Pipeline across 4 observation intervals
    alert_mgr = orchestrator.get_alert_manager("CAM-MOSJE-01")
    evd_mgr = orchestrator.get_evidence_manager("CAM-MOSJE-01")
    inc_engine = orchestrator.get_incident_engine("CAM-MOSJE-01")

    for tick in range(1, 5):
        time.sleep(1.0)
        logger.info(f"\n--- [Observation Interval #{tick}] Intelligence Telemetry ---")
        active_alerts = alert_mgr.get_active_alerts()
        logger.info(f"  Active AI Alerts in Queue: {len(active_alerts)}")
        for alt in active_alerts:
            logger.info(f"    -> [{alt.severity.value}] Alert ID: {alt.alert_id} | Type: {alt.alert_type} | State: {alt.lifecycle_state.value}")
            logger.info(f"       Title: {alt.title}")
            logger.info(f"       Explanation: {alt.explanation}")
            logger.info(f"       Action: {alt.recommended_action}")

        if inc_engine._active_incidents:
            logger.info(f"  Correlated Incidents Recorded: {len(inc_engine._active_incidents)}")
            for inc_id, inc in inc_engine._active_incidents.items():
                logger.info(f"    -> [{inc.severity.value}] Incident ID: {inc_id} | Type: {inc.incident_type.value} | Signals: {inc.signals_count}")

    # 6. Stop Orchestrator
    orchestrator.stop()

    # 7. Verification of Cryptographic Evidence & Integrity
    logger.info("\n" + "=" * 75)
    logger.info("  Cryptographic Evidence Sealing & Integrity Verification")
    logger.info("=" * 75)

    all_evidence = list(evd_mgr._evidence_records.values())
    logger.info(f"Total Evidence Snapshots Captured: {len(all_evidence)}")

    if all_evidence:
        sample_evd = all_evidence[0]
        logger.info(f"\n[Sample Evidence Snapshot Metadata]")
        logger.info(f"  Evidence ID     : {sample_evd.evidence_id}")
        logger.info(f"  Camera ID       : {sample_evd.camera_id}")
        logger.info(f"  Source Event ID : {sample_evd.source_event_id}")
        logger.info(f"  File Path       : {sample_evd.image_path}")
        logger.info(f"  File Size       : {sample_evd.file_size_bytes} bytes")
        logger.info(f"  Hash Algorithm  : {sample_evd.hash_algorithm}")
        logger.info(f"  SHA-256 Digest  : {sample_evd.sha256_hash}")
        logger.info(f"  Model Version   : {sample_evd.model_version}")
        logger.info(f"  Config Version  : {sample_evd.config_version}")

        # Perform Genuine Cryptographic Verification
        verification = evd_mgr.verify_evidence_integrity(sample_evd.evidence_id)
        logger.info(f"\n[Verification Check - Untampered File]")
        logger.info(f"  Integrity Status: {'VALID (PASS)' if verification.is_valid else 'FAILED'}")
        logger.info(f"  Explanation     : {verification.explanation}")

        # Demonstrate Tamper Detection
        # Simulate tampering by creating a copy with modified byte
        tampered_path = sample_evd.image_path + ".tamper_test.jpg"
        with open(sample_evd.image_path, "rb") as f_in:
            data = f_in.read()
        with open(tampered_path, "wb") as f_out:
            f_out.write(data + b"\x00\xFF_TAMPERED")

        computed_tampered = evd_mgr.compute_sha256_hash(tampered_path)
        logger.info(f"\n[Verification Check - Simulated Tampering]")
        logger.info(f"  Original SHA-256 : {sample_evd.sha256_hash[:32]}...")
        logger.info(f"  Tampered SHA-256 : {computed_tampered[:32]}...")
        logger.info(f"  Tamper Detected  : {computed_tampered != sample_evd.sha256_hash} (Mismatched hash prevents falsification)")

        if os.path.exists(tampered_path):
            os.remove(tampered_path)

    # 8. Human Review & Lifecycle Transition Demonstration
    logger.info("\n" + "=" * 75)
    logger.info("  Human Supervisor Audit Review & Lifecycle Transitions")
    logger.info("=" * 75)

    all_alerts = list(alert_mgr._alerts.values())
    if all_alerts:
        alert_to_review = all_alerts[0]
        logger.info(f"Target Alert ID: {alert_to_review.alert_id} (Current State: {alert_to_review.lifecycle_state.value})")

        # Step A: Supervisor acknowledges alert
        alert_mgr.acknowledge_alert(
            alert_id=alert_to_review.alert_id,
            user_id="supervisor_rajesh_kumar",
            notes="Security patrol dispatched to Document Room"
        )
        logger.info(f"  -> State updated to: {alert_to_review.lifecycle_state.value} by '{alert_to_review.acknowledged_by}'")

        # Step B: Supervisor resolves alert
        alert_mgr.resolve_alert(
            alert_id=alert_to_review.alert_id,
            user_id="supervisor_rajesh_kumar",
            notes="Authorized system maintenance by IT contractor. Badge #8841 verified."
        )
        logger.info(f"  -> State updated to: {alert_to_review.lifecycle_state.value} (Notes: {alert_to_review.resolution_notes})")

        # Step C: Supervisor registers structured audit feedback
        review = evd_mgr.submit_human_review(
            target_id=alert_to_review.alert_id,
            reviewer_id="supervisor_rajesh_kumar",
            outcome=ReviewOutcome.TRUE_EVENT,
            notes="Genuine physical entry event. Operational logs reconciled."
        )
        logger.info(f"\n[Submitted Human Audit Record]")
        logger.info(f"  Review ID     : {review.review_id}")
        logger.info(f"  Target Alert  : {review.target_id}")
        logger.info(f"  Auditor       : {review.reviewer_id}")
        logger.info(f"  Outcome       : {review.outcome.value}")
        logger.info(f"  Notes         : {review.notes}")
        logger.info(f"  FP Rate (Cum.): {evd_mgr.get_false_positive_rate():.1f}%")

    logger.info("\n" + "=" * 75)
    logger.info("  Phase 5 Demonstration Complete — Complete AI Pipeline Operational!")
    logger.info("=" * 75)


if __name__ == "__main__":
    run_phase5_demo()
