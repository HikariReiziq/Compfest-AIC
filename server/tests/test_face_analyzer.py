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


class TestFaceShapeDiamond:
    """Task 2.2 — 6 kelas bentuk wajah dengan Diamond rule override."""

    def test_diamond_override_triggered(self):
        from ai_engine.models.face_analyzer import classify_face_shape

        ratios = {
            "face_width_to_height": 0.72,
            "jaw_to_forehead": 0.75,
            "cheekbone_to_jaw": 1.34,
            "chin_sharpness": 0.52,
            "chin_taper": 0.50,
        }
        out = classify_face_shape(ratios)
        assert out["shape"] == "Diamond"
        assert out["method"] == "rule_override"
        assert out["confidence"] >= 0.80
        assert "Berlian" in out["label_indonesian"]
        assert out["glasses_recommendations"]
        assert out["hat_recommendations"]

    def test_diamond_not_triggered_for_balanced_face(self):
        from ai_engine.models.face_analyzer import classify_face_shape

        ratios = {
            "face_width_to_height": 0.75,
            "jaw_to_forehead": 0.90,
            "cheekbone_to_jaw": 1.05,
            "chin_sharpness": 0.90,
            "chin_taper": 0.60,
        }
        out = classify_face_shape(ratios)
        assert out["shape"] != "Diamond"
        assert out["method"] in ("random_forest", "rule_based")

    def test_label_indonesian_mapping_consistent(self):
        from ai_engine.models.face_analyzer import classify_face_shape, FACE_SHAPE_LABELS_ID

        vectors = [
            {"face_width_to_height": 0.62, "jaw_to_forehead": 0.95, "cheekbone_to_jaw": 1.02, "chin_sharpness": 0.62},
            {"face_width_to_height": 0.86, "jaw_to_forehead": 0.93, "cheekbone_to_jaw": 1.10, "chin_sharpness": 0.74},
        ]
        for v in vectors:
            out = classify_face_shape(v)
            assert out["label_indonesian"] == FACE_SHAPE_LABELS_ID.get(out["shape"], out["shape"])
            assert out["styling_advice"]
        assert FACE_SHAPE_LABELS_ID["Oblong"] == "Oblong (Persegi Panjang)"
        assert set(FACE_SHAPE_LABELS_ID) == {"Oval", "Round", "Square", "Heart", "Diamond", "Oblong"}


def _nose(**over):
    f = {
        "width_to_face": 0.24,
        "length_to_height": 0.32,
        "bridge_curvature": 0.02,
        "bridge_linearity": 0.03,
        "tip_upturn": 0.08,
        "alar_to_tip_ratio": 1.4,
    }
    f.update(over)
    return f


class TestNoseClassifier:
    """Task 2.3 — rule engine 5 tipe hidung via profil-z punggung + lebar alar."""

    def test_roman_convex_bridge(self):
        from ai_engine.models.face_analyzer import NoseClassifier

        out = NoseClassifier.classify(_nose(bridge_curvature=0.16))
        assert out["label"] == "Roman (Lengkung)"
        assert out["confidence"] >= 0.55
        assert out["rule"]

    def test_celestial_button_concave_upturned(self):
        from ai_engine.models.face_analyzer import NoseClassifier

        out = NoseClassifier.classify(_nose(bridge_curvature=-0.16, tip_upturn=0.20))
        assert out["label"] == "Celestial-Button (Mancung Mungil)"

    def test_broad_snub_wide_concave(self):
        from ai_engine.models.face_analyzer import NoseClassifier

        out = NoseClassifier.classify(_nose(bridge_curvature=-0.14, width_to_face=0.31, tip_upturn=0.05))
        assert out["label"] == "Broad-Snub (Pesek Lebar)"

    def test_bulbous_wide_tip(self):
        from ai_engine.models.face_analyzer import NoseClassifier

        out = NoseClassifier.classify(_nose(bridge_curvature=0.01, width_to_face=0.33, alar_to_tip_ratio=1.8))
        assert out["label"] == "Bulbous (Bulat)"

    def test_greek_straight_baseline(self):
        from ai_engine.models.face_analyzer import NoseClassifier

        out = NoseClassifier.classify(_nose())
        assert out["label"] == "Greek (Mancung)"
        assert out["confidence"] >= 0.6

    def test_invalid_features_fallback_greek(self):
        from ai_engine.models.face_analyzer import NoseClassifier

        out = NoseClassifier.classify(
            _nose(width_to_face=0.0, length_to_height=0.0, bridge_curvature=0.0, tip_upturn=0.0, alar_to_tip_ratio=0.0)
        )
        assert out["label"] == "Greek (Mancung)"
        assert out["confidence"] <= 0.5
        assert out["rule"] == "fallback"


def _eye(**over):
    f = {
        "ear_right": 0.33,
        "ear_left": 0.32,
        "canthal_tilt_right": 3.0,
        "canthal_tilt_left": 3.0,
        "eye_spacing_ratio": 0.35,
    }
    f.update(over)
    return f


