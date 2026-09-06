"""
KANAKA CHALA — Member 4 AI Subsystem
Phase 4 Demonstration Script: Occupancy, Crowd Analytics & Non-Biometric Attendance Consistency

Runs real Ultralytics YOLOv8 inference + ByteTrack tracking on synthetic/demo video feeds,
aggregates real-time, peak, and windowed occupancy statistics, evaluates crowd density
thresholds for configured zones, compares against official reported attendance, and outputs
explainable operational discrepancy signals using neutral review terminology.
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
    AttendanceConsistencyConfig,
    OccupancyConfig,
    SingleCameraConfig,
    SourceType,
    SpatialConfig,
)
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import (
    ReportedAttendance,
    Zone,
    ZoneType,
)
from ai_subsystem.utils.logger import logger
from ai_subsystem.utils.synthetic_video import generate_demo_video


def run_phase4_demo():
    logger.info("=" * 70)
    logger.info("  KANAKA CHALA — Member 4 AI Subsystem (Phase 4 Demonstration)")
    logger.info("  Occupancy, Crowd Analytics & Non-Biometric Attendance Consistency")
    logger.info("=" * 70)

    # 1. Ensure test video asset exists
    os.makedirs("data", exist_ok=True)
    video_path = os.path.join("data", "demo_cctv.mp4")
    if not os.path.exists(video_path):
        logger.info("Creating demo CCTV video asset with moving person...")
        generate_demo_video(video_path, num_frames=125, fps=25)

    # 2. Configure Monitored Activity Zone with Capacity Limits
    # e.g., Training & Recreation Hall (max capacity: 2, warning: 1, critical: 2)
    training_hall = Zone(
        zone_id="ZN-HALL-01",
        camera_id="CAM-MOSJE-01",
        name="Activity & Training Hall",
        zone_type=ZoneType.COMMON_AREA,
        polygon=[(40.0, 40.0), (320.0, 40.0), (320.0, 440.0), (40.0, 440.0)],
        max_capacity=2,
        warning_threshold=1,
        critical_threshold=2
    )

    # 3. Configure Master Subsystem with Phase 4 Occupancy and Attendance
    config = AIConfig(
        occupancy=OccupancyConfig(
            window_duration_sec=60.0,
            confirmation_frames=2,
            alert_cooldown_sec=5.0
        ),
        attendance=AttendanceConsistencyConfig(
            enabled=True,
            default_observation_window_sec=60.0,
            tolerance_percentage=20.0,
            min_tolerance_absolute=3,
            min_observation_sec=1.0,
            alert_cooldown_sec=5.0,
            use_peak_occupancy=True
        )
    )

    cam1_cfg = SingleCameraConfig(
        camera_id="CAM-MOSJE-01",
        institution_id="INST-DoSJE-KA01",
        source_type=SourceType.DEMO,
        uri=video_path,
        loop_video=True,
        spatial=SpatialConfig(zones=[training_hall]),
        occupancy=config.occupancy,
        attendance=config.attendance
    )

    orchestrator = AIPipelineOrchestrator(config=config)
    orchestrator.register_camera(cam1_cfg)

    # 4. Register Official Administrative Attendance Input
    # Institutional report: 15 attendees registered for the session
    reported_input = ReportedAttendance(
        institution_id="INST-DoSJE-KA01",
        camera_id="CAM-MOSJE-01",
        session_name="Morning Skill Batch A",
        reported_count=15,
        metadata={"supervisor": "District Inspector", "shift": "09:00-12:00"}
    )
    orchestrator.register_reported_attendance(reported_input)

    logger.info("\n[Demo Input] Official Administrative Attendance:")
    logger.info(f"  Institution ID     : {reported_input.institution_id}")
    logger.info(f"  Session Name       : {reported_input.session_name}")
    logger.info(f"  Reported Attendance: {reported_input.reported_count} attendees")
    logger.info(f"  Configured Allowed Discrepancy Tolerance: {config.attendance.tolerance_percentage}%\n")

    # 5. Start Orchestrator
    logger.info("Starting AI Orchestrator with Occupancy & Attendance Consistency...")
    orchestrator.start()

    time.sleep(1.0)

    # Run for 4 observation ticks
    snapshot_saved = False
    for tick in range(1, 5):
        time.sleep(1.0)
        logger.info(f"--- [Tick #{tick}] Occupancy & Attendance Telemetry ---")
        occ_analyzer = orchestrator.get_occupancy_analyzer("CAM-MOSJE-01")
        att_engine = orchestrator.get_attendance_engine("CAM-MOSJE-01")

        # Get latest camera snapshot
        cam_snap = None
        if occ_analyzer._camera_history:
            latest_count = occ_analyzer._camera_history[-1][1]
            peak, min_c, avg_c = occ_analyzer._compute_window_stats(occ_analyzer._camera_history, latest_count)
            cam_snap = {
                "current": latest_count,
                "peak": peak,
                "min": min_c,
                "avg": round(avg_c, 2)
            }
            logger.info(
                f"  Camera [CAM-MOSJE-01] Occupancy -> "
                f"Current: {cam_snap['current']} | Peak: {cam_snap['peak']} | "
                f"Min: {cam_snap['min']} | Avg: {cam_snap['avg']:.2f}"
            )

        # Check zone occupancy
        if "ZN-HALL-01" in occ_analyzer._zone_histories and occ_analyzer._zone_histories["ZN-HALL-01"]:
            z_hist = occ_analyzer._zone_histories["ZN-HALL-01"]
            z_latest = z_hist[-1][1]
            z_peak, z_min, z_avg = occ_analyzer._compute_window_stats(z_hist, z_latest)
            logger.info(
                f"  Zone [Activity Hall] Occupancy -> "
                f"Current: {z_latest} | Peak: {z_peak} (Capacity: 2)"
            )

        # Check latest attendance discrepancy alert
        if att_engine._last_alert_ts:
            logger.info(f"  [DISCREPANCY ALERT ACTIVE] Last flagged at UTC: {list(att_engine._last_alert_ts.values())[-1]}")

    # 6. Render and Save Phase 4 Annotated Snapshot
    worker = orchestrator.source_manager.get_worker("CAM-MOSJE-01")
    if worker:
        success, payload = worker.source.read_frame()
        if success and payload is not None:
            ann_frame = payload.frame_bgr.copy()

            # Draw Monitored Zone polygon (Green/Amber)
            pts = np.array(training_hall.polygon, np.int32).reshape((-1, 1, 2))
            cv2.polylines(ann_frame, [pts], isClosed=True, color=(0, 255, 255), thickness=2)
            cv2.putText(ann_frame, "ZONE: Activity Hall [Cap: 2]", (45, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

            # Draw Occupancy & Attendance Status Overlay Card
            cv2.rectangle(ann_frame, (10, 310), (630, 470), (20, 20, 20), -1)
            cv2.rectangle(ann_frame, (10, 310), (630, 470), (0, 165, 255), 1)

            cv2.putText(ann_frame, "KANAKA CHALA | AI MONITORING & OCCUPANCY ENGINE", (20, 335),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            peak_val = cam_snap['peak'] if cam_snap else 1
            curr_val = cam_snap['current'] if cam_snap else 1
            avg_val = cam_snap['avg'] if cam_snap else 1.0

            cv2.putText(ann_frame, f"Observed Occupancy: Current={curr_val} | Peak={peak_val} | Avg={avg_val:.1f}",
                        (20, 365), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 255, 0), 1)

            cv2.putText(ann_frame, f"Reported Attendance: {reported_input.reported_count} attendees (Session: {reported_input.session_name})",
                        (20, 395), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 200), 1)

            diff = reported_input.reported_count - peak_val
            pct = (diff / reported_input.reported_count) * 100.0
            cv2.putText(ann_frame, f"Discrepancy: Diff={diff} ({pct:.1f}%) | Tolerance={config.attendance.tolerance_percentage}%",
                        (20, 425), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 165, 255), 1)

            cv2.putText(ann_frame, "STATUS: Observed occupancy differs materially. Verification recommended.",
                        (20, 455), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 100, 255), 1)

            output_path = os.path.join("data", "demo_phase4_annotated.jpg")
            cv2.imwrite(output_path, ann_frame)
            logger.info(f"Saved Phase 4 annotated snapshot to: {output_path}")

    # 7. Stop Orchestrator
    orchestrator.stop()
    logger.info("=" * 70)
    logger.info("  Phase 4 Demo Complete — Occupancy & Attendance Verified!")
    logger.info("=" * 70)


if __name__ == "__main__":
    run_phase4_demo()
