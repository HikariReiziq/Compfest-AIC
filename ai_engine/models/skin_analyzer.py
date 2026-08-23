"""Skin Tone and Undertone Analysis Module using CIELAB and Google Monk Skin Tone Scale."""

import base64
import io
import json
import math
import os
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:
    cv2 = None

# Official 10-point Monk Skin Tone (MST) Reference Values
# Source: Google Research (skintone.google) - Standard sRGB & CIELAB coordinates
MST_REFERENCE_TABLE = [
    {"index": 1, "code": "MST-01", "hex": "#F6EDE4", "rgb": (246, 237, 228), "lab": (94.6, 1.8, 5.6), "desc": "Very Fair / Light"},
    {"index": 2, "code": "MST-02", "hex": "#F3E7DB", "rgb": (243, 231, 219), "lab": (92.1, 2.5, 7.5), "desc": "Fair"},
    {"index": 3, "code": "MST-03", "hex": "#F7EAD0", "rgb": (247, 234, 208), "lab": (93.1, 1.6, 13.9), "desc": "Light Warm"},
    {"index": 4, "code": "MST-04", "hex": "#EADABA", "rgb": (234, 218, 186), "lab": (87.5, 2.7, 17.0), "desc": "Light Medium"},
    {"index": 5, "code": "MST-05", "hex": "#D7BD96", "rgb": (215, 189, 150), "lab": (77.4, 6.0, 22.8), "desc": "Medium Golden / Tan"},
    {"index": 6, "code": "MST-06", "hex": "#A07E56", "rgb": (160, 126, 86), "lab": (54.4, 10.3, 27.2), "desc": "Rich Warm / Sawo Matang"},
    {"index": 7, "code": "MST-07", "hex": "#825C43", "rgb": (130, 92, 67), "lab": (42.1, 13.0, 21.7), "desc": "Deep Tan / Medium Dark"},
    {"index": 8, "code": "MST-08", "hex": "#604134", "rgb": (96, 65, 52), "lab": (30.5, 12.0, 15.0), "desc": "Rich Deep"},
    {"index": 9, "code": "MST-09", "hex": "#3A312A", "rgb": (58, 49, 42), "lab": (21.8, 3.5, 6.2), "desc": "Very Deep Dark"},
    {"index": 10, "code": "MST-10", "hex": "#292420", "rgb": (41, 36, 32), "lab": (15.6, 2.1, 3.7), "desc": "Deepest Obsidian"},
]


# --- Standardisasi skin_tone 5 kategori (direktif 2026-08-23) ---
# Bucket 5-level diturunkan dari Monk index agar deterministik dan ramah konteks Indonesia
# (MST-06 "Rich Warm / Sawo Matang" jatuh ke bucket Tan).
SKIN_TONE_LABELS = {
    "Fair": "Fair (Sangat Terang)",
    "Light": "Light (Terang)",
    "Medium": "Medium (Sedang)",
    "Tan": "Tan (Sawo Matang)",
    "Dark": "Dark (Gelap)",
}

_MONK_TO_SKIN_TONE = [
    (2, "Fair"),    # MST 1-2
    (4, "Light"),   # MST 3-4
    (5, "Medium"),  # MST 5
    (7, "Tan"),     # MST 6-7
    (10, "Dark"),   # MST 8-10
]


def monk_to_skin_tone(monk_index: int) -> str:
    """Petakan Monk index (1-10) ke bucket skin_tone 5 kategori. Clamp input invalid."""
    idx = max(1, min(10, int(monk_index)))
    for upper, label in _MONK_TO_SKIN_TONE:
        if idx <= upper:
            return label
    return "Dark"


def lab_to_ita(l: float, a: float, b: float) -> float:
    """Individual Typology Angle derajat (Chardon et al.) — makin tinggi makin terang."""
    if abs(a) < 1e-6:
        a = 1e-6
    return math.degrees(math.atan((l - b) / a))


class MonkToneResult:
    """Represents the Monk Skin Tone scale classification result."""

    def __init__(self, index: int, code: str, hex_value: str, distance_delta_e: float, description: str):
        self.index = index
        self.code = code
        self.hex_value = hex_value
        self.distance_delta_e = round(distance_delta_e, 2)
        self.description = description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "code": self.code,
            "hex": self.hex_value,
            "delta_e": self.distance_delta_e,
            "description": self.description,
        }


class UndertoneResult:
    """Represents the undertone classification and associated seasonal color palette."""

    def __init__(
        self,
        undertone: str,
        confidence: float,
        season: str,
        explanation: str,
        best_colors: List[Dict[str, str]],
        clash_colors: List[Dict[str, str]],
    ):
        self.undertone = undertone  # "Warm", "Cool", "Neutral", "Olive"
        self.confidence = round(confidence, 2)
        self.season = season
        self.explanation = explanation
        self.best_colors = best_colors
        self.clash_colors = clash_colors

    def to_dict(self) -> Dict[str, Any]:
        return {
            "undertone": self.undertone,
            "confidence": self.confidence,
            "season": self.season,
            "explanation": self.explanation,
            "best_colors": self.best_colors,
            "clash_colors": self.clash_colors,
        }


