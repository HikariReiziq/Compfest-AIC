"""Test pemilihan ukuran."""

from __future__ import annotations

import pytest

from app.services.sizing import LoadedChart, choose_size

CHART = LoadedChart(
    chart_id=1,
    code="sni-tshirts-men",
    version=1,
    sizes={
        "S": {"chest_circumference": (86.0, 92.0), "garment_length": (66.0, 68.0)},
        "M": {"chest_circumference": (92.0, 98.0), "garment_length": (68.0, 70.0)},
        "L": {"chest_circumference": (98.0, 104.0), "garment_length": (70.0, 72.0)},
    },
    order={"S": 1, "M": 2, "L": 3},
)


@pytest.mark.parametrize(
    ("chest", "diharapkan"),
    [(88.0, "S"), (95.0, "M"), (101.0, "L")],
)
def test_memilih_ukuran_yang_rentangnya_pas(chest: float, diharapkan: str):
    hasil = choose_size(CHART, {"chest_circumference": chest})
    assert hasil is not None
    assert hasil.recommended == diharapkan


def test_mengembalikan_alternatif_untuk_banding_di_mode_ar():
    hasil = choose_size(CHART, {"chest_circumference": 95.0})
    assert hasil is not None
    assert len(hasil.options) >= 2


def test_tubuh_di_luar_rentang_chart_tidak_dipaksakan():
    """Lebih baik tidak menyarankan apa pun daripada menyarankan ukuran yang salah."""
    assert choose_size(CHART, {"chest_circumference": 140.0}) is None


def test_dimensi_yang_tidak_diukur_diabaikan():
    hanya_dada = choose_size(CHART, {"chest_circumference": 95.0})
    dengan_dimensi_asing = choose_size(
        CHART, {"chest_circumference": 95.0, "lingkar_kepala": 57.0}
    )
    assert hanya_dada is not None and dengan_dimensi_asing is not None
    assert hanya_dada.recommended == dengan_dimensi_asing.recommended


def test_tanpa_pengukuran_mengembalikan_none():
    assert choose_size(CHART, {}) is None
