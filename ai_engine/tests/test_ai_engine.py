"""Unit tests for AI Engine Core ML Models."""

import os
import sys
import numpy as np
import pytest

# Ensure ai_engine package is in Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.skin_analyzer import SkinAnalyzer, MST_REFERENCE_TABLE
from models.face_classifier import FaceShapeClassifier
from models.recommender import StyleRecommender
from models.mock_generator import MockDataGenerator


def test_skin_analyzer_mst_matching():
    analyzer = SkinAnalyzer()
    
    # Test with exact Monk Skin Tone 06 (Sawo Matang) RGB: (160, 126, 86)
    img = np.zeros((50, 50, 3), dtype=np.uint8)
    img[:, :] = [160, 126, 86]
    
    monk_res, undertone_res = analyzer.analyze_from_image_array(img)
    
    assert monk_res.code == "MST-06"
    assert monk_res.index == 6
    assert monk_res.distance_delta_e < 4.0
    assert undertone_res.undertone == "Warm"
    assert len(undertone_res.best_colors) > 0
    assert len(undertone_res.clash_colors) > 0


def test_skin_analyzer_cool_tone():
    analyzer = SkinAnalyzer()
    
    # Test with fair cool tone (high lightness, low b, moderate a)
    img = np.zeros((50, 50, 3), dtype=np.uint8)
    img[:, :] = [235, 220, 225]
    
    monk_res, undertone_res = analyzer.analyze_from_image_array(img)
    
    assert monk_res.index in [1, 2, 3]
    assert undertone_res.season in ["Winter / Cool Summer", "Soft Neutral / All Seasons", "Universal Harmony"]


def test_face_classifier_oval_and_round():
    classifier = FaceShapeClassifier()
    
    # Oval ratio profile
    oval_ratios = {
        "face_width_to_height": 0.76,
        "jaw_to_forehead": 0.82,
        "cheekbone_to_jaw": 1.18,
        "chin_sharpness": 0.64,
    }
    oval_res = classifier.classify(oval_ratios)
    assert oval_res.shape in ["Oval", "Heart"]
    assert len(oval_res.glasses_recommendations) > 0
    assert len(oval_res.hat_recommendations) > 0
    assert len(oval_res.styling_advice) > 0

    # Round ratio profile (wide face, wide jaw)
    round_ratios = {
        "face_width_to_height": 0.88,
        "jaw_to_forehead": 0.89,
        "cheekbone_to_jaw": 1.22,
        "chin_sharpness": 0.75,
    }
    round_res = classifier.classify(round_ratios)
    assert round_res.shape in ["Round", "Square"]


def test_style_recommender_top_4_curation():
    recommender = StyleRecommender()
    
    user_profile = {
        "monk_tone": "MST-06",
        "undertone": "Warm",
        "face_shape": "Oval",
    }
    quiz_answers = {
        "occasion": "Casual",
        "fit_preference": "Relaxed Fit",
        "color_mood": "Earth Tone",
    }
    
    # Test glasses recommendation
    res_glasses = recommender.recommend("glasses", user_profile, quiz_answers)
    assert res_glasses.subcategory == "glasses"
    assert len(res_glasses.items) == 4
    assert res_glasses.primary_auto_attached_item is not None
    assert res_glasses.primary_auto_attached_item.rank == 1
    assert res_glasses.primary_auto_attached_item.archetype == "perfect_match"
    
    # Verify archetypes are ordered properly
    archetypes = [item.archetype for item in res_glasses.items]
    assert archetypes == ["perfect_match", "safe_classic", "bold_statement", "modern_trendy"]
    
    # Test jacket recommendation
    res_jackets = recommender.recommend("jackets", user_profile, quiz_answers)
    assert res_jackets.subcategory == "jackets"
    assert len(res_jackets.items) == 4
    assert res_jackets.primary_auto_attached_item.category == "Apparel"


def test_mock_generator():
    preset = MockDataGenerator.get_preset("indonesian_warm_sawo_matang")
    assert preset["monk_tone"]["code"] == "MST-06"
    assert preset["undertone"]["undertone"] == "Warm"
    assert preset["face_shape"]["shape"] == "Oval"
    assert "body_shape" not in preset
    
    presets_list = MockDataGenerator.list_presets()
    assert len(presets_list) >= 3
