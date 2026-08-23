import urllib.request
import re
import json

urls_to_scrape = [
    "https://github.com/google/model-viewer/tree/master/packages/shared-assets/models",
    "https://github.com/SuboptimalEng/three-js-games/tree/main/public/models",
    "https://github.com/Rohit-Saini7/Three.js-3D-Tshirt-Customizer/tree/main/public",
    "https://github.com/deepankar-02/3d-tshirt-website/tree/main/public",
    "https://github.com/karan-k-dev/ThreeJS-T-Shirt-Customizer/tree/main/public",
    "https://github.com/shashwat-tiwari/3D-T-Shirt-Customizer/tree/master/client/public",
    "https://github.com/wass08/threejs-clothing-configurator/tree/main/public/models",
    "https://github.com/wass08/threejs-clothing-configurator/tree/master/public/models",
    "https://github.com/tamani-moussa/threejs-3d-model-react/tree/main/public",
    "https://github.com/pranjal-barnwal/3d-t-shirt-customizer-threejs/tree/main/public",
    "https://github.com/Baron-Davis/3D-Cloth-Simulation-ThreeJS/tree/master",
    "https://github.com/jfcavalcante/threejs-cloth-simulation/tree/main",
    "https://github.com/jeeliz/jeelizFaceFilter/tree/master/demos/threejs",
    "https://github.com/hiukim/mind-ar-js/tree/master/examples/face-tracking/assets",
    "https://github.com/hiukim/mind-ar-js/tree/master/examples/image-tracking/assets",
    "https://github.com/pmndrs/market-assets/tree/main/models"
]

def get_page(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read().decode('utf-8')
    except Exception as e:
        return ""

found = []
for u in urls_to_scrape:
    html = get_page(u)
    matches = re.findall(r'href="(/[^"]+?\.(?:glb|gltf))"', html)
    for m in set(matches):
        if "/blob/" in m:
            raw_url = "https://raw.githubusercontent.com" + m.replace("/blob/", "/")
            found.append({"repo_page": u, "raw_url": raw_url, "file": m.split('/')[-1]})

print(f"Scraped {len(found)} more models!")
for f in found:
    print(f" * {f['file']} -> {f['raw_url']}")

with open("scratch/more_scraped_glbs.json", "w") as fp:
    json.dump(found, fp, indent=2)
