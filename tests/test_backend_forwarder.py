"""
Test for Member 4 AI Subsystem to Central Backend Alert Forwarder.
Validates that AI pipeline events are captured and dispatched via HTTP POST to the backend.
"""

import json
import time
from unittest.mock import MagicMock, patch
import pytest

from ai_subsystem.adapters.backend_forwarder import BackendAlertForwarder, attach_backend_forwarder
from ai_subsystem.schemas import AIAlert, AlertLifecycleState, AlertSeverity


def test_backend_forwarder_payload_dispatch():
    forwarder = BackendAlertForwarder(backend_url="http://localhost:4000/api/alerts", timeout_sec=2.0)

    test_alert = AIAlert(
        alert_id="ALT-FWD-TEST-01",
        camera_id="CAM-MOSJE-01",
        institution_id="INST-DEL-01",
        alert_type="RESTRICTED_ZONE_BREACH",
        severity=AlertSeverity.CRITICAL,
        title="Restricted Zone Penetration",
        explanation="Presence detected in secured document room.",
        recommended_action="Dispatch security verification officer.",
        created_at_utc=time.time(),
        model_version="v1.0.0",
        config_version="cfg-2026.1"
    )

    with patch("requests.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.text = '{"success": true}'
        mock_post.return_value = mock_resp

        # Dispatch via event callback
        forwarder.handle_event({
            "type": "AI_ALERT_EVENT",
            "data": test_alert.model_dump()
        })

        time.sleep(0.3)  # Allow async thread to execute

        assert mock_post.called
        call_args = mock_post.call_args
        assert call_args[0][0] == "http://localhost:4000/api/alerts"
        payload = call_args[1]["json"]
        assert payload["alert_id"] == "ALT-FWD-TEST-01"
        assert payload["camera_id"] == "CAM-MOSJE-01"
        assert payload["severity"] == "CRITICAL"
        assert forwarder.forwarded_count >= 1


def test_attach_backend_forwarder():
    class MockPublisher:
        def __init__(self):
            self.subscribers = []
        def subscribe(self, cb):
            self.subscribers.append(cb)

    class MockOrchestrator:
        def __init__(self):
            self.event_publisher = MockPublisher()

    orch = MockOrchestrator()
    fwd = attach_backend_forwarder(orch, "http://localhost:4000/api/alerts")
    assert len(orch.event_publisher.subscribers) == 1
    assert fwd.backend_url == "http://localhost:4000/api/alerts"
