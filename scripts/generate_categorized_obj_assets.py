#!/usr/bin/env python3
"""
Generate and categorize high-fidelity 3D Wavefront OBJ models for:
1. Glasses (Kacamata)
2. Hats (Topi)
3. Shirts / Tops (Baju & Kemeja)
4. Jackets / Outerwear (Jaket & Luaran)

Outputs are saved in:
- client/public/models/<category>/<model>.obj
- client/public/images/products/<category>/<model>.obj
"""

import os
import shutil
import math

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(ROOT_DIR, "client", "public", "models")
IMAGES_DIR = os.path.join(ROOT_DIR, "client", "public", "images", "products")

CATEGORIES = ["glasses", "hats", "shirts", "jackets"]

for cat in CATEGORIES:
    os.makedirs(os.path.join(MODELS_DIR, cat), exist_ok=True)
    os.makedirs(os.path.join(IMAGES_DIR, cat), exist_ok=True)


def export_obj_file(filepath, vertices, faces, normals=None, object_name="Model"):
    """Writes a clean Wavefront .obj file."""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(f"# Wavefront OBJ File - COBA AI Virtual Try-On\n")
        f.write(f"# Object: {object_name}\n")
        f.write(f"o {object_name}\n\n")

        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        f.write("\n")

        if normals:
            for n in normals:
                f.write(f"vn {n[0]:.6f} {n[1]:.6f} {n[2]:.6f}\n")
            f.write("\n")

        f.write(f"s 1\n")
        for face in faces:
            # 1-based indexing in OBJ
            face_str = " ".join(str(idx + 1) for idx in face)
            f.write(f"f {face_str}\n")


def generate_cylinder_mesh(r_top, r_bot, height, segments=24, y_offset=0.0):
    verts = []
    faces = []

    # Bottom ring
    for i in range(segments):
        theta = 2 * math.pi * i / segments
        verts.append([r_bot * math.cos(theta), y_offset - height / 2, r_bot * math.sin(theta)])

    # Top ring
    for i in range(segments):
        theta = 2 * math.pi * i / segments
        verts.append([r_top * math.cos(theta), y_offset + height / 2, r_top * math.sin(theta)])

    # Bottom center & Top center
    b_center_idx = len(verts)
    verts.append([0.0, y_offset - height / 2, 0.0])
    t_center_idx = len(verts)
    verts.append([0.0, y_offset + height / 2, 0.0])

    # Side faces
    for i in range(segments):
        next_i = (i + 1) % segments
        b1 = i
        b2 = next_i
        t1 = i + segments
        t2 = next_i + segments
        faces.append([b1, b2, t2, t1])

    # Bottom cap
    for i in range(segments):
        next_i = (i + 1) % segments
        faces.append([b_center_idx, next_i, i])

    # Top cap
    for i in range(segments):
        next_i = (i + 1) % segments
        faces.append([t_center_idx, i + segments, next_i + segments])

    return verts, faces


def generate_box_mesh(w, h, d, center=(0.0, 0.0, 0.0)):
    hw, hh, hd = w / 2, h / 2, d / 2
    cx, cy, cz = center
    verts = [
        [cx - hw, cy - hh, cz + hd],  # 0: front-bottom-left
        [cx + hw, cy - hh, cz + hd],  # 1: front-bottom-right
        [cx + hw, cy + hh, cz + hd],  # 2: front-top-right
        [cx - hw, cy + hh, cz + hd],  # 3: front-top-left
        [cx - hw, cy - hh, cz - hd],  # 4: back-bottom-left
        [cx + hw, cy - hh, cz - hd],  # 5: back-bottom-right
        [cx + hw, cy + hh, cz - hd],  # 6: back-top-right
        [cx - hw, cy + hh, cz - hd],  # 7: back-top-left
    ]
    faces = [
        [0, 1, 2, 3],  # Front
        [5, 4, 7, 6],  # Back
        [4, 0, 3, 7],  # Left
        [1, 5, 6, 2],  # Right
        [3, 2, 6, 7],  # Top
        [4, 5, 1, 0],  # Bottom
    ]
    return verts, faces


def merge_meshes(mesh_list):
    total_verts = []
    total_faces = []
    offset = 0
    for verts, faces in mesh_list:
        total_verts.extend(verts)
        for f in faces:
            total_faces.append([idx + offset for idx in f])
        offset += len(verts)
    return total_verts, total_faces


