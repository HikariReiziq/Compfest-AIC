"""Agregat umpan balik rekomendasi.

Proposal menjanjikan riwayat feedback per pembeli hilang bersama sesinya, dan
janji itu dipegang: tidak ada session id, user id, IP, maupun perangkat di sini.
Yang tersimpan hanya cacah pada irisan (hari, produk, bentuk tubuh, undertone,
occasion), sehingga baris mana pun mewakili banyak orang dan tidak bisa
dikembalikan ke individu. Ini yang membuat rekomendasi bisa membaik lintas sesi.

Perilaku ini bisa dimatikan lewat FEEDBACK_AGGREGATE_ENABLED=false.
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    Date,
    ForeignKey,
    Index,
    Integer,
)
from sqlmodel import Field, SQLModel

from app.models.base import created_at, enum_column, pk_bigint, updated_at
from app.models.enums import BodyShape, Undertone, UsageContext


class RecommendationFeedbackDaily(SQLModel, table=True):
    """Satu baris = satu irisan per hari. Ditulis dengan UPSERT + increment."""

    __tablename__ = "recommendation_feedback_daily"
    __table_args__ = (
        Index(
            "uq_feedback_slice",
            "day",
            "product_id",
            "body_shape",
            "undertone",
            "occasion",
            unique=True,
            # NULL diperlakukan sama supaya irisan tanpa atribut tetap tergabung
            # ke satu baris, bukan membuat baris baru setiap kali.
            postgresql_nulls_not_distinct=True,
        ),
        Index("ix_feedback_product_day", "product_id", "day"),
        CheckConstraint(
            "likes >= 0 AND dislikes >= 0 AND impressions >= 0", name="ck_feedback_counts"
        ),
    )

    id: int | None = pk_bigint()
    day: date = Field(sa_column=Column(Date, nullable=False))
    product_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("product.id", ondelete="CASCADE"), nullable=False
        )
    )
    body_shape: BodyShape | None = Field(
        default=None, sa_column=enum_column(BodyShape, nullable=True)
    )
    undertone: Undertone | None = Field(
        default=None, sa_column=enum_column(Undertone, nullable=True)
    )
    occasion: UsageContext | None = Field(
        default=None, sa_column=enum_column(UsageContext, nullable=True)
    )

    impressions: int = Field(
        sa_column=Column(Integer, nullable=False, server_default="0"), default=0
    )
    likes: int = Field(sa_column=Column(Integer, nullable=False, server_default="0"), default=0)
    dislikes: int = Field(sa_column=Column(Integer, nullable=False, server_default="0"), default=0)

    created_at: datetime | None = created_at()
    updated_at: datetime | None = updated_at()
