# Melatih classifier gender dari dataset

Dua tahap, sengaja dipisah: begitu CSV terbentuk, gambarnya tidak dibutuhkan
lagi dan tidak pernah ikut ke mana pun. Pelatihan maupun inferensi bekerja atas
angka saja.

## 0. Prasyarat

```bash
pip install mediapipe scikit-learn joblib opencv-python

curl -fsSL -o ai_engine/models/weights/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

## 1. Dapatkan dataset

Keduanya perlu diunduh manual; tidak disertakan di repo.

| dataset | isi | label |
|---|---|---|
| **UTKFace** (`UTKFace.tar.gz`, ±200 MB versi aligned) | ±23k wajah | ada di nama berkas: `[usia]_[gender]_[ras]_*.jpg`, gender `0`=pria `1`=wanita |
| **FairFace** | ±108k wajah, seimbang ras | CSV terpisah berkolom `file,gender` |

UTKFace lebih mudah karena labelnya menempel di nama berkas. FairFace lebih baik
untuk keadilan lintas ras — dan itu relevan di sini, karena ambang antropometrik
yang dikalibrasi pada satu populasi akan meleset pada populasi lain.

## 2. Ekstraksi gambar → CSV

```bash
# UTKFace (label dari nama berkas)
python ai_engine/scripts/extract_gender_features.py \
  --images /path/UTKFace --out ai_engine/data/gender_features.csv

# FairFace (label dari CSV)
python ai_engine/scripts/extract_gender_features.py \
  --images /path/fairface/train --labels-csv /path/fairface_label_train.csv \
  --out ai_engine/data/gender_features.csv
```

Yang dilakukan skrip ini, dan alasannya:

- **Rumus rasionya salinan persis `computeGenderFeatures()` di klien**, termasuk
  pembakuan sumbu. Kalau keduanya menyimpang, model belajar pada distribusi yang
  berbeda dari yang ditemuinya saat melayani pengguna.
- **Koreksi pose diterapkan di sini juga**, memakai sudut yang disimpulkan dari
  landmark. Melatih pada rasio mentah lalu menyajikan rasio terkoreksi adalah
  ketidakcocokan yang menurunkan akurasi tanpa gejala yang terlihat.
- **Usia di bawah 18 dibuang** pada UTKFace: proporsi wajah anak belum
  menunjukkan dimorfisme dewasa dan akan menggeser ambang untuk semua orang.

## 3. Latih

```bash
python ai_engine/scripts/train_gender.py --csv ai_engine/data/gender_features.csv
```

Menolak menyimpan bila akurasi cross-validation di bawah `0.70`. Itu disengaja:
rule engine yang ada sudah memberi jawaban masuk akal, dan menggantinya dengan
model yang nyaris menebak hanya menambah kerumitan tanpa menambah akurasi.

Keluaran:

- `ai_engine/models/weights/gender_lr.joblib` — model
- `ai_engine/models/weights/gender_lr.json` — jumlah sampel, akurasi, koefisien

## 4. Pemakaian

Tidak ada langkah pemasangan. `GenderEstimator` memuat berkas itu bila ada dan
menandai hasilnya `method: "landmark_model"`; bila tidak ada, ia memakai rule
engine dan menandai `method: "landmark_ratio"`.

Model rusak atau tidak cocok bentuknya juga jatuh ke rule engine, bukan
menggagalkan permintaan.

## Yang perlu diperiksa setelah melatih

Baca `gender_lr.json`, jangan hanya angka akurasinya:

- **Keseimbangan kelas.** Kelas timpang membuat model terlihat akurat hanya
  dengan menebak kelas mayoritas. `class_weight="balanced"` meredam, tidak
  menghapus.
- **Koefisien.** Bila `brow_to_eye` mendominasi, model mungkin belajar dari
  ekspresi, bukan dari struktur wajah — masalah yang sama yang membuat rule
  engine sebelumnya membalikkan label saat alis terangkat.
- **Sebaran cross-validation.** Simpangan besar antar lipatan berarti akurasinya
  bergantung pembagian data, dan angka rata-ratanya tidak bisa dipercaya.
