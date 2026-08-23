# Categorized 3D OBJ Assets & AR Fitting Plan

## 1. Directory Organization
Group 3D OBJ assets into separate folders:
- `client/public/models/glasses/` and `client/public/images/products/glasses/`
- `client/public/models/hats/` and `client/public/images/products/hats/`
- `client/public/models/shirts/` and `client/public/images/products/shirts/`
- `client/public/models/jackets/` and `client/public/images/products/jackets/`

## 2. 3D OBJ Asset Generation & Catalog Mapping
- Build authentic Wavefront OBJ models with geometric precision, vertex normals, and UVs for:
  - Glasses: `oculos.obj`, `glasses_wayfarer.obj`, `glasses_aviator.obj`, `glasses_geometric.obj`, `glasses_rectangular.obj`, `glasses_round.obj`, `glasses_browline.obj`, `glasses_cateye.obj`
  - Hats: `hat_cap.obj`, `hat_fedora.obj`, `hat_beanie.obj`, `hat_bucket.obj`, `hat_beret.obj`, `hat_snapback.obj`
  - Shirts: `shirt_oxford.obj`, `shirt_tshirt.obj`, `shirt_linen.obj`, `shirt_polo.obj`, `shirt_vneck.obj`
  - Jackets: `jacket_blazer.obj`, `jacket_denim.obj`, `jacket_harrington.obj`, `jacket_bomber.obj`, `jacket_anorak.obj`
- Map catalog items to their respective OBJ paths in `ai_engine/data/catalog.json`, `client/src/lib/api.ts`, and `client/src/lib/mockData.ts`.

## 3. AR Fitting Engine Integration
- `ARCanvasViewer.tsx`: Uses Three.js `OBJLoader` to dynamically fetch the selected glasses/hat `.obj` file and fit it to face landmarks with 60 FPS tracking.
- `BodyOutfitViewer.tsx`: Uses Three.js `OBJLoader` to dynamically fetch the selected shirt/jacket `.obj` file and fit it to upper-body landmarks (shoulders, chest, torso, arms) with 60 FPS tracking.
