# COBA — Smart AI & 3D AR Fashion Style Recommendation Engine

<p align="center">
  <img src="client/public/images/logo.png" alt="COBA Logo" width="220" />
</p>

<p align="center">
  <strong>AI Innovation Challenge (AIC) COMPFEST 18 — Smart Commerce Track</strong><br>
  <em>Cocokkan Outfit Sesuai Badan Anda: Rekomendasi Gaya Busana Berbasis Karakter Personal dengan Validasi Visual 3D WebGL AR di Peramban.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Competition-COMPFEST%2018%20AIC-8B5CF6?style=for-the-badge" alt="COMPFEST 18" />
  <img src="https://img.shields.io/badge/Track-Smart%20Commerce-EC4899?style=for-the-badge" alt="Smart Commerce Track" />
  <img src="https://img.shields.io/badge/Frontend-Next.js%2014%20|%20TailwindCSS%20|%20Three.js-000000?style=for-the-badge&logo=nextdotjs" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/Backend-FastAPI%20|%20Python%203.10+-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Vision-Google%20MediaPipe-00A67E?style=for-the-badge" alt="MediaPipe" />
  <img src="https://img.shields.io/badge/Deployment-Docker%20Compose-2496ED?style=for-the-badge&logo=docker" alt="Docker Compose" />
</p>

---

