"""Audit orientasi GLB katalog dari geometri vertex, bukan bounding box.

Lahir dari insiden nyata: dua generasi heuristik orientasi (aturan y>z, lalu
aturan sumbu-terpanjang) sama-sama merusak model yang sebenarnya sudah benar,
karena kacamata sungguhan memang kira-kira sedalam lebarnya saat gagang
terbuka — urutan panjang sumbu tidak pernah cukup untuk menyimpulkan arah
hadap. Dua pelajaran yang dibayar mahal dan dijaga alat ini:

1. Min/max accessor BUKAN bentuk yang dilihat Three.js. Transform node yang
   di-bake (rotasi, skala, matrix) mengubah bbox dunia secara drastis;
   analisis apa pun yang membaca accessor mentah menyimpulkan orientasi yang
   salah. Alat ini selalu menyusuri scene graph dan bekerja di ruang dunia.
2. Keputusan orientasi harus dari melihat sebaran vertex, bukan angka agregat.
   Proyeksi ASCII di bawah cukup untuk mengenali "dua lensa berdampingan"
   (tampak depan) versus "bingkai terlihat dari sisi tipisnya".

Pakai saat menambah aset baru:

    python scripts/audit_glb_orientation.py client/public/images/products/glasses/*.glb

Baca proyeksinya, tentukan rotasi Euler yang membawa model ke konvensi scene
(lebar di X, tinggi di Y, gagang menjulur ke -Z, bingkai depan di Z maksimum),
lalu tulis ke `rotation_correction` di glb_manifest.json. Runtime memakai nilai
itu apa adanya; [0,0,0] artinya terverifikasi benar.
"""

from __future__ import annotations

import json
import math
import struct
import sys

import numpy as np


def parse_glb(path: str):
    with open(path, "rb") as fh:
        data = fh.read()
    off, js, bin_ = 12, None, None
    while off < len(data):
        clen, ctype = struct.unpack_from("<II", data, off)
        off += 8
        chunk = data[off : off + clen]
        off += clen
        if ctype == 0x4E4F534A:
            js = json.loads(chunk.decode("utf-8"))
        elif ctype == 0x004E4942:
            bin_ = chunk
    return js, bin_


def quat_mat(q):
    x, y, z, w = q
    n = math.sqrt(x * x + y * y + z * z + w * w) or 1.0
    x, y, z, w = x / n, y / n, z / n, w / n
    return np.array(
        [
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
        ]
    )


def local_mat(nd):
    if "matrix" in nd:
        return np.array(nd["matrix"], float).reshape(4, 4, order="F")
    M = np.eye(4)
    R = np.eye(3)
    S = np.ones(3)
    if "rotation" in nd:
        R = quat_mat(nd["rotation"])
    if "scale" in nd:
        S = np.array(nd["scale"], float)
    M[:3, :3] = R * S
    if "translation" in nd:
        M[:3, 3] = nd["translation"]
    return M


def world_points(js, bin_, max_pts: int = 8000):
    nodes = js.get("nodes", [])
    chunks = []

    def rec(i, parent):
        nd = nodes[i]
        M = parent @ local_mat(nd)
        if "mesh" in nd:
            for prim in js["meshes"][nd["mesh"]]["primitives"]:
                ai = prim["attributes"].get("POSITION")
                if ai is None:
                    continue
                acc = js["accessors"][ai]
                if acc.get("componentType") != 5126:
                    continue  # terkuantisasi/draco: lewati vertex, bbox tetap salah dilaporkan
                bv = js["bufferViews"][acc["bufferView"]]
                off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
                stride = bv.get("byteStride") or 12
                cnt = acc["count"]
                if stride == 12:
                    p = np.frombuffer(bin_, "<f4", count=cnt * 3, offset=off).reshape(-1, 3)
                else:
                    step = max(1, cnt // max_pts)
                    p = np.array(
                        [
                            np.frombuffer(bin_, "<f4", count=3, offset=off + k * stride)
                            for k in range(0, cnt, step)
                        ]
                    )
                p = p.astype(float)
                if len(p) > max_pts:
                    p = p[:: len(p) // max_pts]
                chunks.append((M[:3, :3] @ p.T).T + M[:3, 3])
        for c in nd.get("children", []):
            rec(c, M)

    scene = js.get("scenes", [{}])[js.get("scene", 0)]
    for r in scene.get("nodes", []):
        rec(r, np.eye(4))
    return np.vstack(chunks) if chunks else None


def euler_xyz_mat(rx, ry, rz):
    """Sama dengan urutan Euler default three.js ('XYZ')."""
    cx, sx, cy, sy, cz, sz = (
        math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz),
    )
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rx @ Ry @ Rz


def ascii_grid(u, v, rows: int = 13):
    du = (u.max() - u.min()) or 1.0
    dv = (v.max() - v.min()) or 1.0
    cols = min(56, max(16, int(rows * 2.1 * du / dv)))
    gi = np.clip(((u - u.min()) / du * (cols - 1)).astype(int), 0, cols - 1)
    gj = np.clip(((v - v.min()) / dv * (rows - 1)).astype(int), 0, rows - 1)
    g = np.zeros((rows, cols))
    np.add.at(g, (gj, gi), 1)
    mx = g.max() or 1
    ch = " .:*#@"
    return [
        "".join(
            ch[0] if g[j, i] == 0 else ch[1 + min(4, int(4 * g[j, i] / mx))]
            for i in range(cols)
        )
        for j in range(rows - 1, -1, -1)
    ]


def report(path: str, rotation=None) -> None:
    js, bin_ = parse_glb(path)
    P = world_points(js, bin_)
    print("=" * 72)
    print(path.rsplit("/", 1)[-1], f"(rotasi {rotation})" if rotation else "")
    if P is None:
        print("  vertex tidak terbaca (draco/terkuantisasi)")
        return
    if rotation:
        P = (euler_xyz_mat(*rotation) @ P.T).T
    ext = P.max(0) - P.min(0)
    print(f"  extents dunia: X={ext[0]:.3f}  Y={ext[1]:.3f}  Z={ext[2]:.3f}")
    # Konvensi benar: bingkai depan menumpuk di dekat Z maksimum, gagang tipis ke -Z.
    depth = ext[2] or 1.0
    front = (P[:, 2] > P[:, 2].max() - 0.15 * depth).mean()
    back = (P[:, 2] < P[:, 2].min() + 0.15 * depth).mean()
    print(f"  massa slab depan (z maks) {front:.0%} vs belakang {back:.0%}")
    print("  --- proyeksi X-Y (harus tampak depan: dua lensa) ---")
    for line in ascii_grid(P[:, 0], P[:, 1]):
        print("   ", line)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    manifest = {}
    try:
        with open("client/public/images/products/glb_manifest.json") as fh:
            manifest = json.load(fh)
    except OSError:
        pass
    for f in sys.argv[1:]:
        cfg = manifest.get(f.rsplit("/", 1)[-1], {})
        rot = cfg.get("rotation_correction")
        report(f, rotation=rot if rot and any(rot) else None)
