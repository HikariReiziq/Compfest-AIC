import os
import urllib.request
import json
import shutil
import re

base_client_dir = r"c:\Users\hikar\Compfest-AIC\client\public\images\products"
catalog_file_path = r"c:\Users\hikar\Compfest-AIC\ai_engine\data\catalog.json"
preview_dir = os.path.join(base_client_dir, "preview")

# 1. Authentic Open-Source 3D Datasets
MASTER_DATASETS = {
    "glasses": [
        {
            "id": "glass-01",
            "name": "Khronos PBR Designer Eyewear",
            "filename": "glasses_01_khronos_pbr.glb",
            "url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SunglassesKhronos/glTF-Binary/SunglassesKhronos.glb",
            "model_type": "wayfarer",
            "base_colour": "Gold",
            "hex_colour": "#D4AF37",
            "usage": "Casual",
            "price_idr": "Rp349.000",
            "flattering_face_shapes": ["Round", "Oval", "Heart"],
            "style_tags": ["wayfarer", "pbr", "gold", "designer"]
        },
        {
            "id": "glass-02",
            "name": "Ray-Ban Aviator Pilot Edition",
            "filename": "glasses_02_rayban_pilot.glb",
            "url": "https://raw.githubusercontent.com/akhil15123/lingua_lens/main/rayban_sunglasses.glb",
            "model_type": "aviator",
            "base_colour": "Charcoal Grey",
            "hex_colour": "#36454F",
            "usage": "Formal",
            "price_idr": "Rp450.000",
            "flattering_face_shapes": ["Square", "Heart", "Oval"],
            "style_tags": ["aviator", "pilot", "classic", "titanium"]
        },
        {
            "id": "glass-03",
            "name": "FaceFit Urban Geometric Frame",
            "filename": "glasses_03_facefit_geometric.glb",
            "url": "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses1.glb",
            "model_type": "geometric",
            "base_colour": "Terracotta",
            "hex_colour": "#E2725B",
            "usage": "Party",
            "price_idr": "Rp389.000",
            "flattering_face_shapes": ["Round", "Oval"],
            "style_tags": ["geometric", "terracotta", "modern", "party"]
        },
        {
            "id": "glass-04",
            "name": "FaceFit Executive Browline",
            "filename": "glasses_04_facefit_browline.glb",
            "url": "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses2.glb",
            "model_type": "browline",
            "base_colour": "Navy Blue",
            "hex_colour": "#1E3A8A",
            "usage": "Formal",
            "price_idr": "Rp429.000",
            "flattering_face_shapes": ["Diamond", "Square", "Oval"],
            "style_tags": ["browline", "executive", "formal", "acetate"]
        },
        {
            "id": "glass-05",
            "name": "FaceFit Titanium Slim Aviator",
            "filename": "glasses_05_facefit_slim_aviator.glb",
            "url": "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses3.glb",
            "model_type": "aviator",
            "base_colour": "Silver Chrome",
            "hex_colour": "#E5E7EB",
            "usage": "Casual",
            "price_idr": "Rp379.000",
            "flattering_face_shapes": ["Square", "Heart", "Oval"],
            "style_tags": ["aviator", "slim", "silver", "minimalist"]
        },
        {
            "id": "glass-06",
            "name": "FaceFit Bold Horn-Rimmed Frame",
            "filename": "glasses_06_facefit_hornrimmed.glb",
            "url": "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses4.glb",
            "model_type": "rectangular",
            "base_colour": "Pitch Black",
            "hex_colour": "#18181B",
            "usage": "Formal",
            "price_idr": "Rp399.000",
            "flattering_face_shapes": ["Round", "Oval"],
            "style_tags": ["horn-rimmed", "bold", "black", "classic"]
        },
        {
            "id": "glass-07",
            "name": "SunFit Polarized Sport Wrap",
            "filename": "glasses_07_sunfit_sport.glb",
            "url": "https://raw.githubusercontent.com/EMTIAZ-RUET/face-filter-app/main/models/sun_glasses_fbx_346kb.glb",
            "model_type": "sport",
            "base_colour": "Emerald Green",
            "hex_colour": "#059669",
            "usage": "Sports",
            "price_idr": "Rp320.000",
            "flattering_face_shapes": ["Oval", "Square", "Round"],
            "style_tags": ["sport", "wrap", "polarized", "active"]
        }
    ],
    "hats": [
        {
            "id": "hat-01",
            "name": "Luffy Heritage Straw Hat",
            "filename": "hat_01_luffy_straw.glb",
            "url": "https://raw.githubusercontent.com/EMTIAZ-RUET/face-filter-app/main/models/luffy_hat.glb",
            "model_type": "straw",
            "base_colour": "Straw Natural",
            "hex_colour": "#D97706",
            "usage": "Casual",
            "price_idr": "Rp290.000",
            "flattering_face_shapes": ["Square", "Heart", "Oval"],
            "style_tags": ["straw", "heritage", "anime", "summer"]
        },
        {
            "id": "hat-02",
            "name": "MetaFactory Gitcoin Ribbed Beanie",
            "filename": "hat_02_gitcoin_beanie.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/22/Gitcoin-Beanie.glb",
            "model_type": "beanie",
            "base_colour": "Charcoal Grey",
            "hex_colour": "#374151",
            "usage": "Streetwear",
            "price_idr": "Rp280.000",
            "flattering_face_shapes": ["Oval", "Round", "Diamond"],
            "style_tags": ["beanie", "ribbed", "streetwear", "cozy"]
        },
        {
            "id": "hat-03",
            "name": "MetaFactory Nordic Blue Thermal Beanie",
            "filename": "hat_03_blue_beanie.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/18/18_blue_beanie.glb",
            "model_type": "beanie",
            "base_colour": "Navy Blue",
            "hex_colour": "#1E3A8A",
            "usage": "Casual",
            "price_idr": "Rp260.000",
            "flattering_face_shapes": ["Oval", "Round", "Square"],
            "style_tags": ["beanie", "thermal", "blue", "winter"]
        },
        {
            "id": "hat-04",
            "name": "MetaFactory Streetwear Snapback 57",
            "filename": "hat_04_street_snapback.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/57/57_hat.glb",
            "model_type": "cap",
            "base_colour": "Crimson Red",
            "hex_colour": "#991B1B",
            "usage": "Streetwear",
            "price_idr": "Rp320.000",
            "flattering_face_shapes": ["Round", "Oval", "Heart"],
            "style_tags": ["snapback", "flat-brim", "streetwear", "urban"]
        },
        {
            "id": "hat-05",
            "name": "MetaFactory Harajuku Urban Cap 161",
            "filename": "hat_05_urban_cap.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/161/161_hat.glb",
            "model_type": "cap",
            "base_colour": "Pitch Black",
            "hex_colour": "#09090B",
            "usage": "Casual",
            "price_idr": "Rp310.000",
            "flattering_face_shapes": ["Oval", "Square", "Round"],
            "style_tags": ["cap", "harajuku", "urban", "baseball"]
        }
    ],
    "shirts": [
        {
            "id": "shirt-01",
            "name": "Adrian 3D Heavyweight Baked Supima Tee",
            "filename": "shirt_01_adrian_baked_tee.glb",
            "url": "https://raw.githubusercontent.com/adrianhajdin/project_threejs_ai/main/client/public/shirt_baked.glb",
            "model_type": "tshirt",
            "base_colour": "Chalk White",
            "hex_colour": "#F8FAFC",
            "usage": "Casual",
            "price_idr": "Rp280.000",
            "flattering_body_shapes": ["Hourglass", "Rectangle", "Inverted Triangle", "Pear", "Apple"],
            "style_tags": ["tshirt", "supima", "baked", "creases", "essential"]
        },
        {
            "id": "shirt-02",
            "name": "Francesco 3D Athletic Jersey Shirt",
            "filename": "shirt_02_francesco_jersey.glb",
            "url": "https://raw.githubusercontent.com/FrancescoCastaldi/mini-jersey-studio/master/models/shirt.glb",
            "model_type": "jersey",
            "base_colour": "Navy Blue",
            "hex_colour": "#1E3A8A",
            "usage": "Sports",
            "price_idr": "Rp320.000",
            "flattering_body_shapes": ["Inverted Triangle", "Rectangle", "Hourglass"],
            "style_tags": ["jersey", "athletic", "breathable", "sports"]
        },
        {
            "id": "shirt-03",
            "name": "MetaFactory 3D Boxy Streetwear Hoodie 51",
            "filename": "shirt_03_mf_hoodie_51.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/51/51_hoodie_a.glb",
            "model_type": "hoodie",
            "base_colour": "Charcoal Black",
            "hex_colour": "#18181B",
            "usage": "Streetwear",
            "price_idr": "Rp590.000",
            "flattering_body_shapes": ["Rectangle", "Pear", "Inverted Triangle"],
            "style_tags": ["hoodie", "boxy", "streetwear", "heavyweight"]
        },
        {
            "id": "shirt-04",
            "name": "MetaFactory 3D Heavyweight Pullover Hoodie 106",
            "filename": "shirt_04_mf_hoodie_106.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/106/106_hoodie_t.glb",
            "model_type": "hoodie",
            "base_colour": "Warm Beige",
            "hex_colour": "#D97706",
            "usage": "Casual",
            "price_idr": "Rp570.000",
            "flattering_body_shapes": ["Hourglass", "Rectangle", "Pear"],
            "style_tags": ["hoodie", "pullover", "earth-tone", "comfort"]
        },
        {
            "id": "shirt-05",
            "name": "MetaFactory 3D Relaxed Streetwear Hoodie 64",
            "filename": "shirt_05_mf_hoodie_64.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/64/64_hoodie_a.glb",
            "model_type": "hoodie",
            "base_colour": "Olive Green",
            "hex_colour": "#4D7C0F",
            "usage": "Casual",
            "price_idr": "Rp550.000",
            "flattering_body_shapes": ["Inverted Triangle", "Rectangle", "Apple"],
            "style_tags": ["hoodie", "relaxed", "olive", "streetwear"]
        },
        {
            "id": "shirt-06",
            "name": "MetaFactory 3D Oversized Pullover Hoodie 80",
            "filename": "shirt_06_mf_hoodie_80.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/80/80_hoodie_t.glb",
            "model_type": "hoodie",
            "base_colour": "Crimson Red",
            "hex_colour": "#DC2626",
            "usage": "Streetwear",
            "price_idr": "Rp580.000",
            "flattering_body_shapes": ["Rectangle", "Pear", "Hourglass"],
            "style_tags": ["hoodie", "oversized", "crimson", "bold"]
        },
        {
            "id": "shirt-07",
            "name": "MetaFactory 3D Heavyweight Street Hoodie 108",
            "filename": "shirt_07_mf_hoodie_108.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/108/108_hoodie_t.glb",
            "model_type": "hoodie",
            "base_colour": "Pitch Black",
            "hex_colour": "#09090B",
            "usage": "Streetwear",
            "price_idr": "Rp599.000",
            "flattering_body_shapes": ["Rectangle", "Inverted Triangle", "Apple"],
            "style_tags": ["hoodie", "heavyweight", "black", "street"]
        },
        {
            "id": "shirt-08",
            "name": "MetaFactory 3D Cozy Ribbed Hoodie 97",
            "filename": "shirt_08_mf_hoodie_97.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/97/97_hoodie_a.glb",
            "model_type": "hoodie",
            "base_colour": "Heather Grey",
            "hex_colour": "#64748B",
            "usage": "Casual",
            "price_idr": "Rp520.000",
            "flattering_body_shapes": ["Hourglass", "Pear", "Rectangle"],
            "style_tags": ["hoodie", "ribbed", "grey", "lounge"]
        },
        {
            "id": "shirt-09",
            "name": "MetaFactory 3D Luxury Fleece Hoodie 36",
            "filename": "shirt_09_mf_hoodie_36.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/36/36_hoodie_a.glb",
            "model_type": "hoodie",
            "base_colour": "Sky Blue",
            "hex_colour": "#0284C7",
            "usage": "Casual",
            "price_idr": "Rp560.000",
            "flattering_body_shapes": ["Inverted Triangle", "Rectangle", "Hourglass"],
            "style_tags": ["hoodie", "fleece", "sky-blue", "luxury"]
        },
        {
            "id": "shirt-10",
            "name": "MetaFactory 3D Heritage Cotton T-Shirt 111",
            "filename": "shirt_10_mf_tshirt_111.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/111/111_tshirt_a.glb",
            "model_type": "tshirt",
            "base_colour": "Pitch Black",
            "hex_colour": "#18181B",
            "usage": "Casual",
            "price_idr": "Rp310.000",
            "flattering_body_shapes": ["Hourglass", "Rectangle", "Pear", "Inverted Triangle", "Apple"],
            "style_tags": ["tshirt", "heritage", "black", "crewneck"]
        },
        {
            "id": "shirt-11",
            "name": "MetaFactory 3D Essential Supima T-Shirt 54",
            "filename": "shirt_11_mf_tshirt_54.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/54/54_tshirt_a.glb",
            "model_type": "tshirt",
            "base_colour": "Chalk White",
            "hex_colour": "#F8FAFC",
            "usage": "Casual",
            "price_idr": "Rp290.000",
            "flattering_body_shapes": ["Hourglass", "Rectangle", "Pear", "Inverted Triangle", "Apple"],
            "style_tags": ["tshirt", "supima", "white", "basic"]
        },
        {
            "id": "shirt-12",
            "name": "MetaFactory 3D Urban Graphic T-Shirt 141",
            "filename": "shirt_12_mf_tshirt_141.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/141/141_tshirt_a.glb",
            "model_type": "tshirt",
            "base_colour": "Terracotta",
            "hex_colour": "#E2725B",
            "usage": "Casual",
            "price_idr": "Rp330.000",
            "flattering_body_shapes": ["Inverted Triangle", "Rectangle", "Hourglass"],
            "style_tags": ["tshirt", "graphic", "terracotta", "urban"]
        },
        {
            "id": "shirt-13",
            "name": "MetaFactory 3D Minimalist Dropped Tee 48",
            "filename": "shirt_13_mf_tshirt_48.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/48/48_tshirt_a.glb",
            "model_type": "tshirt",
            "base_colour": "Olive Green",
            "hex_colour": "#4D7C0F",
            "usage": "Streetwear",
            "price_idr": "Rp340.000",
            "flattering_body_shapes": ["Rectangle", "Pear", "Hourglass"],
            "style_tags": ["tshirt", "dropped-shoulder", "minimalist", "olive"]
        },
        {
            "id": "shirt-14",
            "name": "MetaFactory 3D Oversized Vintage T-Shirt 76",
            "filename": "shirt_14_mf_tshirt_76.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/76/76_tshirt_a.glb",
            "model_type": "tshirt",
            "base_colour": "Heather Grey",
            "hex_colour": "#64748B",
            "usage": "Casual",
            "price_idr": "Rp320.000",
            "flattering_body_shapes": ["Rectangle", "Inverted Triangle", "Apple"],
            "style_tags": ["tshirt", "vintage", "oversized", "grey"]
        },
        {
            "id": "shirt-15",
            "name": "MetaFactory 3D Classic Longsleeve Shirt 14",
            "filename": "shirt_15_mf_longsleeve_14.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/14/14_longsleeve_t.glb",
            "model_type": "longsleeve",
            "base_colour": "Navy Blue",
            "hex_colour": "#1E3A8A",
            "usage": "Formal",
            "price_idr": "Rp390.000",
            "flattering_body_shapes": ["Hourglass", "Rectangle", "Pear"],
            "style_tags": ["longsleeve", "classic", "navy", "versatile"]
        },
        {
            "id": "shirt-16",
            "name": "MetaFactory 3D Summer Athletic Tank Top 3",
            "filename": "shirt_16_mf_tanktop_3.glb",
            "url": "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/3/3_tanktop.glb",
            "model_type": "tanktop",
            "base_colour": "Crimson Red",
            "hex_colour": "#DC2626",
            "usage": "Sports",
            "price_idr": "Rp240.000",
            "flattering_body_shapes": ["Inverted Triangle", "Hourglass"],
            "style_tags": ["tanktop", "athletic", "summer", "sleeveless"]
        }
    ]
}

