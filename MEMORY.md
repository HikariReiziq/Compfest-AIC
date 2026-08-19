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
- **Nama Proyek**: **FitWise AI** (*Smart AI & AR Fashion Sizing & Recommendation Engine*)
- **Pilar Tema**: Smart Commerce
- **Problem Statement**:
  - Sektor fesyen adalah kategori belanja terbesar di Indonesia (73+ juta pembeli daring, 590 ribu IKM pakaian jadi menyerap 1,2 juta pekerja).
  - Pembeli dihadapkan pada ketidakpastian ukuran (*sizing mismatch*) dan model pakaian, berujung pada tingginya angka pengaduan konsumen (ribuan kasus/tahun) serta kerugian retur miliaran rupiah, beban ongkos kirim balik, dan risiko gagal bayar transaksi COD bagi merchant UMKM.
  - Di toko fisik (*offline*), antrean panjang ruang ganti dan keraguan pembeli menyebabkan *abandoned sales*.
- **Unique Value Proposition (UVP)**:
  - **Estimasi Antropometri Terkalibrasi SNI**: Estimasi proporsi tubuh dari Computer Vision yang disesuaikan dengan Data Antropometri Indonesia (SNI 08-4985-1999 & SNI 2161:2010), bukan sekadar model barat.
  - **Batch Recommendation Engine**: Rekomendasi busana bertahap berbasis konteks (formal/casual, fit preference) memetakan atribut dataset CC0 Fashion Product Images.
  - **Lightweight AR Try-on**: Visualisasi busana dan aksesoris wajah/tubuh instan langsung di peramban (Three.js & MediaPipe Vision) tanpa dependensi proprietary cloud berbayar.
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

## 7. TECH STACK & ARSITEKTUR TEKNIS PROYEK (`FitWise AI`)

```
                        ┌───────────────────────────────────────────┐
                        │             CLIENT (Frontend)             │
                        │    Next.js / React + Tailwind + Three.js  │
                        │     - Single input: Camera / Upload / Form│
                        │     - AR Web Canvas Viewer (glTF/GLB)     │
                        └─────────────────────┬─────────────────────┘
                                              │ HTTP POST /api/v1/analyze
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │             SERVER (Backend)              │
                        │            FastAPI (Python 3.11)          │
                        │     - Synchronous Request Orchestrator    │
                        │     - Size Matching Algorithm (SNI)       │
                        │     - Recommendation Filter & Ranking     │
                        └─────────────────────┬─────────────────────┘
                                              │ Local IPC / Python Module
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │            AI_ENGINE (Core ML)            │
                        │     - MediaPipe Pose & Face Landmark      │
                        │     - Anthropometric Ratio Extractor      │
                        │     - Pre-trained / Fine-tuned Embedder   │
                        │     - Dataset: CC0 Fashion Images + SNI   │
                        └───────────────────────────────────────────┘
```

- **Frontend (`client/`)**: Next.js (App Router), Tailwind CSS, Three.js / `@mediapipe/camera_utils`. Single-page flow yang elegan, modern, responsif.
- **Backend (`server/`)**: FastAPI, Pydantic v2, Uvicorn. Menerima payload, memvalidasi input, memanggil engine inferensi secara sinkron, mengembalikan response JSON & metadata 3D.
- **AI Engine (`ai_engine/`)**: Python, OpenCV, MediaPipe, NumPy, Scikit-learn. Ekstraksi koordinat antropometri tubuh/wajah $\rightarrow$ mapping ke tabel ukuran standar SNI (SNI 08-4985-1999 & SNI 2161:2010).
- **Orchestration**: `docker-compose.yml` mengorkestrasi seluruh modul ke dalam satu jaringan lokal bridge dengan satu perintah: `docker compose up --build`.

---

## 8. ARCHITECTURAL DECISION RECORDS (ADR)
- **[2026-08-19] ADR-001**: Inisialisasi arsitektur 3-tier modular (`client/`, `server/`, `ai_engine/`) dengan komunikasi synchronous REST murni via FastAPI untuk menjamin kepatuhan batasan MVP penyisihan tanpa background worker eksternal.
- **[2026-08-19] ADR-002**: Menggunakan dataset *Fashion Product Images* (CC0 Public Domain) dan *Data Antropometri Indonesia / SNI* sebagai basis acuan sizing, menjamin legalitas lisensi 100% bersih dan relevansi demografi lokal Indonesia.
- **[2026-08-19] ADR-003**: Penegakan kebijakan *Zero Persistent Biometric Retention* (arsitektur stateless session) demi memenuhi standar regulasi AI Governance dan UU PDP No. 27/2022.
- **[2026-08-19] ADR-004**: Penerapan isolasi identitas mutlak (*Zero Institution Identity*) pada semua artefak kode, metadata git, video, dan proposal.

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
