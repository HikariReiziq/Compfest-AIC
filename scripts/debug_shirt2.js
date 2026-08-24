const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:3000/preview-generator', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__READY__ === true');

  await page.evaluate(async () => {
    // Let's manually inspect loading shirt2.glb in the page's Three.js environment
    const loader = new THREE.GLTFLoader();
    loader.load('/images/products/shirts/Pria/shirt2.glb', (gltf) => {
      const model = gltf.scene;
      console.log('Model children count:', model.children.length);
      model.traverse(c => {
        if (c.isMesh) {
          console.log('Mesh found:', c.name, 'geometry vertices:', c.geometry.attributes.position.count, 'visible:', c.visible);
          console.log('Mesh material:', c.material.name, c.material.opacity, c.material.transparent, c.material.color);
        }
      });
      const box = new THREE.Box3().setFromObject(model);
      console.log('Model Box3 Min:', JSON.stringify(box.min));
      console.log('Model Box3 Max:', JSON.stringify(box.max));
      const size = box.getSize(new THREE.Vector3());
      console.log('Model Box3 Size:', JSON.stringify(size));
    }, undefined, (err) => console.log('Load error:', err));
  });

  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
}

main().catch(console.error);
