"""
Member 4 AI Subsystem REST API & Event Streaming Service.
Provides clean HTTP/JSON endpoints and Server-Sent Events (SSE) for
Member 1 (Backend/API) and Member 2/5 (Flutter Mobile App) integration.
Framework-agnostic implementation using Python's standard library.
"""

import json
import os
import queue
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlparse

from ai_subsystem.orchestrator import AIPipelineOrchestrator
from ai_subsystem.schemas import ReportedAttendance, ReviewOutcome
from ai_subsystem.utils.logger import logger


class Member4APIHandler(BaseHTTPRequestHandler):
    """
    HTTP Request Handler serving Member 4 AI Subsystem endpoints.
    Handles occupancy, anomalies, incidents, alerts, evidence verification,
    human review submissions, and SSE real-time streaming.
    """

    server_start_time: float = time.time()
    orchestrator: AIPipelineOrchestrator = None

    def _set_headers(
        self,
        status: HTTPStatus = HTTPStatus.OK,
        content_type: str = "application/json",
        extra_headers: Optional[Dict[str, str]] = None
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()

    def do_OPTIONS(self) -> None:
        """Handle CORS pre-flight requests."""
        self._set_headers(HTTPStatus.NO_CONTENT)

    def _send_json(self, data: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        """Serializes data to JSON and sends response."""
        body = json.dumps(data, indent=2).encode("utf-8")
        self._set_headers(status, "application/json")
        self.wfile.write(body)

    def _send_error(self, message: str, status: HTTPStatus = HTTPStatus.BAD_REQUEST) -> None:
        """Sends standardized JSON error."""
        self._send_json({"error": True, "message": message, "status": status.value}, status=status)

    def _read_json_body(self) -> Optional[Dict[str, Any]]:
        """Parses JSON request body."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                return {}
            raw_data = self.rfile.read(content_length)
            return json.loads(raw_data.decode("utf-8"))
        except Exception as e:
            logger.warning(f"Failed to parse request JSON: {e}")
            return None

    def log_message(self, format: str, *args: Any) -> None:
        """Directs HTTP server logs to standard subsystem logger."""
        logger.debug(f"[API Server] {self.address_string()} - " + format % args)

    # =========================================================================
    # GET Endpoints
    # =========================================================================
    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        path = parsed_url.path.rstrip("/")
        query = parse_qs(parsed_url.query)

        orch = self.orchestrator
        if orch is None:
            self._send_error("AI Subsystem Orchestrator not initialized", HTTPStatus.SERVICE_UNAVAILABLE)
            return

        # 1. Health / Status
        if path == "/api/v1/health":
            self._send_json({
                "status": "UP",
                "service": "Member 4 AI Intelligence Subsystem",
                "config_version": orch.config.config_version,
                "model_version": orch.config.model_version,
                "uptime_sec": round(time.time() - self.server_start_time, 2),
                "system_status": orch.get_system_status()
            })
            return

        # 2. Camera list & telemetry
        if path == "/api/v1/cameras":
            self._send_json({
                "count": len(orch.config.cameras),
                "cameras": [c.model_dump() for c in orch.config.cameras.values()],
                "telemetry": orch.get_system_status()["cameras"]
            })
            return

        # 3. Server-Sent Events (SSE) Real-Time Stream
        if path == "/api/v1/events/stream":
            self._handle_sse_stream()
            return

        # 4. Audit Log
        if path == "/api/v1/audit":
            if hasattr(orch.storage, "get_audit_log"):
                self._send_json(orch.storage.get_audit_log())
            else:
                self._send_json({"message": "Audit storage not supported"})
            return

        # 5. Dynamic Camera-Specific Routes: /api/v1/cameras/{id}/...
        parts = path.split("/")
        if len(parts) >= 5 and parts[1] == "api" and parts[2] == "v1" and parts[3] == "cameras":
            cam_id = parts[4]
            sub_resource = parts[5] if len(parts) > 5 else None

            if sub_resource == "occupancy":
                occ_analyzer = orch.get_occupancy_analyzer(cam_id)
                snapshot = occ_analyzer.get_occupancy_snapshot()
                self._send_json(snapshot.model_dump())
                return

            if sub_resource == "anomalies":
                anom_engine = orch.get_anomaly_engine(cam_id)
                self._send_json({
                    "camera_id": cam_id,
                    "anomalies": [a.model_dump() for a in anom_engine._recent_anomalies]
                })
                return

            if sub_resource == "incidents":
                inc_engine = orch.get_incident_engine(cam_id)
                self._send_json({
                    "camera_id": cam_id,
                    "active_incidents": [i.model_dump() for i in inc_engine._active_incidents.values()]
                })
                return

            if sub_resource == "alerts":
                alt_mgr = orch.get_alert_manager(cam_id)
                self._send_json({
                    "camera_id": cam_id,
                    "alerts": [a.model_dump() for a in alt_mgr.get_active_alerts()]
                })
                return

        # 6. Evidence Snapshot Binary Retrieval: /api/v1/evidence/{evidence_id}
        if len(parts) == 5 and parts[1] == "api" and parts[2] == "v1" and parts[3] == "evidence":
            evidence_id = parts[4]
            self._handle_get_evidence_image(evidence_id)
            return

        # 7. Evidence Integrity Verification: /api/v1/evidence/{evidence_id}/verify
        if len(parts) == 6 and parts[1] == "api" and parts[2] == "v1" and parts[3] == "evidence" and parts[5] == "verify":
            evidence_id = parts[4]
            self._handle_verify_evidence(evidence_id)
            return

        self._send_error(f"Endpoint '{path}' not found", HTTPStatus.NOT_FOUND)

    # =========================================================================
    # POST Endpoints
    # =========================================================================
    def do_POST(self) -> None:
        parsed_url = urlparse(self.path)
        path = parsed_url.path.rstrip("/")

        orch = self.orchestrator
        if orch is None:
            self._send_error("AI Subsystem Orchestrator not initialized", HTTPStatus.SERVICE_UNAVAILABLE)
            return

        body = self._read_json_body()
        if body is None:
            self._send_error("Invalid JSON body", HTTPStatus.BAD_REQUEST)
            return

        parts = path.split("/")

        # 1. Alert Lifecycle Transitions: /api/v1/alerts/{id}/[acknowledge | resolve | dismiss]
        if len(parts) == 6 and parts[1] == "api" and parts[2] == "v1" and parts[3] == "alerts":
            alert_id = parts[4]
            action = parts[5]

            cam_id = body.get("camera_id")
            if not cam_id:
                # Find camera holding this alert
                for cid in orch._alert_managers:
                    if alert_id in orch._alert_managers[cid]._alerts:
                        cam_id = cid
                        break

            if not cam_id or cam_id not in orch._alert_managers:
                self._send_error(f"Alert ID '{alert_id}' not found", HTTPStatus.NOT_FOUND)
                return

            alt_mgr = orch.get_alert_manager(cam_id)
            user_id = body.get("user_id", "supervisor_demo")
            notes = body.get("notes", "")

            if action == "acknowledge":
                res = alt_mgr.acknowledge_alert(alert_id, user_id=user_id, notes=notes)
                if res:
                    orch.storage.save_alert(res)
                    self._send_json(res.model_dump())
                else:
                    self._send_error(f"Could not acknowledge alert '{alert_id}'", HTTPStatus.BAD_REQUEST)
                return

            if action == "resolve":
                res = alt_mgr.resolve_alert(alert_id, user_id=user_id, notes=notes)
                if res:
                    orch.storage.save_alert(res)
                    self._send_json(res.model_dump())
                else:
                    self._send_error(f"Could not resolve alert '{alert_id}'", HTTPStatus.BAD_REQUEST)
                return

            if action == "dismiss":
                res = alt_mgr.dismiss_alert(alert_id, user_id=user_id, notes=notes)
                if res:
                    orch.storage.save_alert(res)
                    self._send_json(res.model_dump())
                else:
                    self._send_error(f"Could not dismiss alert '{alert_id}'", HTTPStatus.BAD_REQUEST)
                return

        # 2. Human Review Submission: /api/v1/reviews
        if path == "/api/v1/reviews":
            cam_id = body.get("camera_id")
            target_id = body.get("target_id")
            reviewer_id = body.get("reviewer_id", "supervisor_demo")
            outcome_str = body.get("outcome", "TRUE_EVENT")
            notes = body.get("notes", "")

            if not target_id or not cam_id:
                self._send_error("Missing 'camera_id' or 'target_id'", HTTPStatus.BAD_REQUEST)
                return

            try:
                outcome = ReviewOutcome(outcome_str)
            except ValueError:
                self._send_error(f"Invalid review outcome '{outcome_str}'", HTTPStatus.BAD_REQUEST)
                return

            evd_mgr = orch.get_evidence_manager(cam_id)
            review_rec = evd_mgr.submit_human_review(
                target_id=target_id,
                reviewer_id=reviewer_id,
                outcome=outcome,
                notes=notes
            )
            orch.storage.save_review_record(review_rec)
            self._send_json(review_rec.model_dump(), status=HTTPStatus.CREATED)
            return

        # 3. Attendance Registration: /api/v1/attendance
        if path == "/api/v1/attendance":
            try:
                attendance_record = ReportedAttendance(**body)
                orch.register_reported_attendance(attendance_record)
                self._send_json({
                    "success": True,
                    "message": "Reported attendance registered successfully",
                    "data": attendance_record.model_dump()
                }, status=HTTPStatus.CREATED)
            except Exception as e:
                self._send_error(f"Invalid attendance payload: {e}", HTTPStatus.BAD_REQUEST)
            return

        self._send_error(f"Endpoint '{path}' not found", HTTPStatus.NOT_FOUND)

    # =========================================================================
    # Internal Helpers (Evidence & SSE)
    # =========================================================================
    def _handle_get_evidence_image(self, evidence_id: str) -> None:
        """Streams evidence JPEG file securely from disk."""
        orch = self.orchestrator
        target_path = None

        for cid, em in orch._evidence_managers.items():
            if evidence_id in em._evidence_records:
                target_path = em._evidence_records[evidence_id].image_path
                break

        if not target_path or not os.path.exists(target_path):
            self._send_error(f"Evidence image '{evidence_id}' not found on disk", HTTPStatus.NOT_FOUND)
            return

        # Security check: Prevent path traversal
        norm_path = os.path.normpath(target_path)
        if ".." in norm_path:
            self._send_error("Access denied", HTTPStatus.FORBIDDEN)
            return

        try:
            with open(norm_path, "rb") as f:
                content = f.read()
            self._set_headers(HTTPStatus.OK, "image/jpeg", {"Content-Length": str(len(content))})
            self.wfile.write(content)
        except Exception as e:
            logger.error(f"Error serving evidence image {target_path}: {e}")
            self._send_error("Internal server error reading evidence", HTTPStatus.INTERNAL_SERVER_ERROR)

    def _handle_verify_evidence(self, evidence_id: str) -> None:
        """Executes SHA-256 cryptographic integrity verification."""
        orch = self.orchestrator
        for cid, em in orch._evidence_managers.items():
            if evidence_id in em._evidence_records:
                res = em.verify_evidence_integrity(evidence_id)
                self._send_json(res.model_dump())
                return

        self._send_error(f"Evidence ID '{evidence_id}' not found", HTTPStatus.NOT_FOUND)

    def _handle_sse_stream(self) -> None:
        """Streams real-time events via Server-Sent Events (SSE)."""
        orch = self.orchestrator
        if not hasattr(orch.publisher, "subscribe_queue"):
            self._send_error("SSE streaming not supported by current publisher", HTTPStatus.NOT_IMPLEMENTED)
            return

        q = orch.publisher.subscribe_queue()
        self._set_headers(
            HTTPStatus.OK,
            "text/event-stream",
            {
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )

        try:
            # Send initial connection confirmation
            init_payload = json.dumps({"type": "CONNECTION_ESTABLISHED", "time": time.time()})
            self.wfile.write(f"data: {init_payload}\n\n".encode("utf-8"))
            self.wfile.flush()

            while True:
                try:
                    event_data = q.get(timeout=1.0)
                    msg = f"data: {json.dumps(event_data)}\n\n"
                    self.wfile.write(msg.encode("utf-8"))
                    self.wfile.flush()
                except queue.Empty:
                    # Keep-alive comment
                    self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            orch.publisher.unsubscribe_queue(q)


class Member4APIService:
    """
    Manages the lifecycle of the Member 4 HTTP REST & SSE API Server.
    """

    def __init__(self, orchestrator: AIPipelineOrchestrator, host: str = "127.0.0.1", port: int = 8000):
        self.orchestrator = orchestrator
        self.host = host
        self.port = port
        self.server: Optional[ThreadingHTTPServer] = None
        self._thread = None

    def start(self, blocking: bool = False) -> None:
        """Starts the API server."""
        Member4APIHandler.orchestrator = self.orchestrator
        Member4APIHandler.server_start_time = time.time()
        self.server = ThreadingHTTPServer((self.host, self.port), Member4APIHandler)
        logger.info(f"Member 4 REST API & SSE Server listening at http://{self.host}:{self.port}")

        # Automatically connect AI alert publisher to Central Backend API (Port 4000)
        try:
            from ai_subsystem.adapters.backend_forwarder import attach_backend_forwarder
            backend_url = os.getenv("CENTRAL_BACKEND_URL", "http://localhost:4000/api/alerts")
            attach_backend_forwarder(self.orchestrator, backend_url)
        except Exception as e:
            logger.warning(f"Could not attach backend forwarder: {e}")

        if blocking:
            try:
                self.server.serve_forever()
            except KeyboardInterrupt:
                self.stop()
        else:
            import threading
            self._thread = threading.Thread(target=self.server.serve_forever, daemon=True)
            self._thread.start()

    def stop(self) -> None:
        """Gracefully shuts down the API server."""
        if self.server:
            logger.info("Stopping Member 4 API Server...")
            self.server.shutdown()
            self.server.server_close()
            self.server = None
