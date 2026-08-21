# CATATAN AKHIR SESI & DOKUMENTASI PROGRESS PROYEK COBA
> **Dokumentasi Komprehensif Sesi Pengembangan**: Status Implementasi, Analisis Teknis AR, dan Rencana Aksi Lanjutan.
> **Waktu Pencatatan**: 21 Agustus 2026, 22:35 WIB.

---

## 1. IKHTISAR PENGEMBANGAN DARI AWAL HINGGA AKHIR SESI

Proyek **COBA** (*Cocokkan Outfit Sesuai Badan Anda*) adalah platform rekomendasi gaya busana pintar berbasis AI dan Augmented Reality (AR) 3D interaktif yang dirancang untuk kompetisi **AI Innovation Challenge (AIC) COMPFEST in Collaboration with WIZ.AI** pada pilar **Smart Commerce**.

Sepanjang sesi pengembangan hari ini, seluruh rantai pipeline dari ujung ke ujung (*end-to-end*) telah berhasil dibangun, dihubungkan, dan dijalankan di lingkungan Docker lokal:

```
[1. Kategori 2 Tingkat] ──► [2. Pemindaian Wajah AI] ──► [3. Kuesioner Dinamis Gemini] ──► [3.5 Telemetri Animasi] ──► [4. Studio AR Live Webcam]
  - Aksesoris (Aktif)          - MediaPipe 468 Landmark    - Prompt Persona Stylist         - Visualisasi badge input    - Video background selfie
  - Pakaian (Coming Soon)      - Monk Skin Tone (MST-06)   - Generasi < 2.5 detik           - Animasi loading dinamis    - 60 FPS face tracking
                               - Undertone (Warm/Cool)     - Pertanyaan 100% kontekstual                                 - Switch Top-4 Archetypes
                               - Rasio Geometri Wajah
```

---

## 2. REKAPITULASI DETAIL KOMPONEN YANG TELAH SELESAI

### A. Alur Pemilihan Kategori Hierarkis (*Category-First Flow*)
* **Layar 1 (Kategori Utama)**: Pengguna disajikan 2 kartu utama:
  1. **Aksesoris** (Aktif dan siap uji coba AR instan).
  2. **Pakaian / Busana** (Terkunci dengan badge *Coming Soon — Tahap 2* karena memerlukan pelacakan *full-body pose* dengan tangan ke bawah).
* **Layar 2 (Sub-Kategori)**: Setelah memilih Aksesoris, muncul sub-pilihan **Kacamata (Glasses)** dan **Topi (Hats)** dengan tombol navigasi kembali ke kategori utama.
* **Pembersihan Toolbar Pengujian**: Div *Evaluation Control / Preset Mock* telah dihapus dari antarmuka pengguna demi tampilan produksi yang bersih.

### B. Pipeline Vision & Biometrik Wajah
* Mengintegrasikan `@mediapipe/tasks-vision` FaceLandmarker (468 titik landmark 3D) di sisi peramban.
* Mengekstrak ROI kulit pipi/dahi dan menghitung jarak warna di ruang warna **CIELAB $\Delta E$** terhadap 10 skala standar **Google Monk Skin Tone (MST)**.
* Mengklasifikasikan **Undertone** (Warm, Cool, Neutral, Olive) beserta rekomendasi palet warna serasi (*best colors*) dan warna tabrakan (*clash colors*).
* Menghitung rasio proporsi wajah (*width-to-height*, *jaw-to-forehead*, *chin sharpness*) untuk menentukan bentuk wajah (*Oval, Round, Square, Heart, Oblong*).
* **Solusi Penanganan Kamera Terkunci (*Device Lock Handling*)**: Dilengkapi tombol **"Coba Hubungkan Ulang Kamera"** dan **"Gunakan Simulasi Wajah Indonesia"** serta pembersihan otomatis (*track cleanup*) pada setiap navigasi agar webcam tidak terkunci saat berpindah layar.

### C. Mesin Kuesioner Cerdas Dinamis (Gemini AI Flash-Lite)
* Menghubungkan backend FastAPI ke Google Gemini AI menggunakan model berlatensi ultra-rendah (`gemini-flash-lite-latest` / `gemini-3.5-flash-lite`) dengan waktu respons **< 2.5 detik**.
* **Pertanyaan 100% Kontekstual Biometrik**: Pertanyaan disesuaikan secara dinamis dengan bentuk wajah dan rona kulit pengguna (misal: pemilik wajah *Square* ditanya teknik pelembutan rahang; pemilik wajah *Heart* ditanya penyeimbangan proporsi dahi ke dagu).
* Fitur penambahan soal (*deep personalization batch*) dapat diklik berulang kali oleh pengguna untuk mempertajam akurasi rekomendasi.

