"""Pola cache-aside dengan pengaman yang biasanya baru dipikirkan setelah insiden.

Tiga masalah klasik cache yang ditangani di sini:

1. Cache stampede. Saat satu kunci panas kedaluwarsa, ratusan request menemukan
   cache kosong pada saat yang sama dan semuanya menyerbu Postgres. Diatasi
   dengan kunci single-flight: hanya satu request yang boleh menghitung ulang,
   sisanya menunggu sebentar lalu membaca hasilnya.
2. Cache penetration. Permintaan berulang untuk data yang memang tidak ada tidak
   pernah tertangkap cache dan selalu jatuh ke database. Diatasi dengan negative
   caching berumur pendek.
3. Cache avalanche. Banyak kunci diisi bersamaan lalu kedaluwarsa bersamaan.
   Diatasi dengan jitter pada TTL.
"""

from __future__ import annotations

import asyncio
import secrets
from collections.abc import Awaitable, Callable
from typing import Any

import orjson
from loguru import logger

from app.cache.client import get_redis
from app.core.config import get_settings

# Penanda "sudah dicek, memang tidak ada". Dibedakan dari cache miss biasa.
_NULL_SENTINEL = b"\x00__none__"
_JITTER_RATIO = 0.1

# Lepas kunci hanya bila pemiliknya masih kita. Tanpa perbandingan token,
# proses yang lambat bisa melepas kunci milik proses lain.
_RELEASE_LOCK_LUA = """
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
end
return 0
"""


def _jittered(ttl: int) -> int:
    spread = max(1, int(ttl * _JITTER_RATIO))
    return max(1, ttl - spread + secrets.randbelow(spread * 2 + 1))


def _dumps(value: Any) -> bytes:
    return orjson.dumps(value)


def _loads(raw: bytes) -> Any:
    return orjson.loads(raw)


async def cache_get(key: str) -> tuple[bool, Any]:
    """Kembalikan (ketemu, nilai). `ketemu=True` dengan nilai None berarti negative cache."""
    try:
        raw = await get_redis().get(key)
    except Exception as exc:  # Redis mati tidak boleh menjatuhkan request
        logger.warning("cache get gagal untuk {}: {}", key, exc)
        return False, None
    if raw is None:
        return False, None
    if raw == _NULL_SENTINEL:
        return True, None
    try:
        return True, _loads(raw)
    except orjson.JSONDecodeError:
        return False, None


async def cache_set(key: str, value: Any, ttl: int) -> None:
    try:
        payload = _NULL_SENTINEL if value is None else _dumps(value)
        await get_redis().set(key, payload, ex=_jittered(ttl))
    except Exception as exc:
        logger.warning("cache set gagal untuk {}: {}", key, exc)


async def cache_delete(*keys: str) -> None:
    if not keys:
        return
    try:
        await get_redis().delete(*keys)
    except Exception as exc:
        logger.warning("cache delete gagal: {}", exc)


async def cached[T](
    key: str,
    loader: Callable[[], Awaitable[T]],
    *,
    ttl: int,
    negative_ttl: int | None = None,
    allow_none: bool = True,
) -> T | None:
    """Baca dari cache, hitung lewat `loader` hanya bila perlu.

    Ketika Redis tidak bisa dihubungi, fungsi ini tidak melempar error melainkan
    langsung memanggil `loader`. Cache mati berarti sistem melambat, bukan mati.
    """
    settings = get_settings()
    negative_ttl = negative_ttl or settings.cache_ttl_negative_seconds

    found, value = await cache_get(key)
    if found:
        return value

    lock_key = f"{key}:lk"
    token = secrets.token_hex(8)
    acquired = False
    try:
        acquired = bool(
            await get_redis().set(lock_key, token, nx=True, ex=settings.cache_lock_timeout_seconds)
        )
    except Exception as exc:
        logger.warning("gagal mengambil lock cache {}: {}", lock_key, exc)

    if not acquired:
        # Beri kesempatan pemegang lock menulis hasilnya. Kalau lewat batas ini,
        # lebih baik ikut menghitung daripada menahan request pengguna.
        for delay in (0.02, 0.05, 0.1, 0.2):
            await asyncio.sleep(delay)
            found, value = await cache_get(key)
            if found:
                return value

    try:
        value = await loader()
    finally:
        if acquired:
            try:
                await get_redis().eval(_RELEASE_LOCK_LUA, 1, lock_key, token)
            except Exception as exc:
                logger.warning("gagal melepas lock cache {}: {}", lock_key, exc)

    if value is None and not allow_none:
        return None
    await cache_set(key, value, ttl if value is not None else negative_ttl)
    return value


class TTLMemoryCache:
    """Cache L1 di dalam proses untuk data kecil yang sangat sering dibaca.

    Menghemat satu perjalanan jaringan ke Redis untuk hal seperti konfigurasi
    kuesioner dan pohon kategori. Ukurannya dibatasi supaya tidak menggerogoti
    memori pod, dan TTL-nya pendek karena setiap replika punya salinan sendiri.
    """

    __slots__ = ("_data", "_max_items", "_ttl")

    def __init__(self, ttl_seconds: float = 30.0, max_items: int = 512) -> None:
        self._ttl = ttl_seconds
        self._max_items = max_items
        self._data: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> tuple[bool, Any]:
        entry = self._data.get(key)
        if entry is None:
            return False, None
        value, expires_at = entry
        if expires_at < asyncio.get_running_loop().time():
            self._data.pop(key, None)
            return False, None
        return True, value

    def set(self, key: str, value: Any) -> None:
        if len(self._data) >= self._max_items:
            # Buang seperempat isi tertua. Cukup untuk cache sekecil ini.
            for stale in list(self._data)[: self._max_items // 4]:
                self._data.pop(stale, None)
        self._data[key] = (value, asyncio.get_running_loop().time() + self._ttl)

    def clear(self) -> None:
        self._data.clear()
