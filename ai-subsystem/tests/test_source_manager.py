"""
Unit tests for SourceManager, CameraWorker, and multi-camera failure isolation.
"""

import time
import pytest
from ai_subsystem.config import SingleCameraConfig, SourceType
from ai_subsystem.manager.source_manager import SourceManager
from ai_subsystem.observability.metrics import MetricsCollector
from ai_subsystem.schemas import SourceState
from ai_subsystem.utils.synthetic_video import generate_demo_video


@pytest.fixture(scope="module")
def demo_video_file(tmp_path_factory):
    fn = tmp_path_factory.mktemp("multi_cam") / "sample.mp4"
    return generate_demo_video(output_path=str(fn), num_frames=50, width=320, height=240, fps=25)


def test_multi_camera_failure_isolation(demo_video_file):
    metrics = MetricsCollector()
    received_frames = {"CAM-HEALTHY": 0, "CAM-BROKEN": 0}

    def frame_handler(frame_payload, health_result):
        received_frames[frame_payload.camera_id] += 1

    manager = SourceManager(
        metrics_collector=metrics,
        frame_handler=frame_handler
    )

    # 1. Register a valid, working camera
    cam_healthy = SingleCameraConfig(
        camera_id="CAM-HEALTHY",
        source_type=SourceType.DEMO,
        uri=demo_video_file,
        loop_video=True
    )
    manager.add_camera(cam_healthy)

    # 2. Register a broken camera with invalid file path
    cam_broken = SingleCameraConfig(
        camera_id="CAM-BROKEN",
        source_type=SourceType.DEMO,
        uri="completely_invalid_file_path.mp4",
        loop_video=False
    )
    manager.add_camera(cam_broken)

    # 3. Start all cameras
    manager.start_all()
    
    # Allow worker threads to run briefly
    time.sleep(0.5)

    # 4. Assert: Broken camera is in ERROR state, but Healthy camera continued streaming frames!
    broken_metrics = metrics.get_camera_metrics("CAM-BROKEN")
    healthy_metrics = metrics.get_camera_metrics("CAM-HEALTHY")

    assert broken_metrics.source_state == SourceState.ERROR
    assert healthy_metrics.source_state == SourceState.STREAMING
    assert received_frames["CAM-HEALTHY"] > 0
    assert received_frames["CAM-BROKEN"] == 0

    # Clean shutdown
    manager.stop_all()
