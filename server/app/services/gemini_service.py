"""Gemini AI Service — Context-Aware Dynamic Questionnaire Generator.

Uses Google Generative AI REST API with ultra-fast flash-lite models to synthesize
deeply personalized, non-generic style questions in Indonesian tailored to the user's
specific detected 3-parameter biometrics: Gender, Skin Tone, and Face Shape.
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
    """Builds a bespoke conditional prompt instructing Gemini to craft questions customized to this exact user."""
    # 1. Extract 3 core biometric parameters
    gender_raw = str(user_profile.get("gender", "male")).lower()
    gender = "Wanita (Female)" if ("female" in gender_raw or "wanita" in gender_raw or "puan" in gender_raw) else "Pria (Male)"
    gender_key = "female" if "Wanita" in gender else "male"

    skin_tone = user_profile.get("skin_tone", "Tan")
    if isinstance(skin_tone, dict):
        skin_tone = skin_tone.get("tone", "Tan")
    
    monk_tone = user_profile.get("monk_tone", "MST-06")
    if isinstance(monk_tone, dict):
        monk_tone = monk_tone.get("code", "MST-06")

    undertone = user_profile.get("undertone", "Warm")
    if isinstance(undertone, dict):
        undertone = undertone.get("undertone", "Warm")

    face_shape = user_profile.get("face_shape", "Oval")
    if isinstance(face_shape, dict):
        face_shape = face_shape.get("shape", "Oval")

    subcategory_id = subcategory.lower()
    if "glass" in subcategory_id:
        item_label = "kacamata (eyewear)"
    elif "hat" in subcategory_id:
        item_label = "topi (headwear)"
    elif "shirt" in subcategory_id or "apparel" in category.lower():
        item_label = "atasan & kemeja/kaos (shirts)"
    elif "jacket" in subcategory_id:
        item_label = "jaket & outerwear"
    else:
        item_label = subcategory_id

    # 2. Conditional rules instructions
    # A. Gender Rules
    if gender_key == "female":
        gender_instruction = (
            "Pengguna adalah WANITA: Pertanyaan harus memprioritaskan keselarasan bingkai/kerah dengan riasan/makeup, "
            "estetika proporsi yang anggun/chic, serta fleksibilitas transisi penampilan dari aktivitas formal ke kasual santai."
        )
    else:
        gender_instruction = (
            "Pengguna adalah PRIA: Pertanyaan harus memprioritaskan ketegasan garis rahang/pelipis, kepraktisan mobilitas outdoor, "
            "daya tahan material saat beraktivitas dinamis, dan siluet clean/maskulin yang kokoh."
        )

    # B. Skin Tone Rules (Dark/Tan vs Fair/Light)
    skin_tone_lower = str(skin_tone).lower()
    if skin_tone_lower in ["dark", "tan"] or any(m in str(monk_tone) for m in ["06", "07", "08", "09", "10"]):
        skin_instruction = (
            f"Warna Kulit: {skin_tone} ({monk_tone} Sawo Matang/Gelap). Eksplorasi preferensi kontras hangat memikat "
            "(Gold, Champagne, Warm Amber Tortoiseshell, Terracotta, Bronze) dan adaptasi intensitas pencahayaan matahari/outdoor tropis."
        )
    elif skin_tone_lower in ["fair", "light"] or any(m in str(monk_tone) for m in ["01", "02", "03", "04"]):
        skin_instruction = (
            f"Warna Kulit: {skin_tone} ({monk_tone} Cerah/Terang). Eksplorasi preferensi kontras sejuk/pastel "
            "(Silver Steel, Gunmetal, Rose Gold, Navy Sapphire, Charcoal) untuk mencegah kesan pucat (wash-out)."
        )
    else:
        skin_instruction = (
            f"Warna Kulit: {skin_tone} ({monk_tone} Sedang/Medium). Fleksibilitas tinggi dalam memadukan warna netral hangat maupun sejuk."
        )

    # C. Face Shape Rules
    face_shape_instruction = f"Bentuk Wajah: {face_shape}. Berikan opsi bentuk yang secara proporsional menyeimbangkan geometri wajah {face_shape}."

    batch_topics = {
        1: f"3 pertanyaan inti: (1) Momen penggunaan & intensitas aktivitas ({gender}), (2) Keseimbangan siluet bingkai/potongan khusus wajah {face_shape}, (3) Harmoni palet warna khusus kulit {skin_tone} ({monk_tone}).",
        2: "3 pertanyaan pendalaman: (1) Gaya inspirasi estetika (Minimalist vs Statement vs Heritage), (2) Prioritas kenyamanan material (Titanium/Asetat/Katun Premium), (3) Rentang alokasi anggaran.",
        3: "2 pertanyaan signature identity: (1) Kesan karakter personal yang ingin dipancarkan, (2) Finishing aksen permukaan (Matte vs Gloss vs Brushed).",
    }
    topic_instruction = batch_topics.get(batch, f"2 pertanyaan personalisasi lanjutan Batch {batch}")

    prev_info = ""
    if previous_answers:
        prev_info = f"\nJAWABAN SEBELUMNYA OLEH PENGGUNA: {json.dumps(previous_answers, ensure_ascii=False)}"

    return f"""Kamu adalah AI Fashion Stylist & Accessories/Apparel Specialist bernama COBA.

