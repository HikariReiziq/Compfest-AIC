# Standardisasi Biometrik 3-Parameter, Strict Oval Alignment & Presisi AR — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Memperbaiki **inkonsistensi hasil scan** (masalah utama: 3× scan wajah sama → Monk tone/undertone/bentuk wajah/bentuk tubuh/warna harmonis berbeda-beda) dengan temporal smoothing deterministik, menstandarisasi output biometrik menjadi tepat 3 parameter (`skin_tone`, `face_shape`, `gender` — bentuk tubuh & warna paling harmonis DIHAPUS), membangun modul pipeline dataset `ai_engine/pipeline/` (cleaning → normalization → preprocessing → validasi/fine-tune, satu per tugas), menerapkan validasi oval ketat dengan **pembatalan otomatis** saat wajah keluar garis pemandu, menguatkan kuesioner Gemini dengan rules matrix `(gender, skin_tone, face_shape)`, dan memperbaiki presisi anchoring AR + penguncian mode AR untuk input foto.

## 🔍 Root Cause Inkonsistensi 3× Scan (ditemukan saat eksplorasi)

| Penyebab | Lokasi | Perbaikan |
|---|---|---|
| Skin tone dihitung dari **1 ROI crop tunggal** per scan → sensitif cahaya & momen frame | `CameraScan.handleStartScan` → `analyzeSkin(blob)` upload gambar | **FrameSampler**: rata-rata LAB 15–30 frame selama countdown, dihitung di klien (Task C2/C3) |
| Face shape dari frame sesaat, gate stabilitas hanya 6 frame hitung tanpa syarat alignment | `processLandmarks` bounding-box + tilt<22° | Median rasio antropometrik 15–30 frame **yang selalu ALIGNED** (Task C3) |
| Undertone & MST dari ROI tunggal → flip antar scan | server `skin_analyzer` pada crop tunggal | Bucket MST terdekat via ΔE terhadap LAB rata-rata temporal → **bucket stabil 5-kategori** (Task B1) |
| Bentuk tubuh & warna harmonis = variabel tambahan yang ikut bervariasi tanpa nilai | seluruh flow | **Dihapus total** — sisa 3 param deterministik (Task B3/C4) |
| Upload gambar ROI ke server tiap scan (varians kompresi) | `analyzeSkin` | Mode kamera: hanya angka LAB yang dikirim — tidak ada gambar keluar perangkat (D7) |

**Architecture:** Hybrid client-extract/server-classify (ADR-014 dipertahankan): klien mengekstraksi fitur turunan dari 478 landmark MediaPipe + LAB kulit rata-rata temporal, server mengklasifikasi via rule engine + RF legacy. Mode kamera live tidak lagi mengirim gambar ROI sama sekali (hanya angka LAB) — penguatan kepatuhan UU PDP No. 27/2022. Penghapusan menyeluruh `body_shape` (UI, kalkulasi, endpoint, schema) dari jalur aplikasi.

**Tech Stack:** Next.js 14 + TypeScript + Tailwind + Three.js + @mediapipe/tasks-vision (client); FastAPI + Pydantic v2 + numpy (server); pytest TDD, Conventional Commits.

---

## ⚠️ ATURAN MUTLAK (kompetisi — pelanggaran = diskualifikasi)

