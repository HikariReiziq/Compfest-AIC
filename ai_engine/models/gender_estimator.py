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

    # Lebar zona ragu di sekitar nol.
    #
    # Nilai awalnya 0.05, dipilih untuk menyerap ayunan +/-0.035 akibat arah
    # hadap kepala. Angka itu menjadi kelewat lebar begitu `_undo_pose`
    # menghilangkan penyebab ayunannya: yang tersisa bukan lagi pengaruh pose
    # itu sendiri, melainkan galat PENGUKURAN sudutnya. Dengan ketelitian sudut
    # sekitar 3 derajat, galat sisa itu 0.009 pada yaw 5 derajat, 0.018 pada 10
    # derajat, dan 0.027 di batas gate 15 derajat.
    #
    # 0.025 menutup rentang pemakaian wajar tanpa menolak wajah yang sinyalnya
    # sebenarnya jelas. Deadband yang terlalu lebar bukan sikap hati-hati; ia
    # menyembunyikan hasil deteksi yang sah.
    DEADBAND = 0.025

    # Threshold netral — rata-rata antropometrik populasi dewasa.
    #
    # jaw_to_cheek awalnya 0.86 (rata-rata populasi global), namun pria Asia
    # Tenggara/Indonesia memiliki rahang relatif lebih tirus (rahang bawah
    # tidak sekotak populasi Kaukasian). Akibatnya pria lokal yang rasionya
    # ~0.78-0.80 jatuh jauh di bawah netral lama dan skorsinya terdorong
    # feminin — sumber utama salah deteksi "Wanita" untuk pengguna pria.
    # Netral digeser ke 0.79 agar titik tengahnya representatif untuk populasi
    # pengguna target (kalibrasi langkah integrasi 2026-08-24).
    NEUTRAL = {
        "jaw_to_cheek": 0.74,
        "brow_to_eye": 0.165,
        "lip_to_face_width": 0.45,
        "face_aspect": 0.75,
    }

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

        n = GenderEstimator.NEUTRAL
        # Suku lip dengan smile dampening: senyum lebar (rasio > 0.44)
        # merenggang sudut bibir dan membuat suku ini berubah negatif palsu.
        lip_term = (n["lip_to_face_width"] - lip) / n["lip_to_face_width"]
        if lip > GenderEstimator.SMILE_LIP_THRESHOLD and lip_term < 0:
            lip_term *= GenderEstimator.SMILE_DAMPENING
        # Skor aditif ter-normalisasi: > 0 maskulin, < 0 feminin.
        score = (
            (jaw - n["jaw_to_cheek"]) / n["jaw_to_cheek"]
            + (n["brow_to_eye"] - brow) / n["brow_to_eye"]
            + lip_term
            + (aspect - n["face_aspect"]) / n["face_aspect"]
        )
        confidence = round(min(0.78, 0.55 + 0.23 * min(1.0, abs(score))), 2)
        detail = (
            f"jaw/cheek {jaw:.2f}, brow {brow:.2f}, lip {lip:.2f}, aspect {aspect:.2f}"
        )

        if abs(score) < GenderEstimator.DEADBAND:
            return {
                "label": "Belum Pasti (Uncertain)",
                "label_id": "uncertain",
                # Zona ragu selalu 0.50: bukan sekadar kurang yakin, melainkan
                # tidak ada dasar untuk memilih salah satu.
                "confidence": 0.50,
                "method": "landmark_ratio",
                # Kecondongan tetap dilaporkan. Tidak yakin bukan berarti
                # tidak tahu apa-apa: menahan arah kecondongan hanya membuang
                # informasi yang sah dan membuat kartu di UI tampak kosong.
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
                "method": "landmark_ratio",
                "rule": f"skor maskulin {score:+.2f} ({detail})",
            }
        return {
            "label": "Wanita (Female)",
            "label_id": "female",
            "confidence": confidence,
            "method": "landmark_ratio",
            "rule": f"skor feminin {score:+.2f} ({detail})",
        }