class TestEyeShapeClassifier:
    """Task 2.4 — Almond/Round/Cat-eye/Downturned via EAR + canthal tilt."""

    def test_round_high_ear(self):
        from ai_engine.models.face_analyzer import EyeShapeClassifier

        out = EyeShapeClassifier.classify(_eye(ear_right=0.41, ear_left=0.41, canthal_tilt_right=2.0, canthal_tilt_left=2.0))
        assert out["label"] == "Round (Bulat)"

    def test_cat_eye_positive_tilt(self):
        from ai_engine.models.face_analyzer import EyeShapeClassifier

        out = EyeShapeClassifier.classify(_eye(canthal_tilt_right=12.0, canthal_tilt_left=12.0))
        assert out["label"] == "Cat-eye (Mata Kucing)"

    def test_downturned_negative_tilt(self):
        from ai_engine.models.face_analyzer import EyeShapeClassifier

        out = EyeShapeClassifier.classify(_eye(canthal_tilt_right=-10.0, canthal_tilt_left=-10.0))
        assert out["label"] == "Downturned (Menurun)"

    def test_almond_baseline(self):
        from ai_engine.models.face_analyzer import EyeShapeClassifier

        out = EyeShapeClassifier.classify(_eye())
        assert out["label"] == "Almond (Almond)"
        assert out["confidence"] >= 0.6

    def test_invalid_features_fallback_almond(self):
        from ai_engine.models.face_analyzer import EyeShapeClassifier

        out = EyeShapeClassifier.classify(
            _eye(ear_right=0.0, ear_left=0.0, canthal_tilt_right=0.0, canthal_tilt_left=0.0)
        )
        assert out["label"] == "Almond (Almond)"
        assert out["confidence"] <= 0.5
        assert out["rule"] == "fallback"


def _brow(**over):
    f = {"arch_ratio_right": 0.15, "arch_ratio_left": 0.16}
    f.update(over)
    return f


class TestBrowClassifier:
    """Task 2.5 — Arched/Straight/Soft Curve via arch-height ratio."""

    def test_arched_high_arch(self):
        from ai_engine.models.face_analyzer import BrowClassifier

        out = BrowClassifier.classify(_brow(arch_ratio_right=0.26, arch_ratio_left=0.24))
        assert out["label"] == "Arched (Tegak)"

    def test_straight_flat_arch(self):
        from ai_engine.models.face_analyzer import BrowClassifier

        out = BrowClassifier.classify(_brow(arch_ratio_right=0.07, arch_ratio_left=0.08))
        assert out["label"] == "Straight (Lurus)"

    def test_soft_curve_baseline(self):
        from ai_engine.models.face_analyzer import BrowClassifier

        out = BrowClassifier.classify(_brow())
        assert out["label"] == "Soft Curve (Lengkung Lembut)"
        assert out["confidence"] >= 0.6

    def test_invalid_features_fallback_soft_curve(self):
        from ai_engine.models.face_analyzer import BrowClassifier

        out = BrowClassifier.classify(_brow(arch_ratio_right=0.0, arch_ratio_left=0.0))
        assert out["label"] == "Soft Curve (Lengkung Lembut)"
        assert out["confidence"] <= 0.5
        assert out["rule"] == "fallback"


def _pillar_ctx():
    return {"face_shape": "Diamond", "undertone": "Warm", "nose": "Broad-Snub (Pesek Lebar)"}


class TestPillarJustifier:
    """Task 2.6 — justifikasi ilmiah 3 pilar (ADR-016)."""

    def test_pillar1_frame_silhouette_contrast(self):
        from ai_engine.models.face_analyzer import PillarJustifier

        out = PillarJustifier.justify_pillar(1, _pillar_ctx())
        assert out["pillar"] == 1
        combined = (out["principle"] + out["scientific_basis"] + out["application"]).lower()
        assert "siluet" in combined or "kontras" in combined
        assert "Diamond" in out["application"]
        assert out["principle"] and out["scientific_basis"] and out["application"]

    def test_pillar2_material_color_matches_undertone(self):
        from ai_engine.models.face_analyzer import PillarJustifier

        out = PillarJustifier.justify_pillar(2, _pillar_ctx())
        combined = (out["principle"] + out["scientific_basis"]).lower()
        assert "cielab" in combined or "undertone" in combined
        app = out["application"].lower()
        assert "emas" in app or "gold" in app  # Warm → emas, hindari silver
        assert "Warm" in out["application"]

    def test_pillar3_nose_ergonomic_fit(self):
        from ai_engine.models.face_analyzer import PillarJustifier

        out = PillarJustifier.justify_pillar(3, _pillar_ctx())
        app = out["application"].lower()
        assert "low bridge" in app or "keyhole" in app or "pad" in app or "nose pad" in app
        assert "Broad-Snub" in out["application"] or "hidung" in app

    def test_all_three_pillars_complete_indonesian(self):
        from ai_engine.models.face_analyzer import PillarJustifier

        for p in PillarJustifier.justify_all(_pillar_ctx()):
            assert p["pillar"] in (1, 2, 3)
            for field in ("title", "principle", "scientific_basis", "application"):
                assert isinstance(p[field], str) and len(p[field]) > 10
