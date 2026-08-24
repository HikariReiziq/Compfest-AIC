"""Multi-Dimensional Face Analyzer (ADR-014).

Menerima fitur turunan (angka) hasil ekstraksi klien dari 478 landmark MediaPipe
dan mengklasifikasikan: bentuk wajah 6 kelas (+ Diamond rule override), tipe
hidung, bentuk mata, dan bentuk alis — plus justifikasi 3 pilar (ADR-016).

Payload tidak pernah berisi gambar wajah (UU PDP No. 27/2022 by design).
"""

from typing import Any, Dict, List, Optional
import math

from ai_engine.models.face_classifier import FaceShapeClassifier

# Singleton legacy classifier (RF-from-weights bila tersedia, else rule-based)
_classifier = FaceShapeClassifier()

# --- Enrichment label bahasa Indonesia untuk 6 kelas bentuk wajah ---
FACE_SHAPE_LABELS_ID: Dict[str, str] = {
    "Oval": "Oval (Oval)",
    "Round": "Round (Bulat)",
    "Square": "Square (Kotak)",
    "Heart": "Heart (Hati)",
    "Oblong": "Oblong (Persegi Panjang)",
    "Diamond": "Diamond (Wajah Berlian)",
}

# Rekomendasi aksesoris untuk Diamond (kelas baru; legacy map tidak memilikinya)
_DIAMOND_ADVICE = {
    "glasses": ["Cat-Eye Angular", "Oval Metal Frame", "Browline Clubmaster", "Rimless Oval"],
    "hats": ["Medium Brim Fedora", "Beret Samping", "Slouchy Beanie", "Newsboy Cap"],
    "advice": (
        "Wajah berlian memiliki tulang pipi paling dominan dengan dahi dan rahang ramping. "
        "Pilih frame yang menonjolkan garis brow-line dan melebar di bagian atas untuk "
        "menyeimbangkan tulang pipi yang menonjol; hindari frame sempit tanpa aksen atas."
    ),
}

# Threshold rule override Diamond (ADR-014 / PRD 8.2):
# tulang pipi dominan + dahi sempit + dagu runcing.
DIAMOND_RULE = {
    "cheekbone_to_jaw_min": 1.30,
    "jaw_to_forehead_max": 0.78,
    "chin_sharpness_max": 0.58,
}


def classify_face_shape(ratios: Dict[str, float]) -> Dict[str, Any]:
    """Klasifikasi bentuk wajah 6 kelas.

    1. Diamond rule override dievaluasi lebih dulu (dataset Face Shape 5K hanya
       punya 5 kelas — Diamond dideteksi lewat geometri antropometrik).
    2. Jalur legacy: Random Forest dari bobot terlatih, fallback rule-based
       scoring (FaceShapeClassifier lama — tidak diduplikasi di sini).
    """
    cheek_jaw = ratios.get("cheekbone_to_jaw", 0.0)
    jaw_fh = ratios.get("jaw_to_forehead", 1.0)
    chin_sharp = ratios.get("chin_sharpness", 1.0)

    is_diamond = (
        cheek_jaw >= DIAMOND_RULE["cheekbone_to_jaw_min"]
        and jaw_fh <= DIAMOND_RULE["jaw_to_forehead_max"]
        and chin_sharp <= DIAMOND_RULE["chin_sharpness_max"]
    )
    if is_diamond:
        # Confidence naik seberapa jauh ketiga kriteria melewati threshold
        margins = (
            (cheek_jaw - DIAMOND_RULE["cheekbone_to_jaw_min"]) / DIAMOND_RULE["cheekbone_to_jaw_min"]
            + (DIAMOND_RULE["jaw_to_forehead_max"] - jaw_fh) / DIAMOND_RULE["jaw_to_forehead_max"]
            + (DIAMOND_RULE["chin_sharpness_max"] - chin_sharp) / DIAMOND_RULE["chin_sharpness_max"]
        )
        confidence = round(min(0.95, 0.82 + margins), 2)
        clean_ratios = {k: float(v) for k, v in ratios.items() if v is not None}
        return {
            "shape": "Diamond",
            "label_indonesian": FACE_SHAPE_LABELS_ID["Diamond"],
            "confidence": confidence,
            "method": "rule_override",
            "ratios": clean_ratios,
            "glasses_recommendations": _DIAMOND_ADVICE["glasses"],
            "hat_recommendations": _DIAMOND_ADVICE["hats"],
            "styling_advice": _DIAMOND_ADVICE["advice"],
        }

    result = _classifier.classify(ratios)
    method = "random_forest" if _classifier.model is not None else "rule_based"
    return {
        "shape": result.shape,
        "label_indonesian": FACE_SHAPE_LABELS_ID.get(result.shape, result.shape),
        "confidence": result.confidence,
        "method": method,
        "ratios": result.ratios,
        "glasses_recommendations": result.glasses_recommendations,
        "hat_recommendations": result.hat_recommendations,
        "styling_advice": result.styling_advice,
    }


