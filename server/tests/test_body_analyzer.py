"""Unit tests for multi-dimensional body shape analyzer and apparel justifier."""

import os
import sys

# Pastikan root workspace ada di sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import pytest
from fastapi.testclient import TestClient
from server.app.main import app
from ai_engine.models.body_analyzer import (
    classify_body_shape,
    classify_torso_leg_balance,
    PillarJustifierBody,
    BodyAnalyzer,
)

client = TestClient(app)


class TestBodyShapeClassification:
    def test_inverted_triangle_broad_shoulders(self):
        ratios = {
            "shoulder_to_hip_ratio": 1.18,
            "waist_to_hip_ratio": 0.82,
            "waist_to_shoulder_ratio": 0.70,
        }
        res = classify_body_shape(ratios)
        assert res["shape"] == "Inverted Triangle"
        assert res["confidence"] >= 0.75
        assert "V-Neck" in " ".join(res["topwear_recommendations"])
        assert "Cargo" in " ".join(res["bottomwear_recommendations"])

    def test_pear_dominant_hips(self):
        ratios = {
            "shoulder_to_hip_ratio": 0.86,
            "waist_to_hip_ratio": 0.75,
            "waist_to_shoulder_ratio": 0.87,
        }
        res = classify_body_shape(ratios)
        assert res["shape"] == "Pear"
        assert res["confidence"] >= 0.75
        assert "Structured" in " ".join(res["topwear_recommendations"])

    def test_apple_full_torso(self):
        ratios = {
            "shoulder_to_hip_ratio": 1.02,
            "waist_to_hip_ratio": 0.94,
            "waist_to_shoulder_ratio": 0.92,
        }
        res = classify_body_shape(ratios)
        assert res["shape"] == "Apple"
        assert "Empire" in " ".join(res["topwear_recommendations"])

    def test_hourglass_balanced_waist(self):
        ratios = {
            "shoulder_to_hip_ratio": 1.01,
            "waist_to_hip_ratio": 0.72,
            "waist_to_shoulder_ratio": 0.71,
        }
        res = classify_body_shape(ratios)
        assert res["shape"] == "Hourglass"
        assert res["confidence"] >= 0.75
        assert "Wrap" in " ".join(res["topwear_recommendations"])

    def test_rectangle_straight_silhouette(self):
        ratios = {
            "shoulder_to_hip_ratio": 1.00,
            "waist_to_hip_ratio": 0.84,
            "waist_to_shoulder_ratio": 0.84,
        }
        res = classify_body_shape(ratios)
        assert res["shape"] == "Rectangle"
        assert "Belted" in " ".join(res["topwear_recommendations"])


class TestTorsoLegBalance:
    def test_long_torso(self):
        res = classify_torso_leg_balance(0.98)
        assert res["balance_type"] == "Long Torso"
        assert "High-Waist" in res["advice"]

    def test_long_legs(self):
        res = classify_torso_leg_balance(0.72)
        assert res["balance_type"] == "Long Legs"
        assert "Mid-Rise" in res["advice"] or "Low-Rise" in res["advice"]

    def test_balanced(self):
        res = classify_torso_leg_balance(0.85)
        assert res["balance_type"] == "Balanced"


class TestPillarJustifierBody:
    def test_three_pillars_generated(self):
        p1 = PillarJustifierBody.justify_upper_silhouette("Hourglass")
        assert p1["pillar"] == "upper_silhouette"
        assert "Wrap" in p1["recommendation"]

        p2 = PillarJustifierBody.justify_lower_inseam("Hourglass", "Long Torso")
        assert p2["pillar"] == "lower_inseam"
        assert "High-Waist" in p2["recommendation"]

        p3 = PillarJustifierBody.justify_footwear("Inverted Triangle")
        assert p3["pillar"] == "footwear_balance"
        assert "Chunky" in p3["recommendation"]


class TestBodyAnalyzerOrchestrator:
    def test_full_analysis(self):
        analyzer = BodyAnalyzer()
        res = analyzer.analyze(
            body_ratios={
                "shoulder_to_hip_ratio": 1.0,
                "waist_to_hip_ratio": 0.75,
                "waist_to_shoulder_ratio": 0.75,
                "torso_to_leg_ratio": 0.85,
            },
            measurements_cm={
                "shoulder_width_cm": 42.0,
                "waist_width_cm": 31.5,
                "hip_width_cm": 42.0,
                "torso_length_cm": 46.0,
                "leg_length_cm": 80.0,
                "total_height_cm": 168.0,
                "body_proportion": "1.0 : 0.8 : 1.0",
                "calibration": "height_input",
            },
            user_height_cm=168.0,
        )
        assert res["body_shape"]["shape"] == "Hourglass"
        assert len(res["pillars"]) == 3
        assert "summary" in res["narrative"]


class TestBodyLandmarksEndpoint:
    def test_post_body_landmarks_success(self):
        payload = {
            "body_ratios": {
                "shoulder_to_hip_ratio": 1.15,
                "waist_to_hip_ratio": 0.82,
                "waist_to_shoulder_ratio": 0.71,
                "torso_to_leg_ratio": 0.88,
                "posture_symmetry": 0.98,
            },
            "measurements_cm": {
                "shoulder_width_cm": 44.2,
                "waist_width_cm": 32.5,
                "hip_width_cm": 38.4,
                "torso_length_cm": 48.1,
                "leg_length_cm": 81.2,
                "total_height_cm": 172.0,
                "body_proportion": "1.2 : 0.8 : 1.0",
                "calibration": "height_input",
            },
            "quality": {
                "is_frontal": True,
                "yaw_deg": 2.1,
                "pitch_deg": 1.0,
                "roll_deg": 0.5,
                "full_body_visible": True,
                "visibility_score": 0.98,
                "luminance": 140.0,
            },
            "user_height_input_cm": 172.0,
        }
        resp = client.post("/api/v1/analyze/body-landmarks", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["body_shape"]["shape"] == "Inverted Triangle"
        assert len(data["pillars"]) == 3
        assert data["measurements_cm"]["total_height_cm"] == 172.0
