"""Basis pengetahuan gaya: palet warna per undertone dan aturan kecocokan.

Dua tabel di file ini adalah otak dari rekomendasi versi pertama. Model AI yang
dipasang kemudian tidak menggantikannya, tetapi menulis baris baru ke
`style_rule` dengan `source='learned'`. Artinya bobot hasil belajar dan aturan
dari stylist hidup di tabel yang sama, bisa dibandingkan, dan bisa dimatikan
satu per satu lewat `is_active` tanpa deploy ulang.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlmodel import Field, SQLModel

from app.models.base import created_at, enum_column, pk_bigint, updated_at
from app.models.enums import ColourAffinity, RuleSubject, Undertone


class UndertonePalette(SQLModel, table=True):
    """Peta undertone kulit -> warna yang mendukung atau mematikan.

    Primary key gabungan (undertone, colour_id): tidak butuh surrogate key karena
    pasangan itu sendiri sudah unik, dan tabelnya kecil (4 undertone x ~50 warna).
    """

    __tablename__ = "undertone_palette"

    undertone: Undertone = Field(sa_column=enum_column(Undertone, primary_key=True))
    colour_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("colour.id", ondelete="CASCADE"), primary_key=True
        )
    )
    affinity: ColourAffinity = Field(sa_column=enum_column(ColourAffinity, nullable=False))
    # -1.0 (sangat dihindari) sampai 1.0 (sangat dianjurkan).
    weight: float = Field(sa_column=Column(Float, nullable=False, server_default="0"), default=0.0)
    rationale: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime | None = created_at()

    __table_args__ = (CheckConstraint("weight BETWEEN -1 AND 1", name="ck_palette_weight"),)


class StyleRule(SQLModel, table=True):
    """Satu aturan: atribut personal X mendorong atau menekan target Y.

    Target ditulis sebagai tiga kolom foreign key yang saling eksklusif, bukan
    satu kolom `target_id` polimorfik. Dengan begitu Postgres tetap menjaga
    integritas referensial, dan kategori atau warna tidak bisa terhapus sambil
    meninggalkan aturan yang menunjuk ke ketiadaan.
    """

    __tablename__ = "style_rule"
    __table_args__ = (
        CheckConstraint(
            "num_nonnulls(target_category_id, target_attribute_id, target_colour_id) = 1",
            name="ck_style_rule_single_target",
        ),
        CheckConstraint("weight BETWEEN -1 AND 1", name="ck_style_rule_weight"),
        Index("ix_style_rule_subject", "subject", "subject_value", "is_active"),
        Index(
            "uq_style_rule_target",
            "subject",
            "subject_value",
            "target_category_id",
            "target_attribute_id",
            "target_colour_id",
            unique=True,
            postgresql_nulls_not_distinct=True,
        ),
    )

    id: int | None = pk_bigint()
    subject: RuleSubject = Field(sa_column=enum_column(RuleSubject, nullable=False))
    # Nilai enum sesuai `subject`, misal "pear" untuk body_shape, "round" untuk face_shape.
    subject_value: str = Field(sa_column=Column(String(32), nullable=False))

    target_category_id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("category.id", ondelete="CASCADE"), nullable=True),
    )
    target_attribute_id: int | None = Field(
        default=None,
        sa_column=Column(
            BigInteger, ForeignKey("attribute.id", ondelete="CASCADE"), nullable=True
        ),
    )
    target_colour_id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("colour.id", ondelete="CASCADE"), nullable=True),
    )

    weight: float = Field(sa_column=Column(Float, nullable=False), default=0.0)
    # Ditampilkan apa adanya ke pembeli sebagai alasan rekomendasi.
    rationale: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    # 'stylist' = kurasi manusia, 'learned' = hasil model, 'dataset' = turunan data.
    source: str = Field(
        sa_column=Column(String(16), nullable=False, server_default="stylist"), default="stylist"
    )
    model_version: str | None = Field(default=None, sa_column=Column(String(48), nullable=True))
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"), default=True
    )
    created_at: datetime | None = created_at()
    updated_at: datetime | None = updated_at()
