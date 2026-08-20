"""Isi database dengan data awal yang cukup untuk demo dan pengujian.

Skrip ini idempoten: dijalankan berkali-kali tidak menggandakan baris karena
setiap sisipan memakai ON CONFLICT terhadap kolom unik yang sudah dijamin skema.

Jalankan: python -m scripts.seed
"""

from __future__ import annotations

import asyncio
import sys
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.keys import bump_catalog_version
from app.db.session import dispose_engines, get_write_sessionmaker
from app.models.catalog import Category, Colour, Product
from app.models.enums import (
    CategoryLevel,
    Gender,
    ItemSlot,
    QuestionInputType,
    RuleSubject,
    Season,
    UsageContext,
)
from app.models.personal import StyleRule, UndertonePalette
from app.models.questionnaire import Question, QuestionBatch
from app.models.sizing import MeasurementKey, SizeChart, SizeChartEntry
from scripts.colour_math import affinity_from_weight, hex_to_lab, is_neutral, undertone_weight

MEASUREMENT_KEYS = [
    ("chest_circumference", "Lingkar dada", "cm", "torso", True),
    ("waist_circumference", "Lingkar pinggang", "cm", "torso", True),
    ("hip_circumference", "Lingkar panggul", "cm", "hip", True),
    ("shoulder_width", "Lebar bahu", "cm", "shoulder", True),
    ("garment_length", "Panjang badan pakaian", "cm", "torso", False),
    ("inseam", "Panjang dalam celana", "cm", "leg", False),
    ("stature", "Tinggi badan", "cm", "full", True),
    ("face_width", "Lebar wajah", "cm", "head", True),
]

COLOURS = [
    ("Black", "#0B0B0B"),
    ("White", "#F7F7F7"),
    ("Navy Blue", "#1B2A4A"),
    ("Grey", "#8A8A8A"),
    ("Maroon", "#6E1A2B"),
    ("Mustard", "#D4A017"),
    ("Olive", "#6B7A3A"),
    ("Coral", "#FF7F50"),
    ("Teal", "#0F7C7B"),
    ("Beige", "#D9C7A7"),
    ("Burgundy", "#5C1A32"),
    ("Sky Blue", "#87BEE0"),
    ("Forest Green", "#274E32"),
    ("Cream", "#F1E7D0"),
    ("Charcoal", "#2E3033"),
    ("Rust", "#B7410E"),
]

# (slug, nama, level, slug induk, slot)
CATEGORIES = [
    ("apparel", "Apparel", CategoryLevel.MASTER, None, None),
    ("accessories", "Accessories", CategoryLevel.MASTER, None, None),
    ("footwear", "Footwear", CategoryLevel.MASTER, None, None),
    ("topwear", "Topwear", CategoryLevel.SUB, "apparel", None),
    ("bottomwear", "Bottomwear", CategoryLevel.SUB, "apparel", None),
    ("eyewear", "Eyewear", CategoryLevel.SUB, "accessories", None),
    ("shoes", "Shoes", CategoryLevel.SUB, "footwear", None),
    ("tshirts", "Tshirts", CategoryLevel.ARTICLE, "topwear", ItemSlot.TOP),
    ("shirts", "Shirts", CategoryLevel.ARTICLE, "topwear", ItemSlot.TOP),
    ("kemeja-batik", "Kemeja Batik", CategoryLevel.ARTICLE, "topwear", ItemSlot.TOP),
    ("jeans", "Jeans", CategoryLevel.ARTICLE, "bottomwear", ItemSlot.BOTTOM),
    ("trousers", "Trousers", CategoryLevel.ARTICLE, "bottomwear", ItemSlot.BOTTOM),
    ("sunglasses", "Sunglasses", CategoryLevel.ARTICLE, "eyewear", ItemSlot.EYEWEAR),
    ("casual-shoes", "Casual Shoes", CategoryLevel.ARTICLE, "shoes", ItemSlot.FOOTWEAR),
]

