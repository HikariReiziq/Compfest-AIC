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
  quizAnswers: Record<string, string>,
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
    // Generate fallback Top-4 items
    return getClientFallbackRecommendations(subcategory, userProfile, quizAnswers);
  }
}

function getClientFallbackRecommendations(
  subcategory: string,
  userProfile: Partial<UserPersonalProfile>,
  quizAnswers: Record<string, string>
): { subcategory: string; primary_item_id: string; items: RecommendationItem[] } {

  const sub = subcategory.toLowerCase();
  
  if (sub === "glasses") {
    const items: RecommendationItem[] = [
      {
        rank: 1,
        archetype: "perfect_match",
        archetype_title: "Pilihan 1: The Perfect Match (#1 Best Fit)",
        id: "glass-01",
        name: "AeroClassic Wayfarer Black Gold",
        category: "Accessories",
        subcategory: "glasses",
        base_colour: "Gold",
        hex_colour: "#D4AF37",
        usage: "Casual",
        model_3d_path: "/images/products/glasses/glasses_01_khronos_pbr.glb",
        preview_image_url: "/images/products/preview/glass-01.svg",
        price_idr: "Rp349.000",
        compatibility_score: 97.4,
        color_match_score: 98.0,
        shape_match_score: 96.0,
        stylist_reason: "Skor keserasian 97.4%. Aksen Gold menyatu serasi dengan undertone hangat dan siluet Wayfarer menyeimbangkan proporsi wajah Anda.",
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
        model_3d_path: "/images/products/glasses/glasses_02_rayban.glb",
        preview_image_url: "/images/products/preview/glass-02.svg",
        price_idr: "Rp299.000",
        compatibility_score: 91.2,
        color_match_score: 90.0,
        shape_match_score: 94.0,
        stylist_reason: "Opsi klasik netral yang serbaguna untuk kebutuhan harian maupun profesional.",
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
        model_3d_path: "/images/products/glasses/glasses_03_facefit_geo.glb",
        preview_image_url: "/images/products/preview/glass-03.svg",
        price_idr: "Rp399.000",
        compatibility_score: 89.5,
        color_match_score: 96.0,
        shape_match_score: 82.0,
        stylist_reason: "Aksen terracotta percaya diri yang memberi rona hangat memikat di acara pesta.",
      },
      {
        rank: 4,
        archetype: "modern_trendy",
        archetype_title: "Pilihan 4: Modern Silhouette (Varian Kekinian)",
        id: "glass-04",
        name: "FaceFit Executive Browline",
        category: "Accessories",
        subcategory: "glasses",
        base_colour: "Navy Blue",
        hex_colour: "#000080",
        usage: "Formal",
        model_3d_path: "/images/products/glasses/glasses_04_facefit_browline.glb",
        preview_image_url: "/images/products/preview/glass-04.svg",
        price_idr: "Rp489.000",
        compatibility_score: 86.8,
        color_match_score: 84.0,
        shape_match_score: 90.0,
        stylist_reason: "Frame titanium geometris modern dengan sudut kontur tajam.",
        model_type: "glasses",
      },
    ];
    return { subcategory: "glasses", primary_item_id: "glass-01", items };
  }

  if (sub === "hats") {
    const items: RecommendationItem[] = [
      {
        rank: 1,
        archetype: "perfect_match",
        archetype_title: "Pilihan 1: The Perfect Match (#1 Best Fit)",
        id: "hat-01",
        name: "Luffy Anime Straw Hat Heritage",
        category: "Accessories",
        subcategory: "hats",
        base_colour: "Straw Natural",
        hex_colour: "#D97706",
        usage: "Casual",
        model_3d_path: "/images/products/hats/hat_01_luffy_straw.glb",
        preview_image_url: "/images/products/preview/hat-01.svg",
        price_idr: "Rp350.000",
        compatibility_score: 96.8,
        color_match_score: 98.0,
        shape_match_score: 95.0,
        stylist_reason: "Skor keserasian 96.8%. Topi jerami heritage yang memberikan siluet kepala proporsional dan santai.",
        model_type: "hats",
      },
      {
        rank: 2,
        archetype: "safe_classic",
        archetype_title: "Pilihan 2: Safe Classic (Pilihan Serbaguna)",
        id: "hat-02",
        name: "MetaFactory Gitcoin Ribbed Beanie",
        category: "Accessories",
        subcategory: "hats",
        base_colour: "Charcoal Grey",
        hex_colour: "#374151",
        usage: "Casual",
        model_3d_path: "/images/products/hats/hat_02_gitcoin_beanie.glb",
        preview_image_url: "/images/products/preview/hat-02.svg",
        price_idr: "Rp280.000",
        compatibility_score: 92.4,
        color_match_score: 92.0,
        shape_match_score: 93.0,
        stylist_reason: "Beanie rajut premium yang nyaman dan fleksibel melengkapi gaya streetwear.",
        model_type: "hats",
      },
      {
        rank: 3,
        archetype: "bold_statement",
        archetype_title: "Pilihan 3: Bold Statement (Aksen Kontras)",
        id: "hat-04",
        name: "MetaFactory Streetwear Snapback 57",
        category: "Accessories",
        subcategory: "hats",
        base_colour: "Crimson Red",
        hex_colour: "#991B1B",
        usage: "Streetwear",
        model_3d_path: "/images/products/hats/hat_04_street_snapback.glb",
        preview_image_url: "/images/products/preview/hat-04.svg",
        price_idr: "Rp320.000",
        compatibility_score: 89.5,
        color_match_score: 95.0,
        shape_match_score: 84.0,
        stylist_reason: "Snapback berstruktur tegas dengan flat brim kontemporer.",
        model_type: "hats",
      },
      {
        rank: 4,
        archetype: "modern_trendy",
        archetype_title: "Pilihan 4: Modern Silhouette (Varian Kekinian)",
        id: "hat-06",
        name: "Three.js FaceCap Structured Baseball Cap",
        category: "Accessories",
        subcategory: "hats",
        base_colour: "Midnight Black",
        hex_colour: "#0F172A",
        usage: "Casual",
        model_3d_path: "/images/products/hats/hat_06_threejs_facecap.glb",
        preview_image_url: "/images/products/preview/hat-06.svg",
        price_idr: "Rp290.000",
        compatibility_score: 87.2,
        color_match_score: 88.0,
        shape_match_score: 86.0,
        stylist_reason: "Topi baseball 6-panel klasik dengan lengkungan visor aerodinamis.",
        model_type: "hats",
      },
    ];
    return { subcategory: "hats", primary_item_id: "hat-01", items };
  }

  // Default: Shirts (Baju)
  const items: RecommendationItem[] = [
    {
      rank: 1,
      archetype: "perfect_match",
      archetype_title: "Pilihan 1: The Perfect Match (#1 Best Fit)",
      id: "shirt-01",
      name: "Adrian 3D Heavyweight Baked Supima Tee",
      category: "Apparel",
      subcategory: "shirts",
      base_colour: "Chalk White",
      hex_colour: "#F8FAFC",
      usage: "Casual",
      model_3d_path: "/images/products/shirts/shirt_01_adrian_baked_tee.glb",
      preview_image_url: "/images/products/preview/shirt-01.svg",
      price_idr: "Rp280.000",
      compatibility_score: 97.2,
      color_match_score: 98.0,
      shape_match_score: 96.0,
      stylist_reason: "Kaos Supima cotton heavyweight dengan lipatan kain realistis 3D yang membungkus torso dan bahu.",
    },
    {
      rank: 2,
      archetype: "safe_classic",
      archetype_title: "Pilihan 2: Safe Classic (Pilihan Serbaguna)",
      id: "shirt-02",
      name: "Francesco 3D Athletic Jersey Shirt",
      category: "Apparel",
      subcategory: "shirts",
      base_colour: "Navy Blue",
      hex_colour: "#1E3A8A",
      usage: "Casual",
      model_3d_path: "/images/products/shirts/shirt_02_francesco_jersey.glb",
      preview_image_url: "/images/products/preview/shirt-02.svg",
      price_idr: "Rp320.000",
      compatibility_score: 93.0,
      color_match_score: 92.0,
      shape_match_score: 94.0,
      stylist_reason: "Jersey atletik modern dengan tekstur kain breathable dan proporsi bahu seimbang.",
    },
    {
      rank: 3,
      archetype: "bold_statement",
      archetype_title: "Pilihan 3: Bold Statement (Aksen Kontras)",
      id: "shirt-03",
      name: "MetaFactory 3D Boxy Streetwear Hoodie 51",
      category: "Apparel",
      subcategory: "shirts",
      base_colour: "Charcoal Black",
      hex_colour: "#18181B",
      usage: "Casual",
      model_3d_path: "/images/products/shirts/shirt_03_mf_hoodie_51.glb",
      preview_image_url: "/images/products/preview/shirt-03.svg",
      price_idr: "Rp590.000",
      compatibility_score: 89.8,
      color_match_score: 95.0,
      shape_match_score: 85.0,
      stylist_reason: "Hoodie boxy streetwear tebal dengan drapery kain autentik untuk gaya urban.",
    },
    {
      rank: 4,
      archetype: "modern_trendy",
      archetype_title: "Pilihan 4: Modern Silhouette (Varian Kekinian)",
      id: "shirt-10",
      name: "MetaFactory 3D Heritage Cotton T-Shirt 111",
      category: "Apparel",
      subcategory: "shirts",
      base_colour: "Heather Grey",
      hex_colour: "#64748B",
      usage: "Casual",
      model_3d_path: "/images/products/shirts/shirt_10_mf_tshirt_111.glb",
      preview_image_url: "/images/products/preview/shirt-10.svg",
      price_idr: "Rp310.000",
      compatibility_score: 87.5,
      color_match_score: 86.0,
      shape_match_score: 91.0,
      stylist_reason: "T-shirt heritage kasual dengan kenyamanan ekstra dan fitting torso natural.",
    },
  ];
  return { subcategory: "shirts", primary_item_id: "shirt-01", items };
}
