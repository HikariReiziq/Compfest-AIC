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
        inventory_context = "Inventori 3D kita: Aviator Pilot Wire, Khronos Wayfarer PBR, Browline Clubmaster, Geometric Hexagon, Round Retro Horn-Rimmed, Sport Sunfit. Warna: Gold, Silver, Matte Black, Havana Tortoise."
    elif "hat" in subcategory_id:
        item_label = "topi"
        inventory_context = "Inventori 3D kita: Fedora/Trilby, Western Cowboy Leather, Wide Beach Straw Hat, Safari Pith Helmet, Anime Straw Hat, Spy Mafia Hat, Propeller Cap, Witch Hat. Warna/Bahan: Natural Straw, Leather Brown, Noir Black, Khaki Safari."
    elif "shirt" in subcategory_id or "apparel" in category.lower():
        item_label = f"baju ({gender})"
        if gender == "Wanita":
            inventory_context = "Inventori 3D Wanita kita: Kemeja Satin Emerald Formal, Setelan Rok & Crop Tee Lilac, Sweater Rajut Ivory, Kaos V-Neck Fitted, Off-Shoulder Blouse, Flanel Overshirt Hijau."
        else:
            inventory_context = "Inventori 3D Pria kita: Kemeja Oxford Formal, Kaos Kasual Grafis, Jersey FC Barcelona Sporty, Polo Color-Blocked, Kaos Layering Santai, Muscle Tank."
    elif "jacket" in subcategory_id:
        item_label = "jaket"
        inventory_context = "Inventori 3D kita: Jaket bomber, denim jacket, leather jacket, trench coat."
    else:
        item_label = subcategory_id
        inventory_context = ""

    batch_topics = {
        1: f"3 soal inti yang MENGACU PADA CIRI INVENTORI KITA: (1) Momen aktivitas & siluet, (2) Model spesifik produk 3D yang diminati, (3) Pilihan warna/material yang cocok dengan kulit {skin_tone} ({monk_tone}).",
        2: "3 soal gaya: (1) Estetika visual, (2) Material kenyamanan, (3) Target anggaran.",
        3: "2 soal identitas: (1) Karakter personal, (2) Finishing aksen permukaan.",
    }
    topic_instruction = batch_topics.get(batch, f"2 pertanyaan personalisasi Batch {batch}")

    prev_info = ""
    if previous_answers:
        prev_info = f"\nJAWABAN SEBELUMNYA: {json.dumps(previous_answers, ensure_ascii=False)}"

    return f"""Kamu adalah AI Stylist COBA. Buat kuesioner super ringkas, to-the-point, dan berakar kuat pada inventori 3D produk nyata yang kita miliki.

PROFIL PENGGUNA:
- Gender: {gender}
- Kulit: {skin_tone} ({monk_tone}, {undertone})
- Wajah: {face_shape}
- Kategori: {item_label} (Batch #{batch})
- CIRI BARANG 3D KITA: {inventory_context}
{prev_info}

TOPIK BATCH #{batch}:
{topic_instruction}

ATURAN GAYA BAHASA (SANGAT KETAT):
1. Teks PERTANYAAN harus SANGAT SINGKAT (maksimal 5–8 kata, to-the-point).
2. OPSI PILIHAN HARUS MENCERMINKAN MODEL & CIRI PRODUK 3D KITA DI ATAS (misal untuk kacamata sebutkan aviator, wayfarer, browline; untuk topi sebutkan fedora, cowboy, pantai jerami; untuk baju sebutkan kemeja, jersey, sweater, dll).
3. REASON cukup 1 kalimat pendek (maksimal 8–10 kata).
4. LABEL opsi 2–3 kata. DESC opsi maksimal 4–6 kata padat.

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
    """Generates concise, punchy questions with intra-batch randomization for the user's biometrics and 3D catalog."""
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

    subcat = subcategory.lower()

    # Batch 1: 3 Fondasi Singkat Berakar pada Katalog 3D (Aktivitas, Siluet 3D, Palet Warna)
    if batch == 1:
        # A. KACAMATA (Glasses)
        if "glass" in subcat:
            q_occ = {
                "id": "occasion",
                "question": "Untuk suasana apa kacamata ini digunakan?",
                "reason": f"Menyesuaikan ketahanan dan siluet untuk {gender_label}.",
                "options": [
                    {"id": "Casual", "label": "Santai & Harian", "desc": "Gaya kasual Wayfarer yang nyaman"},
                    {"id": "Formal", "label": "Kerja & Eksekutif", "desc": "Tampilan Browline profesional rapi"},
                    {"id": "Party", "label": "Pesta & Glamour", "desc": "Sentuhan Khronos Gold mewah"},
                    {"id": "Sports", "label": "Outdoor & Olahraga", "desc": "Sunfit Sport aerodinamis aktif"},
                ],
            }
            q_fit = {
                "id": "fit_preference",
                "question": f"Pilihan siluet bingkai untuk wajah {face_shape} Anda?",
                "reason": f"Menciptakan proporsi harmonis pada wajah {face_shape}.",
                "options": [
                    {"id": "Aviator Double", "label": "Aviator Pilot Wire", "desc": "Jembatan ganda memikat ikonik"},
                    {"id": "Classic Wayfarer", "label": "Wayfarer Kotak Tebal", "desc": "Garis atas lurus dan tegas"},
                    {"id": "Modern Geometric", "label": "Geometris Heksagon", "desc": "Aksen kontemporer bersudut unik"},
                    {"id": "Retro Round", "label": "Bulat Retro Horn-Rim", "desc": "Gaya vintage intelektual artistik"},
                ],
            }
            q_col = {
                "id": "color_mood",
                "question": f"Nuansa warna bingkai untuk kulit {skin_tone} Anda?",
                "reason": f"Menyelaraskan kilau bingkai dengan rona kulit {monk_tone}.",
                "options": [
                    {"id": "Earth Tone Gold", "label": "Gold & Warm Amber", "desc": "Kilau emas dan amber hangat"},
                    {"id": "Silver Steel", "label": "Silver Steel & Chrome", "desc": "Kilau perak bersih modern"},
                    {"id": "Solid Black", "label": "Matte Black & Onyx", "desc": "Hitam pekat tegas maskulin"},
                    {"id": "Rich Havana", "label": "Havana Tortoise", "desc": "Gradasi cokelat penyu eksotis"},
                ],
            }
            questions = [q_occ, q_fit, q_col]
            return questions

        # B. TOPI (Hats)
        elif "hat" in subcat:
            q_occ = {
                "id": "occasion",
                "question": "Aktivitas apa yang paling cocok untuk topi Anda?",
                "reason": "Menyesuaikan fungsionalitas dan pelindung kepala.",
                "options": [
                    {"id": "Casual", "label": "Hangout & Kafe", "desc": "Trilby Fedora kasual stylish"},
                    {"id": "Travel", "label": "Pantai & Liburan", "desc": "Topi anyaman jerami santai"},
                    {"id": "Sports", "label": "Petualangan & Safari", "desc": "Cowboy hat & Pith helmet kokoh"},
                    {"id": "Party", "label": "Pesta Karakter & Tema", "desc": "Ekspresif bergaya teatrikal"},
                ],
            }
            q_fit = {
                "id": "fit_preference",
                "question": "Siluet model topi 3D yang ingin Anda coba?",
                "reason": "Menonjolkan siluet kepala dan karakter gaya.",
                "options": [
                    {"id": "Fedora Classic", "label": "Fedora / Trilby Noir", "desc": "Tepi terlipat klasik berwibawa"},
                    {"id": "Cowboy Western", "label": "Western Cowboy Leather", "desc": "Tepi lebar melengkung gagah"},
                    {"id": "Beach Straw", "label": "Wide Beach Straw Hat", "desc": "Anyaman lebar penyejuk tropis"},
                    {"id": "Explorer Pith", "label": "Safari Pith Helmet", "desc": "Struktur kubah kokoh ikonis"},
                ],
            }
            q_col = {
                "id": "color_mood",
                "question": f"Warna & material topi untuk kulit {skin_tone} Anda?",
                "reason": "Memberikan kontras visual yang memikat.",
                "options": [
                    {"id": "Natural Straw", "label": "Jerami Alami (Krem)", "desc": "Nuansa cerah alami tropis"},
                    {"id": "Leather Brown", "label": "Cokelat Kulit Tua", "desc": "Nuansa kulit gelap eksotis"},
                    {"id": "Pitch Black", "label": "Hitam Noir Pekat", "desc": "Tampilan elegan misterius"},
                    {"id": "Safari Khaki", "label": "Khaki & Olive Hijau", "desc": "Nuansa alam earthy outdoor"},
                ],
            }
            questions = [q_occ, q_fit, q_col]
            return questions

        # C. BAJU / APPAREL (Shirts)
        else:
            if is_female:
                q_occ = {
                    "id": "occasion",
                    "question": "Momen pemakaian busana yang Anda tuju?",
                    "reason": "Menyesuaikan potongan baju dengan aktivitas wanita.",
                    "options": [
                        {"id": "Formal", "label": "Kerja & Eksekutif", "desc": "Kemeja satin elegan profesional"},
                        {"id": "Casual", "label": "Hangout & Santai", "desc": "Setelan rok dan crop tee manis"},
                        {"id": "Party", "label": "Pesta & Dinner", "desc": "Blus off-shoulder beraksen ruffle"},
                        {"id": "Cozy", "label": "Santai Dingin / Hangat", "desc": "Sweater rajut lembut nyaman"},
                    ],
                }
                q_fit = {
                    "id": "fit_preference",
                    "question": "Pilihan siluet busana yang paling menarik minat Anda?",
                    "reason": "Menonjolkan proporsi tubuh yang anggun.",
                    "options": [
                        {"id": "Satin ButtonDown", "label": "Kemeja Satin Emerald", "desc": "Potongan rapi berwibawa"},
                        {"id": "Crop And Skirt", "label": "Setelan Crop & Rok", "desc": "Paduan santai manis berjenjang"},
                        {"id": "Knit Sweater", "label": "Sweater Rajut Pullover", "desc": "Rajutan tebal longgar hangat"},
                        {"id": "Fitted VNeck", "label": "Kaos V-Neck Pas Tubuh", "desc": "Siluet ramping mempertegas leher"},
                    ],
                }
                q_col = {
                    "id": "color_mood",
                    "question": f"Palet warna busana untuk kulit {skin_tone} Anda?",
                    "reason": "Memancarkan aura rona kulit wanita tropis.",
                    "options": [
                        {"id": "Emerald Green", "label": "Emerald Green Satin", "desc": "Hijau zamrud mewah memikat"},
                        {"id": "Lilac Pastel", "label": "Lilac & Soft Rose", "desc": "Warna pastel manis feminin"},
                        {"id": "Ivory Cream", "label": "Ivory Cream Hangat", "desc": "Putih gading lembut elegan"},
                        {"id": "Terracotta Coral", "label": "Terracotta Coral Ceria", "desc": "Nuansa oranye hangat eksotis"},
                    ],
                }
            else:
                q_occ = {
                    "id": "occasion",
                    "question": "Suasana apa yang menjadi tujuan busana Anda?",
                    "reason": "Menyesuaikan kenyamanan dan fungsi pakaian pria.",
                    "options": [
                        {"id": "Formal", "label": "Kantor & Acara Resmi", "desc": "Kemeja oxford berwibawa rapi"},
                        {"id": "Casual", "label": "Santai & Harian", "desc": "Kaos kasual grafis santai"},
                        {"id": "Sports", "label": "Olahraga & Aktif", "desc": "Jersey FC Barcelona atletis"},
                        {"id": "Streetwear", "label": "Urban & Nongkrong", "desc": "Polo color-block & layering"},
                    ],
                }
                q_fit = {
                    "id": "fit_preference",
                    "question": "Potongan busana yang ingin Anda kenakan?",
                    "reason": "Menyesuaikan dengan lebar bahu dan postur tubuh.",
                    "options": [
                        {"id": "Formal Shirt", "label": "Kemeja Oxford Formal", "desc": "Garis kerah tegas profesional"},
                        {"id": "Sport Jersey", "label": "Jersey Sepak Bola", "desc": "Bahan atletis aerodinamis"},
                        {"id": "ColorBlock Polo", "label": "Polo Shirt Color-Block", "desc": "Aksen warna modern berkerah"},
                        {"id": "Layered Tee", "label": "Kaos Layering / Santai", "desc": "Gaya bertumpuk kasual leluasa"},
                    ],
                }
                q_col = {
                    "id": "color_mood",
                    "question": f"Nuansa warna untuk kulit {skin_tone} Anda?",
                    "reason": "Memberi ketegasan maskulin pada kulit sawo matang.",
                    "options": [
                        {"id": "Blaugrana Navy", "label": "Navy & Blaugrana", "desc": "Biru dan merah marun berenergi"},
                        {"id": "Neutral Monokrom", "label": "Hitam & Charcoal", "desc": "Ketegasan maskulin minimalis"},
                        {"id": "Earth Tone", "label": "Khaki, Cokelat & Olive", "desc": "Nuansa bumi hangat bersahabat"},
                        {"id": "Clean White", "label": "Putih Bersih Kontras", "desc": "Kesan segar dan profesional"},
                    ],
                }
            questions = [q_occ, q_fit, q_col]
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
                            # Guarantee strictly unique question IDs and option IDs across all questions in the batch
                            for idx, q in enumerate(questions):
                                q["id"] = f"q_{subcategory}_b{batch}_{idx+1}"
                                for opt_idx, opt in enumerate(q.get("options", [])):
                                    if not opt.get("id") or opt["id"] in ["opt_1", "opt_2", "opt_3", "opt_4"]:
                                        opt["id"] = f"opt_{idx+1}_{opt_idx+1}"

                            random.shuffle(questions)
                            return questions
        except Exception as err:
            logger.debug(f"Gemini {model_name} attempt skipped: {err}")
            continue

    return _generate_dynamic_fallback(user_profile, subcategory, batch)