PRODUCTS = [
    # (nama, kategori, gender, warna, usage, musim, popularitas)
    ("Kaos Katun Combed Polos", "tshirts", Gender.MEN, "Navy Blue", UsageContext.CASUAL, 0.92),
    ("Kaos Oversize Boxy Fit", "tshirts", Gender.UNISEX, "Cream", UsageContext.CASUAL, 0.88),
    ("Kaos Basic Lengan Pendek", "tshirts", Gender.WOMEN, "Coral", UsageContext.CASUAL, 0.81),
    ("Kaos Olahraga Dry Fit", "tshirts", Gender.MEN, "Charcoal", UsageContext.SPORTS, 0.74),
    (
        "Kemeja Linen Lengan Panjang",
        "shirts",
        Gender.MEN,
        "Beige",
        UsageContext.SMART_CASUAL,
        0.86,
    ),
    ("Kemeja Formal Slim Fit", "shirts", Gender.MEN, "White", UsageContext.FORMAL, 0.9),
    ("Kemeja Katun Motif Kecil", "shirts", Gender.WOMEN, "Sky Blue", UsageContext.CASUAL, 0.7),
    (
        "Kemeja Batik Parang Modern",
        "kemeja-batik",
        Gender.MEN,
        "Maroon",
        UsageContext.ETHNIC,
        0.83,
    ),
    (
        "Kemeja Batik Tulis Halus",
        "kemeja-batik",
        Gender.WOMEN,
        "Burgundy",
        UsageContext.ETHNIC,
        0.79,
    ),
    ("Celana Jeans Slim Fit", "jeans", Gender.MEN, "Navy Blue", UsageContext.CASUAL, 0.89),
    ("Celana Jeans Straight Cut", "jeans", Gender.WOMEN, "Sky Blue", UsageContext.CASUAL, 0.77),
    (
        "Celana Chino Katun Stretch",
        "trousers",
        Gender.MEN,
        "Olive",
        UsageContext.SMART_CASUAL,
        0.84,
    ),
    ("Celana Bahan Formal", "trousers", Gender.MEN, "Charcoal", UsageContext.FORMAL, 0.8),
    (
        "Celana Kulot Wanita",
        "trousers",
        Gender.WOMEN,
        "Black",
        UsageContext.SMART_CASUAL,
        0.72,
    ),
    ("Kacamata Frame Kotak", "sunglasses", Gender.UNISEX, "Black", UsageContext.CASUAL, 0.68),
    ("Kacamata Frame Bulat", "sunglasses", Gender.UNISEX, "Rust", UsageContext.CASUAL, 0.6),
    ("Kacamata Aviator Klasik", "sunglasses", Gender.UNISEX, "Grey", UsageContext.CASUAL, 0.65),
    ("Sepatu Sneakers Kanvas", "casual-shoes", Gender.UNISEX, "White", UsageContext.CASUAL, 0.87),
    ("Sepatu Kulit Formal", "casual-shoes", Gender.MEN, "Black", UsageContext.FORMAL, 0.76),
    ("Sepatu Slip On Ringan", "casual-shoes", Gender.WOMEN, "Beige", UsageContext.CASUAL, 0.71),
]

# Size chart kaos pria, mengacu pada rentang SNI 2161:2010 dan persentil
# Antropometri Indonesia. Angka di sini contoh kerja, bukan salinan resmi.
TSHIRT_SIZES = [
    ("S", 1, {"chest_circumference": (86, 92), "garment_length": (66, 68)}),
    ("M", 2, {"chest_circumference": (92, 98), "garment_length": (68, 70)}),
    ("L", 3, {"chest_circumference": (98, 104), "garment_length": (70, 72)}),
    ("XL", 4, {"chest_circumference": (104, 112), "garment_length": (72, 74)}),
]

