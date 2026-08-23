import urllib.request
import json

def check_repo(repo):
    for b in ['main', 'master', 'dev']:
        url = f'https://api.github.com/repos/{repo}/git/trees/{b}?recursive=1'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                for t in data.get('tree', []):
                    p = t.get('path', '')
                    if p.lower().endswith('.glb') or p.lower().endswith('.gltf'):
                        raw = f'https://raw.githubusercontent.com/{repo}/{b}/{p}'
                        size = t.get('size', 0)
                        print(f'FOUND: {repo} -> {p} ({size} B) -> {raw}')
                return
        except Exception:
            continue

repos = [
    'adrianhajdin/project_threejs_ai',
    'wass08/r3f-t-shirt-configurator',
    'shashwat-tiwari/3D-T-Shirt-Customizer',
    'karan-k-dev/ThreeJS-T-Shirt-Customizer',
    'tapiocode/threejs-t-shirt-customizer',
    'alirezakhoshkhoo/threejs-clothes-configurator',
    'pmndrs/market-assets',
    'jeeliz/jeelizFaceFilter',
    'WebAR-rocks/WebAR.rocks.face',
    'hiukim/mind-ar-js',
    'google/model-viewer',
    'KhronosGroup/glTF-Sample-Assets',
    'readyplayerme/visage',
    'readyplayerme/rpm-unity-sdk-avatar-creator'
]

for r in repos:
    check_repo(r)