PROFIL BIOMETRIK PENGGUNA (3 PARAMETER TERSTANDARISASI):
1. Gender: {gender} -> {gender_instruction}
2. Warna Kulit: {skin_tone} ({monk_tone}, Undertone {undertone}) -> {skin_instruction}
3. Bentuk Wajah: {face_shape} -> {face_shape_instruction}
Target Kategori: {item_label} (Batch #{batch})
{prev_info}

TUGAS ANDA:
Buat kuesioner bergaya desainer profesional yang SANGAT KONDISIONAL dan EKSPLISIT merespons kombinasi ({gender}, {skin_tone}, {face_shape}).
{topic_instruction}

FORMAT OUTPUT (WAJIB JSON array valid murni tanpa teks pengantar / markdown fence):
[
  {{
    "id": "q_{subcategory}_b{batch}_1",
    "question": "Pertanyaan dalam Bahasa Indonesia yang kontekstual dan personal",
    "reason": "Alasan 1-2 kalimat mengapa pertanyaan ini krusial untuk profil gender {gender}, wajah {face_shape}, dan warna kulit {skin_tone} pengguna",
    "options": [
      {{"id": "opt_1", "label": "Label Opsi 1", "desc": "Deskripsi singkat 1 kalimat"}},
      {{"id": "opt_2", "label": "Label Opsi 2", "desc": "Deskripsi singkat 1 kalimat"}},
      {{"id": "opt_3", "label": "Label Opsi 3", "desc": "Deskripsi singkat 1 kalimat"}},
      {{"id": "opt_4", "label": "Label Opsi 4", "desc": "Deskripsi singkat 1 kalimat"}}
    ]
  }}
]

ATURAN KETAT:
1. Output WAJIB JSON array valid murni.
2. Setiap pertanyaan memiliki tepat 4 pilihan opsi yang relevan dan actionable.
3. Pertanyaan harus membedakan jelas gaya Pria vs Wanita dan rona Kulit Gelap/Tan vs Terang/Fair."""


def _generate_dynamic_fallback(
    user_profile: Dict[str, Any],
    subcategory: str,
    batch: int = 1,
) -> List[Dict[str, Any]]:
    """Generates dynamically customized questions for the user's specific 3 biometric parameters.
    Used as an ultra-fast resilient local question bank when offline or API key is absent.
    """
    gender_raw = str(user_profile.get("gender", "male")).lower()
    is_female = "female" in gender_raw or "wanita" in gender_raw
    gender_label = "Wanita" if is_female else "Pria"

    skin_tone = user_profile.get("skin_tone", "Tan")
    if isinstance(skin_tone, dict):
        skin_tone = skin_tone.get("tone", "Tan")

    monk_tone = user_profile.get("monk_tone", "MST-06")
    if isinstance(monk_tone, dict):
        monk_tone = monk_tone.get("code", "MST-06")

    face_shape = user_profile.get("face_shape", "Oval")
    if isinstance(face_shape, dict):
        face_shape = face_shape.get("shape", "Oval")

    is_dark_or_tan = str(skin_tone).lower() in ["dark", "tan"] or any(m in str(monk_tone) for m in ["06", "07", "08", "09", "10"])

    # 1. Question 1: Occasion & Lifestyle tailored to Gender
    if is_female:
        q1 = {
            "id": "occasion",
            "question": f"Untuk suasana aktivitas atau penampilan harian seperti apa Anda mencari {subcategory} ini?",
            "reason": f"Membantu kurasi siluet yang anggun dan serasi dengan riasan wajah serta gaya aktivitas harian Anda sebagai {gender_label}.",
            "options": [
                {"id": "Casual", "label": "Chic Casual & Daily Café", "desc": "Gaya santai harian yang estetik, ringan, dan fotogenik"},
                {"id": "Formal", "label": "Executive & Smart Formal", "desc": "Suasana kerja profesional, meeting, dan presentasi resmi"},
                {"id": "Party", "label": "Glamour Evening & Social Gathering", "desc": "Momen pesta, makan malam spesial, dan acara berkesan"},
                {"id": "Sports", "label": "Active Lifestyle & Outdoor", "desc": "Aktivitas luar ruangan yang fleksibel dan dinamis"},
            ],
        }
    else:
        q1 = {
            "id": "occasion",
            "question": f"Untuk kebutuhan aktivitas utama apa Anda memilih {subcategory} ini?",
            "reason": f"Menyesuaikan ketahanan material dan ketegasan siluet dengan gaya mobilitas aktif Anda sebagai {gender_label}.",
            "options": [
                {"id": "Casual", "label": "Casual Everyday & Hangout", "desc": "Aktivitas santai harian, kafe, dan mobilitas fleksibel"},
                {"id": "Formal", "label": "Business Formal & Workwear", "desc": "Lingkungan kantor profesional, meeting penting, dan suasana formal"},
                {"id": "Party", "label": "Evening Event & Smart Dinner", "desc": "Acara sosial malam hari dan perayaan berkelas"},
                {"id": "Sports", "label": "Outdoor Adventure & Sports", "desc": "Aktivitas luar ruangan dengan mobilitas tinggi dan terik matahari"},
            ],
        }

    # 2. Question 2: Geometric Silhouette tailored to Face Shape
    face_q_map = {
        "Square": {
            "q": f"Untuk menyeimbangkan garis rahang tegas pada wajah {face_shape} Anda, karakter siluet apa yang Anda prioritaskan?",
            "reason": f"Wajah Square memiliki rahang kuat bersudut. Siluet melengkung (round/oval/curved) melembutkan proporsi rahang secara harmonis.",
            "options": [
                {"id": "Round Curved", "label": "Round / Soft Curved Frames", "desc": "Kurva lembut melingkar untuk melembutkan sudut rahang yang tegas"},
                {"id": "Rounded Square", "label": "Soft Wayfarer / Soft Edges", "desc": "Bentuk kotak dengan sudut membulat proporsional"},
                {"id": "Geometric Sharp", "label": "Geometric Octagonal", "desc": "Garis kontemporer yang mempertegas wibawa karakter wajah"},
                {"id": "Minimalist Wire", "label": "Thin Wire Aviator", "desc": "Bingkai tipis ringan tanpa memberi beban visual berlebih"},
            ],
        },
        "Round": {
            "q": f"Untuk memberikan ilusi kontur yang lebih terstruktur pada wajah {face_shape} Anda, siluet apa yang Anda sukai?",
            "reason": f"Wajah Round memiliki garis pipi lembut. Bingkai bersudut tegas (rectangular/angular) memberi kontras yang membuat wajah tampak lebih tirus.",
            "options": [
                {"id": "Rectangular Sharp", "label": "Rectangular / Sharp Square", "desc": "Sudut tegas horizontal yang memberi ilusi wajah lebih tirus"},
                {"id": "Cat Eye Angular", "label": "Upward Browline / Cat-Eye", "desc": "Aksen terangkat ke atas untuk menarik fokus vertikal"},
                {"id": "Geometric Bold", "label": "Structured Bold Frame", "desc": "Garis geometris kokoh mengimbangi kelembutan pipi"},
                {"id": "Structured Classic", "label": "Classic Wayfarer", "desc": "Garis atas lurus kokoh berdimensi seimbang"},
            ],
        },
        "Heart": {
            "q": f"Dengan dahi yang lebih lebar dari dagu pada wajah {face_shape} Anda, proporsi bingkai apa yang paling Anda sukai?",
            "reason": f"Wajah Heart memiliki dahi lebar dan dagu lancip. Bingkai dengan aksen bawah lebar atau siluet ringan menyeimbangkan proporsi dagu.",
            "options": [
                {"id": "Bottom Heavy", "label": "Bottom-Weighted / Aviator", "desc": "Bingkai berdimensi bawah lebar menyeimbangkan dagu lancip"},
                {"id": "Rimless / Light", "label": "Rimless / Thin Wire", "desc": "Desain ringan tanpa bingkai tebal agar dahi tetap proporsional"},
                {"id": "Round Oval", "label": "Soft Oval Teardrop", "desc": "Kurva lembut yang mengimbangi ketajaman dagu"},
                {"id": "Low Bridge", "label": "Low-Bridge Fit Minimalist", "desc": "Jembatan hidung seimbang untuk fokus tengah wajah"},
            ],
        },
        "Oblong": {
            "q": f"Untuk menyeimbangkan proporsi vertikal wajah {face_shape} Anda, dimensi bingkai seperti apa yang Anda cari?",
            "reason": f"Wajah Oblong memiliki panjang vertikal lebih dominan. Lensa lebih tinggi (tall lens/oversized) membagi bidang vertikal secara seimbang.",
            "options": [
                {"id": "Tall Lens Oversized", "label": "Tall Lens / Oversized Frame", "desc": "Lensa berdimensi tinggi membagi bidang vertikal wajah"},
                {"id": "Bold Browline", "label": "Thick Browline Accent", "desc": "Garis atas tegas menarik fokus horizontal ke area mata"},
                {"id": "Square Wide", "label": "Wide Square Cut", "desc": "Lebar bingkai melampaui pelipis memberi ilusi proporsional"},
                {"id": "Double Bridge", "label": "Double Bridge Aviator", "desc": "Aksen jembatan ganda mengisi ruang vertikal hidung"},
            ],
        },
        "Oval": {
            "q": f"Wajah {face_shape} Anda memiliki simetri proporsional alami. Karakter visual apa yang ingin Anda tonjolkan?",
            "reason": f"Wajah Oval adalah bentuk paling serbaguna dan selaras dengan hampir seluruh variasi siluet.",
            "options": [
                {"id": "Classic Wayfarer", "label": "Classic Wayfarer Timeless", "desc": "Desain klasik yang menonjolkan simetri alami wajah Anda"},
                {"id": "Modern Geometric", "label": "Modern Geometric / Hexagon", "desc": "Sentuhan kontemporer kekinian yang berani beda"},
                {"id": "Retro Round", "label": "Retro Round Metal", "desc": "Gaya vintage intelektual bernuansa artistik"},
                {"id": "Slim Minimalist", "label": "Slim Titanium Minimalist", "desc": "Tampilan profesional bersih tanpa mengaburkan fitur wajah"},
            ],
        },
    }
    fq = face_q_map.get(face_shape, face_q_map["Oval"])

    # 3. Question 3: Color Palette tailored to Skin Tone (Dark/Tan vs Fair/Light)
    if is_dark_or_tan:
        q3 = {
            "id": "color_mood",
            "question": f"Untuk memancarkan kilau eksotis kulit {skin_tone} ({monk_tone}) Anda, nuansa palet warna apa yang Anda prioritaskan?",
            "reason": f"Kulit {skin_tone} sawo matang bersinar alami saat dipadukan dengan aksen logam hangat, motif tortoiseshell emas, dan warna earthy tropis.",
            "options": [
                {"id": "Earth Tone Gold", "label": "Gold, Amber & Warm Tortoise", "desc": "Kilau emas dan motif penyu hangat yang menyatu mewah di kulit"},
                {"id": "Warm Terracotta", "label": "Terracotta & Rich Ochre", "desc": "Warna bata dan tanah bakar hangat yang memancarkan aura bersahabat"},
                {"id": "Olive Bronze", "label": "Olive Green & Antique Bronze", "desc": "Hijau zaitun dan tembaga berkarakter maskulin/anggun eksotis"},
                {"id": "Solid Black Contrast", "label": "Matte Jet Black & Gunmetal", "desc": "Kontras hitam pekat solid yang mempertegas garis wajah"},
            ],
        }
    else:
        q3 = {
            "id": "color_mood",
            "question": f"Untuk menonjolkan kecerahan warna kulit {skin_tone} ({monk_tone}) Anda tanpa kesan pucat, palet apa yang paling Anda sukai?",
            "reason": f"Kulit {skin_tone} cerah tampak segar dan berdimensi saat dipadukan dengan perak murni, navy pekat, rose gold, atau abu-abu arang.",
            "options": [
                {"id": "Silver Steel", "label": "Silver Steel & Clean Monochrome", "desc": "Kilau perak tegas dan abu-abu arang bersih modern"},
                {"id": "Navy Sapphire", "label": "Deep Navy & Ice Blue", "desc": "Biru pekat berwibawa yang memberikan kontras cerah segar"},
                {"id": "Rose Gold Pastel", "label": "Rose Gold & Soft Champagne", "desc": "Sentuhan emas merah muda lembut yang hangat elegan"},
                {"id": "Burgundy Wine", "label": "Burgundy & Dark Plum", "desc": "Merah anggur mewah berdimensi tegas dan berkelas"},
            ],
        }

    if batch == 1:
        return [
            q1,
            {
                "id": "fit_preference",
                "question": fq["q"],
                "reason": fq["reason"],
                "options": fq["options"],
            },
            q3,
        ]

    # Batch 2: Aesthetic & Material
    if batch == 2:
        return [
            {
                "id": "brand_style",
                "question": f"Gaya estetika mana yang paling merepresentasikan personalitas ({gender_label}) Anda?",
                "reason": f"Menyelaraskan arsitektur produk dengan karakter visual wajah {face_shape}.",
                "options": [
                    {"id": "Minimalist", "label": "Minimalist Clean", "desc": "Garis bersih, ultra-ringan, tanpa ornamen berlebih"},
                    {"id": "Streetwear", "label": "Urban Statement", "desc": "Desain tegas, berdimensi berani, fokus karakter kuat"},
                    {"id": "Classic", "label": "Heritage Vintage", "desc": "Potongan legendaris abadi dengan pengerjaan presisi"},
                    {"id": "Avant-Garde", "label": "Contemporary Luxury", "desc": "Eksplorasi bentuk geometris unik dan sentuhan premium"},
                ],
            },
            {
                "id": "comfort_priority",
                "question": "Prioritas kenyamanan apa yang paling esensial saat dikenakan harian?",
                "reason": "Menentukan bobot material dan fleksibilitas bantalan produk.",
                "options": [
                    {"id": "ultra_light", "label": "Ultra-Ringan Tanpa Tekanan", "desc": "Material titanium/katun organik nyaman seharian"},
                    {"id": "balanced", "label": "Keseimbangan Mantap & Kokoh", "desc": "Tetap berbobot pas tanpa mudah bergeser saat aktif"},
                    {"id": "statement", "label": "Prioritas Visual & Ketegasan", "desc": "Siluet berani dengan tampilan berkelas"},
                    {"id": "ergonomic", "label": "Ergonomis Adaptif", "desc": "Desain yang menyesuaikan kontur wajah secara presisi"},
                ],
            },
            {
                "id": "budget_range",
                "question": "Alokasi anggaran yang Anda rencanakan untuk koleksi ini?",
                "reason": "Memastikan kurasi AI memilih katalog terbaik dalam rentang target Anda.",
                "options": [
                    {"id": "budget", "label": "Terjangkau (< Rp350.000)", "desc": "Kualitas harian solid dengan nilai terbaik"},
                    {"id": "mid", "label": "Menengah (Rp350K - 650K)", "desc": "Material premium dengan sentuhan detail pilihan"},
                    {"id": "premium", "label": "Premium (Rp650K - 1.2Jt)", "desc": "Craftsmanship tinggi dengan finishing istimewa"},
                    {"id": "luxury", "label": "Exclusive Designer (> Rp1.2Jt)", "desc": "Koleksi desainer eksklusif edisi terbatas"},
                ],
            },
        ]

    # Batch 3: Detail & Signature Finish
    return [
        {
            "id": "material_preference",
            "question": f"Material utama apa yang paling nyaman berinteraksi dengan kulit {skin_tone} Anda?",
            "reason": f"Refleksi material berinteraksi langsung dengan pigmen kulit {monk_tone}.",
            "options": [
                {"id": "Acetate Handcrafted", "label": "Asetat Selulosa Alami", "desc": "Kilau organik hangat, tahan lama, hypoallergenic"},
                {"id": "Titanium Alloy", "label": "Beta Titanium Presisi", "desc": "Sangat ringan, fleksibel, tahan keringat tropis"},
                {"id": "Stainless Steel", "label": "Stainless Steel Modern", "desc": "Garis tipis kokoh bernuansa modern industrial"},
                {"id": "Mixed Material", "label": "Kombinasi Logam & Asetat", "desc": "Perpaduan klasik kontemporer dengan aksen elegan"},
            ],
        },
        {
            "id": "finish_style",
            "question": "Tingkat kilau finishing permukaan yang Anda sukai?",
            "reason": f"Finishing matte meredam bayangan wajah {face_shape}, sedangkan gloss memantulkan kilau cerah.",
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
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.info("GEMINI_API_KEY is not configured. Utilizing resilient local question bank.")
        return _generate_dynamic_fallback(user_profile, subcategory, batch)

    prompt = _build_tailored_prompt(user_profile, category, subcategory, previous_answers, batch)

    # Fast API call to Gemini with timeout 4s
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

    return _generate_dynamic_fallback(user_profile, subcategory, batch)
