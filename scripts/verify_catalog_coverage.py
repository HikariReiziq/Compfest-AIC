from ai_engine.models.recommender import StyleRecommender

engine = StyleRecommender()

occasions = ["Formal", "Casual", "Sports", "Party", "Streetwear"]
fits = ["Regular Fit", "Slim / Fitted", "Oversized / Boxy", "Layered / Textured"]
colors = ["Earth Tone", "Jewel Tone / Sejuk", "Neutral / Monokrom", "Bold / Expressive"]
face_shapes = ["Oval", "Round", "Square", "Heart", "Oblong", "Diamond"]
skin_tones = [
    ("MST-01", "Fair", "Cool"),
    ("MST-02", "Fair", "Cool"),
    ("MST-04", "Light", "Neutral"),
    ("MST-06", "Tan", "Warm"),
    ("MST-08", "Dark", "Warm")
]
genders = ["male", "female"]
subcategories = ["glasses", "hats", "shirts"]

# Track which product IDs appear in top-4
recommended_ids = set()
top1_ids = set()
item_trigger_map = {}

total_trials = 0

for subcat in subcategories:
    for gender in genders:
        for f_shape in face_shapes:
            for mst, tone, ut in skin_tones:
                for occ in occasions:
                    for fit in fits:
                        for col in colors:
                            total_trials += 1
                            user_profile = {
                                "gender": gender,
                                "face_shape": f_shape,
                                "monk_tone": mst,
                                "skin_tone": tone,
                                "undertone": ut
                            }
                            quiz_answers = {
                                "occasion": occ,
                                "fit_preference": fit,
                                "color_mood": col
                            }
                            
                            res = engine.recommend(
                                subcategory=subcat,
                                user_profile=user_profile,
                                quiz_answers=quiz_answers
                            )
                            
                            items = [it.to_dict() for it in res.items]
                            if items:
                                top1 = items[0]["id"]
                                top1_ids.add(top1)
                                
                            for rank, item in enumerate(items, 1):
                                pid = item["id"]
                                recommended_ids.add(pid)
                                if pid not in item_trigger_map:
                                    item_trigger_map[pid] = {
                                        "name": item["name"],
                                        "subcategory": subcat,
                                        "gender": gender,
                                        "best_rank": rank,
                                        "archetype": item["archetype_title"],
                                        "sample_trigger": f"Gender: {gender}, Wajah: {f_shape}, Kulit: {tone}/{mst}, Acara: {occ}, Fit: {fit}, Mood: {col}"
                                    }
                                else:
                                    if rank < item_trigger_map[pid]["best_rank"]:
                                        item_trigger_map[pid]["best_rank"] = rank
                                        item_trigger_map[pid]["archetype"] = item["archetype_title"]
                                        item_trigger_map[pid]["sample_trigger"] = f"Gender: {gender}, Wajah: {f_shape}, Kulit: {tone}/{mst}, Acara: {occ}, Fit: {fit}, Mood: {col}"

catalog_ids = set(i["id"] for i in engine.catalog)
missing_ids = catalog_ids - recommended_ids

print("=" * 75)
print(f"📊 HASIL SIMULASI MENYELURUH ({total_trials:,} KOMBINASI BIOMETRIK & KUESIONER)")
print("=" * 75)
print(f"Total Model 3D di Katalog      : {len(catalog_ids)} item")
print(f"Produk Muncul di Rekomendasi   : {len(recommended_ids)} / {len(catalog_ids)} ({(len(recommended_ids)/len(catalog_ids))*100:.1f}%)")
print(f"Produk Meraih Juara 1 (Top-1)  : {len(top1_ids)} / {len(catalog_ids)} ({(len(top1_ids)/len(catalog_ids))*100:.1f}%)")
print()

if missing_ids:
    print(f"⚠️ Produk yang belum muncul: {missing_ids}")
else:
    print("✅ SEMUA 37 PRODUK 3D GLB 100% MEMILIKI PELUANG MUNCUL SECARA DINAMIS!")

print("\n--- DETAIL PEMICU (TRIGGER) SETIAP PRODUK 3D GLB ---")
for pid in sorted(catalog_ids):
    info = item_trigger_map.get(pid, {})
    name = info.get("name", pid)
    best_r = info.get("best_rank", "-")
    arch = info.get("archetype", "-")
    trigger = info.get("sample_trigger", "Tidak pernah terpicu")
    print(f"[{pid}] {name}")
    print(f"   • Peringkat Terbaik : #{best_r} ({arch})")
    print(f"   • Skenario Pemicu   : {trigger}\n")