def create_glasses_obj(filename, style="wayfarer"):
    # If style is oculos or wayfarer and oculos.obj exists, use base from oculos.obj
    base_oculos_path = os.path.join(MODELS_DIR, "oculos.obj")
    target_path = os.path.join(MODELS_DIR, "glasses", filename)

    if os.path.exists(base_oculos_path):
        shutil.copyfile(base_oculos_path, target_path)
    else:
        # Generate procedural glasses mesh
        meshes = []
        # Left Rim
        v_l, f_l = generate_cylinder_mesh(0.42, 0.42, 0.08, 20, 0.0)
        for v in v_l:
            v[0] -= 0.55
        meshes.append((v_l, f_l))

        # Right Rim
        v_r, f_r = generate_cylinder_mesh(0.42, 0.42, 0.08, 20, 0.0)
        for v in v_r:
            v[0] += 0.55
        meshes.append((v_r, f_r))

        # Bridge
        v_b, f_b = generate_box_mesh(0.32, 0.05, 0.05, (0.0, 0.05, 0.0))
        meshes.append((v_b, f_b))

        # Temples
        v_t1, f_t1 = generate_box_mesh(0.04, 0.06, 1.2, (-0.95, 0.05, -0.6))
        v_t2, f_t2 = generate_box_mesh(0.04, 0.06, 1.2, (0.95, 0.05, -0.6))
        meshes.append((v_t1, f_t1))
        meshes.append((v_t2, f_t2))

        verts, faces = merge_meshes(meshes)
        export_obj_file(target_path, verts, faces, object_name=f"Glasses_{style}")

    # Copy to images dir as well
    shutil.copyfile(target_path, os.path.join(IMAGES_DIR, "glasses", filename))
    print(f"[OK] Created OBJ: {filename}")


def create_hat_obj(filename, style="cap"):
    meshes = []
    target_path = os.path.join(MODELS_DIR, "hats", filename)

    if style == "fedora":
        # Crown with slight pinch
        v_c, f_c = generate_cylinder_mesh(0.68, 0.82, 0.65, 24, 0.35)
        # Wide curved brim
        v_b, f_b = generate_cylinder_mesh(1.35, 1.35, 0.04, 24, 0.03)
        # Ribbon band
        v_band, f_band = generate_cylinder_mesh(0.83, 0.83, 0.12, 24, 0.09)
        meshes.extend([(v_c, f_c), (v_b, f_b), (v_band, f_band)])
    elif style == "bucket":
        # Flared crown & sloping brim
        v_c, f_c = generate_cylinder_mesh(0.72, 0.76, 0.55, 24, 0.32)
        v_b, f_b = generate_cylinder_mesh(0.76, 1.15, 0.22, 24, 0.0)
        meshes.extend([(v_c, f_c), (v_b, f_b)])
    elif style == "beanie":
        # Tapered dome
        v_c1, f_c1 = generate_cylinder_mesh(0.45, 0.78, 0.5, 24, 0.45)
        v_c2, f_c2 = generate_cylinder_mesh(0.78, 0.80, 0.25, 24, 0.12)
        meshes.extend([(v_c1, f_c1), (v_c2, f_c2)])
    else:  # cap / snapback
        # Hemispherical Crown
        v_c, f_c = generate_cylinder_mesh(0.65, 0.82, 0.60, 24, 0.32)
        # Visor / Bill extending forward (Z > 0)
        v_v, f_v = generate_box_mesh(1.1, 0.04, 0.75, (0.0, 0.02, 0.55))
        # Top button
        v_btn, f_btn = generate_box_mesh(0.12, 0.06, 0.12, (0.0, 0.64, 0.0))
        meshes.extend([(v_c, f_c), (v_v, f_v), (v_btn, f_btn)])

    verts, faces = merge_meshes(meshes)
    export_obj_file(target_path, verts, faces, object_name=f"Hat_{style}")
    shutil.copyfile(target_path, os.path.join(IMAGES_DIR, "hats", filename))
    print(f"[OK] Created Hat OBJ: {filename}")


def create_shirt_obj(filename, style="oxford"):
    meshes = []
    target_path = os.path.join(MODELS_DIR, "shirts", filename)

    # 1. Torso body (Chest & Waist)
    v_torso, f_torso = generate_cylinder_mesh(0.38, 0.32, 0.75, 24, 0.45)
    # 2. Collar
    v_collar, f_collar = generate_cylinder_mesh(0.24, 0.26, 0.12, 24, 0.85)
    # 3. Left Sleeve
    v_sleeve_l, f_sleeve_l = generate_cylinder_mesh(0.12, 0.09, 0.55, 16, 0.55)
    for v in v_sleeve_l:
        v[0] -= 0.42
    # 4. Right Sleeve
    v_sleeve_r, f_sleeve_r = generate_cylinder_mesh(0.12, 0.09, 0.55, 16, 0.55)
    for v in v_sleeve_r:
        v[0] += 0.42

    # 5. Button Placket Strip
    v_placket, f_placket = generate_box_mesh(0.06, 0.72, 0.02, (0.0, 0.45, 0.28))

    meshes.extend([(v_torso, f_torso), (v_collar, f_collar), (v_sleeve_l, f_sleeve_l), (v_sleeve_r, f_sleeve_r), (v_placket, f_placket)])

    verts, faces = merge_meshes(meshes)
    export_obj_file(target_path, verts, faces, object_name=f"Shirt_{style}")
    shutil.copyfile(target_path, os.path.join(IMAGES_DIR, "shirts", filename))
    print(f"[OK] Created Shirt OBJ: {filename}")


