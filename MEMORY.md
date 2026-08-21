# PROJECT MEMORY & ARCHITECTURAL LOG
> **Single Source of Truth (SSOT)**: Arsitektur, Kepatuhan Regulasi Rulebook COMPFEST 18 AIC x WIZ.AI, dan Status Pengerjaan Proyek.

---

## 1. INFORMASI KOMPETISI & PROYEK INOVASI

### A. Metadata Kompetisi
- **Nama Kompetisi**: AI Innovation Challenge (AIC) COMPFEST in Collaboration with WIZ.AI
- **Tema Utama**: *"AI for the Backbone of the Economy"* (Transformasi rantai nilai bisnis pasca-produksi primer di Indonesia)
- **3 Pilar Solusi Wajib**:
  1. *Smart Manufacturing* (Pabrik): Pengolahan, efisiensi operasi pabrik, QC, pemeliharaan prediktif.
  2. *Smart Logistics* (Gudang & Distribusi): Pergerakan barang, optimasi rute armada, pelacakan rantai pasok, manajemen inventaris.
  3. **Smart Commerce (Toko & Pasar) — [PILAR TERPILIH]**: Sisi konsumen, otomatisasi penjualan, transaksi komersial, demand forecasting, eliminasi ketidakpastian transaksi.
- **Apresiasi & Hadiah**:
  - Juara 1: Rp7.000.000 + Peluang Magang di WIZ.AI
  - Juara 2: Rp4.500.000 + Peluang Magang di WIZ.AI
  - Juara 3: Rp2.500.000 + Peluang Magang di WIZ.AI
  - Students Award: Rp1.000.000
  - Audience Award: Rp750.000

### B. Profil Solusi Inovasi
- **Nama Tim**: Tim Inovasi AIC (Anonim / Sesuai Registrasi)
- **Nama Proyek**: **COBA** (*Cocokkan Outfit Sesuai Badan Anda — Smart AI & AR Fashion Style Recommendation Engine*)
- **Pilar Tema**: Smart Commerce
- **Problem Statement**:
  - Sektor fesyen adalah kategori belanja terbesar di Indonesia (73+ juta pembeli daring, 590 ribu IKM pakaian jadi menyerap 1,2 juta pekerja).
  - Pembeli tidak punya cara untuk mengetahui gaya mana yang benar-benar cocok dengan karakter dirinya (*style-fit mismatch*) sebelum membayar, berujung pada barang yang tidak dipakai, rating rendah, dan hilangnya loyalitas.
  - Di toko fisik (*offline*), pembeli menghabiskan waktu di ruang ganti tanpa kepastian, sementara penjual harus merekomendasikan outfit satu per satu secara manual.
- **Unique Value Proposition (UVP)**:
  - **AI Personal Character Analysis**: Scan kamera wajah 468 titik untuk mendeteksi warna kulit (Monk Scale), undertone, dan bentuk geometri wajah, lalu merekomendasikan aksesoris yang cocok dengan karakter personal user.
  - **Category-First Flow**: Pengguna memilih kategori aksesoris terlebih dahulu (Kacamata / Topi), kemudian melakukan pemindaian wajah dan menjawab kuesioner bertarget. Kategori busana tubuh (Baju / Jaket) ditandai sebagai Tahap 2 (membutuhkan sensor pose full-body).
  - **Multi-Batch Targeted Questionnaire**: Kuesioner dinamis tanpa batas batch (Batch 1-5+) didukung Gemini API & local bank untuk penyesuaian gaya mendalam.
  - **Cinematic Processing Telemetry**: Visualisasi pemrosesan data real-time yang memvalidasi setiap preferensi jawaban pengguna sebelum masuk ke studio AR.
  - **Lightweight AR Try-on with Real-time Head Tracking**: Visualisasi aksesoris (Topi & Kacamata) langsung terpasang di atas kepala & wajah pengguna secara real-time di atas video live webcam (Three.js & MediaPipe Vision 468 landmarks) yang mengikuti gerakan geleng, angguk, miring, dan jarak kepala secara presisi dengan generator 3D prosedural untuk beragam tipe topi (Baseball Cap, Beanie, Bucket Hat, Fedora, Beret, Newsboy) dan kacamata (Wayfarer, Aviator, Round, Geometric, Cat-Eye).
  - **Top-4 Archetype Switch Navigation**: Navigasi tombol Switch instan untuk menguji coba 4 model aksesoris terbaik secara berurutan.
  - **Zero Persistent Biometrics**: Privasi data terjaga 100% (*session-scoped memory*).

