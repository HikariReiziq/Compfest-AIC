"""Dependency bersama untuk seluruh endpoint."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.ratelimit import check_rate_limit
from app.core.config import Settings, get_settings
from app.core.errors import AuthenticationError, ForbiddenError, RateLimitError
from app.core.security import TokenError, decode_token
from app.db.session import get_db, get_db_ro
from app.models.account import AppUser
from app.models.enums import UserRole

DbSession = Annotated[AsyncSession, Depends(get_db)]
DbSessionRO = Annotated[AsyncSession, Depends(get_db_ro)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def client_identity(request: Request) -> str:
    """Identitas untuk rate limit.

    X-Forwarded-For hanya boleh dipercaya bila ada proxy tepercaya di depan
    aplikasi. Di produksi, jalankan uvicorn dengan --forwarded-allow-ips supaya
    Starlette yang memvalidasi, dan jangan menambah kepercayaan di lapisan ini.
    """
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


async def get_current_user(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> AppUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError("Header Authorization tidak ada.")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token, expected_type="access")
    except TokenError as exc:
        raise AuthenticationError("Token tidak valid atau kedaluwarsa.") from exc

    user = (
        await db.execute(select(AppUser).where(AppUser.id == payload["sub"]))
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        raise AuthenticationError("Akun tidak ditemukan atau nonaktif.")
    return user


CurrentUser = Annotated[AppUser, Depends(get_current_user)]


async def require_admin(user: CurrentUser) -> AppUser:
    if user.role != UserRole.ADMIN:
        raise ForbiddenError("Butuh hak admin.")
    return user


AdminUser = Annotated[AppUser, Depends(require_admin)]


class RateLimit:
    """Dependency rate limit yang bisa dipasang per endpoint.

    Contoh: `dependencies=[Depends(RateLimit("login", per_minute=5))]`.
    """

    def __init__(self, scope: str, *, per_minute: int | None = None) -> None:
        self.scope = scope
        self.per_minute = per_minute

    async def __call__(self, request: Request, settings: AppSettings) -> None:
        if not settings.rate_limit_enabled:
            return
        limit = self.per_minute or settings.rate_limit_anon_per_minute
        result = await check_rate_limit(self.scope, client_identity(request), limit=limit)
        if not result.allowed:
            raise RateLimitError(
                f"Batas {limit} permintaan per menit terlampaui.",
                detail={"retry_after_seconds": result.reset_seconds},
            )
