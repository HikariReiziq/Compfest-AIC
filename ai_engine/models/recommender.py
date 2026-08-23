"""Multi-Criteria Recommendation Engine generating Top-4 Curated Archetypes."""

import json
import os
from typing import Dict, List, Optional, Tuple, Any


class RecommendationItem:
    """Represents a single recommended item within the Top-4 curated selection."""

    def __init__(
        self,
        rank: int,
        archetype: str,
        archetype_title: str,
        item_id: str,
        name: str,
        category: str,
        subcategory: str,
        base_colour: str,
        hex_colour: str,
        usage: str,
        model_3d_path: str,
        preview_image_url: str,
        price_idr: str,
        compatibility_score: float,
        color_match_score: float,
        shape_match_score: float,
        stylist_reason: str,
        model_type: Optional[str] = None,
    ):
        self.rank = rank
        self.archetype = archetype  # "perfect_match", "safe_classic", "bold_statement", "modern_trendy"
        self.archetype_title = archetype_title  # "Pilihan 1: The Perfect Match", etc.
        self.item_id = item_id
        self.name = name
        self.category = category
        self.subcategory = subcategory
        self.base_colour = base_colour
        self.hex_colour = hex_colour
        self.usage = usage
        self.model_3d_path = model_3d_path
        self.preview_image_url = preview_image_url
        self.price_idr = price_idr
        self.compatibility_score = round(compatibility_score, 1)  # percentage e.g. 96.5%
        self.color_match_score = round(color_match_score, 1)
        self.shape_match_score = round(shape_match_score, 1)
        self.stylist_reason = stylist_reason
        self.model_type = model_type or self._infer_model_type(name, subcategory)

    def _infer_model_type(self, name: str, subcategory: str) -> str:
        n = name.lower()
        sub = subcategory.lower()
        if "hat" in sub:
            if "bucket" in n:
                return "bucket"
            if "beanie" in n:
                return "beanie"
            if "baseball" in n or "cap" in n or "snapback" in n:
                return "cap"
            if "beret" in n:
                return "beret"
            if "newsboy" in n or "flat" in n:
                return "newsboy"
            return "fedora"
        elif "glass" in sub:
            if "wayfarer" in n:
                return "wayfarer"
            if "aviator" in n:
                return "aviator"
            if "round" in n or "circular" in n:
                return "round"
            if "geometric" in n or "octagonal" in n:
                return "geometric"
            if "cateye" in n or "cat-eye" in n:
                return "cateye"
            if "browline" in n or "clubmaster" in n:
                return "browline"
            return "rectangular"
        return sub

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rank": self.rank,
            "archetype": self.archetype,
            "archetype_title": self.archetype_title,
            "id": self.item_id,
            "name": self.name,
            "category": self.category,
            "subcategory": self.subcategory,
            "base_colour": self.base_colour,
            "hex_colour": self.hex_colour,
            "usage": self.usage,
            "model_type": self.model_type,
            "model_3d_path": self.model_3d_path,
            "preview_image_url": self.preview_image_url,
            "price_idr": self.price_idr,
            "compatibility_score": self.compatibility_score,
            "color_match_score": self.color_match_score,
            "shape_match_score": self.shape_match_score,
            "stylist_reason": self.stylist_reason,
        }


class CuratedRecommendationResult:
    """Represents the complete Top-4 recommendation batch with explanation."""

    def __init__(
        self,
        subcategory: str,
        primary_auto_attached_item: RecommendationItem,
        items: List[RecommendationItem],
        personal_summary: Dict[str, Any],
    ):
        self.subcategory = subcategory
        self.primary_auto_attached_item = primary_auto_attached_item
        self.items = items
        self.personal_summary = personal_summary

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subcategory": self.subcategory,
            "primary_item_id": self.primary_auto_attached_item.item_id,
            "items": [item.to_dict() for item in self.items],
            "personal_summary": self.personal_summary,
        }