class SkinAnalyzer:
    """Analyzes face ROI crops to determine Monk Skin Tone and Undertone with Seasonal Color Analysis."""

    def __init__(self, rules_file_path: Optional[str] = None):
        if rules_file_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            rules_file_path = os.path.join(base_dir, "data", "color_palette_rules.json")

        self.palette_rules = self._load_rules(rules_file_path)

    def _load_rules(self, file_path: str) -> Dict[str, Any]:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f).get("palettes", {})
        return {}

    @staticmethod
    def rgb_to_cielab(r: float, g: float, b: float) -> Tuple[float, float, float]:
        """Converts sRGB [0-255] to standard CIELAB (D65 standard illuminant)."""
        # sRGB to linear RGB
        r_lin = r / 255.0
        g_lin = g / 255.0
        b_lin = b / 255.0

        r_lin = ((r_lin + 0.055) / 1.055) ** 2.4 if r_lin > 0.04045 else r_lin / 12.92
        g_lin = ((g_lin + 0.055) / 1.055) ** 2.4 if g_lin > 0.04045 else g_lin / 12.92
        b_lin = ((b_lin + 0.055) / 1.055) ** 2.4 if b_lin > 0.04045 else b_lin / 12.92

        # Linear RGB to XYZ (D65)
        X = r_lin * 0.4124 + g_lin * 0.3576 + b_lin * 0.1805
        Y = r_lin * 0.2126 + g_lin * 0.7152 + b_lin * 0.0722
        Z = r_lin * 0.0193 + g_lin * 0.1192 + b_lin * 0.9505

        # Normalize for D65 white point (Xn=0.95047, Yn=1.00000, Zn=1.08883)
        xr = X / 0.95047
        yr = Y / 1.00000
        zr = Z / 1.08883

        fx = xr ** (1 / 3) if xr > 0.008856 else (7.787 * xr) + (16 / 116)
        fy = yr ** (1 / 3) if yr > 0.008856 else (7.787 * yr) + (16 / 116)
        fz = zr ** (1 / 3) if zr > 0.008856 else (7.787 * zr) + (16 / 116)

        L = max(0.0, min(100.0, (116.0 * fy) - 16.0))
        a = (fx - fy) * 500.0
        b = (fy - fz) * 200.0

        return L, a, b

    def analyze_from_base64(self, base64_image_str: str) -> Tuple[MonkToneResult, UndertoneResult]:
        """Analyzes a base64 encoded face crop (PNG/JPEG) string."""
        if "," in base64_image_str:
            base64_image_str = base64_image_str.split(",", 1)[1]

        image_bytes = base64.b64decode(base64_image_str)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)

        return self.analyze_from_image_array(image_np)

    def analyze_from_image_array(self, rgb_image: np.ndarray) -> Tuple[MonkToneResult, UndertoneResult]:
        """Analyzes an RGB numpy image crop of the face forehead/cheek area."""
        # Calculate median RGB color to ignore highlights/shadows
        if rgb_image.ndim == 3 and rgb_image.shape[2] >= 3:
            pixels = rgb_image.reshape(-1, rgb_image.shape[2])[:, :3]
        else:
            pixels = rgb_image.reshape(-1, 3)

        median_r = float(np.median(pixels[:, 0]))
        median_g = float(np.median(pixels[:, 1]))
        median_b = float(np.median(pixels[:, 2]))

        # Convert median RGB to CIELAB
        user_L, user_a, user_b = self.rgb_to_cielab(median_r, median_g, median_b)

        # 1. Match with Monk Skin Tone Scale via Euclidean Delta E in LAB
        best_mst = None
        min_delta_e = float("inf")

        for ref in MST_REFERENCE_TABLE:
            ref_L, ref_a, ref_b = ref["lab"]
            delta_e = math.sqrt((user_L - ref_L) ** 2 + (user_a - ref_a) ** 2 + (user_b - ref_b) ** 2)
            if delta_e < min_delta_e:
                min_delta_e = delta_e
                best_mst = ref

        monk_result = MonkToneResult(
            index=best_mst["index"],
            code=best_mst["code"],
            hex_value=best_mst["hex"],
            distance_delta_e=min_delta_e,
            description=best_mst["desc"],
        )

        # 2. Determine Undertone via a* (red-green) and b* (yellow-blue) chromatic coordinates
        # Rule calibrated on Asian & Indonesian skin undertone distribution:
        if user_b >= 14.0 and user_a >= 3.5:
            undertone = "Warm"
            confidence = min(0.98, 0.80 + (user_b / 50.0))
        elif user_b < 10.5 and user_a >= 5.0:
            undertone = "Cool"
            confidence = min(0.95, 0.78 + (user_a / 40.0))
        elif user_a < 3.0 and user_b >= 10.0:
            undertone = "Olive"
            confidence = 0.88
        else:
            undertone = "Neutral"
            confidence = 0.85

        palette_info = self.palette_rules.get(undertone, {})
        season = palette_info.get("season", "Universal Harmony")
        explanation = palette_info.get(
            "description",
            f"Undertone {undertone} terdeteksi dari keseimbangan rona warna kulit pada skala {best_mst['code']}."
        )
        best_colors = palette_info.get("best_colors", [])
        clash_colors = palette_info.get("clash_colors", [])

        undertone_result = UndertoneResult(
            undertone=undertone,
            confidence=confidence,
            season=season,
            explanation=explanation,
            best_colors=best_colors,
            clash_colors=clash_colors,
        )

        return monk_result, undertone_result
