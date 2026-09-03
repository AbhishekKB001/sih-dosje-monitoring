"""
Unit tests for AIPipelineOrchestrator Phase 1 skeleton.
"""

import time
import pytest
from ai_subsystem.config import AIConfig, SingleCameraConfig, SourceType
from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import VisualHealthState
from ai_subsystem.utils.synthetic_video import generate_demo_video


@pytest.fixture(scope="module")
def orch_video_file(tmp_path_factory):
    fn = tmp_path_factory.mktemp("orch") / "orch_sample.mp4"
    return generate_demo_video(output_path=str(fn), num_frames=40, width=320, height=240, fps=25)


def test_orchestrator_initialization_and_run(orch_video_file):
    config = AIConfig()
    orchestrator = AIPipelineOrchestrator(config=config)

    cam_cfg = SingleCameraConfig(
        camera_id="CAM-ORCH-01",
        institution_id="INST-001",
        source_type=SourceType.DEMO,
        uri=orch_video_file,
        loop_video=True
    )
    orchestrator.register_camera(cam_cfg)

    # Start orchestrator
    orchestrator.start()
    time.sleep(0.5)

    # Retrieve system telemetry
    status = orchestrator.get_system_status()
    summary = status["summary"]
    cameras = status["cameras"]

    assert summary["registered_cameras_count"] == 1
    assert "CAM-ORCH-01" in cameras
    assert cameras["CAM-ORCH-01"]["frames_read_total"] > 0
    assert cameras["CAM-ORCH-01"]["health_state"] == VisualHealthState.HEALTHY.value

    # Graceful stop
    orchestrator.stop()
