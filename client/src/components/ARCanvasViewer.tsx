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

/* ------------------------------------------------------------------ */
/*  1. One Euro Filter (High-Precision Real-Time Jitter Reducer)      */
/* ------------------------------------------------------------------ */
class OneEuroFilter {
  minCutoff: number;
  beta: number;
  dCutoff: number;
  xPrev: number | null = null;
  dxPrev: number = 0;
  tPrev: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  filter(x: number, timestamp: number): number {
    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = timestamp;
      this.dxPrev = 0;
      return x;
    }

    const te = Math.max(0.001, (timestamp - this.tPrev) / 1000);
    const rate = 1.0 / te;
    this.tPrev = timestamp;

    const dx = (x - this.xPrev) * rate;
    const aD = this.alpha(rate, this.dCutoff);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    this.dxPrev = dxHat;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(rate, cutoff);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;

    return xHat;
  }

  reset() {
    this.xPrev = null;
    this.tPrev = null;
    this.dxPrev = 0;
  }
}

class Vector3EuroFilter {
  fx = new OneEuroFilter(1.2, 0.015);
  fy = new OneEuroFilter(1.2, 0.015);
  fz = new OneEuroFilter(1.2, 0.015);

  filter(v: THREE.Vector3, t: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.fx.filter(v.x, t),
      this.fy.filter(v.y, t),
      this.fz.filter(v.z, t)
    );
  }

  reset() {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}

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
  const bonesMapRef = useRef<Record<string, THREE.Bone>>({});
  const handOccludersRef = useRef<{ left: THREE.Mesh; right: THREE.Mesh } | null>(null);
  const posFilterRef = useRef(new Vector3EuroFilter());
  const scaleFilterRef = useRef(new Vector3EuroFilter());

  const faceLandmarkerRef = useRef<any>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelSource, setModelSource] = useState<string>("Memuat 3D Model...");
  const [offsetY, setOffsetY] = useState<number>(0);
  const [offsetZ, setOffsetZ] = useState<number>(0);
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
          console.warn("FaceLandmarker GPU init fallback:", e);
        }

        // Initialize PoseLandmarker for Full-Body Tracking
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

    // Studio & AR Lighting Rig
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

    // Create Dynamic Hand/Arm Depth Occluders (Foreground Depth Occlusion)
    const handMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
    const leftHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), handMat);
    const rightHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), handMat);
    leftHandMesh.renderOrder = -1;
    rightHandMesh.renderOrder = -1;
    leftHandMesh.visible = false;
    rightHandMesh.visible = false;
    scene.add(leftHandMesh);
    scene.add(rightHandMesh);
    handOccludersRef.current = { left: leftHandMesh, right: rightHandMesh };

    // Reset temporal smoothing filters
    posFilterRef.current.reset();
    scaleFilterRef.current.reset();

    // Load Categorized 3D Model (GLB)
    loadCategorized3DModel(modelGroup);

    let lastVideoTime = -1;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const video = videoRef.current;
      const faceLandmarker = faceLandmarkerRef.current;
      const poseLandmarker = poseLandmarkerRef.current;
      const now = performance.now();

      if (viewMode === "ar" && video && video.readyState >= 2) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            let tracked = false;

            if (isShirt) {
              // 1. Full-Body Pose Tracking with Skeletal Retargeting & Arm Bending
              if (poseLandmarker) {
                const poseRes = poseLandmarker.detectForVideo(video, now);
                if (poseRes && poseRes.landmarks && poseRes.landmarks.length > 0) {
                  const lm = poseRes.landmarks[0];
                  if (lm[11] && lm[12]) {
                    setIsTrackingLive(true);
                    modelGroup.visible = true;
                    applyPoseLandmarksTo3DShirt(lm, modelGroup, now);
                    tracked = true;
                  }
                }
              }

              // 2. Fallback to Face Landmark Chin-Anchored Neck Tracking
              if (!tracked && faceLandmarker) {
                const faceRes = faceLandmarker.detectForVideo(video, now);
                if (faceRes && faceRes.faceLandmarks && faceRes.faceLandmarks.length > 0) {
                  setIsTrackingLive(true);
                  modelGroup.visible = true;
                  applyFaceFallbackTo3DShirt(faceRes.faceLandmarks[0], modelGroup, now);
                  tracked = true;
                }
              }

              if (!tracked) {
                setIsTrackingLive(false);
                modelGroup.visible = true;
              }
            } else {
              // 6-DoF Face Tracking for Glasses & Hats
              if (faceLandmarker) {
                const result = faceLandmarker.detectForVideo(video, now);
                if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
                  setIsTrackingLive(true);
                  modelGroup.visible = true;
                  applyLandmarksTo3DModel(result.faceLandmarks[0], modelGroup, now);
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
        if (handOccludersRef.current) {
          handOccludersRef.current.left.visible = false;
          handOccludersRef.current.right.visible = false;
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
  }, [viewMode, activeItem, subcategory, offsetY, offsetZ, scaleMultiplier, isShirt]);

  /* ------------------------------------------------------------------ */
  /*  4. Load 3D Model File with Optical Glass Shaders & Auto-Alignment */
  /* ------------------------------------------------------------------ */
  const loadCategorized3DModel = async (group: THREE.Group) => {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    bonesMapRef.current = {};

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

          // Discover Skeleton Bones if present for SkinnedMesh pose retargeting
          const detectedBones: Record<string, THREE.Bone> = {};
          model.traverse((child) => {
            if ((child as THREE.Bone).isBone) {
              const bone = child as THREE.Bone;
              const n = bone.name.toLowerCase();
              if (n.includes("spine") || n.includes("chest") || n.includes("torso")) detectedBones["spine"] = bone;
              if (n.includes("leftshoulder") || n.includes("shoulder_l") || n.includes("shoulder.l")) detectedBones["leftShoulder"] = bone;
              if (n.includes("rightshoulder") || n.includes("shoulder_r") || n.includes("shoulder.r")) detectedBones["rightShoulder"] = bone;
              if (n.includes("leftarm") || n.includes("upper_arm_l") || n.includes("arm_l") || n.includes("upperarm.l")) detectedBones["leftArm"] = bone;
              if (n.includes("rightarm") || n.includes("upper_arm_r") || n.includes("arm_r") || n.includes("upperarm.r")) detectedBones["rightArm"] = bone;
              if (n.includes("leftforearm") || n.includes("forearm_l") || n.includes("forearm.l")) detectedBones["leftForeArm"] = bone;
              if (n.includes("rightforearm") || n.includes("forearm_r") || n.includes("forearm.r")) detectedBones["rightForeArm"] = bone;
            }
          });
          bonesMapRef.current = detectedBones;

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

          // Normalize model dimensions to category standard units
          const maxHoriz = Math.max(sizeAfter.x, sizeAfter.z) > 0 ? Math.max(sizeAfter.x, sizeAfter.z) : 1.0;
          const targetWidth = sizeAfter.x > 0 ? sizeAfter.x : 1.0;
          const baseNormScale = isHat ? (1.0 / maxHoriz) : isShirt ? (1.0 / targetWidth) : (1.0 / targetWidth);
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

          // Create Invisible AR Depth Occluders for authentic 3D penetration
          if (isHat) {
            // Head Occluder: Writes to Z-depth buffer so the back brim & interior of the hat
            // is culled behind the user's real head and hair, creating true 3D head immersion!
            const headGeom = new THREE.SphereGeometry(0.48, 32, 24);
            headGeom.scale(1.0, 1.35, 1.15);
            headGeom.translate(0, -0.25, -0.08);
            const occluderMat = new THREE.MeshBasicMaterial({
              colorWrite: false,
              depthWrite: true,
            });
            const occluderMesh = new THREE.Mesh(headGeom, occluderMat);
            occluderMesh.renderOrder = -1;
            group.add(occluderMesh);
          } else if (isShirt) {
            // Neck & Spine Occluder: Allows real human neck/chin to emerge through the collar hole
            // while culling the back collar behind the neck
            const neckGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.40, 24);
            neckGeom.translate(0, 0.12, -0.08);
            const occluderMat = new THREE.MeshBasicMaterial({
              colorWrite: false,
              depthWrite: true,
            });
            const occluderMesh = new THREE.Mesh(neckGeom, occluderMat);
            occluderMesh.renderOrder = -1;
            group.add(occluderMesh);
          } else {
            // Glasses Head/Ears Occluder: Ensures temple tips naturally tuck behind the user's ears/temples
            const glassesHeadGeom = new THREE.SphereGeometry(0.44, 24, 20);
            glassesHeadGeom.scale(0.95, 1.15, 1.10);
            glassesHeadGeom.translate(0, -0.05, -0.22);
            const occluderMat = new THREE.MeshBasicMaterial({
              colorWrite: false,
              depthWrite: true,
            });
            const occluderMesh = new THREE.Mesh(glassesHeadGeom, occluderMat);
            occluderMesh.renderOrder = -1;
            group.add(occluderMesh);
          }

          setModelSource(`3D GLB (${filename})`);
        },
        undefined,
        (error) => {
          console.warn(`GLB load failed for ${modelPath}:`, error);
          setModelSource(`Gagal memuat GLB (${filename})`);
        }
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /*  5. Face Landmark Alignment (Glasses & Hats)                       */
  /* ------------------------------------------------------------------ */
  const applyLandmarksTo3DModel = (landmarks: any[], group: THREE.Group, timestamp: number) => {
    if (!videoRef.current || !containerRef.current) return;

    const leftPupil = landmarks[468] || landmarks[33];
    const rightPupil = landmarks[473] || landmarks[263];
    const leftOuter = landmarks[33];
    const rightOuter = landmarks[263];
    const nasion = landmarks[168] || landmarks[6];
    const foreheadTop = landmarks[10];
    const chin = landmarks[152];

    const eyeLX = leftPupil ? leftPupil.x : leftOuter.x;
    const eyeLY = leftPupil ? leftPupil.y : leftOuter.y;
    const eyeRX = rightPupil ? rightPupil.x : rightOuter.x;
    const eyeRY = rightPupil ? rightPupil.y : rightOuter.y;

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

    const anchorX = isHat ? (foreheadTop?.x || nasion.x) : nasion.x;
    const anchorY = isHat ? (foreheadTop?.y || nasion.y) : nasion.y;

    const screenX = offsetX + (1 - anchorX) * renderedWidth;
    const screenY = offsetYPixel + anchorY * renderedHeight;

    const ndcX = (screenX / cw) * 2 - 1;
    const ndcY = 1 - (screenY / ch) * 2;

    const halfH = Math.tan((45 * Math.PI) / 360) * 4.2;
    const halfW = halfH * (cw / ch);

    const targetWorldX = ndcX * halfW;
    const targetWorldY = isHat ? (ndcY * halfH - 0.16 + offsetY * 0.012) : (ndcY * halfH - 0.01 + offsetY * 0.012);
    const targetWorldZ = isHat
      ? ((foreheadTop?.z || nasion.z || 0) * -1.8 - 0.03 + offsetZ * 0.015)
      : ((nasion.z || 0) * -1.8 + offsetZ * 0.015);

    // Apply Temporal Jitter Filtering (One Euro Filter)
    const smoothPos = posFilterRef.current.filter(new THREE.Vector3(targetWorldX, targetWorldY, targetWorldZ), timestamp);

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
      const vertDepth = (foreheadTop.z || 0) - (chin.z || 0);
      if (isHat) {
        safePitch = 0.04 + THREE.MathUtils.clamp(-vertDepth * 0.4, -0.2, 0.2);
      } else {
        // Glasses: Keep glasses level and horizontal (pantoscopic tilt ~0° to 4° max)
        safePitch = THREE.MathUtils.clamp(vertDepth * 0.25, -0.10, 0.10);
      }
    } else if (isHat) {
      safePitch = 0.04;
    }

    const worldInterPupil = (pixelDist / cw) * (2 * halfW);
    const baseScale = isHat ? worldInterPupil * 2.85 : worldInterPupil * 1.68;
    const targetScale = baseScale * (scaleMultiplier / 100);
    const smoothScale = scaleFilterRef.current.filter(new THREE.Vector3(targetScale, targetScale, targetScale), timestamp);

    group.position.copy(smoothPos);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw, 0.45);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch, 0.45);
    group.scale.copy(smoothScale);
  };

  /* ------------------------------------------------------------------ */
  /*  6. Full-Body Pose Landmark Alignment & Skeletal Retargeting       */
  /* ------------------------------------------------------------------ */
  const applyPoseLandmarksTo3DShirt = (landmarks: any[], group: THREE.Group, timestamp: number) => {
    if (!videoRef.current || !containerRef.current) return;

    // MediaPipe Pose 33 Landmarks
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
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

    // Screen Coordinates (Mirrored 1 - x)
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

    const targetWorldX = ndcX * halfW;
    const targetWorldY = ndcY * halfH + 0.04 + offsetY * 0.012;
    const midShoulderZ = ((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2;
    const targetWorldZ = midShoulderZ * -2.0 - 0.02 + offsetZ * 0.015;

    // Apply Temporal Jitter Filtering
    const smoothPos = posFilterRef.current.filter(new THREE.Vector3(targetWorldX, targetWorldY, targetWorldZ), timestamp);

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

    // Auto-Fit Non-Uniform Scaling (Shoulder Span + Torso Height)
    const worldShoulderSpan = (shoulderSpanPx / cw) * (2 * halfW);
    const baseScaleX = worldShoulderSpan * 1.30;
    
    let baseScaleY = baseScaleX;
    if (leftHip && rightHip) {
      const screenMidHipY = offsetYPixel + ((leftHip.y + rightHip.y) / 2) * renderedHeight;
      const torsoHeightPx = Math.abs(screenMidHipY - screenMidY);
      const worldTorsoH = (torsoHeightPx / ch) * (2 * halfH);
      if (worldTorsoH > 0.4) {
        baseScaleY = worldTorsoH * 1.45;
      }
    }

    const finalScaleX = baseScaleX * (scaleMultiplier / 100);
    const finalScaleY = baseScaleY * (scaleMultiplier / 100);
    const finalScaleZ = finalScaleX;

    const smoothScale = scaleFilterRef.current.filter(new THREE.Vector3(finalScaleX, finalScaleY, finalScaleZ), timestamp);

    group.position.copy(smoothPos);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw, 0.45);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch, 0.45);
    group.scale.copy(smoothScale);

    // 4. Skeletal Retargeting for Rigged SkinnedMesh Bones (Arms & Elbow Bending)
    const bones = bonesMapRef.current;
    if (bones && (bones.leftArm || bones.rightArm || bones.leftForeArm || bones.rightForeArm)) {
      if (bones.leftArm && leftElbow) {
        const vArm = new THREE.Vector3(
          (leftElbow.x - leftShoulder.x),
          -(leftElbow.y - leftShoulder.y),
          (leftElbow.z - leftShoulder.z)
        ).normalize();
        const qArm = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, -1, 0).normalize(), vArm);
        bones.leftArm.quaternion.slerp(qArm, 0.35);
      }
      if (bones.rightArm && rightElbow) {
        const vArm = new THREE.Vector3(
          (rightElbow.x - rightShoulder.x),
          -(rightElbow.y - rightShoulder.y),
          (rightElbow.z - rightShoulder.z)
        ).normalize();
        const qArm = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1, -1, 0).normalize(), vArm);
        bones.rightArm.quaternion.slerp(qArm, 0.35);
      }
    }

    // 5. Dynamic Foreground Arm & Hand Occlusion (Prevents hands from being hidden behind shirt)
    const handOcc = handOccludersRef.current;
    if (handOcc && leftWrist && rightWrist) {
      const isLeftHandFront = (leftWrist.z || 0) < midShoulderZ - 0.03;
      const isRightHandFront = (rightWrist.z || 0) < midShoulderZ - 0.03;

      if (isLeftHandFront) {
        const screenLWX = offsetX + (1 - leftWrist.x) * renderedWidth;
        const screenLWY = offsetYPixel + leftWrist.y * renderedHeight;
        handOcc.left.position.set(
          ((screenLWX / cw) * 2 - 1) * halfW,
          (1 - (screenLWY / ch) * 2) * halfH,
          (leftWrist.z || 0) * -2.0 + 0.05
        );
        handOcc.left.visible = true;
      } else {
        handOcc.left.visible = false;
      }

      if (isRightHandFront) {
        const screenRWX = offsetX + (1 - rightWrist.x) * renderedWidth;
        const screenRWY = offsetYPixel + rightWrist.y * renderedHeight;
        handOcc.right.position.set(
          ((screenRWX / cw) * 2 - 1) * halfW,
          (1 - (screenRWY / ch) * 2) * halfH,
          (rightWrist.z || 0) * -2.0 + 0.05
        );
        handOcc.right.visible = true;
      } else {
        handOcc.right.visible = false;
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /*  7. Face Landmark Chin-Anchored Fallback for Shirts               */
  /* ------------------------------------------------------------------ */
  const applyFaceFallbackTo3DShirt = (landmarks: any[], group: THREE.Group, timestamp: number) => {
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

    const targetWorldX = ndcX * halfW;
    const targetWorldY = ndcY * halfH + 0.02 + offsetY * 0.012;
    const targetWorldZ = (chin.z || 0) * -1.8 - 0.02 + offsetZ * 0.015;

    const smoothPos = posFilterRef.current.filter(new THREE.Vector3(targetWorldX, targetWorldY, targetWorldZ), timestamp);

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
    const finalScale = baseScale * (scaleMultiplier / 100);

    const smoothScale = scaleFilterRef.current.filter(new THREE.Vector3(finalScale, finalScale, finalScale), timestamp);

    group.position.copy(smoothPos);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw, 0.45);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch, 0.45);
    group.scale.copy(smoothScale);
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

            {/* Tracking Status Pill Overlay */}
            <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-300">
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isTrackingLive ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span>
                {isTrackingLive
                  ? isShirt
                    ? "Full-Body Skeletal Pose Tracking Aktif (60 FPS)"
                    : "Head Pose Tracking Aktif (60 FPS)"
                  : "Mencari Landmark Tubuh..."}
              </span>
            </div>
          </div>
        ) : (
          /* Mode 2: Studio 3D 360° Inspection Room */
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black select-none">
            {/* Ambient Studio Lighting Backdrop Sphere */}
            <div className="absolute w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
            <div className="absolute w-56 h-56 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />

            <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Studio 3D Inspection 360°</span>
            </div>
          </div>
        )}

        {/* View Mode Switching Controls Header */}
        {!isUploadMode && (
          <div className="absolute top-4 right-4 z-20 flex items-center p-1 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/15 shadow-xl">
            <button
              onClick={() => setViewMode("ar")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "ar"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Pasang ke Badan (AR 3D)</span>
            </button>
            <button
              onClick={() => setViewMode("studio")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "studio"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Move3d className="w-3.5 h-3.5" />
              <span>Putar 360°</span>
            </button>
          </div>
        )}

        {/* 3D Model Telemetry Badge */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-slate-300">
          <Box className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-white">{activeItem.name}</span>
          <span className="text-emerald-400 font-mono text-[11px]">
            [{modelSource}]
          </span>
        </div>
      </div>

      {/* Interactive Micro-Controls Panel for Perfect Fit */}
      <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="font-medium text-white">
            {isHat ? "Posisi Topi:" : isShirt ? "Posisi Baju:" : "Posisi Kacamata:"}
          </span>
        </div>

        {/* Height Controls (Y-Axis) */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-1 rounded-xl border border-white/5">
          <span className="text-slate-400 mr-1 text-[11px]">Tinggi:</span>
          <button
            onClick={() => setOffsetY((prev) => prev + 1)}
            className="px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium active:scale-95 transition-all text-[11px]"
          >
            ▲ Naik
          </button>
          <button
            onClick={() => setOffsetY((prev) => prev - 1)}
            className="px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium active:scale-95 transition-all text-[11px]"
          >
            ▼ Turun
          </button>
        </div>

        {/* Depth Controls (Z-Axis: Maju / Mundur) */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-1 rounded-xl border border-white/5">
          <span className="text-slate-400 mr-1 text-[11px]">Maju/Mundur:</span>
          <button
            onClick={() => setOffsetZ((prev) => prev + 1)}
            className="px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium active:scale-95 transition-all text-[11px]"
          >
            ▲ Maju
          </button>
          <button
            onClick={() => setOffsetZ((prev) => prev - 1)}
            className="px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium active:scale-95 transition-all text-[11px]"
          >
            ▼ Mundur
          </button>
        </div>

        {/* Reset Adjustment */}
        {(offsetY !== 0 || offsetZ !== 0 || scaleMultiplier !== 100) && (
          <button
            onClick={() => {
              setOffsetY(0);
              setOffsetZ(0);
              setScaleMultiplier(100);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-medium transition-all text-[11px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}

        {/* Size / Scale Slider */}
        <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1 rounded-xl border border-white/5">
          <span className="text-slate-400 text-[11px]">Ukuran: <strong className="text-white font-mono">{scaleMultiplier}%</strong></span>
          <input
            type="range"
            min="60"
            max="150"
            step="1"
            value={scaleMultiplier}
            onChange={(e) => setScaleMultiplier(Number(e.target.value))}
            className="w-24 accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
