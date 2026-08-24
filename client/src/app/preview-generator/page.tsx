"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const ALL_MODELS = [
  // Glasses (7 items)
  { cat: "glasses", file: "glasses_01_khronos_pbr.glb", preview: "glass-01.png" },
  { cat: "glasses", file: "glasses_02_rayban_pilot.glb", preview: "glass-02.png" },
  { cat: "glasses", file: "glasses_03_facefit_geometric.glb", preview: "glass-03.png" },
  { cat: "glasses", file: "glasses_04_facefit_browline.glb", preview: "glass-04.png" },
  { cat: "glasses", file: "glasses_05_facefit_slim_aviator.glb", preview: "glass-05.png" },
  { cat: "glasses", file: "glasses_06_facefit_hornrimmed.glb", preview: "glass-06.png" },
  { cat: "glasses", file: "glasses_07_sunfit_sport.glb", preview: "glass-07.png" },

  // Hats (11 items)
  { cat: "hats", file: "bicorn_hat.glb", preview: "hat-01.png" },
  { cat: "hats", file: "cowboy hat2.glb", preview: "hat-02.png" },
  { cat: "hats", file: "cowboy hat5.glb", preview: "hat-03.png" },
  { cat: "hats", file: "female_beach_hat.glb", preview: "hat-04.png" },
  { cat: "hats", file: "hat.glb", preview: "hat-05.png" },
  { cat: "hats", file: "luffys_straw_hat.glb", preview: "hat-06.png" },
  { cat: "hats", file: "mafia_hat_spy_hat.glb", preview: "hat-07.png" },
  { cat: "hats", file: "propeller_hat.glb", preview: "hat-08.png" },
  { cat: "hats", file: "renaissance_hat.glb", preview: "hat-09.png" },
  { cat: "hats", file: "weathered_pith_hat.glb", preview: "hat-10.png" },
  { cat: "hats", file: "witch_hat.glb", preview: "hat-11.png" },

  // Shirts Pria (13 items)
  { cat: "shirts/Pria", file: "color_blocked_shirt.glb", preview: "shirt-pria-01.png" },
  { cat: "shirts/Pria", file: "football_shirt_fc_barcelona.glb", preview: "shirt-pria-02.png" },
  { cat: "shirts/Pria", file: "free_shirt.glb", preview: "shirt-pria-03.png" },
  { cat: "shirts/Pria", file: "man_shirt.glb", preview: "shirt-pria-04.png" },
  { cat: "shirts/Pria", file: "mens_casual_shirt.glb", preview: "shirt-pria-05.png" },
  { cat: "shirts/Pria", file: "party_starter_-_layered_t-shirts.glb", preview: "shirt-pria-06.png" },
  { cat: "shirts/Pria", file: "shirt.glb", preview: "shirt-pria-07.png" },
  { cat: "shirts/Pria", file: "shirt2.glb", preview: "shirt-pria-08.png" },
  { cat: "shirts/Pria", file: "shirt_with_long_sleeves.glb", preview: "shirt-pria-09.png" },
  { cat: "shirts/Pria", file: "sleeveless_shirt.glb", preview: "shirt-pria-10.png" },
  { cat: "shirts/Pria", file: "t-shirt.glb", preview: "shirt-pria-11.png" },
  { cat: "shirts/Pria", file: "techwear_shirt.glb", preview: "shirt-pria-12.png" },
  { cat: "shirts/Pria", file: "t_shirt.glb", preview: "shirt-pria-13.png" },

  // Shirts Wanita (6 items)
  { cat: "shirts/Wanita", file: "off_the_shoulder_shirt_-_ngchipv.glb", preview: "shirt-wanita-01.png" },
  { cat: "shirts/Wanita", file: "skirt_and_t-shirt.glb", preview: "shirt-wanita-02.png" },
  { cat: "shirts/Wanita", file: "soft_brushed_long_sleeve_shirt.glb", preview: "shirt-wanita-03.png" },
  { cat: "shirts/Wanita", file: "sweater_woman.glb", preview: "shirt-wanita-04.png" },
  { cat: "shirts/Wanita", file: "vneck_t-shirt_for_female.glb", preview: "shirt-wanita-05.png" },
  { cat: "shirts/Wanita", file: "womens_shirt.glb", preview: "shirt-wanita-06.png" },
];

