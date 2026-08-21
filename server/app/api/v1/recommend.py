"""API Endpoint for generating Top-4 Curated Recommendations."""

import sys
import os
from typing import Optional
from fastapi import APIRouter, Header

# Ensure ai_engine is importable
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai_engine.models.recommender import StyleRecommender
from ai_engine.models.mock_generator import MockDataGenerator

from ...config import get_settings
from ...schemas import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendationItemSchema,
)

router = APIRouter(prefix="/recommend", tags=["Top-4 Curated Recommendations"])

recommender = StyleRecommender()


@router.post("", response_model=RecommendationResponse)
def get_recommendations(
    request: RecommendationRequest,
    x_mock_data: Optional[str] = Header(None, alias="X-Mock-Data"),
):
    """Generates Top-4 Curated Style Archetypes with the #1 primary item auto-attached."""
    settings = get_settings()
    is_mock = bool(settings.MOCK_MODE or (x_mock_data and x_mock_data.lower() in ("true", "1")))

    # Fallback to default preset profile if user_profile is empty
    profile = request.user_profile
    if not profile or not profile.get("undertone"):
        preset = MockDataGenerator.get_preset("indonesian_warm_sawo_matang")
        profile = {
            "monk_tone": preset["monk_tone"]["code"],
            "undertone": preset["undertone"]["undertone"],
            "face_shape": preset["face_shape"]["shape"],
            "body_shape": preset["body_shape"]["shape"],
        }

    quiz = request.quiz_answers or {
        "occasion": "Casual",
        "fit_preference": "Regular Fit",
        "color_mood": "Earth Tone",
    }

    result = recommender.recommend(
        subcategory=request.subcategory,
        user_profile=profile,
        quiz_answers=quiz,
    )

    items_schema = [
        RecommendationItemSchema(
            rank=it.rank,
            archetype=it.archetype,
            archetype_title=it.archetype_title,
            id=it.item_id,
            name=it.name,
            category=it.category,
            subcategory=it.subcategory,
            base_colour=it.base_colour,
            hex_colour=it.hex_colour,
            usage=it.usage,
            model_3d_path=it.model_3d_path,
            preview_image_url=it.preview_image_url,
            price_idr=it.price_idr,
            compatibility_score=it.compatibility_score,
            color_match_score=it.color_match_score,
            shape_match_score=it.shape_match_score,
            stylist_reason=it.stylist_reason,
            model_type=it.model_type,
        )
        for it in result.items
    ]

    primary_id = result.primary_auto_attached_item.item_id if result.primary_auto_attached_item else items_schema[0].id

    return RecommendationResponse(
        subcategory=result.subcategory,
        primary_item_id=primary_id,
        items=items_schema,
        personal_summary=result.personal_summary,
        is_mock=is_mock,
    )
