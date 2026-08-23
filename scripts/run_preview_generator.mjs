import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREVIEW_DIR = path.resolve(__dirname, '../client/public/images/products/preview');
const BASE_URL = 'http://localhost:3005/preview-generator';

async function main() {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle', '--enable-gpu-rasterization'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.toString()));

  console.log('📄 Loading preview-generator page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

  console.log('⏳ Waiting for Three.js initialization...');
  await page.waitForFunction(() => window.__READY__ === true, { timeout: 60000 });
  console.log('✅ Three.js ready!');

  const models = await page.evaluate(() => window.ALL_MODELS);
  console.log(`📦 Found ${models.length} 3D models to render...`);

  let saved = 0;
  for (let i = 0; i < models.length; i++) {
    const item = models[i];
    const url = `/images/products/${item.cat}/${item.file}`;
    console.log(`  🎨 [${i + 1}/${models.length}] Rendering ${item.file}...`);

    try {
      const dataUrl = await page.evaluate(async (u, c) => {
        return await window.renderOneGLB(u, c.split('/')[0]);
      }, url, item.cat);

      if (dataUrl) {
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const outPath = path.join(PREVIEW_DIR, item.preview);
        fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
        console.log(`     ✅ Saved: ${item.preview}`);
        saved++;
      }
    } catch (err) {
      console.warn(`     ⚠️ Error rendering ${item.file}:`, err.message);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n🎉 Render complete! Successfully saved ${saved}/${models.length} preview images.`);
  await browser.close();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