export default function PreviewGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState("Initializing Three.js...");
  const [renders, setRenders] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(512, 512);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

    scene.add(new THREE.AmbientLight(0xffffff, 2.0));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xe8e0f0, 1.5);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x90b0ff, 1.2);
    rimLight.position.set(0, -2, -3);
    scene.add(rimLight);

    (window as any).THREE = THREE;
    (window as any).THREE_GLTFLoader = GLTFLoader;

    const loader = new GLTFLoader();

    // Attach global render function for Puppeteer or UI
    (window as any).renderOneGLB = async (url: string, cat: string, rxParam?: number, ryParam?: number, rzParam?: number) => {
      let rx = rxParam || 0;
      let ry = ryParam || 0;
      let rz = rzParam || 0;

      // Automatically read rotation from manifest if not provided
      if (rx === 0 && ry === 0 && rz === 0) {
        try {
          const res = await fetch("/images/products/glb_manifest.json");
          if (res.ok) {
            const manifest = await res.json();
            const fn = url.split("/").pop() || "";
            if (manifest[fn]?.rotation_correction) {
              [rx, ry, rz] = manifest[fn].rotation_correction;
            }
          }
        } catch {}
      }

      return new Promise<string>((resolve, reject) => {
        for (let i = scene.children.length - 1; i >= 0; i--) {
          const c = scene.children[i];
          if (c instanceof THREE.Group) {
            scene.remove(c);
            c.traverse((x: any) => {
              if (x.isMesh) x.geometry?.dispose();
            });
          }
        }

        loader.load(
          url,
          (gltf) => {
            const model = gltf.scene;

            // Apply model rotation correction if provided
            if (rx || ry || rz) {
              model.rotation.set(rx, ry, rz);
              model.updateMatrixWorld(true);
            }

            // 1. Normalize scale to standard 1.5 units across all 37 models
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledSize = scaledBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) || 1.0;
            const normScale = 1.5 / maxDim;
            model.scale.set(normScale, normScale, normScale);
            model.updateMatrixWorld(true);

            // 2. Enable double-sided rendering, disable frustum culling, and preserve authentic textures
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.frustumCulled = false;
                if (mesh.geometry) {
                  mesh.geometry.computeBoundingBox();
                  mesh.geometry.computeBoundingSphere();
                }

                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((mat: any) => {
                  if (!mat) return;
                  mat.side = THREE.DoubleSide;
                  if (mat.map) {
                    mat.map.colorSpace = THREE.SRGBColorSpace;
                    mat.map.needsUpdate = true;
                  }
                  mat.needsUpdate = true;
                });
              }
            });

            const wrapper = new THREE.Group();
            wrapper.add(model);
            scene.add(wrapper);

            // Clean straight-on eye-level front view (no tilting from below or behind)
            wrapper.rotation.set(0, 0, 0);

            // Force world matrix update so bounding box includes rotations
            wrapper.updateMatrixWorld(true);

            // 3. Center wrapper precisely at (0, 0, 0)
            const worldBox = new THREE.Box3().setFromObject(wrapper);
            const worldCenter = worldBox.getCenter(new THREE.Vector3());
            wrapper.position.sub(worldCenter);
            wrapper.updateMatrixWorld(true);

            // 4. Straight eye-level front camera
            camera.position.set(0, 0, 3.6);
            camera.near = 0.01;
            camera.far = 100;
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();

            // Render crisp preview
            renderer.render(scene, camera);

            const dataUrl = canvas.toDataURL("image/png");
            resolve(dataUrl);
          },
          undefined,
          (err) => reject(err)
        );
      });
    };

    (window as any).__READY__ = true;
    (window as any).ALL_MODELS = ALL_MODELS;
    setStatus("Ready! Ready to render.");
  }, []);

  const handleStartRender = async () => {
    setIsProcessing(true);
    const results: Record<string, string> = {};

    for (let i = 0; i < ALL_MODELS.length; i++) {
      const item = ALL_MODELS[i];
      setStatus(`Rendering [${i + 1}/${ALL_MODELS.length}]: ${item.file}`);
      const url = `/images/products/${item.cat}/${item.file}`;

      try {
        const dataUrl = await (window as any).renderOneGLB(url, item.cat.split("/")[0]);
        results[item.preview] = dataUrl;
        setRenders((prev) => ({ ...prev, [item.preview]: dataUrl }));

        // Also post to backend endpoint or save
        await fetch("/api/save-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: item.preview, dataUrl }),
        }).catch(() => {});
      } catch (err: any) {
        console.warn(`Failed ${item.file}:`, err);
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    setStatus(`Done! Rendered ${Object.keys(results).length}/${ALL_MODELS.length} previews.`);
    setIsProcessing(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 text-slate-200">
      <h1 className="text-2xl font-bold text-white">GLB Catalog Preview Generator</h1>
      <p className="text-sm text-slate-400">
        Status: <strong className="text-emerald-400">{status}</strong>
      </p>

      <div className="flex gap-4">
        <button
          onClick={handleStartRender}
          disabled={isProcessing}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg disabled:opacity-50"
        >
          {isProcessing ? "Rendering..." : "Render & Save All Previews"}
        </button>
      </div>

      <div className="border border-white/10 rounded-2xl p-4 bg-slate-900/50 flex flex-col items-center justify-center">
        <canvas ref={canvasRef} width={512} height={512} className="w-80 h-80 bg-slate-950 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {Object.entries(renders).map(([name, url]) => (
          <div key={name} className="p-2 border border-white/10 rounded-xl bg-surface-50 text-center space-y-2">
            <img src={url} alt={name} className="w-full h-28 object-contain bg-slate-950 rounded-lg" />
            <div className="text-[11px] font-mono text-slate-300 truncate">{name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
