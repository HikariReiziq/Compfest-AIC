# COBA Face Analysis Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menghilangkan trust-issue pengguna terhadap modul Face Scan dengan input dual-mode (webcam + upload foto dengan reposisi interaktif), mesin analisis multi-dimensi (bentuk wajah 6 kelas, tipe hidung, bentuk mata, bentuk alis, ukuran terkalibrasi cm via iris 11,7 mm), Report Card kelas agency, dan integrasi ke kuesioner Gemini + AR 3D.

**Architecture:** Hybrid "Alternatif A" (ADR-014) — klien mengekstrak 478 landmark MediaPipe + fitur turunan + ukuran cm di `client/src/lib/faceGeometry.ts` (gambar wajah TIDAK PERNAH dikirim ke server — UU PDP by design); server mengklasifikasi via endpoint baru `POST /api/v1/analyze/landmarks` di `ai_engine/models/face_analyzer.py` (payload hanya fitur turunan). Step machine berubah: `CATEGORY → SCAN → REPORT → QUIZ → PROCESSING → TRYON`.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + `@mediapipe/tasks-vision` (478 landmarks + iris) + Three.js GLTFLoader; FastAPI + Pydantic v2; pytest untuk server TDD; Docker Compose (`coba-frontend-client`:3000, `coba-backend-server`:8000).

**Referensi SSOT:** ADR-013 s.d. ADR-018 di `MEMORY.md`; spesifikasi lengkap di `PRD.md` Section 8 (8.1–8.6).

---

## ATURAN MUTLAK (WAJIB DIBACA SEBELUM TASK 0)

1. **Zero Institution Identity**: JANGAN PERNAH menuliskan nama universitas, fakultas, logo kampus, atau identitas institusi di kode, komentar, dokumen, atau commit. Pelanggaran = diskualifikasi absolut.
2. **Conventional Commits**: setiap commit diawali `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, atau `chore:`.
3. **No Hardcoded Secrets**: API key hanya dari `.env` / environment variables (pola yang sudah ada di `server/app/config.py`).
4. **Session-Scoped Biometrics (UU PDP No. 27/2022)**: TIDAK ADA database persisten (ADR-015). Endpoint baru hanya menerima fitur turunan (angka), bukan gambar. Footer claim "Zero Persistent Biometrics" tidak boleh menjadi bohong.
5. **Jangan refactor kode yang tidak termasuk scope plan ini.** Pertahankan optional chaining `?.` dan pola cleanup `stream.getTracks().forEach(t => t.stop())` (lihat ERROR.md #2 & #4).

---

## VERIFICATION SETUP (dikerjakan sekali di Task 0)

- **Server tests (TDD ketat):** primary `docker compose exec coba-backend-server python -m pytest tests/ -v`. Jika container tidak me-mount source (file test baru tidak terlihat), gunakan host: `cd server && python -m pytest tests/ -v`, atau `docker compose up -d --build coba-backend-server` lalu ulangi. Baseline saat ini: **12 passed**.
- **Client verification** (tidak ada test runner di `client/package.json` — jangan menambahkan, itu scope creep): `cd client && npx tsc --noEmit` lalu `npm run build`. Expected: `✓ Compiled successfully`, 4/4 pages. Setiap akhir fase: smoke test manual di `http://localhost:3000` dengan checklist di task terakhir tiap fase.
- **Bendera feature** saat develop: jalankan backend dengan env `COBA_ENABLE_MOCK=1`? — TIDAK ADA flag baru. Ikuti pola yang sudah ada di `analyze.py`: try real engine → on exception fallback ke `MockDataGenerator` dan set `"source": "mock"` di response (deterministik untuk juri).

---

# FASE 1 — UI Upload & Reposisi (est. 5–6 jam, selesai maks. 23 Agu malam)

**Tujuan fase:** pengguna bisa memakai mode Upload Foto (PNG/JPG/JPEG), menggeser/zoom/rotasi foto agar wajah masuk oval guide, lalu analisis landmark berjalan di klien dengan kalibrasi iris → cm. Mode webcam lama TIDAK boleh rusak.

### Task 1.1: `faceGeometry.ts` — kalibrasi iris & pengukuran cm (pure functions)

**Files:**
- Create: `client/src/lib/faceGeometry.ts`

**Step 1: Tulis modul pure-function (tanpa React, tanpa DOM — hanya math)**

