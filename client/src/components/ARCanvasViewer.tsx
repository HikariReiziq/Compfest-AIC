"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Sparkles,
  Flower2,
  Move3d,
  Box,
  RotateCcw,
  Sliders,
  Lock,
  RotateCw,
  Move,
  Camera,
  VideoOff,
  RefreshCw,
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
  gender?: "male" | "female";
}

/* ------------------------------------------------------------------ */
/*  Camera error messages helper                                      */
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
  return "Kamera tidak tersedia. Silakan coba lagi atau gunakan 360° Studio.";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const ARCanvasViewer: React.FC<ARCanvasViewerProps> = ({
  activeItem,
  subcategory,
  mediaStream,
  inputMode = "camera",
  gender,
}) => {
  const isFemale = gender === "female";
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
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
  const [selectedFrame, setSelectedFrame] = useState<"canon" | "flower">(() => (isFemale ? "flower" : "canon"));

  useEffect(() => {
    setSelectedFrame(isFemale ? "flower" : "canon");
  }, [isFemale]);

  const studioYawRef = useRef<number>(0);
  const studioPitchRef = useRef<number>(0);
  const studioZoomRef = useRef<number>(1);
  const isDraggingStudioRef = useRef<boolean>(false);
  const [isAutoRotateStudio, setIsAutoRotateStudio] = useState<boolean>(true);
  const isAutoRotateStudioRef = useRef<boolean>(true);

  useEffect(() => {
    isAutoRotateStudioRef.current = isAutoRotateStudio;
  }, [isAutoRotateStudio]);

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
  /*  1. Initialize / Manage Camera Stream & Retry Handler              */
  /* ------------------------------------------------------------------ */
  const retryCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    setIsVideoPlaying(false);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    await new Promise((r) => setTimeout(r, 200));

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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

      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setCameraReady(true);
          setIsVideoPlaying(true);
        };
      }
    } catch (err: any) {
      console.warn("Webcam setup retry error in ARCanvasViewer:", err);
      setCameraError(getCameraErrorMessage(err));
    }
  }, []);

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
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 60, min: 30 },
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
            setIsVideoPlaying(true);
          };
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn("Camera init error in ARCanvasViewer:", err);
          setCameraError(getCameraErrorMessage(err));
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

  const targetTransformRef = useRef<{
    pos: THREE.Vector3;
    rot: THREE.Euler;
    scale: THREE.Vector3;
    active: boolean;
    missedFrames: number;
  }>({
    pos: new THREE.Vector3(0, 0, 0),
    rot: new THREE.Euler(0, 0, 0),
    scale: new THREE.Vector3(1, 1, 1),
    active: false,
    missedFrames: 999,
  });

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

    // Key spotlight from the TOP-RIGHT for clean studio specular highlights
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

      if (viewMode === "ar") {
        if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          let detectedThisFrame = false;
          try {
            if (isShirt) {
              // 1. Try Upper-Body Pose Tracking
              if (poseLandmarker) {
                const poseRes = poseLandmarker.detectForVideo(video, performance.now());
                if (poseRes && poseRes.landmarks && poseRes.landmarks.length > 0) {
                  const lm = poseRes.landmarks[0];
                  if (lm[11] && lm[12]) {
                    applyPoseLandmarksTo3DShirt(lm);
                    detectedThisFrame = true;
                  }
                }
              }

              // 2. Fallback to Face Landmark Chin-Anchored Neck Tracking
              if (!detectedThisFrame && faceLandmarker) {
                const faceRes = faceLandmarker.detectForVideo(video, performance.now());
                if (faceRes && faceRes.faceLandmarks && faceRes.faceLandmarks.length > 0) {
                  applyFaceFallbackTo3DShirt(faceRes.faceLandmarks[0]);
                  detectedThisFrame = true;
                }
              }
            } else {
              // Glasses & Hats Tracking
              if (faceLandmarker) {
                const result = faceLandmarker.detectForVideo(video, performance.now());
                if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
                  applyLandmarksTo3DModel(result.faceLandmarks[0]);
                  detectedThisFrame = true;
                }
              }
            }
          } catch {
            // Frame skip
          }

          if (!detectedThisFrame) {
            targetTransformRef.current.missedFrames += 1;
          }
        }

        // 60 FPS Render & Smooth Butter Interpolation (Zero dropped-frame jumping)
        if (targetTransformRef.current.active && targetTransformRef.current.missedFrames < 25) {
          modelGroup.visible = true;

          // Adaptive dual-speed damping: silky smooth on subtle head tremor, responsive on turns
          const posDist = modelGroup.position.distanceTo(targetTransformRef.current.pos);
          const lerpFactor = THREE.MathUtils.clamp(0.28 + posDist * 0.45, 0.22, 0.72);

          modelGroup.position.lerp(targetTransformRef.current.pos, lerpFactor);
          modelGroup.rotation.x = THREE.MathUtils.lerp(modelGroup.rotation.x, targetTransformRef.current.rot.x, lerpFactor);
          modelGroup.rotation.y = THREE.MathUtils.lerp(modelGroup.rotation.y, targetTransformRef.current.rot.y, lerpFactor);
          modelGroup.rotation.z = THREE.MathUtils.lerp(modelGroup.rotation.z, targetTransformRef.current.rot.z, lerpFactor);
          modelGroup.scale.lerp(targetTransformRef.current.scale, lerpFactor);

          setIsTrackingLive(true);
        } else {
          // Graceful fallback to center manual preview when user truly leaves camera view
          setIsTrackingLive(false);
          if (modelGroup) {
            modelGroup.visible = true;
            applyManualFallbackPreview(modelGroup);
          }
        }
      } else if (viewMode === "studio") {
        setIsTrackingLive(false);
        if (modelGroup) {
          modelGroup.visible = true;

          // Auto-rotate turntable gently when user is NOT dragging AND auto-rotate is ON
          if (!isDraggingStudioRef.current && isAutoRotateStudioRef.current) {
            studioYawRef.current += 0.008;
          }

          modelGroup.rotation.y = studioYawRef.current + rotOffsetYRef.current;
          modelGroup.rotation.x = studioPitchRef.current + rotOffsetXRef.current;
          modelGroup.rotation.z = 0;

          const studioTargetY = (isShirt ? 0.38 : isHat ? -0.12 : 0) + offsetYRef.current * 0.01;
          const studioTargetX = offsetXRef.current * 0.01;
          const baseScale =
            (isShirt ? 0.95 : 1.25) *
            studioZoomRef.current *
            (scaleMultiplierRef.current / 100);

          modelGroup.position.lerp(
            new THREE.Vector3(studioTargetX, studioTargetY, 0),
            0.1
          );
          modelGroup.scale.lerp(
            new THREE.Vector3(baseScale, baseScale, baseScale),
            0.1
          );
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
  }, [viewMode, activeItem, subcategory, isShirt, selectedFrame]);

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
  const applyLandmarksTo3DModel = (landmarks: any[]) => {
    if (!videoRef.current || !containerRef.current) return;

    const rightOuter = landmarks[33];
    const rightInner = landmarks[133];
    const leftOuter = landmarks[263];
    const leftInner = landmarks[362];
    const nasion = landmarks[168] || landmarks[6];
    const foreheadTop = landmarks[10];
    const chin = landmarks[152];
    const rightTemple = landmarks[127] || landmarks[234];
    const leftTemple = landmarks[356] || landmarks[454];
    const noseTip = landmarks[4];

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

    // Glasses: Anchor sits firmly on the nasion saddle (sellion) aligned with the pupil line
    const anchorX = isHat ? (foreheadTop ? foreheadTop.x : midEyeX) : (nasion.x * 0.70 + midEyeX * 0.30);
    const anchorY = isHat ? (foreheadTop ? foreheadTop.y : midEyeY) : (nasion.y * 0.65 + midEyeY * 0.35);

    const screenX = offsetX + (1 - anchorX) * renderedWidth;
    const screenY = offsetYPixel + anchorY * renderedHeight;

    const ndcX = (screenX / cw) * 2 - 1;
    const ndcY = 1 - (screenY / ch) * 2;

    const halfH = Math.tan((45 * Math.PI) / 360) * 4.2;
    const halfW = halfH * (cw / ch);

    const worldX = ndcX * halfW + offsetXRef.current * 0.012;
    // Glasses rest perfectly at the nasal root; hats sit above the brow line
    const worldY = isHat
      ? (ndcY * halfH - 0.16 + offsetYRef.current * 0.012)
      : (ndcY * halfH + 0.005 + offsetYRef.current * 0.012);

    const worldZ = isHat
      ? ((foreheadTop?.z || nasion.z || 0) * -1.8 - 0.03 + offsetZRef.current * 0.015)
      : ((nasion.z || 0) * -1.8 + 0.012 + offsetZRef.current * 0.015);

    const screenLeftEyeX = offsetX + (1 - eyeLX) * renderedWidth;
    const screenLeftEyeY = offsetYPixel + eyeLY * renderedHeight;
    const screenRightEyeX = offsetX + (1 - eyeRX) * renderedWidth;
    const screenRightEyeY = offsetYPixel + eyeRY * renderedHeight;

    const dx = screenRightEyeX - screenLeftEyeX;
    const dy = screenRightEyeY - screenLeftEyeY;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);

    // 1. True 3D Roll: In-plane eye angle
    const rollAngle = Math.atan2(dy, dx);
    const safeRoll = THREE.MathUtils.clamp(rollAngle, -0.85, 0.85);

    // 2. True 3D Yaw: Head turn left/right (Eye depth + Temple depth + Nose shift)
    const eyeZDelta = (leftOuter.z || 0) - (rightOuter.z || 0);
    const templeZDelta = ((leftTemple?.z || leftOuter.z || 0) - (rightTemple?.z || rightOuter.z || 0));
    const screenBridgeX = offsetX + (1 - nasion.x) * renderedWidth;
    const screenMidEyeX = (screenLeftEyeX + screenRightEyeX) / 2;
    const noseScreenShift = (screenBridgeX - screenMidEyeX) / (pixelDist * 0.5 + 0.001);

    const rawYaw = (eyeZDelta * 1.8) + (noseScreenShift * 0.7) + (templeZDelta * 0.8);
    const safeYaw = THREE.MathUtils.clamp(rawYaw, -0.85, 0.85);

    // 3. True 3D Pitch: Head nod up/down (Follows facial vertical curvature naturally)
    let safePitch = 0;
    if (chin && foreheadTop) {
      const vertDepth = ((foreheadTop.z || 0) - (chin.z || 0));
      if (isHat) {
        safePitch = 0.04 + THREE.MathUtils.clamp(-vertDepth * 0.5, -0.25, 0.25);
      } else {
        const nosePitchDelta = noseTip ? ((nasion.z || 0) - (noseTip.z || 0)) : 0;
        const calculatedPitch = (vertDepth * 0.75) + (nosePitchDelta * 0.45);
        safePitch = THREE.MathUtils.clamp(calculatedPitch, -0.40, 0.40);
      }
    } else if (isHat) {
      safePitch = 0.04;
    }

    const worldInterPupil = (pixelDist / cw) * (2 * halfW);
    // Hats require 2.85x IPD; Glasses frame requires 2.28x IPD (matching standard eyewear fit)
    const baseScale = isHat ? worldInterPupil * 2.85 : worldInterPupil * 2.28;
    const finalScale = baseScale * (scaleMultiplierRef.current / 100);

    // Store in targetTransformRef for jitter-free 60 FPS damped animation
    targetTransformRef.current.pos.set(worldX, worldY, worldZ);
    targetTransformRef.current.rot.set(
      safePitch + rotOffsetXRef.current,
      safeYaw + rotOffsetYRef.current,
      safeRoll
    );
    targetTransformRef.current.scale.set(finalScale, finalScale, finalScale);
    targetTransformRef.current.active = true;
    targetTransformRef.current.missedFrames = 0;
  };

  /* ------------------------------------------------------------------ */
  /*  6. Pose Landmark Alignment (Upper-Body Clothes / Shirts)          */
  /* ------------------------------------------------------------------ */
  const applyPoseLandmarksTo3DShirt = (landmarks: any[]) => {
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
    }

    // World Space Scale (Shirt fits user shoulder span accurately)
    const worldShoulderSpan = (shoulderSpanPx / cw) * (2 * halfW);
    const baseScale = worldShoulderSpan * 1.30;
    const finalScale = baseScale * (scaleMultiplierRef.current / 100);

    const worldY = ndcY * halfH - 0.55 * finalScale + offsetYRef.current * 0.012;

    targetTransformRef.current.pos.set(worldX, worldY, worldZ);
    targetTransformRef.current.rot.set(
      safePitch + rotOffsetXRef.current,
      safeYaw + rotOffsetYRef.current,
      safeRoll
    );
    targetTransformRef.current.scale.set(finalScale, finalScale, finalScale);
    targetTransformRef.current.active = true;
    targetTransformRef.current.missedFrames = 0;
  };

  /* ------------------------------------------------------------------ */
  /*  7. Face Landmark Chin-Anchored Fallback for Shirts               */
  /* ------------------------------------------------------------------ */
  const applyFaceFallbackTo3DShirt = (landmarks: any[]) => {
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

    targetTransformRef.current.pos.set(worldX, worldY, worldZ);
    targetTransformRef.current.rot.set(
      safePitch + rotOffsetXRef.current,
      safeYaw + rotOffsetYRef.current,
      safeRoll
    );
    targetTransformRef.current.scale.set(finalScale, finalScale, finalScale);
    targetTransformRef.current.active = true;
    targetTransformRef.current.missedFrames = 0;
  };

  /* ------------------------------------------------------------------ */
  /*  8. Manual Center Preview Fallback when No Person in Camera Frame  */
  /* ------------------------------------------------------------------ */
  const applyManualFallbackPreview = (group: THREE.Group) => {
    const defaultBaseScale = isShirt ? 0.95 : isHat ? 1.25 : 1.2;
    const finalScale = defaultBaseScale * (scaleMultiplierRef.current / 100);
    const worldX = offsetXRef.current * 0.012;
    const worldY = (isShirt ? -0.15 : isHat ? 0.12 : 0) + offsetYRef.current * 0.012;
    const worldZ = offsetZRef.current * 0.015;

    group.position.lerp(new THREE.Vector3(worldX, worldY, worldZ), 0.15);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, rotOffsetYRef.current, 0.15);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, rotOffsetXRef.current, 0.15);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, 0, 0.15);
    group.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.15);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-3.5">
      {/* Top Header: 2-Baris Layout (Baris 1: Mode & Frame Switchers, Baris 2: AR Fine-Tuning Micro-Controls) */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Baris 1: Mode Switcher Pill (AR vs 360°) & Frame Selector Pill */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
          {/* Pill 1: AR Live vs 360 Studio */}
          <div
            className={`h-[44px] inline-flex items-center p-1 rounded-full backdrop-blur-xl border shadow-md transition-all ${
              isFemale ? 'bg-[#1c0b1a] border-pink-500/30' : 'bg-[#0B1528] border-blue-500/30'
            }`}
          >
            {!isUploadMode && (
              <button
                onClick={() => setViewMode("ar")}
                className={`h-full px-4 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer select-none ${
                  viewMode === "ar"
                    ? isFemale
                      ? "bg-pink-600 hover:bg-pink-700 text-white font-bold border border-pink-400"
                      : "bg-blue-600 hover:bg-blue-700 text-white font-bold border border-blue-400"
                    : isFemale
                    ? "text-pink-300/70 hover:text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>AR Live</span>
              </button>
            )}
            <button
              onClick={() => setViewMode("studio")}
              className={`h-full px-4 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer select-none ${
                viewMode === "studio"
                  ? isFemale
                    ? "bg-pink-600 hover:bg-pink-700 text-white font-bold border border-pink-400"
                    : "bg-blue-600 hover:bg-blue-700 text-white font-bold border border-blue-400"
                  : isFemale
                  ? "text-pink-300/70 hover:text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>360° Studio</span>
            </button>
          </div>

          {/* Pill 2: Frame Selector in AR Live Mode */}
          {viewMode === "ar" && (
            <div
              className={`h-[44px] inline-flex items-center p-1 rounded-full backdrop-blur-xl border shadow-md transition-all ${
                isFemale ? 'bg-[#1c0b1a] border-pink-500/30' : 'bg-[#0B1528] border-blue-500/30'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedFrame("canon")}
                className={`h-full px-3.5 rounded-full text-xs font-semibold font-mono flex items-center space-x-1.5 transition-all cursor-pointer select-none ${
                  selectedFrame === "canon"
                    ? isFemale
                      ? "bg-pink-600 text-white font-bold border border-pink-400"
                      : "bg-blue-600 text-white font-bold border border-blue-400"
                    : isFemale
                    ? "text-pink-300/70 hover:text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Bingkai 1: Canon DSLR Camera Frame"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>DSLR</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFrame("flower")}
                className={`h-full px-3.5 rounded-full text-xs font-semibold font-mono flex items-center space-x-1.5 transition-all cursor-pointer select-none ${
                  selectedFrame === "flower"
                    ? isFemale
                      ? "bg-pink-600 text-white font-bold border border-pink-400"
                      : "bg-blue-600 text-white font-bold border border-blue-400"
                    : isFemale
                    ? "text-pink-300/70 hover:text-white"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Bingkai 2: Watercolor Flower Frame"
              >
                <Flower2 className="w-3.5 h-3.5" />
                <span>Flower</span>
              </button>
            </div>
          )}
        </div>

        {/* Baris 2: AR Fine-Tuning Micro-Controls (Posisi di bawah 2 card, tanpa scrollbar) */}
        {viewMode === "ar" ? (
          <div
            className={`w-full max-w-[800px] mx-auto min-h-[46px] py-1.5 px-3.5 rounded-full border backdrop-blur-xl flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-lg transition-all ${
              isFemale
                ? "bg-[#1c0b1a]/95 border-pink-500/30"
                : "bg-[#0B1528]/95 border-blue-500/30"
            }`}
          >
            {/* Left: 2 Opsi Interaksi, Koordinat Live, & Reset */}
            <div className="flex flex-wrap items-center gap-2">
              {/* 2 Opsi Interaksi Layar: Opsi 1 (Rotasi) vs Opsi 2 (Posisi) */}
              <div
                className={`inline-flex rounded-full p-0.5 border gap-0.5 shadow-inner ${
                  isFemale ? "bg-[#140613] border-pink-500/20" : "bg-[#071120] border-white/10"
                }`}
              >
                <button
                  onClick={() => setDragMode("rotate")}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    dragMode === "rotate"
                      ? isFemale
                        ? "bg-pink-600 border border-pink-400 text-white"
                        : "bg-blue-600 border border-blue-400 text-white"
                      : isFemale
                      ? "text-pink-300/70 hover:text-white hover:bg-pink-500/10"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Opsi 1: Geser di layar ke segala arah untuk memutar model 3D (360° Horizontal, Vertikal & Diagonal)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Opsi 1: Rotasi</span>
                </button>
                <button
                  onClick={() => setDragMode("pan")}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    dragMode === "pan"
                      ? isFemale
                        ? "bg-pink-600 border border-pink-400 text-white"
                        : "bg-sky-600 border border-sky-400 text-white"
                      : isFemale
                      ? "text-pink-300/70 hover:text-white hover:bg-pink-500/10"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Opsi 2: Geser di layar ke segala arah untuk memindahkan posisi (Atas, Bawah, Kiri, Kanan)"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>Opsi 2: Posisi</span>
                </button>
              </div>

              {/* Indikator Status Koordinat */}
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-[11px] font-mono whitespace-nowrap ${
                  isFemale
                    ? "bg-[#140613] border-pink-500/20 text-pink-300/80"
                    : "bg-[#071120] border-white/5 text-slate-400"
                }`}
              >
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
                className={`px-3 py-1 rounded-full border active:scale-95 transition-all flex items-center space-x-1 cursor-pointer ${
                  isFemale
                    ? "bg-[#140613] hover:bg-pink-600 hover:text-white text-pink-300 border-pink-500/30"
                    : "bg-[#071120] hover:bg-blue-600 hover:text-white text-slate-400 border-white/10"
                }`}
                title="Reset Posisi & Rotasi ke Default"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="text-[11px] font-medium">Reset</span>
              </button>
            </div>

            {/* Right: Scale Slider with Fixed-Width Percentage Label */}
            <div
              className={`flex items-center space-x-2 text-xs px-3 py-1 rounded-full border whitespace-nowrap ${
                isFemale ? "bg-[#140613] border-pink-500/20" : "bg-[#071120] border-white/5"
              }`}
            >
              <span className="text-slate-400 font-mono text-[11px] flex items-center">
                <span>Ukuran:</span>
                <strong
                  className={`inline-block w-9 text-right ml-1 font-mono ${
                    isFemale ? "text-pink-400 font-bold" : "text-[#38BDF8] font-bold"
                  }`}
                >
                  {scaleMultiplier}%
                </strong>
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
                className={`w-16 sm:w-24 h-1.5 rounded-lg appearance-none cursor-pointer ${
                  isFemale ? "bg-[#2a0d27] accent-pink-500" : "bg-[#08101E] accent-blue-500"
                }`}
              />
            </div>
          </div>
        ) : (
          /* 360 Studio Mode */
          <div
            className={`w-full max-w-[800px] mx-auto h-[46px] px-4 rounded-full border backdrop-blur-xl flex items-center justify-between gap-3 text-xs shadow-lg transition-all ${
              isFemale
                ? "bg-[#1c0b1a]/95 border-pink-500/30 text-pink-300"
                : "bg-[#0B1528]/95 border-blue-500/30 text-sky-300"
            }`}
          >
            <div className="flex items-center space-x-2 shrink-0 font-mono text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${isFemale ? 'bg-pink-400' : 'bg-emerald-400'} animate-pulse`} />
              <span>INSPEKSI 3D INTERAKTIF</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 truncate hidden sm:inline">
              Sentuh & geser untuk memutar 360° • Scroll mouse untuk zoom
            </span>
          </div>
        )}
      </div>

      {/* Main Viewport Container */}
      {viewMode === "ar" ? (
        /* MODE 1: LIVE AR WITH DUAL CAMERA FRAME (CANON DSLR OR FLOWER WREATH) */
        <div
          className={
            selectedFrame === "flower"
              ? "relative w-full max-w-[620px] mx-auto drop-shadow-2xl flex items-center justify-center select-none animate-fadeIn"
              : "relative w-full max-w-[800px] mx-auto drop-shadow-2xl flex items-center justify-center select-none animate-fadeIn"
          }
          style={selectedFrame === "flower" ? { aspectRatio: "1 / 1" } : { aspectRatio: "810 / 608" }}
        >
          {/* Bingkai Kamera (Canon DSLR HD atau Watercolor Flower Frame) */}
          <img
            src={selectedFrame === "flower" ? "/images/camera-frame-female.png" : "/images/camera-frame-male.png"}
            alt={selectedFrame === "flower" ? "Flower Frame" : "Canon Camera Frame"}
            aria-hidden
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 select-none drop-shadow-[0_25px_45px_rgba(0,0,0,0.85)]"
          />

          {/* Layar Kamera — proporsi pas di dalam LCD Canon (kotak) atau Lingkaran Flower Frame (bulat) */}
          <div
            className={
              selectedFrame === "flower"
                ? "absolute z-10 overflow-hidden rounded-full bg-black shadow-[inset_0_0_20px_rgba(0,0,0,0.95)]"
                : "absolute z-10 overflow-hidden rounded-[3px] bg-black shadow-[inset_0_0_20px_rgba(0,0,0,0.95)]"
            }
            style={
              selectedFrame === "flower"
                ? { left: "22.80%", top: "20.71%", width: "58.93%", height: "58.93%" }
                : { left: "14.20%", top: "42.50%", width: "48.50%", height: "43.20%" }
            }
          >
            {/* 3D WebGL Canvas Layer Overlay */}
            <div ref={containerRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

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
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
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
              onPointerUp={(e) => {
                dragStateRef.current = null;
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                } catch {}
              }}
              onPointerLeave={() => {
                dragStateRef.current = null;
              }}
              onPointerCancel={() => {
                dragStateRef.current = null;
              }}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 5 : -5;
                const nextScale = Math.max(70, Math.min(130, scaleMultiplierRef.current + delta));
                scaleMultiplierRef.current = nextScale;
                setScaleMultiplier(nextScale);
              }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform -scale-x-100"
                style={{
                  filter: "brightness(1.35) contrast(1.05)",
                }}
                autoPlay
                playsInline
                muted
                onLoadedData={() => {
                  setIsVideoPlaying(true);
                  setCameraReady(true);
                }}
                onPlaying={() => {
                  setIsVideoPlaying(true);
                  setCameraReady(true);
                }}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
              />

              {/* Status Tracking badge live overlay di atas video */}
              <div className="absolute top-2.5 left-2.5 z-30 pointer-events-none flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[10px] font-mono text-white/80">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isTrackingLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                <span>{isTrackingLive ? "AI TRACKING ON" : "AI TRACKING..."}</span>
              </div>

              {/* Maskot & Tulisan saat kamera sedang loading/menghubungkan */}
              {(!isVideoPlaying || !cameraReady) && !cameraError && (
                <div className="absolute inset-0 z-30 bg-[#071120] flex flex-col items-center justify-center space-y-3 p-4 text-center">
                  <div className="relative z-10 flex items-center justify-center">
                    <img
                      src={isFemale ? "/images/mascot-pink.png" : "/images/mascot.png"}
                      alt="COBA Mascot"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md animate-bounce"
                      style={{ animationDuration: '2s' }}
                    />
                  </div>

                  {/* Tulisan Loading Bergelombang */}
                  <div
                    className={`flex items-center space-x-1 font-mono text-xs sm:text-sm font-bold tracking-[0.2em] uppercase ${
                      isFemale ? "text-pink-400" : "text-[#38BDF8]"
                    }`}
                  >
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
                </div>
              )}

              {/* Error State: Card Error Selaras dengan Pindai */}
              {cameraError && (
                <div className="absolute inset-0 z-30 bg-[#071120] flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-full max-w-[260px] sm:max-w-xs rounded-2xl border border-white/10 bg-[#0B1528] p-3.5 space-y-2.5 flex flex-col items-center shadow-xl">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-400/25 flex items-center justify-center">
                      <VideoOff className="w-4 h-4 text-rose-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">Kamera tidak dapat diakses</p>
                      <p className="text-[10px] text-[#94A3B8] leading-relaxed line-clamp-2">{cameraError}</p>
                    </div>

                    <div className="flex flex-col gap-1.5 w-full pt-0.5">
                      <button
                        onClick={retryCamera}
                        type="button"
                        className={`w-full px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                          isFemale
                            ? "bg-pink-600 hover:bg-pink-500"
                            : "bg-blue-600 hover:bg-blue-500"
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Coba Lagi</span>
                      </button>

                      <button
                        onClick={() => setViewMode("studio")}
                        type="button"
                        className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium bg-transparent hover:bg-white/5 border border-white/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isFemale
                            ? "text-pink-300 hover:border-pink-400/40"
                            : "text-[#93C5FD] hover:border-blue-400/40"
                        }`}
                      >
                        <Box className="w-3.5 h-3.5" />
                        <span>Gunakan 360° Studio</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: 360° STUDIO VIEWPORT — LEGA, BEBAS FRAME KAMERA & INTERAKTIF */
        <div
          className="relative w-full max-w-[800px] mx-auto rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-black overflow-hidden shadow-2xl flex items-center justify-center select-none animate-fadeIn cursor-grab active:cursor-grabbing touch-none"
          style={{ aspectRatio: "810 / 608" }}
          onPointerDown={(e) => {
            isDraggingStudioRef.current = true;
            dragStateRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              startOffsetX: offsetXRef.current,
              startOffsetY: offsetYRef.current,
              startRotX: studioPitchRef.current,
              startRotY: studioYawRef.current,
            };
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!isDraggingStudioRef.current || !dragStateRef.current) return;
            const ds = dragStateRef.current;
            const deltaX = (e.clientX - ds.startX) * 0.015;
            const deltaY = (e.clientY - ds.startY) * 0.015;

            studioYawRef.current = ds.startRotY + deltaX;
            studioPitchRef.current = Math.max(
              -Math.PI / 2.2,
              Math.min(Math.PI / 2.2, ds.startRotX + deltaY)
            );
          }}
          onPointerUp={(e) => {
            isDraggingStudioRef.current = false;
            dragStateRef.current = null;
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
            } catch {}
          }}
          onPointerLeave={() => {
            isDraggingStudioRef.current = false;
            dragStateRef.current = null;
          }}
          onPointerCancel={() => {
            isDraggingStudioRef.current = false;
            dragStateRef.current = null;
          }}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY * -0.0015;
            const nextZoom = Math.max(0.5, Math.min(2.5, studioZoomRef.current + delta));
            studioZoomRef.current = nextZoom;
          }}
        >
          {/* Radial Studio Spotlight */}
          <div
            className={`absolute inset-0 pointer-events-none ${
              isFemale
                ? "bg-[radial-gradient(ellipse_at_center,_rgba(244,114,182,0.22)_0%,_transparent_75%)]"
                : "bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.18)_0%,_transparent_75%)]"
            }`}
          />

          {/* 3D WebGL Canvas Layer Overlay */}
          <div ref={containerRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

          <div
            className={`absolute top-4 left-4 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono z-30 shadow-lg backdrop-blur-md pointer-events-none border ${
              isFemale
                ? "bg-pink-500/20 text-pink-300 border-pink-500/30"
                : "bg-blue-500/20 text-sky-300 border-blue-500/30"
            }`}
          >
            <Box className={`w-3.5 h-3.5 ${isFemale ? "text-pink-400" : "text-sky-400"}`} />
            <span>STUDIO 360° INSPECTION</span>
          </div>

          {/* Top-Right: Quick Interactive 360 Controls */}
          <div
            className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-[#071120]/85 backdrop-blur-md p-1 rounded-full border border-white/10"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                studioYawRef.current -= Math.PI / 4;
              }}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Putar Kiri 45°"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                studioYawRef.current += Math.PI / 4;
              }}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Putar Kanan 45°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                studioYawRef.current = 0;
                studioPitchRef.current = 0;
                studioZoomRef.current = 1;
              }}
              className="px-2.5 py-1 rounded-full hover:bg-white/10 text-[10px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset Tampilan Depan"
            >
              Depan
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAutoRotateStudio((prev) => {
                  const next = !prev;
                  isAutoRotateStudioRef.current = next;
                  return next;
                });
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-mono transition-all cursor-pointer font-bold ${
                isAutoRotateStudio
                  ? isFemale
                    ? "bg-pink-600 border border-pink-400 text-white"
                    : "bg-blue-600 border border-blue-400 text-white"
                  : "bg-black/40 text-slate-400 hover:text-white"
              }`}
              title="Toggle Auto-Spin 360°"
            >
              {isAutoRotateStudio ? "Auto: ON" : "Auto: OFF"}
            </button>
          </div>

          {/* Bottom Floating Instructions */}
          <div
            className={`absolute bottom-4 right-4 z-20 hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full backdrop-blur-md border text-[10px] font-mono pointer-events-none ${
              isFemale
                ? "bg-[#180816] border-pink-500/30 text-pink-300"
                : "bg-[#071120] border-white/10 text-slate-400"
            }`}
          >
            <RotateCw className={`w-3 h-3 ${isFemale ? "text-pink-400" : "text-sky-400"}`} />
            <span>Geser layar untuk memutar 360° • Scroll untuk zoom</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARCanvasViewer;
