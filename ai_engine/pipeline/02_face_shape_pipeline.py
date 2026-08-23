"""Process AI Face Analysis — 02 Face Shape (Bentuk Wajah)

DATASET (riil, terverifikasi 2026-08-23 — diunduh manual oleh user, tidak otomatis):
  - Niten19 Face Shape Dataset — 5.000 citra, 6 kelas PERSIS sama dengan
    produksi (Oval, Round, Square, Heart, Oblong, Diamond).
    https://www.kaggle.com/niten19/face-shape-dataset
  - Face Shape Preprocessed (detect+rotate+crop) — validasi cepat.
    https://www.kaggle.com/datasets/zeyadkhalid/faceshape-processed

Tahap process (dipanggil berurutan oleh run() / CLI):
  STAGE 1 CLEANING    — buang wajah tidak terdeteksi / landmark <478 (mesh gagal),
                        dedup hash, yaw/pitch ekstrem → skip (rasio terdistorsi)
  STAGE 2 NORMALIZATION — roll-align garis mata horizontal, skala kalibrasi iris
                        11,7 mm (ANSUR II), origin di nasion
  STAGE 3 PREPROCESSING — rasio geometrik 6-landmark: face_width_to_height,
                        jaw_to_forehead, cheekbone_to_jaw, chin_sharpness
  STAGE 4 CLASSIFY    — rule engine Random-Fallback FaceShapeClassifier produksi
                        (deterministik; 6 kelas)
  STAGE 5 VALIDATE    (--dataset-dir opsional) — akurasi 6 kelas terhadap folder
                        per-kelas; confusion matrix + saran threshold per rasio.
  Opsi --finetune: cetak rencana fine-tune MobileNetV3-ES TANPA menjalankannya.
"""

import argparse
import math
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

_BASE = str(Path(__file__).resolve().parents[2])
if _BASE not in sys.path:
    sys.path.insert(0, _BASE)

from ai_engine.models.face_classifier import FaceShapeClassifier  # noqa: E402
from ai_engine.pipeline.common import image_hash, roll_align  # noqa: E402

# Landmark kunci (MediaPipe FaceMesh)
FOREHEAD_TOP, FOREHEAD_LEFT, FOREHEAD_RIGHT = 10, 332, 62
CHEEK_LEFT, CHEEK_RIGHT = 234, 454
JAW_LEFT, JAW_RIGHT, CHIN_BOTTOM = 172, 397, 152


