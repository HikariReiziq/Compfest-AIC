"""Titik masuk aplikasi.

Aplikasi dirakit lewat factory, bukan sebagai objek modul global, supaya test
bisa membuat instans dengan konfigurasi berbeda tanpa mencemari proses.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

from app.api.v1.health import router as health_router
from app.api.v1.router import api_router
from app.cache.client import close_redis, ping_redis
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import register_middleware
from app.db.session import dispose_engines, ping_database
from app.services.ai.registry import get_recommender, shutdown_recommender


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings

    # Dependency dicek saat start, tapi kegagalannya hanya diperingatkan.
    # Proses tetap hidup dan /readyz yang menahannya dari load balancer sampai
    # Postgres atau Redis benar-benar siap.
    database_ok = await ping_database()
    redis_ok = await ping_redis()
    if not database_ok:
        logger.error("Postgres belum bisa dihubungi saat start.")
    if not redis_ok:
        logger.error("Redis belum bisa dihubungi saat start.")

    engine = get_recommender()
    logger.info(
        "{} siap | env={} | mesin rekomendasi={} v{}",
        settings.app_name,
        settings.env,
        engine.name,
        engine.version,
    )
    try:
        yield
    finally:
        await shutdown_recommender()
        await close_redis()
        await dispose_engines()
        logger.info("Aplikasi berhenti dengan rapi.")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    setup_logging(
        level="DEBUG" if settings.debug else "INFO",
        json_logs=not settings.is_local,
    )

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        summary="Backend COBA - rekomendasi outfit berbasis karakter personal dan AR try-on.",
        # Dokumentasi interaktif dimatikan di production: ia memetakan seluruh
        # permukaan API untuk siapa pun yang menemukannya.
        docs_url="/docs" if settings.env != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.env != "production" else None,
        lifespan=lifespan,
    )
    app.state.settings = settings

    register_middleware(app, settings)
    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
