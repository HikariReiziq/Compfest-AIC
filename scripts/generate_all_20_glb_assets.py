import os
import struct
import json
import math

def build_glb_binary(nodes_data, materials_data):
    """
    Constructs a glTF 2.0 Binary (.glb) file with multiple nodes, meshes, and materials.
    nodes_data: list of dicts with:
      - 'name': str
      - 'vertices': list of [x, y, z]
      - 'normals': list of [nx, ny, nz]
      - 'indices': list of int
      - 'material_idx': int
    materials_data: list of dicts with:
      - 'name': str
      - 'color': [r, g, b, a]
      - 'metalness': float
      - 'roughness': float
      - 'alphaMode': 'OPAQUE' or 'BLEND'
    """
    bin_buffer = bytearray()
    accessors = []
    buffer_views = []
    meshes = []
    nodes = []

    for mesh_idx, node_info in enumerate(nodes_data):
        vertices = node_info['vertices']
        normals = node_info['normals']
        indices = node_info['indices']
        mat_idx = node_info.get('material_idx', 0)
        name = node_info.get('name', f'Mesh_{mesh_idx}')

        # 1. POSITION
        offset_pos = len(bin_buffer)
        for v in vertices:
            bin_buffer.extend(struct.pack('<fff', v[0], v[1], v[2]))
        len_pos = len(bin_buffer) - offset_pos
        while len(bin_buffer) % 4 != 0: bin_buffer.append(0)

        # 2. NORMAL
        offset_norm = len(bin_buffer)
        for n in normals:
            bin_buffer.extend(struct.pack('<fff', n[0], n[1], n[2]))
        len_norm = len(bin_buffer) - offset_norm
        while len(bin_buffer) % 4 != 0: bin_buffer.append(0)

        # 3. INDICES
        offset_idx = len(bin_buffer)
        for idx in indices:
            bin_buffer.extend(struct.pack('<H', idx))
        len_idx = len(bin_buffer) - offset_idx
        while len(bin_buffer) % 4 != 0: bin_buffer.append(0)

        # Buffer Views
        bv_pos_idx = len(buffer_views)
        buffer_views.append({'buffer': 0, 'byteOffset': offset_pos, 'byteLength': len_pos, 'target': 34962})

        bv_norm_idx = len(buffer_views)
        buffer_views.append({'buffer': 0, 'byteOffset': offset_norm, 'byteLength': len_norm, 'target': 34962})

        bv_idx_idx = len(buffer_views)
        buffer_views.append({'buffer': 0, 'byteOffset': offset_idx, 'byteLength': len_idx, 'target': 34963})

        # Accessors
        min_x = min(v[0] for v in vertices) if vertices else 0
        max_x = max(v[0] for v in vertices) if vertices else 0
        min_y = min(v[1] for v in vertices) if vertices else 0
        max_y = max(v[1] for v in vertices) if vertices else 0
        min_z = min(v[2] for v in vertices) if vertices else 0
        max_z = max(v[2] for v in vertices) if vertices else 0

        acc_pos_idx = len(accessors)
        accessors.append({
            'bufferView': bv_pos_idx,
            'byteOffset': 0,
            'componentType': 5126,
            'count': len(vertices),
            'type': 'VEC3',
            'max': [max_x, max_y, max_z],
            'min': [min_x, min_y, min_z]
        })

        acc_norm_idx = len(accessors)
        accessors.append({
            'bufferView': bv_norm_idx,
            'byteOffset': 0,
            'componentType': 5126,
            'count': len(normals),
            'type': 'VEC3'
        })

        acc_idx_idx = len(accessors)
        accessors.append({
            'bufferView': bv_idx_idx,
            'byteOffset': 0,
            'componentType': 5123,
            'count': len(indices),
            'type': 'SCALAR'
        })

        # Mesh
        meshes.append({
            'name': name,
            'primitives': [{
                'attributes': {'POSITION': acc_pos_idx, 'NORMAL': acc_norm_idx},
                'indices': acc_idx_idx,
                'material': mat_idx
            }]
        })

        nodes.append({'name': name, 'mesh': mesh_idx})

    # Materials
    gltf_materials = []
    for mat in materials_data:
        m_def = {
            'name': mat.get('name', 'Material'),
            'pbrMetallicRoughness': {
                'baseColorFactor': mat.get('color', [0.8, 0.8, 0.8, 1.0]),
                'metallicFactor': mat.get('metalness', 0.1),
                'roughnessFactor': mat.get('roughness', 0.5)
            },
            'doubleSided': True
        }
        if mat.get('alphaMode'):
            m_def['alphaMode'] = mat['alphaMode']
        gltf_materials.append(m_def)

    gltf_json = {
        'asset': {'version': '2.0', 'generator': 'AIFashionGLBBuilderPro'},
        'scene': 0,
        'scenes': [{'nodes': list(range(len(nodes)))}],
        'nodes': nodes,
        'meshes': meshes,
        'materials': gltf_materials,
        'accessors': accessors,
        'bufferViews': buffer_views,
        'buffers': [{'byteLength': len(bin_buffer)}]
    }

    json_str = json.dumps(gltf_json)
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_buffer)
    header = struct.pack('<4sII', b'glTF', 2, total_len)
    json_chunk = struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes
    bin_chunk = struct.pack('<II', len(bin_buffer), 0x004E4942) + bin_buffer

    return header + json_chunk + bin_chunk