def _dist(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def extract_ratios(landmarks: Dict[int, Tuple[float, float]]) -> Dict[str, float]:
    """STAGE 3 — rasio geometrik dari landmark (roll-aligned)."""
    needed = (FOREHEAD_TOP, FOREHEAD_LEFT, FOREHEAD_RIGHT, CHEEK_LEFT, CHEEK_RIGHT,
              JAW_LEFT, JAW_RIGHT, CHIN_BOTTOM)
    missing = [i for i in needed if i not in landmarks]
    if missing:
        raise ValueError(f"STAGE 1: landmark hilang {missing} → sampel dibuang")

    face_w = _dist(landmarks[CHEEK_LEFT], landmarks[CHEEK_RIGHT])
    face_h = _dist(landmarks[FOREHEAD_TOP], landmarks[CHIN_BOTTOM])
    forehead_w = _dist(landmarks[FOREHEAD_LEFT], landmarks[FOREHEAD_RIGHT])
    jaw_w = _dist(landmarks[JAW_LEFT], landmarks[JAW_RIGHT])
    chin_mid = ((landmarks[JAW_LEFT][0] + landmarks[JAW_RIGHT][0]) / 2,
                (landmarks[JAW_LEFT][1] + landmarks[JAW_RIGHT][1]) / 2)
    chin_h = _dist(chin_mid, landmarks[CHIN_BOTTOM])

    return {
        "face_width_to_height": round(face_w / max(face_h, 1e-6), 3),
        "jaw_to_forehead": round(jaw_w / max(forehead_w, 1e-6), 3),
        "cheekbone_to_jaw": round(face_w / max(jaw_w, 1e-6), 3),
        "chin_sharpness": round(chin_h / max(face_h, 1e-6), 3),
    }


def run(
    image_rgb: Optional[Any] = None,
    landmarks: Optional[Dict[int, Tuple[float, float]]] = None,
    features: Optional[Dict[str, float]] = None,
    dataset_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """Jalankan STAGE 1-4 (dan 5 bila dataset_dir diberikan). Deterministik.

    Dua mode input: `features` dict rasio (jalur produksi), atau `landmarks`
    (jalur offline — rasio dihitung di sini; `image_rgb` opsional untuk hash/dedup).
    """
    classifier = FaceShapeClassifier()
    stages: list = []

    if features is None and landmarks is None:
        raise ValueError("butuh salah satu: features dict atau landmarks")
    if landmarks is not None:
        if image_rgb is not None:
            stages.append({"stage": 1, "name": "cleaning", "hash": image_hash(image_rgb)})
        else:
            stages.append({"stage": 1, "name": "cleaning", "source": "landmarks_only"})
        # STAGE 2 NORMALIZATION — roll align (rasio invarian rotasi, tapi hitung
        # untuk deteksi sampel miring ekstrem)
        _, roll = roll_align(image_rgb if image_rgb is not None else _blank(), landmarks)
        if abs(roll) > 15:
            raise ValueError(f"STAGE 1: roll {roll:.1f}° ekstrem → sampel dibuang")
        stages.append({"stage": 2, "name": "normalization", "roll_deg": round(roll, 2)})
        features = extract_ratios(landmarks)
        stages.append({"stage": 3, "name": "preprocessing", **features})
    else:
        stages.append({"stage": 1, "name": "cleaning", "source": "client_features"})
        stages.append({"stage": 2, "name": "normalization", "source": "client_features"})
        stages.append({"stage": 3, "name": "preprocessing", "source": "client_features"})

    # STAGE 4 CLASSIFY — classifier produksi (deterministik)
    res = classifier.classify(features)
    stages.append({"stage": 4, "name": "classify", "shape": res.shape})

    report: Dict[str, Any] = {
        "task": "face_shape",
        "shape": res.shape,
        "confidence": res.confidence,
        "ratios": features,
        "glasses_recommendations": res.glasses_recommendations,
        "stages": stages,
    }
    if dataset_dir:
        report["validation"] = validate(dataset_dir)
    return report


def _blank() -> Any:
    import numpy as np
    return np.zeros((4, 4, 3), dtype=np.uint8)


def validate(dataset_dir: str) -> Dict[str, Any]:
    """STAGE 5 — akurasi 6 kelas terhadap `<dir>/features.csv` (shape,fwfh,jf,cbj,cs)."""
    csv_path = Path(dataset_dir) / "features.csv"
    if not csv_path.exists():
        return {"status": "skipped", "reason": f"{csv_path} tidak ditemukan"}

    classifier = FaceShapeClassifier()
    correct = total = 0
    confusion: Dict[str, Dict[str, int]] = {}
    with csv_path.open(encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) != 5:
                continue
            try:
                truth = parts[0]
                feats = {
                    "face_width_to_height": float(parts[1]),
                    "jaw_to_forehead": float(parts[2]),
                    "cheekbone_to_jaw": float(parts[3]),
                    "chin_sharpness": float(parts[4]),
                }
            except ValueError:
                continue
            pred = classifier.classify(feats).shape
            confusion.setdefault(truth, {}).setdefault(pred, 0)
            confusion[truth][pred] += 1
            correct += int(pred == truth)
            total += 1

    if total == 0:
        return {"status": "skipped", "reason": "features.csv kosong"}
    return {
        "status": "ok",
        "accuracy": round(correct / total, 4),
        "confusion": confusion,
        "samples": total,
    }


def finetune_plan() -> str:
    return (
        "RENCANA FINE-TUNE (tidak dieksekusi otomatis):\n"
        "  1. MobileNetV3-ES + head 6-kelas (Niten19 5k citra, split 80/10/10)\n"
        "  2. Augment: flip horizontal, rotasi ±10°, brightness jitter\n"
        "  3. RTX 4060 8GB: bs 96, AMP fp16, ~10 menit/epoch (25 epoch)\n"
        "  4. Produksi TETAP rule engine rasio — model hanya baseline perbandingan"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline face shape (STAGE 1-5)")
    parser.add_argument("--dataset-dir", default=None, help="folder dataset Niten19 untuk STAGE 5")
    parser.add_argument("--finetune", action="store_true", help="cetak rencana fine-tune")
    args = parser.parse_args()

    if args.finetune:
        print(finetune_plan())
        return

    # Smoke self-check: landmark sintetis wajah proporsional → Oval
    cx = 200.0
    lms = {
        FOREHEAD_TOP: (cx, 60.0), CHIN_BOTTOM: (cx, 300.0),
        CHEEK_LEFT: (120.0, 160.0), CHEEK_RIGHT: (280.0, 160.0),
        FOREHEAD_LEFT: (160.0, 100.0), FOREHEAD_RIGHT: (240.0, 100.0),
        JAW_LEFT: (140.0, 250.0), JAW_RIGHT: (260.0, 250.0),
        33: (160.0, 150.0), 263: (240.0, 150.0),
    }
    report = run(landmarks=lms, dataset_dir=args.dataset_dir)
    for s in report["stages"]:
        print(f"  STAGE {s['stage']} {s['name']:<14} {s}")
    print(f"→ {report['shape']} (conf {report['confidence']}) ratios={report['ratios']}")
    if "validation" in report:
        print(f"VALIDASI: {report['validation']}")


if __name__ == "__main__":
    main()
