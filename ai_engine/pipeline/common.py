"""Primitif bersama pipeline offline — murni numpy, tanpa dependensi network.

Dipakai oleh 01/02/03 pipeline untuk STAGE 1-3 (cleaning, normalization,
preprocessing). Semua fungsi deterministik: input sama → output identik.
"""

import hashlib
import math
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

# Bootstrap import ai_engine.models saat dijalankan sebagai CLI langsung
_BASE = str(Path(__file__).resolve().parents[2])
if _BASE not in sys.path:
    sys.path.insert(0, _BASE)

from ai_engine.models.skin_analyzer import MST_REFERENCE_TABLE, lab_to_ita  # noqa: E402

# Landmark MediaPipe FaceMesh yang dipakai patch/alignment
CHEEK_LEFT, CHEEK_RIGHT, FOREHEAD_TOP = 234, 454, 10
EYE_OUTER_LEFT, EYE_OUTER_RIGHT = 33, 263

_PATCH_RADIUS = 8  # px pada resolusi landmark-space (dinormalisasi ke bentuk gambar)


def rgb_to_lab_pixels(rgb: np.ndarray) -> np.ndarray:
    """Konversi vektorisasi sRGB (N,M,3 uint8 / float 0-255) → CIELAB D65.

    Mengikuti rumus konversi yang sama dengan SkinAnalyzer.rgb_to_cielab
    agar hasil pipeline == hasil produksi (satu sumber kebenaran formula).
    """
    arr = np.asarray(rgb, dtype=np.float64)
    flat = arr.reshape(-1, 3) / 255.0

    # sRGB → linear
    lin = np.where(flat <= 0.04045, flat / 12.92, ((flat + 0.055) / 1.055) ** 2.4)

    # linear RGB → XYZ (sRGB D65 matrix)
    m = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041],
    ])
    xyz = lin @ m.T
    white = np.array([0.95047, 1.0, 1.08883])
    ratio = xyz / white
    eps, kappa = 216 / 24389, 24389 / 27

    f = np.where(ratio > eps, np.cbrt(ratio), (kappa * ratio + 16) / 116)
    L = 116 * f[:, 1] - 16
    a = 500 * (f[:, 0] - f[:, 1])
    b = 200 * (f[:, 1] - f[:, 2])
    return np.stack([L, a, b], axis=1)


def extract_cheek_forehead_patches(
    image_rgb: np.ndarray, landmarks: Dict[int, Tuple[float, float]], radius: int = 6
) -> np.ndarray:
    """Ambil piksel patch pipi (234/454) & dahi (10) → array (N, 3) RGB.

    `landmarks` memetakan indeks MediaPipe → (x, y) piksel pada image_rgb.
    """
    h, w = image_rgb.shape[:2]
    pixels: List[np.ndarray] = []
    for idx in (CHEEK_LEFT, CHEEK_RIGHT, FOREHEAD_TOP):
        if idx not in landmarks:
            continue
        cx, cy = landmarks[idx]
        cx, cy = int(round(cx)), int(round(cy))
        x0, x1 = max(0, cx - radius), min(w, cx + radius + 1)
        y0, y1 = max(0, cy - radius), min(h, cy + radius + 1)
        if x1 > x0 and y1 > y0:
            pixels.append(np.asarray(image_rgb[y0:y1, x0:x1], dtype=np.uint8).reshape(-1, 3))
    if not pixels:
        return np.zeros((0, 3), dtype=np.uint8)
    return np.vstack(pixels)


def ita_from_lab(lab: np.ndarray) -> float:
    """ITA (Chardon) median dari array (N,3) LAB — robust terhadap outlier."""
    if lab is None or len(lab) == 0:
        return 0.0
    lab = np.asarray(lab, dtype=np.float64)
    itas = [
        lab_to_ita(float(L), float(a), float(b))
        for L, a, b in lab
        if np.isfinite(L) and np.isfinite(a) and np.isfinite(b)
    ]
    return float(np.median(itas)) if itas else 0.0


def lab_to_monk_index(lab_mean) -> int:
    """Nearest ΔE (CIE76) terhadap MST_REFERENCE_TABLE → index Monk 1-10."""
    L, a, b = (float(v) for v in lab_mean)
    best_idx, best_d = 1, float("inf")
    for ref in MST_REFERENCE_TABLE:
        rL, ra, rb = ref["lab"]
        d = math.sqrt((L - rL) ** 2 + (a - ra) ** 2 + (b - rb) ** 2)
        if d < best_d:
            best_d, best_idx = d, ref["index"]
    return best_idx


def roll_align(
    image_rgb: np.ndarray, landmarks: Dict[int, Tuple[float, float]]
) -> Tuple[np.ndarray, float]:
    """Rotasi gambar agar garis mata (33-263) horizontal. Return (img, roll_deg).

    Implementasi nearest-neighbor murni numpy (tanpa dependensi cv2 di modul ini);
    sudut >30° dianggap data rusak → dikembalikan apa adanya (ditangani STAGE 1).
    """
    if EYE_OUTER_LEFT not in landmarks or EYE_OUTER_RIGHT not in landmarks:
        return image_rgb, 0.0
    (x1, y1), (x2, y2) = landmarks[EYE_OUTER_LEFT], landmarks[EYE_OUTER_RIGHT]
    roll = math.degrees(math.atan2(y2 - y1, x2 - x1))
    if abs(roll) < 0.5 or abs(roll) > 30.0:
        return image_rgb, roll

    h, w = image_rgb.shape[:2]
    cx, cy = w / 2.0, h / 2.0
    theta = -math.radians(roll)
    cos_t, sin_t = math.cos(theta), math.sin(theta)

    xs, ys = np.meshgrid(np.arange(w), np.arange(h))
    src_x = ((xs - cx) * cos_t + (ys - cy) * sin_t + cx).round().astype(np.int64)
    src_y = ((ys - cy) * cos_t - (xs - cx) * sin_t + cy).round().astype(np.int64)
    mask = (src_x >= 0) & (src_x < w) & (src_y >= 0) & (src_y < h)
    out = np.zeros_like(image_rgb)
    out[ys[mask], xs[mask]] = image_rgb[src_y[mask], src_x[mask]]
    return out, roll


def image_hash(image_rgb: np.ndarray) -> str:
    """Hash MD5 bytes gambar untuk dedup STAGE 1 (konten-identik)."""
    return hashlib.md5(np.ascontiguousarray(image_rgb).tobytes()).hexdigest()
