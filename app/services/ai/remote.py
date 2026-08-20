"""Adaptor ke layanan inferensi terpisah.

Model AI nanti tidak dijalankan di dalam proses API. Alasannya soal skala:
proses API harus ringan dan bisa diperbanyak dengan cepat, sementara inferensi
butuh memori besar dan mungkin GPU. Menyatukan keduanya berarti setiap replika
API ikut menyeret bobot model.

Dua pengaman wajib untuk panggilan lintas layanan diterapkan di sini: batas
waktu yang tegas, dan jatuh ke baseline saat layanan tujuan bermasalah, supaya
pembeli tetap menerima rekomendasi walau kualitasnya turun.
"""

from __future__ import annotations

import httpx
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.services.ai.base import RecommendationInput, RecommendationResult
from app.services.ai.heuristic import HeuristicRecommender


class RemoteRecommender:
    name = "remote"
    version = "1.0.0"

    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds
        self._fallback = HeuristicRecommender()
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=httpx.Timeout(self._timeout, connect=1.0),
                # Koneksi dipakai ulang; membuka TLS baru tiap panggilan mahal.
                limits=httpx.Limits(max_connections=32, max_keepalive_connections=16),
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def recommend(
        self, db: AsyncSession, payload: RecommendationInput
    ) -> RecommendationResult:
        try:
            client = await self._get_client()
            response = await client.post("/v1/recommend", json=payload.model_dump(mode="json"))
            response.raise_for_status()
            return RecommendationResult.model_validate(response.json())
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("layanan rekomendasi gagal, memakai baseline: {}", exc)
            result = await self._fallback.recommend(db, payload)
            result.degraded = True
            return result


def build_remote_recommender() -> RemoteRecommender:
    settings = get_settings()
    if not settings.recommender_remote_url:
        raise ValueError("RECOMMENDER_REMOTE_URL wajib diisi saat backend 'remote' dipilih.")
    return RemoteRecommender(settings.recommender_remote_url, settings.recommender_timeout_seconds)
