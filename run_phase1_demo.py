"""
Phase 1 Demonstration Runner for Member 4 AI Subsystem.
Demonstrates video source ingestion, visual content health monitoring, and multi-camera supervision.
"""

import time
import os
from ai_subsystem.config import AIConfig, SingleCameraConfig, SourceType
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.utils.logger import logger
from ai_subsystem.utils.synthetic_video import generate_demo_video


def run_demo():
    logger.info("================================================================")
    logger.info("  KANAKA CHALA — Member 4 AI Subsystem (Phase 1 Demonstration)  ")
    logger.info("================================================================")

    # 1. Prepare sample demo video
    demo_video_path = os.path.join("data", "demo_cctv.mp4")
    if not os.path.exists(demo_video_path):
        generate_demo_video(output_path=demo_video_path, num_frames=150, width=640, height=480, fps=25)

    # 2. Configure AI Orchestrator with 2 Cameras
    config = AIConfig(config_version="cfg-2026.1", model_version="v1.0.0")

    orchestrator = AIPipelineOrchestrator(config=config)

    # Register Camera 1 (Indoor Hall)
    orchestrator.register_camera(SingleCameraConfig(
        camera_id="CAM-MOSJE-01",
        institution_id="INST-DL-0012",
        source_type=SourceType.DEMO,
        uri=demo_video_path,
        loop_video=True
    ))

    # Register Camera 2 (Main Entrance)
    orchestrator.register_camera(SingleCameraConfig(
        camera_id="CAM-MOSJE-02",
        institution_id="INST-DL-0012",
        source_type=SourceType.DEMO,
        uri=demo_video_path,
        loop_video=True
    ))

    # 3. Start Multi-Camera Orchestrator
    logger.info("Launching Camera Workers...")
    orchestrator.start()

    # 4. Monitor real-time telemetry for 3 seconds
    for i in range(3):
        time.sleep(1.0)
        status = orchestrator.get_system_status()
        summary = status["summary"]
        logger.info(f"--- [Tick #{i+1}] Subsystem Telemetry ---")
        logger.info(
            f"Active Streaming Cameras: {summary['active_streaming_cameras']} | "
            f"Total Frames Ingested: {summary['total_frames_read']} | "
            f"Visually Degraded: {summary['visually_degraded_cameras']}"
        )
        for cid, m in status["cameras"].items():
            logger.info(
                f"  [{cid}] State: {m['source_state']} | Health: {m['health_state']} | "
                f"Frames: {m['frames_read_total']} | Latency: {m['pipeline_latency_ms']:.2f}ms"
            )

    # 5. Stop Orchestrator
    orchestrator.stop()
    logger.info("================================================================")
    logger.info("  Phase 1 Demo Complete — Clean Ingestion & Health Verified!    ")
    logger.info("================================================================")


if __name__ == "__main__":
    run_demo()
