"""Konfigurasi kuesioner bertahap.

Pertanyaannya durable (konfigurasi produk), jawabannya tidak. Jawaban pembeli
hidup di Redis dan ikut terhapus saat sesi berakhir, sesuai janji privasi di
proposal. Karena itu di sini tidak ada tabel `answer` sama sekali.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.models.base import created_at, enum_column, pk_bigint, updated_at
from app.models.enums import QuestionInputType


class QuestionBatch(SQLModel, table=True):
    """Satu batch pertanyaan. Selesai satu batch, rekomendasi langsung keluar."""

    __tablename__ = "question_batch"
    __table_args__ = (
        Index("ix_question_batch_order", "order_index", "is_active"),
        CheckConstraint("order_index >= 0", name="ck_question_batch_order"),
    )

    id: int | None = pk_bigint()
    code: str = Field(sa_column=Column(String(48), nullable=False, unique=True, index=True))
    order_index: int = Field(sa_column=Column(SmallInteger, nullable=False))
    title: str = Field(sa_column=Column(String(160), nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    # Slot yang boleh keluar sebagai output setelah batch ini dijawab,
    # misal ["top"] untuk batch pertama dan ["top","bottom"] untuk batch kedua.
    unlocks_slots: list[str] = Field(
        default_factory=list, sa_column=Column(JSONB, nullable=False, server_default="[]")
    )
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"), default=True
    )
    created_at: datetime | None = created_at()
    updated_at: datetime | None = updated_at()


class Question(SQLModel, table=True):
    """Satu pertanyaan di dalam batch.

    `options` disimpan sebagai JSONB, bukan tabel `question_option` tersendiri.
    Pilihan jawaban tidak pernah dirujuk foreign key dari tabel lain (jawaban
    tidak disimpan di Postgres), selalu dibaca utuh bersama pertanyaannya, dan
    jumlahnya kecil. Tabel terpisah hanya akan menambah satu join tanpa manfaat.
    """

    __tablename__ = "question"
    __table_args__ = (
        Index("ix_question_batch_id_order", "batch_id", "order_index"),
        CheckConstraint("jsonb_typeof(options) = 'array'", name="ck_question_options_array"),
    )

    id: int | None = pk_bigint()
    batch_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("question_batch.id", ondelete="CASCADE"), nullable=False
        )
    )
    code: str = Field(sa_column=Column(String(48), nullable=False, unique=True, index=True))
    order_index: int = Field(sa_column=Column(SmallInteger, nullable=False))
    prompt: str = Field(sa_column=Column(Text, nullable=False))
    input_type: QuestionInputType = Field(sa_column=enum_column(QuestionInputType, nullable=False))
    # Bentuk: [{"value": "formal", "label": "Formal"}, ...]
    options: list[dict[str, Any]] = Field(
        default_factory=list, sa_column=Column(JSONB, nullable=False, server_default="[]")
    )
    # Atribut profil yang diisi oleh jawaban ini, misal "occasion" atau "fit_preference".
    maps_to: str = Field(sa_column=Column(String(48), nullable=False, index=True))
    is_required: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"), default=True
    )
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"), default=True
    )
    created_at: datetime | None = created_at()
    updated_at: datetime | None = updated_at()
