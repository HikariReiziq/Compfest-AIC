"""Unit tests untuk modul pipeline offline (ai_engine/pipeline) — B4."""

import importlib.util
import os
import sys
from pathlib import Path

import numpy as np
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai_engine.models.gender_estimator import GenderEstimator  # noqa: E402
from ai_engine.pipeline import (  # noqa: E402
    extract_cheek_forehead_patches,
    image_hash,
    ita_from_lab,
    lab_to_monk_index,
    rgb_to_lab_pixels,
)


def _load(num: str, name: str):
    path = Path(BASE_DIR) / "ai_engine" / "pipeline" / f"{num}_{name}_pipeline.py"
    spec = importlib.util.spec_from_file_location(f"pipeline_{num}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


skin = _load("01", "skin_tone")
face = _load("02", "face_shape")
gender = _load("03", "gender")


class TestCommon:
    def test_rgb_to_lab_pixels_white_and_dark(self):
        lab = rgb_to_lab_pixels(np.array([[[255, 255, 255], [20, 18, 16]]], dtype=np.uint8))
        assert lab[0][0] > 95  # putih → L tinggi
        assert lab[1][0] < 20  # gelap → L rendah

    def test_lab_to_monk_index_sawo_matang(self):
        assert lab_to_monk_index((54.4, 10.3, 27.2)) == 6  # MST-06

    def test_ita_from_lab_median(self):
        ita = ita_from_lab(np.array([[54.4, 10.3, 27.2], [80.0, 4.0, 10.0]]))
        assert 0 < ita < 90

    def test_image_hash_deterministic(self):
        img = np.zeros((4, 4, 3), dtype=np.uint8)
        assert image_hash(img) == image_hash(img.copy())
        assert image_hash(img) != image_hash(np.ones((4, 4, 3), dtype=np.uint8))

    def test_extract_patches(self):
        img = np.full((100, 100, 3), 128, dtype=np.uint8)
        lms = {234: (20, 50), 454: (80, 50), 10: (50, 20)}
        px = extract_cheek_forehead_patches(img, lms, radius=3)
        assert len(px) == 3 * 7 * 7  # 3 patch × (2r+1)²


class TestPipelines:
    def test_skin_pipeline_monk_bucket(self):
        out = skin.run(lab={"l": 54.4, "a": 10.3, "b": 27.2})
        assert out["tone"] == "Tan"
        assert out["monk_code"] == "MST-06"
        assert out["label_indonesian"].startswith("Tan")

    def test_skin_pipeline_deterministic(self):
        a = skin.run(lab={"l": 54.4, "a": 10.3, "b": 27.2})
        b = skin.run(lab={"l": 54.4, "a": 10.3, "b": 27.2})
        assert a == b

    def test_skin_pipeline_rejects_empty(self):
        with pytest.raises(ValueError):
            skin.run()

    def test_face_pipeline_ratios(self):
        lms = {
            10: (200.0, 60.0), 152: (200.0, 300.0),
            234: (120.0, 160.0), 454: (280.0, 160.0),
            332: (160.0, 100.0), 62: (240.0, 100.0),
            172: (140.0, 250.0), 397: (260.0, 250.0),
            33: (160.0, 150.0), 263: (240.0, 150.0),
        }
        out = face.run(landmarks=lms)
        assert set(out["ratios"]) == {
            "face_width_to_height", "jaw_to_forehead", "cheekbone_to_jaw", "chin_sharpness"
        }
        assert out["shape"] in {"Oval", "Round", "Square", "Heart", "Diamond", "Oblong"}

    def test_face_pipeline_rejects_extreme_roll(self):
        lms = {
            10: (60.0, 200.0), 152: (300.0, 200.0),
            234: (160.0, 120.0), 454: (160.0, 280.0),
            332: (100.0, 240.0), 62: (100.0, 160.0),
            172: (250.0, 230.0), 397: (250.0, 150.0),
            33: (100.0, 240.0), 263: (100.0, 160.0),  # roll 90°
        }
        with pytest.raises(ValueError):
            face.run(landmarks=lms)

    def test_gender_pipeline_report(self):
        masc = {"jaw_to_cheek": 0.95, "brow_to_eye": 0.12, "lip_to_face_width": 0.36, "face_aspect": 0.82}
        fem = {"jaw_to_cheek": 0.74, "brow_to_eye": 0.22, "lip_to_face_width": 0.49, "face_aspect": 0.71}
        hits = 0
        for vec, want in [(masc, "male"), (fem, "female")] * 2:
            out = gender.run(features=vec)
            assert out["confidence"] <= 0.78
            hits += int(out["label_id"] == want)
        assert hits == 4  # akurasi 1.0 pada 4 vektor sintetis

    def test_gender_pipeline_rejects_bad_features(self):
        with pytest.raises(ValueError):
            gender.run(features={"jaw_to_cheek": 0.9})  # fitur tidak lengkap
        with pytest.raises(ValueError):
            gender.run(features={"jaw_to_cheek": 99.0, "brow_to_eye": 0.16,
                                 "lip_to_face_width": 0.42, "face_aspect": 0.75})  # di luar rentang

    def test_pipeline_stage_order(self):
        for out in (
            skin.run(lab={"l": 54.4, "a": 10.3, "b": 27.2}),
            gender.run(features={"jaw_to_cheek": 0.9, "brow_to_eye": 0.15,
                                 "lip_to_face_width": 0.4, "face_aspect": 0.76}),
        ):
            nums = [s["stage"] for s in out["stages"]]
            assert nums == sorted(nums)  # stage 1-4 berurutan menaik

    def test_validate_skips_missing_dataset(self):
        assert skin.validate("Z:/nonexistent")["status"] == "skipped"
        assert gender.validate("Z:/nonexistent")["status"] == "skipped"
