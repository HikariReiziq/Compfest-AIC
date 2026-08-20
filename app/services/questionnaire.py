"""Pembacaan konfigurasi kuesioner dan pemetaan jawaban ke profil.

Pertanyaannya sama untuk semua orang dan hampir tidak pernah berubah, jadi
seluruh kuesioner dimuat sekali lalu di-cache utuh. Satu request pertama
mengisi cache, sisanya tidak menyentuh Postgres sampai TTL habis.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.core import cached
from app.cache.keys import catalog_version, questionnaire_key
from app.core.config import get_settings
from app.models.questionnaire import Question, QuestionBatch
from app.schemas.session import PersonalProfile

# Jawaban dengan kunci ini naik jadi kolom profil; sisanya masuk `preferences`.
_PROFILE_FIELDS = {"gender", "occasion", "fit_preference", "undertone", "body_shape", "face_shape"}


async def load_questionnaire(db: AsyncSession) -> list[dict[str, Any]]:
    version = await catalog_version()

    async def loader() -> list[dict[str, Any]]:
        batches = (
            await db.execute(
                select(QuestionBatch)
                .where(QuestionBatch.is_active.is_(True))
                .order_by(QuestionBatch.order_index)
            )
        ).scalars().all()
        if not batches:
            return []

        questions = (
            await db.execute(
                select(Question)
                .where(
                    Question.is_active.is_(True),
                    Question.batch_id.in_([b.id for b in batches]),
                )
                .order_by(Question.order_index)
            )
        ).scalars().all()

        grouped: dict[int, list[dict[str, Any]]] = {}
        for q in questions:
            grouped.setdefault(q.batch_id, []).append(
                {
                    "code": q.code,
                    "prompt": q.prompt,
                    "input_type": str(q.input_type),
                    "options": q.options,
                    "maps_to": q.maps_to,
                    "is_required": q.is_required,
                }
            )

        return [
            {
                "code": b.code,
                "title": b.title,
                "description": b.description,
                "order_index": b.order_index,
                "unlocks_slots": b.unlocks_slots,
                "questions": grouped.get(b.id, []),
            }
            for b in batches
        ]

    version_key = questionnaire_key(version)
    return await cached(version_key, loader, ttl=get_settings().cache_ttl_catalog_seconds) or []


def apply_answers(profile: PersonalProfile, answers: dict[str, Any]) -> PersonalProfile:
    """Gabungkan jawaban batch terbaru ke profil yang sedang dibangun.

    Nilai yang tidak dikenali tidak dibuang, tetapi ditampung di `preferences`
    supaya pertanyaan baru bisa ditambahkan lewat basis data tanpa mengubah
    skema profil maupun kode ini.
    """
    data = profile.model_dump(exclude_none=True)
    preferences = dict(data.get("preferences") or {})

    for key, value in answers.items():
        if key in _PROFILE_FIELDS:
            data[key] = value
        else:
            preferences[key] = value

    data["preferences"] = preferences
    # Validasi ulang lewat pydantic: nilai yang tidak sah untuk enum akan ditolak
    # di sini, bukan meracuni profil dan baru meledak saat rekomendasi dihitung.
    return PersonalProfile.model_validate(data)
