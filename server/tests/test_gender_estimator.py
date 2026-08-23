"""TDD — GenderEstimator rule engine dari rasio antropometrik landmark.

Fitur dimorfisme seksual dipakai karena produksi hanya menerima ANGKA turunan
landmark (kepatuhan UU PDP). Confidence dijaga jujur 0.50-0.78; threshold
dikalibrasi offline oleh ai_engine/pipeline/03_gender_pipeline.py (UTKFace).
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai_engine.models.gender_estimator import GenderEstimator


def _features(**over):
    """Vektor fitur netral; override untuk vektor maskulin/feminin."""
    base = {
        "jaw_to_cheek": 0.86,      # lebar rahang relatif pipi
        "brow_to_eye": 0.16,       # jarak puncak alis ke kelopak mata (relatif pipi)
        "lip_to_face_width": 0.42, # lebar bibir relatif lebar wajah
        "face_aspect": 0.75,       # lebar wajah / tinggi wajah
    }
    base.update(over)
    return base


class TestGenderEstimator:
    def test_masculine_vector(self):
        # Rahang lebar, alis rendah/tebal, bibir sempit, wajah memanjang
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.97, brow_to_eye=0.11, lip_to_face_width=0.36, face_aspect=0.80)
        )
        assert out["label"] == "Pria (Male)"
        assert out["label_id"] == "male"
        assert 0.55 <= out["confidence"] <= 0.80
        assert out["method"] == "landmark_ratio"

    def test_feminine_vector(self):
        # Rahang ramping, alis tinggi melengkung, bibir penuh, wajah membulat
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.74, brow_to_eye=0.22, lip_to_face_width=0.49, face_aspect=0.71)
        )
        assert out["label"] == "Wanita (Female)"
        assert out["label_id"] == "female"
        assert out["confidence"] >= 0.55

    def test_neutral_falls_back_with_low_confidence(self):
        out = GenderEstimator.classify(_features())
        assert out["label"] in ("Pria (Male)", "Wanita (Female)")
        assert out["confidence"] < 0.62  # sinyal lemah → jujur rendah

    def test_invalid_features_low_confidence(self):
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.0, brow_to_eye=0.0, lip_to_face_width=0.0, face_aspect=0.0)
        )
        assert out["confidence"] <= 0.50
        assert out["rule"] == "fallback"

    def test_deterministic_same_input_same_output(self):
        """Syarat mutlak direktif: scan berulang hasil identik."""
        vec = _features(jaw_to_cheek=0.92, brow_to_eye=0.12, lip_to_face_width=0.38, face_aspect=0.78)
        a = GenderEstimator.classify(vec)
        b = GenderEstimator.classify(vec)
        assert a == b
