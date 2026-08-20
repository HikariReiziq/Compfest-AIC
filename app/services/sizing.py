"""Pemilihan ukuran dari dimensi tubuh.

Size chart disimpan dalam format panjang (satu baris per dimensi per ukuran)
karena jenis garmen memakai dimensi yang berbeda-beda. Bentuk itu murah untuk
ditulis tapi merepotkan dibaca, jadi hasil pivot-nya di-cache per size chart.
Satu chart dipakai ribuan produk, sehingga satu entri cache melayani sangat
banyak permintaan.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.core import cached
from app.cache.keys import catalog_version, size_chart_key
from app.core.config import get_settings
from app.models.enums import Gender
from app.models.sizing import MeasurementKey, SizeChart, SizeChartEntry
from app.schemas.sizing import SizeOption, SizeSuggestion

# Toleransi minimum sebelum sebuah ukuran dianggap benar-benar tidak muat.
# 4 cm kira-kira setara satu langkah ukuran pada kaos dewasa.
_MIN_TOLERANCE_CM = 4.0
_RELATIVE_TOLERANCE = 0.08

PivotedChart = dict[str, dict[str, tuple[float, float]]]


@dataclass(frozen=True, slots=True)
class LoadedChart:
    chart_id: int
    code: str
    version: int
    sizes: PivotedChart
    order: dict[str, int]


async def load_size_chart(db: AsyncSession, chart_id: int) -> LoadedChart | None:
    version = await catalog_version()

    async def loader() -> dict[str, Any] | None:
        chart = (
            await db.execute(select(SizeChart).where(SizeChart.id == chart_id))
        ).scalar_one_or_none()
        if chart is None:
            return None
        rows = (
            await db.execute(
                select(SizeChartEntry, MeasurementKey)
                .join(MeasurementKey, SizeChartEntry.measurement_key_id == MeasurementKey.id)
                .where(SizeChartEntry.size_chart_id == chart_id)
                .order_by(SizeChartEntry.sort_order)
            )
        ).all()
        sizes: dict[str, dict[str, list[float]]] = {}
        order: dict[str, int] = {}
        for entry, key in rows:
            sizes.setdefault(entry.size_label, {})[key.key] = [
                float(entry.min_value),
                float(entry.max_value),
            ]
            order.setdefault(entry.size_label, entry.sort_order)
        return {
            "chart_id": chart.id,
            "code": chart.code,
            "version": chart.version,
            "sizes": sizes,
            "order": order,
        }

    payload = await cached(
        size_chart_key(version, chart_id), loader, ttl=get_settings().cache_ttl_catalog_seconds
    )
    if not payload:
        return None
    return LoadedChart(
        chart_id=payload["chart_id"],
        code=payload["code"],
        version=payload["version"],
        sizes={
            label: {k: (v[0], v[1]) for k, v in dims.items()}
            for label, dims in payload["sizes"].items()
        },
        order=payload["order"],
    )


async def resolve_chart_id(
    db: AsyncSession, *, category_id: int, gender: Gender | None
) -> int | None:
    """Cari size chart yang berlaku untuk kategori dan gender tertentu.

    Chart khusus gender didahulukan; chart tanpa gender jadi cadangan.
    """
    stmt = (
        select(SizeChart.id)
        .where(SizeChart.category_id == category_id, SizeChart.is_active.is_(True))
        .order_by(SizeChart.gender.is_(None), SizeChart.version.desc())
        .limit(1)
    )
    if gender:
        stmt = stmt.where((SizeChart.gender == gender) | (SizeChart.gender.is_(None)))
    return (await db.execute(stmt)).scalar_one_or_none()


def _score_size(
    dimensions: dict[str, tuple[float, float]], measurements: dict[str, float]
) -> tuple[float, dict[str, bool]]:
    """Nilai 0..1 untuk satu ukuran. Dimensi yang tidak diukur diabaikan."""
    comparable = [(k, v) for k, v in measurements.items() if k in dimensions]
    if not comparable:
        return 0.0, {}

    total = 0.0
    fits: dict[str, bool] = {}
    for key, value in comparable:
        low, high = dimensions[key]
        if low <= value <= high:
            total += 1.0
            fits[key] = True
            continue
        fits[key] = False
        distance = low - value if value < low else value - high
        midpoint = (low + high) / 2
        tolerance = max(_MIN_TOLERANCE_CM, midpoint * _RELATIVE_TOLERANCE)
        total += max(0.0, 1.0 - distance / tolerance)
    return total / len(comparable), fits


def choose_size(chart: LoadedChart, measurements: dict[str, float]) -> SizeSuggestion | None:
    """Pilih ukuran terbaik beserta alternatif terdekatnya.

    Selalu mengembalikan alternatif karena tombol banding ukuran di mode AR
    memang butuh dua sampai tiga pilihan untuk dicoba berdampingan.
    """
    if not measurements or not chart.sizes:
        return None

    options: list[SizeOption] = []
    for label, dimensions in chart.sizes.items():
        score, fits = _score_size(dimensions, measurements)
        options.append(
            SizeOption(
                label=label,
                score=round(score, 4),
                sort_order=chart.order.get(label, 0),
                fits=fits,
            )
        )

    options.sort(key=lambda o: (-o.score, o.sort_order))
    best = options[0]
    if best.score <= 0:
        return None

    runner_up = options[1].score if len(options) > 1 else 0.0
    return SizeSuggestion(
        recommended=best.label,
        # Selisih tipis dengan ukuran kedua berarti sistem sedang menebak;
        # angka ini yang dipakai UI untuk menyarankan mencoba dua ukuran.
        confidence=round(best.score * (0.6 + 0.4 * (best.score - runner_up)), 4),
        chart_code=chart.code,
        chart_version=chart.version,
        options=options[:4],
    )
