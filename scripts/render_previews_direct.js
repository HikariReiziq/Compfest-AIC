const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ALL_MODELS = [
  // Glasses (7 items)
  { id: "glasses-01", cat: "glasses", file: "glasses_01_khronos_pbr.glb", preview: "glass-01.png" },
  { id: "glasses-02", cat: "glasses", file: "glasses_02_rayban_pilot.glb", preview: "glass-02.png" },
  { id: "glasses-03", cat: "glasses", file: "glasses_03_facefit_geometric.glb", preview: "glass-03.png" },
  { id: "glasses-04", cat: "glasses", file: "glasses_04_facefit_browline.glb", preview: "glass-04.png" },
  { id: "glasses-05", cat: "glasses", file: "glasses_05_facefit_slim_aviator.glb", preview: "glass-05.png" },
  { id: "glasses-06", cat: "glasses", file: "glasses_06_facefit_hornrimmed.glb", preview: "glass-06.png" },
  { id: "glasses-07", cat: "glasses", file: "glasses_07_sunfit_sport.glb", preview: "glass-07.png" },

  // Hats (11 items)
  { id: "hat-01", cat: "hats", file: "bicorn_hat.glb", preview: "hat-01.png" },
  { id: "hat-02", cat: "hats", file: "cowboy hat2.glb", preview: "hat-02.png" },
  { id: "hat-03", cat: "hats", file: "cowboy hat5.glb", preview: "hat-03.png" },
  { id: "hat-04", cat: "hats", file: "female_beach_hat.glb", preview: "hat-04.png" },
  { id: "hat-05", cat: "hats", file: "hat.glb", preview: "hat-05.png" },
  { id: "hat-06", cat: "hats", file: "luffys_straw_hat.glb", preview: "hat-06.png" },
  { id: "hat-07", cat: "hats", file: "mafia_hat_spy_hat.glb", preview: "hat-07.png" },
  { id: "hat-08", cat: "hats", file: "propeller_hat.glb", preview: "hat-08.png" },
  { id: "hat-09", cat: "hats", file: "renaissance_hat.glb", preview: "hat-09.png" },
  { id: "hat-10", cat: "hats", file: "weathered_pith_hat.glb", preview: "hat-10.png" },
  { id: "hat-11", cat: "hats", file: "witch_hat.glb", preview: "hat-11.png" },

  // Shirts Pria (13 items)
  { id: "shirt-pria-01", cat: "shirts/Pria", file: "color_blocked_shirt.glb", preview: "shirt-pria-01.png" },
  { id: "shirt-pria-02", cat: "shirts/Pria", file: "football_shirt_fc_barcelona.glb", preview: "shirt-pria-02.png" },
  { id: "shirt-pria-03", cat: "shirts/Pria", file: "free_shirt.glb", preview: "shirt-pria-03.png" },
  { id: "shirt-pria-04", cat: "shirts/Pria", file: "man_shirt.glb", preview: "shirt-pria-04.png" },
  { id: "shirt-pria-05", cat: "shirts/Pria", file: "mens_casual_shirt.glb", preview: "shirt-pria-05.png" },
  { id: "shirt-pria-06", cat: "shirts/Pria", file: "party_starter_-_layered_t-shirts.glb", preview: "shirt-pria-06.png" },
  { id: "shirt-pria-07", cat: "shirts/Pria", file: "shirt.glb", preview: "shirt-pria-07.png" },
  { id: "shirt-pria-08", cat: "shirts/Pria", file: "shirt2.glb", preview: "shirt-pria-08.png" },
  { id: "shirt-pria-09", cat: "shirts/Pria", file: "shirt_with_long_sleeves.glb", preview: "shirt-pria-09.png" },
  { id: "shirt-pria-10", cat: "shirts/Pria", file: "sleeveless_shirt.glb", preview: "shirt-pria-10.png" },
  { id: "shirt-pria-11", cat: "shirts/Pria", file: "t-shirt.glb", preview: "shirt-pria-11.png" },
  { id: "shirt-pria-12", cat: "shirts/Pria", file: "techwear_shirt.glb", preview: "shirt-pria-12.png" },
  { id: "shirt-pria-13", cat: "shirts/Pria", file: "t_shirt.glb", preview: "shirt-pria-13.png" },

  // Shirts Wanita (6 items)
  { id: "shirt-wanita-01", cat: "shirts/Wanita", file: "off_the_shoulder_shirt_-_ngchipv.glb", preview: "shirt-wanita-01.png" },
  { id: "shirt-wanita-02", cat: "shirts/Wanita", file: "skirt_and_t-shirt.glb", preview: "shirt-wanita-02.png" },
  { id: "shirt-wanita-03", cat: "shirts/Wanita", file: "soft_brushed_long_sleeve_shirt.glb", preview: "shirt-wanita-03.png" },
  { id: "shirt-wanita-04", cat: "shirts/Wanita", file: "sweater_woman.glb", preview: "shirt-wanita-04.png" },
  { id: "shirt-wanita-05", cat: "shirts/Wanita", file: "vneck_t-shirt_for_female.glb", preview: "shirt-wanita-05.png" },
  { id: "shirt-wanita-06", cat: "shirts/Wanita", file: "womens_shirt.glb", preview: "shirt-wanita-06.png" },
];