def setup():
    # 1. Delete all procedural 10KB files
    print("Cleaning up old procedural box models...")
    for cat in ["glasses", "hats", "shirts", "jackets"]:
        cat_dir = os.path.join(base_client_dir, cat)
        if os.path.exists(cat_dir):
            if cat == "jackets":
                shutil.rmtree(cat_dir)
                continue
            for f in os.listdir(cat_dir):
                full_p = os.path.join(cat_dir, f)
                if f.endswith(f"_{cat}.glb") or os.path.getsize(full_p) < 50000:
                    os.remove(full_p)
                    print(f"  Removed procedural: {f}")

    # 2. Download and place authentic 3D dataset GLBs
    catalog_items = []
    for cat, items in MASTER_DATASETS.items():
        cat_dir = os.path.join(base_client_dir, cat)
        os.makedirs(cat_dir, exist_ok=True)
        print(f"\n=== PROCESSING AUTHENTIC {cat.upper()} DATASET ({len(items)} items) ===")
        
        for it in items:
            target_p = os.path.join(cat_dir, it["filename"])
            if not os.path.exists(target_p) or os.path.getsize(target_p) < 10000:
                print(f"Downloading authentic 3D GLB: {it['filename']}...")
                try:
                    req = urllib.request.Request(it["url"], headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        data = resp.read()
                        with open(target_p, "wb") as f:
                            f.write(data)
                        print(f"  -> SUCCESS ({len(data):,} bytes)")
                except Exception as e:
                    print(f"  -> Error downloading {it['filename']}: {e}")

            # Verify it is valid binary glTF
            if os.path.exists(target_p):
                with open(target_p, "rb") as f:
                    hdr = f.read(4)
                if hdr != b'glTF':
                    print(f"  WARNING: {it['filename']} is not valid binary glTF! (Header: {hdr})")

            # Add to catalog
            catalog_entry = {
                "id": it["id"],
                "name": it["name"],
                "category": cat,
                "subcategory": cat,
                "modelType": it["model_type"],
                "baseColour": it["base_colour"],
                "hex_colour": it["hex_colour"],
                "usage": it["usage"],
                "priceIdr": it["price_idr"],
                "model_3d_path": f"/images/products/{cat}/{it['filename']}",
                "preview_image_url": f"/images/products/preview/{it['id']}.png",
                "flatteringFaceShapes": it.get("flattering_face_shapes", ["Oval", "Round", "Square", "Heart", "Diamond"]),
                "flatteringBodyShapes": it.get("flattering_body_shapes", ["Hourglass", "Rectangle", "Pear", "Inverted Triangle", "Apple"]),
                "styleTags": it.get("style_tags", [cat, it["base_colour"].lower()]),
                "description": f"{it['name']} dengan geometri 3D fotorealistik berwana {it['base_colour']} untuk kenyamanan gaya {it['usage']}."
            }
            catalog_items.append(catalog_entry)

    # 3. Write clean, accurate catalog.json
    catalog_data = {
        "version": "4.0.0",
        "total_products": len(catalog_items),
        "items": catalog_items
    }
    with open(catalog_file_path, "w", encoding="utf-8") as f:
        json.dump(catalog_data, f, indent=2, ensure_ascii=False)
    print(f"\nWritten {len(catalog_items)} authentic products to catalog.json!")

if __name__ == "__main__":
    setup()
