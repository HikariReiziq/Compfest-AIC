"""Multi-Dimensional Face Analyzer (ADR-014).

Menerima fitur turunan (angka) hasil ekstraksi klien dari 478 landmark MediaPipe
dan mengklasifikasikan: bentuk wajah 6 kelas (+ Diamond rule override), tipe
hidung, bentuk mata, dan bentuk alis — plus justifikasi 3 pilar (ADR-016).

Payload tidak pernah berisi gambar wajah (UU PDP No. 27/2022 by design).
"""

from typing import Any, Dict, List, Optional

from ai_engine.models.face_classifier import FaceShapeClassifier

# Singleton legacy classifier (RF-from-weights bila tersedia, else rule-based)
_classifier = FaceShapeClassifier()

# --- Enrichment label bahasa Indonesia untuk 6 kelas bentuk wajah ---
FACE_SHAPE_LABELS_ID: Dict[str, str] = {
    "Oval": "Oval (Oval)",
    "Round": "Round (Bulat)",
    "Square": "Square (Kotak)",
    "Heart": "Heart (Hati)",
    "Oblong": "Oblong (Persegi Panjang)",
    "Diamond": "Diamond (Wajah Berlian)",
}

# Rekomendasi aksesoris untuk Diamond (kelas baru; legacy map tidak memilikinya)
_DIAMOND_ADVICE = {
    "glasses": ["Cat-Eye Angular", "Oval Metal Frame", "Browline Clubmaster", "Rimless Oval"],
    "hats": ["Medium Brim Fedora", "Beret Samping", "Slouchy Beanie", "Newsboy Cap"],
    "advice": (
        "Wajah berlian memiliki tulang pipi paling dominan dengan dahi dan rahang ramping. "
        "Pilih frame yang menonjolkan garis brow-line dan melebar di bagian atas untuk "
        "menyeimbangkan tulang pipi yang menonjol; hindari frame sempit tanpa aksen atas."
    ),
}

# Threshold rule override Diamond (ADR-014 / PRD 8.2):
# tulang pipi dominan + dahi sempit + dagu runcing.
DIAMOND_RULE = {
    "cheekbone_to_jaw_min": 1.30,
    "jaw_to_forehead_max": 0.78,
    "chin_sharpness_max": 0.58,
}


def classify_face_shape(ratios: Dict[str, float]) -> Dict[str, Any]:
    """Klasifikasi bentuk wajah 6 kelas.

    1. Diamond rule override dievaluasi lebih dulu (dataset Face Shape 5K hanya
       punya 5 kelas — Diamond dideteksi lewat geometri antropometrik).
    2. Jalur legacy: Random Forest dari bobot terlatih, fallback rule-based
       scoring (FaceShapeClassifier lama — tidak diduplikasi di sini).
    """
    cheek_jaw = ratios.get("cheekbone_to_jaw", 0.0)
    jaw_fh = ratios.get("jaw_to_forehead", 1.0)
    chin_sharp = ratios.get("chin_sharpness", 1.0)

    is_diamond = (
        cheek_jaw >= DIAMOND_RULE["cheekbone_to_jaw_min"]
        and jaw_fh <= DIAMOND_RULE["jaw_to_forehead_max"]
        and chin_sharp <= DIAMOND_RULE["chin_sharpness_max"]
    )
    if is_diamond:
        # Confidence naik seberapa jauh ketiga kriteria melewati threshold
        margins = (
            (cheek_jaw - DIAMOND_RULE["cheekbone_to_jaw_min"]) / DIAMOND_RULE["cheekbone_to_jaw_min"]
            + (DIAMOND_RULE["jaw_to_forehead_max"] - jaw_fh) / DIAMOND_RULE["jaw_to_forehead_max"]
            + (DIAMOND_RULE["chin_sharpness_max"] - chin_sharp) / DIAMOND_RULE["chin_sharpness_max"]
        )
        confidence = round(min(0.95, 0.82 + margins), 2)
        return {
            "shape": "Diamond",
            "label_indonesian": FACE_SHAPE_LABELS_ID["Diamond"],
            "confidence": confidence,
            "method": "rule_override",
            "ratios": ratios,
            "glasses_recommendations": _DIAMOND_ADVICE["glasses"],
            "hat_recommendations": _DIAMOND_ADVICE["hats"],
            "styling_advice": _DIAMOND_ADVICE["advice"],
        }

    result = _classifier.classify(ratios)
    method = "random_forest" if _classifier.model is not None else "rule_based"
    return {
        "shape": result.shape,
        "label_indonesian": FACE_SHAPE_LABELS_ID.get(result.shape, result.shape),
        "confidence": result.confidence,
        "method": method,
        "ratios": result.ratios,
        "glasses_recommendations": result.glasses_recommendations,
        "hat_recommendations": result.hat_recommendations,
        "styling_advice": result.styling_advice,
    }