1. **Zero Institution Identity** — JANGAN menyebut nama universitas/fakultas/logo institusi di kode, komentar, dokumentasi, atau commit.
2. **Conventional Commits** — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` + trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.
3. **No Hardcoded Secrets** — kunci API hanya dari `.env`/environment. **TEMUAN EKSPLORASI:** `scratch/test_gemini_questions.py:4` berisi kunci Gemini hardcoded. File TIDAK pernah dikommit (`git ls-files scratch/` kosong) — Task 0 membersihkannya + kunci wajib dirotasi user.
4. **Session-Scoped Biometrics** — zero persistent biometric storage; payload server hanya angka.
5. **Disiplin scope** — jangan refactor di luar plan ini.

## 📌 Keputusan Desain (dari direktif user + eksplorasi kode 2026-08-23)

| # | Keputusan | Justifikasi |
|---|-----------|-------------|
| D1 | `skin_tone` 5 kategori: **Fair / Light / Medium / Tan / Dark** diturunkan dari Monk index: 1–2→Fair, 3–4→Light, 5→Medium, 6–7→Tan, 8–10→Dark | Dataset yang ada = Google Monk Skin Tone (MST-01..10) di `skin_analyzer.py:19-30`; bucket ITA-aligned, deskriptif untuk konteks Indonesia (MST-06 sawo matang → Tan) |
| D2 | `face_shape` 6 kelas tetap: Oval, Round, Square, Heart, Diamond, Oblong | Sudah berjalan (`FACE_SHAPE_LABELS_ID` di face_analyzer.py); dataset Face Shape 5K + rule override Diamond |
| D3 | `gender` diestimasi **rule engine landmark ratio** (bukan model berat — deadline 2 hari), confidence jujur 0.55–0.78, `method: "landmark_ratio"`; jawaban kuesioner self-report dapat menimpa (`source: "self_reported"`) | Antropometri dimorfisme seksual (rasio rahang/pipi, posisi alis, rasio bibir) dari landmark yang sudah tersedia; dataset UTKFace/FairFace hanya hook validasi opsional di pipeline script (Task B5) |
| D4 | **Undertone (Warm/Cool/Neutral/Olive) tetap dihitung INTERNAL** sebagai sinyal skoring warna recommender & Pilar 2, tetapi **DIHILANGKAN dari UI kartu biometrik utama** | User hanya meminta hapus UI "warna_paling_harmonis" + standarisasi output 3 param; menghapus undertone dari engine akan mematikan skoring warna yang sudah jalan |
| D5 | Nose/eye/brow + measurements tetap sebagai blok "Detail Analisis Lanjutan" (menopang Pilar 3 & anchoring AR) — BUKAN kartu biometrik utama | Multi-dim engine (ADR-014, Fase 2 kemarin) adalah nilai diferensiasi; user hanya menstandarisasi output UTAMA |
| D6 | Flow apparel (shirts) **tetap ada** namun face-driven + quiz; **seluruh jalur body scan dihapus** (`BodyScan.tsx`, `BodyReportCard.tsx`, `bodyGeometry.ts`, `body_analyzer.py`, `/analyze/body-landmarks`, step REPORT). `BodyOutfitViewer.tsx` **dipertahankan** (hanya butuh snapshot + item, tanpa body analysis) | Direktif eksplisit "HAPUS seluruh dependensi, UI, dan kalkulasi body_shape"; viewer outfit tidak bergantung body_shape |
| D7 | Mode kamera live: LAB kulit dihitung & dirata-rata **klien** dari patch dahi/pipi per frame → dikirim sebagai angka `{l, a, b}`; tidak ada lagi upload gambar ROI di mode kamera. `/analyze/skin` tetap hidup (kompatibilitas test lama + jalur upload foto) | Temporal smoothing menuntut sampling per-frame (tidak bisa spam upload gambar); memperkuat klaim "zero image upload" UU PDP |
| D8 | Threshold oval ketat: yaw/roll > 15° → KUNING; wajah di luar oval → MERAH + tombol scan LOCK; HIJAU = stabil 1.5 detik → countdown 3s (sampling temporal berjalan selama countdown) | Sesuai spesifikasi user verbatim |

## 🔧 Setup Verifikasi (per task, dari root repo)

```powershell
# Server tests (venv aktif di PATH):
& { Set-Location C:\Users\hikar\Compfest-AIC\server; python -m pytest tests/ -q }
# Client typecheck + build:
& { Set-Location C:\Users\hikar\Compfest-AIC\client; npx tsc --noEmit; npm run build }
```

**Baseline saat penulisan plan:** `50 passed, 2 failed` — `test_recommend_endpoint_jackets` (recommender memetakan unknown subcat → "glasses", `recommender.py:167`) dan `test_catalog_endpoints` (4 field wajib `CatalogItemSchema` hilang di item katalog baru dari commit 9992b7e). Keduanya **pre-existing**, bukan hasil kerja session ini, tapi WAJIB hijau karena direktif user "pytest pass tanpa error".

---

# FASE A — Stabilisasi Baseline (2 test merah)

### Task A1: Fix catalog items — field wajib CatalogItemSchema

**Files:**
- Modify: `ai_engine/data/catalog.json` (item shirts/jaket baru dari 9992b7e)
- Test: `server/tests/test_server.py::test_catalog_endpoints` (sudah ada, saat ini RED)

**Step 1:** Reproduksi RED:
```powershell
& { Set-Location C:\Users\hikar\Compfest-AIC\server; python -m pytest tests/test_server.py::test_catalog_endpoints -q }
```
Expected: FAIL — `ValidationError: 4 validation errors for CatalogItemSchema` di `catalog.py:44`.

**Step 2:** Identifikasi item bermasalah — bandingkan field item katalog vs `CatalogItemSchema` (`server/app/schemas.py:236-252`: `id, name, category, subcategory, gender, baseColour, hexColour, usage, styleTags, flatteringFaceShapes?, flatteringBodyShapes?, model3dPath, previewImageUrl, description, priceIdr`). Item lama (glasses/hats) punya semua; item shirts baru kemungkinan kurang `gender`, `styleTags`, `description`, `priceIdr`/`model3dPath`. Patch data JSON: tambahkan field hilang (`gender: "Unisex"`, `styleTags: [...]` sesuai karakter item, `description` 1 kalimat Indonesia, dst). **Jangan** melonggarkan schema — kontrak API tetap ketat.

**Step 3:** GREEN → commit:
```
git add ai_engine/data/catalog.json
git commit -m "fix: complete required catalog item fields for schema validation"
```

### Task A2: Restore dukungan subkategori jackets di recommender

**Files:**
- Modify: `ai_engine/models/recommender.py:159-167` (normalisasi subcat)
- Test: `server/tests/test_server.py::test_recommend_endpoint_jackets` (sudah ada, RED)

**Step 1:** Reproduksi RED (assert `'glasses' == 'jackets'`).

**Step 2:** Di blok normalisasi `recommend()`, tambahkan cabang:
```python
elif subcat in ["jaket", "jackets", "outerwear"]:
    subcat = "jackets"
```
dan pastikan `ai_engine/data/catalog.json` memiliki ≥4 item `subcategory: "jackets"` (tambahkan item jacket CC0-aman bila kosong — pola item shirts: name/baseColour/hexColour/usage/styleTags/modelType/model_3d_path → gunakan GLB shirt yang ada sebagai placeholder visual, `flatteringBodyShapes` boleh `[]` karena scoring shirts/jackets sudah face+quiz driven setelah Task D2).

**Step 3:** GREEN → commit:
```
git commit -m "fix: restore jackets subcategory normalization and catalog entries"
```

---

# FASE B — Backend: Biometrik 3-Parameter + Modul Pipeline

### Task B1: Skin tone 5-bucket + ITA (TDD)

**Files:**
- Modify: `ai_engine/models/skin_analyzer.py`
- Test: `server/tests/test_skin_tone.py` (Create)

**Step 1 — failing test:**
```python
"""TDD — skin_tone 5 kategori (Fair/Light/Medium/Tan/Dark) dari Monk + ITA."""
import os, sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai_engine.models.skin_analyzer import monk_to_skin_tone, SKIN_TONE_LABELS, lab_to_ita

class TestSkinToneBuckets:
    def test_monk_mapping_boundaries(self):
        assert monk_to_skin_tone(1) == "Fair" and monk_to_skin_tone(2) == "Fair"
        assert monk_to_skin_tone(3) == "Light" and monk_to_skin_tone(4) == "Light"
        assert monk_to_skin_tone(5) == "Medium"
        assert monk_to_skin_tone(6) == "Tan" and monk_to_skin_tone(7) == "Tan"
        assert monk_to_skin_tone(10) == "Dark"

    def test_monk_mapping_clamps_invalid(self):
        assert monk_to_skin_tone(0) == "Fair"   # clamp bawah
        assert monk_to_skin_tone(99) == "Dark"  # clamp atas

    def test_labels_complete(self):
        assert set(SKIN_TONE_LABELS) == {"Fair", "Light", "Medium", "Tan", "Dark"}
        assert all(len(v) > 5 for v in SKIN_TONE_LABELS.values())  # label Indonesia

    def test_ita_angles(self):
        assert lab_to_ita(94.6, 1.8, 5.6) > 50   # kulit sangat terang
        assert lab_to_ita(54.4, 10.3, 27.2) < 0  # sawo matang (MST-06) negatif
```

**Step 2:** RED (ImportError) → **Step 3 — implementasi** di `skin_analyzer.py` (setelah `MST_REFERENCE_TABLE`):
```python
# --- Standardisasi skin_tone 5 kategori (direktif 2026-08-23) ---
SKIN_TONE_LABELS = {
    "Fair": "Fair (Sangat Terang)",
    "Light": "Light (Terang)",
    "Medium": "Medium (Sedang)",
    "Tan": "Tan (Sawo Matang)",
    "Dark": "Dark (Gelap)",
}
_MONK_TO_SKIN_TONE = [(2, "Fair"), (4, "Light"), (5, "Medium"), (7, "Tan"), (10, "Dark")]

def monk_to_skin_tone(monk_index: int) -> str:
    idx = max(1, min(10, int(monk_index)))
    for upper, label in _MONK_TO_SKIN_TONE:
        if idx <= upper:
            return label
    return "Dark"

