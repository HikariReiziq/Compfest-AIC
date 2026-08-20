"""Pembacaan basis pengetahuan gaya (palet undertone dan aturan kecocokan).

Kedua tabel ini kecil dan hampir tidak pernah berubah, tetapi dibaca di setiap
permintaan rekomendasi. Itu profil paling ideal untuk cache: nilai cache tinggi,
risiko basi rendah.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.core import cached
from app.cache.keys import catalog_version, palette_key, style_rules_key
from app.core.config import get_settings
from app.models.personal import StyleRule, UndertonePalette


@dataclass(frozen=True, slots=True)
class RuleHit:
    target_category_id: int | None
    target_attribute_id: int | None
    target_colour_id: int | None
    weight: float
    rationale: str | None


async def load_palette(db: AsyncSession, undertone: str) -> dict[int, tuple[float, str | None]]:
    """colour_id -> (bobot, alasan) untuk satu undertone."""
    version = await catalog_version()

    async def loader() -> dict[str, list]:
        rows = (
            await db.execute(
                select(
                    UndertonePalette.colour_id,
                    UndertonePalette.weight,
                    UndertonePalette.rationale,
                ).where(UndertonePalette.undertone == undertone)
            )
        ).all()
        return {str(cid): [float(weight), rationale] for cid, weight, rationale in rows}

    payload = await cached(
        palette_key(version, undertone), loader, ttl=get_settings().cache_ttl_catalog_seconds
    )
    return {int(k): (v[0], v[1]) for k, v in (payload or {}).items()}


async def load_rules(db: AsyncSession, subject: str, subject_value: str) -> list[RuleHit]:
    version = await catalog_version()

    async def loader() -> list[dict]:
        rows = (
            await db.execute(
                select(StyleRule).where(
                    StyleRule.subject == subject,
                    StyleRule.subject_value == subject_value,
                    StyleRule.is_active.is_(True),
                )
            )
        ).scalars()
        return [
            {
                "c": r.target_category_id,
                "a": r.target_attribute_id,
                "k": r.target_colour_id,
                "w": float(r.weight),
                "r": r.rationale,
            }
            for r in rows
        ]

    payload = await cached(
        style_rules_key(version, subject, subject_value),
        loader,
        ttl=get_settings().cache_ttl_catalog_seconds,
    )
    return [
        RuleHit(
            target_category_id=item["c"],
            target_attribute_id=item["a"],
            target_colour_id=item["k"],
            weight=item["w"],
            rationale=item["r"],
        )
        for item in (payload or [])
    ]
