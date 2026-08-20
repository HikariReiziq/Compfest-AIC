"""Kontrak mesin rekomendasi.

Modul ini adalah sambungan tempat AI dipasang nanti. Endpoint tidak pernah tahu
implementasi mana yang sedang dipakai: ia hanya memanggil `Recommender`. Karena
itu mengganti baseline berbasis aturan dengan model terlatih cukup dengan
mengubah satu variabel environment, tanpa menyentuh lapisan API.

Kontraknya disengaja berbentuk "profil masuk, daftar produk berperingkat
keluar". Bentuk ini berlaku untuk aturan stylist, model klasik seperti gradient
boosting, maupun retrieval berbasis embedding.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ItemSlot
from app.schemas.catalog import ProductRead
from app.schemas.session import PersonalProfile
from app.schemas.sizing import SizeSuggestion


class RecommendationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile: PersonalProfile
    slots: list[ItemSlot] = Field(default_factory=list)
    limit: int = Field(default=8, ge=1, le=50)
    # Sinyal dari sesi berjalan. Inilah yang membuat hasil makin tajam saat
    # pembeli menekan cocok atau tidak cocok, tanpa perlu melatih ulang model.
    liked_product_ids: list[int] = Field(default_factory=list)
    disliked_product_ids: list[int] = Field(default_factory=list)
    include_size: bool = True


class ScoredProduct(BaseModel):
    product: ProductRead
    score: float = Field(ge=0.0, le=1.0)
    # Ditampilkan ke pembeli sebagai alasan. Rekomendasi yang tidak bisa
    # dijelaskan sulit dipercaya, dan juri lomba akan menanyakannya.
    reasons: list[str] = Field(default_factory=list)
    # Catatan yang menurunkan nilai item ini. Dipisah dari `reasons` supaya UI
    # tidak menampilkan kalimat negatif sebagai alasan merekomendasikan.
    caveats: list[str] = Field(default_factory=list)
    size: SizeSuggestion | None = None


class RecommendationResult(BaseModel):
    items: list[ScoredProduct] = Field(default_factory=list)
    engine: str
    engine_version: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    # Diisi saat mesin utama gagal dan sistem jatuh ke cadangan.
    degraded: bool = False


@runtime_checkable
class Recommender(Protocol):
    """Semua implementasi wajib async dan tidak menyimpan state antar panggilan."""

    name: str
    version: str

    async def recommend(
        self, db: AsyncSession, payload: RecommendationInput
    ) -> RecommendationResult: ...


def default_slots_for_batches(completed: list[str]) -> list[ItemSlot]:
    """Output menyesuaikan seberapa jauh kuesioner dijalani.

    Sesuai proposal: makin banyak batch selesai, makin lengkap outfit yang
    boleh keluar. Peta ini nantinya digantikan kolom `unlocks_slots` di tabel
    `question_batch` begitu kuesioner dikelola lewat basis data.
    """
    count = len(completed)
    if count <= 0:
        return [ItemSlot.TOP]
    if count == 1:
        return [ItemSlot.TOP, ItemSlot.BOTTOM]
    if count == 2:
        return [ItemSlot.TOP, ItemSlot.BOTTOM, ItemSlot.FOOTWEAR]
    return [
        ItemSlot.TOP,
        ItemSlot.BOTTOM,
        ItemSlot.FOOTWEAR,
        ItemSlot.OUTERWEAR,
        ItemSlot.ACCESSORY,
        ItemSlot.EYEWEAR,
    ]