```typescript
// client/src/lib/faceGeometry.ts
// Ekstraksi fitur geometri wajah dari 478 landmark MediaPipe (FaceLandmarker
// dengan outputFaceBlendshapes OFF, numFaces 1, delegate GPU→CPU fallback).
// Semua fungsi murni — mudah diverifikasi, tidak menyentuh DOM.

export interface Landmark { x: number; y: number; z: number } // normalized 0..1

export const IRIS_MM = 11.7; // Roesler et al. 2022 (ACM ICMI) — diameter iris kiri-kanan identik

// Indeks landmark (MediaPipe FaceMesh canonical):
export const LM = {
  foreheadL: 127, foreheadR: 356,      // lebar dahi
  cheekL: 234, cheekR: 454,            // lebar tulang pipi
  jawL: 172, jawR: 397,                // lebar rahang
  faceTop: 10, chinBottom: 152,        // tinggi wajah
  chinL: 58, chinR: 288,               // lebar dagu
  bridgeTop: 168, bridgeMid: 6, noseTip: 1, subnasale: 4,
  alarL: 129, alarR: 358,              // lebar lubang hidung (alar)
  eyeROuter: 33, eyeRInner: 133, eyeLInner: 362, eyeLOuter: 263,
  eyeRUp: 159, eyeRDown: 145, eyeLUp: 386, eyeLDown: 374,
  browRInner: 70, browRPeak: 105, browROuter: 107,
  browLInner: 300, browLPeak: 334, browLOuter: 337,
  irisR: [468, 469, 470, 471, 472] as const, // 468 = pusat
  irisL: [473, 474, 475, 476, 477] as const, // 473 = pusat
};

export function dist2(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function dist3(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}
export function midpoint(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z ?? 0) + (b.z ?? 0)) / 2 };
}

/** Diameter iris dalam piksel (butuh imageWidth untuk denormalisasi). Iris = 5 titik;
 *  diameter ≈ jarak titik ekstrem kiri-kanan (469↔471 kanan, 474↔476 kiri). */
export function irisDiameterPx(lm: Landmark[], imageWidth: number): { px: number; valid: boolean } {
  const dR = dist2(lm[LM.irisR[1]], lm[LM.irisR[3]]) * imageWidth;
  const dL = dist2(lm[LM.irisL[1]], lm[LM.irisL[3]]) * imageWidth;
  const px = (dR + dL) / 2;
  // invalid bila data iris kosong (semua nol — model tanpa iris refinement) atau tak masuk akal
  const valid = px > 4 && px < imageWidth * 0.25;
  return { px, valid };
}

/** Skala mm/piksel via iris. Fallback ratio_only bila iris invalid. */
export function calibrationScale(lm: Landmark[], imageWidth: number): { mmPerPx: number | null; mode: "iris" | "ratio_only" } {
  const { px, valid } = irisDiameterPx(lm, imageWidth);
  if (!valid) return { mmPerPx: null, mode: "ratio_only" };
  return { mmPerPx: IRIS_MM / px, mode: "iris" };
}

export interface FaceMeasurements {
  forehead_width_cm: number | null;
  cheekbone_width_cm: number | null;
  jaw_width_cm: number | null;
  face_height_cm: number | null;
  face_proportion: string; // "1.3:1.4:1" (dahi:pinggul:rahang ternormalisasi rahang=1)
  calibration: "iris" | "ratio_only";
}

/** Ukuran antropometrik cm (ANSUR II style). Null bila ratio_only. */
export function computeMeasurementsCm(lm: Landmark[], imageWidth: number): FaceMeasurements {
  const { mmPerPx, mode } = calibrationScale(lm, imageWidth);
  const wForehead = dist2(lm[LM.foreheadL], lm[LM.foreheadR]) * imageWidth;
  const wCheek = dist2(lm[LM.cheekL], lm[LM.cheekR]) * imageWidth;
  const wJaw = dist2(lm[LM.jawL], lm[LM.jawR]) * imageWidth;
  const hFace = dist2(lm[LM.faceTop], lm[LM.chinBottom]) * imageWidth;
  const cm = (pxLen: number) => (mmPerPx ? Math.round(((pxLen * mmPerPx) / 10) * 100) / 100 : null);
  const prop = (n: number) => Math.round((n / wJaw) * 10) / 10;
  return {
    forehead_width_cm: cm(wForehead),
    cheekbone_width_cm: cm(wCheek),
    jaw_width_cm: cm(wJaw),
    face_height_cm: cm(hFace),
    face_proportion: `${prop(wForehead)}:${prop(wCheek)}:1`,
    calibration: mode,
  };
}

/** Rasio wajah — HARUS identik semantik dengan extractedRatiosRef lama di CameraScan.tsx
 *  (face_width_to_height, jaw_to_forehead, cheekbone_to_jaw, chin_sharpness). */
export function computeFaceRatios(lm: Landmark[]) {
  const wCheek = dist2(lm[LM.cheekL], lm[LM.cheekR]);
  const wForehead = dist2(lm[LM.foreheadL], lm[LM.foreheadR]);
  const wJaw = dist2(lm[LM.jawL], lm[LM.jawR]);
  const hFace = dist2(lm[LM.faceTop], lm[LM.chinBottom]);
  const wChin = dist2(lm[LM.chinL], lm[LM.chinR]);
  return {
    face_width_to_height: round4(wCheek / hFace),
    jaw_to_forehead: round4(wJaw / wForehead),
    cheekbone_to_jaw: round4(wCheek / wJaw),
    chin_sharpness: round4(wJaw / wCheek), // dipertahankan sesuai definisi lama
    chin_taper: round4(wChin / wJaw),
  };
}

/** Fitur hidung. bridge_curvature: >0 konveks (Roman), <0 cekung (Celestial/Snub).
 *  Dihitung dari profil-z 168→6→1: deviasi z titik tengah terhadap tali busur. */
export function computeNoseFeatures(lm: Landmark[]) {
  const wFace = dist2(lm[LM.cheekL], lm[LM.cheekR]);
  const hFace = dist2(lm[LM.faceTop], lm[LM.chinBottom]);
  const wAlar = dist2(lm[LM.alarL], lm[LM.alarR]);
  const bridgeLen = dist3(lm[LM.bridgeTop], lm[LM.noseTip]);
  const a = lm[LM.bridgeTop], b = lm[LM.bridgeMid], c = lm[LM.noseTip];
  // proyeksi deviasi midpoint dari garis a–c pada sumbu z (dinormalisasi panjang wajah)
  const chord = dist3(a, c) || 1e-6;
  const deviation = Math.abs(((b.z ?? 0) - (a.z ?? 0)) * (c.y - a.y) - ((c.z ?? 0) - (a.z ?? 0)) * (b.y - a.y)) / chord;
  const bridgeCurvatureZ = ((b.z ?? 0) - ((a.z ?? 0) + (c.z ?? 0)) / 2) / hFace; // + konveks, − cekung
  const tipUpturn = (lm[LM.subnasale].y - lm[LM.noseTip].y) / hFace; // >0 ujung terangkat
  return {
    width_to_face: round4(wAlar / wFace),
    length_to_height: round4(bridgeLen / hFace),
    bridge_curvature: round4(bridgeCurvatureZ),
    bridge_linearity: round4(deviation / hFace),
    tip_upturn: round4(tipUpturn),
    alar_to_tip_ratio: round4(wAlar / (dist2(lm[LM.noseTip], lm[LM.subnasale]) || 1e-6)),
  };
}

/** Fitur mata: EAR (aspect ratio buka kelopak) + canthal tilt (derajat). */
export function computeEyeFeatures(lm: Landmark[]) {
  const earOf = (outer: number, inner: number, up: number, down: number) => {
    const w = dist2(lm[outer], lm[inner]) || 1e-6;
    return dist2(lm[up], lm[down]) / w;
  };
  const tiltOf = (outer: number, inner: number) => {
    const dx = lm[outer].x - lm[inner].x;
    const dy = lm[outer].y - lm[inner].y; // layar: y ke bawah positif
    return round4((Math.atan2(-dy, dx) * 180) / Math.PI);
  };
  const interocular = dist2(lm[LM.eyeRInner], lm[LM.eyeLInner]);
  const faceW = dist2(lm[LM.cheekL], lm[LM.cheekR]);
  return {
    ear_right: round4(earOf(LM.eyeROuter, LM.eyeRInner, LM.eyeRUp, LM.eyeRDown)),
    ear_left: round4(earOf(LM.eyeLOuter, LM.eyeLInner, LM.eyeLUp, LM.eyeLDown)),
    canthal_tilt_right: tiltOf(LM.eyeROuter, LM.eyeRInner),
    canthal_tilt_left: tiltOf(LM.eyeLOuter, LM.eyeLInner),
    eye_spacing_ratio: round4(interocular / faceW),
  };
}

/** Fitur alis: arch ratio = (tinggi puncak − garis dasar inner-outer) / panjang alis. */
export function computeBrowFeatures(lm: Landmark[]) {
  const archOf = (inner: number, peak: number, outer: number) => {
    const len = dist2(lm[inner], lm[outer]) || 1e-6;
    const baseY = (lm[inner].y + lm[outer].y) / 2;
    return round4(Math.max(0, baseY - lm[peak].y) / len);
  };
  return {
    arch_ratio_right: archOf(LM.browRInner, LM.browRPeak, LM.browROuter),
    arch_ratio_left: archOf(LM.browLInner, LM.browLPeak, LM.browLOuter),
  };
}

/** Quality gates (ADR-014): pose & pencahayaan. masing-masing |yaw|≤15°, |pitch|≤15°, roll≤10°. */
export function computePose(lm: Landmark[]) {
  const roll = (Math.atan2(lm[LM.cheekR].y - lm[LM.cheekL].y, lm[LM.cheekR].x - lm[LM.cheekL].x) * 180) / Math.PI;
  const yawAsym = Math.abs(dist2(lm[LM.noseTip], lm[LM.cheekL]) - dist2(lm[LM.noseTip], lm[LM.cheekR])) /
    (dist2(lm[LM.cheekL], lm[LM.cheekR]) || 1e-6);
  const yawDeg = round4(yawAsym * 60); // aproksimasi linear, cukup untuk gate 15°
  const eyeMid = midpoint(lm[LM.eyeRInner], lm[LM.eyeLInner]);
  const upper = dist2(lm[LM.faceTop], eyeMid);
  const lower = dist2(eyeMid, lm[LM.chinBottom]);
  const pitchRatioDeviation = Math.abs(upper / (upper + lower) - 0.45); // 0.45 = netral antropometrik
  const pitchDeg = round4(pitchRatioDeviation * 120);
  return { roll_deg: round4(roll), yaw_deg: yawDeg, pitch_deg: pitchDeg };
}

export function round4(n: number): number { return Math.round(n * 10000) / 10000; }

/** Payload lengkap untuk POST /api/v1/analyze/landmarks — HANYA angka, tanpa gambar. */
export interface LandmarkAnalysisPayload {
  face_ratios: ReturnType<typeof computeFaceRatios>;
  measurements_cm: FaceMeasurements;
  nose_features: ReturnType<typeof computeNoseFeatures>;
  eye_features: ReturnType<typeof computeEyeFeatures>;
  brow_features: ReturnType<typeof computeBrowFeatures>;
  quality: ReturnType<typeof computePose> & { luminance: number; face_width_ratio: number };
}

export function buildAnalysisPayload(
  lm: Landmark[], imageWidth: number, luminance: number
): LandmarkAnalysisPayload {
  const wCheekPx = dist2(lm[LM.cheekL], lm[LM.cheekR]) * imageWidth;
  return {
    face_ratios: computeFaceRatios(lm),
    measurements_cm: computeMeasurementsCm(lm, imageWidth),
    nose_features: computeNoseFeatures(lm),
    eye_features: computeEyeFeatures(lm),
    brow_features: computeBrowFeatures(lm),
    quality: { ...computePose(lm), luminance, face_width_ratio: round4(wCheekPx / imageWidth) },
  };
}
```

