"""Helper kolom yang dipakai berulang oleh seluruh tabel.

Setiap helper mengembalikan objek Column *baru*. SQLAlchemy tidak mengizinkan
satu instans Column dipakai di lebih dari satu tabel, jadi pola mixin biasa
tidak aman di sini.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import BigInteger, Column, DateTime, Identity
from sqlalchemy import Enum as SAEnum
from sqlalchemy.sql import func
from sqlmodel import Field


def enum_column(enum_cls: type[StrEnum], **kwargs: Any) -> Column:
    """VARCHAR + CHECK constraint, bukan ENUM native Postgres."""
    return Column(
        SAEnum(
            enum_cls,
            native_enum=False,
            length=32,
            validate_strings=True,
            values_callable=lambda e: [m.value for m in e],
        ),
        **kwargs,
    )


def pk_bigint() -> Any:
    """Primary key untuk tabel bervolume besar (katalog, entri size chart)."""
    return Field(
        default=None,
        sa_column=Column(BigInteger, Identity(always=False), primary_key=True),
    )


def created_at() -> Any:
    return Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
        ),
    )


def updated_at() -> Any:
    return Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        ),
    )


def optional_datetime(*, index: bool = False) -> Any:
    return Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True, index=index)
    )


__all__ = [
    "created_at",
    "datetime",
    "enum_column",
    "optional_datetime",
    "pk_bigint",
    "updated_at",
]
