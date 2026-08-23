/**
 * GLB Preview Renderer — Uses Puppeteer navigating to the local dev server.
 * Run: node scripts/capture_previews.mjs
 * Prereq: Next.js dev server running on localhost:3000
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREVIEW_DIR = path.resolve(__dirname, '../client/public/images/products/preview');
const BASE_URL = 'http://localhost:3000/glb_preview_tool.html';

const ALL_MODELS = [
  // Glasses
  ...['glasses_01_khronos_pbr','glasses_02_rayban_pilot','glasses_03_facefit_geometric','glasses_04_facefit_browline','glasses_05_facefit_slim_aviator','glasses_06_facefit_hornrimmed','glasses_07_sunfit_sport'].map((f,i) => ({cat:'glasses', file: f+'.glb', preview: `glass-${String(i+1).padStart(2,'0')}.png`})),
  // Hats
  ...['bicorn_hat','cowboy hat2','cowboy hat5','female_beach_hat','hat','luffys_straw_hat','mafia_hat_spy_hat','propeller_hat','renaissance_hat','weathered_pith_hat','witch_hat'].map((f,i) => ({cat:'hats', file: f+'.glb', preview: `hat-${String(i+1).padStart(2,'0')}.png`})),
  // Shirts root
  ...['shirt_01_adrian_baked_tee','shirt_02_francesco_jersey','shirt_03_mf_hoodie_51','shirt_04_mf_hoodie_106','shirt_05_mf_hoodie_64','shirt_06_mf_hoodie_80','shirt_07_mf_hoodie_108','shirt_08_mf_hoodie_97','shirt_09_mf_hoodie_36','shirt_10_mf_tshirt_111','shirt_11_mf_tshirt_54','shirt_12_mf_tshirt_141','shirt_13_mf_tshirt_48','shirt_14_mf_tshirt_76','shirt_15_mf_longsleeve_14','shirt_16_mf_tanktop_3'].map((f,i) => ({cat:'shirts', file: f+'.glb', preview: `shirt-${String(i+1).padStart(2,'0')}.png`})),
  // Shirts Pria
  ...['color_blocked_shirt','football_shirt_fc_barcelona','free_shirt','man_shirt','mens_casual_shirt','party_starter_-_layered_t-shirts','shirt','shirt2','shirt_with_long_sleeves','sleeveless_shirt','t-shirt','techwear_shirt','t_shirt'].map((f,i) => ({cat:'shirts/Pria', file: f+'.glb', preview: `shirt-pria-${String(i+1).padStart(2,'0')}.png`})),
  // Shirts Wanita
  ...['off_the_shoulder_shirt_-_ngchipv','skirt_and_t-shirt','soft_brushed_long_sleeve_shirt','sweater_woman','vneck_t-shirt_for_female','womens_shirt'].map((f,i) => ({cat:'shirts/Wanita', file: f+'.glb', preview: `shirt-wanita-${String(i+1).padStart(2,'0')}.png`})),
];

async function main() {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--enable-gpu-rasterization'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 600, height: 700 });

  console.log('📄 Loading preview tool page...');
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60000 });

  // Wait for Three.js module to load
  console.log('⏳ Waiting for Three.js to initialize...');
  await page.waitForFunction(() => {
    return typeof window.renderGLB === 'function';
  }, { timeout: 30000 });
  console.log('✅ Renderer ready!');

  let saved = 0;
  for (const model of ALL_MODELS) {
    const glbUrl = `/images/products/${model.cat}/${model.file}`;
    console.log(`  🎨 [${saved+1}/${ALL_MODELS.length}] ${model.cat}/${model.file}`);
    
    try {
      const dataUrl = await page.evaluate(async (url, cat) => {
        return await window.renderGLB(url, cat);
      }, glbUrl, model.cat.split('/')[0]);

      if (dataUrl) {
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        const outPath = path.join(PREVIEW_DIR, model.preview);
        fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
        console.log(`     ✅ → ${model.preview}`);
        saved++;
      }
    } catch (e) {
      console.warn(`     ⚠️ Failed: ${e.message?.substring(0,100)}`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n🎉 Done! Saved ${saved}/${ALL_MODELS.length} preview images.`);
  await browser.close();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
