# Backend COBA

API rekomendasi outfit berbasis karakter personal, dengan AR try-on sebagai
validasi visual. FastAPI + Postgres + Redis, seluruhnya berjalan lewat Docker.

## Menjalankan

```bash
cp .env.example .env
docker compose up -d --build
```

Selesai. Container API menjalankan migrasi dan mengisi data awal sendiri, lalu
melayani di `http://localhost:8000`. Dokumentasi interaktif di `/docs`.

Untuk mengembangkan tanpa Docker:

```bash
python -m venv .compfest && source .compfest/bin/activate.fish
pip install -r requirements.txt
docker compose up -d postgres redis
alembic upgrade head && python -m scripts.seed
uvicorn app.main:app --reload
```

## Struktur

```
app/
├── main.py              factory aplikasi, lifespan
├── core/                config, logging, keamanan, error, middleware
├── db/                  engine dan session async (pisah tulis/baca)
├── models/              17 tabel SQLModel
├── schemas/             DTO, terpisah dari model tabel
├── cache/               klien Redis, kunci, cache-aside, sesi, rate limit
├── services/            logika domain
│   └── ai/              sambungan mesin rekomendasi
└── api/v1/              endpoint
alembic/                 migrasi
scripts/                 seeder dan utilitas
docs/                    SCHEMA.md, CACHING.md
```

## Endpoint

| Metode | Jalur | Keterangan |
|---|---|---|
| GET | `/healthz` | Liveness |
| GET | `/readyz` | Readiness (cek Postgres dan Redis) |
| POST | `/api/v1/auth/register` | Daftar akun penjual |
| POST | `/api/v1/auth/login` | Masuk, dapat pasangan token |
| POST | `/api/v1/auth/refresh` | Rotasi refresh token |
| POST | `/api/v1/auth/logout` | Cabut refresh token |
| GET | `/api/v1/auth/me` | Profil akun |
| GET | `/api/v1/catalog/products` | Daftar produk, keyset pagination |
| GET | `/api/v1/catalog/products/{id}` | Detail produk, ber-ETag |
| GET | `/api/v1/catalog/categories` | Pohon kategori |
| GET | `/api/v1/questionnaire` | Batch pertanyaan |
| POST | `/api/v1/session` | Mulai sesi try-on |
| GET | `/api/v1/session` | Status sesi |
| PATCH | `/api/v1/session/profile` | Kirim hasil scan tubuh |
| POST | `/api/v1/session/answers` | Kirim jawaban satu batch |
| POST | `/api/v1/session/recommendations` | Ambil rekomendasi |
| POST | `/api/v1/session/feedback` | Tandai cocok atau tidak cocok |
| DELETE | `/api/v1/session` | Akhiri sesi dan hapus datanya |

ID sesi dikirim lewat header `X-Session-Id`, bukan di URL. ID itu kredensial:
siapa pun yang memegangnya bisa membaca profil tubuh pemiliknya, dan URL terlalu
mudah bocor lewat access log serta header Referer.

## Alur pemakaian

```
POST /session                    -> session_id
PATCH /session/profile           -> hasil scan kamera (undertone, bentuk tubuh, wajah, ukuran)
POST /session/answers            -> jawaban batch 1
POST /session/recommendations    -> rekomendasi + saran ukuran + alasan
POST /session/feedback           -> cocok / tidak cocok
POST /session/recommendations    -> hasil menyesuaikan feedback
DELETE /session                  -> semua data pembeli hilang
```

## Memasang model AI

Mesin rekomendasi berada di balik satu antarmuka di
[app/services/ai/base.py](../app/services/ai/base.py). Lapisan API tidak pernah
tahu implementasi mana yang aktif.

Saat ini `HeuristicRecommender` yang berjalan: berbasis aturan, memakai palet
undertone di ruang LAB, aturan bentuk tubuh dan wajah, serta feedback dalam
sesi. Ia bukan penambal sementara, melainkan garis dasar pembanding untuk
membuktikan model baru memang lebih baik, sekaligus cadangan saat layanan
inferensi mati.

Untuk beralih ke model terlatih:

```bash
RECOMMENDER_BACKEND=remote
RECOMMENDER_REMOTE_URL=http://inference:9000
```

Layanan tujuan cukup menerima `POST /v1/recommend` berisi `RecommendationInput`
dan mengembalikan `RecommendationResult`. Batas waktu dan mekanisme jatuh ke
baseline sudah ditangani di sisi klien.

Model tidak dijalankan di dalam proses API dengan sengaja: proses API harus
ringan dan cepat diperbanyak, sementara inferensi butuh memori besar dan mungkin
GPU. Menyatukan keduanya berarti setiap replika API ikut menyeret bobot model.

## Keamanan

- Argon2id untuk password, dijalankan di threadpool agar tidak memblokir event loop
- Access token pendek + refresh token yang dirotasi; pemakaian ulang token lama dianggap kebocoran dan mencabut seluruh sesi akun
- Refresh token disimpan sebagai hash SHA-256, bukan nilai aslinya
- Klaim `typ` mencegah refresh token dipakai sebagai access token
- Daftar algoritma JWT dikunci, menutup serangan `alg: none`
- Rate limit terdistribusi di Redis, ketat khusus untuk login
- Header keamanan dan Content-Security-Policy pada semua respons
- Batas ukuran body permintaan
- Galat memakai format Problem Details dan tidak pernah membocorkan detail internal
- Container berjalan sebagai pengguna tanpa hak istimewa
- Konfigurasi menolak start bila `ENV=production` masih memakai secret default

## Dokumen lanjutan

- [SCHEMA.md](SCHEMA.md) — bagaimana baris dan kolom ditentukan
- [CACHING.md](CACHING.md) — strategi cache dan alasannya

## Perintah

```
make up        jalankan seluruh stack
make test      test unit
make test-int  seluruh test termasuk integrasi
make lint      periksa gaya kode
make audit     pindai kerentanan dependency
```
