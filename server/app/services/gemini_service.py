"""Gemini AI Service — Context-Aware Dynamic Questionnaire Generator.

Uses Google Generative AI REST API with ultra-fast flash-lite models to synthesize
deeply personalized, non-generic style questions in Indonesian tailored to the user's
specific detected 3-parameter biometrics: Gender, Skin Tone, and Face Shape.
"""

import os
import json
import logging
import random
import re
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional

from fastapi import HTTPException

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
        1: f"4 soal inti tentang PREFERENSI PENGGUNA yang mengarah ke inventori kita: (1) Momen aktivitas & suasana pemakaian, (2) Bentuk/model kesukaan pengguna, (3) Pilihan warna/material yang cocok dengan kulit {skin_tone} ({monk_tone}), (4) Fitur kenyamanan/fungsi yang paling dihargai pengguna.",
        2: "4 soal gaya: (1) Estetika visual, (2) Material kenyamanan, (3) Target anggaran, (4) Tingkat keberanian warna/aksen.",
        3: "4 soal identitas: (1) Karakter personal, (2) Finishing aksen permukaan, (3) Inspirasi ikon gaya, (4) Item wajib dalam keseharian.",
    }
    topic_instruction = batch_topics.get(batch, f"4 pertanyaan personalisasi Batch {batch}")

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
2. Pertanyaan ditujukan kepada PENGGUNA tentang selera & preferensinya — JANGAN menyebut kata '3D', 'model 3D', 'GLB', atau 'inventori' di teks pertanyaan.
   CONTOH SALAH (DILARANG): "Model topi 3D mana paling menarik?", "Pilih model 3D favoritmu?", "Inventori mana yang cocok?"
   CONTOH BENAR: "Bentuk topi apa yang paling kamu suka?", "Kapan dan di mana topi dipakai?", "Model bingkai kacamata apa yang disukai?"
3. OPSI PILIHAN HARUS MENCERMINKAN MODEL & CIRI PRODUK NYATA KITA DI ATAS (misal untuk kacamata sebutkan aviator, wayfarer, browline; untuk topi sebutkan fedora, cowboy, pantai jerami; untuk baju sebutkan kemeja, jersey, sweater, dll).
4. REASON cukup 1 kalimat pendek (maksimal 8–10 kata).
5. LABEL opsi 2–3 kata. DESC opsi maksimal 4–6 kata padat.
6. WAJIB hasilkan TEPAT 4 pertanyaan (bukan 3, bukan 5) — setiap pertanyaan punya TEPAT 4 opsi.

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
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY belum dikonfigurasi. Kuesioner hanya dihasilkan oleh Gemini AI Engine.",
        )

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
                                # Safety net: scrub internal jargon ("3D", "GLB", "inventori") from user-facing text
                                q["question"] = re.sub(
                                    r"\b(model\s*3d|3d|glb|inventori)\b", "", str(q.get("question", "")), flags=re.IGNORECASE
                                ).replace("  ", " ").strip()
                                for opt_idx, opt in enumerate(q.get("options", [])):
                                    if not opt.get("id") or opt["id"] in ["opt_1", "opt_2", "opt_3", "opt_4"]:
                                        opt["id"] = f"opt_{idx+1}_{opt_idx+1}"

                            random.shuffle(questions)
                            return questions
        except Exception as err:
            logger.debug(f"Gemini {model_name} attempt skipped: {err}")
            continue

    raise HTTPException(
        status_code=503,
        detail="Gemini AI Engine tidak dapat dihubungi. Silakan coba lagi.",
    )
