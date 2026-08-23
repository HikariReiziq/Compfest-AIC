import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREVIEW_DIR = path.resolve(__dirname, '../client/public/images/products/preview');
const BASE_URL = 'http://localhost:3000/glb_preview_tool.html';

async function main() {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle', '--enable-gpu-rasterization', '--allow-file-access-from-files'],
    dumpio: true
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  console.log('📄 Loading preview tool page...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  await new Promise(r => setTimeout(r, 3000));
  const hasFn = await page.evaluate(() => typeof window.renderGLB);
  console.log('window.renderGLB type:', hasFn);

  await browser.close();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
