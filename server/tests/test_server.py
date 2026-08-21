"""Integration tests for FastAPI REST Endpoints."""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure root workspace is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from server.app.main import app

client = TestClient(app)


def test_health_endpoints():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "COBA Fashion AI Backend"

    v1_response = client.get("/api/v1/health")
    assert v1_response.status_code == 200
    assert v1_response.json()["status"] == "healthy"


def test_analyze_skin_mock_and_live():
    # Test mock header fallback
    resp = client.post(
        "/api/v1/analyze/skin",
        json={"image_base64": ""},
        headers={"X-Mock-Data": "true"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "monk_tone" in data
    assert data["monk_tone"]["code"] == "MST-06"
    assert data["undertone"]["undertone"] == "Warm"
    assert data["is_mock"] is True


def test_analyze_ratios_endpoint():
    payload = {
        "face_ratios": {
            "face_width_to_height": 0.76,
            "jaw_to_forehead": 0.82,
            "cheekbone_to_jaw": 1.18,
            "chin_sharpness": 0.64
        },
        "body_ratios": {
            "shoulder_to_hip_ratio": 1.0,
            "waist_to_hip_ratio": 0.72,
            "waist_to_shoulder_ratio": 0.72
        }
    }
    resp = client.post("/api/v1/analyze/ratios", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["face_shape"]["shape"] == "Oval"
    assert data["body_shape"]["shape"] == "Hourglass"


def test_recommend_endpoint_top_4_glasses():
    payload = {
        "subcategory": "glasses",
        "user_profile": {
            "monk_tone": "MST-06",
            "undertone": "Warm",
            "face_shape": "Oval",
            "body_shape": "Hourglass"
        },
        "quiz_answers": {
            "occasion": "Casual",
            "fit_preference": "Regular Fit",
            "color_mood": "Earth Tone"
        }
    }
    resp = client.post("/api/v1/recommend", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["subcategory"] == "glasses"
    assert len(data["items"]) == 4
    assert data["primary_item_id"] == data["items"][0]["id"]
    assert data["items"][0]["archetype"] == "perfect_match"
    assert data["items"][1]["archetype"] == "safe_classic"
    assert data["items"][2]["archetype"] == "bold_statement"
    assert data["items"][3]["archetype"] == "modern_trendy"


def test_recommend_endpoint_jackets():
    payload = {
        "subcategory": "jackets",
        "user_profile": {
            "monk_tone": "MST-06",
            "undertone": "Warm",
            "face_shape": "Oval",
            "body_shape": "Hourglass"
        },
        "quiz_answers": {
            "occasion": "Casual",
            "fit_preference": "Oversized",
            "color_mood": "Earth Tone"
        }
    }
    resp = client.post("/api/v1/recommend", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["subcategory"] == "jackets"
    assert len(data["items"]) == 4
    assert data["items"][0]["category"] == "Apparel"


def test_catalog_endpoints():
    resp = client.get("/api/v1/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0
    assert len(data["items"]) == data["total"]

    # Filter test
    glass_resp = client.get("/api/v1/catalog?subcategory=glasses")
    assert glass_resp.status_code == 200
    for item in glass_resp.json()["items"]:
        assert item["subcategory"] == "glasses"

    # Presets test
    preset_resp = client.get("/api/v1/catalog/presets")
    assert preset_resp.status_code == 200
    assert len(preset_resp.json()["presets"]) >= 3


def test_analyze_ratios_partial_face_only():
    """Verify that when only face_ratios are provided, body_shape still safely returns a default response."""
    payload = {
        "face_ratios": {
            "face_width_to_height": 0.85,
            "jaw_to_forehead": 0.9,
            "cheekbone_to_jaw": 1.1,
            "chin_sharpness": 0.8
        }
    }
    resp = client.post("/api/v1/analyze/ratios", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["face_shape"] is not None
    assert data["face_shape"]["shape"] == "Square"
    assert data["body_shape"] is not None
    assert data["body_shape"]["shape"] == "Hourglass"


def test_dynamic_questions_endpoint():
    """Verify that dynamic questionnaire endpoint returns structured questions."""
    payload = {
        "category": "accessories",
        "subcategory": "glasses",
        "user_profile": {
            "monk_tone": "MST-06",
            "undertone": "Warm",
            "face_shape": "Oval",
            "body_shape": "Hourglass"
        },
        "batch": 1
    }
    resp = client.post("/api/v1/questions/generate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["questions"]) >= 3
    for q in data["questions"]:
        assert "id" in q
        assert "question" in q
        assert "reason" in q
        assert len(q["options"]) == 4