def hex_to_rgba(hex_code, alpha=1.0):
    hex_code = hex_code.lstrip('#')
    if len(hex_code) == 6:
        r = int(hex_code[0:2], 16) / 255.0
        g = int(hex_code[2:4], 16) / 255.0
        b = int(hex_code[4:6], 16) / 255.0
        return [r, g, b, alpha]
    return [0.2, 0.2, 0.2, alpha]

# -------------------------------------------------------------
# Geometric 3D Hat Generators
# -------------------------------------------------------------
def generate_hat_mesh(style_type="fedora", color_hex="#1e293b"):
    verts = []
    norms = []
    indices = []

    def add_quad(v1, v2, v3, v4, n):
        idx = len(verts)
        verts.extend([v1, v2, v3, v4])
        norms.extend([n, n, n, n])
        indices.extend([idx, idx+1, idx+2, idx, idx+2, idx+3])

    def add_ring(r1, r2, y1, y2, segs=24):
        for i in range(segs):
            a1 = (i / segs) * math.pi * 2
            a2 = ((i + 1) / segs) * math.pi * 2
            cos1, sin1 = math.cos(a1), math.sin(a1)
            cos2, sin2 = math.cos(a2), math.sin(a2)

            v1 = [cos1 * r1, y1, sin1 * r1]
            v2 = [cos2 * r1, y1, sin2 * r1]
            v3 = [cos2 * r2, y2, sin2 * r2]
            v4 = [cos1 * r2, y2, sin1 * r2]
            n = [(cos1+cos2)*0.5, (y2-y1), (sin1+sin2)*0.5]
            mag = math.sqrt(n[0]**2 + n[1]**2 + n[2]**2) or 1
            n = [n[0]/mag, n[1]/mag, n[2]/mag]
            add_quad(v1, v2, v3, v4, n)

    if style_type in ["fedora", "panama", "trilby", "porkpie"]:
        # Brim
        add_ring(0.55, 0.85, 0.0, 0.03, segs=28)
        # Crown
        add_ring(0.55, 0.50, 0.0, 0.40, segs=28)
        # Top crease
        add_ring(0.50, 0.10, 0.40, 0.35, segs=28)
    elif style_type in ["bucket", "bucket_street", "safari_hat"]:
        # Slanted Brim
        add_ring(0.50, 0.72, 0.05, -0.15, segs=24)
        # Cylinder Crown
        add_ring(0.50, 0.46, 0.05, 0.38, segs=24)
        # Flat Top
        add_ring(0.46, 0.05, 0.38, 0.38, segs=24)
    elif style_type in ["beanie", "trapper"]:
        # Round dome
        for step in range(5):
            t1 = step / 5.0
            t2 = (step + 1) / 5.0
            r1 = math.cos(t1 * math.pi * 0.5) * 0.52
            r2 = math.cos(t2 * math.pi * 0.5) * 0.52
            y1 = math.sin(t1 * math.pi * 0.5) * 0.45
            y2 = math.sin(t2 * math.pi * 0.5) * 0.45
            add_ring(r1, r2, y1, y2, segs=24)
    elif style_type in ["baseball_cap", "snapback", "vintage_cap", "visor"]:
        # Dome
        for step in range(4):
            t1 = step / 4.0
            t2 = (step + 1) / 4.0
            r1 = math.cos(t1 * math.pi * 0.5) * 0.50
            r2 = math.cos(t2 * math.pi * 0.5) * 0.50
            y1 = math.sin(t1 * math.pi * 0.5) * 0.38
            y2 = math.sin(t2 * math.pi * 0.5) * 0.38
            add_ring(r1, r2, y1, y2, segs=24)
        # Visor / Bill front
        for i in range(10):
            a1 = (i / 10.0) * math.pi * 0.6 + math.pi * 0.2
            a2 = ((i + 1) / 10.0) * math.pi * 0.6 + math.pi * 0.2
            v1 = [math.cos(a1)*0.50, 0.0, -math.sin(a1)*0.50]
            v2 = [math.cos(a2)*0.50, 0.0, -math.sin(a2)*0.50]
            v3 = [math.cos(a2)*0.85, -0.06, -math.sin(a2)*0.85]
            v4 = [math.cos(a1)*0.85, -0.06, -math.sin(a1)*0.85]
            add_quad(v1, v2, v3, v4, [0, 1, 0])
    elif style_type in ["beret", "flat_cap", "newsboy"]:
        # Wide disc top
        add_ring(0.48, 0.65, 0.0, 0.12, segs=24)
        add_ring(0.65, 0.05, 0.12, 0.18, segs=24)
    elif style_type in ["sun_hat", "straw_boater"]:
        # Extra Wide Brim
        add_ring(0.50, 1.15, 0.0, -0.02, segs=32)
        add_ring(0.50, 0.48, 0.0, 0.32, segs=32)
        add_ring(0.48, 0.05, 0.32, 0.32, segs=32)
    elif style_type in ["cowboy"]:
        # Curved cowboy brim
        for i in range(28):
            a1 = (i / 28) * math.pi * 2
            a2 = ((i + 1) / 28) * math.pi * 2
            c1, s1 = math.cos(a1), math.sin(a1)
            c2, s2 = math.cos(a2), math.sin(a2)
            curv1 = (c1**2) * 0.15
            curv2 = (c2**2) * 0.15
            v1 = [c1 * 0.55, 0.0, s1 * 0.55]
            v2 = [c2 * 0.55, 0.0, s2 * 0.55]
            v3 = [c2 * 0.95, curv2, s2 * 0.95]
            v4 = [c1 * 0.95, curv1, s1 * 0.95]
            add_quad(v1, v2, v3, v4, [0, 1, 0])
        # High crown
        add_ring(0.55, 0.48, 0.0, 0.55, segs=28)
        add_ring(0.48, 0.10, 0.55, 0.48, segs=28)
    else: # bowler
        add_ring(0.52, 0.70, 0.0, 0.05, segs=24)
        for step in range(4):
            t1 = step / 4.0
            t2 = (step + 1) / 4.0
            r1 = math.cos(t1 * math.pi * 0.5) * 0.52
            r2 = math.cos(t2 * math.pi * 0.5) * 0.52
            y1 = math.sin(t1 * math.pi * 0.5) * 0.38
            y2 = math.sin(t2 * math.pi * 0.5) * 0.38
            add_ring(r1, r2, y1, y2, segs=24)

    return {
        'name': f'Hat_{style_type}',
        'vertices': verts,
        'normals': norms,
        'indices': indices,
        'material_idx': 0
    }

