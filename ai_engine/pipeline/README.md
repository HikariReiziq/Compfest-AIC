# AI Face Analysis Pipeline — Process Workshop

Bengkel **offline** untuk ketiga tugas AI Face Analysis. Jalur **produksi** tetap di
`ai_engine/models/` (angka-only, deterministik, tanpa GPU, kepatuhan UU PDP No. 27/2022).
Modul di sini dipakai untuk (1) mendokumentasikan process end-to-end per tugas,
(2) kalibrasi threshold rule engine terhadap dataset riil, (3) validasi akurasi.

## Struktur

| File | Tugas | Output produksi |
|---|---|---|
| `common.py` | Primitif bersama (numpy murni, tanpa network) | — |
| `01_skin_tone_pipeline.py` | Warna kulit | `skin_tone` bucket 5 kategori (Fair/Light/Medium/Tan/Dark) via nearest-ΔE MST |
| `02_face_shape_pipeline.py` | Bentuk wajah | `face_shape` 6 kelas (Oval/Round/Square/Heart/Diamond/Oblong) |
| `03_gender_pipeline.py` | Gender | `gender` Pria/Wanita via rule engine rasio dimorfisme |

## 5 Tahap Process (setiap pipeline)

1. **CLEANING** — sampel rusak/blur/landmark gagal dibuang; dedup hash; label di luar
   kelas valid difilter (UTKFace `age<10` → skip: proporsi anak mendistorsi rasio dewasa).
2. **NORMALIZATION** — roll-align garis mata → 0°, skala kalibrasi iris 11,7 mm (ANSUR II),
   konversi sRGB → CIELAB D65 (01).
3. **PREPROCESSING** — ekstraksi fitur: LAB patch pipi (234/454) & dahi (10) — 01;
   rasio geometrik 6-landmark — 02; 4 fitur dimorfisme seksual — 03.
4. **CLASSIFY** — rule engine / nearest-ΔE deterministik. **Ini inferensi produksi** —
   sama dengan yang dipakai `server/app/api/v1/analyze.py`.
5. **VALIDATE** *(opsional `--dataset-dir`)* — akurasi + confusion matrix terhadap label
   dataset riil; cetak saran kalibrasi threshold. `--finetune` mencetak rencana
   fine-tune MobileNetV3-ES (RTX 4060 8GB, head-only, ~15 menit/epoch) **tanpa
   menjalankannya** — dataset tidak diunduh otomatis (lisensi dikelola manual).

## Dataset Riil (diverifikasi 2026-08-23)

| Pipeline | Dataset | Label | Akses |
|---|---|---|---|
| 01 | Monk Skin Tone Scale (Google × Dr. Ellis Monk) — 10 swatch referensi | MST 1–10 | skintone.google |
| 01 | SCIN (Google Research) — 10k+ citra | MST 1–10 | github.com/google-research-datasets/scin |
| 01 | FairFace — 108.501 citra race-balanced | race/age/gender | huggingface.co/datasets/HuggingFaceM4/FairFace |
| 02 | Niten19 Face Shape — 5.000 citra, 6 kelas sama persis | 6 face shape | kaggle.com/niten19/face-shape-dataset |
| 02 | Face Shape Preprocessed (detect+rotate+crop) | 5 kelas | kaggle.com/datasets/zeyadkhalid/faceshape-processed |
| 03 | UTKFace — 20k+ citra (label di nama file) | gender 0/1 | susanqq.github.io/UTKFace |
| 03 | FairFace 108k (race-balanced, anti-bias utama) | gender | HF di atas |

Format STAGE 5 (hasil ekstraksi landmark klien, angka-only):
- `01`: `labels.csv` → `l,a,b,mst_index`
- `02`: `features.csv` → `shape,face_width_to_height,jaw_to_forehead,cheekbone_to_jaw,chin_sharpness`
- `03`: `features.csv` → `label,jaw_to_cheek,brow_to_eye,lip_to_face_width,face_aspect`

## Cara Menjalankan

```bash
# Smoke self-check (vektor sintetis bawaan, tanpa dataset):
python ai_engine/pipeline/01_skin_tone_pipeline.py
python ai_engine/pipeline/02_face_shape_pipeline.py
python ai_engine/pipeline/03_gender_pipeline.py

# Validasi dataset lokal (STAGE 5):
python ai_engine/pipeline/03_gender_pipeline.py --dataset-dir D:/datasets/utkface_extracted

# Rencana fine-tune (tanpa eksekusi):
python ai_engine/pipeline/02_face_shape_pipeline.py --finetune
```

## Mengapa Produksi Memakai Rule Engine Deterministik (Bukan Model ML Berat)

- **Latensi < 10 ms** dan **deterministik 100%** — input sama → output identik
  (syarat direktif konsistensi scan 3× berulang).
- **Jalan tanpa GPU** di container Docker ringan (kebutuhan demo juri).
- **UU PDP No. 27/2022 by design** — payload hanya angka turunan landmark,
  tidak pernah gambar wajah; tidak ada biometrik persisten di server.
- Model pretrained (DeepFace/FairFace/MobileNetV3 fine-tune) berperan sebagai
  **alat kalibrasi offline** (opsi 1, disetujui): hasilnya menyetel threshold
  rule engine — model sendiri tidak masuk jalur produksi.
