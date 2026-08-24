# 🎯 Master Plan: Merge & Integrasi Branch (integration/kacamata-shirts)

> **Untuk AI / Claude Code:** Gunakan prinsip skill `writing-plans` dan patuhi panduan di `CLAUDE.md`. Jalankan seluruh rangkaian tugas berikut secara berurutan, deterministik, dan hemat token.

---

### 1. ATURAN MUTLAK KOMPETISI (STRICT RULES)
1. **ZERO INSTITUTION IDENTITY (HARAM)**: JANGAN PERNAH mencantumkan nama universitas, kampus, fakultas, logo, atau identitas akademik apa pun di kode, komentar, dokumentasi, maupun git commit.
2. **CONVENTIONAL COMMITS**: Semua pesan git commit wajib menggunakan standar Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`).
3. **PRIVASI BIOMETRIK**: Patuhi UU PDP No. 27/2022 (tidak ada gambar wajah yang disimpan permanen di database server).

---

### 2. LANGKAH 1: PEMBUATAN BRANCH INTEGRASI & MERGE
1. Buat branch baru dari branch aktif saat ini dan lakukan merge:
   ```bash
   git checkout -b integration/kacamata-shirts
   git fetch origin
   git merge origin/fix-kacamata
   ```
2. Git akan mendeteksi konflik pada 5 file spesifik berikut:
   - `client/public/images/products/glb_manifest.json`
   - `ai_engine/models/recommender.py`
   - `client/src/components/ARCanvasViewer.tsx`
   - `client/src/components/CameraScan.tsx`
   - `client/src/components/ProductDetailModal.tsx`

---

### 3. LANGKAH 2: RESOLUSI KONFLIK EKSPLISIT (5 FILE)

Selesaikan konflik pada 5 file tersebut dengan aturan penggabungan presisi:

1. **`client/public/images/products/glb_manifest.json`**:
   - Ambil kalibrasi anchor 3D geometri mesh kacamata dari `fix-kacamata` (`glasses_01` s/d `glasses_07` dengan `anchor_type: "nasion_pupil"` dan koreksi rotasi/pivot).
   - Pertahankan seluruh 30 item lainnya (Topi `hat-01` s/d `hat-11` dan seluruh item `shirts_pria` & `shirts_wanita`) dari branch saat ini.

2. **`ai_engine/models/recommender.py`**:
   - Gabungkan logika scoring kacamata berbasis metrik wajah dari `fix-kacamata` dengan sistem rekomendasi pakaian/topi 3-pilar dan fallback katalog 37 produk.

3. **`client/src/components/ARCanvasViewer.tsx`**:
   - Terapkan logika positioning 3D kacamata berbasis geometri mesh pupil/nasion dari `fix-kacamata`.
   - Pertahankan styling visual baru yang bersih (*clean matte solid* tanpa glow neon berlebih).

4. **`client/src/components/CameraScan.tsx`**:
   - Integrasikan ekstraksi metrik wajah terkalibrasi pinhole (jarak inter-pupillary, lebar rahang, dahi) dari `fix-kacamata`.
   - Pertahankan tampilan kartu biometrik (Warna Kulit Monk Scale, Bentuk Wajah, Gender) serta navigasi bersih.

5. **`client/src/components/ProductDetailModal.tsx`**:
   - Gabungkan detail spesifikasi kacamata dengan modal tampilan produk 3D universal.

---

### 4. LANGKAH 3: KALIBRASI GENDER ESTIMATOR (PERBAIKI FALSE FEMALE)
**Masalah**: Pengguna pria saat ini terdeteksi sebagai "Wanita (Female)" karena bentuk rahang tirus atau saat tersenyum lebar di depan kamera.

**Tindakan di `ai_engine/models/gender_estimator.py` & `client/src/lib/faceGeometry.ts`**:
1. Sesuaikan ambang batas netral `NEUTRAL["jaw_to_cheek"]` ke angka yang lebih representatif untuk pria Asia/Indonesia (~0.78 - 0.80).
2. Tambahkan **Smile Dampening Factor**: Saat rasio lebar bibir (`lip_to_face_width`) meningkat akibat senyuman (> 0.44), redam penalti negatifnya agar ekspresi senyum tidak memicu klasifikasi feminin.
3. Pastikan di `client/src/components/CameraScan.tsx`, koreksi gender manual oleh user di UI selalu menjadi prioritas utama (*override*) untuk modul rekomendasi outfit.

---

### 5. LANGKAH 4: TESTING & VERIFIKASI OTOMATIS

Jalankan pengujian bertahap untuk memastikan sistem 100% stabil:

1. **Uji AI Engine & Backend (Pytest)**:
   ```bash
   pytest server/tests/test_gender_estimator.py server/tests/test_face_analyzer.py -v
   ```
2. **Sinkronisasi Katalog Fallback**:
   ```bash
   python scripts/sync_api_fallback.py
   ```
3. **Uji Build Frontend Next.js**:
   ```bash
   cd client && npm run build && cd ..
   ```
   *(Pastikan output `✓ Compiled successfully` tanpa error tipe atau linting)*.

---

### 6. LANGKAH 5: BUILD ULANG & JALANKAN DOCKER LOKAL
Bangun ulang dan jalankan seluruh container agar aplikasi siap diuji langsung di browser:
```bash
docker compose build
docker compose up -d
```
*(Pastikan `coba-backend-server` di port 8000 dan `coba-frontend-client` di port 3000 berstatus Healthy/Running)*.

---

### 7. LANGKAH 6: GIT COMMIT & PUSH
Setelah seluruh test lulus dan container berjalan lancar:
```bash
git add .
git commit -m "feat(integration): integrate 3D glasses mesh anchoring with apparel catalog and calibrate gender estimator"
git push -u origin integration/kacamata-shirts
```

---
**Mulai eksekusi sekarang dari Langkah 1 secara berurutan dan laporkan progres setiap langkah selesai!**
