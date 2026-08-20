"""Ukuran tubuh, size chart, dan acuan antropometri Indonesia."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel

from app.models.base import created_at, enum_column, pk_bigint, updated_at
from app.models.enums import Gender, MeasurementUnit


class MeasurementKey(SQLModel, table=True):
    """Kosakata dimensi tubuh (chest_circumference, waist_circumference, ...).

    Tabel kecil ini yang membuat format panjang pada `size_chart_entry` tetap
    disiplin: nama dimensi tidak bisa salah ketik karena dijaga foreign key.
    """

    __tablename__ = "measurement_key"

    id: int | None = pk_bigint()
    key: str = Field(sa_column=Column(String(48), nullable=False, unique=True, index=True))
    label: str = Field(sa_column=Column(String(96), nullable=False))
    unit: MeasurementUnit = Field(sa_column=enum_column(MeasurementUnit, nullable=False))
    body_part: str | None = Field(default=None, sa_column=Column(String(32), nullable=True))
    # Dimensi inti = yang bisa diperoleh dari scan kamera dan dipakai pemilihan ukuran.
    is_core: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="false"), default=False
    )
    created_at: datetime | None = created_at()


class SizeChart(SQLModel, table=True):
    """Satu tabel ukuran yang berlaku untuk kombinasi kategori + gender + region.

    Dibuat berversi, bukan ditimpa. Rekomendasi yang pernah keluar tetap bisa
    dijelaskan ulang memakai versi chart yang berlaku saat itu.
    """

    __tablename__ = "size_chart"
    __table_args__ = (
        UniqueConstraint("code", "version", name="uq_size_chart_code_version"),
        Index("ix_size_chart_lookup", "category_id", "gender", "region", "is_active"),
    )

    id: int | None = pk_bigint()
    code: str = Field(sa_column=Column(String(64), nullable=False, index=True))
    version: int = Field(
        sa_column=Column(SmallInteger, nullable=False, server_default="1"), default=1
    )
    name: str = Field(sa_column=Column(String(120), nullable=False))
    region: str = Field(
        sa_column=Column(String(8), nullable=False, server_default="ID"), default="ID"
    )
    gender: Gender | None = Field(default=None, sa_column=enum_column(Gender, nullable=True))
    category_id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("category.id", ondelete="CASCADE"), nullable=True),
    )
    merchant_id: str | None = Field(
        default=None,
        sa_column=Column(
            UUID(as_uuid=False), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=True
        ),
    )
    # Contoh: "SNI 2161:2010", "Antropometri Indonesia 2023", "merchant".
    source: str | None = Field(default=None, sa_column=Column(String(120), nullable=True))
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"), default=True
    )
    created_at: datetime | None = created_at()
    updated_at: datetime | None = updated_at()


class SizeChartEntry(SQLModel, table=True):
    """Isi size chart dalam format panjang: satu baris = satu dimensi satu ukuran.

    Format lebar (kolom chest, waist, hip, inseam, ...) akan penuh NULL karena
    tiap jenis garmen memakai dimensi berbeda: kaos butuh lingkar dada dan
    panjang badan, celana butuh pinggang dan inseam, kacamata butuh lebar wajah.
    Format panjang membuat skema berhenti berubah setiap kali ada jenis garmen
    baru. Biaya pivot saat dibaca ditutup dengan cache Redis per size chart.
    """

    __tablename__ = "size_chart_entry"
    __table_args__ = (
        UniqueConstraint(
            "size_chart_id", "size_label", "measurement_key_id", name="uq_size_chart_entry"
        ),
        Index("ix_size_chart_entry_chart", "size_chart_id", "sort_order"),
        CheckConstraint("min_value <= max_value", name="ck_size_chart_entry_range"),
        CheckConstraint("min_value >= 0", name="ck_size_chart_entry_positive"),
    )

    id: int | None = pk_bigint()
    size_chart_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("size_chart.id", ondelete="CASCADE"), nullable=False
        )
    )
    size_label: str = Field(sa_column=Column(String(12), nullable=False))
    # Urutan tampil (S=1, M=2, L=3). Tanpa ini "L" akan muncul sebelum "M" secara alfabet.
    sort_order: int = Field(sa_column=Column(SmallInteger, nullable=False), default=0)
    measurement_key_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("measurement_key.id", ondelete="RESTRICT"), nullable=False
        )
    )
    min_value: float = Field(sa_column=Column(Numeric(6, 2), nullable=False))
    max_value: float = Field(sa_column=Column(Numeric(6, 2), nullable=False))


class AnthropometryReference(SQLModel, table=True):
    """Persentil antropometri populasi Indonesia.

    Dipakai untuk mengoreksi hasil estimasi tubuh dari model yang dilatih pada
    populasi barat (BodyM), dan sebagai dasar menyusun size chart acuan.
    """

    __tablename__ = "anthropometry_reference"
    __table_args__ = (
        UniqueConstraint(
            "measurement_key_id",
            "gender",
            "age_min",
            "age_max",
            "percentile",
            name="uq_anthropometry_reference",
        ),
        CheckConstraint("percentile IN (5, 50, 95)", name="ck_anthropometry_percentile"),
        CheckConstraint("age_min <= age_max", name="ck_anthropometry_age_range"),
    )

    id: int | None = pk_bigint()
    measurement_key_id: int = Field(
        sa_column=Column(
            BigInteger,
            ForeignKey("measurement_key.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    gender: Gender = Field(sa_column=enum_column(Gender, nullable=False))
    age_min: int = Field(sa_column=Column(SmallInteger, nullable=False))
    age_max: int = Field(sa_column=Column(SmallInteger, nullable=False))
    percentile: int = Field(sa_column=Column(SmallInteger, nullable=False))
    value_cm: float = Field(sa_column=Column(Numeric(6, 2), nullable=False))
    source: str = Field(sa_column=Column(Text, nullable=False))
    source_year: int | None = Field(default=None, sa_column=Column(SmallInteger, nullable=True))
    created_at: datetime | None = created_at()