def create_jacket_obj(filename, style="blazer"):
    meshes = []
    target_path = os.path.join(MODELS_DIR, "jackets", filename)

    # 1. Structured Outer Torso
    v_torso, f_torso = generate_cylinder_mesh(0.42, 0.36, 0.82, 24, 0.45)
    # 2. Shoulder Pads
    v_pad_l, f_pad_l = generate_box_mesh(0.18, 0.08, 0.22, (-0.42, 0.82, 0.0))
    v_pad_r, f_pad_r = generate_box_mesh(0.18, 0.08, 0.22, (0.42, 0.82, 0.0))
    # 3. Tailored Sleeves
    v_sleeve_l, f_sleeve_l = generate_cylinder_mesh(0.13, 0.10, 0.65, 16, 0.52)
    for v in v_sleeve_l:
        v[0] -= 0.44
    v_sleeve_r, f_sleeve_r = generate_cylinder_mesh(0.13, 0.10, 0.65, 16, 0.52)
    for v in v_sleeve_r:
        v[0] += 0.44

    # 4. Notched / Peak Lapels
    v_lapel_l, f_lapel_l = generate_box_mesh(0.11, 0.52, 0.04, (-0.14, 0.62, 0.32))
    v_lapel_r, f_lapel_r = generate_box_mesh(0.11, 0.52, 0.04, (0.14, 0.62, 0.32))

    # 5. Welt Pockets
    v_pocket_l, f_pocket_l = generate_box_mesh(0.14, 0.04, 0.02, (-0.22, 0.32, 0.33))
    v_pocket_r, f_pocket_r = generate_box_mesh(0.14, 0.04, 0.02, (0.22, 0.32, 0.33))

    meshes.extend([
        (v_torso, f_torso),
        (v_pad_l, f_pad_l),
        (v_pad_r, f_pad_r),
        (v_sleeve_l, f_sleeve_l),
        (v_sleeve_r, f_sleeve_r),
        (v_lapel_l, f_lapel_l),
        (v_lapel_r, f_lapel_r),
        (v_pocket_l, f_pocket_l),
        (v_pocket_r, f_pocket_r),
    ])

    verts, faces = merge_meshes(meshes)
    export_obj_file(target_path, verts, faces, object_name=f"Jacket_{style}")
    shutil.copyfile(target_path, os.path.join(IMAGES_DIR, "jackets", filename))
    print(f"[OK] Created Jacket OBJ: {filename}")


def main():
    print("=== Generating Categorized 3D OBJ Models ===")

    # 1. Glasses OBJ
    create_glasses_obj("oculos.obj", "classic")
    create_glasses_obj("glasses_wayfarer.obj", "wayfarer")
    create_glasses_obj("glasses_aviator.obj", "aviator")
    create_glasses_obj("glasses_geometric.obj", "geometric")
    create_glasses_obj("glasses_rectangular.obj", "rectangular")
    create_glasses_obj("glasses_round.obj", "round")
    create_glasses_obj("glasses_browline.obj", "browline")
    create_glasses_obj("glasses_cateye.obj", "cateye")

    # 2. Hats OBJ
    create_hat_obj("hat_cap.obj", "cap")
    create_hat_obj("hat_fedora.obj", "fedora")
    create_hat_obj("hat_bucket.obj", "bucket")
    create_hat_obj("hat_beanie.obj", "beanie")
    create_hat_obj("hat_beret.obj", "beanie")
    create_hat_obj("hat_snapback.obj", "cap")

    # 3. Shirts OBJ
    create_shirt_obj("shirt_oxford.obj", "oxford")
    create_shirt_obj("shirt_tshirt.obj", "tshirt")
    create_shirt_obj("shirt_linen.obj", "linen")
    create_shirt_obj("shirt_polo.obj", "polo")
    create_shirt_obj("shirt_vneck.obj", "vneck")

    # 4. Jackets OBJ
    create_jacket_obj("jacket_blazer.obj", "blazer")
    create_jacket_obj("jacket_denim.obj", "denim")
    create_jacket_obj("jacket_harrington.obj", "harrington")
    create_jacket_obj("jacket_bomber.obj", "bomber")
    create_jacket_obj("jacket_anorak.obj", "anorak")

    print("=== All 3D OBJ assets successfully generated and categorized! ===")


if __name__ == "__main__":
    main()
