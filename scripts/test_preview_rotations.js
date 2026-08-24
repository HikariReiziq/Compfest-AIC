const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  await page.goto('http://localhost:3000/preview-generator', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__READY__ === true');

  // Let's test render with ZERO rotation (straight front-facing)
  const models = await page.evaluate(() => window.ALL_MODELS);
  console.log(`Testing ${models.length} models...`);

  const previewDir = path.join(__dirname, '..', 'client', 'public', 'images', 'products', 'preview');

  for (let i = 0; i < models.length; i++) {
    const item = models[i];
    const url = `/images/products/${item.cat}/${item.file}`;
    const dataUrl = await page.evaluate(async (u, c) => {
      return await window.renderOneGLB(u, c.split('/')[0]);
    }, url, item.cat);

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const filePath = path.join(previewDir, item.preview);
    fs.writeFileSync(filePath, base64Data, 'base64');
    console.log(`Rendered [${i+1}/${models.length}] ${item.file} -> ${item.preview}`);
  }

  await browser.close();
  console.log('Finished rendering.');
}

main().catch(console.error);
