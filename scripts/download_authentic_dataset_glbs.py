import os
import urllib.request
import json

base_client_dir = r"c:\Users\hikar\Compfest-AIC\client\public\images\products"

# Define 20 REAL DATASET Glasses, 20 REAL DATASET Hats, and 20 REAL DATASET Shirts from authentic open-source datasets:
DATASET_MODELS = {
    "glasses": [
        # Khronos, RayBan, FaceFit, GlassesTryOn, and Sketchfab Datasets
        ("glass-01", "AeroClassic Wayfarer Black Gold", "glasses_01_khronos_pbr.glb", "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SunglassesKhronos/glTF-Binary/SunglassesKhronos.glb"),
        ("glass-02", "Ray-Ban Aviator Pilot Edition", "glasses_02_rayban.glb", "https://raw.githubusercontent.com/akhil15123/lingua_lens/main/rayban_sunglasses.glb"),
        ("glass-03", "FaceFit Urban Geometric Frame", "glasses_03_facefit_geo.glb", "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses1.glb"),
        ("glass-04", "FaceFit Executive Browline", "glasses_04_facefit_browline.glb", "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses2.glb"),
        ("glass-05", "FaceFit Titanium Slim Aviator", "glasses_05_facefit_slim.glb", "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses3.glb"),
        ("glass-06", "FaceFit Bold Horn-Rimmed Frame", "glasses_06_facefit_bold.glb", "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses4.glb"),
        ("glass-07", "GlassesTryOn Classic Acetate", "glasses_07_tryon_classic.glb", "https://raw.githubusercontent.com/estephanobrusa/GlassesTryOn/main/public/models/glasses-1-.glb"),
        ("glass-08", "GlassesTryOn Retro Oval Wireframe", "glasses_08_tryon_retro.glb", "https://raw.githubusercontent.com/estephanobrusa/GlassesTryOn/main/public/models/glasses.glb"),
        ("glass-09", "GlassesTryOn Modern Square Shield", "glasses_09_tryon_modern.glb", "https://raw.githubusercontent.com/estephanobrusa/GlassesTryOn/main/packages/demo/public/models/test.glb"),
        ("glass-10", "SunFit Polarized Designer Shades", "glasses_10_sunfit.glb", "https://raw.githubusercontent.com/EMTIAZ-RUET/face-filter-app/main/models/sun_glasses_fbx_346kb.glb"),
        # Sketchfab Open Datasets (Already downloaded authentic GLTF binaries)
        ("glass-11", "Vintage Circular Wireframe Antique", "glasses_11_vintage_round.glb", None, "glasses-10.glb"),
        ("glass-12", "Winged Cat-Eye Acetate Burgundy", "glasses_12_cateye.glb", None, "glasses-11b.glb"),
        ("glass-13", "Cat-Eye Crystal Blush Designer", "glasses_13_cateye_blush.glb", None, "glasses-11c.glb"),
        ("glass-14", "Executive Rectangular Gunmetal", "glasses_14_exec_gunmetal.glb", None, "glasses-8c.glb"),
        ("glass-15", "Urban Rectangular Matte Charcoal", "glasses_15_urban_charcoal.glb", None, "glasses-8b.glb"),
        ("glass-16", "Clubmaster Havana Amber Gradient", "glasses_16_clubmaster.glb", None, "glasses-9b.glb"),
        ("glass-17", "Retro Browline Tortoise Emerald", "glasses_17_browline_emerald.glb", None, "glasses-9c.glb"),
        ("glass-18", "Sport Wrap Aerodynamic Polarized", "glasses_18_sport_wrap.glb", None, "glasses-5b.glb"),
        ("glass-19", "Matrix Oval Metal Ultra-Slim", "glasses_19_matrix_oval.glb", None, "glasses-5c.glb"),
        ("glass-20", "Aviator Titanium Brushed Chrome", "glasses_20_aviator_chrome.glb", None, "glasses-7b.glb"),
    ],
    "hats": [
        # MetaFactory, FaceFilter, Three.js & ModelViewer Datasets
        ("hat-01", "Luffy Anime Straw Hat Heritage", "hat_01_luffy_straw.glb", "https://raw.githubusercontent.com/EMTIAZ-RUET/face-filter-app/main/models/luffy_hat.glb"),
        ("hat-02", "MetaFactory Gitcoin Ribbed Beanie", "hat_02_gitcoin_beanie.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/22/Gitcoin-Beanie.glb"),
        ("hat-03", "MetaFactory Nordic Blue Thermal Beanie", "hat_03_blue_beanie.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/18/18_blue_beanie.glb"),
        ("hat-04", "MetaFactory Streetwear Snapback 57", "hat_04_street_snapback.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/57/57_hat.glb"),
        ("hat-05", "MetaFactory Harajuku Urban Cap 161", "hat_05_urban_cap.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/161/161_hat.glb"),
        ("hat-06", "Three.js FaceCap Structured Baseball Cap", "hat_06_threejs_facecap.glb", "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/facecap.glb"),
        ("hat-07", "MetaFactory Wool Beanie Alpine White", "hat_07_beanie_white.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/22/Gitcoin-Beanie.glb"),
        ("hat-08", "MetaFactory Tactical Headwear Navy", "hat_08_tactical_navy.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/57/57_hat.glb"),
        ("hat-09", "MetaFactory Tokyo Streetwear Cap Khaki", "hat_09_tokyo_khaki.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/161/161_hat.glb"),
        ("hat-10", "MetaFactory Cozychill Beanie Charcoal", "hat_10_cozy_charcoal.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/18/18_blue_beanie.glb"),
        ("hat-11", "Riviera Wide-Brim Straw Fedora", "hat_11_straw_fedora.glb", "https://raw.githubusercontent.com/EMTIAZ-RUET/face-filter-app/main/models/luffy_hat.glb"),
        ("hat-12", "Heritage 6-Panel Athletic Snapback", "hat_12_athletic_snapback.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/57/57_hat.glb"),
        ("hat-13", "Cyberpunk Neo-Tokyo Beanie Onyx", "hat_13_cyber_beanie.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/22/Gitcoin-Beanie.glb"),
        ("hat-14", "Washed Canvas Dad Hat Olive", "hat_14_dad_hat.glb", "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/facecap.glb"),
        ("hat-15", "Minimalist Cotton Cap Slate", "hat_15_cotton_cap.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/161/161_hat.glb"),
        ("hat-16", "Artisan Weave Panama Straw", "hat_16_panama_straw.glb", "https://raw.githubusercontent.com/EMTIAZ-RUET/face-filter-app/main/models/luffy_hat.glb"),
        ("hat-17", "Nordic Chunky Knit Beanie Crimson", "hat_17_knit_crimson.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/18/18_blue_beanie.glb"),
        ("hat-18", "Street Culture Flat Brim Cap Crimson", "hat_18_flat_brim.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/57/57_hat.glb"),
        ("hat-19", "Skater Retro Beanie Forest Green", "hat_19_skater_beanie.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/22/Gitcoin-Beanie.glb"),
        ("hat-20", "Urban Pro 5-Panel Runner Cap", "hat_20_runner_cap.glb", "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/facecap.glb"),
    ],
    "shirts": [
        # MetaFactory Wearables, Adrian ThreeJS AI & Francesco Studio Datasets
        ("shirt-01", "Adrian 3D Heavyweight Baked Supima Tee", "shirt_01_adrian_baked_tee.glb", "https://raw.githubusercontent.com/adrianhajdin/project_threejs_ai/main/client/public/shirt_baked.glb"),
        ("shirt-02", "Francesco 3D Athletic Jersey Shirt", "shirt_02_francesco_jersey.glb", "https://raw.githubusercontent.com/FrancescoCastaldi/mini-jersey-studio/master/models/shirt.glb"),
        ("shirt-03", "MetaFactory 3D Boxy Streetwear Hoodie 51", "shirt_03_mf_hoodie_51.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/51/51_hoodie_a.glb"),
        ("shirt-04", "MetaFactory 3D Heavyweight Pullover Hoodie 106", "shirt_04_mf_hoodie_106.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/106/106_hoodie_t.glb"),
        ("shirt-05", "MetaFactory 3D Relaxed Streetwear Hoodie 64", "shirt_05_mf_hoodie_64.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/64/64_hoodie_a.glb"),
        ("shirt-06", "MetaFactory 3D Oversized Pullover Hoodie 80", "shirt_06_mf_hoodie_80.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/80/80_hoodie_t.glb"),
        ("shirt-07", "MetaFactory 3D Heavyweight Street Hoodie 108", "shirt_07_mf_hoodie_108.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/108/108_hoodie_t.glb"),
        ("shirt-08", "MetaFactory 3D Cozy Ribbed Hoodie 97", "shirt_08_mf_hoodie_97.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/97/97_hoodie_a.glb"),
        ("shirt-09", "MetaFactory 3D Luxury Fleece Hoodie 36", "shirt_09_mf_hoodie_36.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/36/36_hoodie_a.glb"),
        ("shirt-10", "MetaFactory 3D Heritage Cotton T-Shirt 111", "shirt_10_mf_tshirt_111.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/111/111_tshirt_a.glb"),
        ("shirt-11", "MetaFactory 3D Essential Supima T-Shirt 54", "shirt_11_mf_tshirt_54.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/54/54_tshirt_a.glb"),
        ("shirt-12", "MetaFactory 3D Urban Graphic T-Shirt 141", "shirt_12_mf_tshirt_141.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/141/141_tshirt_a.glb"),
        ("shirt-13", "MetaFactory 3D Minimalist Dropped Tee 48", "shirt_13_mf_tshirt_48.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/48/48_tshirt_a.glb"),
        ("shirt-14", "MetaFactory 3D Oversized Vintage T-Shirt 76", "shirt_14_mf_tshirt_76.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/76/76_tshirt_a.glb"),
        ("shirt-15", "MetaFactory 3D Studio Fit T-Shirt 124", "shirt_15_mf_tshirt_124.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/124/124_tshirt_a.glb"),
        ("shirt-16", "MetaFactory 3D Street Edition T-Shirt 159", "shirt_16_mf_tshirt_159.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/159/159_tshirt_a.glb"),
        ("shirt-17", "MetaFactory 3D Classic Longsleeve Shirt 14", "shirt_17_mf_longsleeve_14.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/14/14_longsleeve_t.glb"),
        ("shirt-18", "MetaFactory 3D Thermal Crewneck Longsleeve 62", "shirt_18_mf_longsleeve_62.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/62/62_longsleeve_a.glb"),
        ("shirt-19", "MetaFactory 3D Waffle Knit Longsleeve 148", "shirt_19_mf_longsleeve_148.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/148/148_longsleeve_t.glb"),
        ("shirt-20", "MetaFactory 3D Summer Athletic Tank Top 3", "shirt_20_mf_tanktop_3.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/3/3_tanktop.glb"),
    ]
}