def lab_to_ita(l: float, a: float, b: float) -> float:
    """Individual Typology Angle (derajat) — Chardon et al."""
    import math
    if abs(a) < 1e-6:
        a = 1e-6
    return math.degrees(math.atan((l - b) / a))
```
**Step 4:** GREEN → **Step 5:** commit `feat: add skin_tone 5-bucket standardization with ITA angle`.

### Task B2: GenderEstimator rule engine (TDD)

**Files:**
- Create: `ai_engine/models/gender_estimator.py`
- Test: `server/tests/test_gender_estimator.py`

**Step 1 — failing test** (vektor sintetis):
```python
import os, sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai_engine.models.gender_estimator import GenderEstimator

def _f(**over):
    base = {  # netral
        "jaw_to_cheek": 0.86, "brow_to_eye": 0.16, "lip_to_face_width": 0.42,
        "face_aspect": 0.75, "jaw_to_forehead": 0.88,
    }
    base.update(over)
    return base

class TestGenderEstimator:
    def test_masculine_vector(self):
        out = GenderEstimator.classify(_f(jaw_to_cheek=0.97, brow_to_eye=0.11, lip_to_face_width=0.36, face_aspect=0.80))
        assert out["label"] == "Pria (Male)"
        assert 0.55 <= out["confidence"] <= 0.80
        assert out["method"] == "landmark_ratio"

    def test_feminine_vector(self):
        out = GenderEstimator.classify(_f(jaw_to_cheek=0.74, brow_to_eye=0.22, lip_to_face_width=0.49, face_aspect=0.71))
        assert out["label"] == "Wanita (Female)"
        assert out["confidence"] >= 0.55

    def test_neutral_falls_back_with_low_confidence(self):
        out = GenderEstimator.classify(_f())
        assert out["label"] in ("Pria (Male)", "Wanita (Female)")
        assert out["confidence"] < 0.62  # jujur: sinyal lemah

    def test_invalid_features_low_confidence(self):
        out = GenderEstimator.classify(_f(jaw_to_cheek=0.0, brow_to_eye=0.0, lip_to_face_width=0.0, face_aspect=0.0))
        assert out["confidence"] <= 0.5
        assert out["rule"] == "fallback"
```

**Step 3 — implementasi:** scoring aditif — sinyal maskulin (jaw_to_cheek tinggi ≈ rahang lebar relatif pipi, brow_to_eye RENDAH ≈ alis menonjol/tebal & berdekatan mata, lip ratio rendah, face_aspect panjang), feminin kebalikannya:
```python
"""Estimasi gender dari rasio antropometrik wajah (landmark-derived).

Rule engine dimorfisme seksual — sengaja TANPA model berat (deadline AIC);
hook validasi dataset UTKFace/FairFace tersedia di ai_engine/pipeline/03.
Confidence jujur 0.50-0.78; jawaban self-report kuesioner selalu menimpa.
"""

class GenderEstimator:
    # Threshold netral (mean antropometrik populasi dewasa)
    NEUTRAL = {"jaw_to_cheek": 0.86, "brow_to_eye": 0.16, "lip_to_face_width": 0.42, "face_aspect": 0.75}

    @staticmethod
    def classify(f: dict) -> dict:
        jaw = f.get("jaw_to_cheek") or 0.0
        brow = f.get("brow_to_eye") or 0.0
        lip = f.get("lip_to_face_width") or 0.0
        aspect = f.get("face_aspect") or 0.0

        if jaw == 0 and brow == 0 and lip == 0:
            return {"label": "Pria (Male)", "label_id": "male", "confidence": 0.50, "method": "landmark_ratio", "rule": "fallback"}

        n = GenderEstimator.NEUTRAL
        masc = ((jaw - n["jaw_to_cheek"]) / n["jaw_to_cheek"]
                + (n["brow_to_eye"] - brow) / n["brow_to_eye"]
                + (n["lip_to_face_width"] - lip) / n["lip_to_face_width"]
                + (aspect - n["face_aspect"]) / n["face_aspect"])
        conf = round(min(0.78, 0.55 + 0.23 * min(1.0, abs(masc))), 2)
        if masc >= 0:
            return {"label": "Pria (Male)", "label_id": "male", "confidence": conf, "method": "landmark_ratio",
                    "rule": f"skor maskulin {masc:+.2f} (jaw/cheek {jaw:.2f}, brow {brow:.2f}, lip {lip:.2f})"}
        return {"label": "Wanita (Female)", "label_id": "female", "confidence": conf, "method": "landmark_ratio",
                "rule": f"skor feminin {masc:+.2f} (jaw/cheek {jaw:.2f}, brow {brow:.2f}, lip {lip:.2f})"}
```
**Step 4-5:** GREEN → commit `feat: add landmark-ratio gender estimator with honest confidence`.

### Task B3: Extend schema landmark — `skin_lab` + `gender_features` + output 3-param

**Files:**
- Modify: `server/app/schemas.py`
- Modify: `server/tests/test_face_analyzer.py` (TestSchemas + _payload)
- Modify: `ai_engine/models/face_analyzer.py` (FaceAnalyzer.analyze)
- Modify: `server/app/api/v1/analyze.py` (`/analyze/landmarks` + mock preset)

**Perubahan schema:**
```python
class SkinLabIn(BaseModel):
    """LAB kulit rata-rata temporal dari klien (angka — tanpa gambar)."""
    l: float
    a: float
    b: float
    std_l: Optional[float] = None

class GenderFeaturesIn(BaseModel):
    jaw_to_cheek: float
    brow_to_eye: float
    lip_to_face_width: float
    face_aspect: float

class SkinToneOut(BaseModel):
    tone: str                    # Fair/Light/Medium/Tan/Dark
    label_indonesian: str
    monk_index: Optional[int] = None
    monk_code: Optional[str] = None
    ita_deg: Optional[float] = None
    undertone: Optional[str] = None   # sinyal internal, tidak ditampilkan kartu utama
    confidence: float

class GenderOut(BaseModel):
    label: str                   # "Pria (Male)" | "Wanita (Female)"
    label_id: str                # male | female
    confidence: float
    method: str = "landmark_ratio"
    rule: Optional[str] = None
