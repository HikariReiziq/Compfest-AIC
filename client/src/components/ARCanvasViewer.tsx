"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Sparkles,
  Move3d,
  Zap,
  Box,
  RotateCcw,
  Sliders,
  Lock,
} from "lucide-react";
import { RecommendationItem } from "../lib/mockData";

/** Lebar topi setelah normalisasi, kira-kira selebar kepala di ruang scene. */
const HAT_TARGET_WIDTH = 1.35;
/** Lebar baju setelah normalisasi di ruang scene. */
const SHIRT_TARGET_WIDTH = 1.45;

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface ARCanvasViewerProps {
  activeItem: RecommendationItem;
  subcategory: string;
  mediaStream?: MediaStream | null;
  inputMode?: "camera" | "upload";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const ARCanvasViewer: React.FC<ARCanvasViewerProps> = ({
  activeItem,
  subcategory,
  mediaStream,
  inputMode = "camera",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelSource, setModelSource] = useState<string>("Memuat 3D Model...");
  const [offsetY, setOffsetY] = useState<number>(0);
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(100);

  const isUploadMode = inputMode === "upload";

  // View Mode: 'ar' (Live 3D AR on Face/Body) vs 'studio' (3D 360° Inspection)
  const [viewMode, setViewMode] = useState<"ar" | "studio">(isUploadMode ? "studio" : "ar");

  const sub = (activeItem.subcategory || subcategory || "").toLowerCase();
  const isHat = sub === "hats" || sub === "hat" || sub.includes("hat") || sub.includes("cap");
  const isShirt = sub === "shirts" || sub === "shirt" || sub.includes("shirt") || sub.includes("baju") || sub.includes("apparel");

  /* ------------------------------------------------------------------ */
  /*  1. Initialize / Manage Camera Stream                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      try {
        setCameraError(null);
        let stream = mediaStream;

        const isStreamActive =
          stream && stream.active && stream.getVideoTracks().some((t) => t.readyState === "live");
        if (!isStreamActive) {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError("Akses kamera tidak didukung di peramban ini.");
            return;
          }

          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            },
          });
          localStreamRef.current = stream;
        }

        if (cancelled) {
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
          }
          return;
        }

        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            setCameraReady(true);
          };
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn("Camera init error in ARCanvasViewer:", err);
          setCameraError("Kamera tidak dapat diakses.");
          setViewMode("studio");
        }
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [mediaStream]);

  /* ------------------------------------------------------------------ */
  /*  2. Initialize MediaPipe Landmarker (Face for Glasses/Hats, Pose for Shirts) */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function initLandmarker() {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { FaceLandmarker, PoseLandmarker, FilesetResolver } = vision;

        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        if (cancelled) return;

        if (isShirt) {
          // Initialize PoseLandmarker for Upper-Body Clothes Tracking
          let landmarker: any;
          try {
            landmarker = await PoseLandmarker.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              numPoses: 1,
            });
          } catch (gpuErr) {
            console.warn("PoseLandmarker GPU failed, falling back to CPU:", gpuErr);
            landmarker = await PoseLandmarker.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numPoses: 1,
            });
          }

          if (!cancelled) {
            poseLandmarkerRef.current = landmarker;
          }
        } else {
          // Initialize FaceLandmarker for Glasses / Hats
          const landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true,
          });

          if (!cancelled) {
            faceLandmarkerRef.current = landmarker;
          }
        }
      } catch (err) {
        console.warn("AR Landmarker initialization failed:", err);
      }
    }

    initLandmarker();

    return () => {
      cancelled = true;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close?.();
      }
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close?.();
      }
    };
  }, [isShirt]);

  /* ------------------------------------------------------------------ */
  /*  3. Setup Three.js WebGL Scene & 60 FPS Render Loop                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4.2);
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

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.8);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.8);
    rimLight.position.set(-3, -2, 2);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfff7ed, 1.2);
    fillLight.position.set(0, -2, 3);
    scene.add(fillLight);

    const modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;
    scene.add(modelGroup);

    // Load Categorized 3D Model (GLB)
    loadCategorized3DModel(modelGroup);

    let lastVideoTime = -1;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const video = videoRef.current;
      const faceLandmarker = faceLandmarkerRef.current;
      const poseLandmarker = poseLandmarkerRef.current;

      if (viewMode === "ar" && video && video.readyState >= 2) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            if (isShirt && poseLandmarker) {
              const result = poseLandmarker.detectForVideo(video, performance.now());
              if (result && result.landmarks && result.landmarks.length > 0) {
                setIsTrackingLive(true);
                modelGroup.visible = true;
                applyPoseLandmarksTo3DShirt(result.landmarks[0], modelGroup);
              } else {
                setIsTrackingLive(false);
                modelGroup.visible = false;
              }
            } else if (!isShirt && faceLandmarker) {
              const result = faceLandmarker.detectForVideo(video, performance.now());
              if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
                setIsTrackingLive(true);
                modelGroup.visible = true;
                applyLandmarksTo3DModel(result.faceLandmarks[0], modelGroup);
              } else {
                setIsTrackingLive(false);
                modelGroup.visible = false;
              }
            }
          } catch {
            // Frame skip
          }
        }
      } else if (viewMode === "studio") {
        setIsTrackingLive(false);
        if (modelGroup) {
          modelGroup.visible = true;
          modelGroup.rotation.y += 0.015;
          modelGroup.position.lerp(new THREE.Vector3(0, isShirt ? -0.2 : 0, 0), 0.08);
          modelGroup.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.08);
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
  }, [viewMode, activeItem, subcategory, offsetY, scaleMultiplier, isShirt]);

  /* ------------------------------------------------------------------ */
  /*  4. Load 3D Model File with Optical Glass Shaders & Auto-Alignment */
  /* ------------------------------------------------------------------ */
  const loadCategorized3DModel = async (group: THREE.Group) => {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    let modelPath = activeItem.model_3d_path || "";
    if (!modelPath) {
      if (isHat) modelPath = "/images/products/hats/bicorn_hat.glb";
      else if (isShirt) modelPath = "/images/products/shirts/man_shirt.glb";
      else modelPath = "/images/products/glasses/glasses_01_khronos_pbr.glb";
    }

    const filename = modelPath.split("/").pop() || "";

    // Fetch GLB calibration manifest
    let modelConfig: any = null;
    try {
      const manifestRes = await fetch("/images/products/glb_manifest.json");
      if (manifestRes.ok) {
        const manifest = await manifestRes.json();
        modelConfig = manifest[filename] || null;
      }
    } catch {
      // Standard fallback
    }

    const isGLB = modelPath.endsWith(".glb") || modelPath.endsWith(".gltf");

    if (isGLB) {
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;

          const manifestRotation = modelConfig?.rotation_correction as
            | [number, number, number]
            | undefined;
          if (manifestRotation) {
            const [rx, ry, rz] = manifestRotation;
            model.rotation.set(rx, ry, rz);
          }

          // Wrap in wrapper group to ensure clean normalized transforms
          const wrapper = new THREE.Group();
          wrapper.add(model);

          const boxAfter = new THREE.Box3().setFromObject(wrapper);
          const center = boxAfter.getCenter(new THREE.Vector3());
          const sizeAfter = boxAfter.getSize(new THREE.Vector3());

          if (isShirt) {
            // Shirts: Center X and Z, align collar top to origin Y = 0
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= boxAfter.max.y;
          } else if (isHat) {
            // Hats: Center X and Z, align base to origin Y = 0
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= boxAfter.min.y;
          } else {
            // Glasses: Center X and Y, align front frame to Z = 0
            model.position.x -= center.x;
            model.position.y -= center.y;
            model.position.z -= boxAfter.max.z;
          }

          // Normalize model width (sizeAfter.x) to category standard units
          const targetWidth = sizeAfter.x > 0 ? sizeAfter.x : 1.0;
          const baseNormScale = (isHat ? HAT_TARGET_WIDTH : isShirt ? SHIRT_TARGET_WIDTH : 1.0) / targetWidth;
          const customScaleFactor = modelConfig?.scale_factor || 1.0;
          const normalizeScale = baseNormScale * customScaleFactor;
          wrapper.scale.setScalar(normalizeScale);

          // Apply manifest pivot offset
          const pivot = modelConfig?.pivot_offset ?? [0, 0, 0];
          wrapper.position.set(pivot[0], pivot[1], pivot[2]);

          // Preserve Authentic Original GLB PBR Textures & Materials
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.frustumCulled = false;

              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat: any) => {
                if (!mat) return;
                mat.side = THREE.DoubleSide;
                if (mat.map) {
                  mat.map.colorSpace = THREE.SRGBColorSpace;
                  mat.map.needsUpdate = true;
                }
                mat.needsUpdate = true;
              });
            }
          });

          group.add(wrapper);
          setModelSource(`3D GLB (${filename})`);
        },
        undefined,
        (error) => {
          console.warn(`GLB load failed for ${modelPath}:`, error);
        }
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /*  5. Face Landmark Alignment (Glasses & Hats)                       */
  /* ------------------------------------------------------------------ */
  const applyLandmarksTo3DModel = (landmarks: any[], group: THREE.Group) => {
    if (!videoRef.current || !containerRef.current) return;

    const rightOuter = landmarks[33];
    const rightInner = landmarks[133];
    const leftOuter = landmarks[263];
    const leftInner = landmarks[362];
    const nasion = landmarks[168] || landmarks[6];
    const foreheadTop = landmarks[10];
    const chin = landmarks[152];

    if (!leftOuter || !rightOuter || !nasion) return;

    const video = videoRef.current;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const videoAspect = vw / vh;
    const containerAspect = cw / ch;

    let renderedWidth = cw;
    let renderedHeight = ch;
    let offsetX = 0;
    let offsetYPixel = 0;

    if (containerAspect > videoAspect) {
      renderedHeight = ch;
      renderedWidth = ch * videoAspect;
      offsetX = (cw - renderedWidth) / 2;
    } else {
      renderedWidth = cw;
      renderedHeight = cw / videoAspect;
      offsetYPixel = (ch - renderedHeight) / 2;
    }

    const eyeRX = rightInner ? (rightOuter.x + rightInner.x) / 2 : rightOuter.x;
    const eyeRY = rightInner ? (rightOuter.y + rightInner.y) / 2 : rightOuter.y;
    const eyeLX = leftInner ? (leftOuter.x + leftInner.x) / 2 : leftOuter.x;
    const eyeLY = leftInner ? (leftOuter.y + leftInner.y) / 2 : leftOuter.y;

    const midEyeX = (eyeLX + eyeRX) / 2;
    const midEyeY = (eyeLY + eyeRY) / 2;

    const anchorX = isHat ? (foreheadTop ? foreheadTop.x : midEyeX) : (midEyeX * 0.35 + nasion.x * 0.65);
    const anchorY = isHat ? (foreheadTop ? foreheadTop.y : midEyeY) : (midEyeY * 0.35 + nasion.y * 0.65);

    const screenX = offsetX + (1 - anchorX) * renderedWidth;
    const screenY = offsetYPixel + anchorY * renderedHeight;

    const ndcX = (screenX / cw) * 2 - 1;
    const ndcY = 1 - (screenY / ch) * 2;

    const halfH = Math.tan((45 * Math.PI) / 360) * 4.2;
    const halfW = halfH * (cw / ch);

    const worldX = ndcX * halfW;
    const worldY = ndcY * halfH + (isHat ? 0.22 : -0.01) + offsetY * 0.012;
    const worldZ = (nasion.z || 0) * -1.8;

    const screenLeftEyeX = offsetX + (1 - eyeLX) * renderedWidth;
    const screenLeftEyeY = offsetYPixel + eyeLY * renderedHeight;
    const screenRightEyeX = offsetX + (1 - eyeRX) * renderedWidth;
    const screenRightEyeY = offsetYPixel + eyeRY * renderedHeight;

    const dx = screenRightEyeX - screenLeftEyeX;
    const dy = screenRightEyeY - screenLeftEyeY;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);

    const rollAngle = Math.atan2(dy, dx);
    const safeRoll = THREE.MathUtils.clamp(rollAngle, -0.85, 0.85);

    const eyeZDelta = (leftOuter.z || 0) - (rightOuter.z || 0);
    const screenBridgeX = offsetX + (1 - nasion.x) * renderedWidth;
    const screenMidEyeX = (screenLeftEyeX + screenRightEyeX) / 2;
    const noseScreenShift = (screenBridgeX - screenMidEyeX) / (pixelDist * 0.5 + 0.001);
    
    const rawYaw = (eyeZDelta * 2.2) + (noseScreenShift * 0.8);
    const safeYaw = THREE.MathUtils.clamp(rawYaw, -0.75, 0.75);

    let safePitch = 0;
    if (chin && foreheadTop) {
      const vertDepth = ((foreheadTop.z || 0) - (chin.z || 0)) * 1.6;
      safePitch = THREE.MathUtils.clamp(vertDepth, -0.45, 0.45);
    }

    const worldInterPupil = (pixelDist / cw) * (2 * halfW);
    const baseScale = isHat ? worldInterPupil * 1.95 : worldInterPupil * 2.35;
    const finalScale = baseScale * (scaleMultiplier / 100);

    group.position.x = THREE.MathUtils.lerp(group.position.x, worldX, 0.45);
    group.position.y = THREE.MathUtils.lerp(group.position.y, worldY, 0.45);
    group.position.z = THREE.MathUtils.lerp(group.position.z, worldZ, 0.45);

    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw, 0.45);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch, 0.45);

    group.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.45);
  };

  /* ------------------------------------------------------------------ */
  /*  6. Pose Landmark Alignment (Upper-Body Clothes / Shirts)          */
  /* ------------------------------------------------------------------ */
  const applyPoseLandmarksTo3DShirt = (landmarks: any[], group: THREE.Group) => {
    if (!videoRef.current || !containerRef.current) return;

    // MediaPipe Pose Landmarks:
    // 11: Left Shoulder, 12: Right Shoulder, 23: Left Hip, 24: Right Hip, 0: Nose
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    if (!leftShoulder || !rightShoulder) return;

    const video = videoRef.current;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const videoAspect = vw / vh;
    const containerAspect = cw / ch;

    let renderedWidth = cw;
    let renderedHeight = ch;
    let offsetX = 0;
    let offsetYPixel = 0;

    if (containerAspect > videoAspect) {
      renderedHeight = ch;
      renderedWidth = ch * videoAspect;
      offsetX = (cw - renderedWidth) / 2;
    } else {
      renderedWidth = cw;
      renderedHeight = cw / videoAspect;
      offsetYPixel = (ch - renderedHeight) / 2;
    }

    // Mirrored Video Screen Coordinates (1 - x)
    const screenLeftShoulderX = offsetX + (1 - leftShoulder.x) * renderedWidth;
    const screenLeftShoulderY = offsetYPixel + leftShoulder.y * renderedHeight;
    const screenRightShoulderX = offsetX + (1 - rightShoulder.x) * renderedWidth;
    const screenRightShoulderY = offsetYPixel + rightShoulder.y * renderedHeight;

    const dx = screenRightShoulderX - screenLeftShoulderX;
    const dy = screenRightShoulderY - screenLeftShoulderY;
    const shoulderSpanPx = Math.sqrt(dx * dx + dy * dy);

    // Anchor: Midpoint of shoulders at base of neck
    const screenMidX = (screenLeftShoulderX + screenRightShoulderX) / 2;
    const screenMidY = (screenLeftShoulderY + screenRightShoulderY) / 2;

    const ndcX = (screenMidX / cw) * 2 - 1;
    const ndcY = 1 - (screenMidY / ch) * 2;

    const halfH = Math.tan((45 * Math.PI) / 360) * 4.2;
    const halfW = halfH * (cw / ch);

    const worldX = ndcX * halfW;
    // Align neckline with collar base and apply manual offset
    const worldY = ndcY * halfH - 0.08 + offsetY * 0.012;
    const midShoulderZ = ((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2;
    const worldZ = midShoulderZ * -2.2;

    // 1. True 3D Roll: Shoulder slant
    const rollAngle = Math.atan2(dy, dx);
    const safeRoll = THREE.MathUtils.clamp(rollAngle, -0.85, 0.85);

    // 2. True 3D Yaw: Shoulder depth difference
    const shoulderZDelta = (leftShoulder.z || 0) - (rightShoulder.z || 0);
    const safeYaw = THREE.MathUtils.clamp(shoulderZDelta * 2.6, -0.85, 0.85);

    // 3. True 3D Pitch: Torso tilt relative to hips
    let safePitch = 0;
    if (leftHip && rightHip) {
      const midHipZ = ((leftHip.z || 0) + (rightHip.z || 0)) / 2;
      safePitch = THREE.MathUtils.clamp((midShoulderZ - midHipZ) * 1.5, -0.45, 0.45);
    }

    // World Space Scale (Shirt fits user shoulder span accurately)
    const worldShoulderSpan = (shoulderSpanPx / cw) * (2 * halfW);
    const baseScale = worldShoulderSpan * 1.35;
    const finalScale = baseScale * (scaleMultiplier / 100);

    group.position.x = THREE.MathUtils.lerp(group.position.x, worldX, 0.45);
    group.position.y = THREE.MathUtils.lerp(group.position.y, worldY, 0.45);
    group.position.z = THREE.MathUtils.lerp(group.position.z, worldZ, 0.45);

    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw, 0.45);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch, 0.45);

    group.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.45);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* 3D AR & Studio Viewport */}
      <div className="relative w-full h-[520px] sm:h-[580px] rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
        {/* 3D WebGL Canvas Layer Overlay */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

        {/* Mode 1: Live Video AR Feed */}
        {viewMode === "ar" ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
            <video
              ref={videoRef}
              className="w-full h-full object-contain -scale-x-100"
              autoPlay
              playsInline
              muted
            />

            {isTrackingLive ? (
              <div className="absolute top-4 left-4 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono z-30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {isShirt
                    ? "AR 3D BODY POSE TRACKING (60 FPS)"
                    : isHat
                    ? "AR 3D GLB HEAD TRACKING (60 FPS)"
                    : "AR 3D GLB FACE TRACKING (60 FPS)"}
                </span>
              </div>
            ) : (
              <div className="absolute top-4 left-4 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono z-30">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>
                  {isShirt
                    ? "BADAN TIDAK TERDETEKSI — MUNDUR SEDIKIT AGAR BAHU & DADA TERLIHAT"
                    : "WAJAH TIDAK TERDETEKSI — MUNDUR SEDIKIT & MASUKKAN SELURUH KEPALA"}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Mode 2: 3D Studio 360 Turntable */
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-surface-200/50 via-surface-100/40 to-slate-950">
            <div className="absolute bottom-6 w-72 h-72 rounded-full bg-indigo-500/10 border border-indigo-500/20 blur-sm pointer-events-none" />
            <div className="absolute top-4 left-4 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono z-20">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>STUDIO 3D INSPECTION 360°</span>
            </div>
          </div>
        )}

        {/* Top Floating Action Pill: Mode Selector */}
        <div className="absolute top-4 right-4 z-30 flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-white/15 shadow-2xl">
          <div className="relative group">
            <button
              onClick={() => {
                if (!isUploadMode) setViewMode("ar");
              }}
              disabled={isUploadMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isUploadMode
                  ? "opacity-40 cursor-not-allowed text-slate-500 bg-slate-800/40"
                  : viewMode === "ar"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 cursor-pointer"
                  : "text-slate-400 hover:text-white cursor-pointer"
              }`}
            >
              {isUploadMode ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>
                {isShirt
                  ? "Pasang ke Badan (AR 3D)"
                  : isHat
                  ? "Pasang ke Kepala (AR 3D)"
                  : "Pasang ke Wajah (AR 3D)"}
              </span>
            </button>

            {isUploadMode && (
              <div className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-xl bg-slate-900/95 border border-amber-500/30 text-[11px] text-amber-200/90 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 backdrop-blur-md">
                🔒 <strong>Mode AR Terkunci:</strong> Live AR membutuhkan pemindaian video langsung. Gunakan mode <strong>Studio 360°</strong> untuk melihat detail 3D produk.
              </div>
            )}
          </div>

          <button
            onClick={() => setViewMode("studio")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
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

      {/* AR Fine-Tuning Micro-Controls */}
      <div className="glass-panel p-4 rounded-3xl border border-white/10 bg-surface-100/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-xs">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-300">
            {isShirt
              ? "Penyesuaian Posisi Baju:"
              : isHat
              ? "Penyesuaian Posisi Topi:"
              : "Penyesuaian Posisi Kacamata:"}
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setOffsetY((prev) => prev + 1)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs"
              title="Geser Naik"
            >
              ▲ Naik
            </button>
            <button
              onClick={() => setOffsetY((prev) => prev - 1)}
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
          <span className="text-slate-400 font-mono">Skala Ukuran: <strong className="text-blue-400">{scaleMultiplier}%</strong></span>
          <input
            type="range"
            min={70}
            max={130}
            value={scaleMultiplier}
            onChange={(e) => setScaleMultiplier(Number(e.target.value))}
            className="w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ARCanvasViewer;