# -------------------------------------------------------------
# Geometric 3D Shirt / Baju Generators
# -------------------------------------------------------------
def generate_shirt_mesh(style_type="crewneck", color_hex="#3b82f6"):
    verts = []
    norms = []
    indices = []

    def add_quad(v1, v2, v3, v4, n):
        idx = len(verts)
        verts.extend([v1, v2, v3, v4])
        norms.extend([n, n, n, n])
        indices.extend([idx, idx+1, idx+2, idx, idx+2, idx+3])

    def add_cylinder(r_x1, r_z1, r_x2, r_z2, y1, y2, segs=20):
        for i in range(segs):
            a1 = (i / segs) * math.pi * 2
            a2 = ((i + 1) / segs) * math.pi * 2
            c1, s1 = math.cos(a1), math.sin(a1)
            c2, s2 = math.cos(a2), math.sin(a2)

            v1 = [c1 * r_x1, y1, s1 * r_z1]
            v2 = [c2 * r_x1, y1, s2 * r_z1]
            v3 = [c2 * r_x2, y2, s2 * r_z2]
            v4 = [c1 * r_x2, y2, s1 * r_z2]
            n = [(c1+c2)*0.5, 0, (s1+s2)*0.5]
            add_quad(v1, v2, v3, v4, n)

    # 1. Torso body
    # Upper chest to waist
    add_cylinder(0.55, 0.30, 0.52, 0.28, 0.40, 0.0, segs=24)
    # Waist to hem
    add_cylinder(0.52, 0.28, 0.54, 0.29, 0.0, -0.55, segs=24)

    # 2. Shoulder slope
    add_cylinder(0.35, 0.22, 0.55, 0.30, 0.55, 0.40, segs=24)

    # 3. Collar based on style
    if style_type in ["polo", "oxford", "formal", "linen", "flannel", "cuban", "mandarin"]:
        # Standing collar band
        add_cylinder(0.32, 0.20, 0.35, 0.22, 0.55, 0.65, segs=20)
    elif style_type in ["hoodie"]:
        # Hood mesh
        add_cylinder(0.35, 0.25, 0.45, 0.40, 0.55, 0.85, segs=20)
    elif style_type in ["turtleneck"]:
        # High ribbed neck
        add_cylinder(0.28, 0.18, 0.28, 0.18, 0.55, 0.78, segs=20)

    # 4. Sleeves (Left and Right)
    is_long_sleeve = style_type in [
        "oxford", "flannel", "hoodie", "sweater", "turtleneck",
        "henley", "denim", "cardigan", "chambray"
    ]
    sleeve_len = -0.65 if is_long_sleeve else -0.22

    # Left Sleeve
    for i in range(12):
        a1 = (i / 12) * math.pi * 2
        a2 = ((i + 1) / 12) * math.pi * 2
        c1, s1 = math.cos(a1)*0.16, math.sin(a1)*0.16
        c2, s2 = math.cos(a2)*0.16, math.sin(a2)*0.16
        v1 = [0.55 + c1, 0.40 + s1, 0.0]
        v2 = [0.55 + c2, 0.40 + s2, 0.0]
        v3 = [0.68 + c2, 0.40 + sleeve_len + s2, 0.0]
        v4 = [0.68 + c1, 0.40 + sleeve_len + s1, 0.0]
        add_quad(v1, v2, v3, v4, [1, 0, 0])

    # Right Sleeve
    for i in range(12):
        a1 = (i / 12) * math.pi * 2
        a2 = ((i + 1) / 12) * math.pi * 2
        c1, s1 = math.cos(a1)*0.16, math.sin(a1)*0.16
        c2, s2 = math.cos(a2)*0.16, math.sin(a2)*0.16
        v1 = [-0.55 + c1, 0.40 + s1, 0.0]
        v2 = [-0.55 + c2, 0.40 + s2, 0.0]
        v3 = [-0.68 + c2, 0.40 + sleeve_len + s2, 0.0]
        v4 = [-0.68 + c1, 0.40 + sleeve_len + s1, 0.0]
        add_quad(v1, v2, v3, v4, [-1, 0, 0])

    return {
        'name': f'Shirt_{style_type}',
        'vertices': verts,
        'normals': norms,
        'indices': indices,
        'material_idx': 0
    }

