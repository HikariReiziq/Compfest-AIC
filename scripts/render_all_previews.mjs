import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.resolve(__dirname, '../client/public');
const PREVIEW_DIR = path.resolve(PUBLIC_DIR, 'images/products/preview');
const CATALOG_PATH = path.resolve(__dirname, '../ai_engine/data/catalog.json');

if (!fs.existsSync(PREVIEW_DIR)) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
const items = catalog.items;

console.log(`Preparing to render 2D snapshots for ${items.length} 3D GLB products...`);

// Simple static HTTP server to serve GLB files and three.js to browser
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/save-image')) {
    const urlParams = new URL(req.url, 'http://localhost:8999').searchParams;
    const filename = urlParams.get('filename');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const base64Data = body.replace(/^data:image\/png;base64,/, '');
      const filePath = path.join(PREVIEW_DIR, filename);
      fs.writeFileSync(filePath, base64Data, 'base64');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, file: filename }));
    });
    return;
  }

  // Serve static files
  let safePath = path.normalize(req.url.split('?')[0]);
  if (safePath === '/') safePath = '/renderer.html';
  
  let filePath;
  if (safePath === '/renderer.html') {
    filePath = path.join(__dirname, 'renderer.html');
  } else {
    filePath = path.join(PUBLIC_DIR, safePath);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
      '.bin': 'application/octet-stream',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + req.url);
  }
});

const PORT = 8999;
server.listen(PORT, async () => {
  console.log(`Preview renderer server running on http://localhost:${PORT}`);

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.goto(`http://localhost:${PORT}/renderer.html`, { waitUntil: 'networkidle0' });

    // Send item list to browser for rendering
    await page.evaluate(async (itemsList) => {
      window.startBatchRender(itemsList);
    }, items);

    // Wait for rendering to complete
    await page.waitForFunction(() => window.renderComplete === true, { timeout: 300000 });

    console.log('All 2D preview snapshots rendered and saved successfully!');
    await browser.close();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Renderer execution error:', err);
    server.close();
    process.exit(1);
  }
});
