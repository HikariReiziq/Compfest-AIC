"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Move3d,
  Box,
  RotateCcw,
  Sliders,
  Lock,
} from "lucide-react";
import { RecommendationItem } from "../lib/mockData";

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
  const occluderGroupRef = useRef<THREE.Group | null>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isTrackingFace, setIsTrackingFace] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelSource, setModelSource] = useState<string>("Memuat 3D Model...");
  const [offsetY, setOffsetY] = useState<number>(0);
  const [offsetZ, setOffsetZ] = useState<number>(0);
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(100);

  const isUploadMode = inputMode === "upload";

  // View Mode: 'ar' (Live 3D AR on Face) vs 'studio' (3D 360° Inspection)
  // If uploaded photo, AR mode is locked and defaults to studio inspection
  const [viewMode, setViewMode] = useState<"ar" | "studio">(isUploadMode ? "studio" : "ar");

  const sub = (activeItem.subcategory || subcategory).toLowerCase();
  const isHat = sub === "hats" || sub === "hat" || sub.includes("hat") || sub.includes("cap");

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
  /*  2. Initialize MediaPipe FaceLandmarker for Live Tracking           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function initLandmarker() {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const { FaceLandmarker, FilesetResolver } = vision;

        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        if (cancelled) return;

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
      } catch (err) {
        console.warn("AR FaceLandmarker initialization failed:", err);
      }
    }

    initLandmarker();

    return () => {
      cancelled = true;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close?.();
      }
    };
  }, []);

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

    const rimLight = new THREE.DirectionalLight(0xfb7185, 1.8);
    rimLight.position.set(-3, -2, 2);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfff7ed, 1.2);
    fillLight.position.set(0, -2, 3);
    scene.add(fillLight);

    const modelGroup = new THREE.Group();
    modelGroup.renderOrder = 1;
    modelGroupRef.current = modelGroup;
    scene.add(modelGroup);

    // Invisible Head/Face/Ear Occluder (Depth Masking for Glasses Temples & Hat Interior)
    const occluderGroup = new THREE.Group();
    occluderGroup.renderOrder = 0;
    occluderGroupRef.current = occluderGroup;

    const occluderMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
    });

    // Anatomical Head Ellipsoid (Blocks glasses temples from showing in front of ears/cheeks)
    const headGeo = new THREE.SphereGeometry(0.72, 32, 24);
    headGeo.scale(0.92, 1.18, 1.05);
    const headMesh = new THREE.Mesh(headGeo, occluderMat);
    headMesh.position.set(0, -0.05, -0.22);
    occluderGroup.add(headMesh);

    scene.add(occluderGroup);

    // Load Categorized 3D Model (GLB / OBJ)
    loadCategorized3DModel(modelGroup);

    let lastVideoTime = -1;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const video = videoRef.current;
      const landmarker = faceLandmarkerRef.current;

      if (viewMode === "ar" && video && video.readyState >= 2 && landmarker) {
        if (occluderGroup) {
          occluderGroup.visible = true;
        }
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, performance.now());
            if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
              setIsTrackingFace(true);
              applyLandmarksTo3DModel(result.faceLandmarks[0], modelGroup, occluderGroup);
            } else {
              setIsTrackingFace(false);
              modelGroup.position.lerp(new THREE.Vector3(0, 0.2, 0), 0.05);
              occluderGroup.position.lerp(new THREE.Vector3(0, 0.2, -0.22), 0.05);
            }
          } catch {
            // Frame skip
          }
        }
      } else if (viewMode === "studio") {
        setIsTrackingFace(false);
        if (occluderGroup) {
          occluderGroup.visible = false;
        }
        if (modelGroup) {
          modelGroup.rotation.y += 0.015;
          modelGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.08);
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
  }, [viewMode, activeItem, subcategory, offsetY, offsetZ, scaleMultiplier]);

  /* ------------------------------------------------------------------ */
  /*  4. Load 3D Model File with Optical Glass Shaders & Auto-Alignment */
  /* ------------------------------------------------------------------ */
  const loadCategorized3DModel = async (group: THREE.Group) => {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    let modelPath = activeItem.model_3d_path || "";
    if (!modelPath) {
      modelPath = isHat ? "/images/products/hats/bicorn_hat.glb" : "/images/products/glasses/glasses_01_khronos_pbr.glb";
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
      // Use standard default normalization if manifest fetch fails
    }

    const isGLB = modelPath.endsWith(".glb") || modelPath.endsWith(".gltf");

    if (isGLB) {
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;

          // 1. Universal Geometric Auto-Orientation
          const initialBox = new THREE.Box3().setFromObject(model);
          const rawSize = initialBox.getSize(new THREE.Vector3());

          // Glasses lying flat on floor (Z is lens height, much smaller than X width and Y temple depth)
          if (!isHat) {
            // Check if model is lying flat on ground (Z is thickness/height)
            if (rawSize.z < rawSize.x * 0.75 && rawSize.z < rawSize.y * 0.75) {
              model.rotation.x = -Math.PI / 2;
            }
            // Check if model was exported with Y as thickness/height lying down
            else if (rawSize.y < rawSize.x * 0.75 && rawSize.y < rawSize.z * 0.75) {
              // already in X-Z orientation, no X flip needed
            }
          } else {
            // For Hats: ensure crown points upward along Y
            if (rawSize.z < rawSize.x * 0.6 && rawSize.z < rawSize.y * 0.6) {
              model.rotation.x = -Math.PI / 2;
            }
          }

          // Apply per-model manifest fine-tune rotations if specified
          if (modelConfig?.rotation_correction) {
            const [rx, ry, rz] = modelConfig.rotation_correction;
            model.rotation.x += rx;
            model.rotation.y += ry;
            model.rotation.z += rz;
          }

          // 2. Check oriented bounds to ensure front of model faces +Z (user camera)
          model.updateMatrixWorld(true);
          const checkOrientedBox = new THREE.Box3().setFromObject(model);
          const checkSize = checkOrientedBox.getSize(new THREE.Vector3());

          // If depth (Z) is significantly larger than width (X), rotate 90 deg around Y
          if (!isHat && checkSize.z > checkSize.x * 1.25) {
            model.rotation.y += Math.PI / 2;
            model.updateMatrixWorld(true);
          }

          // 2. Scale model vertices to universal standard scale BEFORE centering
          const orientedBox = new THREE.Box3().setFromObject(model);
          const orientedSize = orientedBox.getSize(new THREE.Vector3());
          const maxDimension = isHat 
            ? Math.max(orientedSize.x, orientedSize.y, orientedSize.z)
            : (orientedSize.x > 0 ? orientedSize.x : 1.0);
          const targetUnit = isHat ? 1.40 : 1.45;
          const baseNormScale = targetUnit / (maxDimension || 1.0);
          const customScaleFactor = modelConfig?.scale_factor || 1.0;
          const normalizeScale = baseNormScale * customScaleFactor;
          model.scale.set(normalizeScale, normalizeScale, normalizeScale);

          // Force world matrix update so bounding box reflects scaled vertices
          model.updateMatrixWorld(true);

          // 3. Wrap in wrapper group and center in world space at exact (0, 0, 0)
          const wrapper = new THREE.Group();
          wrapper.add(model);
          wrapper.updateMatrixWorld(true);

          const worldBox = new THREE.Box3().setFromObject(wrapper);
          const worldCenter = worldBox.getCenter(new THREE.Vector3());
          wrapper.position.sub(worldCenter);

          // Apply manifest pivot offset to fine-tune exact anchor point
          if (modelConfig?.pivot_offset) {
            const [ox, oy, oz] = modelConfig.pivot_offset;
            wrapper.position.x += ox;
            wrapper.position.y += oy;
            wrapper.position.z += oz;
          }

          // 3. Apply Ultra-Realistic PBR Lighting & Preserve Authentic GLTF Textures
          const opticalLensMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0x0f172a),
            transparent: true,
            opacity: 0.22,
            roughness: 0.05,
            metalness: 0.08,
            transmission: 0.92,
            ior: 1.52,
            reflectivity: 0.85,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            depthWrite: false,
            side: THREE.DoubleSide,
          });

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.frustumCulled = false;

              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat: any) => {
                if (!mat) return;
                const matName = (mat.name || "").toLowerCase();
                const meshName = (mesh.name || "").toLowerCase();

                // Identify lens geometry vs frame geometry
                const isLens =
                  !isHat &&
                  (matName.includes("glass") ||
                    matName.includes("lens") ||
                    matName.includes("001_g") ||
                    matName.includes("000_glass") ||
                    matName.includes("002_glass") ||
                    meshName.includes("glass") ||
                    meshName.includes("lens"));

                if (isLens) {
                  mesh.material = opticalLensMat;
                } else {
                  // PRESERVE authentic high-definition GLTF textures and normal maps
                  mat.side = THREE.DoubleSide;
                  if (mat.map) {
                    mat.map.colorSpace = THREE.SRGBColorSpace;
                    mat.map.needsUpdate = true;
                  }
                  if (mat.normalMap) mat.normalMap.needsUpdate = true;
                  if (mat.roughnessMap) mat.roughnessMap.needsUpdate = true;
                  if (mat.metalnessMap) mat.metalnessMap.needsUpdate = true;
                  mat.needsUpdate = true;
                }
              });
            }
          });

          group.add(wrapper);
          const filename = modelPath.split("/").pop();
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
  /*  5. Landmark Alignment Loop (Rock-Solid 60 FPS 3D Pose Tracking)   */
  /* ------------------------------------------------------------------ */
  const applyLandmarksTo3DModel = (
    landmarks: any[],
    group: THREE.Group,
    occluderGroup?: THREE.Group
  ) => {
    if (!videoRef.current || !containerRef.current) return;

    // Anatomical Face Landmarks (MediaPipe 468 Mesh)
    // Left eye outer: 33, inner: 133 -> Center of Left Eye
    // Right eye outer: 263, inner: 362 -> Center of Right Eye
    // Nasion / Nose Bridge: 168 (top) & 6 (mid bridge)
    // Forehead: 10
    // Nose tip: 4
    // Chin: 152
    const leftOuter = landmarks[33];
    const leftInner = landmarks[133];
    const rightOuter = landmarks[263];
    const rightInner = landmarks[362];
    const nasion = landmarks[168] || landmarks[6];
    const foreheadTop = landmarks[10];
    const noseTip = landmarks[4] || landmarks[1];
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

    // Accurate Eye Pupil Centers (Normal Video Frame Coordinates, 0 to 1)
    const eyeLX = leftInner ? (leftOuter.x + leftInner.x) / 2 : leftOuter.x;
    const eyeLY = leftInner ? (leftOuter.y + leftInner.y) / 2 : leftOuter.y;
    const eyeRX = rightInner ? (rightOuter.x + rightInner.x) / 2 : rightOuter.x;
    const eyeRY = rightInner ? (rightOuter.y + rightInner.y) / 2 : rightOuter.y;

    // Midpoint between eye centers
    const midEyeX = (eyeLX + eyeRX) / 2;
    const midEyeY = (eyeLY + eyeRY) / 2;

    // Anchor: Nasion + MidEye blend for glasses, Forehead for hats
    const anchorX = isHat ? (foreheadTop ? foreheadTop.x : midEyeX) : (midEyeX * 0.35 + nasion.x * 0.65);
    const anchorY = isHat ? (foreheadTop ? foreheadTop.y : midEyeY) : (midEyeY * 0.35 + nasion.y * 0.65);

    // Screen Pixel Coordinates (Mirrored Video Feed -X)
    const screenX = offsetX + (1 - anchorX) * renderedWidth;
    const screenY = offsetYPixel + anchorY * renderedHeight;

    // Convert Screen Pixels to Three.js NDC (-1 to +1)
    const ndcX = (screenX / cw) * 2 - 1;
    const ndcY = 1 - (screenY / ch) * 2;

    // Camera Frustum Dimensions at Z = 0
    const halfH = Math.tan((45 * Math.PI) / 360) * 4.2;
    const halfW = halfH * (cw / ch);

    const worldX = ndcX * halfW;
    const worldY = ndcY * halfH + (isHat ? 0.32 : -0.01) + offsetY * 0.012;
    const worldZ = (nasion.z || 0) * -1.8 + offsetZ * 0.015;

    // Screen Positions of Both Eyes for Angle & Scale
    const screenLX = offsetX + (1 - eyeLX) * renderedWidth;
    const screenLY = offsetYPixel + eyeLY * renderedHeight;
    const screenRX = offsetX + (1 - eyeRX) * renderedWidth;
    const screenRY = offsetYPixel + eyeRY * renderedHeight;

    // Mirrored delta: On mirrored screen, subject's right eye is on the Left (screenRX < screenLX)
    const deltaX = screenLX - screenRX;
    const deltaY = screenLY - screenRY;
    const pixelDist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 1. True 3D Roll (Tilt angle around Z)
    const rollAngle = Math.atan2(deltaY, deltaX);
    const safeRoll = THREE.MathUtils.clamp(rollAngle, -0.95, 0.95);

    // 2. True 3D Yaw (Head turning Left / Right in 3D Space)
    const eyeZDelta = (rightOuter.z || 0) - (leftOuter.z || 0);
    const screenBridgeX = offsetX + (1 - nasion.x) * renderedWidth;
    const eyeMidScreenX = (screenLX + screenRX) / 2;
    const noseScreenShift = (screenBridgeX - eyeMidScreenX) / (pixelDist * 0.5 + 0.001);
    
    // Combining 3D depth and facial feature perspective foreshortening
    const rawYaw = (eyeZDelta * 3.2) + (noseScreenShift * 1.1);
    const safeYaw = THREE.MathUtils.clamp(rawYaw, -0.95, 0.95);

    // 3. True 3D Pitch (Head tilting Up / Down)
    let safePitch = 0;
    if (chin && foreheadTop) {
      const vertDepth = ((foreheadTop.z || 0) - (chin.z || 0)) * 2.2;
      const noseRelY = ((nasion.y - foreheadTop.y) / (chin.y - foreheadTop.y + 0.001) - 0.45) * 2.0;
      safePitch = THREE.MathUtils.clamp(vertDepth + noseRelY, -0.55, 0.55);
    }

    // World Space Scale (Glasses width matches real Inter-Pupillary Distance)
    const worldInterPupil = (pixelDist / cw) * (2 * halfW);
    const baseScale = isHat ? worldInterPupil * 1.95 : worldInterPupil * 1.62;
    const finalScale = baseScale * (scaleMultiplier / 100);

    // 60 FPS Smooth Interpolation for 3D Accessory
    group.position.x = THREE.MathUtils.lerp(group.position.x, worldX, 0.45);
    group.position.y = THREE.MathUtils.lerp(group.position.y, worldY, 0.45);
    group.position.z = THREE.MathUtils.lerp(group.position.z, worldZ, 0.45);

    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.45);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw, 0.45);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch, 0.45);

    group.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.45);

    // Synchronize Invisible Head Occluder (For Temples & Hat Interior Masking)
    if (occluderGroupRef.current) {
      const occ = occluderGroupRef.current;
      occ.position.x = group.position.x;
      occ.position.y = group.position.y - 0.05;
      occ.position.z = group.position.z - 0.22;

      occ.rotation.z = group.rotation.z;
      occ.rotation.y = group.rotation.y;
      occ.rotation.x = group.rotation.x;

      occ.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.45);
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* 3D AR & Studio Viewport */}
      <div className="relative w-full h-[520px] sm:h-[580px] rounded-3xl overflow-hidden bg-[#060B14] border border-blue-500/20 shadow-2xl flex items-center justify-center">
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

            {isTrackingFace && (
              <div className="absolute top-4 left-4 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0B1528] text-[#93C5FD] border border-blue-500/30 text-[11px] font-mono z-20 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>6-DoF FACE &amp; HEAD TRACKING (60 FPS)</span>
              </div>
            )}
          </div>
        ) : (
          /* Mode 2: 3D Studio Turntable */
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-[#0B1528] via-[#060B14] to-[#040810]">
            <div className="absolute top-4 left-4 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0B1528] text-[#93C5FD] border border-blue-500/30 text-[11px] font-mono z-20 shadow-lg">
              <Box className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>3D STUDIO ROTATION (360°)</span>
            </div>
          </div>
        )}

        {/* Top Floating View Controls */}
        <div className="absolute top-4 right-4 z-30 flex items-center space-x-2 bg-[#0B1528]/90 backdrop-blur-2xl p-1.5 rounded-full border border-blue-500/30 shadow-2xl">
          <button
            onClick={() => setViewMode("ar")}
            disabled={isUploadMode}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === "ar"
                ? "bg-blue-600 text-white shadow-md"
                : isUploadMode
                ? "text-[#64748B] cursor-not-allowed opacity-50"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            {isUploadMode ? <Lock className="w-3.5 h-3.5" /> : <Box className="w-3.5 h-3.5 text-[#38BDF8]" />}
            <span>{isUploadMode ? "AR Mode Terkunci" : "Coba Langsung (AR 3D)"}</span>
          </button>
          <button
            onClick={() => setViewMode("studio")}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === "studio"
                ? "bg-blue-600 text-white shadow-md"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            <Move3d className="w-3.5 h-3.5" />
            <span>Putar 360°</span>
          </button>
        </div>

        {/* Bottom Floating Info Badge */}
        <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center space-x-2.5 px-4 py-2 rounded-full bg-[#0B1528]/90 backdrop-blur-2xl border border-blue-500/20 text-xs shadow-xl">
          <Box className="w-4 h-4 text-[#38BDF8]" />
          <span className="font-semibold text-white">{activeItem.name}</span>
          <span className="text-[#FACC15] text-xs font-mono font-bold">
            [{modelSource}]
          </span>
        </div>
      </div>

      {/* AR Fine-Tuning Micro-Controls */}
      <div className="p-4 sm:p-5 rounded-3xl border border-blue-500/20 bg-[#0B1528]/90 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Height and Depth Adjustments */}
        <div className="flex items-center space-x-4 text-xs">
          <Sliders className="w-4 h-4 text-[#38BDF8]" />
          
          <div className="flex items-center space-x-2">
            <span className="text-[#94A3B8] font-semibold">Tinggi:</span>
            <button
              onClick={() => setOffsetY((prev) => prev + 1)}
              className="px-2.5 py-1 rounded-full bg-[#071120] hover:bg-blue-600 text-white border border-blue-500/30 font-bold text-xs transition-colors"
              title="Geser Naik"
            >
              ▲
            </button>
            <button
              onClick={() => setOffsetY((prev) => prev - 1)}
              className="px-2.5 py-1 rounded-full bg-[#071120] hover:bg-blue-600 text-white border border-blue-500/30 font-bold text-xs transition-colors"
              title="Geser Turun"
            >
              ▼
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[#94A3B8] font-semibold">Kedalaman:</span>
            <button
              onClick={() => setOffsetZ((prev) => prev - 1)}
              className="px-3 py-1 rounded-full bg-[#071120] hover:bg-blue-600 text-white border border-blue-500/30 font-semibold text-xs transition-colors"
              title="Maju ke Depan"
            >
              + Maju
            </button>
            <button
              onClick={() => setOffsetZ((prev) => prev + 1)}
              className="px-3 py-1 rounded-full bg-[#071120] hover:bg-blue-600 text-white border border-blue-500/30 font-semibold text-xs transition-colors"
              title="Mundur ke Belakang"
            >
              - Mundur
            </button>
          </div>

          <button
            onClick={() => {
              setOffsetY(0);
              setOffsetZ(0);
              setScaleMultiplier(100);
            }}
            className="p-2 rounded-full bg-[#071120] hover:bg-blue-600 text-[#93C5FD] hover:text-white border border-blue-500/30 transition-colors"
            title="Reset Posisi &amp; Skala"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Size Scale */}
        <div className="flex items-center space-x-2.5 text-xs">
          <span className="text-[#94A3B8] font-mono">Skala: <strong className="text-[#93C5FD]">{scaleMultiplier}%</strong></span>
          <input
            type="range"
            min={70}
            max={130}
            value={scaleMultiplier}
            onChange={(e) => setScaleMultiplier(Number(e.target.value))}
            className="w-28 h-2 bg-[#071120] rounded-full appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ARCanvasViewer;
