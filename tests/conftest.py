"""Fixture bersama untuk test."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import suppress

import pytest
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("ENV", "test")


@pytest.fixture(scope="session")
def settings():
    from app.core.config import get_settings

    return get_settings()


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Klien yang bicara langsung ke aplikasi ASGI, tanpa membuka soket."""
    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
async def reset_koneksi() -> AsyncIterator[None]:
    """Buang koneksi yang di-cache di akhir setiap test.

    Engine SQLAlchemy dan klien Redis disimpan lewat lru_cache supaya di
    produksi hanya ada satu pool per proses. Di test, tiap fungsi mendapat event
    loop baru, sehingga pool sisa test sebelumnya terikat ke loop yang sudah
    tertutup. Fixture ini yang memutus keterikatan itu.
    """
    yield

    from app.cache.client import get_redis
    from app.db.session import (
        dispose_engines,
        get_read_engine,
        get_read_sessionmaker,
        get_write_engine,
        get_write_sessionmaker,
    )

    with suppress(Exception):
        await get_redis().aclose()
    get_redis.cache_clear()

    with suppress(Exception):
        await dispose_engines()
    for cached_factory in (
        get_write_engine,
        get_read_engine,
        get_write_sessionmaker,
        get_read_sessionmaker,
    ):
        cached_factory.cache_clear()
