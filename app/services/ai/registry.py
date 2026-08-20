"""Pemilihan implementasi rekomendasi.

Satu-satunya tempat yang tahu mesin mana yang aktif. Endpoint cukup meminta
`get_recommender()`.
"""

from __future__ import annotations

from app.core.config import get_settings
from app.services.ai.base import Recommender
from app.services.ai.heuristic import HeuristicRecommender

_instance: Recommender | None = None


def get_recommender() -> Recommender:
    global _instance
    if _instance is None:
        settings = get_settings()
        if settings.recommender_backend == "remote":
            from app.services.ai.remote import build_remote_recommender

            _instance = build_remote_recommender()
        else:
            _instance = HeuristicRecommender()
    return _instance


async def shutdown_recommender() -> None:
    global _instance
    if _instance is not None and hasattr(_instance, "aclose"):
        await _instance.aclose()
    _instance = None
