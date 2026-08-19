# Compfest

<aside>
💡

Chat Promptingan Hikari: [https://app.notion.com/share/9a02c04ba6f881f6ac6500037aa1fea9/3b32c04ba6f881cb8e8300a9e40dafc9](https://app.notion.com/share/9a02c04ba6f881f6ac6500037aa1fea9/3b32c04ba6f881cb8e8300a9e40dafc9) 

## **Latar belakang**

Fesyen adalah kategori belanja terbesar di Indonesia dan hidup di dua kanal sekaligus. Di kanal daring, jumlah pengguna e-commerce mencapai 73,06 juta orang pada 2025 seiring penetrasi internet 80,66 persen menurut [catatan Kemendag](https://bkperdag.kemendag.go.id/unduhan-file/a11ba920-123c-4a4f-856b-cdbb1f0f64c4), dan pakaian menjadi produk yang paling sering dibeli, dengan [9 dari 10 orang pernah membeli produk fesyen secara daring](https://jakpat.net/info/9-dari-10-orang-membeli-produk-fashion-secara-online/) menurut survei Jakpat. Di kanal luring, [Kemenperin mencatat sekitar 590 ribu unit usaha industri kecil dan menengah pakaian jadi yang menyerap 1,2 juta tenaga kerja](https://ikm.kemenperin.go.id/kemenperin-bangun-ekosistem-industri-fesyen-nasional-berbasis-potensi-daerah), dan toko fisik tetap ramai karena [77 persen konsumen menyebut kesempatan memegang serta mencoba produk secara langsung sebagai alasan utama mereka datang ke toko](https://www.beritasatu.com/ekonomi/2811741/studi-ini-ungkap-alasan-konsumen-belanja-offline-dan-online). Di dua kanal itu pembeli menghadapi pertanyaan yang persis sama, yaitu ukuran mana yang pas dan model mana yang benar-benar cocok dengan dirinya.

Sampai sekarang jawabannya masih ditebak sendiri oleh pembeli. Di kanal daring, tebakan yang meleset berujung pada pengembalian barang. Kemendag mencatat [5.771 pengaduan konsumen sepanjang Januari sampai September 2025 dengan sekitar 1.200 di antaranya berasal dari perdagangan daring](https://www.cnbcindonesia.com/news/20250911125134-4-666094/kemendag-catat-5771-pengaduan-konsumen-di-januari-september-2025), dan sepanjang 2025 totalnya [mencapai 7.887 laporan dengan nilai transaksi Rp18,19 miliar](https://diskoperindag.lamongankab.go.id/posting/40789). Riset di Indonesia juga menemukan [ukuran yang diterima pembeli kerap tidak sesuai standar meskipun nomor yang dipesan sudah benar, sementara proses pengembaliannya merepotkan dan menuntut ongkos kirim tambahan](https://jurnal.utu.ac.id/jbkan/article/download/4277/2410). Bebannya jatuh ke dua pihak, karena penjual ikut menanggung ongkos kirim balik, kerugian pada transaksi COD, stok yang sulit dijual ulang, sampai [penurunan rating toko akibat tingkat pengembalian yang dihitung sebagai kesalahan penjual](https://seller-id.tokopedia.com/university/essay?knowledge_id=8563325274572560). Di kanal luring kerugiannya berbentuk lain, yaitu waktu yang habis di ruang ganti dan pembeli yang akhirnya pulang tanpa membeli karena ragu, padahal [penelitian pada Gen Z menunjukkan frekuensi belanja luring justru masih lebih tinggi karena keinginan mencoba produk lebih dulu](https://journal.iteba.ac.id/index.php/jurnalsiteba/article/download/667/292). Yang belum tersedia adalah satu alat yang bisa dipakai pembeli maupun penjual di kedua kanal untuk mengenali bentuk tubuh dan karakter personal seseorang, lalu menerjemahkannya jadi rekomendasi pakaian beserta ukuran yang tepat.

### **Problem statement**

> Pembeli pakaian di Indonesia belum punya cara untuk memastikan ukuran dan gaya yang cocok dengan tubuh serta karakter dirinya sebelum membayar, baik saat belanja daring maupun saat berdiri di depan rak toko, sehingga pembeli menanggung risiko salah beli sementara penjual menanggung retur, ongkos kirim balik, kerugian COD, dan penjualan yang batal.
> 

## Solusi

Platform web yang menggabungkan rekomendasi AI dan AR try-on dalam satu alur:

1. **Scan tubuh lewat kamera.** Sistem membaca bentuk wajah, warna kulit, rambut, gender, dan proporsi tubuh. Ada penanda virtual di layar sebagai pemandu posisi berdiri, dan tinggi badan dihitung dari kamera. Berat badan diisi manual.
2. **Kuesioner bertahap.** Pertanyaan diberikan per batch: formal atau non formal, bahan menyerap keringat atau tidak, nyaman pakai aksesoris atau tidak, suka oversize atau tidak, dan seterusnya. Setiap batch selesai, rekomendasi langsung keluar. Makin banyak batch dijawab dan makin banyak feedback cocok atau tidak cocok yang diberikan, makin tajam hasilnya.
3. **Rekomendasi ukuran.** Ukuran tubuh hasil scan dicocokkan ke size chart tiap produk, jadi output bukan cuma model bajunya tapi juga nomor ukurannya.
4. **Mode AR.** Kamera terbuka, ada tombol next untuk ganti item dan tombol ukuran untuk membandingkan S, M, L langsung di badan.

Output menyesuaikan batch yang diselesaikan: bisa outfit lengkap, atasan saja, bawahan saja, atau aksesoris saja. Semua jawaban dan riwayat feedback hanya hidup selama sesi berjalan dan dihapus otomatis begitu sesi berakhir.

Untuk pembeli, ini menghilangkan tebak-tebakan ukuran. Untuk penjual, ini menggantikan pekerjaan manual merekomendasikan outfit ke pembeli satu per satu, sekaligus menekan return rate dan kerugian COD.

---

# Hasil riset dataset dan aset 3D

## A. Dataset katalog produk untuk mesin rekomendasi

| Dataset | Isi | Lisensi | Link |
| --- | --- | --- | --- |
| **Fashion Product Images** | 44.000 produk, `styles.csv` berisi masterCategory, subCategory, articleType, baseColour, season, dan kolom **usage** (Formal, Casual, Sports) | CC0 Public Domain | [versi besar](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-dataset), [versi kecil 60x80](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small) |
| **Fashionpedia** | 48.825 gambar, 27 kategori pakaian, 294 atribut halus, mask segmentasi | Anotasi CC BY 4.0 | [download](https://fashionpedia.github.io/home/Fashionpedia_download.html), [lisensi](https://fashionpedia.github.io/home/data_license.html) |
| **Polyvore Outfits** | 21.889 outfit untuk belajar kompatibilitas antar item | Riset | [github](https://github.com/xthan/polyvore-dataset) |
| **Marqo deepfashion-multimodal** | Data gambar plus teks siap pakai untuk model retrieval | Terbuka di HF | [huggingface](https://huggingface.co/datasets/Marqo/deepfashion-multimodal) |
| **Clothing Fit Dataset** | ModCloth dan RentTheRunway, label small/fit/large plus ukuran badan | Terbuka | [kaggle](https://www.kaggle.com/datasets/rmisra/clothing-fit-dataset-for-size-recommendation) |
| **BodyM** | 8.978 siluet depan dan samping, 2.505 subjek, 14 ukuran tubuh dalam cm | AWS Open Data | [registry](https://registry.opendata.aws/bodym/) |

Fashion Product Images ini yang paling pas jadi katalog utama. Kolom `usage` sudah membedakan formal dan casual, dan `masterCategory` sudah memisahkan Apparel dari Accessories, jadi kuesioner batch kalian bisa langsung dipetakan ke kolom yang ada tanpa bikin label baru dari nol.

**Untuk aksesoris**, kategori Accessories di dataset itu sudah mencakup jam tangan, ikat pinggang, tas, kacamata, dan perhiasan. Kalau butuh tambahan khusus wajah:

- [Glasses and Coverings](https://www.kaggle.com/datasets/mantasu/glasses-and-coverings): 4 kelas (polos, kacamata, kacamata hitam, penutup wajah), sudah aligned dan center-cropped
- [Face Attributes Grouped](https://www.kaggle.com/datasets/mantasu/face-attributes-grouped): 5 grup atribut wajah termasuk headwear, 1.200 gambar per sub-kategori

## B. Aset 3D untuk AR

### Tier 1: CC0, paling aman, bebas dipakai berkali-kali tanpa syarat apa pun

| Sumber | Isi | Format | Link |
| --- | --- | --- | --- |
| **Quaternius** | Modular Character Outfits, 12 outfit dari 62 part, sudah rigged humanoid dan bisa diretarget | FBX, glTF | [quaternius.com](https://quaternius.com/), [outfit pack](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html) |
| **Poly Pizza** | 10.600+ model low poly, banyak topi dan kacamata, punya API | OBJ, FBX, GLTF | [poly.pizza](https://poly.pizza/), [API docs](https://poly.pizza/docs/api/v1.1) |
| **Sketchfab koleksi CC0** | Ribuan model public domain | GLB, GLTF | [koleksi plaggy](https://sketchfab.com/plaggy/collections/cc0-public-domain-free-models-c1af6539a9ee49f4b3d51fabd6c25a85), [Clothing And Character Kit](https://sketchfab.com/3d-models/clothing-and-character-kit-10-cc0-7c733dceb2e04c4fb7e7dbd85316c1e7) |
| **awesome-cc0** | Daftar kurasi semua sumber aset CC0 | campuran | [github](https://github.com/madjin/awesome-cc0) |

Catatan jujur soal Quaternius: temanya fantasy, jadi bentuknya bukan baju e-commerce. Tapi nilainya ada di rig-nya. Outfit sudah ter-skin ke rig humanoid, jadi bisa dipakai untuk membuktikan pipeline skinned garment yang saya sebut sebelumnya, bukan sekadar menempel mesh kaku seperti TouchTry.

### Tier 2: CC BY, aman dipakai, wajib cantumkan kredit pembuat

Filter di Sketchfab pakai Downloadable + CC Attribution:

- [Tag clothing](https://sketchfab.com/tags/clothing)
- Contoh siap pakai: [T-Shirt GLTF](https://sketchfab.com/3d-models/t-shirt-c1a3e5eb9b5445f4b7d4be82f1127eba) (20.012 unduhan), [Sport Cloth Women](https://sketchfab.com/3d-models/sport-cloth-women-a2ab8081cafd401b8ad884d3b91ebf50) buatan Marvelous Designer
- Kacamata: [Glasses GLB](https://sketchfab.com/3d-models/glasses-3d-model-74c1d202ac0249e39823e379e2b065e9), [3D Glasses Optimized for Virtual Try-on](https://sketchfab.com/3d-models/3d-glasses-optimized-for-virtual-try-on-47c0b55f61244737a998efdd0f0aa9a0)

Cukup taruh satu halaman kredit di README dan di proposal, selesai.

### Tier 3: Riset akademik, boleh untuk lomba, catat statusnya di proposal

**GarmentCodeData** ini temuan paling penting untuk kalian. Isinya 115.000 garment 3D **made-to-measure** lengkap dengan sewing pattern, dipaskan ke berbagai bentuk tubuh yang diambil dari model statistik CAESAR, plus 5.000 body shape terpisah.

- [Project page ETH](https://igl.ethz.ch/projects/GarmentCodeData/)
- [Repo GarmentCode](https://github.com/maria-korosteleva/GarmentCode)
- [Dokumentasi dataset v2](https://www.research-collection.ethz.ch/bitstreams/fc0a9e2c-f0e0-4ab4-97ec-65f7b864d853/download)

Kenapa penting: tombol ganti ukuran di mode AR kalian butuh baju yang sama dalam beberapa ukuran berbeda, bukan satu mesh yang diperbesar-kecil. GarmentCode bisa men-generate baju yang sama untuk ukuran badan berbeda dari pola yang sama. Ini yang membuat tombol ukuran kalian jadi fitur beneran, bukan sekadar scaling.

Alternatif lain di tier ini:

- [CLOTH3D](https://chalearnlap.cvc.uab.cat/dataset/38/description/), 2 juta sampel baju tersimulasi, perlu registrasi
- [Amazon Berkeley Objects](https://registry.opendata.aws/amazon-berkeley-objects/), 7.953 model glTF 2.0 format .glb plus metadata produk asli dan 398.212 foto katalog, lisensi CC BY-NC 4.0. Isinya mayoritas perabot rumah tangga, sedikit fesyen, tapi struktur datanya (produk nyata + foto + 3D + metadata) bisa jadi contoh format katalog kalian

### Tier 4: Bikin sendiri dari foto katalog, ini yang saya rekomendasikan sebagai strategi utama

Daripada berburu file 3D satu per satu, ambil foto produk dari Fashion Product Images yang CC0, lalu ubah jadi GLB sendiri:

| Model | Lisensi | Catatan |
| --- | --- | --- |
| **TripoSR** | **MIT**, bebas komersial | 6.807 bintang, butuh sekitar 6 GB VRAM, bisa jalan tanpa GPU. [github](https://github.com/VAST-AI-Research/TripoSR), [weights](https://huggingface.co/stabilityai/TripoSR) |
| **TRELLIS** | MIT | Output mesh, Gaussian, radiance field. Kualitas lebih tinggi tapi lebih berat. [github](https://github.com/microsoft/TRELLIS) |
| Hunyuan3D 2.x | Tencent Community License | Hati-hati, ada batasan teritori dan wajib minta izin kalau MAU di atas 1 juta. [github](https://github.com/tencent-hunyuan/hunyuan3d-2.1) |

Ini punya tiga keuntungan sekaligus. Lisensinya bersih karena input CC0 dan model MIT. Kalian tidak terbatas pada baju apa pun yang kebetulan ada di Sketchfab. Dan rulebook COMPFEST mewajibkan preprocessing serta integrasi dataset dikerjakan selama periode lomba, jadi pipeline ini justru jadi bukti kerja yang bisa dinilai, bukan sekadar unduh aset orang.

### Yang jangan dipakai

- **DeepFashion dan DeepFashion2.** Lisensinya non-commercial research only dan [melarang redistribusi](https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html) dalam bentuk apa pun. Repo kalian public, jadi risikonya nyata.
- **Ready Player Me.** Layanannya [berhenti 31 Januari 2026](https://genies.com/blog/ready-player-me-discontinued-alternatives). Jangan bangun apa pun di atasnya.
- **Free3D, CGTrader free, Meshy gallery.** Lisensinya per-model, sering tidak jelas, dan ToS-nya berubah. Tidak layak jadi fondasi.
- **8th Wall dan Snap Lens Studio.** Sudah dibahas sebelumnya, tertutup dan tidak bisa docker compose.

## C. Referensi implementasi AR aksesoris

Aksesoris wajah jauh lebih presisi daripada baju karena landmark wajah stabil. Ini bisa jadi fitur yang paling meyakinkan saat demo:

- [bensonruan/Virtual-Glasses-Try-on](https://github.com/bensonruan/Virtual-Glasses-Try-on): Three.js plus Facemesh, ada demo live
- [breathingcyborg/mediapipe-face-effects](https://github.com/breathingcyborg/mediapipe-face-effects): MediaPipe plus Three.js, jalan realtime bahkan di CPU lawas
- [MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker): 468 titik 3D wajah, Apache 2.0

## D. Standar ukuran Indonesia

Ini yang bikin proyek kalian relevan secara lokal dan susah ditiru tim lain:

- [Data Antropometri Indonesia](https://antropometriindonesia.org/index.php/detail/artikel/4/10/data_antropometri): persentil 5, 50, 95 untuk puluhan dimensi tubuh orang Indonesia, gratis dan bisa langsung dipakai kalibrasi
- SNI yang relevan: SNI 08-4985-1999 tentang antropometri untuk pakaian jadi, SNI 2161:2010 untuk kaos pria dewasa, SNI 388:2020 untuk gaun wanita

Pakai ini untuk mengoreksi output BodyM/BMnet yang datanya dari populasi barat, dan untuk menyusun size chart acuan.

---

</aside>