STYLE_RULES = [
    (
        RuleSubject.BODY_SHAPE,
        "pear",
        "shirts",
        0.55,
        "Atasan berstruktur menyeimbangkan bahu terhadap panggul.",
    ),
    (
        RuleSubject.BODY_SHAPE,
        "pear",
        "trousers",
        0.35,
        "Potongan lurus merapikan garis pinggul.",
    ),
    (
        RuleSubject.BODY_SHAPE,
        "apple",
        "shirts",
        0.45,
        "Kemeja jatuh lurus menyamarkan area tengah badan.",
    ),
    (
        RuleSubject.BODY_SHAPE,
        "apple",
        "tshirts",
        -0.3,
        "Kaos ketat menonjolkan area yang ingin disamarkan.",
    ),
    (
        RuleSubject.BODY_SHAPE,
        "rectangle",
        "kemeja-batik",
        0.4,
        "Motif dan tekstur menciptakan dimensi pada siluet lurus.",
    ),
    (
        RuleSubject.BODY_SHAPE,
        "hourglass",
        "tshirts",
        0.5,
        "Potongan mengikuti badan menonjolkan proporsi seimbang.",
    ),
    (
        RuleSubject.BODY_SHAPE,
        "inverted_triangle",
        "jeans",
        0.45,
        "Bawahan lebih berisi menyeimbangkan bahu lebar.",
    ),
    (
        RuleSubject.FACE_SHAPE,
        "round",
        "sunglasses",
        0.6,
        "Frame bersudut memberi ketegasan pada wajah bulat.",
    ),
    (
        RuleSubject.FACE_SHAPE,
        "square",
        "sunglasses",
        0.55,
        "Frame membulat melembutkan garis rahang.",
    ),
    (
        RuleSubject.FACE_SHAPE,
        "oval",
        "sunglasses",
        0.4,
        "Wajah oval fleksibel terhadap hampir semua bentuk frame.",
    ),
    (
        RuleSubject.FIT_PREFERENCE,
        "oversize",
        "tshirts",
        0.5,
        "Sesuai preferensi potongan longgar.",
    ),
    (
        RuleSubject.FIT_PREFERENCE,
        "slim",
        "shirts",
        0.45,
        "Sesuai preferensi potongan pas badan.",
    ),
]

QUESTION_BATCHES: list[dict[str, Any]] = [
    {
        "code": "batch1",
        "order_index": 0,
        "title": "Kesempatan pemakaian",
        "description": "Dua pertanyaan singkat untuk mengunci arah gaya.",
        "unlocks_slots": ["top"],
        "questions": [
            {
                "code": "q_occasion",
                "order_index": 0,
                "prompt": "Pakaian ini akan dipakai untuk kesempatan apa?",
                "input_type": QuestionInputType.SINGLE_CHOICE,
                "maps_to": "occasion",
                "options": [
                    {"value": "formal", "label": "Formal atau kerja"},
                    {"value": "casual", "label": "Santai sehari-hari"},
                    {"value": "smart_casual", "label": "Semi formal"},
                    {"value": "ethnic", "label": "Acara adat atau batik"},
                    {"value": "sports", "label": "Olahraga"},
                ],
            },
            {
                "code": "q_fit",
                "order_index": 1,
                "prompt": "Anda lebih nyaman dengan potongan seperti apa?",
                "input_type": QuestionInputType.SINGLE_CHOICE,
                "maps_to": "fit_preference",
                "options": [
                    {"value": "slim", "label": "Pas badan"},
                    {"value": "regular", "label": "Standar"},
                    {"value": "oversize", "label": "Longgar"},
                ],
            },
        ],
    },
    {
        "code": "batch2",
        "order_index": 1,
        "title": "Bahan dan kenyamanan",
        "description": "Menyaring bahan yang cocok dengan iklim dan aktivitas Anda.",
        "unlocks_slots": ["top", "bottom"],
        "questions": [
            {
                "code": "q_material",
                "order_index": 0,
                "prompt": "Butuh bahan yang menyerap keringat?",
                "input_type": QuestionInputType.BOOLEAN,
                "maps_to": "prefers_breathable",
                "options": [
                    {"value": True, "label": "Ya"},
                    {"value": False, "label": "Tidak masalah"},
                ],
            }
        ],
    },
    {
        "code": "batch3",
        "order_index": 2,
        "title": "Aksesoris",
        "description": "Menentukan apakah aksesoris ikut direkomendasikan.",
        "unlocks_slots": ["top", "bottom", "footwear", "eyewear", "accessory"],
        "questions": [
            {
                "code": "q_accessory",
                "order_index": 0,
                "prompt": "Nyaman memakai aksesoris seperti kacamata?",
                "input_type": QuestionInputType.BOOLEAN,
                "maps_to": "accepts_accessories",
                "options": [
                    {"value": True, "label": "Ya"},
                    {"value": False, "label": "Tidak"},
                ],
            }
        ],
    },
]


