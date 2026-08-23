import os
import zipfile
import subprocess
import shutil

glasses_dir = r"c:\Users\hikar\Compfest-AIC\client\public\images\products\glasses"
scratch_extract = r"c:\Users\hikar\Compfest-AIC\scratch\unpacked_glasses"
os.makedirs(scratch_extract, exist_ok=True)

# Mapping zip files to descriptive names
zip_name_map = {
    "glasses-1-.zip": "glasses_andrea_wayfarer_acetate.glb",
    "glasses-10.zip": "glasses_akiko_round_wireframe.glb",
    "glasses-11a.zip": "glasses_cateye_acetate_dokono.glb",
    "glasses-12.zip": "glasses_retro_square_dokono.glb",
    "glasses-3-.zip": "glasses_sport_shield_polarized.glb",
    "glasses-5a.zip": "glasses_oval_metal_minimalist.glb",
    "glasses-6.zip": "glasses_geometric_titanium_dokono.glb",
    "glasses-7.zip": "glasses_retro_aviator_rosegold_dokono.glb",
    "glasses-7a.zip": "glasses_doublebridge_pilot_dokono.glb",
    "glasses-8a.zip": "glasses_executive_rectangular_dokono.glb",
    "glasses-9a.zip": "glasses_cyberpunk_neon_party.glb"
}

for zip_file, target_glb_name in zip_name_map.items():
    zip_path = os.path.join(glasses_dir, zip_file)
    if not os.path.exists(zip_path):
        continue

    folder_name = zip_file.replace(".zip", "")
    target_extract_folder = os.path.join(scratch_extract, folder_name)
    os.makedirs(target_extract_folder, exist_ok=True)

    print(f"Extracting {zip_file}...")
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(target_extract_folder)

    gltf_file = os.path.join(target_extract_folder, "scene.gltf")
    if os.path.exists(gltf_file):
        out_glb_path = os.path.join(glasses_dir, target_glb_name)
        cmd = f'npx -y gltf-pipeline -i "{gltf_file}" -o "{out_glb_path}" -b'
        print(f"Converting gltf to binary GLB: {target_glb_name}...")
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode == 0 and os.path.exists(out_glb_path):
            print(f"  -> SUCCESS ({os.path.getsize(out_glb_path):,} bytes)")
        else:
            print(f"  -> ERROR: {res.stderr}")

    # Delete the zip file
    os.remove(zip_path)
    print(f"Deleted {zip_file}")

# Also rename the raw glb files that were already in the directory into clear descriptive names
raw_glb_rename_map = {
    "glasses-1-.glb": "glasses_wayfarer_classic_black.glb",
    "glasses-10.glb": "glasses_circular_antique_gold.glb",
    "glasses-11b.glb": "glasses_winged_cateye_burgundy.glb",
    "glasses-11c.glb": "glasses_cateye_glamour_blush.glb",
    "glasses-12.glb": "glasses_bold_square_hornrimmed.glb",
    "glasses-5b.glb": "glasses_sport_wrap_aerodynamic.glb",
    "glasses-5c.glb": "glasses_matrix_oval_ultraslim.glb",
    "glasses-6.glb": "glasses_geometric_minimalist_titanium.glb",
    "glasses-7.glb": "glasses_retro_aviator_rosegold.glb",
    "glasses-7b.glb": "glasses_aviator_titanium_chrome.glb",
    "glasses-7c.glb": "glasses_aviator_amber_gradient.glb",
    "glasses-8b.glb": "glasses_urban_rectangular_charcoal.glb",
    "glasses-8c.glb": "glasses_executive_rectangular_gunmetal.glb",
    "glasses-9b.glb": "glasses_clubmaster_havana_amber.glb",
    "glasses-9c.glb": "glasses_retro_browline_emerald.glb"
}

for old_name, new_name in raw_glb_rename_map.items():
    old_p = os.path.join(glasses_dir, old_name)
    new_p = os.path.join(glasses_dir, new_name)
    if os.path.exists(old_p):
        if os.path.exists(new_p):
            os.remove(old_p)
        else:
            os.rename(old_p, new_p)
        print(f"Renamed {old_name} -> {new_name}")

print("\nDone processing user zip files and renaming glb files!")
