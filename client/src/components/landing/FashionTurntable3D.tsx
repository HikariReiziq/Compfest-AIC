'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface FashionTurntable3DProps {
  modelPath: string;
  category: 'glasses' | 'hats' | 'shirts';
  accentColor?: string;
  autoRotateSpeed?: number;
  gender?: 'male' | 'female';
}

export default function FashionTurntable3D({
  modelPath,
  category,
  accentColor = '#FB7185',
  autoRotateSpeed = 0.012,
  gender = 'female',
}: FashionTurntable3DProps) {
  const isFemaleTheme =
    gender === 'female' ||
    accentColor.toLowerCase().includes('f4') ||
    accentColor.toLowerCase().includes('fb') ||
    accentColor.toLowerCase().includes('pink') ||
    accentColor.toLowerCase().includes('db');

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group>(new THREE.Group());
  const reqIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);
  const rotationVelocityRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 480;

    // 100% Clean Transparent Scene (No glowing blur, crisp solid aesthetics)
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera positioned with ample breathing space so nothing is clipped
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 0.75, 6.2);
    camera.lookAt(0, 0.0, 0);
    cameraRef.current = camera;

    // WebGL Renderer with Alpha & crisp PBR tone mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Crisp Clean Studio Lighting (Adaptive to Male Sky Blue vs Female Rose Pink)
    const ambient = new THREE.AmbientLight('#FFFFFF', 2.6);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(
      isFemaleTheme ? '#F472B6' : '#38BDF8',
      isFemaleTheme ? '#180816' : '#08101E',
      1.5
    );
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFFFFF', 3.4);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(
      isFemaleTheme ? '#FB7185' : '#60A5FA',
      1.8
    );
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    // ========================================================
    // PIJAKAN PIALA STATIK / SINGGASANA (TETAP DIAM)
    // ========================================================
    const podiumGroup = new THREE.Group();
    podiumGroup.position.set(0, -0.92, 0);

    // Tingkat 1: Base podium silinder bawah (Deep Obsidian Noir / Navy)
    const baseGeo = new THREE.CylinderGeometry(1.6, 1.75, 0.14, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: isFemaleTheme ? '#180816' : '#08101E',
      metalness: 0.85,
      roughness: 0.3,
    });
    const baseCyl = new THREE.Mesh(baseGeo, baseMat);
    baseCyl.position.y = 0.07;
    podiumGroup.add(baseCyl);

    // Tingkat 2: Cincin beveled singgasana (Pink Rose Metalik vs Blue Metalik)
    const PODIUM_RING_COLOR = isFemaleTheme ? '#DB2777' : '#2563EB';
    const PODIUM_RING_EMISSIVE = isFemaleTheme ? '#BE185D' : '#1D4ED8';
    const ringMat = new THREE.MeshStandardMaterial({
      color: PODIUM_RING_COLOR,
      metalness: 0.9,
      roughness: 0.15,
      emissive: PODIUM_RING_EMISSIVE,
      emissiveIntensity: 0.35,
    });
    const ringGeo = new THREE.CylinderGeometry(1.45, 1.55, 0.08, 48);
    const ringCyl = new THREE.Mesh(ringGeo, ringMat);
    ringCyl.position.y = 0.17;
    podiumGroup.add(ringCyl);

    // Tingkat 3: Piringan atas piala singgasana
    const topGeo = new THREE.CylinderGeometry(1.35, 1.4, 0.06, 48);
    const topMat = new THREE.MeshStandardMaterial({
      color: isFemaleTheme ? '#120511' : '#040812',
      metalness: 0.7,
      roughness: 0.4,
    });
    const topCyl = new THREE.Mesh(topGeo, topMat);
    topCyl.position.y = 0.24;
    podiumGroup.add(topCyl);

    // Garis aksen tepian piringan atas (Warna Emas Bintang Maskot)
    const accentLineGeo = new THREE.RingGeometry(1.32, 1.37, 64);
    const accentLineMat = new THREE.MeshBasicMaterial({
      color: '#FACC15',
      side: THREE.DoubleSide,
    });
    const accentLine = new THREE.Mesh(accentLineGeo, accentLineMat);
    accentLine.rotation.x = -Math.PI / 2;
    accentLine.position.y = 0.272;
    podiumGroup.add(accentLine);

    scene.add(podiumGroup);

    // ========================================================
    // MODEL PRODUK 3D (BERPUTAR 360° & TERPUSAT SEMPURNA)
    // ========================================================
    const modelGroup = new THREE.Group();
    modelGroup.position.set(0, 0.08, 0);
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Load and auto-normalize 3D GLB model
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        modelGroup.clear();
        const model = gltf.scene;

        // Clean out any embedded lights or cameras from the GLB
        const toRemove: THREE.Object3D[] = [];
        model.traverse((child) => {
          if ((child as any).isCamera || (child as any).isLight) {
            toRemove.push(child);
          }
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m) => {
                  m.side = THREE.DoubleSide;
                });
              } else {
                mesh.material.side = THREE.DoubleSide;
              }
            }
          }
        });
        toRemove.forEach((obj) => obj.parent?.remove(obj));

        // 1. Reset transforms
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        model.updateMatrixWorld(true);

        // 2. Measure raw bounds
        let box = new THREE.Box3().setFromObject(model);
        let size = box.getSize(new THREE.Vector3());
        let maxDim = Math.max(size.x, size.y, size.z) || 1;

        // 3. Apply uniform normalized scale so every single item has identical standard volume
        const targetDim = 1.45; // Uniform standard size across all 8 items
        const scale = targetDim / maxDim;
        model.scale.set(scale, scale, scale);
        model.updateMatrixWorld(true);

        // 4. Re-measure scaled bounds and center precisely on all 3 axes (X, Y, Z)
        box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());

        // Shift model so its exact center of mass sits at (0, 0, 0)
        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        modelGroup.add(model);
      },
      undefined,
      (err) => {
        console.error('Failed to load 3D GLB model:', err);
      }
    );

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop: HANYA MODEL PRODUK YANG BERPUTAR, PODIUM TETAP DIAM
    let clock = new THREE.Clock();
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      // Model berputar 360°
      if (!isDraggingRef.current) {
        modelGroup.rotation.y += autoRotateSpeed + rotationVelocityRef.current;
        rotationVelocityRef.current *= 0.95;
      }

      // Pernapasan mengambang lembut
      const t = clock.getElapsedTime();
      modelGroup.position.y = 0.08 + Math.sin(t * 1.8) * 0.025;

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    reqIdRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.innerHTML = '';
        rendererRef.current.dispose();
      }
    };
  }, [modelPath, category, accentColor, autoRotateSpeed]);

  // Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    prevMouseXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMouseXRef.current;
    prevMouseXRef.current = e.clientX;
    if (modelGroupRef.current) {
      modelGroupRef.current.rotation.y += deltaX * 0.012;
      rotationVelocityRef.current = deltaX * 0.008;
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none relative"
      style={{ touchAction: 'none' }}
    />
  );
}
