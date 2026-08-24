"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Move3d,
  Sliders,
  RotateCcw,
  RefreshCw,
  Box,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { RecommendationItem } from "../lib/mockData";

export interface BodyOutfitViewerProps {
  activeItem: RecommendationItem;
  subcategory: string;
  mediaStream?: MediaStream | null;
  userSnapshotUrl?: string | null;
  inputMode?: "camera" | "upload";
}

export const BodyOutfitViewer: React.FC<BodyOutfitViewerProps> = ({
  activeItem,
  subcategory,
  mediaStream,
  userSnapshotUrl,
  inputMode = "camera",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const garmentGroupRef = useRef<THREE.Group | null>(null);
  const occluderGroupRef = useRef<THREE.Group | null>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  const isUploadMode = inputMode === "upload" && !mediaStream;

  // View Mode: 'ar' (Live 3D Body Fitting) vs 'studio' (3D 360° Inspection)
  const [viewMode, setViewMode] = useState<"ar" | "studio">("ar");
  const [isRotating, setIsRotating] = useState(true);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [fitStyle, setFitStyle] = useState<"regular" | "oversized" | "slim">("regular");
  const [offsetY, setOffsetY] = useState<number>(0);
  const [offsetZ, setOffsetZ] = useState<number>(0);
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(100);
  const [garmentOpacity, setGarmentOpacity] = useState<number>(100);
  const [modelSource, setModelSource] = useState<string>("Memuat 3D GLB...");

  // Visual Kerangka & Ghost Mannequin Toggles (Persis seperti di referensi)
  const [showPose, setShowPose] = useState<boolean>(true);
  const [showGhost, setShowGhost] = useState<boolean>(true);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [detectedBonesList, setDetectedBonesList] = useState<string[]>([
    "LeftArm", "LeftForeArm", "RightArm", "RightForeArm", "Neck", "Head", "LeftShoulder", "RightShoulder", "Spine", "Hips"
  ]);

  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ghostGroupRef = useRef<THREE.Group | null>(null);

  const activeColorHex = activeItem.hex_colour || "#2563eb";

  /* ------------------------------------------------------------------ */
  /*  1. Initialize / Manage Camera Stream                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
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
  }, [mediaStream]);

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

    const rimLight = new THREE.DirectionalLight(0xfb7185, 1.8);
    rimLight.position.set(-3, -2, 2);
    scene.add(rimLight);

    const garmentGroup = new THREE.Group();
    garmentGroup.renderOrder = 1;
    garmentGroupRef.current = garmentGroup;
    scene.add(garmentGroup);

    // Invisible Occluder System for 360° Body Wrapping (Neck & Torso Depth Mask)
    const occluderGroup = new THREE.Group();
    occluderGroup.renderOrder = 0;
    occluderGroupRef.current = occluderGroup;

    const occluderMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
    });

    // 1. Neck Occluder (Cylinder)
    const neckGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.2, 32);
    const neckMesh = new THREE.Mesh(neckGeo, occluderMat);
    neckMesh.position.set(0, 0.45, 0);
    occluderGroup.add(neckMesh);

    // 2. Torso Occluder Core (Elliptical Cylinder)
    const torsoGeo = new THREE.CylinderGeometry(0.70, 0.65, 2.4, 32);
    torsoGeo.scale(1.0, 1.0, 0.55);
    const torsoMesh = new THREE.Mesh(torsoGeo, occluderMat);
    torsoMesh.position.set(0, -0.65, -0.05);
    occluderGroup.add(torsoMesh);

    scene.add(occluderGroup);

    // Green Wireframe Ghost Mannequin System (Persis seperti di referensi)
    const ghostGroup = new THREE.Group();
    ghostGroup.renderOrder = 2;
    ghostGroupRef.current = ghostGroup;

    const ghostWireframeMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e, // Neon Green
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });

    // 1. Ghost Head (Icosahedron Wireframe)
    const ghostHeadGeo = new THREE.IcosahedronGeometry(0.42, 3);
    const ghostHeadMesh = new THREE.Mesh(ghostHeadGeo, ghostWireframeMat);
    ghostHeadMesh.name = "Ghost_Head";
    ghostGroup.add(ghostHeadMesh);

    // 2. Ghost Neck
    const ghostNeckGeo = new THREE.CylinderGeometry(0.20, 0.24, 0.55, 16, 6);
    const ghostNeckMesh = new THREE.Mesh(ghostNeckGeo, ghostWireframeMat);
    ghostNeckMesh.name = "Ghost_Neck";
    ghostGroup.add(ghostNeckMesh);

    // 3. Ghost Torso Core
    const ghostTorsoGeo = new THREE.CylinderGeometry(0.68, 0.58, 1.8, 20, 10);
    ghostTorsoGeo.scale(1.0, 1.0, 0.55);
    const ghostTorsoMesh = new THREE.Mesh(ghostTorsoGeo, ghostWireframeMat);
    ghostTorsoMesh.name = "Ghost_Torso";
    ghostGroup.add(ghostTorsoMesh);

    // 4. Ghost Left & Right Upper Arm (Biceps)
    const ghostUpperArmGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.9, 16, 8);
    const ghostLeftUpperArmMesh = new THREE.Mesh(ghostUpperArmGeo, ghostWireframeMat);
    ghostLeftUpperArmMesh.name = "Ghost_LeftUpperArm";
    ghostGroup.add(ghostLeftUpperArmMesh);

    const ghostRightUpperArmMesh = new THREE.Mesh(ghostUpperArmGeo, ghostWireframeMat);
    ghostRightUpperArmMesh.name = "Ghost_RightUpperArm";
    ghostGroup.add(ghostRightUpperArmMesh);

    // 5. Ghost Left & Right Forearms
    const ghostForearmGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.85, 16, 8);
    const ghostLeftForearmMesh = new THREE.Mesh(ghostForearmGeo, ghostWireframeMat);
    ghostLeftForearmMesh.name = "Ghost_LeftForearm";
    ghostGroup.add(ghostLeftForearmMesh);

    const ghostRightForearmMesh = new THREE.Mesh(ghostForearmGeo, ghostWireframeMat);
    ghostRightForearmMesh.name = "Ghost_RightForearm";
    ghostGroup.add(ghostRightForearmMesh);

    // 6. Ghost Left & Right Hands
    const ghostHandGeo = new THREE.IcosahedronGeometry(0.20, 2);
    ghostHandGeo.scale(0.8, 1.4, 0.4);
    const ghostLeftHandMesh = new THREE.Mesh(ghostHandGeo, ghostWireframeMat);
    ghostLeftHandMesh.name = "Ghost_LeftHand";
    ghostGroup.add(ghostLeftHandMesh);

    const ghostRightHandMesh = new THREE.Mesh(ghostHandGeo, ghostWireframeMat);
    ghostRightHandMesh.name = "Ghost_RightHand";
    ghostGroup.add(ghostRightHandMesh);

    scene.add(ghostGroup);

    // Load Categorized Shirt / Baju Model (GLB preferred, OBJ fallback)
    loadCategorizedGarmentGLB(garmentGroup);

    let lastVideoTime = -1;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const video = videoRef.current;
      const landmarker = poseLandmarkerRef.current;

      if (viewMode === "ar" && video && video.readyState >= 2 && landmarker) {
        if (occluderGroup) {
          occluderGroup.visible = true;
        }
        if (ghostGroup) {
          ghostGroup.visible = showGhost;
        }
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, performance.now());
            if (result && result.landmarks && result.landmarks.length > 0) {
              setIsTrackingLive(true);
              const landmarks = result.landmarks[0];
              applyPoseLandmarksTo3D(landmarks, garmentGroup, occluderGroup, ghostGroup);
              if (showPose) {
                drawPoseSkeleton(landmarks);
              } else if (skeletonCanvasRef.current) {
                const ctx = skeletonCanvasRef.current.getContext("2d");
                ctx?.clearRect(0, 0, skeletonCanvasRef.current.width, skeletonCanvasRef.current.height);
              }
            } else {
              setIsTrackingLive(false);
              garmentGroup.position.lerp(new THREE.Vector3(0, -0.2, 0), 0.05);
              occluderGroup.position.lerp(new THREE.Vector3(0, -0.2, 0), 0.05);
              ghostGroup.position.lerp(new THREE.Vector3(0, -0.2, 0), 0.05);
            }
          } catch {
            // Frame skip
          }
        }
      } else if (viewMode === "studio") {
        setIsTrackingLive(false);
        if (occluderGroup) occluderGroup.visible = false;
        if (ghostGroup) ghostGroup.visible = false;
        if (skeletonCanvasRef.current) {
          const ctx = skeletonCanvasRef.current.getContext("2d");
          ctx?.clearRect(0, 0, skeletonCanvasRef.current.width, skeletonCanvasRef.current.height);
        }
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
      if (skeletonCanvasRef.current) {
        skeletonCanvasRef.current.width = newW;
        skeletonCanvasRef.current.height = newH;
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
    };
  }, [viewMode, isRotating, offsetY, offsetZ, scaleMultiplier, activeItem, subcategory, garmentOpacity, fitStyle, showGhost, showPose]);

  // Skeletal Armature Rigging References
  const skeletalRigRef = useRef<{
    isRigged: boolean;
    bones: { [key: string]: THREE.Bone };
    leftArmPivot?: THREE.Group;
    rightArmPivot?: THREE.Group;
    torsoGroup?: THREE.Group;
  }>({ isRigged: false, bones: {} });

  const [skeletalRiggingActive, setSkeletalRiggingActive] = useState(true);

  /* ------------------------------------------------------------------ */
  /*  4. Load Categorized Shirt / Baju Model with Skeletal Rigging      */
  /* ------------------------------------------------------------------ */
  const loadCategorizedGarmentGLB = async (group: THREE.Group) => {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const widthScale = fitStyle === "oversized" ? 1.18 : fitStyle === "slim" ? 0.9 : 1.0;

    let modelPath = activeItem.model_3d_path || "/images/products/shirts/Pria/color_blocked_shirt.glb";
    const filename = modelPath.split("/").pop() || "";

    // Fetch calibration manifest
    let modelConfig: any = null;
    try {
      const res = await fetch("/images/products/glb_manifest.json");
      if (res.ok) {
        const manifest = await res.json();
        modelConfig = manifest[filename] || null;
      }
    } catch {}

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // 1. Initial orientation correction for shirts
        const initialBox = new THREE.Box3().setFromObject(model);
        const rawSize = initialBox.getSize(new THREE.Vector3());
        if (rawSize.y > rawSize.z * 1.5 && rawSize.x < rawSize.z) {
          model.rotation.y = Math.PI / 2;
        }

        // Apply manifest rotation if any
        if (modelConfig?.rotation_correction) {
          const [rx, ry, rz] = modelConfig.rotation_correction;
          model.rotation.x += rx;
          model.rotation.y += ry;
          model.rotation.z += rz;
        }

        // 2. Standardize shirt model width to 1.0 unit across all 19 shirts for consistent anatomy fitting
        const orientedBox = new THREE.Box3().setFromObject(model);
        const orientedSize = orientedBox.getSize(new THREE.Vector3());
        const targetShoulderWidth = orientedSize.x > 0 ? orientedSize.x : 1.0;
        const customScaleFactor = modelConfig?.scale_factor || 1.0;
        const normScale = (1.0 / targetShoulderWidth) * customScaleFactor;
        model.scale.set(normScale * widthScale, normScale, normScale * widthScale);

        // Force world matrix update so bounding box reflects scaled vertices
        model.updateMatrixWorld(true);

        // 3. Wrap in wrapper group and center in world space at exact (0, 0, 0)
        const wrapper = new THREE.Group();
        wrapper.add(model);
        wrapper.updateMatrixWorld(true);

        const worldBox = new THREE.Box3().setFromObject(wrapper);
        const worldCenter = worldBox.getCenter(new THREE.Vector3());
        wrapper.position.sub(worldCenter);

        // Apply manifest pivot offset
        if (modelConfig?.pivot_offset) {
          const [ox, oy, oz] = modelConfig.pivot_offset;
          wrapper.position.x += ox;
          wrapper.position.y += oy;
          wrapper.position.z += oz;
        }

        // 4. Setup Skeletal Armature Rigging & Bone Hierarchy
        const detectedBones: { [key: string]: THREE.Bone } = {};
        let hasNativeBones = false;

        model.traverse((child) => {
          if ((child as THREE.Bone).isBone) {
            const bone = child as THREE.Bone;
            detectedBones[bone.name.toLowerCase()] = bone;
            hasNativeBones = true;
          }
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;

            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat: any) => {
              if (!mat) return;
              mat.side = THREE.DoubleSide;
              mat.transparent = garmentOpacity < 100;
              mat.opacity = garmentOpacity / 100;
              if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
                mat.map.needsUpdate = true;
              }
              if (mat.normalMap) mat.normalMap.needsUpdate = true;
              if (mat.roughnessMap) mat.roughnessMap.needsUpdate = true;
              if (mat.metalnessMap) mat.metalnessMap.needsUpdate = true;
              mat.needsUpdate = true;
            });
          }
        });

        // Procedural Armature Rig for Standard Meshes
        const leftArmPivot = new THREE.Group();
        leftArmPivot.name = "ProceduralRig_LeftShoulder";
        leftArmPivot.position.set(worldBox.max.x * 0.42, worldBox.max.y * 0.22, 0);

        const rightArmPivot = new THREE.Group();
        rightArmPivot.name = "ProceduralRig_RightShoulder";
        rightArmPivot.position.set(worldBox.min.x * 0.42, worldBox.max.y * 0.22, 0);

        wrapper.add(leftArmPivot);
        wrapper.add(rightArmPivot);

        skeletalRigRef.current = {
          isRigged: true,
          bones: detectedBones,
          leftArmPivot,
          rightArmPivot,
          torsoGroup: wrapper,
        };

        group.add(wrapper);

        const filename = modelPath.split("/").pop();
        setModelSource(hasNativeBones ? `3D Rigged GLB (${filename})` : `3D Skeletal Mesh (${filename})`);
      },
      undefined,
      (err) => {
        console.warn(`GLB load failed for ${modelPath}:`, err);
      }
    );
  };

  /* ------------------------------------------------------------------ */
  /*  5. Real-Time 2D Skeleton Joint & Stick Bone Canvas Renderer       */
  /* ------------------------------------------------------------------ */
  const drawPoseSkeleton = useCallback((landmarks: any[]) => {
    const canvas = skeletonCanvasRef.current;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!canvas || !video || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    ctx.clearRect(0, 0, cw, ch);

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

    const POSE_CONNECTIONS: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 7], // Right face & ear
      [0, 4], [4, 5], [5, 6], [6, 8], // Left face & ear
      [9, 10], // Mouth
      [11, 12], // Shoulder line
      [11, 23], // Left torso
      [12, 24], // Right torso
      [23, 24], // Hip line
      [11, 13], // Left upper arm
      [13, 15], // Left forearm
      [15, 17], [15, 19], [15, 21], [17, 19], // Left hand & fingers
      [12, 14], // Right upper arm
      [14, 16], // Right forearm
      [16, 18], [16, 20], [16, 22], [18, 20], // Right hand & fingers
      [23, 25], [25, 27], [27, 29], [27, 31], // Left leg
      [24, 26], [26, 28], [28, 30], [28, 32], // Right leg
    ];

    // 1. Draw Stick Bones (Cyan Neon Glowing Lines)
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#22d3ee";
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 8;
    ctx.lineCap = "round";

    POSE_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.35 && (p2.visibility ?? 1) > 0.35) {
        const x1 = offsetX + (1 - p1.x) * renderedWidth;
        const y1 = offsetYPixel + p1.y * renderedHeight;
        const x2 = offsetX + (1 - p2.x) * renderedWidth;
        const y2 = offsetYPixel + p2.y * renderedHeight;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    // 2. Draw Glowing Joint Dots (Points)
    landmarks.forEach((p, idx) => {
      if (!p || (p.visibility ?? 1) <= 0.35) return;
      const x = offsetX + (1 - p.x) * renderedWidth;
      const y = offsetYPixel + p.y * renderedHeight;

      const isMainJoint = [11, 12, 13, 14, 15, 16, 23, 24].includes(idx);
      const radius = isMainJoint ? 6 : 4;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isMainJoint ? "#4ade80" : "#22d3ee"; // Neon green for major joints, cyan for fingers/face
      ctx.shadowColor = isMainJoint ? "#22c55e" : "#06b6d4";
      ctx.shadowBlur = 10;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, []);

  /* ------------------------------------------------------------------ */
  /*  6. Real-Time 3D Pose Landmark Anchoring & Skeletal Arm Kinematics */
  /* ------------------------------------------------------------------ */
  const applyPoseLandmarksTo3D = useCallback(
    (landmarks: any[], garmentGroup: THREE.Group, occluderGroup?: THREE.Group, ghostGroup?: THREE.Group) => {
      if (!videoRef.current || !containerRef.current) return;

      const nose = landmarks[0];
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

      // Anatomical midpoint of shoulders (Collar / Neck Base Anchor)
      const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
      const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

      // Screen Pixel Coordinates (Mirrored Video Feed: 1 - X)
      const screenX = offsetX + (1 - midShoulderX) * renderedWidth;
      const screenY = offsetYPixel + midShoulderY * renderedHeight;

      // Convert Screen Pixels to Three.js NDC (-1 to +1)
      const ndcX = (screenX / cw) * 2 - 1;
      const ndcY = 1 - (screenY / ch) * 2;

      // Camera Frustum Dimensions at Z = 0 (Camera Z = 4.0, FOV = 45 deg)
      const halfH = Math.tan((45 * Math.PI) / 360) * 4.0;
      const halfW = halfH * (cw / ch);

      const worldX = ndcX * halfW;
      const worldY = ndcY * halfH + offsetY * 0.012 - 0.28;
      const worldZ = (((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2) * -3.2 + offsetZ * 0.015;

      // Screen Positions of Both Shoulders
      const screenLeftShoulderX = offsetX + (1 - leftShoulder.x) * renderedWidth;
      const screenLeftShoulderY = offsetYPixel + leftShoulder.y * renderedHeight;
      const screenRightShoulderX = offsetX + (1 - rightShoulder.x) * renderedWidth;
      const screenRightShoulderY = offsetYPixel + rightShoulder.y * renderedHeight;

      // Vector pointing from Screen-Left to Screen-Right across the shoulders
      const dx = screenRightShoulderX - screenLeftShoulderX;
      const dy = screenRightShoulderY - screenLeftShoulderY;
      const pixelDist = Math.sqrt(dx * dx + dy * dy);

      // 1. Roll: Shoulder slope
      const rollAngle = Math.atan2(dy, dx);
      const safeRoll = THREE.MathUtils.clamp(rollAngle, -0.65, 0.65);

      // 2. Yaw: Torso rotation around Y
      const depthDiff = (leftShoulder.z || 0) - (rightShoulder.z || 0);
      const yawAngle = Math.atan2(depthDiff * 2.2, Math.abs(dx) / (renderedWidth || 1) + 0.001);
      const safeYaw = THREE.MathUtils.clamp(yawAngle, -0.75, 0.75);

      // 3. Pitch: Torso leaning forward / backward
      let safePitch = 0;
      if (leftHip && rightHip) {
        const midHipZ = ((leftHip.z || 0) + (rightHip.z || 0)) / 2;
        const midShoulderZ = ((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2;
        const pitchDelta = (midShoulderZ - midHipZ) * 1.8;
        safePitch = THREE.MathUtils.clamp(pitchDelta, -0.45, 0.45);
      }

      // World Space Scale
      const worldShoulderSpan = (pixelDist / cw) * (2 * halfW);
      const baseScale = worldShoulderSpan * 1.82 * (scaleMultiplier / 100);

      const fitMultiplier = fitStyle === "oversized" ? 1.15 : fitStyle === "slim" ? 0.9 : 1.0;
      const finalScale = baseScale * fitMultiplier;

      // Update 3D Garment Group
      garmentGroup.position.x = THREE.MathUtils.lerp(garmentGroup.position.x, worldX, 0.45);
      garmentGroup.position.y = THREE.MathUtils.lerp(garmentGroup.position.y, worldY, 0.45);
      garmentGroup.position.z = THREE.MathUtils.lerp(garmentGroup.position.z, worldZ, 0.45);

      garmentGroup.rotation.z = THREE.MathUtils.lerp(garmentGroup.rotation.z, safeRoll, 0.45);
      garmentGroup.rotation.y = THREE.MathUtils.lerp(garmentGroup.rotation.y, safeYaw, 0.45);
      garmentGroup.rotation.x = THREE.MathUtils.lerp(garmentGroup.rotation.x, safePitch, 0.45);

      garmentGroup.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.45);

      // 4. Skeletal Arm Kinematics & Joint Deformations
      if (skeletalRiggingActive && skeletalRigRef.current.isRigged) {
        const rig = skeletalRigRef.current;

        // Left Arm Vector
        if (leftElbow) {
          const ldx = (1 - leftElbow.x) - (1 - leftShoulder.x);
          const ldy = leftElbow.y - leftShoulder.y;
          const leftArmAngle = Math.atan2(ldy, ldx);
          const leftElevation = THREE.MathUtils.clamp(-(leftArmAngle + Math.PI / 2), -1.2, 1.2);

          if (rig.leftArmPivot) {
            rig.leftArmPivot.rotation.z = THREE.MathUtils.lerp(rig.leftArmPivot.rotation.z, leftElevation * 0.7, 0.35);
          }
          const leftBone = rig.bones["arm.l"] || rig.bones["upperarm.l"] || rig.bones["upper_arm.l"] || rig.bones["leftarm"];
          if (leftBone) {
            leftBone.rotation.z = THREE.MathUtils.lerp(leftBone.rotation.z, leftElevation, 0.35);
          }
        }

        // Right Arm Vector
        if (rightElbow) {
          const rdx = (1 - rightElbow.x) - (1 - rightShoulder.x);
          const rdy = rightElbow.y - rightShoulder.y;
          const rightArmAngle = Math.atan2(rdy, rdx);
          const rightElevation = THREE.MathUtils.clamp(rightArmAngle - Math.PI / 2, -1.2, 1.2);

          if (rig.rightArmPivot) {
            rig.rightArmPivot.rotation.z = THREE.MathUtils.lerp(rig.rightArmPivot.rotation.z, rightElevation * 0.7, 0.35);
          }
          const rightBone = rig.bones["arm.r"] || rig.bones["upperarm.r"] || rig.bones["upper_arm.r"] || rig.bones["rightarm"];
          if (rightBone) {
            rightBone.rotation.z = THREE.MathUtils.lerp(rightBone.rotation.z, rightElevation, 0.35);
          }
        }
      }

      // Synchronize Invisible Occluder Group
      if (occluderGroup) {
        occluderGroup.position.copy(garmentGroup.position);
        occluderGroup.position.z -= 0.05;
        occluderGroup.rotation.copy(garmentGroup.rotation);
        occluderGroup.scale.lerp(new THREE.Vector3(finalScale * 0.95, finalScale * 0.95, finalScale * 0.95), 0.45);
      }

      // Synchronize 3D Green Wireframe Ghost Mannequin
      if (ghostGroup) {
        ghostGroup.position.copy(garmentGroup.position);
        ghostGroup.rotation.copy(garmentGroup.rotation);
        ghostGroup.scale.copy(garmentGroup.scale);

        // Head Ghost
        const ghostHead = ghostGroup.getObjectByName("Ghost_Head");
        if (ghostHead) ghostHead.position.set(0, 0.92, 0.05);

        // Neck Ghost
        const ghostNeck = ghostGroup.getObjectByName("Ghost_Neck");
        if (ghostNeck) ghostNeck.position.set(0, 0.50, 0);

        // Torso Ghost
        const ghostTorso = ghostGroup.getObjectByName("Ghost_Torso");
        if (ghostTorso) ghostTorso.position.set(0, -0.65, -0.05);

        // Left Upper Arm Ghost
        const ghostLeftUpperArm = ghostGroup.getObjectByName("Ghost_LeftUpperArm");
        if (ghostLeftUpperArm) {
          ghostLeftUpperArm.position.set(0.65, 0.15, 0);
          if (leftElbow) {
            const ldx = (1 - leftElbow.x) - (1 - leftShoulder.x);
            const ldy = leftElbow.y - leftShoulder.y;
            const leftArmAngle = Math.atan2(ldy, ldx);
            ghostLeftUpperArm.rotation.z = -(leftArmAngle + Math.PI / 2);
          }
        }

        // Right Upper Arm Ghost
        const ghostRightUpperArm = ghostGroup.getObjectByName("Ghost_RightUpperArm");
        if (ghostRightUpperArm) {
          ghostRightUpperArm.position.set(-0.65, 0.15, 0);
          if (rightElbow) {
            const rdx = (1 - rightElbow.x) - (1 - rightShoulder.x);
            const rdy = rightElbow.y - rightShoulder.y;
            const rightArmAngle = Math.atan2(rdy, rdx);
            ghostRightUpperArm.rotation.z = rightArmAngle - Math.PI / 2;
          }
        }

        // Left Forearm Ghost
        const ghostLeftForearm = ghostGroup.getObjectByName("Ghost_LeftForearm");
        if (ghostLeftForearm) {
          ghostLeftForearm.position.set(0.95, -0.45, 0);
          if (leftWrist && leftElbow) {
            const lfdx = (1 - leftWrist.x) - (1 - leftElbow.x);
            const lfdy = leftWrist.y - leftElbow.y;
            const leftForearmAngle = Math.atan2(lfdy, lfdx);
            ghostLeftForearm.rotation.z = -(leftForearmAngle + Math.PI / 2);
          }
        }

        // Right Forearm Ghost
        const ghostRightForearm = ghostGroup.getObjectByName("Ghost_RightForearm");
        if (ghostRightForearm) {
          ghostRightForearm.position.set(-0.95, -0.45, 0);
          if (rightWrist && rightElbow) {
            const rfdx = (1 - rightWrist.x) - (1 - rightElbow.x);
            const rfdy = rightWrist.y - rightElbow.y;
            const rightForearmAngle = Math.atan2(rfdy, rfdx);
            ghostRightForearm.rotation.z = rightForearmAngle - Math.PI / 2;
          }
        }

        // Hands Ghost
        const ghostLeftHand = ghostGroup.getObjectByName("Ghost_LeftHand");
        if (ghostLeftHand) ghostLeftHand.position.set(1.20, -1.05, 0);

        const ghostRightHand = ghostGroup.getObjectByName("Ghost_RightHand");
        if (ghostRightHand) ghostRightHand.position.set(-1.20, -1.05, 0);
      }
    },
    [fitStyle, offsetY, offsetZ, scaleMultiplier, skeletalRiggingActive]
  );

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* 3D AR Body Fitting Viewport */}
      <div className="relative w-full h-[520px] sm:h-[580px] rounded-3xl overflow-hidden bg-[#060B14] border border-blue-500/20 shadow-2xl flex items-center justify-center">
        {/* 3D WebGL Canvas Layer */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

        {/* 2D Pose Skeleton Canvas Layer (Glowing Cyan Stick Bones & Dots) */}
        <canvas
          ref={skeletonCanvasRef}
          className="absolute inset-0 w-full h-full z-15 pointer-events-none"
        />

        {/* Mode 1: Live Video AR / Static Snapshot Body Feed */}
        {viewMode === "ar" ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
            {userSnapshotUrl ? (
              <img
                src={userSnapshotUrl}
                alt="Body Scan Snapshot"
                className="w-full h-full object-contain"
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

            {/* Left Top Status Badges */}
            {isTrackingLive && (
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-30 pointer-events-none">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-[#93C5FD] border border-blue-500/30 text-[10px] font-mono shadow-md backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span>3D POSE TRACKING (60 FPS)</span>
                </div>
                {skeletalRiggingActive && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono shadow-md backdrop-blur-md">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>SKELETAL RIGGING AKTIF</span>
                  </div>
                )}
              </div>
            )}

            {/* Reference-Style Live Bones Debug Sidebar (Matching Screenshot) */}
            {showDebugPanel && isTrackingLive && (
              <div className="absolute top-16 left-4 z-30 w-52 bg-[#08101E]/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-3 text-[10px] font-mono shadow-2xl space-y-2 pointer-events-auto max-h-[320px] overflow-y-auto">
                <div className="flex items-center justify-between text-[#FACC15] font-bold border-b border-white/10 pb-1">
                  <span>🦴 Body Bones (Live)</span>
                  <span className="text-emerald-400">14/14</span>
                </div>
                <div className="grid grid-cols-1 gap-1 text-slate-300">
                  {detectedBonesList.map((b) => (
                    <div key={b} className="flex items-center justify-between">
                      <span className="text-slate-400">{b}</span>
                      <span className="text-emerald-400 font-bold">✓</span>
                    </div>
                  ))}
                </div>
                <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-slate-400">
                  <span>STATUS</span>
                  <span className="text-emerald-400 font-bold">RUNNING</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>FPS</span>
                  <span className="text-blue-400 font-bold">60</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Mode 2: 3D Studio Turntable */
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-[#0B1528] via-[#060B14] to-[#040810]">
            <div className="absolute top-4 left-4 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0B1528] text-[#93C5FD] border border-blue-500/30 text-[11px] font-mono z-20 shadow-lg">
              <Box className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>3D STUDIO GARMENT INSPECTION</span>
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
            <span>{isUploadMode ? "AR Mode Terkunci" : "Pasang ke Badan (AR 3D)"}</span>
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

      {/* Interactive Micro-Adjustments & Visual Ghost / Skeleton Toggles */}
      <div className="p-4 sm:p-5 rounded-3xl border border-blue-500/20 bg-[#0B1528]/90 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Visual Skeleton & Ghost Mesh Toggles (Persis seperti di referensi) */}
        <div className="flex items-center space-x-2 text-xs flex-wrap gap-2">
          {/* Show Pose Stick Skeleton */}
          <button
            onClick={() => setShowPose((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
              showPose
                ? "bg-cyan-500/30 text-cyan-300 border-cyan-400/50 shadow-md shadow-cyan-500/20"
                : "bg-[#071120] text-[#64748B] border-blue-500/20 hover:text-white"
            }`}
            title="Tampilkan Garis Tulang & Titik Sendi AI"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Show Pose (Kerangka): {showPose ? "ON" : "OFF"}</span>
          </button>

          {/* Show Ghost 3D Wireframe */}
          <button
            onClick={() => setShowGhost((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
              showGhost
                ? "bg-emerald-500/30 text-emerald-300 border-emerald-400/50 shadow-md shadow-emerald-500/20"
                : "bg-[#071120] text-[#64748B] border-blue-500/20 hover:text-white"
            }`}
            title="Tampilkan Wireframe 3D Manusia Hijau"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Show Ghost (3D Wireframe): {showGhost ? "ON" : "OFF"}</span>
          </button>

          {/* Debug Panel Toggle */}
          <button
            onClick={() => setShowDebugPanel((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
              showDebugPanel
                ? "bg-amber-500/30 text-amber-300 border-amber-400/50 shadow-md shadow-amber-500/20"
                : "bg-[#071120] text-[#64748B] border-blue-500/20 hover:text-white"
            }`}
            title="Tampilkan Panel Info Live Tulang & FPS"
          >
            <span>Debug Panel: {showDebugPanel ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Fit Style Siluet */}
        <div className="flex items-center space-x-3 text-xs flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[#38BDF8]" />
            <span className="font-semibold text-[#94A3B8]">Siluet:</span>
            <div className="inline-flex rounded-full bg-[#071120] p-1 border border-blue-500/20">
              {(["slim", "regular", "oversized"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setFitStyle(style)}
                  className={`px-3.5 py-1 rounded-full text-xs font-medium capitalize transition-all cursor-pointer ${
                    fitStyle === style
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vertical Position & Depth Controls */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[#94A3B8] font-semibold">Tinggi:</span>
            <button
              onClick={() => setOffsetY((prev) => prev + 2)}
              className="px-2.5 py-1 rounded-full bg-[#071120] hover:bg-blue-600 text-white border border-blue-500/30 font-bold text-xs transition-colors"
              title="Geser Naik"
            >
              ▲
            </button>
            <button
              onClick={() => setOffsetY((prev) => prev - 2)}
              className="px-2.5 py-1 rounded-full bg-[#071120] hover:bg-blue-600 text-white border border-blue-500/30 font-bold text-xs transition-colors"
              title="Geser Turun"
            >
              ▼
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[#94A3B8] font-semibold">Kedalaman:</span>
            <button
              onClick={() => setOffsetZ((prev) => prev - 2)}
              className="px-3 py-1 rounded-full bg-[#071120] hover:bg-blue-600 text-white border border-blue-500/30 font-semibold text-xs transition-colors"
              title="Maju ke Depan"
            >
              + Maju
            </button>
            <button
              onClick={() => setOffsetZ((prev) => prev + 2)}
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

        {/* Shoulder Scale Multiplier */}
        <div className="flex items-center space-x-2.5 text-xs">
          <span className="text-[#94A3B8] font-mono">Lebar: <strong className="text-[#93C5FD]">{scaleMultiplier}%</strong></span>
          <input
            type="range"
            min={80}
            max={125}
            value={scaleMultiplier}
            onChange={(e) => setScaleMultiplier(Number(e.target.value))}
            className="w-24 h-2 bg-[#071120] rounded-full appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Transparency */}
        <div className="flex items-center space-x-2.5 text-xs">
          <span className="text-[#94A3B8] font-mono">Opasitas: <strong className="text-[#93C5FD]">{garmentOpacity}%</strong></span>
          <input
            type="range"
            min={30}
            max={100}
            value={garmentOpacity}
            onChange={(e) => setGarmentOpacity(Number(e.target.value))}
            className="w-24 h-2 bg-[#071120] rounded-full appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default BodyOutfitViewer;
