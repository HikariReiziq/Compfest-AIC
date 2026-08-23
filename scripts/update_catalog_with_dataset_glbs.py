import os
import json

base_client_dir = r"c:\Users\hikar\Compfest-AIC\client\public\images\products"

# Clean any non-GLB files in products folder (except preview directory which has svgs)
for cat in ["glasses", "hats", "shirts", "jackets"]:
    cat_dir = os.path.join(base_client_dir, cat)
    if os.path.exists(cat_dir):
        if cat == "jackets":
            import shutil
            shutil.rmtree(cat_dir)
            continue
        for f in os.listdir(cat_dir):
            if not f.lower().endswith(".glb"):
                os.remove(os.path.join(cat_dir, f))
                print(f"Cleaned non-glb file: {cat}/{f}")

# Rebuild catalog.json with the 60 authentic dataset GLB entries
from download_authentic_dataset_glbs import DATASET_MODELS

catalog_items = []

# Glasses metadata (colors, prices, archetypes, shapes)
glass_colors = ["Black", "Gold", "Rose Gold", "Charcoal", "Havana Amber", "Antique Gold", "Burgundy", "Matte Black", "Silver", "Gunmetal", "Tortoise", "Crystal Blush", "Brushed Chrome", "Navy Blue", "Deep Teal", "Olive Green", "Copper", "Platinum", "Smoky Grey", "Titanium"]
glass_hexes = ["#111827", "#D4AF37", "#B76E79", "#374151", "#78350F", "#C5A059", "#800020", "#18181B", "#94A3B8", "#475569", "#854D0E", "#F472B6", "#CBD5E1", "#1E3A8A", "#0D9488", "#3F6212", "#B45309", "#E2E8F0", "#4B5563", "#64748B"]

for idx, entry in enumerate(DATASET_MODELS["glasses"]):
    item_id = entry[0]
    name = entry[1]
    filename = entry[2]
    catalog_items.append({
        "id": item_id,
        "name": name,
        "category": "glasses",
        "subcategory": "glasses",
        "baseColour": glass_colors[idx % len(glass_colors)],
        "hexColour": glass_hexes[idx % len(glass_hexes)],
        "usage": "Casual" if idx % 2 == 0 else "Formal",
        "priceIdr": f"Rp{289000 + (idx * 35000):,}".replace(",", "."),
        "model3dPath": f"/images/products/glasses/{filename}",
        "previewImageUrl": f"/images/products/preview/{item_id}.svg",
        "articleType": "Eyewear",
        "modelType": "glasses",
        "datasetSource": "Real 3D Dataset (Khronos/RayBan/FaceFit/Sketchfab)"
    })

# Hats metadata
hat_colors = ["Straw Natural", "Charcoal Grey", "Navy Blue", "Crimson Red", "Khaki Tan", "Midnight Black", "Alpine White", "Olive Green", "Forest Green", "Slate Grey", "Camel Tan", "Deep Navy", "Burgundy", "Chalk White", "Earthy Brown", "Mustard Gold", "Terracotta", "Denim Blue", "Sage Green", "Charcoal"]
hat_hexes = ["#D97706", "#374151", "#1E3A8A", "#991B1B", "#A16207", "#0F172A", "#F8FAFC", "#3F6212", "#14532D", "#475569", "#78350F", "#172554", "#831843", "#F1F5F9", "#581C87", "#CA8A04", "#C2410C", "#1D4ED8", "#15803D", "#1E293B"]

for idx, entry in enumerate(DATASET_MODELS["hats"]):
    item_id = entry[0]
    name = entry[1]
    filename = entry[2]
    catalog_items.append({
        "id": item_id,
        "name": name,
        "category": "hats",
        "subcategory": "hats",
        "baseColour": hat_colors[idx % len(hat_colors)],
        "hexColour": hat_hexes[idx % len(hat_hexes)],
        "usage": "Casual" if idx % 2 == 0 else "Streetwear",
        "priceIdr": f"Rp{199000 + (idx * 25000):,}".replace(",", "."),
        "model3dPath": f"/images/products/hats/{filename}",
        "previewImageUrl": f"/images/products/preview/{item_id}.svg",
        "articleType": "Headwear",
        "modelType": "hats",
        "datasetSource": "Real 3D Dataset (MetaFactory/ThreeJS/FaceFilter)"
    })

# Shirts metadata
shirt_colors = ["Chalk White", "Navy Blue", "Charcoal Black", "Heather Grey", "Olive Green", "Burgundy Red", "Earthy Sand", "Deep Forest", "Royal Indigo", "Vintage Cream", "Terracotta", "Graphite", "Cobalt Blue", "Washed Olive", "Mustard Ochre", "Mocha Brown", "Pastel Sage", "Sunset Coral", "Midnight Blue", "Oatmeal Melange"]
shirt_hexes = ["#F8FAFC", "#1E3A8A", "#18181B", "#64748B", "#3F6212", "#991B1B", "#A16207", "#14532D", "#312E81", "#FEF3C7", "#C2410C", "#334155", "#2563EB", "#4D7C0F", "#CA8A04", "#713F12", "#0D9488", "#EA580C", "#0F172A", "#E2E8F0"]

for idx, entry in enumerate(DATASET_MODELS["shirts"]):
    item_id = entry[0]
    name = entry[1]
    filename = entry[2]
    catalog_items.append({
        "id": item_id,
        "name": name,
        "category": "shirts",
        "subcategory": "shirts",
        "baseColour": shirt_colors[idx % len(shirt_colors)],
        "hexColour": shirt_hexes[idx % len(shirt_hexes)],
        "usage": "Casual" if idx % 2 == 0 else "Formal",
        "priceIdr": f"Rp{249000 + (idx * 30000):,}".replace(",", "."),
        "model3dPath": f"/images/products/shirts/{filename}",
        "previewImageUrl": f"/images/products/preview/{item_id}.svg",
        "articleType": "Tops",
        "modelType": "shirts",
        "datasetSource": "Real 3D Dataset (MetaFactory/Adrian ThreeJS/Francesco Studio)"
    })

with open(r"c:\Users\hikar\Compfest-AIC\ai_engine\data\catalog.json", "w", encoding="utf-8") as f:
    json.dump({"items": catalog_items}, f, indent=2)

print(f"Wrote {len(catalog_items)} authentic dataset items to catalog.json!")