async function main() {
  console.log('Launching Puppeteer Direct Studio Renderer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  // Navigate to any page to have Three.js context or simple html
  await page.goto('http://localhost:3000/preview-generator', { waitUntil: 'networkidle0' });

  const manifestPath = path.join(__dirname, '..', 'client', 'public', 'images', 'products', 'glb_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const previewDir = path.join(__dirname, '..', 'client', 'public', 'images', 'products', 'preview');

  for (let i = 0; i < ALL_MODELS.length; i++) {
    const item = ALL_MODELS[i];
    const url = `/images/products/${item.cat}/${item.file}`;
    const modelConfig = manifest[item.file] || {};
    const [rx, ry, rz] = modelConfig.rotation_correction || [0, 0, 0];

    console.log(`[${i + 1}/${ALL_MODELS.length}] Direct Rendering ${item.file} (rot: [${rx}, ${ry}, ${rz}]) -> ${item.preview}...`);

    const dataUrl = await page.evaluate(async (u, rxVal, ryVal, rzVal) => {
      // Direct in-page Three.js execution
      const THREE = (window as any).THREE || window.THREE;
      const GLTFLoader = (window as any).GLTFLoader || (window as any).THREE?.GLTFLoader;

      // Create isolated renderer and scene
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(512, 512);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

      scene.add(new THREE.AmbientLight(0xffffff, 2.2));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
      keyLight.position.set(3, 5, 4);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xe8e0f0, 1.5);
      fillLight.position.set(-3, 2, 3);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x90b0ff, 1.2);
      rimLight.position.set(0, -2, -3);
      scene.add(rimLight);

      const loader = new (window as any).THREE_GLTFLoader();

      return new Promise((resolve, reject) => {
        loader.load(
          u,
          (gltf) => {
            const model = gltf.scene;

            // Apply explicit rotation correction
            if (rxVal || ryVal || rzVal) {
              model.rotation.set(rxVal, ryVal, rzVal);
            }
            model.updateMatrixWorld(true);

            // Scale to standard 1.5 units
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledSize = scaledBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) || 1.0;
            const normScale = 1.5 / maxDim;
            model.scale.set(normScale, normScale, normScale);
            model.updateMatrixWorld(true);

            model.traverse((child) => {
              if (child.isMesh) {
                child.frustumCulled = false;
                if (child.geometry) {
                  child.geometry.computeBoundingBox();
                  child.geometry.computeBoundingSphere();
                }
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((mat) => {
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
            wrapper.updateMatrixWorld(true);

            // Center wrapper
            const worldBox = new THREE.Box3().setFromObject(wrapper);
            const worldCenter = worldBox.getCenter(new THREE.Vector3());
            wrapper.position.sub(worldCenter);
            wrapper.updateMatrixWorld(true);

            // Camera setup: straight front eye-level
            camera.position.set(0, 0, 3.6);
            camera.near = 0.01;
            camera.far = 100;
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();

            renderer.render(scene, camera);
            const resDataUrl = canvas.toDataURL('image/png');
            renderer.dispose();
            resolve(resDataUrl);
          },
          undefined,
          (err) => reject(err)
        );
      });
    }, url, rx, ry, rz);

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const filePath = path.join(previewDir, item.preview);
    fs.writeFileSync(filePath, base64Data, 'base64');
    const stat = fs.statSync(filePath);
    console.log(`   -> Successfully saved ${item.preview} (${stat.size} bytes)`);
  }

  await browser.close();
  console.log('\nAll 37 Direct Previews successfully rendered!');
}

main().catch(console.error);
