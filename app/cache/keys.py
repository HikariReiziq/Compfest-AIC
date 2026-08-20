"""Penamaan kunci cache.

Semua kunci diberi prefiks namespace dan nomor versi. Invalidasi katalog tidak
dilakukan dengan menghapus kunci satu per satu (butuh SCAN, mahal, dan rawan
terlewat), melainkan dengan menaikkan nomor versi. Seluruh kunci lama seketika
tidak lagi terbaca dan dibuang sendiri oleh Redis saat TTL-nya habis.
"""

from __future__ import annotations

import hashlib
import time

import orjson

from app.cache.client import get_redis

NS = "coba"
CATALOG_VERSION_KEY = f"{NS}:catalog:version"

# Versi katalog di-cache di memori proses sesaat supaya tidak ada GET Redis
# tambahan di setiap request. Konsekuensinya invalidasi menyebar dalam
# hitungan detik, dan itu memang cukup untuk data katalog.
_VERSION_TTL_SECONDS = 5.0
_version_cache: tuple[int, float] = (0, 0.0)


async def catalog_version() -> int:
    global _version_cache
    value, fetched_at = _version_cache
    now = time.monotonic()
    if value and now - fetched_at < _VERSION_TTL_SECONDS:
        return value
    raw = await get_redis().get(CATALOG_VERSION_KEY)
    version = int(raw) if raw else 1
    _version_cache = (version, now)
    return version


async def bump_catalog_version() -> int:
    """Panggil setelah katalog berubah. Seluruh cache katalog jadi usang seketika."""
    global _version_cache
    version = int(await get_redis().incr(CATALOG_VERSION_KEY))
    _version_cache = (version, time.monotonic())
    return version


def digest(payload: object) -> str:
    """Ringkas parameter query jadi kunci pendek yang stabil.

    Dipakai untuk endpoint daftar produk yang kombinasi filternya banyak.
    """
    raw = orjson.dumps(payload, option=orjson.OPT_SORT_KEYS)
    return hashlib.blake2b(raw, digest_size=12).hexdigest()


def product_key(version: int, product_id: int) -> str:
    return f"{NS}:v{version}:product:{product_id}"


def product_list_key(version: int, filter_digest: str) -> str:
    return f"{NS}:v{version}:products:{filter_digest}"


def category_tree_key(version: int) -> str:
    return f"{NS}:v{version}:categories:tree"


def size_chart_key(version: int, chart_id: int) -> str:
    return f"{NS}:v{version}:sizechart:{chart_id}"


def style_rules_key(version: int, subject: str, subject_value: str) -> str:
    return f"{NS}:v{version}:rules:{subject}:{subject_value}"


def palette_key(version: int, undertone: str) -> str:
    return f"{NS}:v{version}:palette:{undertone}"


def questionnaire_key(version: int) -> str:
    return f"{NS}:v{version}:questionnaire"


def session_key(session_id: str) -> str:
    return f"{NS}:sess:{session_id}"


def session_feedback_key(session_id: str) -> str:
    return f"{NS}:sess:{session_id}:fb"


def recommendation_key(session_id: str, batch_code: str, profile_digest: str) -> str:
    return f"{NS}:sess:{session_id}:reco:{batch_code}:{profile_digest}"


def rate_limit_key(scope: str, identity: str, window: int) -> str:
    return f"{NS}:rl:{scope}:{identity}:{window}"
