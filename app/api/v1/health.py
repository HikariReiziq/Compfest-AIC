"""Probe kesehatan.

Liveness dan readiness sengaja dipisah. Liveness tidak menyentuh dependency apa
pun: kalau ia gagal, artinya proses memang perlu dibunuh. Readiness memeriksa
Postgres dan Redis, jadi pod yang dependency-nya belum siap dikeluarkan dari
load balancer tanpa perlu di-restart.
"""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.cache.client import ping_redis
from app.core.config import get_settings
from app.db.session import ping_database

router = APIRouter(tags=["health"])


@router.get("/healthz", summary="Liveness probe")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "app": get_settings().app_name}


@router.get("/readyz", summary="Readiness probe")
async def readyz(response: Response) -> dict[str, object]:
    database_ok = await ping_database()
    redis_ok = await ping_redis()
    ready = database_ok and redis_ok
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "ready" if ready else "not_ready",
        "checks": {"postgres": database_ok, "redis": redis_ok},
    }