---

## 2. TIMELINE, DEADLINE & PROTOKOL KOMPETISI

| Fase / Kegiatan | Tanggal Pelaksanaan | Keterangan & Protokol Tim |
| :--- | :--- | :--- |
| **Pendaftaran Batch 1** | 17 Juni – 9 Juli 2026 | Free registration |
| **Pendaftaran Batch 2** | 10 Juli – 18 Juli 2026 | Rp200.000 / tim |
| **Technical Meeting Penyisihan** | 18 Juli 2026 | Daring via Zoom |
| **Periode Pengerjaan Penyisihan** | 17 Juni – 25 Agustus 2026 | Pengerjaan kode, Docker, proposal, & video |
| **AIC Talks (Webinar Edukatif)** | 25 Juli 2026 | **Wajib hadir & isi presensi** (+1.5% Nilai Bonus) |
| **DEADLINE SUBMISI PENYISIHAN** | **25 Agustus 2026 (23.55 WIB)** | **Batas akhir push GitHub & submit berkas di portal COMPFEST** |
| **Periode Penjurian Penyisihan** | 27 Agustus – 8 September 2026 | Evaluasi proposal, repo, dan video oleh dewan juri |
| **STANDBY DISCORD (Klarifikasi & Demo)** | **9 & 10 September 2026 (20.00 WIB)** | **KRUSIAL**: Tim wajib standby Discord. Panitia dapat meminta klarifikasi/jadwal live demo. **Wajib merespons maksimal dalam 2 jam!** |
| **Pengumuman Finalis (Top 8)** | 11 September 2026 | Instagram `@compfest` & Portal |
| **Mentoring Babak Final** | 20 September 2026 | Daring via Zoom bersama mentor AI & Product Management |
| **Technical Meeting Final** | 22 September 2026 | Daring via Zoom |
| **Hackathon Babak Final (10 Jam)** | 26 September 2026 | Luring di Gedung Baru Fasilkom UI. Wajib push berkala per checkpoint. |
| **Live Pitching & Awarding Night** | 27 September 2026 | Luring di Gedung Baru Fasilkom UI |

---

## 3. BATASAN KETAT RUANG LINGKUP MVP PENYISIHAN (ANTI-OVERENGINEERING)
*Mematuhi aturan ketat Bab Teknis Penyisihan Rulebook AIC demi menjamin kemudahan evaluasi reproduksibilitas lokal oleh juri:*

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BATASAN SCOPE MVP PENYISIHAN                    │
├───────────────────┬────────────────────────────────────────────────────┤
│ Modul             │ Ketentuan Wajib & Larangan Keras                   │
├───────────────────┼────────────────────────────────────────────────────┤
│ 1. Frontend (UI)  │ • FOKUS HANYA alur interaksi inti: single input    │
│                   │   pengguna -> menampilkan output inferensi AI.     │
│                   │ • DILARANG: Dashboard multi-page analitik, auth    │
│                   │   kompleks (multi-role login/register), riwayat db │
├───────────────────┼────────────────────────────────────────────────────┤
│ 2. Backend (API)  │ • FOKUS HANYA pemrosesan sinkron (Synchronous API).│
│                   │ • DILARANG: Celery/RabbitMQ/Redis workers, auto    │
│                   │   logging pipeline, database terdistribusi.        │
│                   │ • WAJIB: Jalan lokal via `docker compose up`.      │
├───────────────────┼────────────────────────────────────────────────────┤
│ 3. Model & AI     │ • FOKUS HANYA inferensi utama (core inference)     │
│                   │   dengan parameter statis saat demonstrasi.        │
│                   │ • DILARANG: Auto-tuning, bulk test runner, auto    │
│                   │   feedback loops di repo penyisihan.               │
├───────────────────┼────────────────────────────────────────────────────┤
│ 4. Pretrained/API │ • Diperbolehkan menggunakan pre-trained model/API  │
│                   │ • WAJIB melalui proses fine-tuning atau adaptasi   │
│                   │   domain terarah sesuai fitur inovasi tim.         │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 4. STANDAR DELIVERABLES PENYISIHAN & STRUKTUR FILE

