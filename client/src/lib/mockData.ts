export interface MonkSkinTone {
  index: number;
  code: string;
  hex: string;
  delta_e: number;
  description: string;
}

export interface ColorItem {
  name: string;
  hex: string;
  category?: string;
  reason?: string;
}

export interface UndertoneProfile {
  undertone: "Warm" | "Cool" | "Neutral" | "Olive";
  confidence: number;
  season: string;
  explanation: string;
  best_colors: ColorItem[];
  clash_colors: ColorItem[];
}

export interface FaceShapeProfile {
  shape: string;
  confidence: number;
  ratios: Record<string, number>;
  glasses_recommendations: string[];
  hat_recommendations: string[];
  styling_advice: string;
}

/** Output biometrik terstandarisasi 1 dari 3: warna kulit (bucket 5 kategori). */
export interface SkinToneProfile {
  tone: "Fair" | "Light" | "Medium" | "Tan" | "Dark" | string;
  label_indonesian: string;
  monk_index?: number;
  monk_code?: string;
  ita_deg?: number;
  undertone?: string; // sinyal internal recommender, bukan kartu UI utama
  hex?: string; // swatch dari MST reference
  confidence: number;
}

/** Output biometrik terstandarisasi 3 dari 3: gender dari rasio landmark. */
export interface GenderProfile {
  label: string; // "Pria (Male)" | "Wanita (Female)"
  label_id: "male" | "female" | string;
  confidence: number;
  method?: string;
}

/** Ukuran antropometrik wajah terkalibrasi (ADR-014). Null bila mode ratio_only. */
export interface FaceMeasurements {
  forehead_width_cm: number | null;
  cheekbone_width_cm: number | null;
  jaw_width_cm: number | null;
  face_height_cm: number | null;
  face_proportion: string;
  calibration: "iris" | "ratio_only";
}

export interface UserPersonalProfile {
  monk_tone: MonkSkinTone;
  undertone: UndertoneProfile;
  face_shape: FaceShapeProfile;
  /** 3-param biometrik terstandarisasi (direktif 2026-08-23). */
  skin_tone?: SkinToneProfile;
  gender?: GenderProfile;
  /* --- Bidang multi-dimensi (opsional — jalur lama tetap valid) --- */
  nose_type?: string;
  eye_shape?: string;
  brow_shape?: string;
  face_measurements?: FaceMeasurements;
  face_analysis_meta?: {
    confidence: number;
    source: string; // "engine" | "mock" | "ratios_fallback"
    input_mode?: "camera" | "upload";
  };
  /** Snapshot reposisi — HANYA hidup di React state sesi (ADR-015, tanpa persistensi). */
  scan_snapshot_dataurl?: string;
  body_measurements_cm?: {
    shoulder_width_cm?: number;
    torso_height_cm?: number;
    chest_width_cm?: number;
    hip_width_cm?: number;
  };
  body_shape_classification?: {
    body_shape?: string;
    confidence?: number;
  };
}

export interface RecommendationItem {
  rank: number;
  archetype: "perfect_match" | "safe_classic" | "bold_statement" | "modern_trendy";
  archetype_title: string;
  id: string;
  name: string;
  category: "Accessories" | "Apparel";
  subcategory: "glasses" | "hats" | "shirts" | "jackets";
  base_colour: string;
  hex_colour: string;
  usage: string;
  model_3d_path: string;
  preview_image_url: string;
  price_idr: string;
  compatibility_score: number;
  color_match_score: number;
  shape_match_score: number;
  stylist_reason: string;
  model_type?: string;
}

