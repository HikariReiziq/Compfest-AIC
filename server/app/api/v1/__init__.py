"""API v1 Router aggregation."""

from fastapi import APIRouter
from .analyze import router as analyze_router
from .recommend import router as recommend_router
from .catalog import router as catalog_router
from .questions import router as questions_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(analyze_router)
api_v1_router.include_router(recommend_router)
api_v1_router.include_router(catalog_router)
api_v1_router.include_router(questions_router)

