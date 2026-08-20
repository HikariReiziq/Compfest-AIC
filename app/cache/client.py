"""Koneksi Redis.

Satu connection pool dipakai bersama seluruh aplikasi. `decode_responses`
sengaja dibiarkan False karena semua nilai disimpan sebagai bytes hasil orjson,
yang jauh lebih cepat daripada str bawaan.
"""

from __future__ import annotations

from functools import lru_cache

from redis.asyncio import Redis

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_redis() -> Redis:
    settings = get_settings()
    return Redis.from_url(
        settings.redis_url,
        decode_responses=False,
        max_connections=64,
        socket_timeout=2.0,
        socket_connect_timeout=2.0,
        # Deteksi koneksi mati sebelum dipakai untuk perintah asli.
        health_check_interval=30,
        retry_on_timeout=True,
    )


async def ping_redis() -> bool:
    try:
        return bool(await get_redis().ping())
    except Exception:  # dipakai probe kesehatan, tidak dilempar ke klien
        return False


async def close_redis() -> None:
    await get_redis().aclose()