```
- `LandmarkAnalysisRequest`: tambah `skin_lab: Optional[SkinLabIn] = None`, `gender_features: Optional[GenderFeaturesIn] = None` (opsional — jalur lama tetap valid).
- `LandmarkAnalysisResponse`: **HAPUS** `body_shape: Optional[BodyShapeResponse]`; tambah `skin_tone: SkinToneOut`, `gender: GenderOut`.
- HAPUS seluruh schema body-landmark dari `schemas.py` (`BodyLandmarkAnalysisRequest`, `BodyAnalysisResponse`, `BodyShapeClassificationOut`, `TorsoLegBalanceOut`, `BodyPillarOut`, `BodyMeasurementsIn`) — dan import-nya di `analyze.py`.

**FaceAnalyzer.analyze** — tambah blok:
```python
from ai_engine.models.skin_analyzer import monk_to_skin_tone, lab_to_ita, SKIN_TONE_LABELS, MST_REFERENCE_TABLE
from ai_engine.models.gender_estimator import GenderEstimator

# di dalam analyze(), setelah classify brow:
skin_tone = FaceAnalyzer._classify_skin(request)
gender = FaceAnalyzer._classify_gender(request)
# ... masukkan ke return dict: "skin_tone": skin_tone, "gender": gender
```
`_classify_skin`: bila `request.skin_lab` ada → cari MST terdekat via ΔE pada LAB reference table → `monk_to_skin_tone(idx)` + ita + undertone nearest; bila tidak → default MST-06/Tan/Warm dengan `confidence 0.5, rule "fallback_no_lab"`. `_classify_gender`: bila `request.gender_features` → GenderEstimator.classify; else fallback male 0.5.

**Mock preset** `indonesian_multi_dim` (mock_generator.py): tambah blok `"skin_tone": {...}` dan `"gender": {...}`; hapus `"body_shape"`. `_landmarks_mock_response` di analyze.py update sesuai.

**Test tambahan** (TestSchemas + TestFaceAnalyzerOrchestrator + TestLandmarksEndpoint):
```python
def test_skin_tone_bucket_from_lab(self):
    p = _payload(skin_lab={"l": 54.4, "a": 10.3, "b": 27.2, "std_l": 3.1})
    out = FaceAnalyzer.analyze(LandmarkAnalysisRequest(**p))
    assert out["skin_tone"]["tone"] == "Tan"      # MST-06 sawo matang
    assert out["skin_tone"]["monk_code"] == "MST-06"

def test_gender_from_features(self):
    p = _payload(gender_features={"jaw_to_cheek": 0.97, "brow_to_eye": 0.11, "lip_to_face_width": 0.36, "face_aspect": 0.80})
    out = FaceAnalyzer.analyze(LandmarkAnalysisRequest(**p))
    assert out["gender"]["label_id"] == "male"

def test_endpoint_returns_three_core_params(self):
    res = client.post("/api/v1/analyze/landmarks", json=_payload())
    body = res.json()
    assert body["skin_tone"]["tone"] in {"Fair", "Light", "Medium", "Tan", "Dark"}
    assert body["gender"]["label_id"] in {"male", "female"}
    assert "body_shape" not in body
```
Update juga `_payload()` fixture: tambah `skin_lab` & `gender_features` default. Hapus test yang men-*assert* `body_shape` bila ada. HAPUS endpoint `/analyze/body-landmarks` + import `body_analyzer` di `analyze.py`; **hapus file** `ai_engine/models/body_analyzer.py`; hapus `analyzeBodyLandmarks` + `BodyLandmarkAnalysisResult` dari `client/src/lib/api.ts` (Task C5 menyisir sisa client).

Commit (per sub-langkah hijau): `feat: standardize landmark analysis to skin_tone+face_shape+gender`, `refactor: remove body-landmarks endpoint and body analyzer`.

### Task B4: Modul pipeline `ai_engine/pipeline/` — process AI face analysis per tugas (dataset nyata)

**Files:**
- Create: `ai_engine/pipeline/__init__.py`, `common.py`, `01_skin_tone_pipeline.py`, `02_face_shape_pipeline.py`, `03_gender_pipeline.py`, `README.md`
- Create: `server/tests/test_pipeline.py`

**Sumber dataset terverifikasi (diriset 2026-08-23):**

| Pipeline | Dataset | Label | Akses |
|---|---|---|---|
| 01 skin_tone | **Monk Skin Tone Scale** (Google × Dr. Ellis Monk, lisensi terbuka) — 10 swatch referensi; **SCIN** (Google Research) 10k+ citra berlabel MST 1–10 | MST 1–10 | [skintone.google](https://skintone.google/), [github.com/google-research-datasets/scin](https://github.com/google-research-datasets/scin) |
| 01 skin_tone | **FairFace** 108.501 citra (race-balanced, proxy tone kulit) | race/age/gender | [huggingface.co/datasets/HuggingFaceM4/FairFace](https://huggingface.co/datasets/HuggingFaceM4/FairFace) |
| 02 face_shape | **Niten19 Face Shape Dataset** — 5.000 citra, **6 kelas persis sama** (Oval, Round, Square, Heart, Oblong, Diamond) | 6 face shape | [kaggle.com/niten19/face-shape-dataset](https://www.kaggle.com/niten19/face-shape-dataset) |
| 02 face_shape | **Face Shape Preprocessed** (sudah detect+rotate+crop) — validasi cepat | 5 kelas | [kaggle.com/datasets/zeyadkhalid/faceshape-processed](https://www.kaggle.com/datasets/zeyadkhalid/faceshape-processed) |
| 03 gender | **UTKFace** 20k+ citra (age/gender/ethnicity, nama file = label) | gender 0/1 | [susanqq.github.io/UTKFace](https://susanqq.github.io/UTKFace/), mirror [Kaggle UTKFace](https://www.kaggle.com/datasets/chiragsaipanuganti/utkface) |
| 03 gender | **FairFace** 108k (gender + race-balanced — utama anti-bias) | gender | HF di atas |

**Struktur setiap `0N_*.py` — 5 tahap process yang diminta user (didokumentasikan di docstring + implementasi):**
```python
"""Process AI Face Analysis — [N] <Tugas>

DATASET: <nama, URL, lisensi, jumlah, label>

Tahap process (dipanggil berurutan oleh run() / CLI):
  STAGE 1 CLEANING    — buang sampel rusak/blur/tidak terdeteksi wajah (MediaPipe detect),
                        dedup hash, filter label di luar kelas valid (mis. UTKFace age<10 → skip,
                        karena proporsi anak mendistorsi rasio antropometrik dewasa)
  STAGE 2 NORMALIZATION — alignment landmark (rotasi roll→0 via eye line), skala kalibrasi iris
                        11,7 mm (ANSUR II), konversi sRGB→CIELAB D65 white-point
  STAGE 3 PREPROCESSING — ekstraksi fitur: LAB patch pipi/dahi (01), rasio geometrik 6-landmark (02),
                        fitur dimorfisme (03); vektor numerik siap klasifikasi
  STAGE 4 CLASSIFY    — rule engine / nearest-ΔE / threshold (inferensi produksi — deterministik)
  STAGE 5 VALIDATE    (--dataset-dir opsional) — hitung akurasi estimator terhadap label dataset;
                        laporan precision/recall/confusion ke stdout + saran kalibrasi threshold.
                        Opsi --finetune: cetak rencana fine-tune MobileNetV3-ES (RTX 4060 8GB,
                        transfer learning head-only, ~15 menit/epoch) TANPA menjalankannya
                        (butuh dataset lokal user — tidak di-download otomatis, soal lisensi).
"""
```
`common.py` — primitif bersama (murni numpy, tanpa dependensi network):
```python
def rgb_to_lab_pixels(rgb: np.ndarray) -> np.ndarray: ...   # delegasi konversi skin_analyzer per-pixel (vektorisasi)
def extract_cheek_forehead_patches(image_rgb, landmarks) -> np.ndarray: ...  # patch pipi (234/454 offset) & dahi (10 offset)
def ita_from_lab(lab: np.ndarray) -> float: ...             # median ITA patch
def lab_to_monk_index(lab_mean) -> int: ...                 # nearest ΔE vs MST_REFERENCE_TABLE
def roll_align(image_rgb, landmarks) -> tuple: ...          # rotasi eye-line horizontal (STAGE 2)
def image_hash(image_rgb) -> str: ...                       # dedup (STAGE 1)
```
Setiap pipeline: fungsi murni `run(image_rgb=None, landmarks=None, lab=None, features=None) -> dict` (dipakai unit test & runtime produksi) + `main()` CLI — tanpa argumen berjalan pada vektor sintetis bawaan (smoke self-check); `--dataset-dir <path>` menjalankan STAGE 5 validasi bila user sudah menaruh dataset lokal.

`ai_engine/pipeline/README.md` — ringkasan arsitektur process per tugas + tabel dataset + cara menjalankan CLI + penjelasan mengapa produksi memakai rule engine deterministik (bukan model ML berat): latensi <10ms, deterministik 100%, jalan tanpa GPU, model fine-tune = jalur eskalasi opsional.

**Test sintetis:**
```python
class TestPipeline:
    def test_skin_pipeline_monk_bucket(self): ...   # LAB MST-06 → tone "Tan"
    def test_face_pipeline_ratios(self): ...        # landmark sintetis → 3 rasio + chin angle
    def test_gender_pipeline_report(self): ...      # vektor maskulin/feminin → akurasi 1.0 pada 4 vektor
    def test_pipeline_stage_order(self): ...        # run() mengeksekusi stage 1-4 berurutan (log stages)
