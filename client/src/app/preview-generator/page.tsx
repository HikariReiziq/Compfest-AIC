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

    const loader = new GLTFLoader();

    // Attach global render function for Puppeteer or UI
    (window as any).renderOneGLB = (url: string, cat: string) => {
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

            // 1. Initial orientation correction if model is lying flat
            const rawBox = new THREE.Box3().setFromObject(model);
            const rawSize = rawBox.getSize(new THREE.Vector3());
            if (cat === "glasses" && rawSize.y > rawSize.z * 1.3) {
              model.rotation.x = -Math.PI / 2;
            }

            const wrapper = new THREE.Group();
            wrapper.add(model);
            scene.add(wrapper);

            // 2. Uniform clean front-facing angle (facing directly front with subtle 8-degree depth)
            if (cat === "glasses") {
              wrapper.rotation.set(0.04, -0.18, 0);
            } else if (cat === "hats") {
              wrapper.rotation.set(0.08, -0.15, 0);
            } else {
              wrapper.rotation.set(0.0, -0.12, 0);
            }

            // Force world matrix update so bounding box includes rotations
            wrapper.updateMatrixWorld(true);

            // 3. Compute exact world bounding box of rotated model
            const worldBox = new THREE.Box3().setFromObject(wrapper);
            const worldCenter = worldBox.getCenter(new THREE.Vector3());
            const worldSize = worldBox.getSize(new THREE.Vector3());

            // 4. Center wrapper precisely at (0, 0, 0)
            wrapper.position.sub(worldCenter);

            // Force update after centering
            wrapper.updateMatrixWorld(true);

            // 5. Mathematical camera framing: object fills ~75% of frame (consistent padding, no cut-offs)
            const fovRad = (camera.fov * Math.PI) / 180;
            const distH = (worldSize.y / 2) / Math.tan(fovRad / 2);
            const distW = (worldSize.x / 2) / Math.tan(fovRad / 2);
            const maxDim = Math.max(worldSize.x, worldSize.y, worldSize.z);
            const distMax = (maxDim / 2) / Math.tan(fovRad / 2);

            const fitDistance = Math.max(distH, distW, distMax) * 1.30;

            camera.position.set(0, 0, fitDistance);
            camera.near = Math.max(0.01, fitDistance / 100);
            camera.far = fitDistance * 100;
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
          {isProcessing ? "Rendering..." : "🚀 Render & Save All Previews"}
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
