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
                return json.load(f).get("items", [])
        return []

    def recommend(
        self,
        subcategory: str,
        user_profile: Dict[str, Any],
        quiz_answers: Dict[str, Any],
    ) -> CuratedRecommendationResult:
        """
        Calculates compatibility scores and curates the Top-4 Style Archetypes.
        """
        # Normalize subcategory
        subcat = subcategory.lower().strip()
        if subcat in ["kacamata", "glasses", "eyewear"]:
            subcat = "glasses"
        elif subcat in ["topi", "hats", "headwear"]:
            subcat = "hats"
        elif subcat in ["baju", "kaos", "kemeja", "shirts", "tshirt"]:
            subcat = "shirts"
        elif subcat in ["jaket", "outerwear", "jackets", "blazer"]:
            subcat = "jackets"
        else:
            subcat = "glasses"

        # 1. Filter catalog items by subcategory
        candidate_items = [item for item in self.catalog if item.get("subcategory") == subcat]
        if not candidate_items:
            candidate_items = self.catalog[:4]

        # Extract profile attributes
        undertone = user_profile.get("undertone", "Warm")
        face_shape = user_profile.get("face_shape", "Oval")
        body_shape = user_profile.get("body_shape", "Hourglass")
        mst_code = user_profile.get("monk_tone", "MST-06")

        # Extract quiz attributes (both standard and deep batch questions)
        quiz_occasion = quiz_answers.get("occasion", "Casual")
        quiz_fit = quiz_answers.get("fit_preference", "Regular Fit")
        quiz_color = quiz_answers.get("color_mood", "Earth Tone")
        quiz_brand_style = quiz_answers.get("brand_style", "")
        quiz_comfort = quiz_answers.get("comfort_priority", "")
        quiz_budget = quiz_answers.get("budget_range", "")

        scored_items = []
        for item in candidate_items:
            # A. Color Score (0-100)
            color_score = 75.0
            base_col = item.get("baseColour", "")
            if undertone == "Warm" and base_col in ["Terracotta", "Mustard Yellow", "Olive Green", "Warm Beige", "Gold"]:
                color_score = 98.0
            elif undertone == "Cool" and base_col in ["Navy Blue", "Charcoal Grey", "Emerald Green", "Burgundy / Berry"]:
                color_score = 98.0
            elif undertone == "Olive" and base_col in ["Olive Green", "Deep Teal", "Terracotta", "Burgundy / Berry"]:
                color_score = 98.0
            elif undertone == "Neutral":
                color_score = 92.0

            # Color mood bonus
            if "earth" in quiz_color.lower() and base_col in ["Terracotta", "Mustard Yellow", "Olive Green", "Warm Beige"]:
                color_score = min(100.0, color_score + 2.0)
            elif "jewel" in quiz_color.lower() and base_col in ["Navy Blue", "Emerald Green", "Burgundy / Berry"]:
                color_score = min(100.0, color_score + 2.0)
            elif "neutral" in quiz_color.lower() and base_col in ["Charcoal Grey", "Warm Beige"]:
                color_score = min(100.0, color_score + 2.0)

            # B. Shape Score (0-100)
            shape_score = 75.0
            if item.get("category") == "Accessories":
                if face_shape in item.get("flatteringFaceShapes", []):
                    shape_score = 96.0
            else:
                if body_shape in item.get("flatteringBodyShapes", []):
                    shape_score = 96.0

            # C. Occasion & Quiz Fit Score (0-100)
            quiz_score = 75.0
            if item.get("usage", "").lower() == quiz_occasion.lower():
                quiz_score += 12.0

            style_tags = [t.lower() for t in item.get("styleTags", [])]
            if any(tag in quiz_fit.lower() for tag in style_tags):
                quiz_score += 5.0

            # Deep personalization bonuses
            if quiz_brand_style:
                if any(quiz_brand_style.lower() in t for t in style_tags) or quiz_brand_style.lower() in item.get("description", "").lower():
                    quiz_score += 4.0

            if quiz_comfort:
                if "comfort" in quiz_comfort.lower() and any(t in ["relaxed", "casual", "utility"] for t in style_tags):
                    quiz_score += 3.0
                elif "style" in quiz_comfort.lower() and any(t in ["tailored", "sharp", "structured"] for t in style_tags):
                    quiz_score += 3.0

            if quiz_budget:
                price_str = item.get("priceIdr", "0")
                price_num = int("".join([c for c in price_str if c.isdigit()]) or "0")
                if "budget" in quiz_budget.lower() and price_num <= 250000:
                    quiz_score += 3.0
                elif "premium" in quiz_budget.lower() and price_num >= 350000:
                    quiz_score += 3.0

            # Combined Score
            total_score = (0.40 * color_score) + (0.35 * shape_score) + (0.25 * min(100.0, quiz_score))

            scored_items.append({
                "item": item,
                "total_score": total_score,
                "color_score": color_score,
                "shape_score": shape_score,
            })

        # Sort by highest score first
        scored_items.sort(key=lambda x: x["total_score"], reverse=True)

        # 4 Curated Archetypes with distinct models
        archetypes = [
            ("perfect_match", "Pilihan 1: The Perfect Match (#1 Best Fit)"),
            ("safe_classic", "Pilihan 2: Safe Classic (Pilihan Serbaguna)"),
            ("bold_statement", "Pilihan 3: Bold Statement (Aksen Kontras)"),
            ("modern_trendy", "Pilihan 4: Modern Silhouette (Varian Kekinian)"),
        ]

        # Pick 4 distinct models if possible
        selected_entries = []
        used_model_types = set()

        for entry in scored_items:
            mtype = entry["item"].get("modelType") or entry["item"].get("id")
            if mtype not in used_model_types:
                selected_entries.append(entry)
                used_model_types.add(mtype)
            if len(selected_entries) == 4:
                break

        # Fallback if less than 4 unique models
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

            fit_text = f" ({quiz_fit})" if quiz_fit else ""
            brand_text = f" bernuansa {quiz_brand_style}" if quiz_brand_style else ""

            if idx == 0:
                reason = (
                    f"Rekomendasi terbaik skor {entry['total_score']:.1f}%. Disesuaikan untuk momen {quiz_occasion}"
                    f"{brand_text}, warna {item_data['baseColour']} menyatu selaras dengan rona {undertone} kulit Anda "
                    f"dan siluet {item_data['name']} dirancang khusus untuk proporsi wajah {face_shape}."
                )
            elif idx == 1:
                reason = (
                    f"Opsi klasik serbaguna untuk kebutuhan {quiz_occasion} dengan warna netral {item_data['baseColour']} "
                    f"yang aman dan elegan dipadupadankan."
                )
            elif idx == 2:
                reason = (
                    f"Pilihan percaya diri dengan aksen warna kontras {item_data['baseColour']} untuk nuansa {quiz_color} "
                    f"yang mempertegas karakter personal tanpa bertabrakan dengan undertone Anda."
                )
            else:
                reason = (
                    f"Potongan modern berkarakter kekinian{fit_text} yang dirancang untuk menjaga kenyamanan "
                    f"dan estetika visual wajah {face_shape} Anda."
                )

            rec_item = RecommendationItem(
                rank=idx + 1,
                archetype=arch_key,
                archetype_title=arch_title,
                item_id=item_data["id"],
                name=item_data["name"],
                category=item_data["category"],
                subcategory=item_data["subcategory"],
                base_colour=item_data["baseColour"],
                hex_colour=item_data.get("hexColour", "#111827"),
                usage=item_data["usage"],
                model_3d_path=item_data.get("model3dPath", ""),
                preview_image_url=item_data.get("previewImageUrl", ""),
                price_idr=item_data.get("priceIdr", "Rp299.000"),
                compatibility_score=entry["total_score"],
                color_match_score=entry["color_score"],
                shape_match_score=entry["shape_score"],
                stylist_reason=reason,
                model_type=item_data.get("modelType"),
            )
            curated_items.append(rec_item)

        primary_item = curated_items[0] if curated_items else None

        personal_summary = {
            "monk_tone": mst_code,
            "undertone": undertone,
            "face_shape": face_shape,
            "body_shape": body_shape,
            "target_occasion": quiz_occasion,
            "target_color_mood": quiz_color,
            "target_fit": quiz_fit,
            "compatibility_guarantee": f"{primary_item.compatibility_score}%" if primary_item else "95%",
        }

        return CuratedRecommendationResult(
            subcategory=subcat,
            primary_auto_attached_item=primary_item,
            items=curated_items,
            personal_summary=personal_summary,
        )
