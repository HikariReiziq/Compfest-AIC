"""DTO katalog. Sengaja dipisah dari model tabel supaya bentuk respons API
tidak ikut berubah begitu ada kolom internal baru di database.
"""

from __future__ import annotations

import base64
import binascii

import orjson
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Gender, ItemSlot, Season, UsageContext


class CategoryRef(BaseModel):
    id: int
    slug: str
    name: str
    item_slot: ItemSlot | None = None


class ColourRef(BaseModel):
    id: int
    slug: str
    name: str
    hex_code: str


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: int | None = None
    display_name: str
    gender: Gender
    category: CategoryRef
    colour: ColourRef | None = None
    usage_context: UsageContext | None = None
    season: Season | None = None
    launch_year: int | None = None
    image_url: str | None = None
    price_idr: float | None = None
    popularity_score: float = 0.0


class CategoryNode(BaseModel):
    id: int
    slug: str
    name: str
    level: str
    item_slot: ItemSlot | None = None
    children: list[CategoryNode] = Field(default_factory=list)


class ProductFilter(BaseModel):
    """Parameter query yang boleh dipakai klien.

    Daftarnya dikunci di sini, bukan diteruskan mentah ke SQL. Selain mencegah
    injeksi, ini membuat jumlah kombinasi kunci cache tetap terbatas dan bisa
    diprediksi.
    """

    model_config = ConfigDict(extra="forbid")

    gender: Gender | None = None
    usage_context: UsageContext | None = None
    category_slug: str | None = Field(default=None, max_length=96)
    colour_slug: str | None = Field(default=None, max_length=48)
    item_slot: ItemSlot | None = None
    q: str | None = Field(default=None, max_length=80)
    limit: int = Field(default=24, ge=1, le=100)
    cursor: str | None = None


class Page[T](BaseModel):
    """Keyset pagination, bukan OFFSET.

    OFFSET memaksa Postgres membaca lalu membuang semua baris sebelum halaman
    yang diminta, jadi halaman ke-500 pada katalog 44.000 produk jauh lebih
    lambat daripada halaman pertama. Cursor berbasis nilai kolom terakhir
    membuat biaya tiap halaman sama.
    """

    items: list[T]
    next_cursor: str | None = None
    has_more: bool = False


def encode_cursor(popularity_score: float, product_id: int) -> str:
    raw = orjson.dumps([popularity_score, product_id])
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_cursor(cursor: str) -> tuple[float, int] | None:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        score, product_id = orjson.loads(base64.urlsafe_b64decode(padded))
        return float(score), int(product_id)
    except (binascii.Error, orjson.JSONDecodeError, ValueError, TypeError):
        # Cursor rusak diperlakukan sebagai halaman pertama, bukan error 500.
        return None