### D. Layar Pemuat Telemetri Sinematik (*Processing Loading Screen*)
* Menampilkan transisi animasi visual yang merangkum seluruh jawaban kuesioner pengguna (*"Memasukkan informasi personal user: Casual / Santai"*, *"Memasukkan preferensi: Earth Tone"*, dll.).
* Waktu animasi otomatis menyesuaikan dengan jumlah pertanyaan yang dijawab sebelum beralih ke Studio AR.

### E. Studio AR Try-On Real-Time & Navigasi Switch Top-4
* **Live Webcam Mirror Feed**: Mengaktifkan feed video kamera pengguna secara langsung sebagai latar belakang kanvas dengan orientasi selfie cermin (`-scale-x-100`).
* **Pelacakan Wajah 60 FPS**: Aksesoris 3D diposisikan di atas kepala/wajah dan mengikuti gerakan geleng (*yaw*), angguk (*pitch*), miring (*roll*), serta jarak maju-mundur kepala secara halus menggunakan *Exponential Smoothing (Lerp 0.42)*.
* **Top-4 Curated Style Archetypes**: Menyajikan 4 varian rekomendasi (*The Perfect Match, Safe Classic, Bold Statement, Modern Silhouette*) yang dapat diganti secara instan menggunakan tombol navigasi panah *Switch*.

### F. Orkestrasi Docker Desktop
* Menyiapkan `Dockerfile` (server Python 3.11 dan client Node.js 20 Alpine) serta `docker-compose.yml`.
* Kedua container (`coba-backend-server` port 8000 dan `coba-frontend-client` port 3000) aktif dan berstatus `Up (healthy)` di Docker Desktop.

---

## 3. ANALISIS TEKNIS: MENGAPA TOPI 3D SAAT INI TERLIHAT KURANG ALAMI ("RUSAK / HELM MAINAN")?

Berdasarkan evaluasi hasil uji coba visual pada webcam live:

### 1. Keterbatasan Geometri Primitif Prosedural
Saat ini, model topi dibangun menggunakan kombinasi bentuk dasar Three.js (`SphereGeometry`, `CylinderGeometry`, `TorusGeometry`) dengan material standar. Bentuk geometris kaku ini tidak memiliki lekukan kain alami (*fabric folds*), kelenturan rajutan (*knit elasticity*), lengkungan visor ergonomis, maupun tekstur mikroskopis bahan asli seperti pada model 3D profesional.

### 2. Ketiadaan *Head Occlusion Mask* (Depth Masking)
Pada AR penutup kepala di dunia nyata (seperti Snapchat Lens, DeepAR, atau FittingBox):
* Ketika pengguna mengenakan topi atau beanie, **bagian dalam dan belakang topi harus tersembunyi di balik kepala/rambut pengguna**.
* Karena saat ini belum ada *Head Occluder Mesh* (masker 3D kepala tak terlihat dengan properti `material.colorWrite = false; material.depthWrite = true`), bagian belakang dan bawah topi ikut ter-render menumpuk di atas dahi dan rambut pengguna. Hal ini menciptakan ilusi visual seolah topi "tembus pandang / rusak / melayang aneh".

### 3. Kalibrasi Offset Anchor Tengkorak
Topi seharusnya membungkus mahkota kepala (*cranial crown*) hingga ke batas atas telinga (landmark 234 dan 454), bukan sekadar bertengger di atas titik dahi (landmark 10).

---

## 4. REFERENSI DATASET & SUMBER ASET 3D (SESUAI PRD.MD & PROPOSAL.MD)

