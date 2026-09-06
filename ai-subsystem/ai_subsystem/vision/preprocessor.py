"""
OpenCV Frame Preprocessor for Member 4 AI Subsystem.
Validates, resizes, and normalizes frames before analysis.
"""

from typing import Optional, Tuple
import cv2
import numpy as np
from ai_subsystem.schemas import FramePayload
from ai_subsystem.utils.logger import logger


class OpenCVPreprocessor:
    """
    Handles frame validation, color conversion, and optional resizing for AI processing.
    """

    def __init__(self, target_width: Optional[int] = None, target_height: Optional[int] = None):
        self.target_width = target_width
        self.target_height = target_height

    def validate_frame(self, frame_payload: FramePayload) -> bool:
        """
        Validates that frame payload contains a valid, non-corrupted NumPy image.
        """
        if frame_payload is None or not frame_payload.is_valid():
            return False
        
        frame = frame_payload.frame_bgr
        if not isinstance(frame, np.ndarray):
            return False
        
        if len(frame.shape) != 3 or frame.shape[2] != 3:
            return False
        
        if frame.shape[0] < 10 or frame.shape[1] < 10:
            return False
        
        return True

    def to_grayscale(self, frame_bgr: np.ndarray) -> np.ndarray:
        """Converts BGR image to single-channel Grayscale for mathematical analysis."""
        return cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

    def resize_for_inference(self, frame_bgr: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Resizes frame if target dimensions are set.
        Returns:
            (resized_frame: np.ndarray, scale_factor: float)
        """
        if self.target_width is None or self.target_height is None:
            return frame_bgr, 1.0

        h, w = frame_bgr.shape[:2]
        if w == self.target_width and h == self.target_height:
            return frame_bgr, 1.0

        scale = min(self.target_width / w, self.target_height / h)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(frame_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
        return resized, scale