async def _upsert(db: AsyncSession, model: type, values: dict, conflict: list[str]) -> None:
    stmt = insert(model.__table__).values(**values).on_conflict_do_nothing(index_elements=conflict)
    await db.execute(stmt)


async def seed_measurement_keys(db: AsyncSession) -> dict[str, int]:
    for key, label, unit, part, core in MEASUREMENT_KEYS:
        await _upsert(
            db,
            MeasurementKey,
            {"key": key, "label": label, "unit": unit, "body_part": part, "is_core": core},
            ["key"],
        )
    await db.flush()
    rows = (await db.execute(select(MeasurementKey.key, MeasurementKey.id))).all()
    return dict(rows)


async def seed_colours(db: AsyncSession) -> dict[str, int]:
    for name, hex_code in COLOURS:
        lab = hex_to_lab(hex_code)
        await _upsert(
            db,
            Colour,
            {
                "name": name,
                "slug": name.lower().replace(" ", "-"),
                "hex_code": hex_code,
                "lab_l": lab[0],
                "lab_a": lab[1],
                "lab_b": lab[2],
                "is_neutral": is_neutral(lab),
            },
            ["name"],
        )
    await db.flush()
    rows = (await db.execute(select(Colour.name, Colour.id))).all()
    return dict(rows)


async def seed_palette(db: AsyncSession, colour_ids: dict[str, int]) -> int:
    """Turunkan palet undertone dari koordinat LAB, bukan diketik satu per satu."""
    count = 0
    for name, hex_code in COLOURS:
        lab = hex_to_lab(hex_code)
        for undertone in ("warm", "cool", "neutral", "olive"):
            weight = undertone_weight(undertone, lab)
            await _upsert(
                db,
                UndertonePalette,
                {
                    "undertone": undertone,
                    "colour_id": colour_ids[name],
                    "affinity": affinity_from_weight(weight),
                    "weight": weight,
                    "rationale": (
                        f"Warna {name} mendukung undertone {undertone}."
                        if weight >= 0.25
                        else None
                    ),
                },
                ["undertone", "colour_id"],
            )
            count += 1
    return count


async def seed_categories(db: AsyncSession) -> dict[str, int]:
    ids: dict[str, int] = {}
    for slug, name, level, parent_slug, slot in CATEGORIES:
        await _upsert(
            db,
            Category,
            {
                "slug": slug,
                "name": name,
                "level": level.value,
                "parent_id": ids.get(parent_slug) if parent_slug else None,
                "item_slot": slot.value if slot else None,
            },
            ["slug"],
        )
        await db.flush()
        ids[slug] = (
            await db.execute(select(Category.id).where(Category.slug == slug))
        ).scalar_one()
    return ids


async def seed_products(
    db: AsyncSession, category_ids: dict[str, int], colour_ids: dict[str, int]
) -> int:
    for index, (name, cat_slug, gender, colour, usage, popularity) in enumerate(PRODUCTS, start=1):
        await _upsert(
            db,
            Product,
            {
                "external_id": 900_000 + index,
                "display_name": name,
                "gender": gender.value,
                "category_id": category_ids[cat_slug],
                "colour_id": colour_ids[colour],
                "usage_context": usage.value,
                "season": Season.SUMMER.value,
                "launch_year": 2025,
                "popularity_score": popularity,
                "image_url": f"https://cdn.example.id/produk/{900_000 + index}.jpg",
            },
            ["external_id"],
        )
    return len(PRODUCTS)


