"""Akses katalog: query Postgres yang selalu dibungkus lapisan cache.

Aturan main modul ini: tidak ada endpoint yang bicara langsung ke tabel katalog.
Semua lewat sini, supaya setiap jalur baca punya kunci cache dan strategi
invalidasi yang sama.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import Select, func, select, text, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.core import TTLMemoryCache, cached
from app.cache.keys import (
    catalog_version,
    category_tree_key,
    digest,
    product_key,
    product_list_key,
)
from app.core.config import get_settings
from app.models.catalog import Category, Colour, Product
from app.models.enums import Gender, ItemSlot, UsageContext
from app.schemas.catalog import (
    CategoryNode,
    CategoryRef,
    ColourRef,
    Page,
    ProductFilter,
    ProductRead,
    decode_cursor,
    encode_cursor,
)

# Pohon kategori kecil, hampir tidak pernah berubah, dan dibaca hampir tiap
# request. Menaruhnya di memori proses menghemat satu hop ke Redis.
_l1 = TTLMemoryCache(ttl_seconds=30.0, max_items=64)

_DESCENDANT_CATEGORY_SQL = text(
    """
    WITH RECURSIVE subtree AS (
        SELECT id FROM category WHERE slug = :slug AND is_active
        UNION ALL
        SELECT c.id FROM category c JOIN subtree s ON c.parent_id = s.id
    )
    SELECT id FROM subtree
    """
)


def _to_product_read(product: Product, category: Category, colour: Colour | None) -> ProductRead:
    return ProductRead(
        id=product.id,
        external_id=product.external_id,
        display_name=product.display_name,
        gender=product.gender,
        category=CategoryRef(
            id=category.id, slug=category.slug, name=category.name, item_slot=category.item_slot
        ),
        colour=(
            ColourRef(id=colour.id, slug=colour.slug, name=colour.name, hex_code=colour.hex_code)
            if colour
            else None
        ),
        usage_context=product.usage_context,
        season=product.season,
        launch_year=product.launch_year,
        image_url=product.image_url,
        price_idr=float(product.price_idr) if product.price_idr is not None else None,
        popularity_score=product.popularity_score,
    )


def _base_query() -> Select:
    return (
        select(Product, Category, Colour)
        .join(Category, Product.category_id == Category.id)
        .outerjoin(Colour, Product.colour_id == Colour.id)
        .where(Product.is_active.is_(True))
    )


async def resolve_category_ids(db: AsyncSession, slug: str) -> list[int]:
    """Slug kategori -> id kategori itu beserta seluruh turunannya.

    Memakai recursive CTE supaya filter "Apparel" ikut menangkap semua
    subCategory dan articleType di bawahnya, tanpa perlu menyimpan materialized
    path yang harus dijaga konsistensinya setiap kali hierarki berubah.
    """

    async def loader() -> list[int]:
        result = await db.execute(_DESCENDANT_CATEGORY_SQL, {"slug": slug})
        return [row[0] for row in result]

    version = await catalog_version()
    key = f"coba:v{version}:catslug:{slug}"
    return await cached(key, loader, ttl=get_settings().cache_ttl_catalog_seconds) or []


async def list_products(db: AsyncSession, filters: ProductFilter) -> Page[ProductRead]:
    settings = get_settings()

    # Pencarian teks bebas tidak di-cache. Kardinalitasnya nyaris tak terbatas
    # sementara peluang kunci yang sama diminta ulang sangat kecil, jadi
    # cache-nya hanya akan mendesak keluar entri lain yang benar-benar panas.
    if filters.q:
        return await _query_products(db, filters)

    version = await catalog_version()
    key = product_list_key(version, digest(filters.model_dump(mode="json", exclude_none=True)))

    async def loader() -> dict[str, Any]:
        page = await _query_products(db, filters)
        return page.model_dump(mode="json")

    payload = await cached(key, loader, ttl=settings.cache_ttl_catalog_seconds)
    return Page[ProductRead].model_validate(payload)


async def _query_products(db: AsyncSession, filters: ProductFilter) -> Page[ProductRead]:
    stmt = _base_query()

    if filters.gender:
        stmt = stmt.where(Product.gender == filters.gender)
    if filters.usage_context:
        stmt = stmt.where(Product.usage_context == filters.usage_context)
    if filters.item_slot:
        stmt = stmt.where(Category.item_slot == filters.item_slot)
    if filters.colour_slug:
        stmt = stmt.where(Colour.slug == filters.colour_slug)
    if filters.category_slug:
        category_ids = await resolve_category_ids(db, filters.category_slug)
        if not category_ids:
            return Page[ProductRead](items=[], next_cursor=None, has_more=False)
        stmt = stmt.where(Product.category_id.in_(category_ids))
    if filters.q:
        # plainto_tsquery memperlakukan input sebagai kata biasa, sehingga
        # karakter operator tsquery dari pengguna tidak bisa mengubah query.
        stmt = stmt.where(
            Product.search_vector.op("@@")(func.plainto_tsquery("simple", filters.q))
        )

    if filters.cursor:
        decoded = decode_cursor(filters.cursor)
        if decoded:
            score, product_id = decoded
            stmt = stmt.where(
                tuple_(Product.popularity_score, Product.id) < tuple_(score, product_id)
            )

    stmt = stmt.order_by(Product.popularity_score.desc(), Product.id.desc()).limit(
        filters.limit + 1
    )

    rows = (await db.execute(stmt)).all()
    has_more = len(rows) > filters.limit
    rows = rows[: filters.limit]
    items = [_to_product_read(p, c, col) for p, c, col in rows]
    next_cursor = (
        encode_cursor(items[-1].popularity_score, items[-1].id) if items and has_more else None
    )
    return Page[ProductRead](items=items, next_cursor=next_cursor, has_more=has_more)


async def get_product(db: AsyncSession, product_id: int) -> ProductRead | None:
    version = await catalog_version()

    async def loader() -> dict[str, Any] | None:
        stmt = _base_query().where(Product.id == product_id)
        row = (await db.execute(stmt)).first()
        if row is None:
            return None
        return _to_product_read(*row).model_dump(mode="json")

    payload = await cached(
        product_key(version, product_id),
        loader,
        ttl=get_settings().cache_ttl_catalog_seconds,
    )
    return ProductRead.model_validate(payload) if payload else None


async def get_category_tree(db: AsyncSession) -> list[CategoryNode]:
    version = await catalog_version()
    key = category_tree_key(version)

    hit, value = _l1.get(key)
    if hit:
        return [CategoryNode.model_validate(n) for n in value]

    async def loader() -> list[dict[str, Any]]:
        rows = (
            await db.execute(
                select(Category).where(Category.is_active.is_(True)).order_by(Category.name)
            )
        ).scalars()
        nodes: dict[int, CategoryNode] = {}
        parents: dict[int, int | None] = {}
        for c in rows:
            nodes[c.id] = CategoryNode(
                id=c.id, slug=c.slug, name=c.name, level=str(c.level), item_slot=c.item_slot
            )
            parents[c.id] = c.parent_id
        roots: list[CategoryNode] = []
        for node_id, node in nodes.items():
            parent_id = parents[node_id]
            if parent_id and parent_id in nodes:
                nodes[parent_id].children.append(node)
            else:
                roots.append(node)
        return [r.model_dump(mode="json") for r in roots]

    payload = await cached(key, loader, ttl=get_settings().cache_ttl_catalog_seconds) or []
    _l1.set(key, payload)
    return [CategoryNode.model_validate(n) for n in payload]


async def fetch_candidates(
    db: AsyncSession,
    *,
    gender: Gender | None,
    usage_context: UsageContext | None,
    item_slots: list[ItemSlot],
    limit: int = 200,
) -> list[ProductRead]:
    """Ambil kandidat mentah untuk mesin rekomendasi.

    Sengaja mengambil lebih banyak daripada yang akan ditampilkan: penyaringan
    halus (warna terhadap undertone, potongan terhadap bentuk tubuh) dikerjakan
    di memori terhadap kumpulan kandidat ini, bukan lewat query per aturan.
    """
    version = await catalog_version()
    fingerprint = digest(
        {
            "g": gender,
            "u": usage_context,
            "s": sorted(slot.value for slot in item_slots),
            "l": limit,
        }
    )
    key = f"coba:v{version}:candidates:{fingerprint}"

    async def loader() -> list[dict[str, Any]]:
        stmt = _base_query()
        if gender:
            # Unisex selalu ikut: membuang unisex akan memangkas kandidat aksesoris.
            stmt = stmt.where(Product.gender.in_([gender, Gender.UNISEX]))
        if usage_context:
            stmt = stmt.where(Product.usage_context == usage_context)
        if item_slots:
            stmt = stmt.where(Category.item_slot.in_(item_slots))
        stmt = stmt.order_by(Product.popularity_score.desc(), Product.id.desc()).limit(limit)
        rows = (await db.execute(stmt)).all()
        return [_to_product_read(p, c, col).model_dump(mode="json") for p, c, col in rows]

    payload = await cached(key, loader, ttl=get_settings().cache_ttl_catalog_seconds) or []
    return [ProductRead.model_validate(item) for item in payload]
