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
  Sparkles,
} from "lucide-react";
import { RecommendationItem } from "../lib/mockData";
import {
  createProceduralGarment,
  animateProceduralGarment,
  ProceduralGarment,
} from "../lib/proceduralGarment";

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
  const proceduralGarmentRef = useRef<ProceduralGarment | null>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  const isUploadMode = inputMode === "upload" && !mediaStream;

  // Engine: 'procedural' (Pure Three.js Dynamic Mesh) vs 'glb' (3D File Model)
  const [engineType, setEngineType] = useState<"procedural" | "glb">("procedural");

  // View Mode: 'ar' (Live 3D Body Fitting) vs 'studio' (3D 360° Inspection)
  const [viewMode, setViewMode] = useState<"ar" | "studio">("ar");
  const [isRotating, setIsRotating] = useState(true);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [fitStyle, setFitStyle] = useState<"regular" | "oversized" | "slim">("regular");
  const [offsetY, setOffsetY] = useState<number>(0);
  const [offsetZ, setOffsetZ] = useState<number>(0);
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(100);
  const [garmentOpacity, setGarmentOpacity] = useState<number>(100);
  const [modelSource, setModelSource] = useState<string>("3D Procedural Three.js");

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

    // Load Categorized Garment (Procedural Three.js or GLB)
    loadCategorizedGarment(garmentGroup);

    let lastVideoTime = -1;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const video = videoRef.current;
      const landmarker = poseLandmarkerRef.current;
      const cw = containerRef.current?.clientWidth || 800;
      const ch = containerRef.current?.clientHeight || 600;
      const vw = video?.videoWidth || 1280;
      const vh = video?.videoHeight || 720;

      if (viewMode === "ar" && video && video.readyState >= 2 && landmarker) {
        if (occluderGroup) {
          occluderGroup.visible = true;
        }
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, performance.now());
            if (result && result.landmarks && result.landmarks.length > 0) {
              setIsTrackingLive(true);
              if (engineType === "procedural" && proceduralGarmentRef.current) {
                animateProceduralGarment(
                  proceduralGarmentRef.current,
                  result.landmarks[0],
                  cw,
                  ch,
                  vw,
                  vh,
                  offsetY,
                  offsetZ,
                  scaleMultiplier
                );
              } else {
                applyPoseLandmarksTo3D(result.landmarks[0], garmentGroup, occluderGroup);
              }
            } else {
              setIsTrackingLive(false);
              garmentGroup.position.lerp(new THREE.Vector3(0, -0.2, 0), 0.05);
              occluderGroup.position.lerp(new THREE.Vector3(0, -0.2, 0), 0.05);
            }
          } catch {
            // Frame skip
          }
        }
      } else if (viewMode === "studio") {
        setIsTrackingLive(false);
        if (occluderGroup) {
          occluderGroup.visible = false;
        }
        if (isRotating && garmentGroup) {
          garmentGroup.rotation.y += 0.015;
          garmentGroup.position.lerp(new THREE.Vector3(0, 0.15, 0), 0.08);
          garmentGroup.scale.lerp(new THREE.Vector3(1.35, 1.35, 1.35), 0.08);
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
      if (proceduralGarmentRef.current) {
        proceduralGarmentRef.current.dispose();
      }
      renderer.dispose();
    };
  }, [viewMode, isRotating, offsetY, offsetZ, scaleMultiplier, activeItem, subcategory, garmentOpacity, fitStyle, engineType]);

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
  /*  4. Load Categorized Garment (Procedural Dynamic vs Rigged GLB)    */
  /* ------------------------------------------------------------------ */
  const loadCategorizedGarment = async (group: THREE.Group) => {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (proceduralGarmentRef.current) {
      proceduralGarmentRef.current.dispose();
      proceduralGarmentRef.current = null;
    }

    if (engineType === "procedural") {
      const nameLower = (activeItem.name || "").toLowerCase();
      const garmentType =
        nameLower.includes("hoodie") || nameLower.includes("sweater")
          ? "hoodie"
          : nameLower.includes("polo")
          ? "polo"
          : nameLower.includes("vneck") || nameLower.includes("v-neck")
          ? "vneck"
          : nameLower.includes("long sleeve") || nameLower.includes("long-sleeve")
          ? "longsleeve"
          : "tshirt";

      const procedural = createProceduralGarment({
        type: garmentType,
        colorHex: activeColorHex,
        fitStyle: fitStyle,
      });

      proceduralGarmentRef.current = procedural;
      group.add(procedural.group);
      setModelSource(`3D Procedural Three.js (${garmentType.toUpperCase()})`);
      return;
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
  /*  5. Real-Time 3D Pose Landmark Anchoring & Skeletal Arm Kinematics */
  /* ------------------------------------------------------------------ */
  const applyPoseLandmarksTo3D = useCallback(
    (landmarks: any[], garmentGroup: THREE.Group, occluderGroup?: THREE.Group) => {
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

      // Screen Positions of Both Shoulders:
      // Left shoulder (frame x ~0.60) appears on SCREEN-LEFT (1 - 0.60 = 0.40)
      // Right shoulder (frame x ~0.40) appears on SCREEN-RIGHT (1 - 0.40 = 0.60)
      const screenLeftShoulderX = offsetX + (1 - leftShoulder.x) * renderedWidth;
      const screenLeftShoulderY = offsetYPixel + leftShoulder.y * renderedHeight;
      const screenRightShoulderX = offsetX + (1 - rightShoulder.x) * renderedWidth;
      const screenRightShoulderY = offsetYPixel + rightShoulder.y * renderedHeight;

      // Vector pointing from Screen-Left to Screen-Right across the shoulders
      const dx = screenRightShoulderX - screenLeftShoulderX; // Always positive
      const dy = screenRightShoulderY - screenLeftShoulderY;
      const pixelDist = Math.sqrt(dx * dx + dy * dy);

      // 1. Roll: Shoulder slope (0 = perfectly straight/level)
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

      // World Space Scale (Baju scales proportionally with real shoulder width in pixels)
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

        // Left Arm Vector (Shoulder 11 -> Elbow 13 -> Wrist 15)
        if (leftElbow) {
          const ldx = (1 - leftElbow.x) - (1 - leftShoulder.x);
          const ldy = leftElbow.y - leftShoulder.y;
          const leftArmAngle = Math.atan2(ldy, ldx); // Angle from horizontal
          const leftElevation = THREE.MathUtils.clamp(-(leftArmAngle + Math.PI / 2), -1.2, 1.2);

          if (rig.leftArmPivot) {
            rig.leftArmPivot.rotation.z = THREE.MathUtils.lerp(rig.leftArmPivot.rotation.z, leftElevation * 0.7, 0.35);
          }
          const leftBone = rig.bones["arm.l"] || rig.bones["upperarm.l"] || rig.bones["upper_arm.l"] || rig.bones["leftarm"];
          if (leftBone) {
            leftBone.rotation.z = THREE.MathUtils.lerp(leftBone.rotation.z, leftElevation, 0.35);
          }
        }

        // Right Arm Vector (Shoulder 12 -> Elbow 14 -> Wrist 16)
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

      // Synchronize Invisible Occluder Group (Neck & Torso Core)
      if (occluderGroup) {
        occluderGroup.position.x = garmentGroup.position.x;
        occluderGroup.position.y = garmentGroup.position.y;
        occluderGroup.position.z = garmentGroup.position.z - 0.05;

        occluderGroup.rotation.z = garmentGroup.rotation.z;
        occluderGroup.rotation.y = garmentGroup.rotation.y;
        occluderGroup.rotation.x = garmentGroup.rotation.x;

        occluderGroup.scale.lerp(new THREE.Vector3(finalScale * 0.95, finalScale * 0.95, finalScale * 0.95), 0.45);
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

            {isTrackingLive && (
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-30 pointer-events-none">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-[#93C5FD] border border-blue-500/30 text-[10px] font-mono shadow-md backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span>3D POSE TRACKING (60 FPS)</span>
                </div>
                {skeletalRiggingActive && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono shadow-md backdrop-blur-md">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>SKELETAL RIGGING &amp; ARM KINEMATICS AKTIF</span>
                  </div>
                )}
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

      {/* Interactive Micro-Adjustments & Fit Controls */}
      <div className="p-4 sm:p-5 rounded-3xl border border-blue-500/20 bg-[#0B1528]/90 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Fit Style & Skeletal Rigging Toggle */}
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

          {/* Procedural Three.js vs GLB Engine Switch */}
          <div className="inline-flex rounded-full bg-[#071120] p-1 border border-blue-500/20">
            <button
              onClick={() => setEngineType("procedural")}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                engineType === "procedural"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "text-[#94A3B8] hover:text-white"
              }`}
              title="Gunakan Baju 3D Procedural Three.js (Lentur Bergerak Mengikuti Tubuh)"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Procedural 3D</span>
            </button>
            <button
              onClick={() => setEngineType("glb")}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                engineType === "glb"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-[#94A3B8] hover:text-white"
              }`}
              title="Gunakan Model 3D GLB Statis"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Model GLB</span>
            </button>
          </div>

          {engineType === "glb" && (
            <button
              onClick={() => setSkeletalRiggingActive((prev) => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                skeletalRiggingActive
                  ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/40 shadow-sm"
                  : "bg-[#071120] text-[#64748B] border-blue-500/20 hover:text-white"
              }`}
              title="Aktifkan/Nonaktifkan Pelacakan Lengan & Tulang Gerak"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Skeletal Rig: {skeletalRiggingActive ? "ON" : "OFF"}</span>
            </button>
          )}
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
