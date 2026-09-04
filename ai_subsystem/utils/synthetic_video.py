"""
Realistic Synthetic Video Generator for Member 4 AI Subsystem.
Generates genuine local MP4 video files with moving objects, timestamps, and zones for testing and offline demo.
"""

import os
import cv2
import numpy as np
from ai_subsystem.utils.logger import logger


def generate_demo_video(
    output_path: str = "tests/assets/demo_cctv.mp4",
    num_frames: int = 120,
    width: int = 640,
    height: int = 480,
    fps: int = 25
) -> str:
    """
    Generates an authentic MP4 video file with simulated room background, moving objects, and clock.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    if not writer.isOpened():
        raise RuntimeError(f"Could not open VideoWriter for {output_path}")

    logger.info(f"Generating synthetic demo CCTV video ({num_frames} frames @ {fps} FPS) -> {output_path}...")

    # Define moving object trajectory (simulating walking person)
    obj_x = 50.0
    obj_y = 200.0
    vx = 4.0

    for i in range(num_frames):
        # Create room background (gray floor, beige wall)
        frame = np.ones((height, width, 3), dtype=np.uint8) * 220
        # Floor
        frame[int(height * 0.4):, :] = (180, 180, 180)
        
        # Draw mock door / restricted entrance
        cv2.rectangle(frame, (450, 100), (580, 380), (120, 80, 50), -1)
        cv2.putText(frame, "RESTRICTED", (460, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

        # Draw a moving simulated person (torso + head)
        obj_x += vx
        if obj_x > width - 100 or obj_x < 50:
            vx = -vx  # Bounce back and forth

        center_x = int(obj_x)
        center_y = int(obj_y)
        # Torso
        cv2.rectangle(frame, (center_x - 20, center_y), (center_x + 20, center_y + 80), (50, 80, 160), -1)
        # Head
        cv2.circle(frame, (center_x, center_y - 20), 18, (80, 120, 200), -1)

        # Add CCTV overlay (Camera name, timestamp, frame index)
        cv2.putText(frame, f"CAM-DEMO-01  FRAME: {i:04d}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        cv2.putText(frame, "STATUS: LIVE MONITORING", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 150, 0), 2)

        writer.write(frame)

    writer.release()
    logger.info(f"Demo CCTV video generated successfully: {output_path}")
    return output_path


if __name__ == "__main__":
    generate_demo_video()
