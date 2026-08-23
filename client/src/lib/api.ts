import { UserPersonalProfile, RecommendationItem, MOCK_PRESETS, FaceMeasurements } from "./mockData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/* ------------------------------------------------------------------ */
/*  Multi-Dimensional Landmark Analysis (ADR-014)                     */
/*  Payload hanya fitur turunan (angka) — tanpa gambar wajah.         */
/* ------------------------------------------------------------------ */
export interface LandmarkAnalysisResult {
  face_shape?: UserPersonalProfile["face_shape"];
  body_shape?: UserPersonalProfile["body_shape"];
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
 * POST /api/v1/analyze/landmarks — klasifikasi server-side atas fitur turunan.
 * Fallback rantai lama: bila endpoint baru tidak tersedia/gagal, gunakan
 * /analyze/ratios (wajah tetap terklasifikasi; hidung/mata/alis menjadi
 * undefined dan UI wajib aman terhadapnya via optional chaining).
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
      const legacy = await analyzeRatios(ratios, undefined, false);
      return {
        face_shape: legacy?.face_shape || undefined,
        body_shape: legacy?.body_shape || undefined,
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
        body_shape: preset.body_shape,
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
    reason: `Potongan yang tepat untuk bentuk tubuh ${profile.body_shape || "Anda"}.`,
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
          body_shape: userProfile.body_shape?.shape || userProfile.body_shape || "Hourglass",
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
  bodyRatios?: Record<string, number>,
  useMock: boolean = false
): Promise<any> {
  const defaultPreset = MOCK_PRESETS.indonesian_warm_sawo_matang.profile;
  if (useMock || (!faceRatios && !bodyRatios)) {
    return {
      face_shape: defaultPreset.face_shape,
      body_shape: defaultPreset.body_shape,
      is_mock: true,
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/analyze/ratios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ face_ratios: faceRatios, body_ratios: bodyRatios }),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return {
      face_shape: data.face_shape || defaultPreset.face_shape,
      body_shape: data.body_shape || defaultPreset.body_shape,
      is_mock: data.is_mock || false,
    };
  } catch (error) {
    console.warn("Backend API unavailable, falling back to client mock ratio analysis:", error);
    return {
      face_shape: defaultPreset.face_shape,
      body_shape: defaultPreset.body_shape,
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
          body_shape: userProfile.body_shape?.shape || "Hourglass",
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
        model_3d_path: "/models/glasses_wayfarer.glb",
        preview_image_url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=80",
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
        id: "glass-04",
        name: "Urban Rectangular Matte Charcoal",
        category: "Accessories",
        subcategory: "glasses",
        base_colour: "Charcoal Grey",
        hex_colour: "#36454F",
        usage: "Formal",
        model_3d_path: "/models/glasses_rectangular.glb",
        preview_image_url: "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=500&auto=format&fit=crop&q=80",
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
        name: "Retro Round Aviator Rose Gold",
        category: "Accessories",
        subcategory: "glasses",
        base_colour: "Terracotta",
        hex_colour: "#E2725B",
        usage: "Party",
        model_3d_path: "/models/glasses_aviator.glb",
        preview_image_url: "https://images.unsplash.com/photo-1577803645773-f96470509666?w=500&auto=format&fit=crop&q=80",
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
        id: "glass-02",
        name: "Geometric Minimalist Titanium Frame",
        category: "Accessories",
        subcategory: "glasses",
        base_colour: "Navy Blue",
        hex_colour: "#000080",
        usage: "Formal",
        model_3d_path: "/models/glasses_geometric.glb",
        preview_image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&auto=format&fit=crop&q=80",
        price_idr: "Rp489.000",
        compatibility_score: 86.8,
        color_match_score: 84.0,
        shape_match_score: 90.0,
        stylist_reason: "Frame titanium geometris modern dengan sudut kontur tajam.",
        model_type: "geometric",
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
        id: "hat-03",
        name: "Structured 6-Panel Baseball Cap Terracotta",
        category: "Accessories",
        subcategory: "hats",
        base_colour: "Terracotta",
        hex_colour: "#E2725B",
        usage: "Sports",
        model_3d_path: "/models/hat_cap.glb",
        preview_image_url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=80",
        price_idr: "Rp169.000",
        compatibility_score: 96.8,
        color_match_score: 98.0,
        shape_match_score: 95.0,
        stylist_reason: "Skor keserasian 96.8%. Visor melengkung topi baseball menyeimbangkan kontur wajah dan warna Terracotta menyatu selaras dengan rona kulit hangat Anda.",
        model_type: "cap",
      },
      {
        rank: 2,
        archetype: "safe_classic",
        archetype_title: "Pilihan 2: Safe Classic (Pilihan Serbaguna)",
        id: "hat-04",
        name: "Ribbed Knit Fisherman Beanie Navy Blue",
        category: "Accessories",
        subcategory: "hats",
        base_colour: "Navy Blue",
        hex_colour: "#000080",
        usage: "Casual",
        model_3d_path: "/models/hat_beanie.glb",
        preview_image_url: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500&auto=format&fit=crop&q=80",
        price_idr: "Rp149.000",
        compatibility_score: 92.4,
        color_match_score: 92.0,
        shape_match_score: 93.0,
        stylist_reason: "Beanie rajut navy serbaguna yang nyaman dan pas di kepala untuk gaya kasual harian.",
        model_type: "beanie",
      },
      {
        rank: 3,
        archetype: "bold_statement",
        archetype_title: "Pilihan 3: Bold Statement (Aksen Kontras)",
        id: "hat-02",
        name: "Streetwear Twill Bucket Hat Olive Green",
        category: "Accessories",
        subcategory: "hats",
        base_colour: "Olive Green",
        hex_colour: "#556B2F",
        usage: "Casual",
        model_3d_path: "/models/hat_bucket.glb",
        preview_image_url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=80",
        price_idr: "Rp189.000",
        compatibility_score: 89.5,
        color_match_score: 95.0,
        shape_match_score: 84.0,
        stylist_reason: "Aksen streetwear santai dengan brim melingkar hijau zaitun bernuansa earth-tone.",
        model_type: "bucket",
      },
      {
        rank: 4,
        archetype: "modern_trendy",
        archetype_title: "Pilihan 4: Modern Silhouette (Varian Kekinian)",
        id: "hat-01",
        name: "Classic Wool Felt Fedora Charcoal",
        category: "Accessories",
        subcategory: "hats",
        base_colour: "Charcoal Grey",
        hex_colour: "#36454F",
        usage: "Formal",
        model_3d_path: "/models/hat_fedora.glb",
        preview_image_url: "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=500&auto=format&fit=crop&q=80",
        price_idr: "Rp279.000",
        compatibility_score: 87.2,
        color_match_score: 88.0,
        shape_match_score: 86.0,
        stylist_reason: "Fedora berstruktur dengan crown tegak berlekuk yang memberikan ilusi vertikal jenjang.",
        model_type: "fedora",
      },
    ];
    return { subcategory: "hats", primary_item_id: "hat-03", items };
  }

  // Default jackets fallback
  const items: RecommendationItem[] = [
    {
      rank: 1,
      archetype: "perfect_match",
      archetype_title: "Pilihan 1: The Perfect Match (#1 Best Fit)",
      id: "jacket-01",
      name: "Cyber-Minimalist Harrington Jacket Olive Drab",
      category: "Apparel",
      subcategory: "jackets",
      base_colour: "Olive Green",
      hex_colour: "#556B2F",
      usage: "Casual",
      model_3d_path: "/models/jacket_harrington.glb",
      preview_image_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80",
      price_idr: "Rp549.000",
      compatibility_score: 96.8,
      color_match_score: 98.0,
      shape_match_score: 95.0,
      stylist_reason: "Warna Olive Green menyatu sempurna dengan palet kulit hangat Anda dan potongan Harrington mengikuti postur tubuh dengan luwes.",
    },
    {
      rank: 2,
      archetype: "safe_classic",
      archetype_title: "Pilihan 2: Safe Classic (Pilihan Serbaguna)",
      id: "jacket-02",
      name: "Structured Tailored Blazer Charcoal",
      category: "Apparel",
      subcategory: "jackets",
      base_colour: "Charcoal Grey",
      hex_colour: "#36454F",
      usage: "Formal",
      model_3d_path: "/models/jacket_blazer.glb",
      preview_image_url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop&q=80",
      price_idr: "Rp699.000",
      compatibility_score: 91.0,
      color_match_score: 88.0,
      shape_match_score: 94.0,
      stylist_reason: "Blazer terstruktur yang elegan dan fleksibel untuk berbagai acara formal.",
    },
    {
      rank: 3,
      archetype: "bold_statement",
      archetype_title: "Pilihan 3: Bold Statement (Aksen Kontras)",
      id: "jacket-03",
      name: "Vintage Wash Distressed Denim Terracotta",
      category: "Apparel",
      subcategory: "jackets",
      base_colour: "Terracotta",
      hex_colour: "#E2725B",
      usage: "Casual",
      model_3d_path: "/models/jacket_denim.glb",
      preview_image_url: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=80",
      price_idr: "Rp489.000",
      compatibility_score: 89.2,
      color_match_score: 96.0,
      shape_match_score: 82.0,
      stylist_reason: "Aksen terracotta vintage yang memberikan pernyataan gaya tegas dan berani.",
    },
    {
      rank: 4,
      archetype: "modern_trendy",
      archetype_title: "Pilihan 4: Modern Silhouette (Varian Kekinian)",
      id: "jacket-04",
      name: "Technical Oversized Anorak Warm Beige",
      category: "Apparel",
      subcategory: "jackets",
      base_colour: "Warm Beige",
      hex_colour: "#D4B996",
      usage: "Sports",
      model_3d_path: "/models/jacket_anorak.glb",
      preview_image_url: "https://images.unsplash.com/photo-1544022613-e87ce7526edb?w=500&auto=format&fit=crop&q=80",
      price_idr: "Rp459.000",
      compatibility_score: 87.0,
      color_match_score: 90.0,
      shape_match_score: 84.0,
      stylist_reason: "Outerwear teknikal berpotongan oversized modern bernuansa krem pasir.",
    },
  ];
  return { subcategory: "jackets", primary_item_id: "jacket-01", items };
}
