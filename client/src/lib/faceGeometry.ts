/**
 * faceGeometry.ts — Ekstraksi fitur geometri wajah dari 478 landmark MediaPipe
 * (FaceLandmarker dengan iris refinement: 468 titik wajah + 10 titik iris).
 *
 * Semua fungsi murni (pure) — tidak menyentuh DOM — sehingga mudah diverifikasi.
 * Kalibrasi skala memakai diameter iris konstan 11,7 mm (Roesler et al. 2022, ACM ICMI;
 * konsisten dengan dokumentasi MediaPipe Iris, error jarak < 10%).
 *
 * Perjananan output: payload yang dikirim ke server HANYA berisi angka fitur turunan —
 * tidak pernah ada gambar wajah (kepatuhan UU PDP No. 27/2022, ADR-014).
 */

export interface Landmark {
  x: number; // normalized 0..1
  y: number;
  z: number; // relative depth (MediaPipe normalized z)
}

/** Diameter iris horizontal konstan (mm) — dasar kalibrasi cm. */
export const IRIS_MM = 11.7;

/* ------------------------------------------------------------------ */
/*  Canonical landmark indices (MediaPipe FaceMesh 478-point set)      */
/* ------------------------------------------------------------------ */
export const LM = {
  // Lebar wajah
  foreheadL: 127,
  foreheadR: 356, // lebar dahi
  cheekL: 234,
  cheekR: 454, // lebar tulang pipi (zygion)
  jawL: 172,
  jawR: 397, // lebar rahang (gonion)
  faceTop: 10,
  chinBottom: 152, // tinggi wajah (trichion-ish → menton)
  chinL: 58,
  chinR: 288, // lebar dagu
  // Hidung
  bridgeTop: 168, // pangkal hidung di antara mata
  bridgeMid: 6, // tengah punggung hidung
  noseTip: 1, // ujung hidung (pronasale)
  subnasale: 4,
  alarL: 129,
  alarR: 358, // lebar alar (lubang hidung)
  // Mata
  eyeROuter: 33,
  eyeRInner: 133,
  eyeLInner: 362,
  eyeLOuter: 263,
  eyeRUp: 159,
  eyeRDown: 145,
  eyeLUp: 386,
  eyeLDown: 374,
  // Alis
  browRInner: 70,
  browRPeak: 105,
  browROuter: 107,
  browLInner: 300,
  browLPeak: 334,
  browLOuter: 337,
  // Iris (5 titik per iris: pusat + 4 tepi; indeks 468-477)
  irisR: [468, 469, 470, 471, 472] as const,
  irisL: [473, 474, 475, 476, 477] as const,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function dist2(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dist3(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

export function midpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
  };
}

/* ------------------------------------------------------------------ */
/*  Kalibrasi iris → cm                                               */
/* ------------------------------------------------------------------ */

/** Diameter iris rata-rata (kanan+kiri) dalam piksel; `valid=false` bila
 *  model mengembalikan data iris kosong/nol atau nilai tak masuk akal. */
export function irisDiameterPx(lm: Landmark[], imageWidth: number): { px: number; valid: boolean } {
  const dR = dist2(lm[LM.irisR[1]], lm[LM.irisR[3]]) * imageWidth;
  const dL = dist2(lm[LM.irisL[1]], lm[LM.irisL[3]]) * imageWidth;
  const px = (dR + dL) / 2;
  const valid = px > 4 && px < imageWidth * 0.25;
  return { px, valid };
}

/** mm_per_px = 11,7 / diameter_iris_px. Fallback `ratio_only` bila iris invalid. */
export function calibrationScale(
  lm: Landmark[],
  imageWidth: number
): { mmPerPx: number | null; mode: "iris" | "ratio_only" } {
  const { px, valid } = irisDiameterPx(lm, imageWidth);
  if (!valid) return { mmPerPx: null, mode: "ratio_only" };
  return { mmPerPx: IRIS_MM / px, mode: "iris" };
}

export interface FaceMeasurements {
  forehead_width_cm: number | null;
  cheekbone_width_cm: number | null;
  jaw_width_cm: number | null;
  face_height_cm: number | null;
  /** Proporsi dahi:pinggul:rahang ternormalisasi rahang = 1 (mis. "1.3:1.4:1"). */
  face_proportion: string;
  calibration: "iris" | "ratio_only";
}

/** Ukuran antropometrik (gaya ANSUR II) dalam cm. Nilai null bila ratio_only. */
export function computeMeasurementsCm(lm: Landmark[], imageWidth: number): FaceMeasurements {
  const { mmPerPx, mode } = calibrationScale(lm, imageWidth);
  const wForehead = dist2(lm[LM.foreheadL], lm[LM.foreheadR]) * imageWidth;
  const wCheek = dist2(lm[LM.cheekL], lm[LM.cheekR]) * imageWidth;
  const wJaw = dist2(lm[LM.jawL], lm[LM.jawR]) * imageWidth;
  const hFace = dist2(lm[LM.faceTop], lm[LM.chinBottom]) * imageWidth;
  const cm = (pxLen: number): number | null =>
    mmPerPx ? Math.round(((pxLen * mmPerPx) / 10) * 100) / 100 : null;
  const prop = (n: number): number => Math.round((n / (wJaw || 1e-6)) * 10) / 10;
  return {
    forehead_width_cm: cm(wForehead),
    cheekbone_width_cm: cm(wCheek),
    jaw_width_cm: cm(wJaw),
    face_height_cm: cm(hFace),
    face_proportion: `${prop(wForehead)}:${prop(wCheek)}:1`,
    calibration: mode,
  };
}

/* ------------------------------------------------------------------ */
/*  Rasio wajah — semantik identik dengan extractedRatiosRef lama      */
/*  (faceGeometry konsisten dengan jalur klasifikasi server lama)      */
/* ------------------------------------------------------------------ */
export interface FaceRatios {
  face_width_to_height: number;
  jaw_to_forehead: number;
  cheekbone_to_jaw: number;
  /** Definisi lama CameraScan: lebar_dagu / lebar_rahang. */
  chin_sharpness: number;
  /** Tambahan multi-dimensi: lebar_dagu / lebar_pipi. */
  chin_taper: number;
}

export function computeFaceRatios(lm: Landmark[]): FaceRatios {
  const wCheek = dist2(lm[LM.cheekL], lm[LM.cheekR]);
  const wForehead = dist2(lm[LM.foreheadL], lm[LM.foreheadR]);
  const wJaw = dist2(lm[LM.jawL], lm[LM.jawR]);
  const hFace = dist2(lm[LM.faceTop], lm[LM.chinBottom]);
  const wChin = dist2(lm[LM.chinL], lm[LM.chinR]);
  return {
    face_width_to_height: round4(wCheek / Math.max(1e-6, hFace)),
    jaw_to_forehead: round4(wJaw / Math.max(1e-6, wForehead)),
    cheekbone_to_jaw: round4(wCheek / Math.max(1e-6, wJaw)),
    chin_sharpness: round4(wChin / Math.max(1e-6, wJaw)),
    chin_taper: round4(wChin / Math.max(1e-6, wCheek)),
  };
}

/* ------------------------------------------------------------------ */
/*  Fitur hidung (rule engine server: Greek/Roman/Bulbous/Broad-Snub/  */
/*  Celestial-Button)                                                  */
/* ------------------------------------------------------------------ */
export interface NoseFeatures {
  width_to_face: number;
  length_to_height: number;
  /** >0 punggung konveks (Roman), <0 cekung (Celestial/Snub). */
  bridge_curvature: number;
  /** Kolinearitas 168-6-1 (makin kecil makin lurus = Greek). */
  bridge_linearity: number;
  /** >0 ujung hidung terangkat (upturned). */
  tip_upturn: number;
  alar_to_tip_ratio: number;
}

export function computeNoseFeatures(lm: Landmark[]): NoseFeatures {
  const wFace = dist2(lm[LM.cheekL], lm[LM.cheekR]);
  const hFace = dist2(lm[LM.faceTop], lm[LM.chinBottom]);
  const wAlar = dist2(lm[LM.alarL], lm[LM.alarR]);
  const bridgeLen = dist3(lm[LM.bridgeTop], lm[LM.noseTip]);
  const a = lm[LM.bridgeTop];
  const b = lm[LM.bridgeMid];
  const c = lm[LM.noseTip];
  // Deviasi titik tengah punggung (6) dari tali busur 168→1 (proyeksi segitiga, dinormalisasi)
  const chord = dist3(a, c) || 1e-6;
  const deviation =
    Math.abs(
      (b.z - a.z) * (c.y - a.y) - (c.z - a.z) * (b.y - a.y)
    ) / chord;
  const bridgeCurvatureZ = (b.z - (a.z + c.z) / 2) / Math.max(1e-6, hFace);
  const tipUpturn = (lm[LM.subnasale].y - lm[LM.noseTip].y) / Math.max(1e-6, hFace);
  return {
    width_to_face: round4(wAlar / Math.max(1e-6, wFace)),
    length_to_height: round4(bridgeLen / Math.max(1e-6, hFace)),
    bridge_curvature: round4(bridgeCurvatureZ),
    bridge_linearity: round4(deviation / Math.max(1e-6, hFace)),
    tip_upturn: round4(tipUpturn),
    alar_to_tip_ratio: round4(wAlar / Math.max(1e-6, dist2(lm[LM.noseTip], lm[LM.subnasale]))),
  };
}

/* ------------------------------------------------------------------ */
/*  Fitur mata: EAR (eye aspect ratio) + canthal tilt (derajat)        */
/* ------------------------------------------------------------------ */
export interface EyeFeatures {
  ear_right: number;
  ear_left: number;
  /** Derajat; positif = sudut luar mata lebih tinggi (upturned). */
  canthal_tilt_right: number;
  canthal_tilt_left: number;
  eye_spacing_ratio: number;
}

export function computeEyeFeatures(lm: Landmark[]): EyeFeatures {
  const earOf = (outer: number, inner: number, up: number, down: number): number => {
    const w = dist2(lm[outer], lm[inner]) || 1e-6;
    return dist2(lm[up], lm[down]) / w;
  };
  const tiltOf = (outer: number, inner: number): number => {
    const dx = lm[outer].x - lm[inner].x;
    const dy = lm[outer].y - lm[inner].y; // sumbu y layar positif ke bawah
    return round4((Math.atan2(-dy, dx) * 180) / Math.PI);
  };
  const interocular = dist2(lm[LM.eyeRInner], lm[LM.eyeLInner]);
  const faceW = dist2(lm[LM.cheekL], lm[LM.cheekR]);
  return {
    ear_right: round4(earOf(LM.eyeROuter, LM.eyeRInner, LM.eyeRUp, LM.eyeRDown)),
    ear_left: round4(earOf(LM.eyeLOuter, LM.eyeLInner, LM.eyeLUp, LM.eyeLDown)),
    canthal_tilt_right: tiltOf(LM.eyeROuter, LM.eyeRInner),
    canthal_tilt_left: tiltOf(LM.eyeLOuter, LM.eyeLInner),
    eye_spacing_ratio: round4(interocular / Math.max(1e-6, faceW)),
  };
}

/* ------------------------------------------------------------------ */
/*  Fitur alis: arch ratio = elevasi puncak / panjang alis             */
/* ------------------------------------------------------------------ */
export interface BrowFeatures {
  arch_ratio_right: number;
  arch_ratio_left: number;
}

export function computeBrowFeatures(lm: Landmark[]): BrowFeatures {
  const archOf = (inner: number, peak: number, outer: number): number => {
    const len = dist2(lm[inner], lm[outer]) || 1e-6;
    const baseY = (lm[inner].y + lm[outer].y) / 2;
    return round4(Math.max(0, baseY - lm[peak].y) / len);
  };
  return {
    arch_ratio_right: archOf(LM.browRInner, LM.browRPeak, LM.browROuter),
    arch_ratio_left: archOf(LM.browLInner, LM.browLPeak, LM.browLOuter),
  };
}

/* ------------------------------------------------------------------ */
/*  Quality gates (ADR-014)                                            */
/* ------------------------------------------------------------------ */
export interface PoseQuality {
  roll_deg: number;
  yaw_deg: number;
  pitch_deg: number;
}

/** Aproksimasi pose dari asimetri landmark. Gate: |yaw|≤15°, |pitch|≤15°, |roll|≤10°. */
export function computePose(lm: Landmark[]): PoseQuality {
  const roll =
    (Math.atan2(lm[LM.cheekR].y - lm[LM.cheekL].y, lm[LM.cheekR].x - lm[LM.cheekL].x) * 180) /
    Math.PI;
  const faceW = dist2(lm[LM.cheekL], lm[LM.cheekR]) || 1e-6;
  const yawAsym =
    Math.abs(dist2(lm[LM.noseTip], lm[LM.cheekL]) - dist2(lm[LM.noseTip], lm[LM.cheekR])) / faceW;
  const yawDeg = round4(yawAsym * 60); // aproksimasi linear, cukup untuk gate 15°
  const eyeMid = midpoint(lm[LM.eyeRInner], lm[LM.eyeLInner]);
  const upper = dist2(lm[LM.faceTop], eyeMid);
  const lower = dist2(eyeMid, lm[LM.chinBottom]);
  const pitchRatioDeviation = Math.abs(upper / Math.max(1e-6, upper + lower) - 0.45); // 0.45 = netral antropometrik
  const pitchDeg = round4(pitchRatioDeviation * 120);
  return { roll_deg: round4(roll), yaw_deg: yawDeg, pitch_deg: pitchDeg };
}

export interface QualitySignals extends PoseQuality {
  luminance: number; // 0..255 rata-rata frame
  face_width_ratio: number; // lebar pipi / lebar gambar
}

/* ------------------------------------------------------------------ */
/*  Payload builder                                                    */
/* ------------------------------------------------------------------ */
export interface LandmarkAnalysisPayload {
  face_ratios: FaceRatios;
  measurements_cm: FaceMeasurements;
  nose_features: NoseFeatures;
  eye_features: EyeFeatures;
  brow_features: BrowFeatures;
  quality: QualitySignals;
}

/** Payload lengkap untuk POST /api/v1/analyze/landmarks — hanya angka, tanpa gambar. */
export function buildAnalysisPayload(
  lm: Landmark[],
  imageWidth: number,
  luminance: number
): LandmarkAnalysisPayload {
  const wCheekPx = dist2(lm[LM.cheekL], lm[LM.cheekR]) * imageWidth;
  return {
    face_ratios: computeFaceRatios(lm),
    measurements_cm: computeMeasurementsCm(lm, imageWidth),
    nose_features: computeNoseFeatures(lm),
    eye_features: computeEyeFeatures(lm),
    brow_features: computeBrowFeatures(lm),
    quality: {
      ...computePose(lm),
      luminance,
      face_width_ratio: round4(wCheekPx / Math.max(1, imageWidth)),
    },
  };
}

/** Evaluasi gate kualitas → daftar pesan spesifik (kosong = lolos). */
export function collectQualityIssues(q: QualitySignals): string[] {
  const issues: string[] = [];
  if (Math.abs(q.yaw_deg) > 15)
    issues.push(`Kepala menoleh ±${Math.abs(q.yaw_deg).toFixed(0)}° — hadapkan lurus ke depan.`);
  if (Math.abs(q.pitch_deg) > 15)
    issues.push(`Kepala terlalu menunduk/terangkat ±${Math.abs(q.pitch_deg).toFixed(0)}° — sejajarkan mata ke kamera.`);
  if (Math.abs(q.roll_deg) > 10)
    issues.push(`Foto miring ${Math.abs(q.roll_deg).toFixed(0)}° — luruskan rotasi foto.`);
  if (q.luminance < 60) issues.push("Foto terlalu gelap — gunakan pencahayaan lebih terang.");
  if (q.luminance > 200) issues.push("Foto terlalu terang/overexposed — kurangi cahaya langsung.");
  if (q.face_width_ratio < 0.25)
    issues.push("Wajah terlalu kecil dalam frame — perbesar (zoom) foto.");
  return issues;
}

/* ------------------------------------------------------------------ */
/* Strict oval gate + LAB kulit + fitur gender (direktif 2026-08-23)   */
/* ------------------------------------------------------------------ */

export interface GuideOval {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** Kontainment ellipse pemandu: true bila KEEMPAT landmark wajah inti masuk oval.
 *  Koordinat oval & landmark pada ruang normalisasi video TIDAK di-mirror
 *  (samakan transformasi sebelum memanggil). */
export function ovalFit(
  lm: Landmark[],
  oval: GuideOval
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

/** sRGB [0-255] → CIELAB D65 — portabel client, formula identik
 *  skin_analyzer.py / pipeline/common.py (satu sumber kebenaran formula). */
export function rgbToLab(
  r: number,
  g: number,
  b: number
): { l: number; a: number; b: number } {
  const lin = (c: number): number => {
    const s = Math.min(1, Math.max(0, c / 255));
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = 0.4124564 * R + 0.3575761 * G + 0.1804375 * B;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const Z = 0.0193339 * R + 0.119192 * G + 0.9503041 * B;
  const eps = 216 / 24389, kappa = 24389 / 27;
  const f = (t: number): number => (t > eps ? Math.cbrt(t) : (kappa * t + 16) / 116);
  const fx = f(X / 0.95047), fy = f(Y), fz = f(Z / 1.08883);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export interface GenderFeatures {
  jaw_to_cheek: number;
  brow_to_eye: number;
  lip_to_face_width: number;
  face_aspect: number;
}

/** Fitur dimorfisme seksual untuk GenderEstimator server (rule engine). */
export function computeGenderFeatures(lm: Landmark[]): GenderFeatures {
  const cheek = dist2(lm[234], lm[454]);
  const jaw = dist2(lm[172], lm[397]);
  const browR = lm[105]; // puncak alis kanan
  const eyeR = lm[159]; // kelopak atas mata kanan
  const lipW = dist2(lm[61], lm[291]); // sudut bibir kiri-kanan
  const faceH = dist2(lm[10], lm[152]);
  return {
    jaw_to_cheek: round4(jaw / Math.max(1e-6, cheek)),
    brow_to_eye: round4(Math.abs(browR.y - eyeR.y) / Math.max(1e-6, cheek)),
    lip_to_face_width: round4(lipW / Math.max(1e-6, cheek)),
    face_aspect: round4(cheek / Math.max(1e-6, faceH)),
  };
}

/**
 * Rata-rata LAB patch kulit dahi+pipi dari frame video (per-frame, murah).
 * Satu-satunya fungsi non-purni di file ini (membaca piksel canvas) — hasilnya
 * berupa ANGKA yang dikirim ke server; gambar wajah tetap tidak pernah keluar
 * perangkat (UU PDP No. 27/2022).
 */
export function sampleSkinLab(
  video: HTMLVideoElement,
  lm: Landmark[]
): { l: number; a: number; b: number } | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  const W = video.videoWidth, H = video.videoHeight;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, W, H);

  const r = Math.round(Math.max(4, W * 0.02)); // radius patch ~2% lebar frame
  const centers = [
    { x: lm[10].x * W, y: (lm[10].y + 0.06) * H }, // dahi (sedikit di bawah garis rambut)
    { x: lm[234].x * W, y: lm[234].y * H }, // pipi kiri
    { x: lm[454].x * W, y: lm[454].y * H }, // pipi kanan
  ];
  let sl = 0, sa = 0, sb = 0, n = 0;
  for (const c of centers) {
    const x0 = Math.max(0, Math.round(c.x - r));
    const x1 = Math.min(W, Math.round(c.x + r));
    const y0 = Math.max(0, Math.round(c.y - r));
    const y1 = Math.min(H, Math.round(c.y + r));
    if (x1 <= x0 || y1 <= y0) continue;
    const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    for (let i = 0; i < data.length; i += 4) {
      const lab = rgbToLab(data[i], data[i + 1], data[i + 2]);
      sl += lab.l; sa += lab.a; sb += lab.b; n++;
    }
  }
  if (n === 0) return null;
  return {
    l: Math.round((sl / n) * 100) / 100,
    a: Math.round((sa / n) * 100) / 100,
    b: Math.round((sb / n) * 100) / 100,
  };
}

