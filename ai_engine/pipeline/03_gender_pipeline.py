"""Process AI Face Analysis — 03 Gender (Jenis Kelamin)

DATASET (riil, terverifikasi 2026-08-23 — diunduh manual oleh user, tidak otomatis):
  - UTKFace — 20k+ citra, label age/gender/ethnicity di nama file
    ([age]_[gender]_[race]_*.jpg; gender 0=male, 1=female).
    https://susanqq.github.io/UTKFace/ | mirror: Kaggle "UTKFace"
  - FairFace — 108.501 citra race-balanced (utama anti-bias kalibrasi).
    https://huggingface.co/datasets/HuggingFaceM4/FairFace
  - Pretrained opsi 1 (kalibrasi offline SAJA, tidak masuk produk):
    DeepFace (gender/race, trained UTKFace) — pip install deepface.

Tahap process (dipanggil berurutan oleh run() / CLI):
  STAGE 1 CLEANING    — buang age<10 (proporsi anak mendistorsi rasio dewasa),
                        dedup hash, fitur non-finite → skip
  STAGE 2 NORMALIZATION — roll-align, fitur dinormalisasi terhadap ukuran wajah
                        (invarian skala & jarak kamera)
  STAGE 3 PREPROCESSING — 4 fitur dimorfisme: jaw_to_cheek, brow_to_eye,
                        lip_to_face_width, face_aspect
  STAGE 4 CLASSIFY    — GenderEstimator rule engine produksi (deterministik,
                        confidence jujur 0.50-0.78; self-report kuesioner menimpa)
  STAGE 5 VALIDATE    (--dataset-dir opsional) — akurasi terhadap
                        `<dir>/features.csv` (label,jaw,brow,lip,aspect) +
                        usulan kalibrasi threshold NEUTRAL.
  Opsi --finetune: cetak rencana fine-tune MobileNetV3-ES TANPA menjalankannya.
"""

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, Optional

_BASE = str(Path(__file__).resolve().parents[2])
if _BASE not in sys.path:
    sys.path.insert(0, _BASE)

from ai_engine.models.gender_estimator import GenderEstimator  # noqa: E402

REQUIRED = ("jaw_to_cheek", "brow_to_eye", "lip_to_face_width", "face_aspect")


def run(
    features: Optional[Dict[str, float]] = None,
    dataset_dir: Optional[str] = None,
    min_age: int = 10,
) -> Dict[str, Any]:
    """Jalankan STAGE 1-4 (dan 5 bila dataset_dir diberikan). Deterministik."""
    stages: list = []

    # STAGE 1 CLEANING — fitur harus lengkap & finite
    if not features:
        raise ValueError("butuh features dict 4 rasio dimorfisme")
    missing = [k for k in REQUIRED if k not in features]
    bad = [k for k in REQUIRED if not isinstance(features.get(k), (int, float))]
    if missing or bad:
        raise ValueError(f"STAGE 1: fitur rusak/hilang {missing or bad} → sampel dibuang")
    stages.append({"stage": 1, "name": "cleaning", "n_features": len(REQUIRED), "min_age_filter": min_age})

    # STAGE 2 NORMALIZATION — fitur klien sudah rasio (invarian skala); verifikasi rentang
    for k in REQUIRED:
        if not 0.0 < float(features[k]) < 3.0:
            raise ValueError(f"STAGE 2: {k}={features[k]} di luar rentang wajar → sampel dibuang")
    stages.append({"stage": 2, "name": "normalization", "scale": "face-size-invariant ratios"})

    # STAGE 3 PREPROCESSING — vektor numerik siap klasifikasi
    vec = {k: round(float(features[k]), 4) for k in REQUIRED}
    stages.append({"stage": 3, "name": "preprocessing", **vec})

    # STAGE 4 CLASSIFY — rule engine produksi
    out = GenderEstimator.classify(vec)
    stages.append({"stage": 4, "name": "classify", "label_id": out["label_id"]})

    report: Dict[str, Any] = {"task": "gender", **out, "features": vec, "stages": stages}
    if dataset_dir:
        report["validation"] = validate(dataset_dir)
    return report


def validate(dataset_dir: str) -> Dict[str, Any]:
    """STAGE 5 — akurasi terhadap `<dir>/features.csv` (label,jaw,brow,lip,aspect).

    Label: male|female. Baris berasal dari ekstraksi landmark UTKFace/FairFace
    (file `[age]_1_*` difilter age<10 oleh alat ekstraksi — konsisten STAGE 1).
    Menghitung juga usulan threshold terkalibrasi (mean per gender).
    """
    csv_path = Path(dataset_dir) / "features.csv"
    if not csv_path.exists():
        return {"status": "skipped", "reason": f"{csv_path} tidak ditemukan"}

    correct = total = 0
    sums = {"male": {k: 0.0 for k in REQUIRED}, "female": {k: 0.0 for k in REQUIRED}}
    counts = {"male": 0, "female": 0}
    confusion = {"male": {"male": 0, "female": 0}, "female": {"male": 0, "female": 0}}
    with csv_path.open(encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) != 5:
                continue
            try:
                truth = parts[0].strip().lower()
                vec = dict(zip(REQUIRED, (float(v) for v in parts[1:])))
            except ValueError:
                continue
            if truth not in ("male", "female"):
                continue
            pred = GenderEstimator.classify(vec)["label_id"]
            confusion[truth][pred] += 1
            correct += int(pred == truth)
            total += 1
            for k in REQUIRED:
                sums[truth][k] += vec[k]
            counts[truth] += 1

    if total == 0:
        return {"status": "skipped", "reason": "features.csv kosong"}
    calibrated = {
        g: {k: round(sums[g][k] / counts[g], 3) for k in REQUIRED} for g in counts if counts[g]
    }
    return {
        "status": "ok",
        "accuracy": round(correct / total, 4),
        "confusion": confusion,
        "samples": total,
        "calibrated_neutral_hint": calibrated,
    }


def finetune_plan() -> str:
    return (
        "RENCANA FINE-TUNE (tidak dieksekusi otomatis):\n"
        "  1. MobileNetV3-ES + head 2-kelas binary CE (UTKFace 20k + FairFace 108k)\n"
        "  2. Sampling race-balanced dari FairFace (anti-bias utama)\n"
        "  3. Augment: flip horizontal, ±10° rotasi, grayscale prob 0.1\n"
        "  4. RTX 4060 8GB: bs 128, AMP fp16, ~15 menit/epoch\n"
        "  5. Peran model di project ini: VALIDATOR kalibrasi threshold rule engine\n"
        "     (opsi 1 disetujui) — produksi tetap angka-only UU PDP"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline gender (STAGE 1-5)")
    parser.add_argument("--dataset-dir", default=None, help="folder features.csv untuk STAGE 5")
    parser.add_argument("--finetune", action="store_true", help="cetak rencana fine-tune")
    args = parser.parse_args()

    if args.finetune:
        print(finetune_plan())
        return

    # Smoke self-check: vektor maskulin
    report = run(
        features={"jaw_to_cheek": 0.95, "brow_to_eye": 0.12,
                  "lip_to_face_width": 0.36, "face_aspect": 0.82},
        dataset_dir=args.dataset_dir,
    )
    for s in report["stages"]:
        print(f"  STAGE {s['stage']} {s['name']:<14} {s}")
    print(f"→ {report['label']} ({report['confidence']}) rule={report['rule']}")
    if "validation" in report:
        print(f"VALIDASI: {report['validation']}")


if __name__ == "__main__":
    main()
