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
            }
        },
        "fair_cool_round": {
            "name": "Preset 2: Fair Cool Skin + Round Face",
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
            }
        },
        "deep_olive_square": {
            "name": "Preset 3: Deep Olive Skin + Square Face",
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
            }
        },
        "indonesian_multi_dim": {
            "name": "Preset 4: Multi-Dimensional Analysis (Karakter Indonesia Lengkap)",
            "face_shape": {
                "shape": "Oval",
                "label_indonesian": "Oval (Oval)",
                "confidence": 0.93,
                "method": "random_forest",
                "ratios": {
                    "face_width_to_height": 0.78,
                    "jaw_to_forehead": 0.85,
                    "cheekbone_to_jaw": 1.18,
                    "chin_sharpness": 0.55
                },
                "glasses_recommendations": ["Wayfarer", "Aviator", "Round Classic", "Geometric Frame"],
                "hat_recommendations": ["Fedora", "Bucket Hat", "Beanie", "Baseball Cap"],
                "styling_advice": "Bentuk wajah oval memiliki proporsi alami paling seimbang. Bebas mengeksplorasi siluet kacamata bersudut maupun membulat."
            },
            "skin_tone": {
                "tone": "Tan",
                "label_indonesian": "Tan (Sawo Matang)",
                "monk_index": 6,
                "monk_code": "MST-06",
                "ita_deg": 69.3,
                "undertone": "Warm",
                "confidence": 0.9,
                "rule": "nearest-dE MST-06 (dE=0.0)"
            },
            "gender": {
                "label": "Pria (Male)",
                "label_id": "male",
                "confidence": 0.68,
                "method": "landmark_ratio",
                "rule": "skor maskulin +0.21"
            },
            "nose": {"label": "Greek (Mancung)", "label_id": "greek", "confidence": 0.86, "rule": "bridge lurus + lebar moderat"},
            "eye": {"label": "Almond (Almond)", "label_id": "almond", "confidence": 0.88, "rule": "EAR moderat + tilt netral"},
            "brow": {"label": "Soft Curve (Lengkung Lembut)", "label_id": "soft_curve", "confidence": 0.85, "rule": "arch ratio moderat"},
            "measurements": {
                "forehead_width_cm": 12.9,
                "cheekbone_width_cm": 14.9,
                "jaw_width_cm": 12.6,
                "face_height_cm": 22.1,
                "face_proportion": "1.0:1.2:1",
                "calibration": "iris"
            },
            "pillars": [
                {
                    "pillar": 1,
                    "title": "Pilar 1 — Bentuk Wajah → Kontras Siluet Frame",
                    "principle": "Prinsip kontras siluet: bentuk frame yang berlawanan dengan geometri wajah menciptakan keseimbangan visual yang paling flatteri.",
                    "scientific_basis": "Berdasarkan rasio antropometrik wajah terkalibrasi iris 11,7 mm, klasifikasi Oval menentukan arah kontras siluet.",
                    "application": "Untuk bentuk wajah Oval: proporsi seimbang memberi kebebasan penuh bereksperimen siluet frame."
                },
                {
                    "pillar": 2,
                    "title": "Pilar 2 — Undertone → Warna Material Aksesoris",
                    "principle": "Prinsip keselarasan warna material: warna material aksesoris harus selaras dengan undertone kulit.",
                    "scientific_basis": "Undertone ditentukan dari posisi warna kulit pada ruang warna CIELAB (nilai a* dan b*).",
                    "application": "Untuk undertone Warm: material hangat seperti emas dan titanium cokelat; hindari silver dingin."
                },
                {
                    "pillar": 3,
                    "title": "Pilar 3 — Tipe Hidung → Ergonomi Bridge & Pad",
                    "principle": "Prinsip ergonomi fit: posisi frame stabil ditentukan oleh bentuk punggung hidung dan lebar alar.",
                    "scientific_basis": "Geometri profil-z punggung hidung (landmark 168-6-1) dan lebar alar (129-358) menentukan tipe bridge.",
                    "application": "Untuk Greek (Mancung): bridge standar dengan pad silicon klasik memberi kontak merata."
                }
            ],
            "narrative": {
                "summary": "Analisis multi-dimensi menunjukkan bentuk wajah Oval dengan proporsi seimbang, hidung mancung, mata almond, dan alis lengkung lembut — kombinasi yang sangat fleksibel untuk berbagai siluet aksesoris.",
                "tips": [
                    "Eksplorasi frame bersudut maupun membulat — keduanya flatteri untuk Oval.",
                    "Pilih material emas/titanium hangat untuk memaksimalkan undertone Warm.",
                    "Bridge standar dengan pad silicon menjamin kenyamanan sepanjang hari."
                ]
            }
        }
    }

    @classmethod
    def get_preset(cls, preset_key: str = "indonesian_warm_sawo_matang") -> Dict[str, Any]:
        return cls.PRESETS.get(preset_key, cls.PRESETS["indonesian_warm_sawo_matang"])

    @classmethod
    def list_presets(cls) -> List[Dict[str, str]]:
        return [{"key": k, "name": v["name"]} for k, v in cls.PRESETS.items()]
