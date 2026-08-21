"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Sparkles, Camera, RefreshCw, Eye, Move3d } from "lucide-react";
import { RecommendationItem } from "../lib/mockData";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface ARCanvasViewerProps {
  activeItem: RecommendationItem;
  subcategory: string;
  mediaStream?: MediaStream | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const ARCanvasViewer: React.FC<ARCanvasViewerProps> = ({
  activeItem,
  subcategory,
  mediaStream,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isTrackingFace, setIsTrackingFace] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"ar" | "studio">("ar");

  // Smoothed tracking transforms
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentRot = useRef(new THREE.Euler(0, 0, 0));
  const currentScale = useRef(1);

  /* ------------------------------------------------------------------ */
  /*  1. Initialize / Manage Camera Stream                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      try {
        setCameraError(null);
        let stream = mediaStream;

        // If mediaStream is not provided or its tracks are ended, request new stream
        const isStreamActive = stream && stream.active && stream.getVideoTracks().some(t => t.readyState === "live");
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
            localStreamRef.current.getTracks().forEach(t => t.stop());
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
          setCameraError("Kamera tidak dapat diakses. Menampilkan mode 3D Studio.");
          setViewMode("studio");
        }
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [mediaStream]);

  /* ------------------------------------------------------------------ */
  /*  2. Initialize MediaPipe FaceLandmarker for Live AR Tracking       */
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
  /*  3. Setup Three.js Scene and Render Loop                           */
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

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x6366f1, 1.5);
    rimLight.position.set(-3, -1, 2);
    scene.add(rimLight);

    const warmLight = new THREE.PointLight(0xffaa44, 1.2, 10);
    warmLight.position.set(0, 1.5, 2);
    scene.add(warmLight);

    const modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;
    scene.add(modelGroup);

    let lastVideoTime = -1;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const video = videoRef.current;
      const landmarker = faceLandmarkerRef.current;

      if (viewMode === "ar" && video && video.readyState >= 2 && landmarker) {
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, performance.now());
            if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
              setIsTrackingFace(true);
              applyLandmarksToModel(result.faceLandmarks[0], modelGroup);
            } else {
              setIsTrackingFace(false);
              // Gently center model when face is temporarily out of view
              modelGroup.position.lerp(new THREE.Vector3(0, 0.2, 0), 0.05);
              modelGroup.rotation.x = THREE.MathUtils.lerp(modelGroup.rotation.x, 0, 0.05);
              modelGroup.rotation.y = THREE.MathUtils.lerp(modelGroup.rotation.y, 0, 0.05);
              modelGroup.rotation.z = THREE.MathUtils.lerp(modelGroup.rotation.z, 0, 0.05);
            }
          } catch {
            // Frame processing skip
          }
        }
      } else {
        // 3D Studio Showcase mode with slow elegant turntable rotation
        setIsTrackingFace(false);
        if (modelGroup) {
          modelGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.08);
          modelGroup.rotation.y += 0.008;
          modelGroup.rotation.x = THREE.MathUtils.lerp(modelGroup.rotation.x, 0.1, 0.08);
          modelGroup.rotation.z = THREE.MathUtils.lerp(modelGroup.rotation.z, 0, 0.08);
          modelGroup.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.08);
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
  }, [viewMode]);

  /* ------------------------------------------------------------------ */
  /*  4. Precision Landmark Tracking & 3D Anchoring                      */
  /* ------------------------------------------------------------------ */
  const applyLandmarksToModel = useCallback(
    (landmarks: any[], group: THREE.Group) => {
      const sub = (activeItem.subcategory || subcategory).toLowerCase();

      // Key face landmark points:
      const noseBridge = landmarks[6] || landmarks[168];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const foreheadTop = landmarks[10];
      const chin = landmarks[152];
      const leftTemple = landmarks[234];
      const rightTemple = landmarks[454];

      if (!noseBridge || !leftEye || !rightEye || !foreheadTop) return;

      // Note: Video is mirrored with -scale-x-100 (selfie mode)
      // When user moves head right (their right), landmark.x decreases
      // So in 3D scene: posX = (0.5 - noseBridge.x) * factor
      const aspect = 1.33; // ~4:3 aspect ratio adjustment
      const posX = (0.5 - noseBridge.x) * 5.2 * aspect;
      const posY = (0.5 - noseBridge.y) * 4.4;
      const posZ = (noseBridge.z || 0) * -4.0;

      // Calculate 3D rotations
      // 1. Roll: tilt angle between eye corners
      const eyeDX = rightEye.x - leftEye.x;
      const eyeDY = rightEye.y - leftEye.y;
      const roll = Math.atan2(eyeDY, eyeDX);

      // 2. Yaw: left/right head turn
      const faceCenter = (leftTemple.x + rightTemple.x) / 2;
      const yaw = (faceCenter - noseBridge.x) * 4.2;

      // 3. Pitch: up/down head nod
      const foreheadChinDY = (chin.y - foreheadTop.y);
      const noseForeheadRatio = (noseBridge.y - foreheadTop.y) / (foreheadChinDY || 0.4);
      const pitch = (noseForeheadRatio - 0.42) * 2.8;

      // 4. Scale: distance between temples / eyes
      const templeDist = Math.hypot(rightTemple.x - leftTemple.x, rightTemple.y - leftTemple.y);
      const targetScale = Math.max(0.65, Math.min(1.75, templeDist * 3.4));

      // Apply Exponential Smoothing (Lerp) for zero jitter
      const lerpFactor = 0.42;

      if (sub === "glasses") {
        // Anchor glasses directly onto nose bridge & eye line
        const targetX = posX;
        const targetY = posY + 0.05;
        const targetZ = posZ + 0.15;

        currentPos.current.lerp(new THREE.Vector3(targetX, targetY, targetZ), lerpFactor);
        currentRot.current.x = THREE.MathUtils.lerp(currentRot.current.x, pitch, lerpFactor);
        currentRot.current.y = THREE.MathUtils.lerp(currentRot.current.y, yaw, lerpFactor);
        currentRot.current.z = THREE.MathUtils.lerp(currentRot.current.z, roll, lerpFactor);
        currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale * 0.95, lerpFactor);

        group.position.copy(currentPos.current);
        group.rotation.set(currentRot.current.x, currentRot.current.y, currentRot.current.z);
        group.scale.setScalar(currentScale.current);
      } else {
        // Hats: Anchor above forehead top
        const hatOffsetY = (0.5 - foreheadTop.y) * 4.4 + 0.38;
        // Adjust depth & forward tilt along head normal
        const hatZ = posZ - 0.05 + (pitch * 0.2);

        currentPos.current.lerp(new THREE.Vector3(posX, hatOffsetY, hatZ), lerpFactor);
        currentRot.current.x = THREE.MathUtils.lerp(currentRot.current.x, pitch * 0.85, lerpFactor);
        currentRot.current.y = THREE.MathUtils.lerp(currentRot.current.y, yaw, lerpFactor);
        currentRot.current.z = THREE.MathUtils.lerp(currentRot.current.z, roll * 0.8, lerpFactor);
        currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale * 1.12, lerpFactor);

        group.position.copy(currentPos.current);
        group.rotation.set(currentRot.current.x, currentRot.current.y, currentRot.current.z);
        group.scale.setScalar(currentScale.current);
      }
    },
    [activeItem, subcategory]
  );

  /* ------------------------------------------------------------------ */
  /*  5. Build Rich, Distinct Procedural 3D Models                      */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!modelGroupRef.current) return;
    const group = modelGroupRef.current;

    // Dispose previous geometry & materials
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    const hexColor = parseInt((activeItem.hex_colour || "#36454F").replace("#", "0x"), 16);

    const primaryMaterial = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.35,
      metalness: 0.45,
    });

    const darkAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.5,
      metalness: 0.8,
    });

    const goldAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.9,
    });

    const lensMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transmission: 0.65,
      opacity: 0.85,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
      metalness: 0.1,
    });

    const sub = (activeItem.subcategory || subcategory).toLowerCase();
    const modelType = (activeItem.model_type || "").toLowerCase();
    const nameLower = activeItem.name.toLowerCase();

    /* ================================================================ */
    /*  HATS PROCEDURAL 3D GENERATOR                                    */
    /* ================================================================ */
    if (sub === "hats") {
      if (modelType === "cap" || nameLower.includes("baseball") || nameLower.includes("cap") || nameLower.includes("snapback")) {
        // --- 1. BASEBALL CAP / SNAPBACK ---
        // Crown Dome
        const domeGeom = new THREE.SphereGeometry(0.82, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
        const dome = new THREE.Mesh(domeGeom, primaryMaterial);
        dome.position.set(0, 0.05, 0);

        // Curved Front Visor / Brim
        const visorGeom = new THREE.CylinderGeometry(0.85, 0.85, 0.04, 32, 1, false, Math.PI * 0.2, Math.PI * 0.6);
        const visor = new THREE.Mesh(visorGeom, primaryMaterial);
        visor.rotation.x = -Math.PI / 8;
        visor.position.set(0, -0.05, 0.42);
        visor.scale.set(1.15, 1, 1.35);

        // Top Button Rivet
        const buttonGeom = new THREE.SphereGeometry(0.06, 16, 16);
        const button = new THREE.Mesh(buttonGeom, darkAccentMaterial);
        button.position.set(0, 0.86, 0);

        // Front Panel Embroidered Patch
        const patchGeom = new THREE.BoxGeometry(0.35, 0.22, 0.04);
        const patch = new THREE.Mesh(patchGeom, darkAccentMaterial);
        patch.position.set(0, 0.42, 0.76);
        patch.rotation.x = -Math.PI / 12;

        group.add(dome, visor, button, patch);

      } else if (modelType === "bucket" || nameLower.includes("bucket")) {
        // --- 2. BUCKET HAT ---
        // Tapered Crown
        const crownGeom = new THREE.CylinderGeometry(0.72, 0.80, 0.65, 32);
        const crown = new THREE.Mesh(crownGeom, primaryMaterial);
        crown.position.set(0, 0.35, 0);

        // Flat Top Cap
        const topGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.02, 32);
        const topCap = new THREE.Mesh(topGeom, primaryMaterial);
        topCap.position.set(0, 0.67, 0);

        // Downward Flared Brim
        const brimGeom = new THREE.CylinderGeometry(0.82, 1.32, 0.32, 32);
        const brim = new THREE.Mesh(brimGeom, primaryMaterial);
        brim.position.set(0, -0.08, 0);

        // Middle Ribbon Stitch
        const bandGeom = new THREE.CylinderGeometry(0.81, 0.81, 0.08, 32);
        const band = new THREE.Mesh(bandGeom, darkAccentMaterial);
        band.position.set(0, 0.06, 0);

        group.add(crown, topCap, brim, band);

      } else if (modelType === "beanie" || nameLower.includes("beanie")) {
        // --- 3. RIBBED KNIT BEANIE ---
        // Snug Knitted Dome
        const domeGeom = new THREE.SphereGeometry(0.80, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58);
        const dome = new THREE.Mesh(domeGeom, primaryMaterial);
        dome.position.set(0, 0.12, 0);

        // Thick Rolled Cuff around bottom rim
        const cuffGeom = new THREE.TorusGeometry(0.76, 0.12, 16, 32);
        const cuff = new THREE.Mesh(cuffGeom, primaryMaterial);
        cuff.rotation.x = Math.PI / 2;
        cuff.position.set(0, 0.04, 0);

        // Brand Woven Tag
        const tagGeom = new THREE.BoxGeometry(0.18, 0.14, 0.05);
        const tag = new THREE.Mesh(tagGeom, darkAccentMaterial);
        tag.position.set(0, 0.05, 0.86);

        group.add(dome, cuff, tag);

      } else if (modelType === "beret" || nameLower.includes("beret")) {
        // --- 4. ARTISAN FRENCH BERET ---
        // Puffy Tilted Disc
        const beretGeom = new THREE.CylinderGeometry(1.18, 0.82, 0.32, 32);
        const beret = new THREE.Mesh(beretGeom, primaryMaterial);
        beret.position.set(0.12, 0.28, 0);
        beret.rotation.z = -Math.PI / 14;

        // Apex Stem
        const stemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8);
        const stem = new THREE.Mesh(stemGeom, primaryMaterial);
        stem.position.set(0.14, 0.50, 0);

        group.add(beret, stem);

      } else if (modelType === "newsboy" || nameLower.includes("newsboy") || nameLower.includes("flat")) {
        // --- 5. NEWSBOY / FLAT CAP ---
        // Forward Leaning Crown
        const capGeom = new THREE.CylinderGeometry(0.95, 0.75, 0.40, 32);
        const cap = new THREE.Mesh(capGeom, primaryMaterial);
        cap.position.set(0, 0.22, 0.12);
        cap.rotation.x = Math.PI / 16;

        // Front Visor Peak
        const visorGeom = new THREE.CylinderGeometry(0.78, 0.78, 0.03, 32, 1, false, Math.PI * 0.25, Math.PI * 0.5);
        const visor = new THREE.Mesh(visorGeom, darkAccentMaterial);
        visor.position.set(0, 0.02, 0.55);
        visor.rotation.x = -Math.PI / 10;

        group.add(cap, visor);

      } else {
        // --- 6. CLASSIC FEDORA / PANAMA HAT ---
        // Pinched Crown
        const crownGeom = new THREE.CylinderGeometry(0.68, 0.82, 0.85, 32);
        const crown = new THREE.Mesh(crownGeom, primaryMaterial);
        crown.position.set(0, 0.42, 0);
        crown.scale.set(0.92, 1, 1.08); // Oval pinch

        // Wide Brim
        const brimGeom = new THREE.CylinderGeometry(1.38, 1.38, 0.04, 32);
        const brim = new THREE.Mesh(brimGeom, primaryMaterial);
        brim.position.set(0, 0.02, 0);

        // Ribbon Band
        const bandGeom = new THREE.CylinderGeometry(0.83, 0.83, 0.14, 32);
        const band = new THREE.Mesh(bandGeom, darkAccentMaterial);
        band.position.set(0, 0.12, 0);

        group.add(crown, brim, band);
      }
    }

    /* ================================================================ */
    /*  GLASSES PROCEDURAL 3D GENERATOR                                 */
    /* ================================================================ */
    if (sub === "glasses") {
      if (modelType === "aviator" || nameLower.includes("aviator")) {
        // --- 1. AVIATOR DOUBLE-BRIDGE GLASSES ---
        // Teardrop Wire Frames
        const leftFrame = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.03, 16, 32), goldAccentMaterial);
        leftFrame.position.set(-0.62, 0, 0);
        leftFrame.scale.set(1.05, 1.25, 1);

        const rightFrame = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.03, 16, 32), goldAccentMaterial);
        rightFrame.position.set(0.62, 0, 0);
        rightFrame.scale.set(1.05, 1.25, 1);

        // Double Brow Bridge (Top Bar + Nose Bar)
        const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.15, 16), goldAccentMaterial);
        topBar.rotation.z = Math.PI / 2;
        topBar.position.set(0, 0.38, 0.02);

        const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 16), goldAccentMaterial);
        bridge.rotation.z = Math.PI / 2;
        bridge.position.set(0, 0.12, 0);

        // Lenses
        const leftLens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.015, 32), lensMaterial);
        leftLens.rotation.x = Math.PI / 2;
        leftLens.position.set(-0.62, 0, 0);
        leftLens.scale.set(1.05, 1, 1.25);

        const rightLens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.015, 32), lensMaterial);
        rightLens.rotation.x = Math.PI / 2;
        rightLens.position.set(0.62, 0, 0);
        rightLens.scale.set(1.05, 1, 1.25);

        // Temples
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 1.5), goldAccentMaterial);
        leftArm.position.set(-1.18, 0.15, -0.75);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 1.5), goldAccentMaterial);
        rightArm.position.set(1.18, 0.15, -0.75);

        group.add(leftFrame, rightFrame, topBar, bridge, leftLens, rightLens, leftArm, rightArm);

      } else if (modelType === "round" || nameLower.includes("round") || nameLower.includes("circular")) {
        // --- 2. VINTAGE ROUND GLASSES ---
        const leftRim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 16, 32), goldAccentMaterial);
        leftRim.position.set(-0.60, 0, 0);

        const rightRim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 16, 32), goldAccentMaterial);
        rightRim.position.set(0.60, 0, 0);

        const archedBridge = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 16, 16, Math.PI), goldAccentMaterial);
        archedBridge.position.set(0, 0.14, 0);

        const leftLens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.015, 32), lensMaterial);
        leftLens.rotation.x = Math.PI / 2;
        leftLens.position.set(-0.60, 0, 0);

        const rightLens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.015, 32), lensMaterial);
        rightLens.rotation.x = Math.PI / 2;
        rightLens.position.set(0.60, 0, 0);

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.4), goldAccentMaterial);
        leftArm.position.set(-1.10, 0.05, -0.70);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.4), goldAccentMaterial);
        rightArm.position.set(1.10, 0.05, -0.70);

        group.add(leftRim, rightRim, archedBridge, leftLens, rightLens, leftArm, rightArm);

      } else if (modelType === "cateye" || nameLower.includes("cateye") || nameLower.includes("cat-eye")) {
        // --- 3. WINGED CAT-EYE GLASSES ---
        const leftRim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 16, 32), primaryMaterial);
        leftRim.position.set(-0.62, 0, 0);
        leftRim.rotation.z = Math.PI / 10;

        const rightRim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 16, 32), primaryMaterial);
        rightRim.position.set(0.62, 0, 0);
        rightRim.rotation.z = -Math.PI / 10;

        // Winged Corner Tips
        const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.06), primaryMaterial);
        leftWing.position.set(-1.08, 0.28, 0);
        leftWing.rotation.z = Math.PI / 4;

        const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.06), primaryMaterial);
        rightWing.position.set(1.08, 0.28, 0);
        rightWing.rotation.z = -Math.PI / 4;

        const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 16), primaryMaterial);
        bridge.rotation.z = Math.PI / 2;
        bridge.position.set(0, 0.10, 0);

        const leftLens = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.015, 32), lensMaterial);
        leftLens.rotation.x = Math.PI / 2;
        leftLens.position.set(-0.62, 0, 0);

        const rightLens = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.015, 32), lensMaterial);
        rightLens.rotation.x = Math.PI / 2;
        rightLens.position.set(0.62, 0, 0);

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 1.4), primaryMaterial);
        leftArm.position.set(-1.18, 0.20, -0.70);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 1.4), primaryMaterial);
        rightArm.position.set(1.18, 0.20, -0.70);

        group.add(leftRim, rightRim, leftWing, rightWing, bridge, leftLens, rightLens, leftArm, rightArm);

      } else {
        // --- 4. CLASSIC WAYFARER / RECTANGULAR GLASSES ---
        const leftRim = new THREE.Mesh(new THREE.TorusGeometry(0.50, 0.065, 16, 32), primaryMaterial);
        leftRim.position.set(-0.65, 0, 0);
        leftRim.scale.set(1.15, 0.92, 1);

        const rightRim = new THREE.Mesh(new THREE.TorusGeometry(0.50, 0.065, 16, 32), primaryMaterial);
        rightRim.position.set(0.65, 0, 0);
        rightRim.scale.set(1.15, 0.92, 1);

        const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 16), primaryMaterial);
        bridge.rotation.z = Math.PI / 2;
        bridge.position.set(0, 0.12, 0);

        // Gold Diamond Stud Rivets
        const leftStud = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), goldAccentMaterial);
        leftStud.position.set(-1.16, 0.22, 0.04);
        leftStud.rotation.z = Math.PI / 4;

        const rightStud = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), goldAccentMaterial);
        rightStud.position.set(1.16, 0.22, 0.04);
        rightStud.rotation.z = Math.PI / 4;

        const leftLens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.02, 32), lensMaterial);
        leftLens.rotation.x = Math.PI / 2;
        leftLens.position.set(-0.65, 0, 0);
        leftLens.scale.set(1.15, 1, 0.92);

        const rightLens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.02, 32), lensMaterial);
        rightLens.rotation.x = Math.PI / 2;
        rightLens.position.set(0.65, 0, 0);
        rightLens.scale.set(1.15, 1, 0.92);

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 1.45), primaryMaterial);
        leftArm.position.set(-1.18, 0.08, -0.72);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 1.45), primaryMaterial);
        rightArm.position.set(1.18, 0.08, -0.72);

        group.add(leftRim, rightRim, bridge, leftStud, rightStud, leftLens, rightLens, leftArm, rightArm);
      }
    }
  }, [activeItem, subcategory]);

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
      {/* Background Live Webcam Feed */}
      {viewMode === "ar" && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover -scale-x-100 rounded-2xl z-0"
          autoPlay
          playsInline
          muted
        />
      )}

      {/* 3D WebGL Canvas Layer Overlay */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

      {/* Top Floating Status Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-xs font-mono">
          {viewMode === "ar" ? (
            isTrackingFace ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-semibold">AR Live Tracking Aktif</span>
              </>
            ) : cameraReady ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-amber-300">Posisikan Kepala di Depan Kamera</span>
              </>
            ) : cameraError ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400"></span>
                <span className="text-rose-300">{cameraError}</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                <span className="text-slate-300">Menghubungkan Kamera AR...</span>
              </>
            )
          ) : (
            <>
              <Move3d className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-indigo-300">Mode 3D Studio 360° Inspection</span>
            </>
          )}
        </div>

        {/* View Mode Toggle: AR vs 3D Studio */}
        <div className="flex items-center bg-slate-900/85 backdrop-blur-md p-0.5 rounded-xl border border-white/10 shadow-lg text-xs">
          <button
            onClick={() => setViewMode("ar")}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 transition-all ${
              viewMode === "ar"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="w-3 h-3" />
            <span>AR Live</span>
          </button>
          <button
            onClick={() => setViewMode("studio")}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 transition-all ${
              viewMode === "studio"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>3D Studio</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating Hint Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-between items-center pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-slate-300 flex items-center space-x-1.5 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {viewMode === "ar"
              ? "Gerakkan kepala Anda (geleng, angguk, miring) untuk menguji presisi penempatan AR."
              : "Menampilkan preview 3D interaktif 360° dari sudut pandang studio."}
          </span>
        </div>

        <div className="hidden sm:flex items-center space-x-1 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-[11px] text-slate-400">
          <span className="font-mono">{activeItem.name}</span>
        </div>
      </div>
    </div>
  );
};
