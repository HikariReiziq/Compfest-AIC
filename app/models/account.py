"""Akun penjual dan admin.

Pembeli sengaja tidak punya akun. Sesuai proposal, seluruh data pembeli hidup
di sesi ephemeral (Redis) dan hilang saat sesi berakhir, jadi tidak ada tabel
pembeli sama sekali di Postgres.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel

from app.models.base import created_at, enum_column, optional_datetime, updated_at
from app.models.enums import UserRole


def _uuid_pk() -> Column:
    return Column(UUID(as_uuid=False), primary_key=True)


class AppUser(SQLModel, table=True):
    """Nama tabel `app_user` karena `user` adalah kata kunci di Postgres.

    PK memakai UUID, bukan bigint berurutan, supaya jumlah dan urutan pendaftaran
    akun tidak bisa disimpulkan dari ID yang muncul di URL.
    """

    __tablename__ = "app_user"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), sa_column=_uuid_pk())
    # Disimpan selalu dalam huruf kecil; keunikan ditegakkan oleh indeks unik.
    email: str = Field(sa_column=Column(String(320), nullable=False, unique=True, index=True))
    password_hash: str = Field(sa_column=Column(Text, nullable=False))
    full_name: str | None = Field(default=None, sa_column=Column(String(120), nullable=True))
    role: UserRole = Field(
        default=UserRole.MERCHANT,
        sa_column=enum_column(UserRole, nullable=False, server_default=UserRole.MERCHANT.value),
    )
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"), default=True
    )
    email_verified_at: datetime | None = optional_datetime()
    last_login_at: datetime | None = optional_datetime()
    created_at: datetime | None = created_at()
    updated_at: datetime | None = updated_at()


class RefreshToken(SQLModel, table=True):
    """Refresh token yang bisa dicabut, disimpan sebagai hash.

    Yang masuk database hanya SHA-256 dari token. Kalau dump database bocor,
    isinya tidak bisa dipakai untuk login. Kolom `replaced_by_jti` merekam rantai
    rotasi sehingga pemakaian ulang token lama bisa dideteksi sebagai pencurian
    token dan seluruh rantainya dicabut sekaligus.
    """

    __tablename__ = "refresh_token"
    __table_args__ = (
        Index("ix_refresh_token_user_active", "user_id", "revoked_at"),
        Index("ix_refresh_token_expires", "expires_at"),
    )

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), sa_column=_uuid_pk())
    user_id: str = Field(
        sa_column=Column(
            UUID(as_uuid=False),
            ForeignKey("app_user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    jti: str = Field(sa_column=Column(String(32), nullable=False, unique=True, index=True))
    token_hash: str = Field(sa_column=Column(String(64), nullable=False, unique=True))
    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    revoked_at: datetime | None = optional_datetime()
    replaced_by_jti: str | None = Field(default=None, sa_column=Column(String(32), nullable=True))
    # Hash, bukan nilai asli: cukup untuk mendeteksi anomali tanpa menyimpan PII.
    user_agent_hash: str | None = Field(default=None, sa_column=Column(String(64), nullable=True))
    ip_hash: str | None = Field(default=None, sa_column=Column(String(64), nullable=True))
    created_at: datetime | None = created_at()
