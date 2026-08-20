"""Tabel katalog produk.

Sumber utama: Fashion Product Images (44.000 baris, CC0). Tiga kolom hierarki
dataset (masterCategory / subCategory / articleType) tidak disalin apa adanya
sebagai tiga kolom teks, melainkan dinormalisasi ke satu tabel `category` yang
menunjuk ke dirinya sendiri. Alasannya di docs/SCHEMA.md.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Computed,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlmodel import Field, SQLModel

from app.models.base import created_at, enum_column, pk_bigint, updated_at
from app.models.enums import CategoryLevel, Gender, ItemSlot, Season, UsageContext


class Category(SQLModel, table=True):
    """Hierarki kategori tiga tingkat, satu tabel dengan parent menunjuk ke diri sendiri.

    Produk selalu menunjuk ke node daun (articleType). Nenek moyangnya dicapai
    lewat `parent_id`, jadi menambah tingkat keempat kelak tidak mengubah skema.
    """

    __tablename__ = "category"
    __table_args__ = (
        UniqueConstraint("parent_id", "name", name="uq_category_parent_name"),
        Index("ix_category_level_active", "level", "is_active"),
    )

    id: int | None = pk_bigint()
    level: CategoryLevel = Field(sa_column=enum_column(CategoryLevel, nullable=False))
    name: str = Field(sa_column=Column(String(80), nullable=False))
    slug: str = Field(sa_column=Column(String(96), nullable=False, unique=True, index=True))
    parent_id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("category.id", ondelete="RESTRICT"), index=True),
    )
    # Hanya diisi di level `article`: menentukan slot tubuh yang ditempati item.
    item_slot: ItemSlot | None = Field(default=None, sa_column=enum_column(ItemSlot, nullable=True))
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"), default=True
    )
    created_at: datetime | None = created_at()
    updated_at: datetime | None = updated_at()


class Colour(SQLModel, table=True):
    """Warna dasar produk beserta koordinat LAB-nya.

    `baseColour` di dataset hanya berupa teks ("Navy Blue"). Pencocokan ke
    undertone kulit butuh jarak warna, dan jarak warna butuh angka. Konversi ke
    LAB dilakukan sekali saat impor, bukan tiap kali rekomendasi dihitung.
    """

    __tablename__ = "colour"

    id: int | None = pk_bigint()
    name: str = Field(sa_column=Column(String(40), nullable=False, unique=True))
    slug: str = Field(sa_column=Column(String(48), nullable=False, unique=True, index=True))
    hex_code: str = Field(sa_column=Column(String(7), nullable=False))
    lab_l: float = Field(sa_column=Column(Numeric(6, 2), nullable=False))
    lab_a: float = Field(sa_column=Column(Numeric(6, 2), nullable=False))
    lab_b: float = Field(sa_column=Column(Numeric(6, 2), nullable=False))
    # Warna netral (hitam, putih, abu, navy) aman untuk semua undertone.
    is_neutral: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="false"), default=False
    )
    created_at: datetime | None = created_at()


class Product(SQLModel, table=True):
    """Satu item katalog.

    Tabel ini nyaris read-only setelah impor dan menjadi sasaran hampir semua
    query panas, sehingga desainnya dioptimalkan untuk baca: kolom filter yang
    sempit, indeks komposit yang mengikuti pola query rekomendasi, dan kolom
    tsvector ter-generate untuk pencarian teks.
    """

    __tablename__ = "product"
    __table_args__ = (
        # Indeks utama mesin rekomendasi: filter gender + occasion + kategori.
        # Parsial pada is_active supaya produk nonaktif tidak membebani indeks.
        Index(
            "ix_product_reco_filter",
            "gender",
            "usage_context",
            "category_id",
            postgresql_where=Column("is_active", Boolean) == True,  # noqa: E712
        ),
        Index("ix_product_colour", "colour_id"),
        Index("ix_product_merchant", "merchant_id"),
        # Urutan keyset pagination: (popularity_score DESC, id DESC).
        Index("ix_product_keyset", "popularity_score", "id"),
        Index("ix_product_search", "search_vector", postgresql_using="gin"),
        CheckConstraint("price_idr IS NULL OR price_idr >= 0", name="ck_product_price_positive"),
        CheckConstraint(
            "launch_year IS NULL OR launch_year BETWEEN 1990 AND 2100",
            name="ck_product_launch_year",
        ),
    )

    id: int | None = pk_bigint()
    # ID asli dari styles.csv. Membuat impor ulang bersifat idempoten (upsert
    # berdasarkan kolom ini, bukan menumpuk duplikat tiap kali seeder jalan).
    external_id: int | None = Field(
        default=None, sa_column=Column(Integer, unique=True, nullable=True)
    )
    display_name: str = Field(sa_column=Column(String(255), nullable=False))
    gender: Gender = Field(sa_column=enum_column(Gender, nullable=False))
    category_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("category.id", ondelete="RESTRICT"), nullable=False, index=True
        )
    )
    colour_id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("colour.id", ondelete="SET NULL"), nullable=True),
    )
    usage_context: UsageContext | None = Field(
        default=None, sa_column=enum_column(UsageContext, nullable=True)
    )
    season: Season | None = Field(default=None, sa_column=enum_column(Season, nullable=True))
    launch_year: int | None = Field(default=None, sa_column=Column(SmallInteger, nullable=True))
    image_url: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    # Uang tidak pernah float. Numeric(12,2) cukup sampai Rp 9.999.999.999,99.
    price_idr: float | None = Field(default=None, sa_column=Column(Numeric(12, 2), nullable=True))
    # NULL berarti produk bawaan dataset; terisi berarti milik penjual tertentu.
    merchant_id: str | None = Field(
        default=None,
        sa_column=Column(
            UUID(as_uuid=False), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=True
        ),
    )
    # NULL berarti pakai size chart bawaan kategori + gender-nya.
    size_chart_id: int | None = Field(
        default=None,
        sa_column=Column(
            BigInteger, ForeignKey("size_chart.id", ondelete="SET NULL"), nullable=True
        ),
    )
    # Dipakai sebagai tie-breaker peringkat dan kunci keyset pagination.
    popularity_score: float = Field(
        sa_column=Column(Float, nullable=False, server_default="0"), default=0.0
    )
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"), default=True
    )
    # Kolom ter-generate: Postgres yang menghitung, aplikasi tidak pernah menulisnya.
    search_vector: str | None = Field(
        default=None,
        sa_column=Column(
            TSVECTOR,
            Computed("to_tsvector('simple', coalesce(display_name, ''))", persisted=True),
            nullable=True,
        ),
    )
    created_at: datetime | None = created_at()
    updated_at: datetime | None = updated_at()


class Attribute(SQLModel, table=True):
    """Atribut halus ala Fashionpedia (294 label: material, pattern, neckline, ...).

    Dipisah dari `product` karena jumlah atribut per produk bervariasi dan
    daftarnya akan terus bertambah seiring model AI ditingkatkan. Menaruhnya
    sebagai kolom berarti ALTER TABLE tiap kali ada label baru.
    """

    __tablename__ = "attribute"
    __table_args__ = (UniqueConstraint("group_name", "name", name="uq_attribute_group_name"),)

    id: int | None = pk_bigint()
    group_name: str = Field(sa_column=Column(String(48), nullable=False, index=True))
    name: str = Field(sa_column=Column(String(80), nullable=False))
    slug: str = Field(sa_column=Column(String(128), nullable=False, unique=True, index=True))
    created_at: datetime | None = created_at()


class ProductAttribute(SQLModel, table=True):
    """Relasi many-to-many produk <-> atribut, plus jejak asal labelnya.

    `source` dan `model_version` membuat label hasil model bisa dibedakan dari
    label manual, dan membuat hasil model lama bisa dihapus selektif saat model
    baru dirilis, tanpa menyentuh anotasi manusia.
    """

    __tablename__ = "product_attribute"
    __table_args__ = (
        Index("ix_product_attribute_attr", "attribute_id"),
        CheckConstraint("confidence BETWEEN 0 AND 1", name="ck_product_attribute_confidence"),
    )

    product_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("product.id", ondelete="CASCADE"), primary_key=True
        )
    )
    attribute_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("attribute.id", ondelete="CASCADE"), primary_key=True
        )
    )
    confidence: float = Field(
        sa_column=Column(Float, nullable=False, server_default="1.0"), default=1.0
    )
    source: str = Field(
        sa_column=Column(String(16), nullable=False, server_default="dataset"), default="dataset"
    )
    model_version: str | None = Field(default=None, sa_column=Column(String(48), nullable=True))
    created_at: datetime | None = created_at()
