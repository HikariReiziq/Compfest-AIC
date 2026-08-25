'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FASHION_ASET, FashionAset } from './fashionAset';

interface RandomTurntable3DProps {
  autoRotateSpeed?: number;
  onModelLoaded?: (modelName: string) => void;
  gender?: 'male' | 'female';
}

export default function RandomTurntable3D({
  autoRotateSpeed = 0.018,
  onModelLoaded,
  gender = 'female',
}: RandomTurntable3DProps) {
  const isFemaleTheme = gender === 'female';
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group>(new THREE.Group());
  const reqIdRef = useRef<number | null>(null);

  const [randomAsset, setRandomAsset] = useState<FashionAset>(() => {
    const randomIndex = Math.floor(Math.random() * FASHION_ASET.length);
    return FASHION_ASET[randomIndex] || FASHION_ASET[0];
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 100% Transparent Alpha Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 6.0);
    camera.lookAt(0, 0.0, 0);
    cameraRef.current = camera;

    // Renderer
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

    // Studio Lighting
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
    // PIJAKAN PIALA STATIK
    // ========================================================
    const podiumGroup = new THREE.Group();
    podiumGroup.position.set(0, -0.88, 0);

    const baseGeo = new THREE.CylinderGeometry(1.5, 1.65, 0.12, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: isFemaleTheme ? '#180816' : '#08101E',
      metalness: 0.85,
      roughness: 0.3,
    });
    const baseCyl = new THREE.Mesh(baseGeo, baseMat);
    baseCyl.position.y = 0.06;
    podiumGroup.add(baseCyl);

    const ringMat = new THREE.MeshStandardMaterial({
      color: isFemaleTheme ? '#DB2777' : '#2563EB',
      metalness: 0.9,
      roughness: 0.15,
      emissive: isFemaleTheme ? '#BE185D' : '#1D4ED8',
      emissiveIntensity: 0.35,
    });
    const ringGeo = new THREE.CylinderGeometry(1.35, 1.45, 0.07, 48);
    const ringCyl = new THREE.Mesh(ringGeo, ringMat);
    ringCyl.position.y = 0.15;
    podiumGroup.add(ringCyl);

    const topGeo = new THREE.CylinderGeometry(1.25, 1.3, 0.05, 48);
    const topMat = new THREE.MeshStandardMaterial({
      color: isFemaleTheme ? '#120511' : '#040812',
      metalness: 0.7,
      roughness: 0.4,
    });
    const topCyl = new THREE.Mesh(topGeo, topMat);
    topCyl.position.y = 0.21;
    podiumGroup.add(topCyl);

    const accentLineGeo = new THREE.RingGeometry(1.22, 1.27, 64);
    const accentLineMat = new THREE.MeshBasicMaterial({
      color: '#FACC15',
      side: THREE.DoubleSide,
    });
    const accentLine = new THREE.Mesh(accentLineGeo, accentLineMat);
    accentLine.rotation.x = -Math.PI / 2;
    accentLine.position.y = 0.238;
    podiumGroup.add(accentLine);

    scene.add(podiumGroup);

    // ========================================================
    // MODEL PRODUK 3D ACAK (MUTER 360°)
    // ========================================================
    const modelGroup = new THREE.Group();
    modelGroup.position.set(0, 0.08, 0);
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    const loader = new GLTFLoader();
    loader.load(
      randomAsset.glbPath,
      (gltf) => {
        modelGroup.clear();
        const model = gltf.scene;

        // Clean out lights/cameras
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

        // 1. Reset
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        model.updateMatrixWorld(true);

        // 2. Measure raw bounds
        let box = new THREE.Box3().setFromObject(model);
        let size = box.getSize(new THREE.Vector3());
        let maxDim = Math.max(size.x, size.y, size.z) || 1;

        // 3. Normalized standard scale
        const targetDim = 1.38;
        const scale = targetDim / maxDim;
        model.scale.set(scale, scale, scale);
        model.updateMatrixWorld(true);

        // 4. Center 3-axis
        box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        modelGroup.add(model);
        if (onModelLoaded) onModelLoaded(randomAsset.nama);
      },
      undefined,
      (err) => {
        console.error('Failed to load random 3D model:', err);
      }
    );

    // Resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop: 360° Smooth Spin
    let clock = new THREE.Clock();
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      modelGroup.rotation.y += autoRotateSpeed;

      const t = clock.getElapsedTime();
      modelGroup.position.y = 0.08 + Math.sin(t * 2.2) * 0.03;

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
  }, [randomAsset, autoRotateSpeed, onModelLoaded]);

  return (
    <div className="flex flex-col items-center justify-center relative w-full h-full">
      <div ref={containerRef} className="w-full h-full select-none" />
      {/* Product Tag */}
      <div className="absolute bottom-1 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#12080D]/90 px-3.5 py-1 text-[11px] font-mono text-white/90 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: randomAsset.warna || '#F43F5E' }} />
        <span>Memuat Model 3D: <strong>{randomAsset.nama}</strong></span>
      </div>
    </div>
  );
}
