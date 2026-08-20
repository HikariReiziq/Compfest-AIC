"""Konversi sRGB ke CIELAB dan penurunan afinitas undertone.

Ditulis dengan matematika biasa tanpa dependency tambahan. Nilai LAB dihitung
sekali saat impor katalog, bukan tiap kali rekomendasi dijalankan.
"""

from __future__ import annotations

# Titik putih D65, acuan standar untuk konten layar.
_WHITE = (95.047, 100.0, 108.883)


def hex_to_rgb(hex_code: str) -> tuple[float, float, float]:
    value = hex_code.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))  # type: ignore[return-value]


def _linearise(channel: float) -> float:
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def _f(t: float) -> float:
    return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)


def hex_to_lab(hex_code: str) -> tuple[float, float, float]:
    r, g, b = (_linearise(c) * 100 for c in hex_to_rgb(hex_code))
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / _WHITE[0]
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / _WHITE[1]
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / _WHITE[2]
    fx, fy, fz = _f(x), _f(y), _f(z)
    return (
        round(116 * fy - 16, 2),
        round(500 * (fx - fy), 2),
        round(200 * (fy - fz), 2),
    )


def is_neutral(lab: tuple[float, float, float]) -> bool:
    """Warna dengan kroma sangat rendah aman untuk semua undertone."""
    _, a, b = lab
    return (a**2 + b**2) ** 0.5 < 12


def undertone_weight(undertone: str, lab: tuple[float, float, float]) -> float:
    """Bobot -1..1 kecocokan warna terhadap undertone kulit.

    Aturan turunan dari seasonal colour analysis, dinyatakan di ruang LAB:
    sumbu b* memisahkan kuning (positif) dari biru (negatif), sumbu a*
    memisahkan merah (positif) dari hijau (negatif).
    """
    lightness, a, b = lab
    chroma = (a**2 + b**2) ** 0.5

    if chroma < 12:
        # Netral: sedikit positif untuk semua, kecuali putih menyilaukan.
        return 0.35 if 20 < lightness < 92 else 0.1

    if undertone == "warm":
        score = (b / 60) * 0.8 + (a / 80) * 0.2
    elif undertone == "cool":
        score = (-b / 60) * 0.8 + (a / 80) * 0.2
    elif undertone == "olive":
        # Olive cocok dengan warna bumi: kroma sedang, b* positif, a* rendah.
        score = (b / 70) * 0.6 - abs(a) / 90 + (0.3 if chroma < 40 else -0.1)
    else:  # neutral
        score = 0.45 - abs(b) / 140

    # Warna sangat gelap atau sangat terang lebih sulit dipakai siapa pun.
    if lightness < 18 or lightness > 94:
        score -= 0.15
    return round(max(-1.0, min(1.0, score)), 3)


def affinity_from_weight(weight: float) -> str:
    if weight >= 0.25:
        return "recommended"
    if weight <= -0.25:
        return "avoid"
    return "neutral"
