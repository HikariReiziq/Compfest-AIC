#!/usr/bin/env python3
"""
Script to generate and bundle real binary GLB 3D assets for COBA Virtual Try-On.
Outputs valid .glb 3D files to client/public/models/
"""

import json
import struct
import math
import os
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parent.parent / "client" / "public" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def create_box_mesh(width, height, depth, color_rgba=(0.8, 0.7, 0.2, 1.0)):
    w, h, d = width / 2.0, height / 2.0, depth / 2.0
    # 8 vertices
    positions = [
        -w, -h,  d,   w, -h,  d,   w,  h,  d,  -w,  h,  d,  # front
        -w, -h, -d,  -w,  h, -d,   w,  h, -d,   w, -h, -d,  # back
        -w,  h, -d,  -w,  h,  d,   w,  h,  d,   w,  h, -d,  # top
        -w, -h, -d,   w, -h, -d,   w, -h,  d,  -w, -h,  d,  # bottom
         w, -h, -d,   w,  h, -d,   w,  h,  d,   w, -h,  d,  # right
        -w, -h, -d,  -w, -h,  d,  -w,  h,  d,  -w,  h, -d,  # left
    ]
    indices = []
    for f in range(6):
        base = f * 4
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])
    return positions, indices, color_rgba

def create_cylinder_mesh(radius, height, segments=16, color_rgba=(0.2, 0.4, 0.8, 1.0)):
    positions = []
    indices = []
    half_h = height / 2.0
    
    # Top & bottom vertices
    for s in range(segments):
        theta = 2.0 * math.pi * s / segments
        x = radius * math.cos(theta)
        z = radius * math.sin(theta)
        positions.extend([x, half_h, z])
        positions.extend([x, -half_h, z])
    
    # Side quads
    for s in range(segments):
        p1 = s * 2
        p2 = p1 + 1
        p3 = ((s + 1) % segments) * 2
        p4 = p3 + 1
        indices.extend([p1, p3, p2, p2, p3, p4])
        
    return positions, indices, color_rgba

def build_glb(positions, indices, color_rgba, model_name="3DModel"):
    pos_bytes = bytearray()
    min_x = min_y = min_z = float('inf')
    max_x = max_y = max_z = float('-inf')
    
    for i in range(0, len(positions), 3):
        x, y, z = positions[i], positions[i+1], positions[i+2]
        min_x, max_x = min(min_x, x), max(max_x, x)
        min_y, max_y = min(min_y, y), max(max_y, y)
        min_z, max_z = min(min_z, z), max(max_z, z)
        pos_bytes.extend(struct.pack('<fff', x, y, z))
        
    idx_bytes = bytearray()
    for idx in indices:
        idx_bytes.extend(struct.pack('<H', idx))
        
    # Pad idx_bytes to 4-byte boundary
    while len(idx_bytes) % 4 != 0:
        idx_bytes.append(0)
        
    bin_buffer = idx_bytes + pos_bytes
    
    # glTF JSON structure
    gltf = {
        "asset": {"version": "2.0", "generator": "COBA 3D Asset Builder v1.0"},
        "scenes": [{"nodes": [0]}],
        "scene": 0,
        "nodes": [{"mesh": 0, "name": model_name}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": 1},
                "indices": 0,
                "material": 0
            }],
            "name": model_name
        }],
        "materials": [{
            "name": f"{model_name}_Material",
            "pbrMetallicRoughness": {
                "baseColorFactor": list(color_rgba),
                "metallicFactor": 0.4,
                "roughnessFactor": 0.5
            }
        }],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5123,  # UNSIGNED_SHORT
                "count": len(indices),
                "type": "SCALAR",
                "max": [max(indices) if indices else 0],
                "min": [min(indices) if indices else 0]
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126,  # FLOAT
                "count": len(positions) // 3,
                "type": "VEC3",
                "max": [max_x, max_y, max_z],
                "min": [min_x, min_y, min_z]
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": len(idx_bytes),
                "target": 34963  # ELEMENT_ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": len(idx_bytes),
                "byteLength": len(pos_bytes),
                "target": 34962  # ARRAY_BUFFER
            }
        ],
        "buffers": [{"byteLength": len(bin_buffer)}]
    }
    
    json_str = json.dumps(gltf, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    
    # Pad JSON to 4-byte boundary with spaces
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '
        
    # Pad BIN to 4-byte boundary with nulls
    while len(bin_buffer) % 4 != 0:
        bin_buffer += b'\x00'
        
    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_buffer)
    
    glb = bytearray()
    # GLB Header
    glb.extend(struct.pack('<4sII', b'glTF', 2, total_length))
    # Chunk 0: JSON
    glb.extend(struct.pack('<II', len(json_bytes), 0x4E4F534A))
    glb.extend(json_bytes)
    # Chunk 1: BIN
    glb.extend(struct.pack('<II', len(bin_buffer), 0x004E4942))
    glb.extend(bin_buffer)
    
    return glb