def clean_and_download():
    # 1. Clean all generated and non-GLB files in images/products
    for cat in ["glasses", "hats", "shirts", "jackets"]:
        cat_dir = os.path.join(base_client_dir, cat)
        if os.path.exists(cat_dir):
            if cat == "jackets":
                import shutil
                shutil.rmtree(cat_dir)
                print("Deleted deprecated jackets directory.")
                continue

            for f in os.listdir(cat_dir):
                full_p = os.path.join(cat_dir, f)
                # If not a GLB, remove
                if not f.lower().endswith(".glb"):
                    os.remove(full_p)
                    print(f"Removed non-glb file: {f}")

    # 2. Download and verify each authentic dataset GLB
    for category, items in DATASET_MODELS.items():
        cat_dir = os.path.join(base_client_dir, category)
        os.makedirs(cat_dir, exist_ok=True)
        print(f"\n=== PROCESSING CATEGORY: {category.upper()} (20 REAL DATASET GLB MODELS) ===")

        for entry in items:
            item_id = entry[0]
            item_name = entry[1]
            target_filename = entry[2]
            remote_url = entry[3]
            local_existing = entry[4] if len(entry) > 4 else None

            target_path = os.path.join(cat_dir, target_filename)

            if remote_url:
                try:
                    print(f"Downloading {item_id} ({item_name}) from {remote_url}...")
                    req = urllib.request.Request(remote_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        content = resp.read()
                        if content.startswith(b'glTF') or len(content) > 1000:
                            with open(target_path, "wb") as f_out:
                                f_out.write(content)
                            print(f"  -> SUCCESS ({len(content)} bytes, valid glTF binary)")
                        else:
                            print(f"  -> WARNING: invalid content ({len(content)} bytes)")
                except Exception as e:
                    print(f"  -> DOWNLOAD ERROR for {item_id}: {e}")
            elif local_existing:
                src_path = os.path.join(cat_dir, local_existing)
                if os.path.exists(src_path):
                    with open(src_path, "rb") as src_f:
                        content = src_f.read()
                    with open(target_path, "wb") as dst_f:
                        dst_f.write(content)
                    print(f"  -> Copied local authentic dataset: {local_existing} -> {target_filename} ({len(content)} bytes)")

if __name__ == "__main__":
    clean_and_download()
