"""Rate limit terdistribusi berbasis Redis.

Hitungannya dilakukan di dalam Redis lewat skrip Lua sehingga INCR dan
penetapan TTL terjadi dalam satu operasi atomik. Kalau keduanya dipisah, ada
celah di mana kunci sempat tercipta tanpa TTL dan kuota jadi terkunci selamanya.

Karena state-nya di Redis dan bukan di memori proses, batas tetap berlaku
menyeluruh berapa pun jumlah replika API yang berjalan.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

from loguru import logger

from app.cache.client import get_redis
from app.cache.keys import rate_limit_key

_INCR_WITH_TTL_LUA = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {current, redis.call('PTTL', KEYS[1])}
"""


@dataclass(frozen=True, slots=True)
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_seconds: int


async def check_rate_limit(
    scope: str, identity: str, *, limit: int, window_seconds: int = 60
) -> RateLimitResult:
    """Fixed window counter.

    Dipilih ketimbang sliding window log karena biayanya satu kunci integer per
    periode, bukan satu entri per request. Untuk melindungi database dari
    lonjakan, presisi tepi jendela tidak penting.
    """
    window = int(time.time()) // window_seconds
    key = rate_limit_key(scope, identity, window)
    try:
        current, ttl_ms = await get_redis().eval(
            _INCR_WITH_TTL_LUA, 1, key, str(window_seconds * 1000)
        )
    except Exception as exc:
        # Fail open: Redis bermasalah tidak boleh membuat API berhenti melayani.
        logger.warning("rate limit dilewati karena Redis error: {}", exc)
        return RateLimitResult(True, limit, limit, window_seconds)

    remaining = max(0, limit - int(current))
    return RateLimitResult(
        allowed=int(current) <= limit,
        limit=limit,
        remaining=remaining,
        reset_seconds=max(1, int(ttl_ms) // 1000),
    )
