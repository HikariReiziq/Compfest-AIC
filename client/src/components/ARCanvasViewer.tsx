"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Sparkles,
  Move3d,
  Box,
  RotateCcw,
  Sliders,
  Lock,
  RotateCw,
  Move,
  Camera,
} from "lucide-react";
import { RecommendationItem } from "../lib/mockData";

/** Semua GLB dinormalisasi berbasis lebar (X) ke 1.0 unit scene agar ukuran konsisten. */

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
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [offsetZ, setOffsetZ] = useState<number>(0);
  // Manual 360° Omnidirectional rotation (Yaw around Y, Pitch around X)
  const [rotOffsetY, setRotOffsetY] = useState<number>(0);
  const [rotOffsetX, setRotOffsetX] = useState<number>(0);
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(100);
  const [dragMode, setDragMode] = useState<"pan" | "rotate">("pan");

  const offsetXRef = useRef<number>(0);
  const offsetYRef = useRef<number>(0);
  const offsetZRef = useRef<number>(0);
  const rotOffsetYRef = useRef<number>(0);
  const rotOffsetXRef = useRef<number>(0);
  const scaleMultiplierRef = useRef<number>(100);
  const dragModeRef = useRef<"pan" | "rotate">("pan");
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    startRotX: number;
    startRotY: number;
  } | null>(null);

  useEffect(() => {
    offsetXRef.current = offsetX;
  }, [offsetX]);

  useEffect(() => {
    offsetYRef.current = offsetY;
  }, [offsetY]);

  useEffect(() => {
    offsetZRef.current = offsetZ;
  }, [offsetZ]);

  useEffect(() => {
    rotOffsetYRef.current = rotOffsetY;
  }, [rotOffsetY]);

  useEffect(() => {
    rotOffsetXRef.current = rotOffsetX;
  }, [rotOffsetX]);

  useEffect(() => {
    scaleMultiplierRef.current = scaleMultiplier;
  }, [scaleMultiplier]);

  useEffect(() => {
    dragModeRef.current = dragMode;
  }, [dragMode]);

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
            videoRef.current?.play().catch(() => { });
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
  /*  2. Initialize MediaPipe Landmarker (Face for All, Pose for Shirts) */
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

        // Initialize FaceLandmarker (for glasses, hats, and robust shirt fallback)
        try {
          const face = await FaceLandmarker.createFromOptions(fileset, {
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
          if (!cancelled) faceLandmarkerRef.current = face;
        } catch (e) {
          console.warn("FaceLandmarker init fallback:", e);
        }

        // Initialize PoseLandmarker for Upper-Body Clothes Tracking
        if (isShirt) {
          try {
            const pose = await PoseLandmarker.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              numPoses: 1,
            });
            if (!cancelled) poseLandmarkerRef.current = pose;
          } catch {
            try {
              const pose = await PoseLandmarker.createFromOptions(fileset, {
                baseOptions: {
                  modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                  delegate: "CPU",
                },
                runningMode: "VIDEO",
                numPoses: 1,
              });
              if (!cancelled) poseLandmarkerRef.current = pose;
            } catch (err) {
              console.warn("PoseLandmarker init failed:", err);
            }
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.8);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);

    // Key spotlight from the TOP-RIGHT (studio lampu sorot) for a bright, gallery-like look
    const spotLight = new THREE.SpotLight(0xffffff, 4.0, 30, Math.PI / 5, 0.45, 1.1);
    spotLight.position.set(6, 7, 4);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

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
            let tracked = false;

            if (isShirt) {
              // 1. Try Upper-Body Pose Tracking
              if (poseLandmarker) {
                const poseRes = poseLandmarker.detectForVideo(video, performance.now());
                if (poseRes && poseRes.landmarks && poseRes.landmarks.length > 0) {
                  const lm = poseRes.landmarks[0];
                  if (lm[11] && lm[12]) {
                    setIsTrackingLive(true);
                    modelGroup.visible = true;
                    applyPoseLandmarksTo3DShirt(lm, modelGroup);
                    tracked = true;
                  }
                }
              }

              // 2. Fallback to Face Landmark Chin-Anchored Neck Tracking
              if (!tracked && faceLandmarker) {
                const faceRes = faceLandmarker.detectForVideo(video, performance.now());
                if (faceRes && faceRes.faceLandmarks && faceRes.faceLandmarks.length > 0) {
                  setIsTrackingLive(true);
                  modelGroup.visible = true;
                  applyFaceFallbackTo3DShirt(faceRes.faceLandmarks[0], modelGroup);
                  tracked = true;
                }
              }

              if (!tracked) {
                setIsTrackingLive(false);
                modelGroup.visible = true;
              }
            } else {
              // Glasses & Hats Tracking
              if (faceLandmarker) {
                const result = faceLandmarker.detectForVideo(video, performance.now());
                if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
                  setIsTrackingLive(true);
                  modelGroup.visible = true;
                  applyLandmarksTo3DModel(result.faceLandmarks[0], modelGroup);
                  tracked = true;
                }
              }

              if (!tracked) {
                setIsTrackingLive(false);
                modelGroup.visible = true;
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
          const studioTargetY = isShirt ? 0.38 : isHat ? -0.12 : 0;
          const studioScale = isShirt ? 0.95 : 1.2;
          modelGroup.position.lerp(new THREE.Vector3(0, studioTargetY, 0), 0.08);
          modelGroup.scale.lerp(new THREE.Vector3(studioScale, studioScale, studioScale), 0.08);
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
  }, [viewMode, activeItem, subcategory, isShirt]);

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
            // Shirts: fully centered (X, Y, Z) like glasses & hats — AR anchor applies
            // the torso drop below the neck line instead of a model-space pivot.
            model.position.x -= center.x;
            model.position.y -= center.y;
            model.position.z -= center.z;
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

          // Normalize model dimensions: uniform width-based scaling across ALL GLBs
          // so every product of the same category renders at the same relative size.
          const targetWidth = sizeAfter.x > 0 ? sizeAfter.x : 1.0;
          const baseNormScale = 1.0 / targetWidth;
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
              mesh.renderOrder = 1; // Ensure 3D model renders after depth occluder (-1)

              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat: any) => {
                if (!mat) return;
                mat.side = THREE.DoubleSide;
                mat.depthTest = true;
                mat.depthWrite = true;
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

    const worldX = ndcX * halfW + offsetXRef.current * 0.012;
    // Lower hat anchor so head & hair fully enter the hat cavity and brim rests around upper brow level
    const worldY = isHat ? (ndcY * halfH - 0.16 + offsetYRef.current * 0.012) : (ndcY * halfH - 0.01 + offsetYRef.current * 0.012);
    const worldZ = isHat
      ? ((foreheadTop?.z || nasion.z || 0) * -1.8 - 0.03 + offsetZRef.current * 0.015)
      : ((nasion.z || 0) * -1.8 + offsetZRef.current * 0.015);

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
      if (isHat) {
        // Natural slight forward pitch (+0.04 rad ~ 2.5 deg) so the hat faces the camera straight on and crown is visible
        safePitch = 0.04 + THREE.MathUtils.clamp(-vertDepth * 0.4, -0.2, 0.2);
      } else {
        // Glasses: temples must extend straight BACKWARD (natural over-the-ear line).
        // Lock pitch to near-zero so the frame never tilts and the temples stay level.
        safePitch = THREE.MathUtils.clamp(vertDepth * 0.12, -0.04, 0.06);
      }
    } else if (isHat) {
      safePitch = 0.04;
    }

    const worldInterPupil = (pixelDist / cw) * (2 * halfW);
    // Hats require 2.85x IPD to fit the entire human skull & hair volume comfortably
    const baseScale = isHat ? worldInterPupil * 2.85 : worldInterPupil * 2.35;
    const finalScale = baseScale * (scaleMultiplierRef.current / 100);

    group.position.x = THREE.MathUtils.lerp(group.position.x, worldX, 0.45);
    group.position.y = THREE.MathUtils.lerp(group.position.y, worldY, 0.45);
    group.position.z = THREE.MathUtils.lerp(group.position.z, worldZ, 0.45);

    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw + rotOffsetYRef.current, 0.45);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch + rotOffsetXRef.current, 0.45);

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

    const worldX = ndcX * halfW + offsetXRef.current * 0.012;
    const midShoulderZ = ((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2;
    const worldZ = midShoulderZ * -2.0 - 0.02 + offsetZRef.current * 0.015;

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
    }    // World Space Scale (Shirt fits user shoulder span accurately)
    const worldShoulderSpan = (shoulderSpanPx / cw) * (2 * halfW);
    const baseScale = worldShoulderSpan * 1.30;
    const finalScale = baseScale * (scaleMultiplierRef.current / 100);
    // Shirt model is now fully centered (like glasses & hats): drop its center
    // to mid-torso, half a shirt-height below the shoulder/neck anchor line.
    const worldY = ndcY * halfH - 0.55 * finalScale + offsetYRef.current * 0.012;

    group.position.x = THREE.MathUtils.lerp(group.position.x, worldX, 0.45);
    group.position.y = THREE.MathUtils.lerp(group.position.y, worldY, 0.45);
    group.position.z = THREE.MathUtils.lerp(group.position.z, worldZ, 0.45);

    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw + rotOffsetYRef.current, 0.45);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch + rotOffsetXRef.current, 0.45);

    group.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.45);
  };

  /* ------------------------------------------------------------------ */
  /*  7. Face Landmark Chin-Anchored Fallback for Shirts               */
  /* ------------------------------------------------------------------ */
  const applyFaceFallbackTo3DShirt = (landmarks: any[], group: THREE.Group) => {
    if (!videoRef.current || !containerRef.current) return;

    const chin = landmarks[152];
    const leftCheek = landmarks[454] || landmarks[263];
    const rightCheek = landmarks[234] || landmarks[33];
    const nasion = landmarks[168] || landmarks[6];

    if (!chin || !leftCheek || !rightCheek) return;

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

    const screenChinX = offsetX + (1 - chin.x) * renderedWidth;
    const screenChinY = offsetYPixel + chin.y * renderedHeight;

    const screenLeftCheekX = offsetX + (1 - leftCheek.x) * renderedWidth;
    const screenLeftCheekY = offsetYPixel + leftCheek.y * renderedHeight;
    const screenRightCheekX = offsetX + (1 - rightCheek.x) * renderedWidth;
    const screenRightCheekY = offsetYPixel + rightCheek.y * renderedHeight;

    const dx = screenRightCheekX - screenLeftCheekX;
    const dy = screenRightCheekY - screenLeftCheekY;
    const faceWidthPx = Math.sqrt(dx * dx + dy * dy);

    // Collar sits right at base of neck below chin
    const neckDropPx = faceWidthPx * 0.30;
    const screenNeckX = screenChinX;
    const screenNeckY = screenChinY + neckDropPx;

    const ndcX = (screenNeckX / cw) * 2 - 1;
    const ndcY = 1 - (screenNeckY / ch) * 2;

    const halfH = Math.tan((45 * Math.PI) / 360) * 4.2;
    const halfW = halfH * (cw / ch);

    const worldX = ndcX * halfW + offsetXRef.current * 0.012;
    const worldY = ndcY * halfH + 0.02 + offsetYRef.current * 0.012;
    const worldZ = (chin.z || 0) * -1.8 - 0.02 + offsetZRef.current * 0.015;

    const rollAngle = Math.atan2(dy, dx);
    const safeRoll = THREE.MathUtils.clamp(rollAngle, -0.85, 0.85);

    const eyeZDelta = (leftCheek.z || 0) - (rightCheek.z || 0);
    const safeYaw = THREE.MathUtils.clamp(eyeZDelta * 2.2, -0.75, 0.75);

    let safePitch = 0;
    if (nasion && chin) {
      safePitch = THREE.MathUtils.clamp(((nasion.z || 0) - (chin.z || 0)) * 1.5, -0.45, 0.45);
    }

    // Shoulder span is ~2.2x face width
    const worldFaceWidth = (faceWidthPx / cw) * (2 * halfW);
    const worldShoulderSpan = worldFaceWidth * 2.2;
    const baseScale = worldShoulderSpan * 1.30;
    const finalScale = baseScale * (scaleMultiplierRef.current / 100);

    group.position.x = THREE.MathUtils.lerp(group.position.x, worldX, 0.45);
    group.position.y = THREE.MathUtils.lerp(group.position.y, worldY, 0.45);
    group.position.z = THREE.MathUtils.lerp(group.position.z, worldZ, 0.45);

    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw + rotOffsetYRef.current, 0.45);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch + rotOffsetXRef.current, 0.45);

    group.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.45);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* 3D AR & Studio Viewport with DSLR Camera Frame */}
      <div
        className="relative w-full max-w-[800px] mx-auto drop-shadow-2xl flex items-center justify-center select-none"
        style={{ aspectRatio: "548 / 455" }}
      >
        {/* Bingkai kamera DSLR Canon EOS 4K Ultra HD — tajam & jernih */}
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

        {/* Maskot Sesu-AI di Samping Kiri Bawah Kamera */}
        <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-3 z-30 flex items-end pointer-events-none select-none">
          <div className="relative animate-bounce" style={{ animationDuration: "2.8s" }}>
            <img
              src="/images/mascot.png"
              alt="Sesu-AI Mascot"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_10px_25px_rgba(56,189,248,0.6)]"
            />
          </div>
        </div>

        {/* Layar LCD Kamera DSLR Canon — proporsi pas di dalam bezel layar */}
        <div
          className="absolute z-10 overflow-hidden rounded-[3px] bg-black shadow-[inset_0_0_20px_rgba(0,0,0,0.95)]"
          style={{ left: "16.42%", top: "42.20%", width: "45.07%", height: "36.26%" }}
        >
          {/* 3D WebGL Canvas Layer Overlay */}
          <div ref={containerRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

          {/* Mode 1: Live Video AR Feed */}
          {viewMode === "ar" ? (
            <div
              className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => {
                dragStateRef.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  startOffsetX: offsetXRef.current,
                  startOffsetY: offsetYRef.current,
                  startRotX: rotOffsetXRef.current,
                  startRotY: rotOffsetYRef.current,
                };
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              }}
              onPointerMove={(e) => {
                const ds = dragStateRef.current;
                if (!ds) return;
                if (dragModeRef.current === "rotate") {
                  // Omnidirectional 360° Rotation: horizontal (Yaw) + vertical (Pitch) + diagonal
                  const deltaYaw = (e.clientX - ds.startX) * 0.012;
                  const deltaPitch = (e.clientY - ds.startY) * 0.012;
                  const newRotY = ds.startRotY + deltaYaw;
                  const newRotX = ds.startRotX + deltaPitch;
                  rotOffsetYRef.current = newRotY;
                  rotOffsetXRef.current = newRotX;
                  setRotOffsetY(newRotY);
                  setRotOffsetX(newRotX);
                } else {
                  // Free 2D position pan across screen in all directions (X, Y)
                  const deltaX = (e.clientX - ds.startX) * 0.15;
                  const deltaY = -(e.clientY - ds.startY) * 0.15;
                  const newX = Number((ds.startOffsetX + deltaX).toFixed(1));
                  const newY = Number((ds.startOffsetY + deltaY).toFixed(1));
                  offsetXRef.current = newX;
                  offsetYRef.current = newY;
                  setOffsetX(newX);
                  setOffsetY(newY);
                }
              }}
              onPointerUp={() => { dragStateRef.current = null; }}
              onPointerLeave={() => { dragStateRef.current = null; }}
              onPointerCancel={() => { dragStateRef.current = null; }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-contain -scale-x-100"
                autoPlay
                playsInline
                muted
              />

              {isTrackingLive ? (
                <div className="absolute top-2 left-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8px] font-mono z-30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    {isShirt
                      ? "AR 3D BODY (60 FPS)"
                      : isHat
                        ? "AR 3D HEAD (60 FPS)"
                        : "AR 3D FACE (60 FPS)"}
                  </span>
                </div>
              ) : (
                <div className="absolute top-2 left-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-mono z-30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>MEMINDAI AR...</span>
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Studio 3D Inspection Viewer */
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-black">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12)_0%,transparent_70%)] pointer-events-none" />
              <div className="absolute top-2 left-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[8px] font-mono z-30">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>STUDIO 360°</span>
              </div>
            </div>
          )}

          {/* Top-Right Toggle Mode: AR vs Studio View */}
          <div className="absolute top-2 right-2 z-30 flex items-center bg-slate-900/85 backdrop-blur-md p-0.5 rounded-xl border border-white/10 shadow-lg scale-90 origin-top-right">
            {!isUploadMode && (
              <button
                onClick={() => setViewMode("ar")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                  viewMode === "ar"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>AR</span>
              </button>
            )}
            <button
              onClick={() => setViewMode("studio")}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                viewMode === "studio"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>360°</span>
            </button>
          </div>

          {/* Bottom Floating Info Badge */}
          <div className="absolute bottom-2 left-2 z-20 hidden sm:flex items-center space-x-1.5 px-2 py-0.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 text-[9px] shadow-lg scale-90 origin-bottom-left">
            <Box className="w-3 h-3 text-blue-400" />
            <span className="font-semibold text-white max-w-[120px] truncate">{activeItem.name}</span>
          </div>
        </div>
      </div>

      {/* AR Fine-Tuning Micro-Controls (Single Line Seamless Bar) */}
      <div className="glass-panel py-2 px-3 rounded-2xl border border-white/10 bg-[#081322]/95 backdrop-blur-xl flex flex-nowrap items-center justify-between gap-2 text-xs overflow-x-auto no-scrollbar shadow-lg w-full min-w-0">
        {/* Left: 2 Opsi Interaksi, Koordinat Live, & Reset */}
        <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
          {/* 2 Opsi Interaksi Layar: Opsi 1 (Rotasi) vs Opsi 2 (Posisi) */}
          <div className="inline-flex rounded-xl bg-slate-900/90 p-0.5 border border-white/10 gap-0.5 shadow-inner shrink-0">
            <button
              onClick={() => setDragMode("rotate")}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                dragMode === "rotate"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Opsi 1: Geser di layar ke segala arah untuk memutar model 3D (360° Horizontal, Vertikal & Diagonal)"
            >
              <RotateCw className="w-3 h-3" />
              <span>Opsi 1: Rotasi</span>
            </button>
            <button
              onClick={() => setDragMode("pan")}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                dragMode === "pan"
                  ? "bg-gradient-to-r from-sky-600 to-blue-600 border border-sky-400 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Opsi 2: Geser di layar ke segala arah untuk memindahkan posisi (Atas, Bawah, Kiri, Kanan)"
            >
              <Move className="w-3 h-3" />
              <span>Opsi 2: Posisi</span>
            </button>
          </div>

          {/* Indikator Status Koordinat */}
          <div className="flex items-center space-x-1.5 bg-slate-900/70 px-2 py-1 rounded-xl border border-white/5 text-[10px] font-mono text-slate-400 shrink-0 whitespace-nowrap">
            <span>X:<strong className="text-white ml-0.5">{offsetX.toFixed(1)}</strong></span>
            <span>Y:<strong className="text-white ml-0.5">{offsetY.toFixed(1)}</strong></span>
            <span>Putar:<strong className="text-white ml-0.5">{Math.round((rotOffsetY * 180) / Math.PI)}°</strong></span>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              setOffsetX(0);
              offsetXRef.current = 0;
              setOffsetY(0);
              offsetYRef.current = 0;
              setOffsetZ(0);
              offsetZRef.current = 0;
              setRotOffsetY(0);
              rotOffsetYRef.current = 0;
              setRotOffsetX(0);
              rotOffsetXRef.current = 0;
              setScaleMultiplier(100);
              scaleMultiplierRef.current = 100;
            }}
            className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white border border-white/10 transition-all flex items-center space-x-1 cursor-pointer shrink-0"
            title="Reset Posisi & Rotasi ke Default"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="text-[10px] font-medium">Reset</span>
          </button>
        </div>

        {/* Right: Scale Slider with Fixed-Width Percentage Label */}
        <div className="flex flex-nowrap items-center space-x-2 text-xs bg-slate-900/70 px-2 py-1 rounded-xl border border-white/5 shrink-0 whitespace-nowrap">
          <span className="text-slate-400 font-mono text-[11px] flex items-center">
            <span>Ukuran:</span>
            <strong className="text-blue-400 inline-block w-9 text-right ml-1 font-mono">{scaleMultiplier}%</strong>
          </span>
          <input
            type="range"
            min={70}
            max={130}
            value={scaleMultiplier}
            onChange={(e) => {
              const val = Number(e.target.value);
              scaleMultiplierRef.current = val;
              setScaleMultiplier(val);
            }}
            className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 shrink-0"
          />
        </div>
      </div>
    </div>
  );
};

export default ARCanvasViewer;
