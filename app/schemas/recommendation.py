"""DTO permintaan dan respons rekomendasi."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ItemSlot
from app.services.ai.base import ScoredProduct


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Kosong berarti biarkan sistem menentukan dari jumlah batch yang selesai.
    slots: list[ItemSlot] = Field(default_factory=list)
    limit: int = Field(default=8, ge=1, le=30)
    include_size: bool = True


class RecommendationResponse(BaseModel):
    items: list[ScoredProduct] = Field(default_factory=list)
    engine: str
    engine_version: str
    # True bila hasil datang dari cache sesi, bukan hitungan baru.
    cached: bool = False
    # True bila mesin utama gagal dan sistem memakai baseline.
    degraded: bool = False
    completed_batches: int = 0
