"""Alur autentikasi penjual.

Dua keputusan yang layak disorot:

1. Refresh token dirotasi setiap kali dipakai, dan yang lama langsung dicabut.
   Kalau token lama muncul lagi setelah dirotasi, itu tanda token dicuri, dan
   seluruh rantai token milik akun tersebut dicabut sekaligus.
2. Login memakan waktu yang kurang lebih sama baik email terdaftar maupun tidak,
   supaya lama respons tidak bisa dipakai memetakan email mana yang punya akun.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AuthenticationError, ConflictError
from app.core.security import (
    IssuedToken,
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    fingerprint,
    hash_password_async,
    needs_rehash,
    verify_password_async,
    waste_time_like_verify,
)
from app.models.account import AppUser, RefreshToken
from app.models.enums import UserRole
from app.schemas.auth import TokenPair


async def register(
    db: AsyncSession, *, email: str, password: str, full_name: str | None
) -> AppUser:
    existing = (
        await db.execute(select(AppUser.id).where(AppUser.email == email))
    ).scalar_one_or_none()
    if existing:
        raise ConflictError("Email sudah terdaftar.")

    user = AppUser(
        email=email,
        password_hash=await hash_password_async(password),
        full_name=full_name,
        role=UserRole.MERCHANT,
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate(db: AsyncSession, *, email: str, password: str) -> AppUser:
    user = (
        await db.execute(select(AppUser).where(AppUser.email == email))
    ).scalar_one_or_none()

    if user is None:
        # Tetap bayar biaya hashing agar durasinya menyerupai jalur sukses.
        await waste_time_like_verify()
        raise AuthenticationError("Email atau password salah.")

    if not await verify_password_async(password, user.password_hash):
        raise AuthenticationError("Email atau password salah.")

    if not user.is_active:
        raise AuthenticationError("Akun dinonaktifkan.")

    # Parameter Argon2 dinaikkan seiring waktu; upgrade hash saat login sukses.
    if needs_rehash(user.password_hash):
        user.password_hash = await hash_password_async(password)

    user.last_login_at = datetime.now(UTC)
    return user


async def issue_token_pair(
    db: AsyncSession,
    user: AppUser,
    *,
    user_agent: str | None = None,
    client_ip: str | None = None,
    replaces_jti: str | None = None,
) -> TokenPair:
    settings = get_settings()
    access: IssuedToken = create_access_token(user.id, role=user.role, settings=settings)
    refresh: IssuedToken = create_refresh_token(user.id, settings=settings)

    db.add(
        RefreshToken(
            user_id=user.id,
            jti=refresh.jti,
            # Yang disimpan hash-nya, bukan tokennya.
            token_hash=fingerprint(refresh.token),
            expires_at=refresh.expires_at,
            user_agent_hash=fingerprint(user_agent) if user_agent else None,
            ip_hash=fingerprint(client_ip) if client_ip else None,
        )
    )
    if replaces_jti:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.jti == replaces_jti)
            .values(revoked_at=datetime.now(UTC), replaced_by_jti=refresh.jti)
        )

    return TokenPair(
        access_token=access.token,
        refresh_token=refresh.token,
        expires_in=settings.access_token_ttl_seconds,
    )


async def rotate_refresh_token(
    db: AsyncSession, raw_token: str, *, user_agent: str | None = None, client_ip: str | None = None
) -> TokenPair:
    try:
        payload = decode_token(raw_token, expected_type="refresh")
    except TokenError as exc:
        raise AuthenticationError("Refresh token tidak valid.") from exc

    stored = (
        await db.execute(select(RefreshToken).where(RefreshToken.jti == payload["jti"]))
    ).scalar_one_or_none()

    if stored is None or stored.token_hash != fingerprint(raw_token):
        raise AuthenticationError("Refresh token tidak dikenal.")

    if stored.revoked_at is not None:
        # Token yang sudah dirotasi dipakai lagi: perlakukan sebagai kebocoran
        # dan putuskan semua sesi akun itu.
        await revoke_all_for_user(db, stored.user_id)
        raise AuthenticationError("Refresh token sudah dipakai. Semua sesi dicabut.")

    if stored.expires_at <= datetime.now(UTC):
        raise AuthenticationError("Refresh token kedaluwarsa.")

    user = (
        await db.execute(select(AppUser).where(AppUser.id == stored.user_id))
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        raise AuthenticationError("Akun tidak aktif.")

    return await issue_token_pair(
        db, user, user_agent=user_agent, client_ip=client_ip, replaces_jti=stored.jti
    )


async def revoke_all_for_user(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    return result.rowcount or 0


async def revoke_one(db: AsyncSession, raw_token: str) -> None:
    try:
        payload = decode_token(raw_token, expected_type="refresh")
    except TokenError:
        # Logout dengan token rusak tetap dianggap berhasil: klien memang ingin keluar.
        return
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.jti == payload["jti"], RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
