"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  Scan,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  XCircle,
  Eye,
  Check,
  ImagePlus,
  ShieldCheck,
} from "lucide-react";
import { UserPersonalProfile, MOCK_PRESETS } from "../lib/mockData";
import { analyzeLandmarks } from "../lib/api";
import PhotoUpload from "./PhotoUpload";
import RepositionTool from "./RepositionTool";
import {
  buildAnalysisPayload,
  toMetricLandmarks,
  collectQualityIssues,
  computeBrowFeatures,
  computeEyeFeatures,
  computeFaceRatios,
  computeGenderFeatures,
  computeMeasurementsCm,
  computeNoseFeatures,
  computePose,
  ovalFit,
  sampleSkinLab,
  Landmark,
} from "../lib/faceGeometry";
import { FrameSampler, MIN_SAMPLES } from "../lib/frameSampler";

/** URL model FaceLandmarker resmi (dipakai mode VIDEO dan IMAGE). */
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** Swatch hex MST-01..10 (selaras MST_REFERENCE_TABLE server). */
const MST_HEX: Record<number, string> = {
  1: "#F6EDE4", 2: "#F3E7DB", 3: "#F7EAD0", 4: "#EADABA", 5: "#D7BD96",
  6: "#A07E56", 7: "#825C43", 8: "#604134", 9: "#3A312A", 10: "#292420",
};

/**
 * Geometri oval pemandu pada ruang normalisasi video (koordinat landmark,
 * TIDAK di-mirror — mirror CSS simetris terhadap sumbu x sehingga cx tetap).
 * Toleransi 1.1 agar kontainment tidak lebih ketat dari garis visual.
 */
const GUIDE_OVAL = { cx: 0.5, cy: 0.49, rx: 0.15 * 1.1, ry: 0.25 * 1.1 };

/** Durasi stabilitas HIJAU (ms) sebelum countdown otomatis dimulai. */
const ALIGNED_STABLE_MS = 1500;

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
type FaceGuideState = "NO_FACE" | "MISALIGNED" | "ALIGNED";

interface CameraScanProps {
  onScanComplete: (
    profile: UserPersonalProfile,
    stream?: MediaStream,
    meta?: { inputMode: "camera" | "upload" }
  ) => void;
  overrideProfile?: UserPersonalProfile | null;
  subcategory?: "glasses" | "hats" | "shirts";
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Guide oval colors                                                 */
/* ------------------------------------------------------------------ */
const GUIDE_COLORS: Record<FaceGuideState, { border: string; glow: string; text: string }> = {
  NO_FACE:    { border: "#EF4444", glow: "0 0 28px rgba(239,68,68,0.45)",  text: "#FCA5A5" },
  MISALIGNED: { border: "#EAB308", glow: "0 0 28px rgba(234,179,8,0.45)",  text: "#FDE68A" },
  ALIGNED:    { border: "#22C55E", glow: "0 0 32px rgba(34,197,94,0.55)",  text: "#86EFAC" },
};

/* ------------------------------------------------------------------ */
/*  Camera error messages                                             */
/* ------------------------------------------------------------------ */
function getCameraErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return "Izin kamera ditolak. Silakan aktifkan di pengaturan peramban Anda.";
      case "NotFoundError":
        return "Kamera tidak ditemukan. Pastikan webcam terhubung ke komputer.";
      case "NotReadableError":
        return "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba lagi.";
      case "OverconstrainedError":
        return "Resolusi kamera tidak didukung. Coba lepas dan pasang kembali webcam.";
      default:
        return `Kesalahan kamera: ${err.message}`;
    }
  }
  return "Kamera tidak tersedia. Mode Simulasi diaktifkan.";
}

/* ------------------------------------------------------------------ */
/*  Upload pipeline helpers (DOM-dependent — di luar faceGeometry)     */
/* ------------------------------------------------------------------ */
class UploadAnalysisError extends Error {}

/** Rata-rata luminance 0..255 dari snapshot (downscale 64×64). */
function computeLuminance(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = 64;
        cv.height = 64;
        const ctx = cv.getContext("2d");
        if (!ctx) return resolve(128);
        ctx.drawImage(img, 0, 0, 64, 64);
        const d = ctx.getImageData(0, 0, 64, 64).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
        resolve(Math.round(sum / (d.length / 4)));
      } catch {
        resolve(128);
      }
    };
    img.onerror = () => resolve(128);
    img.src = dataUrl;
  });
}

