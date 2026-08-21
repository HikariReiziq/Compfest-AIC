"""Deterministic Mock Data Generator for Competition Evaluation and Zero-Hardware Fallbacks."""

from typing import Dict, List, Any


class MockDataGenerator:
    """Provides deterministic preset profiles for instant evaluation without requiring physical webcam."""

    PRESETS = {
        "indonesian_warm_sawo_matang": {
            "name": "Preset 1: Warm Sawo Matang (Karakter Indonesia)",
            "monk_tone": {
                "index": 6,
                "code": "MST-06",
                "hex": "#A07E56",
                "delta_e": 2.14,
                "description": "Rich Warm / Sawo Matang"
            },
            "undertone": {
                "undertone": "Warm",
                "confidence": 0.96,
                "season": "Autumn / Warm Spring",
                "explanation": "Undertone hangat dengan rona keemasan alami yang bersinar elegan dengan palet warna tanah (earth tone), terracotta, mustard, dan olive.",
                "best_colors": [
                    {"name": "Terracotta", "hex": "#E2725B"},
                    {"name": "Mustard Yellow", "hex": "#E1AD01"},
                    {"name": "Olive Green", "hex": "#556B2F"},
                    {"name": "Warm Beige", "hex": "#D4B996"}
                ],
                "clash_colors": [
                    {"name": "Icy Blue", "hex": "#AFEEEE", "reason": "Membuat kulit tampak wash-out / pucat"},
                    {"name": "Stark Pure White", "hex": "#FFFFFF", "reason": "Terlalu kontras dingin"}
                ]
            },
            "face_shape": {
                "shape": "Oval",
                "confidence": 0.94,
                "ratios": {
                    "face_width_to_height": 0.762,
                    "jaw_to_forehead": 0.841,
                    "cheekbone_to_jaw": 1.185,
                    "chin_sharpness": 0.642
                },
                "glasses_recommendations": ["Wayfarer", "Aviator", "Round Classic", "Geometric Frame"],
                "hat_recommendations": ["Fedora", "Bucket Hat", "Beanie", "Baseball Cap"],
                "styling_advice": "Bentuk wajah oval memiliki proporsi alami paling seimbang. Anda bebas bereksplorasi dengan berbagai siluet kacamata dan topi."
            },
            "body_shape": {
                "shape": "Hourglass",
                "confidence": 0.92,
                "ratios": {
                    "shoulder_to_hip_ratio": 1.012,
                    "waist_to_hip_ratio": 0.735,
                    "waist_to_shoulder_ratio": 0.726
                },
                "silhouette_recommendations": ["Fitted Cut", "Wrap Shirt", "Tailored Blazer"],
                "jacket_recommendations": ["Belted Trench Coat", "Cropped Denim Jacket", "Tailored Blazer"],
                "styling_advice": "Proporsi bahu dan pinggul seimbang sempurna dengan lekuk pinggang yang tegas. Siluet fitted menonjolkan keanggunan postur alami Anda."
            }
        },
        "fair_cool_round": {
            "name": "Preset 2: Fair Cool Skin + Round Face + Pear Body",
            "monk_tone": {
                "index": 2,
                "code": "MST-02",
                "hex": "#F3E7DB",
                "delta_e": 1.85,
                "description": "Fair"
            },
            "undertone": {
                "undertone": "Cool",
                "confidence": 0.93,
                "season": "Winter / Cool Summer",
                "explanation": "Undertone dingin memukau dengan warna permata (jewel tones), navy pekat, charcoal grey, dan burgundy.",
                "best_colors": [
                    {"name": "Navy Blue", "hex": "#000080"},
                    {"name": "Charcoal Grey", "hex": "#36454F"},
                    {"name": "Emerald Green", "hex": "#50C878"},
                    {"name": "Burgundy / Berry", "hex": "#800020"}
                ],
                "clash_colors": [
                    {"name": "Mustard Gold", "hex": "#FFDB58", "reason": "Memberi kesan kulit kusam"},
                    {"name": "Muddy Khaki", "hex": "#C3B091", "reason": "Mematikan rona segar kulit dingin"}
                ]
            },
            "face_shape": {
                "shape": "Round",
                "confidence": 0.91,
                "ratios": {
                    "face_width_to_height": 0.865,
                    "jaw_to_forehead": 0.882,
                    "cheekbone_to_jaw": 1.210,
                    "chin_sharpness": 0.740
                },
                "glasses_recommendations": ["Rectangular Frame", "Square Wayfarer", "Geometric D-Frame"],
                "hat_recommendations": ["Fedora with Crown", "Structured Baseball Cap", "Newsboy Cap"],
                "styling_advice": "Wajah bulat sangat serasi dengan kacamata berbingkai tegas/persegi panjang untuk memberi ketegasan garis wajah."
            },
            "body_shape": {
                "shape": "Pear",
                "confidence": 0.90,
                "ratios": {
                    "shoulder_to_hip_ratio": 0.895,
                    "waist_to_hip_ratio": 0.760,
                    "waist_to_shoulder_ratio": 0.849
                },
                "silhouette_recommendations": ["A-Line Cut", "Structured Shoulder Top", "Boatneck"],
                "jacket_recommendations": ["Structured Blazer with Lapels", "Bomber Jacket", "Cropped Utility Jacket"],
                "styling_advice": "Garis pinggul lebih dominan dibandingkan bahu. Gunakan atasan dengan aksen bahu berstruktur untuk menarik fokus ke tubuh atas."
            }
        },
        "deep_olive_square": {
            "name": "Preset 3: Deep Olive Skin + Square Face + Inverted Triangle Body",
            "monk_tone": {
                "index": 7,
                "code": "MST-07",
                "hex": "#825C43",
                "delta_e": 2.40,
                "description": "Deep Tan / Medium Dark"
            },
            "undertone": {
                "undertone": "Olive",
                "confidence": 0.95,
                "season": "Deep Autumn / Olive Harmony",
                "explanation": "Undertone zaitun memancarkan aura eksotis dengan warna hijau hutan, plum kaya, bronze, dan deep teal.",
                "best_colors": [
                    {"name": "Deep Forest Green", "hex": "#228B22"},
                    {"name": "Deep Teal", "hex": "#005F73"},
                    {"name": "Warm Bronze", "hex": "#CD7F32"},
                    {"name": "Rich Plum", "hex": "#673147"}
                ],
                "clash_colors": [
                    {"name": "Pastel Yellow", "hex": "#FFFFE0", "reason": "Membuat kulit tampak pucat/kehijauan"},
                    {"name": "Ash Grey", "hex": "#B2BEB5", "reason": "Memberikan efek letih"}
                ]
            },
            "face_shape": {
                "shape": "Square",
                "confidence": 0.93,
                "ratios": {
                    "face_width_to_height": 0.850,
                    "jaw_to_forehead": 0.945,
                    "cheekbone_to_jaw": 1.090,
                    "chin_sharpness": 0.780
                },
                "glasses_recommendations": ["Round Classic", "Oval Metal Frame", "Soft Aviator"],
                "hat_recommendations": ["Beret", "Bucket Hat", "Slouchy Beanie"],
                "styling_advice": "Garis rahang tegas diseimbangkan dengan kacamata berbingkai membulat atau oval untuk menciptakan kelembutan visual."
            },
            "body_shape": {
                "shape": "Inverted Triangle",
                "confidence": 0.92,
                "ratios": {
                    "shoulder_to_hip_ratio": 1.135,
                    "waist_to_hip_ratio": 0.810,
                    "waist_to_shoulder_ratio": 0.713
                },
                "silhouette_recommendations": ["V-Neck Cut", "Raglan Sleeve", "Relaxed Fit"],
                "jacket_recommendations": ["Casual Oversized Jacket", "Unstructured Cardigan", "Straight Zip Jacket"],
                "styling_advice": "Bahu bidang atletis diseimbangkan dengan atasan berkerah V-neck dan jaket tanpa bantalan bahu."
            }
        }
    }

    @classmethod
    def get_preset(cls, preset_key: str = "indonesian_warm_sawo_matang") -> Dict[str, Any]:
        return cls.PRESETS.get(preset_key, cls.PRESETS["indonesian_warm_sawo_matang"])

    @classmethod
    def list_presets(cls) -> List[Dict[str, str]]:
        return [{"key": k, "name": v["name"]} for k, v in cls.PRESETS.items()]
