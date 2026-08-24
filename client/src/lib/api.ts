import { UserPersonalProfile, RecommendationItem, MOCK_PRESETS, FaceMeasurements } from "./mockData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/* ------------------------------------------------------------------ */
/*  Multi-Dimensional Landmark Analysis (ADR-014 + standardisasi 3-param) */
/*  Payload hanya fitur turunan (angka) — tanpa gambar wajah.         */
/* ------------------------------------------------------------------ */
export interface LandmarkAnalysisResult {
  face_shape?: UserPersonalProfile["face_shape"];
  skin_tone?: UserPersonalProfile["skin_tone"];
  gender?: UserPersonalProfile["gender"];
  nose?: { label?: string; confidence?: number; rule?: string };
  eye?: { label?: string; confidence?: number; rule?: string };
  brow?: { label?: string; confidence?: number; rule?: string };
  measurements?: FaceMeasurements;
  pillars?: Array<{
    pillar: number;
    title?: string;
    principle?: string;
    scientific_basis?: string;
    application?: string;
  }>;
  narrative?: { summary?: string; tips?: string[] };
  meta?: { engine_version?: string; source?: string };
  is_mock?: boolean;
}

/**
 * POST /api/v1/analyze/landmarks — klasifikasi server-side atas fitur turunan
 * (skin_tone dari LAB temporal, face_shape dari rasio median, gender dari
 * fitur dimorfisme). Fallback: /analyze/ratios → preset deterministik.
 */
