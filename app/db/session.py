"""Engine dan session Postgres (async).

Dua engine dipisah sejak awal: `write` selalu ke primary, `read` bisa diarahkan
ke read replica lewat DATABASE_REPLICA_URL. Selama replica belum ada, keduanya
menunjuk ke instans yang sama, jadi menambah replica nanti tidak perlu menyentuh
kode endpoint sama sekali.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from functools import lru_cache
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings, get_settings


def _connect_args(settings: Settings) -> dict[str, Any]:
    args: dict[str, Any] = {
        "server_settings": {
            # Query yang lebih lama dari ini dibunuh server, bukan menggantung
            # koneksi sampai pool habis.
            "statement_timeout": str(settings.db_statement_timeout_ms),
            "idle_in_transaction_session_timeout": "10000",
            "application_name": "coba-api",
            "jit": "off",
        },
        "command_timeout": settings.db_statement_timeout_ms / 1000 + 1,
    }
    if settings.db_disable_prepared_statements:
        args["statement_cache_size"] = 0
    return args


def _make_engine(url: str, settings: Settings, *, readonly: bool) -> AsyncEngine:
    return create_async_engine(
        url,
        echo=settings.db_echo,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        # Buang koneksi mati sebelum dipakai (umum terjadi di belakang load balancer).
        pool_pre_ping=True,
        pool_recycle=settings.db_pool_recycle_seconds,
        pool_timeout=10,
        connect_args=_connect_args(settings),
        execution_options={"postgresql_readonly": True} if readonly else {},
    )


@lru_cache(maxsize=1)
def get_write_engine() -> AsyncEngine:
    settings = get_settings()
    return _make_engine(settings.database_url, settings, readonly=False)


@lru_cache(maxsize=1)
def get_read_engine() -> AsyncEngine:
    settings = get_settings()
    if not settings.database_replica_url:
        return get_write_engine()
    return _make_engine(settings.database_replica_url, settings, readonly=True)


@lru_cache(maxsize=1)
def get_write_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        get_write_engine(),
        class_=AsyncSession,
        # Objek tetap bisa dibaca setelah commit; menghindari lazy refresh
        # yang di jalur async akan meledak jadi MissingGreenlet.
        expire_on_commit=False,
        autoflush=False,
    )


@lru_cache(maxsize=1)
def get_read_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        get_read_engine(), class_=AsyncSession, expire_on_commit=False, autoflush=False
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency untuk endpoint yang menulis. Commit/rollback dikelola di sini."""
    async with get_write_sessionmaker()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db_ro() -> AsyncGenerator[AsyncSession, None]:
    """Dependency untuk endpoint baca. Tidak pernah commit."""
    async with get_read_sessionmaker()() as session:
        yield session


async def ping_database() -> bool:
    try:
        async with get_read_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:  # hasilnya dipakai probe kesehatan, bukan dilempar ke klien
        return False


async def dispose_engines() -> None:
    await get_write_engine().dispose()
    if get_read_engine() is not get_write_engine():
        await get_read_engine().dispose()
