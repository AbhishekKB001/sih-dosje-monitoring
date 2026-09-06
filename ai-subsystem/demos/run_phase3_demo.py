"""
Phase 3 Demonstration Runner for Member 4 AI Subsystem.
Demonstrates Polygon Zones, Loitering Analytics, Virtual Line Crossing, and After-Hours Schedules.
"""

import os
import time
import cv2
import numpy as np

from ai_subsystem.config import (
    AIConfig,
    DetectorConfig,
    SingleCameraConfig,
    SourceType,
    SpatialConfig,
    TemporalConfig,
    TrackerConfig,
)
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import (
    OperationalSchedule,
    ScheduleTimeWindow,
    VirtualLine,
    Zone,
    ZoneType,
)
from ai_subsystem.utils.logger import logger
from ai_subsystem.utils.synthetic_video import generate_demo_video


def run_demo():
    logger.info("==================================================================")
    logger.info("  KANAKA CHALA — Member 4 AI Subsystem (Phase 3 Demonstration)    ")
    logger.info("  Spatial & Temporal Intelligence (Zones, Loitering, Schedules)   ")
    logger.info("==================================================================")

    # 1. Prepare sample demo video
    demo_video_path = os.path.join("data", "demo_cctv.mp4")
    if not os.path.exists(demo_video_path):
        generate_demo_video(output_path=demo_video_path, num_frames=150, width=640, height=480, fps=25)

    # 2. Define Spatial Zones and Lines
    corridor_zone = Zone(
        zone_id="ZN-CORRIDOR-01",
        camera_id="CAM-MOSJE-01",
        name="Monitored Corridor",
        zone_type=ZoneType.MONITORED,
        polygon=[(50.0, 100.0), (350.0, 100.0), (350.0, 420.0), (50.0, 420.0)],
        loitering_threshold_sec=5.0
    )

    restricted_vault = Zone(
        zone_id="ZN-VAULT-01",
        camera_id="CAM-MOSJE-02",
        name="Restricted Records Room",
        zone_type=ZoneType.RESTRICTED,
        polygon=[(200.0, 150.0), (550.0, 150.0), (550.0, 450.0), (200.0, 450.0)],
        loitering_threshold_sec=3.0
    )

    entry_tripwire = VirtualLine(
        line_id="LN-ENTRY-01",
        camera_id="CAM-MOSJE-01",
        name="Main Gate Tripwire",
        pt1=(380.0, 50.0),
        pt2=(380.0, 450.0),
        direction_label_in="INWARD",
        direction_label_out="OUTWARD"
    )

    # 3. Define Operational Schedule (Monday-Friday 09:00 - 18:00)
    office_schedule = OperationalSchedule(
        schedule_id="SCHED-OFFICE-01",
        name="DoSJE Institutional Working Hours",
        allowed_windows=[
            ScheduleTimeWindow(
                start_time="09:00",
                end_time="18:00",
                days_of_week=[0, 1, 2, 3, 4]  # Mon - Fri
            )
        ]
    )

    # 4. Master AI Subsystem Configuration
    config = AIConfig(
        config_version="cfg-2026.3",
        model_version="v1.0.0",
        detector=DetectorConfig(model_name="yolov8n.pt", device="cpu", confidence_threshold=0.25),
        tracker=TrackerConfig(min_hits_to_active=2),
        temporal=TemporalConfig(
            default_loitering_threshold_sec=5.0,
            loitering_confirmation_frames=2,
            schedules=[office_schedule]
        )
    )

    orchestrator = AIPipelineOrchestrator(config=config)

    # Register Camera 1 (Corridor + Tripwire)
    orchestrator.register_camera(SingleCameraConfig(
        camera_id="CAM-MOSJE-01",
        institution_id="INST-DL-0012",
        source_type=SourceType.DEMO,
        uri=demo_video_path,
        loop_video=True,
        schedule_id="SCHED-OFFICE-01",
        spatial=SpatialConfig(
            zones=[corridor_zone],
            lines=[entry_tripwire]
        )
    ))

    # Register Camera 2 (Restricted Vault)
    orchestrator.register_camera(SingleCameraConfig(
        camera_id="CAM-MOSJE-02",
        institution_id="INST-DL-0012",
        source_type=SourceType.DEMO,
        uri=demo_video_path,
        loop_video=True,
        schedule_id="SCHED-OFFICE-01",
        spatial=SpatialConfig(
            zones=[restricted_vault]
        )
    ))

    # 5. Launch Pipeline
    logger.info("Starting AI Orchestrator with Spatial & Temporal Analytics...")
    orchestrator.start()

    # 6. Monitor Pipeline Telemetry
    for i in range(4):
        time.sleep(1.0)
        status = orchestrator.get_system_status()
        summary = status["summary"]
        logger.info(f"--- [Tick #{i+1}] Spatial/Temporal Pipeline Telemetry ---")
        logger.info(
            f"Active Streaming Cameras: {summary['active_streaming_cameras']} | "
            f"Total Frames Ingested: {summary['total_frames_read']}"
        )
        for cid, m in status["cameras"].items():
            logger.info(
                f"  [{cid}] Ingested: {m['frames_read_total']} ({m['input_fps']:.1f} FPS) | "
                f"Active Tracks: {m['active_tracks_count']} | "
                f"Latency: {m['pipeline_latency_ms']:.2f}ms"
            )

    # 7. Render Annotated Snapshot showing Polygon Zones & Line
    success, payload = orchestrator.source_manager.get_worker("CAM-MOSJE-01").source.read_frame()
    if success and payload is not None:
        frame = payload.frame_bgr.copy()

        # Draw Polygon Zone
        pts = np.array(corridor_zone.polygon, np.int32).reshape((-1, 1, 2))
        overlay = frame.copy()
        cv2.fillPoly(overlay, [pts], (0, 255, 255))
        cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)
        cv2.polylines(frame, [pts], isClosed=True, color=(0, 200, 200), thickness=2)
        cv2.putText(frame, f"ZONE: {corridor_zone.name}", (int(corridor_zone.polygon[0][0]), int(corridor_zone.polygon[0][1]) - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 200), 2)

        # Draw Virtual Tripwire Line
        p1 = (int(entry_tripwire.pt1[0]), int(entry_tripwire.pt1[1]))
        p2 = (int(entry_tripwire.pt2[0]), int(entry_tripwire.pt2[1]))
        cv2.line(frame, p1, p2, (0, 0, 255), 2)
        cv2.putText(frame, f"TRIPWIRE: {entry_tripwire.name}", (p1[0] + 5, p1[1] + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        annotated_path = os.path.join("data", "demo_phase3_annotated.jpg")
        cv2.imwrite(annotated_path, frame)
        logger.info(f"Saved Phase 3 annotated snapshot to: {annotated_path}")

    # 8. Stop Orchestrator
    orchestrator.stop()

    logger.info("==================================================================")
    logger.info("  Phase 3 Demo Complete — Spatial & Temporal Analytics Verified!  ")
    logger.info("==================================================================")


if __name__ == "__main__":
    run_demo()