class StyleRecommender:
    """Generates Top-4 Curated Style Archetypes based on personal profiling and targeted questionnaire."""

    def __init__(self, catalog_file_path: Optional[str] = None):
        if catalog_file_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            catalog_file_path = os.path.join(base_dir, "data", "catalog.json")

        self.catalog = self._load_catalog(catalog_file_path)

    def _load_catalog(self, file_path: str) -> List[Dict[str, Any]]:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data.get("items", [])
                elif isinstance(data, list):
                    return data
        return []

    def recommend(
        self,
        subcategory: str,
        user_profile: Dict[str, Any],
        quiz_answers: Dict[str, Any],
    ) -> CuratedRecommendationResult:
        """
        Calculates compatibility scores and curates the Top-4 Style Archetypes based on user AI scan & quiz.
        """
        # Normalize subcategory
        subcat = subcategory.lower().strip()
        if subcat in ["kacamata", "glasses", "eyewear"]:
            subcat = "glasses"
        elif subcat in ["topi", "hats", "headwear"]:
            subcat = "hats"
        elif subcat in ["baju", "kaos", "kemeja", "shirts", "tshirt", "apparel"]:
            subcat = "shirts"
        elif subcat in ["jaket", "jackets", "outerwear"]:
            subcat = "jackets"
        else:
            subcat = "glasses"

        # 1. Filter catalog items by subcategory
        candidate_items = [
            item for item in self.catalog
            if item.get("category") == subcat or item.get("subcategory") == subcat
        ]
        if not candidate_items:
            candidate_items = self.catalog[:4]

        # Helper to unpack profile values whether string or nested dict
        def extract_profile_str(val: Any, subkey: str = "", default: str = "") -> str:
            if isinstance(val, dict):
                if subkey and subkey in val:
                    return str(val[subkey])
                for k in ["undertone", "shape", "code", "index", "hex", "label", "value"]:
                    if k in val:
                        return str(val[k])
                return default
            return str(val) if val is not None else default

        # Extract profile attributes (3-parameter biometrics)
        undertone = extract_profile_str(user_profile.get("undertone"), "undertone", "Warm")
        face_shape = extract_profile_str(user_profile.get("face_shape"), "shape", "Oval")
        mst_code = extract_profile_str(user_profile.get("monk_tone"), "code", "MST-06")
        skin_tone = extract_profile_str(user_profile.get("skin_tone"), "tone", "Tan")
        gender = extract_profile_str(user_profile.get("gender"), "label_id", "male").lower()

        # Extract quiz attributes
        quiz_occasion = str(quiz_answers.get("occasion", "Casual"))
        quiz_fit = str(quiz_answers.get("fit_preference", "Regular Fit"))
        quiz_color = str(quiz_answers.get("color_mood", "Earth Tone"))
        quiz_brand_style = str(quiz_answers.get("brand_style", ""))
        quiz_comfort = str(quiz_answers.get("comfort_priority", ""))
        quiz_material = str(quiz_answers.get("material_preference", ""))
        quiz_budget = str(quiz_answers.get("budget_range", ""))

        scored_items = []
        for item in candidate_items:
            base_col = item.get("baseColour") or item.get("colour") or "Black"
            model_type = item.get("modelType") or subcat
            item_gender = str(item.get("gender", "Unisex")).lower()

            # ----------------------------------------------------
            # A. Color Harmony Score (0 - 100)
            # ----------------------------------------------------
            color_score = 80.0
            u_low = undertone.lower()
            b_low = base_col.lower()

            if "warm" in u_low or skin_tone.lower() in ["tan", "dark"]:
                if any(c in b_low for c in ["gold", "terracotta", "warm beige", "mustard", "olive", "straw", "crimson", "sand", "brown", "amber"]):
                    color_score = 98.5
                elif any(c in b_low for c in ["black", "white", "grey"]):
                    color_score = 92.0
                else:
                    color_score = 82.0
            elif "cool" in u_low or skin_tone.lower() in ["fair", "light"]:
                if any(c in b_low for c in ["silver", "navy", "charcoal", "sky blue", "blue", "emerald", "berry", "burgundy", "gunmetal"]):
                    color_score = 98.5
                elif any(c in b_low for c in ["black", "white", "grey"]):
                    color_score = 94.0
                else:
                    color_score = 80.0
            elif "olive" in u_low:
                if any(c in b_low for c in ["olive", "deep teal", "terracotta", "burgundy", "charcoal", "navy", "bronze"]):
                    color_score = 97.5
                else:
                    color_score = 88.0
            else:  # Neutral / Medium
                color_score = 94.0

            # Color Mood bonus from quiz
            cm_low = quiz_color.lower()
            if any(k in cm_low for k in ["earth", "gold", "amber", "terracotta"]) and any(c in b_low for c in ["terracotta", "mustard", "olive", "warm beige", "sand", "straw", "gold", "amber", "brown"]):
                color_score = min(100.0, color_score + 4.0)
            elif any(k in cm_low for k in ["silver", "navy", "sapphire", "steel", "jewel"]) and any(c in b_low for c in ["navy", "emerald", "gold", "crimson", "burgundy", "silver", "blue"]):
                color_score = min(100.0, color_score + 4.0)
            elif any(k in cm_low for k in ["monochrome", "black", "charcoal"]) and any(c in b_low for c in ["black", "white", "grey", "charcoal", "gunmetal"]):
                color_score = min(100.0, color_score + 4.0)

            # ----------------------------------------------------
            # B. Shape & Silhouette Harmony Score (0 - 100)
            # ----------------------------------------------------
            shape_score = 82.0
            if subcat in ["glasses", "hats"]:
                flattering_faces = [f.lower() for f in item.get("flatteringFaceShapes", [])]
                if face_shape.lower() in flattering_faces:
                    shape_score = 97.0
                elif face_shape.lower() == "oval":
                    shape_score = 95.0  # Oval is versatile
                elif face_shape.lower() == "round" and model_type in ["wayfarer", "geometric", "browline", "cap", "snapback"]:
                    shape_score = 94.0
                elif face_shape.lower() == "square" and model_type in ["aviator", "round", "straw", "beanie"]:
                    shape_score = 94.0
                elif face_shape.lower() == "heart" and model_type in ["aviator", "browline", "straw", "cap"]:
                    shape_score = 93.0
                else:
                    shape_score = 84.0
            else:
                # Shirts / Apparel — scoring harmonis
                shape_score = 88.0

            # ----------------------------------------------------
            # C. Occasion & Lifestyle Score (0 - 100)
            # ----------------------------------------------------
            quiz_score = 80.0
            item_usage = item.get("usage", "Casual").lower()
            if item_usage == quiz_occasion.lower():
                quiz_score += 12.0
            elif "casual" in quiz_occasion.lower() and item_usage in ["casual", "streetwear"]:
                quiz_score += 8.0

            style_tags = [t.lower() for t in item.get("styleTags", [])]
            if any(tag in quiz_fit.lower() for tag in style_tags):
                quiz_score += 5.0

            # ----------------------------------------------------
            # D. Style & Gender Affinity Score (0 - 100)
            # ----------------------------------------------------
            style_affinity = 85.0
            # Gender match bonus
            if item_gender == "unisex" or (gender == "female" and "women" in item_gender) or (gender == "male" and "men" in item_gender):
                style_affinity += 8.0

            if quiz_brand_style and any(quiz_brand_style.lower() in t for t in style_tags):
                style_affinity += 4.0

            if quiz_material and any(m in item.get("name", "").lower() for m in ["acetate", "titanium", "steel", "metal", "cotton", "linen"]):
                style_affinity += 3.0

            # Weighted Total: 35% Color + 30% Shape + 20% Occasion/Quiz + 15% Style Affinity
            total_score = (
                (0.35 * color_score) +
                (0.30 * shape_score) +
                (0.20 * min(100.0, quiz_score)) +
                (0.15 * min(100.0, style_affinity))
            )

            scored_items.append({
                "item": item,
                "total_score": total_score,
                "color_score": color_score,
                "shape_score": shape_score,
            })

        # Sort by total score descending
        scored_items.sort(key=lambda x: x["total_score"], reverse=True)

        # 4 Curated Archetypes
        archetypes = [
            ("perfect_match", "Pilihan 1: The Perfect Match (#1 Best Fit)"),
            ("safe_classic", "Pilihan 2: Safe Classic (Pilihan Serbaguna)"),
            ("bold_statement", "Pilihan 3: Bold Statement (Aksen Kontras)"),
            ("modern_trendy", "Pilihan 4: Modern Silhouette (Varian Kekinian)"),
        ]

        # Select 4 distinct model types if available
        selected_entries = []
        used_model_types = set()

        for entry in scored_items:
            mtype = entry["item"].get("modelType") or entry["item"].get("id")
            if mtype not in used_model_types:
                selected_entries.append(entry)
                used_model_types.add(mtype)
            if len(selected_entries) == 4:
                break

        if len(selected_entries) < 4:
            for entry in scored_items:
                if entry not in selected_entries:
                    selected_entries.append(entry)
                if len(selected_entries) == 4:
                    break

        curated_items = []
        for idx in range(min(4, len(selected_entries))):
            entry = selected_entries[idx]
            item_data = entry["item"]
            arch_key, arch_title = archetypes[idx]

            base_col = item_data.get("baseColour") or "Black"
            hex_col = item_data.get("hex_colour") or "#111827"
            item_name = item_data.get("name") or "Fashion Item"
            item_usage = item_data.get("usage") or "Casual"
            item_price = item_data.get("priceIdr") or "Rp299.000"
            model_p = item_data.get("model_3d_path") or ""
            prev_p = item_data.get("preview_image_url") or ""

            if idx == 0:
                reason = (
                    f"Rekomendasi terbaik skor {entry['total_score']:.1f}%. Disesuaikan untuk kebutuhan {quiz_occasion}, "
                    f"rona {base_col} berpadu harmonis dengan undertone {undertone} kulit Anda "
                    f"dan siluet {item_name} menyeimbangkan proporsi wajah {face_shape}."
                )
            elif idx == 1:
                reason = (
                    f"Pilihan klasik serbaguna bernuansa {base_col} yang aman dipadukan untuk aktivitas {item_usage} "
                    f"tanpa mendominasi fitur alami tubuh Anda."
                )
            elif idx == 2:
                reason = (
                    f"Pilihan percaya diri dengan aksen warna {base_col} ({quiz_color}) yang mempertegas karakter visual "
                    f"dan memberikan kontras elegan pada rona kulit Anda."
                )
            else:
                reason = (
                    f"Varian siluet kontemporer {item_name} yang memberikan aksen modern dan proporsi dinamis "
                    f"untuk tampilan harian yang stylish."
                )

            rec_item = RecommendationItem(
                rank=idx + 1,
                archetype=arch_key,
                archetype_title=arch_title,
                item_id=item_data.get("id", f"item-{idx}"),
                name=item_name,
                category=item_data.get("category", "Accessories"),
                subcategory=item_data.get("subcategory", subcat),
                base_colour=base_col,
                hex_colour=hex_col,
                usage=item_usage,
                model_3d_path=model_p,
                preview_image_url=prev_p,
                price_idr=item_price,
                compatibility_score=entry["total_score"],
                color_match_score=entry["color_score"],
                shape_match_score=entry["shape_score"],
                stylist_reason=reason,
                model_type=item_data.get("modelType") or item_data.get("subcategory"),
            )
            curated_items.append(rec_item)

        primary_item = curated_items[0] if curated_items else None

        personal_summary = {
            "monk_tone": mst_code,
            "undertone": undertone,
            "face_shape": face_shape,
            "quiz_answers": quiz_answers,
            "total_candidates": len(candidate_items),
        }

        return CuratedRecommendationResult(
            subcategory=subcat,
            primary_auto_attached_item=primary_item,
            items=curated_items,
            personal_summary=personal_summary,
        )
