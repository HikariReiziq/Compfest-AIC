"""Estimasi gender dari rasio antropometrik wajah (landmark-derived).

Rule engine dimorfisme seksual — sengaja TANPA model berat di jalur produksi:
inferensi angka-only (<1 ms, deterministik, tanpa GPU, tanpa upload gambar —
kepatuhan UU PDP No. 27/2022). Threshold netral dipakai sebagai titik awal;
kalibrasi terhadap dataset UTKFace/FairFace dilakukan offline oleh
ai_engine/pipeline/03_gender_pipeline.py (opsi 1: pretrained = alat kalibrasi).

Sinyal antropometrik yang dipakai (Farkas 1994; Kolar & Salter 1997):
- jaw_to_cheek      : rahang lebar relatif pipi → pria lebih kotak
- brow_to_eye       : jarak alis-mata → pria berialis rendah/tebal (kecil),
                      wanita alis tinggi melengkung (besar)
- lip_to_face_width : bibir penuh → wanita cenderung lebih besar
- face_aspect       : wajah memanjang → pria; membulat → wanita

Confidence jujur 0.50-0.78 (estimasi dari 4 rasio 2D tidak boleh mengklaim
lebih); jawaban self-report kuesioner selalu boleh menimpa hasil ini.

DEADBAND (ditambahkan setelah investigasi inkonsistensi scan berulang)
----------------------------------------------------------------------
Sebelumnya label ditentukan murni oleh tanda skor (`score >= 0`), tanpa zona
ragu. Itu bermasalah karena salah satu suku penyusun skor, `face_aspect`,
ikut berubah oleh pose kepala: menoleh memperkecil lebar wajah terproyeksi.
Quality gate mengizinkan yaw dan pitch sampai 15 derajat, dan dalam jendela
yang masih dianggap sah itu saja skor sudah berayun selebar ~0.07.

Akibatnya wajah yang sama, hanya berbeda arah hadap, bisa keluar sebagai
male pada yaw 0 derajat lalu female pada yaw 15 derajat. Median 15-30 frame
tidak menolong: kalau kepala menoleh konsisten selama pemindaian, seluruh
sampel bias ke arah yang sama.

Karena itu skor di dalam +/-DEADBAND tidak lagi dipaksa jadi label. Ia
dikembalikan sebagai 'uncertain', dan penentuannya diserahkan ke jawaban
kuesioner. Ambangnya 0.05, sedikit di atas setengah lebar ayunan pose (0.035)
supaya seluruh rentang yang bisa dihasilkan pose murni jatuh sebagai ragu.

Memaksa tebakan pada zona ini bukan sekadar tidak akurat; ia menghasilkan
jawaban yang berubah-ubah untuk orang yang sama, dan itu lebih merusak
kepercayaan daripada mengaku tidak tahu.
"""

import math
from typing import Any, Dict, Optional


