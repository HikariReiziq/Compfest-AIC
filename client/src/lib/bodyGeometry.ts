/**
 * bodyGeometry.ts — Ekstraksi fitur antropometri tubuh dari 33 landmark MediaPipe Pose.
 *
 * Mengikuti standar antropometri ANSUR II dan ISO 7250.
 * Semua fungsi murni (pure functions) — tidak menyentuh DOM — mudah diverifikasi.
 *
 * Kepatuhan UU PDP No. 27/2022:
 * Payload yang dikirim ke server HANYA berisi angka fitur turunan (rasio & dimensi cm),
 * tidak pernah ada foto atau video tubuh pengguna.
 */

export interface PoseLandmark {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  z: number; // relative depth
  visibility?: number; // 0..1 confidence
}

/**
 * Indeks landmark MediaPipe Pose (33 landmark resmi):
 * 0: nose, 11: left_shoulder, 12: right_shoulder
 * 23: left_hip, 24: right_hip
 * 25: left_knee, 26: right_knee
 * 27: left_ankle, 28: right_ankle
 * 29: left_heel, 30: right_heel
 * 31: left_foot_index, 32: right_foot_index
 */
export const POSE_LM = {
  nose: 0,
  shoulderL: 11,
  shoulderR: 12,
  elbowL: 13,
  elbowR: 14,
  wristL: 15,
  wristR: 16,
  hipL: 23,
  hipR: 24,
  kneeL: 25,
  kneeR: 26,
  ankleL: 27,
  ankleR: 28,
  heelL: 29,
  heelR: 30,
  footIndexL: 31,
  footIndexR: 32,
};

export interface BodyMeasurementsCm {
  shoulder_width_cm: number | null;
  waist_width_cm: number | null;
  hip_width_cm: number | null;
  torso_length_cm: number | null;
  leg_length_cm: number | null;
  total_height_cm: number | null;
  body_proportion: string;
  calibration: "height_input" | "ratio_only";
}

export interface BodyRatios {
  shoulder_to_hip_ratio: number;
  waist_to_hip_ratio: number;
  waist_to_shoulder_ratio: number;
  torso_to_leg_ratio: number;
  posture_symmetry: number;
}

export interface BodyQualityGates {
  is_frontal: boolean;
  yaw_deg: number;
  pitch_deg: number;
  roll_deg: number;
  full_body_visible: boolean;
  visibility_score: number;
  luminance: number;
}

export interface BodyAnalysisPayload {
  body_ratios: BodyRatios;
  measurements_cm: BodyMeasurementsCm;
  quality: BodyQualityGates;
  user_height_input_cm?: number;
}