### A. Repositori GitHub Public
- Source code lengkap terisolasi rapi: `client/`, `server/`, `ai_engine/`.
- `README.md` memuat panduan setup localhost yang jelas dan teruji via Docker.
- Konvensi Git Commit (**Conventional Commits - Wajib**):
  - `feat: <deskripsi>`: Penambahan fitur baru.
  - `fix: <deskripsi>`: Perbaikan bug.
  - `refactor: <deskripsi>`: Perubahan struktur tanpa mengubah fungsionalitas.
- **Toggle Mock Data Mode**: Jika menggunakan modul eksternal/kamera/hardware, sediakan mode fallback dummy agar tetap 100% dapat diuji oleh juri.

### B. Video Proof of Work (PoW) — Maksimal 7 Menit
- **Platform & Visibility**: YouTube, Status **Unlisted**.
- **Format Judul**: `COMPFEST 18 AIC: PROOF OF WORK - [Nama Tim] - [Nama Proyek]`
- **Format Layar**: Double screen terminal (log backend/docker) + aplikasi web/UI berjalan, disertai timestamp waktu nyata.
- **Aturan Editing**: **DILARANG KERAS MEMOTONG (CUT) VIDEO**. Hanya diperbolehkan percepat (*fast-forward*) saat proses *build/loading* dan *voice-over* penjelasan.
- **Konten Wajib**: Menunjukkan alur program yang sudah bekerja maupun yang masih *buggy/belum sempurna* secara transparan. Semua fitur di video inovasi wajib ada di video PoW.

### C. Video Promosi Karya Inovasi — Maksimal 5 Menit
- **Platform & Visibility**: YouTube, Status **Public**.
- **Format Judul**: `COMPFEST 18 AIC: [Nama Tim] - [Nama Proyek]`
- **Spesifikasi Video**: Format MP4, Resolusi minimal 720p.
- **Konten Wajib**: Storytelling proses perancangan, problem statement berbasis data, demonstrasi solusi, dan daya tarik komersial bagi pengguna baru maupun calon investor/stakeholder.

### D. Naskah Proposal PDF — Maksimal 20 Halaman
*(Di luar cover, daftar pustaka, dan lampiran)*
- **Struktur Bab Wajib**:
  1. Nama Kelompok dan Judul/Nama Inovasi (*Tanpa atribut institusi*)
  2. Latar Belakang (*Urgensi nyata berbasis data industri Indonesia*)
  3. Tujuan dan Manfaat Pengembangan
  4. Metodologi Komprehensif:
     - Alur perolehan dataset (sumber terbuka CC0 / sintetik / preprocessing)
     - Alur pengembangan model tiap fitur (arsitektur, fine-tuning, evaluasi)
     - Alur integrasi model ke backend & frontend
     - Data-backed decision making (alasan teknis pemilihan model & stack)
  5. Kesimpulan & Roadmap Pengembangan (Rencana iterasi saat Hackathon Final 10 Jam)
  6. **Bab Bonus (+3.5%)**:
     - *Business Value*: Model bisnis, analisis kelayakan pasar UMKM/retail fesyen.
     - *AI Governance & Ethics*: Regulasi UU PDP, mitigasi bias tubuh/kulit, transparansi data.

---

## 5. ATURAN PRIVASI & DISKUALIFIKASI MUTLAK (ZERO INSTITUTION IDENTITY)
> [!CAUTION]
> **ATURAN DISKUALIFIKASI MUTLAK (Ketentuan Khusus Poin 6 & Teknis Poin 5.a):**
> DILARANG KERAS mencantumkan atau menampilkan nama universitas, nama fakultas, logo kampus, jaket almamater, atribut, maupun identitas institusi pendidikan lainnya di:
> - Naskah Proposal (Cover, Header, Footer, Badan Teks)
> - File `README.md`, `MEMORY.md`, dan seluruh dokumentasi
> - Source code (Komentar kode, nama package, metadata author, variabel)
> - Video Proof of Work & Video Promosi (Visual latar belakang, pakaian presenter, suara)

---

## 6. RUBRIK PENILAIAN LENGKAP (TARGET: 105.0%)

