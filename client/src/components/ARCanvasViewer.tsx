"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Cari bidang brim topi: ketinggian Y dengan penampang mendatar TERLEBAR.
 *
 * Inilah lubang tempat kepala masuk, dan satu-satunya titik jangkar yang masuk
 * akal untuk topi. Versi sebelumnya menjangkarkan dasar bounding box, yang
 * untuk topi bertepi lebar berarti ujung tepi yang menjuntai — sehingga
 * seluruh badan topi melayang di atas dahi.
 *
 * Diukur dari mesh, bukan dari angka manual, karena letak brim sangat berbeda
 * antar model: audit katalog memberi rentang 0,013 (cowboy hat) sampai 0,636
 * (propeller hat) satuan ternormalisasi dari dasar. Konstanta tunggal apa pun
 * pasti salah untuk sebagian besar aset.
 */
function findBrimPlaneY(object: THREE.Object3D): number | null {
  const box = new THREE.Box3().setFromObject(object);
  const lo = box.min.y;
  const span = box.max.y - lo;
  if (!(span > 0)) return null;

  const SLICES = 24;
  const minX = new Float64Array(SLICES).fill(Infinity);
  const maxX = new Float64Array(SLICES).fill(-Infinity);
  const minZ = new Float64Array(SLICES).fill(Infinity);
  const maxZ = new Float64Array(SLICES).fill(-Infinity);
  const counts = new Uint32Array(SLICES);
  const v = new THREE.Vector3();

  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const pos = mesh.geometry.getAttribute("position");
    if (!pos) return;
    // Sampling jarang sudah cukup: yang dicari letak brim, bukan bentuk presisi.
    const step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      let k = Math.floor(((v.y - lo) / span) * SLICES);
      if (k < 0) k = 0;
      else if (k >= SLICES) k = SLICES - 1;
      if (v.x < minX[k]) minX[k] = v.x;
      if (v.x > maxX[k]) maxX[k] = v.x;
      if (v.z < minZ[k]) minZ[k] = v.z;
      if (v.z > maxZ[k]) maxZ[k] = v.z;
      counts[k]++;
    }
  });

  let bestWidth = -1;
  let bestSlice = -1;
  for (let k = 0; k < SLICES; k++) {
    if (counts[k] < 20) continue; // irisan terlalu jarang, statistiknya tidak dipercaya
    const w = Math.max(maxX[k] - minX[k], maxZ[k] - minZ[k]);
    if (w > bestWidth) {
      bestWidth = w;
      bestSlice = k;
    }
  }
  if (bestSlice < 0) return null;
  return lo + (span * (bestSlice + 0.5)) / SLICES;
}

/** Lebar topi setelah normalisasi, kira-kira selebar kepala di ruang scene. */
const HAT_TARGET_WIDTH = 1.35;

/**
 * Seberapa jauh bidang brim duduk di bawah landmark dahi (10), sebagai pecahan
 * lebar kepala.
 *
 * Kini nilainya kecil dan bermakna sempit: landmark 10 ada di batas dahi,
 * sedangkan brim topi biasanya bertumpu sedikit di bawahnya. Sebelumnya angka
 * ini besar (0,35) karena harus menebus jangkar yang salah — dasar bounding
 * box, bukan bidang brim. Setelah jangkarnya benar, koreksi yang tersisa jauh
 * lebih kecil dan tidak lagi berbeda-beda per model.
 */
