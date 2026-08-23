"""TDD suite untuk Multi-Dimensional Face Analyzer (ADR-014) dan endpoint /analyze/landmarks.

Dikembangkan test-first per task sesuai
docs/plans/2026-08-23-face-analysis-overhaul.md (Fase 2).
"""

import pytest
from fastapi.testclient import TestClient

import os
import sys

# Pastikan root workspace ada di sys.path (pola yang sama dengan test_server.py)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from server.app.main import app

client = TestClient(app)


def _payload(**overrides):
    """Payload representatif hasil ekstraksi klien (faceGeometry.ts) — hanya angka."""
    base = {
        "face_ratios": {
            "face_width_to_height": 0.78,
            "jaw_to_forehead": 0.85,
            "cheekbone_to_jaw": 1.18,
            "chin_sharpness": 0.55,
            "chin_taper": 0.46,
        },
        "measurements_cm": {
            "forehead_width_cm": 12.9,
            "cheekbone_width_cm": 14.9,
            "jaw_width_cm": 12.6,
            "face_height_cm": 22.1,
            "face_proportion": "1.0:1.2:1",
            "calibration": "iris",
        },
        "nose_features": {
            "width_to_face": 0.24,
            "length_to_height": 0.32,
            "bridge_curvature": 0.02,
            "bridge_linearity": 0.03,
            "tip_upturn": 0.08,
            "alar_to_tip_ratio": 1.4,
        },
        "eye_features": {
            "ear_right": 0.33,
            "ear_left": 0.32,
            "canthal_tilt_right": 2.0,
            "canthal_tilt_left": 2.0,
            "eye_spacing_ratio": 0.35,
        },
        "brow_features": {
            "arch_ratio_right": 0.16,
            "arch_ratio_left": 0.15,
        },
        "quality": {
            "roll_deg": 1.0,
            "yaw_deg": 2.0,
            "pitch_deg": 3.0,
            "luminance": 120.0,
            "face_width_ratio": 0.38,
        },
    }
    base.update(overrides)
    return base


class TestSchemas:
    """Task 2.1 — Pydantic models untuk payload landmark."""

    def test_landmark_payload_valid(self):
        from app.schemas import LandmarkAnalysisRequest

        req = LandmarkAnalysisRequest(**_payload())
        assert req.face_ratios.cheekbone_to_jaw == 1.18
        assert req.measurements_cm.calibration == "iris"
        assert req.nose_features.bridge_curvature == 0.02
        assert req.quality.luminance == 120.0

    def test_landmark_payload_rejects_missing_block(self):
        from app.schemas import LandmarkAnalysisRequest

        p = _payload()
        del p["nose_features"]
        with pytest.raises(Exception):
            LandmarkAnalysisRequest(**p)

    def test_landmark_payload_accepts_ratio_only_calibration(self):
        from app.schemas import LandmarkAnalysisRequest

        p = _payload()
        p["measurements_cm"] = {
            "forehead_width_cm": None,
            "cheekbone_width_cm": None,
            "jaw_width_cm": None,
            "face_height_cm": None,
            "face_proportion": "1.0:1.2:1",
            "calibration": "ratio_only",
        }
        req = LandmarkAnalysisRequest(**p)
        assert req.measurements_cm.forehead_width_cm is None
        assert req.measurements_cm.calibration == "ratio_only"
