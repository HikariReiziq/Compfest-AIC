"""Gemini AI Service — Context-Aware Dynamic Questionnaire Generator.

Uses Google Generative AI REST API with ultra-fast flash-lite models to synthesize
deeply personalized, non-generic style questions in Indonesian tailored to the user's
specific detected 3-parameter biometrics: Gender, Skin Tone, and Face Shape.
"""

import os
import json
import logging
import random
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
    """Builds a bespoke concise prompt instructing Gemini to craft punchy questions customized to this user."""
    # 1. Extract 3 core biometric parameters
    gender_raw = str(user_profile.get("gender", "male")).lower()
    gender = "Wanita" if ("female" in gender_raw or "wanita" in gender_raw or "puan" in gender_raw) else "Pria"

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
        item_label = "kacamata"
    elif "hat" in subcategory_id:
        item_label = "topi"
    elif "shirt" in subcategory_id or "apparel" in category.lower():
        item_label = "baju/kemeja"
    elif "jacket" in subcategory_id:
        item_label = "jaket"
    else:
        item_label = subcategory_id

    batch_topics = {
        1: f"3 soal inti: (1) Momen aktivitas ({gender}), (2) Bentuk siluet wajah {face_shape}, (3) Warna untuk kulit {skin_tone} ({monk_tone}).",
        2: "3 soal gaya: (1) Estetika visual, (2) Material kenyamanan, (3) Target anggaran.",
        3: "2 soal identitas: (1) Karakter personal, (2) Finishing aksen permukaan.",
    }
    topic_instruction = batch_topics.get(batch, f"2 pertanyaan personalisasi Batch {batch}")

    prev_info = ""
    if previous_answers:
        prev_info = f"\nJAWABAN SEBELUMNYA: {json.dumps(previous_answers, ensure_ascii=False)}"

    return f"""Kamu adalah AI Stylist COBA. Buat kuesioner super ringkas, to-the-point, dan tidak berbelit-belit.

PROFIL PENGGUNA:
- Gender: {gender}
- Kulit: {skin_tone} ({monk_tone}, {undertone})
- Wajah: {face_shape}
- Kategori: {item_label} (Batch #{batch})
{prev_info}

TOPIK BATCH #{batch}:
{topic_instruction}

ATURAN GAYA BAHASA (SANGAT KETAT):
1. Teks PERTANYAAN harus SANGAT SINGKAT (maksimal 5–8 kata, to-the-point). Jangan gunakan kalimat berbunga-bunga.
2. REASON cukup 1 kalimat pendek (maksimal 8–10 kata).
3. LABEL opsi 2–3 kata. DESC opsi maksimal 4–6 kata padat.
4. Jangan gunakan kalimat panjang berulang atau membingungkan.
5. Acak urutan aspek agar dinamis.

FORMAT OUTPUT (WAJIB JSON array valid murni):
[
  {{
    "id": "q_{subcategory}_b{batch}_1",
    "question": "Pertanyaan 5-8 kata?",
    "reason": "Alasan singkat 1 kalimat.",
    "options": [
      {{"id": "opt_1", "label": "Label 1", "desc": "Deskripsi 4-6 kata"}},
      {{"id": "opt_2", "label": "Label 2", "desc": "Deskripsi 4-6 kata"}},
      {{"id": "opt_3", "label": "Label 3", "desc": "Deskripsi 4-6 kata"}},
      {{"id": "opt_4", "label": "Label 4", "desc": "Deskripsi 4-6 kata"}}
    ]
  }}
]"""


