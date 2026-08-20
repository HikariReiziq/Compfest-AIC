# Strategi Cache

Tujuan lapisan ini satu: **Postgres tidak boleh menjadi titik yang jebol lebih
dulu saat pengguna bertambah.** Dokumen ini menjelaskan apa yang di-cache, di
mana, berapa lama, dan bagaimana ia dibatalkan.

---

## 1. Tiga lapis, tugas berbeda

```
Klien  ──ETag/If-None-Match──►  L0  HTTP cache        (respons 304, nol byte body)
                                │
                                ▼
                              L1  Memori proses       (pohon kategori, kuesioner)
                                │  TTL 30 detik
                                ▼
                              L2  Redis               (katalog, size chart, rekomendasi)
                                │  TTL 5 menit - 1 jam
                                ▼
                              L3  Postgres            (sumber kebenaran)
```

**L0 (HTTP).** Detail produk membawa `ETag`. Klien yang sudah punya salinan
mengirim `If-None-Match` dan menerima `304` tanpa body. Berarti di mode AR yang
memuat ulang metadata produk berkali-kali di jaringan seluler.

**L1 (memori proses).** Hanya untuk data yang sangat kecil dan sangat sering
dibaca: pohon kategori dan konfigurasi kuesioner. Menghemat satu perjalanan
jaringan ke Redis. TTL sengaja pendek karena setiap replika punya salinan
sendiri dan tidak ada yang menyinkronkannya.

**L2 (Redis).** Lapisan utama. Semua yang mahal dihitung tapi jarang berubah.

---

## 2. Apa yang di-cache dan berapa lama

| Data | Kunci | TTL | Kenapa segitu |
|---|---|---|---|
| Detail produk | `coba:v{n}:product:{id}` | 1 jam | Katalog nyaris tidak pernah berubah |
| Daftar produk terfilter | `coba:v{n}:products:{digest}` | 1 jam | Kombinasi filter terbatas dan berulang |
| Pohon kategori | `coba:v{n}:categories:tree` | 1 jam + L1 30 detik | Sangat kecil, sangat panas |
| Turunan kategori dari slug | `coba:v{n}:catslug:{slug}` | 1 jam | Menghindari recursive CTE berulang |
| Size chart terpivot | `coba:v{n}:sizechart:{id}` | 1 jam | Satu chart melayani ribuan produk |
| Palet undertone | `coba:v{n}:palette:{undertone}` | 1 jam | Hanya 4 kunci untuk seluruh sistem |
| Aturan gaya | `coba:v{n}:rules:{subject}:{value}` | 1 jam | Dibaca tiap permintaan rekomendasi |
| Kandidat rekomendasi | `coba:v{n}:candidates:{digest}` | 1 jam | Menghindari pemindaian katalog berulang |
| Hasil rekomendasi | `coba:sess:{sid}:reco:...` | 5 menit | Terikat sesi, harus responsif terhadap feedback |
| Sesi try-on | `coba:sess:{sid}` | 30 menit sliding | Bukan cache, ini penyimpanan utamanya |

**Yang sengaja tidak di-cache:** pencarian teks bebas (`?q=`). Kardinalitasnya
nyaris tak terbatas sementara peluang kunci yang sama diminta ulang sangat
kecil, jadi cache-nya hanya akan mendesak keluar entri lain yang benar-benar
panas.

---

## 3. Invalidasi lewat nomor versi

Menghapus kunci satu per satu saat katalog berubah membutuhkan `SCAN` yang mahal
dan rawan ada yang terlewat. Yang dipakai: **semua kunci katalog membawa nomor
versi.**

```
coba:v3:product:1024
     ^^
```

Menaikkan versi (`INCR coba:catalog:version`) membuat seluruh kunci lama tidak
akan pernah terbaca lagi. Kunci lama tidak dihapus, tapi tidak masalah: Redis
membuangnya sendiri saat TTL habis, dan `maxmemory-policy allkeys-lru` menjadi
jaring pengaman terakhir.