const HAT_BRIM_BELOW_BROW = 0.08;
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
              modelGroup.visible = true;
              applyLandmarksTo3DModel(result.faceLandmarks[0], modelGroup, occluderGroup);
            } else {
              // Wajah hilang dari deteksi (keluar frame, terpotong tepi atas,
              // cahaya kurang). Dulu model malah dihanyutkan ke tengah layar,
              // sehingga tampak menempel diam menutupi wajah — persis yang
              // dilaporkan sebagai "kaku, tidak mengikuti pergerakan".
              // Menyembunyikannya jauh lebih jujur: yang hilang pelacakannya,
              // bukan modelnya yang salah tempat.
              setIsTrackingFace(false);
              // Wajah hilang dari deteksi: sembunyikan model secara jujur
              // (dari fix-kacamata) daripada menghanyutkannya ke tengah layar.
              modelGroup.visible = false;
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
          // Mode studio tidak bergantung pelacakan wajah; pastikan model
          // kembali terlihat setelah sesi AR yang kehilangan wajah.
          modelGroup.visible = true;
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

          // 1. Orientasi model dari manifest — hasil audit geometri, bukan tebakan.
          //
          // Heuristik bounding box sudah terbukti salah arah untuk kacamata;
          // audit vertex per model (scripts/audit_glb_orientation.py)
          // memverifikasi orientasi tiap model. Entri manifest dipakai apa
          // adanya — nol berarti "terverifikasi benar", bukan "tidak tahu".
          const manifestRotation = modelConfig?.rotation_correction as
            | [number, number, number]
            | undefined;
          if (manifestRotation) {
            const [rx, ry, rz] = manifestRotation;
            model.rotation.set(rx, ry, rz);
          } else if (modelConfig == null) {
            console.info(`GLB tanpa kalibrasi manifest, orientasi asli dipakai: ${filename}`);
          }

          // 2. Wrap in wrapper group to ensure clean normalized transforms
          const wrapper = new THREE.Group();
          wrapper.add(model);

          const boxAfter = new THREE.Box3().setFromObject(wrapper);
          const center = boxAfter.getCenter(new THREE.Vector3());
          const sizeAfter = boxAfter.getSize(new THREE.Vector3());

          // Center X and Y, but align Z/Y anchor so glasses temples extend
          // backward into -Z (ears) and hats rest on the forehead.
          //
          // Nilai-nilai di bawah berada dalam SATUAN MENTAH model, karena
          // boxAfter diukur saat wrapper masih berskala 1. Karena itu
          // normalisasi di bawah WAJIB dipasang pada wrapper, bukan model.
          if (!isHat) {
            model.position.x -= center.x;
            model.position.y -= center.y;
            // Align front frame to Z = 0 so temples point backwards into -Z.
            model.position.z -= boxAfter.max.z;
          } else {
            model.position.x -= center.x;
            model.position.z -= center.z;
            // Jangkar topi = bidang brim (lubang kepala), diukur dari mesh.
            const brimY = findBrimPlaneY(wrapper);
            model.position.y -= brimY ?? boxAfter.min.y;
          }

          // Normalize model width (sizeAfter.x) to ~1.45 standard units.
          //
          // Skala dipasang di wrapper, bukan di model: `position` sebuah objek
          // hidup di ruang koordinat induknya dan TIDAK ikut terskalakan oleh
          // `scale` objek itu sendiri. Katalog berisi GLB dengan satuan author
          // yang berbeda-beda, jadi dipasang di wrapper agar model.position
          // ikut terskalakan bersama geometri.
          const targetWidth = sizeAfter.x > 0 ? sizeAfter.x : 1.0;
          const baseNormScale = (isHat ? HAT_TARGET_WIDTH : 1.45) / targetWidth;
          const customScaleFactor = modelConfig?.scale_factor || 1.0;
          const normalizeScale = baseNormScale * customScaleFactor;
          wrapper.scale.setScalar(normalizeScale);

          // Apply manifest pivot offset (normalized space) to fine-tune anchor.
          const pivot = modelConfig?.pivot_offset ?? [0, 0, 0];

          // Topi: turunkan agar mahkotanya menelan kepala — jangkar topi adalah
          // landmark dahi (10), dinyatakan relatif terhadap lebar kepala agar
          // topi jangkung tidak ikut terbenam lebih dalam.
          const hatSink = isHat ? HAT_BRIM_BELOW_BROW * HAT_TARGET_WIDTH : 0;

          wrapper.position.set(pivot[0], pivot[1] - hatSink, pivot[2]);

          // 3. Ultra-Realistic Optical Materials (clean matte, preserve GLTF textures)
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
    // Penempatan vertikal topi ditangani di ruang ternormalisasi (hatSink di
    // loadCategorized3DModel) yang ikut terskalakan bersama kepala — bukan
    // konstanta dunia yang hanya pas pada satu jarak kamera.
    const worldY = ndcY * halfH + (isHat ? 0 : -0.01) + offsetY * 0.012;
    const worldZ = (nasion.z || 0) * -1.8;

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

            {isTrackingFace ? (
              <div className="absolute top-4 left-4 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0B1528] text-[#93C5FD] border border-blue-500/30 text-[11px] font-mono z-20 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>6-DoF FACE &amp; HEAD TRACKING (60 FPS)</span>
              </div>
            ) : (
              <div className="absolute top-4 left-4 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono z-30">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>WAJAH TIDAK TERDETEKSI — MUNDUR SEDIKIT & MASUKKAN SELURUH KEPALA</span>
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