**Step 2: Verifikasi tipe** — Run: `cd client && npx tsc --noEmit`. Expected: no errors.

**Step 3: Commit** — `git add client/src/lib/faceGeometry.ts && git commit -m "feat: add faceGeometry library for iris-calibrated landmark feature extraction"`

### Task 1.2: `PhotoUpload` — validasi & decode PNG/JPG/JPEG

**Files:**
- Create: `client/src/components/PhotoUpload.tsx`

**Step 1: Tulis komponen.** Validasi: ekstensi `png|jpg|jpeg` (case-insensitive), ukuran ≤ 8 MB, magic bytes (`89 50 4E 47` = PNG, `FF D8 FF` = JPEG) — tolak file yang di-rename saja. Baca via `FileReader` → `dataURL`, decode via `new Image()`, EXIF orientation dibiarkan default browser (modern browser auto-apply via `image-orientation: from-image` CSS; canvas draw memakai dimensi natural). UI: dropzone dashed + tombol pilih file, error message merah, preview thumbnail.

```tsx
"use client";
import { useCallback, useRef, useState } from "react";
import { Upload, AlertCircle } from "lucide-react";

const MAX_BYTES = 8 * 1024 * 1024;

async function sniff(dataUrl: string): Promise<"png" | "jpeg" | null> {
  const res = await fetch(dataUrl);
  const buf = new Uint8Array(await res.arrayBuffer()).subarray(0, 4);
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  return null;
}

export default function PhotoUpload({ onPhotoLoaded }: { onPhotoLoaded: (dataUrl: string, width: number, height: number) => void }) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["png", "jpg", "jpeg"].includes(ext)) return setError("Format harus PNG, JPG, atau JPEG.");
    if (file.size > MAX_BYTES) return setError("Ukuran foto maksimal 8 MB.");
    const dataUrl: string = await new Promise((r, j) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.onerror = j;
      fr.readAsDataURL(file);
    });
    if ((await sniff(dataUrl)) === null) return setError("File bukan PNG/JPEG yang valid.");
    const img = new Image();
    await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = dataUrl; });
    if (img.naturalWidth < 200 || img.naturalHeight < 200) return setError("Resolusi minimal 200×200 piksel.");
    onPhotoLoaded(dataUrl, img.naturalWidth, img.naturalHeight);
  }, [onPhotoLoaded]);

  return (
    <div className="w-full">
      <button type="button" onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-orange-300 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-orange-500 hover:bg-orange-50 transition-colors">
        <Upload className="w-10 h-10 text-orange-500" />
        <span className="font-semibold text-slate-800">Unggah Foto Wajah</span>
        <span className="text-xs text-slate-500">PNG / JPG / JPEG · maks 8 MB · foto frontal, pencahayaan merata</span>
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }} />
      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-600"><AlertCircle className="w-4 h-4" />{error}</p>
      )}
    </div>
  );
}
```

**Step 2:** `npx tsc --noEmit` → no errors. **Step 3:** Commit `feat: add PhotoUpload component with magic-byte validation`.

### Task 1.3: `RepositionTool` — drag / zoom / rotate dengan oval guide

**Files:**
- Create: `client/src/components/RepositionTool.tsx`

