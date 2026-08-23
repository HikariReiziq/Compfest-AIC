"""Estimasi gender dari rasio antropometrik wajah (landmark-derived).

Rule engine dimorfisme seksual — sengaja TANPA model berat di jalur produksi:
inferensi angka-only (<1 ms, deterministik, tanpa GPU, tanpa upload gambar —
kepatuhan UU PDP No. 27/2022). Threshold netral dipakai sebagai titik awal;
kalibrasi terhadap dataset UTKFace/FairFace dilakukan offline oleh
ai_engine/pipeline/03_gender_pipeline.py (opsi 1: pretrained = alat kalibrasi).

Sinyal antropometrik yang dipakai (Farkas 1994; Kolar & Salter 1997):
- jaw_to_cheek      : rahang lebar relatif pipi → pria lebih kotak
- brow_to_eye       : jarak alis-mata → pria berialis rendah/tebal (kecil),
                      wanita alis tinggi melengkung (besar)
- lip_to_face_width : bibir penuh → wanita cenderung lebih besar
- face_aspect       : wajah memanjang → pria; membulat → wanita

Confidence jujur 0.50-0.78 (estimasi dari 4 rasio 2D tidak boleh mengklaim
lebih); jawaban self-report kuesioner selalu boleh menimpa hasil ini.
"""

from typing import Any, Dict


class GenderEstimator:
    """Klasifikasi gender Pria/Wanita dari fitur turunan landmark MediaPipe."""

    # Threshold netral — rata-rata antropometrik populasi dewasa.
    NEUTRAL = {
        "jaw_to_cheek": 0.86,
        "brow_to_eye": 0.16,
        "lip_to_face_width": 0.42,
        "face_aspect": 0.75,
    }

    @staticmethod
    def classify(features: Dict[str, Any]) -> Dict[str, Any]:
        """Kembalikan dict {label, label_id, confidence, method, rule}.

        Deterministik: input sama → output byte-identik (syarat direktif
        konsistensi scan berulang).
        """
        try:
            jaw = float(features.get("jaw_to_cheek") or 0.0)
            brow = float(features.get("brow_to_eye") or 0.0)
            lip = float(features.get("lip_to_face_width") or 0.0)
            aspect = float(features.get("face_aspect") or 0.0)
        except (TypeError, ValueError):
            jaw = brow = lip = aspect = 0.0

        # Semua nol → payload tidak informatif; fallback jujur confidence 0.50.
        if jaw == 0.0 and brow == 0.0 and lip == 0.0:
            return {
                "label": "Pria (Male)",
                "label_id": "male",
                "confidence": 0.50,
                "method": "landmark_ratio",
                "rule": "fallback",
            }

        n = GenderEstimator.NEUTRAL
        # Skor aditif ter-normalisasi: > 0 maskulin, < 0 feminin.
        score = (
            (jaw - n["jaw_to_cheek"]) / n["jaw_to_cheek"]
            + (n["brow_to_eye"] - brow) / n["brow_to_eye"]
            + (n["lip_to_face_width"] - lip) / n["lip_to_face_width"]
            + (aspect - n["face_aspect"]) / n["face_aspect"]
        )
        confidence = round(min(0.78, 0.55 + 0.23 * min(1.0, abs(score))), 2)
        detail = (
            f"jaw/cheek {jaw:.2f}, brow {brow:.2f}, lip {lip:.2f}, aspect {aspect:.2f}"
        )

        if score >= 0:
            return {
                "label": "Pria (Male)",
                "label_id": "male",
                "confidence": confidence,
                "method": "landmark_ratio",
                "rule": f"skor maskulin {score:+.2f} ({detail})",
            }
        return {
            "label": "Wanita (Female)",
            "label_id": "female",
            "confidence": confidence,
            "method": "landmark_ratio",
            "rule": f"skor feminin {score:+.2f} ({detail})",
        }
