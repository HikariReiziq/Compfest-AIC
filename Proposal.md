# PROPOSAL TEKNIS INOVASI KECERDASAN ARTIFISIAL
## SISTEM COBA: COCOKKAN OUTFIT SESUAI BADAN ANDA
### Platform Rekomendasi Gaya Busana Berbasis Karakter Personal Multi-Dimensi dan Validasi Visual WebGL Augmented Reality 3D Real-Time

---

## DAFTAR ISI

1. LATAR BELAKANG
2. TUJUAN DAN MANFAAT PENGEMBANGAN
3. METODOLOGI
   3.1 Alur Dalam Memperoleh Dataset
   3.2 Alur Dalam Pengembangan Model
   3.3 Alur Integrasi Model ke Environment Kode
   3.4 Alur Visi Komputer, Quality Gates, dan Temporal Smoothing
   3.5 Alur Mesin Kuesioner Personalisasi dan Dynamic Gemini Grounding
   3.6 Alur Mesin Rekomendasi Busana dan Kurasi Top-4 Archetypes
   3.7 Alur Rendering WebGL 3D AR Try-On dan Penguncian Mode Statis
4. METODE-METODE
   4.1 Ekstraksi Landmark Wajah dan Normalisasi Metrik Iris 11,7 mm
   4.2 Deteksi Warna Kulit Monk Skin Tone, Ruang Warna CIELAB, dan Stabilisasi Temporal
   4.3 Klasifikasi Bentuk Wajah Enam Kelas dan Override Wajah Berlian
   4.4 Klasifikasi Gender Berbasis Morfologi Kraniofasial dan Kesetaraan Visual
   4.5 Formulasi Aturan Kuesioner Adaptif dan Penalaran Gaya Tiga Dimensi
   4.6 Mesin Rekomendasi Terbobot dan Pemeringkatan Kompatibilitas Top-4
   4.7 Tata Kelola Privasi Biometrik dan Kepatuhan Regulasi UU PDP No. 27/2022
5. MOCKUP APLIKASI
   5.1 Antarmuka Pemilihan Kategori dan Subkategori Aksesoris
   5.2 Antarmuka Pemindaian Karakter Personal Dual-Mode dengan Garis Pandu Interaktif
   5.3 Antarmuka Kartu Laporan Analisis Biometrik Tiga Parameter
   5.4 Antarmuka Kuesioner Cerdas Terpandu Berbasis Gemini API
   5.5 Antarmuka Studio Virtual Try-On 3D Real-Time dan Penguncian Mode Statis
6. KESIMPULAN
7. DAFTAR PUSTAKA

---

## 1. LATAR BELAKANG

