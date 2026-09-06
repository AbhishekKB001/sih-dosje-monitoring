"""
Visual Content Health Monitor for Member 4 AI Subsystem.
Analyzes frame content to detect frozen streams, black screens, blur, low light, and scene tampering.
"""

from typing import Optional
import cv2
import numpy as np
from ai_subsystem.config import VisualHealthConfig
from ai_subsystem.schemas import FramePayload, VisualHealthResult, VisualHealthState
from ai_subsystem.utils.logger import logger


class VisualHealthMonitor:
    """
    Evaluates visual quality and stream integrity using Computer Vision algorithms.
    Decoupled from transport-level RTSP connectivity (Member 3).
    """

    def __init__(self, camera_id: str, config: Optional[VisualHealthConfig] = None):
        self.camera_id = camera_id
        self.config = config or VisualHealthConfig()
        
        self.current_state: VisualHealthState = VisualHealthState.HEALTHY
        self._prev_gray: Optional[np.ndarray] = None
        
        # Persistence counters to avoid alert flapping on transient noise
        self._consecutive_static_frames: int = 0
        self._consecutive_fault_frames: int = 0
        self._consecutive_healthy_frames: int = 0
        self._candidate_state: VisualHealthState = VisualHealthState.HEALTHY

    def analyze_frame(self, frame_payload: FramePayload) -> VisualHealthResult:
        """
        Analyzes a single frame for visual degradation or faults.
        """
        if not self.config.enabled or not frame_payload.is_valid():
            return VisualHealthResult(
                camera_id=self.camera_id,
                frame_index=frame_payload.frame_index if frame_payload else 0,
                state=VisualHealthState.BLACK_SCREEN,
                is_healthy=False,
                fault_reason="Invalid or empty frame buffer"
            )

        frame = frame_payload.frame_bgr
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 1. Illumination & Darkness Analysis
        mean_intensity = float(np.mean(gray))
        
        # 2. Blur Analysis (Laplacian Variance)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        blur_variance = float(laplacian.var())
        
        # 3. Inter-frame Difference & Motion Analysis
        frame_diff = 0.0
        is_first_frame = (self._prev_gray is None)
        
        if not is_first_frame:
            # Resize prev frame if resolution dynamically changed
            if self._prev_gray.shape != gray.shape:
                self._prev_gray = cv2.resize(self._prev_gray, (gray.shape[1], gray.shape[0]))
            
            diff_img = cv2.absdiff(gray, self._prev_gray)
            frame_diff = float(np.mean(diff_img))

        self._prev_gray = gray.copy()

        # Determine raw instant state for this frame
        instant_state, fault_reason = self._evaluate_instant_state(
            mean_intensity=mean_intensity,
            blur_variance=blur_variance,
            frame_diff=frame_diff,
            is_first_frame=is_first_frame
        )

        # Apply persistence filtering
        final_state = self._apply_persistence(instant_state)
        is_healthy = (final_state == VisualHealthState.HEALTHY)

        return VisualHealthResult(
            camera_id=self.camera_id,
            frame_index=frame_payload.frame_index,
            timestamp_utc=frame_payload.timestamp_utc,
            state=final_state,
            mean_intensity=mean_intensity,
            blur_variance=blur_variance,
            frame_diff=frame_diff,
            is_healthy=is_healthy,
            fault_reason=fault_reason if not is_healthy else None,
            metadata={
                "static_frame_count": self._consecutive_static_frames,
                "consecutive_healthy": self._consecutive_healthy_frames,
            }
        )

    def _evaluate_instant_state(
        self,
        mean_intensity: float,
        blur_variance: float,
        frame_diff: float,
        is_first_frame: bool
    ) -> tuple[VisualHealthState, Optional[str]]:
        """Evaluates instant conditions against configured thresholds."""
        
        # Check complete blackout / lens covered
        if mean_intensity <= self.config.black_frame_threshold:
            return (
                VisualHealthState.BLACK_SCREEN,
                f"Black frame / lens covered (intensity {mean_intensity:.1f} <= {self.config.black_frame_threshold})"
            )

        # Check extreme low light
        if mean_intensity <= self.config.low_light_threshold:
            return (
                VisualHealthState.LOW_LIGHT,
                f"Severe low light / scene darkness (intensity {mean_intensity:.1f} <= {self.config.low_light_threshold})"
            )

        # Check blur / out of focus
        if blur_variance <= self.config.blur_variance_threshold:
            return (
                VisualHealthState.BLURRED,
                f"Excessive blur / lens out of focus (variance {blur_variance:.1f} <= {self.config.blur_variance_threshold})"
            )

        # Check frozen frame (static video across consecutive frames)
        if not is_first_frame:
            if frame_diff <= self.config.freeze_diff_threshold:
                self._consecutive_static_frames += 1
                if self._consecutive_static_frames >= self.config.freeze_consecutive_frames:
                    return (
                        VisualHealthState.FROZEN,
                        f"Frozen video stream ({self._consecutive_static_frames} consecutive static frames, diff={frame_diff:.2f})"
                    )
            else:
                self._consecutive_static_frames = 0

            # Check sudden viewpoint shift or camera physical tampering
            if frame_diff >= self.config.scene_change_threshold:
                return (
                    VisualHealthState.SCENE_CHANGE,
                    f"Sudden scene change / camera viewpoint tampering (diff {frame_diff:.1f} >= {self.config.scene_change_threshold})"
                )
        else:
            self._consecutive_static_frames = 0

        return VisualHealthState.HEALTHY, None

    def _apply_persistence(self, instant_state: VisualHealthState) -> VisualHealthState:
        """Applies hysteresis to prevent flapping between states."""
        if instant_state == VisualHealthState.HEALTHY:
            self._consecutive_healthy_frames += 1
            if self._consecutive_healthy_frames >= self.config.recovery_persistence_frames:
                self.current_state = VisualHealthState.HEALTHY
                self._candidate_state = VisualHealthState.HEALTHY
                self._consecutive_fault_frames = 0
        else:
            self._consecutive_healthy_frames = 0
            if instant_state == self._candidate_state:
                self._consecutive_fault_frames += 1
            else:
                self._candidate_state = instant_state
                self._consecutive_fault_frames = 1

            if self._consecutive_fault_frames >= self.config.fault_persistence_frames:
                self.current_state = instant_state

        return self.current_state

    def reset(self) -> None:
        """Resets visual health state history."""
        self.current_state = VisualHealthState.HEALTHY
        self._prev_gray = None
        self._consecutive_static_frames = 0
        self._consecutive_fault_frames = 0
        self._consecutive_healthy_frames = 0