```
Commit: `feat: add modular AI face analysis pipelines with dataset validation stages`.

### Task B5: Pembersihan mock preset & recommender dari body_shape

**Files:** `ai_engine/models/mock_generator.py` (hapus blok `body_shape` di 4 preset), `ai_engine/models/recommender.py` (Task D2 menyelesaikan scoring; di sini hanya hapus `extract_profile_str(body_shape)` default usage di reason shirts line 358), `server/tests/test_face_analyzer.py` (`test_mock_preset_multi_dim_complete` — hapus `"body_shape"` dari daftar block wajib).

Commit: `refactor: strip body_shape from presets and narrative paths`.

---

# FASE C — Client: Strict Oval, Temporal Smoothing, UI 3-Param, AR

### Task C1: faceGeometry.ts — ovalFit + rgbToLab + computeGenderFeatures

**Files:** Modify `client/src/lib/faceGeometry.ts`; (tipe murni — verifikasi via `npx tsc --noEmit`).

```typescript
/** Kontainment ellipse pemandu: true bila KEEMPAT landmark wajah inti masuk oval. */
export function ovalFit(
  lm: Landmark[],
  oval: { cx: number; cy: number; rx: number; ry: number } // koordinat normalisasi video (bukan mirror)
): { inside: boolean; faceW: number; faceH: number } {
  const pts = [lm[10], lm[152], lm[234], lm[454]]; // dahi, dagu, pipi kiri, pipi kanan
  const inside = pts.every((p) => {
    const nx = (p.x - oval.cx) / oval.rx;
    const ny = (p.y - oval.cy) / oval.ry;
    return nx * nx + ny * ny <= 1.0;
  });
  const faceW = Math.hypot(lm[234].x - lm[454].x, lm[234].y - lm[454].y);
  const faceH = Math.hypot(lm[10].x - lm[152].x, lm[10].y - lm[152].y);
  return { inside, faceW, faceH };
}

/** sRGB [0-255] → CIELAB D65 (portabel client, selaras skin_analyzer server). */
export function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } { ... }

/** Fitur dimorfisme untuk GenderEstimator server. */
export function computeGenderFeatures(lm: Landmark[]) {
  const cheek = dist(lm[234], lm[454]);
  const jaw = dist(lm[172], lm[397]);
  const browR = lm[105], eyeR = lm[159];              // puncak alis vs kelopak atas
  const lipW = dist(lm[61], lm[291]);                  // sudut bibir
  const faceH = dist(lm[10], lm[152]);
  return {
    jaw_to_cheek: jaw / cheek,
    brow_to_eye: Math.abs(browR.y - eyeR.y) / cheek,
    lip_to_face_width: lipW / cheek,
    face_aspect: cheek / faceH,
  };
}

/** Rata-rata LAB patch kulit dahi+pipi dari frame video (per-frame, murah). */
export function sampleSkinLab(video: HTMLVideoElement, lm: Landmark[]): { l: number; a: number; b: number } | null { ... }
```
Commit: `feat: add oval containment, LAB sampling, and gender features to faceGeometry`.

### Task C2: Temporal frame sampler (baru)

**Files:** Create `client/src/lib/frameSampler.ts`

```typescript
/**
 * Temporal smoothing (ADR-019): akumulasi fitur per-frame selama status HIJAU.
 * - Rasio & fitur wajah: MEDIAN (robust terhadap outlier landmark jitter)
 * - LAB kulit: MEAN + std_l (sinyal stabil antar frame)
 * - Deterministik: window maksimal 30 sampel, tunggu minimal 15.
 */
export interface FrameSample {
  ratios: Record<string, number>;
  nose: Record<string, number>;
  eye: Record<string, number>;
  brow: Record<string, number>;
  gender: Record<string, number>;
  pose: { roll: number; yaw: number; pitch: number };
  skinLab: { l: number; a: number; b: number };
}

