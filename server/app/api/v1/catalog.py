"""API Endpoints for Catalog and Mock Presets."""

import sys
import os
import json
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai_engine.models.mock_generator import MockDataGenerator
from ...config import get_settings
from ...schemas import (
    CatalogResponse,
    CatalogItemSchema,
    PresetsListResponse,
    PresetItem,
)

router = APIRouter(prefix="/catalog", tags=["Catalog & Presets"])


@router.get("", response_model=CatalogResponse)
def get_catalog(
    subcategory: Optional[str] = Query(None, description="Filter by subcategory (glasses, hats, shirts, jackets)"),
    category: Optional[str] = Query(None, description="Filter by master category (Accessories, Apparel)"),
):
    """Returns catalog products with 3D model paths and visual attributes."""
    settings = get_settings()
    catalog_path = settings.CATALOG_PATH
    
    items = []
    if os.path.exists(catalog_path):
        with open(catalog_path, "r", encoding="utf-8") as f:
            items = json.load(f).get("items", [])

    if subcategory:
        items = [it for it in items if it.get("subcategory", "").lower() == subcategory.lower()]
    if category:
        items = [it for it in items if it.get("category", "").lower() == category.lower()]

    schema_items = [CatalogItemSchema(**it) for it in items]
    return CatalogResponse(total=len(schema_items), items=schema_items)


@router.get("/presets", response_model=PresetsListResponse)
def list_mock_presets():
    """Lists available deterministic test presets for competition judge evaluation."""
    presets = MockDataGenerator.list_presets()
    return PresetsListResponse(presets=[PresetItem(**p) for p in presets])


@router.get("/presets/{key}")
def get_mock_preset_detail(key: str):
    """Retrieves full profile data for a specific test preset."""
    if key not in MockDataGenerator.PRESETS:
        raise HTTPException(status_code=404, detail=f"Preset '{key}' not found.")
    return MockDataGenerator.get_preset(key)
