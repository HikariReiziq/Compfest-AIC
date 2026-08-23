import urllib.request
import urllib.parse
import json
import time
import os

searches = [
    'sunglasses glb',
    'face-tracking glb',
    '3d shirt glb',
    '3d tshirt glb',
    'tshirt threejs glb',
    'cap glb',
    'hat glb',
    'avatar clothes glb',
    'threejs shirt glb',
    'threejs tshirt',
    'virtual try on glb',
    'face filter glb'
]

found_repos = []
for q in searches:
    url = 'https://api.github.com/search/repositories?q=' + urllib.parse.quote(q) + '&sort=stars&order=desc&per_page=15'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            for r in data.get('items', []):
                full_name = r['full_name']
                if full_name not in found_repos:
                    found_repos.append(full_name)
    except Exception as e:
        print('Error searching:', q, e)
    time.sleep(1)

print('Total candidate repos found:', len(found_repos))

all_glb_files = []
for repo in found_repos:
    for branch in ['main', 'master']:
        url = f'https://api.github.com/repos/{repo}/git/trees/{branch}?recursive=1'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                for t in data.get('tree', []):
                    path = t.get('path', '')
                    if path.lower().endswith('.glb'):
                        raw_url = f'https://raw.githubusercontent.com/{repo}/{branch}/{path}'
                        size = t.get('size', 0)
                        all_glb_files.append({'repo': repo, 'path': path, 'url': raw_url, 'size': size})
                break
        except Exception:
            continue

print('Total GLB files found in candidate repos:', len(all_glb_files))
for g in all_glb_files:
    print(f"[{g['size']} B] {g['repo']} -> {g['path']}")

with open('scratch/found_glbs.json', 'w') as f:
    json.dump(all_glb_files, f, indent=2)
