# PRD — COBA (Cocokkan Outfit Sesuai Badan Anda)

> **Product Requirements Document (PRD)**
> Status: Production-Ready Baseline (Penyisihan AIC COMPFEST 18)  
> Fokus Inovasi: AI Rekomendasi Busana Berbasis Karakter Personal (Skin Undertone, Body Shape, Face Shape, Occasion) + AR Visual Validation  
> *Catatan Scope: Fitur rekomendasi ukuran (sizing calibration) telah sepenuhnya dihapus sesuai ADR-005.*

---

## 1. Problem Statement & Solusi

### Problem Statement
Pembeli pakaian di Indonesia menghadapi masalah ketidakcocokan gaya dan karakter personal (*style-fit mismatch*) saat berbelanja daring maupun luring. Tanpa pemahaman atas *undertone* kulit (yang menyebabkan warna pakaian *wash out*), proporsi bentuk tubuh, dan bentuk wajah untuk aksesoris, konsumen kerap salah memilih. Akibatnya timbul *silent dissatisfaction*, pakaian mengendap tanpa dipakai, rating toko anjlok, serta kelelahan memilih (*choice fatigue*).

### Solusi
COBA (Cocokkan Outfit Sesuai Badan Anda) menghadirkan platform cerdas yang menggabungkan:
1. **Camera Personal Profiling (Client-Side MediaPipe)**: Ekstraksi fitur visual (warna kulit, landmark wajah 468 titik, dan rasio tubuh 33 titik).
2. **Category Selection & Targeted Questionnaire**: Alur kustomisasi bertingkat (Aksesoris vs Pakaian) sebelum kuesioner ringkas.
3. **Top-4 Curated Recommendation Engine (FastAPI + FashionCLIP)**: Mesin rekomendasi yang menghasilkan 4 opsi terkurasi berdasarkan profil personal & kuesioner.
4. **Auto-Attached 3D AR Try-On with Switch Navigation (Three.js WebGL)**: Rekomendasi #1 otomatis terpasang ke badan/wajah secara realtime, dilengkapi tombol navigasi Kiri-Kanan (*Switch*) untuk mencoba 4 varian rekomendasi secara instan.

---

## 2. Alur Pengguna (User Journey & Interaksi)

```
[1. Pemilihan Kategori Aksesoris]
├── [Kacamata (Glasses / Eyewear)] ──► Aktif (Face Mesh Landmark Tracking)
├── [Topi (Hats / Headwear)]        ──► Aktif (Head Contour Tracking)
└── [Pakaian (Baju / Jaket)]       ──► Locked (Tahap 2: Memerlukan Full-Body Pose Tracking)
                 │
                 ▼
[2. Pemindaian Wajah Dual-Mode (ADR-013)]
├── Mode 1: Webcam Live (oval guide + auto-countdown 3 detik)
└── Mode 2: Unggah Foto (PNG/JPG/JPEG ≤8MB) + Interactive Repositioning
    (drag/pan, zoom/scale, rotate ±45° → dahi/mata/dagu selaras oval pemandu)
(Deteksi: MST + Undertone + Bentuk Wajah 6 Kelas + Tipe Hidung + Mata + Alis
 — 478 Landmark termasuk Iris, terkalibrasi 11,7 mm → pengukuran cm)
                 │
                 ▼
[2.5 Face Analysis Report Card — Agency-Grade (ADR-017)]
(Gambar wajah + anotasi geometris SVG, grid badge 5 dimensi, pengukuran cm,
 justifikasi 3 pilar ilmiah, narasi + tips, CTA "Lanjut ke Kuesioner Personalisasi")
                 │
                 ▼
[3. Kuesioner Interaktif Bertarget (Multi-Batch Unlimited)]
├── Batch 1 (Inti): Momen Acara, Siluet Bingkai/Karakter, Palet Warna
├── Batch 2 (Gaya & Vibe): Brand Style, Prioritas Kenyamanan, Rentang Budget
├── Batch 3 (Material & Tekstur): Jenis Bahan, Motif/Aksen, Fleksibilitas Outfit
└── Batch 4+ (Signature Touch): Aura Personal, Fokus Detail Hardware
                 │
                 ▼
[3.5. Cinematic AI Processing Telemetry Screen]
(Animasi pemrosesan setiap preferensi input pengguna secara berurutan + kalkulasi keserasian)
                 │
                 ▼
[4. Output Rekomendasi AI: Top-4 Curated Archetypes di 3D AR]
├── Rekomendasi #1 (The Perfect Match)  ──► OTOMATIS TERPASANG DI WAJAH/KEPALA (AR Live)
├── Rekomendasi #2 (Safe Classic / Versatile) 
├── Rekomendasi #3 (Bold Statement / Contrast)
└── Rekomendasi #4 (Modern / Trendy Variant)
                 │
                 ▼
[5. Navigasi Switch Kiri - Kanan & Reset dari Awal]
(User menekan tombol Panah Kiri/Kanan untuk berganti model AR, atau tombol Reset Scan)
```

