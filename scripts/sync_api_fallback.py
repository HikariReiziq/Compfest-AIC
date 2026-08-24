import json
import re

with open("c:/Users/hikar/Compfest-AIC/ai_engine/data/catalog.json", "r", encoding="utf-8") as f:
    catalog = json.load(f)

# Group by subcategory/gender
items = catalog["items"]

def get_archetype_info(idx):
    archetypes = [
        ("perfect_match", "Pilihan 1: The Perfect Match (#1 Best Fit)", 97.2, 98.0, 96.0),
        ("safe_classic", "Pilihan 2: Safe Classic (Pilihan Serbaguna)", 92.5, 94.0, 91.0),
        ("bold_statement", "Pilihan 3: Bold Statement (Aksen Kontras)", 89.0, 91.0, 87.0),
        ("modern_trendy", "Pilihan 4: Modern Silhouette (Tren Terkini)", 86.5, 88.0, 85.0)
    ]
    return archetypes[idx % len(archetypes)]

fallback_items = []
for idx, it in enumerate(items):
    arch, arch_title, comp, col_score, shape_score = get_archetype_info(idx)
    entry = {
        "rank": (idx % 4) + 1,
        "archetype": arch,
        "archetype_title": arch_title,
        "id": it["id"],
        "name": it["name"],
        "category": it["category"],
        "subcategory": it["subcategory"],
        "base_colour": it["baseColour"],
        "hex_colour": it["hex_colour"],
        "usage": it["usage"],
        "model_3d_path": it["model_3d_path"],
        "preview_image_url": it["preview_image_url"],
        "price_idr": it["priceIdr"],
        "compatibility_score": comp,
        "color_match_score": col_score,
        "shape_match_score": shape_score,
        "stylist_reason": it["description"]
    }
    fallback_items.append(entry)

ts_content = "export const FALLBACK_CATALOG: RecommendationItem[] = " + json.dumps(fallback_items, indent=2, ensure_ascii=False) + ";\n"

# Replace in client/src/lib/api.ts
api_file = "c:/Users/hikar/Compfest-AIC/client/src/lib/api.ts"
with open(api_file, "r", encoding="utf-8") as f:
    content = f.read()

# Replace FALLBACK_CATALOG definition
pattern = r"export const FALLBACK_CATALOG: RecommendationItem\[\] = \[[\s\S]*?\n\];"
new_content = re.sub(pattern, ts_content.strip(), content)

with open(api_file, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated FALLBACK_CATALOG in client/src/lib/api.ts successfully!")