```
┌─────────────────────────────────────────────────────────────┬─────────┐
│ Kriteria Penilaian Penyisihan AIC COMPFEST 18               │ Bobot   │
├─────────────────────────────────────────────────────────────┼─────────┤
│ 1. Implementasi Teknologi & Kematangan Arsitektur           │ 25.0%   │
│    • Kesesuaian & efisiensi pemilihan tech stack            │         │
│    • Core inference bersih & parameter terdefinisi          │         │
│    • Modularitas arsitektur (FE, BE, AI terisolasi rapi)    │         │
│    • Dokumentasi README.md lengkap & mudah direproduksi     │         │
├─────────────────────────────────────────────────────────────┼─────────┤
│ 2. Orisinalitas dan Dampak Sosial                           │ 20.0%   │
│    • Keunikan solusi vs solusi eksisting                    │         │
│    • Urgensi pemecahan masalah ekonomi pasca-produksi       │         │
│    • Relevansi kebutuhan lokal (Indonesia) & skala global   │         │
├─────────────────────────────────────────────────────────────┼─────────┤
│ 3. Kesiapan Minimum Viable Product (MVP) untuk Babak Final  │ 15.0%   │
│    • Ruang lingkup tepat sesuai batas aturan penyisihan     │         │
│    • Fungsionalitas inti cukup untuk dievaluasi             │         │
│    • Fleksibilitas arsitektur untuk Hackathon 10 Jam        │         │
│    • Kesadaran tim atas area pengembangan lanjutan          │         │
├─────────────────────────────────────────────────────────────┼─────────┤
│ 4. Video Promosi (Storytelling, Problem Solving, Pitch)     │ 15.0%   │
├─────────────────────────────────────────────────────────────┼─────────┤
│ 5. Kualitas Proposal & Proses Pengembangan                  │ 15.0%   │
│    • Metodologi komprehensif (Dataset, Model, Integrasi)    │         │
│    • Data-backed decision making                            │         │
│    • Narasi proses iteratif reflektif                       │         │
├─────────────────────────────────────────────────────────────┼─────────┤
│ 6. Relevansi dengan Tema ("AI for Backbone of the Economy") │ 10.0%   │
├─────────────────────────────────────────────────────────────┼─────────┤
│ 7. BONUS: Business Value & AI Governance                    │ +3.5%   │
│    • Model bisnis / adopsi industri yang realistis          │         │
│    • Responsible AI, mitigasi bias, kepatuhan privasi data  │         │
├─────────────────────────────────────────────────────────────┼─────────┤
│ 8. BONUS: Partisipasi AIC Talks                             │ +1.5%   │
│    • Kehadiran dan pengisian presensi webinar edukatif      │         │
├─────────────────────────────────────────────────────────────┼─────────┤
│ TOTAL SKOR MAKSIMAL                                         │ 105.0%  │
└─────────────────────────────────────────────────────────────┴─────────┘
```

---

## 7. TECH STACK & ARSITEKTUR TEKNIS PROYEK (`COBA`)

```
                        ┌───────────────────────────────────────────┐
                        │             CLIENT (Frontend)             │
                        │    Next.js / React + Tailwind + Three.js  │
                        │     - Single input: Camera Video Stream   │
                        │     - MediaPipe Pose (33) & Face (468)    │
                        │     - AR Web Canvas Viewer (glTF/GLB)     │
                        └─────────────────────┬─────────────────────┘
                                              │ HTTP POST /api/v1/analyze
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │             SERVER (Backend)              │
                        │            FastAPI (Python 3.11)          │
                        │     - Synchronous Request Orchestrator    │
                        │     - Skin Tone & Undertone (CIELAB Space)│
                        │     - Body (ANSUR II) & Face Classifiers  │
                        │     - Style Recommendation & Ranking      │
                        │     - Mock Data Mode (MOCK_MODE=true)     │
                        └─────────────────────┬─────────────────────┘
                                              │ Local IPC / Python Module
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │            AI_ENGINE (Core ML)            │
                        │     - OpenCV CIELAB Distance to MST Scale │
                        │     - Random Forest Face Shape Classifier │
                        │     - ANSUR II Body Shape Ratio Engine    │
                        │     - FashionCLIP Embedding + Similarity  │
                        │     - Dataset: Fashion Images CC0 + SCIN  │
                        └───────────────────────────────────────────┘
```