Nomor versi itu sendiri di-cache di memori proses selama 5 detik supaya tidak
menambah satu `GET` Redis di setiap request. Artinya invalidasi menyebar ke
semua replika dalam hitungan detik, dan itu memang cukup untuk data katalog.

Panggil `bump_catalog_version()` setiap kali katalog, size chart, atau aturan
gaya berubah. Seeder sudah melakukannya.

Cache rekomendasi tidak memakai nomor versi karena ia dibatalkan sendiri: kunci
mengandung sidik jari profil. Begitu profil berubah, kunci lama otomatis
ditinggalkan tanpa perlu ada yang menghapusnya.

---

## 4. Tiga masalah cache yang ditangani sejak awal

Ketiganya baru terasa saat trafik naik, dan ketiganya lebih murah dicegah
sekarang daripada didiagnosis saat demo.

### Cache stampede

Satu kunci panas kedaluwarsa, ratusan request menemukan cache kosong pada saat
yang sama, dan semuanya menyerbu Postgres bersamaan.

Penanganan: **kunci single-flight.** Hanya satu request yang boleh menghitung
ulang; sisanya menunggu sebentar lalu membaca hasilnya. Kalau melewati batas
tunggu, mereka ikut menghitung daripada menahan pengguna. Kuncinya dilepas
dengan skrip Lua yang membandingkan token pemilik, supaya proses yang lambat
tidak melepas kunci milik proses lain.

### Cache penetration

Permintaan berulang untuk data yang memang tidak ada tidak pernah tertangkap
cache dan selalu jatuh ke database. Ini juga vektor serangan: cukup meminta
`/products/999999999` berulang kali.

Penanganan: **negative caching.** Ketiadaan disimpan sebagai penanda khusus
dengan TTL pendek (30 detik).

### Cache avalanche

Banyak kunci diisi bersamaan (misalnya setelah deploy) lalu kedaluwarsa
bersamaan, menghasilkan lonjakan berkala.

Penanganan: **jitter.** TTL diacak dalam rentang ±10 persen sehingga masa
kedaluwarsa tersebar.

---

## 5. Cache mati bukan berarti sistem mati

Setiap operasi Redis dibungkus penangan galat yang, saat gagal, langsung
memanggil pemuat data aslinya. Redis tumbang berarti sistem melambat dan beban
Postgres naik, bukan API berhenti melayani.

Satu pengecualian yang disengaja: **penyimpanan sesi**. Sesi tidak punya
cadangan di tempat lain, jadi Redis mati berarti sesi baru tidak bisa dibuat.
Itu keputusan sadar, konsekuensi dari janji bahwa data pembeli tidak pernah
menyentuh disk basis data.

Rate limit juga **fail open**: kalau Redis tidak bisa dihubungi, request
diteruskan. Menolak seluruh trafik hanya karena penghitung kuota tidak
terjangkau adalah kerugian yang lebih besar daripada risikonya.

---

## 6. Perkiraan dampak

Untuk satu sesi pembeli yang menyelesaikan tiga batch dan meminta rekomendasi
lima kali:

| Operasi | Tanpa cache | Dengan cache |
|---|---|---|
| Muat kuesioner | 3 query | 0 (L1 setelah request pertama di proses itu) |
| Simpan jawaban | 3 INSERT | 0 (Redis) |
| Rekomendasi x5 | ~25 query | ~5 query pada permintaan pertama saja |
| Muat size chart | 5 query | 1 query per chart untuk seluruh instans |
| Lihat detail produk x10 | 10 query | 0 sampai 1 |

Angka pastinya bergantung tingkat kena cache, tetapi pola bebannya berubah
mendasar: **beban Postgres berhenti tumbuh sebanding jumlah pengguna dan mulai
tumbuh sebanding jumlah data unik yang diminta.**

---

## 7. Yang perlu diukur setelah ini

Cache tanpa pengukuran adalah tebakan. Yang layak dipantau lebih dulu:

- Rasio kena cache per prefiks kunci
- `evicted_keys` Redis (kalau naik terus, `maxmemory` kurang)
- Waktu tunggu pool koneksi Postgres (kalau naik, cache bocor di suatu tempat)
- Persentil ke-95 waktu respons endpoint rekomendasi