# -------------------------------------------------------------
# Main Generation Runner
# -------------------------------------------------------------
def main():
    print("=== Generating 20 Distinct 3D GLB Models for Hats and Shirts ===")

    # 1. HATS LIST (20)
    hats_def = [
        ("hat-01", "hat_01_fedora", "fedora", "#1e293b", "AeroFedora Classic Midnight Charcoal", 0.1, 0.7),
        ("hat-02", "hat_02_bucket", "bucket", "#475569", "StreetBucket Urban Cotton Olive", 0.05, 0.8),
        ("hat-03", "hat_03_beanie", "beanie", "#0f172a", "NordicKnit Ribbed Thermal Beanie", 0.05, 0.9),
        ("hat-04", "hat_04_baseball_cap", "baseball_cap", "#2563eb", "ProAthletic Structured 6-Panel Cap", 0.1, 0.6),
        ("hat-05", "hat_05_snapback", "snapback", "#dc2626", "Streetwear Flat-Brim Snapback Red", 0.1, 0.6),
        ("hat-06", "hat_06_beret", "beret", "#4c1d95", "Parisian Wool Felt Beret Royal", 0.05, 0.85),
        ("hat-07", "hat_07_flat_cap", "flat_cap", "#78350f", "Heritage Herringbone Ivy Flat Cap", 0.05, 0.8),
        ("hat-08", "hat_08_sun_hat", "sun_hat", "#d97706", "Riviera Wide-Brim UV Sun Straw Hat", 0.02, 0.9),
        ("hat-09", "hat_09_cowboy", "cowboy", "#b45309", "Outback Leather Cattleman Western Hat", 0.2, 0.6),
        ("hat-10", "hat_10_panama", "panama", "#fef3c7", "Montecristi Fine Toquilla Panama Hat", 0.02, 0.85),
        ("hat-11", "hat_11_visor", "visor", "#059669", "Performance Tennis Court Visor Emerald", 0.1, 0.5),
        ("hat-12", "hat_12_newsboy", "newsboy", "#334155", "Vintage 8-Panel Gatsby Newsboy Cap", 0.05, 0.8),
        ("hat-13", "hat_13_trilby", "trilby", "#1e1b4b", "JazzClub Narrow-Brim Wool Trilby", 0.1, 0.7),
        ("hat-14", "hat_14_porkpie", "porkpie", "#18181b", "Retro Diamond Crown Porkpie Black", 0.15, 0.65),
        ("hat-15", "hat_15_trapper", "trapper", "#854d0e", "Arctic Aviator Shearling Trapper", 0.05, 0.9),
        ("hat-16", "hat_16_bucket_street", "bucket_street", "#0284c7", "Harajuku Reversible Tie-Dye Bucket", 0.05, 0.75),
        ("hat-17", "hat_17_vintage_cap", "vintage_cap", "#065f46", "Collegiate Washed Canvas Dad Hat", 0.05, 0.85),
        ("hat-18", "hat_18_straw_boater", "straw_boater", "#fde68a", "Venetian Striped Ribbon Straw Boater", 0.05, 0.7),
        ("hat-19", "hat_19_safari_hat", "safari_hat", "#a16207", "Explorer Expedition Breathable Safari", 0.05, 0.8),
        ("hat-20", "hat_20_bowler", "bowler", "#09090b", "Victorian Hard-Felt Bowler Derby Hat", 0.15, 0.6)
    ]

    # 2. SHIRTS LIST (20)
    shirts_def = [
        ("shirt-01", "shirt_01_crewneck_tee", "crewneck", "#0284c7", "Essential Supima Heavyweight Crewneck", 0.05, 0.8),
        ("shirt-02", "shirt_02_vneck_tee", "crewneck", "#334155", "Tailored Luxe Modal V-Neck Tee", 0.05, 0.75),
        ("shirt-03", "shirt_03_polo_classic", "polo", "#059669", "Pique Cotton Oxford Classic Polo", 0.1, 0.65),
        ("shirt-04", "shirt_04_oxford_formal", "oxford", "#f8fafc", "Royal Oxford Pinpoint Dress Shirt", 0.1, 0.5),
        ("shirt-05", "shirt_05_linen_casual", "linen", "#fef08a", "Mediterranean Pure French Linen Shirt", 0.05, 0.85),
        ("shirt-06", "shirt_06_flannel_plaid", "flannel", "#dc2626", "Northwest Brushed Buffalo Plaid Flannel", 0.05, 0.9),
        ("shirt-07", "shirt_07_hoodie_streetwear", "hoodie", "#18181b", "Boxy Heavyweight 480GSM Street Hoodie", 0.05, 0.85),
        ("shirt-08", "shirt_08_sweater_knit", "sweater", "#c2410c", "Merino Wool Cable-Knit Crew Sweater", 0.05, 0.9),
        ("shirt-09", "shirt_09_turtleneck", "turtleneck", "#3b0764", "Fine Gauge Ribbed Silk Turtleneck", 0.15, 0.6),
        ("shirt-10", "shirt_10_henley_longsleeve", "henley", "#475569", "Vintage Waffle Thermal Button Henley", 0.05, 0.85),
        ("shirt-11", "shirt_11_oversized_tee", "crewneck", "#e2e8f0", "Minimalist Dropped-Shoulder Tee Chalk", 0.05, 0.8),
        ("shirt-12", "shirt_12_graphic_tee", "crewneck", "#0f172a", "Cyberpunk Neo-Tokyo Screenprint Tee", 0.05, 0.75),
        ("shirt-13", "shirt_13_denim_shirt", "denim", "#1d4ed8", "Selvedge Indigo Western Denim Shirt", 0.1, 0.7),
        ("shirt-14", "shirt_14_cuban_collar", "cuban", "#0d9488", "Havana Camp-Collar Resort Silk Shirt", 0.15, 0.5),
        ("shirt-15", "shirt_15_mandarin_collar", "mandarin", "#f1f5f9", "Zen Grandad Banded Collar Linen Shirt", 0.05, 0.8),
        ("shirt-16", "shirt_16_athletic_dryfit", "crewneck", "#4f46e5", "Seamless AeroVent Pro Athletic Top", 0.2, 0.4),
        ("shirt-17", "shirt_17_striped_breton", "crewneck", "#1e3a8a", "Nautical Breton Striped Longsleeve", 0.05, 0.8),
        ("shirt-18", "shirt_18_hawaiian_resort", "cuban", "#ea580c", "Tropical Botanical Aloha Camp Shirt", 0.1, 0.6),
        ("shirt-19", "shirt_19_cardigan_button", "cardigan", "#57534e", "Alpaca V-Neck Ribbed Button Cardigan", 0.05, 0.9),
        ("shirt-20", "shirt_20_chambray_utility", "chambray", "#2563eb", "Workwear Double-Pocket Chambray Shirt", 0.1, 0.75)
    ]

    out_dirs = [
        "client/public/images/products/hats",
        "client/public/models/hats",
        "client/public/images/products/shirts",
        "client/public/models/shirts"
    ]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    # Generate 20 Hat GLBs
    for hat_id, filename, style, hex_col, name, met, rough in hats_def:
        mesh_node = generate_hat_mesh(style, hex_col)
        mat = {
            'name': f'{filename}_mat',
            'color': hex_to_rgba(hex_col),
            'metalness': met,
            'roughness': rough
        }
        glb_data = build_glb_binary([mesh_node], [mat])
        for target_dir in ["client/public/images/products/hats", "client/public/models/hats"]:
            path = os.path.join(target_dir, f"{filename}.glb")
            with open(path, "wb") as fp:
                fp.write(glb_data)
        print(f"Generated Hat GLB: {filename}.glb ({len(glb_data)} bytes)")

    # Generate 20 Shirt GLBs
    for shirt_id, filename, style, hex_col, name, met, rough in shirts_def:
        mesh_node = generate_shirt_mesh(style, hex_col)
        mat = {
            'name': f'{filename}_mat',
            'color': hex_to_rgba(hex_col),
            'metalness': met,
            'roughness': rough
        }
        glb_data = build_glb_binary([mesh_node], [mat])
        for target_dir in ["client/public/images/products/shirts", "client/public/models/shirts"]:
            path = os.path.join(target_dir, f"{filename}.glb")
            with open(path, "wb") as fp:
                fp.write(glb_data)
        print(f"Generated Shirt GLB: {filename}.glb ({len(glb_data)} bytes)")

if __name__ == "__main__":
    main()
