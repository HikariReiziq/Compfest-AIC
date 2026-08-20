"""Penggabung seluruh router v1."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, catalog, recommendations, sessions

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(catalog.router)
api_router.include_router(sessions.router)
api_router.include_router(recommendations.router)