## 📌 Daftar Isi
1. [Ringkasan Eksekutif & Latar Belakang](#1-ringkasan-eksekutif--latar-belakang)
2. [Solusi Inovatif & Alur 5 Tahap Pengguna](#2-solusi-inovatif--alur-5-tahap-pengguna)
3. [Arsitektur Teknis Sistem & AI Pipeline](#3-arsitektur-teknis-sistem--ai-pipeline)
4. [Panduan Setup & Menjalankan Aplikasi Secara Lokal (Local Quickstart)](#4-panduan-setup--menjalankan-aplikasi-secara-lokal-local-quickstart)
   - [Opsi 1: Menjalankan dengan Docker Compose (Sangat Direkomendasikan)](#opsi-1-menjalankan-dengan-docker-compose-sangat-direkomendasikan)
   - [Opsi 2: Menjalankan Manual di Localhost (Development Mode)](#opsi-2-menjalankan-manual-di-localhost-development-mode)
   - [Konfigurasi Environment Variables (`.env`)](#konfigurasi-environment-variables-env)
   - [Mode Evaluasi Cepat Juri (Preset Evaluation Mode)](#mode-evaluasi-cepat-juri-preset-evaluation-mode)
5. [Spesifikasi & Dokumentasi REST API](#5-spesifikasi--dokumentasi-rest-api)
6. [Struktur Direktori Proyek](#6-struktur-direktori-proyek)
7. [Dataset Terverifikasi & Lisensi Open-Source](#7-dataset-terverifikasi--lisensi-open-source)
8. [Jaminan Privasi & Kepatuhan Hukum (UU PDP No. 27/2022)](#8-jaminan-privasi--kepatuhan-hukum-uu-pdp-no-272022)
9. [Konvensi Standar Commit (Conventional Commits)](#9-konvensi-standar-commit-conventional-commits)

---

## 1. Ringkasan Eksekutif & Latar Belakang

### Masalah Utama
Sektor *e-commerce fashion* di Indonesia mencakup lebih dari **73 juta pembeli daring** dan **590 ribu pelaku IKM pakaian jadi**. Namun, konsumen dan pedagang menghadapi tantangan mendasar yang belum terselesaikan:
1. **Ketidakcocokan Rona Kulit (*Undertone Mismatch*)**: Kesalahan memilih palet warna busana yang membuat kulit tampak kusam (*wash-out*).
2. **Ketidakseimbangan Siluet Tubuh & Wajah (*Silhouette Imbalance*)**: Konsumen sulit membayangkan apakah potongan kerah, siluet baju, bentuk kacamata, atau topi proporsional dengan bentuk fisik mereka.
3. **Kelelahan Memilih (*Choice Fatigue*) & Retur Barang (*Silent Return*)**: Menurut riset *McKinsey & BoF State of Fashion 2025*, hingga **50% konsumen membatalkan pembelian** akibat kebingungan memilih, serta tingkat retur barang akibat salah ukuran/gaya mencapai 20-30%.

### Solusi COBA
**COBA** (*Cocokkan Outfit Sesuai Badan Anda*) hadir sebagai ekosistem pintar berbasis web peramban yang menghadirkan **Zero-Storage AI Biometric Profiling**, **Top-4 Curated Style Archetypes Engine**, dan **Interactive 3D WebGL Virtual Try-On** berkecepatan 60 FPS tanpa perlu memasang aplikasi tambahan.

---

## 2. Solusi Inovatif & Alur 5 Tahap Pengguna

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             ALUR PENGALAMAN PENGGUNA                             │
└──────────────────────────────────────────────────────────────────────────────────┘
   [1. Landing & Pemilihan Kategori]
   ├── Kategori Aksesoris : Kacamata (Glasses) | Topi (Hats)
   └── Kategori Pakaian   : Pakaian / Baju (Shirts)
           │
           ▼
   [2. Pemindaian Biometrik AI (Kamera Live / Upload Foto)]
   ├── Deteksi Wajah  : 468 Landmarks -> Bentuk Wajah (Oval, Bulat, Kotak, Hati, Panjang)
   ├── Analisis Kulit : CIELAB Space -> Monk Skin Tone (MST-01 s.d. MST-10) + Undertone
   ├── Deteksi Tubuh  : 33 Pose Landmarks -> Siluet Bahu, Dada, Pinggang, Pinggul
   └── Penyelarasan Tema Real-time : Tema Pink (Wanita) / Tema Biru (Pria) otomatis
           │
           ▼
   [3. Kuesioner Interaktif Bertarget (Targeted Questionnaire)]
   ├── Preferensi Acara   : Kasual Santai, Kerja / Kantor, Pesta / Formal, Olahraga
   ├── Preferensi Siluet  : Slim Fit, Regular Fit, Relaxed / Oversized Fit
   └── Preferensi Warna   : Earth Tone, Monokrom, Pastel, Bold Vibrant
           │
           ▼
   [4. Mesin Rekomendasi Cerdas: Top-4 Curated Style Archetypes]
   ├── Archetype 1 : The Best Fit    (Pilihan Terbaik dengan Skor Keserasian Tertinggi)
   ├── Archetype 2 : Safe Classic    (Pilihan Aman, Netral, dan Versatil)
   ├── Archetype 3 : Bold Statement  (Pilihan Aksen Kontras & Berani)
   └── Archetype 4 : Modern Trend    (Pilihan Modis & Siluet Kontemporer)
           │
           ▼
   [5. Studio Virtual Try-On 3D WebGL & Switch Controls]
   ├── Validasi Visual 3D AR Interaktif (Three.js WebGL 60 FPS)
   ├── Bingkai Kamera Pilihan : Canon DSLR HD Frame & Japanese Sakura Blossom Frame
   ├── Navigasi Switch Cepat  : Tab Selector Responsif + Tombol ◀ / ▶
   └── Detail Produk & Kurasi : Analisis Rona Kulit, Proporsi Siluet, & Padu-Padan
```

---

## 3. Arsitektur Teknis Sistem & AI Pipeline

```
                                ┌───────────────────────────────────────────────────┐
                                │             CLIENT SIDE (Next.js 14)              │
                                │           TailwindCSS + Three.js WebGL            │
                                ├───────────────────────────────────────────────────┤
                                │ 1. Camera Video Stream & Canvas Repositioning     │
                                │ 2. MediaPipe Face Landmarker (468 Titik Landmark) │
                                │ 3. MediaPipe Pose Landmarker (33 Titik Tubuh)     │
                                │ 4. Client-side Geometric Temporal Sampler         │
                                │ 5. Responsive Persona Switch Tab & AR Controls    │
                                └─────────────────────────┬─────────────────────────┘
                                                          │
                                                          │ HTTP REST JSON (Stateless)
                                                          ▼
                                ┌───────────────────────────────────────────────────┐
                                │               SERVER (FastAPI Python)             │
                                ├───────────────────────────────────────────────────┤
                                │ A. Skin Tone Analyzer                             │
                                │    - CIELAB Space -> Monk Scale Index (MST 1-10)  │
                                │    - Individual Typology Angle (ITA°) -> Tone     │
                                │ B. Face Shape Classifier                          │
                                │    - Landmark Ratio Extraction (Random Forest)    │
                                │ C. Body Shape Classifier                          │
                                │    - ANSUR II Standards (Shoulder/Chest/Waist/Hip)│
                                │ D. Top-4 Style Recommendation Engine              │
                                │    - Multi-Criteria Scoring (Tone + Shape + Quiz) │
                                │    - Gemini LLM Stylist Reasoner (w/ Fallback)    │
                                │ E. Static 3D Asset & Catalog Repository           │
                                └───────────────────────────────────────────────────┘
```

---

## 4. Panduan Setup & Menjalankan Aplikasi Secara Lokal (Local Quickstart)

Panduan ini disusun secara rinci agar **Panitia & Juri COMPFEST 18 AIC** dapat menjalankan seluruh sistem dengan mudah di komputer lokal.

### 📋 Persyaratan Sistem (Prerequisites)
Pastikan perangkat Anda telah terpasang salah satu dari opsi berikut:
* **Opsi Docker (Direkomendasikan)**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (versi 24.0+ dengan Docker Compose v2).
* **Opsi Manual**:
  * [Python](https://www.python.org/downloads/) (versi 3.10 atau lebih baru).
  * [Node.js](https://nodejs.org/) (versi 18.x atau 20.x LTS) & npm.

---

### Opsi 1: Menjalankan dengan Docker Compose (Sangat Direkomendasikan)

Hanya memerlukan **satu perintah** di terminal pada direktori utama repositori:

```bash
# 1. Clone repositori (jika belum)
git clone https://github.com/HikariReiziq/Compfest-AIC.git
cd Compfest-AIC

# 2. Siapkan file konfigurasi environment
cp .env.example .env

# 3. Jalankan seluruh service (Backend Server + Frontend Client)
docker compose up --build
```

Setelah proses kompilasi selesai, akses URL berikut pada peramban web:
* 🌐 **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* 📖 **Backend API Swagger Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* 🩺 **Backend Healthcheck**: [http://localhost:8000/health](http://localhost:8000/health)

> **Tips**: Untuk mematikan container, tekan `Ctrl + C` pada terminal atau jalankan `docker compose down`.

---

### Opsi 2: Menjalankan Manual di Localhost (Development Mode)

Jika ingin menjalankan service backend dan frontend secara terpisah tanpa Docker:

#### Langkah 1: Menjalankan Backend FastAPI Server
```bash
# Buka terminal pertama di direktori root project
cd Compfest-AIC

# Buat dan aktifkan virtual environment Python
python -m venv .venv

# Windows:
.\.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

# Install seluruh dependensi backend
pip install -r server/requirements.txt

# Jalankan server FastAPI dengan Uvicorn
uvicorn server.app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend akan aktif di `http://localhost:8000`*.

#### Langkah 2: Menjalankan Frontend Next.js Client
```bash
# Buka terminal kedua di direktori client
cd Compfest-AIC/client

# Install dependensi frontend
npm install

# Jalankan server development Next.js
npm run dev
```
*Frontend akan aktif di `http://localhost:3000`*.

---

### Konfigurasi Environment Variables (`.env`)

File `.env.example` telah disediakan di root repositori. Salin file ini menjadi `.env`:

```env
# ==============================================================================
# COBA - Environment Variables Configuration
# ==============================================================================

# Google Gemini API Key (Opsional - Stylist Reason Generator LLM)
# Jika dikosongkan, sistem otomatis menggunakan Intelligent Rule-Based Fallback Engine
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# Mode Evaluasi Cepat Juri (false = Full AI Pipeline; true = Mock Preset Mode)
MOCK_MODE=false

# Environment Mode
ENVIRONMENT=production
```

---

### Mode Evaluasi Cepat Juri (Preset Evaluation Mode)

Untuk memudahkan evaluasi juri tanpa harus menggunakan webcam fisik di setiap pengujian:
1. Di halaman **Tahap 2 (Pemindaian)**, juri dapat memilih mode **"Unggah Foto"** untuk menguji foto wajah/tubuh apa pun.
2. Pada panel hasil pemindaian, juri dapat mengubah gender secara langsung melalui tombol **Pria** / **Wanita** untuk melihat adaptasi tema warna secara *real-time*.
3. Sistem dilengkapi *Preset Biometrik Representatif* (Sawo Matang Indonesia, Fair Cool, Tan, dll.) yang dapat diuji langsung via API endpoint `/api/v1/catalog/presets`.

---

## 5. Spesifikasi & Dokumentasi REST API

Backend FastAPI menyediakan endpoint terstruktur dengan validasi schema Pydantic:

| Method | Endpoint | Deskripsi | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Pemeriksaan kesehatan server & integritas AI engine | `200 OK` |
| `GET` | `/api/v1/health` | Pemeriksaan status API v1 | `200 OK` |
| `POST` | `/api/v1/analyze/skin` | Ekstraksi Monk Skin Tone & undertone dari gambar base64 | `200 OK` |
| `POST` | `/api/v1/analyze/ratios` | Klasifikasi bentuk wajah (5 kelas) & tubuh (5 kelas) dari rasio landmark | `200 OK` |
| `POST` | `/api/v1/recommend` | Menghasilkan **Top-4 Curated Style Recommendations** lengkap dengan path 3D GLB | `200 OK` |
| `GET` | `/api/v1/catalog` | Mengambil seluruh katalog produk terverifikasi (Kacamata, Topi, Baju) | `200 OK` |
| `GET` | `/api/v1/catalog/presets`| Mengambil daftar preset profil untuk evaluasi instan | `200 OK` |

### Contoh Request Rekomendasi via cURL
```bash
curl -X POST "http://localhost:8000/api/v1/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "subcategory": "glasses",
    "user_profile": {
      "monk_tone": "MST-06",
      "undertone": "Warm",
      "face_shape": "Oval",
      "gender": "male"
    },
    "quiz_answers": {
      "occasion": "casual",
      "fit_preference": "regular",
      "color_mood": "earth_tone"
    }
  }'
```

---

## 6. Struktur Direktori Proyek

```
Compfest-AIC/
├── .env.example                 # Template konfigurasi environment variables
├── .gitignore                   # Aturan pengabaian file Git
├── .dockerignore                # Aturan pengabaian build context Docker
├── docker-compose.yml           # Orkestrasi Docker multi-container (Server + Client)
├── README.md                    # Dokumentasi utama dan panduan setup lokal
├── CLAUDE.md                    # Panduan standar engineering tim
├── MEMORY.md                    # Single Source of Truth (SSOT) arsitektur & ADR
├── package.json                 # Node workspace configuration
│
├── ai_engine/                   # Modul Mesin Cerdas & Model Biometrik
│   ├── models/                  # Face Classifier, Gender Estimator, Skin Analyzer
│   │   └── weights/             # Bobot model terlatih (.joblib / .pkl)
│   ├── data/                    # Dataset kurasi katalog fesyen terverifikasi
│   └── utils/                   # Utilitas ekstraksi geometri & matematika warna
│
├── client/                      # Frontend Application (Next.js 14 + Three.js)
│   ├── src/
│   │   ├── app/                 # App Router (layout.tsx, page.tsx, globals.css)
│   │   ├── components/          # Komponen UI Modular
│   │   │   ├── MainAppWrapper.tsx        # Controller State Alur 5 Tahap & Tema
│   │   │   ├── HeaderNavbar.tsx          # Floating Glassmorphic Navigation Bar
│   │   │   ├── CategorySelector.tsx      # Tahap 1: Pemilih Kategori Busana
│   │   │   ├── CameraScan.tsx            # Tahap 2: Pemindai Kamera & Biometrik
│   │   │   ├── TargetedQuiz.tsx          # Tahap 3: Kuesioner Interaktif Bertarget
│   │   │   ├── ProcessingLoadingScreen.tsx# Tahap 3.5: Loading Screen Transisi AI
│   │   │   ├── ARCanvasViewer.tsx        # Tahap 4: Viewport 3D WebGL Virtual Try-On
│   │   │   ├── SwitchControls.tsx        # Tahap 4: Tab Switcher & Analisis Kurasi
│   │   │   ├── ProductDetailModal.tsx    # Modal Spesifikasi Detail Produk
│   │   │   └── landing/                  # Halaman Beranda Hero & 3D Showcase
│   │   └── lib/                 # API Client, Face Geometry, & Mock Data
│   ├── public/                  # Aset Statis (Model 3D .glb, Gambar Produk, Ikon)
│   ├── Dockerfile               # Multi-stage production build Dockerfile Next.js
│   └── package.json             # Dependensi Frontend
│
├── server/                      # Backend REST API (FastAPI)
│   ├── app/
│   │   ├── main.py              # Entry point FastAPI, CORS, & Routing
│   │   ├── api/v1/endpoints/    # Endpoints (/analyze, /recommend, /catalog)
│   │   ├── core/                # Konfigurasi & Logging Engine
│   │   ├── schemas/             # Pydantic Request & Response Data Models
│   │   └── services/            # Logika Rekomendasi, Integrasi LLM & Fallback
│   ├── Dockerfile               # Production Dockerfile FastAPI Python
│   └── requirements.txt         # Dependensi Backend Python
│
├── docs/                        # Dokumentasi Teknis & Berkas Kompetisi
│   ├── PRD.md                   # Product Requirements Document
│   ├── Proposal.md              # Naskah Proposal Kompetisi AIC COMPFEST 18
│   ├── QUESTIONNAIRE_ANALYSIS_FLOW.md # Alur Logika Analisis Kuesioner
│   ├── competition/             # Rulebook & Panduan Teknis AIC
│   └── assets/                  # Demo Video & Asset Dokumentasi
│
└── scripts/                     # Skrip Otomasi, Pengujian, & Pembuat Katalog
    ├── test_full_ai_pipeline.py # Validasi end-to-end pipeline kecerdasan buatan
    ├── build_catalog.py         # Skrip verifikasi kelengkapan katalog produk
    └── convert_pink_assets.py   # Utilitas aset visual
```

---

## 7. Dataset Terverifikasi & Lisensi Open-Source

Seluruh data dan pustaka yang digunakan dalam proyek ini mematuhi lisensi riset dan *open-source*:

| Komponen / Aset | Dataset & Sumber Referensi | Lisensi |
| :--- | :--- | :--- |
| **Skala Rona Kulit** | Google Monk Skin Tone (MST Scale) & Google SCIN Dataset | CC BY 4.0 |
| **Karakteristik Kulit** | Fitzpatrick17k Official Research Repository | Open Research |
| **Antropometri Tubuh** | US Army ANSUR II & AWS Open Data BodyM Dataset | Public Domain / CC BY |
| **Klasifikasi Wajah** | Kaggle Face Shape Dataset & dsmlr/faceshape | MIT / Open Kaggle |
| **Katalog Fesyen** | Kaggle Fashion Product Images Dataset (44.000 Item) | **CC0 Public Domain** |
| **Model 3D Try-On** | Aset 3D Terverifikasi Khusus WebGL (.glb) | Open Assets / CC BY |
| **Pustaka Vision & AR**| Google MediaPipe Vision (Apache 2.0) & Three.js (MIT) | Open Source |

---

## 8. Jaminan Privasi & Kepatuhan Hukum (UU PDP No. 27/2022)

1. **Zero Persistent Storage (Stateless Biometrics)**: Sistem tidak menyimpan rekaman kamera mentah atau citra biometrik pengguna ke basis data persisten. Seluruh ekstraksi landmark diproses secara *client-side ephemeral session* dan langsung dibuang setelah sesi berakhir.
2. **Kepatuhan Regulasi Indonesia**: Sesuai amanat **Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022)** mengenai pemrosesan data spesifik/biometrik.
3. **Anonimitas Submisi Kompetisi**: Seluruh kode sumber, metadata, dan dokumentasi mematuhi aturan penyamaran identitas institusi untuk menjaga objektivitas penjurian COMPFEST 18.

---

## 9. Konvensi Standar Commit (Conventional Commits)

Proyek ini menerapkan standar pesan commit terstruktur sesuai spesifikasi [Conventional Commits v1.0.0](https://www.conventionalcommits.org/):

* `feat: <deskripsi>` — Penambahan fitur atau kapabilitas baru sistem.
* `fix: <deskripsi>` — Perbaikan bug atau kendala fungsionalitas.
* `refactor: <deskripsi>` — Restrukturisasi kode tanpa mengubah fungsionalitas eksternal.
* `docs: <deskripsi>` — Pembaruan dokumentasi atau panduan setup.
* `style: <deskripsi>` — Perubahan format, estetika UI, atau styling tanpa memengaruhi logika kode.
* `test: <deskripsi>` — Penambahan atau pembaruan skrip pengujian.

---

<p align="center">
  <strong>Dikembangkan untuk AI Innovation Challenge (AIC) — COMPFEST 18</strong><br>
  <em>Innovating Smart Commerce through Human-Centric AI & AR Fashion Technology.</em>
</p>