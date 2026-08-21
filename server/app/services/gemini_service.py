"""Gemini AI Service — Context-Aware Dynamic Questionnaire Generator.

Uses Google Generative AI REST API with ultra-fast flash-lite models to synthesize
deeply personalized, non-generic style questions in Indonesian tailored to the user's
specific detected Monk Skin Tone, Undertone, and Face/Body Geometry.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional

from ..config import get_settings

logger = logging.getLogger(__name__)

# Ultra-fast low-latency models
FAST_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
]


def _build_tailored_prompt(
    user_profile: Dict[str, Any],
    category: str,
    subcategory: str,
    previous_answers: Optional[Dict[str, str]] = None,
    batch: int = 1,
) -> str:
    """Builds a bespoke prompt instructing Gemini to craft questions customized to this exact user."""
    undertone = user_profile.get("undertone", "Warm")
    face_shape = user_profile.get("face_shape", "Oval")
    body_shape = user_profile.get("body_shape", "Hourglass")
    monk_tone = user_profile.get("monk_tone", "MST-06")

    subcategory_id = subcategory.lower()
    item_label = "kacamata (eyewear)" if "glass" in subcategory_id else "topi (headwear)" if "hat" in subcategory_id else subcategory_id

    # Detailed biometric context instructions
    face_context_map = {
        "Square": "Pengguna memiliki garis rahang tegas dan sudut wajah bersiku. Pertanyaan harus menanyakan preferensi pelembutan sudut (frame bulat/oval) atau penegasan karakter tajam (frame geometris).",
        "Round": "Pengguna memiliki pipi penuh dan panjang/lebar wajah seimbang. Pertanyaan harus menanyakan preferensi penambahan struktur sudut (frame persegi panjang/kotak) untuk ilusi wajah lebih tirus.",
        "Heart": "Pengguna memiliki dahi lebih lebar dengan dagu lancip. Pertanyaan harus menanyakan preferensi keseimbangan dagu (frame beraksen bawah lebih tebal/aviator) vs gaya cat-eye.",
        "Oblong": "Pengguna memiliki proporsi wajah vertikal memanjang. Pertanyaan harus menanyakan preferensi aksen lebar horizontal (frame oversized/tall lens) untuk proporsi seimbang.",
        "Oval": "Pengguna memiliki proporsi wajah ideal dan simetris serbaguna. Pertanyaan harus menanyakan eksplorasi gaya eksperimental vs klasik elegan.",
    }

    skin_context_map = {
        "Warm": f"Kulit rona hangat (skala {monk_tone}) paling bersinar dengan sentuhan emas, terracotta, olive green, tortoiseshell, dan mustard yellow.",
        "Cool": f"Kulit rona sejuk (skala {monk_tone}) sangat cocok dengan perak, charcoal grey, navy blue, burgundy berry, dan emerald.",
        "Neutral": f"Kulit netral (skala {monk_tone}) fleksibel memadukan warna monokrom, rose gold, beige, dan dark tortoiseshell.",
        "Olive": f"Kulit rona zaitun (skala {monk_tone}) membutuhkan kontras hangat-sejuk seperti bronze, deep teal, terracotta, dan vintage amber.",
    }

    face_tip = face_context_map.get(face_shape, f"Sesuaikan dengan proporsi wajah {face_shape}.")
    skin_tip = skin_context_map.get(undertone, f"Sesuaikan dengan undertone {undertone}.")

    batch_topics = {
        1: "3 pertanyaan inti yang fokus pada: (1) Momen/tujuan pemakaian, (2) Keseimbangan siluet bingkai khusus bentuk wajah " + face_shape + ", (3) Harmoni palet warna khusus rona " + undertone + ".",
        2: "3 pertanyaan pendalaman yang fokus pada: (1) Gaya inspirasi brand/desain, (2) Prioritas kenyamanan bantalan hidung/bobot vs tampilan, (3) Rentang budget belanja.",
        3: "3 pertanyaan material & tekstur yang fokus pada: (1) Jenis material frame (asetat, titanium, stainless, kayu), (2) Tipe aksen finishing (matte vs gloss), (3) Tingkat fleksibilitas outfit (day-to-night).",
        4: "3 pertanyaan konteks lingkungan: (1) Suasana pencahayaan & cuaca pemakaian, (2) Jenis lensa (bening, photochromic, polarized, tinted), (3) Konsep layering aksesoris.",
        5: "2 pertanyaan signature identity: (1) Kesan karakter personal yang ingin dipancarkan, (2) Detail hardware atau engsel yang disukai.",
    }

    topic_instruction = batch_topics.get(batch, f"2 pertanyaan personalisasi lanjutan Batch {batch}")

    prev_info = ""
    if previous_answers:
        prev_info = f"\nJAWABAN SEBELUMNYA OLEH PENGGUNA (Gunakan konteks ini untuk membuat pertanyaan lanjutan yang semakin cerdas): {json.dumps(previous_answers, ensure_ascii=False)}"

    return f"""Kamu adalah AI Fashion Stylist & Eyewear/Headwear Specialist Indonesia bernama COBA.

