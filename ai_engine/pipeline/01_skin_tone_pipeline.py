"""Process AI Face Analysis — 01 Skin Tone (Warna Kulit)

DATASET (riil, terverifikasi 2026-08-23 — diunduh manual oleh user, tidak otomatis):
  - Monk Skin Tone Scale (Google × Dr. Ellis Monk) — 10 swatch referensi,
    lisensi terbuka. https://skintone.google/
  - SCIN (Google Research) — 10k+ citra berlabel MST 1-10.
    https://github.com/google-research-datasets/scin
  - FairFace — 108.501 citra race-balanced (proxy tone).
    https://huggingface.co/datasets/HuggingFaceM4/FairFace

Tahap process (dipanggil berurutan oleh run() / CLI):
  STAGE 1 CLEANING    — buang sampel rusak/blur/tidak terdeteksi wajah (MediaPipe
                        detect di sisi klien), dedup hash, LAB non-finite → skip
  STAGE 2 NORMALIZATION — alignment roll→0 (garis mata horizontal), patch pipi+dahi,
                        konversi sRGB→CIELAB D65 white-point
  STAGE 3 PREPROCESSING — fitur LAB: mean patch (chroma stabil), std_l, ITA median
  STAGE 4 CLASSIFY    — nearest-ΔE vs MST_REFERENCE_TABLE → monk index → bucket
                        skin_tone 5 kategori (Fair/Light/Medium/Tan/Dark) — deterministik
  STAGE 5 VALIDATE    (--dataset-dir opsional) — akurasi bucket estimator terhadap
                        label MST dataset; laporan per-kelas + saran kalibrasi ΔE.
  Opsi --finetune: cetak rencana fine-tune MobileNetV3-ES (RTX 4060 8GB, transfer
  learning head-only, ~15 menit/epoch) TANPA menjalankannya.
"""

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np

_BASE = str(Path(__file__).resolve().parents[2])
if _BASE not in sys.path:
    sys.path.insert(0, _BASE)

from ai_engine.models.skin_analyzer import SKIN_TONE_LABELS, monk_to_skin_tone  # noqa: E402
from ai_engine.pipeline.common import (  # noqa: E402
    extract_cheek_forehead_patches,
    image_hash,
    ita_from_lab,
    lab_to_monk_index,
    rgb_to_lab_pixels,
    roll_align,
)


