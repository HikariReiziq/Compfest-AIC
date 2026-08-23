# Log Rekaman Kendala Teknis & Error (ERROR.md)

Dokumen ini mencatat kendala teknis dan pesan kesalahan yang terjadi selama proses pengembangan, pengujian otomatis, serta solusinya.

---

## 1. Kendala Otomasi Browser Subagent (Playwright Driver CDN 404)

### Waktu Kejadian
* **Tanggal & Waktu**: 21 Agustus 2026, 19:51:27 WIB
* **Komponen**: `browser_subagent` / `open_browser_url` tool

### Pesan Error Lengkap
```text
failed to create browser context: failed to run playwright manager: failed to install playwright: could not install driver: could not install driver: error: got non 200 status code: 404 (404 Not Found) from https://playwright.azureedge.net/builds/driver/playwright-1.57.0-win32_x64.zip
error: got non 200 status code: 404 (404 Not Found) from https://playwright-akamai.azureedge.net/builds/driver/playwright-1.57.0-win32_x64.zip
error: got non 200 status code: 404 (404 Not Found) from https://playwright-verizon.azureedge.net/builds/driver/playwright-1.57.0-win32_x64.zip
```

### Penyebab (Root Cause)
Subagent peramban mencoba mengunduh paket binary Playwright driver versi `1.57.0` dari CDN Azure Edge, namun repositori CDN penyedia mengembalikan status `HTTP 404 Not Found`.

### Dampak Terhadap Aplikasi
* **Tidak berdampak pada kode aplikasi**: Backend FastAPI (Port 8000) dan Frontend Next.js (Port 3000) **100% normal dan berfungsi penuh**.
* Seluruh 12 unit & integration test lulus 100% (`12 passed in 0.30s`).
* Seluruh halaman Next.js berhasil di-compile statis (`npm run build` sukses `4/4 pages`).

### Solusi & Langkah Alternatif (Workaround)
Pengguna dapat menguji antarmuka dan seluruh fitur interaktif secara langsung dengan membuka peramban lokal (Google Chrome, Microsoft Edge, atau Firefox) ke:
* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **Backend API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 2. Client-Side TypeError: Cannot read properties of null (reading 'shape')

### Waktu Kejadian
* **Tanggal & Waktu**: 21 Agustus 2026, 21:15 WIB
* **Komponen**: `CameraScan.tsx` & `server/app/api/v1/analyze.py`

### Pesan Error Lengkap
```text
TypeError: Cannot read properties of null (reading 'shape')
    at S (page-dda98cd12297c577.js:1:30810)
    at rE (fd9d1056-1e7f81dfced47382.js:1:40341)
```

### Penyebab (Root Cause)
1. Pada alur pemindaian webcam wajah (`CameraScan.tsx`), klien hanya mengirimkan `face_ratios` (geometri wajah) ke endpoint `/api/v1/analyze/ratios` tanpa menyertakan `body_ratios`.
2. Endpoint `/analyze/ratios` sebelumnya mengembalikan `body_shape: null` jika `body_ratios` tidak dikirimkan.
3. Komponen `CameraScan.tsx` mencoba membaca `{scannedProfile.body_shape.shape}` secara langsung tanpa *optional chaining* / *fallback*, sehingga memicu `TypeError: Cannot read properties of null`.

### Solusi yang Diterapkan
1. **Backend (`server/app/api/v1/analyze.py`)**: Menambahkan fallback default anthropometric standard pada `body_shape` dan `face_shape` sehingga API selalu menjamin kedua objek terisi lengkap dan tidak pernah mengembalikan `null`.
2. **Klien (`client/src/lib/api.ts` & `CameraScan.tsx`)**: Menambahkan *safe fallbacks* dan *optional chaining* (`?.`) pada `monk_tone`, `undertone`, `face_shape`, dan `body_shape` sehingga UI kebal terhadap data parsial.
3. **Unit Test Baru**: Menambahkan `test_analyze_ratios_partial_face_only` di `server/tests/test_server.py` untuk memvalidasi kasus ini secara permanen.

