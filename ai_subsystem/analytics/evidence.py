"""
KANAKA CHALA — Member 4 AI Subsystem
Evidence Capture, Cryptographic Integrity & Human Review Engine

Generates visual evidence frame snapshots for significant AI events, seals them
with SHA-256 integrity digests to verify against post-creation tampering, and
provides a structured repository for human supervisor auditing and false-positive tracking.
"""

import hashlib
import os
import time
from typing import Dict, List, Optional
import uuid
import cv2
import numpy as np

from ai_subsystem.config import EvidenceConfig
from ai_subsystem.schemas import (
    EvidenceRecord,
    EvidenceVerificationResult,
    HumanReviewRecord,
    ReviewOutcome,
)
from ai_subsystem.utils.logger import logger


class EvidenceManager:
    """
    Manages visual evidence snapshot generation, cryptographic SHA-256 hashing,
    tamper detection, and human supervisor audit reviews.
    """

    def __init__(
        self,
        camera_id: str,
        institution_id: Optional[str] = None,
        config: Optional[EvidenceConfig] = None,
        config_version: str = "cfg-2026.1",
        model_version: str = "v1.0.0"
    ):
        self.camera_id = camera_id
        self.institution_id = institution_id
        self.config = config or EvidenceConfig()
        self.config_version = config_version
        self.model_version = model_version

        # Evidence registry: evidence_id -> EvidenceRecord
        self._evidence_records: Dict[str, EvidenceRecord] = {}

        # Human reviews: review_id -> HumanReviewRecord
        self._reviews: Dict[str, HumanReviewRecord] = {}

        # Ensure evidence directory exists
        os.makedirs(self.config.storage_dir, exist_ok=True)

    @staticmethod
    def compute_sha256_hash(file_path: str) -> str:
        """Computes genuine SHA-256 digest over the binary file content."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def capture_evidence(
        self,
        frame_bgr: np.ndarray,
        source_event_id: str,
        event_type: str,
        explanation: str,
        incident_id: Optional[str] = None,
        zone_id: Optional[str] = None,
        timestamp_utc: Optional[float] = None
    ) -> Optional[EvidenceRecord]:
        """
        Saves visual frame to disk, computes SHA-256 digest, and returns EvidenceRecord.
        """
        if not self.config.enabled or frame_bgr is None or frame_bgr.size == 0:
            return None

        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        evidence_id = f"EVD-{uuid.uuid4().hex[:8]}"
        filename = f"{evidence_id}_{self.camera_id}.jpg"
        file_path = os.path.join(self.config.storage_dir, filename)

        # Write frame to disk
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), self.config.jpeg_quality]
        success = cv2.imwrite(file_path, frame_bgr, encode_params)
        if not success:
            logger.error(f"[{self.camera_id}] Failed to save evidence frame to '{file_path}'")
            return None

        # Compute SHA-256 digest of saved file
        sha256_digest = self.compute_sha256_hash(file_path)
        file_size = os.path.getsize(file_path)

        record = EvidenceRecord(
            evidence_id=evidence_id,
            camera_id=self.camera_id,
            institution_id=self.institution_id,
            timestamp_utc=now_ts,
            source_event_id=source_event_id,
            incident_id=incident_id,
            zone_id=zone_id,
            image_path=file_path,
            file_size_bytes=file_size,
            hash_algorithm="SHA-256",
            sha256_hash=sha256_digest,
            event_type=event_type,
            explanation=explanation,
            config_version=self.config_version,
            model_version=self.model_version
        )

        self._evidence_records[evidence_id] = record
        logger.info(
            f"[{self.camera_id}] Evidence snapshot '{evidence_id}' captured & sealed. "
            f"SHA-256: {sha256_digest[:16]}... ({file_size} bytes)"
        )
        return record

    def verify_evidence_integrity(self, evidence_id: str) -> EvidenceVerificationResult:
        """
        Verifies whether an on-disk evidence image matches its recorded SHA-256 hash.
        Detects file modification, deletion, or bit-flip corruption.
        """
        now_ts = time.time()
        record = self._evidence_records.get(evidence_id)
        if not record:
            return EvidenceVerificationResult(
                evidence_id=evidence_id,
                is_valid=False,
                recorded_hash="",
                computed_hash="",
                explanation="Evidence record not found in system registry.",
                verified_at_utc=now_ts
            )

        if not os.path.exists(record.image_path):
            return EvidenceVerificationResult(
                evidence_id=evidence_id,
                is_valid=False,
                recorded_hash=record.sha256_hash,
                computed_hash="",
                explanation=f"Evidence file missing on disk at '{record.image_path}'.",
                verified_at_utc=now_ts
            )

        computed = self.compute_sha256_hash(record.image_path)
        matches = (computed.lower() == record.sha256_hash.lower())

        explanation = (
            f"Integrity verified: File SHA-256 matches sealed digest ({computed[:16]}...)."
            if matches
            else f"TAMPER DETECTED: File digest ({computed[:16]}...) does NOT match recorded hash ({record.sha256_hash[:16]}...)."
        )

        return EvidenceVerificationResult(
            evidence_id=evidence_id,
            is_valid=matches,
            recorded_hash=record.sha256_hash,
            computed_hash=computed,
            explanation=explanation,
            verified_at_utc=now_ts
        )

    def submit_human_review(
        self,
        target_id: str,
        reviewer_id: str,
        outcome: ReviewOutcome,
        notes: str,
        timestamp_utc: Optional[float] = None
    ) -> HumanReviewRecord:
        """
        Submits an official human audit evaluation for an alert or incident.
        """
        now_ts = timestamp_utc if timestamp_utc is not None else time.time()
        review_id = f"REV-{uuid.uuid4().hex[:8]}"

        record = HumanReviewRecord(
            review_id=review_id,
            target_id=target_id,
            reviewer_id=reviewer_id,
            outcome=outcome,
            notes=notes,
            reviewed_at_utc=now_ts,
            config_version=self.config_version,
            model_version=self.model_version
        )

        self._reviews[review_id] = record
        logger.info(
            f"[{self.camera_id}] Human review submitted: Review ID '{review_id}' for target '{target_id}' "
            f"-> Outcome: {outcome.value} by '{reviewer_id}'"
        )
        return record

    def get_evidence(self, evidence_id: str) -> Optional[EvidenceRecord]:
        return self._evidence_records.get(evidence_id)

    def get_reviews_for_target(self, target_id: str) -> List[HumanReviewRecord]:
        return [r for r in self._reviews.values() if r.target_id == target_id]

    def get_false_positive_rate(self) -> float:
        if not self._reviews:
            return 0.0
        fp_count = sum(1 for r in self._reviews.values() if r.outcome == ReviewOutcome.FALSE_POSITIVE)
        return (fp_count / len(self._reviews)) * 100.0
