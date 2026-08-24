const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Launching headless Chrome with Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  console.log('Navigating to http://localhost:3000/preview-generator ...');
  await page.goto('http://localhost:3000/preview-generator', { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for __READY__
  await page.waitForFunction('window.__READY__ === true', { timeout: 15000 });

  const models = await page.evaluate(() => window.ALL_MODELS);
  console.log(`Found ${models.length} models in manifest. Rendering each one...`);

  const previewDir = path.join(__dirname, '..', 'client', 'public', 'images', 'products', 'preview');
  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }

  const manifestPath = path.join(__dirname, '..', 'client', 'public', 'images', 'products', 'glb_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  let successCount = 0;
  for (let i = 0; i < models.length; i++) {
    const item = models[i];
    const url = `/images/products/${item.cat}/${item.file}`;
    const modelConfig = manifest[item.file] || {};
    const [rx, ry, rz] = modelConfig.rotation_correction || [0, 0, 0];
    console.log(`[${i + 1}/${models.length}] Rendering ${item.file} (rot: [${rx}, ${ry}, ${rz}]) -> ${item.preview}...`);

    try {
      const dataUrl = await page.evaluate(async (u, c, x, y, z) => {
        return await window.renderOneGLB(u, c.split('/')[0], x, y, z);
      }, url, item.cat, rx, ry, rz);

      // Extract base64
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const filePath = path.join(previewDir, item.preview);
      fs.writeFileSync(filePath, base64Data, 'base64');
      const stat = fs.statSync(filePath);
      console.log(`   -> Saved ${item.preview} (${stat.size} bytes)`);
      successCount++;
    } catch (err) {
      console.error(`   -> FAILED ${item.file}:`, err.message);
    }
  }

  console.log(`\nCompleted! Successfully rendered ${successCount}/${models.length} preview images.`);
  await browser.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