PROFIL PENGGUNA TERDETEKSI KAMERA:
- Skala Warna Kulit: {monk_tone} (Google Monk Skin Tone Scale)
- Rona Kulit (Undertone): {undertone} Tone ({skin_tip})
- Bentuk Wajah (Face Shape): {face_shape} Face ({face_tip})
- Kategori Target: {item_label}
- Batch Kuesioner: #{batch}
{prev_info}

TUGAS ANDA:
Buat kuesioner bergaya desainer profesional yang SANGAT SPESIFIK dan EKSPLISIT menyebutkan karakteristik wajah {face_shape} dan rona kulit {undertone} / {monk_tone} pengguna pada pertanyaan atau penjelasannya.

{topic_instruction}

FORMAT OUTPUT (WAJIB JSON array valid murni tanpa teks pengantar):
[
  {{
    "id": "q_{subcategory}_b{batch}_1",
    "question": "Pertanyaan dalam Bahasa Indonesia yang kontekstual dan personal",
    "reason": "Alasan 1-2 kalimat mengapa pertanyaan ini krusial untuk profil wajah {face_shape} dan kulit {undertone} pengguna",
    "options": [
      {{"id": "opt_1", "label": "Label Opsi 1", "desc": "Deskripsi singkat 1 kalimat"}},
      {{"id": "opt_2", "label": "Label Opsi 2", "desc": "Deskripsi singkat 1 kalimat"}},
      {{"id": "opt_3", "label": "Label Opsi 3", "desc": "Deskripsi singkat 1 kalimat"}},
      {{"id": "opt_4", "label": "Label Opsi 4", "desc": "Deskripsi singkat 1 kalimat"}}
    ]
  }}
]

