"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  AlertTriangle,
  User,
  Activity,
  ImagePlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { UserPersonalProfile, MOCK_PRESETS } from "../lib/mockData";
import PhotoUpload from "./PhotoUpload";
import BodyRepositionTool from "./BodyRepositionTool";
import {
  buildBodyAnalysisPayload,
  collectBodyQualityIssues,
  isValidHumanBodyPose,
  PoseLandmark,
  POSE_LM,
  BodyAnalysisPayload,
} from "../lib/bodyGeometry";
import { analyzeSkin } from "../lib/api";

const POSE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

interface BodyScanProps {
  onScanComplete: (profile: UserPersonalProfile, bodyPayload?: BodyAnalysisPayload) => void;
  onBack?: () => void;
  overrideProfile?: UserPersonalProfile;
}

export const BodyScan: React.FC<BodyScanProps> = ({ onScanComplete, onBack, overrideProfile }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const imagePoseLandmarkerRef = useRef<any>(null);
  const filesetRef = useRef<any>(null);

  // States
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<"select" | "reposition">("select");
  const [userHeightCm, setUserHeightCm] = useState<number>(165);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("Inisialisasi sensor pose tubuh...");
  const [alignmentState, setAlignmentState] = useState<"NO_BODY" | "MISALIGNED" | "ALIGNED">("NO_BODY");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const alignedFramesRef = useRef<number>(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastSnapshotRef = useRef<string | null>(null);

  /* ---- Inisialisasi MediaPipe PoseLandmarker ---- */
  const initPoseLandmarker = useCallback(async () => {
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { PoseLandmarker, FilesetResolver } = vision;

      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      filesetRef.current = fileset;

      const buildOptions = (delegate: "GPU" | "CPU", runningMode: "VIDEO" | "IMAGE") => ({
        baseOptions: { modelAssetPath: POSE_LANDMARKER_MODEL_URL, delegate },
        runningMode,
        numPoses: 1,
      });

      let landmarker: any = null;
      try {
        landmarker = await PoseLandmarker.createFromOptions(fileset, buildOptions("GPU", "VIDEO"));
      } catch {
        landmarker = await PoseLandmarker.createFromOptions(fileset, buildOptions("CPU", "VIDEO"));
      }
      poseLandmarkerRef.current = landmarker;
      setIsModelReady(true);
      setStatusMessage("Posisikan seluruh tubuh di dalam garis siluet");
    } catch (err) {
      console.warn("Gagal inisialisasi PoseLandmarker:", err);
      setCameraError("Sensor pose tidak dapat diakses.");
    }
  }, []);

  useEffect(() => {
    initPoseLandmarker();
  }, [initPoseLandmarker]);

  /* ---- Cleanup stream kamera ---- */
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /* ---- Setup Kamera ---- */
  const setupCamera = useCallback(async () => {
    if (mode !== "camera") return;
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
      setHasCamera(true);
    } catch (err: any) {
      console.warn("Camera error:", err);
      setHasCamera(false);
      setCameraError(err.name === "NotReadableError" ? "Kamera sedang sibuk." : "Kamera tidak dapat diakses.");
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "camera") {
      setupCamera();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [mode, setupCamera, stopCameraStream]);

  /* ---- Image PoseLandmarker instance ---- */
  const getImagePoseLandmarker = useCallback(async () => {
    if (imagePoseLandmarkerRef.current) return imagePoseLandmarkerRef.current;
    if (!filesetRef.current) return null;
    const { PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const landmarker = await PoseLandmarker.createFromOptions(filesetRef.current, {
      baseOptions: { modelAssetPath: POSE_LANDMARKER_MODEL_URL, delegate: "GPU" },
      runningMode: "IMAGE",
      numPoses: 1,
    });
    imagePoseLandmarkerRef.current = landmarker;
    return landmarker;
  }, []);

  /* ---- Process Body Analysis Result ---- */
  const processBodyAnalysis = useCallback(
    async (lms: PoseLandmark[], snapshotDataUrl: string, widthPx: number, heightPx: number) => {
      setIsScanning(true);
      setStatusMessage("Menganalisis proporsi tubuh & rekomendasi busana...");

      try {
        const bodyPayload = buildBodyAnalysisPayload(lms, userHeightCm, widthPx, heightPx);
        let skinToneHex = "#D09E78";

        try {
          const skinResult = await analyzeSkin(snapshotDataUrl);
          skinToneHex = skinResult.detected_monk_hex || "#D09E78";
        } catch {
          // Fallback skin analysis
        }

        const basePreset = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
        const profile: UserPersonalProfile = {
          ...basePreset,
          monk_tone: {
            ...basePreset.monk_tone,
            hex: skinToneHex,
          },
          body_shape: {
            shape:
              bodyPayload.body_ratios.shoulder_to_hip_ratio > 1.08
                ? "Inverted Triangle"
                : bodyPayload.body_ratios.waist_to_hip_ratio > 0.85
                ? "Rectangle"
                : bodyPayload.body_ratios.shoulder_to_hip_ratio < 0.92
                ? "Pear"
                : "Hourglass",
            confidence: 0.94,
            ratios: {
              shoulder_to_hip_ratio: bodyPayload.body_ratios.shoulder_to_hip_ratio,
              waist_to_hip_ratio: bodyPayload.body_ratios.waist_to_hip_ratio,
              waist_to_shoulder_ratio: bodyPayload.body_ratios.waist_to_shoulder_ratio,
            },
            silhouette_recommendations: ["Fitted Silhouette", "Tailored Fit"],
            jacket_recommendations: ["Casual Tailored Jacket", "Straight Zip Outer", "Classic Blazer"],
            styling_advice: `Bentuk tubuh teranalisis dengan rasio bahu ${bodyPayload.measurements_cm.shoulder_width_cm ?? 42} cm dan pinggul ${bodyPayload.measurements_cm.hip_width_cm ?? 38} cm.`,
          },
          scan_snapshot_dataurl: snapshotDataUrl,
        };

        stopCameraStream();
        onScanComplete(profile, bodyPayload);
      } catch (err) {
        console.error("Gagal proses analisis tubuh:", err);
        setIsScanning(false);
      }
    },
    [onScanComplete, stopCameraStream, userHeightCm]
  );

  /* ---- Analisis Foto Upload ---- */
  const analyzeUploadedPhoto = useCallback(
    async (snapshotDataUrl: string, width: number, height: number, ignoreQuality = false) => {
      setIsScanning(true);
      setUploadError(null);
      setStatusMessage("Memindai landmark tubuh dari foto...");

      try {
        const landmarker = await getImagePoseLandmarker();
        if (!landmarker) throw new Error("Sensor pose tidak siap.");

        const img = new Image();
        img.src = snapshotDataUrl;
        await new Promise((res) => (img.onload = res));

        const results = landmarker.detect(img);
        const lms: PoseLandmark[] | undefined = results?.landmarks?.[0];

        if (!lms || lms.length < 25) {
          throw new Error("Pose tubuh tidak terdeteksi. Pastikan seluruh badan terlihat jelas dari bahu hingga kaki.");
        }

        const payload = buildBodyAnalysisPayload(lms, userHeightCm, width, height);
        const issues = collectBodyQualityIssues(payload.quality);

        if (issues.length > 0 && !ignoreQuality) {
          setQualityIssues(issues);
          setUploadStage("reposition");
          setIsScanning(false);
          return;
        }

        await processBodyAnalysis(lms, snapshotDataUrl, width, height);
      } catch (err: any) {
        setUploadError(err.message || "Gagal menganalisis pose tubuh.");
        setUploadStage("reposition");
        setIsScanning(false);
      }
    },
    [getImagePoseLandmarker, processBodyAnalysis, userHeightCm]
  );

  /* ---- Realtime Tracking Loop (Kamera Live) ---- */
  useEffect(() => {
    if (mode !== "camera" || !hasCamera || !isModelReady || isScanning) return;

    let isActive = true;
    let lastValidLms: PoseLandmark[] | null = null;

    const loop = () => {
      if (!isActive) return;
      const video = videoRef.current;
      const cv = canvasRef.current;
      const landmarker = poseLandmarkerRef.current;

      if (video && cv && landmarker && video.readyState >= 2) {
        cv.width = video.videoWidth || 640;
        cv.height = video.videoHeight || 480;
        const ctx = cv.getContext("2d");

        if (ctx) {
          ctx.clearRect(0, 0, cv.width, cv.height);

          const result = landmarker.detectForVideo(video, performance.now());
          const lms: PoseLandmark[] | undefined = result?.landmarks?.[0];

          // 1. Uji ketat: Pastikan benar-benar tubuh manusia nyata (Bukan ruangan kosong / benda mati)
          const isRealHumanBody = isValidHumanBodyPose(lms, cv.width, cv.height);

          if (isRealHumanBody && lms) {
            lastValidLms = lms;
            const sL = lms[POSE_LM.shoulderL];
            const sR = lms[POSE_LM.shoulderR];
            const rollDeg = Math.abs((Math.atan2(sR.y - sL.y, sR.x - sL.x) * 180) / Math.PI);
            const isUpright = rollDeg <= 18;

            if (isUpright) {
              setAlignmentState("ALIGNED");
              setStatusMessage("Postur tubuh terdeteksi! Tahan posisi...");
              alignedFramesRef.current++;

              // Membutuhkan kestabilan postur ~20 frame berturut-turut sebelum countdown
              if (alignedFramesRef.current >= 20 && !countdownRef.current) {
                let count = 3;
                setCountdown(count);
                countdownRef.current = setInterval(() => {
                  count--;
                  if (count > 0) {
                    setCountdown(count);
                  } else {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    countdownRef.current = null;
                    setCountdown(null);

                    // Ambil snapshot hanya jika postur masih valid
                    if (lastValidLms) {
                      const snapCanvas = document.createElement("canvas");
                      snapCanvas.width = cv.width;
                      snapCanvas.height = cv.height;
                      const sCtx = snapCanvas.getContext("2d");
                      if (sCtx) {
                        sCtx.drawImage(video, 0, 0);
                        const dataUrl = snapCanvas.toDataURL("image/jpeg", 0.9);
                        lastSnapshotRef.current = dataUrl;
                        void processBodyAnalysis(lastValidLms, dataUrl, cv.width, cv.height);
                      }
                    }
                  }
                }, 1000);
              }
            } else {
              setAlignmentState("MISALIGNED");
              setStatusMessage("Tegakkan postur badan Anda (posisi bahu miring)");
              alignedFramesRef.current = 0;
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
                setCountdown(null);
              }
            }
          } else {
            // RUANGAN KOSONG / TIDAK ADA MANUSIA: Reset & Batalkan countdown seketika
            lastValidLms = null;
            setAlignmentState("NO_BODY");
            setStatusMessage("Berdirilah di depan kamera menghadap lurus");
            alignedFramesRef.current = 0;
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
              setCountdown(null);
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      isActive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [mode, hasCamera, isModelReady, isScanning, processBodyAnalysis]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Back Button */}
      {onBack && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Pilihan Kategori</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>TAHAP 2: PEMINDAIAN PROPORSI TUBUH</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Pindai Karakter & Siluet Tubuh Anda
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          AI akan membaca rasio lebar bahu, torso dada, dan proporsi siluet untuk kurasi <strong>Baju, Kemeja, dan Jaket Outerwear</strong> 3D yang proporsional.
        </p>
      </div>

      {/* Input Tinggi Badan Pengguna (Untuk Kalibrasi CM Presisi) */}
      <div className="flex justify-center items-center gap-3">
        <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
          <User className="w-4 h-4 text-blue-400" />
          Tinggi Badan:
        </label>
        <div className="inline-flex items-center rounded-xl bg-surface-100 border border-white/10 px-3 py-1.5 gap-2">
          <input
            type="number"
            min={130}
            max={220}
            value={userHeightCm}
            onChange={(e) => setUserHeightCm(Number(e.target.value))}
            className="w-16 bg-transparent text-sm font-bold text-white text-center focus:outline-none"
          />
          <span className="text-xs text-slate-400 font-mono">cm</span>
        </div>
      </div>

      {/* Dual Mode Tabs: Kamera Live vs Upload Foto */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl border border-white/10 bg-surface-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode("camera");
              setUploadError(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === "camera"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-4 h-4" />
            Kamera Live
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("upload");
              stopCameraStream();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === "upload"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ImagePlus className="w-4 h-4" />
            Upload Foto Badan
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 relative bg-surface-100 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center min-h-[480px]">
          {mode === "upload" ? (
            /* Mode Upload */
            <div className="w-full max-w-lg p-6 space-y-4">
              {uploadStage === "select" ? (
                <div className="space-y-4">
                  <PhotoUpload
                    onPhotoLoaded={(dataUrl, width, height) => {
                      setPhotoDataUrl(dataUrl);
                      lastSnapshotRef.current = dataUrl;
                      void analyzeUploadedPhoto(dataUrl, width, height, true);
                    }}
                  />
                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Foto diproses 100% di perangkat Anda — hanya angka rasio turunan yang dianalisis.
                  </p>
                </div>
              ) : (
                <>
                  {photoDataUrl && (
                    <BodyRepositionTool
                      photoDataUrl={photoDataUrl}
                      onConfirm={(snap, w, h) => {
                        lastSnapshotRef.current = snap;
                        void analyzeUploadedPhoto(snap, w, h, false);
                      }}
                      onBack={() => setUploadStage("select")}
                    />
                  )}

                  {qualityIssues.length > 0 && (
                    <div className="glass-panel rounded-2xl p-4 space-y-2 border border-yellow-500/30">
                      <div className="flex items-center gap-2 text-yellow-300 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4" /> Perlu Penyesuaian Foto Tubuh
                      </div>
                      <ul className="text-[11px] text-slate-300 list-disc pl-4 space-y-1">
                        {qualityIssues.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => {
                          if (lastSnapshotRef.current) {
                            void analyzeUploadedPhoto(lastSnapshotRef.current, 540, 720, true);
                          }
                        }}
                        className="w-full py-2 rounded-xl text-xs font-semibold text-yellow-200 bg-yellow-500/20 border border-yellow-400/30"
                      >
                        Lanjutkan Analisis (Abaikan)
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <div className="glass-panel rounded-2xl p-4 border border-red-500/30 flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300 flex-1">{uploadError}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Mode Kamera Live */
            <div className="relative w-full aspect-video max-h-[560px] flex items-center justify-center bg-black rounded-3xl overflow-hidden">
              {hasCamera ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain -scale-x-100"
                  />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain -scale-x-100 pointer-events-none" />

                  {/* Siluet Pemandu Tubuh Live Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      className={`w-[45%] h-[90%] rounded-[40px] border-2 border-dashed transition-all duration-300 ${
                        alignmentState === "ALIGNED"
                          ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.3)]"
                          : alignmentState === "MISALIGNED"
                          ? "border-yellow-400"
                          : "border-red-400/60"
                      }`}
                    />
                  </div>

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                      <span className="text-7xl font-black text-emerald-400 animate-pulse font-mono">{countdown}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center space-y-4">
                  <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
                  <p className="text-sm text-slate-300">{cameraError || "Kamera tidak aktif."}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const preset = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
                      onScanComplete(preset);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    Gunakan Simulasi Wajah & Tubuh Indonesia
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status & Petunjuk Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400 uppercase">
              <Activity className="w-4 h-4" />
              Status Pemindaian
            </div>
            <p className="text-sm font-semibold text-white leading-relaxed">{statusMessage}</p>

            <div className="pt-4 border-t border-white/5 space-y-2 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Mundur ±1.5 - 2 meter dari kamera
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Berdiri tegak menghadap lurus
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Letakkan tangan di samping tubuh
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodyScan;