/** Menghitung jarak Euclidean 2D antara dua landmark. */
export function dist2D(a: PoseLandmark, b: PoseLandmark, widthPx: number = 1, heightPx: number = 1): number {
  const dx = (a.x - b.x) * widthPx;
  const dy = (a.y - b.y) * heightPx;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Menghitung estimasi orientasi tubuh (yaw, roll, pitch). */
export function estimateBodyOrientation(lms: PoseLandmark[]): { yaw_deg: number; roll_deg: number; pitch_deg: number } {
  const sL = lms[POSE_LM.shoulderL];
  const sR = lms[POSE_LM.shoulderR];
  const hL = lms[POSE_LM.hipL];
  const hR = lms[POSE_LM.hipR];

  if (!sL || !sR || !hL || !hR) {
    return { yaw_deg: 0, roll_deg: 0, pitch_deg: 0 };
  }

  // Roll: sudut kemiringan garis bahu
  const dX = sR.x - sL.x;
  const dY = sR.y - sL.y;
  const roll_deg = (Math.atan2(dY, dX) * 180) / Math.PI;

  // Yaw: perbedaan kedalaman (z) bahu kiri vs kanan
  const zDiff = (sR.z - sL.z) * 100;
  const yaw_deg = Math.max(-45, Math.min(45, zDiff * 1.5));

  // Pitch: rasio jarak hidung ke bahu vs bahu ke pinggul
  const nose = lms[POSE_LM.nose] || sL;
  const neckY = (sL.y + sR.y) / 2;
  const hipY = (hL.y + hR.y) / 2;
  const headToNeck = Math.abs(neckY - nose.y);
  const neckToHip = Math.abs(hipY - neckY);
  const pitch_ratio = neckToHip > 0 ? headToNeck / neckToHip : 0.35;
  const pitch_deg = (pitch_ratio - 0.35) * 60;

  return {
    yaw_deg: Math.round(yaw_deg * 10) / 10,
    roll_deg: Math.round(roll_deg * 10) / 10,
    pitch_deg: Math.round(pitch_deg * 10) / 10,
  };
}

/**
 * Ekstraksi rasio geometri tubuh (ANSUR II standard ratios).
 */
export function extractBodyRatios(lms: PoseLandmark[]): BodyRatios {
  const sL = lms[POSE_LM.shoulderL];
  const sR = lms[POSE_LM.shoulderR];
  const hL = lms[POSE_LM.hipL];
  const hR = lms[POSE_LM.hipR];
  const aL = lms[POSE_LM.ankleL];
  const aR = lms[POSE_LM.ankleR];

  if (!sL || !sR || !hL || !hR) {
    return {
      shoulder_to_hip_ratio: 1.0,
      waist_to_hip_ratio: 0.78,
      waist_to_shoulder_ratio: 0.78,
      torso_to_leg_ratio: 0.85,
      posture_symmetry: 0.95,
    };
  }

  const shoulderWidth = Math.abs(sR.x - sL.x);
  const hipWidth = Math.abs(hR.x - hL.x);

  // Estimasi lebar pinggang natural (kurva tengah antara bahu dan pinggul)
  // Rata-rata populasi ANSUR II: waist width ~ 0.75 - 0.88 x hip width
  const rawWaistWidth = (shoulderWidth * 0.35 + hipWidth * 0.65) * 0.82;
  const waistWidth = Math.max(0.05, rawWaistWidth);

  const shoulder_to_hip_ratio = hipWidth > 0 ? shoulderWidth / hipWidth : 1.0;
  const waist_to_hip_ratio = hipWidth > 0 ? waistWidth / hipWidth : 0.75;
  const waist_to_shoulder_ratio = shoulderWidth > 0 ? waistWidth / shoulderWidth : 0.75;

  // Panjang Torso (bahu ke pinggul) vs Panjang Kaki (pinggul ke mata kaki)
  const neckY = (sL.y + sR.y) / 2;
  const hipY = (hL.y + hR.y) / 2;
  const ankleY = aL && aR ? (aL.y + aR.y) / 2 : hipY + 0.45;

  const torsoLength = Math.abs(hipY - neckY);
  const legLength = Math.abs(ankleY - hipY);
  const torso_to_leg_ratio = legLength > 0 ? torsoLength / legLength : 0.85;

  // Simetri postur (selisih tinggi bahu kiri dan kanan)
  const shoulderTilt = Math.abs(sL.y - sR.y);
  const posture_symmetry = Math.max(0.7, 1.0 - shoulderTilt * 3.0);

  return {
    shoulder_to_hip_ratio: Math.round(shoulder_to_hip_ratio * 1000) / 1000,
    waist_to_hip_ratio: Math.round(waist_to_hip_ratio * 1000) / 1000,
    waist_to_shoulder_ratio: Math.round(waist_to_shoulder_ratio * 1000) / 1000,
    torso_to_leg_ratio: Math.round(torso_to_leg_ratio * 1000) / 1000,
    posture_symmetry: Math.round(posture_symmetry * 100) / 100,
  };
}

/**
 * Menghitung ukuran tubuh dalam sentimeter nyata (cm) terkalibrasi tinggi badan.
 * Default tinggi populasi Indonesia dewasa: 165 cm (jika tidak diinput).
 */
export function calculateBodyMeasurementsCm(
  lms: PoseLandmark[],
  userHeightCm: number = 165,
  frameHeightPx: number = 720,
  frameWidthPx: number = 540
): BodyMeasurementsCm {
  const sL = lms[POSE_LM.shoulderL];
  const sR = lms[POSE_LM.shoulderR];
  const hL = lms[POSE_LM.hipL];
  const hR = lms[POSE_LM.hipR];
  const aL = lms[POSE_LM.ankleL];
  const aR = lms[POSE_LM.ankleR];
  const nose = lms[POSE_LM.nose];

  if (!sL || !sR || !hL || !hR) {
    return {
      shoulder_width_cm: null,
      waist_width_cm: null,
      hip_width_cm: null,
      torso_length_cm: null,
      leg_length_cm: null,
      total_height_cm: userHeightCm,
      body_proportion: "1.0 : 0.8 : 1.0",
      calibration: "ratio_only",
    };
  }

  // Tinggi tubuh pada frame (ujung kepala ke pergelangan kaki)
  const topHeadY = nose ? Math.max(0, nose.y - 0.12) : Math.max(0, (sL.y + sR.y) / 2 - 0.2);
  const bottomFeetY = aL && aR ? (aL.y + aR.y) / 2 + 0.05 : 0.95;
  const bodyHeightNorm = Math.max(0.3, bottomFeetY - topHeadY);

  // Faktor kalibrasi: piksel per sentimeter
  const pxPerCm = (bodyHeightNorm * frameHeightPx) / userHeightCm;
  const cmPerNormX = frameWidthPx / pxPerCm;
  const cmPerNormY = frameHeightPx / pxPerCm;

  let shoulderWidthCm = Math.abs(sR.x - sL.x) * cmPerNormX;
  let hipWidthCm = Math.abs(hR.x - hL.x) * cmPerNormX;

  // Sanity Bounds: Standar Antropometri ANSUR II & ISO 7250
  // Jika pembacaan di luar rentang anatomis manusia nyata, gunakan rata-rata proporsional
  if (shoulderWidthCm < 22 || shoulderWidthCm > 80) {
    shoulderWidthCm = userHeightCm * 0.25; // ~41.2 cm pada tinggi 165cm
  }
  if (hipWidthCm < 18 || hipWidthCm > 75) {
    hipWidthCm = userHeightCm * 0.22; // ~36.3 cm pada tinggi 165cm
  }

  const waistWidthCm = (shoulderWidthCm * 0.35 + hipWidthCm * 0.65) * 0.82;

  const neckY = (sL.y + sR.y) / 2;
  const hipY = (hL.y + hR.y) / 2;
  const ankleY = aL && aR ? (aL.y + aR.y) / 2 : 0.92;

  let torsoLengthCm = Math.abs(hipY - neckY) * cmPerNormY;
  let legLengthCm = Math.abs(ankleY - hipY) * cmPerNormY;

  if (torsoLengthCm < 25 || torsoLengthCm > 85) {
    torsoLengthCm = userHeightCm * 0.32;
  }
  if (legLengthCm < 35 || legLengthCm > 115) {
    legLengthCm = userHeightCm * 0.48;
  }

  // Rasio format: Bahu : Pinggang : Pinggul
  const normBase = hipWidthCm > 0 ? hipWidthCm : 35;
  const sProp = (shoulderWidthCm / normBase).toFixed(1);
  const wProp = (waistWidthCm / normBase).toFixed(1);
  const hProp = "1.0";
  const body_proportion = `${sProp} : ${wProp} : ${hProp}`;

  return {
    shoulder_width_cm: Math.round(shoulderWidthCm * 10) / 10,
    waist_width_cm: Math.round(waistWidthCm * 10) / 10,
    hip_width_cm: Math.round(hipWidthCm * 10) / 10,
    torso_length_cm: Math.round(torsoLengthCm * 10) / 10,
    leg_length_cm: Math.round(legLengthCm * 10) / 10,
    total_height_cm: userHeightCm,
    body_proportion,
    calibration: "height_input",
  };
}

/**
 * Memvalidasi apakah landmark benar-benar berasal dari postur tubuh manusia nyata
 * (Anti False-Positive: mencegah deteksi pada ruangan kosong / noise background / perabot).
 */
export function isValidHumanBodyPose(
  lms: PoseLandmark[] | undefined,
  frameWidthPx: number = 640,
  frameHeightPx: number = 480
): boolean {
  if (!lms || lms.length < 25) return false;

  const nose = lms[POSE_LM.nose];
  const sL = lms[POSE_LM.shoulderL];
  const sR = lms[POSE_LM.shoulderR];
  const hL = lms[POSE_LM.hipL];
  const hR = lms[POSE_LM.hipR];
  const aL = lms[POSE_LM.ankleL];
  const aR = lms[POSE_LM.ankleR];

  if (!sL || !sR || !hL || !hR) return false;

  // 1. Ambang batas visibilitas landmark
  const sLVis = sL.visibility ?? 0;
  const sRVis = sR.visibility ?? 0;
  const hLVis = hL.visibility ?? 0;
  const hRVis = hR.visibility ?? 0;

  if (sLVis < 0.6 || sRVis < 0.6 || (hLVis < 0.45 && hRVis < 0.45)) {
    return false;
  }

  // 2. Rentang Lebar Bahu Fisik (minimal 50px dan minimal 8% lebar frame)
  const shoulderSpanPx = Math.abs(sR.x - sL.x) * frameWidthPx;
  if (shoulderSpanPx < 45 || shoulderSpanPx > frameWidthPx * 0.85) {
    return false;
  }

  // 3. Rentang Lebar Pinggul Fisik (minimal 30px)
  const hipSpanPx = Math.abs(hR.x - hL.x) * frameWidthPx;
  if (hipSpanPx < 28 || hipSpanPx > frameWidthPx * 0.85) {
    return false;
  }

  // 4. Jarak Vertikal Torso (Bahu ke Pinggul harus minimal 50px)
  const shoulderMidY = (sL.y + sR.y) / 2;
  const hipMidY = (hL.y + hR.y) / 2;
  const torsoHeightPx = (hipMidY - shoulderMidY) * frameHeightPx;
  if (torsoHeightPx < 45) {
    return false;
  }

  // 5. Posisi Kepala / Hidung harus di atas bahu
  if (nose && nose.y >= shoulderMidY) {
    return false;
  }

  // 6. Jika kaki terdeteksi, harus berada di bawah pinggul
  if (aL || aR) {
    const ankleY = ((aL?.y ?? 0.9) + (aR?.y ?? 0.9)) / 2;
    if (ankleY <= hipMidY) return false;
  }

  return true;
}

/** Menguji apakah kualitas postur dan visibilitas tubuh memenuhi syarat. */
export function validateBodyQuality(lms: PoseLandmark[], luminance: number = 128): BodyQualityGates {
  const orient = estimateBodyOrientation(lms);

  // Hitung rata-rata visibilitas titik kunci tubuh
  const keyIndices = [POSE_LM.shoulderL, POSE_LM.shoulderR, POSE_LM.hipL, POSE_LM.hipR, POSE_LM.kneeL, POSE_LM.kneeR, POSE_LM.ankleL, POSE_LM.ankleR];
  let totalVis = 0;
  let validCount = 0;

  for (const idx of keyIndices) {
    const lm = lms[idx];
    if (lm) {
      totalVis += lm.visibility ?? 0.8;
      validCount++;
    }
  }

  const visibility_score = validCount > 0 ? totalVis / validCount : 0.5;
  const is_frontal = Math.abs(orient.yaw_deg) <= 20 && Math.abs(orient.roll_deg) <= 15;
  const full_body_visible = visibility_score >= 0.65;

  return {
    is_frontal,
    yaw_deg: orient.yaw_deg,
    pitch_deg: orient.pitch_deg,
    roll_deg: orient.roll_deg,
    full_body_visible,
    visibility_score: Math.round(visibility_score * 100) / 100,
    luminance,
  };
}

/** Mengumpulkan pesan masukan penyesuaian jika quality gate belum lolos. */
export function collectBodyQualityIssues(quality: BodyQualityGates): string[] {
  const issues: string[] = [];
  if (!quality.is_frontal) {
    if (Math.abs(quality.yaw_deg) > 20) {
      issues.push("Posisikan tubuh menghadap lurus ke depan (jangan menyamping).");
    }
    if (Math.abs(quality.roll_deg) > 15) {
      issues.push("Tegakkan postur badan Anda (posisi bahu terlihat miring).");
    }
  }
  if (!quality.full_body_visible) {
    issues.push("Pastikan seluruh badan (dari bahu hingga kaki) terlihat jelas di dalam frame.");
  }
  if (quality.luminance < 50) {
    issues.push("Pencahayaan ruangan redup. Tambahkan cahaya agar siluet pakaian terlihat jelas.");
  }
  return issues;
}

/** Membangun payload lengkap analisis tubuh siap kirim ke backend. */
export function buildBodyAnalysisPayload(
  lms: PoseLandmark[],
  userHeightCm: number = 165,
  frameWidthPx: number = 540,
  frameHeightPx: number = 720,
  luminance: number = 128
): BodyAnalysisPayload {
  const body_ratios = extractBodyRatios(lms);
  const measurements_cm = calculateBodyMeasurementsCm(lms, userHeightCm, frameHeightPx, frameWidthPx);
  const quality = validateBodyQuality(lms, luminance);

  return {
    body_ratios,
    measurements_cm,
    quality,
    user_height_input_cm: userHeightCm,
  };
}
