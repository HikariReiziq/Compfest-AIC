import os
import json
import re

products_dir = r"c:\Users\hikar\Compfest-AIC\client\public\images\products"
catalog_path = r"c:\Users\hikar\Compfest-AIC\ai_engine\data\catalog.json"

def clean_title(filename):
    name = os.path.splitext(filename)[0]
    # Remove prefix like glasses_01_ or hat_21_
    cleaned = re.sub(r'^(glasses|hat|shirt)_\d+_?', '', name)
    cleaned = cleaned.replace('_', ' ').replace('-', ' ').title()
    if not cleaned:
        cleaned = name.title()
    return cleaned

CATEGORIES_INFO = {
    "glasses": {
        "cat": "Accessories",
        "prefix": "glass",
        "default_price": 349000,
        "colors": [
            ("Gold", "#D4AF37"), ("Charcoal Grey", "#36454F"), ("Terracotta", "#E2725B"), 
            ("Navy Blue", "#000080"), ("Amber Brown", "#B45309"), ("Silver Chrome", "#E5E7EB"),
            ("Emerald Green", "#059669"), ("Matte Black", "#18181B"), ("Rose Gold", "#FB7185"),
            ("Gunmetal", "#475569"), ("Crystal Blush", "#F472B6"), ("Tortoise Shell", "#78350F")
        ],
        "usages": ["Casual", "Formal", "Party", "Sports", "Streetwear"]
    },
    "hats": {
        "cat": "Accessories",
        "prefix": "hat",
        "default_price": 280000,
        "colors": [
            ("Straw Natural", "#D97706"), ("Charcoal Grey", "#374151"), ("Midnight Navy", "#0F172A"),
            ("Crimson Red", "#991B1B"), ("Olive Green", "#4D7C0F"), ("Chalk White", "#F8FAFC"),
            ("Cobalt Blue", "#2563EB"), ("Khaki Sand", "#D97706"), ("Pitch Black", "#09090B")
        ],
        "usages": ["Casual", "Streetwear", "Sports", "Formal"]
    },
    "shirts": {
        "cat": "Apparel",
        "prefix": "shirt",
        "default_price": 320000,
        "colors": [
            ("Chalk White", "#F8FAFC"), ("Navy Blue", "#1E3A8A"), ("Charcoal Black", "#18181B"),
            ("Heather Grey", "#64748B"), ("Sage Green", "#059669"), ("Crimson Red", "#DC2626"),
            ("Warm Beige", "#D97706"), ("Sky Blue", "#0284C7"), ("Midnight Black", "#09090B")
        ],
        "usages": ["Casual", "Streetwear", "Formal", "Sports"]
    }
}

all_items = []

for subcat, meta in CATEGORIES_INFO.items():
    sub_dir = os.path.join(products_dir, subcat)
    if not os.path.exists(sub_dir):
        continue
    
    files = sorted([f for f in os.listdir(sub_dir) if f.endswith('.glb')])
    print(f"Processing {len(files)} items for {subcat}...")
    
    for idx, f in enumerate(files, start=1):
        item_id = f"{meta['prefix']}-{idx:02d}"
        raw_name = clean_title(f)
        
        # Add brand/style polish to name
        if subcat == "glasses":
            name = f"{raw_name} Designer Eyewear"
        elif subcat == "hats":
            name = f"{raw_name} Headwear"
        else:
            name = f"{raw_name} 3D Apparel"
            
        color_name, hex_code = meta["colors"][(idx - 1) % len(meta["colors"])]
        usage = meta["usages"][(idx - 1) % len(meta["usages"])]
        price_val = meta["default_price"] + ((idx * 37000) % 350000)
        price_idr = f"Rp{price_val:,.0f}".replace(",", ".")
        
        comp_score = round(98.5 - ((idx * 1.7) % 14.0), 1)
        color_score = round(99.0 - ((idx * 2.3) % 15.0), 1)
        shape_score = round(97.0 - ((idx * 1.9) % 13.0), 1)
        
        reason = f"Skor keserasian {comp_score}%. Nuansa {color_name} menyatu serasi dengan karakter undertone dan siluet proporsional {subcat} menyeimbangkan postur tubuh Anda."
        
        item = {
            "id": item_id,
            "name": name,
            "category": meta["cat"],
            "subcategory": subcat,
            "base_colour": color_name,
            "hex_colour": hex_code,
            "usage": usage,
            "model_3d_path": f"/images/products/{subcat}/{f}",
            "preview_image_url": f"/images/products/preview/{item_id}.png",
            "price_idr": price_idr,
            "compatibility_score": comp_score,
            "color_match_score": color_score,
            "shape_match_score": shape_score,
            "stylist_reason": reason,
            "model_type": subcat
        }
        all_items.append(item)

catalog_data = {
    "version": "3.0.0",
    "total_products": len(all_items),
    "items": all_items
}

with open(catalog_path, "w", encoding="utf-8") as f:
    json.dump(catalog_data, f, indent=2, ensure_ascii=False)

print(f"\nSuccessfully generated {len(all_items)} catalog items in {catalog_path}!")
