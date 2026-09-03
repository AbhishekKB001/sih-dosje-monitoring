"""
Unit tests for ByteTrack MultiObjectTracker and Track Lifecycle.
"""

import pytest
from ai_subsystem.config import TrackerConfig
from ai_subsystem.schemas import Detection, TrackState
from ai_subsystem.vision.tracker import MultiObjectTracker, calculate_iou


def make_det(
    bbox: tuple[float, float, float, float],
    confidence: float = 0.85,
    class_name: str = "person",
    frame_index: int = 1,
    timestamp: float = 100.0
) -> Detection:
    return Detection(
        camera_id="CAM-TRK",
        frame_index=frame_index,
        timestamp_utc=timestamp,
        class_id=0,
        class_name=class_name,
        confidence=confidence,
        bbox=bbox
    )


def test_iou_calculation():
    box1 = (0.0, 0.0, 10.0, 10.0)    # Area = 100
    box2 = (5.0, 0.0, 15.0, 10.0)    # Area = 100, Inter = 5*10 = 50, Union = 150 -> IoU = 1/3 ~ 0.333
    box3 = (20.0, 20.0, 30.0, 30.0)  # No overlap -> IoU = 0.0

    iou12 = calculate_iou(box1, box2)
    iou13 = calculate_iou(box1, box3)

    assert abs(iou12 - 0.3333) < 0.01
    assert iou13 == 0.0


def test_tracker_lifecycle_new_to_active():
    cfg = TrackerConfig(min_hits_to_active=2, track_high_thresh=0.5, new_track_thresh=0.4)
    tracker = MultiObjectTracker(camera_id="CAM-TRK", config=cfg)

    # Frame 1: Detection creates NEW track
    det1 = make_det(bbox=(100.0, 100.0, 150.0, 200.0), frame_index=1, timestamp=100.0)
    tracks_f1 = tracker.update([det1], timestamp_utc=100.0)

    assert len(tracks_f1) == 1
    assert tracks_f1[0].track_id == 1
    assert tracks_f1[0].state == TrackState.NEW
    assert tracks_f1[0].hits_count == 1

    # Frame 2: Matched detection promotes track to ACTIVE
    det2 = make_det(bbox=(102.0, 101.0, 152.0, 201.0), frame_index=2, timestamp=100.1)
    tracks_f2 = tracker.update([det2], timestamp_utc=100.1)

    assert len(tracks_f2) == 1
    assert tracks_f2[0].track_id == 1
    assert tracks_f2[0].state == TrackState.ACTIVE
    assert tracks_f2[0].hits_count == 2
    assert tracks_f2[0].lost_frames_count == 0


def test_tracker_lifecycle_lost_recovery_and_expiration():
    cfg = TrackerConfig(min_hits_to_active=1, max_lost_frames=3, track_high_thresh=0.5)
    tracker = MultiObjectTracker(camera_id="CAM-TRK", config=cfg)

    # Frame 1: Initial detection -> immediately ACTIVE (min_hits_to_active=1)
    det1 = make_det(bbox=(50.0, 50.0, 100.0, 100.0), frame_index=1, timestamp=1.0)
    tracks = tracker.update([det1], timestamp_utc=1.0)
    assert tracks[0].state == TrackState.ACTIVE

    # Frame 2: Missing detection -> transitions to LOST
    tracks = tracker.update([], timestamp_utc=1.1)
    assert len(tracks) == 1
    assert tracks[0].state == TrackState.LOST
    assert tracks[0].lost_frames_count == 1

    # Frame 3: Missing detection -> remains LOST (lost count = 2)
    tracks = tracker.update([], timestamp_utc=1.2)
    assert tracks[0].state == TrackState.LOST
    assert tracks[0].lost_frames_count == 2

    # Frame 4: Reacquired matching detection -> recovers to ACTIVE!
    det_reacquire = make_det(bbox=(52.0, 51.0, 102.0, 101.0), frame_index=4, timestamp=1.3)
    tracks = tracker.update([det_reacquire], timestamp_utc=1.3)
    assert len(tracks) == 1
    assert tracks[0].track_id == 1
    assert tracks[0].state == TrackState.ACTIVE
    assert tracks[0].lost_frames_count == 0

    # Frames 5, 6, 7, 8: 4 consecutive missed frames (exceeds max_lost_frames=3) -> EXPIRED
    tracker.update([], timestamp_utc=1.4)  # lost = 1
    tracker.update([], timestamp_utc=1.5)  # lost = 2
    tracker.update([], timestamp_utc=1.6)  # lost = 3
    tracks = tracker.update([], timestamp_utc=1.7)  # lost = 4 -> evicted

    assert len(tracks) == 0  # Evicted from memory


def test_multiple_simultaneous_tracks():
    cfg = TrackerConfig(min_hits_to_active=1)
    tracker = MultiObjectTracker(camera_id="CAM-TRK", config=cfg)

    # Frame 1: Two separate people at different locations
    det_person1 = make_det(bbox=(10.0, 10.0, 60.0, 120.0), frame_index=1)
    det_person2 = make_det(bbox=(300.0, 10.0, 350.0, 120.0), frame_index=1)

    tracks_f1 = tracker.update([det_person1, det_person2])
    assert len(tracks_f1) == 2
    tids = {t.track_id for t in tracks_f1}
    assert len(tids) == 2  # Distinct IDs: 1 and 2

    # Frame 2: Both move slightly
    det_person1_moved = make_det(bbox=(12.0, 12.0, 62.0, 122.0), frame_index=2)
    det_person2_moved = make_det(bbox=(303.0, 11.0, 353.0, 121.0), frame_index=2)

    tracks_f2 = tracker.update([det_person1_moved, det_person2_moved])
    assert len(tracks_f2) == 2
    assert {t.track_id for t in tracks_f2} == tids  # Same persistent IDs maintained!