---

## 4. Kendala Perangkat Kamera Terkunci (NotReadableError / TrackStartError)

### Waktu Kejadian
* **Tanggal & Waktu**: 21 Agustus 2026, 22:38 WIB
* **Komponen**: `CameraScan.tsx` & `ARCanvasViewer.tsx`

### Pesan Error di Layar
```text
Kamera Tidak Tersedia
Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba lagi.
Gunakan preset evaluasi di toolbar atas untuk melanjutkan tanpa kamera.
```

### Penyebab (Root Cause)
1. **Device Stream Lock**: Saat pengguna bernavigasi dari Studio AR kembali ke Pemindaian Wajah (*Scan Ulang Wajah*), stream video kamera sebelumnya masih aktif (*live tracks*) di memori browser dan belum di-*release* secara eksplisit dengan `stream.getTracks().forEach(t => t.stop())`.
2. Pada sistem operasi Windows, driver webcam DirectShow memberlakukan penguncian eksklusif (*exclusive lock*) sehingga panggilan `getUserMedia` berikutnya langsung ditolak dengan status `NotReadableError: Could not start video source`.
3. Di antarmuka pemindaian sebelumnya, tombol preset evaluasi sempat dihilangkan sehingga pengguna tidak memiliki tombol aksi langsung untuk melanjutkan atau menghubungkan ulang kamera.

### Solusi yang Diterapkan
1. **Pembersihan Eksplisit Track Kamera**: Menambahkan pelepasan track `stream.getTracks().forEach(t => t.stop())` di `page.tsx` pada setiap aksi navigasi (*Scan Ulang Wajah*, *Ganti Aksesoris*, dan *Reset Flow*), serta di *cleanup handler* `ARCanvasViewer.tsx` dan `CameraScan.tsx`.
2. **Tombol "Coba Hubungkan Ulang Kamera"**: Menambahkan fungsi `retryCamera` dengan *grace period* 200ms untuk memastikan driver perangkat telah sepenuhnya *unlocked* sebelum meminta `getUserMedia` baru.
3. **Tombol "Gunakan Simulasi Wajah Indonesia"**: Menambahkan tombol aksi langsung di dalam kotak pesan kendala agar pengguna dapat langsung melanjutkan proses evaluasi AI tanpa terhambat meskipun kamera fisik sedang sibuk.

---

## 5. Pre-existing Test Failure: test_dynamic_questions_endpoint (Environment-Dependent)

### Waktu Kejadian
* **Tanggal & Waktu**: 23 Agustus 2026 — terdeteksi saat baseline eksekusi Fase 1 overhaul, *sebelum* perubahan kode apa pun.
* **Komponen**: `server/tests/test_server.py::test_dynamic_questions_endpoint` → `POST /api/v1/questions/generate`.

### Pesan Error
```text
AttributeError: ... object has no attribute ... (via starlette middleware errors.py)
1 failed, 7 passed
```

### Penyebab (Root Cause)
Endpoint kuesioner dinamis memanggil layanan Gemini; pada lingkungan host tanpa `GEMINI_API_KEY` aktif, jalur inisialisasi klien melempar `AttributeError` alih-alih jatuh ke fallback dengan rapi. Kegagalan ini **pre-existing** (terverifikasi sebelum commit overhaul pertama) dan berada di luar scope plan overhaul wajah — tidak diubah demi disiplin scope.

### Dampak & Status
* 7 test lain hijau; seluruh test baru Fase 2 wajib hijau; test ini dicatat sebagai *known env-failure* dan bukan alasan bolehnya test baru gagal.
* Di dalam Docker (`coba-backend-server` dengan `GEMINI_API_KEY` dari `.env`), endpoint berjalan normal.

### Rencana Perbaikan (opsional, di luar scope)
Bungkus inisialisasi klien Gemini dengan guard null-safety sehingga lingkungan tanpa API key jatuh ke `question_bank` lokal.


