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
            if item.get("subcategory") == subcat or item.get("category") == subcat or
               (subcat in ["jackets", "shirts"] and (item.get("category") == "Apparel" or item.get("subcategory") in ["shirts", "jackets"])) or
               (subcat in ["glasses", "hats"] and item.get("subcategory") == subcat)
        ]

        # Extract profile attributes (3-parameter biometrics) early for candidate filtering
        def extract_profile_str(val: Any, subkey: str = "", default: str = "") -> str:
            if isinstance(val, dict):
                if subkey and subkey in val:
                    return str(val[subkey])
                for k in ["undertone", "shape", "code", "index", "hex", "label", "value"]:
                    if k in val:
                        return str(val[k])
                return default
            return str(val) if val is not None else default

        # Default "uncertain", bukan "male". Profil tanpa gender bukan berarti
        # laki-laki, dan estimator kini memang boleh mengembalikan nilai ketiga.
        gender = extract_profile_str(user_profile.get("gender"), "label_id", "uncertain").lower()

        # For shirts, filter by gender affinity if available
        if subcat == "shirts":
            gender_filtered = [
                i for i in candidate_items
                if (gender in ["female", "women"] and i.get("gender") in ["Women", "Unisex"]) or
                   (gender in ["male", "men"] and i.get("gender") in ["Men", "Unisex"])
            ]
            if len(gender_filtered) >= 4:
                candidate_items = gender_filtered

        if not candidate_items:
            candidate_items = self.catalog[:4]

        # Extract profile attributes (3-parameter biometrics)
        undertone = extract_profile_str(user_profile.get("undertone"), "undertone", "Warm")
        face_shape = extract_profile_str(user_profile.get("face_shape"), "shape", "Oval")
        mst_code = extract_profile_str(user_profile.get("monk_tone"), "code", "MST-06")
        skin_tone = extract_profile_str(user_profile.get("skin_tone"), "tone", "Tan")

        # Extract quiz attributes with robust fallback signal detection
        def extract_quiz_signals(q_data: Dict[str, Any]) -> Tuple[str, str, str, List[str]]:
            all_text_blobs = []
            for k, v in q_data.items():
                if isinstance(v, str):
                    all_text_blobs.append(f"{k} {v}")
                elif isinstance(v, dict):
                    for sub_k, sub_v in v.items():
                        all_text_blobs.append(f"{sub_k} {sub_v}")
                elif isinstance(v, list):
                    for itm in v:
                        if isinstance(itm, dict):
                            all_text_blobs.append(" ".join(str(val) for val in itm.values()))
                        else:
                            all_text_blobs.append(str(itm))

            joined_text = " ".join(all_text_blobs).lower()

            # 1. Occasion
            occ = str(q_data.get("occasion", "")).strip()
            if not occ:
                if any(w in joined_text for w in ["formal", "kantor", "executive", "meeting", "sartorial", "bisnis", "resmi"]):
                    occ = "Formal"
                elif any(w in joined_text for w in ["olahraga", "sports", "sport", "atletik", "gym", "lari", "outdoor", "fitness"]):
                    occ = "Sports"
                elif any(w in joined_text for w in ["pesta", "party", "gala", "wedding", "malam", "statement", "perayaan"]):
                    occ = "Party"
                elif any(w in joined_text for w in ["streetwear", "urban", "skate", "hangout", "nongkrong", "techwear", "casual streetwear"]):
                    occ = "Streetwear"
                else:
                    occ = "Casual"

            # 2. Fit / Silhouette
            fit = str(q_data.get("fit_preference", "")).strip()
            if not fit:
                if any(w in joined_text for w in ["oversize", "oversized", "boxy", "longgar", "lebar", "wrap", "santai"]):
                    fit = "Oversized / Boxy"
                elif any(w in joined_text for w in ["slim", "fitted", "ramping", "ketat", "tailored", "aviator", "presisi"]):
                    fit = "Slim / Fitted"
                elif any(w in joined_text for w in ["layer", "layered", "tumpuk", "tekstur", "geometric", "tactical", "berlapis"]):
                    fit = "Layered / Textured"
                else:
                    fit = "Regular Fit"

            # 3. Color Mood
            col = str(q_data.get("color_mood", "")).strip()
            if not col:
                if any(w in joined_text for w in ["earth", "bumi", "terracotta", "olive", "hijau", "cokelat", "mustard", "beige", "sand", "khaki", "tan"]):
                    col = "Earth Tone"
                elif any(w in joined_text for w in ["jewel", "sejuk", "cool", "navy", "biru", "sapphire", "emerald", "burgundy", "sky", "rose", "dingin"]):
                    col = "Jewel Tone / Sejuk"
                elif any(w in joined_text for w in ["monokrom", "monochrome", "netral", "neutral", "hitam", "putih", "abu", "charcoal", "silver", "black"]):
                    col = "Neutral / Monokrom"
                elif any(w in joined_text for w in ["bold", "berani", "vibrant", "terang", "kontras", "cerah", "emas", "gold", "merah", "ekspresif"]):
                    col = "Bold / Expressive"
                else:
                    col = "Earth Tone"

            tokens = [t for t in joined_text.replace("/", " ").replace("-", " ").split() if len(t) > 2]
            return occ, fit, col, tokens

        quiz_occasion, quiz_fit, quiz_color, quiz_tokens = extract_quiz_signals(quiz_answers)

        scored_items = []
        for item in candidate_items:
            base_col = item.get("baseColour") or item.get("colour") or "Black"
            model_type = item.get("modelType") or subcat
            item_gender = str(item.get("gender", "Unisex")).lower()

            # ----------------------------------------------------
            # A. Occasion & Intent Harmony Score (0 - 100) — Primary Weight 40%
            # ----------------------------------------------------
            occasion_score = 50.0
            item_usage = str(item.get("usage", "Casual")).lower()
            q_occ = quiz_occasion.lower()

            if q_occ in item_usage or item_usage in q_occ:
                occasion_score = 100.0
            elif "casual" in q_occ and item_usage in ["casual", "streetwear", "regularfit"]:
                occasion_score = 95.0
            elif "formal" in q_occ and item_usage in ["formal", "sartorial", "executive", "office"]:
                occasion_score = 98.0
            elif "party" in q_occ and item_usage in ["party", "evening", "statement"]:
                occasion_score = 98.0
            elif "sports" in q_occ and item_usage in ["sports", "athletic", "gym", "performance"]:
                occasion_score = 98.0
            elif "streetwear" in q_occ and item_usage in ["streetwear", "urban", "techwear"]:
                occasion_score = 98.0
            else:
                # Slight penalty for conflicting occasion
                occasion_score = 65.0

            # ----------------------------------------------------
            # B. Fit & Silhouette Score (0 - 100) — Weight 25%
            # ----------------------------------------------------
            fit_score = 70.0
            style_tags = [t.lower() for t in item.get("styleTags", [])]
            q_fit = quiz_fit.lower()

            if "oversized" in q_fit and any(t in style_tags for t in ["oversized", "boxy", "streetwear", "wrap"]):
                fit_score = 100.0
            elif "slim" in q_fit or "fitted" in q_fit:
                if any(t in style_tags for t in ["fitted", "slim", "tailored", "satin", "aviator"]):
                    fit_score = 100.0
                elif any(t in style_tags for t in ["regularfit", "classic"]):
                    fit_score = 88.0
            elif "layered" in q_fit or "geometric" in q_fit:
                if any(t in style_tags for t in ["layered", "geometric", "colorblock", "twinset", "tactical"]):
                    fit_score = 100.0
            elif "regular" in q_fit or "classic" in q_fit:
                if any(t in style_tags for t in ["classic", "regularfit", "polo", "oxford", "wayfarer", "fedora", "heavyweight"]):
                    fit_score = 100.0

            # ----------------------------------------------------
            # C. Color & Mood Harmony Score (0 - 100) — Weight 25%
            # ----------------------------------------------------
            color_score = 75.0
            u_low = undertone.lower()
            b_low = base_col.lower()
            q_col = quiz_color.lower()

            # Direct quiz color preference matching
            if "earth" in q_col:
                if any(c in b_low for c in ["terracotta", "mustard", "olive", "beige", "sand", "straw", "gold", "amber", "brown", "sage", "khaki", "camel"]):
                    color_score = 100.0
                elif any(c in b_low for c in ["white", "black", "grey"]):
                    color_score = 82.0
            elif "jewel" in q_col or "sejuk" in q_col or "cool" in q_col:
                if any(c in b_low for c in ["navy", "emerald", "burgundy", "crimson", "sapphire", "blue", "sky", "lilac", "purple", "rose"]):
                    color_score = 100.0
                elif any(c in b_low for c in ["white", "black", "grey"]):
                    color_score = 85.0
            elif "monokrom" in q_col or "neutral" in q_col or "monochrome" in q_col:
                if any(c in b_low for c in ["black", "white", "grey", "charcoal", "silver", "onyx", "slate", "ivory"]):
                    color_score = 100.0
                else:
                    color_score = 78.0
            elif "bold" in q_col or "vibrant" in q_col or "expressive" in q_col:
                if any(c in b_low for c in ["crimson", "emerald", "multi-color", "terracotta", "blaugrana", "gold", "rose"]):
                    color_score = 100.0

            # Subtle skin undertone synergy bonus (+5 pts)
            if "warm" in u_low and any(c in b_low for c in ["gold", "terracotta", "olive", "warm", "sand", "amber"]):
                color_score = min(100.0, color_score + 5.0)
            elif "cool" in u_low and any(c in b_low for c in ["silver", "navy", "charcoal", "sky blue", "emerald", "burgundy"]):
                color_score = min(100.0, color_score + 5.0)

            # ----------------------------------------------------
            # D. Shape & Anatomical Affinity (0 - 100) — Weight 10%
            # ----------------------------------------------------
            shape_score = 85.0
            if subcat in ["glasses", "hats"]:
                flattering_faces = [f.lower() for f in item.get("flatteringFaceShapes", [])]
                if face_shape.lower() in flattering_faces:
                    shape_score = 98.0
                elif face_shape.lower() == "oval":
                    shape_score = 95.0

            # ----------------------------------------------------
            # Weighted Dynamic Total Score
            # 40% Occasion + 25% Fit Preference + 25% Color Mood + 10% Shape Affinity
            # ----------------------------------------------------
            total_score = (
                (0.40 * occasion_score) +
                (0.25 * fit_score) +
                (0.25 * color_score) +
                (0.10 * shape_score)
            )

            scored_items.append({
                "item": item,
                "total_score": round(total_score, 1),
                "color_score": round(color_score, 1),
                "shape_score": round(shape_score, 1),
                "occasion_score": round(occasion_score, 1),
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

        # Select 4 distinct model types or IDs
        selected_entries = []
        used_ids = set()

        for entry in scored_items:
            iid = entry["item"].get("id")
            if iid not in used_ids:
                selected_entries.append(entry)
                used_ids.add(iid)
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
