const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/preview-generator', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__READY__ === true');

  const diag = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const loader = new (window as any).THREE_GLTFLoader ? new (window as any).THREE_GLTFLoader() : null;
      // In preview-generator, let's load shirt2.glb and inspect everything
      const l = new window.GLTFLoader ? new window.GLTFLoader() : null;
      const loaderToUse = (window as any).THREE ? new (window as any).THREE.GLTFLoader() : null;
    });
  }).catch(e => e.message);

  await browser.close();
}
