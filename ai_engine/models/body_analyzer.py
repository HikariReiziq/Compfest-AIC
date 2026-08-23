"""Multi-Dimensional Body Shape & Apparel Analyzer.

Menerima fitur turunan (angka) hasil ekstraksi klien dari 33 landmark MediaPipe Pose
dan mengklasifikasikan:
1. 5 Bentuk Tubuh Standar Fesyen (Hourglass, Pear, Inverted Triangle, Rectangle, Apple)
   berbasis antropometri ANSUR II & ISO 7250.
2. Rasio Keseimbangan Vertikal (Panjang Torso vs Panjang Kaki).
3. Justifikasi Ilmiah 3 Pilar Busana (Siluet Atasan, Potongan Celana, Keseimbangan Sepatu).

Kepatuhan UU PDP No. 27/2022:
Payload tidak pernah berisi foto atau video tubuh pengguna.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# --- Label Bahasa Indonesia untuk 5 Bentuk Tubuh ---
BODY_SHAPE_LABELS_ID: Dict[str, str] = {
    "Hourglass": "Hourglass (Jam Pasir)",
    "Pear": "Pear / Triangle (Pir / Segitiga)",
    "Inverted Triangle": "Inverted Triangle (Segitiga Terbalik)",
    "Rectangle": "Rectangle (Persegi Panjang)",
    "Apple": "Apple / Oval (Apel / Bulat)",
}

# --- Rekomendasi Busana Lengkap per Bentuk Tubuh ---
BODY_SHAPE_RECOMMENDATIONS: Dict[str, Dict[str, Any]] = {
    "Hourglass": {
        "topwear": ["Fitted Wrap Top", "V-Neck Shirt", "Tailored Belted Blazer", "Ribbed Slim Tee"],
        "bottomwear": ["High-Waist Wide-Leg Trousers", "Bootcut Jeans", "Straight-Leg Chinos", "A-Line Midi Pants"],
        "footwear": ["Pointed Loafers", "Minimalist Clean Sneakers", "Classic Chelsea Boots", "Ankle Strap Flats"],
        "advice": (
            "Bentuk tubuh Jam Pasir memiliki keseimbangan alami antara lebar bahu dan pinggul "
            "dengan lekuk pinggang yang tegas. Tonjolkan lekuk pinggang alami Anda dengan atasan fitted "
            "atau beraksen wrap, dipadukan dengan celana berpotongan pinggang tinggi (high-waist)."
        ),
    },
    "Pear": {
        "topwear": ["Structured Shoulder Top", "Boatneck Blouse", "Puffed-Sleeve Shirt", "Layered Crop Jacket"],
        "bottomwear": ["A-Line Wide-Leg Trousers", "Dark Wash Straight Jeans", "Relaxed Chinos", "Pleated Pants"],
        "footwear": ["Chunky Loafers", "Platform Sneakers", "Block Heel Boots", "Structured Oxford Shoes"],
        "advice": (
            "Bentuk tubuh Pir memiliki pinggul yang lebih dominan dibanding lebar bahu. "
            "Gunakan atasan dengan aksen pundak terstruktur atau motif berani untuk menyeimbangkan siluet "
            "bahu atas, dipadukan dengan celana bergaris jatuh lurus (straight/wide-leg) bernada gelap."
        ),
    },
    "Inverted Triangle": {
        "topwear": ["Soft V-Neck Tee", "Raglan Sleeve Top", "Unstructured Casual Blazer", "Deep Scoop Neck"],
        "bottomwear": ["Cargo Pants", "Flared Denim Trousers", "Wide-Leg Chinos", "Pleated Baggy Pants"],
        "footwear": ["Chunky Dad Sneakers", "Retro Runner Shoes", "Combat Boots", "Thick-Sole Derby Shoes"],
        "advice": (
            "Bentuk tubuh Segitiga Terbalik memiliki bahu bidang atletis dengan pinggul yang lebih ramping. "
            "Gunakan atasan berkerah V-neck untuk memberi garis vertikal lembut, dipadukan dengan celana "
            "bervolume (cargo / wide-leg) dan sepatu bersol tebal untuk menambah volume di bagian bawah tubuh."
        ),
    },
    "Rectangle": {
        "topwear": ["Belted Safari Shirt", "Oversized Layered Tee", "Peplum Blouse", "Structured Double-Breasted Outer"],
        "bottomwear": ["Paperbag Waist Pants", "High-Rise Mom Jeans", "Wide-Leg Trousers with Belt", "Flared Pants"],
        "footwear": ["Retro Classic Sneakers", "Chelsea Boots", "Tassel Loafers", "Chunky Sole Mules"],
        "advice": (
            "Bentuk tubuh Persegi Panjang memiliki proporsi garis bahu, pinggang, dan pinggul yang sejajar. "
            "Ciptakan ilusi lekukan tubuh melalui teknik layering (luaran bertumpuk), atasan berikat pinggang "
            "(belted), dan celana berpinggang tinggi dengan aksen lipit."
        ),
    },
    "Apple": {
        "topwear": ["Flowy Empire Top", "Vertical Striped Linen Shirt", "Open-Front Longline Cardigan", "Tunic Top"],
        "bottomwear": ["Straight-Leg Flat-Front Pants", "Mid-Rise Dark Chinos", "Clean-Cut Denim", "Fluid Trousers"],
        "footwear": ["Low-Profile Classic Sneakers", "Slip-On Loafers", "Clean Leather Mules", "Derby Shoes"],
        "advice": (
            "Bentuk tubuh Apel memiliki torso tengah yang lebih dominan dengan kaki yang ramping. "
            "Pilih atasan berpotongan flowy atau garis vertikal yang memanjangkan postur badan, dipadukan "
            "dengan celana berpotongan lurus (straight-cut) yang memperlihatkan keindahan kaki."
        ),
    },
}


def classify_body_shape(ratios: Dict[str, float]) -> Dict[str, Any]:
    """Klasifikasi bentuk tubuh 5 kelas berbasis rasio antropometri baku ANSUR II.

    Parameter:
        shoulder_to_hip: rasio lebar bahu terhadap pinggul (S/H)
        waist_to_hip: rasio lebar pinggang terhadap pinggul (W/H)
        waist_to_shoulder: rasio lebar pinggang terhadap bahu (W/S)
    """
    s_h = ratios.get("shoulder_to_hip_ratio", 1.0)
    w_h = ratios.get("waist_to_hip_ratio", 0.78)
    w_s = ratios.get("waist_to_shoulder_ratio", 0.78)

    # 1. Inverted Triangle: Bahu dominan bidang
    if s_h >= 1.08 and w_s <= 0.85:
        shape = "Inverted Triangle"
        confidence = min(0.96, 0.75 + (s_h - 1.08) * 0.8)

    # 2. Pear: Pinggul dominan lebar
    elif s_h <= 0.92:
        shape = "Pear"
        confidence = min(0.96, 0.75 + (0.92 - s_h) * 0.8)

    # 3. Apple: Lingkar tengah/pinggang besar terhadap bahu dan pinggul
    elif w_h >= 0.88 and w_s >= 0.88:
        shape = "Apple"
        confidence = min(0.94, 0.72 + (w_h - 0.88) * 0.9)

    # 4. Hourglass: Bahu ~ Pinggul seimbang, pinggang ramping berlekuk
    elif 0.93 <= s_h <= 1.07 and w_h <= 0.78:
        shape = "Hourglass"
        confidence = min(0.96, 0.75 + (0.78 - w_h) * 0.8)

    # 5. Rectangle: Bahu ~ Pinggul ~ Pinggang sejajar lurus
    else:
        shape = "Rectangle"
        confidence = 0.88

    rec = BODY_SHAPE_RECOMMENDATIONS[shape]
    return {
        "shape": shape,
        "label_indonesian": BODY_SHAPE_LABELS_ID[shape],
        "confidence": round(confidence, 2),
        "method": "ansur_ii_rule_engine",
        "ratios": ratios,
        "topwear_recommendations": rec["topwear"],
        "bottomwear_recommendations": rec["bottomwear"],
        "footwear_recommendations": rec["footwear"],
        "styling_advice": rec["advice"],
    }


def classify_torso_leg_balance(torso_to_leg_ratio: float) -> Dict[str, Any]:
    """Mengklasifikasikan proporsi vertikal tubuh (Panjang Torso vs Panjang Kaki)."""
    if torso_to_leg_ratio > 0.92:
        balance_type = "Long Torso"
        label_id = "Torso Panjang (Kaki Lebih Pendek)"
        advice = (
            "Gunakan celana berpotongan High-Waist dan masukkan atasan (tuck-in) "
            "untuk menciptakan ilusi garis kaki yang lebih jenjang dan proporsional."
        )
    elif torso_to_leg_ratio < 0.78:
        balance_type = "Long Legs"
        label_id = "Kaki Jenjang (Torso Lebih Pendek)"
        advice = (
            "Anda memiliki proporsi kaki yang jenjang. Kenakan celana Mid-Rise atau Low-Rise "
            "dengan atasan panjang/oversized untuk menyeimbangkan panjang tubuh atas."
        )
    else:
        balance_type = "Balanced"
        label_id = "Proporsi Seimbang (Balanced)"
        advice = (
            "Proporsi tubuh atas dan bawah Anda sangat seimbang. Anda fleksibel mengenakan "
            "potongan celana high-waist maupun regular-rise."
        )

    return {
        "balance_type": balance_type,
        "label_indonesian": label_id,
        "torso_to_leg_ratio": round(torso_to_leg_ratio, 3),
        "advice": advice,
    }


class PillarJustifierBody:
    """Penyusun justifikasi 3 pilar ilmiah busana tubuh."""

    @staticmethod
    def justify_upper_silhouette(body_shape: str) -> Dict[str, str]:
        if body_shape == "Hourglass":
            rec = "Fitted / Wrap Top"
            reason = "Menonjolkan lekuk pinggang alami tanpa merusak keseimbangan simetri bahu dan pinggul."
            basis = "Prinsip Garis Anatomis (Anatomical Contour Alignment) — ISO 7250."
        elif body_shape == "Pear":
            rec = "Structured Shoulder / Boatneck Top"
            reason = "Menambah lebar visual pada garis bahu untuk menyeimbangkan dominasi lebar pinggul."
            basis = "Prinsip Kontras Proporsi Horizontal (Horizontal Proportion Counterbalance)."
        elif body_shape == "Inverted Triangle":
            rec = "V-Neck / Raglan Sleeve"
            reason = "Memberikan tarikan garis vertikal lembut untuk merampingkan visual bahu yang bidang."
            basis = "Prinsip Ilusi Vertikal Helmholtz (Helmholtz Vertical Line Illusion)."
        elif body_shape == "Rectangle":
            rec = "Layered Outerwear / Belted Shirt"
            reason = "Menciptakan dimensi visual bertingkat dan siluet lekukan pada tubuh yang lurus."
            basis = "Prinsip Kedalaman Visual Bertingkat (Layered Depth Dimensioning)."
        else:  # Apple
            rec = "Flowy Empire Top / Vertical Stripe"
            reason = "Memberikan ruang jatuh kain yang anggun pada area tengah tanpa menekan torso."
            basis = "Prinsip Garis Jatuh Gravitasi (Fluid Fabric Drape Line)."

        return {
            "pillar": "upper_silhouette",
            "title": "Pilar 1: Siluet Atasan (Upper Body Balance)",
            "title_id": "Siluet Atasan & Baju",
            "recommendation": rec,
            "reason": reason,
            "scientific_basis": basis,
        }

    @staticmethod
    def justify_lower_inseam(body_shape: str, torso_leg_balance: str) -> Dict[str, str]:
        if torso_leg_balance == "Long Torso" or body_shape in ["Pear", "Hourglass"]:
            rec = "High-Waist Wide-Leg / Straight Pants"
            reason = "Menaikkan titik pusat pinggang visual dan memanjangkan garis jatuh celana dari paha ke mata kaki."
            basis = "Prinsip Golden Ratio Proporsi Kaki (1 : 1.618 Inseam Elongation)."
        elif body_shape == "Inverted Triangle":
            rec = "Cargo Pants / Flared Trousers"
            reason = "Menambahkan volume pada paruh bawah tubuh guna mengimbangi bahu atas yang atletis."
            basis = "Prinsip Keseimbangan Massa Visual (Visual Mass Distribution Balance)."
        else:
            rec = "Straight-Leg Chinos / Relaxed Trousers"
            reason = "Memberikan garis jatuh tegak lurus yang rapi dan nyaman untuk postur tubuh proporsional."
            basis = "Prinsip Garis Jatuh Vertikal (Linear Vertical Fall Line)."

        return {
            "pillar": "lower_inseam",
            "title": "Pilar 2: Proporsi Garis Jatuh Celana (Lower Inseam Line)",
            "title_id": "Potongan & Garis Jatuh Celana",
            "recommendation": rec,
            "reason": reason,
            "scientific_basis": basis,
        }

    @staticmethod
    def justify_footwear(body_shape: str) -> Dict[str, str]:
        if body_shape in ["Inverted Triangle", "Pear", "Rectangle"]:
            rec = "Chunky Sole Sneakers / Derby Shoes / Chelsea Boots"
            reason = "Memberikan jangkar visual (visual grounding) yang kokoh agar celana wide-leg tidak menenggelamkan kaki."
            basis = "Prinsip Tumpuan Visual Postur (Visual Grounding Equilibrium)."
        else:
            rec = "Pointed Loafers / Clean Retro Runner Sneakers"
            reason = "Menjaga siluet tubuh tetap ramping dan dinamis tanpa menambah volume berlebih di bagian bawah."
            basis = "Prinsip Aliran Garis Siluet (Continuous Silhouette Streamlining)."

        return {
            "pillar": "footwear_balance",
            "title": "Pilar 3: Keseimbangan Alas Kaki (Footwear Grounding)",
            "title_id": "Keseimbangan Siluet Sepatu",
            "recommendation": rec,
            "reason": reason,
            "scientific_basis": basis,
        }


class BodyAnalyzer:
    """Orkestrator utama analisis biometrik tubuh penuh."""

    def __init__(self):
        self.justifier = PillarJustifierBody()

    def analyze(
        self,
        body_ratios: Dict[str, float],
        measurements_cm: Dict[str, Any],
        user_height_cm: float = 165.0,
    ) -> Dict[str, Any]:
        shape_out = classify_body_shape(body_ratios)
        torso_leg_out = classify_torso_leg_balance(body_ratios.get("torso_to_leg_ratio", 0.85))

        # 3 Pilar Ilmiah Busana
        p1 = self.justifier.justify_upper_silhouette(shape_out["shape"])
        p2 = self.justifier.justify_lower_inseam(shape_out["shape"], torso_leg_out["balance_type"])
        p3 = self.justifier.justify_footwear(shape_out["shape"])

        # Narasi Personal
        s_cm = measurements_cm.get("shoulder_width_cm", 42)
        h_cm = measurements_cm.get("hip_width_cm", 38)
        w_cm = measurements_cm.get("waist_width_cm", 33)
        narrative = {
            "summary": (
                f"Analisis antropometri menunjukkan bentuk tubuh {shape_out['label_indonesian']} "
                f"dengan proporsi {torso_leg_out['label_indonesian']}. Lebar bahu terukur {s_cm} cm, "
                f"lingkar pinggang {w_cm} cm, dan pinggul {h_cm} cm."
            ),
            "topwear_tip": f"Pilihan atasan ideal: {p1['recommendation']}. {p1['reason']}",
            "bottomwear_tip": f"Pilihan bawahan ideal: {p2['recommendation']}. {p2['reason']}",
            "footwear_tip": f"Pilihan sepatu ideal: {p3['recommendation']}. {p3['reason']}",
        }

        return {
            "body_shape": shape_out,
            "torso_leg_balance": torso_leg_out,
            "measurements_cm": measurements_cm,
            "pillars": [p1, p2, p3],
            "narrative": narrative,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Singleton instance
_body_analyzer = BodyAnalyzer()


def analyze_body_landmarks_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Helper entry-point untuk endpoint REST."""
    ratios = payload.get("body_ratios", {})
    meas = payload.get("measurements_cm", {})
    height = payload.get("user_height_input_cm", 165.0)
    return _body_analyzer.analyze(ratios, meas, height)