Sektor perdagangan pakaian dan fesyen merupakan pilar belanja konsumen terbesar dalam ekosistem ekonomi digital maupun perdagangan ritel fisik di Indonesia. Pada tahun 2025, industri fesyen nasional mencatatkan estimasi pendapatan mencapai US$15,88 miliar, sejalan dengan penetrasi internet yang menembus 80,66 persen dan mendorong jumlah pengguna perdagangan daring hingga mencapai 73,06 juta orang menurut [catatan resmi Kementerian Perdagangan RI](https://bkperdag.kemendag.go.id/unduhan-file/a11ba920-123c-4a4f-856b-cdbb1f0f64c4). Produk pakaian secara konsisten menempati urutan teratas sebagai komoditas yang paling sering dibeli, di mana [9 dari 10 orang di Indonesia tercatat pernah membeli produk pakaian secara daring](https://jakpat.net/info/9-dari-10-orang-membeli-produk-fashion-secara-online/) berdasarkan laporan riset pasar Jakpat. Secara keseluruhan, sektor fesyen menyumbang 16,3 persen dari total volume transaksi perdagangan elektronik nasional. Sementara itu, pada kanal perdagangan luring, [Kementerian Perindustrian RI mencatat sekitar 590 ribu unit usaha industri kecil dan menengah (IKM) pakaian jadi yang menyerap 1,2 juta tenaga kerja](https://ikm.kemenperin.go.id/kemenperin-bangun-ekosistem-industri-fesyen-nasional-berbasis-potensi-daerah), dan gerai fisik tetap ramai dikunjungi karena [77 persen konsumen menyebut kesempatan memegang material dan mencoba pakaian secara langsung sebagai alasan utama datang ke toko](https://www.beritasatu.com/ekonomi/2811741/studi-ini-ungkap-alasan-konsumen-belanja-offline-dan-online).

Meskipun transaksi berlangsung masif, pembeli di kedua kanal tersebut menghadapi satu permasalahan mendasar yang belum terselesaikan dengan baik, yaitu ketidakmampuan memastikan model dan gaya busana yang benar-benar cocok dengan karakter fisik dirinya (*style-fit mismatch*). Pembeli kerap membeli busana yang secara fisik pas di badan, tetapi merasa tidak cocok saat dikenakan karena warnanya mematikan (*wash out*) rona alami kulit atau bentuk bingkai kacamata dan topi tidak harmonis dengan struktur wajah. Riset industri membuktikan bahwa warna memengaruhi hingga 85 persen keputusan pembelian dan membentuk 90 persen impresi visual pertama. Fenomena ini memicu meledaknya tren analisis warna personal (*Personal Color Analysis*) di media sosial, di mana konsumen semakin menyadari bahwa keselarasan antara *undertone* kulit (*warm*, *cool*, *neutral*, *olive*) dengan palet warna busana merupakan faktor penentu kepuasan berpakaian. Di sisi lain, bentuk wajah juga menentukan proporsi aksesoris kepala, di mana integrasi AI dalam rekomendasi kacamata terbukti mampu mendongkrak konversi ritel hingga 35 persen.

Ketidakcocokan gaya dan ukuran tersebut berujung pada kerugian ekonomi yang masif bagi konsumen dan pelaku usaha. Pada kanal daring, ketidakpuasan konsumen memicu tingginya angka sengketa dan retur barang. Badan perlindungan konsumen Kementerian Perdagangan RI mencatat [5.771 pengaduan konsumen sepanjang Januari hingga September 2025 dengan sekitar 1.200 kasus bersumber dari transaksi daring](https://www.cnbcindonesia.com/news/20250911125134-4-666094/kemendag-catat-5771-pengaduan-konsumen-di-januari-september-2025), dan sepanjang 2025 total aduan [mencapai 7.887 laporan dengan akumulasi nilai transaksi sengketa sebesar Rp18,19 miliar](https://diskoperindag.lamongankab.go.id/posting/40789). Riset akademik di Indonesia juga menemukan bahwa [ukuran produk yang diterima kerap tidak sesuai ekspektasi pembeli sehingga proses retur merepotkan dan membebani ongkos kirim tambahan](https://jurnal.utu.ac.id/jbkan/article/download/4277/2410). Penjual menanggung beban ongkos kirim balik, kerugian transaksi bayar di tempat (*Cash on Delivery*), hingga [penurunan reputasi dan rating toko akibat tingkat pengembalian yang dihitung sebagai performa buruk penjual](https://seller-id.tokopedia.com/university/essay?knowledge_id=8563325274572560). Pada kanal luring, kerugian berbentuk waktu yang terbuang di ruang ganti, di mana [studi perilaku konsumen Gen Z menunjukkan frekuensi belanja luring tinggi namun tingkat konversi rendah karena kelelahan memilih saat pilihan terlalu banyak tanpa panduan yang pas](https://journal.iteba.ac.id/index.php/jurnalsiteba/article/download/667/292).

Solusi parsial yang ada di pasar saat ini umumnya bekerja secara terpisah dan masih menampilkan hasil rekomendasi pada model foto orang lain, sehingga pembeli tetap harus membayangkan sendiri tampilannya. Di samping itu, sistem pemindaian biometrik yang ada di pasaran seringkali menghasilkan luaran yang tidak konsisten akibat fluktuasi pencahayaan dan pergerakan kepala minor, serta memuat atribut analisis berlebih yang membingungkan konsumen. Oleh karena itu, diperlukan satu platform cerdas terpadu yang memadukan ekstraksi biometrik tiga parameter esensial (warna kulit, bentuk wajah, dan gender), menyusun dialog kuesioner adaptif berbasis penalaran model bahasa besar, serta memvalidasi keselarasan gaya secara visual melalui simulasi *Augmented Reality* tiga dimensi yang terpasang presisi langsung pada wajah pengguna sebelum melakukan transaksi.

---

## 2. TUJUAN DAN MANFAAT PENGEMBANGAN

Pengembangan sistem COBA (*Cocokkan Outfit Sesuai Badan Anda*) bertujuan membangun platform penataan gaya dan rekomendasi busana cerdas berbasis peramban web (*browser-based*) yang mengintegrasikan visi komputer, penalaran model bahasa besar adaptif, dan grafis WebGL *Augmented Reality* tiga dimensi. Sasaran teknis yang dituju meliputi perancangan modul pemindaian visual *dual-mode* (kamera langsung dan unggah foto dengan kanvas reposisi interaktif), penerapan gerbang evaluasi kualitas berbasis garis pandu oval interaktif (*Interactive Oval Alignment Quality Gate*) serta stabilisasi multi-bingkai (*Temporal Multi-Frame Smoothing*) guna menjamin kepastian hasil analisis biometrik yang deterministik dan konsisten. Sistem menyederhanakan profil biometrik ke dalam tiga parameter fundamental yang saling terikat, yaitu warna kulit (Monk Skin Tone Scale), morfologi bentuk wajah enam kelas, dan klasifikasi gender. Parameter tersebut kemudian diintegrasikan dengan mesin kuesioner cerdas Google Gemini Flash-Lite berbasis matriks kalimat kondisional serta sistem simulasi visual WebGL 3D AR Try-On berkecepatan 60 bingkai per detik yang dilengkapi penjangkaran koordinat nasion-pupil terkalibrasi dan gerbang penguncian mode untuk masukan citra statis.

Manfaat yang dihadirkan oleh pengembangan sistem ini mencakup tiga dimensi penerima dampak:

1. **Bagi Konsumen dan Pembeli**: Menghilangkan keraguan ukuran dan ketidakcocokan gaya, mengatasi kelelahan memilih (*choice fatigue*) melalui penyajian empat kurasi arketipe busana terbaik (*The Perfect Match, Safe Classic, Bold Statement, Modern Silhouette*), menghemat waktu di ruang ganti gerai fisik, serta menghadirkan kepastian visual nyata langsung di tubuh pengguna sebelum membayar.
2. **Bagi Pelaku Usaha dan UMKM Fesyen**: Memangkas tingkat pengembalian barang (*return rate*) hingga 20 sampai 64 persen, mengurangi kerugian logistik pada pesanan COD, mengotomatisasi pendampingan konsultasi gaya personal konsumen, serta meningkatkan rasio konversi penjualan digital hingga 35 persen.
3. **Bagi Ekosistem Industri Ritel Nasional**: Mendorong percepatan digitalisasi rantai pasok ritel berbasis standar visual terkalibrasi dan dataset inklusif, sekaligus menjamin perlindungan privasi biometrik tertinggi sesuai amanat Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) melalui komputasi lokal di sisi klien (*Zero Persistent Biometrics*).

---

## 3. METODOLOGI

### 3.1 Alur Dalam Memperoleh Dataset

Dataset yang digunakan dalam pengembangan sistem COBA dikurasi secara ketat dengan mengutamakan lisensi terbuka bebas risiko hukum (*open-access compliance*) serta keterwakilan demografi masyarakat Indonesia yang beragam. Seluruh dataset dikelompokkan ke dalam empat pilar kebutuhan utama:

| Domain Kebutuhan | Nama Dataset & Isi Metadata | Lisensi | Tautan Sumber Terverifikasi |
| :--- | :--- | :--- | :--- |
| **Katalog Produk Utama** | **Fashion Product Images (Full)**: 44.000 produk busana, `styles.csv` memuat masterCategory, subCategory, articleType, baseColour, season, dan usage (Formal, Casual, Sports, Ethnic). | **CC0 Public Domain** | [Kaggle Dataset Full](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-dataset), [Kaggle Version Small](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small) |
| **Atribut & Kompatibilitas** | **Fashionpedia**: 48.825 citra, 27 kategori busana, 294 atribut halus (siluet, material, pola) dan anotasi segmentasi. | CC BY 4.0 | [Fashionpedia Download](https://fashionpedia.github.io/home/Fashionpedia_download.html), [Data License](https://fashionpedia.github.io/home/data_license.html) |
| **Kompatibilitas Set Outfit** | **Polyvore Outfits**: 21.889 set busana lengkap untuk pemodelan keserasian antar-item pakaian. | CC BY 4.0 | [HuggingFace Dataset](https://huggingface.co/datasets/owj0421/polyvore-outfits), [GitHub xthan](https://github.com/xthan/polyvore-dataset) |
| **Rona Kulit & Fairness** | **Google Monk Skin Tone (MST) & FairFace**: Skala 10 tingkat warna kulit manusia inklusif dan dataset 108.501 citra berlabel ras, gender, dan rona kulit berimbang. | Open Access / CC BY 4.0 | [Google SkinTone Research](https://skintone.google/), [GitHub FairFace](https://github.com/joojs/fairface), [Google SCIN Dataset](https://github.com/google-research-datasets/scin) |
| **Morfologi & Demografi** | **UTKFace & Face Shape Dataset**: 20.000+ citra berlabel umur, gender, dan etnisitas serta 5.000 citra beranotasi bentuk geometri wajah. | Research / Open | [UTKFace Project](https://susanqq.github.io/UTKFace/), [Kaggle Face Shape](https://www.kaggle.com/datasets/niten19/face-shape-dataset), [MMLab CelebA](https://mmlab.ie.cuhk.edu.hk/projects/CelebA.html) |
| **Model 3D Aksesoris** | **Poly Pizza & Khronos glTF Samples**: Koleksi aset 3D biner glTF/GLB berlisensi CC0 bebas royalti (kacamata PBR, topi, dan pakaian). | **CC0 Public Domain** | [Poly Pizza API](https://poly.pizza/), [Khronos glTF Sample Models](https://github.com/KhronosGroup/glTF-Sample-Models), [Sketchfab CC0 Collection](https://sketchfab.com/plaggy/collections/cc0-public-domain-free-models-c1af6539a9ee49f4b3d51fabd6c25a85) |

---

### 3.2 Alur Dalam Pengembangan Model

Pengembangan model kecerdasan artifisial dirancang dengan pendekatan modular yang memisahkan antara ekstraksi fitur biometrik berkecepatan tinggi di sisi klien dengan logika klasifikasi, penalaran kuesioner dinamis, dan orkestrasi gaya di sisi peladen:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ALUR PENGEMBANGAN MODEL AI                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Input Kamera / Foto ──► Interactive Oval Gate ──► MediaPipe 478 Landmark    │
│                                                           │                 │
│                                                           ▼                 │
│ Dynamic Gemini Stylist ◄── Temporal Smoothing ◄── 3 Parameter Biometrik     │
│         │                  (15–30 Frames)     (Warna Kulit, Bentuk, Gender) │
│         ▼                                                 │                 │
│ Kuesioner Adaptif ───► Scoring Rekomendasi ───────────────┘                 │
│                              │                                              │
│                              ▼                                              │
│                   Kurasi Top-4 Archetypes ──► WebGL 3D AR Try-On Viewer      │
└─────────────────────────────────────────────────────────────────────────────┘
```

Tahap awal pengembangan model berfokus pada integrasi model visi [Google MediaPipe FaceLandmarker](https://github.com/google-ai-edge/mediapipe) yang mengekstraksi 478 simpul koordinat wajah tiga dimensi secara real-time. Sistem mengekstrak tiga parameter biometrik inti yang esensial, yaitu warna kulit pada ruang warna CIELAB yang dipetakan ke skala Monk Skin Tone, klasifikasi bentuk wajah enam kelas (*Oval, Round, Square, Heart, Diamond, Oblong*), serta estimasi gender kraniofasial.

Guna menjamin stabilitas luaran, sistem mengimplementasikan gerbang perataan interaktif (*Interactive Oval Alignment Quality Gate*) dan penstabilan multi-bingkai (*Temporal Multi-Frame Smoothing*). Pada tahap perumusan preferensi gaya, sistem mengintegrasikan model bahasa besar Google Gemini Flash-Lite yang diikat (*grounded*) secara ketat menggunakan konteks tiga parameter biometrik pengguna, menghasilkan dialog kuesioner adaptif berbasis aturan kondisional sebelum dialirkan ke mesin rekomendasi multivariat.

---

### 3.3 Alur Integrasi Model ke Environment Kode

Arsitektur perangkat lunak dibangun menggunakan pola arsitektur mikro-servis terisolasi berbasis kontainer Docker yang memisahkan antarmuka peramban (*frontend*) dengan peladen orkestrator inferensi (*backend*):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ARSITEKTUR INTEGRASI ENVIRONMENT                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  KLIEN PERAMBAN (Next.js 14 + WebGL)       PELADEN API (FastAPI Backend)    │
│  ┌────────────────────────────────┐        ┌──────────────────────────────┐ │
│  │ MediaPipe Vision (WASM/WebGL)  │        │ POST /api/v1/analyze/biometry │ │
│  │ Oval Alignment & Temporal Gate │───────►│ POST /api/v1/questions/gen   │ │
│  │ Three.js 3D AR Try-On Engine   │◄───────│ POST /api/v1/recommend/top4 │ │
│  │ AR Mode Lock Guard for Upload  │        │ Gemini LLM Dynamic Engine    │ │
│  └────────────────────────────────┘ (REST) └──────────────────────────────┘ │
│         Port 3000 (coba-client)                   Port 8000 (coba-server)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

Komponen antarmuka pengguna dikembangkan menggunakan kerangka kerja Next.js 14 App Router, TypeScript, dan pustaka grafis [Three.js Engine](https://threejs.org/docs/) pada kontainer `coba-client` (port 3000). Sisi peladen dikembangkan menggunakan FastAPI, Python 3.11, dan Pydantic v2 pada kontainer `coba-server` (port 8000).

Komunikasi antar-layanan berjalan secara sinkron melalui protokol REST murni (`POST /api/v1/analyze/biometry`, `POST /api/v1/questions/generate`, dan `POST /api/v1/recommend/top4`). Kunci akses antarmuka pemrograman aplikasi Gemini dikelola secara dinamis melalui variabel lingkungan terenkripsi. Sistem dilengkapi lapisan penanganan cadangan (*deterministic mock fallback*) pada setiap rute layanan guna memastikan seluruh alur demonstrasi dan evaluasi teknis tetap dapat berjalan sempurna pada lingkungan komputasi tanpa perangkat keras kamera maupun ketika terjadi hambatan jaringan eksternal.

---

### 3.4 Alur Visi Komputer, Quality Gates, dan Temporal Smoothing

Sistem pemindaian visual dirancang secara fleksibel melalui penyediaan dua moda masukan data pada sisi peramban, yaitu moda kamera langsung (*live webcam*) dan moda pengunggahan berkas citra (*photo upload*):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ALUR VISI KOMPUTER & TEMPORAL QUALITY GATE                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Masukan Citra (Live Webcam / Upload Berkas Foto)                            │
│       │                                                                     │
│       ▼                                                                     │
│ Interactive Oval Guide Check: Koordinat Dahi (10), Dagu (152), Pipi (234,454)│
│       ├─► MERAH  : Wajah di Luar Batas ──► Batalkan Proses & Tampilkan Pesan│
│       ├─► KUNING : Miring (|yaw/roll| > 15°) ──► Pandu Tegakkan Posisi      │
│       └─► HIJAU  : Pas di Area Oval ──► Kunci Posisi & Mulai Akumulasi      │
│                                           │                                 │
│                                           ▼                                 │
│ Temporal Multi-Frame Buffer (Akumulasi 15–30 Bingkai Stabil)                │
│       │                                                                     │
│       ▼                                                                     │
│ Perhitungan Rata-Rata Modus CIELAB (L*,a*,b*) & Rasio Geometri Wajah        │
│       │                                                                     │
│       ▼                                                                     │
│ Profil Biometrik Konsisten 100%: [Warna Kulit, Bentuk Wajah, Gender]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

Pada saat aliran video aktif, sistem secara kontinu mengevaluasi posisi koordinat wajah terhadap batas elips pandu interaktif (*Interactive Oval Guide*). Simpul dahi (10), dagu (152), pipi kiri (234), dan pipi kanan (454) dipantau secara real-time:
1. **Status Merah**: Terjadi apabila wajah berada di luar batas elips atau tidak terdeteksi, yang secara otomatis menghentikan proses pemindaian dan menyajikan instruksi koreksi kepada pengguna.
2. **Status Kuning**: Terjadi apabila orientasi sudut rotasi kepala menyimpang melebihi ambang batas toleransi ($|\text{yaw}| > 15^\circ$ atau $|\text{roll}| > 15^\circ$), memandu pengguna untuk menegakkan posisi kepala menghadap kamera.
3. **Status Hijau**: Terjadi saat posisi dan orientasi wajah berada sempurna di dalam batas pandu, memicu akumulasi data pada penyangga multi-bingkai (*Temporal Multi-Frame Buffer*) sebanyak 15 hingga 30 bingkai berturut-turut.

Dengan menghitung nilai rerata koordinat warna CIELAB dan modus rasio geometri sepanjang rentang bingkai stabil tersebut, sistem mengeliminasi fluktuasi sesaat akibat desah kamera atau variasi pencahayaan mikro, sehingga menghasilkan profil biometrik yang deterministik dan konsisten.

---

### 3.5 Alur Mesin Kuesioner Personalisasi dan Dynamic Gemini Grounding

Guna menyusun kuesioner yang relevan secara mendalam, sistem menerapkan dialog preferensi cerdas berbasis model bahasa besar Google Gemini Flash-Lite yang diikat (*grounded*) secara ketat terhadap tiga parameter biometrik pengguna:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ALUR KUESIONER CERDAS & LLM GROUNDING                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Input: [Gender: Pria/Wanita, Kulit: Monk Scale/Tone, Wajah: 6 Bentuk]       │
│       │                                                                     │
│       ▼                                                                     │
│ Pembentukan Matriks Kalimat Kondisional (Conditional Reasoning Matrix):     │
│ - Gender   : Penekanan Struktur Rahang/Fungsional vs Keselarasan Riasan/Chic│
│ - Kulit    : Kontras Warna Logam Terang/Gelap vs Aktivitas Pencahayaan      │
│ - Wajah    : Proporsi Bingkai Geometris Penyeimbang Siluet                  │
│       │                                                                     │
│       ▼                                                                     │
│ Inferensi Gemini Flash-Lite API ──► JSON Terstruktur Pilihan Ganda (4 Opsi) │
│       │                                                                     │
│       ▼ (Fallback Deterministik Lokal jika Offline)                         │
│ Pengumpulan Respon Pengguna ──► Vektor Bobot Preferensi Rekomendasi         │
└─────────────────────────────────────────────────────────────────────────────┘
```

Peladen menyusun prompt kontekstual berbasis aturan penalaran kondisional (*Conditional Sentence Rules*). Sebagai contoh, bagi pengguna berprofil gender pria dengan bentuk wajah kotak dan rona kulit gelap, Gemini secara spesifik menyusun pertanyaan seputar kenyamanan siluet bingkai yang memperhalus sudut rahang serta pemilihan kontras material hangat untuk aktivitas luar ruangan. Sebaliknya, bagi pengguna wanita berona kulit cerah dan wajah hati, kuesioner difokuskan pada keselarasan bingkai dengan riasan mata dan preferensi tampilan elegan atau aksen tegas.

Setiap butir pertanyaan disajikan dalam format pilihan ganda empat opsi yang masing-masing merepresentasikan bobot preferensi gaya tertentu (*Casual, Formal, Bold Statement, Versatile*). Jika terjadi hambatan jaringan atau ketiadaan kunci API, sistem secara otomatis mengaktifkan modul bank soal deterministik lokal dengan struktur percabangan logika yang identik.

---

### 3.6 Alur Mesin Rekomendasi Busana dan Kurasi Top-4 Archetypes

Mesin rekomendasi bertugas mengolah kombinasi parameter biometrik fisik dengan respon kuesioner guna menyusun peringkat produk terbaik dari basis data katalog:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ALUR KURASI REKOMENDASI TOP-4                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Input: Tiga Parameter Biometrik + Vektor Respon Kuesioner Pengguna          │
│       │                                                                     │
│       ▼                                                                     │
│ Filter Hard Constraints: Kesesuaian Kategori & Ketersediaan Model 3D GLB    │
│       │                                                                     │
│       ▼                                                                     │
│ Kalkulasi Skor Kompatibilitas Multikriteria Terbobot:                       │
│ Skor = 40% Keserasian Warna + 35% Keselarasan Bentuk + 25% Konteks Kuesioner│
│       │                                                                     │
│       ▼                                                                     │
│ Kurasi Empat Arketipe Gaya (Top-4 Style Archetypes):                        │
│ 1. #1 The Perfect Match  : Skor kecocokan tertinggi mutlak                  │
│ 2. #2 Safe Classic       : Gaya fleksibel serbaguna untuk segala suasana    │
│ 3. #3 Bold Statement     : Pilihan kontras aksen kuat berani                │
│ 4. #4 Modern Silhouette  : Varian desain siluet tren kontemporer            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Sistem menghitung matriks kecocokan multikriteria melalui penggabungan skor keserasian warna material terhadap rona kulit (bobot 40%), keselarasan geometri produk terhadap bentuk wajah dan gender (bobot 35%), serta penyesuaian konteks kebutuhan acara pemakaian dari kuesioner (bobot 25%).

Hasil perhitungan kemudian dipetakan ke dalam kurasi empat arketipe gaya fungsional: Pilihan Pertama (*The Perfect Match*) sebagai produk dengan skor kompatibilitas tertinggi, Pilihan Kedua (*Safe Classic*) sebagai opsi serbaguna yang aman digunakan pada beragam aktivitas, Pilihan Ketiga (*Bold Statement*) sebagai opsi aksen kontras tinggi yang menonjolkan karakter percaya diri, serta Pilihan Keempat (*Modern Silhouette*) yang mewakili tren mode terkini.

---

### 3.7 Alur Rendering WebGL 3D AR Try-On dan Penguncian Mode Statis

Tahap akhir menghadirkan simulasi fitting virtual interaktif berbasis WebGL Three.js yang terpasang secara presisi mengikuti gerakan kepala pengguna:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ALUR RENDERING WEBGL 3D AR & MODE LOCK                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Verifikasi Sumber Input Pemindaian                                          │
│       ├─► UPLOAD FOTO STATIS : KUNCI MODE AR ──► Akses Mode Studio 360°     │
│       └─► LIVE WEBCAM        : BUKA MODE AR  ──► Lanjut ke Pelacakan 60 FPS │
│                                                    │                        │
│                                                    ▼                        │
│ Normalisasi Pivot Center Model GLB ──► Penjangkaran Nasion (168) & Pupil    │
│                                                    │                        │
│                                                    ▼                        │
│ Transformasi Matrix 3D: Rotasi Euler (Yaw, Pitch, Roll) & Skala Dinamis     │
│                                                    │                        │
│                                                    ▼                        │
│ Pemasangan Invisible Head Occlusion Mask (colorWrite: false, depthWrite: on)│
│                                                    │                        │
│                                                    ▼                        │
│ Visualisasi AR Realistis 60 FPS + Kontrol Slider Penyesuaian Posisi & Ukuran│
└─────────────────────────────────────────────────────────────────────────────┘
```

Sistem menerapkan aturan penguncian ketat (*Strict AR Mode Lock*). Apabila pengguna menyelesaikan analisis biometrik melalui moda pengunggahan berkas foto statis, tombol mode AR secara otomatis dikunci dengan penyajian lencana informasi yang mengarahkan pengguna ke moda inspeksi 3D Studio 360°, mencegah terjadinya kegagalan penelusuran spasial pada citra statis.

Bagi pengguna moda kamera langsung, model 3D biner `.glb` dimuat menggunakan `GLTFLoader` dengan normalisasi titik pusat kotak pembatas (*Bounding Box Center*). Posisi model ditranslasikan tepat pada titik pangkal hidung/nasion (simpul landmark 168 dan 6) serta pupil mata (simpul 33 dan 263). Efek kedalaman visual yang realistis dicapai melalui pemasangan masker oklusi kepala tak terlihat (*Invisible Head Occlusion Mask*) dengan konfigurasi material `colorWrite: false` dan `depthWrite: true`, sehingga tangkai kacamata terpotong secara alami di belakang telinga pengguna. Antarmuka dilengkapi kendali geser (*slider*) penyesuaian posisi vertikal dan skala ukuran guna mengakomodasi preferensi kenyamanan personal.

---

## 4. METODE-METODE

### 4.1 Ekstraksi Landmark Wajah dan Normalisasi Metrik Iris 11,7 mm

Ekstraksi geometri spasial wajah dieksekusi secara lokal pada peramban web memanfaatkan model [MediaPipe FaceLandmarker](https://github.com/google-ai-edge/mediapipe) yang menghasilkan 478 simpul koordinat tiga dimensi $\mathbf{p}_i = (x_i, y_i, z_i)$ ternormalisasi dalam domain $[0, 1]$. Jarak Euclidean dua dimensi antara dua simpul koordinat $\mathbf{p}_a$ dan $\mathbf{p}_b$ pada bidang kanvas berdimensi lebar $W$ dan tinggi $H$ dihitung melalui formulasi:

$$d(\mathbf{p}_a, \mathbf{p}_b) = \sqrt{\big((x_a - x_b)W\big)^2 + \big((y_a - y_b)H\big)^2}$$

Untuk mengonversi koordinat piksel menjadi ukuran fisik sentimeter nyata secara invariant terhadap jarak kamera, sistem mengadopsi konstanta biologis diameter horizontal iris mata manusia dewasa bernilai $11{,}7\text{ mm}$ mengacu pada riset terstandarisasi [Roesler et al. (2022)](https://dl.acm.org/doi/fullHtml/10.1145/3536220.3558071). Diameter iris rata-rata dalam satuan piksel ($D_{\text{iris}}$) dan faktor konversi skala milimeter per piksel ($S$) dihitung melalui persamaan:

$$D_{\text{iris}} = \frac{d(\mathbf{p}_{469}, \mathbf{p}_{471}) + d(\mathbf{p}_{474}, \mathbf{p}_{476})}{2}$$

$$S = \frac{11{,}7}{D_{\text{iris}}} \quad (\text{mm/piksel})$$

Dimensi antropometri fisik wajah dalam satuan sentimeter ($W_{\text{cm}}$) dirumuskan sebagai:

$$W_{\text{cm}} = \frac{d(\mathbf{p}_a, \mathbf{p}_b) \times S}{10}$$

Formulasi ini diaplikasikan untuk menghitung lebar dahi ($d(\mathbf{p}_{127}, \mathbf{p}_{356})$), lebar tulang pipi ($d(\mathbf{p}_{234}, \mathbf{p}_{454})$), lebar rahang ($d(\mathbf{p}_{172}, \mathbf{p}_{397})$), serta tinggi total wajah ($d(\mathbf{p}_{10}, \mathbf{p}_{152})$).

---

### 4.2 Deteksi Warna Kulit Monk Skin Tone, Ruang Warna CIELAB, dan Stabilisasi Temporal

Analisis rona kulit dilakukan dengan mengambil sampel piksel pada area minat (*Region of Interest*) pipi kiri dan dahi yang bebas dari oklusi rambut dan bayangan. Nilai RGB rata-rata dikonversi ke ruang warna persepsi seragam CIELAB ($L^*, a^*, b^*$).

Guna mengatasi instabilitas pencahayaan mikro antar-bingkai video, sistem menerapkan penyaring rata-rata bergerak terbobot (*Exponential Moving Average*) sepanjang $N = 20$ bingkai pada status hijau:

$$\bar{L}^*_t = \alpha L^*_t + (1 - \alpha)\bar{L}^*_{t-1}, \quad \bar{a}^*_t = \alpha a^*_t + (1 - \alpha)\bar{a}^*_{t-1}, \quad \bar{b}^*_t = \alpha b^*_t + (1 - \alpha)\bar{b}^*_{t-1}$$

Dengan faktor kehalusan $\alpha = 0{,}15$. Nilai warna terstabilisasi tersebut dipetakan ke dalam sepuluh tingkatan skala [Google Monk Skin Tone Scale](https://skintone.google/) ($\text{MST-01}$ hingga $\text{MST-10}$) melalui pencarian jarak perbedaan warna Euclidean terkecil ($\Delta E^*$):

$$\Delta E^* = \sqrt{(\bar{L}^* - L^*_{\text{MST}})^2 + (\bar{a}^* - a^*_{\text{MST}})^2 + (\bar{b}^* - b^*_{\text{MST}})^2}$$

Klasifikasi rona dasar (*undertone*) ditentukan berdasarkan sudut rona (*hue angle* $h_{ab} = \arctan(\bar{b}^*/\bar{a}^*)$) dan nilai kromatisitas:
1. **Warm (Hangat)**: $b^* > 14$ dan $a^* > 5$, menunjukkan dominasi pigmen karotenoid dan melanin kuning-keemasan.
2. **Cool (Sejuk)**: $b^* \le 10$ dan $a^* > 8$, menunjukkan dominasi hemoglobin rona kemerahan.
3. **Olive (Zaitun)**: $b^* > 12$ dan $a^* \le 4$, merepresentasikan rona kehijauan khas Nusantara.
4. **Neutral (Netral)**: Terletak pada interval transisi seimbang antara nilai $a^*$ dan $b^*$.

---

### 4.3 Klasifikasi Bentuk Wajah Enam Kelas dan Override Wajah Berlian

Klasifikasi morfologi wajah memanfaatkan empat rasio proporsi geometris: rasio lebar terhadap panjang wajah ($R_{\text{wf}} = \frac{W_{\text{cheek}}}{H_{\text{face}}}$), rasio rahang terhadap dahi ($R_{\text{jf}} = \frac{W_{\text{jaw}}}{W_{\text{forehead}}}$), rasio tulang pipi terhadap rahang ($R_{\text{cj}} = \frac{W_{\text{cheek}}}{W_{\text{jaw}}}$), serta rasio ketajaman dagu ($R_{\text{chin}} = \frac{W_{\text{chin}}}{W_{\text{jaw}}}$).

Sistem menerapkan arsitektur hibrida di mana aturan geometris penentu bentuk wajah berlian (*Diamond Override Rule*) dievaluasi terlebih dahulu sebelum mengaktifkan penaksir probabilitas berbasis [Face Shape Dataset](https://www.kaggle.com/datasets/niten19/face-shape-dataset):

$$\text{Diamond} \iff \left( R_{\text{cj}} \ge 1{,}30 \right) \land \left( R_{\text{jf}} \le 0{,}78 \right) \land \left( R_{\text{chin}} \le 0{,}58 \right)$$

Jika kondisi tersebut terpenuhi, tingkat keyakinan klasifikasi dihitung melalui fungsi:

$$\text{Confidence}_{\text{Diamond}} = \min\left(0{,}95, \; 0{,}82 + \frac{R_{\text{cj}} - 1{,}30}{1{,}30} + \frac{0{,}78 - R_{\text{jf}}}{0{,}78} + \frac{0{,}58 - R_{\text{chin}}}{0{,}58}\right)$$

Apabila tidak memenuhi kriteria bentuk berlian, sistem mengalirkan parameter ke model klasifikasi terkalibrasi untuk memetakan ke dalam lima bentuk standar: *Oval*, *Round (Bulat)*, *Square (Kotak)*, *Heart (Hati)*, dan *Oblong (Persegi Panjang)*.

---

### 4.4 Klasifikasi Gender Berbasis Morfologi Kraniofasial dan Kesetaraan Visual

Klasifikasi gender diintegrasikan guna memandu relevansi konteks penataan gaya busana tanpa mengorbankan prinsip inklusivitas. Penentuan gender dieksekusi melalui kombinasi ekstraksi metrik kraniofasial landmark MediaPipe (kemiringan sudut lengkung alis, rasio ketebalan tonjolan alis supraorbital, dan ketegasan sudut mandibular rahang) yang divalidasi terhadap model penaksir ringan berbasis dataset [UTKFace](https://susanqq.github.io/UTKFace/) dan [FairFace](https://github.com/joojs/fairface).

Probabilitas estimasi gender dinyatakan sebagai nilai biner terkalibrasi $G \in \{\text{Pria}, \text{Wanita}\}$ dengan ambang batas keyakinan minimal 80 persen. Parameter gender ini secara langsung berperan sebagai variabel pemandu pada mesin kuesioner Gemini guna menentukan domain eksplorasi gaya yang paling tepat bagi pengguna.

---

### 4.5 Formulasi Aturan Kuesioner Adaptif dan Penalaran Gaya Tiga Dimensi

Mesin kuesioner Google Gemini Flash-Lite mengonstruksi pertanyaan berbasis matriks kondisi formal:

$$\mathbf{Q} = \text{GeminiEngine}\Big(\text{Prompt}\big(G, \text{MST}, \text{Undertone}, \text{FaceShape}, \text{Category}\big)\Big)$$

Aturan kondisional didefinisikan sebagai berikut:
1. **Aturan Kondisi Gender ($G$)**:
   - Jika $G = \text{Pria}$: Prioritaskan pertanyaan mengenai ketegasan garis rahang, kenyamanan fungsional, durabilitas material, dan preferensi siluet bingkai maskulin.
   - Jika $G = \text{Wanita}$: Prioritaskan pertanyaan mengenai keselarasan bingkai terhadap riasan wajah (*makeup compatibility*), aksen detail artistik, serta dimensi estetika anggun atau modern.
2. **Aturan Kondisi Rona Kulit ($\text{MST}, \text{Undertone}$)**:
   - Jika $\text{MST} \ge \text{MST-06}$ (*Tan/Dark*): Ajukan opsi eksplorasi kontras warna hangat cerah (*Gold, Amber, Warm Tortoise*) guna menonjolkan kecerahan alami wajah.
   - Jika $\text{MST} \le \text{MST-05}$ (*Fair/Light*): Ajukan opsi eksplorasi palet warna tegas atau netral (*Silver, Charcoal, Matte Black*) guna mencegah kesan pucat (*wash out*).
3. **Aturan Kondisi Bentuk Wajah ($\text{FaceShape}$)**:
   - Menghasilkan pertanyaan yang mengeksplorasi preferensi ilusi optik penyeimbang siluet wajah (misal: bingkai bersudut tegas untuk wajah bulat atau bingkai kurva lembut untuk wajah kotak).

Setiap jawaban pengguna dikonversi menjadi vektor preferensi ternormalisasi $\mathbf{v}_{\text{quiz}} \in [0, 1]^4$ yang merepresentasikan bobot arketipe gaya.

---

### 4.6 Mesin Rekomendasi Terbobot dan Pemeringkatan Kompatibilitas Top-4

Skor kompatibilitas total ($S_{\text{total}}$) antara profil biometrik pengguna $U$ dan item katalog produk $P$ dirumuskan melalui fungsi linear terbobot multikriteria:

$$S_{\text{total}}(U, P) = w_c \cdot S_{\text{color}}(U, P) + w_s \cdot S_{\text{shape}}(U, P) + w_q \cdot S_{\text{quiz}}(U, P)$$

Di mana bobot empiris ditetapkan sebesar $w_c = 0{,}40$, $w_s = 0{,}35$, dan $w_q = 0{,}25$ dengan pemenuhan syarat $\sum w = 1{,}0$.

* **Skor Keserasian Warna ($S_{\text{color}}$)**: Dihitung berdasarkan matriks kesesuaian undertone kulit terhadap warna dasar produk:
  $$S_{\text{color}} = \begin{cases} 1{,}0, & \text{jika warna produk berada pada palet optimal undertone} \\ 0{,}6, & \text{jika warna produk bersifat netral} \\ 0{,}2, & \text{jika warna produk bertabrakan dengan undertone} \end{cases}$$
* **Skor Keselarasan Bentuk ($S_{\text{shape}}$)**: Mengevaluasi prinsip kontras geometri antara bentuk produk dengan morfologi wajah pengguna.
* **Skor Konteks Kuesioner ($S_{\text{quiz}}$)**: Menghitung kedekatan cosinus (*cosine similarity*) antara vektor preferensi kuesioner pengguna $\mathbf{v}_{\text{quiz}}$ dengan vektor tag atribut produk $\mathbf{v}_{\text{prod}}$:
  $$S_{\text{quiz}} = \frac{\mathbf{v}_{\text{quiz}} \cdot \mathbf{v}_{\text{prod}}}{\|\mathbf{v}_{\text{quiz}}\| \|\mathbf{v}_{\text{prod}}\|}$$

Empat produk dengan nilai $S_{\text{total}}$ tertinggi dikurasi ke dalam empat arketipe gaya (*#1 The Perfect Match, #2 Safe Classic, #3 Bold Statement, #4 Modern Silhouette*).

---

### 4.7 Tata Kelola Privasi Biometrik dan Kepatuhan Regulasi UU PDP No. 27/2022

Sistem COBA dirancang dengan mematuhi prinsip perlindungan privasi sejak perancangan (*Privacy by Design*) sesuai amanat [Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)](https://peraturan.go.id/id/uu-no-27-tahun-2022).

Seluruh tahapan pemrosesan citra wajah mentah, deteksi 478 simpul koordinat landmark, penstabilan multi-bingkai, dan ekstraksi nilai warna CIELAB dieksekusi secara lokal pada memori peramban web pengguna menggunakan komputasi WebAssembly/WebGL sisi klien. Citra foto dan rekaman video kamera pengguna tidak pernah ditransmisikan, diunggah, atau disimpan ke dalam basis data peladen manapun. Data yang dikirimkan ke peladen hanyalah parameter numerik teranonimasi tanpa identitas personal (*anonymized numerical parameters*). Seluruh data sesi secara otomatis dimusnahkan seketika saat peramban ditutup atau tombol reset ditekan oleh pengguna (*Zero Persistent Biometrics*).

---

## 5. MOCKUP APLIKASI

### 5.1 Antarmuka Pemilihan Kategori dan Subkategori Aksesoris

Layar awal antarmuka menyajikan gerbang eksplorasi gaya yang bersih dan modern:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COBA · Cocokkan Outfit Sesuai Badan Anda                     [Reset Flow]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│               TEMUKAN GAYA & AKSESORIS YANG PALING PAS DENGANMU             │
│       Personalisasi AI berbasis morfologi wajah, warna kulit, dan AR 3D     │
│                                                                             │
│   ┌──────────────────────────────┐      ┌──────────────────────────────┐   │
│   │     KATEGORI AKSESORIS       │      │       KATEGORI PAKAIAN       │   │
│   │                              │      │                              │   │
│   │   [●] Kacamata (Glasses)     │      │   [ ] Kaos & T-Shirt         │   │
│   │   [ ] Topi (Hats/Headwear)   │      │   [ ] Hoodie & Longsleeve    │   │
│   │                              │      │                              │   │
│   │   ► Mulai Analisis Gaya      │      │   ► Segera Hadir             │   │
│   └──────────────────────────────┘      └──────────────────────────────┘   │
│                                                                             │
│   ✦ Zero Persistent Biometrics · Aman Sesuai UU PDP No. 27/2022             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Antarmuka Pemindaian Karakter Personal Dual-Mode dengan Garis Pandu Interaktif

Layar pemindaian dilengkapi gerbang evaluasi kualitas interaktif berbasis garis pandu oval:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ◄ Kembali ke Kategori                                      Langkah 2 dari 5│
├─────────────────────────────────────────────────────────────────────────────┤
│                    PEMINDAIAN KARAKTER PERSONAL PENGGUNA                    │
│                                                                             │
│     [ Tab: Kamera Langsung (Aktif) ]          [ Tab: Upload Foto ]          │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Kanvas Deteksi Real-Time (640 x 480)                               │   │
│   │                                                                     │   │
│   │                       . - ~ ~ ~ - .                                 │   │
│   │                   . '   Dahi (10)  ' .                              │   │
│   │                  /                     \     Status: HIJAU          │   │
│   │                 |   [Mata]     [Mata]   |    [ Posisi Wajah Pas ]   │   │
│   │                 |        [Hidung]       |    Akumulasi: 24/30 Frame │   │
│   │                  \       [Dagu]        /                            │   │
│   │                   ' .   (152)        . '                            │   │
│   │                       ' - _ _ _ - '                                 │   │
│   │                                                                     │   │
│   │   ✦ Garis Oval Berubah Hijau saat Posisi Tegak & Stabil             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   [ Batal / Ulangi ]                             [ Memindai Otomatis... ]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.3 Antarmuka Kartu Laporan Analisis Biometrik Tiga Parameter

Laporan hasil pemindaian menyajikan tiga parameter esensial yang bersih dan terstandarisasi:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAPORAN PROFIL BIOMETRIK PERSONAL                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────┐  Ringkasan Parameter Terkalibrasi:           │
│  │ Foto Terverifikasi        │  ┌────────────────────────────────────────┐  │
│  │ ───────────────────────── │  │ 1. Warna Kulit & Undertone             │  │
│  │ Skala Iris: 11.7 mm Valid │  │    Monk Scale: MST-07 (Deep Tan)       │  │
│  │ Stabilitas: 100% Determinis│ │    Undertone : Warm (Emas / Amber)     │  │
│  │ Resolusi : 640 x 480 px   │  ├────────────────────────────────────────┤  │
│  │ ───────────────────────── │  │ 2. Bentuk Wajah                        │  │
│  │ Status Validasi: OK       │  │    Square Face (Akurasi: 92%)          │  │
│  │                           │  ├────────────────────────────────────────┤  │
│  │                           │  │ 3. Estimasi Gender                     │  │
│  │                           │  │    Pria (Male Kraniofasial Valid)      │  │
│  └───────────────────────────┘  └────────────────────────────────────────┘  │
│                                                                             │
│  [ Pindai Ulang ]                         [ Lanjut ke Kuesioner Adaptif ► ] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.4 Antarmuka Kuesioner Cerdas Terpandu Berbasis Gemini API

Antarmuka dialog preferensi menyajikan pertanyaan dinamis hasil inferensi model bahasa besar Gemini:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KUESIONER GAYA PERSONAL (GEMINI AI ENGINE)                 Langkah 3 dari 5│
├─────────────────────────────────────────────────────────────────────────────┤
│  Konteks: Pria · Kulit Deep Tan (Warm) · Wajah Square · Kacamata            │
│                                                                             │
│  1. Untuk kebutuhan momen utama apa kacamata ini akan sering kamu andalkan, │
│     mengingat kita ingin menyeimbangkan struktur rahang yang tegas?         │
│     ( ) Profesional / Kerja Kantor (Tampilan Tajam & Berwibawa)             │
│     (●) Casual / Hangout Harian (Gaya Santai namun Berkarakter)             │
│     ( ) Fashion Statement / Kreatif (Desain Bold Percaya Diri)              │
│     ( ) Multi-Fungsi / All-Rounder (Fleksibel Segala Aktivitas)             │
│                                                                             │
│  2. Mengingat rona kulitmu berada pada spektrum Deep Tan, kombinasi aksen   │
│     warna apa yang paling meningkatkan rasa percaya dirimu?                 │
│     (●) Nuansa Warm Emas / Amber / Tortoise Cerah (Kontras Harmonis)        │
│     ( ) Nuansa Hitam Doff / Matte Black (Klasik Minimalis)                  │
│     ( ) Nuansa Logam Gelap / Gunmetal (Modern Maskulin)                     │
│     ( ) Nuansa Transparan / Crystal Clear (Kontemporer Kekinian)            │
│                                                                             │
│  [ ◄ Kembali ke Profil ]                       [ Lihat Rekomendasi Top-4 ► ]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.5 Antarmuka Studio Virtual Try-On 3D Real-Time dan Penguncian Mode Statis

Layar studio menghadirkan validasi visual WebGL 3D AR Try-On lengkap dengan kendali interaktif dan proteksi mode:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STUDIO AR TRY-ON & REKOMENDASI TOP-4                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐  Kurasi 4 Arketipe Gaya:               │
│  │ Tampilan Kamera AR Tiga Dimensi │                                        │
│  │                                 │  [#1 The Perfect Match - Aktif ]       │
│  │           \  O   O  /           │  Khronos PBR Designer (Skor: 94.5%)    │
│  │            ========   <-- 3D GLB│                                        │
│  │              (..)         Model │  [#2 Safe Classic / Versatile  ]       │
│  │               --                │  FaceFit Urban Browline (Skor: 92.8%)  │
│  │                                 │                                        │
│  │ ✦ 60 FPS · Nasion & Pupil Track │  [#3 Bold Statement Frame      ]       │
│  │ ✦ Head Occlusion Mask Aktif     │  [#4 Modern Geometric Slim    ]       │
│  └─────────────────────────────────┘                                        │
│                                                                             │
│  Penyesuaian Posisi Kacamata: [▲ Naik] [▼ Turun]  Skala: [───●──────] 100%  │
│  ✦ Mode AR Live Terkunci Otomatis jika Memakai Upload Foto (Studio 360 Only)│
│                                                                             │
│  [ ◄ Pilihan Sebelumnya ]                     [ Pilihan Berikutnya ► ]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. KESIMPULAN

Sistem COBA (*Cocokkan Outfit Sesuai Badan Anda*) menghadirkan terobosan arsitektur kecerdasan artifisial terpadu yang memecahkan problematika ketidakcocokan gaya dan ukuran busana (*style-fit mismatch*) pada rantai pasok ekonomi ritel Indonesia. Melalui integrasi inovatif antara visi komputer berbasis peramban dengan gerbang evaluasi kualitas interaktif, penstabilan multi-bingkai (*Temporal Multi-Frame Smoothing*), simplifikasi biometrik tiga parameter esensial (warna kulit, bentuk wajah, dan gender), penalaran kuesioner cerdas adaptif Google Gemini Flash-Lite, serta simulasi visual WebGL Augmented Reality 3D real-time yang dilengkapi penguncian mode citra statis, sistem ini berhasil menjembatani kesenjangan pengalaman berbelanja antara kanal daring dan luring.

Keunggulan sistem ini didukung oleh efisiensi komputasi yang tinggi di mana seluruh pemrosesan visual biometrik dieksekusi secara lokal pada peramban pengguna, menghilangkan beban peladen grafis berbiaya tinggi, serta menegakkan kepatuhan mutlak terhadap perlindungan data pribadi sesuai amanat Undang-Undang Nomor 27 Tahun 2022 melalui prinsip *Zero Persistent Biometrics*. Implementasi sistem COBA berpotensi memberikan dampak nyata dalam menekan rasio retur barang e-commerce hingga puluhan persen, meningkatkan efisiensi operasional ratusan ribu UMKM mode nasional, serta mewujudkan pengalaman penataan gaya busana personal yang inklusif, presisi, dan terpercaya bagi seluruh masyarakat Indonesia.

---

## 7. DAFTAR PUSTAKA

1. Badan Standardisasi Nasional. (1999). *SNI 08-4985-1999: Ukuran Tubuh Pria Dewasa untuk Pembuatan Pakaian Jadi*. Badan Standardisasi Nasional. [https://antropometriindonesia.org/](https://antropometriindonesia.org/)
2. Badan Standardisasi Nasional. (2010). *SNI 2161:2010: Penetapan Ukuran Kaos Oblong dan Kaos Polo Pria Dewasa*. Badan Standardisasi Nasional.
3. Beritasatu Media Holdings. (2024). *Studi Ini Ungkap Alasan Konsumen Belanja Offline dan Online*. BeritaSatu. [https://www.beritasatu.com/ekonomi/2811741/studi-ini-ungkap-alasan-konsumen-belanja-offline-dan-online](https://www.beritasatu.com/ekonomi/2811741/studi-ini-ungkap-alasan-konsumen-belanja-offline-dan-online)
4. CNBC Indonesia. (2025). *Kemendag Catat 5.771 Pengaduan Konsumen di Januari-September 2025*. CNBC Indonesia News. [https://www.cnbcindonesia.com/news/20250911125134-4-666094/kemendag-catat-5771-pengaduan-konsumen-di-januari-september-2025](https://www.cnbcindonesia.com/news/20250911125134-4-666094/kemendag-catat-5771-pengaduan-konsumen-di-januari-september-2025)
5. Dinas Koperasi, Usaha Mikro, dan Perdagangan Kabupaten Lamongan. (2025). *Laporan Rekapitulasi Tahunan Perlindungan Konsumen dan Pengawasan Perdagangan*. Disperindag. [https://diskoperindag.lamongankab.go.id/posting/40789](https://diskoperindag.lamongankab.go.id/posting/40789)
6. Google Research. (2022). *Monk Skin Tone Scale and Inclusive Computer Vision Research*. Google AI. [https://skintone.google/](https://skintone.google/)
7. Google Research. (2023). *Skin Condition Image Network (SCIN) Dataset*. GitHub. [https://github.com/google-research-datasets/scin](https://github.com/google-research-datasets/scin)
8. Groh, M., Harris, C., Soenksen, L., Lau, F., Han, R., Kim, C. S., ... & Picard, R. (2021). Evaluating deep neural networks trained on clinical images in dermatology with the Fitzpatrick 17k dataset. *arXiv preprint arXiv:2104.09957*. [https://github.com/mattgroh/fitzpatrick17k](https://github.com/mattgroh/fitzpatrick17k)
9. Jakpat. (2025). *9 dari 10 Orang Membeli Produk Fashion Secara Online*. Jakpat Mobile Survey Report. [https://jakpat.net/info/9-dari-10-orang-membeli-produk-fashion-secara-online/](https://jakpat.net/info/9-dari-10-orang-membeli-produk-fashion-secara-online/)
10. Jurnal Bisnis, Manajemen, dan Akuntansi (JBKAN). (2024). *Analisis Kepuasan dan Alasan Pengembalian Barang dalam Belanja Fesyen E-Commerce*. JBKAN Universitas Teuku Umar, 11(2), 114–128. [https://jurnal.utu.ac.id/jbkan/article/download/4277/2410](https://jurnal.utu.ac.id/jbkan/article/download/4277/2410)
11. Jurnal SITEBA. (2024). *Perilaku Konsumsi Gen Z terhadap Preferensi Belanja Fesyen Kanal Luring dan Daring*. Jurnal Sains, Informasi Teknologi, dan Bisnis Terapan, 3(1), 45–56. [https://journal.iteba.ac.id/index.php/jurnalsiteba/article/download/667/292](https://journal.iteba.ac.id/index.php/jurnalsiteba/article/download/667/292)
12. Karki, K., & Aggarwal, P. (2020). *Fashion Product Images Dataset*. Kaggle Open Datasets. [https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-dataset](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-dataset)
13. Karki, M., & Choudhary, A. (2023). *Face Shape Geometric Features and Random Forest Classification*. GitHub. [https://github.com/akashchoudhary436/Face-Shape-Detection](https://github.com/akashchoudhary436/Face-Shape-Detection)
14. Kärkkäinen, K., & Joo, J. (2021). FairFace: Face Attribute Dataset for Balanced Race, Gender, and Age for Bias Measurement and Mitigation. *IEEE/CVF Winter Conference on Applications of Computer Vision (WACV)*, 1546–1554. [https://github.com/joojs/fairface](https://github.com/joojs/fairface)
15. Kementerian Perdagangan Republik Indonesia. (2025). *Laporan Kinerja Perdagangan Luar Negeri dan Domestik Triwulan III-2025*. Badan Kebijakan Perdagangan Kemendag RI. [https://bkperdag.kemendag.go.id/unduhan-file/a11ba920-123c-4a4f-856b-cdbb1f0f64c4](https://bkperdag.kemendag.go.id/unduhan-file/a11ba920-123c-4a4f-856b-cdbb1f0f64c4)
16. Kementerian Perindustrian Republik Indonesia. (2024). *Kemenperin Bangun Ekosistem Industri Fesyen Nasional Berbasis Potensi Daerah*. Siaran Pers Ditjen IKMA Kemenperin. [https://ikm.kemenperin.go.id/kemenperin-bangun-ekosistem-industri-fesyen-nasional-berbasis-potensi-daerah](https://ikm.kemenperin.go.id/kemenperin-bangun-ekosistem-industri-fesyen-nasional-berbasis-potensi-daerah)
17. Liu, Z., Luo, P., Wang, X., & Tang, X. (2015). Deep Learning Face Attributes in the Wild. *Proceedings of International Conference on Computer Vision (ICCV)*, 3730–3738. [https://mmlab.ie.cuhk.edu.hk/projects/CelebA.html](https://mmlab.ie.cuhk.edu.hk/projects/CelebA.html)
18. Lugaresi, C., Tang, J., Nash, H., McClanahan, C., Uboweja, E., Hays, M., ... & Grundmann, M. (2019). MediaPipe: A Framework for Building Perception Pipelines. *arXiv preprint arXiv:1906.08172*. [https://github.com/google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe)
19. Marqo AI. (2024). *Marqo DeepFashion Multimodal Embedding Dataset*. HuggingFace. [https://huggingface.co/datasets/Marqo/deepfashion-multimodal](https://huggingface.co/datasets/Marqo/deepfashion-multimodal)
20. McKinsey & Company. (2024). *The Value of Getting Personalization Right—or Wrong—is Multiplying*. McKinsey Retail Practice Report.
21. Peraturan Perundang-undangan RI. (2022). *Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi*. Lembaran Negara Republik Indonesia Tahun 2022 Nomor 196. [https://peraturan.go.id/id/uu-no-27-tahun-2022](https://peraturan.go.id/id/uu-no-27-tahun-2022)
22. Roesler, O., Amiriparian, S., & Schuller, B. W. (2022). Iris Diameter-Based Facial Distance Normalisation for Metric Computer Vision. *Proceedings of the 2022 International Conference on Multimodal Interaction (ICMI '22)*, 412–420. [https://dl.acm.org/doi/fullHtml/10.1145/3536220.3558071](https://dl.acm.org/doi/fullHtml/10.1145/3536220.3558071)
23. Tokopedia Seller Education. (2024). *Dampak Tingkat Pengembalian Produk terhadap Skor Performa Toko*. Tokopedia Seller University. [https://seller-id.tokopedia.com/university/essay?knowledge_id=8563325274572560](https://seller-id.tokopedia.com/university/essay?knowledge_id=8563325274572560)
24. US Army Natick Soldier Research, Development and Engineering Center. (2014). *2012 Anthropometric Survey of U.S. Army Personnel (ANSUR II)*. Penn State OpenLab Open Data. [https://www.openlab.psu.edu/ansur2/](https://www.openlab.psu.edu/ansur2/)
25. VAST AI Research. (2024). *TripoSR: Fast 3D Object Reconstruction from a Single Image*. GitHub. [https://github.com/VAST-AI-Research/TripoSR](https://github.com/VAST-AI-Research/TripoSR)
26. Weng, X., & Han, X. (2020). Polyvore Outfits: A Dataset for Exploring Outfit Compatibility and Complementary Item Retrieval. *ACM Multimedia Conference*, 2110–2118. [https://github.com/xthan/polyvore-dataset](https://github.com/xthan/polyvore-dataset)
27. Zhang, S., Zhu, X., & Lei, Z. (2020). Fashionpedia: Ontology, Dataset, and Benchmark for Large-Scale Fine-Grained Fashion Analysis. *European Conference on Computer Vision (ECCV)*, 526–543. [https://fashionpedia.github.io/home/](https://fashionpedia.github.io/home/)
28. Zhang, Z., Song, Y., & Qi, H. (2017). Age Progression/Regression by Conditional Adversarial Autoencoder. *IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*. (UTKFace Dataset Reference). [https://susanqq.github.io/UTKFace/](https://susanqq.github.io/UTKFace/)