**Step 1: Tulis komponen.** Canvas 640×480 (rasio sama dengan video webcam lama). State transform `{ x, y, scale, rotation }` (referensi, bukan state React — pakai `useRef` + `requestAnimationFrame` render loop agar 60fps). Interaksi: pointer-drag = pan; wheel = zoom (clamp 0.2–5); slider rotate −30°..+30°; tombol reset. Overlay: oval guide putus-putus IDENTIK dengan oval guide mode webcam (salin geometri ellipse dari CameraScan.tsx) + label kecil "Selaraskan dahi, mata, dan dagu ke dalam oval". Output: tombol "Analisis Wajah" → render canvas final (gambar ter-transformasi) → `canvas.toDataURL("image/jpeg", 0.92)` + dimensi → `onConfirm(dataUrl, 640, 480)`.

Kode inti (kerangka wajib diikuti; styling Tailwind bebas mengikuti CameraScan):

```tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { RotateCcw, ScanFace } from "lucide-react";

interface Props { photoDataUrl: string; onConfirm: (snapshotDataUrl: string, width: number, height: number) => void; onBack: () => void; }
interface Transform { x: number; y: number; scale: number; rotation: number; }
const W = 640, H = 480;

export default function RepositionTool({ photoDataUrl, onConfirm, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const trRef = useRef<Transform>({ x: W / 2, y: H / 2, scale: 1, rotation: 0 });
  const dragRef = useRef<{ px: number; py: number } | null>(null);
  const [rotation, setRotation] = useState(0);

  const draw = useCallback(() => {
    const cv = canvasRef.current, img = imgRef.current;
    if (!cv || !img) return;
    const ctx = cv.getContext("2d")!;
    const t = trRef.current;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(t.x, t.y); ctx.rotate((t.rotation * Math.PI) / 180); ctx.scale(t.scale, t.scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
    // oval guide — samakan dengan CameraScan (pusat W/2, H*0.46, rx W*0.30, ry H*0.42)
    ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = "#fb923c";
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.46, W * 0.3, H * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // fit awal: skala agar tinggi wajah ~ full oval
      const fit = (H * 0.95) / img.naturalHeight;
      trRef.current = { x: W / 2, y: H / 2, scale: fit, rotation: 0 };
      setRotation(0);
      draw();
    };
    img.src = photoDataUrl;
  }, [photoDataUrl, draw]);

  useEffect(() => { const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id); }, [draw, rotation]);

  // pointer drag → pan; wheel → zoom. (Tambahkan handler onPointerDown/Move/Up dan onWheel
  //  yang memodifikasi trRef lalu memanggil draw() — pola standar, ±25 baris.)

  const confirm = () => {
    const cv = canvasRef.current!;
    draw(); // gambar ulang tanpa oval? TIDAK — snapshot TETAP dengan oval agar analisis
            // mendeteksi wajah terpusat; oval tidak mengganggu FaceLandmarker.
    onConfirm(cv.toDataURL("image/jpeg", 0.92), W, H);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <p className="text-center text-sm text-slate-600">
        Geser (drag), perbesar (scroll), dan putar foto hingga <b>dahi, mata, dan dagu</b> berada di dalam oval.
      </p>
      <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-2xl touch-none cursor-grab" />
      <div className="flex items-center gap-3">
        <input type="range" min={-30} max={30} value={rotation} className="flex-1 accent-orange-500"
          onChange={(e) => { const v = Number(e.target.value); setRotation(v); trRef.current.rotation = v; draw(); }} />
        <button onClick={() => { trRef.current.rotation = 0; setRotation(0); draw(); }} className="p-2 rounded-lg border">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border font-semibold">Ganti Foto</button>
        <button onClick={confirm} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold flex items-center justify-center gap-2">
          <ScanFace className="w-5 h-5" /> Analisis Wajah
        </button>
      </div>
    </div>
  );
}
```

**Step 2:** `npx tsc --noEmit` + `npm run build` → sukses. **Step 3:** Commit `feat: add RepositionTool with drag, zoom, rotate and oval guide overlay`.

### Task 1.4: `CameraScan` dual-mode — tab Webcam/Upload + IMAGE-mode landmark & quality gate

**Files:**
- Modify: `client/src/components/CameraScan.tsx`
- Modify: `client/src/lib/mockData.ts` (extend `UserPersonalProfile` — lihat Fase 3 Task 3.1; di sini hanya tambahkan field opsional agar kompilasi lulus)

