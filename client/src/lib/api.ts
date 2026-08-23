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
    return getClientFallbackRecommendations(subcategory, userProfile, quizAnswers);
  }
}

function getClientFallbackRecommendations(
  subcategory: string,
  userProfile: Partial<UserPersonalProfile>,
  quizAnswers: Record<string, string>
): { subcategory: string; primary_item_id: string; items: RecommendationItem[] } {
  const sub = subcategory.toLowerCase();
  const isFemale = userProfile?.gender?.label_id === "female" || userProfile?.gender?.label?.toLowerCase().includes("wanita");

  if (sub === "glasses") {
    const items: RecommendationItem[] = [
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
        stylist_reason: "Skor keserasian 97.4%. Aksen Gold menyatu serasi dengan rona kulit dan siluet Wayfarer menyeimbangkan proporsi wajah Anda.",
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
        model_3d_path: "/images/products/glasses/glasses_03_facefit_geometric.glb",
        preview_image_url: "/images/products/preview/glass-03.png",
        price_idr: "Rp389.000",
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
        stylist_reason: "Frame browline klasik kontemporer dengan sudut kontur tegas dan elegan.",
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
        stylist_reason: "Skor keserasian 96.8%. Topi jerami signature dengan siluet kepala proporsional dan nyaman.",
        model_type: "hats",
      },
      {
        rank: 2,
        archetype: "safe_classic",
        archetype_title: "Pilihan 2: Safe Classic (Pilihan Serbaguna)",
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
        compatibility_score: 92.4,
        color_match_score: 92.0,
        shape_match_score: 93.0,
        stylist_reason: "Fedora wool terstruktur yang serbaguna untuk gaya smart casual dan formal.",
        model_type: "hats",
      },
      {
        rank: 3,
        archetype: "bold_statement",
        archetype_title: "Pilihan 3: Bold Statement (Aksen Kontras)",
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
        compatibility_score: 89.5,
        color_match_score: 95.0,
        shape_match_score: 84.0,
        stylist_reason: "Cowboy leather brim lebar yang kokoh dan berkarakter tegas.",
        model_type: "hats",
      },
      {
        rank: 4,
        archetype: "modern_trendy",
        archetype_title: "Pilihan 4: Modern Silhouette (Varian Kekinian)",
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
        compatibility_score: 87.2,
        color_match_score: 88.0,
        shape_match_score: 86.0,
        stylist_reason: "Sunhat pantai brim lebar elegan yang memproteksi dari sinar matahari.",
        model_type: "hats",
      },
    ];
    return { subcategory: "hats", primary_item_id: "hat-06", items };
  }

  if (isFemale) {
    const items: RecommendationItem[] = [
      {
        rank: 1,
        archetype: "perfect_match",
        archetype_title: "Pilihan 1: The Perfect Match (#1 Best Fit)",
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
        archetype: "safe_classic",
        archetype_title: "Pilihan 2: Safe Classic (Pilihan Serbaguna)",
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
        compatibility_score: 93.0,
        color_match_score: 92.0,
        shape_match_score: 94.0,
        stylist_reason: "Kaos V-Neck katun lembut dengan potongan pas tubuh yang memberi ilusi jenjang.",
      },
      {
        rank: 3,
        archetype: "bold_statement",
        archetype_title: "Pilihan 3: Bold Statement (Aksen Kontras)",
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
        compatibility_score: 89.5,
        color_match_score: 95.0,
        shape_match_score: 84.0,
        stylist_reason: "Kemeja satin hijau zamrud mewah yang memancarkan wibawa dan karisma profesional.",
      },
      {
        rank: 4,
        archetype: "modern_trendy",
        archetype_title: "Pilihan 4: Modern Silhouette (Varian Kekinian)",
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
        compatibility_score: 87.5,
        color_match_score: 88.0,
        shape_match_score: 87.0,
        stylist_reason: "Sweater rajut motif kabel bernuansa ivory lembut yang hangat dan santai.",
      },
    ];
    return { subcategory: "shirts", primary_item_id: "shirt-wanita-01", items };
  }

  const items: RecommendationItem[] = [
    {
      rank: 1,
      archetype: "perfect_match",
      archetype_title: "Pilihan 1: The Perfect Match (#1 Best Fit)",
      id: "shirt-pria-01",
      name: "Urban Color-Blocked Streetwear Shirt",
      category: "Apparel",
      subcategory: "shirts",
      base_colour: "Terracotta & Olive",
      hex_colour: "#C2410C",
      usage: "Casual",
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
      archetype: "safe_classic",
      archetype_title: "Pilihan 2: Safe Classic (Pilihan Serbaguna)",
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
      compatibility_score: 93.0,
      color_match_score: 92.0,
      shape_match_score: 94.0,
      stylist_reason: "Kemeja Oxford tailored fit bernuansa biru muda cerah untuk penampilan profesional prima.",
    },
    {
      rank: 3,
      archetype: "bold_statement",
      archetype_title: "Pilihan 3: Bold Statement (Aksen Kontras)",
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
      compatibility_score: 89.5,
      color_match_score: 95.0,
      shape_match_score: 84.0,
      stylist_reason: "Jersey atletik resmi dengan material breathable dan kontras warna bold yang percaya diri.",
    },
    {
      rank: 4,
      archetype: "modern_trendy",
      archetype_title: "Pilihan 4: Modern Silhouette (Varian Kekinian)",
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
      compatibility_score: 87.5,
      color_match_score: 88.0,
      shape_match_score: 87.0,
      stylist_reason: "Polo knit berkerah elegan bernuansa olive earthy untuk gaya smart casual santai.",
    },
  ];
  return { subcategory: "shirts", primary_item_id: "shirt-pria-01", items };
}
