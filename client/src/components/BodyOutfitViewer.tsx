"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Sparkles,
  Move3d,
  Sliders,
  RotateCcw,
  RefreshCw,
  Zap,
  Box,
  ShieldCheck,
} from "lucide-react";
import { RecommendationItem } from "../lib/mockData";

export interface BodyOutfitViewerProps {
  activeItem: RecommendationItem;
  subcategory: string;
  mediaStream?: MediaStream | null;
  userSnapshotUrl?: string | null;
}

export const BodyOutfitViewer: React.FC<BodyOutfitViewerProps> = ({
  activeItem,
  subcategory,
  mediaStream,
  userSnapshotUrl,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const garmentGroupRef = useRef<THREE.Group | null>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  // View Mode: 'ar' (Live 3D Body Fitting) vs 'studio' (3D 360° Inspection)
  const [viewMode, setViewMode] = useState<"ar" | "studio">("ar");
  const [isRotating, setIsRotating] = useState(true);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [fitStyle, setFitStyle] = useState<"regular" | "oversized" | "slim">("regular");
  const [offsetY, setOffsetY] = useState<number>(0);
  const [garmentOpacity, setGarmentOpacity] = useState<number>(100);
  const [modelSource, setModelSource] = useState<string>("Memuat 3D GLB...");

  const activeColorHex = activeItem.hex_colour || "#2563eb";

  /* ------------------------------------------------------------------ */
  /*  1. Initialize / Manage Camera Stream                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      if (userSnapshotUrl) return;

      try {
        let stream = mediaStream;
        const isStreamActive =
          stream && stream.active && stream.getVideoTracks().some((t) => t.readyState === "live");

        if (!isStreamActive) {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            });
            localStreamRef.current = stream;
          }
        }

        if (cancelled) {
          localStreamRef.current?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
        }
      } catch (err) {
        console.warn("Live camera init in BodyOutfitViewer:", err);
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [mediaStream, userSnapshotUrl]);

  /* ------------------------------------------------------------------ */
  /*  2. Initialize MediaPipe PoseLandmarker for Live Tracking           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function initPoseLandmarker() {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { PoseLandmarker, FilesetResolver } = vision;

        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        if (cancelled) return;

        const landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        if (!cancelled) {
          poseLandmarkerRef.current = landmarker;
        }
      } catch (err) {
        console.warn("Live PoseLandmarker initialization failed:", err);
      }
    }

    initPoseLandmarker();

    return () => {
      cancelled = true;
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close?.();
      }
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  3. Setup Three.js WebGL Scene & Render Loop                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const container = containerRef.current;
    container.querySelectorAll("canvas").forEach((c) => c.remove());
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.zIndex = "10";
    renderer.domElement.style.pointerEvents = "none";

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(-3, -2, 2);
    scene.add(rimLight);

    const garmentGroup = new THREE.Group();
    garmentGroupRef.current = garmentGroup;
    scene.add(garmentGroup);

    // Load Categorized Shirt / Baju Model (GLB preferred, OBJ fallback)
    loadCategorizedGarmentGLB(garmentGroup);

    let lastVideoTime = -1;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const video = videoRef.current;
      const landmarker = poseLandmarkerRef.current;

      if (viewMode === "ar" && video && video.readyState >= 2 && landmarker) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, performance.now());
            if (result && result.landmarks && result.landmarks.length > 0) {
              setIsTrackingLive(true);
              applyPoseLandmarksTo3D(result.landmarks[0], garmentGroup);
            } else {
              setIsTrackingLive(false);
              garmentGroup.position.lerp(new THREE.Vector3(0, -0.2, 0), 0.05);
            }
          } catch {
            // Frame skip
          }
        }
      } else if (viewMode === "studio") {
        setIsTrackingLive(false);
        if (isRotating && garmentGroup) {
          garmentGroup.rotation.y += 0.015;
          garmentGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.08);
          garmentGroup.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.08);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
    };
  }, [viewMode, isRotating, offsetY, activeItem, subcategory, garmentOpacity, fitStyle]);

  /* ------------------------------------------------------------------ */
  /*  4. Load Categorized Shirt / Baju Model using GLTFLoader           */
  /* ------------------------------------------------------------------ */
  const loadCategorizedGarmentGLB = (group: THREE.Group) => {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const widthScale = fitStyle === "oversized" ? 1.18 : fitStyle === "slim" ? 0.9 : 1.0;

    const matGarment = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(activeColorHex),
      roughness: 0.65,
      metalness: 0.1,
      clearcoat: 0.15,
      transparent: garmentOpacity < 100,
      opacity: garmentOpacity / 100,
      side: THREE.DoubleSide,
    });

    let modelPath = activeItem.model_3d_path || "/images/products/shirts/Pria/color_blocked_shirt.glb";
    const filename = modelPath.split("/").pop() || "";

    // Fetch calibration manifest
    let modelConfig: any = null;
    try {
      fetch("/images/products/glb_manifest.json")
        .then((res) => (res.ok ? res.json() : null))
        .then((manifest) => {
          if (manifest) modelConfig = manifest[filename];
        })
        .catch(() => {});
    } catch {}

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // Apply manifest rotation if any
        if (modelConfig?.rotation_correction) {
          const [rx, ry, rz] = modelConfig.rotation_correction;
          model.rotation.x += rx;
          model.rotation.y += ry;
          model.rotation.z += rz;
        }

        // Auto center and scale model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        model.position.sub(center);
        model.position.y += 0.35;

        // Apply manifest pivot offset
        if (modelConfig?.pivot_offset) {
          const [ox, oy, oz] = modelConfig.pivot_offset;
          model.position.x += ox;
          model.position.y += oy;
          model.position.z += oz;
        }

        // Normalize model width (size.x) to ~1.8 standard torso units
        const targetW = size.x > 0 ? size.x : 1.0;
        const customScaleFactor = modelConfig?.scale_factor || 1.0;
        const normScale = (1.85 / targetW) * customScaleFactor;
        model.scale.set(normScale * widthScale, normScale, normScale * widthScale);

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const existingMat = mesh.material as THREE.MeshStandardMaterial;
            if (!existingMat || !existingMat.map) {
              mesh.material = matGarment;
            } else if (existingMat) {
              existingMat.transparent = garmentOpacity < 100;
              existingMat.opacity = garmentOpacity / 100;
              existingMat.side = THREE.DoubleSide;
            }
          }
        });

        group.add(model);
        const filename = modelPath.split("/").pop();
        setModelSource(`3D Dataset GLB (${filename})`);
      },
      undefined,
      (err) => {
        console.warn(`GLB load failed for ${modelPath}:`, err);
      }
    );
  };

  /* ------------------------------------------------------------------ */
  /*  5. Real-Time 3D Pose Landmark Anchoring & Deformation             */
  /* ------------------------------------------------------------------ */
  const applyPoseLandmarksTo3D = useCallback(
    (landmarks: any[], group: THREE.Group) => {
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];

      if (!leftShoulder || !rightShoulder) return;

      const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
      const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

      const posX = (0.5 - midShoulderX) * 4.4;
      const posY = (0.5 - midShoulderY) * 3.6 + offsetY * 0.01 - 0.15;
      const posZ = (((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2) * -3.2;

      // 1. Roll: Shoulder slope
      const dx = rightShoulder.x - leftShoulder.x;
      const dy = rightShoulder.y - leftShoulder.y;
      const rollAngle = Math.atan2(dy, dx);
      const safeRoll = THREE.MathUtils.clamp(-rollAngle, -0.65, 0.65);

      // 2. Yaw: Torso rotation around Y
      const depthDiff = (leftShoulder.z || 0) - (rightShoulder.z || 0);
      const yawAngle = Math.atan2(depthDiff * 2.8, Math.abs(dx) + 0.001);
      const safeYaw = THREE.MathUtils.clamp(yawAngle, -0.75, 0.75);

      // 3. Pitch: Torso leaning forward / backward
      let safePitch = 0;
      if (leftHip && rightHip) {
        const midHipZ = ((leftHip.z || 0) + (rightHip.z || 0)) / 2;
        const midShoulderZ = ((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2;
        const pitchDelta = (midShoulderZ - midHipZ) * 1.8;
        safePitch = THREE.MathUtils.clamp(pitchDelta, -0.45, 0.45);
      }

      const shoulderDist = Math.sqrt(dx * dx + dy * dy);
      const baseScale = shoulderDist * 2.95;

      const fitMultiplier = fitStyle === "oversized" ? 1.15 : fitStyle === "slim" ? 0.9 : 1.0;
      const finalScale = baseScale * fitMultiplier;

      group.position.x = THREE.MathUtils.lerp(group.position.x, posX, 0.45);
      group.position.y = THREE.MathUtils.lerp(group.position.y, posY, 0.45);
      group.position.z = THREE.MathUtils.lerp(group.position.z, posZ, 0.45);

      group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw, 0.45);
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch, 0.45);

      group.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.45);
    },
    [fitStyle, offsetY]
  );

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* 3D AR Body Fitting Viewport */}
      <div className="relative w-full h-[520px] sm:h-[580px] rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
        {/* 3D WebGL Canvas Layer */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

        {/* Mode 1: Live Video AR / Static Snapshot Body Feed */}
        {viewMode === "ar" ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
            {userSnapshotUrl ? (
              <img
                src={userSnapshotUrl}
                alt="Body Scan Snapshot"
                className="w-full h-full object-contain -scale-x-100"
              />
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-contain -scale-x-100"
                autoPlay
                playsInline
                muted
              />
            )}

            {isTrackingLive && (
              <div className="absolute top-4 left-4 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono z-30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>3D BODY POSE TRACKING (60 FPS)</span>
              </div>
            )}
          </div>
        ) : (
          /* Mode 2: 3D Studio Turntable */
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-surface-200/50 via-surface-100/40 to-slate-950">
            <div className="absolute bottom-6 w-80 h-80 rounded-full bg-blue-500/10 border border-blue-500/20 blur-sm pointer-events-none" />
            <div className="absolute top-4 left-4 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono z-20">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>3D STUDIO GARMENT INSPECTION</span>
            </div>
          </div>
        )}

        {/* Top Floating View Controls */}
        <div className="absolute top-4 right-4 z-30 flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-white/15 shadow-2xl">
          <button
            onClick={() => setViewMode("ar")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              viewMode === "ar"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Pasang ke Badan (AR 3D)</span>
          </button>
          <button
            onClick={() => setViewMode("studio")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              viewMode === "studio"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Move3d className="w-3.5 h-3.5" />
            <span>Putar 360°</span>
          </button>
        </div>

        {/* Bottom Floating Info Badge */}
        <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center space-x-2.5 px-3.5 py-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-white/10 text-xs shadow-lg">
          <Box className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-white">{activeItem.name}</span>
          <span className="text-emerald-400 text-[11px] font-mono font-bold">
            [{modelSource}]
          </span>
        </div>
      </div>

      {/* Interactive Micro-Adjustments & Fit Controls */}
      <div className="glass-panel p-4 rounded-3xl border border-white/10 bg-surface-100/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-xs">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-300">Potongan Siluet (Fit):</span>
          <div className="inline-flex rounded-xl bg-slate-900/80 p-1 border border-white/10">
            {(["slim", "regular", "oversized"] as const).map((style) => (
              <button
                key={style}
                onClick={() => setFitStyle(style)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                  fitStyle === style
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-400 font-semibold">Posisi Bahu:</span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setOffsetY((prev) => prev + 2)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs"
              title="Geser Naik"
            >
              ▲ Naik
            </button>
            <button
              onClick={() => setOffsetY((prev) => prev - 2)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs"
              title="Geser Turun"
            >
              ▼ Turun
            </button>
            <button
              onClick={() => setOffsetY(0)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10"
              title="Reset Posisi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-400 font-mono">Transparansi: <strong className="text-blue-400">{garmentOpacity}%</strong></span>
          <input
            type="range"
            min={30}
            max={100}
            value={garmentOpacity}
            onChange={(e) => setGarmentOpacity(Number(e.target.value))}
            className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default BodyOutfitViewer;