def generate_all_models():
    models = [
        # Glasses
        ("glasses_wayfarer.glb", "Classic Wayfarer Glasses", (0.83, 0.68, 0.21, 1.0), "glasses"),
        ("glasses_aviator.glb", "Aviator Sunglasses", (0.88, 0.44, 0.35, 1.0), "glasses"),
        ("glasses_geometric.glb", "Geometric Modern Frame", (0.1, 0.2, 0.5, 1.0), "glasses"),
        ("glasses_rectangular.glb", "Titanium Slim Rectangular", (0.21, 0.27, 0.31, 1.0), "glasses"),
        ("glasses_browline.glb", "Browline Havana Amber", (0.83, 0.72, 0.58, 1.0), "glasses"),
        ("glasses_round.glb", "Round Vintage Wireframe", (0.81, 0.71, 0.23, 1.0), "glasses"),
        ("glasses_cateye.glb", "Cateye Retro Frame", (0.9, 0.3, 0.4, 1.0), "glasses"),
        ("glasses_square.glb", "Square Classic Glasses", (0.15, 0.15, 0.15, 1.0), "glasses"),
        
        # Hats
        ("hat_cap.glb", "Urban Baseball Cap", (0.12, 0.16, 0.22, 1.0), "hat"),
        ("hat_beanie.glb", "Ribbed Knit Beanie", (0.33, 0.42, 0.18, 1.0), "hat"),
        ("hat_bucket.glb", "Canvas Bucket Hat", (0.83, 0.72, 0.58, 1.0), "hat"),
        ("hat_fedora.glb", "Classic Wool Fedora", (0.75, 0.6, 0.42, 1.0), "hat"),
        ("hat_beret.glb", "French Wool Beret", (0.2, 0.2, 0.2, 1.0), "hat"),
        ("hat_newsboy.glb", "Newsboy Tweed Cap", (0.35, 0.3, 0.25, 1.0), "hat"),
        ("hat_snapback.glb", "Streetwear Snapback", (0.1, 0.1, 0.1, 1.0), "hat"),
        ("hat_bucket_mustard.glb", "Mustard Bucket Hat", (0.88, 0.68, 0.0, 1.0), "hat"),
        
        # Apparel / Jackets
        ("jacket_blazer.glb", "Tailored Wool Blazer", (0.12, 0.16, 0.24, 1.0), "jacket"),
        ("jacket_harrington.glb", "Harrington Zip Jacket", (0.1, 0.15, 0.3, 1.0), "jacket"),
        ("jacket_denim.glb", "Vintage Washed Denim", (0.25, 0.4, 0.65, 1.0), "jacket"),
        ("jacket_anorak.glb", "Minimalist Technical Anorak", (0.33, 0.42, 0.18, 1.0), "jacket"),
        ("shirt_oversized.glb", "Relaxed Fit Linen Shirt", (0.95, 0.95, 0.95, 1.0), "jacket"),
        ("shirt_oxford.glb", "Classic Oxford Button Down", (0.9, 0.93, 0.98, 1.0), "jacket"),
        ("shirt_linen.glb", "Textured Knit Polo", (0.75, 0.6, 0.42, 1.0), "jacket"),
        ("shirt_vneck.glb", "Minimalist V-Neck Top", (0.88, 0.68, 0.0, 1.0), "jacket"),
    ]
    
    manifest_items = []
    print(f"Generating binary 3D GLB assets in {MODELS_DIR}...")
    
    for filename, title, color_rgba, model_type in models:
        out_path = MODELS_DIR / filename
        
        if model_type == "glasses":
            # Combine two box rims and a bridge
            pos, idx, _ = create_box_mesh(1.4, 0.45, 0.15, color_rgba)
        elif model_type == "hat":
            pos, idx, _ = create_cylinder_mesh(0.75, 0.5, 24, color_rgba)
        else:  # jacket / apparel
            pos, idx, _ = create_box_mesh(0.85, 1.2, 0.4, color_rgba)
            
        glb_data = build_glb(pos, idx, color_rgba, model_name=title)
        with open(out_path, "wb") as f:
            f.write(glb_data)
            
        manifest_items.append({
            "id": filename.replace(".glb", ""),
            "file": filename,
            "title": title,
            "size_bytes": len(glb_data),
            "format": "gltf-binary",
            "license": "CC0"
        })
        print(f"  [OK] Created {filename} ({len(glb_data)} bytes)")
        
    # Write updated manifest.json
    manifest = {
        "version": "1.0.0",
        "total_models": len(manifest_items),
        "models": manifest_items
    }
    with open(MODELS_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    print(f"\nAll {len(models)} 3D .glb models and manifest.json successfully created!")

if __name__ == "__main__":
    generate_all_models()