export const MOCK_PRESETS: Record<string, { name: string; profile: UserPersonalProfile }> = {
  indonesian_warm_sawo_matang: {
    name: "Preset 1: Warm Sawo Matang (Indonesian Standard)",
    profile: {
      monk_tone: {
        index: 6,
        code: "MST-06",
        hex: "#A07E56",
        delta_e: 2.14,
        description: "Rich Warm / Sawo Matang",
      },
      undertone: {
        undertone: "Warm",
        confidence: 0.96,
        season: "Autumn / Warm Spring",
        explanation: "Undertone hangat dengan rona keemasan alami yang memukau dengan palet warna tanah (earth tone), terracotta, mustard, dan olive.",
        best_colors: [
          {"name": "Terracotta", "hex": "#E2725B"},
          {"name": "Mustard Yellow", "hex": "#E1AD01"},
          {"name": "Olive Green", "hex": "#556B2F"},
          {"name": "Warm Beige", "hex": "#D4B996"},
          {"name": "Camel Brown", "hex": "#C19A6B"},
        ],
        clash_colors: [
          {"name": "Icy Blue", "hex": "#AFEEEE", "reason": "Membuat kulit tampak wash-out / pucat"},
          {"name": "Stark Pure White", "hex": "#FFFFFF", "reason": "Terlalu kontras dingin"},
        ],
      },
      face_shape: {
        shape: "Oval",
        confidence: 0.94,
        ratios: {
          face_width_to_height: 0.762,
          jaw_to_forehead: 0.841,
          cheekbone_to_jaw: 1.185,
          chin_sharpness: 0.642,
        },
        glasses_recommendations: ["Wayfarer", "Aviator", "Round Classic", "Geometric Frame"],
        hat_recommendations: ["Fedora", "Bucket Hat", "Beanie", "Baseball Cap"],
        styling_advice: "Bentuk wajah oval memiliki proporsi alami paling seimbang. Bebas mengeksplorasi siluet kacamata bersudut maupun membulat.",
      },
      nose_type: "Greek (Mancung)",
      eye_shape: "Almond (Almond)",
      brow_shape: "Soft Curve (Lengkung Lembut)",
      face_measurements: {
        forehead_width_cm: 13.98,
        cheekbone_width_cm: 14.92,
        jaw_width_cm: 10.41,
        face_height_cm: 22.4,
        face_proportion: "1.3:1.4:1",
        calibration: "iris",
      },
      face_analysis_meta: { confidence: 0.94, source: "mock" },
      skin_tone: {
        tone: "Tan",
        label_indonesian: "Tan (Sawo Matang)",
        monk_index: 6,
        monk_code: "MST-06",
        ita_deg: 69.3,
        undertone: "Warm",
        hex: "#A07E56",
        confidence: 0.9,
      },
      gender: { label: "Pria (Male)", label_id: "male", confidence: 0.68, method: "landmark_ratio" },
    },
  },
  fair_cool_round: {
    name: "Preset 2: Fair Cool Skin + Round Face",
    profile: {
      monk_tone: {
        index: 2,
        code: "MST-02",
        hex: "#F3E7DB",
        delta_e: 1.85,
        description: "Fair Light",
      },
      undertone: {
        undertone: "Cool",
        confidence: 0.93,
        season: "Winter / Cool Summer",
        explanation: "Undertone dingin sangat cocok dengan warna permata (jewel tones), navy pekat, charcoal grey, emerald, dan burgundy.",
        best_colors: [
          {"name": "Navy Blue", "hex": "#000080"},
          {"name": "Charcoal Grey", "hex": "#36454F"},
          {"name": "Emerald Green", "hex": "#50C878"},
          {"name": "Burgundy / Berry", "hex": "#800020"},
        ],
        clash_colors: [
          {"name": "Mustard Gold", "hex": "#FFDB58", "reason": "Memberi kesan kulit kusam"},
          {"name": "Muddy Khaki", "hex": "#C3B091", "reason": "Mematikan rona segar kulit dingin"},
        ],
      },
      face_shape: {
        shape: "Round",
        confidence: 0.91,
        ratios: {
          face_width_to_height: 0.865,
          jaw_to_forehead: 0.882,
          cheekbone_to_jaw: 1.210,
          chin_sharpness: 0.740,
        },
        glasses_recommendations: ["Rectangular Frame", "Square Wayfarer", "Geometric D-Frame"],
        hat_recommendations: ["Fedora with Crown", "Structured Baseball Cap", "Newsboy Cap"],
        styling_advice: "Wajah bulat sangat serasi dengan kacamata berbingkai tegas/persegi panjang untuk memberi kontur tegas pada wajah.",
      },
      nose_type: "Broad-Snub (Pesek Lebar)",
      eye_shape: "Round (Bulat)",
      brow_shape: "Arched (Tegak)",
      face_measurements: {
        forehead_width_cm: 14.6,
        cheekbone_width_cm: 15.3,
        jaw_width_cm: 13.9,
        face_height_cm: 20.1,
        face_proportion: "1.1:1.1:1",
        calibration: "iris",
      },
      face_analysis_meta: { confidence: 0.91, source: "mock" },
      skin_tone: {
        tone: "Fair",
        label_indonesian: "Fair (Sangat Terang)",
        monk_index: 2,
        monk_code: "MST-02",
        undertone: "Cool",
        hex: "#F3E7DB",
        confidence: 0.88,
      },
      gender: { label: "Wanita (Female)", label_id: "female", confidence: 0.66, method: "landmark_ratio" },
    },
  },
};