async def seed_size_charts(
    db: AsyncSession, category_ids: dict[str, int], measurement_ids: dict[str, int]
) -> int:
    entries = 0
    for cat_slug, gender in (("tshirts", Gender.MEN), ("shirts", Gender.MEN)):
        code = f"sni-{cat_slug}-{gender.value}"
        await _upsert(
            db,
            SizeChart,
            {
                "code": code,
                "version": 1,
                "name": f"Size chart {cat_slug} {gender.value}",
                "region": "ID",
                "gender": gender.value,
                "category_id": category_ids[cat_slug],
                "source": "SNI 2161:2010 + Antropometri Indonesia",
            },
            ["code", "version"],
        )
        await db.flush()
        chart_id = (
            await db.execute(
                select(SizeChart.id).where(SizeChart.code == code, SizeChart.version == 1)
            )
        ).scalar_one()

        for label, order, dims in TSHIRT_SIZES:
            for key, (low, high) in dims.items():
                await _upsert(
                    db,
                    SizeChartEntry,
                    {
                        "size_chart_id": chart_id,
                        "size_label": label,
                        "sort_order": order,
                        "measurement_key_id": measurement_ids[key],
                        "min_value": low,
                        "max_value": high,
                    },
                    ["size_chart_id", "size_label", "measurement_key_id"],
                )
                entries += 1
    return entries


async def seed_style_rules(db: AsyncSession, category_ids: dict[str, int]) -> int:
    for subject, value, cat_slug, weight, rationale in STYLE_RULES:
        await _upsert(
            db,
            StyleRule,
            {
                "subject": subject.value,
                "subject_value": value,
                "target_category_id": category_ids[cat_slug],
                "weight": weight,
                "rationale": rationale,
                "source": "stylist",
            },
            [
                "subject",
                "subject_value",
                "target_category_id",
                "target_attribute_id",
                "target_colour_id",
            ],
        )
    return len(STYLE_RULES)


async def seed_questionnaire(db: AsyncSession) -> int:
    total = 0
    for batch in QUESTION_BATCHES:
        await _upsert(
            db,
            QuestionBatch,
            {
                "code": batch["code"],
                "order_index": batch["order_index"],
                "title": batch["title"],
                "description": batch["description"],
                "unlocks_slots": batch["unlocks_slots"],
            },
            ["code"],
        )
        await db.flush()
        batch_id = (
            await db.execute(select(QuestionBatch.id).where(QuestionBatch.code == batch["code"]))
        ).scalar_one()
        for question in batch["questions"]:
            await _upsert(
                db,
                Question,
                {
                    "batch_id": batch_id,
                    "code": question["code"],
                    "order_index": question["order_index"],
                    "prompt": question["prompt"],
                    "input_type": question["input_type"].value,
                    "options": question["options"],
                    "maps_to": question["maps_to"],
                },
                ["code"],
            )
            total += 1
    return total


async def main() -> None:
    async with get_write_sessionmaker()() as db:
        measurement_ids = await seed_measurement_keys(db)
        colour_ids = await seed_colours(db)
        palette_rows = await seed_palette(db, colour_ids)
        category_ids = await seed_categories(db)
        products = await seed_products(db, category_ids, colour_ids)
        size_entries = await seed_size_charts(db, category_ids, measurement_ids)
        rules = await seed_style_rules(db, category_ids)
        questions = await seed_questionnaire(db)
        await db.commit()

    # Naikkan versi katalog supaya cache lama tidak menyajikan data pra-seed.
    version = await bump_catalog_version()

    sys.stdout.write(
        "Seed selesai\n"
        f"  measurement_key   : {len(measurement_ids)}\n"
        f"  colour            : {len(colour_ids)}\n"
        f"  undertone_palette : {palette_rows}\n"
        f"  category          : {len(category_ids)}\n"
        f"  product           : {products}\n"
        f"  size_chart_entry  : {size_entries}\n"
        f"  style_rule        : {rules}\n"
        f"  question          : {questions}\n"
        f"  versi katalog     : {version}\n"
    )
    await dispose_engines()


if __name__ == "__main__":
    asyncio.run(main())
