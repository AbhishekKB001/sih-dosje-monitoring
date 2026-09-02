"""
AI Pipeline Orchestrator for Member 4 AI Subsystem.
Central coordinator routing frames through visual health, preprocessing, detection, tracking, rules, and alerting.
"""

from typing import Any, Dict, List, Optional
from ai_subsystem.adapters.event_publisher import BaseEventPublisher, InMemoryEventPublisher
from ai_subsystem.adapters.storage_adapter import BaseStorageAdapter, LocalStorageAdapter
from ai_subsystem.analytics.spatial import LineCrossingEngine, PolygonZoneEngine
from ai_subsystem.analytics.temporal import TemporalEngine
from ai_subsystem.analytics.occupancy import OccupancyAnalyzer, CrowdAnalyticsEngine
from ai_subsystem.analytics.attendance import AttendanceConsistencyEngine
from ai_subsystem.analytics.anomaly import AnomalyEngine
from ai_subsystem.analytics.incident import IncidentCorrelationEngine
from ai_subsystem.analytics.alerts import AIAlertManager
from ai_subsystem.analytics.evidence import EvidenceManager
from ai_subsystem.config import (
    AIConfig,
    SingleCameraConfig,
    SourceType,
    SpatialConfig,
)
from ai_subsystem.manager.source_manager import SourceManager
from ai_subsystem.observability.metrics import MetricsCollector
from ai_subsystem.schemas import (
    AIAlert,
    AIAnomaly,
    AIIncident,
    AfterHoursEvent,
    AttendanceDiscrepancyEvent,
    CrowdThresholdEvent,
    Detection,
    EvidenceRecord,
    FramePayload,
    LoiteringEvent,
    ReportedAttendance,
    StreamEvent,
    Track,
    TrackState,
    VisualHealthResult,
    VisualHealthState,
    LineCrossingEvent,
    ZoneTransition,
)
from ai_subsystem.utils.logger import logger
from ai_subsystem.vision.detector import BaseObjectDetector, YOLOv8Detector
from ai_subsystem.vision.preprocessor import OpenCVPreprocessor
from ai_subsystem.vision.tracker import MultiObjectTracker


