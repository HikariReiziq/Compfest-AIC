"""TDD — GenderEstimator rule engine dari rasio antropometrik landmark.

Fitur dimorfisme seksual dipakai karena produksi hanya menerima ANGKA turunan
landmark (kepatuhan UU PDP). Confidence dijaga jujur 0.50-0.78; threshold
dikalibrasi offline oleh ai_engine/pipeline/03_gender_pipeline.py (UTKFace).
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai_engine.models.gender_estimator import GenderEstimator


def _features(**over):
    """Vektor fitur netral; override untuk vektor maskulin/feminin.

    jaw_to_cheek mengikuti NEUTRAL terkalibrasi 0.79 (populasi Asia/
    Indonesia — pria lokal berahang relatif tirus dibanding populasi global
    yang dipakai nilai lama 0.86).
    """
    base = {
        "jaw_to_cheek": 0.79,      # lebar rahang relatif pipi (netral Asia/Tenggara)
        "brow_to_eye": 0.16,       # jarak puncak alis ke kelopak mata (relatif pipi)
        "lip_to_face_width": 0.42, # lebar bibir relatif lebar wajah
        "face_aspect": 0.75,       # lebar wajah / tinggi wajah
    }
    base.update(over)
    return base


class TestGenderEstimator:
    def test_masculine_vector(self):
        # Rahang lebar, alis rendah/tebal, bibir sempit, wajah memanjang
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.97, brow_to_eye=0.11, lip_to_face_width=0.36, face_aspect=0.80)
        )
        assert out["label"] == "Pria (Male)"
        assert out["label_id"] == "male"
        assert 0.55 <= out["confidence"] <= 0.80
        assert out["method"] == "landmark_ratio"

    def test_feminine_vector(self):
        # Rahang ramping, alis tinggi melengkung, bibir penuh, wajah membulat
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.74, brow_to_eye=0.22, lip_to_face_width=0.49, face_aspect=0.71)
        )
        assert out["label"] == "Wanita (Female)"
        assert out["label_id"] == "female"
        assert out["confidence"] >= 0.55

    def test_neutral_falls_back_with_low_confidence(self):
        """Vektor netral persis tidak boleh dipaksa jadi label.

        Diperbarui bersama penambahan deadband. Versi lama menerima label apa
        pun asal confidence-nya rendah, padahal justru di sinilah labelnya
        berubah-ubah antar pemindaian: skor nol berarti tidak ada dasar untuk
        memilih, bukan berarti "laki-laki dengan keyakinan rendah".
        """
        out = GenderEstimator.classify(_features())
        assert out["label_id"] == "uncertain"
        assert out["confidence"] < 0.62  # sinyal lemah → jujur rendah

    def test_invalid_features_low_confidence(self):
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.0, brow_to_eye=0.0, lip_to_face_width=0.0, face_aspect=0.0)
        )
        assert out["confidence"] <= 0.50
        assert out["rule"] == "fallback"

    def test_deterministic_same_input_same_output(self):
        """Syarat mutlak direktif: scan berulang hasil identik."""
        vec = _features(jaw_to_cheek=0.92, brow_to_eye=0.12, lip_to_face_width=0.38, face_aspect=0.78)
        a = GenderEstimator.classify(vec)
        b = GenderEstimator.classify(vec)
        assert a == b


class TestGenderDeadband:
    """Deadband + koreksi pose — jawaban atas gender yang berubah-ubah.

    Sebelum ini, label ditentukan murni oleh tanda skor. Karena `face_aspect`
    dan `brow_to_eye` ikut berubah oleh arah hadap kepala, wajah yang sama bisa
    keluar sebagai male lalu female hanya dengan menoleh dalam batas yang masih
    diloloskan quality gate.
    """

    def test_zona_ragu_tetap_melaporkan_kecondongan(self):
        """Ragu bukan berarti tidak tahu apa-apa; tandanya tetap informatif."""
        out = GenderEstimator.classify(_features(jaw_to_cheek=0.80, face_aspect=0.755))
        assert out["label_id"] == "uncertain"
        assert out["leaning"] == "male"

    def test_payload_kosong_tidak_punya_kecondongan(self):
        """Tanpa fitur sama sekali tidak ada dasar untuk melaporkan arah."""
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.0, brow_to_eye=0.0, lip_to_face_width=0.0, face_aspect=0.0)
        )
        assert out["label_id"] == "uncertain"
        assert "leaning" not in out

    def test_deadband_tidak_lebih_lebar_dari_galat_sisa(self):
        """Deadband disempitkan setelah koreksi pose menghapus penyebab ayunan.

        Yang perlu ditutup kini hanya galat pengukuran sudut (maksimum ~0.027 di
        batas gate 15 derajat), bukan lagi ayunan pose 0.035. Deadband yang
        terlalu lebar menolak wajah yang sinyalnya sebenarnya jelas.
        """
        assert GenderEstimator.DEADBAND <= 0.03

    def test_skor_dalam_deadband_tidak_dipaksa_berlabel(self):
        # Vektor yang skornya persis di sekitar nol.
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.80, face_aspect=0.755)
        )
        assert out["label_id"] == "uncertain"
        assert out["confidence"] == 0.50
        assert "deadband" in out["rule"]

    def test_sinyal_kuat_tetap_berlabel_tegas(self):
        """Deadband tidak boleh membuat sistem menolak menjawab untuk wajah jelas."""
        pria = GenderEstimator.classify(
            _features(jaw_to_cheek=0.97, brow_to_eye=0.11, lip_to_face_width=0.36, face_aspect=0.80)
        )
        wanita = GenderEstimator.classify(
            _features(jaw_to_cheek=0.74, brow_to_eye=0.22, lip_to_face_width=0.49, face_aspect=0.71)
        )
        assert pria["label_id"] == "male"
        assert wanita["label_id"] == "female"

    def test_rasio_lebar_per_lebar_kebal_terhadap_yaw(self):
        """jaw_to_cheek dan lip_to_face_width tidak boleh disentuh koreksi pose."""
        f = _features()
        # yaw dan pitch sengaja BERBEDA. Kalau keduanya sama besar, faktor
        # cos(yaw)/cos(pitch) menjadi 1 dan test ini lolos tanpa menguji apa pun.
        out = GenderEstimator._undo_pose(dict(f), {"yaw_deg": 14, "pitch_deg": 3})
        assert out["jaw_to_cheek"] == f["jaw_to_cheek"]
        assert out["lip_to_face_width"] == f["lip_to_face_width"]
        # Dua sisanya justru HARUS berubah.
        assert out["face_aspect"] != f["face_aspect"]
        assert out["brow_to_eye"] != f["brow_to_eye"]

    def test_label_stabil_di_seluruh_pose_yang_lolos_gate(self):
        """Wajah yang sama, arah hadap berbeda, harus memberi label sama."""
        import math

        jaw, brow, lip, aspect = 0.97, 0.11, 0.36, 0.80
        labels = set()
        for yaw in (-15, -8, 0, 8, 15):
            for pitch in (-15, 0, 15):
                cy = math.cos(math.radians(abs(yaw)))
                cp = math.cos(math.radians(abs(pitch)))
                # Nilai sebagaimana TERAMATI pada pose tersebut.
                observed = _features(
                    jaw_to_cheek=jaw,
                    brow_to_eye=brow * cp / cy,
                    lip_to_face_width=lip,
                    face_aspect=aspect * cy / cp,
                )
                labels.add(
                    GenderEstimator.classify(
                        observed, pose={"yaw_deg": yaw, "pitch_deg": pitch}
                    )["label_id"]
                )
        assert labels == {"male"}, f"label ikut berubah oleh pose: {labels}"

    def test_pose_ekstrem_tidak_meledakkan_koreksi(self):
        """Pembagian dengan cos mendekati nol harus ditolak, bukan menghasilkan angka liar."""
        f = _features()
        out = GenderEstimator._undo_pose(dict(f), {"yaw_deg": 89, "pitch_deg": 0})
        assert out == f

    def test_pose_tidak_wajib(self):
        """Pemanggil lama tanpa argumen pose harus tetap jalan."""
        vec = _features(jaw_to_cheek=0.97, brow_to_eye=0.11, lip_to_face_width=0.36, face_aspect=0.80)
        assert GenderEstimator.classify(vec)["label_id"] == "male"


class TestSmileDampening:
    """Smile dampening — senyum lebar tidak boleh memicu klasifikasi feminin.

    lip_to_face_width dihitung dari jarak sudut bibir; senyum merenggangkan
    sudut bibir sehingga rasio naik palsu. Tanpa redaman, pria yang tersenyum
    lebar terdorong skor feminin (laporan bug "false female").
    """

    def test_pria_tersenyum_tetap_male(self):
        """Vektor maskulin + senyum lebar (rasio bibir tinggi) tetap Pria."""
        neutral_lip = GenderEstimator.classify(
            _features(jaw_to_cheek=0.88, brow_to_eye=0.12, lip_to_face_width=0.40, face_aspect=0.78)
        )
        smiling = GenderEstimator.classify(
            _features(jaw_to_cheek=0.88, brow_to_eye=0.12, lip_to_face_width=0.49, face_aspect=0.78)
        )
        assert neutral_lip["label_id"] == "male"
        assert smiling["label_id"] == "male", (
            "senyum lebar tidak boleh mengubah label pria menjadi wanita"
        )

    def test_senyum_meredam_bukan_membalik(self):
        """Skor dengan senyum tidak boleh LEBIH feminin daripada tanpa senyum
        pada wajah yang sama (dilihat dari label dan confidence)."""
        smiling = GenderEstimator.classify(
            _features(jaw_to_cheek=0.88, brow_to_eye=0.12, lip_to_face_width=0.49, face_aspect=0.78)
        )
        assert smiling["label_id"] != "female"

    def test_ambang_senyum_konsisten_dengan_konstanta(self):
        assert GenderEstimator.SMILE_LIP_THRESHOLD == 0.44
        assert 0 < GenderEstimator.SMILE_DAMPENING < 1


class TestKalibrasiAsia:
    """Netral jaw_to_cheek 0.79 — pria Asia berahang tirus bukan "wanita"."""

    def test_pria_asia_rahang_tirus_male(self):
        """Rahang 0.78-0.80 khas pria Asia tidak boleh jatuh feminin."""
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.78, brow_to_eye=0.13, lip_to_face_width=0.40, face_aspect=0.77)
        )
        assert out["label_id"] in ("male", "uncertain")
        assert out["label_id"] != "female"

    def test_vektor_wanita_tetap_female(self):
        """Kalibrasi tidak boleh menggeser wanita keluar dari labelnya."""
        out = GenderEstimator.classify(
            _features(jaw_to_cheek=0.74, brow_to_eye=0.22, lip_to_face_width=0.49, face_aspect=0.71)
        )
        assert out["label_id"] == "female"
