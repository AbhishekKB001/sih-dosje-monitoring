"""
Object Detector module for Member 4 AI Subsystem.
Provides a clean detector interface and production-ready Ultralytics YOLOv8 implementation.
"""

from abc import ABC, abstractmethod
import time
from typing import Any, Dict, List, Optional
import numpy as np
from ai_subsystem.config import DetectorConfig
from ai_subsystem.schemas import Detection, FramePayload
from ai_subsystem.utils.logger import logger


class BaseObjectDetector(ABC):
    """
    Abstract contract for object detection models.
    Allows seamlessly swapping YOLOv8 with future detection models (e.g. YOLOv9, RT-DETR, or fine-tuned weights).
    """

    def __init__(self, config: Optional[DetectorConfig] = None):
        self.config = config or DetectorConfig()
        self.is_loaded: bool = False
        self.last_inference_latency_ms: float = 0.0

    @abstractmethod
    def load_model(self) -> bool:
        """Loads model weights into memory/device. Returns True if successful."""
        pass

    @abstractmethod
    def detect(self, frame_payload: FramePayload) -> List[Detection]:
        """
        Runs object detection on a single frame payload.
        Returns:
            List of strongly-typed Detection instances.
        """
        pass

    @abstractmethod
    def get_model_metadata(self) -> Dict[str, Any]:
        """Returns model identifier, version, and inference configuration."""
        pass


class YOLOv8Detector(BaseObjectDetector):
    """
    Production-ready object detector using Ultralytics YOLOv8.
    Supports person detection, multi-class filtering, CPU/GPU execution, and latency tracking.
    """

    def __init__(self, config: Optional[DetectorConfig] = None):
        super().__init__(config=config)
        self._model = None
        self._target_class_indices: Optional[set[int]] = None
        self._class_names_map: Dict[int, str] = {}

    def load_model(self) -> bool:
        try:
            from ultralytics import YOLO
            import threading
            self._lock = threading.Lock()
            
            logger.info(f"Loading YOLO model '{self.config.model_name}' on device '{self.config.device}'...")
            self._model = YOLO(self.config.model_name)
            
            # Pre-warm model with a dummy inference pass to fuse layers and prevent multi-thread race conditions
            dummy_img = np.zeros((self.config.input_size, self.config.input_size, 3), dtype=np.uint8)
            self._model.predict(source=dummy_img, device=self.config.device, verbose=False)

            # Extract and index class names
            if hasattr(self._model, "names") and self._model.names:
                self._class_names_map = {int(k): str(v) for k, v in self._model.names.items()}
            
            # Map target class names (e.g. 'person') to internal class indices
            if self.config.target_classes:
                target_set = set(c.lower() for c in self.config.target_classes)
                self._target_class_indices = {
                    idx for idx, name in self._class_names_map.items()
                    if name.lower() in target_set
                }
                logger.info(
                    f"Target classes configured: {self.config.target_classes} "
                    f"-> Class IDs: {self._target_class_indices}"
                )
            else:
                self._target_class_indices = None  # Accept all classes

            self.is_loaded = True
            logger.info(f"YOLO model '{self.config.model_name}' loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load YOLO model '{self.config.model_name}': {e}", exc_info=True)
            self.is_loaded = False
            return False

    def detect(self, frame_payload: FramePayload) -> List[Detection]:
        if not self.is_loaded or self._model is None:
            if not self.load_model():
                return []

        if not frame_payload.is_valid():
            return []

        start_time = time.time()
        detections: List[Detection] = []

        try:
            frame_bgr = frame_payload.frame_bgr
            
            # Run Ultralytics YOLO inference under thread lock for CPU stability
            predict_kwargs = {
                "source": frame_bgr,
                "conf": self.config.confidence_threshold,
                "iou": self.config.iou_threshold,
                "imgsz": self.config.input_size,
                "device": self.config.device,
                "verbose": False
            }
            if "cuda" in str(self.config.device).lower() and self.config.half_precision:
                predict_kwargs["half"] = True

            with self._lock:
                results = self._model.predict(**predict_kwargs)

            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes
                
                if boxes is not None and len(boxes) > 0:
                    for box in boxes:
                        cls_id = int(box.cls[0].item())
                        conf = float(box.conf[0].item())
                        
                        # Apply target class filter
                        if self._target_class_indices is not None and cls_id not in self._target_class_indices:
                            continue

                        # Extract bounding box (x1, y1, x2, y2)
                        coords = box.xyxy[0].tolist()
                        x1, y1, x2, y2 = float(coords[0]), float(coords[1]), float(coords[2]), float(coords[3])
                        
                        class_name = self._class_names_map.get(cls_id, f"class_{cls_id}")

                        det = Detection(
                            camera_id=frame_payload.camera_id,
                            frame_index=frame_payload.frame_index,
                            timestamp_utc=frame_payload.timestamp_utc,
                            class_id=cls_id,
                            class_name=class_name,
                            confidence=conf,
                            bbox=(x1, y1, x2, y2),
                            model_name=self.config.model_name,
                            model_version="yolov8n-v1.0"
                        )
                        detections.append(det)

            self.last_inference_latency_ms = (time.time() - start_time) * 1000.0

        except Exception as e:
            logger.error(f"[{frame_payload.camera_id}] Error during YOLO detection: {e}")
            self.last_inference_latency_ms = 0.0

        return detections

    def get_model_metadata(self) -> Dict[str, Any]:
        return {
            "detector_type": "YOLOv8Detector",
            "model_name": self.config.model_name,
            "device": self.config.device,
            "conf_thresh": self.config.confidence_threshold,
            "iou_thresh": self.config.iou_threshold,
            "input_size": self.config.input_size,
            "target_classes": self.config.target_classes,
            "is_loaded": self.is_loaded,
            "last_latency_ms": self.last_inference_latency_ms,
        }


class DeterministicMockDetector(BaseObjectDetector):
    """
    Fast deterministic test detector for unit tests and CI where loading model weights is unnecessary.
    """

    def __init__(self, config: Optional[DetectorConfig] = None, mock_detections: Optional[List[Detection]] = None):
        super().__init__(config=config)
        self.mock_detections = mock_detections or []

    def load_model(self) -> bool:
        self.is_loaded = True
        return True

    def set_mock_detections(self, detections: List[Detection]) -> None:
        self.mock_detections = detections

    def detect(self, frame_payload: FramePayload) -> List[Detection]:
        # Filter mock detections based on config threshold and class
        results = []
        for d in self.mock_detections:
            if d.confidence >= self.config.confidence_threshold:
                if not self.config.target_classes or d.class_name in self.config.target_classes:
                    results.append(d)
        return results

    def get_model_metadata(self) -> Dict[str, Any]:
        return {
            "detector_type": "DeterministicMockDetector",
            "model_name": "mock-detector",
            "is_loaded": True
        }