def _generate_dynamic_fallback(
    user_profile: Dict[str, Any],
    subcategory: str,
    batch: int = 1,
) -> List[Dict[str, Any]]:
    """Generates concise, punchy questions with intra-batch randomization for the user's biometrics."""
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

    # Batch 1: 3 Fondasi Singkat (Aktivitas, Siluet Wajah, Palet Warna)
    if batch == 1:
        # Q1: Occasion
        q_occ = {
            "id": "occasion",
            "question": f"Untuk suasana apa {subcategory} ini digunakan?",
            "reason": f"Menyesuaikan ketahanan dan siluet untuk kebutuhan {gender_label}.",
            "options": [
                {"id": "Casual", "label": "Santai & Harian", "desc": "Gaya kasual nyaman untuk hangout"},
                {"id": "Formal", "label": "Kerja & Formal", "desc": "Tampilan rapi profesional di kantor"},
                {"id": "Party", "label": "Pesta & Acara Spesial", "desc": "Kesan berkelas dan memikat"},
                {"id": "Sports", "label": "Outdoor & Aktif", "desc": "Mobilitas tinggi dan aktivitas luar"},
            ],
        }

        # Q2: Siluet Wajah (Ringkas per Bentuk Wajah)
        face_q_map = {
            "Square": {
                "q": f"Pilihan siluet untuk wajah {face_shape} Anda?",
                "reason": "Melembutkan garis rahang yang tegas.",
                "options": [
                    {"id": "Round Curved", "label": "Bulat / Melengkung", "desc": "Melembutkan sudut rahang tegas"},
                    {"id": "Rounded Square", "label": "Kotak Sudut Halus", "desc": "Proporsional dan seimbang"},
                    {"id": "Geometric Sharp", "label": "Geometris Modern", "desc": "Tegas dan kontemporer"},
                    {"id": "Minimalist Wire", "label": "Bingkai Tipis Ringan", "desc": "Simpel dan tidak membebani wajah"},
                ],
            },
            "Round": {
                "q": f"Pilihan siluet untuk wajah {face_shape} Anda?",
                "reason": "Memberi kontur tegas agar wajah lebih terstruktur.",
                "options": [
                    {"id": "Rectangular Sharp", "label": "Kotak / Persegi Panjang", "desc": "Memberi kesan wajah lebih ramping"},
                    {"id": "Cat Eye Angular", "label": "Browline / Sudut Naik", "desc": "Menarik fokus vertikal ke atas"},
                    {"id": "Geometric Bold", "label": "Geometris Tegas", "desc": "Mengimbangi kelembutan pipi"},
                    {"id": "Structured Classic", "label": "Wayfarer Klasik", "desc": "Garis atas lurus dan kokoh"},
                ],
            },
            "Heart": {
                "q": f"Pilihan siluet untuk wajah {face_shape} Anda?",
                "reason": "Menyeimbangkan dahi lebar dan dagu ramping.",
                "options": [
                    {"id": "Bottom Heavy", "label": "Aviator / Bawah Lebar", "desc": "Menyeimbangkan dagu lancip"},
                    {"id": "Rimless / Light", "label": "Tanpa Bingkai / Tipis", "desc": "Ringan dan tidak dominan"},
                    {"id": "Round Oval", "label": "Oval Melengkung", "desc": "Menghaluskan proporsi wajah"},
                    {"id": "Low Bridge", "label": "Jembatan Rendah", "desc": "Fokus seimbang di tengah wajah"},
                ],
            },
            "Oblong": {
                "q": f"Pilihan siluet untuk wajah {face_shape} Anda?",
                "reason": "Menyeimbangkan proporsi panjang vertikal wajah.",
                "options": [
                    {"id": "Square Wide", "label": "Wayfarer / Kotak Lebar", "desc": "Memotong ilusi wajah memanjang"},
                    {"id": "Double Bridge", "label": "Aviator Double-Bridge", "desc": "Garis ganda memberi dimensi seimbang"},
                    {"id": "Bold Browline", "label": "Browline Aksen Atas", "desc": "Fokus horizontal di area mata"},
                    {"id": "Tall Lens Oversized", "label": "Lensa Tinggi / Lebar", "desc": "Membagi bidang panjang wajah"},
                ],
            },
            "Oval": {
                "q": f"Pilihan siluet untuk wajah {face_shape} Anda?",
                "reason": "Bentuk oval harmonis dengan hampir seluruh siluet.",
                "options": [
                    {"id": "Classic Wayfarer", "label": "Wayfarer Klasik", "desc": "Desain abadi menonjolkan simetri alami"},
                    {"id": "Modern Geometric", "label": "Geometris Heksagon", "desc": "Aksen kontemporer kekinian"},
                    {"id": "Retro Round", "label": "Bulat Retro Metal", "desc": "Gaya vintage intelektual"},
                    {"id": "Slim Minimalist", "label": "Titanium Minimalis", "desc": "Bersih dan profesional"},
                ],
            },
        }
        fq = face_q_map.get(face_shape, face_q_map["Oval"])
        q_fit = {
            "id": "fit_preference",
            "question": fq["q"],
            "reason": fq["reason"],
            "options": fq["options"],
        }

        # Q3: Color Mood (Ringkas)
        if is_dark_or_tan:
            q_col = {
                "id": "color_mood",
                "question": f"Warna yang disukai untuk kulit {skin_tone} Anda?",
                "reason": "Warna hangat memberi kontras eksotis pada kulit.",
                "options": [
                    {"id": "Earth Tone Gold", "label": "Gold & Warm Amber", "desc": "Kilau emas dan amber hangat"},
                    {"id": "Warm Terracotta", "label": "Terracotta & Cokelat", "desc": "Nuansa bumi hangat bersahabat"},
                    {"id": "Olive Bronze", "label": "Olive & Bronze", "desc": "Hijau zaitun dan tembaga maskulin"},
                    {"id": "Solid Black Contrast", "label": "Hitam Doff & Abu Gelap", "desc": "Kontras tegas dan berwibawa"},
                ],
            }
        else:
            q_col = {
                "id": "color_mood",
                "question": f"Warna yang disukai untuk kulit {skin_tone} Anda?",
                "reason": "Warna sejuk memberi kesegaran tanpa kesan pucat.",
                "options": [
                    {"id": "Silver Steel", "label": "Silver & Abu-Abu", "desc": "Kilau perak bersih dan modern"},
                    {"id": "Navy Sapphire", "label": "Navy & Biru Safir", "desc": "Kontras sejuk berwibawa"},
                    {"id": "Rose Gold Pastel", "label": "Rose Gold & Champagne", "desc": "Sentuhan lembut elegan"},
                    {"id": "Burgundy Wine", "label": "Burgundy & Merah Gelap", "desc": "Merah anggur mewah berkelas"},
                ],
            }

        questions = [q_occ, q_fit, q_col]
        # Intra-batch shuffle so repeated attempts feel dynamic
        random.shuffle(questions)
        return questions

    # Batch 2: 3 Soal Gaya & Budget
    if batch == 2:
        q_style = {
            "id": "brand_style",
            "question": "Gaya estetika yang paling Anda sukai?",
            "reason": "Menyelaraskan vibe visual produk pilihan.",
            "options": [
                {"id": "Minimalist", "label": "Minimalis Bersih", "desc": "Simpel, ringan, tanpa ornamen ramai"},
                {"id": "Streetwear", "label": "Urban & Berani", "desc": "Desain tegas berkarakter kuat"},
                {"id": "Classic", "label": "Klasik Timeless", "desc": "Desain legendaris sepanjang masa"},
                {"id": "Avant-Garde", "label": "Modern Mewah", "desc": "Detail premium kontemporer"},
            ],
        }
        q_comfort = {
            "id": "comfort_priority",
            "question": "Prioritas kenyamanan yang Anda inginkan?",
            "reason": "Menentukan berat dan bantalan produk.",
            "options": [
                {"id": "ultra_light", "label": "Sangat Ringan", "desc": "Nyaman dipakai seharian penuh"},
                {"id": "balanced", "label": "Kokoh & Mantap", "desc": "Stabil saat banyak bergerak"},
                {"id": "statement", "label": "Fokus Estetika", "desc": "Tampilan visual lebih utama"},
                {"id": "ergonomic", "label": "Pas di Wajah", "desc": "Mengikuti kontur dengan presisi"},
            ],
        }
        q_budget = {
            "id": "budget_range",
            "question": "Alokasi anggaran yang direncanakan?",
            "reason": "Memilih katalog terbaik sesuai target Anda.",
            "options": [
                {"id": "budget", "label": "Ekonomis (< Rp350rb)", "desc": "Kualitas harian harga terjangkau"},
                {"id": "mid", "label": "Menengah (Rp350rb - 650rb)", "desc": "Material solid berdetail bagus"},
                {"id": "premium", "label": "Premium (Rp650rb - 1.2Jt)", "desc": "Finishing kelas atas tahan lama"},
                {"id": "luxury", "label": "Eksklusif (> Rp1.2Jt)", "desc": "Koleksi khusus edisi terbatas"},
            ],
        }
        questions = [q_style, q_comfort, q_budget]
        random.shuffle(questions)
        return questions

    # Batch 3: 2 Soal Material & Finishing
    q_mat = {
        "id": "material_preference",
        "question": "Material frame yang Anda prioritaskan?",
        "reason": "Menyesuaikan daya tahan dengan aktivitas.",
        "options": [
            {"id": "Titanium Alloy", "label": "Titanium Ringan", "desc": "Anti-karat, ultra-ringan, tahan keringat"},
            {"id": "Acetate Handcrafted", "label": "Asetat Premium", "desc": "Kilau natural, solid, warna kaya"},
            {"id": "Stainless Steel", "label": "Stainless Steel", "desc": "Garis ramping kokoh dan awet"},
            {"id": "Mixed Material", "label": "Kombinasi Logam-Asetat", "desc": "Keseimbangan gaya dan kekuatan"},
        ],
    }
    q_fin = {
        "id": "finish_style",
        "question": "Tipe finishing permukaan yang Anda sukai?",
        "reason": "Menentukan pantulan cahaya bingkai.",
        "options": [
            {"id": "Matte Satin", "label": "Matte / Doff", "desc": "Kalem, elegan, tanpa silau"},
            {"id": "High Gloss", "label": "Mengkilap / Glossy", "desc": "Mewah dan memantulkan kilau cerah"},
            {"id": "Brushed Metal", "label": "Tekstur Brushed", "desc": "Serat halus bernuansa industrial"},
            {"id": "Translucent Frosted", "label": "Semi-Transparan", "desc": "Buram modern kekinian"},
        ],
    }
    questions = [q_mat, q_fin]
    random.shuffle(questions)
    return questions


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
                            random.shuffle(questions)
                            return questions
        except Exception as err:
            logger.debug(f"Gemini {model_name} attempt skipped: {err}")
            continue

    return _generate_dynamic_fallback(user_profile, subcategory, batch)