**Step 1: Tambah tab mode.** State `mode: "camera" | "upload"`. Tab switcher di atas. Mode `camera` = seluruh alur lama TIDAK DIUBAH (webcam, oval guide, countdown 6 frame stabil, simulasi Indonesia fallback). Pindah tab → bersihkan stream kamera dengan pola lama `stream.getTracks().forEach(t => t.stop())` (ERROR.md #4).

**Step 2: Mode upload → pipeline analisis.** Setelah `RepositionTool.onConfirm`:
1. Buat instance `FaceLandmarker` KEDUA (atau reuse singleton module-scope) dengan konfigurasi sama seperti mode video, lalu `detect(imageElement)` — satu kali, bukan loop.
2. Jika `faceLandmarks[0]` kosong → tampil error "Wajah tidak terdeteksi — perbaiki posisi foto" + tombol kembali ke RepositionTool.
3. Hitung luminance: draw ulang snapshot ke offscreen canvas 64×64, rata-rata `(r+g+b)/3` dari `getImageData`.
4. Quality gate (ADR-014): `|yaw|≤15 ∧ |pitch|≤15 ∧ |roll|≤10 ∧ 60≤luminance≤200 ∧ face_width_ratio≥0.25` memakai `computePose`. Gagal → pesan spesifik ("Kepala terlalu miring — luruskan rotasi foto", "Foto terlalu gelap/terang", "Wajah terlalu kecil dalam frame") + kembali ke reposisi. **Gate tidak memblokir permanen**: sediakan tombol "Lanjutkan Analisis (abaikan peringatan)".
5. Panggil `buildAnalysisPayload(landmarks, 640, luminance)` → simpan sementara di state.
6. Panggil `analyzeLandmarks(payload)` (Task 1.5) → gabungkan hasil dengan skin ROI analysis yang sudah ada (ROI = crop tengah 30% dari snapshot, bukan video) → bentuk `UserPersonalProfile` lengkap → `onScanComplete(profile, undefined)` (mode upload tidak punya stream live; AR studio nanti meminta webcam sendiri — sudah perilaku existing).

**Step 3:** `npm run build` → 4/4 pages. Smoke manual: mode webcam masih normal; mode upload: foto miring → warning muncul; foto baik → progress indikator analisis.

**Step 4:** Commit `feat: add dual-mode input with photo upload pipeline and quality gates in CameraScan`.

### Task 1.5: `api.ts` — `analyzeLandmarks` dengan fallback rantai lama

**Files:**
- Modify: `client/src/lib/api.ts`

**Step 1:** Tambah fungsi + tipe response (mirror skema server Fase 2 — definisikan interface `LandmarkAnalysisResult` di sini dengan semua field nullable-safe, akses selalu via `?.`):

```typescript
export async function analyzeLandmarks(payload: unknown): Promise<LandmarkAnalysisResult> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/analyze/landmarks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    // Fallback rantai lama: endpoint ratios (dan mock preset lokal) — jalur webcam lama tetap hidup
    return analyzeRatiosFallback(payload); // bungkus panggilan /analyze/ratios yang sudah ada
  }
}
```

**Step 2:** `npx tsc --noEmit`. **Step 3:** Commit `feat: add analyzeLandmarks client API with legacy fallback chain`.

### Task 1.6: Gerbang akhir Fase 1

- `cd client && npm run build` → sukses; `docker compose up -d --build` → kedua container healthy.
- Checklist manual (catat di commit message body): upload PNG & JPEG valid; file `.txt` di-rename `.png` DITOLAK; drag/zoom/rotate berfungsi (mouse + touch); snapshot mengandung oval; wajah tidak terdeteksi → pesan error + retry; webcam mode regresi aman.
- Commit: `test: verify dual-mode input end-to-end (manual checklist fase 1)`.

---

# FASE 2 — Backend & Vision Engine (est. 6–7 jam, selesai maks. 24 Agu siang) — TDD KETAT

**Tujuan fase:** `ai_engine/models/face_analyzer.py` (klasifikasi nose/eye/brow + Diamond override + PillarJustifier) dan endpoint `POST /api/v1/analyze/landmarks`, semuanya pytest-verified. Semua task: tulis test GAGAL dulu → implement → LULUS → commit.

**File test tunggal:** `server/tests/test_face_analyzer.py` (dibuat di Task 2.1, ditumbuhkan per task).

### Task 2.1: Skema Pydantic + file test skeleton

**Files:**
- Create: `server/tests/test_face_analyzer.py`
- Modify: `server/app/schemas.py`

**Step 1 (test dulu):**

```python
# server/tests/test_face_analyzer.py
"""TDD suite untuk Multi-Dimensional Face Analyzer (ADR-014) dan endpoint /analyze/landmarks."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _payload(**overrides):
    base = {
        "face_ratios": {"face_width_to_height": 0.78, "jaw_to_forehead": 0.85,
                        "cheekbone_to_jaw": 1.18, "chin_sharpness": 0.85, "chin_taper": 0.55},
        "measurements_cm": {"forehead_width_cm": 12.9, "cheekbone_width_cm": 14.9,
                            "jaw_width_cm": 12.6, "face_height_cm": 22.1,
                            "face_proportion": "1.0:1.2:1", "calibration": "iris"},
        "nose_features": {"width_to_face": 0.24, "length_to_height": 0.32, "bridge_curvature": 0.02,
                          "bridge_linearity": 0.03, "tip_upturn": 0.08, "alar_to_tip_ratio": 1.4},
        "eye_features": {"ear_right": 0.33, "ear_left": 0.32, "canthal_tilt_right": 2.0,
                         "canthal_tilt_left": 2.0, "eye_spacing_ratio": 0.35},
        "brow_features": {"arch_ratio_right": 0.16, "arch_ratio_left": 0.15},
        "quality": {"roll_deg": 1.0, "yaw_deg": 2.0, "pitch_deg": 3.0,
                    "luminance": 120.0, "face_width_ratio": 0.38},
    }
    base.update(overrides)
    return base


class TestSchemas:
    def test_landmark_payload_valid(self):
        from app.schemas import LandmarkAnalysisRequest
        req = LandmarkAnalysisRequest(**_payload())
        assert req.face_ratios.cheekbone_to_jaw == 1.18

    def test_landmark_payload_rejects_missing_block(self):
        from app.schemas import LandmarkAnalysisRequest
        p = _payload(); del p["nose_features"]
        with pytest.raises(Exception):
            LandmarkAnalysisRequest(**p)
```

**Step 2:** Run `python -m pytest tests/test_face_analyzer.py -v` → **FAIL** (`ImportError: LandmarkAnalysisRequest`).

**Step 3 (implement minimal):** tambah ke `server/app/schemas.py` — nested models `FaceRatiosIn`, `MeasurementsIn`, `NoseFeaturesIn`, `EyeFeaturesIn`, `BrowFeaturesIn`, `QualityIn`, dan `LandmarkAnalysisRequest` berisi keenam blok (semua field `float`/`str` dengan tipe eksplisit; `measurements_cm.*_cm: float | None`). Sertakan `ClassificationOut {label: str, label_id: str, confidence: float, rule: str | None}` dan `LandmarkAnalysisResponse` (bentuk final lihat Task 2.8).

**Step 4:** Run → **PASS** (2 passed). **Step 5:** Commit `test: add schema tests and Pydantic models for landmark analysis payload`.

### Task 2.2: Diamond override pada face shape 6 kelas

**Files:**
- Create: `ai_engine/models/face_analyzer.py`
- Test: `server/tests/test_face_analyzer.py` (append class `TestFaceShapeDiamond`)

**Step 1 (test):**

```python
class TestFaceShapeDiamond:
    def test_diamond_override_triggered(self):
        from ai_engine.models.face_analyzer import classify_face_shape
        ratios = {"face_width_to_height": 0.72, "jaw_to_forehead": 0.75,
                  "cheekbone_to_jaw": 1.34, "chin_sharpness": 0.75, "chin_taper": 0.50}
        out = classify_face_shape(ratios)
        assert out["shape"] == "Diamond"
        assert out["method"] == "rule_override"
        assert out["confidence"] >= 0.80

    def test_diamond_not_triggered_for_oval(self):
        from ai_engine.models.face_analyzer import classify_face_shape
        ratios = {"face_width_to_height": 0.75, "jaw_to_forehead": 0.90,
                  "cheekbone_to_jaw": 1.05, "chin_sharpness": 0.90, "chin_taper": 0.60}
        out = classify_face_shape(ratios)
        assert out["shape"] != "Diamond"
        assert out["method"] in ("random_forest", "rule_based")  # jalur lama

    def test_oblong_label_mapped_to_indonesian(self):
        from ai_engine.models.face_analyzer import classify_face_shape
        ratios = {"face_width_to_height": 0.62, "jaw_to_forehead": 0.95,
                  "cheekbone_to_jaw": 1.02, "chin_sharpness": 0.95, "chin_taper": 0.62}
        out = classify_face_shape(ratios)
        assert out["shape"] == "Oblong"
        assert "Oblong" in out["label_indonesian"]  # "Oblong (Persegi Panjang)"
```

**Step 2:** Run → FAIL (module not found).

**Step 3 (implement):** `ai_engine/models/face_analyzer.py` berisi `classify_face_shape(ratios)` yang MEMANGGIL `FaceShapeClassifier` lama (`face_classifier.py`) → jika hasil bukan Diamond, evaluasi rule override: `cheekbone_to_jaw ≥ 1.30 ∧ jaw_to_forehead ≤ 0.78 ∧ chin_sharpness ≤ 0.58` → Diamond. Enrichment: `label_indonesian` mapping 6 kelas (Oval, Round/Bulat, Square/Kotak, Heart/Hati, Diamond/Wajah Berlian, Oblong/Persegi Panjang), `confidence` (override = 0.82 + margin; RF lama = apa adanya). Kunci DRY: JANGAN duplikasi logika klasifikasi lama — wrap saja.

**Step 4:** Run → PASS. **Step 5:** Commit `feat: add 6-class face shape classification with Diamond rule override`.

### Task 2.3: `NoseClassifier` — 5 tipe hidung

**Test vectors WAJIB** (append `TestNoseClassifier`, gaya sama seperti 2.2):

| Kondisi fitur | Expected |
|---|---|
| `bridge_curvature=+0.16`, width normal | `Roman (Lengkung)` |
| `bridge_curvature=-0.16`, `tip_upturn=0.20`, `width_to_face=0.24` | `Celestial-Button (Mancung Mungil)` |
| `bridge_curvature=-0.14`, `width_to_face=0.31`, `tip_upturn=0.05` | `Broad-Snub (Pesek Lebar)` |
| `bridge_curvature=0.01`, `width_to_face=0.33`, `alar_to_tip_ratio=1.8` | `Bulbous (Bulat)` |
| `bridge_curvature=0.02`, `width_to_face=0.24`, sisinya normal | `Greek (Mancung)` — baseline |
| semua nilai nol (fitur tak valid) | fallback `Greek (Mancung)` + `confidence ≤ 0.5` + `rule="fallback"` |

Implementasi = rule engine berurutan (curvature → width → default), confidence = margin terhadap threshold terdekat (skala 0.55–0.95), setiap hasil menyertakan `rule` string deskriptif (untuk ditampilkan juri). Tulis test → FAIL → implement `class NoseClassifier: @staticmethod classify(nose_features) -> dict` → PASS → commit `feat: add nose type rule-engine classifier (5 taxonomic classes)`.

### Task 2.4: `EyeShapeClassifier` — Almond / Round / Cat-eye / Downturned

Rules: `ear = (ear_right+ear_left)/2`; `tilt = (tilt_right+tilt_left)/2` (derajat, positif = ekstrim lebih tinggi).
- `ear > 0.38 ∧ |tilt| < 8` → `Round (Bulat)`
- `tilt ≥ 8` → `Cat-eye (Mata Kucing)` (EAR bebas)
- `tilt ≤ -8` → `Downturned (Menurun)`
- else → `Almond (Almond)` — baseline, confidence tertinggi saat dekat pusat rule.

Test vectors: (0.41, +2°)→Round; (0.30, +12°)→Cat-eye; (0.33, −10°)→Downturned; (0.32, +3°)→Almond; ear 0.0 (invalid)→Almond confidence rendah + fallback. Siklus TDD sama → commit `feat: add eye shape classifier via EAR and canthal tilt`.

### Task 2.5: `BrowClassifier` — Arched / Straight / Soft Curve

Rules: `arch = (right+left)/2`: `> 0.20` → `Arched (Tegak)`; `< 0.10` → `Straight (Lurus)`; else `Soft Curve (Lengkung Lembut)` (baseline). Test vectors: (0.26, 0.24)→Arched; (0.07, 0.08)→Straight; (0.15, 0.16)→Soft Curve; (0.0, 0.0) invalid→Soft Curve fallback. TDD → commit `feat: add brow shape classifier via arch-height ratio`.

### Task 2.6: `PillarJustifier` — justifikasi ilmiah 3 pilar (ADR-016)

**Test:** untuk input `{"face_shape": "Diamond", "undertone": "Warm", "nose": "Broad-Snub (Pesek Lebar)"}`:
1. `justify_pillar(1, ctx)["principle"]` menyebut kontras siluet frame vs bentuk wajah; `scientific_basis` menyebut rasio antropometrik; `application` menyebut strategi frame (Diamond → frame lebar brow-line, hindari frame sempit).
2. Pillar 2 (`undertone`) → material warna (Warm → emas/steel hangat, hindari silver dingin), basis CIELAB/undertone.
3. Pillar 3 (`nose`) → ergonomi fit (Broad-Snub → low bridge / keyhole bridge / pad ajustabel), basis jarak bridge & alar.
4. Semua 3 pilar: field `pillar: int`, `title: str`, `principle/basis/application: str`, `title` bahasa Indonesia.

Implementasi: `class PillarJustifier` dengan dict template + `.format()` konteks (murni string composition, deterministik, tanpa LLM). TDD → commit `feat: add three-pillar scientific justifier for face-driven accessory matching`.

### Task 2.7: `FaceAnalyzer.analyze()` orchestrator + mock preset multi-dimensi

**Test:** `FaceAnalyzer.analyze(_payload())` mengembalikan dict dengan keys `face_shape, nose, eye, brow, measurements, pillars, narrative, meta`; `meta["engine_version"] == "2.0.0"`; `pillars` length 3; `narrative["summary"]` string non-kosong berbahasa Indonesia yang menyebut label bentuk wajah; input measurements `calibration="iris"` di-echo. **Mock**: `MockDataGenerator` lama diberi preset baru `"indonesian_multi_dim"` (ubah file tempat `MockDataGenerator` didefinisikan — cek import di `server/app/api/v1/analyze.py:48`; pertahankan preset lama utuh) berisi blok payload `_payload()` di atas + expected labels; test `get_preset("indonesian_multi_dim")` mengembalikan semua blok.

Implementasi: `class FaceAnalyzer: @staticmethod analyze(payload: LandmarkAnalysisRequest) -> dict` = panggil classify_face_shape + Nose/Eye/Brow + PillarJustifier + susun narrative (template per bentuk wajah — daftar `flattering_advice` lama di `face_classifier.py` boleh di-reuse sebagai DRY source). TDD → commit `feat: add FaceAnalyzer orchestrator with multi-dimension narrative and mock preset`.

### Task 2.8: Endpoint `POST /api/v1/analyze/landmarks`

**Files:**
- Modify: `server/app/api/v1/analyze.py`
- Test append `TestLandmarksEndpoint`

**Test (integration, TestClient):**
1. `POST /api/v1/analyze/landmarks` dengan `_payload()` → 200; `data["face_shape"]["shape"] in {"Oval","Round","Square","Heart","Diamond","Oblong"}`; `data["nose"]["label"]` string; `data["pillars"]` len 3; `data["meta"]["source"] == "engine"`.
2. Payload tanpa `brow_features` → 422 (validasi Pydantic).
3. `monkeypatch` `FaceAnalyzer.analyze` raise → 200 dengan `meta["source"] == "mock"` dan `nose["label"]` non-kosong (pola fallback persis endpoint lama — deterministik untuk juri).
4. Regression: GET `/health` → 200.

**Implementasi:** router function dengan `try: FaceAnalyzer.analyze(req.dict()) except Exception: preset "indonesian_multi_dim"` + log warning. Register router bila perlu (analyze router sudah terpasang — cukup tambah fungsi). **Regression penuh:** `python -m pytest tests/ -v` → **16+ passed, 0 failed**. Commit `feat: add POST /api/v1/analyze/landmarks endpoint with engine-to-mock fallback`.

### Task 2.9: Gerbang akhir Fase 2

- `docker compose up -d --build coba-backend-server` → healthy; `curl http://localhost:8000/api/v1/analyze/landmarks -H "Content-Type: application/json" -d @sample_payload.json` → 200 JSON (buat `server/tests/sample_payload.json` dari `_payload()`; file ini juga dipakai demo juri).
- Cek `/docs` Swagger menampilkan endpoint baru.
- Commit gerbang: `test: verify landmark analysis endpoint in docker (fase 2 gate)`.

---

# FASE 3 — Laporan Analisis / Report Card (est. 4–5 jam, selesai maks. 24 Agu malam)

**Tujuan fase:** halaman REPORT di antara SCAN dan QUIZ — kartu laporan agency-grade dengan anotasi geometri di atas foto, grid badge metrik, 3 pilar justifikasi, narasi + tips, CTA ke kuesioner.

### Task 3.1: Extend `UserPersonalProfile` + step machine REPORT

**Files:**
- Modify: `client/src/lib/mockData.ts:43-49` (interface), `MOCK_PRESETS`
- Modify: `client/src/app/page.tsx` (step machine `SCAN → REPORT → QUIZ`)

**Step 1:** Tambah field opsional (semua `?` — regresi nol untuk jalur lama): `nose_type?: string; eye_shape?: string; brow_shape?: string; face_measurements?: { forehead_width_cm: number | null; cheekbone_width_cm: number | null; jaw_width_cm: number | null; face_height_cm: number | null; face_proportion: string; calibration: "iris" | "ratio_only" }; face_analysis_meta?: { confidence: number; source: string }; scan_snapshot_dataurl?: string;` (snapshot disimpan HANYA di React state sesi — bukan localStorage gambar; ADR-015). Update `MOCK_PRESETS.indonesia_warm_sawo_matang.profile` dengan nilai multi-dimensi mock.
**Step 2:** `page.tsx`: tambah step `"REPORT"`; `handleScanComplete` tidak lagi langsung ke quiz — simpan profile+snapshot, pindah ke REPORT. Props `onProceedToQuiz` dari ReportCard → step QUIZ.
**Step 3:** `npm run build`. **Step 4:** Commit `feat: add REPORT step and extend UserPersonalProfile with multi-dimension fields`.

### Task 3.2: `FaceReportCard` — anotasi geometri SVG di atas snapshot

**Files:**
- Create: `client/src/components/FaceReportCard.tsx`
- Modify: `client/src/app/page.tsx` (render pada step REPORT)

**Step 1: Komponen anotasi.** Snapshot wajah (atau placeholder ikon bila webcam mode tanpa snapshot) di dalam rounded card; overlay SVG absolute-inset: 3 garis horizontal kuning (`stroke="#facc15"`, `strokeDasharray`) pada posisi dahi / tulang pipi / rahang dengan label kanan: `Lebar Dahi 13.98 cm` dsb. (angka dari `face_measurements`; bila `calibration === "ratio_only"` tampil badge "Mode Rasio (tanpa skala cm)" dan garis tetap tampil proporsional). Posisi garis: proporsional dari `face_proportion` (top=22%, cheek=48%, jaw=72% tinggi card) — statis namun terlihat presisi. Judul kartu: "Laporan Analisis Wajah Anda". Badge kalibrasi: "Terkalibrasi Iris 11,7 mm ✓".

**Step 2:** Grid badge metrik (referensi visual `docs/design_references/face_features_grid_badges.png`): 5 kartu kecil — Bentuk Wajah / Tipe Hidung / Bentuk Mata / Bentuk Alis / Rona Kulit (MST) — masing-masing ikon lucide + label + nilai `profile?.field ?? "—"`.

**Step 3:** Bagian 3 pilar: 3 kartu bernomor dengan `title` + `application` dari response `pillars` (fallback teks statis bila null) + strip narasi `narrative.summary` + 3 bullet tips (dari `flattering_advice` lama yang di-echo server atau fallback klien).

**Step 4:** CTA besar: "Lanjut ke Kuesioner Personalisasi →" → `onProceedToQuiz()`; tombol sekunder "Pindai Ulang".

**Step 5:** `npm run build` + smoke manual (jalur webcam mock: laporan tampil tanpa TypeError — akses `?.` di semua field baru; jalur upload: garis anotasi & angka cm tampil). Commit `feat: add agency-grade FaceReportCard with geometric annotations and pillar cards`.

### Task 3.3: Wire data ReportCard ← analyzeLandmarks response

**Files:**
- Modify: `client/src/app/page.tsx`, `client/src/components/CameraScan.tsx` (simpan response pillars/narrative ke profile state via field `face_analysis_meta` + state `faceAnalysis` di page)

**Step 1:** Naikkan hasil `analyzeLandmarks` (pillars, narrative, confidences) ke state `page.tsx`; oper ke `FaceReportCard`. Semua akses `?.` + fallback. **Step 2:** `npm run build`; smoke kedua jalur. **Step 3:** Commit `feat: wire landmark analysis response into report card with safe fallbacks`.

### Task 3.4: Gerbang akhir Fase 3

Checklist manual penuh 2 jalur (webcam-mock & upload) + build + `pytest tests/ -v` tetap hijau. Commit `test: verify report card flow end-to-end (fase 3 gate)`.

---

# FASE 4 — Integrasi Kuesioner & 3D AR (est. 6–8 jam, selesai maks. 25 Agu sore) — LADDER DESCOPE BERLAKU

**Urutan task = urutan prioritas.** Bila 25 Agu 12:00 WIB status di bawah Task 4.3, EKSEKUSI DESCOPE: selesaikan 4.1–4.2 saja, lewati 4.3–4.5, lompat ke 4.6 (AR memakai geometri prosedural lama + manifest GLB sebagai "katalog siap upgrade").

### Task 4.1: Injeksi profil multi-dimensi ke prompt Gemini

**Files:**
- Modify: `server/app/services/gemini_service.py` (system/persona prompt builder)
- Modify: `server/app/api/v1/questions.py` bila prompt dirakit di sana (cek dulu dengan Grep `"stylist"`)

**Step 1 (test dulu — append `TestGeminiPromptInjection`):** fungsi `build_stylist_context(profile: dict) -> str` menghasilkan string yang: menyebut bentuk wajah, tipe hidung, bentuk mata+alis, undertone, dan ukuran cm bila ada; TIDAK menyebut bila field None (tanpa "None" literal). Dua test: profil lengkap → semua 5 label muncul; profil lama tanpa field baru → tidak ada kata "None"/"undefined".
**Step 2:** FAIL → implement (string builder sederhana; Gemini call tidak di-unit-test — hanya context builder) → PASS.
**Step 3:** Intergrasi: context builder dipanggil di tempat persona stylist dirakit. Commit `feat: inject multi-dimension face profile into Gemini stylist context`.

### Task 4.2: `scripts/download_3d_assets.py` + manifest GLB

**Files:**
- Create: `scripts/download_3d_assets.py`
- Create: `client/public/models/manifest.json`

**Step 1:** Script Python stdlib-only (`urllib.request`, `json`, `hashlib`, `argparse`): daftar ASSET_REGISTRY (8 entri — `hat_baseball_cap`, `hat_beanie`, `hat_bucket`, `hat_fedora`, `hat_beret`, `glasses_wayfarer`, `glasses_aviator`, `glasses_round`) masing-masing `{file, source_url, source_name, license, sha256}`; unduh ke `client/public/models/`, verifikasi sha256, tulis `manifest.json` berisi metadata kurasi: `frame_type, material, occasion, price_tier, lens_silhouette, bridge_type` per item + `generated_at`. Flag `--dry-run` (cetak rencana unduhan tanpa jaringan — untuk review) dan `--verify-only`. URL sumber: Poly Pizza / Quaternius (CC0) — isi konkret saat eksekusi dengan mencari asset yang benar-benar ada; KIRIM sha256 hasil unduhan pertama ke registry agar deterministik. **Tidak ada aset = jangan gagalkan fase**: script tetap menghasilkan manifest kosong-valid + warning, dan AR fallback prosedural tetap berjalan.
**Step 2:** Test manual: `python scripts/download_3d_assets.py --dry-run` → tabel 8 baris; `--verify-only` sebelum dan sesudah unduh.
**Step 3:** Commit `feat: add CC0 3D asset download script with sha256 verification and curated manifest`.

### Task 4.3: GLTFLoader + fallback prosedural di `ARCanvasViewer`

**Files:**
- Modify: `client/src/components/ARCanvasViewer.tsx` (cek nama file aktual dengan Glob `client/src/components/AR*`)

**Step 1:** Muat `manifest.json`; bila item `.glb` tersedia (fetch HEAD 200) → `GLTFLoader.loadAsync`, `MeshStandardMaterial` PBR otomatis dari glTF; else → geometri prosedural lama (JANGAN dihapus — itu fallback resmi). Normalisasi skala: hitung bounding box GLB → scale agar lebar model = fraksi tetap dari jarak inter-okular landmark (33↔263) → konsisten antar model.
**Step 2:** Build + smoke: pilih topi/kacamata dengan & tanpa file glb (rename sementara satu file) → keduanya render. Commit `feat: load curated GLB accessories via GLTFLoader with procedural fallback`.

### Task 4.4: Head occluder (depth masking)

**Step 1:** Bangun mesh occluder dari geometri bola yang di-fit ke 478 landmark (skala dari bounding box wajah), material `MeshBasicMaterial({ colorWrite: false, depthWrite: true, depthTest: true })`, renderOrder paling awal — potong bagian belakang/dalam aksesoris secara alami (teknik referensi ERROR.md/Last_note Section 3).
**Step 2:** Smoke visual: topi tidak lagi "menembus" dahi saat yaw besar. Commit `feat: add invisible head occluder for realistic depth masking`.

### Task 4.5: Kalibrasi anchor topi (crown) 

**Step 1:** Anchor topi = centroid landmark 10 (dahi atas) + 234/454 (tragus kiri/kanan): posisi Y = rata-rata y(10) − offset proporsional jarak 234↔454 × 0.55; rotasi mengikuti basis vektor (234→454, 10→152). Haluskan dengan lerp 0.42 yang sudah ada.
**Step 2:** Smoke yaw/pitch/roll ±30°. Commit `feat: calibrate hat crown anchor from cranial landmark triangle`.

### Task 4.6: Gerbang akhir Fase 4 + regresi total submission

- `docker compose up -d --build` penuh; `pytest tests/ -v` hijau; `npm run build` hijau.
- Alur lengkap manual: Kategori → Scan (webcam) → Report → Quiz (+soal kontekstual hidung/mata) → Processing → AR (switch Top-4, occlusion OK) DAN alur upload penuh.
- Cek compliance: Grep seluruh diff untuk nama institusi (harus nihil); footer "Zero Persistent Biometrics" masih benar.
- Commit final: `chore: full-stack regression for face analysis overhaul (submission gate)`.

---

## DESCOPE LADDER (ringkasan, dari ADR/Rencana yang disetujui)

| Kondisi waktu | Potong |
|---|---|
| Tertinggal ≤ 2 jam dari jadwal | Task 4.5 (anchor halus → anchor lama + offset tetap) |
| Tertinggal > 2 jam pada 25 Agu 12:00 | Task 4.3–4.5 (AR = prosedural lama + manifest GLB "siap upgrade") |
| Tertinggal parah 25 Agu 18:00 | Fase 4 = Task 4.1 (injeksi prompt) + 4.2 (manifest) saja — keduanya murah & bernilai rubric |

## DEFINITION OF DONE (keseluruhan)

1. 12+ test server lama TIDAK regresi + suite baru hijau (target ≥ 30 total).
2. Dua jalur input (webcam & upload+reposisi) end-to-end sampai AR.
3. Report Card menampilkan: anotasi cm terkalibrasi, 5 badge, 3 pilar, narasi, CTA.
4. Nol gambar wajah meninggalkan perangkat klien (verifikasi: payload request hanya angka — cek tab Network).
5. Zero institution identity di seluruh diff; Conventional Commits 100%.
