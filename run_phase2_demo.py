"""
Phase 2 Demonstration Runner for Member 4 AI Subsystem.
Demonstrates YOLOv8 Object Detection, ByteTrack Multi-Object Tracking, and Real-Time Annotations.
"""

import os
import time
import cv2
from ai_subsystem.config import AIConfig, DetectorConfig, SingleCameraConfig, SourceType, TrackerConfig
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.utils.logger import logger
from ai_subsystem.utils.synthetic_video import generate_demo_video


def run_demo():
    logger.info("==================================================================")
    logger.info("  KANAKA CHALA — Member 4 AI Subsystem (Phase 2 Demonstration)    ")
    logger.info("  YOLOv8 Object Detection & ByteTrack Multi-Object Tracking       ")
    logger.info("==================================================================")

    # 1. Prepare sample demo video
    demo_video_path = os.path.join("data", "demo_cctv.mp4")
    if not os.path.exists(demo_video_path):
        generate_demo_video(output_path=demo_video_path, num_frames=150, width=640, height=480, fps=25)

    # 2. Configure AI Subsystem with YOLOv8 and ByteTrack
    config = AIConfig(
        config_version="cfg-2026.1",
        model_version="v1.0.0",
        detector=DetectorConfig(
            model_name="yolov8n.pt",
            confidence_threshold=0.25,
            target_classes=["person"],
            device="cpu"
        ),
        tracker=TrackerConfig(
            min_hits_to_active=2,
            max_lost_frames=15
        )
    )

    orchestrator = AIPipelineOrchestrator(config=config)

    # Register Camera 1 (Indoor Corridor)
    orchestrator.register_camera(SingleCameraConfig(
        camera_id="CAM-MOSJE-01",
        institution_id="INST-DL-0012",
        source_type=SourceType.DEMO,
        uri=demo_video_path,
        loop_video=True
    ))

    # Register Camera 2 (Activity Hall)
    orchestrator.register_camera(SingleCameraConfig(
        camera_id="CAM-MOSJE-02",
        institution_id="INST-DL-0012",
        source_type=SourceType.DEMO,
        uri=demo_video_path,
        loop_video=True
    ))

    # 3. Launch Pipeline
    logger.info("Launching Camera Workers with YOLOv8 & ByteTrack...")
    orchestrator.start()

    # 4. Monitor real-time telemetry for 4 seconds
    for i in range(4):
        time.sleep(1.0)
        status = orchestrator.get_system_status()
        summary = status["summary"]
        logger.info(f"--- [Tick #{i+1}] AI Multi-Camera Pipeline Telemetry ---")
        logger.info(
            f"Active Streaming Cameras: {summary['active_streaming_cameras']} | "
            f"Total Frames Ingested: {summary['total_frames_read']} | "
            f"Visually Degraded: {summary['visually_degraded_cameras']}"
        )
        for cid, m in status["cameras"].items():
            logger.info(
                f"  [{cid}] Ingested: {m['frames_read_total']} frames ({m['input_fps']:.1f} FPS) | "
                f"Dropped/Paced: {m['frames_dropped_total']} | "
                f"Processed: {m['processed_fps']:.1f} AI-FPS | "
                f"Active Tracks: {m['active_tracks_count']} | "
                f"Latency: {m['pipeline_latency_ms']:.2f}ms | "
                f"Health: {m['health_state']}"
            )

    # 5. Extract and annotate a sample frame for visual verification
    success, payload = orchestrator.source_manager.get_worker("CAM-MOSJE-01").source.read_frame()
    if success and payload is not None:
        frame = payload.frame_bgr.copy()
        detections = orchestrator.detector.detect(payload)
        tracker = orchestrator.get_tracker("CAM-MOSJE-01")
        tracks = tracker.update(detections, payload.timestamp_utc)
        
        for t in tracks:
            x1, y1, x2, y2 = [int(v) for v in t.current_bbox]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"ID:{t.track_id} {t.class_name} {t.confidence:.2f} [{t.state.value}]"
            cv2.putText(frame, label, (x1, max(y1 - 10, 20)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
        annotated_path = os.path.join("data", "demo_phase2_annotated.jpg")
        cv2.imwrite(annotated_path, frame)
        logger.info(f"Saved annotated detection snapshot to: {annotated_path}")

    # 6. Stop Orchestrator
    orchestrator.stop()

    logger.info("==================================================================")
    logger.info("  Phase 2 Demo Complete — YOLO Detection & Tracking Verified!    ")
    logger.info("==================================================================")


if __name__ == "__main__":
    run_demo()
