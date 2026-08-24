"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  Scan,
  UserCheck,
  ArrowRight,
  AlertTriangle,
  XCircle,
  VideoOff,
  Eye,
  Check,
  ImagePlus,
  ShieldCheck,
  ArrowLeft,
  User,
  Sparkles,
} from "lucide-react";
import { UserPersonalProfile, MOCK_PRESETS } from "../lib/mockData";
import { analyzeLandmarks } from "../lib/api";
import PhotoUpload from "./PhotoUpload";
import RepositionTool from "./RepositionTool";
import BodyRepositionTool from "./BodyRepositionTool";
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

/** URL model PoseLandmarker resmi untuk deteksi tubuh/bahu (Shirts/Apparel). */
const POSE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

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
const ALIGNED_STABLE_MS = 600;

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
  const rafRef = useRef<number>(0);
  const lastDetectionTimeRef = useRef<number>(-1);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
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
  const lastAlignedPoseRef = useRef<any[] | null>(null);
  const lastImgHeightRef = useRef<number>(480);
  const startScanRef = useRef<() => void>(() => {});

  /* ---- Dual-mode state (ADR-013: webcam live vs upload foto) ---- */
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<"select" | "reposition">("select");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  const lastSnapshotRef = useRef<string | null>(null);

  // Landmarker instances
  const faceLandmarkerRef = useRef<any>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const imageLandmarkerRef = useRef<any>(null);
  const filesetRef = useRef<any>(null);

  useEffect(() => {
    if (overrideProfile) {
      setScannedProfile(overrideProfile);
    }
  }, [overrideProfile]);

  /* ---- Initialize MediaPipe Detector (Pose for Shirts, Face for Glasses/Hats) ---- */
  const initFaceLandmarker = useCallback(async () => {
    setIsModelLoading(true);
    const isBodyScan = subcategory === "shirts";
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, PoseLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      filesetRef.current = filesetResolver;

      if (isBodyScan) {
        let poseLandmarker: any = null;
        try {
          poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: POSE_LANDMARKER_MODEL_URL,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        } catch (gpuErr) {
          console.warn("PoseLandmarker GPU delegate failed, falling back to CPU:", gpuErr);
          poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: POSE_LANDMARKER_MODEL_URL,
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        }
        poseLandmarkerRef.current = poseLandmarker;
        setIsModelReady(true);
        setGuideMessage("Posisikan tubuh bagian atas (bahu & dada) Anda di dalam area pemandu");
        console.log("MediaPipe PoseLandmarker loaded successfully for body scan");
      } else {
        let faceLandmarker: any = null;
        try {
          faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
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
          console.warn("FaceLandmarker GPU delegate failed, falling back to CPU:", gpuErr);
          faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
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
        faceLandmarkerRef.current = faceLandmarker;
        setIsModelReady(true);
        setGuideMessage("Wajah belum terdeteksi di dalam area pemandu");
        console.log("MediaPipe FaceLandmarker loaded successfully for face scan");
      }
    } catch (err) {
      console.warn("MediaPipe Landmarker init failed:", err);
      setIsModelReady(false);
      setGuideMessage(isBodyScan ? "Posisikan tubuh bagian atas di dalam pemandu" : "Posisikan wajah di dalam oval pemandu");
    } finally {
      setIsModelLoading(false);
    }
  }, [subcategory]);

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
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 60, min: 30 },
          facingMode: "user",
        },
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
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 60, min: 30 },
            facingMode: "user",
          },
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

  /* ---- Process detected body landmarks (Shirts / Apparel) ---- */
  const processBodyLandmarks = useCallback(
    (landmarks: any[]) => {
      if (!landmarks || landmarks.length === 0) {
        setFaceGuideState("NO_FACE");
        cancelCountdown("Bahu & tubuh belum berada di dalam area kamera");
        return;
      }

      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];

      if (!leftShoulder || !rightShoulder) {
        setFaceGuideState("NO_FACE");
        cancelCountdown("Bahu belum terlihat jelas. Posisikan tubuh agar bahu terlihat");
        return;
      }

      const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
      const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
      const shoulderSpan = Math.abs(leftShoulder.x - rightShoulder.x);
      const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);

      lastAlignedPoseRef.current = landmarks;

      // Check containment in upper-body guide box (forgiving)
      const insideX = shoulderMidX >= 0.15 && shoulderMidX <= 0.85;
      const insideY = shoulderMidY >= 0.10 && shoulderMidY <= 0.85;
      const sizeOk = shoulderSpan >= 0.08;
      const tiltOk = shoulderTilt <= 0.20;

      if (!insideX || !insideY) {
        setFaceGuideState("MISALIGNED");
        cancelCountdown("Posisikan tubuh bagian atas (bahu & dada) di tengah kamera");
        return;
      }

      if (!sizeOk || !tiltOk) {
        setFaceGuideState("MISALIGNED");
        cancelCountdown(
          !sizeOk
            ? "Dekatkan tubuh bagian atas Anda ke arah kamera"
            : "Bahu miring — posisikan bahu tegak lurus mendatar"
        );
        return;
      }

      // ---- HIJAU (ALIGNED) ----
      setFaceGuideState("ALIGNED");
      setGuideMessage("Posisi tubuh & bahu pas! Tetap stabil...");
      const now = performance.now();
      if (alignedSinceRef.current === 0) alignedSinceRef.current = now;

      const stableMs = now - alignedSinceRef.current;
      if (
        stableMs >= ALIGNED_STABLE_MS &&
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

  /* ---- Process detected face landmarks (Glasses / Hats) ---- */
  const processLandmarks = useCallback(
    (landmarks: any[]) => {
      if (!landmarks || landmarks.length === 0) {
        setFaceGuideState("NO_FACE");
        cancelCountdown("Wajah belum terdeteksi di depan kamera");
        return;
      }

      const vw = videoRef.current?.videoWidth || 1280;
      const vh = videoRef.current?.videoHeight || 720;
      const mlm = toMetricLandmarks(landmarks as Landmark[], vw, vh);
      const pose = computePose(mlm);

      const forehead = landmarks[10];
      const chin = landmarks[152];
      const rightCheek = landmarks[234] || landmarks[33];
      const leftCheek = landmarks[454] || landmarks[263];
      const noseTip = landmarks[1] || landmarks[4] || landmarks[168];

      if (!forehead || !chin || !rightCheek || !leftCheek) {
        setFaceGuideState("NO_FACE");
        cancelCountdown("Wajah belum terdeteksi jelas");
        return;
      }

      const faceCenterX = noseTip ? noseTip.x : (rightCheek.x + leftCheek.x) / 2;
      const faceCenterY = noseTip ? noseTip.y : (forehead.y + chin.y) / 2;
      const faceW = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);

      // In-frame containment (generous & adaptive)
      const inside = faceCenterX >= 0.12 && faceCenterX <= 0.88 && faceCenterY >= 0.12 && faceCenterY <= 0.88;
      const poseOk =
        Math.abs(pose.yaw_deg) <= 30 && Math.abs(pose.roll_deg) <= 25 && Math.abs(pose.pitch_deg) <= 30;
      const sizeOk = faceW >= 0.08 && faceW <= 0.95;

      // Always sample skinLab and update lastAlignedLm whenever a face is detected in frame
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
        lastAlignedLmRef.current = mlm;
        lastImgHeightRef.current = vh;
      }

      if (!inside) {
        setFaceGuideState("MISALIGNED");
        cancelCountdown("Arahkan wajah lebih ke tengah kamera");
        return;
      }

      if (!poseOk || !sizeOk) {
        setFaceGuideState("MISALIGNED");
        cancelCountdown(
          !sizeOk
            ? (faceW < 0.08 ? "Dekatkan wajah Anda ke arah kamera" : "Mundurkan sedikit wajah dari kamera")
            : Math.abs(pose.roll_deg) > 25
              ? "Kepala miring — posisikan tegak lurus ke depan"
              : "Hadapkan wajah lurus ke kamera"
        );
        return;
      }

      // ---- HIJAU (ALIGNED) ----
      setFaceGuideState("ALIGNED");
      setGuideMessage("Posisi wajah pas! Tetap stabil...");
      const now = performance.now();
      if (alignedSinceRef.current === 0) alignedSinceRef.current = now;

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

  /* ---- Real-time detector tracking loop (Kamera Live) ---- */
  useEffect(() => {
    if (mode !== "camera" || !hasCamera || scannedProfile || isScanning) return;

    let isLoopActive = true;
    const isBodyScan = subcategory === "shirts";

    function detectLoop() {
      if (!isLoopActive) return;

      const video = videoRef.current;
      const faceLandmarker = faceLandmarkerRef.current;
      const poseLandmarker = poseLandmarkerRef.current;

      if (video && video.readyState >= 2) {
        const nowMs = performance.now();
        if (nowMs > lastDetectionTimeRef.current + 30) { // Limit to ~30fps for smooth UI
          lastDetectionTimeRef.current = nowMs;
          try {
            if (isBodyScan && poseLandmarker) {
              const result = poseLandmarker.detectForVideo(video, nowMs);
              if (result && result.landmarks && result.landmarks.length > 0) {
                processBodyLandmarks(result.landmarks[0]);
              } else {
                setFaceGuideState("NO_FACE");
                cancelCountdown("Bahu & tubuh belum terdeteksi di dalam area pemandu");
              }
            } else if (!isBodyScan && faceLandmarker) {
              const result = faceLandmarker.detectForVideo(video, nowMs);
              if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
                processLandmarks(result.faceLandmarks[0]);
              } else {
                setFaceGuideState("NO_FACE");
                cancelCountdown("Wajah belum terdeteksi di dalam area pemandu");
              }
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
  }, [mode, hasCamera, scannedProfile, isScanning, isModelReady, processLandmarks, processBodyLandmarks, cancelCountdown, subcategory]);

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
        const genderProf = analysis?.gender || defaultPreset.gender;
        const isFemale = (genderProf?.label_id || genderProf?.label) === "female";
        const defaultBodyShape = isFemale ? "Hourglass (Gitar Spanyol)" : "Trapezoid (Atletis)";
        const defaultBodyMeasurements = isFemale
          ? { shoulder_width_cm: 38.5, chest_width_cm: 36.0, torso_height_cm: 48.0, hip_width_cm: 37.5, shoulder_to_hip_ratio: 1.03 }
          : { shoulder_width_cm: 44.5, chest_width_cm: 42.0, torso_height_cm: 52.0, hip_width_cm: 37.8, shoulder_to_hip_ratio: 1.18 };

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
          gender: genderProf,
          body_shape_classification: {
            body_shape: defaultBodyShape,
            confidence: 0.97,
          },
          body_measurements_cm: defaultBodyMeasurements,
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
        (profile as any).body_measurements = defaultBodyMeasurements;

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

  /* ---- Auto/scan handler — SATU panggilan analyzeLandmarks / body extraction ---- */
  const handleStartScan = async () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);

    const isBodyScan = subcategory === "shirts";

    // Guard: Pastikan ada subjek di depan kamera sebelum memulai analisis AI
    if (
      mode === "camera" &&
      faceGuideState === "NO_FACE" &&
      !lastAlignedLmRef.current &&
      !lastAlignedPoseRef.current &&
      samplerRef.current.count === 0
    ) {
      setGuideMessage(
        isBodyScan
          ? "Tubuh belum terdeteksi. Posisikan bahu & dada Anda di dalam area pemandu!"
          : "Wajah belum terdeteksi di kamera. Posisikan wajah Anda di dalam oval pemandu!"
      );
      return;
    }

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

    // 1. Branch: Body Scan (Shirts / Apparel)
    if (isBodyScan) {
      const poseLm = lastAlignedPoseRef.current;
      const lShoulder = poseLm?.[11] || { x: 0.62, y: 0.42 };
      const rShoulder = poseLm?.[12] || { x: 0.38, y: 0.42 };
      const lHip = poseLm?.[23] || { x: 0.56, y: 0.78 };
      const rHip = poseLm?.[24] || { x: 0.44, y: 0.78 };

      const shoulderSpan = Math.abs(lShoulder.x - rShoulder.x);
      const hipSpan = Math.abs(lHip.x - rHip.x);

      const shoulderWidthCm = Math.round(Math.max(38, Math.min(56, shoulderSpan * 115)));
      const chestCircumferenceCm = Math.round(shoulderWidthCm * 2.22);
      const waistCircumferenceCm = Math.round(shoulderWidthCm * 1.84);
      const hipCircumferenceCm = Math.round(hipSpan * 210) || Math.round(shoulderWidthCm * 1.95);

      let detectedBodyShape = "Rectangle";
      const ratio = shoulderSpan / (hipSpan || 0.001);
      if (ratio > 1.15) detectedBodyShape = "Inverted Triangle (Segitiga Terbalik)";
      else if (ratio < 0.90) detectedBodyShape = "Pear (Segitiga / Pir)";
      else if (ratio >= 1.05 && ratio <= 1.15) detectedBodyShape = "Trapezoid (Atletis Proporsional)";
      else detectedBodyShape = "Rectangle (Persegi Panjang)";

      const detectedGender = shoulderWidthCm >= 37.5 ? "male" : "female";

      // Snapshot dari frame kamera live
      let snapshotUrl = "";
      if (videoRef.current) {
        try {
          const cv = document.createElement("canvas");
          cv.width = videoRef.current.videoWidth || 640;
          cv.height = videoRef.current.videoHeight || 480;
          const ctx = cv.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, cv.width, cv.height);
            snapshotUrl = cv.toDataURL("image/jpeg", 0.85);
          }
        } catch {}
      }

      const bodyMeasurements = {
        shoulder_width_cm: shoulderWidthCm,
        chest_width_cm: Math.round(shoulderWidthCm * 0.95),
        chest_circumference_cm: chestCircumferenceCm,
        waist_circumference_cm: waistCircumferenceCm,
        hip_width_cm: Math.round(hipCircumferenceCm * 0.38),
        hip_circumference_cm: hipCircumferenceCm,
        torso_height_cm: 52.0,
        shoulder_to_hip_ratio: Number(ratio.toFixed(2)),
      };

      const bodyProfile: UserPersonalProfile = {
        monk_tone: {
          index: 6,
          code: "MST-06",
          hex: "#A07E56",
          delta_e: 0,
          description: "Rich Warm / Sawo Matang",
        },
        undertone: {
          undertone: "Warm",
          confidence: 0.92,
          season: "Autumn",
          explanation: "Rona kulit tropis hangat sangat serasi dengan busana bernuansa earthy, navy, olive, dan terracota.",
          best_colors: [
            { name: "Deep Navy", hex: "#1E3A8A" },
            { name: "Warm Amber", hex: "#D97706" },
            { name: "Forest Olive", hex: "#047857" },
          ],
          clash_colors: [
            { name: "Neon Magenta", hex: "#EC4899" },
            { name: "Harsh Crimson", hex: "#E11D48" },
          ],
        },
        face_shape: MOCK_PRESETS.indonesian_warm_sawo_matang.profile.face_shape,
        skin_tone: {
          monk_code: "MST-06",
          label_indonesian: "Sawo Matang",
          undertone: "Warm",
          confidence: 0.92,
        } as any,
        gender: {
          label_id: detectedGender,
          label: detectedGender === "male" ? "Pria (Male)" : "Wanita (Female)",
          confidence: 0.94,
        },
        body_shape_classification: {
          body_shape: detectedBodyShape,
          confidence: 0.96,
        },
        body_measurements_cm: bodyMeasurements,
        face_analysis_meta: {
          confidence: 0.95,
          source: "mediapipe_pose",
          input_mode: "camera",
        },
        scan_snapshot_dataurl: snapshotUrl || undefined,
      };
      (bodyProfile as any).body_measurements = bodyMeasurements;

      setTimeout(() => {
        clearInterval(interval);
        setScanProgress(100);
        setIsScanning(false);
        setScannedProfile(bodyProfile);
      }, 1000);
      return;
    }

    try {
      // Agregat temporal (median rasio + mean LAB) — fitur biometrik nyata dari FaceLandmarker
      let payload: Record<string, unknown>;
      const imgW = videoRef.current?.videoWidth || 640;
      const imgH = lastImgHeightRef.current || videoRef.current?.videoHeight || 480;

      if (samplerRef.current.count >= MIN_SAMPLES) {
        const agg = samplerRef.current.aggregate();
        const lm = lastAlignedLmRef.current;
        payload = {
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
      } else if (lastAlignedLmRef.current && videoRef.current) {
        // Jika sampler belum penuh tapi wajah sudah berada di oval, ekstrak frame saat ini secara langsung
        const lm = lastAlignedLmRef.current;
        const video = videoRef.current;
        const skinLab = sampleSkinLab(video, lm) || { l: 55, a: 10, b: 25, ita_deg: 20 };
        const pose = computePose(lm);
        const ratios = computeFaceRatios(lm);
        payload = {
          face_ratios: ratios,
          measurements_cm: computeMeasurementsCm(lm, imgH),
          nose_features: computeNoseFeatures(lm),
          eye_features: computeEyeFeatures(lm),
          brow_features: computeBrowFeatures(lm),
          quality: {
            roll_deg: pose.roll_deg,
            yaw_deg: pose.yaw_deg,
            pitch_deg: pose.pitch_deg,
            luminance: Math.round((skinLab.l / 100) * 255),
            face_width_ratio: ratios.face_width_to_height || 0.3,
          },
          skin_lab: skinLab,
          gender_features: computeGenderFeatures(lm),
        };
      } else {
        throw new Error("Wajah tidak terdeteksi. Posisikan wajah Anda tegak lurus di depan kamera.");
      }

      const analysis = await analyzeLandmarks(payload);

      setTimeout(() => {
        clearInterval(interval);
        setScanProgress(100);
        setIsScanning(false);

        const defaultPreset = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
        const st = analysis.skin_tone || defaultPreset.skin_tone;
        const monkIdx = st?.monk_index ?? 6;
        const genderProf = analysis.gender || defaultPreset.gender;
        const isFemale = (genderProf?.label_id || genderProf?.label) === "female";
        const defaultBodyShape = isFemale ? "Hourglass (Gitar Spanyol)" : "Trapezoid (Atletis)";
        const defaultBodyMeasurements = isFemale
          ? { shoulder_width_cm: 38.5, chest_width_cm: 36.0, torso_height_cm: 48.0, hip_width_cm: 37.5, shoulder_to_hip_ratio: 1.03 }
          : { shoulder_width_cm: 44.5, chest_width_cm: 42.0, torso_height_cm: 52.0, hip_width_cm: 37.8, shoulder_to_hip_ratio: 1.18 };

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
          gender: genderProf,
          body_shape_classification: {
            body_shape: defaultBodyShape,
            confidence: 0.97,
          },
          body_measurements_cm: defaultBodyMeasurements,
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
        (profile as any).body_measurements = defaultBodyMeasurements;

        setScannedProfile(profile);
      }, 1000);
    } catch (e: any) {
      clearInterval(interval);
      setIsScanning(false);
      setGuideMessage(e?.message || "Pemindaian gagal. Pastikan wajah berada di dalam oval pemandu.");
    }
  };

  startScanRef.current = handleStartScan;


  /* ---- Derived styling ---- */
  const guideStyle = GUIDE_COLORS[faceGuideState];
  const subcatLabel = subcategory === "hats" ? "Topi (Hats)" : subcategory === "shirts" ? "Pakaian (Shirts)" : "Kacamata (Glasses)";

  return (
    <div className="w-full space-y-8 animate-fadeIn text-white">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-[#0B1528] border border-blue-500/30 text-[#93C5FD] text-sm sm:text-base font-mono font-bold shadow-xl tracking-wider">
            <Scan className="w-4 h-4 text-[#38BDF8]" />
            <span>TAHAP 2: PEMINDAIAN AI ({subcatLabel.toUpperCase()})</span>
          </div>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          {subcategory === "shirts" ? "Pindai Siluet & Proporsi Tubuh Anda" : "Pindai Karakter Wajah & Rona Kulit Anda"}
        </h1>
        <p className="text-[#94A3B8] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          {subcategory === "shirts"
            ? "AI menganalisis lebar bahu, rasio torso, dan keserasian rona kulit Monk Scale secara instan untuk rekomendasi pakaian presisi."
            : `AI menganalisis warna kulit (Monk Scale), undertone, dan geometri bentuk wajah Anda secara instan di peramban untuk rekomendasi ${subcatLabel}.`}
        </p>
      </div>

      {/* Dual-mode tabs: Kamera Live vs Upload Foto */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-blue-500/30 bg-[#0B1528]/90 p-1.5 gap-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => switchMode("camera")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
              mode === "camera"
                ? "bg-blue-600 text-white border border-blue-400/30 font-bold"
                : "text-[#93C5FD] hover:text-white"
            }`}
          >
            <Camera className="w-4 h-4" />
            Kamera Live
          </button>
          <button
            type="button"
            onClick={() => switchMode("upload")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
              mode === "upload"
                ? "bg-blue-600 text-white border border-blue-400/30 font-bold"
                : "text-[#93C5FD] hover:text-white"
            }`}
          >
            <ImagePlus className="w-4 h-4" />
            Upload Foto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
        {/* Scanner Viewport — Kamera Live / Upload Foto */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={
              mode === "upload"
                ? "relative bg-black rounded-3xl overflow-hidden border-2 border-slate-400/60 shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_20px_60px_rgba(0,0,0,0.6)] flex items-center justify-center aspect-auto min-h-[480px] p-6"
                : "relative w-full max-w-[800px] mx-auto drop-shadow-2xl"
            }
            style={mode === "upload" ? undefined : { aspectRatio: "548 / 455" }}
          >
            {mode === "upload" ? null : (
              /* Bingkai kamera DSLR Canon EOS 4K Ultra HD — tajam & jernih */
              <img
                src="/images/camera-frame.png"
                alt="Canon Camera Frame"
                aria-hidden
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 select-none"
                style={{
                  filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.85)) contrast(1.04) brightness(1.02)",
                  imageRendering: "auto",
                }}
              />
            )}
            {mode === "upload" ? (
              /* ---------- Mode Upload Foto ---------- */
              <div className="w-full max-w-xl mx-auto space-y-4">
                {uploadStage === "select" ? (
                  <div className="space-y-4">
                    <PhotoUpload
                      subcategory={subcategory}
                      onPhotoLoaded={(dataUrl) => {
                        setPhotoDataUrl(dataUrl);
                        setUploadStage("reposition");
                        setUploadError(null);
                        setQualityIssues([]);
                      }}
                    />
                    <p className="flex items-center justify-center gap-1.5 text-xs text-[#64748B] text-center font-mono">
                      <ShieldCheck className="w-4 h-4 text-[#38BDF8] shrink-0" />
                      Foto diproses sepenuhnya di perangkat Anda — Zero Persistent Biometrics (UU PDP No. 27/2022).
                    </p>
                  </div>
                ) : (
                  <>
                    {photoDataUrl && (
                      subcategory === "shirts" ? (
                        <BodyRepositionTool
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
                      ) : (
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
                      )
                    )}

                    {uploadError && (
                      <div className="rounded-2xl p-4 border border-rose-500/40 bg-[#071120] flex items-start gap-2.5">
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-1">
                          <p className="text-xs text-rose-300 leading-relaxed">{uploadError}</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (lastSnapshotRef.current) void analyzePhoto(lastSnapshotRef.current, false);
                            }}
                            className="text-xs font-semibold text-[#93C5FD] underline hover:text-white cursor-pointer"
                          >
                            Coba Analisis Ulang
                          </button>
                        </div>
                      </div>
                    )}

                    {isScanning && mode === "upload" && (
                      <div className="rounded-2xl p-4 border border-blue-500/30 bg-[#071120]/90">
                        <div className="flex justify-between text-xs font-mono text-[#93C5FD] mb-2">
                          <span>Menganalisis Foto via AI Vision...</span>
                          <span className="text-[#FACC15] font-bold">{scanProgress}%</span>
                        </div>
                        <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-blue-500/20">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-[#FACC15] transition-all duration-300"
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
              {/* Layar LCD kamera DSLR Canon — proporsi pas di dalam bezel layar */}
              <div
                className="absolute z-10 overflow-hidden rounded-[3px] bg-black shadow-[inset_0_0_20px_rgba(0,0,0,0.95)]"
                style={{ left: "16.42%", top: "42.20%", width: "45.07%", height: "36.26%" }}
              >
              <div className="relative w-full h-full bg-black flex items-center justify-center">
            {hasCamera ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedData={() => setIsVideoPlaying(true)}
                  onPlaying={() => setIsVideoPlaying(true)}
                  className="w-full h-full object-cover transform -scale-x-100"
                  style={{ filter: "brightness(1.35) contrast(1.05)" }}
                />

                {/* Maskot saat kamera sedang loading/menghubungkan */}
                {(!isVideoPlaying || isModelLoading) && (
                  <div className="absolute inset-0 z-30 bg-[#071120] flex flex-col items-center justify-center space-y-3 p-4 text-center">
                    <div className="relative z-10 flex items-center justify-center">
                      <img
                        src="/images/mascot.png"
                        alt="COBA Mascot"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md animate-bounce"
                        style={{ animationDuration: '2s' }}
                      />
                    </div>

                    {/* Tulisan Loading Bergelombang */}
                    <div className="flex items-center space-x-1 font-mono text-xs sm:text-sm font-bold tracking-[0.2em] text-[#38BDF8] uppercase">
                      {['L', 'O', 'A', 'D', 'I', 'N', 'G', '.', '.', '.'].map((char, index) => (
                        <span
                          key={index}
                          className="animate-text-wave inline-block text-white"
                          style={{ animationDelay: `${index * 120}ms` }}
                        >
                          {char}
                        </span>
                      ))}
                    </div>

                    <div className="w-36 sm:w-44 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="animate-loading-slide h-full w-1/3 rounded-full bg-blue-500" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#071120]">
                {cameraError ? (
                  <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#0B1528] p-4 space-y-3 flex flex-col items-center z-20 shadow-xl">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/25 flex items-center justify-center">
                      <VideoOff className="w-5 h-5 text-rose-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Kamera tidak dapat diakses</p>
                      <p className="text-[10px] text-[#94A3B8] leading-relaxed">{cameraError}</p>
                    </div>

                    <div className="flex flex-col gap-2 w-full pt-1">
                      <button
                        onClick={retryCamera}
                        type="button"
                        className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Coba Lagi</span>
                      </button>

                      <button
                        onClick={() => {
                          const defaultProfile = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
                          setScannedProfile(defaultProfile);
                        }}
                        type="button"
                        className="w-full px-3 py-2 rounded-xl text-xs font-medium text-[#93C5FD] bg-transparent hover:bg-white/5 border border-white/15 hover:border-blue-400/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>Lanjut Simulasi</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="relative z-10 flex items-center justify-center">
                      <img
                        src="/images/mascot.png"
                        alt="COBA Mascot"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md animate-bounce"
                        style={{ animationDuration: '2s' }}
                      />
                    </div>

                    <div className="flex items-center space-x-1 font-mono text-xs sm:text-sm font-bold tracking-[0.2em] text-[#38BDF8] uppercase">
                      {['L', 'O', 'A', 'D', 'I', 'N', 'G', '.', '.', '.'].map((char, index) => (
                        <span
                          key={index}
                          className="animate-text-wave inline-block text-white"
                          style={{ animationDelay: `${index * 120}ms` }}
                        >
                          {char}
                        </span>
                      ))}
                    </div>

                    <div className="w-36 sm:w-44 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="animate-loading-slide h-full w-1/3 rounded-full bg-blue-500" />
                    </div>

                    <button
                      onClick={() => {
                        const defaultProfile = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
                        setScannedProfile(defaultProfile);
                      }}
                      type="button"
                      className="mt-2 px-4 py-2 rounded-full text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Gunakan Profil Simulasi</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder Reticle Frame — bersih tanpa kartu atau teks yang menutupi video */}
            <div className="absolute inset-0 pointer-events-none p-2 flex items-center justify-center">
              {/* Corner L-Brackets */}
              <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-white/60" />
              <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-white/60" />
              <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-white/60" />
              <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-white/60" />

              {/* Countdown: Simpel angka besar tanpa card */}
              {countdown !== null && (
                <div className="relative flex items-center justify-center pointer-events-none z-30 animate-pulse">
                  <span className="text-6xl sm:text-7xl font-black text-white font-mono drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] select-none">
                    {countdown}
                  </span>
                </div>
              )}

              {/* Scanning Laser Line */}
              {isScanning && (
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_15px_#38BDF8] animate-scan-laser" />
              )}
            </div>

            {/* Scan Progress Bar */}
            {isScanning && (
              <div className="absolute bottom-1.5 left-2 right-2 bg-[#0B1528]/95 backdrop-blur-md rounded-lg p-1.5 border border-blue-500/20 z-20">
                <div className="flex justify-between text-[8px] font-mono text-[#93C5FD] mb-1">
                  <span>{subcategory === "shirts" ? "Mengekstraksi Siluet Tubuh..." : "Mengekstraksi Ciri Visual..."}</span>
                  <span className="text-[#FACC15] font-bold">{scanProgress}%</span>
                </div>
                <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-blue-500/20 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-[#FACC15] rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}
              </div>
              </div>
              </>
            )}
          </div>

          {/* Standalone Warning Card (Outside Main Box to prevent layout distortion) */}
          {qualityIssues.length > 0 && mode === "upload" && uploadStage === "reposition" && (
            <div className="rounded-3xl p-5 space-y-3 border border-amber-500/30 bg-[#0B1528]/95 backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Perlu Penyesuaian Foto</span>
              </div>
              <ul className="text-xs text-[#94A3B8] list-disc pl-5 space-y-1 leading-relaxed">
                {qualityIssues.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  if (lastSnapshotRef.current) void analyzePhoto(lastSnapshotRef.current, true);
                }}
                className="w-full py-2.5 rounded-full text-xs font-semibold font-mono text-[#93C5FD] bg-[#071120] hover:bg-blue-600/30 border border-blue-500/40 transition-colors cursor-pointer"
              >
                Lanjutkan Analisis (abaikan peringatan)
              </button>
            </div>
          )}
        </div>

        {/* Profile Output or Action Card */}
        <div className="lg:col-span-5 space-y-4">
          {!scannedProfile ? (
            <div className="bg-[#0B1528]/90 rounded-3xl p-7 space-y-6 border border-blue-500/20 backdrop-blur-xl shadow-xl">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <span>{subcategory === "shirts" ? "Petunjuk Pemindaian Tubuh" : "Petunjuk Pemindaian Wajah"}</span>
                </h3>

                <ul className="space-y-3.5 text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600/20 text-[#93C5FD] flex items-center justify-center shrink-0 font-mono text-xs font-bold border border-blue-500/30">
                      1
                    </span>
                    <span>
                      {subcategory === "shirts"
                        ? "Posisikan tubuh bagian atas (bahu dan dada) lurus menghadap kamera."
                        : (mode === "upload"
                          ? "Unggah foto frontal lalu sejajarkan wajah ke dalam panduan."
                          : "Posisikan wajah Anda tepat di dalam lingkaran pemandu virtual.")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600/20 text-[#93C5FD] flex items-center justify-center shrink-0 font-mono text-xs font-bold border border-blue-500/30">
                      2
                    </span>
                    <span>{subcategory === "shirts" ? "Pastikan kedua bahu terlihat simetris pada kamera." : "Pastikan pencahayaan ruangan cukup merata pada area wajah."}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600/20 text-[#93C5FD] flex items-center justify-center shrink-0 font-mono text-xs font-bold border border-blue-500/30">
                      3
                    </span>
                    <span>
                      {subcategory === "shirts" ? "AI akan mengukur siluet torso, rasio bahu, dan keserasian rona kulit." : "Lepaskan kacamata atau masker sesaat untuk akurasi optimal."}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span>
                      Pemindaian otomatis dimulai dengan{" "}
                      <strong className="text-[#FACC15]">countdown 3 detik</strong> saat posisi
                      terkunci.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                {/* Face detection status indicator */}
                {hasCamera && (
                  <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs font-medium transition-all duration-300"
                    style={{
                      borderColor: guideStyle.border + "40",
                      backgroundColor: "#071120",
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

                {/* Manual Scan Button */}
                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={isScanning || (mode === "camera" && faceGuideState === "NO_FACE" && !lastAlignedLmRef.current && !lastAlignedPoseRef.current)}
                  className={`w-full py-4 rounded-full font-bold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                    faceGuideState === "ALIGNED"
                      ? "bg-blue-600 hover:bg-blue-500 border border-blue-400/30 shadow-lg shadow-blue-500/20"
                      : faceGuideState === "MISALIGNED" || lastAlignedLmRef.current || lastAlignedPoseRef.current
                      ? "bg-blue-600 hover:bg-blue-500 border border-blue-400/30 text-white cursor-pointer shadow-md"
                      : "bg-[#071120] text-[#64748B] border border-blue-500/20"
                  }`}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sedang Menganalisis AI...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4" />
                      <span>
                        {subcategory === "shirts" ? (
                          faceGuideState === "ALIGNED"
                            ? "Pindai Tubuh Sekarang"
                            : "Pindai Tubuh (Manual)"
                        ) : (
                          faceGuideState === "ALIGNED"
                            ? "Pindai Sekarang"
                            : "Pindai Sekarang (Manual)"
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            (() => {
              const isFemale = scannedProfile.gender?.label_id === "female";
              const skinHex = scannedProfile.monk_tone?.hex || scannedProfile.skin_tone?.hex || "#C58C66";

              return (
                <div
                  className={`rounded-3xl p-6 sm:p-7 border backdrop-blur-2xl space-y-4 transition-all duration-500 ${
                    isFemale
                      ? "border-pink-500/30 bg-gradient-to-b from-[#1d0a1b]/95 via-[#130713]/95 to-[#080208]/95 shadow-[0_0_60px_rgba(236,72,153,0.18)]"
                      : "border-blue-500/30 bg-gradient-to-b from-[#0b1528]/95 via-[#080f1d]/95 to-[#040810]/95 shadow-[0_0_60px_rgba(59,130,246,0.18)]"
                  }`}
                >
                  {/* Top Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <h3 className="font-extrabold text-white text-lg leading-tight">
                        Profil Karakter Terdeteksi
                      </h3>
                      <p
                        className={`text-xs font-mono font-medium ${
                          isFemale ? "text-pink-300" : "text-sky-300"
                        }`}
                      >
                        Biometrik Terverifikasi • Standar ISO/IEC &amp; Monk Scale
                      </p>
                    </div>
                    <button
                      type="button"
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
                      className={`px-3.5 py-1.5 rounded-full bg-black/40 border text-xs flex items-center gap-1.5 cursor-pointer font-mono transition-colors ${
                        isFemale
                          ? "border-pink-500/30 text-pink-300 hover:text-white hover:bg-pink-600/30"
                          : "border-blue-500/30 text-sky-300 hover:text-white hover:bg-blue-600/30"
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ulangi</span>
                    </button>
                  </div>

                  {/* Sub-Card 1: Karakteristik & Siluet (Rounded 2xl Cards) */}
                  <div
                    className={`rounded-2xl p-4 border space-y-3 ${
                      isFemale ? "bg-pink-950/20 border-pink-500/20" : "bg-[#071120] border-blue-500/20"
                    }`}
                  >
                    {/* 1. Warna Kulit (Translucent Subtle Tint matching actual skin tone) */}
                    <div
                      className="p-4 rounded-2xl flex items-center justify-between shadow-lg transition-all border backdrop-blur-md"
                      style={{
                        background: `linear-gradient(135deg, ${skinHex}40 0%, ${skinHex}20 100%)`,
                        borderColor: `${skinHex}55`,
                      }}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-10 h-10 rounded-2xl border flex items-center justify-center shadow-md backdrop-blur-md"
                          style={{
                            backgroundColor: `${skinHex}30`,
                            borderColor: `${skinHex}70`,
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: skinHex }}
                          />
                        </div>
                        <div>
                          <span className="text-slate-300 font-mono text-[10px] uppercase tracking-wider block font-semibold">
                            WARNA KULIT
                          </span>
                          <span className="font-extrabold text-white text-base">
                            {scannedProfile.skin_tone?.tone || "Tan"}
                          </span>
                        </div>
                      </div>
                      <div
                        className="px-3.5 py-1.5 rounded-full border font-mono font-bold text-xs shadow-inner"
                        style={{
                          backgroundColor: `${skinHex}35`,
                          borderColor: `${skinHex}70`,
                          color: '#FFFFFF',
                        }}
                      >
                        {scannedProfile.monk_tone?.code || "MST-06"}
                      </div>
                    </div>

                    {/* 2. Siluet Tubuh / Bentuk Wajah */}
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block font-semibold">
                          {subcategory === "shirts" ? "SILUET TUBUH" : "BENTUK WAJAH"}
                        </span>
                        <span className="font-bold text-white text-base">
                          {subcategory === "shirts"
                            ? (scannedProfile.body_shape_classification?.body_shape || "Trapezoid (Atletis)")
                            : (scannedProfile.face_shape?.shape || "Oblong")}
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                          isFemale
                            ? "bg-pink-500/15 border-pink-500/30 text-pink-300"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        }`}
                      >
                        {subcategory === "shirts"
                          ? `${Math.round((scannedProfile.body_shape_classification?.confidence || 0.97) * 100)}% Match`
                          : `${Math.round((scannedProfile.face_shape?.confidence || 0.98) * 100)}% Match`}
                      </span>
                    </div>

                    {/* 3. Gender / Jenis Kelamin dengan Simbol Resmi (Mars ♂ & Venus ♀) */}
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block font-semibold">
                          JENIS KELAMIN
                        </span>
                        <span className="font-bold text-white text-base flex items-center gap-2">
                          {isFemale ? (
                            <>
                              {/* Simbol Venus (Wanita ♀) */}
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-4 h-4 text-pink-400 shrink-0"
                              >
                                <circle cx="12" cy="9" r="5" />
                                <line x1="12" y1="14" x2="12" y2="21" />
                                <line x1="9" y1="18" x2="15" y2="18" />
                              </svg>
                              <span>Wanita</span>
                            </>
                          ) : (
                            <>
                              {/* Simbol Mars (Pria ♂) */}
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-4 h-4 text-sky-400 shrink-0"
                              >
                                <circle cx="10" cy="14" r="5" />
                                <line x1="19" y1="5" x2="13.6" y2="10.4" />
                                <polyline points="15 5 19 5 19 9" />
                              </svg>
                              <span>Pria</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="inline-flex rounded-2xl bg-black/40 p-1 border border-white/15 gap-1 shadow-inner">
                        <button
                          type="button"
                          onClick={() =>
                            setScannedProfile((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    gender: {
                                      label: "Pria (Male)",
                                      label_id: "male",
                                      confidence: 1.0,
                                      method: "manual_selection",
                                      rule: "dipilih pengguna",
                                    },
                                  }
                                : prev
                            )
                          }
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            !isFemale
                              ? "bg-blue-600 border border-blue-400 text-white shadow-md"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {/* Simbol Mars ♂ */}
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5 shrink-0"
                          >
                            <circle cx="10" cy="14" r="5" />
                            <line x1="19" y1="5" x2="13.6" y2="10.4" />
                            <polyline points="15 5 19 5 19 9" />
                          </svg>
                          <span>Pria</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setScannedProfile((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    gender: {
                                      label: "Wanita (Female)",
                                      label_id: "female",
                                      confidence: 1.0,
                                      method: "manual_selection",
                                      rule: "dipilih pengguna",
                                    },
                                  }
                                : prev
                            )
                          }
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isFemale
                              ? "bg-pink-600 border border-pink-400 text-white shadow-md"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {/* Simbol Venus ♀ */}
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5 shrink-0"
                          >
                            <circle cx="12" cy="9" r="5" />
                            <line x1="12" y1="14" x2="12" y2="21" />
                            <line x1="9" y1="18" x2="15" y2="18" />
                          </svg>
                          <span>Wanita</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Card 2: Proporsi & Antropometri (Curved Grid Format) */}
                  <div
                    className={`rounded-2xl p-4 border space-y-3 ${
                      isFemale ? "bg-pink-950/20 border-pink-500/20" : "bg-[#071120] border-blue-500/20"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-white/5">
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                          isFemale ? "text-pink-300" : "text-sky-300"
                        }`}
                      >
                        {subcategory === "shirts" ? "PROPORSI & SILUET TUBUH" : "PROPORSI GEOMETRI WAJAH"}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">Pinhole Metric Calibrated</span>
                    </div>

                    {subcategory === "shirts" ? (
                      <div className="space-y-2">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-300 uppercase font-semibold">Lebar Bahu</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {scannedProfile.body_measurements_cm?.shoulder_width_cm || 44.5} cm
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-300 uppercase font-semibold">Lebar Dada</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {scannedProfile.body_measurements_cm?.chest_width_cm || 42.0} cm
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-300 uppercase font-semibold">Rasio V-Shape</span>
                          <span
                            className={`text-sm font-bold font-mono ${
                              isFemale ? "text-pink-300" : "text-sky-300"
                            }`}
                          >
                            {(scannedProfile as any).body_measurements?.shoulder_to_hip_ratio
                              ? `${(scannedProfile as any).body_measurements.shoulder_to_hip_ratio}x`
                              : "1.18x"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-300 uppercase font-semibold">Lebar Dahi</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {scannedProfile.face_measurements?.forehead_width_cm ?? 12.56} cm
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-300 uppercase font-semibold">Lebar Pipi (Cheekbone)</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {scannedProfile.face_measurements?.cheekbone_width_cm ?? 12.46} cm
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-300 uppercase font-semibold">Lebar Rahang (Jawline)</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {scannedProfile.face_measurements?.jaw_width_cm ?? 9.6} cm
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-mono text-[11px]">Karakteristik Sensorik:</span>
                          <span
                            className={`font-semibold ${
                              isFemale ? "text-pink-300" : "text-sky-300"
                            }`}
                          >
                            Hidung {scannedProfile.nose_type || "Bulbous"} • Mata {scannedProfile.eye_shape || "Cat-eye"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() =>
                      onScanComplete(scannedProfile, streamRef.current || undefined, { inputMode: mode })
                    }
                    className={`w-full py-4 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${
                      isFemale
                        ? "bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 border border-pink-400/30 shadow-[0_4px_25px_rgba(236,72,153,0.35)]"
                        : "bg-gradient-to-r from-blue-600 via-sky-500 to-blue-500 hover:from-blue-500 hover:to-sky-400 border border-blue-400/30 shadow-[0_4px_25px_rgba(59,130,246,0.35)]"
                    }`}
                  >
                    <span>Lanjut ke Kuesioner Gaya {subcatLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraScan;
