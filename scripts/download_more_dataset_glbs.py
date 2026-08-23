import urllib.request
import json
import os

base_products = r"c:\Users\hikar\Compfest-AIC\client\public\images\products"

# Additional authentic GLBs to download from open repos:
EXTRA_DOWNLOADS = {
    "hats": [
        ("hat_21_metafactory_18_blue.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/18/18_blue_beanie.glb"),
        ("hat_22_metafactory_22_gitcoin.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/22/Gitcoin-Beanie.glb"),
        ("hat_23_metafactory_57_cap.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/57/57_hat.glb"),
        ("hat_24_metafactory_161_cap.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/161/161_hat.glb"),
        ("hat_25_luffy_straw_hat.glb", "https://raw.githubusercontent.com/EMTIAZ-RUET/face-filter-app/main/models/luffy_hat.glb"),
        ("hat_26_threejs_facecap.glb", "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/facecap.glb"),
        ("hat_27_steampunk_goggles_hat.glb", "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/steampunk_camera.glb"),
        ("hat_28_venice_carnival_mask.glb", "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/venice_mask.glb"),
        ("hat_29_astronaut_helmet.glb", "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/Astronaut.glb"),
        ("hat_30_neil_armstrong_helmet.glb", "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/NeilArmstrong.glb"),
    ],
    "shirts": [
        ("shirt_21_mf_tshirt_112.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/112/112_tshirt_a.glb"),
        ("shirt_22_mf_tshirt_131.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/131/131_tshirt_a.glb"),
        ("shirt_23_mf_tshirt_132.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/132/132_tshirt_t.glb"),
        ("shirt_24_mf_tshirt_153.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/153/153_tshirt_t.glb"),
        ("shirt_25_mf_tshirt_156.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/156/156_tshirt_t.glb"),
        ("shirt_26_mf_hoodie_147.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/147/147_hoodie_a.glb"),
        ("shirt_27_mf_hoodie_136.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/136/136_hoodie_a.glb"),
        ("shirt_28_mf_hoodie_32.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/32/32_hoodie_a.glb"),
        ("shirt_29_mf_longsleeve_94.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/94/94_longsleeve_t.glb"),
        ("shirt_30_mf_longsleeve_109.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/109/109_longsleeve_a.glb"),
        ("shirt_31_mf_longsleeve_117.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/117/117_longsleeve_t.glb"),
        ("shirt_32_mf_btc_shirt_145.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/145/145_btc1_t.glb"),
        ("shirt_33_mf_eth_shirt_145.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/145/145_eth1_t.glb"),
        ("shirt_34_mf_tshirt_69.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/69/69_tshirt_t.glb"),
        ("shirt_35_mf_tshirt_88.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/88/88_tshirt_t.glb"),
        ("shirt_36_mf_tshirt_89.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/89/89_tshirt_t.glb"),
        ("shirt_37_mf_tshirt_98.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/98/98_tshirt_a.glb"),
        ("shirt_38_mf_tshirt_101.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/101/101_tshirt_t.glb"),
        ("shirt_39_mf_tshirt_37.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/37/37_tshirt_t.glb"),
        ("shirt_40_mf_tshirt_38.glb", "https://raw.githubusercontent.com/MetaFactoryAI/mf-wearables/main/wearables/38/38_tshirt_t.glb"),
    ],
    "glasses": [
        ("glasses_21_khronos_sheen.glb", "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SunglassesKhronos/glTF-Binary/SunglassesKhronos.glb"),
        ("glasses_22_facefit_classic.glb", "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses1.glb"),
        ("glasses_23_facefit_aviator.glb", "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses3.glb"),
        ("glasses_24_facefit_hornrim.glb", "https://raw.githubusercontent.com/QHarshil/FaceFit-AR-Based-Virtual-Accessory-Try-On/main/frontend/public/models/glasses4.glb"),
        ("glasses_25_rayban_pilot.glb", "https://raw.githubusercontent.com/akhil15123/lingua_lens/main/rayban_sunglasses.glb"),
        ("glasses_26_tryon_round.glb", "https://raw.githubusercontent.com/estephanobrusa/GlassesTryOn/main/public/models/glasses-1-.glb"),
        ("glasses_27_tryon_square.glb", "https://raw.githubusercontent.com/estephanobrusa/GlassesTryOn/main/packages/demo/public/models/test.glb"),
        ("glasses_28_sunfit_sport.glb", "https://raw.githubusercontent.com/EMTIAZ-RUET/face-filter-app/main/models/sun_glasses_fbx_346kb.glb"),
    ]
}

for cat, items in EXTRA_DOWNLOADS.items():
    cat_dir = os.path.join(base_products, cat)
    os.makedirs(cat_dir, exist_ok=True)
    print(f"\n=== DOWNLOADING EXTRA AUTHENTIC DATASETS FOR {cat.upper()} ===")
    for fname, url in items:
        target_p = os.path.join(cat_dir, fname)
        if os.path.exists(target_p) and os.path.getsize(target_p) > 1000:
            print(f"Already downloaded: {fname}")
            continue
        try:
            print(f"Downloading {fname}...")
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                if data.startswith(b'glTF') or len(data) > 1000:
                    with open(target_p, "wb") as f:
                        f.write(data)
                    print(f"  -> SUCCESS ({len(data):,} bytes)")
                else:
                    print(f"  -> Invalid content ({len(data)} bytes)")
        except Exception as e:
            print(f"  -> Download error for {fname}: {e}")

print("\nDone downloading extra datasets!")
