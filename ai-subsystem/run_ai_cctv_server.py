"""
DoSJE Drishti — AI CCTV & MJPEG Streaming Server
Feeds 01.avi into the AI Pipeline Orchestrator and exposes HTTP MJPEG stream at:
http://localhost:8000/api/v1/stream/{camera_id}
"""

import os
import sys
import time

# Ensure project root on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from ai_subsystem.adapters.api_service import Member4APIService
from ai_subsystem.adapters.backend_forwarder import attach_backend_forwarder
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
from ai_subsystem.schemas import Zone, ZoneType
from ai_subsystem.utils.logger import logger


def main():
    logger.info("=" * 70)
    logger.info("  DoSJE Drishti — AI CCTV & MJPEG Streaming Server")
    logger.info("  Video Asset: 01.avi -> AI Orchestrator -> Port 8000 MJPEG")
    logger.info("=" * 70)

    candidate_paths = [
        os.path.abspath("cctv-demo/videos/01.avi"),
        os.path.abspath("../cctv-demo/videos/01.avi"),
        os.path.abspath("01.avi"),
        os.path.abspath("../01.avi"),
        os.path.abspath("data/demo_cctv.mp4"),
        os.path.abspath("../backend/data/demo_cctv.mp4"),
    ]
    video_path = next((p for p in candidate_paths if os.path.exists(p)), os.path.abspath("01.avi"))

    logger.info(f"Target Video Source: {video_path}")

    # Set up storage and configuration
    os.makedirs("data/evidence", exist_ok=True)
    os.makedirs("evidence_store", exist_ok=True)
    storage = LocalStorageAdapter(base_dir="evidence_store")

    config = AIConfig(
        temporal=TemporalConfig(default_loitering_threshold_sec=5.0, loitering_confirmation_frames=2),
        anomaly=AnomalyConfig(enabled=True, cooldown_sec=10.0),
        incident=IncidentCorrelationConfig(enabled=True, correlation_window_sec=30.0),
        alert=AlertManagerConfig(enabled=True, alert_cooldown_sec=10.0),
        evidence=EvidenceConfig(enabled=True, storage_dir="data/evidence", jpeg_quality=92),
    )

    # Register cameras with 01.avi
    cameras = [
        ("CAM-MOSJE-01", "Main Gate & Ingress Portal"),
        ("CAM-MOSJE-02", "Classroom & Vocational Hall"),
        ("CAM-MOSJE-03", "Dining & Common Activity Hall"),
        ("CAM-MOSJE-04", "Dormitory Corridor East"),
        ("CAM-MOSJE-05", "Outdoor Recreation Grounds"),
        ("CAM-MOSJE-06", "Administrative Office Wing"),
    ]

    orchestrator = AIPipelineOrchestrator(config=config, storage_adapter=storage)
    backend_url = os.getenv("BACKEND_URL", "http://localhost:4000/api/alerts")
    attach_backend_forwarder(orchestrator, backend_url=backend_url)

    for cam_id, name in cameras:
        cam_cfg = SingleCameraConfig(
            camera_id=cam_id,
            institution_id="INST-DEL-01",
            source_type=SourceType.DEMO,
            uri=video_path,
            loop_video=True,
            spatial=SpatialConfig(
                zones=[
                    Zone(
                        zone_id=f"ZN-{cam_id}",
                        camera_id=cam_id,
                        name=f"Monitoring Zone - {name}",
                        zone_type=ZoneType.MONITORED,
                        polygon=[(20.0, 20.0), (600.0, 20.0), (600.0, 340.0), (20.0, 340.0)],
                        loitering_threshold_sec=5.0,
                    )
                ]
            ),
            temporal=config.temporal,
            anomaly=config.anomaly,
            incident=config.incident,
            alert=config.alert,
            evidence=config.evidence,
        )
        orchestrator.register_camera(cam_cfg)

    # Start the AI orchestrator pipeline
    logger.info("Starting AI Pipeline Orchestrator workers...")
    orchestrator.start()

    # Start the HTTP REST, SSE, and MJPEG Streaming Service
    api_service = Member4APIService(orchestrator=orchestrator, host="0.0.0.0", port=8000)
    logger.info("Starting Member 4 API Service on port 8000...")
    api_service.start(blocking=True)


if __name__ == "__main__":
    main()
