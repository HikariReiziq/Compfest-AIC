import urllib.request
import json
import time

repos_to_check = [
    ('pmndrs', 'market-assets'),
    ('KhronosGroup', 'glTF-Sample-Assets'),
    ('KhronosGroup', 'glTF-Sample-Models'),
    ('mrdoob', 'three.js'),
    ('google', 'model-viewer'),
    ('alperenuzun', 'basic-virtual-tryon-glasses'),
    ('estephanobrusa', 'GlassesTryOn'),
    ('QHarshil', 'FaceFit-AR-Based-Virtual-Accessory-Try-On'),
    ('EMTIAZ-RUET', 'face-filter-app'),
    ('akhil15123', 'lingua_lens'),
    ('FrancescoCastaldi', 'mini-jersey-studio'),
    ('Siddu7077', '3D-model'),
    ('readyplayerme', 'visage'),
    ('readyplayerme', 'rpm-unity-sdk-avatar-creator'),
    ('SuboptimalEng', 'three-js-games'),
    ('tamani-moussa', 'threejs-3d-model-react'),
    ('adrianhajdin', 'project_threejs_ai'),
    ('wass08', 'r3f-t-shirt-configurator'),
    ('wass08', 'threejs-clothing-configurator'),
    ('anurag-327', '3d-tshirt-design-customizer'),
    ('VatsalArya', 'Virtual-Dressing-Room'),
    ('AvaterStore', 'avatars'),
    ('aframevr', 'aframe'),
    ('fernandojsg', 'a-frame-car-showcase'),
    ('felixturner', 'bad-tv-shader'),
    ('Baron-Davis', '3D-Cloth-Simulation-ThreeJS'),
    ('jfcavalcante', 'threejs-cloth-simulation'),
    ('jeeliz', 'jeelizFaceFilter'),
    ('WebAR-rocks', 'WebAR.rocks.face'),
    ('WebAR-rocks', 'WebAR.rocks.object-detection'),
    ('bensonruan', 'Virtual-Glasses-Try-on'),
    ('hiukim', 'mind-ar-js'),
    ('hiukim', 'mind-ar-js-react'),
    ('deepankar-02', '3d-tshirt-website'),
    ('Rohit-Saini7', 'Three.js-3D-Tshirt-Customizer'),
    ('shashwat-tiwari', '3D-T-Shirt-Customizer'),
    ('karan-k-dev', 'ThreeJS-T-Shirt-Customizer'),
    ('tapiocode', 'threejs-t-shirt-customizer'),
    ('alirezakhoshkhoo', 'threejs-clothes-configurator'),
    ('pranjal-barnwal', '3d-t-shirt-customizer-threejs')
]

found_models = []

for owner, repo in repos_to_check:
    for branch in ['main', 'master', 'dev']:
        url = f'https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                for t in data.get('tree', []):
                    path = t.get('path', '')
                    lower = path.lower()
                    if lower.endswith('.glb') or lower.endswith('.gltf'):
                        # Check relevance
                        raw_url = f'https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}'
                        size = t.get('size', 0)
                        found_models.append({
                            'repo': f'{owner}/{repo}',
                            'branch': branch,
                            'path': path,
                            'url': raw_url,
                            'size': size
                        })
                print(f'Checked {owner}/{repo} ({branch}): found {len(data.get("tree", []))} files')
                break
        except Exception as e:
            continue
    time.sleep(0.5)

print(f'\n=== TOTAL 3D MODELS FOUND: {len(found_models)} ===')
for m in found_models:
    print(f"[{m['size']} B] {m['repo']} -> {m['path']}")

with open('scratch/detailed_found_models.json', 'w') as f:
    json.dump(found_models, f, indent=2)