export class FrameSampler {
  private samples: FrameSample[] = [];
  push(s: FrameSample) { this.samples.push(s); if (this.samples.length > 30) this.samples.shift(); }
  get count() { return this.samples.length; }
  reset() { this.samples = []; }
  /** Agregat final — median per kunci numerik; LAB mean + std_l. */
  aggregate(): { ratios: ...; nose: ...; eye: ...; brow: ...; gender: ...; pose: ...; skin_lab: { l; a; b; std_l } } { ... }
}
```
Verifikasi: `npx tsc --noEmit`. Commit: `feat: add temporal frame sampler with median ratios and mean LAB`.

### Task C3: CameraScan — strict oval gate + temporal scan (inti Fase C)

**Files:** Modify `client/src/components/CameraScan.tsx` (rewrite `processLandmarks` + `handleStartScan` + kartu profil), Modify `client/src/lib/api.ts` (`LandmarkAnalysisResult` += skin_tone/gender, hapus body_shape; analyzeLandmarks fallback chain bersih body).

**Gate state machine (menggantikan heuristic bounding-box lama):**
```
MERAH  (NO_FACE / OUTSIDE): ovalFit.inside === false ATAU tak ada wajah
       → guideMessage: "Wajah belum berada di dalam area pemandu"
       → tombol scan DISABLED + alert merah
       → **PEMBATALAN**: bila sedang countdown → countdown DIBATALKAN, sampler.reset(),
         kembali ke state guide (error handling yang diminta: muka tidak ngepas garis = proses batal)
KUNING (MISALIGNED): inside tetapi |yaw|>15° || |roll|>15° || faceW < 0.25 (terlalu jauh)
       → "Posisikan wajah tegak lurus dan lebih dekat" / spesifik (miring vs jarak)
       → **PEMBATALAN** juga berlaku saat countdown (stabilitas terputus = mulai ulang)
HIJAU  (ALIGNED): inside ∧ pose OK ∧ ukuran OK, stabil tanpa putus ≥ 1500 ms (time-based via performance.now, bukan hitungan frame)
       → countdown 3s otomatis; FrameSampler mengumpulkan selama ALIGNED (≈45–60 frame @15–30fps, kap 30)
       → countdown selesai + sampler.count ≥ 15 → handleStartScan; < 15 → perpanjang sampling
       → JIKA kapan pun state keluar dari HIJAU selama countdown → batalkan (lihat MERAH/KUNING)