# ------------------------------------------------------------------ #
#  Nose Type Rule Engine — 5 taksonomi (ADR-014)                     #
#  Sinyal utama: bridge_curvature (profil-z 168→6→1), width_to_face  #
#  (lebar alar / lebar pipi), tip_upturn, alar_to_tip_ratio.         #
# ------------------------------------------------------------------ #
NOSE_CURVATURE_CONVEX = 0.12   # > ini → punggung konveks (Roman)
NOSE_CURVATURE_CONCAVE = -0.12 # < ini → punggung cekung
NOSE_WIDE = 0.30               # lebar alar dominan (Bulbous/Snub)
NOSE_TIP_UPTURN = 0.15         # ujung terangkat (Celestial-Button)


class NoseClassifier:
    """Klasifikasi tipe hidung dari fitur turunan (tanpa dataset publik kanonik —
    strategi defensible: rule engine atas landmark geometry)."""

    @staticmethod
    def classify(f: Dict[str, float]) -> Dict[str, Any]:
        width = f.get("width_to_face", 0.0) or 0.0
        curvature = f.get("bridge_curvature", 0.0) or 0.0
        upturn = f.get("tip_upturn", 0.0) or 0.0
        alar_tip = f.get("alar_to_tip_ratio", 0.0) or 0.0

        # Fitur tak valid (semua nol) → fallback jujur ber-confidence rendah
        if width == 0 and curvature == 0 and upturn == 0 and alar_tip == 0:
            return {
                "label": "Greek (Mancung)",
                "label_id": "greek",
                "confidence": 0.45,
                "rule": "fallback",
            }

        if curvature > NOSE_CURVATURE_CONVEX:
            margin = (curvature - NOSE_CURVATURE_CONVEX) / max(NOSE_CURVATURE_CONVEX, 1e-6)
            return {
                "label": "Roman (Lengkung)",
                "label_id": "roman",
                "confidence": _conf(margin),
                "rule": f"bridge_curvature {curvature:.2f} > +{NOSE_CURVATURE_CONVEX} (punggung konveks)",
            }

        if curvature < NOSE_CURVATURE_CONCAVE:
            if width > NOSE_WIDE:
                margin = (NOSE_WIDE - 0) + (width - NOSE_WIDE) + (NOSE_CURVATURE_CONCAVE - curvature)
                return {
                    "label": "Broad-Snub (Pesek Lebar)",
                    "label_id": "broad_snub",
                    "confidence": _conf(margin),
                    "rule": f"bridge cekung {curvature:.2f} + lebar alar {width:.2f} > {NOSE_WIDE}",
                }
            margin = (NOSE_CURVATURE_CONCAVE - curvature) / abs(NOSE_CURVATURE_CONCAVE) + (
                upturn / NOSE_TIP_UPTURN if upturn > 0 else 0.0
            )
            return {
                "label": "Celestial-Button (Mancung Mungil)",
                "label_id": "celestial_button",
                "confidence": _conf(margin),
                "rule": f"bridge cekung {curvature:.2f} + tip_upturn {upturn:.2f}",
            }

        if width > NOSE_WIDE and alar_tip > 1.6:
            margin = (width - NOSE_WIDE) / NOSE_WIDE + (alar_tip - 1.6) / 1.6
            return {
                "label": "Bulbous (Bulat)",
                "label_id": "bulbous",
                "confidence": _conf(margin),
                "rule": f"lebar alar {width:.2f} + rasio alar/ujung {alar_tip:.2f} dominan",
            }

        # Baseline: punggung relatif lurus & proporsi moderat
        straightness = 1.0 - min(1.0, abs(curvature) / abs(NOSE_CURVATURE_CONCAVE))
        moderate = 1.0 - min(1.0, abs(width - 0.26) / 0.26)
        return {
            "label": "Greek (Mancung)",
            "label_id": "greek",
            "confidence": round(0.60 + 0.25 * (0.6 * straightness + 0.4 * moderate), 2),
            "rule": f"bridge lurus (curvature {curvature:.2f}) + lebar moderat ({width:.2f})",
        }