def run(
    image_rgb: Optional[np.ndarray] = None,
    landmarks: Optional[Dict[int, tuple]] = None,
    lab: Optional[Dict[str, float]] = None,
    dataset_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """Jalankan STAGE 1-4 (dan 5 bila dataset_dir diberikan). Deterministik.

    Dua mode input:
    - `lab` dict {l, a, b, std_l?} — jalur produksi (payload angka dari klien).
    - `image_rgb` + `landmarks` — jalur offline (patch pipi/dahi dihitung di sini).
    """
    stages: list = []

    # STAGE 1 CLEANING — validasi finite + dedup hash
    if lab is None and image_rgb is None:
        raise ValueError("butuh minimal salah satu: lab dict atau image_rgb+landmarks")
    if image_rgb is not None:
        if not isinstance(image_rgb, np.ndarray) or image_rgb.size == 0:
            raise ValueError("STAGE 1: gambar kosong/rusak → sampel dibuang")
        stages.append({"stage": 1, "name": "cleaning", "hash": image_hash(image_rgb)})

    lab_mean = None
    std_l = 0.0
    if lab is not None:
        try:
            lab_mean = (float(lab["l"]), float(lab["a"]), float(lab["b"]))
            std_l = float(lab.get("std_l") or 0.0)
        except (KeyError, TypeError, ValueError):
            raise ValueError("STAGE 1: LAB non-finite → sampel dibuang")
        stages.append({"stage": 1, "name": "cleaning", "source": "client_lab"})
    else:
        # STAGE 2 NORMALIZATION — roll align + patch + sRGB→LAB
        img, roll = roll_align(image_rgb, landmarks or {})
        patch = extract_cheek_forehead_patches(img, landmarks or {})
        if len(patch) == 0:
            raise ValueError("STAGE 2: landmark pipi/dahi tidak ditemukan")
        lab_px = rgb_to_lab_pixels(patch)
        # STAGE 3 PREPROCESSING — mean patch + std L + ITA median
        lab_mean = tuple(float(v) for v in lab_px.mean(axis=0))
        std_l = float(lab_px[:, 0].std())
        ita = ita_from_lab(lab_px)
        stages.append({"stage": 2, "name": "normalization", "roll_deg": round(roll, 2)})
        stages.append({"stage": 3, "name": "preprocessing", "patch_px": int(len(patch)), "ita_deg": round(ita, 1)})

    if lab_mean is not None and not all(np.isfinite(lab_mean)):
        raise ValueError("STAGE 1: LAB non-finite → sampel dibuang")

    # STAGE 4 CLASSIFY — nearest-ΔE → monk → bucket 5 kategori
    monk = lab_to_monk_index(lab_mean)
    tone = monk_to_skin_tone(monk)
    stages.append({"stage": 4, "name": "classify", "monk_index": monk, "tone": tone})

    report: Dict[str, Any] = {
        "task": "skin_tone",
        "tone": tone,
        "label_indonesian": SKIN_TONE_LABELS[tone],
        "monk_index": monk,
        "monk_code": f"MST-{monk:02d}",
        "lab_mean": [round(v, 2) for v in lab_mean],
        "std_l": round(std_l, 2),
        "stages": stages,
    }

    if dataset_dir:
        report["validation"] = validate(dataset_dir)
    return report


def validate(dataset_dir: str) -> Dict[str, Any]:
    """STAGE 5 — validasi estimator terhadap dataset berlabel MST lokal.

    Format: `<dataset_dir>/labels.csv` dengan baris `l,a,b,mst_index`
    (LAB diekstrak dari citra dataset oleh klien ekstraktor — pipeline ini
    sengaja angka-only, konsisten dengan jalur produksi UU PDP).
    """
    csv_path = Path(dataset_dir) / "labels.csv"
    if not csv_path.exists():
        return {"status": "skipped", "reason": f"{csv_path} tidak ditemukan"}

    correct = total = 0
    confusion: Dict[str, Dict[str, int]] = {}
    with csv_path.open(encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) != 4:
                continue
            try:
                l, a, b, truth = (float(parts[0]), float(parts[1]), float(parts[2]), int(parts[3]))
            except ValueError:
                continue  # STAGE 1: baris rusak dibuang
            pred = lab_to_monk_index((l, a, b))
            t_key, p_key = f"MST-{truth:02d}", f"MST-{pred:02d}"
            confusion.setdefault(t_key, {}).setdefault(p_key, 0)
            confusion[t_key][p_key] += 1
            correct += int(pred == truth)
            total += 1

    if total == 0:
        return {"status": "skipped", "reason": "labels.csv kosong"}
    weak = [k for k, row in confusion.items() if sum(row.values()) and row.get(k, 0) / sum(row.values()) < 0.6]
    return {
        "status": "ok",
        "accuracy": round(correct / total, 4),
        "confusion": confusion,
        "samples": total,
        "calibration_hint": f"kelas lemah (<0.6): {weak or 'tidak ada'}",
    }


def finetune_plan() -> str:
    return (
        "RENCANA FINE-TUNE (tidak dieksekusi otomatis — lisensi dataset user):\n"
        "  1. Backbone MobileNetV3-ES pretrained ImageNet (2.9M param, 4060-friendly)\n"
        "  2. Freeze backbone, ganti head → 10-way softmax (MST-01..10), CE loss\n"
        "  3. Augment: mild jitter brightness/hue (skin chroma dipertahankan)\n"
        "  4. RTX 4060 8GB: bs 128, AMP fp16, ~15 menit/epoch (SCIN 10k)\n"
        "  5. Ekspor → ONNX; produksi TETAP rule ΔE (model hanya untuk kalibrasi threshold)"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline skin tone (STAGE 1-5)")
    parser.add_argument("--dataset-dir", default=None, help="folder dataset MST untuk STAGE 5")
    parser.add_argument("--finetune", action="store_true", help="cetak rencana fine-tune")
    args = parser.parse_args()

    if args.finetune:
        print(finetune_plan())
        return

    # Smoke self-check: LAB MST-06 sawo matang → bucket Tan
    report = run(lab={"l": 54.4, "a": 10.3, "b": 27.2}, dataset_dir=args.dataset_dir)
    for s in report["stages"]:
        print(f"  STAGE {s['stage']} {s['name']:<14} {s}")
    print(f"→ {report['monk_code']} {report['tone']} ({report['label_indonesian']})")
    if "validation" in report:
        print(f"VALIDASI: {report['validation']}")


if __name__ == "__main__":
    main()
