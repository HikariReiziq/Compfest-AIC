"""Primitif keamanan: hashing password dan token JWT.

Argon2id dipakai sebagai KDF utama (pemenang Password Hashing Competition,
tahan GPU cracking). Hashing sengaja mahal secara CPU, jadi setiap pemanggilan
dari jalur async dibungkus threadpool supaya tidak memblokir event loop.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import anyio.to_thread
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import Settings, get_settings

TokenType = Literal["access", "refresh"]

JWT_ISSUER = "coba-api"
JWT_AUDIENCE = "coba-client"

# Parameter OWASP 2024 untuk Argon2id: m=64 MiB, t=3, p=4.
_hasher = PasswordHasher(
    time_cost=3, memory_cost=64 * 1024, parallelism=4, hash_len=32, salt_len=16
)


# --------------------------------------------------------------------------- #
# Password
# --------------------------------------------------------------------------- #
def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    """True bila hash dibuat dengan parameter lama dan layak di-upgrade saat login."""
    try:
        return _hasher.check_needs_rehash(hashed)
    except InvalidHashError:
        return True


async def hash_password_async(plain: str) -> str:
    return await anyio.to_thread.run_sync(hash_password, plain)


async def verify_password_async(plain: str, hashed: str) -> bool:
    return await anyio.to_thread.run_sync(verify_password, plain, hashed)


# Hash dummy dengan parameter yang sama. Dipakai saat email tidak ditemukan agar
# waktu respons login seragam dan tidak membocorkan email mana yang terdaftar.
_DUMMY_HASH = _hasher.hash("dummy-password-for-timing-equalisation")


async def waste_time_like_verify() -> None:
    await anyio.to_thread.run_sync(verify_password, "wrong", _DUMMY_HASH)


# --------------------------------------------------------------------------- #
# JWT
# --------------------------------------------------------------------------- #
@dataclass(frozen=True, slots=True)
class IssuedToken:
    token: str
    jti: str
    expires_at: datetime


def _create_token(
    subject: str,
    token_type: TokenType,
    ttl_seconds: int,
    settings: Settings,
    extra_claims: dict[str, Any] | None = None,
) -> IssuedToken:
    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=ttl_seconds)
    jti = uuid.uuid4().hex
    payload: dict[str, Any] = {
        "sub": subject,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": jti,
        # Klaim `typ` mencegah token refresh dipakai sebagai token akses.
        "typ": token_type,
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(
        payload, settings.jwt_secret.get_secret_value(), algorithm=settings.jwt_algorithm
    )
    return IssuedToken(token=token, jti=jti, expires_at=expires_at)


def create_access_token(
    subject: str, *, role: str, settings: Settings | None = None
) -> IssuedToken:
    s = settings or get_settings()
    return _create_token(subject, "access", s.access_token_ttl_seconds, s, {"role": role})


def create_refresh_token(subject: str, *, settings: Settings | None = None) -> IssuedToken:
    s = settings or get_settings()
    return _create_token(subject, "refresh", s.refresh_token_ttl_seconds, s)


class TokenError(Exception):
    """Token tidak valid, kedaluwarsa, atau tipenya tidak sesuai."""


def decode_token(
    token: str, *, expected_type: TokenType, settings: Settings | None = None
) -> dict[str, Any]:
    s = settings or get_settings()
    try:
        payload = jwt.decode(
            token,
            s.jwt_secret.get_secret_value(),
            # Daftar algoritma dikunci: mencegah serangan `alg: none` / algorithm confusion.
            algorithms=[s.jwt_algorithm],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
            options={"require": ["exp", "iat", "nbf", "sub", "jti", "typ"]},
        )
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc

    if payload.get("typ") != expected_type:
        raise TokenError(f"tipe token harus '{expected_type}'")
    return payload


# --------------------------------------------------------------------------- #
# Opaque token / identifier sesi
# --------------------------------------------------------------------------- #
def new_session_id() -> str:
    """ID sesi try-on: acak kriptografis, tanpa informasi apa pun tentang user."""
    return secrets.token_urlsafe(32)


def fingerprint(value: str) -> str:
    """Hash satu arah untuk menyimpan token/IP tanpa menyimpan nilai aslinya."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a, b)