def _conf(margin: float, base: float = 0.62, span: float = 0.30) -> float:
    """Confidence 0.62..0.92 berdasarkan margin relatif terhadap threshold."""
    return round(min(0.95, base + span * min(1.0, margin)), 2)


# ------------------------------------------------------------------ #
#  Eye Shape Classifier — 4 taksonomi (ADR-014)                      #
#  Sinyal: EAR (eye aspect ratio, rata kanan-kiri) + canthal tilt    #
#  (derajat; positif = sudut luar lebih tinggi).                     #
# ------------------------------------------------------------------ #
EYE_EAR_ROUND = 0.38
EYE_TILT_UP = 8.0
EYE_TILT_DOWN = -8.0


class EyeShapeClassifier:
    @staticmethod
    def classify(f: Dict[str, float]) -> Dict[str, Any]:
        ear_r = f.get("ear_right", 0.0) or 0.0
        ear_l = f.get("ear_left", 0.0) or 0.0
        tilt_r = f.get("canthal_tilt_right", 0.0) or 0.0
        tilt_l = f.get("canthal_tilt_left", 0.0) or 0.0
        ear = (ear_r + ear_l) / 2
        tilt = (tilt_r + tilt_l) / 2

        if ear_r == 0 and ear_l == 0 and tilt_r == 0 and tilt_l == 0:
            return {"label": "Almond (Almond)", "label_id": "almond", "confidence": 0.45, "rule": "fallback"}

        if tilt >= EYE_TILT_UP:
            margin = (tilt - EYE_TILT_UP) / EYE_TILT_UP
            return {
                "label": "Cat-eye (Mata Kucing)",
                "label_id": "cat_eye",
                "confidence": _conf(margin),
                "rule": f"canthal tilt +{tilt:.1f}° ≥ +{EYE_TILT_UP:.0f}° (ekstrim terangkat)",
            }

        if tilt <= EYE_TILT_DOWN:
            margin = (EYE_TILT_DOWN - tilt) / abs(EYE_TILT_DOWN)
            return {
                "label": "Downturned (Menurun)",
                "label_id": "downturned",
                "confidence": _conf(margin),
                "rule": f"canthal tilt {tilt:.1f}° ≤ {EYE_TILT_DOWN:.0f}° (ekstrim menurun)",
            }

        if ear > EYE_EAR_ROUND:
            margin = (ear - EYE_EAR_ROUND) / EYE_EAR_ROUND
            return {
                "label": "Round (Bulat)",
                "label_id": "round",
                "confidence": _conf(margin),
                "rule": f"EAR {ear:.2f} > {EYE_EAR_ROUND} (bukaan kelopak tinggi) dengan tilt netral",
            }

        straightness = 1.0 - min(1.0, abs(tilt) / EYE_TILT_UP)
        almond_fit = 1.0 - min(1.0, abs(ear - 0.32) / 0.32)
        return {
            "label": "Almond (Almond)",
            "label_id": "almond",
            "confidence": round(0.62 + 0.25 * (0.6 * straightness + 0.4 * almond_fit), 2),
            "rule": f"EAR {ear:.2f} moderat + tilt {tilt:.1f}° netral (rasio klasik almond)",
        }