- **Frontend (`client/`)**: Next.js (App Router), Tailwind CSS, Three.js, `@mediapipe/tasks-vision`. Single-page user flow yang responsif. MediaPipe Pose dan Face Mesh berjalan 100% client-side (menjamin privasi data dan nol latensi video).
- **Backend (`server/`)**: FastAPI, Pydantic v2, Uvicorn. Menerima rasio landmark dan crop ROI kulit wajah, menjalankan analisis warna kulit CIELAB, klasifikasi bentuk tubuh & wajah, serta pemeringkatan rekomendasi busana.
- **AI Engine (`ai_engine/`)**: Python, OpenCV, NumPy, Scikit-learn, `marqo-FashionCLIP`. Menghitung jarak warna kulit terhadap 10 skala Monk Skin Tone (Google), klasifikasi bentuk tubuh berbasis rasio antropometri ANSUR II, klasifikasi bentuk wajah Random Forest, dan pemeringkatan keserasian outfit berbasis vektor embedding.
- **Orchestration**: `docker-compose.yml` mengorkestrasi seluruh modul ke dalam satu jaringan lokal bridge dengan satu perintah: `docker compose up --build`.

---

## 8. ARCHITECTURAL DECISION RECORDS (ADR)
- **[2026-08-19] ADR-001**: Inisialisasi arsitektur 3-tier modular (`client/`, `server/`, `ai_engine/`) dengan komunikasi synchronous REST murni via FastAPI untuk menjamin kepatuhan batasan MVP penyisihan tanpa background worker eksternal.
- **[2026-08-19] ADR-002**: Menggunakan dataset *Fashion Product Images* (CC0 Public Domain) sebagai katalog utama, *Google Monk Skin Tone (MST) scale* dan *Google SCIN* untuk analisis warna kulit, *ANSUR II* untuk kalibrasi rasio bentuk tubuh, dan *Polyvore Outfits* untuk benchmark kompatibilitas busana.
- **[2026-08-19] ADR-003**: Penegakan kebijakan *Zero Persistent Biometric Retention* (arsitektur stateless session) demi memenuhi standar regulasi AI Governance dan UU PDP No. 27/2022.
- **[2026-08-19] ADR-004**: Penerapan isolasi identitas mutlak (*Zero Institution Identity*) pada semua artefak kode, metadata git, video, dan proposal.
- **[2026-08-20] ADR-005**: Penghapusan fitur rekomendasi ukuran (*sizing recommendation*) dari scope MVP. Alasan: (1) Fokus proyek dipersempit ke *style-fit mismatch* yang merupakan masalah utama yang belum terjawab oleh solusi existing. (2) Fitur sizing memerlukan kalibrasi SNI yang kompleks dan berisiko setengah jadi di timeline penyisihan. (3) Menghapus sizing memungkinkan tim fokus pada pipeline AI rekomendasi gaya yang lebih matang dan demonstrasi AR yang lebih meyakinkan.
- **[2026-08-20] ADR-006**: Pemilihan tech stack per fitur dengan alasan data-backed: (a) MediaPipe Pose+Face (Apache 2.0, client-side, zero latency) untuk ekstraksi landmark tubuh dan wajah. (b) OpenCV CIELAB + Google Monk Skin Tone scale untuk deteksi undertone (robust terhadap pencahayaan, explainable, zero heavy training). (c) ANSUR II calibrated ratios untuk klasifikasi bentuk tubuh yang ringan (< 1ms). (d) Random Forest untuk klasifikasi bentuk wajah (ringan, cepat, akurasi tinggi pada fitur geometris). (e) FashionCLIP + faiss-cpu untuk outfit recommendation (domain-optimized embeddings, sub-second search di 44K items). (f) Three.js + GLB untuk AR try-on aksesoris kacamata (standar industri WebGL, no plugin, 30+ FPS).
- **[2026-08-20] ADR-007**: Rename proyek dari *FitWise AI* menjadi **COBA** (*Cocokkan Outfit Sesuai Badan Anda*) untuk mencerminkan fokus baru pada style-fit recommendation tanpa sizing.
- **[2026-08-20] ADR-008**: Urutan prioritas pengerjaan MVP: (1) Classification pipeline (skin tone, face shape, body shape) karena komponen berisiko tertinggi dan core differentiator, (2) Recommendation engine, (3) Kuesioner + frontend, (4) AR aksesoris wajah, (5) Docker + mock + video. Prinsip: selesaikan komponen berisiko tertinggi lebih dulu.
- **[2026-08-20] ADR-009**: Strategi AR hybrid untuk MVP penyisihan: (a) Aksesoris wajah (kacamata, topi) = PRIORITAS UTAMA AR karena face landmark 468 titik sangat presisi. (b) Pakaian ditampilkan sebagai kartu rekomendasi 2D (foto katalog), bukan AR overlay. (c) 3D jacket overlay = stretch goal untuk hackathon final karena masih ada masalah occlusion dan kalibrasi pose-to-mesh.
- **[2026-08-21] ADR-010**: Standardisasi & Verifikasi 100% Tautan Sumber Dataset & Repositori Terbuka. Seluruh dataset dan repositori pendukung (Google SCIN, Matt Groh Fitzpatrick17k, Penn State OpenLab ANSUR II, HuggingFace Polyvore-outfits, Kaggle Fashion Product Images, Three.js, MediaPipe) telah diaudit dan diverifikasi 100% aktif (HTTP 200 OK) serta bebas risiko lisensi komersial/redistribusi.
- **[2026-08-21] ADR-011**: Pemilihan Output Top-4 Rekomendasi Terkurasi (*The 4 Style Archetypes*) dan Alur Kustomisasi Bertingkat (Aksesoris: Kacamata/Topi vs Pakaian: Baju/Jaket). Alasan: (1) Mengeliminasi *choice fatigue* / *choice paralysis* sesuai kaidah *Hick's Law*, (2) Mengelompokkan 4 varian gaya logis (#1 Perfect Match, #2 Safe Classic, #3 Bold Statement, #4 Modern Silhouette), (3) Model #1 otomatis terpasang (auto-attach) di WebGL dengan navigasi switch panah Kiri-Kanan yang ringan (< 10MB memory, 60 FPS).
- **[2026-08-21] ADR-012**: Transisi dari Geometri Primitif Prosedural ke Aset 3D Fotorealistis (`.glb`/`.gltf`) & Head Occluder Mask. Evaluasi visual live webcam menunjukkan bahwa topi yang dibangun dari primitive mesh dasar Three.js (Sphere/Cylinder) terlihat kaku, artifisial, dan bertabrakan dengan rambut/dahi karena ketiadaan depth occlusion. Keputusan: (1) Mengadopsi aset 3D `.glb` bertekstur PBR dari sumber terbuka CC0 (Poly Pizza / Quaternius), (2) Mengintegrasikan Three.js `GLTFLoader` dengan *Head Occlusion Mesh* (invisible depth mask `colorWrite: false, depthWrite: true` berbasis MediaPipe 468 landmark) agar bagian dalam/belakang topi terpotong secara alami oleh kepala pengguna, (3) Menambahkan script otomatis `scripts/download_3d_assets.py` untuk mengunduh dan memvalidasi bundel aset 3D lokal.