```
Perubahan kunci:
- `processLandmarks` memakai `computePose` (faceGeometry) untuk yaw/roll/pitch derajat (bukan lagi sudut mata 22°), `ovalFit` untuk kontainment; tiap frame ALIGNED → `sampler.push({ratios: computeFaceRatios(lm), nose, eye, brow, gender: computeGenderFeatures(lm), pose, skinLab: sampleSkinLab(video, lm)})`.
- `handleStartScan` (dipanggil akhir countdown): `const agg = sampler.aggregate()` → `buildAnalysisPayloadFromAgg(agg)` (varian buildAnalysisPayload yang menerima agregat + luminance) → **satu panggilan** `analyzeLandmarks` (tanpa `analyzeSkin` gambar, tanpa `analyzeRatios`); ROI gambar tidak pernah keluar perangkat.
- Tombol "Pindai Karakter AI Sekarang": `disabled={faceGuideState !== "ALIGNED" || isScanning}` — merah = terkunci (sesuai direktif).
- Kartu profil: **3 kartu utama** `SKIN TONE (Fair/Tan/... + swatch monk hex)`, `BENTUK WAJAH`, `GENDER`; blok sekunder "Detail Lanjutan" (hidung·mata·alis + ukuran iris kalibrasi — dipertahankan, D5). **HAPUS** kartu "BENTUK TUBUH" (CameraScan.tsx:1183-1189) dan blok "WARNA PALING HARMONIS" (1224-1241).
- Upload mode (`analyzePhoto`): tambah `skin_lab` dari `computeLuminance`-style sampling (patch pusat → rgbToLab) + `gender_features` dari landmark — sehingga kedua mode keluaran identik 3-param.
- `onScanComplete(profile, stream, meta)` — tambah argumen `inputMode: "camera" | "upload"` untuk gating AR (Task C6).

Verifikasi: `npx tsc --noEmit` + `npm run build` (4/4 statis). Commit: `feat: strict landmark oval gate with temporal smoothing and 3-param profile`.

### Task C4: Pembersihan body_shape dari client (flow + types)

**Files:**
- Modify: `client/src/lib/mockData.ts` — `UserPersonalProfile`: hapus `body_shape` wajib → tambah `skin_tone?: { tone; label_indonesian; monk_code?; hex?; confidence }`, `gender?: { label; label_id; confidence; method? }`; hapus `BodyMeasurements`; `MOCK_PRESETS` profile disesuaikan (preset 1: skin_tone Tan/MST-06, gender "Pria (Male)"; preset 2 Fair/female; dst). `BodyShapeProfile` interface dihapus.
- Modify: `client/src/app/page.tsx` — hapus import/h-render `BodyScan`, `BodyReportCard`, step `"REPORT"`, `bodyAnalysisReport`, `analyzeBodyLandmarks`, cabang `streamOrPayload.body_ratios`, fallback apparel body report (line 60-128); apparel kini juga pakai `CameraScan`; `BodyOutfitViewer` TETAP di TRYON apparel (pakai `scan_snapshot_dataurl`); `userProfileDict` → `{ skin_tone, face_shape, gender, undertone }` (tanpa body_shape).
- Delete: `client/src/components/BodyScan.tsx`, `client/src/components/BodyReportCard.tsx`, `client/src/lib/bodyGeometry.ts`.
- Modify: `client/src/components/ProcessingLoadingScreen.tsx`, `ProductDetailModal.tsx` — bersihkan referensi `body_shape` (grep menyisakan 0 kecuali komentar penghapusan).
- Modify: `client/src/lib/api.ts` — hapus `analyzeBodyLandmarks` + `BodyLandmarkAnalysisResult`; `fetchDynamicQuestions` & `fetchTop4Recommendations` kirim `{ skin_tone, face_shape, gender, undertone }`.

Verifikasi: `grep -r "body_shape" client/src` → nol hit (kecuali changelog/docs); `npx tsc --noEmit`; `npm run build`. Commit: `refactor: remove body shape flow and standardize client profile types`.

### Task C5: Presisi anchoring AR (ARCanvasViewer)

**Files:** Modify `client/src/components/ARCanvasViewer.tsx` (`applyLandmarksTo3DModel`)

Perbaikan presisi (di atas fondasi IPD-scale yang sudah ada):
1. **Pupil presisi via iris landmark** — ganti midpoint outer/inner (33/133, 263/362) dengan pusat iris `landmarks[468]` (kanan) & `landmarks[473]` (kiri) bila tersedia (model face_landmarker menghasilkan 478 titik); fallback midpoint lama.
2. **Anchor pangkal hidung dominan** — `nasion = landmarks[168]` (bukan `168 || 6`); posisi world = lerp(nasion 0.75, midPupil 0.25) — kacamata menempel di bridge, bukan melayang; offset Y konstan `-0.02` dipertahankan sebagai finetuning.
3. **Skala dinamis IPD** — sudah berjalan (`worldInterPupil * 1.55`); tambahkan clamp skala `±25%` dari median IPD 5 frame (anti-jitter lompatan).
4. **Pitch dari geometri hidung** — sudah berjalan; tambahkan smoothing median 3-frame untuk pitch & yaw (lerp 0.4 → 0.3 saat |delta| > 0.15).
5. **Pivot bbox center** — normalisasi `model.position.sub(center)` sudah ada (line 311-314) — pertahankan; pastikan wrapper group (bukan model) yang di-scale agar pivot tetap center.

Verifikasi: `npm run build`; manual browser (kacamata di pangkal hidung, mengikuti pitch/yaw/roll). Commit: `feat: iris-precision AR anchoring with anti-jitter scale clamping`.

### Task C6: Penguncian mode AR (strict gate input statis)

**Files:** Modify `client/src/app/page.tsx`, `client/src/components/ARCanvasViewer.tsx`

- `page.tsx`: state `scanInputMode: "camera" | "upload"` di-set dari `onScanComplete` meta; teruskan `arEnabled={scanInputMode === "camera" && Boolean(mediaStream)}` ke `ARCanvasViewer`.
- `ARCanvasViewer`: prop `arEnabled?: boolean` (default true). Bila `false`:
  - Tombol "Pasang ke Wajah (AR 3D)": `disabled` + `title` + badge tooltip persis: **"Mode AR Live hanya tersedia melalui pemindaian Kamera Langsung. Gunakan Studio 360° untuk melihat detail produk."**
  - `viewMode` dipaksa `"studio"` (init + guard setter); kamera TIDAK diinisialisasi sama sekali (skip `initCamera`), dan Studio 360° jadi mode default aktif.
- Bila `mediaStream` mati saat `arEnabled=true` (mis. user blokir kamera) → fallback lama `setViewMode("studio")` tetap.

Verifikasi: `npx tsc --noEmit` + `npm run build`; manual: upload foto → tombol AR terkunci + tooltip; kamera live → AR aktif. Commit: `feat: gate AR live mode to camera scans with studio fallback for uploads`.

---

# FASE D — Kuesioner Gemini Rules Matrix + Skoring Multi-Kriteria

### Task D1: Conditional prompting & rules matrix (TDD)

**Files:**
- Modify: `server/app/services/gemini_service.py` (`_build_tailored_prompt` + `_generate_dynamic_fallback`)
- Test: `server/tests/test_question_rules.py` (Create)

Rules matrix `(gender, skin_tone, face_shape, category)` — string konteks ditambahkan ke prompt & fallback lokal:

| Dimensi | Kondisi | Instruksi konteks |
|---|---|---|
| gender | `Pria (Male)` | fokus struktur rahang, gaya maskulin/clean look, kenyamanan aktivitas outdoor, ketebalan & bobot frame |
| gender | `Wanita (Female)` | keselarasan riasan/makeup, detail aksen & estetika bingkai, gaya chic/anggun/bold statement |
| skin_tone | `Tan` / `Dark` | eksplorasi kontras berani (Gold, Amber, Clear Crystal, Tortoise cerah) + aktivitas di bawah sinar matahari |
| skin_tone | `Fair` / `Light` / `Medium` | rona netral/pastel (Silver, Matte Black, Charcoal, Rose Gold) |
| face_shape | `Round`/`Heart`/`Square` | pertanyaan ilusi visual penyeimbang siluet (sudut tegas vs pelembut) |

Mekanika: `_extract_profile(user_profile)` membaca `gender` (`label` atau string), `skin_tone` (`tone` atau string), `face_shape`; `GENDER_CONTEXT`, `SKIN_TONE_CONTEXT`, `FACE_SHAPE_CONTEXT` dict → diinjeksi ke prompt Gemini **dan** `_generate_dynamic_fallback` (pertanyaan batch-1 #2 disesuaikan gender+skin_tone; pertanyaan #3 disesuaikan skin_tone bucket dengan opsi palet per bucket: Tan/Dark → Gold/Amber/Clear Crystal/Tortoise Cerah; Fair/Light/Medium → Silver/Matte Black/Charcoal/Rose Gold). Fallback offline (`GEMINI_API_KEY` kosong) menghasilkan pertanyaan dengan logika kondisi IDENTIK — dijamin test tanpa network.

**Test (tanpa network — monkeypatch settings.GEMINI_API_KEY=""):**
```python
def test_fallback_male_tan_asks_bold_colors(self): ...
def test_fallback_female_fair_asks_neutral_palette(self): ...
def test_fallback_round_face_asks_silhouette_balance(self): ...
def test_prompt_contains_gender_and_skin_context(self): ...  # _build_tailored_prompt includes both blocks
def test_offline_no_key_uses_local_bank(self): ...           # /questions/generate source == "local_bank"
```
Commit: `feat: conditional questionnaire rules matrix by gender, skin tone, and face shape`.

### Task D2: Multi-criteria scoring — style weights (TDD)

**Files:**
- Modify: `ai_engine/models/recommender.py`
- Test: `server/tests/test_recommender_weights.py` (Create)

- Hapus `body_shape` dari scoring shirts (blok `flattering_bodies`, line 263-277) → diganti skor siluet **quiz-driven**.
- Tambah pemetaan jawaban → bobot gaya:
```python
STYLE_WEIGHT_MAP = {
    # question_id → {option_id: {formal, casual, statement, versatile}}
    "occasion": {"Formal": {"formal": 2, "versatile": 1}, "Casual": {"casual": 2, "versatile": 1},
                 "Party": {"statement": 2}, "Sports": {"casual": 2}},
    "fit_preference": {"Oversized": {"statement": 1, "casual": 1}, "Fitted": {"formal": 1, "versatile": 1}, ...},
    "brand_style": {"Minimalist": {"versatile": 1}, "Streetwear": {"statement": 1, "casual": 1},
                    "Classic": {"versatile": 1, "formal": 1}, "Avant-Garde": {"statement": 2}}, ...
}
def derive_style_weights(quiz_answers: dict) -> dict:  # → {"formal": n, "casual": n, "statement": n, "versatile": n}
```
- Item katalog membaca `styleTags` (sudah ada) sebagai afinitas dimensi yang sama → `style_affinity_score` 0-100; formula akhir: `total = 0.35*color + 0.30*shape + 0.20*quiz + 0.15*style_affinity` (bobot baru didokumentasikan di docstring — "langsung mempengaruhi formula rekomendasi Top-4").
- Personal summary menyebut dimensi dominan (mis. "orientasi statement 2× — aksen kontras diprioritaskan").

**Test:** `derive_style_weights({"occasion": "Party", "brand_style": "Avant-Garde"})["statement"] == 4`; item statement-tagged mengalahkan versatile-tagged pada profil party; shirts scoring tanpa body_shape tetap menghasilkan Top-4; jackets test lama tetap hijau.

Commit: `feat: quiz-driven style weight scoring replacing body shape in recommendations`.

### Task D3 (descope-able): Pertanyaan gender self-report (batch 1, opsi #0)

Batch 1 fallback lokal menambah pertanyaan `gender_self` ("Mana yang paling menggambarkan Anda?" — Pria/Wanita/Prefer not to say) HANYA bila `gender.confidence < 0.62`; jawaban menimpa estimasi landmark di profile (source `self_reported`) dan dipakai rules matrix D1. Bila waktu sempit → descope (estimator tetap jalan).

### Task D4: Dokumen process Kuisioner Analysis (biar jelas personalisasi → rekomendasi)

**Files:**
- Create: `docs/QUESTIONNAIRE_ANALYSIS_FLOW.md`

Dokumen berisi pipeline end-to-end yang bisa ditunjukkan ke juri/user:
1. **Input 3-param biometrik** (deterministik hasil Task B/C) →
2. **Rules matrix kondisional** (tabel D1 lengkap: gender → prioritas pertanyaan; skin_tone → pertanyaan aktivitas/palet; face_shape → ilusi siluet) →
3. **Generasi**: Gemini Flash-Lite (bila `GEMINI_API_KEY` ada) / local bank (offline) — struktur JSON identik →
4. **Jawaban → style weights** `derive_style_weights()` (tabel pemetaan D2) →
5. **Skoring item**: `0.35·color + 0.30·shape + 0.20·quiz + 0.15·style_affinity` →
6. **Top-4 Archetypes** (perfect_match / safe_classic / bold_statement / modern_trendy) →
7. Contoh konkret jalur lengkap: user "Wanita, Tan (MST-06), Heart" menjawab occasion=Party, brand=Avant-Garde → pertanyaan yang muncul, bobot yang terbentuk (`statement=4`), item yang menang & alasannya.

Commit: `docs: add questionnaire analysis flow documentation`.

---

# FASE E — Gate Verifikasi Akhir

### Task E1: Server 100% hijau
```powershell
& { Set-Location C:\Users\hikar\Compfest-AIC\server; python -m pytest tests/ -q }
```
Expected: **ALL PASSED** (52+ tests, termasuk 2 fix Fase A; TANPA env-failure — Gemini fallback dibuktikan test D1 tanpa key).

### Task E2: Client
```powershell
& { Set-Location C:\Users\hikar\Compfest-AIC\client; npx tsc --noEmit; npm run build }
```
Expected: 0 error TypeScript, build 4/4 statis.

### Task E3: Docker + smoke API
```powershell
& { Set-Location C:\Users\hikar\Compfest-AIC; docker compose up -d --build }
# lalu:
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/api/v1/analyze/landmarks -H "Content-Type: application/json" -d @server/tests/sample_payload.json   # + skin_lab & gender_features di file
curl -s -X POST http://localhost:8000/api/v1/questions/generate -H "Content-Type: application/json" -d "{...profile skin_tone/gender...}"
curl -s http://localhost:8000/docs   # Swagger memuat /analyze/landmarks tanpa /analyze/body-landmarks
```

### Task E4: Checklist manual browser (user)
1. Scan kamera 3× berturut-turut → `skin_tone`, `face_shape`, `gender` **identik** (temporal smoothing deterministik).
2. Merah di luar oval → tombol scan terkunci + alert; kuning saat miring >15°; hijau stabil 1.5s → countdown.
3. Upload foto → tombol AR terkunci + tooltip; Studio 360° aktif.
4. Kamera live → kacamata AR menempel di pangkal hidung, skala mengikuti jarak.
5. Quiz kontekstual menyebut gender/skin_tone/bentuk wajah spesifik.

### Task E5: Dokumentasi
- `ERROR.md`: entri #6 — 2 test merah katalog/jackets (root cause 9992b7e) + resolusi; entri #7 — temuan kunci hardcoded di scratch (dibersihkan Task 0, tidak pernah terkomit, saran rotasi kunci).
- `MEMORY.md`/`Last_note.md`: ADR-019 (standardisasi biometrik 3-param + temporal smoothing + AR gating), progress log.
- Commit: `docs: log biometric standardization decisions and error resolutions`.

### Task 0 (jalankan paling awal): Kebersihan secret scratch
- Edit `scratch/test_gemini_questions.py` → ganti kunci hardcoded dengan `os.environ.get("GEMINI_API_KEY", "")`; **jangan kommit kunci**; sarankan user rotasi kunci (kunci pernah berada di plaintext disk).
- Commit: `chore: remove hardcoded API key from scratch test script` (hanya jika file masuk repo; saat ini untracked → cukup edit lokal + catat di ERROR.md).

---

## 📉 Descope Ladder (jika waktu < estimasi, kerjakan atas ke bawah)

1. D3 gender self-report question → estimasi landmark cukup.
2. B4 hook dataset CLI opsional → pipeline jalan hanya pada vektor sintetis (tetap ada modulnya).
3. C5 fine-tuning pitch/yaw smoothing → anchoring iris+nasion inti tetap.
4. D2 style_affinity bobot → kembalikan formula 3-suku lama (tanpa body_shape).

## ✅ Definition of Done
- [ ] Pytest ALL PASS (0 failed, 0 skipped-env) — Fase A + E1
- [ ] `npx tsc --noEmit` 0 error; `npm run build` 4/4 — E2
- [ ] Docker compose up -d --build sukses; smoke curl 3 endpoint + Swagger — E3
- [ ] **Browser: 3× scan berturut wajah sama → `skin_tone` + `face_shape` + `gender` IDENTIK** (akar masalah utama terjawab) — E4
- [ ] Wajah keluar garis pemandu saat countdown → scan otomatis BATAL + alert (error handling)
- [ ] `grep -r "body_shape" client/src server/app ai_engine/models` → 0 hit di jalur aplikasi
- [ ] Output profil: hanya 3 kartu biometrik utama; tanpa "Warna Paling Harmonis" + tanpa kartu undertone/bentuk tubuh
- [ ] Kuesioner kondisional teruji: pria vs wanita vs tone gelap vs terang → pertanyaan berbeda (test D1 tanpa network)
- [ ] `ai_engine/pipeline/` 3 modul + README dengan tabel dataset nyata & 5 tahap process
- [ ] `docs/QUESTIONNAIRE_ANALYSIS_FLOW.md` ada + contoh jalur konkret
- [ ] Mode upload: AR terkunci + tooltip persis; mode kamera: AR aktif
- [ ] Semua commit Conventional Commits + Co-Authored-By; zero institution identity; zero hardcoded secrets
