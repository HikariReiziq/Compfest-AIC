import urllib.request
import re
import json

def get_page(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read().decode('utf-8')
    except Exception as e:
        return ""

urls_to_crawl = [
    "https://github.com/gm3/boomboxheads-v2-assets/tree/main",
    "https://github.com/mozilla/hackweek-avatar-maker/tree/master/public/models",
    "https://github.com/pmndrs/market-assets/tree/main/models",
    "https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models",
    "https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf",
    "https://github.com/alperenuzun/basic-virtual-tryon-glasses/tree/master/public/obj",
    "https://github.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/tree/main/frontend/public/models",
    "https://github.com/EMTIAZ-RUET/face-filter-app/tree/master/models",
    "https://github.com/estephanobrusa/GlassesTryOn/tree/main/public/models",
    "https://github.com/estephanobrusa/GlassesTryOn/tree/main/packages/demo/public/models",
    "https://github.com/adrianhajdin/project_threejs_ai/tree/main/client/public",
    "https://github.com/FrancescoCastaldi/mini-jersey-studio/tree/master/models",
    "https://github.com/Siddu7077/3D-model/tree/main"
]

all_found = []

for u in urls_to_crawl:
    html = get_page(u)
    # find links ending in .glb or .gltf
    matches = re.findall(r'href="(/[^"]+?\.(?:glb|gltf))"', html)
    for m in set(matches):
        if "/blob/" in m:
            raw_url = "https://raw.githubusercontent.com" + m.replace("/blob/", "/")
            all_found.append({"repo_page": u, "blob_url": m, "raw_url": raw_url})

print(f"Total files found: {len(all_found)}")
for item in all_found:
    print(item["raw_url"])

with open("scratch/scraped_glbs.json", "w") as f:
    json.dump(all_found, f, indent=2)
