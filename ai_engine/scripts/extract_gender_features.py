"""Ekstraksi rasio dimorfisme wajah dari dataset gambar menjadi CSV.

Tahap pertama dari dua: skrip ini mengubah gambar berlabel menjadi ANGKA, lalu
train_gender.py melatih classifier dari angka itu. Pemisahan ini disengaja —
begitu CSV jadi, gambarnya tidak dibutuhkan lagi dan tidak pernah ikut ke mana
pun, sejalan dengan janji sistem bahwa citra wajah tidak berpindah.

RUMUSNYA WAJIB SAMA DENGAN KLIEN

Rasio di sini adalah salinan langsung computeGenderFeatures() di
client/src/lib/faceGeometry.ts, termasuk pembakuan sumbu lewat toMetricLandmarks.
Kalau keduanya menyimpang sedikit saja, model belajar pada distribusi yang
berbeda dari yang ditemuinya saat melayani pengguna, dan akurasinya akan
runtuh tanpa gejala yang jelas. Setiap perubahan di satu sisi harus diikuti
sisi lain.

Dataset yang didukung (deteksi label otomatis):
  UTKFace   nama berkas [usia]_[gender]_[ras]_*.jpg   gender 0=pria 1=wanita
  FairFace  CSV terpisah berisi kolom file,gender

Pakai:
  python ai_engine/scripts/extract_gender_features.py \
      --images <dir> --out ai_engine/data/gender_features.csv [--limit N]
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

MODEL_PATH = BASE_DIR / "ai_engine" / "models" / "weights" / "face_landmarker.task"

# Indeks landmark — sama persis dengan faceGeometry.ts.
LM_CHEEK_L, LM_CHEEK_R = 234, 454
LM_JAW_L, LM_JAW_R = 172, 397
LM_BROW_R, LM_EYE_R = 105, 159
LM_LIP_L, LM_LIP_R = 61, 291
LM_FACE_TOP, LM_CHIN = 10, 152

LM_NOSE_TIP = 1
LM_EYE_R_INNER, LM_EYE_L_INNER = 133, 362

FIELDS = ["label", "jaw_to_cheek", "brow_to_eye", "lip_to_face_width", "face_aspect"]

# Rasio yang bergantung arah hadap, beserta arah koreksinya. Sama dengan
# _undo_pose di ai_engine/models/gender_estimator.py.
POSE_SENSITIVE = ("brow_to_eye", "face_aspect")


# Titik hasil pembakuan dari pemanggilan terakhir, dipakai menghitung pose
# tanpa mengubah tanda tangan fungsi yang meniru klien.
_last_points: list = []


def _dist(a, b) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def compute_gender_features(landmarks, width: int, height: int) -> dict[str, float]:
    """Salinan computeGenderFeatures() klien, termasuk pembakuan sumbu.

    MediaPipe menormalkan x terhadap LEBAR gambar dan y terhadap TINGGI-nya.
    Setiap rasio yang mencampur kedua sumbu karena itu ikut membawa rasio aspek
    gambar. toMetricLandmarks menyatukan keduanya ke satuan tinggi sebelum
    apa pun dihitung; tanpa langkah ini, dataset dengan rasio aspek berbeda
    akan menghasilkan distribusi rasio yang berbeda pula.
    """
    k = width / max(1, height)
    pts = [(lm.x * k, lm.y) for lm in landmarks]

    _last_points.clear()
    _last_points.extend(pts)

    cheek = _dist(pts[LM_CHEEK_L], pts[LM_CHEEK_R])
    jaw = _dist(pts[LM_JAW_L], pts[LM_JAW_R])
    lip_w = _dist(pts[LM_LIP_L], pts[LM_LIP_R])
    face_h = _dist(pts[LM_FACE_TOP], pts[LM_CHIN])
    brow_eye = abs(pts[LM_BROW_R][1] - pts[LM_EYE_R][1])

    eps = 1e-6
    return {
        "jaw_to_cheek": round(jaw / max(eps, cheek), 4),
        "brow_to_eye": round(brow_eye / max(eps, cheek), 4),
        "lip_to_face_width": round(lip_w / max(eps, cheek), 4),
        "face_aspect": round(cheek / max(eps, face_h), 4),
    }


def compute_pose(pts) -> tuple[float, float]:
    """Perkiraan yaw dan pitch dari landmark — salinan computePose() klien.

    Dataset tidak menyertakan sudut kepala, jadi sudutnya disimpulkan dari
    landmark itu sendiri, memakai rumus yang sama dengan yang dipakai saat
    melayani pengguna.
    """
    face_w = _dist(pts[LM_CHEEK_L], pts[LM_CHEEK_R]) or 1e-6
    yaw_asym = abs(
        _dist(pts[LM_NOSE_TIP], pts[LM_CHEEK_L]) - _dist(pts[LM_NOSE_TIP], pts[LM_CHEEK_R])
    ) / face_w
    yaw_deg = yaw_asym * 60.0

    eye_mid = (
        (pts[LM_EYE_R_INNER][0] + pts[LM_EYE_L_INNER][0]) / 2,
        (pts[LM_EYE_R_INNER][1] + pts[LM_EYE_L_INNER][1]) / 2,
    )
    upper = _dist(pts[LM_FACE_TOP], eye_mid)
    lower = _dist(eye_mid, pts[LM_CHIN])
    pitch_dev = abs(upper / max(1e-6, upper + lower) - 0.45)
    return yaw_deg, pitch_dev * 120.0


def undo_pose(feats: dict[str, float], yaw_deg: float, pitch_deg: float) -> dict[str, float]:
    """Netralkan pengaruh arah hadap — sama dengan GenderEstimator._undo_pose.

    WAJIB dilakukan di sini juga. Bila pelatihan memakai rasio mentah sementara
    inferensi memakai rasio terkoreksi, model belajar pada distribusi yang
    berbeda dari yang ditemuinya saat bekerja, dan akurasinya turun tanpa gejala
    yang terlihat.
    """
    import math

    cy = math.cos(math.radians(abs(yaw_deg)))
    cp = math.cos(math.radians(abs(pitch_deg)))
    # Pose ekstrem membuat pembagian ini tidak stabil.
    if cy < 0.5 or cp < 0.5:
        return feats
    out = dict(feats)
    out["brow_to_eye"] = feats["brow_to_eye"] * cy / cp
    out["face_aspect"] = feats["face_aspect"] * cp / cy
    return out


def label_from_utkface(filename: str) -> str | None:
    """UTKFace menaruh label di nama berkas: [usia]_[gender]_[ras]_[waktu].jpg."""
    parts = os.path.basename(filename).split("_")
    if len(parts) < 3:
        return None
    try:
        age, gender = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    # Anak-anak dibuang: proporsi wajah anak belum menunjukkan dimorfisme
    # dewasa, dan memasukkannya menggeser ambang untuk semua orang.
    if age < 18:
        return None
    return {0: "male", 1: "female"}.get(gender)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--images", required=True, help="direktori berisi gambar wajah")
    ap.add_argument("--out", default=str(BASE_DIR / "ai_engine" / "data" / "gender_features.csv"))
    ap.add_argument("--labels-csv", help="CSV label untuk FairFace (kolom: file,gender)")
    ap.add_argument("--limit", type=int, default=0, help="batasi jumlah gambar (0 = semua)")
    args = ap.parse_args()

    if not MODEL_PATH.exists():
        print(f"model landmark tidak ada: {MODEL_PATH}", file=sys.stderr)
        print("unduh: curl -fsSL -o ai_engine/models/weights/face_landmarker.task \\", file=sys.stderr)
        print("  https://storage.googleapis.com/mediapipe-models/face_landmarker/"
              "face_landmarker/float16/1/face_landmarker.task", file=sys.stderr)
        return 2

    try:
        import cv2
        import mediapipe as mp
        from mediapipe.tasks.python import vision, BaseOptions
    except ImportError as err:
        print(f"dependensi belum lengkap: {err}", file=sys.stderr)
        print("pasang: pip install mediapipe", file=sys.stderr)
        return 2

    label_map: dict[str, str] = {}
    if args.labels_csv:
        with open(args.labels_csv, newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                name = os.path.basename(row.get("file", ""))
                gender = (row.get("gender") or "").strip().lower()
                if name and gender in ("male", "female"):
                    label_map[name] = gender

    image_dir = Path(args.images)
    files = sorted(
        p for p in image_dir.rglob("*")
        if p.suffix.lower() in (".jpg", ".jpeg", ".png")
    )
    if args.limit:
        files = files[: args.limit]
    if not files:
        print(f"tidak ada gambar di {image_dir}", file=sys.stderr)
        return 1

    options = vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    kept = skipped_nolabel = skipped_noface = 0
    counts = {"male": 0, "female": 0}

    with vision.FaceLandmarker.create_from_options(options) as landmarker, \
            open(out_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS)
        writer.writeheader()

        for i, path in enumerate(files, 1):
            label = label_map.get(path.name) or label_from_utkface(path.name)
            if label is None:
                skipped_nolabel += 1
                continue

            bgr = cv2.imread(str(path))
            if bgr is None:
                skipped_noface += 1
                continue
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            h, w = rgb.shape[:2]

            result = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
            if not result.face_landmarks:
                skipped_noface += 1
                continue

            feats = compute_gender_features(result.face_landmarks[0], w, h)
            yaw, pitch = compute_pose(_last_points)
            feats = {k: round(v, 4) for k, v in undo_pose(feats, yaw, pitch).items()}
            # Nilai non-finite atau nol menandakan landmark gagal; membiarkannya
            # masuk akan mencemari statistik yang jadi dasar kalibrasi.
            if any((v is None or v != v or v <= 0) for v in feats.values()):
                skipped_noface += 1
                continue

            writer.writerow({"label": label, **feats})
            counts[label] += 1
            kept += 1

            if i % 500 == 0:
                print(f"  {i}/{len(files)} diproses, {kept} terpakai", flush=True)

    print(f"\nselesai -> {out_path}")
    print(f"  terpakai        : {kept}  (pria {counts['male']}, wanita {counts['female']})")
    print(f"  tanpa label     : {skipped_nolabel}")
    print(f"  wajah tak tebaca: {skipped_noface}")
    if kept and min(counts.values()) / max(counts.values(), default=1) < 0.4:
        print("\n  PERINGATAN: kelas timpang. Classifier akan condong ke kelas mayoritas;")
        print("  seimbangkan dataset atau pakai class_weight saat melatih.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
