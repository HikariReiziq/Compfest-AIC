"""TDD — skin_tone 5 kategori (Fair/Light/Medium/Tan/Dark) dari Monk + ITA.

Standardisasi biometrik 3-param: bucket diturunkan dari Monk Skin Tone index
(Google x Dr. Ellis Monk) sehingga stabil terhadap variasi cahaya antar scan.
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai_engine.models.skin_analyzer import monk_to_skin_tone, SKIN_TONE_LABELS, lab_to_ita


class TestSkinToneBuckets:
    def test_monk_mapping_boundaries(self):
        assert monk_to_skin_tone(1) == "Fair"
        assert monk_to_skin_tone(2) == "Fair"
        assert monk_to_skin_tone(3) == "Light"
        assert monk_to_skin_tone(4) == "Light"
        assert monk_to_skin_tone(5) == "Medium"
        assert monk_to_skin_tone(6) == "Tan"
        assert monk_to_skin_tone(7) == "Tan"
        assert monk_to_skin_tone(8) == "Dark"
        assert monk_to_skin_tone(9) == "Dark"
        assert monk_to_skin_tone(10) == "Dark"

    def test_monk_mapping_clamps_invalid(self):
        assert monk_to_skin_tone(0) == "Fair"   # clamp bawah
        assert monk_to_skin_tone(-5) == "Fair"
        assert monk_to_skin_tone(99) == "Dark"  # clamp atas

    def test_labels_complete_with_indonesian(self):
        assert set(SKIN_TONE_LABELS.keys()) == {"Fair", "Light", "Medium", "Tan", "Dark"}
        assert all(len(v) > 5 for v in SKIN_TONE_LABELS.values())  # label Indonesia lengkap

    def test_ita_angles(self):
        # Formula Chardon: ITA = atan((L-b)/a). MST-01 → 88.8°, MST-06 → 69.3°
        ita_fair = lab_to_ita(94.6, 1.8, 5.6)
        ita_tan = lab_to_ita(54.4, 10.3, 27.2)
        assert ita_fair > 80
        # Kulit terang selalu ITA lebih tinggi dari sawo matang pada formula ini
        assert ita_fair > ita_tan > 50

    def test_ita_zero_a_guard(self):
        # a=0 harus tidak meledak (guard epsilon)
        val = lab_to_ita(50.0, 0.0, 0.0)
        assert isinstance(val, float)
