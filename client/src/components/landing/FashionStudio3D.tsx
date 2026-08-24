'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FASHION_ASET } from './fashionAset';

const LIME = '#C9F73D';

interface FashionStudio3DProps {
  progresRef?: React.MutableRefObject<number>;
  aktif: boolean;
  mode?: 'atelier' | 'runway';
  terpilih?: string | null;
  onPilih?: (id: string | null) => void;
}

export default function FashionStudio3D({
  progresRef,
  aktif,
  mode = 'atelier',
  terpilih = null,
  onPilih = () => {},
}: FashionStudio3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999));
  const reqIdRef = useRef<number | null>(null);

  // Mesh & Group references
  const pedestalsRef = useRef<Map<string, THREE.Group>>(new Map());
  const glbModelsRef = useRef<Map<string, THREE.Group>>(new Map());

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050705');
    scene.fog = new THREE.FogExp2('#050705', mode === 'runway' ? 0.022 : 0.032);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 200);
    if (mode === 'atelier') {
      camera.position.set(0, 16, 32);
      camera.lookAt(0, 2, 0);
    } else {
      camera.position.set(0, 10, 24);
      camera.lookAt(0, 1, -10);
    }
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Soft Studio Lighting
    const ambient = new THREE.AmbientLight('#C4D3B4', 1.4);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight('#818CF8', '#141C10', 1.6);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFFFFF', 3.2);
    keyLight.position.set(16, 28, 22);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#C9F73D', 1.5);
    rimLight.position.set(-18, 14, -14);
    scene.add(rimLight);

    const centerGlow = new THREE.PointLight(LIME, 20, 35, 2);
    centerGlow.position.set(0, 4, 0);
    scene.add(centerGlow);

    // Floor Fashion Grid
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#080C07',
      roughness: 0.8,
      metalness: 0.3,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    // Runway Grid Overlay
    const runwayLines = new THREE.GridHelper(160, 40, '#28381C', '#10160C');
    runwayLines.position.y = 0.01;
    scene.add(runwayLines);

    // Central Catwalk Stage
    const catwalkGeo = new THREE.BoxGeometry(8, 0.3, 50);
    const catwalkMat = new THREE.MeshStandardMaterial({
      color: '#121A0F',
      roughness: 0.35,
      metalness: 0.7,
    });
    const catwalk = new THREE.Mesh(catwalkGeo, catwalkMat);
    catwalk.position.set(0, 0.15, 0);
    scene.add(catwalk);

    // Catwalk Neon Edges
    const edgeMat = new THREE.MeshBasicMaterial({ color: LIME });
    const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 50), edgeMat);
    edgeL.position.set(-4.04, 0.16, 0);
    scene.add(edgeL);

    const edgeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 50), edgeMat);
    edgeR.position.set(4.04, 0.16, 0);
    scene.add(edgeR);

    // Center Tailoring Mannequin Wireframe
    const mannequinGroup = new THREE.Group();
    mannequinGroup.position.set(0, 0.4, 0);

    const mMat = new THREE.MeshStandardMaterial({ color: '#CBD5E1', metalness: 0.7, roughness: 0.25 });
    const mTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.5, 2.0, 16), mMat);
    mTorso.position.y = 2.4;
    mannequinGroup.add(mTorso);

    const mChest = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), mMat);
    mChest.position.set(0, 2.8, 0);
    mChest.scale.set(1.1, 0.7, 0.75);
    mannequinGroup.add(mChest);

    const mHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: LIME, metalness: 0.8, roughness: 0.15 }));
    mHead.position.set(0, 4.2, 0);
    mHead.scale.set(0.85, 1.1, 0.9);
    mannequinGroup.add(mHead);

    const mStand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), new THREE.MeshStandardMaterial({ color: '#2A3820', metalness: 0.8 }));
    mStand.position.y = 1.2;
    mannequinGroup.add(mStand);

    const mBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.15, 24), new THREE.MeshStandardMaterial({ color: '#1B2416', metalness: 0.8 }));
    mBase.position.y = 0.08;
    mannequinGroup.add(mBase);

    scene.add(mannequinGroup);

    // Build 4 Product Pedestals with Real 3D GLB Models
    const loader = new GLTFLoader();

    FASHION_ASET.forEach((aset) => {
      const [px, pz] = aset.posisi || [0, 0];
      const pGroup = new THREE.Group();
      pGroup.position.set(px, 0, pz);

      // Pedestal Base
      const pGeo = new THREE.CylinderGeometry(2.2, 2.6, 1.0, 24);
      const pMat = new THREE.MeshStandardMaterial({
        color: '#151C12',
        roughness: 0.45,
        metalness: 0.55,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.y = 0.5;
      pGroup.add(pMesh);

      // Glowing Ring on Top
      const ringGeo = new THREE.RingGeometry(1.8, 2.1, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: aset.warna, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 1.02;
      pGroup.add(ring);

      // Floating Marker Diamond
      const diamondGeo = new THREE.OctahedronGeometry(0.65, 0);
      const diamondMat = new THREE.MeshStandardMaterial({
        color: aset.warna,
        emissive: aset.warna,
        emissiveIntensity: 2.4,
        roughness: 0.2,
        metalness: 0.8,
      });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      diamond.position.set(0, 3.8, 0);
      diamond.name = `diamond-${aset.id}`;
      pGroup.add(diamond);

      // Load specific GLB product model if path exists
      if (aset.glbPath) {
        loader.load(
          aset.glbPath,
          (gltf) => {
            const model = gltf.scene;
            // Calibrate product scale on pedestal
            if (aset.subkategori === 'glasses') {
              model.scale.set(6.0, 6.0, 6.0);
              model.position.set(0, 1.8, 0);
            } else if (aset.subkategori === 'hats') {
              model.scale.set(4.5, 4.5, 4.5);
              model.position.set(0, 1.8, 0);
            } else {
              model.scale.set(2.8, 2.8, 2.8);
              model.position.set(0, 1.4, 0);
            }
            pGroup.add(model);
            glbModelsRef.current.set(aset.id, model);
          },
          undefined,
          () => {
            // Fallback geometric token
            const fallbackGeo = new THREE.TorusGeometry(0.8, 0.25, 12, 24);
            const fallbackMat = new THREE.MeshStandardMaterial({ color: aset.warna, metalness: 0.6 });
            const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
            fallback.position.set(0, 2.0, 0);
            pGroup.add(fallback);
          }
        );
      }

      // Invisible Raycast Click Target Box
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(5.0, 6.5, 5.0),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.set(0, 3.2, 0);
      hitBox.userData = { id: aset.id };
      pGroup.add(hitBox);

      scene.add(pGroup);
      pedestalsRef.current.set(aset.id, pGroup);
    });

    // Window Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [mode]);

  // Pointer Interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const rect = container.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    for (const hit of intersects) {
      if (hit.object.userData && hit.object.userData.id) {
        onPilih(hit.object.userData.id);
        return;
      }
    }
    onPilih(null);
  };

  // Main 3D Animation Loop
  useEffect(() => {
    let clock = new THREE.Clock();

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      if (!aktif) {
        reqIdRef.current = requestAnimationFrame(animate);
        return;
      }

      const t = clock.getElapsedTime();
      const camera = cameraRef.current;

      if (mode === 'atelier') {
        const orbitRadius = 32;
        const orbitSpeed = 0.07;
        camera.position.x = Math.sin(t * orbitSpeed) * orbitRadius;
        camera.position.z = Math.cos(t * orbitSpeed) * orbitRadius;
        camera.position.y = 15 + Math.sin(t * 0.2) * 1.5;
        camera.lookAt(0, 2.5, 0);

        pedestalsRef.current.forEach((pGroup, id) => {
          const isSelected = terpilih === id;
          const diamond = pGroup.getObjectByName(`diamond-${id}`) as THREE.Mesh | null;
          if (diamond) {
            diamond.rotation.y = t * 1.8;
            diamond.position.y = 3.8 + Math.sin(t * 2.5 + pGroup.position.x) * 0.3;
            diamond.scale.setScalar(isSelected ? 1.35 : 1.0);
          }

          const glb = glbModelsRef.current.get(id);
          if (glb) {
            glb.rotation.y = t * 0.75;
          }
        });
      } else {
        // Mode Runway (Scroll-driven)
        const p = progresRef ? THREE.MathUtils.clamp(progresRef.current, 0, 1) : 0;
        const smoothP = p * p * (3 - 2 * p);
        camera.position.z = 28 - smoothP * 30;
        camera.position.y = 9 - smoothP * 3;
        camera.position.x = Math.sin(smoothP * Math.PI) * 4;
        camera.lookAt(0, 2, -12);
      }

      rendererRef.current.render(sceneRef.current, camera);
      reqIdRef.current = requestAnimationFrame(animate);
    };

    reqIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [aktif, mode, terpilih, progresRef]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: 'none' }}
    />
  );
}
