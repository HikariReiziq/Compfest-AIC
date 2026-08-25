"""Latih classifier gender dari rasio landmark, bukan dari gambar.

Tahap kedua setelah extract_gender_features.py. Masukannya CSV angka, jadi
pelatihan maupun inferensi tidak pernah menyentuh citra wajah.

KENAPA REGRESI LOGISTIK, BUKAN RANDOM FOREST

Empat fitur kontinu dengan batas keputusan yang secara antropometri memang
mulus. Regresi logistik cocok untuk itu, dan memberi tiga hal yang berharga di
sini: peluang yang bisa dipakai langsung sebagai confidence, koefisien yang
bisa dibaca sebagai bobot tiap rasio, dan model berukuran beberapa kilobyte
yang deterministik. Random Forest akan menghafal batas bergerigi pada empat
fitur dan tidak memberi satu pun dari itu.

Fitur dibakukan dengan StandardScaler; skala mentah tiap rasio berbeda-beda,
dan tanpa pembakuan koefisiennya tidak bisa dibandingkan satu sama lain.

Pakai:
  python ai_engine/scripts/train_gender.py --csv ai_engine/data/gender_features.csv
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
WEIGHTS_DIR = BASE_DIR / "ai_engine" / "models" / "weights"
MODEL_PATH = WEIGHTS_DIR / "gender_lr.joblib"
REPORT_PATH = WEIGHTS_DIR / "gender_lr.json"

FEATURE_ORDER = ["jaw_to_cheek", "brow_to_eye", "lip_to_face_width", "face_aspect"]

# Di bawah ambang ini model tidak layak dipakai. Rule engine yang ada sudah
# memberi jawaban yang masuk akal; mengganti dengan model yang nyaris menebak
# hanya menambah kerumitan tanpa menambah akurasi.
MIN_ACCURACY = 0.70


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", default=str(BASE_DIR / "ai_engine" / "data" / "gender_features.csv"))
    ap.add_argument("--min-accuracy", type=float, default=MIN_ACCURACY)
    ap.add_argument("--force", action="store_true", help="simpan walau di bawah ambang")
    args = ap.parse_args()

    try:
        import numpy as np
        import joblib
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import cross_val_score, train_test_split
        from sklearn.metrics import classification_report, confusion_matrix
    except ImportError as err:
        print(f"dependensi belum lengkap: {err}", file=sys.stderr)
        print("pasang: pip install scikit-learn joblib", file=sys.stderr)
        return 2

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"CSV tidak ada: {csv_path}", file=sys.stderr)
        print("jalankan lebih dulu: python ai_engine/scripts/extract_gender_features.py --images <dir>",
              file=sys.stderr)
        return 1

    import csv as csvmod
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        for row in csvmod.DictReader(fh):
            try:
                rows.append(
                    ([float(row[f]) for f in FEATURE_ORDER], 1 if row["label"] == "male" else 0)
                )
            except (KeyError, ValueError):
                continue

    if len(rows) < 200:
        print(f"data terlalu sedikit: {len(rows)} baris.", file=sys.stderr)
        print("Model yang dilatih pada data sebanyak ini tidak akan lebih baik", file=sys.stderr)
        print("daripada rule engine, dan akurasinya tidak bisa diukur dengan bermakna.", file=sys.stderr)
        return 1

    X = np.array([r[0] for r in rows], dtype=float)
    y = np.array([r[1] for r in rows], dtype=int)
    n_male, n_female = int(y.sum()), int((1 - y).sum())
    print(f"data: {len(y)} baris (pria {n_male}, wanita {n_female})")

    pipe = Pipeline([
        ("scale", StandardScaler()),
        # class_weight menyeimbangkan kelas yang timpang; tanpa ini model
        # cukup menebak kelas mayoritas untuk terlihat akurat.
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])

    # Cross-validation dilaporkan lebih dulu: angka dari satu pembagian tunggal
    # gampang menyesatkan pada dataset kecil.
    scores = cross_val_score(pipe, X, y, cv=5, scoring="accuracy")
    cv_mean, cv_std = float(scores.mean()), float(scores.std())
    print(f"akurasi cross-validation (5 lipatan): {cv_mean:.3f} +/- {cv_std:.3f}")

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    pipe.fit(X_tr, y_tr)
    holdout = float(pipe.score(X_te, y_te))
    print(f"akurasi holdout                     : {holdout:.3f}\n")
    print(classification_report(y_te, pipe.predict(X_te), target_names=["female", "male"]))
    print("matriks kebingungan (baris = sebenarnya):")
    print(confusion_matrix(y_te, pipe.predict(X_te)))

    coefs = pipe.named_steps["clf"].coef_[0]
    print("\nbobot terpelajar (satuan baku, positif = maskulin):")
    for name, c in sorted(zip(FEATURE_ORDER, coefs), key=lambda t: -abs(t[1])):
        print(f"  {name:<20}{c:+.3f}")

    if cv_mean < args.min_accuracy and not args.force:
        print(f"\nTIDAK DISIMPAN: akurasi {cv_mean:.3f} di bawah ambang {args.min_accuracy}.")
        print("Rule engine yang ada lebih layak dipakai daripada model selemah ini.")
        print("Pakai --force bila memang ingin menyimpannya.")
        return 1

    pipe.fit(X, y)  # latih ulang pada seluruh data untuk model final
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipe, "features": FEATURE_ORDER}, MODEL_PATH, compress=3)
    REPORT_PATH.write_text(json.dumps({
        "samples": len(y), "male": n_male, "female": n_female,
        "cv_accuracy_mean": round(cv_mean, 4), "cv_accuracy_std": round(cv_std, 4),
        "holdout_accuracy": round(holdout, 4),
        "coefficients": {k: round(float(v), 4) for k, v in zip(FEATURE_ORDER, coefs)},
        "feature_order": FEATURE_ORDER,
    }, indent=2) + "\n", encoding="utf-8")

    print(f"\ntersimpan -> {MODEL_PATH}")
    print(f"ringkasan -> {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
