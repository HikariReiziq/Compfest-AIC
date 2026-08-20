"""Endpoint katalog.

Selain cache di sisi server, respons produk membawa ETag. Klien yang sudah punya
salinan mengirim If-None-Match dan menerima 304 tanpa body. Dampaknya nyata di
mode AR yang memuat ulang metadata produk berkali-kali di jaringan seluler.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Path, Query, Response, status

from app.api.deps import DbSessionRO, RateLimit
from app.cache.keys import digest
from app.core.errors import NotFoundError
from app.models.enums import Gender, ItemSlot, UsageContext
from app.schemas.catalog import CategoryNode, Page, ProductFilter, ProductRead
from app.services import catalog as catalog_service

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/products", response_model=Page[ProductRead])
async def list_products(
    db: DbSessionRO,
    gender: Gender | None = None,
    usage_context: UsageContext | None = None,
    category_slug: str | None = Query(default=None, max_length=96),
    colour_slug: str | None = Query(default=None, max_length=48),
    item_slot: ItemSlot | None = None,
    q: str | None = Query(default=None, max_length=80, description="Pencarian nama produk"),
    limit: int = Query(default=24, ge=1, le=100),
    cursor: str | None = Query(default=None, description="Cursor dari next_cursor"),
) -> Page[ProductRead]:
    filters = ProductFilter(
        gender=gender,
        usage_context=usage_context,
        category_slug=category_slug,
        colour_slug=colour_slug,
        item_slot=item_slot,
        q=q,
        limit=limit,
        cursor=cursor,
    )
    return await catalog_service.list_products(db, filters)


@router.get("/products/{product_id}", response_model=ProductRead)
async def get_product(
    db: DbSessionRO,
    response: Response,
    product_id: Annotated[int, Path(ge=1)],
    if_none_match: Annotated[str | None, Header()] = None,
) -> ProductRead | Response:
    product = await catalog_service.get_product(db, product_id)
    if product is None:
        raise NotFoundError("Produk tidak ditemukan.")

    etag = f'W/"{digest(product.model_dump(mode="json"))}"'
    if if_none_match == etag:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers={"ETag": etag})

    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=300"
    return product


@router.get(
    "/categories",
    response_model=list[CategoryNode],
    dependencies=[Depends(RateLimit("catalog", per_minute=120))],
)
async def category_tree(db: DbSessionRO, response: Response) -> list[CategoryNode]:
    tree = await catalog_service.get_category_tree(db)
    response.headers["Cache-Control"] = "public, max-age=600"
    return tree