ATURAN KETAT:
1. WAJIB JSON array valid murni.
2. Setiap pertanyaan memiliki tepat 4 pilihan opsi yang relevan.
3. Kuesioner HARUS terasa cerdas, adaptif, dan berorientasi pada AI personal stylist kelas dunia."""


def _generate_dynamic_fallback(
    user_profile: Dict[str, Any],
    subcategory: str,
    batch: int = 1,
) -> List[Dict[str, Any]]:
    """Generates dynamically customized questions for the user's specific face shape and undertone.
    Used as an ultra-fast dynamic baseline or offline resilient generator.
    """
    undertone = user_profile.get("undertone", "Warm")
    face_shape = user_profile.get("face_shape", "Oval")
    monk_tone = user_profile.get("monk_tone", "MST-06")

    # Tailor question 2 explicitly to the face shape
    face_specific_q = {
        "Square": {
            "q": f"Untuk menyeimbangkan garis rahang tegas pada wajah {face_shape} Anda, karakter siluet frame apa yang Anda prioritaskan?",
            "reason": f"Wajah Square memiliki lebar dahi dan rahang yang seimbang dengan sudut tegas. Siluet lengkung akan melembutkan sudut, sedangkan siluet geometris akan mempertegas karakter wibawa.",
            "options": [
                {"id": "Round Curved", "label": "Round / Oval Frames", "desc": "Garis kurva melingkar untuk melembutkan sudut rahang tegas"},
                {"id": "Rounded Square", "label": "Soft Wayfarer / Curvaceous", "desc": "Bentuk kotak dengan sudut membulat yang proporsional"},
                {"id": "Geometric Sharp", "label": "Octagonal / Hexagonal", "desc": "Bentuk sudut kontemporer mempertegas rahang berkarakter"},
                {"id": "Minimalist Wire", "label": "Thin Wire Aviator", "desc": "Bingkai kawat tipis ringan tanpa memberi beban visual"},
            ],
        },
        "Round": {
            "q": f"Untuk memberi ilusi dimensi kontur yang lebih tegas pada wajah {face_shape} Anda, siluet apa yang Anda cari?",
            "reason": f"Wajah Round memiliki garis pipi lembut. Bingkai dengan sudut tegas (rectangular/angular) memberikan struktur kontras yang membuat wajah tampak lebih tirus.",
            "options": [
                {"id": "Rectangular Sharp", "label": "Rectangular / Square Frames", "desc": "Sudut tegas horizontal yang memberi ilusi wajah lebih tirus"},
                {"id": "Cat Eye Angular", "label": "Upward Cat-Eye / Browline", "desc": "Aksen sudut terangkat ke atas untuk menarik fokus vertikal"},
                {"id": "Geometric Bold", "label": "Sharp Geometric Frame", "desc": "Garis bersudut kuat mengimbangi kelembutan pipi bulat"},
                {"id": "Structured Classic", "label": "Wayfarer Classic", "desc": "Garis atas lurus kokoh berdimensi seimbang"},
            ],
        },
        "Heart": {
            "q": f"Dengan bentuk dahi yang lebih dominan dari dagu pada wajah {face_shape} Anda, proporsi bingkai apa yang Anda sukai?",
            "reason": f"Wajah Heart memiliki dahi lebih lebar dan dagu lancip. Bingkai dengan dimensi bawah lebar atau aksen ringan menyeimbangkan proporsi dagu secara harmonis.",
            "options": [
                {"id": "Bottom Heavy", "label": "Bottom-Weighted / Aviator", "desc": "Bingkai dengan aksen bawah lebih lebar menyeimbangkan dagu lancip"},
                {"id": "Rimless / Light", "label": "Rimless / Thin Wire", "desc": "Desain tanpa bingkai tebal agar dahi tidak terasa penuh"},
                {"id": "Round Oval", "label": "Soft Oval Wire", "desc": "Kurva lembut yang mengimbangi lancipnya dagu bawah"},
                {"id": "Low Bridge", "label": "Low-Bridge Fit Minimalist", "desc": "Posisi jembatan hidung seimbang untuk fokus tengah wajah"},
            ],
        },
        "Oblong": {
            "q": f"Untuk menyeimbangkan proporsi vertikal wajah {face_shape} Anda, dimensi bingkai seperti apa yang paling Anda inginkan?",
            "reason": f"Wajah Oblong memiliki panjang vertikal lebih dominan. Bingkai dengan lensa lebih tinggi (tall lens/oversized) dan aksen pelipis lebar memperpendek ilusi panjang wajah.",
            "options": [
                {"id": "Tall Lens Oversized", "label": "Tall Lens / Oversized Frame", "desc": "Lensa berdimensi tinggi membagi bidang vertikal wajah"},
                {"id": "Bold Browline", "label": "Thick Browline Accent", "desc": "Garis atas tebal menarik fokus horizontal ke area mata"},
                {"id": "Square Wide", "label": "Wide Square Cut", "desc": "Lebar bingkai melampaui tulang pipi memberi ilusi proporsional"},
                {"id": "Double Bridge", "label": "Double Bridge Aviator", "desc": "Aksen jembatan ganda mengisi ruang vertikal hidung"},
            ],
        },
        "Oval": {
            "q": f"Wajah {face_shape} Anda memiliki simetri proporsional alami. Eksplorasi gaya desain apa yang ingin Anda tonjolkan?",
            "reason": f"Wajah Oval adalah bentuk paling serbaguna dan kompatibel dengan hampir semua model bingkai kacamata.",
            "options": [
                {"id": "Classic Wayfarer", "label": "Classic Wayfarer Timeless", "desc": "Desain klasik yang menonjolkan simetri alami wajah Anda"},
                {"id": "Modern Geometric", "label": "Modern Geometric / Hexagon", "desc": "Sentuhan kontemporer kekinian yang berani beda"},
                {"id": "Retro Round", "label": "Retro Round Metal", "desc": "Gaya vintage intelektual bernuansa artistik"},
                {"id": "Slim Minimalist", "label": "Slim Titanium Minimalist", "desc": "Tampilan profesional bersih tanpa mengaburkan fitur wajah"},
            ],
        },
    }

    # Tailor question 3 explicitly to the skin undertone
    skin_specific_q = {
        "Warm": {
            "q": f"Untuk mengoptimalkan kilau rona hangat ({undertone} Tone / {monk_tone}) kulit Anda, palet warna apa yang Anda inginkan?",
            "reason": f"Rona Warm menyatu sempurna dengan pigmen berbasis emas, tanah hangat (terracotta, tortoiseshell), mustard, dan hijau zaitun.",
            "options": [
                {"id": "Earth Tone Gold", "label": "Gold & Amber Tortoiseshell", "desc": "Kilau emas dan motif penyu hangat yang menyatu alami"},
                {"id": "Warm Terracotta", "label": "Terracotta & Warm Brown", "desc": "Warna bata dan cokelat hangat bersahabat"},
                {"id": "Olive Green", "label": "Olive Green & Bronze", "desc": "Hijau zaitun dan tembaga berkarakter maskulin/elegan"},
                {"id": "Warm Neutral", "label": "Warm Beige & Champagne", "desc": "Nuansa krem lembut untuk tampilan profesional bersih"},
            ],
        },
        "Cool": {
            "q": f"Untuk menonjolkan kecerahan rona sejuk ({undertone} Tone / {monk_tone}) kulit Anda, palet warna apa yang paling memikat Anda?",
            "reason": f"Rona Cool bersinar saat dipadukan dengan logam perak murni, abu-abu arang, biru safir/navy, dan merah marun berkarakter sejuk.",
            "options": [
                {"id": "Silver Charcoal", "label": "Silver Steel & Charcoal Grey", "desc": "Kilau perak tegas dan abu-abu monokrom bersih"},
                {"id": "Navy Sapphire", "label": "Deep Navy & Ice Blue", "desc": "Biru laut pekat berwibawa yang kontras cerah di kulit"},
                {"id": "Burgundy Berry", "label": "Burgundy Wine & Plum", "desc": "Merah anggur mewah berona sejuk yang kaya dimensi"},
                {"id": "Jet Black", "label": "Jet Black Contrast", "desc": "Hitam pekat solid yang mempertegas garis mata"},
            ],
        },
        "Neutral": {
            "q": f"Dengan rona {undertone} Tone ({monk_tone}) yang seimbang, paduan nuansa warna apa yang ingin Anda eksplorasi?",
            "reason": f"Rona Netral bebas memadukan palet hangat maupun sejuk dengan fleksibilitas kontras tinggi.",
            "options": [
                {"id": "Dark Tortoise", "label": "Dark Havana Tortoiseshell", "desc": "Gradasi klasik serbaguna untuk segala situasi"},
                {"id": "Rose Gold", "label": "Rose Gold & Muted Slate", "desc": "Perpaduan hangat dan sejuk yang mewah seimbang"},
                {"id": "Matte Charcoal", "label": "Matte Gunmetal & Smoke", "desc": "Logam gelap bernuansa modern minimalis"},
                {"id": "Crystal Clear", "label": "Transparent Crystal Acetate", "desc": "Bening modern yang menyatu dengan rona kulit alami"},
            ],
        },
        "Olive": {
            "q": f"Untuk menonjolkan keunikan rona {undertone} Tone ({monk_tone}) kulit Anda, nuansa warna mana yang paling sesuai?",
            "reason": f"Rona Olive sangat serasi dengan tembaga antik, bronze, hijau lumut, dan terracotta pekat.",
            "options": [
                {"id": "Antique Bronze", "label": "Antique Bronze & Brass", "desc": "Logam antik yang memberi kehangatan eksotis"},
                {"id": "Deep Olive", "label": "Deep Forest Olive & Moss", "desc": "Nuansa hijau alami yang harmonis dengan pigmen kulit"},
                {"id": "Cognac Amber", "label": "Rich Cognac & Warm Amber", "desc": "Warna madu pekat berdimensi premium"},
                {"id": "Graphite", "label": "Dark Graphite Grey", "desc": "Abu-abu gelap pekat tanpa membuat wajah pucat"},
            ],
        },
    }

    fq = face_specific_q.get(face_shape, face_specific_q["Oval"])
    sq = skin_specific_q.get(undertone, skin_specific_q["Warm"])

    if batch == 1:
        return [
            {
                "id": "occasion",
                "question": f"Untuk momen aktivitas atau lingkungan apa Anda mencari {subcategory}?",
                "reason": f"Konteks penggunaan menentukan tingkat formalitas, ketebalan frame, dan daya tahan material yang sesuai untuk bentuk wajah {face_shape} Anda.",
                "options": [
                    {"id": "Casual", "label": "Casual / Aktivitas Harian", "desc": "Hangout santai, kafe, dan aktivitas harian fleksibel"},
                    {"id": "Formal", "label": "Formal / Profesional Kerja", "desc": "Kantor, meeting penting, presentasi, dan suasana resmi"},
                    {"id": "Party", "label": "Pesta & Acara Sosial Malam", "desc": "Acara khusus, makan malam, dan pertemuan berkesan"},
                    {"id": "Sports", "label": "Outdoor & Dinamis", "desc": "Aktivitas luar ruangan, perjalanan, dan olahraga santai"},
                ],
            },
            {
                "id": "fit_preference",
                "question": fq["q"],
                "reason": fq["reason"],
                "options": fq["options"],
            },
            {
                "id": "color_mood",
                "question": sq["q"],
                "reason": sq["reason"],
                "options": sq["options"],
            },
        ]

    # Batch 2: Brand Vibe & Budget
    if batch == 2:
        return [
            {
                "id": "brand_style",
                "question": f"Gaya estetika desain mana yang paling ingin Anda padukan dengan karakter wajah {face_shape} Anda?",
                "reason": f"Menyelaraskan arsitektur produk dengan lekuk wajah {face_shape} dan undertone {undertone}.",
                "options": [
                    {"id": "Minimalist", "label": "Minimalist Scandinavian", "desc": "Garis bersih, ultra-ringan, tanpa ornamen berlebih"},
                    {"id": "Streetwear", "label": "Urban Streetwear Statement", "desc": "Desain tegas, berdimensi berani, fokus karakter kuat"},
                    {"id": "Classic", "label": "Heritage Classic Vintage", "desc": "Potongan legendaris abadi dengan pengerjaan presisi"},
                    {"id": "Avant-Garde", "label": "Avant-Garde Kontemporer", "desc": "Eksplorasi bentuk geometris unik dan asimetris"},
                ],
            },
            {
                "id": "comfort_priority",
                "question": "Fokus kenyamanan apa yang paling esensial saat dikenakan seharian?",
                "reason": "Mempengaruhi pemilihan bobot material dan desain bantalan hidung/headband.",
                "options": [
                    {"id": "ultra_light", "label": "Ultra-Ringan Tanpa Tekanan", "desc": "Material titanium/serat ringan nyaman dipakai >10 jam"},
                    {"id": "balanced", "label": "Keseimbangan Mantap & Kokoh", "desc": "Tetap berbobot pas tanpa mudah bergeser saat aktif"},
                    {"id": "statement", "label": "Prioritas Visual & Ketegasan", "desc": "Siluet tebal kokoh dengan visual mewah"},
                    {"id": "ergonomic", "label": "Bantalan Hidung Fleksibel", "desc": "Nose pad dapat disesuaikan mengikuti jembatan hidung"},
                ],
            },
            {
                "id": "budget_range",
                "question": "Alokasi anggaran yang Anda rencanakan untuk item ini?",
                "reason": "Memastikan kurasi AI memilih katalog terbaik dalam rentang harga target Anda.",
                "options": [
                    {"id": "budget", "label": "Terjangkau (< Rp350.000)", "desc": "Kualitas harian solid dengan nilai terbaik"},
                    {"id": "mid", "label": "Menengah (Rp350K - 650K)", "desc": "Material asetat/logam premium pilihan"},
                    {"id": "premium", "label": "Premium (Rp650K - 1.2Jt)", "desc": "Craftsmanship tinggi dengan finishing mewah"},
                    {"id": "luxury", "label": "Luxury Designer (> Rp1.200.000)", "desc": "Koleksi eksklusif terbatas dengan material istimewa"},
                ],
            },
        ]

    # Batch 3: Material & Detail
    return [
        {
            "id": "material_preference",
            "question": f"Sentuhan material apa yang paling nyaman berinteraksi dengan kulit {undertone} Anda?",
            "reason": f"Refleksi cahaya dari material akan berinteraksi langsung dengan skala kulit {monk_tone}.",
            "options": [
                {"id": "Acetate Handcrafted", "label": "Asetat Selulosa Alami", "desc": "Kilau organik hangat, tahan lama, tidak menimbulkan alergi"},
                {"id": "Titanium Alloy", "label": "Beta Titanium Jepang", "desc": "Sangat ringan, fleksibel, tahan karat dan keringat"},
                {"id": "Stainless Steel", "label": "Stainless Steel Presisi", "desc": "Garis tipis kokoh bernuansa modern industrial"},
                {"id": "Mixed Material", "label": "Kombinasi Asetat & Logam", "desc": "Aksen jembatan logam dengan bingkai asetat klasik"},
            ],
        },
        {
            "id": "finish_style",
            "question": "Tingkat kilau finishing permukaan yang Anda sukai?",
            "reason": f"Finishing matte meredam bayangan pada wajah {face_shape}, sedangkan gloss memantulkan cahaya.",
            "options": [
                {"id": "Matte Satin", "label": "Matte / Satin Doff", "desc": "Tampilan kalem elegan tanpa pantulan menyilaukan"},
                {"id": "High Gloss", "label": "High Gloss Polished", "desc": "Permukaan mengkilap mewah yang memancarkan kecerahan"},
                {"id": "Brushed Metal", "label": "Brushed / Hairline Texture", "desc": "Tekstur goresan halus artistik bergaya industrial"},
                {"id": "Translucent Frosted", "label": "Translucent Frosted", "desc": "Semi-transparan buram yang modern dan kekinian"},
            ],
        },
    ]


async def generate_dynamic_questions(
    user_profile: Dict[str, Any],
    category: str,
    subcategory: str,
    previous_answers: Optional[Dict[str, str]] = None,
    batch: int = 1,
) -> List[Dict[str, Any]]:
    """Generates context-aware dynamic questions via Gemini with instant custom fallback."""
    settings = get_settings()
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")

    if api_key:
        prompt = _build_tailored_prompt(user_profile, category, subcategory, previous_answers, batch)

        # Fast API call to Gemini with timeout 4.5s
        for model_name in FAST_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                req_body = json.dumps({
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.4,
                        "maxOutputTokens": 1024,
                    }
                }).encode("utf-8")

                req = urllib.request.Request(
                    url,
                    data=req_body,
                    headers={"Content-Type": "application/json"}
                )

                with urllib.request.urlopen(req, timeout=4) as response:
                    resp_data = json.loads(response.read().decode("utf-8"))
                    candidates = resp_data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "").strip()

                            # Strip code fence if present
                            if raw_text.startswith("```"):
                                raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
                            if raw_text.endswith("```"):
                                raw_text = raw_text[:-3].strip()
                            if raw_text.startswith("json"):
                                raw_text = raw_text[4:].strip()

                            questions = json.loads(raw_text)
                            if isinstance(questions, list) and len(questions) >= 1:
                                logger.info(f"Gemini ({model_name}) synthesized {len(questions)} tailored questions for batch {batch}")
                                return questions
            except Exception as err:
                logger.debug(f"Gemini {model_name} attempt skipped: {err}")
                continue

    # Instant tailored fallback customized dynamically to the exact face shape & undertone
    logger.info(f"Using dynamic profile-tailored fallback for {subcategory} (Face: {user_profile.get('face_shape')}, Tone: {user_profile.get('undertone')})")
    return _generate_dynamic_fallback(user_profile, subcategory, batch)
