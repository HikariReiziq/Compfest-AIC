"""Pencatatan agregat umpan balik.

Ditulis dengan UPSERT atomik (ON CONFLICT DO UPDATE) sehingga dua request
bersamaan pada irisan yang sama tidak saling menimpa hitungannya. Tidak ada
baca-lalu-tulis di sisi aplikasi, jadi tidak ada race condition yang perlu
dikunci.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.feedback import RecommendationFeedbackDaily
from app.schemas.session import PersonalProfile


async def record_feedback(
    db: AsyncSession, *, product_id: int, liked: bool, profile: PersonalProfile
) -> None:
    """Simpan satu suara ke irisan hari ini.

    Tidak ada identitas apa pun yang ikut: baris ini mewakili "sekian orang
    dengan bentuk tubuh dan undertone tertentu", bukan seseorang.
    """
    if not get_settings().feedback_aggregate_enabled:
        return

    values = {
        "day": datetime.now(UTC).date(),
        "product_id": product_id,
        "body_shape": profile.body_shape,
        "undertone": profile.undertone,
        "occasion": profile.occasion,
        "impressions": 1,
        "likes": 1 if liked else 0,
        "dislikes": 0 if liked else 1,
    }
    table = RecommendationFeedbackDaily.__table__
    stmt = insert(table).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["day", "product_id", "body_shape", "undertone", "occasion"],
        set_={
            "impressions": table.c.impressions + 1,
            "likes": table.c.likes + (1 if liked else 0),
            "dislikes": table.c.dislikes + (0 if liked else 1),
            "updated_at": datetime.now(UTC),
        },
    )
    await db.execute(stmt)
