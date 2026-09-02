"""
Video sources package for Member 4 AI Subsystem.
"""

from ai_subsystem.sources.base import BaseVideoSource
from ai_subsystem.sources.demo_source import DemoVideoSource
from ai_subsystem.sources.webcam_source import WebcamVideoSource
from ai_subsystem.sources.rtsp_source import RTSPVideoSource
from ai_subsystem.sources.member3_adapter import Member3VideoSourceAdapter

__all__ = [
    "BaseVideoSource",
    "DemoVideoSource",
    "WebcamVideoSource",
    "RTSPVideoSource",
    "Member3VideoSourceAdapter",
]
