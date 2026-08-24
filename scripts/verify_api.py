import urllib.request
import json

try:
    with urllib.request.urlopen("http://localhost:8000/api/v1/recommend/catalog/shirts") as res:
        data = json.loads(res.read())
        items = data.get("items", [])
        print(f"Total shirts received from backend: {len(items)}")
        for it in items[:5]:
            print(f"- [{it.get('id')}] {it.get('name')} | Warna: {it.get('baseColour')} | Hex: {it.get('hex_colour')}")
except Exception as e:
    print(f"Error fetching: {e}")