# ------------------------------------------------------------------ #
#  Brow Shape Classifier — 3 taksonomi (ADR-014)                     #
#  Sinyal: arch ratio = elevasi puncak alis / panjang alis (105/334  #
#  terhadap garis dasar 70-107 / 300-337), rata kanan-kiri.          #
# ------------------------------------------------------------------ #
BROW_ARCH_HIGH = 0.20
BROW_ARCH_FLAT = 0.10


class BrowClassifier:
    @staticmethod
    def classify(f: Dict[str, float]) -> Dict[str, Any]:
        arch_r = f.get("arch_ratio_right", 0.0) or 0.0
        arch_l = f.get("arch_ratio_left", 0.0) or 0.0
        arch = (arch_r + arch_l) / 2

        if arch_r == 0 and arch_l == 0:
            return {
                "label": "Soft Curve (Lengkung Lembut)",
                "label_id": "soft_curve",
                "confidence": 0.45,
                "rule": "fallback",
            }

        if arch > BROW_ARCH_HIGH:
            margin = (arch - BROW_ARCH_HIGH) / BROW_ARCH_HIGH
            return {
                "label": "Arched (Tegak)",
                "label_id": "arched",
                "confidence": _conf(margin),
                "rule": f"arch ratio {arch:.2f} > {BROW_ARCH_HIGH} (puncak alis dominan)",
            }

        if arch < BROW_ARCH_FLAT:
            margin = (BROW_ARCH_FLAT - arch) / BROW_ARCH_FLAT
            return {
                "label": "Straight (Lurus)",
                "label_id": "straight",
                "confidence": _conf(margin),
                "rule": f"arch ratio {arch:.2f} < {BROW_ARCH_FLAT} (alis hampir datar)",
            }

        mid_fit = 1.0 - min(1.0, abs(arch - 0.15) / 0.15)
        return {
            "label": "Soft Curve (Lengkung Lembut)",
            "label_id": "soft_curve",
            "confidence": round(0.62 + 0.25 * mid_fit, 2),
            "rule": f"arch ratio {arch:.2f} moderat (lengkung lembut seimbang)",
        }


# ------------------------------------------------------------------ #
#  PillarJustifier — justifikasi ilmiah 3 pilar (ADR-016)            #
#  Deterministik (string composition), tanpa LLM.                    #
# ------------------------------------------------------------------ #
_PILLAR1_APPLICATION = {
    "Oval": "proporsi Oval yang seimbang memberi kebebasan penuh bereksperimen siluet — manfaatkan frame bersudut maupun membulat sebagai kontras lembut.",
    "Round": "wajah Round dipertajam oleh siluet frame tegas persegi panjang (Wayfarer/D-Frame) yang memberi garis kontras vertikal pada lengkungan pipi.",
    "Square": "rahang tegas Square dilembutkan oleh siluet membulat (Round/Oval) — kontras kebalikan untuk meredakan sudut rahang.",
    "Heart": "dahi lebar Heart diseimbangkan frame bottom-heavy (Aviator/Browline) agar dagu ramping tidak tertelan proporsi atas.",
    "Oblong": "wajah panjang Oblong diberi ilusi lebar oleh frame oversized tinggi dengan aksen horizontal kuat.",
    "Diamond": "tulang pipi dominan Diamond paling serasi dengan frame yang menonjolkan garis brow-line dan melebar di atas (Browline/Cat-Eye) — hindari frame sempit tanpa aksen atas.",
}