---

## 9. CHECKLIST VERIFIKASI DELIVERABLES & KESIAPAN SUBMISI

### A. Repositori & Kode
- [ ] Struktur direktori terpisah rapi: `client/`, `server/`, `ai_engine/`
- [ ] Masing-masing modul memiliki `Dockerfile` yang valid
- [ ] `docker-compose.yml` terkonfigurasi dan lolos uji `docker compose up --build` di localhost
- [ ] Panduan instalasi dan reproduksi di `README.md` lengkap dan teruji
- [ ] Seluruh commit mematuhi Conventional Commits (`feat:`, `fix:`, `refactor:`)
- [ ] Fitur memiliki "Mock Data Mode" jika input kamera/hardware tidak tersedia
- [ ] Audit Zero Identity: Tidak ada nama universitas/fakultas di komentar, kode, atau config

### B. Naskah Proposal (`Proposal.md`)
- [ ] Judul & Nama Inovasi bebas identitas kampus
- [ ] Latar belakang memuat data faktual industri ritel/e-commerce Indonesia
- [ ] Metodologi lengkap: alur dataset terbuka, arsitektur model per fitur, alur integrasi
- [ ] Bagian *Data-backed Decision Making* menjelaskan alasan pemilihan teknologi
- [ ] Bagian Kesimpulan memuat *Roadmap Hackathon Final 10 Jam*
- [ ] **Bab Bonus (+3.5%)**: *Business Value* (model adopsi industri) & *AI Governance* (Responsible AI & UU PDP) lengkap
- [ ] Total halaman $\le$ 20 halaman (di luar cover, daftar pustaka, lampiran)