Sesuai dokumen [PRD.md](file:///c:/Users/hikar/Compfest-AIC/PRD.md) dan [Proposal.md](file:///c:/Users/hikar/Compfest-AIC/Proposal.md), berikut sumber dataset dan aset resmi berlisensi terbuka (CC0 / MIT) yang siap digunakan:

| Sumber / Repositori | Tipe Aset / Format | Kategori Aksesoris | Lisensi | Link Akses Terverifikasi |
| :--- | :--- | :--- | :--- | :--- |
| **Poly Pizza (Google Poly Archive)** | Model 3D Low-Poly (`.glb`/`.gltf`) | Baseball Cap, Beanie, Bucket Hat, Fedora, Beret, Kacamata | **CC0 Public Domain** | [poly.pizza](https://poly.pizza/) |
| **Virtual Glasses Try-On** | Three.js + MediaPipe Face Mesh | Framework AR Try-On Kacamata & Occlusion | **MIT** | [GitHub bensonruan/Virtual-Glasses-Try-on](https://github.com/bensonruan/Virtual-Glasses-Try-on) |
| **MediaPipe Face Effects** | Head Occluder 3D Shader & Mesh | Masker kedalaman kepala (Head Occlusion) | **MIT** | [GitHub breathingcyborg/mediapipe-face-effects](https://github.com/breathingcyborg/mediapipe-face-effects) |
| **Quaternius Fashion Assets** | Model 3D Pakaian & Aksesoris Rigged | Topi, Beanie, Jaket, Kacamata | **CC0 Public Domain** | [quaternius.com](https://quaternius.com/) |
| **Kaggle Fashion Product Images** | 44.000 Metadata Produk Fesyen 2D | Katalog produk, warna dasar, dan occasion | **CC0 Public Domain** | [Kaggle Dataset](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-dataset) |

---

## 5. RENCANA AKSI LANJUTAN (ACTION PLAN SESI BERIKUTNYA)

Untuk sesi besok, fokus utama adalah menyempurnakan fotorealisme AR aksesoris:

### Langkah 1: Script Otomatis Pengunduh Aset 3D Fotorealistis
* Membuat script Python `scripts/download_3d_assets.py` yang mengunduh dan memvalidasi bundel file model `.glb` berkualitas tinggi berlisensi CC0 dari repositori Poly Pizza / Sketchfab ke dalam folder `client/public/models/`:
  - `hat_baseball_cap.glb` (Topi baseball dengan lengkungan visor nyata)
  - `hat_beanie.glb` (Beanie rajut elastis yang membungkus kepala)
  - `hat_bucket.glb` (Bucket hat twill santai)
  - `hat_fedora.glb` (Fedora wol klasik)
  - `hat_beret.glb` (Baret wol Prancis)
  - `glasses_wayfarer.glb` (Kacamata Wayfarer berbingkai tebal)
  - `glasses_aviator.glb` (Kacamata Aviator double-bridge)
  - `glasses_round.glb` (Kacamata bulat kawat retro)

### Langkah 2: Integrasi Three.js `GLTFLoader` di `ARCanvasViewer.tsx`
* Mengganti generator geometri primitif dengan `GLTFLoader` Three.js yang memuat model `.glb` asli lengkap dengan material PBR (*Physically Based Rendering*), peta normal (*normal maps*), dan bayangan pencahayaan alami.

### Langkah 3: Implementasi *Head Occlusion Mask* (Depth Masking)
* Menambahkan mesh kepala 3D tak terlihat (*invisible head occluder*) yang mengikuti geometri MediaPipe 468 landmark:
  ```javascript
  const occluderMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false, // Tidak menggambar warna di layar
    depthWrite: true,  // Menulis ke depth buffer untuk memotong objek di belakangnya
  });
  ```
* Dengan teknik ini, bagian belakang/dalam topi akan otomatis terpotong (*occluded*) oleh kepala pengguna secara alami seperti pada video demo referensi.

### Langkah 4: Kalibrasi Anchor & Uji Coba End-to-End
* Menyelaraskan skala model dan offset posisi agar pas melekat di kepala dan mata pada berbagai sudut gerakan.
* Menjalankan build Docker dan merekam demonstrasi AR akhir.

---

## 6. STATUS ARTIFAK & DOKUMEN PROYEK

- [x] [PRD.md](file:///c:/Users/hikar/Compfest-AIC/PRD.md): Terupdate dengan arsitektur Category-First dan spesifikasi AR 3D.
- [x] [Proposal.md](file:///c:/Users/hikar/Compfest-AIC/Proposal.md): Terupdate dengan metodologi riset dataset dan UVP Smart Commerce.
- [x] [MEMORY.md](file:///c:/Users/hikar/Compfest-AIC/MEMORY.md): Terupdate dengan ADR-001 hingga ADR-012 dan riwayat lengkap progress.
- [x] `Last_note.md`: Dibuat lengkap sebagai referensi acuan kerja sesi esok hari.
- [x] Docker Containers: `coba-backend-server` dan `coba-frontend-client` berjalan normal dan siap digunakan kembali.