---

## 3. Justifikasi Desain: Mengapa Output Rekomendasi Top-4? (/before-you-build)

Pemilihan **Top-4 Rekomendasi** didasarkan pada prinsip ergonomi antarmuka dan riset *consumer behavior*:

1. **Mengeliminasi *Choice Overload* & *Hick's Law***:
   - Riset McKinsey & BoF *State of Fashion 2025* mencatat 50% konsumen membatalkan belanja akibat kelelahan memilih (*choice fatigue*). Terlalu banyak opsi (> 6) memicu *choice paralysis*, sedangkan terlalu sedikit (< 3) membatasi kebebasan memilih. 4 pilihan adalah jumlah optimal untuk diproses secara kognitif dalam 3 detik.
2. **4 Arketipe Gaya Terkurasi (*The 4 Style Archetypes*)**:
   - **Opsi 1 (#1 Perfect Match)**: Skor kecocokan tertinggi (100% selaras dengan undertone, bentuk tubuh/wajah, dan kuesioner). Terpasang otomatis pertama kali.
   - **Opsi 2 (Safe Classic / Versatile)**: Nuansa warna netral/desain klasik yang aman dan serbaguna.
   - **Opsi 3 (Bold Statement / Contrast)**: Warna komplementer kontras yang mencolok namun tetap harmonis dengan undertone.
   - **Opsi 4 (Modern / Trendy Silhouette)**: Model kekinian yang proporsional dengan siluet tubuh/wajah user.
3. **Ergonomi Navigasi Kanan-Kiri di AR**:
   - User hanya memerlukan maksimal 3 kali klik tombol panah kanan untuk melihat seluruh variasi model 3D (`1 -> 2 -> 3 -> 4 -> 1` loop).
4. **Performa Memori & Rendering WebGL 60 FPS**:
   - Memuat 4 aset 3D GLB terkompresi DRACO ke memory browser hanya memakan bandwidth ~6–10 MB, menjamin transisi switch model 3D berlangsung instan tanpa *frame drop* atau lag saat demonstrasi di depan juri.

---

## 4. Dataset Lengkap & Sumber Terverifikasi (100% Active Links)

### a. Skin Tone & Undertone Detection

| Dataset / Sumber | Volume | Kolom / Metadata Kunci | Lisensi | Link Akses Terverifikasi |
| :--- | :--- | :--- | :--- | :--- |
| **Google Monk Skin Tone (MST)** | 10-Shade Scale | Nilai standar warna LAB/RGB/HEX untuk representasi inklusif 10 warna kulit manusia | CC BY 4.0 | [skintone.google](https://skintone.google/) |
| **Google SCIN Dataset** | 10.000+ citra | Citra kondisi dermatologi dengan label MST dan Fitzpatrick Skin Type | CC BY 4.0 | [GitHub google-research-datasets/scin](https://github.com/google-research-datasets/scin) |
| **Fitzpatrick17k (Official Repo)** | 16.577 citra | Repositori resmi makalah evaluasi fairness dengan anotasi Fitzpatrick Scale I–VI | Open Research | [GitHub mattgroh/fitzpatrick17k](https://github.com/mattgroh/fitzpatrick17k) |
| **ISIC Skin Tone Benchmark** | 4.800+ citra | Multi-scale clinical dermatological skin annotations | Research / ISIC | [ISIC Archive Challenge](https://challenge.isic-archive.com/) |

---

### b. Body Shape Classification

| Dataset / Sumber | Volume | Kolom / Metadata Kunci | Lisensi | Link Akses Terverifikasi |
| :--- | :--- | :--- | :--- | :--- |
| **ANSUR II (US Army Anthropometry)** | 6.000+ subjek | 93 dimensi antropometri akurat (biacromial breadth, chest, waist, hip circumference) | Public Domain / OpenLab | [OpenLab PSU ANSUR2](https://www.openlab.psu.edu/ansur2/), [GitHub senihberkay/US-Army-ANSUR-II](https://github.com/senihberkay/US-Army-ANSUR-II) |
| **BodyM Dataset (AWS Open Data)** | 8.978 siluet | Siluet depan & samping, 14 dimensi tubuh dalam cm, tinggi, berat | AWS Open Data | [AWS Open Data Registry BodyM](https://registry.opendata.aws/bodym/) |

---

### c. Face Shape Classification (Untuk Rekomendasi Aksesoris)

| Dataset / Sumber | Volume | Kolom / Metadata Kunci | Lisensi | Link Akses Terverifikasi |
| :--- | :--- | :--- | :--- | :--- |
| **Face Shape Dataset (Kaggle)** | 5.000 citra | Foto wajah berlabel 5 bentuk: Heart, Oblong, Oval, Round, Square (1.000/kelas) — *tanpa kelas Diamond (→ rule override ADR-014)* | Open Kaggle | [Kaggle niten19/face-shape-dataset](https://www.kaggle.com/datasets/niten19/face-shape-dataset) |
| **Face Shape Feature Dataset** | 5.000 baris | Nilai fitur geometris dan koordinat landmark wajah | MIT | [GitHub dsmlr/faceshape](https://github.com/dsmlr/faceshape) |
| **Face-Shape-Detection Reference** | Kode & Model | Implementasi MediaPipe Face Mesh + Random Forest Classifier | Open Source | [GitHub akashchoudhary436/Face-Shape-Detection](https://github.com/akashchoudhary436/Face-Shape-Detection) |
| **Face-Shape-Classification CNN** | Kode & Model | Baseline klasifikasi bentuk wajah menggunakan CNN | Open Source | [GitHub Arbaz57/Face-Shape-Classification](https://github.com/Arbaz57/Face-Shape-Classification) |

---

### c.2 Multi-Dimensional Face Analysis: Hidung, Mata, Alis & Kalibrasi Iris (Overhaul ADR-014/018)

| Dataset / Sumber | Volume | Kolom / Metadata Kunci | Lisensi | Link Akses Terverifikasi |
| :--- | :--- | :--- | :--- | :--- |
| **CelebA (MMLab)** | 202.599 citra, 10.177 identitas | 40 atribut biner: Oval/Round/Square_Face, Big_Nose, Pointy_Nose, Arched_Eyebrows, Narrow_Eyes — **validasi & kalibrasi LOKAL saja, DILARANG redistribusi gambar** | Non-Komersial Riset | [MMLab CelebA](https://mmlab.ie.cuhk.edu.hk/projects/CelebA.html) |
| **FairFace** | 108.501 citra | Seimbang demografis 7 ras (termasuk Asia Tenggara) — sampling geometris representatif Indonesia | CC BY 4.0 | [GitHub joojs/fairface](https://github.com/joojs/fairface) |
| **MST-E (Monk Skin Tone Examples)** | 1.515 citra + 31 video | Contoh citra 19 orang mencakup 10 tingkat MST untuk validasi deteksi warna kulit | Terbuka | [skintone.google/mste-dataset](https://skintone.google/mste-dataset) |
| **Eyebrow Shape (Roboflow)** | 300 citra | 6 kelas alis: Straight, Curved, High-Arch, S-Shaped, Soft-Arch, Upward — kalibrasi rule engine alis | Gratis / Open | [Roboflow eyebrow-shape](https://universe.roboflow.com/face-hqu83/eyebrow-shape) |
| **MediaPipe Iris** | Spesifikasi teknis | 478 landmark (10 titik iris indeks 468–477) + estimasi jarak metrik <10% error — basis kalibrasi cm | Apache 2.0 | [GitHub mediapipe/docs/iris](https://github.com/google/mediapipe/blob/master/docs/solutions/iris.md) |
| **Roesler et al. 2022 (ACM ICMI)** | Literatur | Normalisasi metrik wajah px→mm via diameter iris 11,7 mm ("Method V") — dasar ilmiah kalibrasi | ACM Open Access | [dl.acm.org/10.1145/3536220.3558071](https://dl.acm.org/doi/fullHtml/10.1145/3536220.3558071) |

---

### d. Outfit Compatibility & Multimodal Scoring

| Dataset / Sumber | Volume | Kolom / Metadata Kunci | Lisensi | Link Akses Terverifikasi |
| :--- | :--- | :--- | :--- | :--- |
| **Polyvore Outfits (Official Repo)** | 21.889 set outfit | Relasi keserasian atasan, bawahan, sepatu, dan aksesoris (FITB & Compatibility) | CC BY 4.0 | [GitHub xthan/polyvore-dataset](https://github.com/xthan/polyvore-dataset) |
| **Polyvore Outfits (HuggingFace)** | 21.889 set outfit | Dataset terstruktur siap konsumsi untuk visual fashion compatibility | Open Access | [HuggingFace owj0421/polyvore-outfits](https://huggingface.co/datasets/owj0421/polyvore-outfits) |
| **Fashionpedia** | 48.825 citra | 27 kategori busana, 294 atribut detail (pola, material, siluet), segmentasi | CC BY 4.0 | [Fashionpedia Download Page](https://fashionpedia.github.io/home/Fashionpedia_download.html) |
| **Marqo DeepFashion Multimodal** | Ratusan ribu | Pasangan teks-gambar siap pakai untuk retrieval multimodal | Open Access | [HuggingFace Marqo/deepfashion-multimodal](https://huggingface.co/datasets/Marqo/deepfashion-multimodal) |

---

### e. Katalog Produk Fesyen Utama

| Dataset / Sumber | Volume | Kolom / Metadata Kunci | Lisensi | Link Akses Terverifikasi |
| :--- | :--- | :--- | :--- | :--- |
| **Fashion Product Images (Full)** | 44.000 produk | `styles.csv` memuat `id`, `gender`, `masterCategory`, `subCategory`, `articleType`, `baseColour`, `season`, `usage` (Formal, Casual, Sports, Ethnic) | **CC0 Public Domain** | [Kaggle paramaggarwal/fashion-product-images-dataset](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-dataset) |
| **Fashion Product Images (Small)** | 44.000 produk | Versi gambar terkompresi (60x80px / 240x320px) ideal untuk testing lokal cepat | **CC0 Public Domain** | [Kaggle paramaggarwal/fashion-product-images-small](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small) |

---

### f. Aset 3D & Repositori Implementasi AR

| Komponen / Sumber | Format / Isi | Lisensi | Link Akses Terverifikasi |
| :--- | :--- | :--- | :--- |
| **Virtual Glasses & Hats Try-On** | Three.js + MediaPipe Face Mesh (realtime AR kacamata & topi 60fps) | MIT | [GitHub bensonruan/Virtual-Glasses-Try-on](https://github.com/bensonruan/Virtual-Glasses-Try-on) |
| **Procedural 3D Generators** | Dynamic Three.js parametric meshes (Baseball Cap, Bucket Hat, Beanie, Fedora, Beret, Newsboy, Wayfarer, Aviator, Round, Cat-Eye) | Custom Built | In-Tree `client/src/components/ARCanvasViewer.tsx` |
| **MediaPipe Face Effects** | Shader & 3D overlay wajah di browser | MIT | [GitHub breathingcyborg/mediapipe-face-effects](https://github.com/breathingcyborg/mediapipe-face-effects) |
| **Softwear (Body Tracking)** | React + Three.js + MediaPipe Pose virtual try-on engine | Open Source | [GitHub TechAngelX/softwear](https://github.com/TechAngelX/softwear) |
| **Quaternius Outfits** | Model modular pakaian 3D rigged | CC0 | [quaternius.com](https://quaternius.com/) |
| **Poly Pizza** | 10.600+ model low-poly 3D (kacamata, topi, aksesoris) | CC0 / Free | [poly.pizza](https://poly.pizza/) |
| **Sketchfab 3D Clothing** | Model 3D pakaian format GLB/glTF | CC BY | [Sketchfab Tags Clothing](https://sketchfab.com/tags/clothing) |
| **TripoSR (3D Gen from 2D)** | Model fast single-image 3D mesh generator (< 6GB VRAM) | MIT | [GitHub VAST-AI-Research/TripoSR](https://github.com/VAST-AI-Research/TripoSR) |
| **Microsoft TRELLIS** | High-fidelity 3D asset generator | MIT | [GitHub microsoft/TRELLIS](https://github.com/microsoft/TRELLIS) |
| **Google MediaPipe Vision** | Core vision framework (Pose, Face Mesh) | Apache 2.0 | [GitHub google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe) |
| **Three.js Engine** | JavaScript 3D Library | MIT | [threejs.org Docs](https://threejs.org/docs/) |

---

## 5. Arsitektur Teknis & Model ML per Fitur

```
                               ┌───────────────────────────────────────────────┐
                               │             BROWSER (Client-Side)             │
                               │        Next.js + Tailwind + Three.js          │
                               │                                               │
                               │ 1. Dual Input: Webcam / Upload + Reposition  │
                               │ 2. MediaPipe Pose (33 Landmarks) -> Ratios   │
                               │ 3. MediaPipe Face (478+Iris) -> faceGeometry │
                               │ 4. Face Analysis Report Card (Step REPORT)  │
                               │ 5. Category & Subcategory Interactive Choice │
                               │ 6. Targeted Batch Questionnaire UI           │
                               │ 7. Three.js Auto-Attached 3D AR Viewer       │
                               │ 8. Left/Right Navigation Switch UI           │
                               └───────────────────────┬───────────────────────┘
                                                       │ HTTP REST (JSON + Base64)
                                                       ▼
                               ┌───────────────────────────────────────────────┐
                               │             SERVER (FastAPI Docker)           │
                               │               Synchronous Engine              │
                               ├───────────────────────────────────────────────┤
                               │ A. Skin Analyzer (CIELAB Space -> MST Scale)  │
                               │ B. Body Shape Classifier (Ratio Rule Engine)  │
                               │ C. Face Shape Classifier (Random Forest 6 Kl) │
                               │ C2. Multi-Dim Face Analyzer (Nose/Eye/Brow)  │
                               │ D. Recommendation Engine (FashionCLIP + Rule) │
                               │    -> Generates Top-4 Ranked Outfit Models    │
                               │ E. Mock Data Fallback Mode (MOCK_MODE=true)   │
                               └───────────────────────────────────────────────┘
```

### Rincian Modul:

1. **Scan Dual-Mode & Ekstraksi Ciri (Client-Side)**
   - **Teknologi**: `@mediapipe/tasks-vision` (JavaScript/WASM) — instance VIDEO mode (webcam) + instance IMAGE mode (unggah foto; running mode immutable per instance).
   - **Alur Mode 1 (Webcam)**: Frame kamera diproses di browser tanpa upload video mentah ke server (menjamin privasi 100% dan zero latency). Browser mengekstrak landmark tubuh dan wajah, menghitung rasio geometris, serta mengambil crop kecil (100x100px) area pipi/dahi. Oval guide + auto-countdown dipertahankan.
   - **Alur Mode 2 (Upload, ADR-013)**: Foto PNG/JPG/JPEG ≤8MB (validasi magic bytes + EXIF orientation via `createImageBitmap`) → *Interactive Repositioning Tool* (drag/pan, zoom/scale, rotate ±45°) menyelaraskan dahi/mata/dagu ke oval pemandu → analisis MediaPipe IMAGE mode. Gambar wajah **tidak pernah keluar browser**.
   - **`client/src/lib/faceGeometry.ts` (Baru, ADR-014)**: Kalibrasi iris (landmark 468–477, konstanta 11,7 mm → `px_per_mm`); ±15 pengukuran cm (dahi 127–356, pipi 234–454, rahang 172–397, tinggi wajah 10–152, lebar alare hidung, lebar mata, jarak interokular); vektor ±20 fitur (rasio wajah/hidung/mata/alis + z-profil bridge); *quality gates* (|yaw|≤15°, |pitch|≤15°, roll≤10°, luminance 60–200, wajah ≥25% lebar frame).

2. **Skin Tone & Undertone Classifier (Server-Side)**
   - **Teknologi**: OpenCV (`cv2`), NumPy.
   - **Logika**: Konversi ROI wajah ke ruang warna CIELAB. Menghitung jarak Euclidean ke 10 nilai acuan Monk Skin Tone scale. Memetakan nilai $a^*$ dan $b^*$ ke 4 kategori undertone (Warm, Cool, Neutral, Olive), yang kemudian diasosiasikan dengan palet warna rekomendasi musiman.

3. **Multi-Dimensional Face Analyzer (Server-Side, `ai_engine/models/face_analyzer.py` — ADR-014)**
   - **Endpoint Baru**: `POST /api/v1/analyze/landmarks` — menerima payload **fitur turunan** (bukan gambar wajah), dengan mock-fallback sesuai pola existing; fallback ke alur `/ratios` lama bila gagal (backward compatible).
   - **Body Shape**: Menghitung rasio bahu terhadap pinggul dan pinggang (Hourglass: $\approx 1.0$ dengan pinggang ramping; Pear: hip > shoulder; Apple/Inverted Triangle: shoulder > hip; Rectangle: rasio sejajar).
   - **Face Shape 6 Kelas**: Random Forest 5 kelas (Heart, Oblong, Oval, Round, Square) + **Diamond rule override** (pipi terlebar + dahi sempit + dagu runcing — kelas tidak tersedia di Face Shape 5K).
   - **Nose Classifier (rule engine z-profil bridge)**: Greek/mancung (bridge lurus), Roman/lengkung (konveks), Bulbous/bulat (tip lebar), Broad-Snub/pesek (bridge cekung + alar lebar), Celestial-Button (tip kecil menghadap atas).
   - **Eye Classifier**: Eye Aspect Ratio + canthal tilt → Almond, Round, Cat-eye (tilt positif), Downturned (tilt negatif).
   - **Brow Classifier**: arch-height ratio → Arched, Straight, Soft Curve.
   - **PillarJustifier (ADR-016)**: memetakan (face_shape, undertone, nose_type) → justifikasi 3 pilar: (1) kontras siluet frame vs rahang, (2) warna material (emas/perak/gunmetal/titanium + fabric topi) sesuai undertone, (3) fit ergonomis bridge (low-bridge fit / keyhole / adjustable nose pads) sesuai tipe hidung.

4. **Recommendation Engine (Server-Side)**
   - **Teknologi**: `marqo-FashionCLIP` / `patrickjohncyh/fashion-clip`, `scikit-learn`, `faiss-cpu`.
   - **Tahap 1 (Hard Filter)**: Memfilter dataset berdasarkan sub-kategori terpilih (Kacamata/Topi/Baju/Jaket), gender, dan occasion kuesioner.
   - **Tahap 2 (Soft Scoring)**: Memberikan skor kecocokan warna (*Color Compatibility*) antara `baseColour` produk dengan palet undertone user, ditambah bobot kecocokan siluet busana (*Body Shape Fit*) dan bentuk wajah (*Face Shape Fit*).
   - **Tahap 3 (Top-4 Ranking)**: Mengembalikan 4 set model terkurasi dengan metadata dan path aset 3D GLB.

5. **Visual Validation AR & Switch Navigation (Client-Side)**
   - **Teknologi**: Three.js + WebGL.
   - **Implementasi**: Model 3D rekomendasi #1 otomatis di-attach ke tubuh/wajah realtime. User dapat menekan tombol panah Kanan/Kiri untuk berganti ke rekomendasi #2, #3, atau #4 secara instan.

---

## 6. Diagram Alur Integrasi Sistem

```mermaid
flowchart TB
    subgraph BROWSER["🖥️ BROWSER (Client-Side)"]
        CAM["📷 Kamera User"]
        MP_POSE["MediaPipe Pose\n(33 Landmark)"]
        MP_FACE["MediaPipe Face Mesh\n(478 Landmark + Iris)"]
        UPLOAD["Unggah Foto + Reposisi\n(drag/zoom/rotate → oval)"]
        GEOM["faceGeometry.ts\n(Iris 11,7 mm → cm + ±20 Fitur)"]
        REPORT["Face Analysis Report Card\n(Anotasi + 5 Dimensi + 3 Pilar)"]
        RATIO["Ekstraksi Rasio Geometris\n(Bahu, Pinggul, Wajah)"]
        CROP["Crop ROI Kulit Wajah\n(Pipi / Dahi 100x100)"]
        CAT_SELECT["Pilihan Kategori:\nAksesoris vs Pakaian\n(Kacamata/Topi vs Baju/Jaket)"]
        QUIZ["Kuesioner Bertarget\n(Occasion, Fit, Warna)"]
        AR_VIEW["Three.js AR Viewer\n(Auto-Attach Model 3D #1)"]
        SWITCH_UI["Tombol Switch ◀ / ▶\n(Ganti Model #1 - #4 Realtime)"]
    end

    subgraph SERVER["⚙️ SERVER (FastAPI Docker)"]
        ORCH["FastAPI Orchestrator\n(Pydantic v2 Schema)"]
        SKIN["Skin Tone Analyzer\n(CIELAB -> MST -> Undertone)"]
        FACE_CLS["Face Shape Classifier\n(RF 5 Kelas + Diamond Override)"]
        FACE_MULTI["Multi-Dim Face Analyzer\n(Nose/Eye/Brow Rule Engine)"]
        BODY_CLS["Body Shape Classifier\n(Rule-based Threshold)"]
        REKO_ENG["Recommendation Engine\n(FashionCLIP + Color Matrix)\nOutput Top-4 Curated Items"]
        CATALOG["Katalog Produk\n(Fashion Product Images 44K)"]
        MOCK["Mock Data Fallback\n(Hardcoded Dummy Response)"]
    end

    CAM --> MP_POSE
    CAM --> MP_FACE
    MP_POSE --> RATIO
    MP_FACE --> RATIO
    MP_FACE --> CROP

    RATIO -->|"POST /api/v1/analyze/ratios"| ORCH
    CROP -->|"POST /api/v1/analyze/skin"| ORCH
    UPLOAD -->|"IMAGE mode setelah reposisi"| MP_FACE
    MP_FACE --> GEOM
    GEOM -->|"POST /api/v1/analyze/landmarks (fitur turunan, tanpa gambar)"| ORCH
    ORCH --> FACE_MULTI
    FACE_MULTI -->|"JSON Laporan Analisis"| REPORT
    REPORT --> QUIZ
    CAT_SELECT --> QUIZ
    QUIZ -->|"POST /api/v1/recommend (Subcategory + Quiz Answers)"| ORCH

    ORCH --> SKIN
    ORCH --> FACE_CLS
    ORCH --> BODY_CLS
    ORCH --> REKO_ENG
    ORCH -.->|"Jika MOCK_MODE=true"| MOCK

    SKIN --> REKO_ENG
    FACE_CLS --> REKO_ENG
    BODY_CLS --> REKO_ENG
    REKO_ENG --> CATALOG

    REKO_ENG -->|"JSON: Top-4 Ranked Items + GLB Paths"| AR_VIEW
    AR_VIEW --> SWITCH_UI
    SWITCH_UI -->|"Pindah Item 3D"| AR_VIEW
```

---

## 7. Jadwal & Urutan Prioritas Pengerjaan

```
HARI 1-2: Classification Pipeline (Komponen Inti AI)
├── Skin Tone Detection (OpenCV LAB + Monk Skin Tone scale)
├── Face Shape Classification (MediaPipe Face Mesh + Random Forest)
├── Body Shape Classification (MediaPipe Pose + ANSUR II calibrated ratios)
└── Unit testing & validasi akurasi classifier

HARI 2-3: Recommendation Engine (FastAPI Backend)
├── Pre-compute FashionCLIP embeddings untuk katalog Fashion Product Images
├── Filter layer (Kategori/Sub-kategori, Occasion, Fit) & color palette matching
├── Logika kurasi Top-4 Archetypes
└── Integrasi endpoint REST API: /api/v1/analyze & /api/v1/recommend

HARI 3-4: Frontend Next.js + AR Kacamata / Baju Auto-Attach & Switch
├── Implementasi UI scanner kamera, Category Selector, & Kuesioner
├── Integrasi Three.js AR 3D auto-attach model #1 pada wajah/tubuh
├── Komponen UI tombol navigasi Kiri-Kanan (Switch Model 3D)
└── End-to-end user flow testing

HARI 4-5: Docker, Mock Mode, Video & Final Submission
├── docker-compose.yml teruji lokal
├── Fitur Toggle Mock Data Mode (MOCK_MODE=true) untuk pengujian juri
├── Rekam Video Proof of Work (7 menit tanpa cut)
├── Rekam Video Promosi (5 menit)
└── Finalisasi naskah Proposal PDF
```

---

## 8. Spesifikasi Overhaul Modul Analisis Wajah (Strategic Overhaul, 2026-08-23)

> Referensi keputusan: ADR-013 s.d. ADR-018 di `MEMORY.md`. Rencana eksekusi: `docs/plans/2026-08-23-face-analysis-overhaul.md`.

### 8.1 Dual-Mode Input & Interactive Repositioning (ADR-013)

| Aspek | Spesifikasi |
| :--- | :--- |
| Mode 1 — Webcam | Dipertahankan dari baseline: oval guide 3-state (NO_FACE / MISALIGNED / ALIGNED), auto-countdown 3 detik setelah 6 frame stabil, retry kamera + preset simulasi Indonesia. |
| Mode 2 — Upload | Accept `image/png, image/jpeg, image/jpg`; ukuran ≤ 8MB; validasi magic bytes; EXIF orientation via `createImageBitmap(img, { imageOrientation: "from-image" })`. |
| Repositioning Tool | Canvas overlay: drag/pan (pointer events), zoom/scale (wheel + slider 0.5–2.5×), rotate (slider ±45°, step 1°); oval pemandu dashed; tombol "Analisis Wajah" aktif saat quality gate lolos; tombol reset & ganti foto. |
| Privasi | Gambar diproses MediaPipe IMAGE mode 100% di browser — tidak pernah diunggah ke server. |

### 8.2 Mesin Analisis Multi-Dimensi (ADR-014) — Taksonomi Lengkap

| Dimensi | Kelas | Metode |
| :--- | :--- | :--- |
| Bentuk Wajah (6) | Oval, Round, Square, Heart, Diamond, Oblong/Rectangle | RF 5 kelas + Diamond rule override (`cheekbone_to_jaw ≥ 1.30 ∧ jaw_to_forehead ≤ 0.78 ∧ chin_sharpness ≤ 0.58`) |
| Warna Kulit | MST-01…MST-10 → kategori Indonesia: Cerah (1–2), Terang (3–4), Sawo Matang (5–6), Gelap Sedang (7–8), Gelap (9–10) | CIELAB ΔE (existing) + pemetaan kategori |
| Undertone | Warm, Cool, Neutral, Olive | a*/b* (existing) |
| Tipe Hidung (5) | Greek (mancung), Roman (lengkung), Bulbous (bulat), Broad-Snub (pesek), Celestial-Button | Rule engine z-profil bridge (168/6/4) + rasio alar/panjang |
| Bentuk Mata (4) | Almond, Round, Cat-eye, Downturned | Eye Aspect Ratio + canthal tilt (33/133 vs 263/362) |
| Bentuk Alis (3) | Arched, Straight, Soft Curve | Arch-height ratio (105/334 vs 70/300) |
| Pengukuran cm | Dahi, tulang pipi, rahang, tinggi wajah, lebar hidung, lebar mata, jarak interokular | Kalibrasi iris 11,7 mm (`px_per_mm = 11.7 / iris_px`); fallback rasio-murni bila iris tak valid |

### 8.3 Justifikasi 3 Pilar (ADR-016)

1. **Pilar Siluet (Face Shape)** — prinsip kontras: rahang tegas (Square) → frame membulat; wajah bulat (Round) → frame bersudut memperpanjang; pipi dominan (Diamond) → browline menyeimbangkan dahi.
2. **Pilar Warna (Undertone + MST)** — Warm → aksen emas, acetate cokelat/havana, titanium hangat; Cool → perak, gunmetal, hitam glossy; Neutral → fleksibel; Olive → menghindari hijau/kuning neon. Berlaku juga untuk warna fabric topi.
3. **Pilar Fit (Nose Type)** — Broad-Snub/pesek → *low-bridge fit* / *keyhole bridge* (anti-slide, anti-tekan); Greek/mancung → *adjustable nose pads*; Roman → bridge tinggi; Bulbous → bridge lebar berbantalan.

### 8.4 Face Analysis Report Card (ADR-017)

- Step baru `REPORT` pada mesin state (`CATEGORY → SCAN → REPORT → QUIZ → PROCESSING → TRYON`).
- Kiri: gambar wajah pengguna + overlay SVG anotasi (garis kuning ala referensi `docs/design_references/face_analysis_report_card.png`): Lebar Dahi, Lebar Tulang Pipi, Lebar Rahang, tinggi wajah + label proporsi `dahi : pipi : rahang`.
- Grid badge: Bentuk Wajah / Tipe Hidung / Bentuk Mata / Bentuk Alis / MST (swatch + kategori Indonesia) / Undertone.
- Panel pengukuran cm (mode rasio-murni bila iris tidak valid) + 3 kartu pilar + narasi personal + tips (kacamata/topi/makeup).
- CTA "Lanjut ke Kuesioner Personalisasi": seluruh data laporan diinjeksi otomatis ke konteks prompt Gemini (`userProfileDict` diperluas).

### 8.5 Keputusan Persistensi (ADR-015)

**PostgreSQL / riwayat analisis = DITOLAK** (*considered-rejected*). Profil analisis hidup di state sesi React + snapshot opsional `localStorage` klien (hanya metrik turunan — tanpa gambar, tanpa landmark mentah). Dasar: UU PDP No. 27/2022, ADR-003 (Zero Persistent Biometrics), Batasan MVP *"DILARANG: riwayat db"*, konsistensi klaim footer aplikasi.

### 8.6 Pipeline Aset 3D & Batas Waktu (ADR-012 lanjutan)

- `scripts/download_3d_assets.py`: unduh GLB CC0 (Poly Pizza / Quaternius) → `client/public/models/` + manifest metadata (`frame_type`, `material`, `occasion`, `price_tier`, `lens_silhouette`, `bridge_type`).
- `ARCanvasViewer.tsx`: `GLTFLoader` (+ fallback generator prosedural), *head occluder* (`colorWrite:false, depthWrite:true`), anchor mahkota via landmark 10/234/454.
- **Descope ladder** (deadline 25 Agustus 2026 23.55 WIB): bila waktu habis, Fase 4 dipotong menjadi hanya injeksi prompt + manifest GLB (tanpa occluder/upgrade fotorealisme penuh).