### C. Media & Video
- [ ] **Video Proof of Work**: Maksimal 7 menit, YouTube Unlisted, double screen terminal + app + timestamp, NO CUTS, judul sesuai format.
- [ ] **Video Promosi**: Maksimal 5 menit, YouTube Public, MP4 $\ge$ 720p, storytelling terstruktur, judul sesuai format.

### D. Kesiapan Operasional
- [ ] Mengisi presensi AIC Talks (+1.5% Bonus)
- [ ] Standby Discord grup AIC pada 9–10 September 2026 pukul 20.00 WIB (SLA respons < 2 jam)

---

## 10. RIWAYAT PROGRESS LENGKAP & STATUS SESI TERAKHIR

### A. Rekapitulasi Capaian yang Berhasil Diselesaikan:
1. **Biometric Vision Pipeline**:
   - MediaPipe FaceLandmarker 468 landmark realtime.
   - Deteksi Warna Kulit CIELAB $\Delta E$ ke 10 Skala Google Monk Skin Tone (MST).
   - Klasifikasi Undertone (Warm, Cool, Neutral, Olive) + Palet Warna Serasi & Tabrakan.
   - Ekstraksi Rasio Geometri Wajah (Oval, Round, Square, Heart, Oblong).
2. **Hierarchical Category-First Flow**:
   - Level 1: Aksesoris (Aktif) vs Pakaian / Busana (Locked / Coming Soon — Tahap 2).
   - Level 2: Kacamata (Glasses) vs Topi (Hats) dengan tombol navigasi kembali.
3. **Ultra-Fast Dynamic Questionnaire Engine**:
   - Terintegrasi langsung dengan Gemini API low-latency Flash-Lite.
   - Pertanyaan 100% dinamis dan disesuaikan secara eksplisit dengan bentuk wajah dan undertone pengguna.
4. **Cinematic Processing Telemetry**:
   - Loading screen interaktif yang memvalidasi setiap input preferensi gaya pengguna secara visual.
5. **Real-time Live Webcam AR Try-On Studio**:
   - Background video live webcam dengan selfie mirror mode (`-scale-x-100`).
   - Tracking posisi 3D, rotasi (pitch, yaw, roll), dan skala di atas kepala & wajah pengguna pada 60 FPS.
   - Tombol navigasi Top-4 Curated Archetypes Switch (#1 Perfect Match, #2 Safe Classic, #3 Bold Statement, #4 Modern Silhouette).
6. **Containerisasi Docker Desktop**:
   - `docker-compose.yml` teruji `Up (healthy)` untuk `coba-backend-server` (port 8000) dan `coba-frontend-client` (port 3000).

### B. Masalah yang Teridentifikasi pada Sesi Malam Ini:
- **Visual Kualitas Topi 3D Primitif**:
  - Model 3D prosedural menggunakan primitive mesh Three.js (Sphere/Cylinder) terlihat seperti "balok kaku / helm mainan" dan tidak pas membungkus tempurung kepala.
  - Ketiadaan *Head Occluder Mesh* (invisible depth mask) menyebabkan bagian dalam/bawah topi merembes dan bertabrakan dengan rambut/dahi pengguna.

### C. Rencana Aksi Lanjutan (Untuk Sesi Esok Hari):
1. **Download & Bundel Aset 3D Fotorealistis (`.glb`/`.gltf`)**:
   - Menjalankan script `scripts/download_3d_assets.py` untuk mengunduh model 3D CC0 bertekstur PBR (Cap, Beanie, Bucket Hat, Fedora, Beret, Wayfarer, Aviator).
2. **Implementasi Head Occlusion Masking di Three.js**:
   - Menambahkan Three.js Face Mesh Occluder (`material.colorWrite = false; material.depthWrite = true`) yang secara otomatis menyembunyikan bagian belakang/dalam topi yang tertutup oleh kepala pengguna.
3. **Penyelarasan Skala & Offset Anchor**:
   - Melakukan kalibrasi agar beanie/cap membungkus kepala secara pas (*snug fit*) menyerupai video referensi demo.