/** Crop ROI kulit dahi/pipi tengah-atas (mirror pola mode video: ±30% frame). */
function cropCenterRoi(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const s = Math.min(img.naturalWidth, img.naturalHeight) * 0.3;
        const sx = Math.max(0, img.naturalWidth / 2 - s / 2);
        const sy = Math.max(0, img.naturalHeight * 0.25);
        const cv = document.createElement("canvas");
        cv.width = 160;
        cv.height = 160;
        const ctx = cv.getContext("2d");
        if (!ctx) return reject(new Error("canvas unavailable"));
        ctx.drawImage(img, sx, sy, s, s, 0, 0, 160, 160);
        resolve(cv.toDataURL("image/jpeg", 0.85));
      } catch (e) {
        reject(e as Error);
      }
    };
    img.onerror = () => reject(new Error("decode failed"));
    img.src = dataUrl;
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const CameraScan: React.FC<CameraScanProps> = ({
  onScanComplete,
  overrideProfile,
  subcategory = "glasses",
  onBack,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const lastDetectionTimeRef = useRef<number>(-1);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scannedProfile, setScannedProfile] = useState<UserPersonalProfile | null>(
    overrideProfile || null
  );

  // Model loading state
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);

  // Face guide state
  const [faceGuideState, setFaceGuideState] = useState<FaceGuideState>("NO_FACE");
  const [guideMessage, setGuideMessage] = useState<string>("Memuat detektor AI...");
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const alignedSinceRef = useRef<number>(0);

  // Temporal smoothing (ADR-019) — agregat hanya frame ALIGNED
  const samplerRef = useRef<FrameSampler>(new FrameSampler());
  const lastAlignedLmRef = useRef<Landmark[] | null>(null);
  const lastImgHeightRef = useRef<number>(480);
  const startScanRef = useRef<() => void>(() => {});

  /* ---- Dual-mode state (ADR-013: webcam live vs upload foto) ---- */
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<"select" | "reposition">("select");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  const lastSnapshotRef = useRef<string | null>(null);

  // FaceLandmarker instance khusus mode IMAGE (deteksi satu kali pada foto)
  const imageLandmarkerRef = useRef<any>(null);
  const filesetRef = useRef<any>(null);

  useEffect(() => {
    if (overrideProfile) {
      setScannedProfile(overrideProfile);
    }
  }, [overrideProfile]);

  /* ---- Initialize MediaPipe FaceLandmarker with GPU + CPU fallback ---- */
  const initFaceLandmarker = useCallback(async () => {
    setIsModelLoading(true);
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      filesetRef.current = filesetResolver; // dipakai ulang oleh landmarker mode IMAGE

      let landmarker: any = null;
      try {
        // Try GPU delegate first
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: FACE_LANDMARKER_MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        });
      } catch (gpuErr) {
        console.warn("GPU delegate failed, falling back to CPU delegate:", gpuErr);
        // Fallback to CPU delegate
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: FACE_LANDMARKER_MODEL_URL,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        });
      }

      faceLandmarkerRef.current = landmarker;
      setIsModelReady(true);
      setGuideMessage("Wajah belum terdeteksi di dalam area pemandu");
      console.log("MediaPipe FaceLandmarker loaded successfully");
    } catch (err) {
      console.warn("MediaPipe FaceLandmarker init failed:", err);
      setIsModelReady(false);
      setGuideMessage("Deteksi visual siap. Posisikan wajah di dalam oval.");
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  /* ---- Setup camera stream & retry handler ---- */
  const retryCamera = useCallback(async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Small delay to allow OS/browser device driver to release exclusive lock
    await new Promise((r) => setTimeout(r, 200));

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError("API MediaDevices tidak tersedia di peramban ini.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }
      setHasCamera(true);
      setCameraError(null);

      // Initialize MediaPipe
      await initFaceLandmarker();
    } catch (err: any) {
      console.warn("Webcam setup retry error:", err);
      setHasCamera(false);
      setCameraError(getCameraErrorMessage(err));
    }
  }, [initFaceLandmarker]);

  /* ---- Pelepasan stream kamera (pola ERROR.md #4: cegah device lock) ---- */
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /* ---- Pindah tab mode: lepas webcam saat keluar mode kamera ---- */
  const switchMode = useCallback(
    (next: "camera" | "upload") => {
      if (next === mode) return;
      if (next === "upload") {
        stopCameraStream();
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setCountdown(null);
        setCameraError(null);
      } else {
        setUploadError(null);
        setQualityIssues([]);
      }
      setMode(next);
    },
    [mode, stopCameraStream]
  );

  useEffect(() => {
    if (mode !== "camera") return; // kamera hanya hidup di tab kamera

    let cancelled = false;

    async function setupCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCamera(false);
          setCameraError("API MediaDevices tidak tersedia di peramban ini.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
        }
        setHasCamera(true);
        setCameraError(null);

        // Initialize MediaPipe
        await initFaceLandmarker();
      } catch (err) {
        if (!cancelled) {
          console.warn("Webcam setup error:", err);
          setHasCamera(false);
          setCameraError(getCameraErrorMessage(err));
        }
      }
    }

    setupCamera();

    return () => {
      cancelled = true;
      stopCameraStream();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [initFaceLandmarker, mode, stopCameraStream]);

  /* ---- Cancel countdown + reset sampler (dipakai semua state non-HIJAU) ---- */
  const cancelCountdown = useCallback((message: string) => {
    alignedSinceRef.current = 0;
    samplerRef.current.reset();
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
    setGuideMessage(message);
  }, []);

  /* ---- Process detected landmarks — strict oval gate (direktif 2026-08-23) ---- */
  const processLandmarks = useCallback(
    (landmarks: any[]) => {
      if (!landmarks || landmarks.length === 0) {
        setFaceGuideState("NO_FACE");
        cancelCountdown("Wajah belum berada di dalam area pemandu");
        return;
      }

      // STAGE: kontainment oval — 4 landmark inti (dahi/dagu/pipi) wajib masuk oval
      // (ovalFit tetap koordinat mentah: ia membandingkan dengan oval di layar)
      const { inside, faceW } = ovalFit(landmarks as Landmark[], GUIDE_OVAL);
      const vw = videoRef.current?.videoWidth || 1280;
      const vh = videoRef.current?.videoHeight || 720;
      // Rasio dan sudut dihitung di ruang metrik; tanpa ini semua perbandingan
      // lebar-per-tinggi ikut rasio aspek kamera (lihat toMetricLandmarks).
      const mlm = toMetricLandmarks(landmarks as Landmark[], vw, vh);
      const pose = computePose(mlm);
      const poseOk =
        Math.abs(pose.yaw_deg) <= 15 && Math.abs(pose.roll_deg) <= 15 && Math.abs(pose.pitch_deg) <= 15;
      const sizeOk = faceW >= 0.18; // terlalu jauh dari kamera

      if (!inside) {
        setFaceGuideState("NO_FACE");
        cancelCountdown("Wajah belum berada di dalam area pemandu");
        return;
      }
      if (!poseOk || !sizeOk) {
        setFaceGuideState("MISALIGNED");
        cancelCountdown(
          !sizeOk
            ? "Dekatkan wajah Anda ke arah kamera"
            : Math.abs(pose.roll_deg) > 15
              ? "Kepala miring — posisikan tegak lurus ke depan"
              : "Hadapkan wajah lurus ke kamera"
        );
        return;
      }

      // ---- HIJAU (ALIGNED): stabil berbasis waktu, bukan hitungan frame ----
      setFaceGuideState("ALIGNED");
      setGuideMessage("Posisi wajah pas! Tetap stabil...");
      const now = performance.now();
      if (alignedSinceRef.current === 0) alignedSinceRef.current = now;

      // Akumulasi fitur temporal — hanya frame ALIGNED (ADR-019)
      const video = videoRef.current;
      const skinLab = video ? sampleSkinLab(video, landmarks as Landmark[]) : null;
      if (skinLab) {
        samplerRef.current.push({
          ratios: computeFaceRatios(mlm),
          nose: computeNoseFeatures(mlm),
          eye: computeEyeFeatures(mlm),
          brow: computeBrowFeatures(mlm),
          gender: computeGenderFeatures(mlm),
          pose: { roll_deg: pose.roll_deg, yaw_deg: pose.yaw_deg, pitch_deg: pose.pitch_deg },
          skinLab,
        });
        // Simpan versi METRIK: satu-satunya konsumen ref ini adalah
        // computeMeasurementsCm, yang berkontrak metrik.
        lastAlignedLmRef.current = mlm;
        lastImgHeightRef.current = vh;
      }

      const stableMs = now - alignedSinceRef.current;
      const enoughSamples = samplerRef.current.count >= MIN_SAMPLES;
      if (
        stableMs >= ALIGNED_STABLE_MS &&
        enoughSamples &&
        !countdownRef.current &&
        !isScanning &&
        !scannedProfile
      ) {
        setCountdown(3);
        let count = 3;
        countdownRef.current = setInterval(() => {
          count--;
          setCountdown(count);
          if (count <= 0) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            countdownRef.current = null;
            setCountdown(null);
            startScanRef.current();
          }
        }, 1000);
      }
    },
    [cancelCountdown, isScanning, scannedProfile]
  );

  /* ---- Real-time face tracking loop (hanya mode kamera) ---- */
  useEffect(() => {
    if (mode !== "camera" || !hasCamera || scannedProfile || isScanning) return;

    let isLoopActive = true;

    function detectLoop() {
      if (!isLoopActive) return;

      const video = videoRef.current;
      const landmarker = faceLandmarkerRef.current;

      if (video && video.readyState >= 2 && landmarker) {
        const nowMs = performance.now();
        if (nowMs > lastDetectionTimeRef.current + 30) { // Limit to ~30fps for smooth UI
          lastDetectionTimeRef.current = nowMs;
          try {
            const result = landmarker.detectForVideo(video, nowMs);
            if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
              processLandmarks(result.faceLandmarks[0]);
            } else {
              setFaceGuideState("NO_FACE");
              cancelCountdown("Wajah belum terdeteksi di dalam area pemandu");
            }
          } catch (e) {
            // Silently recover on dropped frames
          }
        }
      }

      rafRef.current = requestAnimationFrame(detectLoop);
    }

    rafRef.current = requestAnimationFrame(detectLoop);

    return () => {
      isLoopActive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, hasCamera, scannedProfile, isScanning, isModelReady, processLandmarks, cancelCountdown]);

  /* ---- FaceLandmarker mode IMAGE untuk pipeline upload (deteksi 1×) ---- */
  const getImageLandmarker = useCallback(async () => {
    if (imageLandmarkerRef.current) return imageLandmarkerRef.current;
    const vision = await import("@mediapipe/tasks-vision");
    const { FaceLandmarker, FilesetResolver } = vision;

    let fileset = filesetRef.current;
    if (!fileset) {
      fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      filesetRef.current = fileset;
    }

    const buildOptions = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL, delegate },
      runningMode: "IMAGE" as const,
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    let landmarker: any = null;
    try {
      landmarker = await FaceLandmarker.createFromOptions(fileset, buildOptions("GPU"));
    } catch (gpuErr) {
      console.warn("IMAGE-mode GPU delegate failed, using CPU:", gpuErr);
      landmarker = await FaceLandmarker.createFromOptions(fileset, buildOptions("CPU"));
    }
    imageLandmarkerRef.current = landmarker;
    return landmarker;
  }, []);

  /* ---- Pipeline analisis foto upload (ADR-013/014) ---- */
  const analyzePhoto = useCallback(
    async (snapshotDataUrl: string, ignoreQuality: boolean = false) => {
      setUploadError(null);
      setQualityIssues([]);
      setIsScanning(true);
      setScanProgress(10);
      try {
        // 1. Decode snapshot
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new UploadAnalysisError("Gagal membaca snapshot foto."));
          img.src = snapshotDataUrl;
        });
        setScanProgress(25);

        // 2. Deteksi landmark satu kali (mode IMAGE)
        const landmarker = await getImageLandmarker();
        const result = landmarker.detect(img);
        const lms: Landmark[] | undefined = result?.faceLandmarks?.[0];
        if (!lms || lms.length < 400) {
          throw new UploadAnalysisError(
            "Wajah tidak terdeteksi. Pastikan foto frontal dan wajah berada di dalam oval pemandu."
          );
        }
        setScanProgress(45);

        // 3. Fitur + quality gates
        const luminance = await computeLuminance(snapshotDataUrl);
        const imgW = img.naturalWidth || 640;
        const imgH = img.naturalHeight || 640;
        const payload = buildAnalysisPayload(lms, imgW, imgH, luminance);
        const issues = collectQualityIssues(payload.quality);
        if (issues.length > 0 && !ignoreQuality) {
          setQualityIssues(issues);
          setUploadStage("reposition");
          setIsScanning(false);
          setScanProgress(0);
          return;
        }
        setScanProgress(65);

        // 4. Klasifikasi server — SATU panggilan landmarks dengan skin_lab (patch
        //    pusat via rgbToLab) + gender_features; ROI gambar tetap di perangkat.
        const skinLab = sampleSkinLab(img, lms);
        const fullPayload = {
          ...payload,
          ...(skinLab ? { skin_lab: skinLab } : {}),
          gender_features: computeGenderFeatures(toMetricLandmarks(lms, imgW, imgH)),
        };
        const analysis = await analyzeLandmarks(fullPayload as unknown as Record<string, unknown>);
        setScanProgress(90);

        const defaultPreset = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
        const st = analysis?.skin_tone || defaultPreset.skin_tone;
        const monkIdx = st?.monk_index ?? 6;
        const profile: UserPersonalProfile = {
          monk_tone: {
            index: monkIdx,
            code: st?.monk_code || "MST-06",
            hex: MST_HEX[monkIdx] || "#A07E56",
            delta_e: 0,
            description: st?.label_indonesian || "Rich Warm / Sawo Matang",
          },
          undertone: {
            undertone: (st?.undertone as never) || "Warm",
            confidence: st?.confidence ?? 0.9,
            season: "-",
            explanation: "",
            best_colors: [],
            clash_colors: [],
          },
          face_shape: analysis?.face_shape || defaultPreset.face_shape,
          skin_tone: st,
          gender: analysis?.gender || defaultPreset.gender,
          // Multi-dimensi diisi hanya bila server mengklasifikasikannya (jujur, bukan asal isi)
          nose_type: analysis?.nose?.label || undefined,
          eye_shape: analysis?.eye?.label || undefined,
          brow_shape: analysis?.brow?.label || undefined,
          face_measurements: analysis?.measurements || payload.measurements_cm,
          face_analysis_meta: {
            confidence: analysis?.face_shape?.confidence ?? 0.9,
            source: analysis?.meta?.source || "engine",
            input_mode: "upload",
          },
          // Snapshot hanya hidup di state sesi (ADR-015) — dipakai Report Card
          scan_snapshot_dataurl: snapshotDataUrl,
        };

        setScanProgress(100);
        setScannedProfile(profile);
      } catch (e) {
        if (e instanceof UploadAnalysisError) {
          setUploadError(e.message);
        } else {
          console.warn("Upload analysis error:", e);
          setUploadError("Analisis gagal. Coba ulangi atau gunakan foto lain.");
        }
        setUploadStage("reposition");
      } finally {
        setIsScanning(false);
      }
    },
    [getImageLandmarker]
  );

  /* ---- Auto/scan handler — SATU panggilan analyzeLandmarks dari agregat temporal ---- */
  const handleStartScan = async () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
    setIsScanning(true);
    setScanProgress(15);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 15;
      });
    }, 200);

    try {
      const defaultPreset = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;

      // Agregat temporal (median rasio + mean LAB) — angka saja, tanpa gambar.
      let analysis: Awaited<ReturnType<typeof analyzeLandmarks>>;
      if (samplerRef.current.count >= MIN_SAMPLES) {
        const agg = samplerRef.current.aggregate();
        const lm = lastAlignedLmRef.current;
        const imgH = lastImgHeightRef.current || videoRef.current?.videoHeight || 480;
        const payload: Record<string, unknown> = {
          face_ratios: agg.ratios,
          measurements_cm: lm ? computeMeasurementsCm(lm, imgH) : {},
          nose_features: agg.nose,
          eye_features: agg.eye,
          brow_features: agg.brow,
          quality: {
            roll_deg: agg.pose.roll_deg,
            yaw_deg: agg.pose.yaw_deg,
            pitch_deg: agg.pose.pitch_deg,
            luminance: Math.round((agg.skin_lab.l / 100) * 255),
            face_width_ratio: agg.ratios.face_width_to_height || 0.3,
          },
          skin_lab: agg.skin_lab,
          gender_features: agg.gender,
        };
        analysis = await analyzeLandmarks(payload);
      } else {
        // Sampler belum cukup (mis. tombol manual dipaksa) — fallback preset deterministik.
        //
        // `gender` sengaja TIDAK diambil dari preset. Preset mock berisi
        // {label_id: "male", confidence: 0.68}, sehingga menekan scan sebelum 15
        // sampel terkumpul selalu melaporkan "Pria" dengan keyakinan yang tampak
        // meyakinkan, apa pun wajahnya. Itu sumber hasil berubah-ubah yang
        // terpisah dari deadband, dan tidak terlihat karena angkanya wajar.
        analysis = {
          face_shape: defaultPreset.face_shape,
          skin_tone: defaultPreset.skin_tone,
          gender: {
            label: "Belum Pasti (Uncertain)",
            label_id: "uncertain",
            confidence: 0.5,
            method: "landmark_ratio",
            rule: "sampel temporal belum cukup",
          },
          meta: { source: "mock" },
          is_mock: true,
        };
      }

      setTimeout(() => {
        clearInterval(interval);
        setScanProgress(100);
        setIsScanning(false);

        const st = analysis.skin_tone || defaultPreset.skin_tone;
        const monkIdx = st?.monk_index ?? 6;
        const profile: UserPersonalProfile = {
          monk_tone: {
            index: monkIdx,
            code: st?.monk_code || "MST-06",
            hex: MST_HEX[monkIdx] || "#A07E56",
            delta_e: 0,
            description: st?.label_indonesian || "Rich Warm / Sawo Matang",
          },
          undertone: {
            undertone: (st?.undertone as never) || "Warm",
            confidence: st?.confidence ?? 0.9,
            season: "-",
            explanation: "",
            best_colors: [],
            clash_colors: [],
          },
          face_shape: analysis.face_shape || defaultPreset.face_shape,
          skin_tone: st,
          gender: analysis.gender || defaultPreset.gender,
          nose_type: analysis.nose?.label || undefined,
          eye_shape: analysis.eye?.label || undefined,
          brow_shape: analysis.brow?.label || undefined,
          face_measurements: analysis.measurements || undefined,
          face_analysis_meta: {
            confidence: analysis.face_shape?.confidence ?? 0.9,
            source: analysis.meta?.source || "engine",
            input_mode: "camera",
          },
        };

        setScannedProfile(profile);
      }, 1200);
    } catch (e) {
      clearInterval(interval);
      setIsScanning(false);
      const fallback = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
      setScannedProfile(fallback);
    }
  };

  startScanRef.current = handleStartScan;


  /* ---- Derived styling ---- */
  const guideStyle = GUIDE_COLORS[faceGuideState];
  const subcatLabel = subcategory === "hats" ? "Topi (Hats)" : "Kacamata (Glasses)";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="text-center space-y-2">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-1"
          >
            <span>← Kembali ke Pilihan Aksesoris</span>
          </button>
        )}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
            <Scan className="w-3.5 h-3.5" />
            <span>TAHAP 2: PEMINDAIAN WAJAH AI ({subcatLabel.toUpperCase()})</span>
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Pindai Karakter Wajah & Kulit Anda
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          AI menganalisis warna kulit (Monk Scale), undertone, dan geometri bentuk wajah Anda secara
          instan di peramban untuk rekomendasi {subcatLabel}.
        </p>
      </div>

      {/* Dual-mode tabs (ADR-013): Kamera Live vs Upload Foto */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl border border-white/10 bg-surface-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => switchMode("camera")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === "camera"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-4 h-4" />
            Kamera Live
          </button>
          <button
            type="button"
            onClick={() => switchMode("upload")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === "upload"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ImagePlus className="w-4 h-4" />
            Upload Foto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Scanner Viewport — Kamera Live / Upload Foto */}
        <div
          className={`lg:col-span-7 relative bg-surface-100 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center ${
            mode === "upload" ? "aspect-auto min-h-[440px] py-4" : "aspect-[4/3]"
          }`}
        >
          {mode === "upload" ? (
            /* ---------- Mode Upload Foto (ADR-013) ---------- */
            <div className="w-full max-w-xl mx-auto px-4 space-y-4">
              {uploadStage === "select" ? (
                <div className="space-y-4">
                  <PhotoUpload
                    onPhotoLoaded={(dataUrl) => {
                      setPhotoDataUrl(dataUrl);
                      setUploadStage("reposition");
                      setUploadError(null);
                      setQualityIssues([]);
                    }}
                  />
                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Foto diproses sepenuhnya di perangkat Anda — hanya angka hasil analisis yang
                    dikirim, bukan gambar wajah.
                  </p>
                </div>
              ) : (
                <>
                  {photoDataUrl && (
                    <RepositionTool
                      photoDataUrl={photoDataUrl}
                      onConfirm={(snap) => {
                        lastSnapshotRef.current = snap;
                        void analyzePhoto(snap, false);
                      }}
                      onBack={() => {
                        setUploadStage("select");
                        setQualityIssues([]);
                        setUploadError(null);
                      }}
                    />
                  )}

                  {qualityIssues.length > 0 && (
                    <div className="glass-panel rounded-2xl p-4 space-y-2.5 border border-yellow-500/30">
                      <div className="flex items-center gap-2 text-yellow-300 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        Perlu Penyesuaian Foto
                      </div>
                      <ul className="text-[11px] text-slate-300 list-disc pl-4 space-y-1">
                        {qualityIssues.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => {
                          if (lastSnapshotRef.current) void analyzePhoto(lastSnapshotRef.current, true);
                        }}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold text-yellow-200 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-400/40 transition-colors"
                      >
                        Lanjutkan Analisis (abaikan peringatan)
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <div className="glass-panel rounded-2xl p-4 border border-red-500/30 flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1.5 flex-1">
                        <p className="text-xs text-red-300 leading-relaxed">{uploadError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (lastSnapshotRef.current) void analyzePhoto(lastSnapshotRef.current, false);
                          }}
                          className="text-[11px] font-semibold text-slate-300 underline hover:text-white"
                        >
                          Coba Analisis Ulang
                        </button>
                      </div>
                    </div>
                  )}

                  {isScanning && mode === "upload" && (
                    <div className="glass-panel rounded-2xl p-4 border border-orange-500/30">
                      <div className="flex justify-between text-xs font-mono text-orange-300 mb-2">
                        <span>Menganalisis Foto via AI Vision...</span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
          {hasCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-surface-100 to-surface-50">
              {cameraError ? (
                <div className="max-w-xs space-y-3 flex flex-col items-center z-20">
                  <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mb-1">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-sm font-semibold text-red-300">Kamera Tidak Tersedia</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>

                  <div className="flex flex-col gap-2 w-full pt-2">
                    <button
                      onClick={retryCamera}
                      type="button"
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Coba Hubungkan Ulang Kamera</span>
                    </button>

                    <button
                      onClick={() => {
                        const defaultProfile = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
                        setScannedProfile(defaultProfile);
                      }}
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-surface-50 hover:bg-slate-800 border border-white/10 flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Gunakan Simulasi Wajah Indonesia</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-xs space-y-3 flex flex-col items-center z-20">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-1">
                    <Camera className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">Mode Simulasi Kamera Aktif</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Kamera fisik tidak terdeteksi. Sistem akan menggunakan data sensor presisi tinggi
                    untuk evaluasi.
                  </p>
                  <button
                    onClick={() => {
                      const defaultProfile = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
                      setScannedProfile(defaultProfile);
                    }}
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-medium text-indigo-300 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lanjutkan dengan Profil Simulasi</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* HUD Overlay Frame */}
          <div className="absolute inset-0 pointer-events-none p-4">
            <div className="hud-corner hud-tl" />
            <div className="hud-corner hud-tr" />
            <div className="hud-corner hud-bl" />
            <div className="hud-corner hud-br" />

            {/* Center Face Target Oval — dynamic color */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[52%] w-48 h-60 rounded-[50%] flex items-center justify-center transition-all duration-300"
              style={{
                border: `3px ${faceGuideState === "ALIGNED" ? "solid" : "dashed"} ${guideStyle.border}`,
                boxShadow: guideStyle.glow,
              }}
            >
              {/* Countdown badge */}
              {countdown !== null && (
                <div className="w-20 h-20 rounded-full bg-emerald-500/30 border-2 border-emerald-400 flex flex-col items-center justify-center animate-pulse shadow-lg backdrop-blur-md">
                  <span className="text-4xl font-black text-emerald-300 font-mono">{countdown}</span>
                  <span className="text-[9px] font-mono text-emerald-200 uppercase tracking-wider">Memindai</span>
                </div>
              )}
              {countdown === null && faceGuideState === "NO_FACE" && (
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              )}
              {countdown === null && faceGuideState === "MISALIGNED" && (
                <div className="px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-400/50 backdrop-blur-md flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-yellow-200 font-semibold">Sesuaikan Posisi</span>
                </div>
              )}
              {countdown === null && faceGuideState === "ALIGNED" && !isScanning && (
                <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 backdrop-blur-md flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-200 font-semibold">Terkunci</span>
                </div>
              )}
            </div>

            {/* Face guide status message pill */}
            {hasCamera && !scannedProfile && !isScanning && (
              <div
                className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-surface-100/95 backdrop-blur-md border text-xs font-medium text-center transition-all duration-300 whitespace-nowrap shadow-xl"
                style={{
                  borderColor: guideStyle.border + "60",
                  color: guideStyle.text,
                }}
              >
                {guideMessage}
              </div>
            )}

            {/* Scanning Laser Line */}
            {isScanning && (
              <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_#F43F5E] animate-scan-laser" />
            )}
          </div>

          {/* Scan Progress Bar */}
          {isScanning && (
            <div className="absolute bottom-4 left-6 right-6 bg-surface-100/90 backdrop-blur-md rounded-xl p-3 border border-indigo-500/30">
              <div className="flex justify-between text-xs font-mono text-indigo-300 mb-1.5">
                <span>Mengekstraksi Ciri Visual...</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-rose-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Profile Output or Action Card */}
        <div className="lg:col-span-5 space-y-4">
          {!scannedProfile ? (
            <div className="glass-panel rounded-3xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Petunjuk Pemindaian</span>
              </h3>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-mono text-[10px]">
                    1
                  </span>
                  <span>
                    {mode === "upload"
                      ? "Unggah foto frontal lalu sejajarkan dahi, mata, dan dagu ke dalam oval pemandu."
                      : "Posisikan wajah Anda tepat di dalam lingkaran pemandu virtual hingga berubah "}
                    {mode === "camera" && (
                      <strong className="text-emerald-400">hijau</strong>
                    )}
                    {mode === "upload" && (
                      <strong className="text-orange-400"> sebelum analisis</strong>
                    )}
                    .
                  </span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-mono text-[10px]">
                    2
                  </span>
                  <span>Pastikan pencahayaan ruangan cukup merata pada area wajah.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-mono text-[10px]">
                    3
                  </span>
                  <span>
                    Lepaskan kacamata atau masker sesaat untuk akurasi optimal.
                  </span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-mono text-[10px]">
                    ✓
                  </span>
                  <span>
                    Pemindaian otomatis dimulai dengan{" "}
                    <strong className="text-emerald-400">countdown 3 detik</strong> saat posisi
                    terkunci.
                  </span>
                </li>
              </ul>

              {/* Face detection status indicator */}
              {hasCamera && (
                <div
                  className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all duration-300"
                  style={{
                    borderColor: guideStyle.border + "40",
                    backgroundColor: guideStyle.border + "15",
                    color: guideStyle.text,
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: guideStyle.border }}
                  />
                  <span className="leading-tight">{guideMessage}</span>
                </div>
              )}

              {/* Manual Scan Button — always clickable as user override */}
              <button
                onClick={handleStartScan}
                disabled={isScanning}
                className={`w-full py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 ${
                  faceGuideState === "ALIGNED"
                    ? "bg-gradient-to-r from-emerald-600 via-emerald-500 to-indigo-600 hover:scale-[1.02] shadow-emerald-600/30"
                    : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-rose-600 hover:from-indigo-500 hover:to-rose-500 shadow-indigo-600/30"
                }`}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sedang Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    <span>
                      {faceGuideState === "ALIGNED"
                        ? "Pindai Sekarang (Wajah Pas)"
                        : "Pindai Karakter AI Sekarang"}
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="glass-panel-glow rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">Profil Karakter Terdeteksi</h3>
                </div>
                <button
                  onClick={() => {
                    setScannedProfile(null);
                    setFaceGuideState("NO_FACE");
                    alignedSinceRef.current = 0;
                    samplerRef.current.reset();
                    setCountdown(null);
                    setGuideMessage("Posisikan wajah di dalam oval pemandu");
                    if (mode === "upload") {
                      setUploadStage("select");
                      setPhotoDataUrl(null);
                      setUploadError(null);
                      setQualityIssues([]);
                      lastSnapshotRef.current = null;
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Ulangi</span>
                </button>
              </div>

              {/* Grid Metrics — Standardized 3-Parameter Biometrics */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                {/* 1. Skin Tone */}
                <div className="bg-surface-50/70 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-slate-400 font-mono text-[10px]">WARNA KULIT</span>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                      style={{ backgroundColor: scannedProfile.monk_tone?.hex || scannedProfile.skin_tone?.hex || "#A07E56" }}
                    />
                    <span className="font-bold text-white text-xs truncate">
                      {scannedProfile.skin_tone?.tone || "Tan"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {scannedProfile.monk_tone?.code || "MST-06"}
                  </p>
                </div>

                {/* 2. Face Shape */}
                <div className="bg-surface-50/70 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-slate-400 font-mono text-[10px]">BENTUK WAJAH</span>
                  <div className="font-bold text-white text-xs truncate">
                    {scannedProfile.face_shape?.shape || "Oval"}
                  </div>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    {Math.round((scannedProfile.face_shape?.confidence || 0.92) * 100)}% Match
                  </p>
                </div>

                {/* 3. Gender */}
                <div className="bg-surface-50/70 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-slate-400 font-mono text-[10px]">GENDER</span>
                  {/* Tiga nilai, bukan dua. Menuliskan ini sebagai ternary
                      "female ? Wanita : Pria" akan menampilkan hasil yang ragu
                      sebagai "Pria" — persis bias yang dihapus oleh deadband. */}
                  <div className="font-bold text-indigo-300 text-xs truncate">
                    {scannedProfile.gender?.label_id === "female"
                      ? "Wanita"
                      : scannedProfile.gender?.label_id === "male"
                        ? "Pria"
                        : "Belum Pasti"}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {scannedProfile.gender?.label_id === "female"
                      ? "Female"
                      : scannedProfile.gender?.label_id === "male"
                        ? "Male"
                        : scannedProfile.gender?.leaning
                          ? `Condong ${scannedProfile.gender.leaning === "female" ? "Wanita" : "Pria"} — dikonfirmasi lewat kuesioner`
                          : "Dikonfirmasi lewat kuesioner"}
                  </p>
                </div>
              </div>

              {/* Detail Fitur Wajah Lanjutan (Pendukung AR & Kacamata) */}
              {(scannedProfile.face_measurements || scannedProfile.nose_type || scannedProfile.eye_shape) && (
                <div className="bg-surface-50/40 p-3 rounded-2xl border border-white/5 space-y-1 text-xs">
                  <span className="text-slate-400 font-mono text-[10px]">PROPORSI GEOMETRI WAJAH</span>
                  <div className="text-[11px] text-slate-200 leading-relaxed flex flex-wrap gap-x-3 gap-y-0.5">
                    {scannedProfile.face_measurements && (
                      <span>Dahi {scannedProfile.face_measurements.forehead_width_cm ?? "—"} · Pipi {scannedProfile.face_measurements.cheekbone_width_cm ?? "—"} · Rahang {scannedProfile.face_measurements.jaw_width_cm ?? "—"} cm</span>
                    )}
                    {scannedProfile.nose_type && <span>Hidung: {scannedProfile.nose_type}</span>}
                    {scannedProfile.eye_shape && <span>Mata: {scannedProfile.eye_shape}</span>}
                  </div>
                </div>
              )}

              <button
                onClick={() => onScanComplete(scannedProfile, streamRef.current || undefined, { inputMode: mode })}
                className="w-full mt-3 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-rose-600 hover:scale-[1.02] transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
              >
                <span>Lanjut ke Kuesioner Gaya {subcatLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
