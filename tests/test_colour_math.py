"""Test konversi warna dan penurunan afinitas undertone."""

from __future__ import annotations

from scripts.colour_math import affinity_from_weight, hex_to_lab, is_neutral, undertone_weight


def test_konversi_hitam_dan_putih():
    assert hex_to_lab("#000000")[0] == 0.0
    assert hex_to_lab("#FFFFFF")[0] == 100.0


def test_warna_abu_terdeteksi_netral():
    assert is_neutral(hex_to_lab("#8A8A8A"))
    assert not is_neutral(hex_to_lab("#FF7F50"))


def test_kuning_condong_ke_undertone_hangat():
    lab = hex_to_lab("#D4A017")
    assert undertone_weight("warm", lab) > 0.5
    assert undertone_weight("cool", lab) < 0


def test_biru_condong_ke_undertone_sejuk():
    lab = hex_to_lab("#1B2A4A")
    assert undertone_weight("cool", lab) > undertone_weight("warm", lab)


def test_bobot_selalu_dalam_rentang_valid():
    for hex_code in ("#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#D4A017"):
        lab = hex_to_lab(hex_code)
        for undertone in ("warm", "cool", "neutral", "olive"):
            assert -1.0 <= undertone_weight(undertone, lab) <= 1.0


def test_pemetaan_afinitas():
    assert affinity_from_weight(0.8) == "recommended"
    assert affinity_from_weight(0.0) == "neutral"
    assert affinity_from_weight(-0.8) == "avoid"