_PILLAR2_APPLICATION = {
    "Warm": "undertone Warm paling bersinar dengan material hangat: emas (gold), titanium cokelat hangat, acetate amber/terracotta. Hindari silver polish dingin yang membuang rona kulit.",
    "Cool": "undertone Cool selaras dengan material sejuk: silver, titanium abu-abu, hitam matte, dan aksen biru navy. Hindari emas kuning yang terlihat bertabrakan.",
    "Neutral": "undertone Neutral fleksibel untuk dua dunia — gunakan kombinasi two-tone (emas + silver) atau gunmetal sebagai jalan tengah elegan.",
    "Olive": "undertone Olive unik butuh material earthy-metal: gunmetal, bronze, dan gold kehijauan; hindari rose gold yang mempertegas rona hijau.",
}

_PILLAR3_APPLICATION = {
    "greek": "hidung Greek (Mancung) dengan punggung lurus cocok dengan bridge standar; pad nose silicon klasik memberi kontak merata tanpa tekanan titik.",
    "roman": "hidung Roman (Lengkung) dengan punggung konveks paling nyaman memakai keyhole bridge — celah kunci mengikuti lengkungan tanpa menggantung di ujung.",
    "bulbous": "hidung Bulbous (Bulat) dengan ujung lebar butuh bridge lebar + adjustable nose pads agar berat frame tertumpu di septum, bukan di alar.",
    "broad_snub": "hidung Broad-Snub (Pesek Lebar) membutuhkan low bridge fit / keyhole bridge dan pad ajustabel tinggi agar frame tidak melorot ke pipi.",
    "celestial_button": "hidung Celestial-Button (Mancung Mungil) dengan pangkal rendah memakai low bridge + pad kecil presisi agar frame duduk stabil tanpa menutup alur mata.",
}


