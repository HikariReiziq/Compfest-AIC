import urllib.request
import re
import json

urls = [
    "https://github.com/MetaFactoryAI/mf-wearables/tree/main",
    "https://github.com/webaverse-studios/CharacterCreator/tree/main/public",
    "https://github.com/webaverse/app/tree/master/public",
    "https://github.com/webaverse-studios/CharacterCreator/tree/main",
    "https://github.com/pmndrs/market-assets/tree/main/models",
    "https://github.com/AvatarParzival/3d/tree/main/public"
]

def get_page(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read().decode('utf-8')
    except Exception as e:
        return ""

found = []
for u in urls:
    html = get_page(u)
    matches = re.findall(r'href="(/[^"]+?\.(?:glb|gltf))"', html)
    for m in set(matches):
        if "/blob/" in m:
            raw_url = "https://raw.githubusercontent.com" + m.replace("/blob/", "/")
            found.append({"repo_page": u, "raw_url": raw_url, "file": m.split('/')[-1]})

print(f"Scraped {len(found)} wearable models!")
for f in found:
    print(f" * {f['file']} -> {f['raw_url']}")

with open("scratch/wearables_scraped.json", "w") as fp:
    json.dump(found, fp, indent=2)