export async function analyzeLandmarks(payload: Record<string, unknown>): Promise<LandmarkAnalysisResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/analyze/landmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`landmarks API ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn("Landmark analysis API unavailable, falling back to ratios endpoint:", error);
    try {
      const ratios = (payload as { face_ratios?: Record<string, number> }).face_ratios;
      const legacy = await analyzeRatios(ratios, false);
      return {
        face_shape: legacy?.face_shape || undefined,
        measurements: (payload as { measurements_cm?: FaceMeasurements }).measurements_cm,
        narrative: {
          summary: `Analisis bentuk wajah via jalur rasio geometri (${legacy?.face_shape?.shape || "Oval"}).`,
        },
        meta: { source: "ratios_fallback" },
        is_mock: Boolean(legacy?.is_mock),
      };
    } catch {
      const preset = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
      return {
        face_shape: preset.face_shape,
        skin_tone: preset.skin_tone,
        gender: preset.gender,
        measurements: (payload as { measurements_cm?: FaceMeasurements }).measurements_cm,
        meta: { source: "mock" },
        is_mock: true,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Dynamic Questionnaire Engine                                      */
/* ------------------------------------------------------------------ */
const LOCAL_FALLBACK_QUESTIONS_BATCH1 = (sub: string, profile: Record<string, any>) => [
  {
    id: "occasion",
    question: `Untuk momen atau acara apa Anda mencari ${sub}?`,
    reason: `Momen penggunaan menentukan tingkat formalitas dan jenis material.`,
    options: [
      { id: "Casual", label: "Casual / Santai", desc: "Hangout, ngopi, dan kegiatan sehari-hari" },
      { id: "Formal", label: "Formal / Profesional", desc: "Kantor, meeting, presentasi" },
      { id: "Party", label: "Pesta / Evening", desc: "Acara sosial malam, pesta, dan kencan" },
      { id: "Sports", label: "Sporty / Outdoor", desc: "Aktivitas dinamis dan outdoor" },
    ],
  },
  {
    id: "fit_preference",
    question: "Siluet dan karakter potongan apa yang Anda sukai?",
    reason: `Potongan yang tepat untuk gaya dan aktivitas ${profile.gender?.label || "Anda"}.`,
    options: [
      { id: "Regular Fit", label: "Classic Timeless", desc: "Dimensi standar seimbang" },
      { id: "Oversized", label: "Bold Oversized", desc: "Dramatis & percaya diri" },
      { id: "Fitted", label: "Minimalist Slim", desc: "Garis tipis presisi" },
      { id: "Layered", label: "Geometric Sharp", desc: "Aksen sudut kontemporer" },
    ],
  },
  {
    id: "color_mood",
    question: "Nuansa palet warna dominan yang ingin dieksplorasi?",
    reason: `Dengan undertone ${profile.undertone || "Anda"}, beberapa palet lebih bersinar.`,
    options: [
      { id: "Earth Tone", label: "Earth Tone (Hangat)", desc: "Terracotta, olive, mustard" },
      { id: "Jewel Tone", label: "Jewel Tone (Sejuk)", desc: "Navy, emerald, burgundy" },
      { id: "Neutral Classic", label: "Neutral Monokrom", desc: "Charcoal, beige, off-white" },
      { id: "Bold Vibrant", label: "Bold & Expressive", desc: "Teal, bronze, plum" },
    ],
  },
];

export async function fetchDynamicQuestions(
  category: string,
  subcategory: string,
  userProfile: Record<string, any>,
  previousAnswers: Record<string, string> | null,
  batch: number = 1,
): Promise<{ questions: any[]; source: string; batch: number; is_mock: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/questions/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        subcategory,
        user_profile: {
          monk_tone: userProfile.monk_tone?.code || userProfile.monk_tone || "MST-06",
          undertone: userProfile.undertone?.undertone || userProfile.undertone || "Warm",
          face_shape: userProfile.face_shape?.shape || userProfile.face_shape || "Oval",
          skin_tone: userProfile.skin_tone?.tone || userProfile.skin_tone || "Tan",
          gender: userProfile.gender?.label_id || userProfile.gender || "male",
        },
        previous_answers: previousAnswers,
        batch,
      }),
    });
    if (!res.ok) throw new Error("Questions API error");
    return await res.json();
  } catch (error) {
    console.warn("Questions API unavailable, using local fallback:", error);
    return {
      questions: LOCAL_FALLBACK_QUESTIONS_BATCH1(subcategory, userProfile),
      source: "client_fallback",
      batch,
      is_mock: true,
    };
  }
}

export async function analyzeSkin(imageBase64: string, useMock: boolean = false): Promise<any> {
  const defaultPreset = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
  if (useMock || !imageBase64) {
    return {
      monk_tone: defaultPreset.monk_tone,
      undertone: defaultPreset.undertone,
      is_mock: true,
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/analyze/skin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return {
      monk_tone: data.monk_tone || defaultPreset.monk_tone,
      undertone: data.undertone || defaultPreset.undertone,
      is_mock: data.is_mock || false,
    };
  } catch (error) {
    console.warn("Backend API unavailable, falling back to client mock analysis:", error);
    return {
      monk_tone: defaultPreset.monk_tone,
      undertone: defaultPreset.undertone,
      is_mock: true,
    };
  }
}

export async function analyzeRatios(
  faceRatios?: Record<string, number>,
  useMock: boolean = false
): Promise<any> {
  const defaultPreset = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
  if (useMock || !faceRatios) {
    return {
      face_shape: defaultPreset.face_shape,
      is_mock: true,
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/analyze/ratios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ face_ratios: faceRatios }),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return {
      face_shape: data.face_shape || defaultPreset.face_shape,
      is_mock: data.is_mock || false,
    };
  } catch (error) {
    console.warn("Backend API unavailable, falling back to client mock ratio analysis:", error);
    return {
      face_shape: defaultPreset.face_shape,
      is_mock: true,
    };
  }
}

export async function fetchTop4Recommendations(
  subcategory: string,
  userProfile: Partial<UserPersonalProfile>,
  quizAnswers: Record<string, any>,
  useMock: boolean = false
): Promise<{ subcategory: string; primary_item_id: string; items: RecommendationItem[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(useMock ? { "X-Mock-Data": "true" } : {}),
      },
      body: JSON.stringify({
        subcategory,
        user_profile: {
          monk_tone: userProfile.monk_tone?.code || "MST-06",
          undertone: userProfile.undertone?.undertone || "Warm",
          face_shape: userProfile.face_shape?.shape || "Oval",
          skin_tone: userProfile.skin_tone?.tone || "Tan",
          gender: userProfile.gender?.label_id || "male",
        },
        quiz_answers: quizAnswers,
      }),
    });
    if (!res.ok) throw new Error("API recommendation error");
    return await res.json();
  } catch (error) {
    console.warn("Backend API unavailable, creating client fallback recommendations:", error);
    return getClientFallbackRecommendations(subcategory, userProfile, quizAnswers);
  }
}

// Comprehensive Catalog Database of all 37 Products
const ALL_CATALOG_PRODUCTS: RecommendationItem[] = [
  // Glasses (7 items)
  {
    rank: 1,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match (#1 Best Fit)",
    id: "glass-01",
    name: "Khronos PBR Designer Eyewear",
    category: "Accessories",
    subcategory: "glasses",
    base_colour: "Gold",
    hex_colour: "#D4AF37",
    usage: "Casual",
    model_3d_path: "/images/products/glasses/glasses_01_khronos_pbr.glb",
    preview_image_url: "/images/products/preview/glass-01.png",
    price_idr: "Rp349.000",
    compatibility_score: 97.4,
    color_match_score: 98.0,
    shape_match_score: 96.0,
    stylist_reason: "Bingkai gold mewah bertekstur PBR yang memancarkan aura prestisius.",
  },
  {
    rank: 2,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic (Pilihan Serbaguna)",
    id: "glass-02",
    name: "Ray-Ban Aviator Pilot Edition",
    category: "Accessories",
    subcategory: "glasses",
    base_colour: "Charcoal Grey",
    hex_colour: "#36454F",
    usage: "Formal",
    model_3d_path: "/images/products/glasses/glasses_02_rayban_pilot.glb",
    preview_image_url: "/images/products/preview/glass-02.png",
    price_idr: "Rp450.000",
    compatibility_score: 91.2,
    color_match_score: 90.0,
    shape_match_score: 94.0,
    stylist_reason: "Desain aviator klasik titanium charcoal grey berwibawa untuk formal dan profesional.",
  },
  {
    rank: 3,
    archetype: "bold_statement",
    archetype_title: "Pilihan 3: Bold Statement (Aksen Kontras)",
    id: "glass-03",
    name: "FaceFit Urban Geometric Frame",
    category: "Accessories",
    subcategory: "glasses",
    base_colour: "Terracotta",
    hex_colour: "#E2725B",
    usage: "Party",
    model_3d_path: "/images/products/glasses/glasses_03_facefit_geometric.glb",
    preview_image_url: "/images/products/preview/glass-03.png",
    price_idr: "Rp389.000",
    compatibility_score: 89.5,
    color_match_score: 96.0,
    shape_match_score: 82.0,
    stylist_reason: "Aksen terracotta percaya diri dengan sudut geometris berani di acara pesta.",
  },
  {
    rank: 4,
    archetype: "modern_trendy",
    archetype_title: "Pilihan 4: Modern Silhouette (Varian Kekinian)",
    id: "glass-04",
    name: "FaceFit Vintage Browline Classic",
    category: "Accessories",
    subcategory: "glasses",
    base_colour: "Dark Tortoiseshell",
    hex_colour: "#3E2723",
    usage: "Formal",
    model_3d_path: "/images/products/glasses/glasses_04_facefit_browline.glb",
    preview_image_url: "/images/products/preview/glass-04.png",
    price_idr: "Rp420.000",
    compatibility_score: 86.8,
    color_match_score: 84.0,
    shape_match_score: 90.0,
    stylist_reason: "Frame browline klasik kontemporer dengan kontur tegas dan elegan.",
  },
  {
    rank: 5,
    archetype: "modern_trendy",
    archetype_title: "Pilihan 4: Modern Silhouette",
    id: "glass-05",
    name: "FaceFit Slim Wire Aviator",
    category: "Accessories",
    subcategory: "glasses",
    base_colour: "Silver Steel",
    hex_colour: "#94A3B8",
    usage: "Casual",
    model_3d_path: "/images/products/glasses/glasses_05_facefit_slim_aviator.glb",
    preview_image_url: "/images/products/preview/glass-05.png",
    price_idr: "Rp329.000",
    compatibility_score: 85.0,
    color_match_score: 86.0,
    shape_match_score: 84.0,
    stylist_reason: "Kacamata wireframe ultra-ringan bernuansa silver modern dan minimalis.",
  },
  {
    rank: 6,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "glass-06",
    name: "FaceFit Horn-Rimmed Retro",
    category: "Accessories",
    subcategory: "glasses",
    base_colour: "Havana Amber",
    hex_colour: "#78350F",
    usage: "Party",
    model_3d_path: "/images/products/glasses/glasses_06_facefit_hornrimmed.glb",
    preview_image_url: "/images/products/preview/glass-06.png",
    price_idr: "Rp375.000",
    compatibility_score: 84.0,
    color_match_score: 85.0,
    shape_match_score: 83.0,
    stylist_reason: "Frame horn-rimmed vintage bernuansa havana amber yang kaya karakter seni.",
  },
  {
    rank: 7,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "glass-07",
    name: "SunFit Performance Wrap Sport",
    category: "Accessories",
    subcategory: "glasses",
    base_colour: "Matte Onyx",
    hex_colour: "#0F172A",
    usage: "Sports",
    model_3d_path: "/images/products/glasses/glasses_07_sunfit_sport.glb",
    preview_image_url: "/images/products/preview/glass-07.png",
    price_idr: "Rp299.000",
    compatibility_score: 95.5,
    color_match_score: 94.0,
    shape_match_score: 97.0,
    stylist_reason: "Kacamata olahraga aerodinamis grip kokoh tahan guncangan saat beraktivitas dinamis.",
  },

  // Hats (11 items)
  {
    rank: 1,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "hat-01",
    name: "Imperial Bicorn Admiral Hat",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Navy Blue",
    hex_colour: "#1E3A8A",
    usage: "Formal",
    model_3d_path: "/images/products/hats/bicorn_hat.glb",
    preview_image_url: "/images/products/preview/hat-01.png",
    price_idr: "Rp385.000",
    compatibility_score: 92.0,
    color_match_score: 94.0,
    shape_match_score: 90.0,
    stylist_reason: "Topi admiral bicorn megah bergaya vintage militer premium.",
  },
  {
    rank: 2,
    archetype: "bold_statement",
    archetype_title: "Pilihan 3: Bold Statement",
    id: "hat-02",
    name: "Western Rancher Leather Cowboy Hat",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Camel Brown",
    hex_colour: "#854D0E",
    usage: "Casual",
    model_3d_path: "/images/products/hats/cowboy hat2.glb",
    preview_image_url: "/images/products/preview/hat-02.png",
    price_idr: "Rp350.000",
    compatibility_score: 91.0,
    color_match_score: 95.0,
    shape_match_score: 87.0,
    stylist_reason: "Cowboy leather brim lebar bernuansa camel brown yang kokoh dan tangguh.",
  },
  {
    rank: 3,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "hat-03",
    name: "Outlaw Dark Leather Western Hat",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Dark Brown",
    hex_colour: "#451A03",
    usage: "Streetwear",
    model_3d_path: "/images/products/hats/cowboy hat5.glb",
    preview_image_url: "/images/products/preview/hat-03.png",
    price_idr: "Rp360.000",
    compatibility_score: 88.5,
    color_match_score: 89.0,
    shape_match_score: 88.0,
    stylist_reason: "Topi kulit gelap berkarakter maskulin untuk gaya streetwear berani.",
  },
  {
    rank: 4,
    archetype: "modern_trendy",
    archetype_title: "Pilihan 4: Modern Silhouette",
    id: "hat-04",
    name: "Riviera Wide-Brim Sun Beach Hat",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Warm Sand",
    hex_colour: "#E5D0B1",
    usage: "Casual",
    model_3d_path: "/images/products/hats/female_beach_hat.glb",
    preview_image_url: "/images/products/preview/hat-04.png",
    price_idr: "Rp299.000",
    compatibility_score: 93.0,
    color_match_score: 95.0,
    shape_match_score: 91.0,
    stylist_reason: "Sunhat pantai brim lebar elegan yang memproteksi dari sinar matahari tropis.",
  },
  {
    rank: 5,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "hat-05",
    name: "Classic Sartorial Wool Fedora",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Charcoal Grey",
    hex_colour: "#334155",
    usage: "Formal",
    model_3d_path: "/images/products/hats/hat.glb",
    preview_image_url: "/images/products/preview/hat-05.png",
    price_idr: "Rp320.000",
    compatibility_score: 94.5,
    color_match_score: 93.0,
    shape_match_score: 96.0,
    stylist_reason: "Fedora wool terstruktur yang serbaguna untuk gaya smart casual dan formal.",
  },
  {
    rank: 6,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "hat-06",
    name: "Straw Voyager Adventure Hat",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Straw Yellow",
    hex_colour: "#CA8A04",
    usage: "Casual",
    model_3d_path: "/images/products/hats/luffys_straw_hat.glb",
    preview_image_url: "/images/products/preview/hat-06.png",
    price_idr: "Rp260.000",
    compatibility_score: 96.8,
    color_match_score: 98.0,
    shape_match_score: 95.0,
    stylist_reason: "Topi jerami petualang signature dengan siluet kepala proporsional dan nyaman.",
  },
  {
    rank: 7,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "hat-07",
    name: "Noir Mafia Noir Fedora",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Pitch Black",
    hex_colour: "#09090B",
    usage: "Formal",
    model_3d_path: "/images/products/hats/mafia_hat_spy_hat.glb",
    preview_image_url: "/images/products/preview/hat-07.png",
    price_idr: "Rp310.000",
    compatibility_score: 90.0,
    color_match_score: 91.0,
    shape_match_score: 89.0,
    stylist_reason: "Fedora hitam legam minimalis dengan pita satin berwibawa.",
  },
  {
    rank: 8,
    archetype: "bold_statement",
    archetype_title: "Pilihan 3: Bold Statement",
    id: "hat-08",
    name: "Retro Carnival Propeller Cap",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Multi-Color",
    hex_colour: "#E11D48",
    usage: "Party",
    model_3d_path: "/images/products/hats/propeller_hat.glb",
    preview_image_url: "/images/products/preview/hat-08.png",
    price_idr: "Rp199.000",
    compatibility_score: 91.5,
    color_match_score: 92.0,
    shape_match_score: 91.0,
    stylist_reason: "Topi baling-baling retro ceria yang memikat perhatian di acara pesta kasual.",
  },
  {
    rank: 9,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "hat-09",
    name: "Noble Renaissance Velvet Bonnet",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Burgundy Red",
    hex_colour: "#881337",
    usage: "Formal",
    model_3d_path: "/images/products/hats/renaissance_hat.glb",
    preview_image_url: "/images/products/preview/hat-09.png",
    price_idr: "Rp375.000",
    compatibility_score: 89.0,
    color_match_score: 92.0,
    shape_match_score: 86.0,
    stylist_reason: "Bonnet beludru burgundy mewah dengan detail bulu aristokrat.",
  },
  {
    rank: 10,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "hat-10",
    name: "Colonial Safari Pith Helmet",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Desert Sand",
    hex_colour: "#D97706",
    usage: "Sports",
    model_3d_path: "/images/products/hats/weathered_pith_hat.glb",
    preview_image_url: "/images/products/preview/hat-10.png",
    price_idr: "Rp335.000",
    compatibility_score: 90.5,
    color_match_score: 93.0,
    shape_match_score: 88.0,
    stylist_reason: "Pith helmet kokoh berpelindung UV untuk ekspedisi luar ruangan.",
  },
  {
    rank: 11,
    archetype: "bold_statement",
    archetype_title: "Pilihan 3: Bold Statement",
    id: "hat-11",
    name: "Eclipse Mystic Pointed Brim Hat",
    category: "Accessories",
    subcategory: "hats",
    base_colour: "Midnight Purple",
    hex_colour: "#581C87",
    usage: "Party",
    model_3d_path: "/images/products/hats/witch_hat.glb",
    preview_image_url: "/images/products/preview/hat-11.png",
    price_idr: "Rp280.000",
    compatibility_score: 89.0,
    color_match_score: 91.0,
    shape_match_score: 87.0,
    stylist_reason: "Topi kerucut misterius berona ungu malam untuk tema pesta dan panggung.",
  },

  // Shirts Pria (13 items)
  {
    rank: 1,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "shirt-pria-01",
    name: "Urban Color-Blocked Streetwear Shirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Terracotta & Olive",
    hex_colour: "#C2410C",
    usage: "Streetwear",
    model_3d_path: "/images/products/shirts/Pria/color_blocked_shirt.glb",
    preview_image_url: "/images/products/preview/shirt-pria-01.png",
    price_idr: "Rp289.000",
    compatibility_score: 97.2,
    color_match_score: 98.0,
    shape_match_score: 96.0,
    stylist_reason: "Kemeja color-block bernuansa tanah modern yang serasi dengan rona kulit hangat.",
  },
  {
    rank: 2,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "shirt-pria-02",
    name: "FC Barcelona Blaugrana Match Jersey",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Royal Navy & Crimson",
    hex_colour: "#1E3A8A",
    usage: "Sports",
    model_3d_path: "/images/products/shirts/Pria/football_shirt_fc_barcelona.glb",
    preview_image_url: "/images/products/preview/shirt-pria-02.png",
    price_idr: "Rp450.000",
    compatibility_score: 96.5,
    color_match_score: 97.0,
    shape_match_score: 96.0,
    stylist_reason: "Jersey atletik resmi dengan material breathable dan kontras warna bold yang percaya diri.",
  },
  {
    rank: 3,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "shirt-pria-03",
    name: "Resort Breathable Linen Casual Shirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Warm Beige",
    hex_colour: "#D6D3D1",
    usage: "Casual",
    model_3d_path: "/images/products/shirts/Pria/free_shirt.glb",
    preview_image_url: "/images/products/preview/shirt-pria-03.png",
    price_idr: "Rp329.000",
    compatibility_score: 93.5,
    color_match_score: 95.0,
    shape_match_score: 92.0,
    stylist_reason: "Kemeja linen adem bernuansa krem natural untuk bersantai di iklim tropis.",
  },
  {
    rank: 4,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "shirt-pria-04",
    name: "Sartorial Crisp Oxford Shirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Sky Blue",
    hex_colour: "#60A5FA",
    usage: "Formal",
    model_3d_path: "/images/products/shirts/Pria/man_shirt.glb",
    preview_image_url: "/images/products/preview/shirt-pria-04.png",
    price_idr: "Rp369.000",
    compatibility_score: 95.0,
    color_match_score: 96.0,
    shape_match_score: 94.0,
    stylist_reason: "Kemeja Oxford tailored fit bernuansa biru muda cerah untuk penampilan profesional prima.",
  },
  {
    rank: 5,
    archetype: "bold_statement",
    archetype_title: "Pilihan 3: Bold Statement",
    id: "shirt-pria-05",
    name: "Classic Flannel Lumberjack Check Shirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Crimson & Black",
    hex_colour: "#991B1B",
    usage: "Streetwear",
    model_3d_path: "/images/products/shirts/Pria/mens_casual_shirt.glb",
    preview_image_url: "/images/products/preview/shirt-pria-05.png",
    price_idr: "Rp319.000",
    compatibility_score: 90.0,
    color_match_score: 92.0,
    shape_match_score: 88.0,
    stylist_reason: "Kemeja flanel motif kotak merah-hitam tebal berkarakter tangguh.",
  },
  {
    rank: 6,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "shirt-pria-06",
    name: "Party Starter Layered Dual-Tone Tee",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Black & Crimson",
    hex_colour: "#18181B",
    usage: "Party",
    model_3d_path: "/images/products/shirts/Pria/party_starter_-_layered_t-shirts.glb",
    preview_image_url: "/images/products/preview/shirt-pria-06.png",
    price_idr: "Rp249.000",
    compatibility_score: 95.5,
    color_match_score: 96.0,
    shape_match_score: 95.0,
    stylist_reason: "Kaos tumpuk dual-tone beraksen crimson energik untuk pesta dan malam hari.",
  },
  {
    rank: 7,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "shirt-pria-07",
    name: "Everyday Comfort Boxy Oversized Tee",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Muted Sage",
    hex_colour: "#84CC16",
    usage: "Streetwear",
    model_3d_path: "/images/products/shirts/Pria/shirt.glb",
    preview_image_url: "/images/products/preview/shirt-pria-07.png",
    price_idr: "Rp229.000",
    compatibility_score: 91.0,
    color_match_score: 93.0,
    shape_match_score: 89.0,
    stylist_reason: "Kaos potongan boxy oversized kekinian yang santai dan nyaman.",
  },
  {
    rank: 8,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "shirt-pria-08",
    name: "Smart Knitted Collar Polo Shirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Olive Green",
    hex_colour: "#3F6212",
    usage: "Casual",
    model_3d_path: "/images/products/shirts/Pria/shirt2.glb",
    preview_image_url: "/images/products/preview/shirt-pria-08.png",
    price_idr: "Rp279.000",
    compatibility_score: 92.5,
    color_match_score: 94.0,
    shape_match_score: 91.0,
    stylist_reason: "Polo shirt rajut berkerah dengan warna olive green serbaguna.",
  },
  {
    rank: 9,
    archetype: "modern_trendy",
    archetype_title: "Pilihan 4: Modern Silhouette",
    id: "shirt-pria-09",
    name: "Minimalist Long Sleeve Crewneck",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Off White",
    hex_colour: "#F8FAFC",
    usage: "Casual",
    model_3d_path: "/images/products/shirts/Pria/shirt_with_long_sleeves.glb",
    preview_image_url: "/images/products/preview/shirt-pria-09.png",
    price_idr: "Rp259.000",
    compatibility_score: 89.0,
    color_match_score: 91.0,
    shape_match_score: 87.0,
    stylist_reason: "Kaos lengan panjang clean minimalist bernuansa off-white bersih.",
  },
  {
    rank: 10,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "shirt-pria-10",
    name: "Gym & Outdoor Athletic Sleeveless Top",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Charcoal Grey",
    hex_colour: "#334155",
    usage: "Sports",
    model_3d_path: "/images/products/shirts/Pria/sleeveless_shirt.glb",
    preview_image_url: "/images/products/preview/shirt-pria-10.png",
    price_idr: "Rp169.000",
    compatibility_score: 94.0,
    color_match_score: 92.0,
    shape_match_score: 96.0,
    stylist_reason: "Sleeveless top atletik leluasa gerak untuk sesi olahraga intensif.",
  },
  {
    rank: 11,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "shirt-pria-11",
    name: "Classic Heavyweight Cotton T-Shirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Navy Blue",
    hex_colour: "#1E3A8A",
    usage: "Casual",
    model_3d_path: "/images/products/shirts/Pria/t-shirt.glb",
    preview_image_url: "/images/products/preview/shirt-pria-11.png",
    price_idr: "Rp199.000",
    compatibility_score: 92.0,
    color_match_score: 94.0,
    shape_match_score: 90.0,
    stylist_reason: "T-Shirt katun heavyweight navy blue yang tebal, jatuh rapi, dan awet.",
  },
  {
    rank: 12,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "shirt-pria-12",
    name: "Cyber Techwear Multi-Pocket Tactical Shirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Matte Black",
    hex_colour: "#18181B",
    usage: "Streetwear",
    model_3d_path: "/images/products/shirts/Pria/techwear_shirt.glb",
    preview_image_url: "/images/products/preview/shirt-pria-12.png",
    price_idr: "Rp399.000",
    compatibility_score: 97.0,
    color_match_score: 98.0,
    shape_match_score: 96.0,
    stylist_reason: "Kemeja taktis techwear modern dengan kantong modular fungsional.",
  },
  {
    rank: 13,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "shirt-pria-13",
    name: "Premium Supima Regular Fit T-Shirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Heather Grey",
    hex_colour: "#64748B",
    usage: "Casual",
    model_3d_path: "/images/products/shirts/Pria/t_shirt.glb",
    preview_image_url: "/images/products/preview/shirt-pria-13.png",
    price_idr: "Rp219.000",
    compatibility_score: 91.5,
    color_match_score: 92.0,
    shape_match_score: 91.0,
    stylist_reason: "Kaos Supima regular fit halus dengan serat katun ekstra panjang.",
  },

  // Shirts Wanita (6 items)
  {
    rank: 1,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "shirt-wanita-01",
    name: "Boho Off-The-Shoulder Chic Blouse",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Champagne Rose",
    hex_colour: "#FB7185",
    usage: "Party",
    model_3d_path: "/images/products/shirts/Wanita/off_the_shoulder_shirt_-_ngchipv.glb",
    preview_image_url: "/images/products/preview/shirt-wanita-01.png",
    price_idr: "Rp299.000",
    compatibility_score: 97.2,
    color_match_score: 98.0,
    shape_match_score: 96.0,
    stylist_reason: "Blouse off-shoulder feminin dengan kerut elastis yang menonjolkan keanggunan garis bahu.",
  },
  {
    rank: 2,
    archetype: "modern_trendy",
    archetype_title: "Pilihan 4: Modern Silhouette",
    id: "shirt-wanita-02",
    name: "Two-Piece Summer Skirt & Crop Tee Set",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Dusty Lilac",
    hex_colour: "#C084FC",
    usage: "Casual",
    model_3d_path: "/images/products/shirts/Wanita/skirt_and_t-shirt.glb",
    preview_image_url: "/images/products/preview/shirt-wanita-02.png",
    price_idr: "Rp349.000",
    compatibility_score: 93.0,
    color_match_score: 94.0,
    shape_match_score: 92.0,
    stylist_reason: "Setelan two-piece rok dan crop tee bernuansa lilac manis untuk santai.",
  },
  {
    rank: 3,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "shirt-wanita-03",
    name: "Cozy Soft-Brushed Flannel Overshirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Forest Green",
    hex_colour: "#15803D",
    usage: "Casual",
    model_3d_path: "/images/products/shirts/Wanita/soft_brushed_long_sleeve_shirt.glb",
    preview_image_url: "/images/products/preview/shirt-wanita-03.png",
    price_idr: "Rp329.000",
    compatibility_score: 91.0,
    color_match_score: 93.0,
    shape_match_score: 89.0,
    stylist_reason: "Overshirt flanel katun brushed yang hangat dan leluasa sebagai outerwear.",
  },
  {
    rank: 4,
    archetype: "modern_trendy",
    archetype_title: "Pilihan 4: Modern Silhouette",
    id: "shirt-wanita-04",
    name: "Nordic Cable Knit Pullover Sweater",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Cream Ivory",
    hex_colour: "#FEF3C7",
    usage: "Casual",
    model_3d_path: "/images/products/shirts/Wanita/sweater_woman.glb",
    preview_image_url: "/images/products/preview/shirt-wanita-04.png",
    price_idr: "Rp389.000",
    compatibility_score: 90.0,
    color_match_score: 92.0,
    shape_match_score: 88.0,
    stylist_reason: "Sweater rajut motif kabel bernuansa ivory lembut yang hangat dan santai.",
  },
  {
    rank: 5,
    archetype: "safe_classic",
    archetype_title: "Pilihan 2: Safe Classic",
    id: "shirt-wanita-05",
    name: "Fitted V-Neck Soft Cotton Tee",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Terracotta Coral",
    hex_colour: "#F43F5E",
    usage: "Casual",
    model_3d_path: "/images/products/shirts/Wanita/vneck_t-shirt_for_female.glb",
    preview_image_url: "/images/products/preview/shirt-wanita-05.png",
    price_idr: "Rp189.000",
    compatibility_score: 94.0,
    color_match_score: 95.0,
    shape_match_score: 93.0,
    stylist_reason: "Kaos V-Neck katun lembut dengan potongan pas tubuh yang memberi ilusi jenjang.",
  },
  {
    rank: 6,
    archetype: "perfect_match",
    archetype_title: "Pilihan 1: The Perfect Match",
    id: "shirt-wanita-06",
    name: "Executive Satin Button-Down Shirt",
    category: "Apparel",
    subcategory: "shirts",
    base_colour: "Emerald Green",
    hex_colour: "#059669",
    usage: "Formal",
    model_3d_path: "/images/products/shirts/Wanita/womens_shirt.glb",
    preview_image_url: "/images/products/preview/shirt-wanita-06.png",
    price_idr: "Rp359.000",
    compatibility_score: 96.0,
    color_match_score: 97.0,
    shape_match_score: 95.0,
    stylist_reason: "Kemeja satin hijau zamrud mewah yang memancarkan wibawa dan karisma profesional.",
  },
];

function getClientFallbackRecommendations(
  subcategory: string,
  userProfile: Partial<UserPersonalProfile>,
  quizAnswers: Record<string, any>
): { subcategory: string; primary_item_id: string; items: RecommendationItem[] } {
  const sub = subcategory.toLowerCase();
  const isFemale = userProfile?.gender?.label_id === "female" || userProfile?.gender?.label?.toLowerCase().includes("wanita");

  let candidates = ALL_CATALOG_PRODUCTS.filter((item) => {
    if (sub === "glasses") return item.id.startsWith("glass-");
    if (sub === "hats") return item.id.startsWith("hat-");
    if (sub === "shirts") {
      return isFemale ? item.id.startsWith("shirt-wanita-") : item.id.startsWith("shirt-pria-");
    }
    return true;
  });

  const allText = Object.values(quizAnswers).flatMap((v) => (typeof v === "object" ? Object.values(v) : [String(v)])).join(" ").toLowerCase();

  let targetOccasion = "casual";
  if (allText.includes("formal") || allText.includes("kantor") || allText.includes("eksekutif") || allText.includes("sartorial")) targetOccasion = "formal";
  else if (allText.includes("olahraga") || allText.includes("sports") || allText.includes("sport") || allText.includes("atletik")) targetOccasion = "sports";
  else if (allText.includes("pesta") || allText.includes("party") || allText.includes("malam")) targetOccasion = "party";
  else if (allText.includes("streetwear") || allText.includes("urban") || allText.includes("skate") || allText.includes("techwear")) targetOccasion = "streetwear";

  const scored = candidates.map((item) => {
    let score = 75;
    const usage = (item.usage || "").toLowerCase();
    if (usage === targetOccasion) score += 20;
    else if (targetOccasion === "casual" && (usage === "casual" || usage === "streetwear")) score += 15;
    else if (targetOccasion === "sports" && usage === "sports") score += 20;
    else if (targetOccasion === "formal" && usage === "formal") score += 20;
    else if (targetOccasion === "party" && usage === "party") score += 20;

    if (allText.includes("earth") && ["Gold", "Terracotta", "Camel Brown", "Warm Sand", "Straw Yellow", "Olive Green"].includes(item.base_colour)) score += 5;
    if (allText.includes("jewel") && ["Navy Blue", "Sky Blue", "Emerald Green", "Burgundy Red"].includes(item.base_colour)) score += 5;
    if (allText.includes("monokrom") && ["Pitch Black", "Matte Black", "Charcoal Grey", "Silver Steel"].includes(item.base_colour)) score += 5;

    return { ...item, compatibility_score: Math.min(98.5, score) };
  });

  scored.sort((a, b) => b.compatibility_score - a.compatibility_score);

  const archetypes: Array<{ type: "perfect_match" | "safe_classic" | "bold_statement" | "modern_trendy"; title: string }> = [
    { type: "perfect_match", title: "Pilihan 1: The Perfect Match (#1 Best Fit)" },
    { type: "safe_classic", title: "Pilihan 2: Safe Classic (Pilihan Serbaguna)" },
    { type: "bold_statement", title: "Pilihan 3: Bold Statement (Aksen Kontras)" },
    { type: "modern_trendy", title: "Pilihan 4: Modern Silhouette (Varian Kekinian)" },
  ];

  const top4: RecommendationItem[] = scored.slice(0, 4).map((it, idx) => ({
    ...it,
    rank: idx + 1,
    archetype: archetypes[idx].type,
    archetype_title: archetypes[idx].title,
  }));

  return {
    subcategory: sub,
    primary_item_id: top4[0]?.id || "glass-01",
    items: top4,
  };
}