class AIPipelineOrchestrator:
    """
    Master pipeline coordinator.
    Routes frames through: Ingestion -> Visual Health -> YOLOv8 Detection -> ByteTrack Tracking
    -> Spatial Polygon & Line Analytics -> Temporal Loitering & After-Hours Intelligence
    -> Occupancy & Crowd Analytics -> Non-Biometric Attendance Consistency Evaluation
    -> Anomaly Detection -> Multi-Signal Incident Correlation -> AI Alerts -> Sealed Evidence Snapshots.
    """

    def __init__(
        self,
        config: Optional[AIConfig] = None,
        detector: Optional[BaseObjectDetector] = None,
        storage_adapter: Optional[BaseStorageAdapter] = None,
        event_publisher: Optional[BaseEventPublisher] = None,
    ):
        self.config = config or AIConfig()
        self.storage = storage_adapter or LocalStorageAdapter()
        self.publisher = event_publisher or InMemoryEventPublisher()
        
        self.metrics = MetricsCollector(
            config_version=self.config.config_version,
            model_version=self.config.model_version
        )
        self.preprocessor = OpenCVPreprocessor()

        # Initialize detector (YOLOv8 by default, or injected detector for tests)
        self.detector = detector or YOLOv8Detector(config=self.config.detector)

        # Per-camera isolated analytics engines
        self._trackers: Dict[str, MultiObjectTracker] = {}
        self._zone_engines: Dict[str, PolygonZoneEngine] = {}
        self._line_engines: Dict[str, LineCrossingEngine] = {}
        self._temporal_engines: Dict[str, TemporalEngine] = {}
        self._occupancy_analyzers: Dict[str, OccupancyAnalyzer] = {}
        self._crowd_engines: Dict[str, CrowdAnalyticsEngine] = {}
        self._attendance_engines: Dict[str, AttendanceConsistencyEngine] = {}
        self._anomaly_engines: Dict[str, AnomalyEngine] = {}
        self._incident_engines: Dict[str, IncidentCorrelationEngine] = {}
        self._alert_managers: Dict[str, AIAlertManager] = {}
        self._evidence_managers: Dict[str, EvidenceManager] = {}

        # Initialize multi-camera source manager
        self.source_manager = SourceManager(
            metrics_collector=self.metrics,
            frame_handler=self.process_frame,
            event_handler=self.handle_stream_event
        )

        logger.info(
            f"AIPipelineOrchestrator initialized (config: {self.config.config_version}, "
            f"model: {self.config.model_version}, detector: {self.config.detector.model_name})"
        )

    def register_camera(self, camera_cfg: SingleCameraConfig) -> None:
        """Registers and prepares a camera and its dedicated spatial/temporal/occupancy engines."""
        self.config.add_camera(camera_cfg)
        self.source_manager.add_camera(camera_cfg)
        cid = camera_cfg.camera_id

        # Initialize Tracker
        self._trackers[cid] = MultiObjectTracker(
            camera_id=cid,
            config=self.config.tracker
        )

        # Initialize Spatial & Temporal Engines
        self._zone_engines[cid] = PolygonZoneEngine(camera_id=cid, config=camera_cfg.spatial)
        self._line_engines[cid] = LineCrossingEngine(camera_id=cid, config=camera_cfg.spatial)

        # Match schedule if configured
        matched_sched = None
        if camera_cfg.schedule_id:
            for s in self.config.temporal.schedules:
                if s.schedule_id == camera_cfg.schedule_id:
                    matched_sched = s
                    break

        self._temporal_engines[cid] = TemporalEngine(
            camera_id=cid,
            config=self.config.temporal,
            schedule=matched_sched
        )

        # Initialize Occupancy & Attendance Engines
        self._occupancy_analyzers[cid] = OccupancyAnalyzer(camera_id=cid, config=camera_cfg.occupancy)
        self._crowd_engines[cid] = CrowdAnalyticsEngine(camera_id=cid, config=camera_cfg.occupancy)
        self._attendance_engines[cid] = AttendanceConsistencyEngine(
            camera_id=cid,
            config=camera_cfg.attendance,
            config_version=self.config.config_version,
            model_version=self.config.model_version
        )

        # Initialize Phase 5 Anomaly, Incident, Alert & Evidence Engines
        self._anomaly_engines[cid] = AnomalyEngine(
            camera_id=cid,
            institution_id=camera_cfg.institution_id,
            config=camera_cfg.anomaly,
            config_version=self.config.config_version,
            model_version=self.config.model_version
        )
        self._incident_engines[cid] = IncidentCorrelationEngine(
            camera_id=cid,
            institution_id=camera_cfg.institution_id,
            config=camera_cfg.incident,
            config_version=self.config.config_version,
            model_version=self.config.model_version
        )
        self._alert_managers[cid] = AIAlertManager(
            camera_id=cid,
            institution_id=camera_cfg.institution_id,
            config=camera_cfg.alert,
            config_version=self.config.config_version,
            model_version=self.config.model_version
        )
        self._evidence_managers[cid] = EvidenceManager(
            camera_id=cid,
            institution_id=camera_cfg.institution_id,
            config=camera_cfg.evidence,
            config_version=self.config.config_version,
            model_version=self.config.model_version
        )

    def get_tracker(self, camera_id: str) -> MultiObjectTracker:
        """Retrieves or creates the isolated tracker for a specific camera."""
        if camera_id not in self._trackers:
            self._trackers[camera_id] = MultiObjectTracker(
                camera_id=camera_id,
                config=self.config.tracker
            )
        return self._trackers[camera_id]

    def get_zone_engine(self, camera_id: str) -> PolygonZoneEngine:
        """Retrieves or creates the isolated zone engine for a specific camera."""
        if camera_id not in self._zone_engines:
            cam_cfg = self.config.get_camera(camera_id)
            spatial_cfg = cam_cfg.spatial if cam_cfg else self.config.spatial
            self._zone_engines[camera_id] = PolygonZoneEngine(camera_id=camera_id, config=spatial_cfg)
        return self._zone_engines[camera_id]

    def get_line_engine(self, camera_id: str) -> LineCrossingEngine:
        """Retrieves or creates the isolated line engine for a specific camera."""
        if camera_id not in self._line_engines:
            cam_cfg = self.config.get_camera(camera_id)
            spatial_cfg = cam_cfg.spatial if cam_cfg else self.config.spatial
            self._line_engines[camera_id] = LineCrossingEngine(camera_id=camera_id, config=spatial_cfg)
        return self._line_engines[camera_id]

    def get_temporal_engine(self, camera_id: str) -> TemporalEngine:
        """Retrieves or creates the isolated temporal engine for a specific camera."""
        if camera_id not in self._temporal_engines:
            self._temporal_engines[camera_id] = TemporalEngine(camera_id=camera_id, config=self.config.temporal)
        return self._temporal_engines[camera_id]

    def get_occupancy_analyzer(self, camera_id: str) -> OccupancyAnalyzer:
        """Retrieves or creates the isolated occupancy analyzer for a specific camera."""
        if camera_id not in self._occupancy_analyzers:
            cam_cfg = self.config.get_camera(camera_id)
            occ_cfg = cam_cfg.occupancy if cam_cfg else self.config.occupancy
            self._occupancy_analyzers[camera_id] = OccupancyAnalyzer(camera_id=camera_id, config=occ_cfg)
        return self._occupancy_analyzers[camera_id]

    def get_crowd_engine(self, camera_id: str) -> CrowdAnalyticsEngine:
        """Retrieves or creates the isolated crowd analytics engine for a specific camera."""
        if camera_id not in self._crowd_engines:
            cam_cfg = self.config.get_camera(camera_id)
            occ_cfg = cam_cfg.occupancy if cam_cfg else self.config.occupancy
            self._crowd_engines[camera_id] = CrowdAnalyticsEngine(camera_id=camera_id, config=occ_cfg)
        return self._crowd_engines[camera_id]

    def get_attendance_engine(self, camera_id: str) -> AttendanceConsistencyEngine:
        """Retrieves or creates the isolated attendance consistency engine for a specific camera."""
        if camera_id not in self._attendance_engines:
            cam_cfg = self.config.get_camera(camera_id)
            att_cfg = cam_cfg.attendance if cam_cfg else self.config.attendance
            self._attendance_engines[camera_id] = AttendanceConsistencyEngine(
                camera_id=camera_id,
                config=att_cfg,
                config_version=self.config.config_version,
                model_version=self.config.model_version
            )
        return self._attendance_engines[camera_id]

    def register_reported_attendance(self, record: ReportedAttendance) -> None:
        """Registers a reported attendance record for a specific camera or globally."""
        if record.camera_id:
            engine = self.get_attendance_engine(record.camera_id)
            engine.register_reported_attendance(record)
        else:
            for cid in self.config.cameras.keys():
                engine = self.get_attendance_engine(cid)
                engine.register_reported_attendance(record)

    def get_anomaly_engine(self, camera_id: str) -> AnomalyEngine:
        """Retrieves or creates the isolated anomaly engine for a specific camera."""
        if camera_id not in self._anomaly_engines:
            cam_cfg = self.config.get_camera(camera_id)
            anom_cfg = cam_cfg.anomaly if cam_cfg else self.config.anomaly
            inst_id = cam_cfg.institution_id if cam_cfg else None
            self._anomaly_engines[camera_id] = AnomalyEngine(
                camera_id=camera_id,
                institution_id=inst_id,
                config=anom_cfg,
                config_version=self.config.config_version,
                model_version=self.config.model_version
            )
        return self._anomaly_engines[camera_id]

    def get_incident_engine(self, camera_id: str) -> IncidentCorrelationEngine:
        """Retrieves or creates the isolated incident correlation engine for a specific camera."""
        if camera_id not in self._incident_engines:
            cam_cfg = self.config.get_camera(camera_id)
            inc_cfg = cam_cfg.incident if cam_cfg else self.config.incident
            inst_id = cam_cfg.institution_id if cam_cfg else None
            self._incident_engines[camera_id] = IncidentCorrelationEngine(
                camera_id=camera_id,
                institution_id=inst_id,
                config=inc_cfg,
                config_version=self.config.config_version,
                model_version=self.config.model_version
            )
        return self._incident_engines[camera_id]

    def get_alert_manager(self, camera_id: str) -> AIAlertManager:
        """Retrieves or creates the isolated alert manager for a specific camera."""
        if camera_id not in self._alert_managers:
            cam_cfg = self.config.get_camera(camera_id)
            alt_cfg = cam_cfg.alert if cam_cfg else self.config.alert
            inst_id = cam_cfg.institution_id if cam_cfg else None
            self._alert_managers[camera_id] = AIAlertManager(
                camera_id=camera_id,
                institution_id=inst_id,
                config=alt_cfg,
                config_version=self.config.config_version,
                model_version=self.config.model_version
            )
        return self._alert_managers[camera_id]

    def get_evidence_manager(self, camera_id: str) -> EvidenceManager:
        """Retrieves or creates the isolated evidence manager for a specific camera."""
        if camera_id not in self._evidence_managers:
            cam_cfg = self.config.get_camera(camera_id)
            evd_cfg = cam_cfg.evidence if cam_cfg else self.config.evidence
            inst_id = cam_cfg.institution_id if cam_cfg else None
            self._evidence_managers[camera_id] = EvidenceManager(
                camera_id=camera_id,
                institution_id=inst_id,
                config=evd_cfg,
                config_version=self.config.config_version,
                model_version=self.config.model_version
            )
        return self._evidence_managers[camera_id]

    def start(self) -> None:
        """Starts stream ingestion across all configured cameras."""
        logger.info("Starting AIPipelineOrchestrator...")
        if self.config.detector.enabled and not self.detector.is_loaded:
            self.detector.load_model()
        self.source_manager.start_all()

    def stop(self) -> None:
        """Gracefully stops all workers and releases resources."""
        logger.info("Stopping AIPipelineOrchestrator...")
        self.source_manager.stop_all()

    def process_frame(self, frame_payload: FramePayload, health_result: VisualHealthResult) -> Dict[str, Any]:
        """
        Main execution pipeline for a sampled frame.
        Coordinates: Ingestion -> Visual Health -> Preprocessing -> Detection -> Tracking
        -> Spatial Polygon Zones -> Virtual Line Crossing -> Temporal Loitering & After-Hours
        -> Occupancy & Crowd Analytics -> Non-Biometric Attendance Consistency Evaluation.
        """
        camera_id = frame_payload.camera_id
        
        # 1. Validation & Preprocessing
        if not self.preprocessor.validate_frame(frame_payload):
            logger.warning(f"[{camera_id}] Frame validation failed (corrupt or empty)")
            return {"status": "INVALID_FRAME", "camera_id": camera_id}

        # 2. Visual Content Health Gate
        if not health_result.is_healthy:
            self.metrics.update_health_state(camera_id, health_result.state)
            return {
                "status": "VISUAL_DEGRADATION",
                "camera_id": camera_id,
                "health_state": health_result.state.value,
                "reason": health_result.fault_reason,
                "detections": [],
                "active_tracks": [],
                "zone_events": [],
                "line_events": [],
                "loitering_events": [],
                "after_hours_events": [],
                "occupancy": None,
                "zone_occupancy": [],
                "crowd_events": [],
                "attendance_events": [],
                "anomalies": [],
                "incidents": [],
                "alerts": [],
                "evidence": []
            }

        # 3. Object Detection (YOLOv8)
        detections: List[Detection] = []
        if self.config.detector.enabled:
            detections = self.detector.detect(frame_payload)

        # 4. Multi-Object Tracking (ByteTrack)
        tracks: List[Track] = []
        active_tracks: List[Track] = []
        if self.config.tracker.enabled:
            tracker = self.get_tracker(camera_id)
            tracks = tracker.update(detections, frame_payload.timestamp_utc)
            active_tracks = [t for t in tracks if t.state == TrackState.ACTIVE]

        # 5. Spatial Analytics: Polygon Zones & Line Crossing
        zone_events: List[ZoneTransition] = []
        line_events: List[LineCrossingEvent] = []
        zone_engine = self.get_zone_engine(camera_id)
        line_engine = self.get_line_engine(camera_id)
        
        if active_tracks:
            zone_events = zone_engine.update(active_tracks, frame_payload.timestamp_utc)
            line_events = line_engine.update(active_tracks, frame_payload.timestamp_utc)

        # 6. Temporal Analytics: Dwell Time, Loitering & After-Hours
        loitering_events: List[LoiteringEvent] = []
        after_hours_events: List[AfterHoursEvent] = []
        temporal_engine = self.get_temporal_engine(camera_id)

        if active_tracks:
            loitering_events, after_hours_events = temporal_engine.update(
                tracks=active_tracks,
                zone_engine=zone_engine,
                timestamp_utc=frame_payload.timestamp_utc
            )

        # 7. Occupancy & Crowd Analytics
        occupancy_analyzer = self.get_occupancy_analyzer(camera_id)
        camera_snapshot, zone_snapshots = occupancy_analyzer.update(
            tracks=active_tracks,
            zone_engine=zone_engine,
            timestamp_utc=frame_payload.timestamp_utc
        )

        crowd_engine = self.get_crowd_engine(camera_id)
        crowd_events = crowd_engine.evaluate(
            camera_snapshot=camera_snapshot,
            zone_snapshots=zone_snapshots,
            zones_map=zone_engine.get_zones(),
            timestamp_utc=frame_payload.timestamp_utc
        )

        # 8. Non-Biometric Attendance Consistency Evaluation
        attendance_events: List[AttendanceDiscrepancyEvent] = []
        attendance_engine = self.get_attendance_engine(camera_id)
        discrepancy_event = attendance_engine.evaluate_consistency(
            occupancy_snapshot=camera_snapshot,
            timestamp_utc=frame_payload.timestamp_utc
        )
        if discrepancy_event:
            attendance_events.append(discrepancy_event)

        for z_snap in zone_snapshots:
            z_disc = attendance_engine.evaluate_consistency(
                occupancy_snapshot=z_snap,
                timestamp_utc=frame_payload.timestamp_utc
            )
            if z_disc:
                attendance_events.append(z_disc)

        # 9. Phase 5: Anomaly Detection Engine
        anomaly_engine = self.get_anomaly_engine(camera_id)
        anomalies = anomaly_engine.evaluate_signals(
            zone_transitions=zone_events,
            loitering_events=loitering_events,
            after_hours_events=after_hours_events,
            crowd_events=crowd_events,
            attendance_events=attendance_events,
            health_result=health_result,
            timestamp_utc=frame_payload.timestamp_utc
        )

        # 10. Multi-Signal Incident Correlation
        incident_engine = self.get_incident_engine(camera_id)
        incidents = incident_engine.process_anomalies(
            new_anomalies=anomalies,
            timestamp_utc=frame_payload.timestamp_utc
        )

        # 11. Actionable AI Alert Management
        alert_manager = self.get_alert_manager(camera_id)
        generated_alerts: List[AIAlert] = []
        for inc in incidents:
            alt = alert_manager.create_alert_from_incident(inc, timestamp_utc=frame_payload.timestamp_utc)
            if alt:
                generated_alerts.append(alt)

        for anom in anomalies:
            alt = alert_manager.create_alert_from_anomaly(anom, timestamp_utc=frame_payload.timestamp_utc)
            if alt:
                generated_alerts.append(alt)

        # 12. Visual Evidence Capture & Cryptographic Sealing
        evidence_manager = self.get_evidence_manager(camera_id)
        evidence_records: List[EvidenceRecord] = []
        for alt in generated_alerts:
            evd = evidence_manager.capture_evidence(
                frame_bgr=frame_payload.frame_bgr,
                source_event_id=alt.alert_id,
                event_type=alt.alert_type,
                explanation=alt.explanation,
                incident_id=alt.incident_id,
                zone_id=alt.zone_id,
                timestamp_utc=frame_payload.timestamp_utc
            )
            if evd:
                alt.evidence_snapshot_id = evd.evidence_id
                evidence_records.append(evd)
                self.storage.save_evidence_record(evd)

        # Publish and Persist Phase 5 Intelligence Signals
        for anom in anomalies:
            self.publisher.publish_anomaly(anom)
            self.storage.save_anomaly(anom)

        for inc in incidents:
            self.publisher.publish_incident(inc)
            self.storage.save_incident(inc)

        for alt in generated_alerts:
            self.publisher.publish_alert(alt)
            self.storage.save_alert(alt)

        # 13. Record Telemetry & Metrics
        self.metrics.record_inference_metrics(
            camera_id=camera_id,
            latency_ms=self.detector.last_inference_latency_ms,
            detection_count=len(detections),
            active_tracks_count=len(active_tracks)
        )

        # Update metrics & publish real-time telemetry
        cam_metrics = self.metrics.get_camera_metrics(camera_id)
        if cam_metrics:
            self.publisher.publish_telemetry(cam_metrics)

        return {
            "status": "PROCESSED",
            "camera_id": camera_id,
            "frame_index": frame_payload.frame_index,
            "visual_health": health_result.state.value,
            "detections": [d.model_dump() for d in detections],
            "active_tracks": [t.model_dump() for t in active_tracks],
            "active_tracks_count": len(active_tracks),
            "zone_events": [e.model_dump() for e in zone_events],
            "line_events": [e.model_dump() for e in line_events],
            "loitering_events": [e.model_dump() for e in loitering_events],
            "after_hours_events": [e.model_dump() for e in after_hours_events],
            "occupancy": camera_snapshot.model_dump(),
            "zone_occupancy": [s.model_dump() for s in zone_snapshots],
            "crowd_events": [e.model_dump() for e in crowd_events],
            "attendance_events": [e.model_dump() for e in attendance_events],
            "anomalies": [a.model_dump() for a in anomalies],
            "incidents": [i.model_dump() for i in incidents],
            "alerts": [al.model_dump() for al in generated_alerts],
            "evidence": [e.model_dump() for e in evidence_records],
            "inference_latency_ms": self.detector.last_inference_latency_ms
        }

    def handle_stream_event(self, event: StreamEvent) -> None:
        """Handles stream lifecycle and health events."""
        self.storage.save_health_event(event)
        self.publisher.publish_health_event(event)

    def get_system_status(self) -> Dict[str, Any]:
        """Returns overall subsystem health and active camera states."""
        return {
            "summary": self.metrics.get_system_summary(),
            "cameras": {
                cid: m.model_dump()
                for cid, m in self.metrics.get_all_metrics().items()
            }
        }
