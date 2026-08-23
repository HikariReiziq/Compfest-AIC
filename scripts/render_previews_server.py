import http.server
import socketserver
import os
import urllib.parse
import json
import base64
import subprocess
import time

PORT = 8999
BASE_DIR = r"c:\Users\hikar\Compfest-AIC"
PUBLIC_DIR = os.path.join(BASE_DIR, "client", "public")
PREVIEW_DIR = os.path.join(PUBLIC_DIR, "images", "products", "preview")
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
CATALOG_PATH = os.path.join(BASE_DIR, "ai_engine", "data", "catalog.json")

os.makedirs(PREVIEW_DIR, exist_ok=True)

class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/save-image'):
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            filename = params.get('filename', ['snapshot.png'])[0]
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            
            if ',' in body:
                body = body.split(',', 1)[1]
                
            img_data = base64.b64decode(body)
            target_path = os.path.join(PREVIEW_DIR, filename)
            with open(target_path, 'wb') as f:
                f.write(img_data)
                
            print(f"Saved snapshot: {filename} ({len(img_data):,} bytes)")
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"success": true}')
            return
            
        super().do_POST()

    def translate_path(self, path):
        clean_path = urllib.parse.urlparse(path).path
        if clean_path == '/' or clean_path == '/renderer.html':
            return os.path.join(SCRIPTS_DIR, 'renderer.html')
        if clean_path == '/catalog.json':
            return CATALOG_PATH
        # Remove leading slash
        rel = clean_path.lstrip('/')
        return os.path.join(PUBLIC_DIR, rel)

def run_server():
    server = socketserver.TCPServer(("", PORT), PreviewHandler)
    server.allow_reuse_address = True
    print(f"Snapshot server running at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    run_server()
