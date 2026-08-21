"""Local Question Bank — offline fallback for dynamic questionnaire engine.

Provides curated questions per subcategory across multiple batches (1 to 5+)
with contextual reasons based on user profile.
"""

from typing import Dict, List, Any


def get_local_questions(
    subcategory: str,
    user_profile: Dict[str, Any],
    batch: int = 1,
) -> List[Dict[str, Any]]:
    """Returns a batch of structured questions with reasons for the given subcategory and profile.

    Args:
        subcategory: Target item category (glasses, hats, shirts, jackets)
        user_profile: Dict with monk_tone, undertone, face_shape, body_shape
        batch: 1=Core (3), 2=Vibe & Fit (3), 3=Material & Texture (3), 4=Lifestyle (3), 5+=Signature Touch (2)

    Returns:
        List of question dicts with id, question, reason, options (4 each)
    """
    undertone = user_profile.get("undertone", "Warm")
    face_shape = user_profile.get("face_shape", "Oval")
    body_shape = user_profile.get("body_shape", "Hourglass")

    # --- BATCH 1: Core 3 questions (always initial) ---
    fit_options_map = {
        "glasses": [
            {"id": "Regular Fit", "label": "Classic Timeless", "desc": "Bingkai seimbang berdimensi standar"},
            {"id": "Oversized", "label": "Bold Oversized", "desc": "Frame lebar bergaya dramatis & percaya diri"},
            {"id": "Fitted", "label": "Minimalist Slim", "desc": "Garis tipis tanpa rasa berat di wajah"},
            {"id": "Layered", "label": "Geometric Sharp", "desc": "Aksen sudut kontemporer berkarakter"},
        ],
        "hats": [
            {"id": "Regular Fit", "label": "Classic Structured", "desc": "Crown berstruktur dengan brim seimbang"},
            {"id": "Relaxed Fit", "label": "Relaxed Bucket", "desc": "Bahan katun lemas yang santai"},
            {"id": "Fitted", "label": "Knit Beanie", "desc": "Rajutan pas yang mengikuti lekuk kepala"},
            {"id": "Layered", "label": "Sporty Curved Cap", "desc": "Brim melengkung dengan panel dinamis"},
        ],
        "shirts": [
            {"id": "Oversized", "label": "Oversized / Boxy", "desc": "Potongan longgar modern ala streetwear"},
            {"id": "Regular Fit", "label": "Regular Tailored", "desc": "Potongan bersih pas badan yang rapi"},
            {"id": "Fitted", "label": "Fitted Cut", "desc": "Menonjolkan garis torso tubuh secara presisi"},
            {"id": "Layered", "label": "Camp Collar / Relaxed", "desc": "Kerah terbuka bernuansa kasual sejuk"},
        ],
        "jackets": [
            {"id": "Regular Fit", "label": "Harrington / Utility", "desc": "Potongan klasik serbaguna untuk harian"},
            {"id": "Layered", "label": "Tailored Blazer", "desc": "Bahu tegas berkerah lapel berwibawa"},
            {"id": "Oversized", "label": "Oversized Denim / Anorak", "desc": "Siluet luaran tebal berdimensi longgar"},
            {"id": "Fitted", "label": "Cropped Bomber", "desc": "Potongan sepinggang yang memberi kesan kaki jenjang"},
        ],
    }

    fit_reason_map = {
        "glasses": f"Siluet frame mempengaruhi keseimbangan visual wajah {face_shape} Anda.",
        "hats": f"Bentuk mahkota dan brim harus menyesuaikan proporsi kepala dan wajah {face_shape} Anda.",
        "shirts": f"Potongan atasan yang tepat akan mengoptimalkan siluet tubuh {body_shape} Anda.",
        "jackets": f"Karakter outerwear harus menyeimbangkan garis bahu dan pinggang {body_shape} Anda.",
    }

    if batch == 1:
        return [
            {
                "id": "occasion",
                "question": f"Untuk momen atau acara apa Anda mencari {subcategory}?",
                "reason": f"Momen penggunaan menentukan tingkat formalitas dan jenis material yang cocok untuk bentuk wajah {face_shape} Anda.",
                "options": [
                    {"id": "Casual", "label": "Casual / Santai", "desc": "Hangout, ngopi, dan kegiatan sehari-hari"},
                    {"id": "Formal", "label": "Formal / Profesional", "desc": "Kantor, meeting, presentasi, dan acara resmi"},
                    {"id": "Party", "label": "Pesta / Evening", "desc": "Acara sosial malam, pesta, dan kencan"},
                    {"id": "Sports", "label": "Sporty / Outdoor", "desc": "Aktivitas dinamis, jalan-jalan, dan outdoor"},
                ],
            },
            {
                "id": "fit_preference",
                "question": f"Siluet dan karakter potongan apa yang Anda sukai?",
                "reason": fit_reason_map.get(subcategory, f"Potongan yang tepat untuk bentuk tubuh {body_shape}."),
                "options": fit_options_map.get(subcategory, fit_options_map["glasses"]),
            },
            {
                "id": "color_mood",
                "question": "Nuansa palet warna dominan yang ingin dieksplorasi?",
                "reason": f"Dengan undertone {undertone}, beberapa palet warna akan lebih bersinar pada kulit Anda dibanding lainnya.",
                "options": [
                    {"id": "Earth Tone", "label": "Earth Tone (Hangat)", "desc": "Terracotta, olive, mustard, dan krem"},
                    {"id": "Jewel Tone", "label": "Jewel Tone (Sejuk)", "desc": "Navy, emerald, burgundy, dan slate"},
                    {"id": "Neutral Classic", "label": "Neutral Monokrom", "desc": "Charcoal, beige, off-white, dan hitam"},
                    {"id": "Bold Vibrant", "label": "Bold & Expressive", "desc": "Terracotta, teal, bronze, dan plum"},
                ],
            },
        ]

    # --- BATCH 2: Vibe, Brand Style & Budget ---
    if batch == 2:
        return [
            {
                "id": "brand_style",
                "question": "Gaya inspirasi brand mana yang paling mendekati selera Anda?",
                "reason": f"Membantu AI mencocokkan arsitektur desain yang kompatibel dengan karakteristik {face_shape} dan {body_shape}.",
                "options": [
                    {"id": "Minimalist", "label": "Minimalist Modern", "desc": "Clean lines, monokrom, nuansa Scandinavian"},
                    {"id": "Streetwear", "label": "Urban Streetwear", "desc": "Grafis tegas, oversized, statement piece"},
                    {"id": "Classic", "label": "Heritage Classic", "desc": "Timeless cuts, neutral tones, tailored"},
                    {"id": "Avant-Garde", "label": "Avant-Garde / Experimental", "desc": "Deconstructed, asimetris, unik"},
                ],
            },
            {
                "id": "comfort_priority",
                "question": "Seberapa penting kenyamanan pemakaian dibanding tampilan visual?",
                "reason": "Keseimbangan antara estetika dan kenyamanan mempengaruhi rekomendasi material dan fit akhir.",
                "options": [
                    {"id": "comfort_first", "label": "Utamakan Kenyamanan", "desc": "Bahan ringan, breathable, fleksibel harian"},
                    {"id": "balanced", "label": "Seimbang Keduanya", "desc": "Tetap nyaman dan berpenampilan tajam"},
                    {"id": "style_first", "label": "Utamakan Tampilan", "desc": "Estetika dan siluet nomor satu"},
                    {"id": "performance", "label": "Fungsional & Teknikal", "desc": "Weather resistant, stretch, durabilitas tinggi"},
                ],
            },
            {
                "id": "budget_range",
                "question": "Kisaran budget yang Anda alokasikan untuk item ini?",
                "reason": "Memastikan AI merekomendasikan produk dalam rentang harga yang realistis untuk Anda.",
                "options": [
                    {"id": "budget", "label": "Terjangkau (< Rp300.000)", "desc": "Best value, kualitas harian solid"},
                    {"id": "mid", "label": "Menengah (Rp300K - 600K)", "desc": "Premium quality, material pilihan"},
                    {"id": "premium", "label": "Premium (Rp600K - 1Jt)", "desc": "Designer quality, craftmanship tinggi"},
                    {"id": "luxury", "label": "Luxury (> Rp1.000.000)", "desc": "High-end, eksklusif, limited edition"},
                ],
            },
        ]

    # --- BATCH 3: Material & Texture Preferences ---
    if batch == 3:
        return [
            {
                "id": "material_preference",
                "question": "Jenis material atau tekstur kain apa yang paling Anda sukai?",
                "reason": f"Tekstur kain memberikan dimensi bayangan yang berinteraksi dengan undertone {undertone} kulit Anda.",
                "options": [
                    {"id": "Natural Cotton", "label": "Natural Cotton / Linen", "desc": "Sejuk, berpori alami, ramah di kulit"},
                    {"id": "Structured Blend", "label": "Structured Wool / Twill", "desc": "Tegak berwibawa, rapi sepanjang hari"},
                    {"id": "Tech Nylon", "label": "Tech Nylon / Ripstop", "desc": "Ringan, tahan cuaca, modern utilitarian"},
                    {"id": "Denim Leather", "label": "Heavy Denim / Suede", "desc": "Bertekstur kokoh dengan karakter vintage"},
                ],
            },
            {
                "id": "pattern_preference",
                "question": "Tipe aksen visual atau motif apa yang Anda inginkan?",
                "reason": f"Motif berinteraksi dengan struktur wajah {face_shape} untuk menciptakan fokus pandang.",
                "options": [
                    {"id": "Solid Clean", "label": "Solid Polos Tanpa Motif", "desc": "Tampilan bersih berfokus pada warna"},
                    {"id": "Subtle Texture", "label": "Subtle Weave / Ribbed", "desc": "Tekstur halus tanpa grafis mencolok"},
                    {"id": "Pinstripe / Grid", "label": "Garis / Geometris Klasik", "desc": "Memberi ilusi tubuh lebih ramping"},
                    {"id": "Bold Accent", "label": "Graphic / Colorblock Bold", "desc": "Aksen kontras tinggi yang ekspresif"},
                ],
            },
            {
                "id": "versatility_level",
                "question": "Seberapa fleksibel produk ini harus bisa dipadukan?",
                "reason": "Menentukan apakah AI memprioritaskan versatile staple piece atau specialized hero piece.",
                "options": [
                    {"id": "Day to Night", "label": "Day-to-Night Multi-Occasion", "desc": "Cocok dari siang santai hingga malam formal"},
                    {"id": "Signature Statement", "label": "Signature Focal Point", "desc": "Item utama yang mencuri perhatian ruangan"},
                    {"id": "Layering Base", "label": "Perfect Layering Piece", "desc": "Mudah dipadukan dengan luaran/aksesoris lain"},
                    {"id": "Occasion Specific", "label": "Spesifik Momen Tertentu", "desc": "Dikhususkan untuk acara pilihan Anda"},
                ],
            },
        ]

    # --- BATCH 4: Environment & Layering Dynamics ---
    if batch == 4:
        return [
            {
                "id": "climate_environment",
                "question": "Di lingkungan cuaca apa item ini paling sering Anda kenakan?",
                "reason": "Memastikan bobot material dan ketebalan sesuai dengan aktivitas riil Anda.",
                "options": [
                    {"id": "AC Indoor", "label": "Ruangan Ber-AC Dingin", "desc": "Kantor, mall, dan ruang rapat"},
                    {"id": "Tropical Outdoor", "label": "Outdoor Tropis Hangat", "desc": "Siang hari luar ruangan yang aktif"},
                    {"id": "Evening Night", "label": "Malam Hari Luar Ruangan", "desc": "Angin malam dan nongkrong terbuka"},
                    {"id": "All Weather", "label": "All-Weather Adaptive", "desc": "Fleksibel berganti suasana cuaca"},
                ],
            },
            {
                "id": "layering_concept",
                "question": "Bagaimana preferensi teknik layering yang Anda sukai?",
                "reason": f"Layering mengubah proporsi siluet {body_shape} tubuh Anda.",
                "options": [
                    {"id": "Single Standalone", "label": "Single Piece Praktis", "desc": "Cukup satu item tanpa lapisan lain"},
                    {"id": "Light Layer", "label": "Light Over / Open Front", "desc": "Dipakai terbuka di atas inner polos"},
                    {"id": "Structured Full", "label": "Full Layered Ensemble", "desc": "Lapisan lengkap terstruktur berwibawa"},
                    {"id": "Modular", "label": "Modular / Convertible", "desc": "Bisa dilipat atau disesuaikan ukurannya"},
                ],
            },
            {
                "id": "color_intensity",
                "question": "Tingkat intensitas atau saturasi warna yang Anda percaya diri kenakan?",
                "reason": f"Menyesuaikan kontras warna terhadap skala warna kulit Monk {user_profile.get('monk_tone', 'MST-06')}.",
                "options": [
                    {"id": "Muted Soft", "label": "Muted & Dusty", "desc": "Warna kalem bernuansa teduh"},
                    {"id": "Deep Rich", "label": "Deep & Rich Dark", "desc": "Warna gelap pekat berbobot mewah"},
                    {"id": "Medium Balanced", "label": "Medium Balanced Saturation", "desc": "Warna natural tidak terlalu terang/gelap"},
                    {"id": "High Contrast", "label": "High Contrast & Vibrant", "desc": "Warna menyala yang memancarkan energi"},
                ],
            },
        ]

    # --- BATCH 5+: Signature Identity & Personal Touch ---
    return [
        {
            "id": "personal_aura",
            "question": "Kesan karakter pertama apa yang ingin Anda pancarkan?",
            "reason": f"AI menyelaraskan aura busana dengan ekspresi wajah {face_shape} Anda.",
            "options": [
                {"id": "Authoritative", "label": "Wibawa & Profesional", "desc": "Tegas, kredibel, dan berkarisma"},
                {"id": "Approachable", "label": "Hangat & Bersahabat", "desc": "Santai, ramah, dan mudah didekati"},
                {"id": "Creative", "label": "Kreatif & Berjiwa Seni", "desc": "Unik, kontemporer, dan berani beda"},
                {"id": "Effortless", "label": "Effortless Cool", "desc": "Keren tanpa terlihat berusaha keras"},
            ],
        },
        {
            "id": "detail_focus",
            "question": "Detail kecil apa yang paling sering menarik perhatian Anda pada sebuah produk?",
            "reason": "Menyempurnakan pilihan Top-4 ke tingkat kurasi hardware & finishing terkecil.",
            "options": [
                {"id": "Hardware Finish", "label": "Finishing Logam / Hardware", "desc": "Aksen resleting, kancing, atau engsel bingkai"},
                {"id": "Stitching Quality", "label": "Kerapian Jahitan / Sambungan", "desc": "Presisi garis jahitan dan lekuk tepi"},
                {"id": "Silhouette Cut", "label": "Sudut Potongan & Jatuhnya Bahan", "desc": "Bagaimana busana jatuh mengikuti gravitasi"},
                {"id": "Color Harmony", "label": "Gradasi & Keserasian Warna", "desc": "Paduan warna dasar dan aksen interior"},
            ],
        },
    ]