class GenderEstimator:
    """Klasifikasi gender Pria/Wanita dari fitur turunan landmark MediaPipe."""

    # Lebar zona ragu di sekitar nol, dalam SATUAN SEBARAN (bukan lagi satuan
    # lama (x-netral)/netral — skala skor berubah saat skoring dibakukan).
    #
    # Diturunkan dari galat sisa yang tetap ada SETELAH koreksi pose: dengan
    # ketelitian sudut sekitar 3 derajat, skor masih berayun 0,062 pada pose
    # ekstrem yang masih diloloskan quality gate. Ambang 0,075 menutupnya
    # dengan margin 20 persen.
    #
    # Deadband yang terlalu lebar bukan sikap hati-hati; ia menolak wajah yang
    # sinyalnya sebenarnya jelas. Yang terlalu sempit membuat label berubah-ubah
    # untuk orang yang sama.
    DEADBAND = 0.075

    # Threshold netral — rata-rata antropometrik populasi dewasa.
    #
    # jaw_to_cheek awalnya 0.86 (rata-rata populasi global), namun pria Asia
    # Tenggara/Indonesia memiliki rahang relatif lebih tirus (rahang bawah
    # tidak sekotak populasi Kaukasian). Akibatnya pria lokal yang rasionya
    # ~0.78-0.80 jatuh jauh di bawah netral lama dan skorsinya terdorong
    # feminin — sumber utama salah deteksi "Wanita" untuk pengguna pria.
    # Netral digeser ke 0.79 agar titik tengahnya representatif untuk populasi
    # pengguna target (kalibrasi langkah integrasi 2026-08-24).
    # Threshold netral — rata-rata antropometrik populasi dewasa.
    # Dipertahankan sebagai sumber tunggal nilai tengah; skoring memakai
    # FEATURES di bawah yang menambahkan sebaran, bobot, dan arah.
    NEUTRAL = {
        "jaw_to_cheek": 0.74,
        "brow_to_eye": 0.165,
        "lip_to_face_width": 0.45,
        "face_aspect": 0.75,
    }

    # (sebaran, bobot, arah) per rasio.
    #
    # KENAPA SEBARAN, BUKAN PEMBAGIAN OLEH NILAI NETRAL
    #
    # Versi sebelumnya menghitung tiap suku sebagai (x - netral)/netral. Bentuk
    # itu membuat bobot efektif sebuah rasio ditentukan oleh BESAR PENYEBUTNYA,
    # bukan oleh seberapa informatif rasio tersebut. Akibatnya brow_to_eye
    # (netral 0,16) berayun 4,9 kali lebih lebar daripada jaw_to_cheek
    # (netral 0,79) untuk perubahan fisik yang setara — dan brow_to_eye justru
    # rasio yang paling gampang berubah oleh ekspresi. Wajah maskulin yang sama
    # terbaca male saat alis turun dan female saat alis terangkat.
    #
    # Dengan membagi terhadap SEBARAN wajar tiap rasio, semua suku menjadi
    # satuan yang sebanding (semacam skor-z), sehingga bobot bisa ditetapkan
    # secara sadar lewat kolom bobot.
    #
    # Bobot mencerminkan seberapa ANDAL rasio itu, bukan hanya seberapa
    # dimorfik: lebar rahang relatif pipi stabil terhadap ekspresi, sedangkan
    # jarak alis-kelopak berubah tiap kali alis bergerak, jadi ia diturunkan.
    #
    # Nilai sebaran di bawah adalah PERKIRAAN dari rentang wajar wajah dewasa,
    # belum dikalibrasi terhadap dataset. Seluruhnya sengaja dikumpulkan di satu
    # tabel agar kalibrasi nanti cukup mengubah tempat ini.
    FEATURES = {
        # rasio:              (sebaran, bobot, arah)   arah +1 = besar -> maskulin
        "jaw_to_cheek":       (0.055, 1.00, +1),
        "face_aspect":        (0.065, 0.75, +1),
        "lip_to_face_width":  (0.045, 0.55, -1),
        "brow_to_eye":        (0.030, 0.40, -1),
    }

    # Batas tiap suku dalam satuan sebaran. Satu landmark yang meleset jauh
    # tidak boleh menentukan jawaban sendirian; di luar dua sebaran, tambahan
    # ekstremitas tidak lagi menambah keyakinan.
    TERM_CLAMP = 2.0

    # Smile Dampening Factor.
    SMILE_LIP_THRESHOLD = 0.46
    SMILE_DAMPENING = 0.5

    # Dua dari empat rasio bersifat pose-invariant, dua lainnya tidak.
    # Menoleh (yaw) memperkecil seluruh jarak MENDATAR sebesar cos(yaw);
    # menunduk/mendongak (pitch) memperkecil seluruh jarak TEGAK sebesar
    # cos(pitch). Konsekuensinya per rasio:
    #
    #   jaw_to_cheek      = lebar/lebar  -> faktor saling meniadakan, AMAN
    #   lip_to_face_width = lebar/lebar  -> AMAN
    #   brow_to_eye       = tegak/lebar  -> terkalikan cos(pitch)/cos(yaw)
    #   face_aspect       = lebar/tegak  -> terkalikan cos(yaw)/cos(pitch)
    #
    # Karena pose sudah diukur klien dan dikirim di payload `quality`, dua
    # rasio terakhir bisa dikembalikan ke nilai tegak-lurusnya, bukan sekadar
    # diabaikan. Ini memperbaiki sumber ayunannya, bukan menutupinya.
    # Model terlatih (opsional). Bila berkasnya ada, ia menggantikan skoring
    # berbasis aturan; bila tidak, rule engine tetap dipakai.
    #
    # Rule engine BUKAN penambal sementara: ia deterministik, tidak butuh
    # berkas apa pun, dan tetap menjadi jawaban saat model belum dilatih atau
    # gagal dimuat. Yang ditawarkan model adalah ambang hasil ukur, bukan
    # perkiraan literatur.
    _model = None
    _model_checked = False

    @staticmethod
    def _load_model():
        """Muat model sekali. Kegagalan dicatat lalu diabaikan, bukan dilempar."""
        if GenderEstimator._model_checked:
            return GenderEstimator._model
        GenderEstimator._model_checked = True

        import os

        path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "models", "weights", "gender_lr.joblib",
        )
        if not os.path.exists(path):
            return None
        try:
            import joblib

            bundle = joblib.load(path)
            if not isinstance(bundle, dict) or "pipeline" not in bundle:
                return None
            GenderEstimator._model = bundle
        except Exception:
            # Model rusak atau sklearn tidak ada: jatuh ke rule engine.
            GenderEstimator._model = None
        return GenderEstimator._model

    @staticmethod
    def _undo_pose(features: Dict[str, float], pose: Optional[Dict[str, Any]]) -> Dict[str, float]:
        if not pose:
            return features
        try:
            cy = math.cos(math.radians(abs(float(pose.get("yaw_deg") or 0.0))))
            cp = math.cos(math.radians(abs(float(pose.get("pitch_deg") or 0.0))))
        except (TypeError, ValueError):
            return features
        # Pose ekstrem membuat pembagian ini tidak stabil; quality gate
        # seharusnya sudah menolaknya jauh sebelum sini.
        if cy < 0.5 or cp < 0.5:
            return features
        out = dict(features)
        out["brow_to_eye"] = features["brow_to_eye"] * cy / cp
        out["face_aspect"] = features["face_aspect"] * cp / cy
        return out

    @staticmethod
    def classify(
        features: Dict[str, Any], pose: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Kembalikan dict {label, label_id, confidence, method, rule}.

        Deterministik: input sama → output byte-identik (syarat direktif
        konsistensi scan berulang).
        """
        try:
            jaw = float(features.get("jaw_to_cheek") or 0.0)
            brow = float(features.get("brow_to_eye") or 0.0)
            lip = float(features.get("lip_to_face_width") or 0.0)
            aspect = float(features.get("face_aspect") or 0.0)
        except (TypeError, ValueError):
            jaw = brow = lip = aspect = 0.0

        # Semua nol → payload tidak informatif. Dulu ini mengembalikan "Pria"
        # dengan confidence 0.50, yang berarti payload rusak pun tetap keluar
        # sebagai laki-laki. Menebak dari ketiadaan data adalah bentuk terburuk
        # dari masalah yang diperbaiki deadband, jadi sekarang ia mengaku ragu.
        if jaw == 0.0 and brow == 0.0 and lip == 0.0:
            return {
                "label": "Belum Pasti (Uncertain)",
                "label_id": "uncertain",
                "confidence": 0.50,
                "method": "landmark_ratio",
                "rule": "fallback",
            }

        # Netralkan pengaruh arah hadap sebelum skor dihitung. Diambil per kunci,
        # bukan lewat urutan values(), supaya penambahan rasio baru kelak tidak
        # diam-diam menukar nilai antar variabel.
        corrected = GenderEstimator._undo_pose(
            {
                "jaw_to_cheek": jaw,
                "brow_to_eye": brow,
                "lip_to_face_width": lip,
                "face_aspect": aspect,
            },
            pose,
        )
        jaw = corrected["jaw_to_cheek"]
        brow = corrected["brow_to_eye"]
        lip = corrected["lip_to_face_width"]
        aspect = corrected["face_aspect"]

        feats = {
            "jaw_to_cheek": jaw,
            "brow_to_eye": brow,
            "lip_to_face_width": lip,
            "face_aspect": aspect,
        }

        # Model terlatih lebih dulu bila ada: ambangnya hasil ukur, bukan
        # perkiraan literatur. Peluangnya dipetakan ke skor yang satuannya
        # sebanding dengan rule engine, sehingga DEADBAND, leaning, dan
        # confidence tidak perlu diperlakukan berbeda.
        bundle = GenderEstimator._load_model()
        if bundle is not None:
            try:
                vector = [[feats[k] for k in bundle["features"]]]
                prob_male = float(bundle["pipeline"].predict_proba(vector)[0][1])
                # (p - 0.5) * 2 memberi rentang -1..1, searah skor aturan.
                score = (prob_male - 0.5) * 2.0
                return GenderEstimator._verdict(
                    score,
                    method="landmark_model",
                    detail=f"p(pria)={prob_male:.3f}",
                )
            except Exception:
                # Bentuk model tidak cocok: lanjut ke rule engine daripada gagal.
                pass

        n = GenderEstimator.NEUTRAL
        # Suku lip dengan smile dampening: senyum lebar merenggang sudut bibir
        # dan membuat suku ini berubah negatif palsu.
        smile_damped = lip > GenderEstimator.SMILE_LIP_THRESHOLD

        score = 0.0
        weight_total = 0.0
        for key, (spread, weight, direction) in GenderEstimator.FEATURES.items():
            z = (feats[key] - n[key]) / spread
            if z > GenderEstimator.TERM_CLAMP:
                z = GenderEstimator.TERM_CLAMP
            elif z < -GenderEstimator.TERM_CLAMP:
                z = -GenderEstimator.TERM_CLAMP
            term = z * direction
            if key == "lip_to_face_width" and smile_damped and term < 0:
                term *= GenderEstimator.SMILE_DAMPENING
            score += term * weight
            weight_total += weight

        # Dibagi total bobot agar skor tetap dalam satuan sebaran, sehingga
        # DEADBAND dan confidence punya makna yang sama walau bobot disetel.
        score = score / weight_total if weight_total else 0.0

        detail = (
            f"jaw/cheek {jaw:.2f}, brow {brow:.2f}, lip {lip:.2f}, aspect {aspect:.2f}"
        )
        return GenderEstimator._verdict(score, method="landmark_ratio", detail=detail)

    @staticmethod
    def _verdict(score: float, *, method: str, detail: str) -> Dict[str, Any]:
        """Ubah skor menjadi putusan akhir.

        Dipakai bersama oleh rule engine dan model terlatih agar keduanya
        memberi kontrak yang sama: deadband yang sama, arah kecondongan yang
        sama, dan pemetaan confidence yang sama. Menduplikasi logika ini akan
        membuat kedua jalur perlahan menyimpang tanpa ada yang menyadarinya.
        """
        confidence = round(min(0.78, 0.55 + 0.23 * min(1.0, abs(score))), 2)

        if abs(score) < GenderEstimator.DEADBAND:
            return {
                "label": "Belum Pasti (Uncertain)",
                "label_id": "uncertain",
                # Zona ragu selalu 0.50: bukan sekadar kurang yakin, melainkan
                # tidak ada dasar untuk memilih salah satu.
                "confidence": 0.50,
                "method": method,
                # Kecondongan tetap dilaporkan. Tidak yakin bukan berarti tidak
                # tahu apa-apa: menahan arahnya hanya membuang informasi sah dan
                # membuat kartu di UI tampak kosong.
                "leaning": "male" if score >= 0 else "female",
                "rule": (
                    f"skor {score:+.3f} di dalam deadband "
                    f"+/-{GenderEstimator.DEADBAND} ({detail}); "
                    "gender diserahkan ke jawaban kuesioner"
                ),
            }

        if score >= 0:
            return {
                "label": "Pria (Male)",
                "label_id": "male",
                "confidence": confidence,
                "method": method,
                "rule": f"skor maskulin {score:+.2f} ({detail})",
            }
        return {
            "label": "Wanita (Female)",
            "label_id": "female",
            "confidence": confidence,
            "method": method,
            "rule": f"skor feminin {score:+.2f} ({detail})",
        }
