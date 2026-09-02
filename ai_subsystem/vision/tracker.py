"""
Multi-Object Tracking (ByteTrack) module for Member 4 AI Subsystem.
Maintains persistent track IDs and enforces the NEW -> ACTIVE -> LOST -> EXPIRED lifecycle.
"""

import time
from typing import Dict, List, Optional, Tuple
import numpy as np
from ai_subsystem.config import TrackerConfig
from ai_subsystem.schemas import Detection, Track, TrackState
from ai_subsystem.utils.logger import logger


def calculate_iou(boxA: Tuple[float, float, float, float], boxB: Tuple[float, float, float, float]) -> float:
    """Calculates Intersection-over-Union (IoU) between two bounding boxes (x1, y1, x2, y2)."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    if interArea <= 0.0:
        return 0.0

    boxAArea = max(0.0, boxA[2] - boxA[0]) * max(0.0, boxA[3] - boxA[1])
    boxBArea = max(0.0, boxB[2] - boxB[0]) * max(0.0, boxB[3] - boxB[1])
    unionArea = boxAArea + boxBArea - interArea

    return interArea / unionArea if unionArea > 0 else 0.0


class InternalTrack:
    """Internal mutable tracking state for ByteTrack association and lifecycle."""
    def __init__(self, track_id: int, camera_id: str, detection: Detection):
        self.track_id = track_id
        self.camera_id = camera_id
        self.class_id = detection.class_id
        self.class_name = detection.class_name
        self.confidence = detection.confidence
        self.bbox = detection.bbox
        self.state = TrackState.NEW
        self.first_seen_utc = detection.timestamp_utc
        self.last_seen_utc = detection.timestamp_utc
        self.hits_count = 1
        self.lost_frames_count = 0
        self.age_frames = 1
        self.bbox_history: List[Tuple[float, float, float, float]] = [detection.bbox]
        self.trajectory: List[Tuple[float, float]] = [detection.center_xy]

    def update(self, detection: Detection, max_history: int) -> None:
        """Updates track state with a newly matched detection."""
        self.bbox = detection.bbox
        self.confidence = detection.confidence
        self.last_seen_utc = detection.timestamp_utc
        self.hits_count += 1
        self.lost_frames_count = 0
        self.age_frames += 1

        self.bbox_history.append(detection.bbox)
        if len(self.bbox_history) > max_history:
            self.bbox_history.pop(0)

        self.trajectory.append(detection.center_xy)
        if len(self.trajectory) > max_history:
            self.trajectory.pop(0)

    def mark_missed(self) -> None:
        """Marks track as missed in the current frame."""
        self.lost_frames_count += 1
        self.age_frames += 1

    def to_schema(self) -> Track:
        """Converts internal track state to public immutable Track schema."""
        return Track(
            track_id=self.track_id,
            camera_id=self.camera_id,
            class_id=self.class_id,
            class_name=self.class_name,
            confidence=self.confidence,
            current_bbox=self.bbox,
            bbox_history=list(self.bbox_history),
            trajectory=list(self.trajectory),
            state=self.state,
            first_seen_utc=self.first_seen_utc,
            last_seen_utc=self.last_seen_utc,
            hits_count=self.hits_count,
            lost_frames_count=self.lost_frames_count,
            age_frames=self.age_frames
        )


class MultiObjectTracker:
    """
    Production-grade multi-object tracker implementing ByteTrack matching principles.
    Associates high-confidence and low-confidence detections against track history.
    """

    def __init__(self, camera_id: str, config: Optional[TrackerConfig] = None):
        self.camera_id = camera_id
        self.config = config or TrackerConfig()
        self._next_track_id: int = 1
        self._tracks: Dict[int, InternalTrack] = {}

    def update(self, detections: List[Detection], timestamp_utc: Optional[float] = None) -> List[Track]:
        """
        Updates multi-object tracks with the latest frame's detections.
        Returns:
            List of all currently existing Tracks (NEW, ACTIVE, and LOST).
        """
        now_ts = timestamp_utc or time.time()
        
        # 1. Split detections into high-confidence and low-confidence pools (ByteTrack philosophy)
        high_dets: List[Detection] = []
        low_dets: List[Detection] = []
        for det in detections:
            if det.confidence >= self.config.track_high_thresh:
                high_dets.append(det)
            elif det.confidence >= self.config.track_low_thresh:
                low_dets.append(det)

        existing_track_ids = list(self._tracks.keys())
        unmatched_tracks = set(existing_track_ids)

        # 2. First Association: Match High-Confidence Detections with Existing Tracks
        matched_tracks_stage1, unmatched_high_dets = self._associate(
            track_ids=list(unmatched_tracks),
            detections=high_dets,
            iou_thresh=self.config.match_iou_thresh
        )

        for track_id, det in matched_tracks_stage1:
            self._tracks[track_id].update(det, self.config.max_history_length)
            unmatched_tracks.remove(track_id)

        # 3. Second Association: Match Low-Confidence Detections with Remaining Unmatched Tracks
        matched_tracks_stage2, _ = self._associate(
            track_ids=list(unmatched_tracks),
            detections=low_dets,
            iou_thresh=self.config.match_iou_thresh
        )

        for track_id, det in matched_tracks_stage2:
            self._tracks[track_id].update(det, self.config.max_history_length)
            unmatched_tracks.remove(track_id)

        # 4. Handle Unmatched Tracks (Mark Missed and apply state transitions)
        for track_id in unmatched_tracks:
            track = self._tracks[track_id]
            track.mark_missed()
            if track.state == TrackState.ACTIVE:
                track.state = TrackState.LOST
            elif track.state == TrackState.NEW:
                # Unconfirmed new tracks that are missed immediately are expired
                track.state = TrackState.EXPIRED

        # 5. Handle Unmatched High-Confidence Detections (Spawn New Tracks)
        for det in unmatched_high_dets:
            if det.confidence >= self.config.new_track_thresh:
                new_track = InternalTrack(
                    track_id=self._next_track_id,
                    camera_id=self.camera_id,
                    detection=det
                )
                self._tracks[self._next_track_id] = new_track
                self._next_track_id += 1

        # 6. Lifecycle Management: Promote NEW -> ACTIVE, Evict EXPIRED
        expired_ids = []
        for track_id, track in self._tracks.items():
            if track.state == TrackState.NEW:
                if track.hits_count >= self.config.min_hits_to_active:
                    track.state = TrackState.ACTIVE
            elif track.state == TrackState.LOST:
                if track.lost_frames_count == 0:
                    # Reacquired
                    track.state = TrackState.ACTIVE
                elif track.lost_frames_count > self.config.max_lost_frames:
                    track.state = TrackState.EXPIRED
                    expired_ids.append(track_id)
            elif track.state == TrackState.ACTIVE:
                if track.lost_frames_count > 0:
                    track.state = TrackState.LOST

        # Evict expired tracks from memory
        for track_id in expired_ids:
            del self._tracks[track_id]

        # Return snapshot schemas
        return [track.to_schema() for track in self._tracks.values()]

    def _associate(
        self,
        track_ids: List[int],
        detections: List[Detection],
        iou_thresh: float
    ) -> Tuple[List[Tuple[int, Detection]], List[Detection]]:
        """
        Greedy IoU bipartite matching between tracks and detections.
        Returns:
            (matched_pairs: list of (track_id, detection), unmatched_detections)
        """
        if not track_ids or not detections:
            return [], detections

        # Compute IoU cost matrix
        iou_matrix = np.zeros((len(track_ids), len(detections)), dtype=np.float32)
        for i, tid in enumerate(track_ids):
            track_box = self._tracks[tid].bbox
            for j, det in enumerate(detections):
                iou_matrix[i, j] = calculate_iou(track_box, det.bbox)

        matched_pairs: List[Tuple[int, Detection]] = []
        matched_track_indices = set()
        matched_det_indices = set()

        # Greedy match highest IoU pairs
        while True:
            max_iou = 0.0
            best_i, best_j = -1, -1
            for i in range(len(track_ids)):
                if i in matched_track_indices:
                    continue
                for j in range(len(detections)):
                    if j in matched_det_indices:
                        continue
                    if iou_matrix[i, j] > max_iou:
                        max_iou = iou_matrix[i, j]
                        best_i, best_j = i, j

            if max_iou >= iou_thresh and best_i >= 0 and best_j >= 0:
                matched_pairs.append((track_ids[best_i], detections[best_j]))
                matched_track_indices.add(best_i)
                matched_det_indices.add(best_j)
            else:
                break

        unmatched_detections = [
            det for j, det in enumerate(detections) if j not in matched_det_indices
        ]
        return matched_pairs, unmatched_detections

    def get_active_tracks(self) -> List[Track]:
        """Returns all confirmed active tracks."""
        return [
            t.to_schema() for t in self._tracks.values()
            if t.state == TrackState.ACTIVE
        ]

    def reset(self) -> None:
        """Clears all tracking state."""
        self._tracks.clear()
        self._next_track_id = 1
