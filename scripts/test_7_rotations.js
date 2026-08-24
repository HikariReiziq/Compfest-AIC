const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TARGETS = [
  { name: 'glass-03', file: 'glasses_03_facefit_geometric.glb', cat: 'glasses' },
  { name: 'glass-05', file: 'glasses_05_facefit_slim_aviator.glb', cat: 'glasses' },
  { name: 'hat-02', file: 'cowboy hat2.glb', cat: 'hats' },
  { name: 'shirt-pria-03', file: 'free_shirt.glb', cat: 'shirts/Pria' },
  { name: 'shirt-wanita-05', file: 'vneck_t-shirt_for_female.glb', cat: 'shirts/Wanita' },
  { name: 'shirt-pria-13', file: 't_shirt.glb', cat: 'shirts/Pria' },
  { name: 'shirt-pria-02', file: 'football_shirt_fc_barcelona.glb', cat: 'shirts/Pria' },
];

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  await page.goto('http://localhost:3000/preview-generator', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__READY__ === true');

  console.log('Testing orientation candidates for the 7 items...');

  const results = {};

  for (const item of TARGETS) {
    const url = `/images/products/${item.cat}/${item.file}`;
    console.log(`\n=== Testing ${item.name} (${item.file}) ===`);

    // Let's test a few candidate Y rotations: -PI/2, +PI/2, PI, +0.3, -0.3, etc.
    const candidates = [
      { label: 'Y_plus_90', ry: Math.PI / 2, rx: 0, rz: 0 },
      { label: 'Y_minus_90', ry: -Math.PI / 2, rx: 0, rz: 0 },
      { label: 'Y_180', ry: Math.PI, rx: 0, rz: 0 },
      { label: 'Y_plus_15', ry: 0.26, rx: 0, rz: 0 },
      { label: 'Y_minus_15', ry: -0.26, rx: 0, rz: 0 },
      { label: 'Y_plus_30', ry: 0.52, rx: 0, rz: 0 },
      { label: 'Y_minus_30', ry: -0.52, rx: 0, rz: 0 },
    ];

    for (const cand of candidates) {
      const dataUrl = await page.evaluate(async (u, c, rx, ry, rz) => {
        return new Promise((resolve, reject) => {
          const scene = (window as any).THREE_SCENE || undefined;
          // Let's use the page's render function or custom loader
        });
      }, url, item.cat, cand.rx, cand.ry, cand.rz).catch(() => null);
    }
  }

  await browser.close();
}

main().catch(console.error);
