"""Endpoint rekomendasi.

Hasil di-cache per (sesi, batch terakhir, sidik jari profil). Selama pembeli
belum menjawab batch baru dan belum memberi feedback, membuka ulang halaman
tidak memicu perhitungan ulang maupun query katalog. Begitu profil berubah,
sidik jarinya ikut berubah dan kunci cache lama otomatis ditinggalkan.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header

from app.api.deps import DbSessionRO, RateLimit
from app.cache.core import cached
from app.cache.keys import recommendation_key
from app.cache.session import get_session_store
from app.core.config import get_settings
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services.ai.base import RecommendationInput, default_slots_for_batches
from app.services.ai.registry import get_recommender

router = APIRouter(tags=["recommendation"])

SessionId = Annotated[str, Header(alias="X-Session-Id", min_length=16, max_length=64)]


@router.post(
    "/session/recommendations",
    response_model=RecommendationResponse,
    dependencies=[Depends(RateLimit("recommendation", per_minute=30))],
    summary="Ambil rekomendasi untuk sesi berjalan",
)
async def recommend(
    session_id: SessionId,
    payload: RecommendationRequest,
    db: DbSessionRO,
) -> RecommendationResponse:
    settings = get_settings()
    store = get_session_store()
    state = await store.get(session_id)

    slots = payload.slots or default_slots_for_batches(state.completed_batches)
    feedback = await store.list_feedback(session_id, limit=settings.session_max_feedback)
    liked = [f.product_id for f in feedback if f.liked]
    disliked = [f.product_id for f in feedback if not f.liked]

    batch_code = state.completed_batches[-1] if state.completed_batches else "batch0"
    # Sidik jari mencakup profil, slot, dan feedback, sehingga setiap perubahan
    # yang seharusnya mengubah hasil pasti menghasilkan kunci cache berbeda.
    fingerprint = state.profile.fingerprint()
    key = recommendation_key(
        session_id,
        f"{batch_code}:{len(feedback)}:{payload.limit}:{int(payload.include_size)}",
        fingerprint,
    )

    was_cached = True

    async def loader() -> dict:
        nonlocal was_cached
        was_cached = False
        result = await get_recommender().recommend(
            db,
            RecommendationInput(
                profile=state.profile,
                slots=slots,
                limit=payload.limit,
                liked_product_ids=liked,
                disliked_product_ids=disliked,
                include_size=payload.include_size,
            ),
        )
        return result.model_dump(mode="json")

    data = await cached(key, loader, ttl=settings.cache_ttl_recommendation_seconds)

    return RecommendationResponse(
        items=data.get("items", []),
        engine=data.get("engine", "unknown"),
        engine_version=data.get("engine_version", "0"),
        cached=was_cached,
        degraded=data.get("degraded", False),
        completed_batches=len(state.completed_batches),
    )
