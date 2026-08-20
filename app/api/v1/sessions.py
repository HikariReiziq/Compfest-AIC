"""Endpoint sesi try-on.

ID sesi dikirim lewat header `X-Session-Id`, bukan di path URL. ID ini adalah
kredensial: siapa pun yang memegangnya bisa membaca profil tubuh pemiliknya.
URL bocor terlalu mudah lewat access log server, header Referer, dan riwayat
peramban, sementara header tidak ikut tercatat di tempat-tempat itu.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Header, Response, status

from app.api.deps import DbSession, DbSessionRO, RateLimit
from app.cache.session import get_session_store
from app.core.errors import SessionExpiredError
from app.schemas.session import FeedbackEntry, PersonalProfile, SessionState
from app.services import feedback as feedback_service
from app.services import questionnaire as questionnaire_service

router = APIRouter(tags=["session"])

SessionId = Annotated[str, Header(alias="X-Session-Id", min_length=16, max_length=64)]


@router.post(
    "/session",
    response_model=SessionState,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RateLimit("session_create", per_minute=20))],
    summary="Mulai sesi try-on baru",
)
async def create_session() -> SessionState:
    return await get_session_store().create()


@router.get("/session", response_model=SessionState, summary="Baca status sesi")
async def read_session(session_id: SessionId) -> SessionState:
    return await get_session_store().get(session_id)


@router.patch(
    "/session/profile",
    response_model=SessionState,
    summary="Perbarui hasil scan tubuh",
)
async def update_profile(session_id: SessionId, profile: PersonalProfile) -> SessionState:
    store = get_session_store()
    state = await store.get(session_id)
    # Gabung, bukan timpa: scan wajah dan scan tubuh datang di panggilan terpisah.
    merged = state.profile.model_dump(exclude_none=True)
    merged.update(profile.model_dump(exclude_none=True))
    await store.update_profile(session_id, PersonalProfile.model_validate(merged))
    return await store.get(session_id)


@router.get("/questionnaire", summary="Daftar batch pertanyaan")
async def questionnaire(db: DbSessionRO) -> list[dict[str, Any]]:
    return await questionnaire_service.load_questionnaire(db)


@router.post(
    "/session/answers",
    response_model=SessionState,
    summary="Kirim jawaban satu batch",
)
async def submit_answers(
    session_id: SessionId,
    batch_code: Annotated[str, Body(embed=True, max_length=48)],
    answers: Annotated[dict[str, Any], Body(embed=True)],
) -> SessionState:
    store = get_session_store()
    state = await store.merge_answers(session_id, batch_code, answers)
    updated_profile = questionnaire_service.apply_answers(state.profile, answers)
    await store.update_profile(session_id, updated_profile)
    return await store.get(session_id)


@router.post(
    "/session/feedback",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Tandai rekomendasi cocok atau tidak",
)
async def submit_feedback(
    session_id: SessionId, entry: FeedbackEntry, db: DbSession
) -> dict[str, int]:
    store = get_session_store()
    state = await store.get(session_id)
    count = await store.add_feedback(session_id, entry)
    # Detail per pembeli tetap di Redis dan ikut hilang bersama sesinya.
    # Yang masuk Postgres hanya cacah pada irisan anonim.
    await feedback_service.record_feedback(
        db, product_id=entry.product_id, liked=entry.liked, profile=state.profile
    )
    return {"feedback_count": count}


@router.delete(
    "/session",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Akhiri sesi dan hapus seluruh datanya",
)
async def end_session(session_id: SessionId) -> Response:
    await get_session_store().delete(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/session/feedback", response_model=list[FeedbackEntry])
async def list_feedback(session_id: SessionId) -> list[FeedbackEntry]:
    store = get_session_store()
    await store.get(session_id)  # memastikan sesi masih hidup
    return await store.list_feedback(session_id)


__all__ = ["SessionExpiredError", "router"]
