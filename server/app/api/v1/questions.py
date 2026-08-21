"""API Endpoint for generating dynamic questionnaire questions via Gemini API."""

import asyncio
from typing import Optional
from fastapi import APIRouter, Header

from ...config import get_settings
from ...schemas import DynamicQuestionRequest, DynamicQuestionsResponse
from ...services.gemini_service import generate_dynamic_questions

router = APIRouter(prefix="/questions", tags=["Dynamic Questionnaire Engine"])


@router.post("/generate", response_model=DynamicQuestionsResponse)
async def generate_questions(
    request: DynamicQuestionRequest,
    x_mock_data: Optional[str] = Header(None, alias="X-Mock-Data"),
):
    """Generates contextual questionnaire questions using Gemini API or local fallback."""
    settings = get_settings()
    is_mock = bool(settings.MOCK_MODE or (x_mock_data and x_mock_data.lower() in ("true", "1")))

    questions = await generate_dynamic_questions(
        user_profile=request.user_profile,
        category=request.category,
        subcategory=request.subcategory,
        previous_answers=request.previous_answers,
        batch=request.batch,
    )

    source = "local_bank"
    if settings.GEMINI_API_KEY and not is_mock:
        source = "gemini_api"

    return DynamicQuestionsResponse(
        questions=questions,
        source=source,
        batch=request.batch,
        is_mock=is_mock,
    )
