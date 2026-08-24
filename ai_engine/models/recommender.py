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

        # Extract quiz attributes with robust token and keyword signal detection
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
            if not occ or occ.startswith("opt_"):
                if any(w in joined_text for w in ["formal", "kantor", "executive", "meeting", "sartorial", "bisnis", "resmi", "satin"]):
                    occ = "Formal"
                elif any(w in joined_text for w in ["olahraga", "sports", "sport", "atletik", "gym", "lari", "outdoor", "fitness", "jersey", "sunfit"]):
                    occ = "Sports"
                elif any(w in joined_text for w in ["pesta", "party", "gala", "wedding", "malam", "statement", "perayaan", "dinner", "glamour"]):
                    occ = "Party"
                elif any(w in joined_text for w in ["pantai", "travel", "liburan", "tropis", "beach", "jerami", "straw"]):
                    occ = "Travel / Beach"
                elif any(w in joined_text for w in ["streetwear", "urban", "skate", "hangout", "nongkrong", "techwear", "casual streetwear"]):
                    occ = "Streetwear"
                elif any(w in joined_text for w in ["cozy", "dingin", "sweater", "hangat"]):
                    occ = "Cozy"
                else:
                    occ = "Casual"

            # 2. Fit / Silhouette / Model
            fit = str(q_data.get("fit_preference", "")).strip()
            if not fit or fit.startswith("opt_"):
                if any(w in joined_text for w in ["aviator", "pilot", "double"]):
                    fit = "Aviator Pilot"
                elif any(w in joined_text for w in ["wayfarer", "kotak", "square", "tebal", "bold"]):
                    fit = "Wayfarer Classic"
                elif any(w in joined_text for w in ["geometric", "geometris", "heksagon", "sudut"]):
                    fit = "Geometric"
                elif any(w in joined_text for w in ["browline", "clubmaster", "garis atas"]):
                    fit = "Browline"
                elif any(w in joined_text for w in ["round", "bulat", "retro", "horn", "rim"]):
                    fit = "Retro Round"
                elif any(w in joined_text for w in ["cowboy", "western", "kulit", "leather"]):
                    fit = "Western Cowboy"
                elif any(w in joined_text for w in ["fedora", "trilby", "noir", "spy", "mafia"]):
                    fit = "Fedora Trilby"
                elif any(w in joined_text for w in ["straw", "jerami", "pantai", "beach", "anyaman", "luffy"]):
                    fit = "Beach Straw"
                elif any(w in joined_text for w in ["pith", "safari", "explorer", "helmet"]):
                    fit = "Safari Pith"
                elif any(w in joined_text for w in ["satin", "blouse", "emerald"]):
                    fit = "Satin Button-Down"
                elif any(w in joined_text for w in ["crop", "skirt", "rok", "two-piece", "setelan"]):
                    fit = "Crop And Skirt"
                elif any(w in joined_text for w in ["sweater", "rajut", "pullover", "cable"]):
                    fit = "Knit Sweater"
                elif any(w in joined_text for w in ["vneck", "v-neck", "fitted"]):
                    fit = "Fitted V-Neck"
                elif any(w in joined_text for w in ["jersey", "barcelona", "bola", "sporty"]):
                    fit = "Sport Jersey"
                elif any(w in joined_text for w in ["polo", "colorblock", "color-block"]):
                    fit = "ColorBlock Polo"
                elif any(w in joined_text for w in ["oxford", "kemeja"]):
                    fit = "Oxford Shirt"
                elif any(w in joined_text for w in ["oversize", "oversized", "boxy", "longgar", "lebar", "wrap", "santai"]):
                    fit = "Oversized / Boxy"
                elif any(w in joined_text for w in ["slim", "fitted", "ramping", "ketat", "tailored", "presisi"]):
                    fit = "Slim / Fitted"
                elif any(w in joined_text for w in ["layer", "layered", "tumpuk", "tekstur", "tactical", "berlapis"]):
                    fit = "Layered / Textured"
                else:
                    fit = "Regular Fit"

            # 3. Color Mood
            col = str(q_data.get("color_mood", "")).strip()
            if not col or col.startswith("opt_"):
                if any(w in joined_text for w in ["gold", "amber", "emas"]):
                    col = "Gold / Amber"
                elif any(w in joined_text for w in ["silver", "chrome", "perak", "abu"]):
                    col = "Silver / Steel"
                elif any(w in joined_text for w in ["hitam", "black", "onyx", "doff", "noir"]):
                    col = "Matte Black"
                elif any(w in joined_text for w in ["havana", "tortoise", "penyu"]):
                    col = "Havana Tortoise"
                elif any(w in joined_text for w in ["emerald", "zamrud", "hijau", "green"]):
                    col = "Emerald Green"
                elif any(w in joined_text for w in ["lilac", "rose", "pastel", "pink"]):
                    col = "Lilac Pastel"
                elif any(w in joined_text for w in ["ivory", "cream", "krem", "putih", "gading"]):
                    col = "Ivory Cream"
                elif any(w in joined_text for w in ["terracotta", "coral", "oranye", "mustard"]):
                    col = "Terracotta Coral"
                elif any(w in joined_text for w in ["blaugrana", "navy", "biru"]):
                    col = "Navy / Blaugrana"
                elif any(w in joined_text for w in ["straw", "jerami", "natural"]):
                    col = "Natural Straw"
                elif any(w in joined_text for w in ["leather", "cokelat", "brown"]):
                    col = "Leather Brown"
                elif any(w in joined_text for w in ["earth", "bumi", "olive", "khaki", "tan"]):
                    col = "Earth Tone"
                else:
                    col = "Earth Tone"

            tokens = [t for t in joined_text.replace("/", " ").replace("-", " ").replace("_", " ").split() if len(t) > 2]
            return occ, fit, col, tokens

        quiz_occasion, quiz_fit, quiz_color, quiz_tokens = extract_quiz_signals(quiz_answers)

        scored_items = []
        for item in candidate_items:
            base_col = (item.get("baseColour") or item.get("colour") or "Black").lower()
            model_type = (item.get("modelType") or item.get("name") or "").lower()
            item_name = (item.get("name") or "").lower()
            item_desc = (item.get("description") or "").lower()
            style_tags = [t.lower() for t in item.get("styleTags", [])]
            item_usage = str(item.get("usage", "Casual")).lower()
            item_text = f"{item_name} {model_type} {' '.join(style_tags)} {item_desc} {base_col} {item_usage}"

            # ----------------------------------------------------
            # A. Occasion & Intent Harmony Score (0 - 100) — Primary Weight 35%
            # ----------------------------------------------------
            occasion_score = 60.0
            q_occ = quiz_occasion.lower()

            if q_occ in item_usage or item_usage in q_occ:
                occasion_score = 100.0
            elif "casual" in q_occ and ("casual" in item_usage or "streetwear" in item_usage or "regularfit" in style_tags):
                occasion_score = 96.0
            elif "formal" in q_occ and ("formal" in item_usage or "sartorial" in item_usage or "executive" in style_tags or "oxford" in item_name or "satin" in item_name):
                occasion_score = 100.0
            elif "party" in q_occ and ("party" in item_usage or "statement" in style_tags or "gold" in base_col or "satin" in item_name or "off-shoulder" in item_name):
                occasion_score = 100.0
            elif "sports" in q_occ and ("sports" in item_usage or "athletic" in style_tags or "jersey" in item_name or "sport" in item_name):
                occasion_score = 100.0
            elif "travel" in q_occ and ("travel" in style_tags or "straw" in item_name or "beach" in item_name or "casual" in item_usage):
                occasion_score = 100.0
            elif "streetwear" in q_occ and ("streetwear" in item_usage or "urban" in style_tags or "polo" in item_name or "layered" in item_name):
                occasion_score = 100.0
            elif "cozy" in q_occ and ("cozy" in style_tags or "sweater" in item_name or "flannel" in item_name):
                occasion_score = 100.0
            else:
                occasion_score = 65.0

            # ----------------------------------------------------
            # B. Fit, Silhouette & Specific 3D Model Affinity (0 - 100) — Weight 35%
            # ----------------------------------------------------
            fit_score = 65.0
            q_fit = quiz_fit.lower()

            # Direct Model-Level Keyword Affinity
            if "aviator" in q_fit and ("aviator" in item_text or "pilot" in item_text):
                fit_score = 100.0
            elif "wayfarer" in q_fit and ("wayfarer" in item_text or "khronos" in item_text or "square" in item_text):
                fit_score = 100.0
            elif "geometric" in q_fit and ("geometric" in item_text or "hexagon" in item_text or "polygon" in item_text):
                fit_score = 100.0
            elif "browline" in q_fit and ("browline" in item_text or "clubmaster" in item_text):
                fit_score = 100.0
            elif "round" in q_fit and ("round" in item_text or "hornrimmed" in item_text or "horn" in item_text):
                fit_score = 100.0
            elif "cowboy" in q_fit and ("cowboy" in item_text or "western" in item_text):
                fit_score = 100.0
            elif "fedora" in q_fit and ("fedora" in item_text or "trilby" in item_text or "spy" in item_text or "mafia" in item_text):
                fit_score = 100.0
            elif "straw" in q_fit and ("straw" in item_text or "beach" in item_text or "luffy" in item_text):
                fit_score = 100.0
            elif "pith" in q_fit and ("pith" in item_text or "safari" in item_text or "helmet" in item_text):
                fit_score = 100.0
            elif "satin" in q_fit and ("satin" in item_text or "womens_shirt" in item.get("model_3d_path", "")):
                fit_score = 100.0
            elif "crop" in q_fit and ("skirt" in item_text or "crop" in item_text):
                fit_score = 100.0
            elif "sweater" in q_fit and ("sweater" in item_text or "knit" in item_text or "pullover" in item_text):
                fit_score = 100.0
            elif "v-neck" in q_fit and ("vneck" in item_text or "v-neck" in item_text):
                fit_score = 100.0
            elif "jersey" in q_fit and ("jersey" in item_text or "football" in item_text or "barcelona" in item_text):
                fit_score = 100.0
            elif "polo" in q_fit and ("polo" in item_text or "color_blocked" in item_text):
                fit_score = 100.0
            elif "oxford" in q_fit and ("oxford" in item_text or "formal" in item_text or "man_shirt" in item.get("model_3d_path", "")):
                fit_score = 100.0
            elif "oversized" in q_fit and any(t in style_tags for t in ["oversized", "boxy", "streetwear", "wrap"]):
                fit_score = 98.0
            elif "slim" in q_fit or "fitted" in q_fit:
                if any(t in style_tags for t in ["fitted", "slim", "tailored", "satin", "aviator"]):
                    fit_score = 98.0
                else:
                    fit_score = 82.0
            else:
                # Bonus for any token overlap
                token_matches = sum(1 for t in quiz_tokens if t in item_text)
                fit_score = min(98.0, 70.0 + (token_matches * 8.0))

            # ----------------------------------------------------
            # C. Color & Mood Harmony Score (0 - 100) — Weight 20%
            # ----------------------------------------------------
            color_score = 70.0
            u_low = undertone.lower()
            q_col = quiz_color.lower()

            if "gold" in q_col and ("gold" in base_col or "amber" in base_col or "yellow" in base_col):
                color_score = 100.0
            elif "silver" in q_col and ("silver" in base_col or "chrome" in base_col or "grey" in base_col or "steel" in base_col):
                color_score = 100.0
            elif "black" in q_col and ("black" in base_col or "onyx" in base_col or "charcoal" in base_col):
                color_score = 100.0
            elif "havana" in q_col and ("havana" in base_col or "tortoise" in base_col or "brown" in base_col):
                color_score = 100.0
            elif "emerald" in q_col and ("emerald" in base_col or "green" in base_col or "forest" in base_col):
                color_score = 100.0
            elif "lilac" in q_col and ("lilac" in base_col or "rose" in base_col or "pink" in base_col or "purple" in base_col):
                color_score = 100.0
            elif "ivory" in q_col and ("ivory" in base_col or "cream" in base_col or "white" in base_col):
                color_score = 100.0
            elif "terracotta" in q_col and ("terracotta" in base_col or "coral" in base_col or "orange" in base_col or "mustard" in base_col):
                color_score = 100.0
            elif "navy" in q_col and ("navy" in base_col or "blue" in base_col or "blaugrana" in base_col):
                color_score = 100.0
            elif "straw" in q_col and ("straw" in base_col or "sand" in base_col or "beige" in base_col):
                color_score = 100.0
            elif "leather" in q_col and ("leather" in base_col or "brown" in base_col or "tan" in base_col):
                color_score = 100.0
            elif "earth" in q_col and any(c in base_col for c in ["terracotta", "mustard", "olive", "beige", "sand", "straw", "gold", "amber", "brown", "khaki"]):
                color_score = 100.0
            else:
                # Skin undertone synergy
                if "warm" in u_low and any(c in base_col for c in ["gold", "terracotta", "olive", "sand", "amber", "brown"]):
                    color_score = 92.0
                elif "cool" in u_low and any(c in base_col for c in ["silver", "navy", "charcoal", "emerald", "burgundy", "blue"]):
                    color_score = 92.0
                else:
                    color_score = 80.0

            # ----------------------------------------------------
            # D. Shape & Anatomical Affinity (0 - 100) — Weight 10%
            # ----------------------------------------------------
            shape_score = 85.0
            if subcat in ["glasses", "hats"]:
                flattering_faces = [f.lower() for f in item.get("flatteringFaceShapes", [])]
                if face_shape.lower() in flattering_faces:
                    shape_score = 100.0
                elif face_shape.lower() == "oval":
                    shape_score = 95.0

            # ----------------------------------------------------
            # Weighted Dynamic Total Score (0 - 100)
            # 35% Occasion + 35% Fit/Model Affinity + 20% Color + 10% Shape
            # ----------------------------------------------------
            total_score = (
                (0.35 * occasion_score) +
                (0.35 * fit_score) +
                (0.20 * color_score) +
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
            prev_p = (
                item_data.get("preview_image_url")
                or item_data.get("preview_image")
                or item_data.get("image_url")
                or f"/images/products/preview/{item_data.get('id', '')}.png"
            )

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