class PillarJustifier:
    """Menyusun justifikasi 3 pilar: Bentuk Wajah → siluet frame; Undertone →
    warna material; Tipe Hidung → ergonomi fit bridge/pad."""

    TITLES = {
        1: "Pilar 1 — Bentuk Wajah → Kontras Siluet Frame",
        2: "Pilar 2 — Undertone → Warna Material Aksesoris",
        3: "Pilar 3 — Tipe Hidung → Ergonomi Bridge & Pad",
    }

    @staticmethod
    def justify_pillar(pillar: int, ctx: Dict[str, Any]) -> Dict[str, Any]:
        face = str(ctx.get("face_shape") or "Oval")
        undertone = str(ctx.get("undertone") or "Neutral")
        nose_label = str(ctx.get("nose") or "")
        nose_id = str(ctx.get("nose_id") or "")
        if not nose_id:
            # Turunkan id dari label bila ctx hanya membawa label
            for key, marker in (
                ("roman", "Roman"), ("broad_snub", "Broad-Snub"), ("bulbous", "Bulbous"),
                ("celestial_button", "Celestial"),
            ):
                if marker in nose_label:
                    nose_id = key
                    break
            if not nose_id:
                nose_id = "greek"

        if pillar == 1:
            return {
                "pillar": 1,
                "title": PillarJustifier.TITLES[1],
                "principle": (
                    "Prinsip kontras siluet: bentuk frame yang berlawanan dengan geometri wajah "
                    "menciptakan keseimbangan visual yang paling flatteri."
                ),
                "scientific_basis": (
                    f"Berdasarkan rasio antropometrik wajah (lebar dahi : tulang pipi : rahang = "
                    f"proporsi terkalibrasi iris 11,7 mm), klasifikasi {face} menentukan arah kontras siluet."
                ),
                "application": (
                    f"Untuk bentuk wajah {face}: {_PILLAR1_APPLICATION.get(face, _PILLAR1_APPLICATION['Oval'])}"
                ),
            }

        if pillar == 2:
            return {
                "pillar": 2,
                "title": PillarJustifier.TITLES[2],
                "principle": (
                    "Prinsip keselarasan warna material: warna material aksesoris harus selaras "
                    "dengan undertone kulit agar wajah tampak bercahaya, bukan kusam."
                ),
                "scientific_basis": (
                    "Undertone ditentukan dari posisi warna kulit pada ruang warna CIELAB "
                    "(nilai a* kemerahan dan b* kekuningan) yang diukur dari ROI kulit wajah."
                ),
                "application": (
                    f"Untuk undertone {undertone}: {_PILLAR2_APPLICATION.get(undertone, _PILLAR2_APPLICATION['Neutral'])}"
                ),
            }

        if pillar == 3:
            return {
                "pillar": 3,
                "title": PillarJustifier.TITLES[3],
                "principle": (
                    "Prinsip ergonomi fit: kenyamanan dan posisi frame yang stabil ditentukan "
                    "oleh bentuk punggung hidung dan lebar alar — bukan hanya gaya."
                ),
                "scientific_basis": (
                    "Geometri profil-z punggung hidung (landmark 168-6-1) dan lebar alar "
                    "(landmark 129-358) menentukan tipe bridge yang menumpu bobot frame secara merata."
                ),
                "application": (
                    f"Untuk {nose_label or 'tipe hidung Anda'}: {_PILLAR3_APPLICATION.get(nose_id, _PILLAR3_APPLICATION['greek'])}"
                ),
            }

        raise ValueError(f"Pillar harus 1, 2, atau 3 — diterima: {pillar}")

    @staticmethod
    def justify_all(ctx: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [PillarJustifier.justify_pillar(p, ctx) for p in (1, 2, 3)]


class FaceAnalyzer:
    """Orchestrator satu-panggilan: payload landmark → laporan multi-dimensi.

    Menggabungkan classify_face_shape + Nose/Eye/BrowClassifier +
    PillarJustifier + narasi Indonesia deterministik (tanpa LLM — latency
    rendah untuk UX scan). Standarisasi 2026-08-23: output biometrik utama
    tepat 3 param — skin_tone (bucket MST), face_shape, gender (rasio
    dimorfisme). Undertone tetap dihitung sebagai sinyal internal recommender.
    """

    ENGINE_VERSION = "2.1.0"

    @staticmethod
    def _classify_skin(request: Any) -> Dict[str, Any]:
        """LAB rata-rata temporal klien → ΔE nearest MST → bucket 5 kategori.

        Deterministik: LAB sama → bucket sama (akar masalah inkonsistensi scan
        berulang). Tanpa skin_lab → fallback jujur confidence rendah.
        """
        from ai_engine.models.skin_analyzer import (
            MST_REFERENCE_TABLE,
            SKIN_TONE_LABELS,
            lab_to_ita,
            monk_to_skin_tone,
        )

        lab = getattr(request, "skin_lab", None)
        if lab is None:
            return {
                "tone": "Medium",
                "label_indonesian": SKIN_TONE_LABELS["Medium"],
                "monk_index": None,
                "monk_code": None,
                "ita_deg": None,
                "undertone": "Neutral",
                "confidence": 0.5,
                "rule": "fallback_no_lab",
            }

        best = min(
            MST_REFERENCE_TABLE,
            key=lambda m: (m["lab"][0] - lab.l) ** 2
            + (m["lab"][1] - lab.a) ** 2
            + (m["lab"][2] - lab.b) ** 2,
        )
        tone = monk_to_skin_tone(best["index"])
        # Undertone internal: sudut hue LAB (b* dominan → kuning hangat).
        hue = math.degrees(math.atan2(lab.b, lab.a)) if lab.a != 0 else 90.0
        if hue >= 62.0:
            undertone = "Warm"
        elif hue <= 45.0:
            undertone = "Cool"
        else:
            undertone = "Neutral"
        # Confidence naik saat ΔE kecil dan variasi L antar frame rendah.
        delta_e = math.sqrt(
            (best["lab"][0] - lab.l) ** 2
            + (best["lab"][1] - lab.a) ** 2
            + (best["lab"][2] - lab.b) ** 2
        )
        spread_penalty = min(6.0, (lab.std_l or 0.0))
        confidence = round(max(0.55, min(0.95, 0.95 - delta_e / 30.0 - spread_penalty / 20.0)), 2)
        return {
            "tone": tone,
            "label_indonesian": SKIN_TONE_LABELS[tone],
            "monk_index": best["index"],
            "monk_code": best["code"],
            "ita_deg": round(lab_to_ita(lab.l, lab.a, lab.b), 1),
            "undertone": undertone,
            "confidence": confidence,
            "rule": f"nearest-dE MST {best['code']} (dE={delta_e:.1f})",
        }

    @staticmethod
    def _classify_gender(request: Any) -> Dict[str, Any]:
        """Fitur dimorfisme → GenderEstimator; tanpa fitur → mengaku ragu.

        Pose ikut diteruskan. Dua dari empat rasio dimorfisme bergantung arah
        hadap, dan `quality` sudah membawa yaw serta pitch hasil ukur klien,
        jadi tidak ada alasan membiarkan estimator menebak tanpa itu.
        """
        from ai_engine.models.gender_estimator import GenderEstimator

        feats = getattr(request, "gender_features", None)
        if feats is None:
            # Sebelumnya baris ini mengembalikan "Pria (Male)". Payload tanpa
            # fitur bukan bukti seseorang laki-laki; menebak di sini adalah
            # sumber ketidakkonsistenan yang sama dengan yang ditangani deadband.
            return {
                "label": "Belum Pasti (Uncertain)",
                "label_id": "uncertain",
                "confidence": 0.5,
                "method": "landmark_ratio",
                "rule": "fallback_no_features",
            }

        quality = getattr(request, "quality", None)
        pose = (
            {"yaw_deg": quality.yaw_deg, "pitch_deg": quality.pitch_deg}
            if quality is not None
            else None
        )
        return GenderEstimator.classify(feats.model_dump(), pose=pose)

    @staticmethod
    def analyze(request: Any) -> Dict[str, Any]:
        face = classify_face_shape(request.face_ratios.model_dump())
        nose = NoseClassifier.classify(request.nose_features.model_dump())
        eye = EyeShapeClassifier.classify(request.eye_features.model_dump())
        brow = BrowClassifier.classify(request.brow_features.model_dump())
        skin_tone = FaceAnalyzer._classify_skin(request)
        gender = FaceAnalyzer._classify_gender(request)

        pillars = PillarJustifier.justify_all(
            {
                "face_shape": face["shape"],
                "undertone": skin_tone.get("undertone") or "Neutral",
                "nose": nose["label"],
                "nose_id": nose["label_id"],
            }
        )

        shape = face["shape"]
        summary = (
            f"Bentuk wajah Anda terklasifikasi {shape} ({face['label_indonesian']}) "
            f"berdasarkan rasio antropometrik terkalibrasi iris 11,7 mm. Kombinasi "
            f"hidung {nose['label']}, mata {eye['label']}, dan alis {brow['label']} "
            f"menjadi dasar personalisasi siluet frame, warna material, dan ergonomi bridge."
        )
        tips = [
            face["styling_advice"],
            pillars[0]["application"],
            pillars[2]["application"],
        ]

        return {
            "face_shape": face,
            "skin_tone": skin_tone,
            "gender": gender,
            "nose": nose,
            "eye": eye,
            "brow": brow,
            "measurements": request.measurements_cm,
            "pillars": pillars,
            "narrative": {"summary": summary, "tips": tips},
            "meta": {"engine_version": FaceAnalyzer.ENGINE_VERSION, "source": "engine"},
        }
